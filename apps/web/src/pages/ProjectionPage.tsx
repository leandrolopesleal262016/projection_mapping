import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { mergeProjectionScene, type ProjectRecord } from "@projection-mapping/shared";

import { MappingStage } from "../components/MappingStage";
import { fetchProject } from "../lib/api";
import { getRealtimeChannel, type PlaybackMode, type ProjectionStatePayload } from "../lib/realtime";
import { normalizeProjectForEditor } from "../lib/scene-utils";
import { getSocket } from "../lib/socket";

export function ProjectionPage() {
  const { projectId } = useParams();
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>("play");

  function applyIncomingState(payload: ProjectionStatePayload, currentProjectId: string) {
    if (payload.projectId !== currentProjectId) {
      return;
    }

    setPlaybackMode(payload.playbackMode);
    setProject((current) =>
      normalizeProjectForEditor({
        id: current?.id ?? payload.projectId,
        name: payload.projectName,
        width: payload.width,
        height: payload.height,
        createdAt: current?.createdAt ?? payload.updatedAt,
        updatedAt: payload.updatedAt,
        scene: mergeProjectionScene(current?.scene ?? payload.scene, payload.scene, payload.mediaPatches ?? [])
      })
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
          setProject((current) => (!current || current.updatedAt <= loaded.updatedAt ? loaded : current));
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
          playbackMode={playbackMode}
          showChrome={false}
          surfaceBackground="#000000"
        />
      ) : (
        <main className="projection-page__blank" />
      )}
    </div>
  );
}
