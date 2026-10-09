import { formatNumber } from '../../lib/format';

export interface TooltipEntry {
  name?: string | number;
  value?: unknown;
  color?: string;
  strokeDasharray?: string | number;
}

export interface ChartTooltipProps {
  xLabel: string;
  xUnit: string;
  yUnit: string;
  active?: boolean;
  label?: string | number;
  payload?: readonly TooltipEntry[];
}

type NumericEntry = TooltipEntry & { value: number };

function hasNumericValue(entry: TooltipEntry): entry is NumericEntry {
  return typeof entry.value === 'number' && Number.isFinite(entry.value);
}

/** Tooltip body: x header, then one row per series with a line key and value + unit. */
export default function ChartTooltip({
  xLabel,
  xUnit,
  yUnit,
  active,
  label,
  payload = [],
}: ChartTooltipProps) {
  if (!active) return null;
  const rows = payload.filter(hasNumericValue);
  if (rows.length === 0) return null;

  return (
    <div className="rounded-base border border-border bg-bg-elevated px-3 py-2 text-sm shadow-sm">
      <p className="mb-1 font-mono text-xs text-fg-muted">
        {`${xLabel} = ${formatNumber(Number(label), { unit: xUnit })}`}
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
              {formatNumber(entry.value, { unit: yUnit })}
            </span>
            <span className="text-fg-muted">{entry.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
