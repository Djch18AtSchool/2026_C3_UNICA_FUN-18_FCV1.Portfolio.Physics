/**
 * The route map's zoom: useZoomPan on the plot area plus what the map needs from it. The plot
 * area is the zoom's viewport and its size (measured by a second observer on the same element, as
 * the hook keeps its own to itself) turns the view into the part of the map window the plot shows
 * (routeZoom.ts) and the box `reveal` brings into view.
 *
 * The plot area changes only when its container does: RouteMapLab gives SvgPlot the room of its
 * widest y label at every zoom (ROUTE_Y_LABEL_CHARS), so the size the window is computed from does
 * not depend on the window.
 */
import { useCallback, useMemo, useState } from 'react';
import type { Domain } from '../../lab/plotScales';
import { useZoomPan, type ZoomPan, type ZoomViewportProps } from '../../lab/useZoomPan';
import type { ZoomPoint } from '../../lab/zoomMath';
import { boxAroundPoint, zoomedWindow, type PlotSize } from './routeZoom';

/** A stop's or the drone's knob is 20 px across: this far from its centre stays in view. */
const REVEAL_RADIUS_PX = 12;
/** Before the plot is measured (the server, the first render): nothing to scale or reveal. */
const UNMEASURED: PlotSize = Object.freeze({ width: 0, height: 0 });
const MAP_LABEL = 'Mapa de la ruta';

export interface RouteZoom {
  readonly zoom: ZoomPan;
  /** The zoom's viewport props, with the plot's size observed too: spread on the viewport div. */
  readonly viewportProps: ZoomViewportProps;
  /** The part of the map window on show, as the plot's domains (m). */
  readonly domains: { x: Domain; y: Domain };
  /** Brings the map point `at` (m) into view, as the zoom's reveal does for a focused handle. */
  reveal(at: ZoomPoint): void;
}

type ObservedRef = ZoomViewportProps['ref'];

/** The hook's ref callback, plus an observer that keeps the element's size in `setPlot`. */
function observingRef(hookRef: ObservedRef, setPlot: (size: PlotSize) => void): ObservedRef {
  return (element) => {
    const release = hookRef(element);
    if (!element || typeof ResizeObserver === 'undefined') return release;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setPlot({ width, height });
    });
    observer.observe(element);
    return () => {
      release();
      observer.disconnect();
    };
  };
}

export function useRouteZoom(): RouteZoom {
  const zoom = useZoomPan({ label: MAP_LABEL });
  const [plot, setPlotState] = useState<PlotSize>(UNMEASURED);
  const setPlot = useCallback(
    (next: PlotSize) =>
      setPlotState((last) =>
        last.width === next.width && last.height === next.height ? last : next,
      ),
    [],
  );
  const hookRef = zoom.viewportProps.ref;
  const ref = useMemo(() => observingRef(hookRef, setPlot), [hookRef, setPlot]);
  const { reveal: revealBox } = zoom;
  const reveal = useCallback(
    (at: ZoomPoint) => revealBox(boxAroundPoint(at, plot, REVEAL_RADIUS_PX)),
    [revealBox, plot],
  );
  return {
    zoom,
    viewportProps: { ...zoom.viewportProps, ref },
    domains: zoomedWindow(zoom.view, plot),
    reveal,
  };
}
