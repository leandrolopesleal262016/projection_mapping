import {
  DEFAULT_ANIMATION,
  DEFAULT_MEDIA,
  clamp,
  createShape,
  getPointsBounds,
  normalizeProject,
  syncShapeGeometry,
  translatePoints,
  type AnimationConfig,
  type MediaFit,
  type Point,
  type ProjectRecord,
  type ProjectScene,
  type Shape,
  type ShapeMedia,
  type ShapeStyle
} from "@projection-mapping/shared";

function colorForIndex(index: number): ShapeStyle {
  const palette: ShapeStyle[] = [
    { fill: "#14b8a6", stroke: "#ffffff", strokeWidth: 2, opacity: 0.9 },
    { fill: "#f59e0b", stroke: "#ffffff", strokeWidth: 2, opacity: 0.92 },
    { fill: "#ef4444", stroke: "#ffffff", strokeWidth: 2, opacity: 0.9 },
    { fill: "#6366f1", stroke: "#ffffff", strokeWidth: 2, opacity: 0.9 }
  ];

  return palette[index % palette.length];
}

export function normalizeProjectForEditor(project: ProjectRecord): ProjectRecord {
  return normalizeProject(project);
}

export function createPolygonDraft(scene: ProjectScene, media?: ShapeMedia): Shape {
  const index = scene.shapes.length;
  const x = 120 + index * 28;
  const y = 90 + index * 24;

  return createShape({
    id: crypto.randomUUID(),
    name: `Forma ${index + 1}`,
    type: "polygon",
    transform: {
      x,
      y,
      width: 240,
      height: 180,
      rotation: 0
    },
    points: [
      { x, y: y + 18 },
      { x: x + 228, y },
      { x: x + 240, y: y + 146 },
      { x: x + 180, y: y + 180 },
      { x: x + 12, y: y + 168 }
    ],
    style: colorForIndex(index),
    animation: DEFAULT_ANIMATION,
    media: media ?? DEFAULT_MEDIA
  });
}

export function updateShapeInScene(
  scene: ProjectScene,
  shapeId: string,
  updater: (shape: Shape) => Shape
): ProjectScene {
  return {
    ...scene,
    shapes: scene.shapes.map((shape) => (shape.id === shapeId ? syncShapeGeometry(updater(shape)) : shape))
  };
}

export function removeShapeFromScene(scene: ProjectScene, shapeId: string): ProjectScene {
  return {
    ...scene,
    shapes: scene.shapes.filter((shape) => shape.id !== shapeId)
  };
}

function getUniformTranslation(previousPoints: Point[] | undefined, nextPoints: Point[]): { dx: number; dy: number } | null {
  if (!previousPoints || previousPoints.length !== nextPoints.length || previousPoints.length === 0) {
    return null;
  }

  const dx = nextPoints[0].x - previousPoints[0].x;
  const dy = nextPoints[0].y - previousPoints[0].y;

  const isUniform = previousPoints.every((point, index) => {
    const target = nextPoints[index];

    return Math.abs(target.x - point.x - dx) < 0.0001 && Math.abs(target.y - point.y - dy) < 0.0001;
  });

  return isUniform ? { dx, dy } : null;
}

export function updateShapePoints(shape: Shape, points: Point[]): Shape {
  const translation = getUniformTranslation(shape.points, points);

  return syncShapeGeometry({
    ...shape,
    media:
      shape.media?.frame && translation
        ? {
            ...shape.media,
            frame: {
              ...shape.media.frame,
              x: shape.media.frame.x + translation.dx,
              y: shape.media.frame.y + translation.dy
            }
          }
        : shape.media,
    points,
    isCalibrated: true
  });
}

export function moveShape(shape: Shape, dx: number, dy: number): Shape {
  return updateShapePoints(shape, translatePoints(shape.points ?? [], dx, dy));
}

export function moveShapeTo(shape: Shape, x: number, y: number): Shape {
  const bounds = getPointsBounds(shape.points ?? []);

  return moveShape(shape, x - bounds.x, y - bounds.y);
}

export function updateShapeStyle(shape: Shape, patch: Partial<ShapeStyle>): Shape {
  return {
    ...shape,
    style: {
      ...shape.style,
      ...patch
    }
  };
}

export function updateShapeAnimation(shape: Shape, patch: Partial<AnimationConfig>): Shape {
  return {
    ...shape,
    animation: {
      ...shape.animation,
      ...patch
    }
  };
}

export function updateShapeMedia(shape: Shape, patch: Partial<ShapeMedia>): Shape {
  const media = {
    ...shape.media,
    ...patch
  };

  return {
    ...shape,
    media:
      media.kind !== "none"
        ? {
            ...media,
            frame: media.frame ?? { ...shape.transform }
          }
        : media
  };
}

export function clearShapeMedia(shape: Shape): Shape {
  return {
    ...shape,
    media: DEFAULT_MEDIA
  };
}

export function updateShapeFit(shape: Shape, objectFit: MediaFit): Shape {
  return updateShapeMedia(shape, {
    objectFit
  });
}

export function cloneProjectWithScene(project: ProjectRecord, scene: ProjectScene): ProjectRecord {
  return {
    ...project,
    scene: normalizeProjectForEditor({
      ...project,
      scene
    }).scene,
    updatedAt: new Date().toISOString()
  };
}

export function insertPointIntoPolygon(shape: Shape, segmentIndex: number, point: Point): Shape {
  const nextPoints = [...(shape.points ?? [])];

  nextPoints.splice(segmentIndex + 1, 0, point);

  return updateShapePoints(shape, nextPoints);
}

export function clampPointToStage(point: Point, project: Pick<ProjectRecord, "width" | "height">): Point {
  return {
    x: clamp(point.x, 0, project.width),
    y: clamp(point.y, 0, project.height)
  };
}
