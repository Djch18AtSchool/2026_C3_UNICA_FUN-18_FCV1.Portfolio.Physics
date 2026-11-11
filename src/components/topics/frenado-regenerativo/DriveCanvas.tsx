import { useMemo, type JSX } from 'react';
import type { CycleId, DriveCycle } from '../../../lib/data/driveCycles';
import type { BalanceStep, RegenParams } from '../../../lib/physics/energy';
import TimeScaleBadge from '../../lab/TimeScaleBadge';
import type { SimClock } from '../../lab/useSimClock';
import CycleMinimap from './CycleMinimap';
import DrivePedals from './DrivePedals';
import DriveSpeedPlot from './DriveSpeedPlot';
import EnergyBars from './EnergyBars';
import RegenScene from './RegenScene';
import { speedTrace, stateAt, type DriveCourse } from './driveRun';
import {
  DRIVE_HINT,
  driveSceneCaption,
  driveSummary,
  longestSummary,
  noticeText,
} from './driveText';
import { driveBalance, driveEnergyScale, driveRoad, referenceAt } from './driveViews';
import type { Stretch } from './regenStretch';
import { energyScale, STOPS } from './regenViews';
import type { DriveSession } from './useDriveSession';

export interface DriveCanvasProps {
  cycleId: CycleId;
  cycle: DriveCycle;
  vehicleName: string;
  /** The cycle's balance with the lab's car and model: the cycle's car on the course. */
  steps: readonly BalanceStep[];
  distances: readonly number[];
  stretch: Stretch;
  course: DriveCourse;
  regen: RegenParams;
  /** The drive's clock (session.clock): seeks clamped to what was driven. */
  clock: SimClock;
  session: DriveSession;
  decimals: number;
}

/** The status line's text: the hint, a limit met, the summary at the instant it paused, or none. */
function statusText({ session, steps, distances, course, cycle, regen }: DriveCanvasProps) {
  const { message } = session;
  switch (message.kind) {
    case 'hint':
      return DRIVE_HINT;
    case 'notice':
      return noticeText(message.notice, regen);
    case 'summary':
      return driveSummary({
        own: driveBalance(stateAt(session.run, message.t), course),
        reference: referenceAt(steps, distances, course, message.t),
        course,
        cycleName: cycle.name,
        t: message.t,
      });
    case 'none':
      return '';
  }
}

/** The moving layers' sources: your run and the cycle's car, at any live time of the clock. */
function useDriveLive(props: DriveCanvasProps) {
  const { session, course, steps, distances, clock } = props;
  const { frame } = clock;
  const { liveAt } = session;
  return useMemo(
    () => ({
      own: { frame, atTime: (t: number) => driveBalance(liveAt(t), course) },
      ghost: { frame, atTime: (t: number) => referenceAt(steps, distances, course, t) },
      minimap: { frame, toCycle: (t: number) => course.offset + t },
    }),
    [frame, liveAt, course, steps, distances],
  );
}

/**
 * The canvas of «Conducir»: the minimap with the stretch, the scene with your car, the cycle's car
 * as a dashed outline and the stop line, the pedals with the status line, your speed against the
 * cycle's, and your energies on the scale of the cycle's stretch. The flows, the phase, the bars and
 * the readouts follow your run at the clock's settled time; the cars and the pedals, every frame.
 */
export default function DriveCanvas(props: DriveCanvasProps): JSX.Element {
  const { cycleId, cycle, steps, distances, stretch, course, clock, session } = props;
  const t = clock.state.t;
  const own = driveBalance(session.settled, course);
  const reference = referenceAt(steps, distances, course, t);
  const live = useDriveLive(props);
  const stretchAxis = useMemo(
    () => energyScale('tramo', stretch, steps, distances).axisMax,
    [stretch, steps, distances],
  );
  const reserve = useMemo(() => longestSummary(course, cycle.name), [course, cycle.name]);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <CycleMinimap
          samples={cycle.samples}
          stops={STOPS[cycleId]}
          stretch={stretch}
          cycleName={cycle.name}
          live={live.minimap}
        />
        <RegenScene
          at={own}
          live={live.own}
          ghost={live.ghost}
          totalDistance={distances[distances.length - 1]}
          road={driveRoad(course)}
          vehicleName={props.vehicleName}
          cycleName={cycle.name}
          decimals={props.decimals}
          timeScale={<TimeScaleBadge clock={clock} />}
          caption={driveSceneCaption(own, reference, course, cycle.name)}
        />
        <DrivePedals
          frame={clock.frame}
          liveAt={session.liveAt}
          version={session.run}
          press={session.press}
          release={session.release}
          releaseAll={session.releaseAll}
          message={statusText(props)}
          reserve={reserve}
        />
      </div>
      <DriveSpeedPlot
        samples={cycle.samples}
        course={course}
        cycleName={cycle.name}
        own={speedTrace(session.run, course, t)}
        frame={clock.frame}
        t={t}
      />
      <EnergyBars at={own} scale={driveEnergyScale(own, stretchAxis)} />
    </div>
  );
}
