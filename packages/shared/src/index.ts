export type ShapeType = "rectangle" | "circle" | "triangle" | "polygon" | "svg";

export type AnimationType = "none" | "pulse" | "drift" | "rotate" | "strobe";

export type MediaKind = "none" | "image" | "video";

export type MediaFit = "cover" | "contain" | "fill";

export interface Point {
  x: number;
  y: number;
}

export interface ShapeStyle {
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
}

export interface ShapeTransform {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export interface AnimationConfig {
  type: AnimationType;
  durationMs: number;
  loop: boolean;
  intensity: number;
  delayMs: number;
}

export interface ShapeMedia {
  kind: MediaKind;
  src: string | null;
  mimeType?: string;
  label?: string;
  objectFit: MediaFit;
  frame?: ShapeTransform;
}

export interface Shape {
  id: string;
  name: string;
  type: ShapeType;
  transform: ShapeTransform;
  style: ShapeStyle;
  points?: Point[];
  quad: [Point, Point, Point, Point];
  isCalibrated: boolean;
  animation: AnimationConfig;
  svgMarkup?: string;
  media: ShapeMedia;
}

export interface ProjectScene {
  background: string;
  shapes: Shape[];
}

export interface ProjectionMediaPatch {
  shapeId: string;
  media: ShapeMedia;
}

export interface ProjectRecord {
  id: string;
  name: string;
  width: number;
  height: number;
  scene: ProjectScene;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  width: number;
  height: number;
  updatedAt: string;
}

export interface RuntimeSceneState {
  projectId: string;
  scene: ProjectScene;
  updatedAt: string;
}

export interface SaveScenePayload {
  scene: ProjectScene;
}

export interface CreateProjectPayload {
  name: string;
  width: number;
  height: number;
}

export interface CalibrationPayload {
  shapeId: string;
  quad: [Point, Point, Point, Point];
}

export const DEFAULT_ANIMATION: AnimationConfig = {
  type: "none",
  durationMs: 2400,
  loop: true,
  intensity: 0.25,
  delayMs: 0
};

export const DEFAULT_STYLE: ShapeStyle = {
  fill: "#5fffd7",
  stroke: "#ffffff",
  strokeWidth: 2,
  opacity: 1
};

export const DEFAULT_MEDIA: ShapeMedia = {
  kind: "none",
  src: null,
  objectFit: "cover"
};

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function createDefaultQuad(
  transform: Pick<ShapeTransform, "x" | "y" | "width" | "height">
): [Point, Point, Point, Point] {
  return [
    { x: transform.x, y: transform.y },
    { x: transform.x + transform.width, y: transform.y },
    { x: transform.x + transform.width, y: transform.y + transform.height },
    { x: transform.x, y: transform.y + transform.height }
  ];
}

export function clonePoints(points: Point[]): Point[] {
  return points.map((point) => ({
    x: point.x,
    y: point.y
  }));
}

export function createRectanglePoints(x: number, y: number, width: number, height: number): Point[] {
  return [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height }
  ];
}

export function createRegularPolygonPoints(
  x: number,
  y: number,
  width: number,
  height: number,
  sides: number
): Point[] {
  const radius = Math.min(width, height) / 2;
  const centerX = x + width / 2;
  const centerY = y + height / 2;

  return Array.from({ length: sides }, (_, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / sides;

    return {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius
    };
  });
}

export function createEllipsePoints(
  x: number,
  y: number,
  width: number,
  height: number,
  segments = 12
): Point[] {
  const radiusX = width / 2;
  const radiusY = height / 2;
  const centerX = x + radiusX;
  const centerY = y + radiusY;

  return Array.from({ length: segments }, (_, index) => {
    const angle = (Math.PI * 2 * index) / segments;

    return {
      x: centerX + Math.cos(angle) * radiusX,
      y: centerY + Math.sin(angle) * radiusY
    };
  });
}

export function getPointsBounds(points: Point[]): ShapeTransform {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
    rotation: 0
  };
}

