import {
  DEFAULT_ANIMATION,
  DEFAULT_STYLE,
  clamp,
  createDefaultQuad,
  type AnimationConfig,
  type Point,
  type ProjectRecord,
  type ProjectScene,
  type Shape,
  type ShapeStyle,
  type ShapeTransform,
  type ShapeType
} from "@projection-mapping/shared";

function createPolygonPoints(sides: number, width: number, height: number): Point[] {
  const radius = Math.min(width, height) / 2;
  const centerX = width / 2;
  const centerY = height / 2;

  return Array.from({ length: sides }, (_, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / sides;

    return {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius
    };
  });
}

export function createShapeDraft(type: ShapeType, scene: ProjectScene): Shape {
  const x = 120 + scene.shapes.length * 32;
  const y = 100 + scene.shapes.length * 24;
  const baseTransform: ShapeTransform = {
    x,
    y,
    width: type === "circle" ? 180 : 220,
    height: type === "triangle" ? 220 : 160,
    rotation: 0
  };

  const styles: Record<ShapeType, ShapeStyle> = {
    rectangle: { fill: "#14b8a6", stroke: "#ffffff", strokeWidth: 2, opacity: 0.95 },
    circle: { fill: "#f59e0b", stroke: "#ffffff", strokeWidth: 2, opacity: 0.9 },
    triangle: { fill: "#ef4444", stroke: "#ffffff", strokeWidth: 2, opacity: 0.88 },
    polygon: { fill: "#6366f1", stroke: "#ffffff", strokeWidth: 2, opacity: 0.9 },
    svg: DEFAULT_STYLE
  };

  return {
    id: crypto.randomUUID(),
    name: `Forma ${scene.shapes.length + 1}`,
    type,
    transform: baseTransform,
    style: styles[type],
    points: type === "polygon" ? createPolygonPoints(6, baseTransform.width, baseTransform.height) : undefined,
    quad: createDefaultQuad(baseTransform),
    isCalibrated: false,
    animation: DEFAULT_ANIMATION,
    svgMarkup: undefined
  };
}

export function updateShapeInScene(
  scene: ProjectScene,
  shapeId: string,
  updater: (shape: Shape) => Shape
): ProjectScene {
  return {
    ...scene,
    shapes: scene.shapes.map((shape) => (shape.id === shapeId ? updater(shape) : shape))
  };
}

export function removeShapeFromScene(scene: ProjectScene, shapeId: string): ProjectScene {
  return {
    ...scene,
    shapes: scene.shapes.filter((shape) => shape.id !== shapeId)
  };
}

export function updateShapeTransform(shape: Shape, patch: Partial<ShapeTransform>): Shape {
  const nextTransform = {
    ...shape.transform,
    ...patch,
    width: clamp(patch.width ?? shape.transform.width, 24, 4096),
    height: clamp(patch.height ?? shape.transform.height, 24, 4096)
  };

  return {
    ...shape,
    transform: nextTransform,
    quad: shape.isCalibrated ? shape.quad : createDefaultQuad(nextTransform)
  };
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

export function resetShapeCalibration(shape: Shape): Shape {
  return {
    ...shape,
    quad: createDefaultQuad(shape.transform),
    isCalibrated: false
  };
}

export function cloneProjectWithScene(project: ProjectRecord, scene: ProjectScene): ProjectRecord {
  return {
    ...project,
    scene,
    updatedAt: new Date().toISOString()
  };
}
