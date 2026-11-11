import type { CSSProperties, JSX } from 'react';
import { formatNumber } from '../../../lib/format';
import InlineMath from '../../lab/InlineMath';
import { BRAKE_PARTS, ENERGY_SERIES, type BalanceAt, type EnergySeriesSpec } from './regenScene';

/**
 * The scale the bars read in: the cycle's in kWh (its end the energy plot's axis), or a stretch's
 * in kJ (the unit of figure 6.3), and what «accumulated» counts from.
 */
export interface EnergyScale {
  unit: 'kWh' | 'kJ';
  joulesPerUnit: number;
  precision: number;
  /** End of the bars, in `unit`. */
  axisMax: number;
  /** After «Energías acumuladas»: «hasta t», or «en el tramo, hasta t». */
  scope: string;
}

export interface EnergyBarsProps {
  at: BalanceAt;
  scale: EnergyScale;
}

/** The scale's end shows one decimal in kWh and none in kJ. */
const AXIS_PRECISION = { kWh: 1, kJ: 0 } as const;
const PERCENT = 100;
/** A dashed series (the road load) draws its bar striped, as its line is dashed in the plot. */
const STRIPE_PX = 6;
const GAP_PX = 3;

const SERIES_BY_KEY = new Map(ENERGY_SERIES.map((series) => [series.key, series]));

function barStyle({ color, dashed }: EnergySeriesSpec, share: number): CSSProperties {
  const background = dashed
    ? `repeating-linear-gradient(90deg, ${color} 0 ${STRIPE_PX}px, transparent ${STRIPE_PX}px ${STRIPE_PX + GAP_PX}px)`
    : color;
  return { width: `${Math.min(Math.max(share, 0), 1) * PERCENT}%`, background };
}

/** The bar's fill: one block, or for the braking at the wheels its three parts side by side. */
function BarFill({
  series,
  at,
  scale,
}: {
  series: EnergySeriesSpec;
  at: BalanceAt;
  scale: EnergyScale;
}): JSX.Element {
  const share = (key: EnergySeriesSpec['key']) => at[key] / scale.joulesPerUnit / scale.axisMax;
  if (series.key !== 'eBrake') {
    return <span className="block h-full" style={barStyle(series, share(series.key))} />;
  }
  return (
    <span className="flex h-full">
      {BRAKE_PARTS.map((key) => {
        const part = SERIES_BY_KEY.get(key) as EnergySeriesSpec;
        return (
          <span
            key={key}
            data-part={key}
            className="block h-full shrink-0"
            style={barStyle(part, share(key))}
          />
        );
      })}
    </span>
  );
}

/**
 * The six energies accumulated up to t as horizontal bars on one scale (the cycle's in kWh, or a
 * stretch's in kJ), each with its value, in the colors of the plot and the power flow. The braking
 * bar is drawn as its three parts, so recovered + dissipated = braking at the wheels can be read
 * off it (RegenNotes says so).
 */
export default function EnergyBars({ at, scale }: EnergyBarsProps): JSX.Element {
  const { unit, precision, axisMax, scope } = scale;
  const scaleText = formatNumber(axisMax, { precision: AXIS_PRECISION[unit], unit });
  const title = `Energías acumuladas ${scope}`;
  return (
    <div className="@container flex flex-col gap-2">
      <p className="m-0 text-sm font-medium">
        {title} <span className="font-normal text-fg-muted">(escala de 0 a {scaleText})</span>
      </p>
      <ul aria-label={title} className="m-0 flex list-none flex-col gap-2 p-0">
        {ENERGY_SERIES.map((series) => {
          const value = at[series.key] / scale.joulesPerUnit;
          return (
            // In a narrow stage the label and value share a line above a full-width bar; from @md, one row.
            <li
              key={series.key}
              data-energy={series.key}
              className="m-0 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-sm @md:grid-cols-[minmax(0,8rem)_minmax(0,1fr)_auto]"
            >
              <span>
                <InlineMath text={series.label} />
              </span>
              <span
                aria-hidden="true"
                className="col-span-2 row-start-2 h-3 overflow-hidden rounded-base bg-grid @md:col-span-1 @md:col-start-2 @md:row-start-1"
              >
                <BarFill series={series} at={at} scale={scale} />
              </span>
              <span className="col-start-2 row-start-1 font-mono tabular-nums @md:col-start-3">
                {formatNumber(value, { precision, unit })}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
