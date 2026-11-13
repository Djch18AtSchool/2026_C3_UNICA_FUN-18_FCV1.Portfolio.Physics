/**
 * Whether a pointer is pressing on the zoom's canvas (R30): the origin of a focus, which neither
 * the focus itself nor `:focus-visible` can tell. useDrag focuses a handle by script on its
 * pointerdown, and Chromium calls that focus visible after any use of the keyboard; a press near
 * the edge must not pan the view under the hand, while a Tab to a handle out of view must bring
 * it in. So the canvas raises a flag when a press starts inside it (capture phase, before the
 * handle's own handlers focus anything) and lowers it when the press ends anywhere on the page:
 * a focus inside a press is the pointer's and never reveals.
 *
 * A press starts on pointerdown, and also on mousedown and touchstart: a tap fires its mousedown,
 * which is when a button takes the focus, after its pointerup. It ends on pointerup,
 * pointercancel, mouseup, touchend and touchcancel on the window (a release outside the canvas
 * counts), and on any key (a press whose release the page never saw, say over another window, must
 * not leave the keyboard without its reveal). Not on lostpointercapture: a touch's implicit capture
 * handed to a handle (useDrag) fires it in the middle of the press.
 */
import { useCallback, useEffect, useMemo, useRef } from 'react';

const PRESS_ENDS = ['pointerup', 'pointercancel', 'mouseup', 'touchend', 'touchcancel', 'keydown'];

export interface PointerPressProps {
  onPointerDownCapture(): void;
  onMouseDownCapture(): void;
  onTouchStartCapture(): void;
}

export interface PointerPress {
  /** Whether a pointer is pressing inside the canvas now: a focus it gives is the pointer's. */
  isPressing(): boolean;
  /** Spread on the canvas element. */
  readonly props: PointerPressProps;
}

export function usePointerPress(): PointerPress {
  const pressing = useRef(false);
  const start = useCallback(() => {
    pressing.current = true;
  }, []);
  const end = useCallback(() => {
    pressing.current = false;
  }, []);

  useEffect(() => {
    for (const type of PRESS_ENDS) window.addEventListener(type, end, true);
    return () => {
      for (const type of PRESS_ENDS) window.removeEventListener(type, end, true);
    };
  }, [end]);

  return useMemo(
    () => ({
      isPressing: () => pressing.current,
      props: {
        onPointerDownCapture: start,
        onMouseDownCapture: start,
        onTouchStartCapture: start,
      },
    }),
    [start],
  );
}
