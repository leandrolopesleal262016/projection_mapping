import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import type { ProjectRecord } from "@projection-mapping/shared";

import { ProjectionViewport } from "../components/ProjectionViewport";
import { fetchProject } from "../lib/api";
import { getSocket } from "../lib/socket";

export function ProjectionPage() {
  const { projectId } = useParams();
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [status, setStatus] = useState("Carregando saída...");

  useEffect(() => {
    if (!projectId) {
      setStatus("Projeto inválido.");
      return;
    }

    const currentProjectId = projectId;
    let ignore = false;

    async function loadProject() {
      try {
        const loaded = await fetchProject(currentProjectId);

        if (!ignore) {
          setProject(loaded);
          setStatus("Saída sincronizada.");
        }
      } catch (error) {
        if (!ignore) {
          setStatus(error instanceof Error ? error.message : "Falha ao carregar saída.");
        }
      }
    }

    void loadProject();

    return () => {
      ignore = true;
    };
  }, [projectId]);

  useEffect(() => {
    if (!projectId) {
      return;
    }

    const currentProjectId = projectId;
    const socket = getSocket();

    socket.emit("project:join", currentProjectId);

    const handleUpdate = (payload: { projectId: string; scene: ProjectRecord["scene"]; updatedAt: string }) => {
      if (payload.projectId !== currentProjectId) {
        return;
      }

      setProject((current) =>
        current
          ? {
              ...current,
              scene: payload.scene,
              updatedAt: payload.updatedAt
            }
          : current
      );
      setStatus("Saída atualizada em tempo real.");
    };

    socket.on("projection:state_updated", handleUpdate);

    return () => {
      socket.off("projection:state_updated", handleUpdate);
    };
  }, [projectId]);

  if (!project) {
    return (
      <div className="projection-page">
        <header className="projection-page__header">
          <Link className="button" to="/">
            Voltar ao editor
          </Link>
          <span className="status-pill">{status}</span>
        </header>
        <main className="projection-page__empty">Aguardando projeto.</main>
      </div>
    );
  }

  return (
    <div className="projection-page">
      <header className="projection-page__header">
        <div>
          <p className="eyebrow">Saída dedicada</p>
          <h1>{project.name}</h1>
        </div>
        <div className="topbar__actions">
          <Link className="button" to="/">
            Voltar ao editor
          </Link>
          <span className="status-pill">{status}</span>
        </div>
      </header>
      <main className="projection-page__stage">
        <ProjectionViewport project={project} />
      </main>
    </div>
  );
}
