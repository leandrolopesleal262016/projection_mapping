import type { AnimationType, Shape, ShapeStyle, ShapeTransform } from "@projection-mapping/shared";

interface InspectorPanelProps {
  shape: Shape | null;
  onRename: (name: string) => void;
  onTransformChange: (patch: Partial<ShapeTransform>) => void;
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
  onDelete: () => void;
  onResetCalibration: () => void;
}

export function InspectorPanel({
  shape,
  onRename,
  onTransformChange,
  onStyleChange,
  onAnimationChange,
  onDelete,
  onResetCalibration
}: InspectorPanelProps) {
  if (!shape) {
    return (
      <section className="panel inspector">
        <div className="panel__header">
          <h2>Inspetor</h2>
          <span>selecione uma forma</span>
        </div>
        <p className="empty-state">
          Escolha uma camada no canvas para ajustar posição, calibração e animação.
        </p>
      </section>
    );
  }

  return (
    <section className="panel inspector">
      <div className="panel__header">
        <h2>Inspetor</h2>
        <span>{shape.type}</span>
      </div>

      <div className="panel__group">
        <label>
          Nome
          <input value={shape.name} onChange={(event) => onRename(event.target.value)} />
        </label>
      </div>

      <div className="panel__group">
        <h3>Transformação</h3>
        <div className="inline-grid">
          <label>
            X
            <input
              type="number"
              value={Math.round(shape.transform.x)}
              onChange={(event) => onTransformChange({ x: Number(event.target.value) })}
            />
          </label>
          <label>
            Y
            <input
              type="number"
              value={Math.round(shape.transform.y)}
              onChange={(event) => onTransformChange({ y: Number(event.target.value) })}
            />
          </label>
          <label>
            Largura
            <input
              type="number"
              min={24}
              value={Math.round(shape.transform.width)}
              onChange={(event) => onTransformChange({ width: Number(event.target.value) })}
            />
          </label>
          <label>
            Altura
            <input
              type="number"
              min={24}
              value={Math.round(shape.transform.height)}
              onChange={(event) => onTransformChange({ height: Number(event.target.value) })}
            />
          </label>
        </div>
        <label>
          Rotação
          <input
            type="range"
            min={-180}
            max={180}
            value={shape.transform.rotation}
            onChange={(event) => onTransformChange({ rotation: Number(event.target.value) })}
          />
          <span className="field-hint">{shape.transform.rotation.toFixed(0)}°</span>
        </label>
      </div>

      <div className="panel__group">
        <h3>Estilo</h3>
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
          Opacidade
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

      <div className="panel__group">
        <h3>Calibração</h3>
        <p className="field-hint">{shape.isCalibrated ? "quad manual ativo" : "usando quad padrão"}</p>
        <button type="button" className="button button--secondary" onClick={onResetCalibration}>
          Resetar calibração
        </button>
      </div>

      <button type="button" className="button button--danger" onClick={onDelete}>
        Remover forma
      </button>
    </section>
  );
}
