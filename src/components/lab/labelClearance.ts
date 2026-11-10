/**
 * Finds a spot for a small label where its box crosses none of the drawn lines (a path, arrows,
 * asymptotes), overlaps no other text and stays inside the plot: the first clear candidate wins.
 * Also builds those candidates (around a point, beside a segment). Pixels throughout. Pure.
 */
import { marksTopEm, mathTextWidth } from '../../lib/mathNotation';

export interface Point {
  x: number;
  y: number;
}

export type Segment = readonly [Point, Point];

export interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface Size {
  width: number;
  height: number;
}

/** Ascent and descent of a line of text, in em, for its box around the baseline. */
const ASCENT_EM = 0.8;
const DESCENT_EM = 0.25;
/** Turns tried around a point, in order: straight on, then ever further to either side. */
const TURNS_DEG = [0, 45, -45, 90, -90, 135, -135, 180];
const RAD_PER_DEG = Math.PI / 180;

/** The box of size `width` × `height` centred on `centre`. */
export function boxAround(centre: Point, width: number, height: number): Box {
  return {
    left: centre.x - width / 2,
    right: centre.x + width / 2,
    top: centre.y - height / 2,
    bottom: centre.y + height / 2,
  };
}

/** Whether two boxes share some area (boxes that only meet along an edge do not). */
export function boxesOverlap(a: Box, b: Box): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

/**
 * The box of a monospace label drawn at `at` (its baseline) with an SVG text-anchor; the text is
 * in the MathText notation, so "V_p" is measured as drawn (V and a 75 % p), not as three cells,
 * and the box reaches up to a drawn vector arrow.
 */
export function textBox(
  at: Point,
  text: string,
  fontSize: number,
  anchor: 'start' | 'middle' | 'end',
): Box {
  const width = mathTextWidth(text, fontSize, 'mono');
  const left = anchor === 'start' ? at.x : anchor === 'middle' ? at.x - width / 2 : at.x - width;
  return {
    left,
    right: left + width,
    top: at.y - Math.max(ASCENT_EM, marksTopEm(text)) * fontSize,
    bottom: at.y + DESCENT_EM * fontSize,
  };
}

/** How far a box of `size` reaches from its centre along the unit direction `u`. */
export function boxReach(u: Point, size: Size): number {
  return (Math.abs(u.x) * size.width) / 2 + (Math.abs(u.y) * size.height) / 2;
}

/** The centre of a box of `size` placed past `p` along unit `u`, its nearest side `gap` px off. */
const pastPoint = (p: Point, u: Point, size: Size, gap: number): Point => {
  const distance = boxReach(u, size) + gap;
  return { x: p.x + u.x * distance, y: p.y + u.y * distance };
};

/**
 * Centres for a label of `size` around `p`: first straight along the unit direction `u` (past an
 * arrow's tip, say), then turned 45°, 90° and 135° to either side and last behind it; each box
 * stays `gap` px clear of `p`.
 */
export function spotsAround(p: Point, u: Point, size: Size, gap: number): Point[] {
  return TURNS_DEG.map((deg) => {
    const [cos, sin] = [Math.cos(deg * RAD_PER_DEG), Math.sin(deg * RAD_PER_DEG)];
    return pastPoint(p, { x: u.x * cos - u.y * sin, y: u.x * sin + u.y * cos }, size, gap);
  });
}

/**
 * Centres for a label of `size` beside the middle of a segment, `gap` px clear of it: first on
 * its left (seen along from → to, on screen), then on its right.
 */
export function spotsBeside(from: Point, to: Point, size: Size, gap: number): Point[] {
  const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  const left = { x: (to.y - from.y) / length, y: -(to.x - from.x) / length };
  const middle = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  return [left, { x: -left.x, y: -left.y }].map((normal) => pastPoint(middle, normal, size, gap));
}

/** Whether the segment touches the box (Liang–Barsky clipping of the segment to the box). */
export function segmentHitsBox([a, b]: Segment, box: Box): boolean {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const edges: [number, number][] = [
    [-dx, a.x - box.left],
    [dx, box.right - a.x],
    [-dy, a.y - box.top],
    [dy, box.bottom - a.y],
  ];
  let enter = 0;
  let leave = 1;
  for (const [p, q] of edges) {
    if (p === 0) {
      if (q < 0) return false;
      continue;
    }
    const t = q / p;
    if (p < 0) enter = Math.max(enter, t);
    else leave = Math.min(leave, t);
    if (enter > leave) return false;
  }
  return true;
}

/** Consecutive points of a polyline as segments, skipping any non-finite point (a break). */
export function segmentsOf(points: readonly Point[]): Segment[] {
  const isFinite = (p: Point) => Number.isFinite(p.x) && Number.isFinite(p.y);
  return points.slice(1).flatMap((p, i): Segment[] => {
    const q = points[i];
    return isFinite(p) && isFinite(q) ? [[q, p]] : [];
  });
}

/** Float slack for a box set exactly on the area's edge (by fitCentre, say). */
const EDGE_EPSILON = 1e-6;

const isInside = (box: Box, area: Box) =>
  box.left >= area.left - EDGE_EPSILON &&
  box.right <= area.right + EDGE_EPSILON &&
  box.top >= area.top - EDGE_EPSILON &&
  box.bottom <= area.bottom + EDGE_EPSILON;

/**
 * The first candidate centre whose box is inside `area`, clear of every segment and of every
 * blocked box (other text), or undefined when none is.
 */
export function clearSpot(
  candidates: readonly Point[],
  size: Size,
  obstacles: readonly Segment[],
  area: Box,
  blocked: readonly Box[] = [],
): Point | undefined {
  return candidates.find((centre) => {
    const box = boxAround(centre, size.width, size.height);
    return (
      isInside(box, area) &&
      !obstacles.some((segment) => segmentHitsBox(segment, box)) &&
      !blocked.some((other) => boxesOverlap(box, other))
    );
  });
}
