import { useId, type JSX } from 'react';
import { formatNumber } from '../../../lib/format';
import { momentumGauge } from './wheelScene';

/** L_max is a limit: it wears the site's warning red, as the topic's diagram does. */
export const LIMIT_COLOR = 'var(--chart-2)';
const FILL_COLOR = 'var(--fg-muted)';
const PERCENT = 100;
const PERCENT_PRECISION = 1;
const LMAX_PRECISION = 3;

export interface MomentumGaugeProps {
  Lw: number;
  Lmax: number;
  /** The dump threshold as a share of L_max, drawn only in the disturbance mode. */
  threshold?: number;
}

/**
 * |L_w| against L_max as a meter: a neutral fill, a red L_max at the end of the bar and, with a
 * threshold, a dashed mark where the dump starts. Past L_max the bar stays full, turns red and
 * says by how much the turn overshoots.
 */
export default function MomentumGauge({ Lw, Lmax, threshold }: MomentumGaugeProps): JSX.Element {
  const labelId = useId();
  const { percent, fill, exceeds } = momentumGauge(Lw, Lmax);
  const percentText = formatNumber(percent, { precision: PERCENT_PRECISION, unit: '%' });
  const lmaxText = formatNumber(Lmax, { precision: LMAX_PRECISION, unit: 'N·m·s' });
  return (
    <div data-testid="momentum-gauge" data-exceeds={exceeds} className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span id={labelId}>Momento de la rueda |L_w| / L_max</span>
        <span className="font-mono tabular-nums">
          {exceeds ? `${percentText}: excede L_max` : percentText}
        </span>
      </div>
      <div
        role="meter"
        aria-labelledby={labelId}
        aria-valuemin={0}
        aria-valuemax={PERCENT}
        aria-valuenow={Math.min(percent, PERCENT)}
        aria-valuetext={`${percentText} de L_max${exceeds ? ', excede el límite' : ''}`}
        className="relative h-3 rounded-base border border-border bg-bg"
      >
        <div
          className="absolute inset-y-0 left-0 rounded-l-base"
          style={{
            width: `${fill * PERCENT}%`,
            backgroundColor: exceeds ? LIMIT_COLOR : FILL_COLOR,
          }}
        />
        {threshold === undefined ? null : (
          <div
            data-threshold=""
            className="absolute -inset-y-1 border-l-2 border-dashed border-fg"
            style={{ left: `${threshold * PERCENT}%` }}
          />
        )}
        <div
          className="absolute -inset-y-1 right-0 w-[3px] rounded-full"
          style={{ backgroundColor: LIMIT_COLOR }}
        />
      </div>
      <p className="m-0 text-xs text-fg-muted">
        {`En rojo, L_max = ${lmaxText} (RW400).`}
        {threshold === undefined
          ? null
          : ` Punteado: umbral de descarga (elección de diseño), al ${formatNumber(threshold * PERCENT, { precision: 0, unit: '%' })} de L_max.`}
      </p>
    </div>
  );
}
