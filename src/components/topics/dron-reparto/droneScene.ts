/**
 * Pure geometry of the drone laboratory's map: the fixed map window, where stops may go, which
 * t a point on the route means, how many samples the trail and the charts draw. No React.
 */
import type { RouteSample } from '../../../lib/data/droneRoute';
import type { Domain } from '../../lab/plotScales';

type Point = { x: number; y: number };

/** Where a delivery stop may be dragged (m): non-negative, so the position chart keeps 0–1 500 m. */
export const STOP_BOUNDS = { x: [0, 1300], y: [0, 1150] } as const;

/**
 * The map window (m), fixed so the plot never rescales under a dragged stop; it leaves room for
 * the stop labels and for a 150 m vector at the edge of the bounds.
 */
export const MAP_DOMAIN: { x: Domain; y: Domain } = {
  x: { min: -150, max: 1450 },
  y: { min: -150, max: 1300 },
};

/** Arrow keys move a stop by STOP_KEY_STEP m, or STOP_KEY_STEP_LARGE m with Shift. */
const STOP_KEY_STEP = 10;
const STOP_KEY_STEP_LARGE = 100;
/** The declared route (3 876 samples at 0,1 s) is charted every 0,5 s, as in v1. */
const MIN_CHART_STEP = 5;
const MAX_CHART_POINTS = 800;
const MAX_TRAIL_POINTS = 400;

const clamp = (value: number, [min, max]: readonly [number, number]) =>
  Math.min(Math.max(value, min), max);

/** The point moved inside STOP_BOUNDS. */
export function clampStop({ x, y }: Point): Point {
  return { x: clamp(x, STOP_BOUNDS.x), y: clamp(y, STOP_BOUNDS.y) };
}

/** Where an arrow key (with or without Shift) sends a stop, or undefined for other keys. */
export function stopKeyTarget(key: string, isLarge: boolean, { x, y }: Point): Point | undefined {
  const step = isLarge ? STOP_KEY_STEP_LARGE : STOP_KEY_STEP;
  const moves: Record<string, Point> = {
    ArrowRight: { x: x + step, y },
    ArrowLeft: { x: x - step, y },
    ArrowUp: { x, y: y + step },
    ArrowDown: { x, y: y - step },
  };
  const next = moves[key];
  return next && clampStop(next);
}

/** The t of the sample nearest (x, y); on ties (hovering over a stop) the earliest one. */
export function timeFromPoint(samples: RouteSample[], x: number, y: number): number {
  const distance = (s: RouteSample) => Math.hypot(s.x - x, s.y - y);
  return samples.reduce((best, s) => (distance(s) < distance(best) ? s : best)).t;
}

/** One sample in `chartStep` goes to the charts: every 0,5 s, or fewer for a long route. */
export function chartStep(sampleCount: number): number {
  return Math.max(MIN_CHART_STEP, Math.ceil(sampleCount / MAX_CHART_POINTS));
}

/** The trail flown up to the drone: thinned samples before its t, then the drone itself. */
export function trailSamples(samples: RouteSample[], now: RouteSample): Point[] {
  const stride = Math.max(1, Math.ceil(samples.length / MAX_TRAIL_POINTS));
  const flown = samples.filter((s, i) => s.t < now.t && i % stride === 0);
  return [...flown, now].map(({ x, y }) => ({ x, y }));
}

/** End of the time axis: the duration rounded up to half its order of magnitude. */
export function timeAxisEnd(duration: number): number {
  const step = 10 ** Math.floor(Math.log10(duration)) / 2;
  return Math.ceil(duration / step) * step;
}
