import { describe, expect, it } from "vitest";

import { createPolygonDraft, updateShapeMedia, updateShapePoints } from "./scene-utils";

describe("scene utils media behavior", () => {
  it("does not create extra frame metadata when media is applied", () => {
    const shape = updateShapeMedia(createPolygonDraft({ background: "#000", shapes: [] }), {
      kind: "image",
      src: "data:image/png;base64,AAAA",
      mimeType: "image/png",
      label: "sample",
      objectFit: "cover"
    });

    expect(shape.media.frame).toBeUndefined();
  });

  it("keeps media attached when polygon points are edited", () => {
    const shape = updateShapeMedia(createPolygonDraft({ background: "#000", shapes: [] }), {
      kind: "image",
      src: "data:image/png;base64,BBBB",
      mimeType: "image/png",
      label: "sample",
      objectFit: "cover"
    });
    const nextPoints = [...(shape.points ?? [])];

    nextPoints[1] = {
      x: nextPoints[1].x + 24,
      y: nextPoints[1].y + 12
    };

    const updatedShape = updateShapePoints(shape, nextPoints);

    expect(updatedShape.media.src).toBe("data:image/png;base64,BBBB");
    expect(updatedShape.media.frame).toBeUndefined();
  });
});
