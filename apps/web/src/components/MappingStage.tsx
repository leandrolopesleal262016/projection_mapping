import { type CSSProperties, useEffect, useRef, useState } from "react";

import {
  DEFAULT_MEDIA,
  clamp,
  getPointsBounds,
  type Point,
  type ProjectRecord,
  type Shape
} from "@projection-mapping/shared";

import { clampPointToStage } from "../lib/scene-utils";

interface MappingStageProps {
  project: ProjectRecord;
  selectedShapeId: string | null;
  selectedPointIndex?: number | null;
  editable?: boolean;
  playbackMode?: "play" | "stop";
  showChrome?: boolean;
  surfaceBackground?: string;
  zoom?: number;
  onSelectShape?: (shapeId: string | null) => void;
  onSelectPoint?: (pointIndex: number | null) => void;
  onPointsChange?: (shapeId: string, points: Point[]) => void;
  onTogglePlayback?: () => void;
  onZoomChange?: (zoom: number) => void;
}

type DragState =
  | {
      mode: "shape";
      shapeId: string;
      start: Point;
      originPoints: Point[];
    }
  | {
      mode: "point";
      shapeId: string;
      pointIndex: number;
    };

interface InsertionCandidate {
  segmentIndex: number;
  distance: number;
  point: Point;
}

interface ZoomAnchor {
  pointX: number;
  pointY: number;
  offsetX: number;
  offsetY: number;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;

function stagePointToCss(point: Point, project: ProjectRecord): { left: string; top: string } {
  return {
    left: `${(point.x / project.width) * 100}%`,
    top: `${(point.y / project.height) * 100}%`
  };
}

function relativePolygon(points: Point[], bounds: { x: number; y: number }) {
  return points.map((point) => ({
    x: point.x - bounds.x,
    y: point.y - bounds.y
  }));
}

function clipPathFromRelativePoints(points: Point[], width: number, height: number): string {
  return `polygon(${points
    .map((point) => `${(point.x / width) * 100}% ${(point.y / height) * 100}%`)
    .join(", ")})`;
}

function svgPointsString(points: Point[]): string {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

function toStagePoint(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  project: Pick<ProjectRecord, "width" | "height">
): Point {
  return {
    x: clamp(((clientX - rect.left) / rect.width) * project.width, 0, project.width),
    y: clamp(((clientY - rect.top) / rect.height) * project.height, 0, project.height)
  };
}

function distanceToSegment(target: Point, start: Point, end: Point) {
  const segmentX = end.x - start.x;
  const segmentY = end.y - start.y;
  const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;

  if (segmentLengthSquared === 0) {
    return {
      distance: Math.hypot(target.x - start.x, target.y - start.y),
      projection: start
    };
  }

  const t = clamp(
    ((target.x - start.x) * segmentX + (target.y - start.y) * segmentY) / segmentLengthSquared,
    0,
    1
  );
  const projection = {
    x: start.x + segmentX * t,
    y: start.y + segmentY * t
  };

  return {
    distance: Math.hypot(target.x - projection.x, target.y - projection.y),
    projection
  };
}

function findInsertion(points: Point[], target: Point, threshold: number): InsertionCandidate | null {
  let best: InsertionCandidate | null = null;

  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    const next = points[(index + 1) % points.length];
    const candidate = distanceToSegment(target, point, next);

    if (!best || candidate.distance < best.distance) {
      best = {
        segmentIndex: index,
        distance: candidate.distance,
        point: candidate.projection
      };
    }
  }

  return best && best.distance <= threshold ? best : null;
}

function animationStyle(shape: Shape): CSSProperties {
  const media = shape.media ?? DEFAULT_MEDIA;

  return {
    ["--mapping-duration" as string]: `${shape.animation.durationMs}ms`,
    ["--mapping-delay" as string]: `${shape.animation.delayMs}ms`,
    ["--mapping-intensity" as string]: `${shape.animation.intensity}`,
    ["--mapping-fit" as string]: media.objectFit,
    opacity: shape.style.opacity,
    animationIterationCount: shape.animation.loop ? "infinite" : "1"
  };
}

function VideoMedia({ src, playbackMode }: { src: string; playbackMode: "play" | "stop" }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (playbackMode === "stop") {
      video.pause();
      video.currentTime = 0;
      return;
    }

    void video.play().catch(() => {
      // Browsers can reject autoplay before metadata is ready. The next update retries.
    });
  }, [playbackMode, src]);

  return (
    <video
      ref={videoRef}
      className="mapping-layer__media"
      src={src}
      autoPlay={playbackMode === "play"}
      muted
      loop
      playsInline
      preload={playbackMode === "play" ? "auto" : "metadata"}
    />
  );
}

