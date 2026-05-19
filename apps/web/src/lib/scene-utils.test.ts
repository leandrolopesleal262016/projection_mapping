import { describe, expect, it } from "vitest";

import { translatePoints } from "@projection-mapping/shared";

import { createPolygonDraft, updateShapeMedia, updateShapePoints } from "./scene-utils";

describe("scene utils media frame", () => {
  it("keeps the cover frame stable while polygon handles deform the shape", () => {
    const shape = updateShapeMedia(createPolygonDraft({ background: "#000", shapes: [] }), {
      kind: "image",
      src: "data:image/png;base64,AAAA",
      mimeType: "image/png",
      label: "sample",
      objectFit: "cover"
    });
    const originalFrame = shape.media.frame;
    const nextPoints = [...(shape.points ?? [])];

    nextPoints[0] = {
      x: nextPoints[0].x + 64,
      y: nextPoints[0].y + 18
    };

    const updatedShape = updateShapePoints(shape, nextPoints);

    expect(updatedShape.media.frame).toEqual(originalFrame);
  });

  it("moves the cover frame together with the polygon on full-shape translations", () => {
    const shape = updateShapeMedia(createPolygonDraft({ background: "#000", shapes: [] }), {
      kind: "image",
      src: "data:image/png;base64,BBBB",
      mimeType: "image/png",
      label: "sample",
      objectFit: "cover"
    });
    const translatedPoints = translatePoints(shape.points ?? [], 48, 22);

    const updatedShape = updateShapePoints(shape, translatedPoints);

    expect(updatedShape.media.frame).toMatchObject({
      x: (shape.media.frame?.x ?? 0) + 48,
      y: (shape.media.frame?.y ?? 0) + 22,
      width: shape.media.frame?.width,
      height: shape.media.frame?.height
    });
  });
});
