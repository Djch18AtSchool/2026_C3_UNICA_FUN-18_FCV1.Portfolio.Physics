/**
 * The zoom's two hooks for the target knob: a key that moves it, or the focus that takes it, can
 * leave it out of the view or under the corner texts at a zoom, and a new framing (a reset) is
 * «Ajustar».
 */
import {
  useCallback,
  useEffect,
  useRef,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import type { ZoomPan } from '../../lab/useZoomPan';
import { targetKeyTarget, type Point } from './wheelScene';
import { knobRevealBox } from './wheelZoom';

/** Each change of `refit` frames the drawing again (not the first value: that is the initial view). */
export function useRefit(zoom: ZoomPan, refit: number): void {
  const last = useRef(refit);
  const { fit } = zoom;
  useEffect(() => {
    if (last.current === refit) return;
    last.current = refit;
    fit();
  }, [refit, fit]);
}

/** Whether the element's focus is shown (:focus-visible); a browser without the selector says yes. */
function isFocusShown(element: Element): boolean {
  try {
    return element.matches(':focus-visible');
  } catch {
    return true;
  }
}

export interface TargetRevealInput {
  targetDeg: number;
  onTargetChange(degrees: number): void;
  zoom: ZoomPan;
  /** The knob in drawing units (the lab's own framing): where a reveal brings into view. */
  knobAt: Point;
}

export interface TargetKnobHandlers {
  onKeyDown(event: ReactKeyboardEvent<SVGGElement>): void;
  onFocus(event: ReactFocusEvent<SVGGElement>): void;
}

/**
 * The knob's keys (arrows 1°, Shift 10°, Page keys, Home and End) and its reveal: after a key that
 * moves it, and when the keyboard focuses it, the view pans it back with the band of the corner
 * texts around it. A drag does not: the knob is under the pointer. The canvas reveals any focused
 * handle itself (16 px of margin); the focus asks again, after it, for the larger one, which wins.
 */
export function useTargetReveal({
  targetDeg,
  onTargetChange,
  zoom,
  knobAt,
}: TargetRevealInput): TargetKnobHandlers {
  const isRevealPending = useRef(false);
  const { reveal } = zoom;
  const zoomScale = zoom.view.scale;
  const { x, y } = knobAt;
  const revealKnob = useCallback(
    () => reveal(knobRevealBox({ x, y }, zoomScale)),
    [reveal, x, y, zoomScale],
  );
  const latest = useRef(revealKnob);
  latest.current = revealKnob;
  useEffect(() => {
    if (!isRevealPending.current) return;
    isRevealPending.current = false;
    revealKnob();
  }, [revealKnob]);
  return {
    onKeyDown: (event) => {
      const next = targetKeyTarget(event.key, event.shiftKey, targetDeg);
      if (next === undefined) return;
      event.preventDefault();
      isRevealPending.current = next !== targetDeg;
      if (next !== targetDeg) onTargetChange(next);
    },
    onFocus: (event) => {
      // Only a focus that shows (the keyboard's): a press on the knob to drag it must not pan the view.
      if (isFocusShown(event.currentTarget)) queueMicrotask(() => latest.current());
    },
  };
}
