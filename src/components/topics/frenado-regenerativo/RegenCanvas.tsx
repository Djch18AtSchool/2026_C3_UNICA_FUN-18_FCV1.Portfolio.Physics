import { useCallback, useMemo, type JSX } from 'react';
import type { CycleId, DriveCycle } from '../../../lib/data/driveCycles';
import type { BalanceStep } from '../../../lib/physics/energy';
import TimeScaleBadge from '../../lab/TimeScaleBadge';
import { transportTimeValue } from '../../lab/transportTime';
import type { SimClock } from '../../lab/useSimClock';
import CycleMinimap from './CycleMinimap';
import EnergyBars from './EnergyBars';
import RegenEnergyPlot from './RegenEnergyPlot';
import RegenScene from './RegenScene';
import { balanceAt, energyAxisMax, type BalanceAt } from './regenScene';
import type { RegenView, Stretch, ViewTiming } from './regenStretch';
import { energyScale, roadRange, shownBalance, STOPS } from './regenViews';

export interface RegenCanvasProps {
  view: RegenView;
  cycleId: CycleId;
  cycle: DriveCycle;
  vehicleName: string;
  steps: readonly BalanceStep[];
  distances: readonly number[];
  stretch: Stretch;
  timing: ViewTiming;
  clock: SimClock;
  /** The balance at the settled instant, in the cycle's own time. */
  at: BalanceAt;
  decimals: number;
}

/** An instant the energy cursor asks for, kept inside the stretch in «Tramo». */
const viewInstant = (cycleT: number, stretch: Stretch | undefined) =>
  stretch ? Math.min(Math.max(cycleT, stretch.start), stretch.end) : cycleT;

/** The moving layers' sources: the view's live clock read in the cycle's time. */
function useCanvasLive(
  clock: SimClock,
  steps: readonly BalanceStep[],
  distances: readonly number[],
  offset: number,
) {
  const toCycle = useCallback((t: number) => offset + t, [offset]);
  const atTime = useCallback(
    (t: number) => balanceAt(steps, distances, offset + t),
    [steps, distances, offset],
  );
  const live = useMemo(() => ({ frame: clock.frame, atTime }), [clock.frame, atTime]);
  const minimapLive = useMemo(() => ({ frame: clock.frame, toCycle }), [clock.frame, toCycle]);
  return { toCycle, live, minimapLive };
}

/**
 * The lab's canvas, the scene first: the minimap and the scene with its time-scale badge. Its
 * energies (the bars and the plot) are the support plots under the readouts (RegenCharts).
 */
export default function RegenCanvas(props: RegenCanvasProps): JSX.Element {
  const { view, cycleId, cycle, steps, distances, stretch, timing, clock, at } = props;
  const isStretch = view === 'tramo';
  const { live, minimapLive } = useCanvasLive(clock, steps, distances, timing.offset);
  return (
    <div className="flex flex-col gap-3">
      <CycleMinimap
        samples={cycle.samples}
        stops={STOPS[cycleId]}
        stretch={isStretch ? stretch : undefined}
        cycleName={cycle.name}
        live={minimapLive}
      />
      <RegenScene
        at={at}
        live={live}
        totalDistance={distances[distances.length - 1]}
        road={roadRange(view, stretch, steps, distances)}
        vehicleName={props.vehicleName}
        cycleName={cycle.name}
        decimals={props.decimals}
        timeScale={<TimeScaleBadge clock={clock} />}
      />
    </div>
  );
}

/**
 * The scene's energies, after the readouts: the bars and the energy plot. In «Tramo» the bars
 * count from the stretch's start and the energy cursor stays inside the stretch. One t on screen,
 * the cycle's: the cursor reads it as the transport does through its timeOrigin, with the same
 * unit and decimals.
 */
export function RegenCharts(props: RegenCanvasProps): JSX.Element {
  const { view, steps, distances, stretch, timing, clock, at } = props;
  const { offset } = timing;
  const isStretch = view === 'tramo';
  const { toCycle } = useCanvasLive(clock, steps, distances, offset);
  const scale = useMemo(
    () => energyScale(view, stretch, steps, distances),
    [view, stretch, steps, distances],
  );
  const cycleAxisMax = useMemo(() => energyAxisMax(steps), [steps]);
  const seekCycle = (cycleT: number) =>
    clock.seek(viewInstant(cycleT, isStretch ? stretch : undefined) - offset);
  return (
    <>
      <EnergyBars at={shownBalance(at, view, stretch, steps, distances)} scale={scale} />
      <RegenEnergyPlot
        steps={steps}
        duration={steps[steps.length - 1].t}
        axisMax={cycleAxisMax}
        t={toCycle(clock.state.t)}
        frame={clock.frame}
        toCycle={toCycle}
        onSeek={seekCycle}
        cursorLabel={(x) => `$t$ = ${transportTimeValue(x, timing.duration, 's')}`}
        stretch={isStretch ? stretch : undefined}
      />
    </>
  );
}
