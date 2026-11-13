/**
 * The route map's zoom: useZoomPan on the plot area plus what the map needs from it. The plot
 * area is the zoom's viewport and its size (the hook's own measure, `viewportSize`) turns the view
 * into the part of the map window the plot shows (routeZoom.ts) and the box `reveal` brings into
 * view.
 *
 * The plot area changes only when its container does: RouteMapLab gives SvgPlot the room of its
 * widest y label at every zoom (ROUTE_Y_LABEL_CHARS), so the size the window is computed from does
 * not depend on the window.
 */
import { useCallback, useRef } from 'react';
import type { Domain } from '../../lab/plotScales';
import { useZoomPan, type ZoomPan, type ZoomViewportProps } from '../../lab/useZoomPan';
import type { ZoomPoint } from '../../lab/zoomMath';
import { boxAroundPoint, mapToDrawing, zoomedWindow, type PlotSize } from './routeZoom';

/** A stop's or the drone's knob is 20 px across: this far from its centre stays in view. */
const REVEAL_RADIUS_PX = 12;
const MAP_LABEL = 'Mapa de la ruta';

export interface RouteZoom {
  readonly zoom: ZoomPan;
  /** The zoom's viewport props: spread on the viewport div. */
  readonly viewportProps: ZoomViewportProps;
  /** The part of the map window on show, as the plot's domains (m). */
  readonly domains: { x: Domain; y: Domain };
  /** Brings the map point `at` (m) into view, as the zoom's reveal does for a focused handle. */
  reveal(at: ZoomPoint): void;
}

/**
 * `focus` (m) is what the buttons and keys zoom about (R33; routeFocus): the leg's middle, or the
 * route's centroid.
 */
export function useRouteZoom(focus?: ZoomPoint): RouteZoom {
  const anchorRef = useRef<ZoomPoint | undefined>(undefined);
  const zoom = useZoomPan({ label: MAP_LABEL, anchor: () => anchorRef.current });
  const plot: PlotSize = zoom.viewportSize;
  anchorRef.current = focus ? mapToDrawing(focus, plot) : undefined;
  const { reveal: revealBox } = zoom;
  const reveal = useCallback(
    (at: ZoomPoint) => revealBox(boxAroundPoint(at, plot, REVEAL_RADIUS_PX)),
    [revealBox, plot],
  );
  return {
    zoom,
    viewportProps: zoom.viewportProps,
    domains: zoomedWindow(zoom.view, plot),
    reveal,
  };
}
