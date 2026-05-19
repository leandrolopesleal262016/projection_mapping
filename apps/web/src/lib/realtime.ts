import type { ProjectRecord } from "@projection-mapping/shared";

export interface ProjectionStatePayload {
  projectId: string;
  scene: ProjectRecord["scene"];
  updatedAt: string;
}

interface ProjectionChannelMessage {
  type: "projection:state_updated";
  payload: ProjectionStatePayload;
}

const CHANNEL_NAME = "projection-mapping-state";

export function getRealtimeChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof window.BroadcastChannel === "undefined") {
    return null;
  }

  return new window.BroadcastChannel(CHANNEL_NAME);
}

export function postProjectionState(channel: BroadcastChannel | null, payload: ProjectionStatePayload): void {
  channel?.postMessage({
    type: "projection:state_updated",
    payload
  } satisfies ProjectionChannelMessage);
}
