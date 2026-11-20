/** Labelled points over SvgPlot overlays (labs and static figures), in viewBox pixels. */
import type { JSX } from 'react';
import { SURFACE_COLOR, TEXT_COLOR } from '../charts/chartTheme';
import { fitCentre, textWidth, type Scale } from './plotScales';
import { Label } from './OverlayMarks';

const DOT_RADIUS = 5;
const LABEL_GAP = 10;
/** Baseline drop that puts a label's text just below its point. */
const BELOW_DROP = 20;
/** Font size of OverlayMarks' Label. */
const LABEL_SIZE = 13;

export interface PlotPoint {
  id: string;
  x: number;
  y: number;
  /** Text beside the point; none draws only the dot. */
  label?: string;
  /** Shorter text used when `label` does not fit on its preferred side (phones). */
  compactLabel?: string;
  /** The side of the point the label prefers (see labelPlacement for the fallbacks). */
  anchor?: 'start' | 'end';
  /** Label above (−1, the default) or below (+1) the point. */
  side?: -1 | 1;
  /** Dot fill; the text color by default. */
  color?: string;
}

type Anchor = 'start' | 'middle' | 'end';

/**
 * Where a label of `width` px goes beside a point at `x`: on its preferred side when it fits
 * inside `range`, else on the other side, else centred on the point and shifted inside.
 */
export function labelPlacement(
  x: number,
  width: number,
  preferred: 'start' | 'end',
  [left, right]: [number, number],
): { anchor: Anchor; dx: number } {
  const fitsStart = x + LABEL_GAP + width <= right;
  const fitsEnd = x - LABEL_GAP - width >= left;
  if (preferred === 'start' ? fitsStart : !fitsEnd && fitsStart) {
    return { anchor: 'start', dx: LABEL_GAP };
  }
  if (fitsEnd) return { anchor: 'end', dx: -LABEL_GAP };
  return { anchor: 'middle', dx: fitCentre(x, width, left, right) - x };
}

type PlotScales = { x: Scale; y: Scale };

/** A label as drawn: anchor, offset from its point, and text. */
interface LabelLayout {
  anchor: Anchor;
  dx: number;
  dy: number;
  text: string;
}

/** The label of a point as the unplated layout places it (preferred side, then the fallbacks). */
function freeLabel(point: PlotPoint, at: { x: number }, scales: PlotScales): LabelLayout | undefined {
  if (!point.label) return undefined;
  const preferred = point.anchor ?? 'start';
  const place = (text: string) =>
    labelPlacement(at.x, textWidth(text, LABEL_SIZE), preferred, scales.x.range);
  const full = place(point.label);
  const short = full.anchor === preferred ? undefined : point.compactLabel;
  const text = short ?? point.label;
  const { anchor, dx } = short === undefined ? full : place(short);
  return { anchor, dx, dy: sideDrop(point.side ?? -1), text };
}

const sideDrop = (side: -1 | 1) => (side < 0 ? -LABEL_GAP : BELOW_DROP);

/*
 * Plated labels. A label over crossing curves stays legible on a plate of the surface color, and
 * is placed where its plate covers no dot and no other label (Tema 13's pump chart at 360 px put
 * the operating point on the «i» of «pedido»).
 */

