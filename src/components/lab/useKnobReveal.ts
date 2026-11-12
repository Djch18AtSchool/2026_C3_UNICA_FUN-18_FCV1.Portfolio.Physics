/**
 * The reveal of a knob that must stay clear of more than its ring (the texts in a canvas' corners):
 * a key that moves it, or the keyboard's focus that takes it, can leave it out of the view or under
 * those texts at a zoom, so the view pans it back with `radiusPx` around its centre (the reveal
 * adds its own 16 px). The canvas' own reveal of a focused handle leaves only 16 px around the
 * handle's box, so the knob's focus stops there: this is its only reveal. A focus a press gives
 * (useDrag focuses the knob on pointerdown) reveals nothing, as in the canvas (R30).
 *
 *   const knob = useKnobReveal({ zoom, at: knobInDrawingUnits, radiusPx: RING + TEXT_BAND });
 *   <g role="slider" tabIndex={0} onFocus={knob.onFocus}
 *      onKeyDown={(e) => { … knob.revealAfterKey(next !== value); onChange(next); }} {...drag} />
 */
import { useCallback, useEffect, useRef, type FocusEvent as ReactFocusEvent } from 'react';
import type { ZoomPan } from './useZoomPan';
import type { ZoomBox, ZoomPoint } from './zoomMath';

export interface KnobRevealInput {
  zoom: Pick<ZoomPan, 'reveal' | 'isPointerPressing' | 'view'>;
  /** The knob's centre in drawing units (the lab's own framing). */
  at: ZoomPoint;
  /** On screen, how far around the knob's centre stays in view, px. */
  radiusPx: number;
}

export interface KnobReveal {
  /**
   * In the knob's key handler, before the change: whether the key moves the knob. The reveal
   * comes once the knob is drawn at its new place.
   */
  revealAfterKey(isMoving: boolean): void;
  /** The knob's onFocus. */
  onFocus(event: ReactFocusEvent<Element>): void;
}

/** The box (drawing units) `radiusPx` of screen around `at`, at the zoom `scale`. */
export function knobBox(at: ZoomPoint, radiusPx: number, scale: number): ZoomBox {
  const radius = radiusPx / scale;
  return { x: at.x - radius, y: at.y - radius, width: 2 * radius, height: 2 * radius };
}

export function useKnobReveal({ zoom, at, radiusPx }: KnobRevealInput): KnobReveal {
  const isPending = useRef(false);
  const { reveal, isPointerPressing } = zoom;
  const scale = zoom.view.scale;
  const { x, y } = at;
  const revealKnob = useCallback(
    () => reveal(knobBox({ x, y }, radiusPx, scale)),
    [reveal, x, y, radiusPx, scale],
  );
  useEffect(() => {
    if (!isPending.current) return;
    isPending.current = false;
    revealKnob();
  }, [revealKnob]);
  const revealAfterKey = useCallback((isMoving: boolean) => {
    isPending.current = isMoving;
  }, []);
  const onFocus = useCallback(
    (event: ReactFocusEvent<Element>) => {
      event.stopPropagation();
      if (!isPointerPressing()) revealKnob();
    },
    [isPointerPressing, revealKnob],
  );
  return { revealAfterKey, onFocus };
}
