import { useState } from "react";

import type { ProjectRecord, ProjectSummary } from "@projection-mapping/shared";

interface ProjectSidebarProps {
  currentProject: ProjectRecord | null;
  projects: ProjectSummary[];
  activeProjectId: string | null;
  onSelectProject: (projectId: string) => void;
  onCreateProject: (payload: { name: string; width: number; height: number }) => Promise<void>;
  onAddPolygon: () => void;
  onCreateShapeFromMedia: (file: File) => Promise<void>;
  onImportProjectFile: (file: File) => Promise<void>;
  onExportProject: () => Promise<void>;
}

export function ProjectSidebar({
  currentProject,
  projects,
  activeProjectId,
  onSelectProject,
  onCreateProject,
  onAddPolygon,
  onCreateShapeFromMedia,
  onImportProjectFile,
  onExportProject
}: ProjectSidebarProps) {
  const [name, setName] = useState("Novo Projeto");
  const [width, setWidth] = useState(1280);
  const [height, setHeight] = useState(720);

  return (
    <aside className="sidebar">
      <section className="panel">
        <div className="panel__header">
          <h2>Projetos</h2>
          <span>{projects.length} ativos</span>
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

      <section className="panel">
        <div className="panel__header">
          <h2>Biblioteca</h2>
          <span>polígonos e mídia</span>
        </div>
        <button type="button" className="button button--primary" onClick={onAddPolygon}>
          Novo polígono
        </button>
        <label className="file-input">
          Novo polígono com mídia
          <input
            type="file"
            accept="image/*,image/gif,video/*,.svg,image/svg+xml"
            onChange={(event) => {
              const file = event.target.files?.[0];

              if (file) {
                void onCreateShapeFromMedia(file);
              }

              event.target.value = "";
            }}
          />
        </label>
        <label className="file-input">
          Importar JSON
          <input
            type="file"
            accept=".json,application/json"
            onChange={(event) => {
              const file = event.target.files?.[0];

              if (file) {
                void onImportProjectFile(file);
              }

              event.target.value = "";
            }}
          />
        </label>
        <button
          type="button"
          className="button button--secondary"
          disabled={!currentProject}
          onClick={() => void onExportProject()}
        >
          Exportar projeto
        </button>
      </section>
    </aside>
  );
}
