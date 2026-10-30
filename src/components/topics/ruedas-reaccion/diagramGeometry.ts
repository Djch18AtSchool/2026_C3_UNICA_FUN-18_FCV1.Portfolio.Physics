/**
 * Geometry of the prescribed diagram (WheelDiagram.astro), in viewBox units with y down: straight
 * vectors, spin arcs on tilted circles (ellipses), Earth's dipole field lines and the runs of an
 * equation with italic symbols and subscripts.
 */

export interface Point {
  x: number;
  y: number;
}

const DEG = Math.PI / 180;
const DEFAULT_HEAD = 10;
const HEAD_HALF_WIDTH = 0.45;

const round = (value: number) => Math.round(value * 10) / 10;
const pointList = (points: readonly Point[]) =>
  points.map((point) => `${round(point.x)},${round(point.y)}`).join(' ');

/** Corners of a filled arrowhead with its tip at `tip`, pointing along the unit vector `u`. */
function headCorners(tip: Point, u: Point, head: number): string {
  const base = { x: tip.x - u.x * head, y: tip.y - u.y * head };
  const half = head * HEAD_HALF_WIDTH;
  return pointList([
    tip,
    { x: base.x - u.y * half, y: base.y + u.x * half },
    { x: base.x + u.y * half, y: base.y - u.x * half },
  ]);
}

/** A vector from `from` to `to`: the shaft stops at the base of its head. */
export function arrow(from: Point, to: Point, head = DEFAULT_HEAD) {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  if (!(length > 0)) throw new RangeError('arrow: from and to must differ');
  const u = { x: (to.x - from.x) / length, y: (to.y - from.y) / length };
  return {
    x1: round(from.x),
    y1: round(from.y),
    x2: round(to.x - u.x * head),
    y2: round(to.y - u.y * head),
    head: headCorners(to, u, head),
  };
}

export interface Ellipse {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

/** The point at parameter `degrees` (0 = right, 90 = bottom, the near side of a tilted circle). */
export function onEllipse(e: Ellipse, degrees: number): Point {
  return {
    x: round(e.cx + e.rx * Math.cos(degrees * DEG)),
    y: round(e.cy + e.ry * Math.sin(degrees * DEG)),
  };
}

/**
 * An arc of `e` from `from` to `to` degrees with an arrowhead at its end. Growing parameters run
 * clockwise on screen; on the near (lower) side of a tilted circle that is right to left. `sense`
 * says which way it turns on screen.
 */
export function spinArc(e: Ellipse, from: number, to: number, head = DEFAULT_HEAD) {
  if (from === to) throw new RangeError('spinArc: from and to must differ');
  const start = onEllipse(e, from);
  const end = onEllipse(e, to);
  const isClockwise = to > from;
  const sign = isClockwise ? 1 : -1;
  const tangent = {
    x: -e.rx * Math.sin(to * DEG) * sign,
    y: e.ry * Math.cos(to * DEG) * sign,
  };
  const length = Math.hypot(tangent.x, tangent.y);
  const u = { x: tangent.x / length, y: tangent.y / length };
  const tip = { x: end.x + u.x * head * 0.7, y: end.y + u.y * head * 0.7 };
  const largeArc = Math.abs(to - from) > 180 ? 1 : 0;
  return {
    d: `M${start.x},${start.y} A${e.rx},${e.ry} 0 ${largeArc} ${isClockwise ? 1 : 0} ${end.x},${end.y}`,
    head: headCorners(tip, u, head),
    sense: isClockwise ? ('horario' as const) : ('antihorario' as const),
  };
}

const FIELD_LINE_STEPS = 48;

/**
 * One field line of a dipole whose axis is vertical on screen (north up), centred on `centre`:
 * r = L sin²θ, θ from the pole, from the surface (r = R) on the south side, out through the
 * equator (r = L) and back to the surface on the north side, on the right of the axis.
 */
export function dipoleFieldLine(centre: Point, L: number, R: number): string {
  if (!(L > R && R > 0)) throw new RangeError('dipoleFieldLine: needs L > R > 0');
  const theta0 = Math.asin(Math.sqrt(R / L));
  const points = Array.from({ length: FIELD_LINE_STEPS + 1 }, (_, index) => {
    const theta = Math.PI - theta0 - ((Math.PI - 2 * theta0) * index) / FIELD_LINE_STEPS;
    const r = L * Math.sin(theta) ** 2;
    return { x: centre.x + r * Math.sin(theta), y: centre.y - r * Math.cos(theta) };
  });
  return `M${pointList(points).replaceAll(' ', ' L')}`;
}

/** A piece of an equation: plain text, or an italic symbol with an optional subscript. */
export type MathPart = string | { symbol: string; sub?: string; upright?: boolean };

export interface MathRun {
  text: string;
  className: string;
  dy?: number;
}

const SUB_DY = 5;

/**
 * The <tspan> runs of an equation: symbols italic (unless `upright`), subscripts lowered by
 * SUB_DY and the next run raised back. Classes: `wd-math` (italic), `wd-sub` (subscript).
 */
export function mathRuns(parts: readonly MathPart[]): MathRun[] {
  let pending = 0;
  return parts.flatMap((part) => {
    const dy = pending || undefined;
    if (typeof part === 'string') {
      pending = 0;
      return [{ text: part, className: '', dy }];
    }
    const symbolClass = part.upright ? '' : 'wd-math';
    pending = part.sub ? -SUB_DY : 0;
    const symbol: MathRun = { text: part.symbol, className: symbolClass, dy };
    return part.sub
      ? [symbol, { text: part.sub, className: 'wd-math wd-sub', dy: SUB_DY }]
      : [symbol];
  });
}
