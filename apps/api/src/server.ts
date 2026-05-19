import { createServer } from "node:http";

import { Server } from "socket.io";
import { mergeProjectionScene, type ProjectionMediaPatch, type ProjectScene } from "@projection-mapping/shared";

import { createApp } from "./app.js";
import { createProjectRepository } from "./repository.js";

const port = Number(process.env.PORT ?? 3001);
const repository = createProjectRepository();
const app = createApp(repository);
const server = createServer(app);
const liveProjectionStates = new Map<
  string,
  {
    projectName: string;
    width: number;
    height: number;
    scene: ProjectScene;
    updatedAt: string;
    playbackMode: "play" | "stop";
  }
>();

const io = new Server(server, {
  cors: {
    origin: true,
    credentials: true
  },
  maxHttpBufferSize: 100 * 1024 * 1024
});

io.on("connection", (socket) => {
  socket.on("project:join", (projectId: string) => {
    socket.join(projectId);
    const liveState = liveProjectionStates.get(projectId);

    if (liveState) {
      socket.emit("projection:state_updated", {
        projectId,
        projectName: liveState.projectName,
        width: liveState.width,
        height: liveState.height,
        scene: liveState.scene,
        updatedAt: liveState.updatedAt,
        playbackMode: liveState.playbackMode
      });
      return;
    }

    const project = repository.getProject(projectId);

    if (project) {
      socket.emit("projection:state_updated", {
        projectId,
        projectName: project.name,
        width: project.width,
        height: project.height,
        scene: project.scene,
        updatedAt: project.updatedAt,
        playbackMode: "play"
      });
    }
  });

  socket.on(
    "scene:announce",
    (payload: {
      projectId: string;
      projectName: string;
      width: number;
      height: number;
      scene: ProjectScene;
      updatedAt: string;
      playbackMode: "play" | "stop";
      mediaPatches?: ProjectionMediaPatch[];
    }) => {
      const baseScene =
        liveProjectionStates.get(payload.projectId)?.scene ?? repository.getProject(payload.projectId)?.scene ?? payload.scene;

      liveProjectionStates.set(payload.projectId, {
        projectName: payload.projectName,
        width: payload.width,
        height: payload.height,
        scene: mergeProjectionScene(baseScene, payload.scene, payload.mediaPatches ?? []),
        updatedAt: payload.updatedAt,
        playbackMode: payload.playbackMode
      });
      io.to(payload.projectId).emit("projection:state_updated", payload);
    }
  );
});

server.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
