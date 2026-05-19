import { useEffect, useRef, useState } from "react";

import type { Point, ProjectRecord, Shape, ShapeTransform } from "@projection-mapping/shared";

import { buildEditorShapeHref, getLocalShapePoints } from "../lib/shape-render";

interface SceneCanvasProps {
  project: ProjectRecord;
  selectedShapeId: string | null;
  zoom: number;
  onSelectShape: (shapeId: string) => void;
  onTransformChange: (shapeId: string, patch: Partial<ShapeTransform>) => void;
}

interface DragState {
  shapeId: string;
  start: Point;
  origin: Pick<ShapeTransform, "x" | "y">;
}

function pointsToString(points: Point[]): string {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

function renderShape(shape: Shape, isSelected: boolean) {
  const { width, height } = shape.transform;

  if (shape.type === "rectangle") {
    return (
      <rect
        width={width}
        height={height}
        rx={20}
        ry={20}
        fill={shape.style.fill}
        opacity={shape.style.opacity}
        stroke={isSelected ? "#0f172a" : shape.style.stroke}
        strokeWidth={isSelected ? shape.style.strokeWidth + 1 : shape.style.strokeWidth}
      />
    );
  }

  if (shape.type === "circle") {
    return (
      <ellipse
        cx={width / 2}
        cy={height / 2}
        rx={width / 2}
        ry={height / 2}
        fill={shape.style.fill}
        opacity={shape.style.opacity}
        stroke={isSelected ? "#0f172a" : shape.style.stroke}
        strokeWidth={isSelected ? shape.style.strokeWidth + 1 : shape.style.strokeWidth}
      />
    );
  }

  if (shape.type === "triangle" || shape.type === "polygon") {
    return (
      <polygon
        points={pointsToString(getLocalShapePoints(shape))}
        fill={shape.style.fill}
        opacity={shape.style.opacity}
        stroke={isSelected ? "#0f172a" : shape.style.stroke}
        strokeWidth={isSelected ? shape.style.strokeWidth + 1 : shape.style.strokeWidth}
      />
    );
  }

  return <image href={buildEditorShapeHref(shape)} width={width} height={height} preserveAspectRatio="xMidYMid meet" />;
}

export function SceneCanvas({
  project,
  selectedShapeId,
  zoom,
  onSelectShape,
  onTransformChange
}: SceneCanvasProps) {
  const canvasRef = useRef<SVGSVGElement | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const selectedShape = project.scene.shapes.find((shape) => shape.id === selectedShapeId) ?? null;

  useEffect(() => {
    if (!dragState || !canvasRef.current) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();

      if (!rect) {
        return;
      }

      const x = ((event.clientX - rect.left) / rect.width) * project.width;
      const y = ((event.clientY - rect.top) / rect.height) * project.height;
      const dx = x - dragState.start.x;
      const dy = y - dragState.start.y;

      onTransformChange(dragState.shapeId, {
        x: dragState.origin.x + dx,
        y: dragState.origin.y + dy
      });
    };

    const handlePointerUp = () => setDragState(null);

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragState, onTransformChange, project.height, project.width]);

  return (
    <section className="canvas-card">
      <div className="canvas-card__meta">
        <span>Editor de cena</span>
        <span>{Math.round(zoom * 100)}%</span>
      </div>
      <div className="canvas-card__scroll">
        <svg
          ref={canvasRef}
          className="scene-svg"
          style={{ width: `${project.width * zoom}px`, height: `${project.height * zoom}px` }}
          viewBox={`0 0 ${project.width} ${project.height}`}
        >
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(19,42,53,0.14)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width={project.width} height={project.height} fill={project.scene.background} />
          <rect width={project.width} height={project.height} fill="url(#grid)" />

          {project.scene.shapes.map((shape) => {
            const isSelected = selectedShapeId === shape.id;

            return (
              <g
                key={shape.id}
                className="shape-layer"
                transform={`translate(${shape.transform.x} ${shape.transform.y}) rotate(${shape.transform.rotation} ${
                  shape.transform.width / 2
                } ${shape.transform.height / 2})`}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  const rect = canvasRef.current?.getBoundingClientRect();

                  if (!rect) {
                    return;
                  }

                  onSelectShape(shape.id);
                  setDragState({
                    shapeId: shape.id,
                    start: {
                      x: ((event.clientX - rect.left) / rect.width) * project.width,
                      y: ((event.clientY - rect.top) / rect.height) * project.height
                    },
                    origin: {
                      x: shape.transform.x,
                      y: shape.transform.y
                    }
                  });
                }}
              >
                {renderShape(shape, isSelected)}
              </g>
            );
          })}

          {selectedShape ? (
            <g
              pointerEvents="none"
              transform={`translate(${selectedShape.transform.x} ${selectedShape.transform.y}) rotate(${
                selectedShape.transform.rotation
              } ${selectedShape.transform.width / 2} ${selectedShape.transform.height / 2})`}
            >
              <rect
                width={selectedShape.transform.width}
                height={selectedShape.transform.height}
                fill="none"
                stroke="#f97316"
                strokeWidth="3"
                strokeDasharray="10 8"
              />
            </g>
          ) : null}
        </svg>
      </div>
    </section>
  );
}
