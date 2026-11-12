/**
 * Pure math of the canvas zoom (useZoomPan). No React, no DOM.
 *
 * A view maps a point of the drawing to the viewport: screen = drawing · scale + (x, y), in CSS
 * px. Drawing units are the lab's own px as it draws without zoom (its viewBox equals its box,
 * README, «Laboratorios por niveles»), so the identity view is exactly what the server paints and
 * ×1 means one drawing unit per CSS px: the drawing at its nominal scale («1:1»). The frame holds
 * what every operation needs: the measured viewport, the drawing's extent (`bounds`), what
 * «Ajustar» frames (`fit`) and the zoom limits. Every function returns a new view.
 */
import { factorNumber, TIMES_SIGN } from './timeScaleFormat';

export interface ZoomPoint {
  readonly x: number;
  readonly y: number;
}

export interface ZoomSize {
  readonly width: number;
  readonly height: number;
}

/** A box of the drawing, in drawing units. */
export interface ZoomBox extends ZoomPoint, ZoomSize {}

/** screen = drawing · scale + (x, y). */
export interface ZoomView {
  readonly scale: number;
  readonly x: number;
  readonly y: number;
}

export interface ZoomLimits {
  readonly minScale: number;
  readonly maxScale: number;
}

export interface ZoomFrame {
  /** The viewport's size in CSS px; 0 × 0 before it is measured (the server). */
  readonly viewport: ZoomSize;
  /** Everything the lab draws: panning never leaves a gap beside it (or lets it out, if smaller). */
  readonly bounds: ZoomBox;
  /** What «Ajustar» frames, centred and as large as fits. */
  readonly fit: ZoomBox;
  readonly limits: ZoomLimits;
}

export type ZoomPair = readonly [ZoomPoint, ZoomPoint];

export const IDENTITY_VIEW: ZoomView = Object.freeze({ scale: 1, x: 0, y: 0 });
/** By default the lab's own framing is the widest view, and ×8 the closest. */
export const DEFAULT_ZOOM_LIMITS: ZoomLimits = Object.freeze({ minScale: 1, maxScale: 8 });
/** One button or key press: two presses double the scale (×1, ×1,4, ×2, ×2,8, ×4…). */
export const ZOOM_STEP = Math.SQRT2;

/** A wheel line (deltaMode 1) in px, as browsers scroll it. */
const WHEEL_LINE_PX = 16;
const DOM_DELTA_LINE = 1;
const DOM_DELTA_PAGE = 2;
/** One mouse-wheel notch (100 px in Chromium and Firefox) zooms about one button step. */
const WHEEL_PX_PER_STEP = 100;
const WHEEL_ZOOM_RATE = Math.log(ZOOM_STEP) / WHEEL_PX_PER_STEP;
/** A single wheel event never more than doubles or halves the scale (a page-sized delta). */
const WHEEL_MAX_FACTOR = 2;
/** Views closer than this are the same view (rounding, sub-pixel noise). */
const SCALE_EPSILON = 1e-6;
const OFFSET_EPSILON_PX = 0.01;
/** Within this of ×1 the zoom reads «tamaño real». */
const ACTUAL_SIZE_SLACK = 0.005;

const isPositive = (value: number) => Number.isFinite(value) && value > 0;

/** Fails fast with the fix: a lab passing bad limits or an empty box is a programming error. */
export function requireZoomFrame(frame: ZoomFrame): void {
  const { limits, bounds, fit } = frame;
  if (!isPositive(limits.minScale) || !isPositive(limits.maxScale)) {
    throw new RangeError('useZoomPan: minScale y maxScale deben ser números positivos y finitos.');
  }
  if (limits.maxScale < limits.minScale) {
    throw new RangeError(
      `useZoomPan: maxScale (${limits.maxScale}) es menor que minScale (${limits.minScale}).`,
    );
  }
  for (const [name, box] of [
    ['bounds', bounds],
    ['fit', fit],
  ] as const) {
    if (!isPositive(box.width) || !isPositive(box.height)) {
      throw new RangeError(`useZoomPan: «${name}» necesita ancho y alto positivos.`);
    }
  }
}

export function clampScale(scale: number, limits: ZoomLimits): number {
  return Math.min(limits.maxScale, Math.max(limits.minScale, scale));
}

