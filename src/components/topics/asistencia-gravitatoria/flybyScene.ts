/**
 * Pure geometry of the flyby laboratory: the logarithmic r_p scale (1 to 100 planet radii) and its
 * keys, the planet-frame drawing scale (the periapsis handle sits on that log scale, so dragging
 * it is the slider), and the Sun-frame velocity triangle fitted into its panel (the planet
 * frame's scale bar is planetZoom.ts's, derived from the zoomed scale).
 */
import type { Point } from '../../lab/OverlayMarks';

/** r_p in planet radii: the probe cannot pass below the surface; 100 R is the end of the bar. */
export const RP_RANGE = { min: 1, max: 100 } as const;
const LOG_MIN = Math.log10(RP_RANGE.min);
const LOG_SPAN = Math.log10(RP_RANGE.max) - LOG_MIN;
/** A dragged or keyed r_p keeps 0,01 planet radii. */
const RP_DECIMALS = 2;
/** Arrow keys move the handle by this share of the bar; Shift and Page keys ten times more. */
const KEY_FRACTION = 0.01;
const SHIFT_FRACTION = 0.1;
/** Periapsis is drawn between these shares of the panel's half side, linear in log r_p. */
const PERIAPSIS_SHARE = { min: 0.1, max: 0.45 } as const;
/**
 * The track is drawn out to this share of the half side; the rest holds the v∞ arrows and their
 * labels. A share, not pixels, so the pass (and the clock) does not depend on the panel's size.
 */
const REACH_SHARE = 0.68;
/** Length of the v∞ arrows at the ends of the track, px (fits in 1 − REACH_SHARE of 150 px). */
export const ARROW_PX = 30;
/** A planet smaller than this (px) is drawn at this radius, and the scene says so. */
export const MIN_PLANET_PX = 4;
/** Room around the velocity triangle for the tip labels, px. */
const TRIANGLE_PAD = { x: 44, y: 30 } as const;
const PATH_DECIMALS = 2;

export type RpWarning = 'below' | 'above' | null;

const clamp01 = (u: number) => Math.min(Math.max(u, 0), 1);
const roundRp = (rp: number) => Number(rp.toFixed(RP_DECIMALS));
const round = (value: number) => Number(value.toFixed(PATH_DECIMALS));

/** Position of r_p (planet radii) on the log bar, 0..1, clamped. */
export function rpToSlider(rp: number): number {
  return clamp01((Math.log10(rp) - LOG_MIN) / LOG_SPAN);
}

/** Inverse of rpToSlider, to 0,01 R and not clamped: a drag past either end asks for more. */
export function sliderToRp(u: number): number {
  return roundRp(10 ** (LOG_MIN + u * LOG_SPAN));
}

/**
 * r_p kept in [1, 100] planet radii, with the reason when it had to move: below 1 R the probe
 * would hit the planet. Anything that is not a number counts as too close.
 */
