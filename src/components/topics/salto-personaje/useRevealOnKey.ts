/**
 * Brings a handle back into the zoomed plot after a key moved it. The move changes the jump, and
 * with it the window's shape and the plot's height; the plot's size is observed a frame after it
 * is drawn, so the reveal waits until the size the zoom works with is the one on screen
 * (`isPlotSettled`) and then asks for the handle's place in metres: there is no geometry of an
 * earlier render to go wrong. It runs after useZoomPan's own effects (declared after them, in the
 * same component), so the view it reveals from is the one the new plot size left.
 */
import { useCallback, useEffect, useRef } from 'react';
import type { ZoomPoint } from '../../lab/zoomMath';
import type { JumpZoom } from './useJumpZoom';

export type KeyMoved = 'launch' | 'marker';

export interface RevealOnKeyInput {
  jumpZoom: JumpZoom;
  /** Where the launch vector's tip and the marker are now (m from the launch point). */
  launch: ZoomPoint;
  marker: ZoomPoint;
}

/** Returns the callback the handles call when a key really moved them, and the one to drop it. */
export function useRevealOnKey({ jumpZoom, launch, marker }: RevealOnKeyInput) {
  const pending = useRef<KeyMoved | null>(null);
  const { revealAt, isPlotSettled, plot } = jumpZoom;

  useEffect(() => {
    const moved = pending.current;
    if (!moved || !isPlotSettled()) return;
    pending.current = null;
    revealAt(moved === 'launch' ? launch : marker);
  }, [revealAt, isPlotSettled, plot, launch.x, launch.y, marker.x, marker.y]);

  const onKeyMove = useCallback((moved: KeyMoved) => {
    pending.current = moved;
  }, []);
  const onKeyDone = useCallback(() => {
    pending.current = null;
  }, []);
  return { onKeyMove, onKeyDone };
}
