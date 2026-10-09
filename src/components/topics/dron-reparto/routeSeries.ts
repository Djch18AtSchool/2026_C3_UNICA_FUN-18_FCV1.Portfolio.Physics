import type { ReferenceBand } from '../../charts/LineChart';
import type { RouteSample, RouteStop } from '../../../lib/data/droneRoute';

/** Shortest run at rest that counts as a delivery stop, so the final instant at the depot does not. */
const MIN_DWELL_S = 1;

export type MotionPhase = 'acelerando' | 'crucero' | 'frenando' | 'detenido';

export interface DistanceRow {
  t: number;
  /** Distance travelled, the area under |v|(t) (m). */
  distance: number;
  /** Straight-line distance from the starting point, |r(t) − r(0)| (m). */
  displacement: number;
}

/** Every `every`-th item plus the last one, so a decimated curve still ends where the data ends. */
export function decimate<T>(items: readonly T[], every: number): T[] {
  if (!(every >= 1)) throw new RangeError(`decimate needs a step ≥ 1, got ${every}`);
  const last = items.length - 1;
  return items.filter((_, i) => i % every === 0 || i === last);
}

/** The sample on the dt grid nearest to t, clamped to the first and last samples. */
export function sampleAt(samples: readonly RouteSample[], t: number, dt: number): RouteSample {
  const index = Math.min(Math.max(Math.round(t / dt), 0), samples.length - 1);
  return samples[index];
}

/**
 * Inclusive prefix sums by doubling (Hillis–Steele): each of the ⌈log₂ n⌉ passes returns a new array
 * where item i adds the item `offset` places back. No accumulator is mutated or copied item by item,
 * so 3 876 samples take 12 passes instead of the n²/2 copies of an append-only reduce.
 */
export function prefixSums(values: readonly number[]): number[] {
  const passes = Math.ceil(Math.log2(Math.max(values.length, 1)));
  const offsets = Array.from({ length: passes }, (_, pass) => 2 ** pass);
  return offsets.reduce<number[]>(
    (sums, offset) => sums.map((sum, i) => (i >= offset ? sum + sums[i - offset] : sum)),
    [...values],
  );
}

/** Distance travelled (trapezoidal integral of the speed) next to the magnitude of the displacement. */
export function distanceSeries(samples: readonly RouteSample[]): DistanceRow[] {
  const origin = samples[0];
  const steps = samples.map((sample, i) => {
    const previous = samples[i - 1];
    return previous ? ((previous.speed + sample.speed) / 2) * (sample.t - previous.t) : 0;
  });
  const travelled = prefixSums(steps);
  return samples.map((sample, i) => ({
    t: sample.t,
    distance: travelled[i],
    displacement: Math.hypot(sample.x - origin.x, sample.y - origin.y),
  }));
}

function isAtRest(sample: RouteSample): boolean {
  return sample.speed === 0 && sample.accel === 0;
}

function nearestStop(sample: RouteSample, stops: readonly RouteStop[]): RouteStop {
  return stops.reduce((best, stop) =>
    Math.hypot(stop.x - sample.x, stop.y - sample.y) <
    Math.hypot(best.x - sample.x, best.y - sample.y)
      ? stop
      : best,
  );
}

/** Time windows in which the drone hovers at rest, labelled with the stop it hovers over. */
export function dwellWindows(
  samples: readonly RouteSample[],
  stops: readonly RouteStop[],
): ReferenceBand[] {
  const runs = samples.reduce<{ from: RouteSample; to: RouteSample }[]>((acc, sample, i) => {
    if (!isAtRest(sample)) return acc;
    const current = acc[acc.length - 1];
    if (current && i > 0 && isAtRest(samples[i - 1])) {
      return [...acc.slice(0, -1), { from: current.from, to: sample }];
    }
    return [...acc, { from: sample, to: sample }];
  }, []);
  return runs
    .filter(({ from, to }) => to.t - from.t >= MIN_DWELL_S)
    .map(({ from, to }) => ({ from: from.t, to: to.t, label: nearestStop(from, stops).name }));
}

/** Accelerating when a pushes along v (or from rest), braking when it opposes v. */
export function motionPhase(sample: RouteSample): MotionPhase {
  if (sample.accel === 0) return sample.speed > 0 ? 'crucero' : 'detenido';
  const power = sample.vx * sample.ax + sample.vy * sample.ay;
  return power < 0 ? 'frenando' : 'acelerando';
}
