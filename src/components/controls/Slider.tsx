import { formatNumber } from '../../lib/format';

export interface SliderProps {
  id: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  precision?: number;
}

/** Number of decimals written in `step` (0.01 → 2), so the display matches the control's grain. */
function decimalsOf(step: number): number {
  return step.toString().split('.')[1]?.length ?? 0;
}

export default function Slider({
  id,
  label,
  unit,
  min,
  max,
  step,
  value,
  onChange,
  precision = decimalsOf(step),
}: SliderProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium">
          {`${label} (${unit})`}
        </label>
        <span data-testid="slider-value" className="font-mono text-sm tabular-nums">
          {formatNumber(value, { precision, unit })}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={formatNumber(value, { precision, unit })}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-6 w-full cursor-pointer accent-accent"
      />
      <span className="font-mono text-xs tabular-nums text-fg-muted">
        {`${formatNumber(min, { precision })}–${formatNumber(max, { precision })}`}
      </span>
    </div>
  );
}
