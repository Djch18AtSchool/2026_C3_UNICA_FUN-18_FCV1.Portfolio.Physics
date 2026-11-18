/**
 * A CSS timing function `cubic-bezier(x1, y1, x2, y2)` (W3C, CSS Easing Functions Level 1): the
 * curve from (0, 0) to (1, 1) with those two control points, read as progress against the fraction
 * of the duration. It is the fixed-duration animation Tema 10 sets against the spring: its
 * progress and its slope, from which a position and a velocity follow (x = x₀ + Δ·progress(t/T),
 * v = Δ·slope(t/T)/T).
 */

/** CSS `ease-in-out`: «Equivalent to cubic-bezier(0.42, 0, 0.58, 1)» (CSS Easing Level 1). */
export const EASE_IN_OUT = [0.42, 0, 0.58, 1] as const;

/** Newton steps on x(s) = time, then bisection if Newton left the tolerance. */
const NEWTON_STEPS = 8;
const BISECTION_STEPS = 60;
const TOLERANCE = 1e-12;

export interface CubicBezierEasing {
  /** Progress at a fraction of the duration: 0 before the start, 1 after the end. */
  progress: (time: number) => number;
  /** d(progress)/d(time): 0 before the start and after the end. */
  slope: (time: number) => number;
}

/** One Bézier coordinate, B(s) = 3(1 − s)²s·p1 + 3(1 − s)s²·p2 + s³, and its derivative. */
const coordinate = (p1: number, p2: number, s: number) =>
  3 * (1 - s) * (1 - s) * s * p1 + 3 * (1 - s) * s * s * p2 + s * s * s;
const coordinateSlope = (p1: number, p2: number, s: number) =>
  3 * (1 - s) * (1 - s) * p1 + 6 * (1 - s) * s * (p2 - p1) + 3 * s * s * (1 - p2);

function requireUnit(name: string, value: number): void {
  if (!(value >= 0 && value <= 1)) {
    throw new RangeError(`cubicBezier: ${name} must be in [0, 1], got ${value}`);
  }
}

/**
 * The easing of `cubic-bezier(x1, y1, x2, y2)`. With x1 and x2 in [0, 1] (CSS requires it) x(s)
 * never decreases, so each time has one parameter s: found by Newton from s = time, and by
 * bisection where the slope of x is too flat for Newton. The slope is y′(s)/x′(s); where x′ is 0
 * (a control point at x = 0 or 1, the curve leaving vertically) it is infinite.
 */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): CubicBezierEasing {
  requireUnit('x1', x1);
  requireUnit('x2', x2);
  const parameterAt = (time: number): number => {
    let s = time;
    for (let i = 0; i < NEWTON_STEPS; i++) {
      const error = coordinate(x1, x2, s) - time;
      if (Math.abs(error) < TOLERANCE) return s;
      s -= error / coordinateSlope(x1, x2, s);
      // A flat stretch of x(s) throws Newton out of [0, 1] (or to ±∞ where x′ = 0): bisect.
      if (!(s >= 0 && s <= 1)) break;
    }
    let [low, high] = [0, 1];
    for (let i = 0; i < BISECTION_STEPS; i++) {
      s = (low + high) / 2;
      if (coordinate(x1, x2, s) < time) low = s;
      else high = s;
    }
    return s;
  };
  const progress = (time: number): number => {
    if (time <= 0) return 0;
    if (time >= 1) return 1;
    return coordinate(y1, y2, parameterAt(time));
  };
  const slope = (time: number): number => {
    if (time < 0 || time > 1) return 0;
    const s = parameterAt(time);
    return coordinateSlope(y1, y2, s) / coordinateSlope(x1, x2, s);
  };
  return { progress, slope };
}
