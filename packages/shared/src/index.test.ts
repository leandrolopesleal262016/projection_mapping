import { describe, expect, it } from "vitest";

import {
  createDefaultProject,
  createDefaultQuad,
  createProjectionMediaPatches,
  mergeProjectionScene,
  normalizeProject,
  stripSceneMedia
} from "./index";

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

  it("strips unchanged media from realtime scenes and rebuilds it on merge", () => {
    const project = createDefaultProject("media-demo");

    project.scene.shapes[0].media = {
      kind: "image",
      src: "data:image/png;base64,AAAA",
      mimeType: "image/png",
      label: "sample",
      objectFit: "cover"
    };

    const previousScene = structuredClone(project.scene);
    const nextScene = structuredClone(project.scene);

    nextScene.shapes[0].points = nextScene.shapes[0].points?.map((point) => ({
      x: point.x + 10,
      y: point.y
    }));

    const patches = createProjectionMediaPatches(nextScene, previousScene);
    const strippedScene = stripSceneMedia(nextScene, patches);

    expect(patches).toHaveLength(0);
    expect(strippedScene.shapes[0].media.src).toBeNull();

    const mergedScene = mergeProjectionScene(previousScene, strippedScene, patches);

    expect(mergedScene.shapes[0].media.src).toBe("data:image/png;base64,AAAA");
  });

  it("includes changed media as realtime patches", () => {
    const project = createDefaultProject("media-patch");
    const previousScene = structuredClone(project.scene);
    const nextScene = structuredClone(project.scene);

    nextScene.shapes[1].media = {
      kind: "video",
      src: "data:video/mp4;base64,BBBB",
      mimeType: "video/mp4",
      label: "clip",
      objectFit: "contain"
    };

    const patches = createProjectionMediaPatches(nextScene, previousScene);
    const strippedScene = stripSceneMedia(nextScene, patches);

    expect(patches).toHaveLength(1);
    expect(patches[0]?.shapeId).toBe(nextScene.shapes[1].id);
    expect(strippedScene.shapes[1].media.src).toBe("data:video/mp4;base64,BBBB");
  });
});
