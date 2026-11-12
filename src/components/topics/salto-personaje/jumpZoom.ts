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
import type { ScaleUnit } from '../../lab/scaleBarMath';
import {
  IDENTITY_VIEW,
  toWorld,
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

const isMeasured = ({ width, height }: PlotSize) => width > 0 && height > 0;

/** The scene's domains as the window the plot shows at ×1. */
export const sceneWindow = ({ x, y }: SceneWindow): SceneWindow => ({ x, y });

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
  if (!isMeasured(plot) || viewsEqual(view, IDENTITY_VIEW)) return sceneWindow(base);
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

/**
 * The box of 2·`radiusPx` (screen px) around a point of the plot area, given in px from its
 * top-left corner, as the zoom's drawing units: what `reveal` brings into view for a knob.
 */
export function plotPointBox(point: ZoomPoint, view: ZoomView, radiusPx: number): ZoomBox {
  const centre = toWorld(view, point);
  const radius = radiusPx / view.scale;
  return { x: centre.x - radius, y: centre.y - radius, width: 2 * radius, height: 2 * radius };
}