/** A plate's box in viewBox px. */
export interface PlateBox {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface LabelPlate extends LabelLayout {
  box: PlateBox;
}

/** Glyph extent of a LABEL_SIZE line around its baseline, and the plate's padding (px). */
const ASCENT = 0.75 * LABEL_SIZE;
const DESCENT = 0.25 * LABEL_SIZE;
const PLATE_PAD = 2;
const PLATE_RADIUS = 2;
/** How close a plate may come to a dot's centre: the dot, its ring and 2 px of air. */
export const DOT_CLEARANCE = DOT_RADIUS + 1 + 2;

function plateBox(at: { x: number; y: number }, { anchor, dx, dy, text }: LabelLayout): PlateBox {
  const width = textWidth(text, LABEL_SIZE);
  const x = at.x + dx;
  const left = anchor === 'start' ? x : anchor === 'end' ? x - width : x - width / 2;
  const baseline = at.y + dy;
  return {
    left: left - PLATE_PAD,
    right: left + width + PLATE_PAD,
    top: baseline - ASCENT - PLATE_PAD,
    bottom: baseline + DESCENT + PLATE_PAD,
  };
}

const overlaps = (a: PlateBox, b: PlateBox) =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

function coversDot(box: PlateBox, dot: { x: number; y: number }): boolean {
  const nearestX = Math.min(Math.max(dot.x, box.left), box.right);
  const nearestY = Math.min(Math.max(dot.y, box.top), box.bottom);
  return Math.hypot(dot.x - nearestX, dot.y - nearestY) < DOT_CLEARANCE;
}

function isInside(box: PlateBox, { x, y }: PlotScales): boolean {
  const [x0, x1] = [Math.min(...x.range), Math.max(...x.range)];
  const [y0, y1] = [Math.min(...y.range), Math.max(...y.range)];
  return box.left >= x0 && box.right <= x1 && box.top >= y0 && box.bottom <= y1;
}

/** The places a label may take, best first: its preferred side, then the other side, then across. */
function candidates(point: PlotPoint, text: string): LabelLayout[] {
  const anchor = point.anchor ?? 'start';
  const side = point.side ?? -1;
  const across = anchor === 'start' ? 'end' : 'start';
  const other = side < 0 ? 1 : -1;
  const dxOf = (a: 'start' | 'end') => (a === 'start' ? LABEL_GAP : -LABEL_GAP);
  return [
    { anchor, dx: dxOf(anchor), dy: sideDrop(side), text },
    { anchor, dx: dxOf(anchor), dy: sideDrop(other), text },
    { anchor: across, dx: dxOf(across), dy: sideDrop(side), text },
    { anchor: across, dx: dxOf(across), dy: sideDrop(other), text },
  ];
}

/**
 * Each point's plated label, in order: the first candidate whose plate stays in the plot area and
 * covers no dot and no label placed before it (the compact text is tried after the full one);
 * when none is free, the unplated layout's place.
 */
export function plateLabels(
  points: readonly PlotPoint[],
  scales: PlotScales,
): (LabelPlate | undefined)[] {
  const dots = points.map((point) => ({ x: scales.x.toPx(point.x), y: scales.y.toPx(point.y) }));
  const placed: PlateBox[] = [];
  return points.map((point, i) => {
    const fallback = freeLabel(point, dots[i], scales);
    if (!fallback || !point.label) return undefined;
    const texts = point.compactLabel ? [point.label, point.compactLabel] : [point.label];
    const isFree = (box: PlateBox) =>
      isInside(box, scales) &&
      dots.every((dot) => !coversDot(box, dot)) &&
      placed.every((other) => !overlaps(box, other));
    const choice = texts
      .flatMap((text) => candidates(point, text))
      .map((layout) => ({ ...layout, box: plateBox(dots[i], layout) }))
      .find(({ box }) => isFree(box)) ?? { ...fallback, box: plateBox(dots[i], fallback) };
    placed.push(choice.box);
    return choice;
  });
}

/** The point's dot: its color with a surface ring, so it separates from the curve. */
function Dot({ at, color }: { at: { x: number; y: number }; color?: string }): JSX.Element {
  return (
    <circle
      cx={at.x}
      cy={at.y}
      r={DOT_RADIUS}
      fill={color ?? TEXT_COLOR}
      stroke={SURFACE_COLOR}
      strokeWidth={2}
    />
  );
}

/**
 * A dot with a surface ring and an optional label. `plated` puts each label on a plate of the
 * surface color, where it covers no dot and no other label (for plots whose curves cross there).
 */
export function PlotPoints({
  points,
  scales,
  plated = false,
}: {
  points: readonly PlotPoint[];
  scales: PlotScales;
  plated?: boolean;
}): JSX.Element {
  const plates = plated ? plateLabels(points, scales) : undefined;
  return (
    <g className="pointer-events-none">
      {points.map((point, i) => {
        const at = { x: scales.x.toPx(point.x), y: scales.y.toPx(point.y) };
        const label = plates ? plates[i] : freeLabel(point, at, scales);
        const box = plates?.[i]?.box;
        return (
          <g key={point.id} data-point={point.id}>
            <Dot at={at} color={point.color} />
            {box ? (
              <rect
                data-plate=""
                x={box.left}
                y={box.top}
                width={box.right - box.left}
                height={box.bottom - box.top}
                rx={PLATE_RADIUS}
                fill={SURFACE_COLOR}
              />
            ) : null}
            {label ? (
              <Label at={at} dx={label.dx} dy={label.dy} anchor={label.anchor}>
                {label.text}
              </Label>
            ) : null}
          </g>
        );
      })}
    </g>
  );
}
