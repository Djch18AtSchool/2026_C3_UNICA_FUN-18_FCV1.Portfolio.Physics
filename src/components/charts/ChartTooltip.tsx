import { formatNumber } from '../../lib/format';

export interface TooltipEntry {
  name?: string | number;
  value?: unknown;
  color?: string;
  strokeDasharray?: string | number;
  /** The hovered data row, as Recharts passes it. */
  payload?: unknown;
}

/** A value of the hovered row shown in the tooltip without being plotted, e.g. an effective μ. */
export interface TooltipExtra {
  key: string;
  name: string;
  unit?: string;
  precision?: number;
}

export interface ChartTooltipProps {
  xLabel: string;
  xUnit: string;
  yUnit: string;
  xPrecision?: number;
  yPrecision?: number;
  extras?: readonly TooltipExtra[];
  active?: boolean;
  label?: string | number;
  payload?: readonly TooltipEntry[];
}

type NumericEntry = TooltipEntry & { value: number };

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function hasNumericValue(entry: TooltipEntry): entry is NumericEntry {
  return isFiniteNumber(entry.value);
}

interface ExtraRow {
  name: string;
  text: string;
}

/** The extras that have a finite value in the hovered row, formatted. */
function extraRows(extras: readonly TooltipExtra[], row: unknown): ExtraRow[] {
  if (typeof row !== 'object' || row === null) return [];
  const values = row as Record<string, unknown>;
  return extras.flatMap(({ key, name, unit, precision }) => {
    const value = values[key];
    return isFiniteNumber(value) ? [{ name, text: formatNumber(value, { unit, precision }) }] : [];
  });
}

/**
 * Tooltip body: x header, then one row per series with a line key and value + unit. Its width is
 * capped to the chart container (cqw) minus the y axis, so on a phone long series names wrap
 * instead of running past the right edge of the plot.
 */
export default function ChartTooltip({
  xLabel,
  xUnit,
  yUnit,
  xPrecision,
  yPrecision,
  extras = [],
  active,
  label,
  payload = [],
}: ChartTooltipProps) {
  if (!active) return null;
  const rows = payload.filter(hasNumericValue);
  if (rows.length === 0) return null;
  const extraLines = extraRows(extras, rows[0].payload);

  return (
    <div className="max-w-[calc(100cqw-5rem)] rounded-base border border-border bg-bg-elevated px-3 py-2 text-sm shadow-sm">
      <p className="mb-1 font-mono text-xs text-fg-muted">
        {`${xLabel} = ${formatNumber(Number(label), { unit: xUnit, precision: xPrecision })}`}
      </p>
      <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
        {rows.map((entry) => (
          <li key={String(entry.name)} className="flex items-center gap-2">
            <svg width="16" height="4" aria-hidden="true" className="shrink-0">
              <line
                x1="0"
                y1="2"
                x2="16"
                y2="2"
                stroke={entry.color}
                strokeWidth="2"
                strokeDasharray={entry.strokeDasharray}
              />
            </svg>
            <span className="font-mono font-medium tabular-nums">
              {formatNumber(entry.value, { unit: yUnit, precision: yPrecision })}
            </span>
            <span className="text-fg-muted">{entry.name}</span>
          </li>
        ))}
      </ul>
      {extraLines.length > 0 ? (
        <dl
          data-testid="tooltip-extras"
          className="m-0 mt-1 flex flex-col gap-0.5 border-t border-border pt-1"
        >
          {extraLines.map((extra) => (
            <div key={extra.name} className="flex items-baseline gap-2">
              <dt className="text-fg-muted">{extra.name}</dt>
              <dd className="m-0 font-mono font-medium tabular-nums">{extra.text}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}
