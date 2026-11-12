/**
 * The canvas element of useZoomPan: its measured size (a ResizeObserver), the native non-passive
 * wheel listener (React's own is passive), both attached in a React 19 ref callback and removed by
 * its cleanup; and the style that depends on the view (touch-action, cursor).
 */
import { useCallback, useState, type CSSProperties } from 'react';
import type { ZoomGestures } from './useZoomGestures';
import type { ZoomFrame, ZoomSize, ZoomView } from './zoomMath';

export const UNMEASURED: ZoomSize = Object.freeze({ width: 0, height: 0 });
/** Slack on sizes and limits, so ×8 reached by steps of √2 counts as ×8. */
export const ZOOM_EPSILON = 1e-9;

export function useZoomViewport(onWheel: ZoomGestures['onWheel']) {
  const [size, setSize] = useState<ZoomSize>(UNMEASURED);
  const ref = useCallback(
    (element: HTMLDivElement | null) => {
      if (!element) return () => undefined;
      const handleWheel = (event: WheelEvent) => onWheel(event, element);
      element.addEventListener('wheel', handleWheel, { passive: false });
      const observer =
        typeof ResizeObserver === 'undefined'
          ? undefined
          : new ResizeObserver(([entry]) => {
              const { width, height } = entry.contentRect;
              setSize((last) =>
                last.width === width && last.height === height ? last : { width, height },
              );
            });
      observer?.observe(element);
      return () => {
        element.removeEventListener('wheel', handleWheel);
        observer?.disconnect();
      };
    },
    [onWheel],
  );
  return { size, ref };
}

/** Whether the drawing overflows the viewport at this view (so a drag or an arrow moves it). */
export function isPannableAt(view: ZoomView, frame: ZoomFrame): boolean {
  const { viewport, bounds } = frame;
  if (viewport.width <= 0 || viewport.height <= 0) return false;
  return (
    bounds.width * view.scale > viewport.width + ZOOM_EPSILON ||
    bounds.height * view.scale > viewport.height + ZOOM_EPSILON
  );
}

/**
 * Touch: while the drawing fits, a vertical swipe scrolls the page (pan-y; the browser's own pinch
 * is off, so a pinch reaches the canvas); once zoomed in, one finger pans the drawing (none).
 */
export function viewportStyle(isPannable: boolean, isPanning: boolean): CSSProperties {
  return {
    touchAction: isPannable ? 'none' : 'pan-y',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    cursor: isPanning ? 'grabbing' : isPannable ? 'grab' : undefined,
  };
}
