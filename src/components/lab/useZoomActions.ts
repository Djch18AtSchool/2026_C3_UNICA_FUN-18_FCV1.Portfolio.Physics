/**
 * What useZoomPan does on request: steps about the lab's anchor or the centre, «Ajustar», «1:1», a
 * pan, a reveal (and
 * the canvas' own reveal of a focused descendant, unless a pointer pressing gave the focus), and
 * the keys + − 0 and the arrows.
 */
import { useCallback, useMemo } from 'react';
import type { FocusEvent as ReactFocusEvent, KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { ViewTransition } from './useViewTransition';
import {
  actualSizeView,
  fitView,
  panBy,
  revealView,
  stepPivot,
  toWorld,
  viewsEqual,
  zoomAt,
  ZOOM_STEP,
  type ZoomBox,
  type ZoomFrame,
  type ZoomPoint,
  type ZoomView,
} from './zoomMath';

/** One arrow press pans the drawing this far. */
export const ZOOM_PAN_STEP_PX = 48;

const ZOOM_KEYS: Readonly<Record<string, 'in' | 'out' | 'fit'>> = {
  '+': 'in',
  '=': 'in',
  Add: 'in',
  '-': 'out',
  '−': 'out',
  Subtract: 'out',
  '0': 'fit',
};
const PAN_KEYS: Readonly<Record<string, ZoomPoint>> = {
  ArrowLeft: { x: ZOOM_PAN_STEP_PX, y: 0 },
  ArrowRight: { x: -ZOOM_PAN_STEP_PX, y: 0 },
  ArrowUp: { x: 0, y: ZOOM_PAN_STEP_PX },
  ArrowDown: { x: 0, y: -ZOOM_PAN_STEP_PX },
};

interface Refs {
  frameRef: { current: ZoomFrame };
  viewRef: { current: ZoomView };
  commit(view: ZoomView): void;
  /** Whether a pointer is pressing inside the canvas (usePointerPress). */
  isPressing(): boolean;
  /** The lab's point to zoom about (useZoomPan's `anchor`), read at each step. */
  anchorRef: { current: (() => ZoomPoint | undefined) | undefined };
}

export interface ZoomActions {
  zoomIn(): void;
  zoomOut(): void;
  fit(): void;
  actualSize(): void;
  panBy(delta: ZoomPoint): void;
  reveal(box: ZoomBox): void;
  onFocus(event: ReactFocusEvent<HTMLElement>): void;
  onKeyDown(event: ReactKeyboardEvent<HTMLElement>): void;
}

/** The focused element's box in drawing units, from its box on screen and the view. */
function focusedBox(target: Element, viewport: Element, view: ZoomView): ZoomBox {
  const box = target.getBoundingClientRect();
  const origin = viewport.getBoundingClientRect();
  const corner = toWorld(view, { x: box.left - origin.left, y: box.top - origin.top });
  return { ...corner, width: box.width / view.scale, height: box.height / view.scale };
}

/**
 * Steps about the lab's anchor (or the centre: stepPivot), «Ajustar» and «1:1», all gliding from
 * where the view is heading.
 */
function useZoomSteps({ frameRef, anchorRef }: Refs, glide: ViewTransition) {
  const { animateTo, destination } = glide;
  const step = useCallback(
    (factor: number) => {
      const from = destination();
      const pivot = stepPivot(from, frameRef.current.viewport, anchorRef.current?.());
      animateTo(zoomAt(from, factor, pivot, frameRef.current));
    },
    [animateTo, anchorRef, destination, frameRef],
  );
  const zoomIn = useCallback(() => step(ZOOM_STEP), [step]);
  const zoomOut = useCallback(() => step(1 / ZOOM_STEP), [step]);
  const fit = useCallback(() => animateTo(fitView(frameRef.current)), [animateTo, frameRef]);
  const actualSize = useCallback(
    () => animateTo(actualSizeView(destination(), frameRef.current)),
    [animateTo, destination, frameRef],
  );
  return { zoomIn, zoomOut, fit, actualSize };
}

/**
 * A pan (immediate), a reveal (gliding) and the reveal of a focused descendant. A focus given by a
 * press (useDrag focuses its handle on pointerdown; a button takes it on mousedown) never reveals:
 * moving the view under the pointer would leave the drag out of step with the hand. Any other
 * focus does (Tab, a script), whatever `:focus-visible` says: Chromium sets it on a press's script
 * focus after any key, and clears it on a script's focus after a click (R30).
 */
function useZoomMoves({ frameRef, viewRef, commit, isPressing }: Refs, glide: ViewTransition) {
  const { animateTo, stop } = glide;
  const pan = useCallback(
    (delta: ZoomPoint) => {
      stop();
      commit(panBy(viewRef.current, delta, frameRef.current));
    },
    [commit, frameRef, stop, viewRef],
  );
  const reveal = useCallback(
    (box: ZoomBox) => animateTo(revealView(viewRef.current, box, frameRef.current)),
    [animateTo, frameRef, viewRef],
  );
  const onFocus = useCallback(
    (event: ReactFocusEvent<HTMLElement>) => {
      if (event.target === event.currentTarget || isPressing()) return;
      reveal(focusedBox(event.target, event.currentTarget, viewRef.current));
    },
    [reveal, viewRef, isPressing],
  );
  return { pan, reveal, onFocus };
}

export function useZoomActions(refs: Refs, glide: ViewTransition): ZoomActions {
  const { zoomIn, zoomOut, fit, actualSize } = useZoomSteps(refs, glide);
  const { pan, reveal, onFocus } = useZoomMoves(refs, glide);
  const keyActions = useMemo(() => ({ zoomIn, zoomOut, fit, pan }), [zoomIn, zoomOut, fit, pan]);
  const onKeyDown = useZoomKeys(keyActions, refs.viewRef, glide.destination);
  return { zoomIn, zoomOut, fit, actualSize, panBy: pan, reveal, onFocus, onKeyDown };
}

interface KeyActions {
  zoomIn(): void;
  zoomOut(): void;
  fit(): void;
  pan(delta: ZoomPoint): void;
}

/**
 * + − 0 and the arrows, only on the canvas itself (a focused handle keeps its arrows) and never
 * with Ctrl, Alt or Meta (the browser's own zoom). The key is taken from the browser only when it
 * changes the view: an arrow at ×1 scrolls the page.
 */
function useZoomKeys(
  actions: KeyActions,
  viewRef: { current: ZoomView },
  destination: () => ZoomView,
) {
  return useCallback(
    (event: ReactKeyboardEvent<HTMLElement>) => {
      if (event.target !== event.currentTarget) return;
      if (event.ctrlKey || event.altKey || event.metaKey) return;
      const zoom = ZOOM_KEYS[event.key];
      const delta = PAN_KEYS[event.key];
      if (!zoom && !delta) return;
      const before = destination();
      if (delta) actions.pan(delta);
      else if (zoom === 'in') actions.zoomIn();
      else if (zoom === 'out') actions.zoomOut();
      else actions.fit();
      const after = delta ? viewRef.current : destination();
      if (!viewsEqual(before, after)) event.preventDefault();
    },
    [actions, destination, viewRef],
  );
}
