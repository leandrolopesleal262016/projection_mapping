import express from "express";
import cors from "cors";
import { z } from "zod";

import type { ProjectRecord, ProjectScene } from "@projection-mapping/shared";

import { createProjectRepository, type ProjectRepository } from "./repository.js";

const pointSchema = z.object({
  x: z.number(),
  y: z.number()
});

const animationSchema = z.object({
  type: z.enum(["none", "pulse", "drift", "rotate", "strobe"]),
  durationMs: z.number().positive(),
  loop: z.boolean(),
  intensity: z.number().min(0).max(1),
  delayMs: z.number().min(0)
});

const mediaSchema = z.object({
  kind: z.enum(["none", "image", "video"]),
  src: z.string().nullable(),
  mimeType: z.string().optional(),
  label: z.string().optional(),
  objectFit: z.enum(["cover", "contain", "fill"])
});

const shapeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(["rectangle", "circle", "triangle", "polygon", "svg"]),
  transform: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number().positive(),
    height: z.number().positive(),
    rotation: z.number()
  }),
  style: z.object({
    fill: z.string(),
    stroke: z.string(),
    strokeWidth: z.number().nonnegative(),
    opacity: z.number().min(0).max(1)
  }),
  points: z.array(pointSchema).optional(),
  quad: z.tuple([pointSchema, pointSchema, pointSchema, pointSchema]),
  isCalibrated: z.boolean(),
  animation: animationSchema,
  svgMarkup: z.string().optional(),
  media: mediaSchema
});

const sceneSchema: z.ZodType<ProjectScene> = z.object({
  background: z.string(),
  shapes: z.array(shapeSchema)
});

const createProjectSchema = z.object({
  name: z.string().min(2).max(80),
  width: z.number().int().positive().max(7680),
  height: z.number().int().positive().max(4320)
});

const calibrationSchema = z.object({
  shapeId: z.string().min(1),
  quad: z.tuple([pointSchema, pointSchema, pointSchema, pointSchema])
});

const importProjectSchema: z.ZodType<ProjectRecord> = z.object({
  id: z.string(),
  name: z.string(),
  width: z.number(),
  height: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  scene: sceneSchema
});

function parseOrThrow<T>(schema: z.ZodSchema<T>, value: unknown): T {
  return schema.parse(value);
}

export function createApp(repository: ProjectRepository = createProjectRepository()) {
  const app = express();

  app.use(
    cors({
      origin: true,
      credentials: true
    })
  );
  app.use(express.json({ limit: "100mb" }));

  app.get("/api/health", (_request, response) => {
    response.json({
      status: "ok",
      service: "projection-mapping-api",
      timestamp: new Date().toISOString()
    });
  });

  app.get("/api/projects", (_request, response) => {
    response.json(repository.listProjects());
  });

  app.get("/api/projects/:id", (request, response) => {
    const project = repository.getProject(request.params.id);

    if (!project) {
      response.status(404).json({ message: "Projeto não encontrado." });
      return;
    }

    response.json(project);
  });

  app.post("/api/projects", (request, response) => {
    try {
      const payload = parseOrThrow(createProjectSchema, request.body);
      const project = repository.createProject(payload);

      response.status(201).json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        response.status(400).json({ message: "Payload inválido.", issues: error.issues });
        return;
      }

      throw error;
    }
  });

  app.put("/api/projects/:id/scene", (request, response) => {
    try {
      const payload = parseOrThrow(z.object({ scene: sceneSchema }), request.body);
      const updated = repository.saveScene(request.params.id, payload.scene);

      if (!updated) {
        response.status(404).json({ message: "Projeto não encontrado." });
        return;
      }

      response.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        response.status(400).json({ message: "Payload inválido.", issues: error.issues });
        return;
      }

      throw error;
    }
  });

  app.put("/api/projects/:id/calibration", (request, response) => {
    try {
      const payload = parseOrThrow(calibrationSchema, request.body);
      const updated = repository.updateCalibration(request.params.id, payload);

      if (!updated) {
        response.status(404).json({ message: "Projeto não encontrado." });
        return;
      }

      response.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        response.status(400).json({ message: "Payload inválido.", issues: error.issues });
        return;
      }

      throw error;
    }
  });

  app.post("/api/projects/:id/export", (request, response) => {
    const project = repository.getProject(request.params.id);

    if (!project) {
      response.status(404).json({ message: "Projeto não encontrado." });
      return;
    }

    response.json(project);
  });

  app.post("/api/projects/import", (request, response) => {
    try {
      const payload = parseOrThrow(importProjectSchema, request.body);
      const imported = repository.importProject(payload);

      response.status(201).json(imported);
    } catch (error) {
      if (error instanceof z.ZodError) {
        response.status(400).json({ message: "Payload inválido.", issues: error.issues });
        return;
      }

      throw error;
    }
  });

  return app;
}
