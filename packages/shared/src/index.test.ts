import { describe, expect, it } from "vitest";

import { createDefaultProject, createDefaultQuad, normalizeProject } from "./index";

describe("shared defaults", () => {
  it("creates a rectangle quad from a transform", () => {
    expect(
      createDefaultQuad({
        x: 10,
        y: 20,
        width: 30,
        height: 40
      })
    ).toEqual([
      { x: 10, y: 20 },
      { x: 40, y: 20 },
      { x: 40, y: 60 },
      { x: 10, y: 60 }
    ]);
  });

  it("creates a demo project with seeded shapes", () => {
    const project = createDefaultProject("demo");

    expect(project.scene.shapes).toHaveLength(3);
    expect(project.width).toBe(1280);
    expect(project.scene.shapes.every((shape) => shape.type === "polygon")).toBe(true);
    expect(project.scene.shapes.every((shape) => (shape.points?.length ?? 0) >= 4)).toBe(true);
  });

  it("normalizes legacy shapes into polygons", () => {
    const project = normalizeProject({
      id: "legacy",
      name: "Legacy",
      width: 800,
      height: 600,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      scene: {
        background: "#000",
        shapes: [
          {
            id: "shape-1",
            name: "Rect",
            type: "rectangle",
            transform: {
              x: 10,
              y: 20,
              width: 100,
              height: 50,
              rotation: 0
            },
            style: {
              fill: "#fff",
              stroke: "#000",
              strokeWidth: 1,
              opacity: 1
            },
            quad: [
              { x: 10, y: 20 },
              { x: 110, y: 20 },
              { x: 110, y: 70 },
              { x: 10, y: 70 }
            ],
            isCalibrated: false,
            animation: {
              type: "none",
              durationMs: 1000,
              loop: true,
              intensity: 0,
              delayMs: 0
            },
            media: {
              kind: "none",
              src: null,
              objectFit: "cover"
            }
          }
        ]
      }
    });

    expect(project.scene.shapes[0].type).toBe("polygon");
    expect(project.scene.shapes[0].points).toHaveLength(4);
  });
});
