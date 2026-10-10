/**
 * Marks shared by the laboratories' SvgPlot overlays, in viewBox pixels: a vector arrow, a haloed
 * label and the knob of a draggable handle (hit area, focus ring, visible dot).
 */
import type { JSX } from 'react';
import { SURFACE_COLOR, TEXT_COLOR, TICK_FONT_FAMILY } from '../charts/chartTheme';

export type Point = { x: number; y: number };

const KNOB_RADIUS = 7;
/** Invisible hit circle: a 32 px touch target. */
const HIT_RADIUS = 16;
const FOCUS_RING_RADIUS = 11;
const FOCUS_RING_COLOR = 'var(--accent)';
const VECTOR_WIDTH = 2;
const VECTOR_DASH = '6 3';
/** Arrowhead length (px); an arrow at least this long gets a head. */
export const ARROW_HEAD = 9;
/** Float slack, so an arrow built to exactly ARROW_HEAD (e.g. 8,999999999999998) keeps its head. */
const LENGTH_EPSILON = 1e-6;
const LABEL_GAP = 10;
const LABEL_SIZE = 13;
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

/** Text up and to the right of `at` (or offset by dx, dy), in the text color with a surface halo. */
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
    <text
      x={at.x + dx}
      y={at.y + dy}
      textAnchor={anchor}
      fill={TEXT_COLOR}
      fontFamily={TICK_FONT_FAMILY}
      fontSize={LABEL_SIZE}
      stroke={SURFACE_COLOR}
      strokeWidth={HALO_WIDTH}
      paintOrder="stroke"
      className="pointer-events-none"
    >
      {children}
    </text>
  );
}

/** Hit area, focus ring and knob of a draggable handle centred on `at`. */
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
      <circle cx={at.x} cy={at.y} r={HIT_RADIUS} fill="transparent" />
      <circle
        cx={at.x}
        cy={at.y}
        r={FOCUS_RING_RADIUS}
        fill="none"
        stroke={FOCUS_RING_COLOR}
        strokeWidth={2}
        className="opacity-0 group-focus-visible:opacity-100"
      />
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
