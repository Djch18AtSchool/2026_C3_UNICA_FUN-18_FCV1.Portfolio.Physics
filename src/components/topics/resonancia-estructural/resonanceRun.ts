/**
 * The resonance laboratory's integrator: one run of (12.2), m ẍ + b ẋ + k x = F(t), from rest,
 * stepped with the core's semi-implicit Euler (`forcedStep`), stored on a coarse grid for the
 * drawing and as the peaks of |x| for its envelope. The lab computes a whole run when its
 * settings change and reads it at any time of the clock: nothing is integrated per frame.
 */
import { forcedStep, type Oscillator } from '../../../lib/physics/resonance';
import { requirePositive } from '../../../lib/physics/validate';

/** A push of J (N·s) at t (s), on the step that starts there. */
export interface Impulse {
  t: number;
  J: number;
}

export interface RunInput {
  oscillator: Oscillator;
  /** The external force at time t, in N. */
  force(t: number): number;
  /** Seconds of the run. */
  duration: number;
  /** The integrator's step, in s. */
  dt: number;
  impulses?: readonly Impulse[];
  /** Steps between two stored samples of x (default 1). */
  sampleEvery?: number;
}

/** One run, read through xAt, envelopeAt, maxEnvelopeUntil, firstReach and traceUntil. */
export interface Run {
  duration: number;
  sampleDt: number;
  /** x at k·sampleDt, in the oscillator's length unit. */
  samples: Float64Array;
  /** The local maxima of |x|: their times (s) and values, in time order. */
  peakT: readonly number[];
  peakA: readonly number[];
  /** peakA's running maximum. */
  peakMax: readonly number[];
  maxPeak: number;
}

/** Times of the impulses as step indices; an impulse outside the run throws. */
function impulseSteps(
  impulses: readonly Impulse[],
  dt: number,
  steps: number,
): Map<number, number> {
  const byStep = new Map<number, number>();
  for (const { t, J } of impulses) {
    const step = Math.round(t / dt);
    if (step < 0 || step >= steps) throw new RangeError(`impulse at ${t} s is outside the run`);
    byStep.set(step, (byStep.get(step) ?? 0) + J);
  }
  return byStep;
}

/** Collects the peaks of |x|, each refined by a parabola through its three samples. */
function peakCollector(dt: number) {
  const peakT: number[] = [];
  const peakA: number[] = [];
  let before = 0;
  let middle = 0;
  return {
    peakT,
    peakA,
    /** |x| after step `step` (its time is (step + 1)·dt). */
    push(step: number, value: number) {
      if (step >= 1 && middle >= before && middle > value) {
        const curvature = before - 2 * middle + value;
        const shift = curvature === 0 ? 0 : (before - value) / (2 * curvature);
        peakT.push((step + shift) * dt);
        peakA.push(middle - ((before - value) * shift) / 4);
      }
      before = middle;
      middle = value;
    },
  };
}

/** Integrates the run from rest (x = 0, v = 0): see RunInput. */
export function simulate({
  oscillator,
  force,
  duration,
  dt,
  impulses = [],
  sampleEvery = 1,
}: RunInput): Run {
  requirePositive('duration', duration);
  requirePositive('dt', dt);
  const steps = Math.ceil(duration / dt - 1e-9);
  const kicks = impulseSteps(impulses, dt, steps);
  const samples = new Float64Array(Math.floor(steps / sampleEvery) + 1);
  const peaks = peakCollector(dt);
  let state = { x: 0, v: 0 };
  for (let step = 0; step < steps; step++) {
    const kick = kicks.get(step) ?? 0;
    state = forcedStep(oscillator, state, force(step * dt) + kick / dt, dt);
    peaks.push(step, Math.abs(state.x));
    if ((step + 1) % sampleEvery === 0) samples[(step + 1) / sampleEvery] = state.x;
  }
  const peakMax: number[] = [];
  peaks.peakA.forEach((a, i) => peakMax.push(Math.max(a, peakMax[i - 1] ?? 0)));
  return {
    duration,
    sampleDt: dt * sampleEvery,
    samples,
    peakT: peaks.peakT,
    peakA: peaks.peakA,
    peakMax,
    maxPeak: peakMax.at(-1) ?? 0,
  };
}

