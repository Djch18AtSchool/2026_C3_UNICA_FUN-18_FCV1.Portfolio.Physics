/**
 * Pure geometry of the route map's zoom (useZoomPan on the drone lab's plot). The zoom works on the
 * plot's drawing space: the plot area as it is at ×1, in CSS px, with the whole map window
 * (MAP_DOMAIN) in it. A view of that space says which part of the window the plot shows, and the
 * plot is given that part as its domains, so its axes, grid and route are always the real metres
 * (the drawing is not scaled, the window is moved). The plot keeps its aspect (the window's), so
 * its height does not change with the zoom. No React.
 */
import type { Domain, Scale } from '../../lab/plotScales';
import type { ScaleUnit } from '../../lab/scaleBarMath';
import type { ZoomBox, ZoomPoint, ZoomSize, ZoomView } from '../../lab/zoomMath';
import { MAP_DOMAIN } from './droneScene';

/** The plot area's size in CSS px (the zoom viewport); 0 × 0 before it is measured. */
export type PlotSize = ZoomSize;

/** The map's scale bar counts in metres: the window is 1 600 m wide. */
export const ROUTE_SCALE_UNITS: readonly ScaleUnit[] = [{ label: 'm', size: 1 }];

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

/**
 * The square of side 2·`radiusPx` centred where the map point `at` (m) is drawn at ×1, in the
 * zoom's drawing space: what `reveal` brings into view when a stop or the drone moves out of it.
 */
export function boxAroundPoint(at: ZoomPoint, plot: PlotSize, radiusPx: number): ZoomBox {
  const centre = {
    x: ((at.x - MAP_DOMAIN.x.min) / X_SPAN) * plot.width,
    y: ((MAP_DOMAIN.y.max - at.y) / Y_SPAN) * plot.height,
  };
  return {
    x: centre.x - radiusPx,
    y: centre.y - radiusPx,
    width: 2 * radiusPx,
    height: 2 * radiusPx,
  };
}
