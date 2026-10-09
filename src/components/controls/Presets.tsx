import type { Preset } from '../../lib/presets';

export type { Preset };

export interface PresetsProps<T> {
  presets: Preset<T>[];
  activeId?: string;
  onSelect: (preset: Preset<T>) => void;
}

const BUTTON_BASE =
  'flex min-h-11 flex-col items-start justify-center rounded-base border px-3 py-1.5 text-left transition-colors';
const BUTTON_ACTIVE = 'border-accent bg-accent/10';
const BUTTON_IDLE = 'border-border bg-bg-elevated hover:border-fg-muted';

export default function Presets<T>({ presets, activeId, onSelect }: PresetsProps<T>) {
  const active = presets.find((preset) => preset.id === activeId);

  return (
    <div className="flex flex-col gap-2">
      <div role="group" aria-label="Valores de referencia" className="flex flex-wrap gap-2">
        {presets.map((preset) => {
          const isActive = preset.id === activeId;
          return (
            <button
              key={preset.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => onSelect(preset)}
              className={`${BUTTON_BASE} ${isActive ? BUTTON_ACTIVE : BUTTON_IDLE}`}
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                <span
                  aria-hidden="true"
                  className={`size-2.5 rounded-[1px] border ${isActive ? 'border-accent bg-accent' : 'border-fg-muted'}`}
                />
                {preset.name}
              </span>
              {preset.sourceLabel ? (
                <span className="text-xs text-fg-muted">{preset.sourceLabel}</span>
              ) : null}
            </button>
          );
        })}
      </div>
      {active?.note ? <p className="text-sm text-fg-muted">{active.note}</p> : null}
    </div>
  );
}
