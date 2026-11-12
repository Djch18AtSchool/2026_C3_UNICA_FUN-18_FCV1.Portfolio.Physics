/**
 * The pointer gestures of a zoomable canvas as pure steps (useZoomGestures applies them): one
 * pointer pans once it moves past ZOOM_DRAG_THRESHOLD_PX, two pinch, and a pinch that loses a
 * finger goes on as a pan with the other, without a jump. Each step returns the new state and what
 * the hook must do: commit a view, stop a glide, capture the pointer, show the grabbing cursor.
 * No React, no DOM.
 */
import {
  panBy,
  pinchView,
  type ZoomFrame,
  type ZoomPair,
  type ZoomPoint,
  type ZoomView,
} from './zoomMath';

/** A press that moves less than this is a click, not a pan. */
export const ZOOM_DRAG_THRESHOLD_PX = 4;

interface PanGesture {
  readonly id: number;
  readonly origin: ZoomPoint;
  readonly start: ZoomView;
  readonly isActive: boolean;
}

interface PinchGesture {
  readonly ids: readonly [number, number];
  readonly from: ZoomPair;
  readonly start: ZoomView;
}

export interface GestureState {
  /** Where each pointer pressed on the background is now (viewport px). */
  readonly points: ReadonlyMap<number, ZoomPoint>;
  readonly pan?: PanGesture;
  readonly pinch?: PinchGesture;
  /** The click that ends a pan or a pinch belongs to the gesture, not to the drawing. */
  readonly swallowClick: boolean;
}

export interface GestureStep {
  readonly state: GestureState;
  readonly view?: ZoomView;
  /** Whether the drawing is being dragged now (the grabbing cursor), when that changes. */
  readonly isPanning?: boolean;
  /** A gesture takes over: stop a glide where it is. */
  readonly stopsGlide?: boolean;
  /** A pan just started: capture the pointer so it is followed outside the canvas. */
  readonly capturesPointer?: boolean;
}

export const IDLE_GESTURE: GestureState = Object.freeze({
  points: new Map<number, ZoomPoint>(),
  swallowClick: false,
});

/** A pointer pressed on the background: the first may pan, the second starts a pinch. */
export function pressPointer(
  state: GestureState,
  id: number,
  point: ZoomPoint,
  view: ZoomView,
): GestureStep {
  const points = new Map(state.points).set(id, point);
  if (points.size === 2) {
    const [[a, atA], [b, atB]] = [...points];
    const pinch = { ids: [a, b] as const, from: [atA, atB] as const, start: view };
    return { state: { points, pinch, swallowClick: false }, isPanning: false, stopsGlide: true };
  }
  if (points.size === 1) {
    const pan = { id, origin: point, start: view, isActive: false };
    return { state: { points, pan, swallowClick: false } };
  }
  return { state: { ...state, points } };
}

/** The pinch's two pointers where they are now. */
const pairOf = (points: ReadonlyMap<number, ZoomPoint>, [a, b]: readonly [number, number]) =>
  [points.get(a)!, points.get(b)!] as const;

/** A pointer moved: the pinch follows both, the pan follows its own once past the threshold. */
export function movePointer(
  state: GestureState,
  id: number,
  point: ZoomPoint,
  frame: ZoomFrame,
): GestureStep {
  if (!state.points.has(id)) return { state };
  const next = { ...state, points: new Map(state.points).set(id, point) };
  if (state.pinch) {
    const { start, from, ids } = state.pinch;
    return { state: next, view: pinchView(start, from, pairOf(next.points, ids), frame) };
  }
  const pan = state.pan;
  if (!pan || pan.id !== id) return { state: next };
  const delta = { x: point.x - pan.origin.x, y: point.y - pan.origin.y };
  if (!pan.isActive && Math.hypot(delta.x, delta.y) < ZOOM_DRAG_THRESHOLD_PX) {
    return { state: next };
  }
  const starts = !pan.isActive;
  return {
    state: { ...next, pan: { ...pan, isActive: true } },
    view: panBy(pan.start, delta, frame),
    ...(starts ? { isPanning: true, stopsGlide: true, capturesPointer: true } : {}),
  };
}

/** A pointer left (up, cancel, capture lost, or a mouse found with no button pressed). */
export function releasePointer(state: GestureState, id: number, view: ZoomView): GestureStep {
  if (!state.points.has(id)) return { state };
  const points = new Map(state.points);
  points.delete(id);
  if (state.pinch) {
    const [rest] = [...points];
    const pan = rest ? { id: rest[0], origin: rest[1], start: view, isActive: true } : undefined;
    return { state: { points, pan, swallowClick: true }, isPanning: rest !== undefined };
  }
  if (state.pan?.id !== id) return { state: { ...state, points } };
  const swallowClick = state.swallowClick || state.pan.isActive;
  return { state: { points, swallowClick }, isPanning: false };
}
