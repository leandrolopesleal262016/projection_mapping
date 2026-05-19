import { DEFAULT_MEDIA, type AnimationType, type MediaFit, type Shape, type ShapeStyle } from "@projection-mapping/shared";

interface InspectorPanelProps {
  shape: Shape | null;
  onRename: (name: string) => void;
  onStyleChange: (patch: Partial<ShapeStyle>) => void;
  onAnimationChange: (
    patch: Partial<{
      type: AnimationType;
      durationMs: number;
      intensity: number;
      delayMs: number;
      loop: boolean;
    }>
  ) => void;
  onMediaFile: (file: File) => Promise<void>;
  onMediaFitChange: (fit: MediaFit) => void;
  onClearMedia: () => void;
  onDelete: () => void;
}

export function InspectorPanel({
  shape,
  onRename,
  onStyleChange,
  onAnimationChange,
  onMediaFile,
  onMediaFitChange,
  onClearMedia,
  onDelete
}: InspectorPanelProps) {
  if (!shape) {
    return (
      <section className="panel panel--compact inspector">
        <div className="panel__header">
          <h2>Inspetor</h2>
          <span>selecione um polígono</span>
        </div>
        <p className="empty-state">
          Escolha uma forma no palco para editar cor, mídia, animação e quantidade de pontos.
        </p>
      </section>
    );
  }

  const media = shape.media ?? DEFAULT_MEDIA;

  return (
    <section className="panel panel--compact inspector">
      <div className="panel__header">
        <h2>Inspetor</h2>
        <span>{shape.points?.length ?? 0} pontos</span>
      </div>

      <div className="panel__group">
        <label>
          Nome
          <input value={shape.name} onChange={(event) => onRename(event.target.value)} />
        </label>
        <p className="field-hint">Duplo clique em uma aresta no palco para criar um novo ponto.</p>
      </div>

      <div className="panel__group">
        <h3>Preenchimento</h3>
        <div className="inline-grid">
          <label>
            Fill
            <input
              type="color"
              value={shape.style.fill}
              onChange={(event) => onStyleChange({ fill: event.target.value })}
            />
          </label>
          <label>
            Stroke
            <input
              type="color"
              value={shape.style.stroke}
              onChange={(event) => onStyleChange({ stroke: event.target.value })}
            />
          </label>
        </div>
        <label>
          Espessura do stroke
          <input
            type="range"
            min={0}
            max={12}
            value={shape.style.strokeWidth}
            onChange={(event) => onStyleChange({ strokeWidth: Number(event.target.value) })}
          />
          <span className="field-hint">{shape.style.strokeWidth}px</span>
        </label>
        <label>
          Opacidade base
          <input
            type="range"
            min={0.1}
            max={1}
            step={0.05}
            value={shape.style.opacity}
            onChange={(event) => onStyleChange({ opacity: Number(event.target.value) })}
          />
          <span className="field-hint">{Math.round(shape.style.opacity * 100)}%</span>
        </label>
      </div>

      <div className="panel__group">
        <h3>Mídia</h3>
        <p className="field-hint">
          Atual: {media.kind === "none" ? "sem mídia" : `${media.kind}${media.label ? ` • ${media.label}` : ""}`}
        </p>
        <label className="file-input">
          Trocar mídia
          <input
            type="file"
            accept="image/*,image/gif,video/*,.svg,image/svg+xml"
            onChange={(event) => {
              const file = event.target.files?.[0];

              if (file) {
                void onMediaFile(file);
              }

              event.target.value = "";
            }}
          />
        </label>
        <label>
          Ajuste da mídia
          <select value={media.objectFit} onChange={(event) => onMediaFitChange(event.target.value as MediaFit)}>
            <option value="cover">Cover</option>
            <option value="contain">Contain</option>
            <option value="fill">Fill</option>
          </select>
        </label>
        <button
          type="button"
          className="button button--secondary"
          disabled={media.kind === "none"}
          onClick={onClearMedia}
        >
          Remover mídia
        </button>
      </div>

      <div className="panel__group">
        <h3>Animação</h3>
        <label>
          Tipo
          <select
            value={shape.animation.type}
            onChange={(event) =>
              onAnimationChange({
                type: event.target.value as AnimationType
              })
            }
          >
            <option value="none">Nenhuma</option>
            <option value="pulse">Pulse</option>
            <option value="drift">Drift</option>
            <option value="rotate">Rotate</option>
            <option value="strobe">Strobe</option>
          </select>
        </label>
        <label>
          Duração
          <input
            type="range"
            min={400}
            max={8000}
            step={100}
            value={shape.animation.durationMs}
            onChange={(event) => onAnimationChange({ durationMs: Number(event.target.value) })}
          />
          <span className="field-hint">{shape.animation.durationMs} ms</span>
        </label>
        <label>
          Intensidade
          <input
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={shape.animation.intensity}
            onChange={(event) => onAnimationChange({ intensity: Number(event.target.value) })}
          />
          <span className="field-hint">{shape.animation.intensity.toFixed(2)}</span>
        </label>
        <label>
          Delay
          <input
            type="range"
            min={0}
            max={4000}
            step={100}
            value={shape.animation.delayMs}
            onChange={(event) => onAnimationChange({ delayMs: Number(event.target.value) })}
          />
          <span className="field-hint">{shape.animation.delayMs} ms</span>
        </label>
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={shape.animation.loop}
            onChange={(event) => onAnimationChange({ loop: event.target.checked })}
          />
          Loop contínuo
        </label>
      </div>

      <button type="button" className="button button--danger" onClick={onDelete}>
        Remover forma
      </button>
    </section>
  );
}
