import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

import { clamp, type Point, type ProjectRecord, type Shape } from "@projection-mapping/shared";

import { applyAnimationToQuad, computeAnimatedOpacity } from "../lib/animation-utils";
import { buildShapeSvgMarkup } from "../lib/shape-render";

interface ProjectionViewportProps {
  project: ProjectRecord;
  selectedShapeId?: string | null;
  editable?: boolean;
  onQuadChange?: (shapeId: string, quad: [Point, Point, Point, Point]) => void;
}

interface RuntimeMesh {
  geometry: THREE.BufferGeometry;
  material: THREE.MeshBasicMaterial;
  texture: THREE.Texture;
  shape: Shape;
}

interface RuntimeState {
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  renderer: THREE.WebGLRenderer;
  group: THREE.Group;
}

function updateGeometryPositions(
  geometry: THREE.BufferGeometry,
  quad: [Point, Point, Point, Point],
  sceneHeight: number
): void {
  const positions = [
    quad[0].x,
    sceneHeight - quad[0].y,
    0,
    quad[1].x,
    sceneHeight - quad[1].y,
    0,
    quad[2].x,
    sceneHeight - quad[2].y,
    0,
    quad[3].x,
    sceneHeight - quad[3].y,
    0
  ];

  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute([0, 1, 1, 1, 1, 0, 0, 0], 2));
  geometry.setIndex([0, 2, 1, 0, 3, 2]);
  geometry.computeBoundingSphere();
}

function disposeGroup(group: THREE.Group): void {
  group.children.forEach((child) => {
    const mesh = child as THREE.Mesh;
    const geometry = mesh.geometry as THREE.BufferGeometry | undefined;
    const material = mesh.material as THREE.MeshBasicMaterial | undefined;

    geometry?.dispose();
    material?.map?.dispose();
    material?.dispose();
  });

  group.clear();
}

function shapePointStyle(point: Point, project: ProjectRecord): { left: string; top: string } {
  return {
    left: `${(point.x / project.width) * 100}%`,
    top: `${(point.y / project.height) * 100}%`
  };
}

export function ProjectionViewport({
  project,
  selectedShapeId,
  editable = false,
  onQuadChange
}: ProjectionViewportProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const runtimeRef = useRef<RuntimeState | null>(null);
  const meshesRef = useRef<RuntimeMesh[]>([]);
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null);
  const selectedShape = project.scene.shapes.find((shape) => shape.id === selectedShapeId) ?? null;

  useEffect(() => {
    if (!canvasHostRef.current) {
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(0, project.width, project.height, 0, 0.1, 2000);
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false
    });
    const group = new THREE.Group();

    camera.position.z = 10;
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    scene.add(group);
    runtimeRef.current = {
      scene,
      camera,
      renderer,
      group
    };
    canvasHostRef.current.appendChild(renderer.domElement);

    const clock = new THREE.Clock();

    renderer.setAnimationLoop(() => {
      const runtime = runtimeRef.current;

      if (!runtime) {
        return;
      }

      const elapsedMs = clock.getElapsedTime() * 1000;

      meshesRef.current.forEach((runtimeMesh) => {
        const animatedQuad = applyAnimationToQuad(runtimeMesh.shape.quad, runtimeMesh.shape.animation, elapsedMs);
        updateGeometryPositions(runtimeMesh.geometry, animatedQuad, project.height);
        runtimeMesh.material.opacity = computeAnimatedOpacity(
          runtimeMesh.shape.style.opacity,
          runtimeMesh.shape.animation,
          elapsedMs
        );
      });

      runtime.renderer.render(runtime.scene, runtime.camera);
    });

    return () => {
      renderer.setAnimationLoop(null);
      disposeGroup(group);
      renderer.dispose();
      runtimeRef.current = null;

      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
    };
  }, [project.height, project.width]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    const host = canvasHostRef.current;

    if (!runtime || !host) {
      return;
    }

    const resize = () => {
      const width = host.clientWidth || 1;
      const height = host.clientHeight || 1;

      runtime.renderer.setSize(width, height, false);
    };

    resize();

    const observer = new ResizeObserver(() => resize());
    observer.observe(host);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const runtime = runtimeRef.current;

    if (!runtime) {
      return;
    }

    runtime.camera.left = 0;
    runtime.camera.right = project.width;
    runtime.camera.top = project.height;
    runtime.camera.bottom = 0;
    runtime.camera.updateProjectionMatrix();
  }, [project.height, project.width]);

  useEffect(() => {
    const runtime = runtimeRef.current;

    if (!runtime) {
      return;
    }

    const activeRuntime = runtime;

    let cancelled = false;

    async function rebuildMeshes() {
      disposeGroup(activeRuntime.group);
      meshesRef.current = [];
      activeRuntime.scene.background = new THREE.Color(project.scene.background);

      const loader = new THREE.TextureLoader();

      const runtimeMeshes = await Promise.all(
        project.scene.shapes.map(async (shape) => {
          const texture = await loader.loadAsync(
            `data:image/svg+xml;charset=utf-8,${encodeURIComponent(buildShapeSvgMarkup(shape))}`
          );

          texture.colorSpace = THREE.SRGBColorSpace;
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;

          const geometry = new THREE.BufferGeometry();
          updateGeometryPositions(geometry, shape.quad, project.height);

          const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: shape.style.opacity,
            side: THREE.DoubleSide
          });
          const mesh = new THREE.Mesh(geometry, material);

          return {
            mesh,
            geometry,
            material,
            texture,
            shape
          };
        })
      );

      if (cancelled) {
        runtimeMeshes.forEach((runtimeMesh) => {
          runtimeMesh.geometry.dispose();
          runtimeMesh.texture.dispose();
          runtimeMesh.material.dispose();
        });
        return;
      }

      runtimeMeshes.forEach((runtimeMesh) => {
        activeRuntime.group.add(runtimeMesh.mesh);
      });

      meshesRef.current = runtimeMeshes;
    }

    void rebuildMeshes();

    return () => {
      cancelled = true;
    };
  }, [project]);

  useEffect(() => {
    if (!editable || activePointIndex === null || !selectedShape || !onQuadChange || !containerRef.current) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();

      if (!rect) {
        return;
      }

      const x = clamp(((event.clientX - rect.left) / rect.width) * project.width, 0, project.width);
      const y = clamp(((event.clientY - rect.top) / rect.height) * project.height, 0, project.height);
      const nextQuad = [...selectedShape.quad] as [Point, Point, Point, Point];

      nextQuad[activePointIndex] = { x, y };
      onQuadChange(selectedShape.id, nextQuad);
    };

    const handlePointerUp = () => setActivePointIndex(null);

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [activePointIndex, editable, onQuadChange, project.height, project.width, selectedShape]);

  return (
    <div className="projection-card">
      <div className="projection-card__meta">
        <span>Viewport de projeção</span>
        <span>
          {project.width} x {project.height}
        </span>
      </div>
      <div ref={containerRef} className="projection-surface">
        <div ref={canvasHostRef} className="projection-surface__canvas" />
        {editable && selectedShape && onQuadChange
          ? selectedShape.quad.map((point, index) => (
              <button
                key={`${selectedShape.id}-${index}`}
                className="projection-point"
                style={shapePointStyle(point, project)}
                type="button"
                onPointerDown={() => setActivePointIndex(index)}
                title={`Ponto ${index + 1}`}
              >
                {index + 1}
              </button>
            ))
          : null}
      </div>
    </div>
  );
}
