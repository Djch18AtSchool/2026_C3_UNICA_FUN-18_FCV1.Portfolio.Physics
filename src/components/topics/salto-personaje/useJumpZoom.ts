/**
 * The jump plot's zoom: useZoomPan on the plot area plus what the trajectory needs from it. The
 * plot area is the zoom's viewport and its size (measured by a second observer on the same
 * element, as the hook keeps its own to itself) turns the view into the part of the scene's window
 * the plot shows (jumpZoom.ts) and the box `revealPoint` brings into view. The same pattern as
 * Tema 1's route map (useRouteZoom), with a window that follows the jump instead of a fixed map.
 *
 * SvgPlot fits its left margin to the widest y tick label on a phone, so the plot area changes by
 * a few px when a zoom or a pan changes the labels («0,5» to «0,25»). That size must not feed back
 * into the window it came from (a window near a label change could flip for ever), so the size the
 * window is computed from is kept until the plot changes by more than PLOT_SIZE_SLACK_PX: only a
 * real resize of the container moves it. The plot's own scales remain the truth for what is drawn.
 */
import { useCallback, useMemo, useState, type FocusEvent } from 'react';
import { useZoomPan, type ZoomPan, type ZoomViewportProps } from '../../lab/useZoomPan';
import type { ZoomPoint } from '../../lab/zoomMath';
import { plotPointBox, zoomedWindow, type PlotSize, type SceneWindow } from './jumpZoom';

/** A knob is 14 px across with a ring of 11 px: this far from its centre stays in view. */
const REVEAL_RADIUS_PX = 12;
/** Before the plot is measured (the server, the first render): nothing to scale or reveal. */
const UNMEASURED: PlotSize = Object.freeze({ width: 0, height: 0 });
const PLOT_LABEL = 'Trayectoria del salto';
/** The widest the margin fit moves the plot (its left margin by a character: 8 px, and the height after it). */
const PLOT_SIZE_SLACK_PX = 16;

export interface JumpZoom {
  readonly zoom: ZoomPan;
  /** The zoom's viewport props, with the plot's size observed too: spread on the viewport div. */
  readonly viewportProps: ZoomViewportProps;
  /** The part of the scene's window on show, as the plot's domains (m). */
  readonly domains: SceneWindow;
  /**
   * Brings the knob at `point` (px from the plot area's top-left corner, as drawn now) into view,
   * as the zoom's reveal does for a focused handle.
   */
  revealPoint(point: ZoomPoint): void;
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

/** Whether the browser shows this element's focus (reached by keyboard); true where it cannot tell. */
function isFocusShown(element: EventTarget): boolean {
  if (!(element instanceof Element)) return true;
  try {
    return element.matches(':focus-visible');
  } catch {
    return true;
  }
}

/** `base` is the window the lab frames for the current jump: the zoom's ×1. */
export function useJumpZoom(base: SceneWindow): JumpZoom {
  const zoom = useZoomPan({ label: PLOT_LABEL });
  const [plot, setPlotState] = useState<PlotSize>(UNMEASURED);
  const setPlot = useCallback(
    (next: PlotSize) => setPlotState((last) => settledSize(last, next)),
    [],
  );
  const hookRef = zoom.viewportProps.ref;
  const ref = useMemo(() => observingRef(hookRef, setPlot), [hookRef, setPlot]);
  const { reveal: revealBox, view } = zoom;
  // A press on a handle focuses it by script without showing the focus: that must not pan the
  // view (a handle within 16 px of the plot's edge would jump from under the pointer). Only a
  // focus the browser shows (Tab) brings the handle into view.
  const { onFocus: revealFocused } = zoom.viewportProps;
  const onFocus = useCallback(
    (event: FocusEvent<HTMLElement>) => {
      if (isFocusShown(event.target)) revealFocused(event);
    },
    [revealFocused],
  );
  const revealPoint = useCallback(
    (point: ZoomPoint) => revealBox(plotPointBox(point, view, REVEAL_RADIUS_PX)),
    [revealBox, view],
  );
  return {
    zoom,
    viewportProps: { ...zoom.viewportProps, ref, onFocus },
    domains: zoomedWindow(base, view, plot),
    revealPoint,
  };
}
