import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import type {
  MediaFit,
  Point,
  ProjectRecord,
  ProjectSummary,
  Shape,
  ShapeStyle
} from "@projection-mapping/shared";

import { InspectorPanel } from "../components/InspectorPanel";
import { MappingStage } from "../components/MappingStage";
import { ProjectSidebar } from "../components/ProjectSidebar";
import { createProject, exportProject, fetchProject, fetchProjects, importProject, saveProjectScene } from "../lib/api";
import { createMediaFromFile } from "../lib/media-utils";
import { getRealtimeChannel, postProjectionState } from "../lib/realtime";
import {
  clearShapeMedia,
  cloneProjectWithScene,
  createPolygonDraft,
  normalizeProjectForEditor,
  removeShapeFromScene,
  updateShapeAnimation,
  updateShapeFit,
  updateShapeInScene,
  updateShapeMedia,
  updateShapePoints,
  updateShapeStyle
} from "../lib/scene-utils";
import { getSocket } from "../lib/socket";

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

function estimatePayloadBytes(value: unknown): number {
  return new Blob([JSON.stringify(value)]).size;
}

export function EditorPage() {
  const [projectList, setProjectList] = useState<ProjectSummary[]>([]);
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [status, setStatus] = useState("Carregando projetos...");
  const [isLoading, setIsLoading] = useState(true);
  const saveTimerRef = useRef<number | null>(null);
  const socketRef = useRef(getSocket());
  const realtimeChannelRef = useRef(getRealtimeChannel());

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
          const loadedProject = normalizeProjectForEditor(await fetchProject(projects[0].id));

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

      realtimeChannelRef.current?.close();
    };
  }, []);

  const selectedShape = project?.scene.shapes.find((shape) => shape.id === selectedShapeId) ?? null;

  async function openProject(projectId: string) {
    setIsLoading(true);
    setStatus("Carregando projeto...");

    try {
      const loadedProject = normalizeProjectForEditor(await fetchProject(projectId));

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
    const payload = {
      projectId: nextProject.id,
      scene: nextProject.scene,
      updatedAt: nextProject.updatedAt
    };

    postProjectionState(realtimeChannelRef.current, payload);

    if (estimatePayloadBytes(payload) <= 2 * 1024 * 1024) {
      socketRef.current.emit("scene:announce", payload);
    }
  }

  function queueSave(nextProject: ProjectRecord) {
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    announceProjectState(nextProject);
    setStatus("Alterações pendentes...");

    saveTimerRef.current = window.setTimeout(async () => {
      try {
        const savedProject = normalizeProjectForEditor(
          await saveProjectScene(nextProject.id, {
            scene: nextProject.scene
          })
        );

        setProject((current) =>
          current && current.id === savedProject.id
            ? {
                ...current,
                scene: savedProject.scene,
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

    const createdProject = normalizeProjectForEditor(await createProject(payload));
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

  async function handleCreateShapeFromMedia(file: File) {
    if (!project) {
      return;
    }

    const media = await createMediaFromFile(file);
    const shape = createPolygonDraft(project.scene, media);
    shape.name = file.name.replace(/\.[^.]+$/i, "");

    const nextScene = {
      ...project.scene,
      shapes: [...project.scene.shapes, shape]
    };

    setSelectedShapeId(shape.id);
    commitScene(cloneProjectWithScene(project, nextScene));
  }

  async function handleImportProjectFile(file: File) {
    const payload = JSON.parse(await file.text()) as ProjectRecord;
    const imported = normalizeProjectForEditor(await importProject(payload));

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
            <h1>Studio Web</h1>
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
          <Link className="button button--primary" to={`/projection/${project.id}`} target="_blank" rel="noreferrer">
            Abrir saída
          </Link>
          <span className="status-pill">{status}</span>
        </div>
      </header>

      <main className="workspace workspace--single-stage">
        <ProjectSidebar
          currentProject={project}
          projects={projectList}
          activeProjectId={project.id}
          onSelectProject={(projectId) => void openProject(projectId)}
          onCreateProject={handleCreateProject}
          onAddPolygon={() => {
            const shape = createPolygonDraft(project.scene);
            const nextScene = {
              ...project.scene,
              shapes: [...project.scene.shapes, shape]
            };

            setSelectedShapeId(shape.id);
            commitScene(cloneProjectWithScene(project, nextScene));
          }}
          onCreateShapeFromMedia={handleCreateShapeFromMedia}
          onImportProjectFile={handleImportProjectFile}
          onExportProject={handleExportProject}
        />

        <section className="workspace__center">
          <MappingStage
            project={project}
            selectedShapeId={selectedShapeId}
            editable
            onSelectShape={setSelectedShapeId}
            onPointsChange={(shapeId: string, points: Point[]) => mutateShape(shapeId, (shape) => updateShapePoints(shape, points))}
          />
        </section>

        <section className="workspace__right">
          <InspectorPanel
            shape={selectedShape}
            onRename={(name) => selectedShape && mutateShape(selectedShape.id, (shape) => ({ ...shape, name }))}
            onStyleChange={(patch: Partial<ShapeStyle>) =>
              selectedShape && mutateShape(selectedShape.id, (shape) => updateShapeStyle(shape, patch))
            }
            onAnimationChange={(patch) =>
              selectedShape && mutateShape(selectedShape.id, (shape) => updateShapeAnimation(shape, patch))
            }
            onMediaFile={async (file: File) => {
              if (!selectedShape) {
                return;
              }

              const media = await createMediaFromFile(file);
              mutateShape(selectedShape.id, (shape) => updateShapeMedia(shape, media));
            }}
            onMediaFitChange={(fit: MediaFit) =>
              selectedShape && mutateShape(selectedShape.id, (shape) => updateShapeFit(shape, fit))
            }
            onClearMedia={() => selectedShape && mutateShape(selectedShape.id, (shape) => clearShapeMedia(shape))}
            onDelete={() => {
              if (!selectedShape) {
                return;
              }

              const nextScene = removeShapeFromScene(project.scene, selectedShape.id);
              const nextSelectedId = nextScene.shapes[0]?.id ?? null;

              setSelectedShapeId(nextSelectedId);
              commitScene(cloneProjectWithScene(project, nextScene));
            }}
          />
        </section>
      </main>

      <footer className="footer-bar">
        <span>
          Projeto ativo: {project.id} | polígonos: {project.scene.shapes.length}
        </span>
        <span>último save confirmado: {formatSavedAt(project.updatedAt)}</span>
      </footer>
    </div>
  );
}