function normalizeMedia(shape: Partial<Shape>): ShapeMedia {
  if (shape.media) {
    return {
      ...DEFAULT_MEDIA,
      ...shape.media
    };
  }

  if (shape.svgMarkup) {
    return {
      kind: "image",
      src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(shape.svgMarkup)}`,
      mimeType: "image/svg+xml",
      label: shape.name,
      objectFit: "fill"
    };
  }

  return DEFAULT_MEDIA;
}

function mediaMatches(first: ShapeMedia, second: ShapeMedia): boolean {
  return (
    first.kind === second.kind &&
    first.src === second.src &&
    first.mimeType === second.mimeType &&
    first.label === second.label &&
    first.objectFit === second.objectFit
  );
}

function pointsMatch(first: Point[], second: Point[]): boolean {
  if (first.length !== second.length) {
    return false;
  }

  return first.every((point, index) => {
    const target = second[index];

    return Math.abs(point.x - target.x) < 0.0001 && Math.abs(point.y - target.y) < 0.0001;
  });
}

function looksLocalPoints(points: Point[], transform: ShapeTransform): boolean {
  if (points.length === 0) {
    return true;
  }

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);

  return (
    Math.min(...xs) >= -0.001 &&
    Math.min(...ys) >= -0.001 &&
    Math.max(...xs) <= transform.width + 0.001 &&
    Math.max(...ys) <= transform.height + 0.001
  );
}

function shapePointsFromType(shape: Shape): Point[] {
  const { x, y, width, height } = shape.transform;

  if (shape.points && shape.points.length >= 3) {
    return looksLocalPoints(shape.points, shape.transform)
      ? shape.points.map((point) => ({
          x: point.x + x,
          y: point.y + y
        }))
      : clonePoints(shape.points);
  }

  if (shape.isCalibrated && !pointsMatch(shape.quad, createDefaultQuad(shape.transform))) {
    return clonePoints(shape.quad);
  }

  switch (shape.type) {
    case "circle":
      return createEllipsePoints(x, y, width, height, 16);
    case "triangle":
      return [
        { x: x + width / 2, y },
        { x: x + width, y: y + height },
        { x, y: y + height }
      ];
    case "polygon":
      return createRegularPolygonPoints(x, y, width, height, 6);
    case "svg":
    case "rectangle":
    default:
      return createRectanglePoints(x, y, width, height);
  }
}

export function translatePoints(points: Point[], dx: number, dy: number): Point[] {
  return points.map((point) => ({
    x: point.x + dx,
    y: point.y + dy
  }));
}

export function syncShapeGeometry(shape: Shape): Shape {
  const rawPoints = shape.points && shape.points.length >= 3 ? clonePoints(shape.points) : shapePointsFromType(shape);
  const transform = getPointsBounds(rawPoints);

  return {
    ...shape,
    type: "polygon",
    transform,
    points: rawPoints,
    quad: createDefaultQuad(transform),
    media: normalizeMedia(shape),
    style: shape.style ?? DEFAULT_STYLE,
    animation: shape.animation ?? DEFAULT_ANIMATION
  };
}

export function normalizeShape(shape: Shape): Shape {
  return syncShapeGeometry({
    ...shape,
    media: normalizeMedia(shape),
    style: shape.style ?? DEFAULT_STYLE,
    animation: shape.animation ?? DEFAULT_ANIMATION
  });
}

export function normalizeProject(project: ProjectRecord): ProjectRecord {
  return {
    ...project,
    scene: {
      ...project.scene,
      background: project.scene.background || "#081421",
      shapes: project.scene.shapes.map((shape) => normalizeShape(shape))
    }
  };
}

export function createProjectionMediaPatches(
  scene: ProjectScene,
  previousScene: ProjectScene | null = null
): ProjectionMediaPatch[] {
  const previousShapes = new Map(previousScene?.shapes.map((shape) => [shape.id, shape]) ?? []);

  return scene.shapes.flatMap((shape) => {
    const previousShape = previousShapes.get(shape.id);

    if (previousShape && mediaMatches(shape.media, previousShape.media)) {
      return [];
    }

    return [
      {
        shapeId: shape.id,
        media: {
          ...shape.media
        }
      }
    ];
  });
}

export function stripSceneMedia(
  scene: ProjectScene,
  mediaPatches: ProjectionMediaPatch[] = []
): ProjectScene {
  const patchShapeIds = new Set(mediaPatches.map((patch) => patch.shapeId));

  return {
    ...scene,
    shapes: scene.shapes.map((shape) => ({
      ...shape,
      media:
        shape.media.src && !patchShapeIds.has(shape.id)
          ? {
              ...shape.media,
              src: null
            }
          : {
              ...shape.media
            }
    }))
  };
}

export function mergeProjectionScene(
  baseScene: ProjectScene,
  incomingScene: ProjectScene,
  mediaPatches: ProjectionMediaPatch[] = []
): ProjectScene {
  const baseShapes = new Map(baseScene.shapes.map((shape) => [shape.id, shape]));
  const patchMap = new Map(mediaPatches.map((patch) => [patch.shapeId, patch.media]));

  return {
    ...incomingScene,
    shapes: incomingScene.shapes.map((shape) => {
      const patchedMedia = patchMap.get(shape.id);

      if (patchedMedia) {
        return {
          ...shape,
          media: {
            ...patchedMedia
          }
        };
      }

      if (shape.media.src || shape.media.kind === "none") {
        return shape;
      }

      return {
        ...shape,
        media: {
          ...(baseShapes.get(shape.id)?.media ?? shape.media)
        }
      };
    })
  };
}

export function createShape(
  input: Partial<Shape> & Pick<Shape, "id" | "name" | "type" | "transform">
): Shape {
  return normalizeShape({
    id: input.id,
    name: input.name,
    type: input.type,
    transform: input.transform,
    style: input.style ?? DEFAULT_STYLE,
    points: input.points,
    quad: input.quad ?? createDefaultQuad(input.transform),
    isCalibrated: input.isCalibrated ?? false,
    animation: input.animation ?? DEFAULT_ANIMATION,
    svgMarkup: input.svgMarkup,
    media: input.media ?? DEFAULT_MEDIA
  });
}

export function createDefaultProject(
  id: string,
  name = "Projeto Demo",
  width = 1280,
  height = 720
): ProjectRecord {
  const mainStage = createShape({
    id: `${id}-shape-1`,
    name: "Fachada Principal",
    type: "polygon",
    transform: {
      x: 120,
      y: 110,
      width: 360,
      height: 220,
      rotation: 0
    },
    points: [
      { x: 132, y: 118 },
      { x: 470, y: 128 },
      { x: 446, y: 318 },
      { x: 118, y: 300 }
    ],
    style: {
      fill: "#14b8a6",
      stroke: "#ffffff",
      strokeWidth: 2,
      opacity: 0.9
    }
  });

  const portal = createShape({
    id: `${id}-shape-2`,
    name: "Portal",
    type: "polygon",
    transform: {
      x: 590,
      y: 150,
      width: 250,
      height: 240,
      rotation: 0
    },
    points: [
      { x: 648, y: 150 },
      { x: 802, y: 178 },
      { x: 832, y: 314 },
      { x: 746, y: 390 },
      { x: 618, y: 356 },
      { x: 590, y: 226 }
    ],
    style: {
      fill: "#f59e0b",
      stroke: "#ffffff",
      strokeWidth: 2,
      opacity: 0.92
    },
    animation: {
      type: "pulse",
      durationMs: 2600,
      loop: true,
      intensity: 0.18,
      delayMs: 0
    }
  });

  const sidePanel = createShape({
    id: `${id}-shape-3`,
    name: "Painel Lateral",
    type: "polygon",
    transform: {
      x: 910,
      y: 160,
      width: 250,
      height: 260,
      rotation: 0
    },
    points: [
      { x: 932, y: 172 },
      { x: 1146, y: 160 },
      { x: 1102, y: 418 },
      { x: 910, y: 392 }
    ],
    style: {
      fill: "#ef4444",
      stroke: "#ffffff",
      strokeWidth: 2,
      opacity: 0.88
    },
    animation: {
      type: "drift",
      durationMs: 3200,
      loop: true,
      intensity: 0.12,
      delayMs: 0
    }
  });

  const now = new Date().toISOString();

  return normalizeProject({
    id,
    name,
    width,
    height,
    scene: {
      background: "#081421",
      shapes: [mainStage, portal, sidePanel]
    },
    createdAt: now,
    updatedAt: now
  });
}
