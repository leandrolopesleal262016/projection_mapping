import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import {
  createDefaultQuad,
  type Point,
  type ProjectRecord,
  type ProjectSummary,
  type Shape,
  type ShapeStyle,
  type ShapeTransform
} from "@projection-mapping/shared";

import { InspectorPanel } from "../components/InspectorPanel";
import { ProjectionViewport } from "../components/ProjectionViewport";
import { ProjectSidebar } from "../components/ProjectSidebar";
import { SceneCanvas } from "../components/SceneCanvas";
import {
  createProject,
  exportProject,
  fetchProject,
  fetchProjects,
  importProject,
  saveProjectScene
} from "../lib/api";
import {
  cloneProjectWithScene,
  createShapeDraft,
  removeShapeFromScene,
  resetShapeCalibration,
  updateShapeAnimation,
  updateShapeInScene,
  updateShapeStyle,
  updateShapeTransform
} from "../lib/scene-utils";
import { getSocket } from "../lib/socket";
import { parseSvgMarkup } from "../lib/svg-import";

function formatSavedAt(value: string | null): string {
  if (!value) {
    return "aguardando primeiro save";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(value));
}

export function EditorPage() {
  const [projectList, setProjectList] = useState<ProjectSummary[]>([]);
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.7);
  const [status, setStatus] = useState("Carregando projetos...");
  const [isLoading, setIsLoading] = useState(true);
  const saveTimerRef = useRef<number | null>(null);
  const socketRef = useRef(getSocket());

  useEffect(() => {
    let ignore = false;

    async function loadInitialData() {
      try {
        const projects = await fetchProjects();

        if (ignore) {
          return;
        }

        setProjectList(projects);

        if (projects[0]) {
          const loadedProject = await fetchProject(projects[0].id);

          if (ignore) {
            return;
          }

          setProject(loadedProject);
          setSelectedShapeId(loadedProject.scene.shapes[0]?.id ?? null);
          setStatus("Projeto carregado.");
        } else {
          setStatus("Nenhum projeto disponível.");
        }
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Falha ao carregar.");
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialData();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!project) {
      return;
    }

    socketRef.current.emit("project:join", project.id);
  }, [project]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  const selectedShape = project?.scene.shapes.find((shape) => shape.id === selectedShapeId) ?? null;

  async function openProject(projectId: string) {
    setIsLoading(true);
    setStatus("Carregando projeto...");

    try {
      const loadedProject = await fetchProject(projectId);

      setProject(loadedProject);
      setSelectedShapeId(loadedProject.scene.shapes[0]?.id ?? null);
      setStatus("Projeto pronto para edição.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Falha ao abrir projeto.");
    } finally {
      setIsLoading(false);
    }
  }

  function updateProjectSummary(updatedProject: ProjectRecord) {
    setProjectList((current) => {
      const existing = current.find((item) => item.id === updatedProject.id);
      const summary = {
        id: updatedProject.id,
        name: updatedProject.name,
        width: updatedProject.width,
        height: updatedProject.height,
        updatedAt: updatedProject.updatedAt
      };

      if (existing) {
        return current
          .map((item) => (item.id === updatedProject.id ? summary : item))
          .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
      }

      return [summary, ...current];
    });
  }

  function announceProjectState(nextProject: ProjectRecord) {
    socketRef.current.emit("scene:announce", {
      projectId: nextProject.id,
      scene: nextProject.scene,
      updatedAt: nextProject.updatedAt
    });
  }

  function queueSave(nextProject: ProjectRecord) {
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    announceProjectState(nextProject);
    setStatus("Alterações pendentes...");

    saveTimerRef.current = window.setTimeout(async () => {
      try {
        const savedProject = await saveProjectScene(nextProject.id, {
          scene: nextProject.scene
        });

        setProject((current) =>
          current && current.id === savedProject.id
            ? {
                ...current,
                updatedAt: savedProject.updatedAt
              }
            : current
        );
        updateProjectSummary(savedProject);
        announceProjectState(savedProject);
        setStatus(`Salvo às ${formatSavedAt(savedProject.updatedAt)}`);
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Falha ao salvar.");
      }
    }, 450);
  }

  function commitScene(nextProject: ProjectRecord) {
    setProject(nextProject);
    queueSave(nextProject);
  }

  async function handleCreateProject(payload: { name: string; width: number; height: number }) {
    setStatus("Criando projeto...");

    const createdProject = await createProject(payload);
    updateProjectSummary(createdProject);
    setProject(createdProject);
    setSelectedShapeId(createdProject.scene.shapes[0]?.id ?? null);
    setStatus("Projeto criado.");
  }

  function mutateShape(shapeId: string, updater: (shape: Shape) => Shape) {
    if (!project) {
      return;
    }

    const nextScene = updateShapeInScene(project.scene, shapeId, updater);
    commitScene(cloneProjectWithScene(project, nextScene));
  }

  function handleTransformChange(shapeId: string, patch: Partial<ShapeTransform>) {
    mutateShape(shapeId, (shape) => updateShapeTransform(shape, patch));
  }

  function handleStyleChange(shapeId: string, patch: Partial<ShapeStyle>) {
    mutateShape(shapeId, (shape) => updateShapeStyle(shape, patch));
  }

  function handleQuadChange(shapeId: string, quad: [Point, Point, Point, Point]) {
    mutateShape(shapeId, (shape) => ({
      ...shape,
      quad,
      isCalibrated: true
    }));
  }

  async function handleImportSvgFile(file: File) {
    if (!project) {
      return;
    }

    const markup = await file.text();
    const parsed = parseSvgMarkup(markup);
    const shape = createShapeDraft("svg", project.scene);

    shape.name = file.name.replace(/\.svg$/i, "");
    shape.transform.width = Math.min(parsed.width, project.width * 0.45);
    shape.transform.height = Math.min(parsed.height, project.height * 0.45);
    shape.quad = createDefaultQuad(shape.transform);
    shape.svgMarkup = parsed.markup;

    const nextScene = {
      ...project.scene,
      shapes: [...project.scene.shapes, shape]
    };

    setSelectedShapeId(shape.id);
    commitScene(cloneProjectWithScene(project, nextScene));
  }

  async function handleImportProjectFile(file: File) {
    const payload = JSON.parse(await file.text()) as ProjectRecord;
    const imported = await importProject(payload);

    updateProjectSummary(imported);
    setProject(imported);
    setSelectedShapeId(imported.scene.shapes[0]?.id ?? null);
    setStatus("Projeto importado.");
  }

  async function handleExportProject() {
    if (!project) {
      return;
    }

    const exported = await exportProject(project.id);
    const blob = new Blob([JSON.stringify(exported, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `${project.name.toLowerCase().replace(/\s+/g, "-")}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus("Projeto exportado.");
  }

  if (!project) {
    return (
      <div className="app-shell">
        <header className="topbar">
          <div>
            <p className="eyebrow">Projection Mapping</p>
            <h1>Studio WebGL</h1>
          </div>
          <span className="status-pill">{status}</span>
        </header>
        <main className="loading-view">{isLoading ? "Carregando..." : "Nenhum projeto encontrado."}</main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Projection Mapping</p>
          <h1>{project.name}</h1>
        </div>
        <div className="topbar__actions">
          <label className="zoom-field">
            Zoom
            <input
              type="range"
              min={0.35}
              max={1.3}
              step={0.05}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
            />
          </label>
          <Link className="button button--primary" to={`/projection/${project.id}`} target="_blank" rel="noreferrer">
            Abrir saída
          </Link>
          <span className="status-pill">{status}</span>
        </div>
      </header>

      <main className="workspace">
        <ProjectSidebar
          currentProject={project}
          projects={projectList}
          activeProjectId={project.id}
          onSelectProject={(projectId) => void openProject(projectId)}
          onCreateProject={handleCreateProject}
          onAddShape={(type) => {
            const shape = createShapeDraft(type, project.scene);
            const nextScene = {
              ...project.scene,
              shapes: [...project.scene.shapes, shape]
            };

            setSelectedShapeId(shape.id);
            commitScene(cloneProjectWithScene(project, nextScene));
          }}
          onImportSvgFile={handleImportSvgFile}
          onImportProjectFile={handleImportProjectFile}
          onExportProject={handleExportProject}
        />

        <section className="workspace__center">
          <SceneCanvas
            project={project}
            selectedShapeId={selectedShapeId}
            zoom={zoom}
            onSelectShape={setSelectedShapeId}
            onTransformChange={handleTransformChange}
          />
        </section>

        <section className="workspace__right">
          <ProjectionViewport
            project={project}
            selectedShapeId={selectedShapeId}
            editable
            onQuadChange={handleQuadChange}
          />
          <InspectorPanel
            shape={selectedShape}
            onRename={(name) => selectedShape && mutateShape(selectedShape.id, (shape) => ({ ...shape, name }))}
            onTransformChange={(patch) => selectedShape && handleTransformChange(selectedShape.id, patch)}
            onStyleChange={(patch) => selectedShape && handleStyleChange(selectedShape.id, patch)}
            onAnimationChange={(patch) =>
              selectedShape && mutateShape(selectedShape.id, (shape) => updateShapeAnimation(shape, patch))
            }
            onDelete={() => {
              if (!selectedShape) {
                return;
              }

              const nextScene = removeShapeFromScene(project.scene, selectedShape.id);
              const nextSelectedId = nextScene.shapes[0]?.id ?? null;

              setSelectedShapeId(nextSelectedId);
              commitScene(cloneProjectWithScene(project, nextScene));
            }}
            onResetCalibration={() =>
              selectedShape && mutateShape(selectedShape.id, (shape) => resetShapeCalibration(shape))
            }
          />
        </section>
      </main>

      <footer className="footer-bar">
        <span>
          Projeto ativo: {project.id} | camadas: {project.scene.shapes.length}
        </span>
        <span>último save confirmado: {formatSavedAt(project.updatedAt)}</span>
      </footer>
    </div>
  );
}
