/**
 * The route map's zoom: useZoomPan on the plot area plus what the map needs from it. The plot
 * area is the zoom's viewport and its size (measured by a second observer on the same element, as
 * the hook keeps its own to itself) turns the view into the part of the map window the plot shows
 * (routeZoom.ts) and the box `reveal` brings into view.
 *
 * SvgPlot fits its left margin to the widest y tick label, so the plot area changes by a few px
 * when a zoom or a pan changes the labels («1 250» to «600»). That size must not feed back into the
 * window it came from (a window near a label change could flip for ever), so the size the window
 * is computed from is kept until the plot changes by more than PLOT_SIZE_SLACK_PX: only a real
 * resize of the container moves it. The plot's own scales remain the truth for what is drawn.
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
/** The widest the margin fit moves the plot (its left margin: 52 to 40 px, and the height after it). */
const PLOT_SIZE_SLACK_PX = 16;

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

/** The plot size to compute the window from: the last one, unless the plot really changed. */
function settledSize(last: PlotSize, next: PlotSize): PlotSize {
  const isMeasured = last.width > 0 && last.height > 0;
  const isSlight =
    Math.abs(next.width - last.width) <= PLOT_SIZE_SLACK_PX &&
    Math.abs(next.height - last.height) <= PLOT_SIZE_SLACK_PX;
  return isMeasured && isSlight ? last : next;
}

export function useRouteZoom(): RouteZoom {
  const zoom = useZoomPan({ label: MAP_LABEL });
  const [plot, setPlotState] = useState<PlotSize>(UNMEASURED);
  const setPlot = useCallback(
    (next: PlotSize) => setPlotState((last) => settledSize(last, next)),
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
