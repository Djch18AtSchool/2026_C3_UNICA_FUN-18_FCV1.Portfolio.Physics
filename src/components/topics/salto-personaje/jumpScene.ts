/**
 * Pure geometry of the jump laboratory's canvas: where the launch-vector handle sits, which
 * settings a dragged handle means, which t a dragged marker means, the state at a given t and the
 * plot window. No React; every length is in metres and every pixel in the plot's viewBox units.
 */
import type { TrajectoryPoint } from '../../../lib/physics';
import type { Domain, Scale } from '../../lab/plotScales';
import type { JumpResult, JUMP_LIMITS, JumpSettings } from './jumpModel';

export interface PlotScales {
  x: Scale;
  y: Scale;
}

type Point = { x: number; y: number };

/** The largest v₀ is drawn this fraction of the y window long, so the handle always fits. */
const LAUNCH_VECTOR_FRACTION = 0.5;
/** Room above the highest apex. */
const Y_HEADROOM = 1.15;
/** Room past the farthest landing. */
const X_HEADROOM = 1.05;
/** Room left of x = 0, so a handle on the y axis is not cut by the plot's clip. */
const X_LEFT_PAD = 0.04;
/** Share of the window below the ground, so the marker at y = 0 stays inside the clip (and hittable). */
const GROUND_PAD = 0.04;
/** A vertical jump still gets a 1 m wide window. */
const MIN_X_SPAN = 1;
/** Height over width of the window; inside SvgPlot's equal-aspect bounds (0.5–1.5). */
const MIN_ASPECT = 0.5;
const MAX_ASPECT = 1.5;

function clamp(value: number, [min, max]: readonly [number, number]): number {
  return Math.min(Math.max(value, min), max);
}

/** Tip of the launch vector v⃗₀ = (vₓ, v₀) drawn from the origin, in viewBox units. */
export function handleFromSettings(s: JumpSettings, scale: PlotScales, lengthPerMs: number): Point {
  return { x: scale.x.toPx(s.vx * lengthPerMs), y: scale.y.toPx(s.v0 * lengthPerMs) };
}

/** The (v₀, vₓ) a handle dragged to `px` stands for, each clamped to its slider range. */
export function settingsFromHandle(
  px: Point,
  scale: PlotScales,
  lengthPerMs: number,
  limits: typeof JUMP_LIMITS,
): Pick<JumpSettings, 'v0' | 'vx'> {
  return {
    v0: clamp(scale.y.toValue(px.y) / lengthPerMs, limits.v0),
    vx: clamp(scale.x.toValue(px.x) / lengthPerMs, limits.vx),
  };
}

/** The t of the sample whose x is nearest the pointer (with vₓ = 0 every sample ties: t = 0). */
export function timeFromMarkerDrag(pxX: number, scale: Scale, result: JumpResult): number {
  const x = scale.toValue(pxX);
  const nearest = result.points.reduce((best, p) =>
    Math.abs(p.x - x) < Math.abs(best.x - x) ? p : best,
  );
  return nearest.t;
}

/** Index of the last sample with p.t ≤ t (binary search; samples are sorted by t). */
function sampleBefore(points: TrajectoryPoint[], t: number): number {
  let low = 0;
  let high = points.length - 1;
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    if (points[middle].t <= t) low = middle;
    else high = middle;
  }
  return low;
}

/** Position and vertical velocity at t, linear between samples, t clamped to [0, t_air]. */
export function stateAt(result: JumpResult, t: number): TrajectoryPoint {
  const { points } = result;
  const last = points[points.length - 1];
  if (t <= 0) return points[0];
  if (t >= last.t) return last;
  const index = sampleBefore(points, t);
  const a = points[index];
  const b = points[index + 1];
  const fraction = (t - a.t) / (b.t - a.t);
  const lerp = (from: number, to: number) => from + (to - from) * fraction;
  return { t, x: lerp(a.x, b.x), y: lerp(a.y, b.y), vy: lerp(a.vy, b.vy) };
}

/**
 * The plot window for some jumps: room above the highest apex and past the farthest landing, a
 * sliver left of the origin and below the ground, and a height between 0.5 and 1.5 times the width
 * (reached by growing up or to the right, so SvgPlot's equal aspect never moves the ground).
 */
export function sceneDomains(results: JumpResult[]): { x: Domain; y: Domain } {
  const reach = Math.max(MIN_X_SPAN, ...results.map((r) => r.range * X_HEADROOM));
  const top = Math.max(...results.map((r) => r.hMax * Y_HEADROOM));
  const xMin = -X_LEFT_PAD * reach;
  const minHeight = top / (1 - GROUND_PAD);
  const width = Math.max(reach - xMin, minHeight / MAX_ASPECT);
  const height = Math.max(minHeight, width * MIN_ASPECT);
  return {
    x: { min: xMin, max: xMin + width },
    y: { min: -GROUND_PAD * height, max: (1 - GROUND_PAD) * height },
  };
}

/** Metres drawn per m/s of the launch vector: the largest v₀ spans half the y window. */
export function launchLengthPerMs(yDomain: Domain, limits: typeof JUMP_LIMITS): number {
  return (LAUNCH_VECTOR_FRACTION * (yDomain.max - yDomain.min)) / limits.v0[1];
}
