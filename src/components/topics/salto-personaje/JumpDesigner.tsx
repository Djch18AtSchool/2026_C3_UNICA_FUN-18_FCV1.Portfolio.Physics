import { useId, useState } from 'react';
import { designJump } from '../../../lib/physics';
import { formatNumber } from '../../../lib/format';
import { useGlobalSettings } from '../../lab/useGlobalSettings';
import type { JumpSettings } from './jumpModel';

export interface JumpDesignerProps {
  /** Current controls; the designer replaces only v₀ and g, so vₓ and the fall multiplier stay. */
  current: JumpSettings;
  onApply: (settings: JumpSettings) => void;
}

const DEFAULT_HEIGHT = '2';
const DEFAULT_TIME_TO_APEX = '0,4';
const INPUT_CLASS =
  'min-h-10 w-full rounded-base border border-border bg-bg px-2 font-mono text-sm tabular-nums focus:border-accent aria-invalid:border-chart-2';

/** Reads "0,4" or "0.4"; anything else is NaN. */
function parseDecimal(text: string): number {
  const normalized = text.trim().replace(',', '.');
  return normalized === '' ? Number.NaN : Number(normalized);
}

function isPositiveDecimal(text: string): boolean {
  const value = parseDecimal(text);
  return Number.isFinite(value) && value > 0;
}

/**
 * Pittman's design inverse: pick apex height and time to apex, read the g and v₀ that produce them.
 * Compact (one row from sm up), drawn below the laboratory.
 */
export default function JumpDesigner({ current, onApply }: JumpDesignerProps) {
  const id = useId();
  const { decimals } = useGlobalSettings();
  const [heightText, setHeightText] = useState(DEFAULT_HEIGHT);
  const [timeText, setTimeText] = useState(DEFAULT_TIME_TO_APEX);
  const isHeightValid = isPositiveDecimal(heightText);
  const isTimeValid = isPositiveDecimal(timeText);
  const derived =
    isHeightValid && isTimeValid
      ? designJump(parseDecimal(heightText), parseDecimal(timeText))
      : undefined;
  const hintId = `${id}-hint`;

  return (
    <section
      data-testid="jump-designer"
      aria-labelledby={`${id}-title`}
      className="flex flex-col gap-3 rounded-base border border-border bg-bg-elevated p-3"
    >
      <h3 id={`${id}-title`} className="m-0 text-sm font-semibold">
        Diseñar el salto
        <span className="font-normal text-fg-muted"> · altura y tiempo al ápice → g y v₀</span>
      </h3>
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <label className="flex w-32 flex-col gap-1 text-sm font-medium">
          Altura deseada (m)
          <input
            type="text"
            inputMode="decimal"
            value={heightText}
            onChange={(event) => setHeightText(event.target.value)}
            aria-invalid={!isHeightValid}
            aria-describedby={isHeightValid ? undefined : hintId}
            className={INPUT_CLASS}
          />
        </label>
        <label className="flex w-32 flex-col gap-1 text-sm font-medium">
          Tiempo al ápice (s)
          <input
            type="text"
            inputMode="decimal"
            value={timeText}
            onChange={(event) => setTimeText(event.target.value)}
            aria-invalid={!isTimeValid}
            aria-describedby={isTimeValid ? undefined : hintId}
            className={INPUT_CLASS}
          />
        </label>
        {derived ? (
          <p
            data-testid="jump-designer-result"
            className="m-0 flex min-h-10 flex-wrap items-center gap-x-4 gap-y-1 font-mono text-sm tabular-nums"
          >
            <span>{`g = 2h/tₕ² = ${formatNumber(derived.g, { precision: decimals, unit: 'm/s²' })}`}</span>
            <span>{`v₀ = 2h/tₕ = ${formatNumber(derived.v0, { precision: decimals, unit: 'm/s' })}`}</span>
          </p>
        ) : null}
        <button
          type="button"
          disabled={!derived}
          onClick={() => derived && onApply({ ...current, g: derived.g, v0: derived.v0 })}
          className="min-h-10 rounded-base border border-accent bg-accent px-4 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Aplicar
        </button>
      </div>
      {/* Always mounted so screen readers notice the hint appear; polite, not an alert, while typing. */}
      <p id={hintId} aria-live="polite" className="m-0 text-sm text-fg-muted empty:sr-only">
        {derived ? '' : 'Escribe una altura y un tiempo mayores que cero.'}
      </p>
    </section>
  );
}
