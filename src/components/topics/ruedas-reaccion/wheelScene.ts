/**
 * Pure geometry of the reaction-wheel scene, shared by the laboratory and the topic's figures:
 * the 6U seen along its slew axis, angles counterclockwise on screen (SVG y points down), the
 * target dial's keyboard steps, the rate arcs and the L_w/L_max gauge.
 */
import { CUBESAT_6U } from '../../../lib/data/reactionWheels';

export type Point = { x: number; y: number };

/**
 * Where the scene's parts are, in canvas px: the dial's centre and radius, the body's px per m
 * and the wheel's radius, all through the zoom's view (`zoom` is its scale, ×1 at the lab's own
 * framing), and the canvas' own size, which the view does not change.
 */
export interface SceneGeometry {
  c: Point;
  dial: number;
  scale: number;
  wheel: number;
  zoom: number;
  extent: { width: number; height: number };
}

export const DEG = Math.PI / 180;
/** Room outside the dial, px, for the knob and its focus ring: the dial's circle keeps this far from the edge. */
export const DIAL_MARGIN = 34;
/** The knob's focus ring (OverlayMarks' Knob draws it 11 px from the knob's centre). */
const KNOB_RING_PX = 11;
/**
 * The band along the canvas' edges the corner texts (the note, the time-scale badge, the target's
 * text) live in: a revealed knob keeps its centre this far from every edge, and a field line that
 * close to the top or bottom is left out.
 */
export const TEXT_BAND = DIAL_MARGIN + KNOB_RING_PX;

/** The target angle's range (°): a half turn either way. */
export const TARGET_LIMITS = [-180, 180] as const;
/** Arrow keys move the target 1°; with Shift, or with the Page keys, 10°. */
const KEY_STEP = 1;
const COARSE_STEP = 10;
/** A rate arc never closes into a full circle, so its arrowhead stays readable. */
export const MAX_ARC_SWEEP = 300;
/** Spokes fade with speed down to this opacity, reached at FADE_RPM. */
const MIN_SPOKE_OPACITY = 0.25;
const FADE_RPM = 1000;
const PERCENT = 100;

/**
 * The 6U's footprint seen along the slew axis, normal to its 226,3 × 366,0 mm face (m), so the
 * drawn body has the CubeSat's own proportions.
 */
export const BODY_FOOTPRINT = {
  long: CUBESAT_6U.dimensions[2],
  short: CUBESAT_6U.dimensions[1],
} as const;
export const BODY_HALF_DIAGONAL = Math.hypot(BODY_FOOTPRINT.long, BODY_FOOTPRINT.short) / 2;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
/** Two decimals of a pixel: SVG path text without float noise. */
const px = (value: number) => Number(value.toFixed(2));

/** The point at `radius` from `c` at `degrees`, counterclockwise on screen from the +x axis. */
export function polar(c: Point, radius: number, degrees: number): Point {
  return { x: c.x + radius * Math.cos(degrees * DEG), y: c.y - radius * Math.sin(degrees * DEG) };
}

/** `p` turned by `angle` (rad) about `c`, counterclockwise on screen. */
export function rotateAbout(p: Point, c: Point, angle: number): Point {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = p.x - c.x;
  const dy = c.y - p.y;
  return { x: c.x + dx * cos - dy * sin, y: c.y - (dx * sin + dy * cos) };
}

/**
 * The body's four corners at `scale` px per m, turned by `angle` (rad): front-left, back-left,
 * back-right, front-right as seen with the long side along +x (the front face looks along +x).
 */
export function bodyCorners(c: Point, scale: number, angle: number): Point[] {
  const halfLong = (BODY_FOOTPRINT.long / 2) * scale;
  const halfShort = (BODY_FOOTPRINT.short / 2) * scale;
  const level: Point[] = [
    { x: c.x + halfLong, y: c.y - halfShort },
    { x: c.x - halfLong, y: c.y - halfShort },
    { x: c.x - halfLong, y: c.y + halfShort },
    { x: c.x + halfLong, y: c.y + halfShort },
  ];
  return level.map((corner) => rotateAbout(corner, c, angle));
}

