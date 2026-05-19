import { describe, expect, it } from "vitest";

import { createDefaultProject, createDefaultQuad } from "./index";

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
  });
});
