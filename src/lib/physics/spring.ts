import { requireNonNegative, requirePositive } from './validate';

/** Restoring force of an ideal spring (Hooke's law): F = −k x. */
export function hookeForce(k: number, x: number): number {
  return -k * x;
}

/** Elastic potential energy of a spring: U = k x²/2. */
export function elasticEnergy(k: number, x: number): number {
  return (k * x * x) / 2;
}

/** Resistance that engages at x_start: F = 0 if x < x_start, else k (x − x_start). */
export function piecewiseResistance(x: number, start: number, k: number): number {
  return x < start ? 0 : k * (x - start);
}

/** One point of a force–displacement curve. */
export interface ForcePoint {
  x: number;
  f: number;
}

/** Samples F(x) at x_i = i·x_max/steps for i = 0…steps (steps + 1 points). */
export function forceCurve(fn: (x: number) => number, xMax: number, steps: number): ForcePoint[] {
  if (!Number.isInteger(steps) || steps <= 0) {
    throw new RangeError(`steps must be a positive integer, got ${steps}`);
  }
  return Array.from({ length: steps + 1 }, (_, i): ForcePoint => {
    const x = (i * xMax) / steps;
    return { x, f: fn(x) };
  });
}

const REST_TOLERANCE_X = 1e-4;
const REST_TOLERANCE_V = 1e-3;

/** State of a 1-D oscillator: displacement x (m) and velocity v (m/s). */
export interface OscillatorState {
  x: number;
  v: number;
}

/** Damped spring parameters: stiffness k (N/m), mass m (kg), viscous damping c (N·s/m). */
export interface OscillatorParams {
  k: number;
  m: number;
  c: number;
}

/**
 * One semi-implicit (symplectic) Euler step of m ẍ = −k x − c ẋ:
 * v' = v + (−k x − c v)/m · dt, then x' = x + v' · dt.
 */
export function dampedSpringStep(
  s: OscillatorState,
  p: OscillatorParams,
  dt: number,
): OscillatorState {
  requireNonNegative('k', p.k);
  requirePositive('m', p.m);
  requireNonNegative('c', p.c);
  requirePositive('dt', dt);
  const v = s.v + ((-p.k * s.x - p.c * s.v) / p.m) * dt;
  return { x: s.x + v * dt, v };
}

/** Rest test: |x| < tol.x and |v| < tol.v (defaults 1e-4 m and 1e-3 m/s). */
export function isAtRest(
  s: OscillatorState,
  tol: { x: number; v: number } = { x: REST_TOLERANCE_X, v: REST_TOLERANCE_V },
): boolean {
  return Math.abs(s.x) < tol.x && Math.abs(s.v) < tol.v;
}

/** Critical damping coefficient: c_c = 2√(k m). */
export function criticalDamping(k: number, m: number): number {
  requireNonNegative('k', k);
  requirePositive('m', m);
  return 2 * Math.sqrt(k * m);
}
