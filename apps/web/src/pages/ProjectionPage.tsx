import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import type { ProjectRecord } from "@projection-mapping/shared";

import { MappingStage } from "../components/MappingStage";
import { fetchProject } from "../lib/api";
import { getRealtimeChannel, type ProjectionStatePayload } from "../lib/realtime";
import { normalizeProjectForEditor } from "../lib/scene-utils";
import { getSocket } from "../lib/socket";

export function ProjectionPage() {
  const { projectId } = useParams();
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [status, setStatus] = useState("Carregando saída...");

  function applyIncomingState(payload: ProjectionStatePayload, currentProjectId: string) {
    if (payload.projectId !== currentProjectId) {
      return;
    }

    setProject((current) =>
      current
        ? normalizeProjectForEditor({
            ...current,
            scene: payload.scene,
            updatedAt: payload.updatedAt
          })
        : current
    );
    setStatus("Saída atualizada em tempo real.");
  }

  useEffect(() => {
    if (!projectId) {
      setStatus("Projeto inválido.");
      return;
    }

    const currentProjectId = projectId;
    let ignore = false;

    async function loadProject() {
      try {
        const loaded = normalizeProjectForEditor(await fetchProject(currentProjectId));

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
    const realtimeChannel = getRealtimeChannel();

    socket.emit("project:join", currentProjectId);

    const handleUpdate = (payload: ProjectionStatePayload) => applyIncomingState(payload, currentProjectId);
    const handleChannelMessage = (event: MessageEvent<{ type: string; payload: ProjectionStatePayload }>) => {
      if (event.data?.type !== "projection:state_updated") {
        return;
      }

      applyIncomingState(event.data.payload, currentProjectId);
    };

    socket.on("projection:state_updated", handleUpdate);
    realtimeChannel?.addEventListener("message", handleChannelMessage);

    return () => {
      socket.off("projection:state_updated", handleUpdate);
      realtimeChannel?.removeEventListener("message", handleChannelMessage);
      realtimeChannel?.close();
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
        <MappingStage project={project} selectedShapeId={null} />
      </main>
    </div>
  );
}
