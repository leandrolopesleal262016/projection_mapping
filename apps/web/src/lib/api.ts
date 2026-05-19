import type {
  CreateProjectPayload,
  ProjectRecord,
  ProjectSummary,
  SaveScenePayload
} from "@projection-mapping/shared";

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Falha na requisição.");
  }

  return (await response.json()) as T;
}

export async function fetchProjects(): Promise<ProjectSummary[]> {
  return parseJson<ProjectSummary[]>(await fetch("/api/projects"));
}

export async function fetchProject(id: string): Promise<ProjectRecord> {
  return parseJson<ProjectRecord>(await fetch(`/api/projects/${id}`));
}

export async function createProject(payload: CreateProjectPayload): Promise<ProjectRecord> {
  return parseJson<ProjectRecord>(
    await fetch("/api/projects", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    })
  );
}

export async function saveProjectScene(
  projectId: string,
  payload: SaveScenePayload
): Promise<ProjectRecord> {
  return parseJson<ProjectRecord>(
    await fetch(`/api/projects/${projectId}/scene`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    })
  );
}

export async function exportProject(projectId: string): Promise<ProjectRecord> {
  return parseJson<ProjectRecord>(
    await fetch(`/api/projects/${projectId}/export`, {
      method: "POST"
    })
  );
}

export async function importProject(payload: ProjectRecord): Promise<ProjectRecord> {
  return parseJson<ProjectRecord>(
    await fetch("/api/projects/import", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    })
  );
}
