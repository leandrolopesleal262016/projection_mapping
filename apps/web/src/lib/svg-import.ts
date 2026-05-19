export interface ImportedSvgPayload {
  markup: string;
  width: number;
  height: number;
}

function extractDimension(root: Element, attribute: string, fallback: number): number {
  const value = root.getAttribute(attribute);

  if (!value) {
    return fallback;
  }

  const numeric = Number.parseFloat(value);

  return Number.isFinite(numeric) ? numeric : fallback;
}

export function parseSvgMarkup(markup: string): ImportedSvgPayload {
  const parser = new DOMParser();
  const documentNode = parser.parseFromString(markup, "image/svg+xml");
  const root = documentNode.documentElement;
  const viewBox = root.getAttribute("viewBox")?.split(/\s+/).map(Number) ?? [];
  const width = extractDimension(root, "width", viewBox[2] || 240);
  const height = extractDimension(root, "height", viewBox[3] || 240);

  if (root.nodeName.toLowerCase() !== "svg") {
    throw new Error("Arquivo SVG inválido.");
  }

  return {
    markup,
    width,
    height
  };
}
