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
