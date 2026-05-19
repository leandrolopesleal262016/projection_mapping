import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

import {
  createDefaultProject,
  normalizeProject,
  syncShapeGeometry,
  type CalibrationPayload,
  type CreateProjectPayload,
  type ProjectRecord,
  type ProjectScene,
  type ProjectSummary
} from "@projection-mapping/shared";

interface ProjectRow {
  id: string;
  name: string;
  width: number;
  height: number;
  scene_json: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectRepository {
  listProjects(): ProjectSummary[];
  getProject(id: string): ProjectRecord | null;
  createProject(payload: CreateProjectPayload): ProjectRecord;
  saveScene(id: string, scene: ProjectScene): ProjectRecord | null;
  updateCalibration(projectId: string, payload: CalibrationPayload): ProjectRecord | null;
  importProject(project: ProjectRecord): ProjectRecord;
}

function getDefaultDatabasePath(): string {
  return fileURLToPath(new URL("../data/projection-mapping.db", import.meta.url));
}

function mapRow(row: ProjectRow): ProjectRecord {
  return normalizeProject({
    id: row.id,
    name: row.name,
    width: row.width,
    height: row.height,
    scene: JSON.parse(row.scene_json) as ProjectScene,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  });
}

function upsertProject(db: Database.Database, project: ProjectRecord): void {
  const normalized = normalizeProject(project);

  db.prepare(
    `
      INSERT INTO projects (id, name, width, height, scene_json, created_at, updated_at)
      VALUES (@id, @name, @width, @height, @scene_json, @created_at, @updated_at)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        width = excluded.width,
        height = excluded.height,
        scene_json = excluded.scene_json,
        updated_at = excluded.updated_at
    `
  ).run({
    id: normalized.id,
    name: normalized.name,
    width: normalized.width,
    height: normalized.height,
    scene_json: JSON.stringify(normalized.scene),
    created_at: normalized.createdAt,
    updated_at: normalized.updatedAt
  });
}

export function createProjectRepository(dbPath = getDefaultDatabasePath()): ProjectRepository {
  if (dbPath !== ":memory:") {
    mkdirSync(dirname(dbPath), { recursive: true });
  }

  const db = new Database(dbPath);

  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      width INTEGER NOT NULL,
      height INTEGER NOT NULL,
      scene_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  const count = db.prepare("SELECT COUNT(*) as total FROM projects").get() as { total: number };

  if (count.total === 0) {
    upsertProject(db, createDefaultProject("demo-project"));
  }

  const listStatement = db.prepare(`
    SELECT id, name, width, height, scene_json, created_at, updated_at
    FROM projects
    ORDER BY updated_at DESC
  `);
  const getStatement = db.prepare(`
    SELECT id, name, width, height, scene_json, created_at, updated_at
    FROM projects
    WHERE id = ?
  `);

  return {
    listProjects() {
      return (listStatement.all() as ProjectRow[]).map((row) => {
        const project = mapRow(row);

        return {
          id: project.id,
          name: project.name,
          width: project.width,
          height: project.height,
          updatedAt: project.updatedAt
        };
      });
    },

    getProject(id) {
      const row = getStatement.get(id) as ProjectRow | undefined;

      return row ? mapRow(row) : null;
    },

    createProject(payload) {
      const now = new Date().toISOString();
      const project = createDefaultProject(randomUUID(), payload.name, payload.width, payload.height);

      project.createdAt = now;
      project.updatedAt = now;

      upsertProject(db, project);

      return project;
    },

    saveScene(id, scene) {
      const current = this.getProject(id);

      if (!current) {
        return null;
      }

      const updated: ProjectRecord = {
        ...current,
        scene: normalizeProject({
          ...current,
          scene
        }).scene,
        updatedAt: new Date().toISOString()
      };

      upsertProject(db, updated);

      return updated;
    },

    updateCalibration(projectId, payload) {
      const current = this.getProject(projectId);

      if (!current) {
        return null;
      }

      const updatedScene: ProjectScene = {
        ...current.scene,
        shapes: current.scene.shapes.map((shape) =>
          shape.id === payload.shapeId
            ? syncShapeGeometry({
                ...shape,
                points: payload.quad,
                isCalibrated: true
              })
            : shape
        )
      };

      return this.saveScene(projectId, updatedScene);
    },

    importProject(project) {
      const imported: ProjectRecord = normalizeProject({
        ...project,
        id: randomUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      upsertProject(db, imported);

      return imported;
    }
  };
}
