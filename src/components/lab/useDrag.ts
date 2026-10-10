import { useCallback, useMemo, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { svgPointFromClient } from './dragMath';

/** A point reported during a drag, in the owner svg's user units (its viewBox space). */
export interface DragPoint {
  x: number;
  y: number;
  phase: 'start' | 'move' | 'end';
}

/** The handler set and style `useDrag` hands to a draggable SVG handle. */
export interface DragHandlers {
  onPointerDown(event: ReactPointerEvent<SVGGraphicsElement>): void;
  onPointerMove(event: ReactPointerEvent<SVGGraphicsElement>): void;
  onPointerUp(event: ReactPointerEvent<SVGGraphicsElement>): void;
  onPointerCancel(event: ReactPointerEvent<SVGGraphicsElement>): void;
  onLostPointerCapture(event: ReactPointerEvent<SVGGraphicsElement>): void;
  style: { touchAction: 'none' };
  /** Attaches the touch guard (see preventTouchPan); spread with the handlers onto the handle. */
  ref(element: SVGGraphicsElement | null): (() => void) | undefined;
}

/** So a dragged handle does not also scroll or select text on touch devices. */
const DRAG_STYLE = { touchAction: 'none' } as const;

const cancelTouch = (event: Event) => event.preventDefault();

/**
 * Ref callback for a touch-draggable SVG element. Chrome ignores `touch-action` on inner SVG
 * elements and decides whether a touch pans the page at touchstart, before any pointerdown handler
 * runs, so the element needs a non-passive touchstart listener from mount (React's own touch
 * listeners are passive). Pointer events still fire. Returns the cleanup React 19 calls on detach.
 */
export function preventTouchPan(element: Element | null): (() => void) | undefined {
  if (!element) return undefined;
  element.addEventListener('touchstart', cancelTouch, { passive: false });
  return () => element.removeEventListener('touchstart', cancelTouch);
}

/** The primary mouse button, or any touch/pen contact (which may report a different button). */
function isPrimaryPointer(event: ReactPointerEvent): boolean {
  return event.pointerType !== 'mouse' || event.button === 0;
}

/** The event's point in the owner svg's user units, or undefined when no CTM is available. */
function pointFromEvent(
  event: ReactPointerEvent<SVGGraphicsElement>,
): { x: number; y: number } | undefined {
  const ownerSvg = event.currentTarget.ownerSVGElement;
  const ctm = ownerSvg?.getScreenCTM?.();
  if (!ctm) return undefined;
  return svgPointFromClient(ctm.inverse(), event.clientX, event.clientY);
}

function releaseCapture(event: ReactPointerEvent<SVGGraphicsElement>): void {
  const target = event.currentTarget;
  if (typeof target.releasePointerCapture === 'function') {
    target.releasePointerCapture(event.pointerId);
  }
}

/**
 * Generic pointer-drag handler set for SVG handles drawn inside SvgPlot's overlay layer
 * (a launch vector, a map stop, a radius handle, a trigger lever, ...).
 *
 * Reports points in the owner svg's user units (its viewBox space) so labs can invert them
 * through their own scales. Hook only: no SVG-specific rendering.
 */
export function useDrag(onDrag: (point: DragPoint) => void): DragHandlers {
  const onDragRef = useRef(onDrag);
  onDragRef.current = onDrag;
  const isDraggingRef = useRef(false);
  /** The last point reported by `start`/`move`, used to fire `end` on cancel or lost capture. */
  const lastPointRef = useRef<{ x: number; y: number } | undefined>(undefined);

  const onPointerDown = useCallback((event: ReactPointerEvent<SVGGraphicsElement>) => {
    if (!isPrimaryPointer(event)) return;
    event.preventDefault();
    const target = event.currentTarget;
    // preventDefault() suppresses the browser's focus-on-pointerdown, so restore it
    // explicitly: otherwise a tabindex handle becomes unreachable by pointer-then-keyboard.
    // The handle is already under the pointer, so the page must not jump to it.
    if (typeof target.focus === 'function') target.focus({ preventScroll: true });
    const point = pointFromEvent(event);
    if (!point) return;
    lastPointRef.current = point;
    if (typeof target.setPointerCapture === 'function') target.setPointerCapture(event.pointerId);
    isDraggingRef.current = true;
    onDragRef.current({ ...point, phase: 'start' });
  }, []);

  const onPointerMove = useCallback((event: ReactPointerEvent<SVGGraphicsElement>) => {
    if (!isDraggingRef.current) return;
    const point = pointFromEvent(event);
    if (!point) return;
    lastPointRef.current = point;
    onDragRef.current({ ...point, phase: 'move' });
  }, []);

  /** Stops the drag and fires `end` once; guarded so later events for this drag are ignored. */
  const finishDrag = useCallback((point: { x: number; y: number } | undefined) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    if (point) onDragRef.current({ ...point, phase: 'end' });
  }, []);

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<SVGGraphicsElement>) => {
      if (!isDraggingRef.current) return;
      // End first: a synchronous lostpointercapture from the release then finds no drag.
      finishDrag(pointFromEvent(event));
      releaseCapture(event);
    },
    [finishDrag],
  );

  /** Some browsers report (0, 0) on pointercancel, so the drag ends at the last known point. */
  const onPointerCancel = useCallback(
    (event: ReactPointerEvent<SVGGraphicsElement>) => {
      if (!isDraggingRef.current) return;
      finishDrag(lastPointRef.current);
      releaseCapture(event);
    },
    [finishDrag],
  );

  /**
   * Capture can be lost without an explicit pointerup/pointercancel (e.g. the browser
   * revokes it). Fires `end` with the last known point and stops the drag; guarded by the
   * same `isDraggingRef` flag, so a lostpointercapture that follows an already-handled
   * pointerup/pointercancel does not fire a second `end`.
   */
  const onLostPointerCapture = useCallback(() => finishDrag(lastPointRef.current), [finishDrag]);

  return useMemo(
    () => ({
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onLostPointerCapture,
      style: DRAG_STYLE,
      ref: preventTouchPan,
    }),
    [onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onLostPointerCapture],
  );
}
