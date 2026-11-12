/**
 * The pointer and wheel side of useZoomPan: a background drag pans (past a threshold, so a click
 * stays a click), two pointers pinch (zoomGestureState.ts holds the steps), and the wheel zooms
 * with Ctrl, or alone while the canvas shows its focus (:focus-visible: reached with the keyboard). A press that starts on a control inside the
 * canvas (a draggable handle, a button, anything focusable or marked data-zoom-ignore) or whose
 * default a handle already prevented (useDrag) is never taken: the handle keeps its drag. A mouse
 * found moving with no button pressed (released outside the canvas) ends its gesture.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import {
  IDLE_GESTURE,
  movePointer,
  pressPointer,
  releasePointer,
  type GestureState,
  type GestureStep,
} from './zoomGestureState';
import {
  viewsEqual,
  wheelDeltaPx,
  wheelZoomFactor,
  zoomAt,
  type ZoomFrame,
  type ZoomPoint,
  type ZoomView,
} from './zoomMath';

export { ZOOM_DRAG_THRESHOLD_PX } from './zoomGestureState';

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

/** A mouse moving with no button pressed: its press ended outside the canvas, unseen. */
const isReleasedMouse = (event: ViewportPointerEvent) =>
  event.pointerType === 'mouse' && event.buttons === 0;

function capture(event: ViewportPointerEvent): void {
  const viewport = event.currentTarget;
  if (typeof viewport.setPointerCapture === 'function') viewport.setPointerCapture(event.pointerId);
}

/** The click that ends a pan or a pinch belongs to the gesture: it never reaches the drawing. */
function useSwallowedClick(state: { current: GestureState }) {
  return useCallback(
    (event: ReactMouseEvent<HTMLElement>) => {
      if (!state.current.swallowClick) return;
      state.current = { ...state.current, swallowClick: false };
      event.preventDefault();
      event.stopPropagation();
    },
    [state],
  );
}

/** The pointer gestures: the state lives in a ref, each step's effects go to the host. */
function usePointerGestures(host: ZoomGestureHost) {
  const state = useRef<GestureState>(IDLE_GESTURE);
  const [isPanning, setIsPanning] = useState(false);

  const apply = useCallback(
    (step: GestureStep, event: ViewportPointerEvent) => {
      state.current = step.state;
      if (step.stopsGlide) host.stop();
      if (step.capturesPointer) capture(event);
      if (step.view) host.commit(step.view);
      if (step.isPanning !== undefined) setIsPanning(step.isPanning);
    },
    [host],
  );

  const onPointerDown = useCallback(
    (event: ViewportPointerEvent) => {
      if (isSecondaryMouse(event)) return;
      state.current = { ...state.current, swallowClick: false };
      if (event.defaultPrevented || startsOnControl(event.target, event.currentTarget)) return;
      const point = localPoint(event, event.currentTarget);
      apply(pressPointer(state.current, event.pointerId, point, host.view()), event);
    },
    [apply, host],
  );

  const endPointer = useCallback(
    (event: ViewportPointerEvent) =>
      apply(releasePointer(state.current, event.pointerId, host.view()), event),
    [apply, host],
  );

  const onPointerMove = useCallback(
    (event: ViewportPointerEvent) => {
      if (isReleasedMouse(event)) return endPointer(event);
      const point = localPoint(event, event.currentTarget);
      apply(movePointer(state.current, event.pointerId, point, host.frame()), event);
    },
    [apply, endPointer, host],
  );

  const onClickCapture = useSwallowedClick(state);
  return { isPanning, onPointerDown, onPointerMove, endPointer, onClickCapture };
}

/**
 * Whether the canvas itself has a focus the browser shows (:focus-visible): reached with the
 * keyboard, or a key pressed after a click. A click alone focuses it without showing it, and must
 * not turn the wheel into a zoom under a reader who only wanted to scroll past.
 */
function hasVisibleFocus(viewport: HTMLElement): boolean {
  if (viewport.ownerDocument.activeElement !== viewport) return false;
  try {
    return viewport.matches(':focus-visible');
  } catch {
    return false;
  }
}

/** The wheel zoom, or nothing when the page should scroll (see useWheelZoom). */
function wheelZoom(event: WheelEvent, viewport: HTMLElement, host: ZoomGestureHost) {
  if (!event.ctrlKey && !hasVisibleFocus(viewport)) return undefined;
  const delta = wheelDeltaPx(event.deltaY, event.deltaMode, window.innerHeight);
  const current = host.view();
  const next = zoomAt(current, wheelZoomFactor(delta), localPoint(event, viewport), host.frame());
  return { current, next };
}

/**
 * With Ctrl (also a trackpad pinch, which browsers send as Ctrl + wheel) the page must never
 * zoom, so the default always goes; alone, on the focused canvas, only when the zoom changes: at
 * a limit the page scrolls on.
 */
function useWheelZoom(host: ZoomGestureHost) {
  return useCallback(
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
}

export function useZoomGestures(host: ZoomGestureHost): ZoomGestures {
  const pointer = usePointerGestures(host);
  const onWheel = useWheelZoom(host);
  const { isPanning, onPointerDown, onPointerMove, endPointer, onClickCapture } = pointer;
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
