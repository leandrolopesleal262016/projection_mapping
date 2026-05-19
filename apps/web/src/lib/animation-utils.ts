import type { AnimationConfig, Point } from "@projection-mapping/shared";

function centerOfQuad(quad: [Point, Point, Point, Point]): Point {
  return {
    x: (quad[0].x + quad[1].x + quad[2].x + quad[3].x) / 4,
    y: (quad[0].y + quad[1].y + quad[2].y + quad[3].y) / 4
  };
}

function transformPoint(point: Point, center: Point, matrix: [number, number, number, number]): Point {
  const translatedX = point.x - center.x;
  const translatedY = point.y - center.y;

  return {
    x: center.x + translatedX * matrix[0] + translatedY * matrix[1],
    y: center.y + translatedX * matrix[2] + translatedY * matrix[3]
  };
}

export function applyAnimationToQuad(
  quad: [Point, Point, Point, Point],
  animation: AnimationConfig,
  timeMs: number
): [Point, Point, Point, Point] {
  if (animation.type === "none") {
    return quad;
  }

  const phase = ((timeMs + animation.delayMs) % animation.durationMs) / animation.durationMs;
  const center = centerOfQuad(quad);

  if (animation.type === "pulse") {
    const scale = 1 + Math.sin(phase * Math.PI * 2) * animation.intensity;

    return quad.map((point) =>
      transformPoint(point, center, [scale, 0, 0, scale])
    ) as [Point, Point, Point, Point];
  }

  if (animation.type === "rotate") {
    const angle = Math.sin(phase * Math.PI * 2) * animation.intensity * Math.PI;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    return quad.map((point) =>
      transformPoint(point, center, [cos, -sin, sin, cos])
    ) as [Point, Point, Point, Point];
  }

  if (animation.type === "drift") {
    const offsetX = Math.sin(phase * Math.PI * 2) * animation.intensity * 90;
    const offsetY = Math.cos(phase * Math.PI * 2) * animation.intensity * 56;

    return quad.map((point) => ({
      x: point.x + offsetX,
      y: point.y + offsetY
    })) as [Point, Point, Point, Point];
  }

  return quad;
}

export function computeAnimatedOpacity(
  baseOpacity: number,
  animation: AnimationConfig,
  timeMs: number
): number {
  if (animation.type !== "strobe") {
    return baseOpacity;
  }

  const phase = ((timeMs + animation.delayMs) % animation.durationMs) / animation.durationMs;
  const modulation = 0.5 + Math.sin(phase * Math.PI * 2) * animation.intensity;

  return Math.max(0.12, Math.min(1, baseOpacity * modulation));
}