function renderMedia(shape: Shape, playbackMode: "play" | "stop") {
  const media = shape.media ?? DEFAULT_MEDIA;

  if (media.kind === "video" && media.src) {
    return <VideoMedia src={media.src} playbackMode={playbackMode} />;
  }

  if (media.kind === "image" && media.src) {
    return <img className="mapping-layer__media" src={media.src} alt={media.label ?? shape.name} />;
  }

  return <div className="mapping-layer__fallback" style={{ background: shape.style.fill, opacity: shape.style.opacity }} />;
}

export function MappingStage({
  project,
  selectedShapeId,
  selectedPointIndex = null,
  editable = false,
  playbackMode = "play",
  showChrome = true,
  surfaceBackground,
  zoom = 1,
  onSelectShape,
  onSelectPoint,
  onPointsChange,
  onTogglePlayback,
  onZoomChange
}: MappingStageProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const zoomAnchorRef = useRef<ZoomAnchor | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [fitScale, setFitScale] = useState(1);
  const selectedShape = project.scene.shapes.find((shape) => shape.id === selectedShapeId) ?? null;
  const stageZoom = editable ? clamp(zoom, MIN_ZOOM, MAX_ZOOM) : 1;
  const effectiveScale = editable ? fitScale * stageZoom : 1;

  useEffect(() => {
    if (!editable || !dragState || !onPointsChange || !surfaceRef.current) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const rect = surfaceRef.current?.getBoundingClientRect();

      if (!rect) {
        return;
      }

      const currentPoint = toStagePoint(event.clientX, event.clientY, rect, project);

      if (dragState.mode === "shape") {
        const dx = currentPoint.x - dragState.start.x;
        const dy = currentPoint.y - dragState.start.y;
        const nextPoints = dragState.originPoints.map((point) =>
          clampPointToStage(
            {
              x: point.x + dx,
              y: point.y + dy
            },
            project
          )
        );

        onPointsChange(dragState.shapeId, nextPoints);
        return;
      }

      const activeShape = project.scene.shapes.find((shape) => shape.id === dragState.shapeId);

      if (!activeShape?.points) {
        return;
      }

      const nextPoints = [...activeShape.points];
      nextPoints[dragState.pointIndex] = clampPointToStage(currentPoint, project);
      onPointsChange(dragState.shapeId, nextPoints);
    };

    const handlePointerUp = () => setDragState(null);

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragState, editable, onPointsChange, project]);

  useEffect(() => {
    const viewport = viewportRef.current;
    const surface = surfaceRef.current;
    const anchor = zoomAnchorRef.current;

    if (!editable || !viewport || !surface || !anchor) {
      return;
    }

    viewport.scrollLeft = clamp(
      (anchor.pointX / project.width) * surface.clientWidth - anchor.offsetX,
      0,
      Math.max(surface.clientWidth - viewport.clientWidth, 0)
    );
    viewport.scrollTop = clamp(
      (anchor.pointY / project.height) * surface.clientHeight - anchor.offsetY,
      0,
      Math.max(surface.clientHeight - viewport.clientHeight, 0)
    );
    zoomAnchorRef.current = null;
  }, [editable, project.height, project.width, stageZoom]);

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!editable || !onZoomChange || !viewport) {
      return;
    }

    const handleWheel = (event: WheelEvent) => {
      if ((!event.ctrlKey && !event.metaKey) || !surfaceRef.current || !viewportRef.current) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const delta = event.deltaY < 0 ? 0.12 : -0.12;
      const nextZoom = Number(clamp(stageZoom + delta, MIN_ZOOM, MAX_ZOOM).toFixed(2));

      if (nextZoom === stageZoom) {
        return;
      }

      const surfaceRect = surfaceRef.current.getBoundingClientRect();
      const viewportRect = viewportRef.current.getBoundingClientRect();

      zoomAnchorRef.current = {
        pointX: clamp(((event.clientX - surfaceRect.left) / surfaceRect.width) * project.width, 0, project.width),
        pointY: clamp(((event.clientY - surfaceRect.top) / surfaceRect.height) * project.height, 0, project.height),
        offsetX: event.clientX - viewportRect.left,
        offsetY: event.clientY - viewportRect.top
      };

      onZoomChange(nextZoom);
    };

    viewport.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      viewport.removeEventListener("wheel", handleWheel);
    };
  }, [editable, onZoomChange, project.height, project.width, stageZoom]);

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!editable || !viewport || typeof ResizeObserver === "undefined") {
      setFitScale(1);
      return;
    }

    const updateFitScale = () => {
      const availableWidth = viewport.clientWidth;
      const availableHeight = viewport.clientHeight;

      if (!availableWidth || !availableHeight) {
        return;
      }

      const nextFitScale = Math.min(1, (availableHeight * project.width) / (availableWidth * project.height));

      setFitScale((current) => (Math.abs(current - nextFitScale) > 0.01 ? nextFitScale : current));
    };

    updateFitScale();

    const resizeObserver = new ResizeObserver(() => {
      updateFitScale();
    });

    resizeObserver.observe(viewport);

    return () => {
      resizeObserver.disconnect();
    };
  }, [editable, project.height, project.width]);

  return (
    <section className={`stage-card ${editable ? "stage-card--editor" : ""} ${showChrome ? "" : "stage-card--presentation"}`}>
      {showChrome ? (
        <div className="stage-card__meta">
          <div>
            <strong>Palco de mapping</strong>
            <p>Insira, arraste e ajuste os pontos diretamente aqui.</p>
          </div>
          <div className="stage-card__controls">
            {editable && onTogglePlayback ? (
              <button type="button" className="button button--ghost button--sm" onClick={onTogglePlayback}>
                {playbackMode === "play" ? "Parar videos" : "Reproduzir videos"}
              </button>
            ) : null}
            {editable && onZoomChange ? (
              <>
                <span className="stage-chip">Zoom {Math.round(stageZoom * 100)}%</span>
                <button
                  type="button"
                  className="button button--ghost button--sm"
                  disabled={stageZoom === 1}
                  onClick={() => onZoomChange(1)}
                >
                  Resetar zoom
                </button>
              </>
            ) : null}
            <span>
              {project.width} x {project.height}
            </span>
          </div>
        </div>
      ) : null}

      <div
        ref={viewportRef}
        className={`mapping-stage__viewport ${editable ? "is-editable" : ""} ${showChrome ? "" : "is-presentation"}`}
      >
        <div className="mapping-stage__canvas">
          <div
            ref={surfaceRef}
            className={`mapping-stage ${editable ? "is-editable" : ""}`}
            style={{
              ["--stage-ratio" as string]: `${project.width / project.height}`,
              aspectRatio: `${project.width} / ${project.height}`,
              width: editable ? `${effectiveScale * 100}%` : "100%"
            }}
            onPointerDown={(event) => {
              if (
                event.target === event.currentTarget ||
                (event.target as HTMLElement).classList.contains("mapping-stage__surface")
              ) {
                onSelectShape?.(null);
                onSelectPoint?.(null);
              }
            }}
          >
            <div className="mapping-stage__surface" style={{ background: surfaceBackground ?? project.scene.background }}>
              {project.scene.shapes.map((shape) => {
                const points = shape.points ?? [];
                const media = shape.media ?? DEFAULT_MEDIA;
                const bounds = getPointsBounds(points);
                const relativePoints = relativePolygon(points, bounds);
                const polygonClipPath = clipPathFromRelativePoints(relativePoints, bounds.width, bounds.height);
                const selected = shape.id === selectedShapeId;

                return (
                  <div
                    key={shape.id}
                    className={`mapping-layer ${selected ? "is-selected" : ""}`}
                    style={{
                      left: `${(bounds.x / project.width) * 100}%`,
                      top: `${(bounds.y / project.height) * 100}%`,
                      width: `${(bounds.width / project.width) * 100}%`,
                      height: `${(bounds.height / project.height) * 100}%`
                    }}
                  >
                    <button
                      type="button"
                      className="mapping-layer__hit"
                      style={{ clipPath: polygonClipPath }}
                      onPointerDown={(event) => {
                        if (!editable || !shape.points || !surfaceRef.current) {
                          return;
                        }

                        event.stopPropagation();
                        onSelectShape?.(shape.id);
                        onSelectPoint?.(null);

                        const rect = surfaceRef.current.getBoundingClientRect();

                        setDragState({
                          mode: "shape",
                          shapeId: shape.id,
                          start: toStagePoint(event.clientX, event.clientY, rect, project),
                          originPoints: [...shape.points]
                        });
                      }}
                      onDoubleClick={(event) => {
                        if (!editable || !shape.points || !onPointsChange || !surfaceRef.current) {
                          return;
                        }

                        event.stopPropagation();

                        const rect = surfaceRef.current.getBoundingClientRect();
                        const stagePoint = toStagePoint(event.clientX, event.clientY, rect, project);
                        const threshold = 18 / (rect.width / project.width);
                        const insertion = findInsertion(shape.points, stagePoint, threshold);

                        if (!insertion) {
                          return;
                        }

                        const nextPoints = [...shape.points];
                        nextPoints.splice(insertion.segmentIndex + 1, 0, insertion.point);
                        onPointsChange(shape.id, nextPoints);
                        onSelectShape?.(shape.id);
                        onSelectPoint?.(insertion.segmentIndex + 1);
                      }}
                    />

                    <div
                      className={`mapping-layer__content animation--${shape.animation.type}`}
                      style={{
                        clipPath: polygonClipPath,
                        ...animationStyle(shape)
                      }}
                    >
                      {renderMedia(shape, playbackMode)}
                    </div>

                    <svg
                      className="mapping-layer__overlay"
                      viewBox={`0 0 ${bounds.width} ${bounds.height}`}
                      preserveAspectRatio="none"
                    >
                      <polygon
                        points={svgPointsString(relativePoints)}
                        fill={media.kind === "none" ? shape.style.fill : "rgba(0,0,0,0.08)"}
                        fillOpacity={media.kind === "none" ? shape.style.opacity : 0.25}
                        stroke={selected ? "#f97316" : shape.style.stroke}
                        strokeWidth={selected ? shape.style.strokeWidth + 1 : shape.style.strokeWidth}
                        strokeDasharray={selected ? "10 8" : undefined}
                      />
                    </svg>
                  </div>
                );
              })}

              {editable && selectedShape?.points
                ? selectedShape.points.map((point, index) => (
                    <button
                      key={`${selectedShape.id}-${index}`}
                      type="button"
                      className={`mapping-stage__handle ${selectedPointIndex === index ? "is-active" : ""}`}
                      aria-label={`Mover ponto ${index + 1}`}
                      style={stagePointToCss(point, project)}
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        onSelectShape?.(selectedShape.id);
                        onSelectPoint?.(index);
                        setDragState({
                          mode: "point",
                          shapeId: selectedShape.id,
                          pointIndex: index
                        });
                      }}
                    />
                  ))
                : null}
            </div>
          </div>
        </div>
      </div>

      {showChrome ? (
        <div className="stage-card__hint">
          <span>Arraste a forma para mover. Arraste os pontos para deformar.</span>
          <span>{editable ? "Ctrl + scroll ajusta o zoom no ponto do cursor." : "Duplo clique em uma aresta cria um novo ponto no editor."}</span>
        </div>
      ) : null}
    </section>
  );
}