export function clampRp(rp: number): { rp: number; warning: RpWarning } {
  if (!(rp >= RP_RANGE.min)) return { rp: RP_RANGE.min, warning: 'below' };
  if (rp > RP_RANGE.max) return { rp: RP_RANGE.max, warning: 'above' };
  return { rp, warning: null };
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
 * Where a key moves the r_p handle: arrows by 1 % of the log bar (Shift: 10 %), Page keys by
 * 10 %, Home and End to the ends, always inside the range. Undefined for other keys.
 */
export function rpKeyTarget(key: string, shiftKey: boolean, rp: number): number | undefined {
  if (key === 'Home') return RP_RANGE.min;
  if (key === 'End') return RP_RANGE.max;
  const steps = KEY_STEPS[key];
  if (steps === undefined) return undefined;
  const fraction = steps * (shiftKey ? SHIFT_FRACTION : KEY_FRACTION);
  return clampRp(sliderToRp(clamp01(rpToSlider(rp) + fraction))).rp;
}

export interface PlanetView {
  /** Drawn distance from the planet's centre to periapsis, px. */
  periapsisPx: number;
  /** px per km. */
  scale: number;
  /** The track is drawn out to this distance from the planet, km. */
  reachKm: number;
  /** Drawn planet radius, px (to scale unless enlarged). */
  planetPx: number;
  isPlanetEnlarged: boolean;
}

/** Share of the half side where periapsis sits for log-bar position u (may leave 0..1 in a drag). */
const periapsisShare = (u: number) =>
  PERIAPSIS_SHARE.min + (PERIAPSIS_SHARE.max - PERIAPSIS_SHARE.min) * u;

/**
 * The planet-frame drawing for a square panel of side `size`: periapsis sits on the log bar
 * (10 % of the half side at 1 R, 45 % at 100 R), which fixes the km-to-px scale; the track runs
 * out to 68 % of it, leaving the rest for the v∞ arrows.
 */
export function planetView(size: number, rpKm: number, radiusKm: number): PlanetView {
  const half = size / 2;
  const periapsisPx = half * periapsisShare(rpToSlider(rpKm / radiusKm));
  const scale = periapsisPx / rpKm;
  const truePlanetPx = radiusKm * scale;
  return {
    periapsisPx,
    scale,
    reachKm: (half * REACH_SHARE) / scale,
    planetPx: Math.max(truePlanetPx, MIN_PLANET_PX),
    isPlanetEnlarged: truePlanetPx < MIN_PLANET_PX,
  };
}

/** r_p (planet radii, unclamped) for a handle dragged `distancePx` from the planet's centre. */
export function rpFromDistance(distancePx: number, half: number): number {
  const u = (distancePx / half - PERIAPSIS_SHARE.min) / (PERIAPSIS_SHARE.max - PERIAPSIS_SHARE.min);
  return sliderToRp(u);
}

export interface TriangleLayout {
  /** Origin O of the Sun-frame velocities. */
  origin: Point;
  /** O + V⃗_p, where both v⃗∞ start. */
  planetTip: Point;
  /** O + v⃗_in and O + v⃗_out. */
  inTip: Point;
  outTip: Point;
  /** px per km/s. */
  k: number;
}

/**
 * The velocity triangles v⃗ = V⃗_p + v⃗∞ fitted, at one scale and with y up, into a width × height
 * panel: V⃗_p along +x from O, and the circle |v⃗∞| around its tip kept whole. vIn and vOut are
 * the Sun-frame velocities (km/s) with V⃗_p along +x, as planarFlyby returns them.
 */
export function triangleLayout(
  width: number,
  height: number,
  Vp: number,
  vIn: readonly [number, number],
  vOut: readonly [number, number],
): TriangleLayout {
  const vInf = Math.hypot(vIn[0] - Vp, vIn[1]);
  const xs = [0, Vp - vInf, Vp + vInf, vIn[0], vOut[0]];
  const ys = [0, -vInf, vInf, vIn[1], vOut[1]];
  const [xMin, xMax] = [Math.min(...xs), Math.max(...xs)];
  const [yMin, yMax] = [Math.min(...ys), Math.max(...ys)];
  const k = Math.min(
    (width - 2 * TRIANGLE_PAD.x) / (xMax - xMin),
    (height - 2 * TRIANGLE_PAD.y) / (yMax - yMin),
  );
  // Centre the content in the panel.
  const left = (width - k * (xMax - xMin)) / 2;
  const top = (height - k * (yMax - yMin)) / 2;
  const toPx = ([x, y]: readonly [number, number]): Point => ({
    x: left + k * (x - xMin),
    y: top + k * (yMax - y),
  });
  return {
    origin: toPx([0, 0]),
    planetTip: toPx([Vp, 0]),
    inTip: toPx(vIn),
    outTip: toPx(vOut),
    k,
  };
}

/** SVG arc around `c` from angle `from` to `to` (rad, counter-clockwise with y up), the short way. */
export function arcPath(c: Point, radius: number, from: number, to: number): string {
  const at = (angle: number) =>
    `${round(c.x + radius * Math.cos(angle))} ${round(c.y - radius * Math.sin(angle))}`;
  const sweep = to > from ? 0 : 1;
  return `M${at(from)} A${radius} ${radius} 0 0 ${sweep} ${at(to)}`;
}

/**
 * Where the planet's centre goes so the drawn content (points relative to it, px) is centred in
 * a width × height panel: the hyperbola sits to one side of the planet, not around it.
 */
export function centreOn(points: readonly Point[], width: number, height: number): Point {
  if (points.length === 0) return { x: width / 2, y: height / 2 };
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  return {
    x: width / 2 - (Math.min(...xs) + Math.max(...xs)) / 2,
    y: height / 2 - (Math.min(...ys) + Math.max(...ys)) / 2,
  };
}

/** Gap from an arrow's tip to its label, px; label width is estimated per character (13 px mono). */
const TIP_GAP = 14;
const CHAR_PX = 8;
const LABEL_EDGE = 4;
/** A tip label leans to one side when its direction is this far from vertical. */
const LEAN = 0.3;

export interface TipLabelPlacement {
  at: Point;
  anchor: 'start' | 'middle' | 'end';
}

/**
 * A label just past an arrow's tip along its unit direction `d` (screen coordinates), leaning
 * outward, `gap` px away, and kept inside [0, width]: near an edge it turns to end (or start) at
 * the border.
 */
export function tipLabel(
  tip: Point,
  d: Point,
  text: string,
  width: number,
  gap: number = TIP_GAP,
): TipLabelPlacement {
  const at = { x: tip.x + d.x * gap, y: tip.y + d.y * gap };
  const textWidth = text.length * CHAR_PX;
  const right = width - LABEL_EDGE;
  if (d.x > LEAN) {
    return at.x + textWidth <= right
      ? { at, anchor: 'start' }
      : { at: { x: right, y: at.y }, anchor: 'end' };
  }
  if (d.x < -LEAN) {
    return at.x - textWidth >= LABEL_EDGE
      ? { at, anchor: 'end' }
      : { at: { x: LABEL_EDGE, y: at.y }, anchor: 'start' };
  }
  const x = Math.min(Math.max(at.x, LABEL_EDGE + textWidth / 2), right - textWidth / 2);
  return { at: { x, y: at.y }, anchor: 'middle' };
}
