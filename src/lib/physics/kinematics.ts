import { requireNonNegative, requirePositive } from './validate';
import { add, scale, sub, type Vec2 } from './vector';

/** Initial state of a 1D motion with constant acceleration (SI units). */
export interface State1D {
  x0: number;
  v0: number;
  a: number;
}

/** Position under constant acceleration: x(t) = x₀ + v₀ t + a t²/2. */
export function position(s: State1D, t: number): number {
  requireNonNegative('t', t);
  return s.x0 + s.v0 * t + (s.a * t * t) / 2;
}

/** Velocity under constant acceleration: v(t) = v₀ + a t. */
export function velocity(s: State1D, t: number): number {
  return s.v0 + s.a * t;
}

/** Vector position under constant acceleration: r(t) = r₀ + v₀ t + a t²/2. */
export function position2D(r0: Vec2, v0: Vec2, a: Vec2, t: number): Vec2 {
  return add(add(r0, scale(v0, t)), scale(a, (t * t) / 2));
}

/** A time-stamped vector sample, e.g. a measured position r(t). */
export interface Sample {
  t: number;
  value: Vec2;
}

/** Finite difference between two samples: Δr/Δt = (r_j − r_i)/(t_j − t_i). */
function differenceQuotient(from: Sample, to: Sample): Vec2 {
  return scale(sub(to.value, from.value), 1 / (to.t - from.t));
}

/** Numerical derivative: central (r_{i+1} − r_{i−1})/(t_{i+1} − t_{i−1}); forward/backward at the ends. */
export function derivativeSeries(samples: readonly Sample[]): Sample[] {
  if (samples.length < 2) {
    throw new RangeError(`derivativeSeries needs at least 2 samples, got ${samples.length}`);
  }
  samples.slice(1).forEach((sample, i) => {
    if (!(sample.t > samples[i].t)) {
      throw new RangeError(`sample times must be strictly increasing (index ${i + 1})`);
    }
  });
  const last = samples.length - 1;
  return samples.map((sample, i) => ({
    t: sample.t,
    value: differenceQuotient(samples[Math.max(i - 1, 0)], samples[Math.min(i + 1, last)]),
  }));
}

/** Rest-to-rest motion profile: position s(t), velocity v(t) and acceleration a(t). */
export interface MotionProfile {
  duration: number;
  isTriangular: boolean;
  s(t: number): number;
  v(t: number): number;
  a(t: number): number;
}

/** Trapezoidal velocity profile: t_acc = v_max/a_max, d_acc = v_max²/(2 a_max); triangular with v_peak = √(d a_max) if 2 d_acc ≥ d. */
export function trapezoidalProfile(distance: number, vMax: number, aMax: number): MotionProfile {
  requirePositive('distance', distance);
  requirePositive('vMax', vMax);
  requirePositive('aMax', aMax);

  const dAccAtVMax = (vMax * vMax) / (2 * aMax);
  const isTriangular = 2 * dAccAtVMax >= distance;
  const vPeak = isTriangular ? Math.sqrt(distance * aMax) : vMax;
  const tAcc = vPeak / aMax;
  const dAcc = (vPeak * vPeak) / (2 * aMax);
  const tCruise = isTriangular ? 0 : (distance - 2 * dAcc) / vPeak;
  const tDec = tAcc + tCruise;
  const duration = tDec + tAcc;

  const s = (t: number): number => {
    if (t <= 0) return 0;
    if (t >= duration) return distance;
    if (t < tAcc) return (aMax * t * t) / 2;
    if (t < tDec) return dAcc + vPeak * (t - tAcc);
    const remaining = duration - t;
    return distance - (aMax * remaining * remaining) / 2;
  };

  const v = (t: number): number => {
    if (t <= 0 || t >= duration) return 0;
    if (t < tAcc) return aMax * t;
    if (t < tDec) return vPeak;
    return aMax * (duration - t);
  };

  const a = (t: number): number => {
    if (t < 0 || t > duration) return 0;
    if (t < tAcc) return aMax;
    if (t < tDec) return 0;
    return -aMax;
  };

  return { duration, isTriangular, s, v, a };
}
