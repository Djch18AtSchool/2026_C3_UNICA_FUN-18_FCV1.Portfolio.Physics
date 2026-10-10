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
  style: { touchAction: 'none' };
}

/** So a dragged handle does not also scroll or select text on touch devices. */
const DRAG_STYLE = { touchAction: 'none' } as const;

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

  const onPointerDown = useCallback((event: ReactPointerEvent<SVGGraphicsElement>) => {
    if (!isPrimaryPointer(event)) return;
    event.preventDefault();
    const point = pointFromEvent(event);
    if (!point) return;
    const target = event.currentTarget;
    if (typeof target.setPointerCapture === 'function') target.setPointerCapture(event.pointerId);
    isDraggingRef.current = true;
    onDragRef.current({ ...point, phase: 'start' });
  }, []);

  const onPointerMove = useCallback((event: ReactPointerEvent<SVGGraphicsElement>) => {
    if (!isDraggingRef.current) return;
    const point = pointFromEvent(event);
    if (!point) return;
    onDragRef.current({ ...point, phase: 'move' });
  }, []);

  const endDrag = useCallback((event: ReactPointerEvent<SVGGraphicsElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    const target = event.currentTarget;
    if (typeof target.releasePointerCapture === 'function') {
      target.releasePointerCapture(event.pointerId);
    }
    const point = pointFromEvent(event);
    if (point) onDragRef.current({ ...point, phase: 'end' });
  }, []);

  return useMemo(
    () => ({
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      style: DRAG_STYLE,
    }),
    [onPointerDown, onPointerMove, endDrag],
  );
}
