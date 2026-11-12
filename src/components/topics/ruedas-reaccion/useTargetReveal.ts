/**
 * The target knob's keys and the zoom: a key that moves it, or the keyboard's focus that takes it,
 * can leave it out of the view or under the corner texts at a zoom, so the view pans it back with
 * the band of the corner texts around it (useKnobReveal). A press to drag it never pans (R30).
 */
import type { FocusEvent as ReactFocusEvent, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useKnobReveal } from '../../lab/useKnobReveal';
import type { ZoomPan } from '../../lab/useZoomPan';
import { targetKeyTarget, type Point } from './wheelScene';
import { KNOB_REVEAL_RADIUS } from './wheelZoom';

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

/** The knob's keys (arrows 1°, Shift 10°, Page keys, Home and End) and its reveal. */
export function useTargetReveal({
  targetDeg,
  onTargetChange,
  zoom,
  knobAt,
}: TargetRevealInput): TargetKnobHandlers {
  const knob = useKnobReveal({ zoom, at: knobAt, radiusPx: KNOB_REVEAL_RADIUS });
  return {
    onKeyDown: (event) => {
      const next = targetKeyTarget(event.key, event.shiftKey, targetDeg);
      if (next === undefined) return;
      event.preventDefault();
      knob.revealAfterKey(next !== targetDeg);
      if (next !== targetDeg) onTargetChange(next);
    },
    onFocus: knob.onFocus,
  };
}
