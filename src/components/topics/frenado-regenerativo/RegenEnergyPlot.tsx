import { useMemo, type JSX } from 'react';
import { formatNumber } from '../../../lib/format';
import type { BalanceStep } from '../../../lib/physics/energy';
import type { FrameStore } from '../../lab/frameStore';
import SvgPlot, { type PlotSeries } from '../../lab/SvgPlot';
import { ENERGY_SERIES, energySeries, J_PER_KWH } from './regenScene';

export interface RegenEnergyPlotProps {
  steps: readonly BalanceStep[];
  /** Length of the cycle (s) and end of the energy axis (kWh). */
  duration: number;
  axisMax: number;
  /** The lab's instant; dragging the cursor or moving it with the keys seeks there (and pauses). */
  t: number;
  /** The live clock the cursor follows between renders. */
  frame: FrameStore;
  onSeek(t: number): void;
}

const ENERGY_PRECISION = 3;
/**
 * The five cumulative energies over the whole cycle with a draggable cursor at the lab's t: the
 * cursor and the transport timeline are the same clock.
 */
export default function RegenEnergyPlot({
  steps,
  duration,
  axisMax,
  t,
  frame,
  onSeek,
}: RegenEnergyPlotProps): JSX.Element {
  const series = useMemo<PlotSeries[]>(
    () =>
      ENERGY_SERIES.map(({ key, label, color, dashed }) => ({
        id: key,
        label,
        color,
        dashed,
        points: energySeries(steps, key),
      })),
    [steps],
  );
  const last = steps[steps.length - 1];
  const kWh = (joules: number) =>
    formatNumber(joules / J_PER_KWH, { precision: ENERGY_PRECISION, unit: 'kWh' });

  return (
    <SvgPlot
      title="Energías acumuladas a lo largo del ciclo"
      xLabel="Tiempo"
      xUnit="s"
      yLabel="Energía"
      yUnit="kWh"
      series={series}
      xDomain={{ min: 0, max: duration }}
      yDomain={{ min: 0, max: axisMax }}
      cursor={{
        x: t,
        follow: { frame },
        onChange: onSeek,
        label: (x) => `t = ${formatNumber(x, { precision: 0, unit: 's' })}`,
      }}
      ariaLabel={`Energías acumuladas en ${formatNumber(duration, { precision: 0, unit: 's' })}: tracción ${kWh(last.eTraction)}, carga en carretera ${kWh(last.eRoadLoad)}, frenado en las ruedas ${kWh(last.eBrake)}, a la batería ${kWh(last.eBattery)} y calor en los frenos ${kWh(last.eFriction)}.`}
      testId="regen-energy-plot"
    />
  );
}
