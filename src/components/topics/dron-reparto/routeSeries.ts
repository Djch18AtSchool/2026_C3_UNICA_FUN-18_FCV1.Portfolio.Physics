import type { RouteSample, RouteStop } from '../../../lib/data/droneRoute';
import type { PlotBand } from '../../lab/SvgPlot';

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

/** Distance travelled (trapezoidal integral of the speed) next to the magnitude of the displacement. */
export function distanceSeries(samples: readonly RouteSample[]): DistanceRow[] {
  const origin = samples[0];
  // Intentional local accumulator: one linear pass that builds a new array; the samples are not touched.
  let travelled = 0;
  return samples.map((sample, i) => {
    const previous = samples[i - 1];
    if (previous) travelled += ((previous.speed + sample.speed) / 2) * (sample.t - previous.t);
    return {
      t: sample.t,
      distance: travelled,
      displacement: Math.hypot(sample.x - origin.x, sample.y - origin.y),
    };
  });
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
): PlotBand[] {
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

/** Last index whose time is ≤ t (binary search over ascending times): 0 below the first time. */
export function indexBefore(times: readonly number[], t: number): number;
export function indexBefore<T>(items: readonly T[], t: number, timeOf: (item: T) => number): number;
export function indexBefore<T>(
  items: readonly T[],
  t: number,
  timeOf: (item: T) => number = (item) => item as unknown as number,
): number {
  if (items.length === 0) throw new RangeError('indexBefore: no hay muestras');
  let low = 0;
  let high = items.length - 1;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (timeOf(items[middle]) <= t) low = middle;
    else high = middle - 1;
  }
  return low;
}

/** The value at t, linear between the two samples around it; t clamped to the sampled range. */
export function interpolateAt(
  times: readonly number[],
  values: readonly number[],
  t: number,
): number {
  if (times.length !== values.length) {
    throw new RangeError(`interpolateAt: ${times.length} tiempos y ${values.length} valores`);
  }
  const last = times.length - 1;
  if (t <= times[0]) return values[0];
  if (t >= times[last]) return values[last];
  const index = indexBefore(times, t);
  if (index === last || times[index + 1] === times[index]) return values[index];
  const fraction = (t - times[index]) / (times[index + 1] - times[index]);
  return values[index] + (values[index + 1] - values[index]) * fraction;
}
