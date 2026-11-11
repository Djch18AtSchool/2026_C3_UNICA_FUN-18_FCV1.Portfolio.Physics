import { useState, type JSX, type ReactNode } from 'react';
import { formatNumber, MINUS_SIGN } from '../../lib/format';
import { mathAriaLabel } from '../../lib/inlineMath';
import InlineMath from './InlineMath';
import { useGlobalSettings } from './useGlobalSettings';
import { withStableCallbacks } from './withStableCallbacks';

export interface ParamFieldProps {
  id: string;
  /** A string may hold KaTeX inline between `$…$` (InlineMath). */
  label: ReactNode;
  unit: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange(v: number): void;
}

/** Decimals the number field shows at most, so float noise never reaches the reader. */
const MAX_FIELD_DECIMALS = 4;

/** The value as typed back in Spanish notation: U+2212 minus, decimal comma, no grouping. */
function toFieldText(value: number): string {
  return String(Number(value.toFixed(MAX_FIELD_DECIMALS)))
    .replace('-', MINUS_SIGN)
    .replace('.', ',');
}

/** Accepts a decimal comma or point, spaces, and U+2212 or "-"; undefined when not a number. */
function parseFieldText(text: string): number | undefined {
  const normalized = text.replace(/\s/g, '').replaceAll(MINUS_SIGN, '-').replace(',', '.');
  if (normalized === '') return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Decimal places of a number as written (0.25 → 2, 1e-3 → 3). */
export function decimalsOf(value: number): number {
  const [mantissa, exponent = '0'] = String(value).split('e');
  const fraction = mantissa.split('.')[1]?.length ?? 0;
  return Math.max(0, fraction - Number(exponent));
}

/** Tolerance for "max lies on the grid" despite float division error. */
const GRID_EPSILON = 1e-9;

/**
 * The grid point min + k·step nearest to value, inside [min, max] (k never passes the last grid
 * point, even when max is off the grid), with the float residue rounded away. This is the value
 * the range thumb can show, so the field and the thumb always agree.
 */
function snapToStep(value: number, min: number, max: number, step: number): number {
  if (!(step > 0)) return clamp(value, min, max);
  const lastIndex = Math.floor((max - min) / step + GRID_EPSILON);
  const index = clamp(Math.round((value - min) / step), 0, lastIndex);
  return Number((min + index * step).toFixed(Math.max(decimalsOf(step), decimalsOf(min))));
}

/** Five monospace characters: the longest unit of the labs' fields («m/s²», «km/h», «kWh»). */
export const UNIT_BOX = 'w-[5ch] shrink-0 font-mono text-sm text-fg-muted';

/**
 * A parameter as a range and a number field bound to the same value. The range commits on every
 * move; the field keeps what is typed and commits on blur or Enter, snapped to the step grid
 * min + k·step and clamped to [min, max]. Memoized with stable callbacks: a playing lab's 10 Hz
 * renders never reach its inputs.
 */
function ParamField({
  id,
  label,
  unit,
  min,
  max,
  step,
  value,
  onChange,
}: ParamFieldProps): JSX.Element {
  const { decimals } = useGlobalSettings();
  const [draft, setDraft] = useState<string | null>(null);
  /** The range hint prints the grid's own precision (40–160, 0,25–2,00), not the global one. */
  const gridDecimals = Math.max(decimalsOf(step), decimalsOf(min));
  const labelId = `${id}-label`;
  const numberId = `${id}-number`;
  const unitId = `${id}-unit`;
  /** A label with $…$ names both inputs in words (KaTeX's MathML would read unevenly). */
  const spokenLabel = typeof label === 'string' ? mathAriaLabel(label) : undefined;

  const commitDraft = () => {
    if (draft === null) return;
    setDraft(null);
    const parsed = parseFieldText(draft);
    if (parsed === undefined) return;
    const next = snapToStep(parsed, min, max, step);
    if (next !== value) onChange(next);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <label id={labelId} htmlFor={id} className="text-sm font-medium">
          {typeof label === 'string' ? <InlineMath text={label} /> : label}
        </label>
        <span className="flex items-center gap-2">
          <input
            id={numberId}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            aria-labelledby={spokenLabel ? undefined : labelId}
            aria-label={spokenLabel}
            aria-describedby={unit ? unitId : undefined}
            value={draft ?? toFieldText(value)}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commitDraft}
            onKeyDown={(event) => {
              if (event.key === 'Enter') commitDraft();
            }}
            className="h-10 w-16 rounded-base border border-border bg-bg px-1 text-right font-mono text-sm tabular-nums text-fg"
          />
          {/* A unit box of one width in every field (none is longer than «m/s²»), empty without
              a unit, so the number boxes of a level line up in a column. */}
          {unit ? (
            <span id={unitId} className={UNIT_BOX}>
              {unit}
            </span>
          ) : (
            <span aria-hidden="true" className={UNIT_BOX} />
          )}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={spokenLabel}
        aria-valuetext={formatNumber(value, { precision: decimals, unit })}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-6 w-full cursor-pointer accent-accent"
      />
      <span className="font-mono text-xs tabular-nums text-fg-muted">
        {`${formatNumber(min, { precision: gridDecimals })}–${formatNumber(max, { precision: gridDecimals })}`}
      </span>
    </div>
  );
}

export default withStableCallbacks(ParamField);
