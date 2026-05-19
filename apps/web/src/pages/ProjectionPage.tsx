import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import type { ProjectRecord } from "@projection-mapping/shared";

import { MappingStage } from "../components/MappingStage";
import { fetchProject } from "../lib/api";
import { getRealtimeChannel, type ProjectionStatePayload } from "../lib/realtime";
import { normalizeProjectForEditor } from "../lib/scene-utils";
import { getSocket } from "../lib/socket";

export function ProjectionPage() {
  const { projectId } = useParams();
  const [project, setProject] = useState<ProjectRecord | null>(null);

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
  }

  useEffect(() => {
    if (!projectId) {
      return;
    }

    const currentProjectId = projectId;
    let ignore = false;

    async function loadProject() {
      try {
        const loaded = normalizeProjectForEditor(await fetchProject(currentProjectId));

        if (!ignore) {
          setProject(loaded);
        }
      } catch {
        if (!ignore) {
          setProject(null);
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

  return (
    <div className="projection-page projection-page--live">
      {project ? (
        <MappingStage
          project={project}
          selectedShapeId={null}
          showChrome={false}
          surfaceBackground="#000000"
        />
      ) : (
        <main className="projection-page__blank" />
      )}
    </div>
  );
}
