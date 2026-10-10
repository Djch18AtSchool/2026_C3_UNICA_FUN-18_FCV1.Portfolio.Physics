/** Pure geometry of the habitat lab: the logarithmic radius bar, the spin angle and draw scales. */
import { HABITAT_LIMITS } from '../../../lib/data/habitatPresets';

const [R_MIN, R_MAX] = HABITAT_LIMITS.r;
const LOG_MIN = Math.log10(R_MIN);
const LOG_SPAN = Math.log10(R_MAX) - LOG_MIN;
const TWO_PI = 2 * Math.PI;
/** Angles this close to a whole turn read as 0, so t = T lands back on the start. */
const TURN_EPSILON = 1e-9;
/** A dragged radius snaps to this grain (m), as the v1 slider did. */
export const RADIUS_GRAIN = 5;
/** Arrow keys move the handle by this share of the bar; with Shift or Page keys, ten times more. */
const KEY_FRACTION = 0.01;
const SHIFT_FRACTION = 0.1;
/** The drawn ring is this share of its largest size at r = 5 m, growing with log r up to 1. */
const MIN_RING_SHARE = 0.5;
/** Vectors are drawn to scale up to this many g; longer ones are clipped and marked. */
export const MAX_DRAWN_G = 1.5;

const clamp01 = (u: number) => Math.min(Math.max(u, 0), 1);
const clampRadius = (r: number) => Math.min(Math.max(r, R_MIN), R_MAX);

/** Position of r (m) on the log bar: log10 between 5 and 4 000 m mapped to 0..1, clamped. */
export function radiusToSlider(r: number): number {
  return clamp01((Math.log10(r) - LOG_MIN) / LOG_SPAN);
}

/** Inverse of radiusToSlider, rounded to 5 m and kept in [5, 4 000] m. */
export function sliderToRadius(u: number): number {
  const r = 10 ** (LOG_MIN + clamp01(u) * LOG_SPAN);
  return clampRadius(Math.round(r / RADIUS_GRAIN) * RADIUS_GRAIN);
}

/** Spin angle after t seconds at ω rad/s, in [0, 2π). */
export function angleAt(omega: number, t: number): number {
  const angle = (((omega * t) % TWO_PI) + TWO_PI) % TWO_PI;
  return TWO_PI - angle < TURN_EPSILON ? 0 : angle;
}

const KEY_STEPS: Record<string, number> = {
  ArrowRight: 1,
  ArrowUp: 1,
  ArrowLeft: -1,
  ArrowDown: -1,
  PageUp: SHIFT_FRACTION / KEY_FRACTION,
  PageDown: -SHIFT_FRACTION / KEY_FRACTION,
};

/**
 * Where a key moves the radius handle: arrows by 1 % of the bar (Shift: 10 %), Page keys by
 * 10 %, Home and End to the ends. Near 5 m, 1 % of the bar is less than the 5 m grain, so a
 * step that would round back to the same radius moves one grain instead. Undefined for other keys.
 */
export function radiusKeyTarget(key: string, shiftKey: boolean, r: number): number | undefined {
  if (key === 'Home') return R_MIN;
  if (key === 'End') return R_MAX;
  const steps = KEY_STEPS[key];
  if (steps === undefined) return undefined;
  const fraction = steps * (shiftKey ? SHIFT_FRACTION : KEY_FRACTION);
  const next = sliderToRadius(radiusToSlider(r) + fraction);
  const direction = Math.sign(fraction);
  if ((next - r) * direction > 0) return next;
  return clampRadius(Math.round(r / RADIUS_GRAIN) * RADIUS_GRAIN + direction * RADIUS_GRAIN);
}

/** Drawn ring radius (px) for bar position u, between 50 % and 100 % of `largest`. */
export function ringRadius(u: number, largest: number): number {
  return largest * (MIN_RING_SHARE + (1 - MIN_RING_SHARE) * clamp01(u));
}

/** Drawn length (px) of a vector of `gRatio` g at `unit` px per g, clipped at MAX_DRAWN_G. */
export function vectorLength(gRatio: number, unit: number): { length: number; isClipped: boolean } {
  const isClipped = gRatio > MAX_DRAWN_G;
  return { length: Math.min(gRatio, MAX_DRAWN_G) * unit, isClipped };
}

/** Ticks of the log bar: labelled decades and ends, unlabelled 2 and 5 multiples between. */
export const LOG_TICKS: readonly { r: number; label?: string }[] = [
  { r: 5, label: '5' },
  { r: 10, label: '10' },
  { r: 20 },
  { r: 50 },
  { r: 100, label: '100' },
  { r: 200 },
  { r: 500 },
  { r: 1000, label: '1 000' },
  { r: 2000 },
  { r: 4000, label: '4 000' },
];
