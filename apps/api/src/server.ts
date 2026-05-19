import { createServer } from "node:http";

import { Server } from "socket.io";

import { createApp } from "./app.js";
import { createProjectRepository } from "./repository.js";

const port = Number(process.env.PORT ?? 3001);
const repository = createProjectRepository();
const app = createApp(repository);
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: true,
    credentials: true
  }
});

io.on("connection", (socket) => {
  socket.on("project:join", (projectId: string) => {
    socket.join(projectId);
    const project = repository.getProject(projectId);

    if (project) {
      socket.emit("projection:state_updated", {
        projectId,
        scene: project.scene,
        updatedAt: project.updatedAt
      });
    }
  });

  socket.on(
    "scene:announce",
    (payload: { projectId: string; scene: unknown; updatedAt: string }) => {
      io.to(payload.projectId).emit("projection:state_updated", payload);
    }
  );
});

server.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
