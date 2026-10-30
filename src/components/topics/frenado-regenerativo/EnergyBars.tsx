import type { CSSProperties, JSX } from 'react';
import { formatNumber } from '../../../lib/format';
import { ENERGY_SERIES, J_PER_KWH, type BalanceAt, type EnergySeriesSpec } from './regenScene';

export interface EnergyBarsProps {
  at: BalanceAt;
  /** End of the bars' scale (kWh), the same as the energy plot's axis. */
  axisMax: number;
}

const ENERGY_PRECISION = 3;
const PERCENT = 100;
/** A dashed series (the road load) draws its bar striped, as its line is dashed in the plot. */
const STRIPE_PX = 6;
const GAP_PX = 3;

function barStyle({ color, dashed }: EnergySeriesSpec, share: number): CSSProperties {
  const background = dashed
    ? `repeating-linear-gradient(90deg, ${color} 0 ${STRIPE_PX}px, transparent ${STRIPE_PX}px ${STRIPE_PX + GAP_PX}px)`
    : color;
  return { width: `${Math.min(Math.max(share, 0), 1) * PERCENT}%`, background };
}

/**
 * The five energies accumulated up to t as horizontal bars on one kWh scale, each with its
 * value, in the colors of the plot and the power flow.
 */
export default function EnergyBars({ at, axisMax }: EnergyBarsProps): JSX.Element {
  const scaleText = formatNumber(axisMax, { precision: 1, unit: 'kWh' });
  return (
    <div className="flex flex-col gap-2">
      <p className="m-0 text-sm font-medium">
        Energías acumuladas hasta t{' '}
        <span className="font-normal text-fg-muted">(escala de 0 a {scaleText})</span>
      </p>
      <ul
        aria-label="Energías acumuladas hasta t"
        className="m-0 flex list-none flex-col gap-1.5 p-0"
      >
        {ENERGY_SERIES.map((series) => {
          const kWh = at[series.key] / J_PER_KWH;
          return (
            // On phones the label and value share a line above a full-width bar; from sm up, one row.
            <li
              key={series.key}
              data-energy={series.key}
              className="m-0 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-sm sm:grid-cols-[minmax(0,9.5rem)_minmax(0,1fr)_auto]"
            >
              <span>{series.label}</span>
              <span
                aria-hidden="true"
                className="col-span-2 row-start-2 h-3 overflow-hidden rounded-[2px] bg-grid sm:col-span-1 sm:col-start-2 sm:row-start-1"
              >
                <span className="block h-full" style={barStyle(series, kWh / axisMax)} />
              </span>
              <span className="col-start-2 row-start-1 font-mono tabular-nums sm:col-start-3">
                {formatNumber(kWh, { precision: ENERGY_PRECISION, unit: 'kWh' })}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
