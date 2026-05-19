import type { ShapeMedia } from "@projection-mapping/shared";

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Falha ao ler arquivo."));
    reader.readAsDataURL(file);
  });
}

export async function createMediaFromFile(file: File): Promise<ShapeMedia> {
  const src = await readFileAsDataUrl(file);
  const mimeType = file.type || "application/octet-stream";

  return {
    kind: mimeType.startsWith("video/") ? "video" : "image",
    src,
    mimeType,
    label: file.name,
    objectFit: mimeType === "image/svg+xml" ? "contain" : "cover"
  };
}
