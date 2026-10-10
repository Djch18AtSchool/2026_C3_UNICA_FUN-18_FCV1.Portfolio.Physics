import { useState, type JSX, type ReactNode } from 'react';
import { formatNumber } from '../../lib/format';
import { useGlobalSettings } from './useGlobalSettings';

export interface ParamFieldProps {
  id: string;
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

/** The value as typed back in Spanish notation: decimal comma, no grouping. */
function toFieldText(value: number): string {
  return String(Number(value.toFixed(MAX_FIELD_DECIMALS))).replace('.', ',');
}

/** Accepts a decimal comma or point, spaces and U+2212; undefined when it is not a number. */
function parseFieldText(text: string): number | undefined {
  const normalized = text.replace(/\s/g, '').replace('−', '-').replace(',', '.');
  if (normalized === '') return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * A parameter as a range and a number field bound to the same value. The range commits on every
 * move; the field keeps what is typed and commits on blur or Enter, clamped to [min, max].
 */
export default function ParamField({
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
  const labelId = `${id}-label`;
  const numberId = `${id}-number`;
  const unitId = `${id}-unit`;

  const commitDraft = () => {
    if (draft === null) return;
    setDraft(null);
    const parsed = parseFieldText(draft);
    if (parsed === undefined) return;
    const next = clamp(parsed, min, max);
    if (next !== value) onChange(next);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <label id={labelId} htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        <span className="flex items-center gap-1.5">
          <input
            id={numberId}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            aria-labelledby={labelId}
            aria-describedby={unit ? unitId : undefined}
            value={draft ?? toFieldText(value)}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commitDraft}
            onKeyDown={(event) => {
              if (event.key === 'Enter') commitDraft();
            }}
            className="h-9 w-24 rounded-base border border-border bg-bg px-2 text-right font-mono text-sm tabular-nums text-fg"
          />
          {unit ? (
            <span id={unitId} className="font-mono text-sm text-fg-muted">
              {unit}
            </span>
          ) : null}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={formatNumber(value, { precision: decimals, unit })}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-6 w-full cursor-pointer accent-accent"
      />
      <span className="font-mono text-xs tabular-nums text-fg-muted">
        {`${formatNumber(min, { precision: decimals })}–${formatNumber(max, { precision: decimals })}`}
      </span>
    </div>
  );
}
