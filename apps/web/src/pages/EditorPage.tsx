import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import {
  createProjectionMediaPatches,
  stripSceneMedia,
  type MediaFit,
  type Point,
  type ProjectRecord,
  type ProjectScene,
  type ProjectSummary,
  type Shape,
  type ShapeStyle
} from "@projection-mapping/shared";

import { InspectorPanel } from "../components/InspectorPanel";
import { MappingStage } from "../components/MappingStage";
import { ProjectSidebar } from "../components/ProjectSidebar";
import { createProject, exportProject, fetchProject, fetchProjects, importProject, saveProjectScene } from "../lib/api";
import { createMediaFromFile } from "../lib/media-utils";
import { getRealtimeChannel, postProjectionState, type PlaybackMode } from "../lib/realtime";
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

interface RemovalUndoEntry {
  scene: ProjectScene;
  selectedShapeId: string | null;
  selectedPointIndex: number | null;
}

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

function cloneSceneSnapshot(scene: ProjectScene): ProjectScene {
  if (typeof structuredClone === "function") {
    return structuredClone(scene);
  }

  return JSON.parse(JSON.stringify(scene)) as ProjectScene;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

export function EditorPage() {
  const [projectList, setProjectList] = useState<ProjectSummary[]>([]);
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>("play");
  const [stageZoom, setStageZoom] = useState(1);
  const [status, setStatus] = useState("Carregando projetos...");
  const [isLoading, setIsLoading] = useState(true);
  const saveTimerRef = useRef<number | null>(null);
  const removalUndoRef = useRef<RemovalUndoEntry[]>([]);
  const socketRef = useRef(getSocket());
  const realtimeChannelRef = useRef(getRealtimeChannel());
  const lastAnnouncedProjectRef = useRef<ProjectRecord | null>(null);
  const playbackModeRef = useRef<PlaybackMode>("play");

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
          setSelectedPointIndex(null);
          setPlaybackMode("play");
          setStageZoom(1);
          removalUndoRef.current = [];
          lastAnnouncedProjectRef.current = loadedProject;
          playbackModeRef.current = "play";
          setStatus("Projeto carregado.");
        } else {
          setStatus("Nenhum projeto disponivel.");
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

  useEffect(() => {
    playbackModeRef.current = playbackMode;
  }, [playbackMode]);

  const selectedShape = project?.scene.shapes.find((shape) => shape.id === selectedShapeId) ?? null;

  useEffect(() => {
    if (!selectedShape) {
      if (selectedPointIndex !== null) {
        setSelectedPointIndex(null);
      }

      return;
    }

    if (selectedPointIndex === null) {
      return;
    }

    const totalPoints = selectedShape.points?.length ?? 0;

    if (selectedPointIndex >= totalPoints) {
      setSelectedPointIndex(totalPoints > 0 ? totalPoints - 1 : null);
    }
  }, [selectedPointIndex, selectedShape]);

  async function openProject(projectId: string) {
    setIsLoading(true);
    setStatus("Carregando projeto...");

    try {
      const loadedProject = normalizeProjectForEditor(await fetchProject(projectId));

      setProject(loadedProject);
      setSelectedShapeId(loadedProject.scene.shapes[0]?.id ?? null);
      setSelectedPointIndex(null);
      setPlaybackMode("play");
      setStageZoom(1);
      removalUndoRef.current = [];
      lastAnnouncedProjectRef.current = loadedProject;
      playbackModeRef.current = "play";
      setStatus("Projeto pronto para edicao.");
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

  function announceProjectState(nextProject: ProjectRecord, nextPlaybackMode = playbackModeRef.current) {
    const previousScene = lastAnnouncedProjectRef.current?.scene ?? null;
    const mediaPatches = createProjectionMediaPatches(nextProject.scene, previousScene);
    const payload = {
      projectId: nextProject.id,
      scene: stripSceneMedia(nextProject.scene, mediaPatches),
      updatedAt: nextProject.updatedAt,
      playbackMode: nextPlaybackMode,
      mediaPatches
    };

    postProjectionState(realtimeChannelRef.current, payload);
    socketRef.current.emit("scene:announce", payload);
    lastAnnouncedProjectRef.current = nextProject;
    playbackModeRef.current = nextPlaybackMode;
  }

  function queueSave(nextProject: ProjectRecord, pendingStatus = "Alteracoes pendentes...") {
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    announceProjectState(nextProject);
    setStatus(pendingStatus);

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
        setStatus(`Salvo as ${formatSavedAt(savedProject.updatedAt)}`);
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Falha ao salvar.");
      }
    }, 450);
  }

  function commitScene(nextProject: ProjectRecord, pendingStatus?: string) {
    setProject(nextProject);
    queueSave(nextProject, pendingStatus);
  }

  function rememberRemoval() {
    if (!project) {
      return;
    }

    removalUndoRef.current = [
      ...removalUndoRef.current.slice(-29),
      {
        scene: cloneSceneSnapshot(project.scene),
        selectedShapeId,
        selectedPointIndex
      }
    ];
  }

  function handleSelectShape(shapeId: string | null) {
    setSelectedShapeId(shapeId);
    setSelectedPointIndex(null);
  }

  function handleTogglePlayback() {
    if (!project) {
      return;
    }

    const nextPlaybackMode: PlaybackMode = playbackMode === "play" ? "stop" : "play";

    setPlaybackMode(nextPlaybackMode);
    announceProjectState(project, nextPlaybackMode);
    setStatus(nextPlaybackMode === "stop" ? "Videos pausados no editor e na saida." : "Videos reproduzindo no editor e na saida.");
  }

  function handleUndoRemoval() {
    if (!project) {
      return;
    }

    const snapshot = removalUndoRef.current.pop();

    if (!snapshot) {
      setStatus("Nada para desfazer.");
      return;
    }

    setSelectedShapeId(snapshot.selectedShapeId);
    setSelectedPointIndex(snapshot.selectedPointIndex);
    commitScene(cloneProjectWithScene(project, snapshot.scene), "Remocao desfeita. Salvando...");
  }

  function handleDeleteSelection() {
    if (!project || !selectedShape) {
      return;
    }

    if (selectedPointIndex !== null) {
      const points = selectedShape.points ?? [];

      if (points.length <= 3) {
        setStatus("O poligono precisa manter pelo menos 3 pontos.");
        return;
      }

      rememberRemoval();

      const nextPoints = points.filter((_, index) => index !== selectedPointIndex);
      const nextScene = updateShapeInScene(project.scene, selectedShape.id, (shape) => updateShapePoints(shape, nextPoints));

      setSelectedPointIndex(Math.min(selectedPointIndex, nextPoints.length - 1));
      commitScene(cloneProjectWithScene(project, nextScene), "Ponto removido. Ctrl+Z desfaz.");
      return;
    }

    rememberRemoval();

    const nextScene = removeShapeFromScene(project.scene, selectedShape.id);

    setSelectedShapeId(nextScene.shapes[0]?.id ?? null);
    setSelectedPointIndex(null);
    commitScene(cloneProjectWithScene(project, nextScene), "Forma removida. Ctrl+Z desfaz.");
  }

  async function handleCreateProject(payload: { name: string; width: number; height: number }) {
    setStatus("Criando projeto...");

    const createdProject = normalizeProjectForEditor(await createProject(payload));
    updateProjectSummary(createdProject);
    setProject(createdProject);
    setSelectedShapeId(createdProject.scene.shapes[0]?.id ?? null);
    setSelectedPointIndex(null);
    setPlaybackMode("play");
    setStageZoom(1);
    removalUndoRef.current = [];
    lastAnnouncedProjectRef.current = createdProject;
    playbackModeRef.current = "play";
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
    setSelectedPointIndex(null);
    commitScene(cloneProjectWithScene(project, nextScene));
  }

  async function handleImportProjectFile(file: File) {
    const payload = JSON.parse(await file.text()) as ProjectRecord;
    const imported = normalizeProjectForEditor(await importProject(payload));

    updateProjectSummary(imported);
    setProject(imported);
    setSelectedShapeId(imported.scene.shapes[0]?.id ?? null);
    setSelectedPointIndex(null);
    setPlaybackMode("play");
    setStageZoom(1);
    removalUndoRef.current = [];
    lastAnnouncedProjectRef.current = imported;
    playbackModeRef.current = "play";
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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) {
        return;
      }

      if (event.key === "Delete") {
        event.preventDefault();
        handleDeleteSelection();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        handleUndoRemoval();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [project, selectedPointIndex, selectedShape]);

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
            Abrir saida
          </Link>
          <span className="status-pill">{status}</span>
        </div>
      </header>

      <main className="workspace workspace--studio">
        <aside className="workspace__left">
          <ProjectSidebar
            currentProject={project}
            projects={projectList}
            activeProjectId={project.id}
            selectedShapeId={selectedShapeId}
            onSelectProject={(projectId) => void openProject(projectId)}
            onSelectShape={handleSelectShape}
            onCreateProject={handleCreateProject}
            onAddPolygon={() => {
              const shape = createPolygonDraft(project.scene);
              const nextScene = {
                ...project.scene,
                shapes: [...project.scene.shapes, shape]
              };

              setSelectedShapeId(shape.id);
              setSelectedPointIndex(null);
              commitScene(cloneProjectWithScene(project, nextScene));
            }}
            onCreateShapeFromMedia={handleCreateShapeFromMedia}
            onImportProjectFile={handleImportProjectFile}
            onExportProject={handleExportProject}
          />
        </aside>

        <section className="workspace__center workspace__center--primary">
          <MappingStage
            project={project}
            selectedShapeId={selectedShapeId}
            selectedPointIndex={selectedPointIndex}
            editable
            playbackMode={playbackMode}
            zoom={stageZoom}
            onSelectShape={handleSelectShape}
            onSelectPoint={setSelectedPointIndex}
            onTogglePlayback={handleTogglePlayback}
            onZoomChange={setStageZoom}
            onPointsChange={(shapeId: string, points: Point[]) => mutateShape(shapeId, (shape) => updateShapePoints(shape, points))}
          />
        </section>

        <aside className="workspace__right">
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
            onDelete={handleDeleteSelection}
          />
        </aside>

        <section className="workspace__dock">
          <div className="dock-group">
            <span className="dock-group__label">Projeto</span>
            <span className="dock-chip">
              {project.width} x {project.height}
            </span>
            <span className="dock-chip">{project.scene.shapes.length} superficies</span>
          </div>
          <div className="dock-group">
            <span className="dock-group__label">Selecao</span>
            <span className="dock-chip">{selectedShape?.name ?? "nenhuma"}</span>
            <span className="dock-chip">
              {selectedPointIndex !== null ? `ponto ${selectedPointIndex + 1}` : "forma"}
            </span>
          </div>
          <div className="dock-group">
            <span className="dock-group__label">Atalhos</span>
            <span className="dock-chip">Delete remove</span>
            <span className="dock-chip">Ctrl+Z desfaz</span>
            <span className="dock-chip">Ctrl+scroll zoom</span>
          </div>
          <div className="dock-group dock-group--status">
            <span className="dock-group__label">Status</span>
            <span className="dock-chip">{playbackMode === "play" ? "videos ativos" : "videos pausados"}</span>
            <span className="dock-chip">save {formatSavedAt(project.updatedAt)}</span>
          </div>
        </section>
      </main>
    </div>
  );
}
