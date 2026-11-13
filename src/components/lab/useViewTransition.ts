/**
 * The glide of useZoomPan's button, key and reveal moves: from the view shown to a target in
 * ZOOM_TRANSITION_MS, or a jump under reduced motion. A second move during a glide starts from
 * where the first was heading (`destination`), so two quick presses add up.
 */
import { useCallback, useEffect, useRef } from 'react';
import { useMotionReduced } from './useMotionReduced';
import { interpolateView, viewsEqual, type ZoomView } from './zoomMath';

/** A button or key zoom glides this long (auditoría §8: 200 ms), unless motion is reduced. */
export const ZOOM_TRANSITION_MS = 200;

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

export interface ViewTransition {
  animateTo(target: ZoomView): void;
  /** Stops a glide where it is (a gesture takes over). */
  stop(): void;
  /** Where the view is heading: the glide's target, or the view itself. */
  destination(): ZoomView;
}

export function useViewTransition(
  commit: (view: ZoomView) => void,
  viewRef: { current: ZoomView },
): ViewTransition {
  const isReduced = useMotionReduced();
  const isReducedRef = useRef(isReduced);
  isReducedRef.current = isReduced;
  const frameId = useRef<number | undefined>(undefined);
  const targetRef = useRef<ZoomView | undefined>(undefined);

  const stop = useCallback(() => {
    if (frameId.current !== undefined) cancelAnimationFrame(frameId.current);
    frameId.current = undefined;
    targetRef.current = undefined;
  }, []);

  const animateTo = useCallback(
    (target: ZoomView) => {
      stop();
      const from = viewRef.current;
      if (isReducedRef.current || viewsEqual(from, target)) {
        commit(target);
        return;
      }
      const startedAt = performance.now();
      targetRef.current = target;
      const tick = () => {
        const progress = Math.min(1, (performance.now() - startedAt) / ZOOM_TRANSITION_MS);
        commit(interpolateView(from, target, easeOutCubic(progress)));
        frameId.current = progress < 1 ? requestAnimationFrame(tick) : undefined;
        if (progress >= 1) targetRef.current = undefined;
      };
      frameId.current = requestAnimationFrame(tick);
    },
    [commit, stop, viewRef],
  );

  useEffect(() => stop, [stop]);
  const destination = useCallback(() => targetRef.current ?? viewRef.current, [viewRef]);
  return { animateTo, stop, destination };
}
