export type ShapeType = "rectangle" | "circle" | "triangle" | "polygon" | "svg";

export type AnimationType = "none" | "pulse" | "drift" | "rotate" | "strobe";

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
}

export interface ProjectScene {
  background: string;
  shapes: Shape[];
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

export function createShape(
  input: Partial<Shape> & Pick<Shape, "id" | "name" | "type" | "transform">
): Shape {
  const baseTransform = input.transform;

  return {
    id: input.id,
    name: input.name,
    type: input.type,
    transform: baseTransform,
    style: input.style ?? DEFAULT_STYLE,
    points: input.points,
    quad: input.quad ?? createDefaultQuad(baseTransform),
    isCalibrated: input.isCalibrated ?? false,
    animation: input.animation ?? DEFAULT_ANIMATION,
    svgMarkup: input.svgMarkup
  };
}

export function createDefaultProject(
  id: string,
  name = "Projeto Demo",
  width = 1280,
  height = 720
): ProjectRecord {
  const rectangle = createShape({
    id: `${id}-shape-1`,
    name: "Palco Principal",
    type: "rectangle",
    transform: {
      x: 140,
      y: 120,
      width: 320,
      height: 180,
      rotation: 0
    }
  });

  const circle = createShape({
    id: `${id}-shape-2`,
    name: "Aura",
    type: "circle",
    transform: {
      x: 580,
      y: 180,
      width: 220,
      height: 220,
      rotation: 0
    },
    style: {
      fill: "#ffd166",
      stroke: "#ffffff",
      strokeWidth: 2,
      opacity: 0.9
    },
    animation: {
      type: "pulse",
      durationMs: 2600,
      loop: true,
      intensity: 0.18,
      delayMs: 0
    }
  });

  const triangle = createShape({
    id: `${id}-shape-3`,
    name: "Triângulo",
    type: "triangle",
    transform: {
      x: 900,
      y: 180,
      width: 220,
      height: 260,
      rotation: 0
    },
    style: {
      fill: "#ff7b72",
      stroke: "#ffffff",
      strokeWidth: 2,
      opacity: 0.85
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

  return {
    id,
    name,
    width,
    height,
    scene: {
      background: "#081421",
      shapes: [rectangle, circle, triangle]
    },
    createdAt: now,
    updatedAt: now
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
