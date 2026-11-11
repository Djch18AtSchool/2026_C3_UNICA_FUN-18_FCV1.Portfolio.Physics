/**
 * The pointer and wheel side of useZoomPan: a background drag pans (past a threshold, so a click
 * stays a click), two pointers pinch, and the wheel zooms with Ctrl, or alone while the canvas has
 * the focus. A press that starts on a control inside the canvas (a draggable handle, a button,
 * anything focusable or marked data-zoom-ignore) or whose default a handle already prevented
 * (useDrag) is never taken: the handle keeps its drag.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import {
  panBy,
  pinchView,
  viewsEqual,
  wheelDeltaPx,
  wheelZoomFactor,
  zoomAt,
  type ZoomFrame,
  type ZoomPair,
  type ZoomPoint,
  type ZoomView,
} from './zoomMath';

/** A press that moves less than this is a click, not a pan. */
export const ZOOM_DRAG_THRESHOLD_PX = 4;

/** What the gestures read and write: the hook's live frame and view, and its glide. */
export interface ZoomGestureHost {
  frame(): ZoomFrame;
  view(): ZoomView;
  commit(view: ZoomView): void;
  /** Stops a glide where it is (a gesture takes over). */
  stop(): void;
}

type ViewportPointerEvent = ReactPointerEvent<HTMLElement>;

export interface ZoomGestures {
  isPanning: boolean;
  onPointerDown(event: ViewportPointerEvent): void;
  onPointerMove(event: ViewportPointerEvent): void;
  onPointerUp(event: ViewportPointerEvent): void;
  onPointerCancel(event: ViewportPointerEvent): void;
  onLostPointerCapture(event: ViewportPointerEvent): void;
  onClickCapture(event: ReactMouseEvent<HTMLElement>): void;
  /** For a native, non-passive wheel listener on the viewport. */
  onWheel(event: WheelEvent, viewport: HTMLElement): void;
}

interface PanGesture {
  id: number;
  origin: ZoomPoint;
  start: ZoomView;
  isActive: boolean;
}

interface PinchGesture {
  ids: readonly [number, number];
  from: ZoomPair;
  start: ZoomView;
}

/** What a press inside the canvas may start on without becoming a pan. */
const CONTROLS =
  'a[href], button, input, select, textarea, summary, [tabindex], [role="button"], [role="slider"], [contenteditable="true"], [data-zoom-ignore]';

/** Whether a press on `target` belongs to a control inside the viewport (not the viewport). */
export function startsOnControl(target: EventTarget | null, viewport: Element): boolean {
  if (!(target instanceof Element)) return false;
  const control = target.closest(CONTROLS);
  return control !== null && control !== viewport && viewport.contains(control);
}

function localPoint(event: { clientX: number; clientY: number }, viewport: Element): ZoomPoint {
  const box = viewport.getBoundingClientRect();
  return { x: event.clientX - box.left, y: event.clientY - box.top };
}

const isSecondaryMouse = (event: ViewportPointerEvent) =>
  event.pointerType === 'mouse' && event.button !== 0;

function capture(event: ViewportPointerEvent): void {
  const viewport = event.currentTarget;
  if (typeof viewport.setPointerCapture === 'function') viewport.setPointerCapture(event.pointerId);
}

/** The pinch's two pointers where they are now (the latest point of each). */
function pairOf(points: ReadonlyMap<number, ZoomPoint>, ids: readonly [number, number]): ZoomPair {
  return [points.get(ids[0])!, points.get(ids[1])!];
}

/** The wheel zoom, or nothing when the page should scroll (see onWheel). */
function wheelZoom(event: WheelEvent, viewport: HTMLElement, host: ZoomGestureHost) {
  const isFocused = viewport.ownerDocument.activeElement === viewport;
  if (!event.ctrlKey && !isFocused) return undefined;
  const delta = wheelDeltaPx(event.deltaY, event.deltaMode, window.innerHeight);
  const current = host.view();
  const next = zoomAt(current, wheelZoomFactor(delta), localPoint(event, viewport), host.frame());
  return { current, next };
}

