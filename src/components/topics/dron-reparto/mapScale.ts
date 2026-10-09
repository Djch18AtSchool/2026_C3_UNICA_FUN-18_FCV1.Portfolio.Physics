import type { RouteStop } from '../../../lib/data/droneRoute';

export interface MapDomain {
  x: [number, number];
  y: [number, number];
}

export interface MapScale {
  width: number;
  height: number;
  /** Pixels per metre, the same on both axes. */
  pxPerMetre: number;
  x: (metres: number) => number;
  y: (metres: number) => number;
  xTicks: number[];
  yTicks: number[];
  plot: { left: number; right: number; top: number; bottom: number };
}

export const MAP_MARGIN = { top: 12, right: 24, bottom: 44, left: 58 } as const;
/** Candidate tick spacings (m), finest first; the first one at least MIN_TICK_GAP_PX apart wins. */
const TICK_STEPS_M = [200, 400, 500, 1000];
const MIN_TICK_GAP_PX = 48;

/** Extent of the stops plus `pad` metres on every side, room for the vectors and the labels. */
export function routeDomain(stops: readonly RouteStop[], pad: number): MapDomain {
  const xs = stops.map((stop) => stop.x);
  const ys = stops.map((stop) => stop.y);
  return {
    x: [Math.min(...xs) - pad, Math.max(...xs) + pad],
    y: [Math.min(...ys) - pad, Math.max(...ys) + pad],
  };
}

function tickStep(pxPerMetre: number): number {
  return (
    TICK_STEPS_M.find((step) => step * pxPerMetre >= MIN_TICK_GAP_PX) ??
    TICK_STEPS_M[TICK_STEPS_M.length - 1]
  );
}

function ticks([min, max]: [number, number], step: number): number[] {
  const first = Math.ceil(min / step);
  const last = Math.floor(max / step);
  return Array.from({ length: last - first + 1 }, (_, i) => (first + i) * step);
}

/**
 * An x–y map with equal scales: the pixels per metre are the largest that fit both the available
 * width and the maximum plot height, so a metre east and a metre north have the same length.
 */
export function buildMapScale(
  availableWidth: number,
  domain: MapDomain,
  maxPlotHeight: number,
): MapScale {
  const spanX = domain.x[1] - domain.x[0];
  const spanY = domain.y[1] - domain.y[0];
  const plotWidthLimit = Math.max(availableWidth - MAP_MARGIN.left - MAP_MARGIN.right, 1);
  const pxPerMetre = Math.min(plotWidthLimit / spanX, maxPlotHeight / spanY);
  const plot = {
    left: MAP_MARGIN.left,
    right: MAP_MARGIN.left + spanX * pxPerMetre,
    top: MAP_MARGIN.top,
    bottom: MAP_MARGIN.top + spanY * pxPerMetre,
  };
  return {
    width: Math.floor(plot.right + MAP_MARGIN.right),
    height: Math.ceil(plot.bottom + MAP_MARGIN.bottom),
    pxPerMetre,
    x: (metres) => plot.left + (metres - domain.x[0]) * pxPerMetre,
    y: (metres) => plot.bottom - (metres - domain.y[0]) * pxPerMetre,
    xTicks: ticks(domain.x, tickStep(pxPerMetre)),
    yTicks: ticks(domain.y, tickStep(pxPerMetre)),
    plot,
  };
}
