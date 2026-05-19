import { useState } from "react";

import type { ProjectRecord, ProjectSummary } from "@projection-mapping/shared";

interface ProjectSidebarProps {
  currentProject: ProjectRecord | null;
  projects: ProjectSummary[];
  activeProjectId: string | null;
  selectedShapeName: string | null;
  onSelectProject: (projectId: string) => void;
  onCreateProject: (payload: { name: string; width: number; height: number }) => Promise<void>;
  onAddPolygon: () => void;
  onCreateShapeFromMedia: (file: File) => Promise<void>;
  onApplyMediaToSelectedShape: (file: File) => Promise<void>;
}

export function ProjectSidebar({
  currentProject,
  projects,
  activeProjectId,
  selectedShapeName,
  onSelectProject,
  onCreateProject,
  onAddPolygon,
  onCreateShapeFromMedia,
  onApplyMediaToSelectedShape
}: ProjectSidebarProps) {
  const [name, setName] = useState("Novo Projeto");
  const [width, setWidth] = useState(1280);
  const [height, setHeight] = useState(720);

  return (
    <aside className="sidebar sidebar--studio">
      <section className="panel panel--compact">
        <div className="panel__header">
          <h2>Inserir</h2>
          <span>{selectedShapeName ? `selecionada: ${selectedShapeName}` : "crie ou selecione uma forma"}</span>
        </div>
        <div className="panel__group panel__group--tight">
          <button type="button" className="button button--primary button--block" onClick={onAddPolygon}>
            Novo poligono
          </button>
          <label className="file-input file-input--block">
            Nova forma com midia
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
          <label className={`file-input file-input--block ${selectedShapeName ? "" : "is-disabled"}`}>
            Aplicar midia na selecao
            <input
              type="file"
              disabled={!selectedShapeName}
              accept="image/*,image/gif,video/*,.svg,image/svg+xml"
              onChange={(event) => {
                const file = event.target.files?.[0];

                if (file) {
                  void onApplyMediaToSelectedShape(file);
                }

                event.target.value = "";
              }}
            />
          </label>
          <p className="field-hint">Use a segunda opcao para criar uma forma nova ja com imagem, video ou GIF.</p>
        </div>
      </section>

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
