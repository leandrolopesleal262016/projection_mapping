import type { Point, Shape } from "@projection-mapping/shared";

function pointsToString(points: Point[]): string {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

export function getLocalShapePoints(shape: Shape): Point[] {
  const { width, height } = shape.transform;

  switch (shape.type) {
    case "triangle":
      return [
        { x: width / 2, y: 0 },
        { x: width, y: height },
        { x: 0, y: height }
      ];
    case "polygon":
      return shape.points ?? [];
    default:
      return [];
  }
}

export function buildShapeSvgMarkup(shape: Shape): string {
  const { width, height } = shape.transform;
  const { fill, stroke, strokeWidth, opacity } = shape.style;
  const common = `fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}"`;

  if (shape.type === "svg" && shape.svgMarkup) {
    return shape.svgMarkup;
  }

  let content = "";

  if (shape.type === "rectangle") {
    content = `<rect x="0" y="0" width="${width}" height="${height}" rx="18" ry="18" ${common} />`;
  }

  if (shape.type === "circle") {
    content = `<ellipse cx="${width / 2}" cy="${height / 2}" rx="${width / 2}" ry="${height / 2}" ${common} />`;
  }

  if (shape.type === "triangle" || shape.type === "polygon") {
    content = `<polygon points="${pointsToString(getLocalShapePoints(shape))}" ${common} />`;
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      ${content}
    </svg>
  `.trim();
}

export function buildEditorShapeHref(shape: Shape): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(buildShapeSvgMarkup(shape))}`;
}
