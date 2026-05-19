import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "./app.js";
import { createProjectRepository } from "./repository.js";

describe("api", () => {
  it("lists seeded projects and creates a new one", async () => {
    const repository = createProjectRepository(":memory:");
    const app = createApp(repository);

    const listResponse = await request(app).get("/api/projects");
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.length).toBeGreaterThan(0);

    const createResponse = await request(app).post("/api/projects").send({
      name: "Instalacao Museu",
      width: 1920,
      height: 1080
    });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.name).toBe("Instalacao Museu");

    const calibrationResponse = await request(app)
      .put(`/api/projects/${createResponse.body.id}/calibration`)
      .send({
        shapeId: createResponse.body.scene.shapes[0].id,
        quad: [
          { x: 20, y: 30 },
          { x: 260, y: 24 },
          { x: 248, y: 210 },
          { x: 36, y: 232 }
        ]
      });

    expect(calibrationResponse.status).toBe(200);
    expect(calibrationResponse.body.scene.shapes[0].isCalibrated).toBe(true);
  });
});
