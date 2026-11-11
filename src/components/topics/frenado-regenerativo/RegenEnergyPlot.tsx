import { useMemo, type JSX } from 'react';
import { formatNumber } from '../../../lib/format';
import type { BalanceStep } from '../../../lib/physics/energy';
import type { FrameStore } from '../../lab/frameStore';
import SvgPlot, { type PlotBand, type PlotCursor, type PlotSeries } from '../../lab/SvgPlot';
import { ENERGY_SERIES, energySeries, J_PER_KWH } from './regenScene';
import type { Stretch } from './regenStretch';

export interface RegenEnergyPlotProps {
  steps: readonly BalanceStep[];
  /** Length of the cycle (s) and end of the energy axis (kWh). */
  duration: number;
  axisMax: number;
  /** The lab's instant, in the cycle's time. */
  t: number;
  /** The live clock the cursor follows between renders, and its time in the cycle's. */
  frame: FrameStore;
  toCycle(t: number): number;
  /** Dragging the cursor or moving it with the keys seeks there (and pauses), in the cycle's time. */
  onSeek(t: number): void;
  /**
   * The cursor's «t = …» in the cycle's time, as the transport reads it (its timeOrigin in
   * «Tramo»), so the plot's slider and the timeline say the same t.
   */
  cursorLabel(x: number): string;
  /** The stretch the view «Tramo» plays, shaded. */
  stretch?: Stretch;
}

const ENERGY_PRECISION = 3;
const STRETCH_LABEL = 'Tramo';

/**
 * The cumulative energies over the whole cycle with a draggable cursor at the lab's instant: the
 * same clock as the transport timeline. In the view «Tramo» the stretch it plays is shaded.
 */
export default function RegenEnergyPlot({
  steps,
  duration,
  axisMax,
  t,
  frame,
  toCycle,
  onSeek,
  cursorLabel,
  stretch,
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
  const follow = { frame, toX: toCycle };
  const cursor: PlotCursor = { x: t, follow, onChange: onSeek, label: cursorLabel };
  const bands: PlotBand[] = stretch
    ? [{ from: stretch.start, to: stretch.end, label: STRETCH_LABEL, labelBefore: true }]
    : [];

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
      cursor={cursor}
      bands={bands}
      ariaLabel={`Energías acumuladas en ${formatNumber(duration, { precision: 0, unit: 's' })}: tracción ${kWh(last.eTraction)}, carga en carretera ${kWh(last.eRoadLoad)}, frenado en las ruedas ${kWh(last.eBrake)}, a la batería ${kWh(last.eBattery)} y calor en los frenos ${kWh(last.eFriction)}.`}
      testId="regen-energy-plot"
    />
  );
}
