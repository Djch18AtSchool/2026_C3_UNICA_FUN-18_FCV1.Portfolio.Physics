/**
 * What «Conducir» shows, as data: the course each cycle offers (the stretch of «Tramo», from its
 * start to where the cycle's car stops), a drive state read as the lab's balance, the cycle's car on
 * the same course for comparison, the readouts, the road and the bars' scale. The comparison uses
 * the same definition as «Tramo»: the share recovered is E_batería / E_freno of the run.
 */
import { DRIVE_CYCLES } from '../../../lib/data/driveCycles';
import { formatNumber } from '../../../lib/format';
import type { BalanceStep, CycleSample } from '../../../lib/physics/energy';
import { driveCar, type DriveCar, type DriveState } from '../../../lib/physics/regenDrive';
import type { LabReadout } from '../../lab/LabShell';
import type { DriveCourse } from './driveRun';
import type { EnergyScale } from './EnergyBars';
import type { RoadRange } from './RoadStrip';
import { balanceAt, cumulativeDistance, J_PER_KJ, type BalanceAt } from './regenScene';
import { balanceSince, stretchAxisMax, type Stretch } from './regenStretch';
import { VEHICLES, type VehicleId } from './regenPresets';
import { perCycle, readoutsFor, STOPS, STRETCHES } from './regenViews';

/** Past the line the road runs on a quarter of the course: room to see an overshoot. */
export const LINE_ROOM_SHARE = 0.25;
const ROAD_TICK_M = 50;
const PERCENT = 100;
const SHARE_PRECISION = 1;
const LINE_PRECISION = 0;
const KJ_PRECISION = 1;
/** Every accumulated energy at 0: the start of a run. */
const NO_ENERGY = {
  eTraction: 0,
  eRoadLoad: 0,
  eBrake: 0,
  eBattery: 0,
  eFriction: 0,
  eConversionLoss: 0,
} as const;

/** The distance (m) covered at a sample time of the cycle; throws if t is not a sample's. */
function distanceAtSample(
  samples: readonly CycleSample[],
  distances: readonly number[],
  t: number,
) {
  const i = samples.findIndex((sample) => sample.t === t);
  if (i < 0) throw new RangeError(`t = ${t} s is not a sample of the cycle`);
  return distances[i];
}

/**
 * The course of a stretch: it starts where and as fast as the cycle at the stretch's start, lasts
 * the stretch, and its line is where the cycle's car stops inside it (the last stop; the stretch's
 * end if it holds none). The road runs LINE_ROOM_SHARE of the course past the line.
 */
export function driveCourse(
  samples: readonly CycleSample[],
  stretch: Stretch,
  stops: readonly number[],
): DriveCourse {
  const distances = cumulativeDistance(samples);
  const at = (t: number) => distanceAtSample(samples, distances, t);
  const startDistance = at(stretch.start);
  const inside = stops.filter((t) => t >= stretch.start && t <= stretch.end);
  const stopLine = at(inside.at(-1) ?? stretch.end);
  return {
    offset: stretch.start,
    duration: stretch.end - stretch.start,
    startSpeed: samples[samples.findIndex(({ t }) => t === stretch.start)].v,
    startDistance,
    stopLine,
    roadEnd: stopLine + (stopLine - startDistance) * LINE_ROOM_SHARE,
  };
}

/** Each cycle's course: in the UDDS, figure 6.3's stretch, 236 m to the line from 57,9 km/h. */
export const DRIVE_COURSES = perCycle((id) =>
  driveCourse(DRIVE_CYCLES[id].samples, STRETCHES[id], STOPS[id]),
);

/** Each car of the lab as the pedals drive it (driveCar), computed once. */
export const DRIVE_CARS: Readonly<Record<VehicleId, DriveCar>> = {
  model3: driveCar(VEHICLES.model3),
  leaf: driveCar(VEHICLES.leaf),
};

/**
 * A drive state as the lab's balance: the kernel's values, t in the cycle's time, and the share
 * recovered of the run's own braking (E_batería / E_freno, 0 before any braking), as «Tramo».
 */
export function driveBalance(state: DriveState, course: DriveCourse): BalanceAt {
  return {
    t: course.offset + state.t,
    v: state.v,
    distance: state.distance,
    pWheel: state.pWheel,
    pBrake: state.pBrake,
    pRegen: state.pRegen,
    pFriction: state.pFriction,
    pBattery: state.pBattery,
    eTraction: state.eTraction,
    eRoadLoad: state.eRoadLoad,
    eBrake: state.eBrake,
    eBattery: state.eBattery,
    eFriction: state.eFriction,
    eConversionLoss: state.eConversionLoss,
    recoveredShare: state.eBrake > 0 ? state.eBattery / state.eBrake : 0,
  };
}

/**
 * The cycle's own car on the course at instant t of the run's clock: its balance counted from the
 * course's start, with the lab's car and regeneration (balanceSince, as «Tramo»).
 */
export function referenceAt(
  steps: readonly BalanceStep[],
  distances: readonly number[],
  course: DriveCourse,
  t: number,
): BalanceAt {
  const start = balanceAt(steps, distances, course.offset);
  return balanceSince(balanceAt(steps, distances, course.offset + t), start);
}

/**
 * Your v, P and energies (readoutsFor in «Conducir»), the cycle's share at the same instant, and
 * how far the line is (m; negative once passed).
 */
export function driveReadouts(
  own: BalanceAt,
  reference: BalanceAt,
  course: DriveCourse,
  cycleName: string,
): LabReadout[] {
  return [
    ...readoutsFor(own, 'conducir'),
    {
      id: 'reference',
      label: `Recuperado en el tramo del ${cycleName}, % del frenado en las ruedas`,
      value: reference.recoveredShare * PERCENT,
      unit: '%',
      precision: SHARE_PRECISION,
    },
    {
      id: 'line',
      label: 'Hasta la línea de detención',
      value: course.stopLine - own.distance,
      unit: 'm',
      precision: LINE_PRECISION,
    },
  ];
}

/**
 * The road of the course: from its start past the line, a tick every 50 m, the line drawn. Its note
 * gives the road's length, as «Tramo»'s does (a longer one runs into the end labels at 360 px);
 * the distance to the line is a readout.
 */
export function driveRoad(course: DriveCourse): RoadRange {
  const length = formatNumber(course.roadEnd - course.startDistance, {
    precision: LINE_PRECISION,
    unit: 'm',
  });
  return {
    from: course.startDistance,
    to: course.roadEnd,
    tickEvery: ROAD_TICK_M,
    note: `${length} · auto no a escala`,
    line: course.stopLine,
  };
}

/**
 * The bars of your run, in kJ: on the scale of the cycle's stretch (`stretchAxis`, kJ), widened by
 * 50 kJ grains when a run of yours needs more (a long press on the accelerator).
 */
export function driveEnergyScale(own: BalanceAt, stretchAxis: number): EnergyScale {
  const zero = { ...own, ...NO_ENERGY };
  return {
    unit: 'kJ',
    joulesPerUnit: J_PER_KJ,
    precision: KJ_PRECISION,
    axisMax: Math.max(stretchAxis, stretchAxisMax(zero, own)),
    scope: 'en tu conducción, hasta t',
  };
}