/** "x,y x,y …" for an SVG polygon. */
export function pointsAttribute(points: Point[]): string {
  return points.map((p) => `${px(p.x)},${px(p.y)}`).join(' ');
}

/** The direction from `c` to `p` in whole degrees, counterclockwise on screen, in [−180, 180]. */
export function pointerToDegrees(c: Point, p: Point): number {
  const degrees = Math.round(Math.atan2(c.y - p.y, p.x - c.x) / DEG);
  return degrees === -180 ? 180 : degrees;
}

const KEY_STEPS: Record<string, number> = {
  ArrowRight: KEY_STEP,
  ArrowUp: KEY_STEP,
  ArrowLeft: -KEY_STEP,
  ArrowDown: -KEY_STEP,
};
const PAGE_STEPS: Record<string, number> = { PageUp: COARSE_STEP, PageDown: -COARSE_STEP };

/**
 * Where a key moves the target (°): arrows 1° (Shift: 10°), Page keys 10°, Home and End to
 * −180° and 180°, clamped to that range. Undefined for any other key.
 */
export function targetKeyTarget(
  key: string,
  shiftKey: boolean,
  degrees: number,
): number | undefined {
  const [min, max] = TARGET_LIMITS;
  if (key === 'Home') return min;
  if (key === 'End') return max;
  const arrow = KEY_STEPS[key];
  const step =
    arrow === undefined ? PAGE_STEPS[key] : arrow * (shiftKey ? COARSE_STEP / KEY_STEP : 1);
  if (step === undefined) return undefined;
  return clamp(degrees + step, min, max);
}

/**
 * SVG arc on the circle (c, radius) from `fromDeg` to `toDeg`: counterclockwise on screen when
 * toDeg > fromDeg, clockwise otherwise.
 */
export function arcPath(c: Point, radius: number, fromDeg: number, toDeg: number): string {
  const start = polar(c, radius, fromDeg);
  const end = polar(c, radius, toDeg);
  const largeArc = Math.abs(toDeg - fromDeg) > 180 ? 1 : 0;
  const sweep = toDeg > fromDeg ? 0 : 1;
  return `M${px(start.x)} ${px(start.y)} A${radius} ${radius} 0 ${largeArc} ${sweep} ${px(end.x)} ${px(end.y)}`;
}

/**
 * How far (°) a rate arc sweeps: |rate|/reference of `maxSweep`, capped there, with `isOver`
 * when the rate passes the reference (the wheel above its top speed). A zero reference draws nothing.
 */
export function rateArcSweep(
  rate: number,
  reference: number,
  maxSweep: number = MAX_ARC_SWEEP,
): { sweep: number; isOver: boolean } {
  if (!(reference > 0)) return { sweep: 0, isOver: false };
  const share = Math.abs(rate) / reference;
  return { sweep: Math.min(share, 1) * maxSweep, isOver: share > 1 };
}

/**
 * Opacity of the wheel's spokes at `rpm`: a wheel at hundreds of turns per second strobes on a
 * 60 Hz screen, so its spokes fade and the rate arc tells the speed instead.
 */
export function spokeOpacity(rpm: number): number {
  return Math.max(MIN_SPOKE_OPACITY, 1 - Math.abs(rpm) / FADE_RPM);
}

/** |L_w| as a percentage of L_max, the bar's fill (0..1, clamped) and whether it passes L_max. */
export function momentumGauge(
  Lw: number,
  Lmax: number,
): { percent: number; fill: number; exceeds: boolean } {
  const share = Math.abs(Lw) / Lmax;
  return { percent: share * PERCENT, fill: Math.min(share, 1), exceeds: share > 1 };
}
