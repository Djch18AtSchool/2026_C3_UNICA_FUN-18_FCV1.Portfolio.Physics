/**
 * Pure geometry of the route map's zoom (useZoomPan on the drone lab's plot). The zoom works on the
 * plot's drawing space: the plot area as it is at ×1, in CSS px, with the whole map window
 * (MAP_DOMAIN) in it. A view of that space says which part of the window the plot shows, and the
 * plot is given that part as its domains, so its axes, grid and route are always the real metres
 * (the drawing is not scaled, the window is moved). The plot keeps its aspect (the window's), so
 * its height does not change with the zoom. No React.
 */
import type { Domain, Scale } from '../../lab/plotScales';
import { DRONE_ROUTE } from '../../../lib/data/droneRoute';
import { SCALE_BAR_MAX_PX, SCALE_BAR_MIN_PX, type ScaleUnit } from '../../lab/scaleBarMath';
import type { ZoomBox, ZoomPoint, ZoomSize, ZoomView } from '../../lab/zoomMath';
import { MAP_DOMAIN } from './droneScene';

/** The plot area's size in CSS px (the zoom viewport); 0 × 0 before it is measured. */
export type PlotSize = ZoomSize;

/** The map's scale bar counts in metres: the window is 1 600 m wide. */
export const ROUTE_SCALE_UNITS: readonly ScaleUnit[] = [{ label: 'm', size: 1 }];

/**
 * Characters of the widest y tick label of any window the zoom can show, «1 250» of the whole map:
 * SvgPlot reserves the left margin of a compact plot for it (minYLabelChars) at every zoom, so the
 * plot's size, and the page below it, do not change when the labels do (routeZoom.test.ts walks
 * the windows from ×1 to ×8 over the whole map to keep it true).
 */
export const ROUTE_Y_LABEL_CHARS = 5;

const X_SPAN = MAP_DOMAIN.x.max - MAP_DOMAIN.x.min;
const Y_SPAN = MAP_DOMAIN.y.max - MAP_DOMAIN.y.min;

const isMeasured = ({ width, height }: PlotSize) => width > 0 && height > 0;

/**
 * The part of the map window the plot shows at `view`, as the plot's x and y domains (m): the
 * whole window at the identity view, 1/scale of it when zoomed, moved by the pan. The window
 * itself while the plot is not measured.
 */
export function zoomedWindow(view: ZoomView, plot: PlotSize): { x: Domain; y: Domain } {
  if (!isMeasured(plot)) return { x: MAP_DOMAIN.x, y: MAP_DOMAIN.y };
  // Drawing px of the plot's left and right edges (screen = drawing · scale + offset), as a share
  // of the plot's width: where in the window they fall.
  const left = -view.x / view.scale / plot.width;
  const right = (plot.width - view.x) / view.scale / plot.width;
  const top = -view.y / view.scale / plot.height;
  const bottom = (plot.height - view.y) / view.scale / plot.height;
  return {
    x: { min: MAP_DOMAIN.x.min + left * X_SPAN, max: MAP_DOMAIN.x.min + right * X_SPAN },
    // y grows upward on the map and downward on the screen.
    y: { min: MAP_DOMAIN.y.max - bottom * Y_SPAN, max: MAP_DOMAIN.y.max - top * Y_SPAN },
  };
}

/**
 * CSS px per metre along the plot's x axis as the plot draws it: the scale bar's scale, read from
 * the plot's own scale so the bar says what is drawn whatever the zoom or the plot's margins.
 */
export function plotPxPerMetre(x: Scale): number {
  return Math.abs(x.range[1] - x.range[0]) / (x.domain.max - x.domain.min);
}

/** Where the map point `at` (m) is drawn at ×1, in the zoom's drawing space (plot px). */
export function mapToDrawing(at: ZoomPoint, plot: PlotSize): ZoomPoint {
  return {
    x: ((at.x - MAP_DOMAIN.x.min) / X_SPAN) * plot.width,
    y: ((MAP_DOMAIN.y.max - at.y) / Y_SPAN) * plot.height,
  };
}

/**
 * What the map's zoom buttons keep in place (R33), in m: the middle of the leg «Tramo» plays, or
 * in «Ruta» the centroid of the stops (depot included), the middle of what is flown.
 */
export function routeFocus(
  stops: readonly ZoomPoint[],
  leg?: readonly [ZoomPoint, ZoomPoint],
): ZoomPoint {
  const points = leg ?? stops;
  const sum = points.reduce((total, p) => ({ x: total.x + p.x, y: total.y + p.y }), { x: 0, y: 0 });
  return { x: sum.x / points.length, y: sum.y / points.length };
}

