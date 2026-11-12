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
  /** In the capture phase, so they run before useDrag's own pointerdown (which focuses the knob). */
  onPointerDownCapture(): void;
  onPointerUpCapture(): void;
  onPointerCancelCapture(): void;
}

/**
 * The knob's keys (arrows 1°, Shift 10°, Page keys, Home and End) and its reveal. After a key that
 * moves it, and when the keyboard focuses it, the view pans it back with the band of the corner
 * texts around it.
 *
 * A press to drag it must not pan the view, or the knob leaves the pointer. useDrag focuses the
 * knob on pointerdown, and a browser may call that focus visible (Chromium does after any use of
 * the keyboard), so `:focus-visible` cannot tell a press from the keyboard: the knob remembers it
 * is being pressed, from pointerdown to pointerup, and in that focus it neither reveals nor lets
 * the canvas' own reveal (16 px, a focus event that bubbles) run. This stands in until the zoom
 * canvas knows the pointer's modality itself (R30).
 */
export function useTargetReveal({
  targetDeg,
  onTargetChange,
  zoom,
  knobAt,
}: TargetRevealInput): TargetKnobHandlers {
  const isRevealPending = useRef(false);
  const isPressed = useRef(false);
  const { reveal } = zoom;
  const zoomScale = zoom.view.scale;
  const { x, y } = knobAt;
  const revealKnob = useCallback(
    () => reveal(knobRevealBox({ x, y }, zoomScale)),
    [reveal, x, y, zoomScale],
  );
  const latest = useRef(revealKnob);
  useEffect(() => {
    latest.current = revealKnob;
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
      if (isPressed.current) {
        event.stopPropagation();
        return;
      }
      // The canvas reveals the focused knob itself (16 px of margin); asking again, after it, for
      // the larger one wins.
      if (isFocusShown(event.currentTarget)) queueMicrotask(() => latest.current());
    },
    onPointerDownCapture: () => {
      isPressed.current = true;
    },
    onPointerUpCapture: () => {
      isPressed.current = false;
    },
    onPointerCancelCapture: () => {
      isPressed.current = false;
    },
  };
}