const isMeasured = (viewport: ZoomSize) => viewport.width > 0 && viewport.height > 0;

/**
 * The offset range on one axis: a drawing larger than the viewport may not leave a gap at either
 * edge; a smaller one may not leave the viewport. Both are the closed range between the two ends.
 */
function clampAxis(offset: number, start: number, length: number, scale: number, room: number) {
  // 0 − …, not −…: a drawing from 0 gives +0, never −0.
  const atStart = 0 - start * scale;
  const atEnd = room - (start + length) * scale;
  return Math.min(Math.max(atStart, atEnd), Math.max(Math.min(atStart, atEnd), offset));
}

/** The view with its offsets pulled inside the range the bounds allow (unchanged if unmeasured). */
export function clampPan(view: ZoomView, frame: ZoomFrame): ZoomView {
  const { viewport, bounds } = frame;
  if (!isMeasured(viewport)) return { ...view };
  return {
    scale: view.scale,
    x: clampAxis(view.x, bounds.x, bounds.width, view.scale, viewport.width),
    y: clampAxis(view.y, bounds.y, bounds.height, view.scale, viewport.height),
  };
}

export function toScreen(view: ZoomView, point: ZoomPoint): ZoomPoint {
  return { x: point.x * view.scale + view.x, y: point.y * view.scale + view.y };
}

export function toWorld(view: ZoomView, point: ZoomPoint): ZoomPoint {
  return { x: (point.x - view.x) / view.scale, y: (point.y - view.y) / view.scale };
}

/** The view as an SVG `transform` for the group that holds the drawing. */
export function viewTransform(view: ZoomView): string {
  return `translate(${view.x} ${view.y}) scale(${view.scale})`;
}

/** The view at `scale` that keeps `world` under the viewport point `screen`, clamped. */
function placeAt(scale: number, world: ZoomPoint, screen: ZoomPoint, frame: ZoomFrame): ZoomView {
  return clampPan({ scale, x: screen.x - world.x * scale, y: screen.y - world.y * scale }, frame);
}

/** Zooms by `factor` about `anchor` (viewport px): the drawing point under it stays there. */
export function zoomAt(
  view: ZoomView,
  factor: number,
  anchor: ZoomPoint,
  frame: ZoomFrame,
): ZoomView {
  const scale = clampScale(view.scale * factor, frame.limits);
  return placeAt(scale, toWorld(view, anchor), anchor, frame);
}

/** Moves the drawing by `delta` viewport px, clamped. */
export function panBy(view: ZoomView, delta: ZoomPoint, frame: ZoomFrame): ZoomView {
  return clampPan({ scale: view.scale, x: view.x + delta.x, y: view.y + delta.y }, frame);
}

const centreOf = (size: ZoomSize): ZoomPoint => ({ x: size.width / 2, y: size.height / 2 });

/** «Ajustar»: the fit box centred and as large as the viewport and the limits allow. */
export function fitView(frame: ZoomFrame): ZoomView {
  const { viewport, fit, limits } = frame;
  if (!isMeasured(viewport)) return IDENTITY_VIEW;
  const scale = clampScale(
    Math.min(viewport.width / fit.width, viewport.height / fit.height),
    limits,
  );
  const fitCentre = { x: fit.x + fit.width / 2, y: fit.y + fit.height / 2 };
  return placeAt(scale, fitCentre, centreOf(viewport), frame);
}

/** «1:1»: the nominal scale (×1, within the limits), keeping the point at the viewport's centre. */
export function actualSizeView(view: ZoomView, frame: ZoomFrame): ZoomView {
  const scale = clampScale(1, frame.limits);
  if (!isMeasured(frame.viewport)) return { ...view, scale };
  const centre = centreOf(frame.viewport);
  return placeAt(scale, toWorld(view, centre), centre, frame);
}

/** The room «reveal» leaves between a revealed box and the viewport's edge. */
export const REVEAL_MARGIN_PX = 16;

/** The pan (px) that brings [start, start + length] inside [margin, room − margin] on one axis. */
function revealAxis(start: number, length: number, room: number, margin: number): number {
  if (start < margin || length > room - 2 * margin) return margin - start;
  const overshoot = start + length - (room - margin);
  return overshoot > 0 ? -overshoot : 0;
}

