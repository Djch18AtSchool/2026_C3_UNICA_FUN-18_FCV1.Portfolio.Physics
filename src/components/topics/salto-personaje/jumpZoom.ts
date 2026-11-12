/**
 * Pure geometry of the jump plot's zoom (useZoomPan on the lab's plot area). As in Tema 1's map,
 * the zoom works on the plot's drawing space: the plot area as it is at ×1, in CSS px, with the
 * scene's window (sceneDomains) in it. A view of that space says which part of the window the plot
 * shows, and the plot is given that part as its domains, so its axes, grid and trajectory are
 * always the real metres (the drawing is not scaled, the window is moved). The window keeps the
 * plot's aspect, so SvgPlot's equal units hold and the figure's height does not change with the
 * zoom. The vectors are velocities, not distances: they keep their length on screen. No React.
 */
import type { Domain, Scale } from '../../lab/plotScales';
import { SCALE_BAR_MAX_PX, SCALE_BAR_MIN_PX, type ScaleUnit } from '../../lab/scaleBarMath';
import {
  IDENTITY_VIEW,
  viewsEqual,
  type ZoomBox,
  type ZoomPoint,
  type ZoomSize,
  type ZoomView,
} from '../../lab/zoomMath';
import type { JUMP_LIMITS } from './jumpModel';
import { launchLengthPerMs } from './jumpScene';

/** The plot area's size in CSS px (the zoom viewport); 0 × 0 before it is measured. */
export type PlotSize = ZoomSize;

/** Part of the scene on show: the plot's x and y domains (m). */
export interface SceneWindow {
  x: Domain;
  y: Domain;
}

/** The scale bar counts in metres: a jump is a few metres wide (down to centimetres zoomed in). */
export const JUMP_SCALE_UNITS: readonly ScaleUnit[] = [{ label: 'm', size: 1 }];

/** Height of the strip under the plot that holds the zoom buttons (a 42 px row and 3 px of air). */
export const ZOOM_STRIP_PX = 48;

/**
 * Characters of the widest y tick label of any window the zoom can show, «3,25»: SvgPlot reserves
 * the left margin of a compact plot for it (minYLabelChars) at every zoom, so the plot's size, and
 * the page below it, do not change when the labels do (jumpZoom.test.ts walks the windows of the
 * presets and of the corners of every slider, from ×1 to ×8, to keep it true).
 */
export const JUMP_Y_LABEL_CHARS = 4;

const isMeasured = ({ width, height }: PlotSize) => width > 0 && height > 0;

/** The part of `domain` an axis of `size` px shows at this scale and pan offset (screen px). */
function slice(domain: Domain, offset: number, scale: number, size: number): Domain {
  const span = domain.max - domain.min;
  const left = -offset / scale / size;
  const right = (size - offset) / scale / size;
  return { min: domain.min + left * span, max: domain.min + right * span };
}

/**
 * The part of `base` the plot shows at `view`, as its x and y domains (m): the whole window at the
 * identity view, 1/scale of it when zoomed, moved by the pan. The window itself while the plot is
 * not measured (the identity view returns the base's own numbers, not a sum that rounds). y grows
 * upward on the plot and downward on the screen.
 */
export function zoomedWindow(base: SceneWindow, view: ZoomView, plot: PlotSize): SceneWindow {
  if (!isMeasured(plot) || viewsEqual(view, IDENTITY_VIEW)) return { x: base.x, y: base.y };
  const x = slice(base.x, view.x, view.scale, plot.width);
  const fromTop = slice({ min: -base.y.max, max: -base.y.min }, view.y, view.scale, plot.height);
  return { x, y: { min: -fromTop.max, max: -fromTop.min } };
}

/**
 * CSS px per metre along the plot's x axis as the plot draws it: the scale bar's scale, read from
 * the plot's own scale so the bar says what is drawn whatever the zoom or the plot's margins.
 */
export function plotPxPerMetre(x: Scale): number {
  return Math.abs(x.range[1] - x.range[0]) / (x.domain.max - x.domain.min);
}

/**
 * Metres drawn per m/s of the launch and velocity vectors at this zoom: the lab's own length
 * divided by the scale, so an arrow keeps the same length in px (a velocity is not a distance, and
 * a zoomed one would leave the plot and take its handle with it).
 */
export function steadyLengthPerMs(
  baseY: Domain,
  scale: number,
  limits: typeof JUMP_LIMITS,
): number {
  return launchLengthPerMs(baseY, limits) / scale;
}

/** Sub-pixel rounding between the size SvgPlot computes and the one the browser reports. */
const SIZE_SLACK_PX = 0.5;

/** Whether the plot the zoom measured is the one SvgPlot draws (it measures a frame later). */
export function isPlotDrawn(measured: PlotSize, drawn: PlotSize): boolean {
  return (
    isMeasured(measured) &&
    Math.abs(measured.width - drawn.width) < SIZE_SLACK_PX &&
    Math.abs(measured.height - drawn.height) < SIZE_SLACK_PX
  );
}
/** The plot area's size and corner in the svg's user units, from the plot's scales. */
export function plotAreaOf({ x, y }: { x: Scale; y: Scale }) {
  const [left, right] = [Math.min(...x.range), Math.max(...x.range)];
  const [top, bottom] = [Math.min(...y.range), Math.max(...y.range)];
  return { left, top, width: right - left, height: bottom - top };
}

/**
 * The square of side 2·`radiusPx` (screen px at `scale`) centred where the point `at` (m) is drawn
 * in the window `base` at ×1, in the zoom's drawing space: what `reveal` brings into view for a
 * handle. From metres, so it does not depend on the window of the render that asks for it.
 */
export function metresBox(
  at: ZoomPoint,
  base: SceneWindow,
  plot: PlotSize,
  radiusPx: number,
  scale: number,
): ZoomBox {
  const centre = {
    x: ((at.x - base.x.min) / (base.x.max - base.x.min)) * plot.width,
    y: ((base.y.max - at.y) / (base.y.max - base.y.min)) * plot.height,
  };
  const radius = radiusPx / scale;
  return { x: centre.x - radius, y: centre.y - radius, width: 2 * radius, height: 2 * radius };
}

/** Where the launch vector's tip is (m from the launch point) when a m/s is drawn `lengthPerMs` long. */
export function launchTipMetres(
  { v0, vx }: { v0: number; vx: number },
  lengthPerMs: number,
): ZoomPoint {
  return { x: vx * lengthPerMs, y: v0 * lengthPerMs };
}

/** The scale bar's right inset in the plot (px) and its baseline from the plot's top: see below. */
export const SCALE_BAR_INSET_PX = 8;
export const SCALE_BAR_BASELINE_PX = 32;
/** The longest bar is this share of the plot's width, so on a phone's plot it stays short. */
const SCALE_BAR_WIDTH_SHARE = 0.5;

/**
 * The longest scale bar (px) for a plot `plotWidth` px wide: half its width at most, between the
 * shared minimum and maximum. A phone's 230 px plot gets 115 px bars instead of 160.
 */
export function jumpScaleBarMaxPx(plotWidth: number): number {
  return Math.min(SCALE_BAR_MAX_PX, Math.max(SCALE_BAR_MIN_PX, plotWidth * SCALE_BAR_WIDTH_SHARE));
}
