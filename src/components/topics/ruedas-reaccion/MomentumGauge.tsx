import type { JSX } from 'react';
import { formatNumber } from '../../../lib/format';
import { mathAriaLabel } from '../../../lib/inlineMath';
import { mathTextToString } from '../../../lib/mathNotation';
import InlineMath from '../../lab/InlineMath';
import { momentumGauge } from './wheelScene';

const GAUGE_LABEL = String.raw`Momento de la rueda $|L_w| / L_\text{máx}$`;

/** L_max is a limit: it wears the site's warning red, as the topic's diagram does. */
export const LIMIT_COLOR = 'var(--chart-2)';
const FILL_COLOR = 'var(--fg-muted)';
const PERCENT = 100;
const PERCENT_PRECISION = 1;
const LMAX_PRECISION = 3;
/** Where the dump starts on the gauge, dashed like the plots' reference lines. */
// scale-exempt: a dashed threshold mark on the gauge, not a line that separates content
const THRESHOLD_MARK = 'absolute -inset-y-1 border-l-2 border-dashed border-fg';

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
  const { percent, fill, exceeds } = momentumGauge(Lw, Lmax);
  const percentText = formatNumber(percent, { precision: PERCENT_PRECISION, unit: '%' });
  const lmaxText = formatNumber(Lmax, { precision: LMAX_PRECISION, unit: 'N·m·s' });
  return (
    <div data-testid="momentum-gauge" data-exceeds={exceeds} className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span>
          <InlineMath text={GAUGE_LABEL} />
        </span>
        <span className="font-mono tabular-nums">
          {exceeds ? <InlineMath text={`${percentText}: excede $L_\\text{máx}$`} /> : percentText}
        </span>
      </div>
      <div
        role="meter"
        aria-label={mathAriaLabel(GAUGE_LABEL)}
        aria-valuemin={0}
        aria-valuemax={PERCENT}
        aria-valuenow={Math.min(percent, PERCENT)}
        aria-valuetext={mathTextToString(
          `${percentText} de L_máx${exceeds ? ', excede el límite' : ''}`,
        )}
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
            className={THRESHOLD_MARK}
            style={{ left: `${threshold * PERCENT}%` }}
          />
        )}
        <div
          className="absolute -inset-y-1 right-0 w-1 rounded-full"
          style={{ backgroundColor: LIMIT_COLOR }}
        />
      </div>
      <p className="m-0 text-xs text-fg-muted">
        <InlineMath
          text={
            `En rojo, $L_\\text{máx}$ = ${lmaxText} (RW400).` +
            (threshold === undefined
              ? ''
              : ` Punteado: umbral de descarga (elección de diseño), al ${formatNumber(threshold * PERCENT, { precision: 0, unit: '%' })} de $L_\\text{máx}$.`)
          }
        />
      </p>
    </div>
  );
}
