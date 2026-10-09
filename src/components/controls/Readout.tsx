import { formatNumber } from '../../lib/format';

export interface ReadoutProps {
  label: string;
  value: number;
  unit: string;
  precision?: number;
}

export default function Readout({ label, value, unit, precision }: ReadoutProps) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-dotted border-border pb-1.5">
      <span className="text-sm text-fg-muted">{label}</span>
      <span className="font-mono text-base font-medium tabular-nums">
        {formatNumber(value, { precision, unit })}
      </span>
    </div>
  );
}