/**
 * The square of side 2·`radiusPx` centred where the map point `at` (m) is drawn at ×1, in the
 * zoom's drawing space: what `reveal` brings into view when a stop or the drone moves out of it.
 */
export function boxAroundPoint(at: ZoomPoint, plot: PlotSize, radiusPx: number): ZoomBox {
  const centre = mapToDrawing(at, plot);
  return {
    x: centre.x - radiusPx,
    y: centre.y - radiusPx,
    width: 2 * radiusPx,
    height: 2 * radiusPx,
  };
}

/** The scale bar's right inset in the plot, and the air it keeps from stop C's knob (px). */
export const ROUTE_BAR_INSET_PX = 8;
export const ROUTE_BAR_GAP_PX = 8;
/** A stop's knob, with its focus ring, reaches this far from its centre (px). */
export const ROUTE_KNOB_RADIUS_PX = 10;

/**
 * The longest scale bar (px) that, at the top right of a plot `plotWidth` px wide, stays clear of
 * stop C's knob in the declared route's whole window: C is the stop nearest that corner, and on a
 * phone's plot the 1·2·5 bar of 160 px would reach it. At most the shared maximum.
 */
export function routeScaleBarMaxPx(plotWidth: number): number {
  const stopC = DRONE_ROUTE.stops[3];
  const cRight = ((stopC.x - MAP_DOMAIN.x.min) / X_SPAN) * plotWidth + ROUTE_KNOB_RADIUS_PX;
  const room = plotWidth - ROUTE_BAR_INSET_PX - ROUTE_BAR_GAP_PX - cRight;
  return Math.min(SCALE_BAR_MAX_PX, Math.max(SCALE_BAR_MIN_PX, room));
}

/**
 * ZoomControls' column without «1:1» (README «Zoom y desplazamiento»: 42 × 154 px), in the plot's
 * bottom-right corner, ROUTE_BAR_INSET_PX in.
 */
export const ROUTE_ZOOM_COLUMN_PX = { width: 42, height: 154 } as const;
/**
 * The scale bar's line, this far (px) below the plot's top: the 8 px ticks, the 4 px gap and the
 * 12 px words above it, with 4 px of air.
 */
export const ROUTE_BAR_BASELINE_PX = 28;
/** The least air (px) between the bar's line and the top of the button column under it. */
const ROUTE_BAR_COLUMN_AIR_PX = 4;
/**
 * Over the plot, the bar's line sits this far (px) above the plot area, in its 30 px top margin:
 * its words reach the svg's top, and its line clears the column, which at 320 px rises a pixel
 * over the plot.
 */
const ROUTE_BAR_ABOVE_PX = 6;
/**
 * How far past the plot area the map's overlay may draw (SvgPlot overlayBleed): the bar over the
 * plot reaches 30 px up (its line 6 px over the plot, 24 px of ticks and words), and 2 more of
 * the words' halo. Only the bar uses it: the marks stay inside the foreign object, which clips.
 */
export const ROUTE_OVERLAY_BLEED_PX = 32;

/** The plot area in the svg's user units: its left and top edges and its size. */
export interface RoutePlotArea {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Where ScaleBarSvg draws (its line's right end, anchor end) and how long it may be. */
export interface RouteScaleBarSpot {
  x: number;
  y: number;
  maxPx: number;
  /** In the plot's top margin, right of the y title: the column fills the plot's right side. */
  isAbovePlot: boolean;
}

/**
 * The scale bar's place: the plot's top-right corner, clear of stop C (routeScaleBarMaxPx), while
 * the button column in the bottom-right corner leaves it room; in a shorter plot (Tema 1 at 320
 * to 355 px of window) the column reaches the corner, so the bar goes just over the plot, in the
 * top margin, right-aligned with the plot and at its shortest maximum (the y title is on the left).
 */
export function routeScaleBarSpot(area: RoutePlotArea): RouteScaleBarSpot {
  const columnTop = area.height - ROUTE_BAR_INSET_PX - ROUTE_ZOOM_COLUMN_PX.height;
  if (columnTop >= ROUTE_BAR_BASELINE_PX + ROUTE_BAR_COLUMN_AIR_PX) {
    return {
      x: area.left + area.width - ROUTE_BAR_INSET_PX,
      y: area.top + ROUTE_BAR_BASELINE_PX,
      maxPx: routeScaleBarMaxPx(area.width),
      isAbovePlot: false,
    };
  }
  return {
    x: area.left + area.width,
    y: area.top - ROUTE_BAR_ABOVE_PX,
    maxPx: SCALE_BAR_MIN_PX,
    isAbovePlot: true,
  };
}
