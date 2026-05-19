import { useState } from "react";

import type { ProjectRecord, ProjectSummary } from "@projection-mapping/shared";

interface ProjectSidebarProps {
  currentProject: ProjectRecord | null;
  projects: ProjectSummary[];
  activeProjectId: string | null;
  onSelectProject: (projectId: string) => void;
  onCreateProject: (payload: { name: string; width: number; height: number }) => Promise<void>;
}

export function ProjectSidebar({
  currentProject,
  projects,
  activeProjectId,
  onSelectProject,
  onCreateProject,
}: ProjectSidebarProps) {
  const [name, setName] = useState("Novo Projeto");
  const [width, setWidth] = useState(1280);
  const [height, setHeight] = useState(720);

  return (
    <aside className="sidebar sidebar--studio">
      <section className="panel panel--compact">
        <div className="panel__header">
          <h2>Projetos</h2>
          <span>
            {projects.length} ativos{currentProject ? ` - ${currentProject.scene.shapes.length} formas` : ""}
          </span>
        </div>
        <div className="project-list">
          {projects.map((project) => (
            <button
              key={project.id}
              type="button"
              className={`project-list__item ${activeProjectId === project.id ? "is-active" : ""}`}
              onClick={() => onSelectProject(project.id)}
            >
              <strong>{project.name}</strong>
              <span>
                {project.width} x {project.height}
              </span>
            </button>
          ))}
        </div>
        <div className="panel__group">
          <label>
            Nome do projeto
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <div className="inline-grid">
            <label>
              Largura
              <input
                type="number"
                min={320}
                max={7680}
                value={width}
                onChange={(event) => setWidth(Number(event.target.value))}
              />
            </label>
            <label>
              Altura
              <input
                type="number"
                min={240}
                max={4320}
                value={height}
                onChange={(event) => setHeight(Number(event.target.value))}
              />
            </label>
          </div>
          <button
            type="button"
            className="button button--primary"
            onClick={() => onCreateProject({ name, width, height })}
          >
            Criar projeto
          </button>
        </div>
      </section>
    </aside>
  );
}
