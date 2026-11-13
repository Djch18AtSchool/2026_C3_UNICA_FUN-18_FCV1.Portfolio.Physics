/**
 * Marks shared by the laboratories' SvgPlot overlays, in viewBox pixels: a vector arrow, a haloed
 * label and the knob of a draggable handle (hit area, focus ring, visible dot).
 */
import type { JSX } from 'react';
import { SURFACE_COLOR, TEXT_COLOR } from '../charts/chartTheme';
import MathText from './MathText';

export type Point = { x: number; y: number };

const KNOB_RADIUS = 7;
/** Invisible hit circle: a 32 px touch target. A plot's `overlayBleed` uses it to keep knobs whole. */
export const KNOB_HIT_RADIUS = 16;
/** A Knob's focus ring, px from its centre: what a label or a reveal keeps clear of. */
export const FOCUS_RING_RADIUS = 11;
const FOCUS_RING_COLOR = 'var(--accent)';
const FOCUS_RING_WIDTH = 2;
/** The surface around the ring, on each side (px). */
const FOCUS_RING_CASING = 1;
const RING_VISIBILITY = 'opacity-0 group-focus-visible:opacity-100';
const VECTOR_WIDTH = 2;
const VECTOR_DASH = '6 3';
/** Arrowhead length (px); an arrow at least this long gets a head. */
export const ARROW_HEAD = 9;
/** Float slack, so an arrow built to exactly ARROW_HEAD (e.g. 8,999999999999998) keeps its head. */
const LENGTH_EPSILON = 1e-6;
const LABEL_GAP = 10;
/** Font size of a Label, px: layouts that place labels size their boxes with it. */
export const LABEL_SIZE = 13;
const HALO_WIDTH = 4;

/** Three corners of an arrowhead whose tip is `to`, pointing along from → to. */
function arrowHead(from: Point, to: Point): string {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const corner = (offset: number) =>
    `${to.x - ARROW_HEAD * Math.cos(angle + offset)},${to.y - ARROW_HEAD * Math.sin(angle + offset)}`;
  return `${to.x},${to.y} ${corner(Math.PI / 7)} ${corner(-Math.PI / 7)}`;
}

/** A straight vector from → to (optionally dashed); the head is drawn when the arrow is at least as long as it. */
export function Arrow({
  from,
  to,
  color,
  dashed = false,
}: {
  from: Point;
  to: Point;
  color: string;
  dashed?: boolean;
}): JSX.Element {
  const isVisible = Math.hypot(to.x - from.x, to.y - from.y) >= ARROW_HEAD - LENGTH_EPSILON;
  return (
    <g className="pointer-events-none" stroke={color} fill={color}>
      <line
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        strokeWidth={VECTOR_WIDTH}
        strokeDasharray={dashed ? VECTOR_DASH : undefined}
      />
      {isVisible ? <polygon points={arrowHead(from, to)} strokeWidth={1} /> : null}
    </g>
  );
}

/**
 * Text up and to the right of `at` (or offset by dx, dy), in the text color with a surface halo.
 * The text is in the MathText notation: "V_p", "v_∞", "vec v = vec V_p + vec v_∞".
 */
export function Label({
  at,
  children,
  dx = LABEL_GAP,
  dy = -LABEL_GAP,
  anchor = 'start',
}: {
  at: Point;
  children: string;
  dx?: number;
  dy?: number;
  anchor?: 'start' | 'middle' | 'end';
}): JSX.Element {
  return (
    <MathText
      source={children}
      x={at.x + dx}
      y={at.y + dy}
      anchor={anchor}
      fill={TEXT_COLOR}
      fontSize={LABEL_SIZE}
      halo={{ color: SURFACE_COLOR, width: HALO_WIDTH }}
      className="pointer-events-none"
    />
  );
}

/**
 * The focus ring of a handle centred on (cx, cy), shown while its group (`group`, the element
 * with the tabindex) has a visible focus: the accent ring on a casing of the surface a pixel wider
 * on each side, so the ring meets the surface on both edges whatever is drawn under it and keeps
 * its contrast (≥ 3:1, tokens.test.ts; WCAG 2.4.11 and 1.4.11) in both themes.
 */
export function KnobRing({ cx, cy }: { cx: number; cy: number }): JSX.Element {
  return (
    <>
      <circle
        data-knob-ring-casing=""
        cx={cx}
        cy={cy}
        r={FOCUS_RING_RADIUS}
        fill="none"
        stroke={SURFACE_COLOR}
        strokeWidth={FOCUS_RING_WIDTH + 2 * FOCUS_RING_CASING}
        className={RING_VISIBILITY}
      />
      <circle
        data-knob-ring=""
        cx={cx}
        cy={cy}
        r={FOCUS_RING_RADIUS}
        fill="none"
        stroke={FOCUS_RING_COLOR}
        strokeWidth={FOCUS_RING_WIDTH}
        className={RING_VISIBILITY}
      />
    </>
  );
}

/**
 * Hit area, focus ring and knob of a draggable handle centred on `at`. While dragged (useDrag
 * marks the handle `data-dragging`), global.css grows the knob about its centre: the hit area and
 * the drag's maths stay as they are.
 */
export function Knob({
  at,
  fill,
  stroke = SURFACE_COLOR,
}: {
  at: Point;
  fill: string;
  stroke?: string;
}): JSX.Element {
  return (
    <>
      <circle cx={at.x} cy={at.y} r={KNOB_HIT_RADIUS} fill="transparent" />
      <KnobRing cx={at.x} cy={at.y} />
      <circle
        data-knob=""
        cx={at.x}
        cy={at.y}
        r={KNOB_RADIUS}
        fill={fill}
        stroke={stroke}
        strokeWidth={2}
      />
    </>
  );
}
