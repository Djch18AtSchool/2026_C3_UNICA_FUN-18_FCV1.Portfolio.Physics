/**
 * The jump plot's zoom: useZoomPan on the plot area plus what the trajectory needs from it. The
 * plot area is the zoom's viewport and its size (the hook's own measure, `viewportSize`) turns the
 * view into the part of the scene's window the plot shows (jumpZoom.ts) and the box `revealAt`
 * brings into view. The same pattern as Tema 1's route map (useRouteZoom), with a window that
 * follows the jump instead of a fixed map.
 *
 * The plot area changes only when its container does, and when the jump changes shape (equal
 * units: a taller jump makes a taller plot): JumpCanvas gives SvgPlot the room of its widest y
 * label at every zoom (JUMP_Y_LABEL_CHARS), so the labels do not move it. The observer reports a
 * frame after SvgPlot draws a new size, so `isPlotDrawn` tells when the size the window is
 * computed from is the one on screen (a reveal waits for that).
 */
import { useCallback, useRef } from 'react';
import { useZoomPan, type ZoomPan, type ZoomViewportProps } from '../../lab/useZoomPan';
import type { ZoomPoint } from '../../lab/zoomMath';
import { isPlotDrawn, metresBox, zoomedWindow, type PlotSize, type SceneWindow } from './jumpZoom';

/** A knob is 14 px across with a ring of 11 px: this far from its centre stays in view. */
const REVEAL_RADIUS_PX = 12;
/** Before the plot is measured (the server, the first render): nothing to scale or reveal. */
const UNMEASURED: PlotSize = Object.freeze({ width: 0, height: 0 });
const PLOT_LABEL = 'Trayectoria del salto';

export interface JumpZoom {
  readonly zoom: ZoomPan;
  /** The zoom's viewport props: spread on the viewport div. */
  readonly viewportProps: ZoomViewportProps;
  /** The part of the scene's window on show, as the plot's domains (m). */
  readonly domains: SceneWindow;
  /**
   * Brings the point `at` (m from the launch point) into view, as the zoom's reveal does for a
   * handle.
   */
  revealAt(at: ZoomPoint): void;
  /** The plot layer says what size SvgPlot drew (in a layout effect, no render). */
  noteDrawn(drawn: PlotSize): void;
  /** Whether the size the zoom measured is the one SvgPlot last drew. */
  isPlotSettled(): boolean;
  /** The plot size the window is computed from: changes when the observer reports a new one. */
  readonly plot: PlotSize;
}

/** `base` is the window the lab frames for the current jump: the zoom's ×1. */
export function useJumpZoom(base: SceneWindow): JumpZoom {
  const zoom = useZoomPan({ label: PLOT_LABEL });
  const plot: PlotSize = zoom.viewportSize;
  const drawnRef = useRef<PlotSize>(UNMEASURED);
  const noteDrawn = useCallback((drawn: PlotSize) => {
    drawnRef.current = drawn;
  }, []);
  const isPlotSettled = useCallback(() => isPlotDrawn(plot, drawnRef.current), [plot]);
  const { reveal: revealBox, view } = zoom;
  const revealAt = useCallback(
    (at: ZoomPoint) => revealBox(metresBox(at, base, plot, REVEAL_RADIUS_PX, view.scale)),
    [revealBox, base, plot, view.scale],
  );
  return {
    zoom,
    viewportProps: zoom.viewportProps,
    domains: zoomedWindow(base, view, plot),
    revealAt,
    noteDrawn,
    isPlotSettled,
    plot,
  };
}