export function useZoomGestures(host: ZoomGestureHost): ZoomGestures {
  const points = useRef<ReadonlyMap<number, ZoomPoint>>(new Map());
  const pan = useRef<PanGesture | undefined>(undefined);
  const pinch = useRef<PinchGesture | undefined>(undefined);
  const swallowClick = useRef(false);
  const [isPanning, setIsPanning] = useState(false);

  const startPinch = useCallback(() => {
    const [[a, pointA], [b, pointB]] = [...points.current];
    pinch.current = { ids: [a, b], from: [pointA, pointB], start: host.view() };
    pan.current = undefined;
    host.stop();
    setIsPanning(false);
  }, [host]);

  const onPointerDown = useCallback(
    (event: ViewportPointerEvent) => {
      if (isSecondaryMouse(event)) return;
      swallowClick.current = false;
      if (event.defaultPrevented || startsOnControl(event.target, event.currentTarget)) return;
      const point = localPoint(event, event.currentTarget);
      points.current = new Map(points.current).set(event.pointerId, point);
      if (points.current.size === 2) startPinch();
      else if (points.current.size === 1) {
        pan.current = { id: event.pointerId, origin: point, start: host.view(), isActive: false };
      }
    },
    [host, startPinch],
  );

  const movePan = useCallback(
    (event: ViewportPointerEvent, point: ZoomPoint) => {
      const gesture = pan.current;
      if (!gesture || gesture.id !== event.pointerId) return;
      const delta = { x: point.x - gesture.origin.x, y: point.y - gesture.origin.y };
      if (!gesture.isActive) {
        if (Math.hypot(delta.x, delta.y) < ZOOM_DRAG_THRESHOLD_PX) return;
        pan.current = { ...gesture, isActive: true };
        capture(event);
        host.stop();
        setIsPanning(true);
      }
      host.commit(panBy(gesture.start, delta, host.frame()));
    },
    [host],
  );

  const onPointerMove = useCallback(
    (event: ViewportPointerEvent) => {
      if (!points.current.has(event.pointerId)) return;
      const point = localPoint(event, event.currentTarget);
      points.current = new Map(points.current).set(event.pointerId, point);
      const gesture = pinch.current;
      if (!gesture) {
        movePan(event, point);
        return;
      }
      host.commit(
        pinchView(gesture.start, gesture.from, pairOf(points.current, gesture.ids), host.frame()),
      );
    },
    [host, movePan],
  );

  /** A pointer leaves: a pinch goes on as a pan with the finger that stays, without a jump. */
  const endPointer = useCallback(
    (event: ViewportPointerEvent) => {
      if (!points.current.has(event.pointerId)) return;
      const rest = new Map(points.current);
      rest.delete(event.pointerId);
      points.current = rest;
      if (pinch.current) {
        pinch.current = undefined;
        swallowClick.current = true;
        const [remaining] = [...rest];
        pan.current = remaining
          ? { id: remaining[0], origin: remaining[1], start: host.view(), isActive: true }
          : undefined;
        setIsPanning(remaining !== undefined);
        return;
      }
      if (pan.current?.id !== event.pointerId) return;
      if (pan.current.isActive) swallowClick.current = true;
      pan.current = undefined;
      setIsPanning(false);
    },
    [host],
  );

  /** The click that ends a pan or a pinch is the gesture's, not the drawing's. */
  const onClickCapture = useCallback((event: ReactMouseEvent<HTMLElement>) => {
    if (!swallowClick.current) return;
    swallowClick.current = false;
    event.preventDefault();
    event.stopPropagation();
  }, []);

  /**
   * With Ctrl (also a trackpad pinch, which browsers send as Ctrl + wheel) the page must never
   * zoom, so the default always goes; alone, on the focused canvas, only when the zoom changes:
   * at a limit the page scrolls on.
   */
  const onWheel = useCallback(
    (event: WheelEvent, viewport: HTMLElement) => {
      const zoom = wheelZoom(event, viewport, host);
      if (!zoom) return;
      const changes = !viewsEqual(zoom.next, zoom.current);
      if (!changes && !event.ctrlKey) return;
      event.preventDefault();
      if (!changes) return;
      host.stop();
      host.commit(zoom.next);
    },
    [host],
  );

  return useMemo(
    () => ({
      isPanning,
      onPointerDown,
      onPointerMove,
      onPointerUp: endPointer,
      onPointerCancel: endPointer,
      onLostPointerCapture: endPointer,
      onClickCapture,
      onWheel,
    }),
    [isPanning, onPointerDown, onPointerMove, endPointer, onClickCapture, onWheel],
  );
}