/** Index of the last peak at or before t (−1 when none). */
function lastPeakIndex(run: Run, t: number): number {
  let low = 0;
  let high = run.peakT.length - 1;
  let found = -1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (run.peakT[mid] <= t) {
      found = mid;
      low = mid + 1;
    } else high = mid - 1;
  }
  return found;
}

/** x at time t (clamped to the run), linear between two samples. */
export function xAt(run: Run, t: number): number {
  const last = run.samples.length - 1;
  const position = Math.min(Math.max(t / run.sampleDt, 0), last);
  const index = Math.min(Math.floor(position), last - 1);
  if (index < 0) return run.samples[0];
  const fraction = position - index;
  return run.samples[index] + (run.samples[index + 1] - run.samples[index]) * fraction;
}

/**
 * The envelope of |x| at time t: linear between the peaks around t, from 0 at the start, and the
 * last peak after it.
 */
export function envelopeAt(run: Run, t: number): number {
  const index = lastPeakIndex(run, t);
  const next = index + 1;
  if (next >= run.peakT.length) return index < 0 ? 0 : run.peakA[index];
  const [t0, a0] = index < 0 ? [0, 0] : [run.peakT[index], run.peakA[index]];
  const span = run.peakT[next] - t0;
  return span > 0 ? a0 + ((run.peakA[next] - a0) * (t - t0)) / span : run.peakA[next];
}

/**
 * The envelope of a free, damped stretch at time t: geometric between the peaks around t, so an
 * exponential decay is read exactly (every peak of a damped sinusoid sits on the same fraction of
 * its envelope), and envelopeAt where a peak is 0 or there is no peak on one side.
 */
export function decayingEnvelopeAt(run: Run, t: number): number {
  const index = lastPeakIndex(run, t);
  const next = index + 1;
  if (index < 0 || next >= run.peakT.length) return envelopeAt(run, t);
  const [a0, a1] = [run.peakA[index], run.peakA[next]];
  if (!(a0 > 0 && a1 > 0)) return envelopeAt(run, t);
  const share = (t - run.peakT[index]) / (run.peakT[next] - run.peakT[index]);
  return a0 * (a1 / a0) ** share;
}

/** The largest peak of |x| up to time t (0 before the first). */
export function maxEnvelopeUntil(run: Run, t: number): number {
  const index = lastPeakIndex(run, t);
  return index < 0 ? 0 : run.peakMax[index];
}

/** The time of the first peak of |x| at or above `level`, if any reaches it. */
export function firstReach(run: Run, level: number): number | undefined {
  if (!(level <= run.maxPeak)) return undefined;
  const index = run.peakA.findIndex((a) => a >= level);
  return index < 0 ? undefined : run.peakT[index];
}

/**
 * The peaks up to `until`, at most `maxPoints` of them: the run split into `maxPoints` equal
 * spans of time, the largest peak of each span, so the trace keeps the envelope's shape and its
 * points do not move as `until` advances.
 */
export function traceUntil(run: Run, until: number, maxPoints: number): { t: number; a: number }[] {
  const span = run.duration / maxPoints;
  const bins = new Map<number, { t: number; a: number }>();
  for (let i = 0; i < run.peakT.length && run.peakT[i] <= until; i++) {
    const bin = Math.min(Math.floor(run.peakT[i] / span), maxPoints - 1);
    const kept = bins.get(bin);
    if (!kept || run.peakA[i] > kept.a) bins.set(bin, { t: run.peakT[i], a: run.peakA[i] });
  }
  return [...bins.values()];
}
