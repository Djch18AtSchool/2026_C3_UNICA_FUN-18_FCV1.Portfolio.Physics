import { useId, useState } from 'react';
import { designJump } from '../../../lib/physics';
import Readout from '../../controls/Readout';
import type { JumpSettings } from './jumpModel';

export interface JumpDesignerProps {
  /** Current controls; the designer replaces only v₀ and g, so vₓ and the fall multiplier stay. */
  current: JumpSettings;
  onApply: (settings: JumpSettings) => void;
}

const DEFAULT_HEIGHT = '2';
const DEFAULT_TIME_TO_APEX = '0,4';
const INPUT_CLASS =
  'min-h-10 w-full rounded-base border border-border bg-bg px-2 font-mono text-sm tabular-nums focus:border-accent';

/** Reads "0,4" or "0.4"; anything else is NaN. */
function parseDecimal(text: string): number {
  const normalized = text.trim().replace(',', '.');
  return normalized === '' ? Number.NaN : Number(normalized);
}

function derive(heightText: string, timeText: string): { g: number; v0: number } | undefined {
  const height = parseDecimal(heightText);
  const time = parseDecimal(timeText);
  if (!Number.isFinite(height) || !Number.isFinite(time) || height <= 0 || time <= 0) {
    return undefined;
  }
  return designJump(height, time);
}

/** Pittman's design inverse: pick apex height and time to apex, read the g and v₀ that produce them. */
export default function JumpDesigner({ current, onApply }: JumpDesignerProps) {
  const id = useId();
  const [heightText, setHeightText] = useState(DEFAULT_HEIGHT);
  const [timeText, setTimeText] = useState(DEFAULT_TIME_TO_APEX);
  const derived = derive(heightText, timeText);

  return (
    <section
      data-testid="jump-designer"
      aria-labelledby={`${id}-title`}
      className="flex flex-col gap-4 rounded-base border border-border bg-bg-elevated p-4"
    >
      <h3 id={`${id}-title`} className="m-0 border-b border-border pb-3 text-base">
        Diseñar el salto
      </h3>
      <div className="grid gap-4 sm:grid-cols-2 sm:gap-6">
        <div className="grid grid-cols-2 items-end gap-3 self-start">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Altura deseada (m)
            <input
              type="text"
              inputMode="decimal"
              value={heightText}
              onChange={(event) => setHeightText(event.target.value)}
              aria-invalid={derived === undefined}
              className={INPUT_CLASS}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Tiempo al ápice (s)
            <input
              type="text"
              inputMode="decimal"
              value={timeText}
              onChange={(event) => setTimeText(event.target.value)}
              aria-invalid={derived === undefined}
              className={INPUT_CLASS}
            />
          </label>
        </div>
        <div className="flex flex-col gap-3">
          {derived ? (
            <div className="flex flex-col gap-2">
              <Readout label="g = 2h / tₕ²" value={derived.g} unit="m/s²" precision={2} />
              <Readout label="v₀ = 2h / tₕ" value={derived.v0} unit="m/s" precision={2} />
            </div>
          ) : (
            <p role="alert" className="m-0 text-sm text-fg-muted">
              Escribe una altura y un tiempo mayores que cero.
            </p>
          )}
          <button
            type="button"
            disabled={!derived}
            onClick={() => derived && onApply({ ...current, g: derived.g, v0: derived.v0 })}
            className="min-h-10 self-start rounded-base border border-accent bg-accent px-4 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Aplicar
          </button>
        </div>
      </div>
    </section>
  );
}