/**
 * The least pan that shows `box` (drawing units) with REVEAL_MARGIN_PX around it, at the same
 * scale and clamped; a box larger than the viewport shows its top-left. For a focused handle or a
 * point the lab moves out of view.
 */
export function revealView(
  view: ZoomView,
  box: ZoomBox,
  frame: ZoomFrame,
  margin: number = REVEAL_MARGIN_PX,
): ZoomView {
  const { viewport } = frame;
  if (!isMeasured(viewport)) return { ...view };
  const corner = toScreen(view, box);
  const delta = {
    x: revealAxis(corner.x, box.width * view.scale, viewport.width, margin),
    y: revealAxis(corner.y, box.height * view.scale, viewport.height, margin),
  };
  if (delta.x === 0 && delta.y === 0) return { ...view };
  return panBy(view, delta, frame);
}

const midpoint = ([a, b]: ZoomPair): ZoomPoint => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const distance = ([a, b]: ZoomPair): number => Math.hypot(b.x - a.x, b.y - a.y);

/**
 * Two fingers moved from `from` to `to` (viewport px) since `start`: the scale follows their
 * distance and the drawing point under their first midpoint follows the midpoint.
 */
export function pinchView(
  start: ZoomView,
  from: ZoomPair,
  to: ZoomPair,
  frame: ZoomFrame,
): ZoomView {
  const before = distance(from);
  const factor = before > 0 ? distance(to) / before : 1;
  const scale = clampScale(start.scale * factor, frame.limits);
  return placeAt(scale, toWorld(start, midpoint(from)), midpoint(to), frame);
}

/**
 * The view a fraction `t` of the way from `a` to `b`: the scale geometrically, about the one point
 * the two views share (so a zoom about a point keeps that point still); a pure pan, in a line.
 */
export function interpolateView(a: ZoomView, b: ZoomView, t: number): ZoomView {
  if (t <= 0) return { ...a };
  if (t >= 1) return { ...b };
  const ratio = b.scale / a.scale;
  if (Math.abs(ratio - 1) < SCALE_EPSILON) {
    return { scale: a.scale, x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  }
  // b = a scaled by `ratio` about the fixed point f: b.offset = f + (a.offset − f) · ratio.
  const fixed = {
    x: (b.x - a.x * ratio) / (1 - ratio),
    y: (b.y - a.y * ratio) / (1 - ratio),
  };
  const k = ratio ** t;
  return {
    scale: a.scale * k,
    x: fixed.x + (a.x - fixed.x) * k,
    y: fixed.y + (a.y - fixed.y) * k,
  };
}

export function viewsEqual(a: ZoomView, b: ZoomView): boolean {
  return (
    Math.abs(a.scale / b.scale - 1) < SCALE_EPSILON &&
    Math.abs(a.x - b.x) < OFFSET_EPSILON_PX &&
    Math.abs(a.y - b.y) < OFFSET_EPSILON_PX
  );
}

/** A WheelEvent's deltaY in px, whatever its deltaMode (pixels, lines or pages). */
export function wheelDeltaPx(deltaY: number, deltaMode: number, pageHeight: number): number {
  if (deltaMode === DOM_DELTA_LINE) return deltaY * WHEEL_LINE_PX;
  if (deltaMode === DOM_DELTA_PAGE) return deltaY * pageHeight;
  return deltaY;
}

/** The zoom factor of a wheel delta (px): a wheel turned away (negative) zooms in. */
export function wheelZoomFactor(deltaPx: number): number {
  const factor = Math.exp(-deltaPx * WHEEL_ZOOM_RATE);
  return Math.min(WHEEL_MAX_FACTOR, Math.max(1 / WHEEL_MAX_FACTOR, factor));
}

/** «×2,5», «×1,4», «×1»: two significant digits, like the time factor (TimeScaleBadge). */
export function formatZoomFactor(scale: number): string {
  return `${TIMES_SIGN}${factorNumber(scale)}`;
}

/** «Zoom: 2,5 veces el tamaño real»; «Zoom: tamaño real» at ×1. */
export function zoomSpoken(scale: number): string {
  if (Math.abs(scale - 1) < ACTUAL_SIZE_SLACK) return 'Zoom: tamaño real';
  return `Zoom: ${factorNumber(scale)} veces el tamaño real`;
}
