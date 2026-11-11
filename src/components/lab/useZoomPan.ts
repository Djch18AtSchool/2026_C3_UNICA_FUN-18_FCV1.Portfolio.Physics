/**
 * Zoom and pan for a lab's canvas (auditoría §8 and §12.3). The lab draws as always and puts its
 * drawing in a group with the view's transform (or maps its coordinates through the view); the
 * hook owns the view, the viewport's props and the gestures:
 *
 *   const zoom = useZoomPan({ label: 'Mapa de la ruta' });
 *   <div {...zoom.viewportProps} className="relative">      // the focusable, positioned canvas
 *     <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
 *       <g transform={zoom.transform}>…</g>
 *     </svg>
 *     <ScaleBar pxPerUnit={pxPerKm * zoom.view.scale} units={KM} />
 *     <ZoomControls zoom={zoom} />                          // required: it holds the instructions
 *   </div>
 *
 * Buttons and keys glide for ZOOM_TRANSITION_MS (none under reduced motion); wheel, pinch and
 * drag follow the hand. The initial view is the identity: the server paints it and hydration
 * changes nothing. «1:1» is ×1, the drawing at its nominal scale (one drawing unit per CSS px);
 * «Ajustar» frames `fit` (by default the whole drawing, so the same view). README, «Zoom y
 * desplazamiento».
 */
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { motionReduced } from '../../lib/settingsStore';
import { useGlobalSettings } from './useGlobalSettings';
import { usePrefersReducedMotion } from './useSimClock';
import { useZoomGestures, type ZoomGestureHost, type ZoomGestures } from './useZoomGestures';
import {
  actualSizeView,
  clampPan,
  fitView,
  IDENTITY_VIEW,
  interpolateView,
  panBy,
  requireZoomFrame,
  toScreen,
  toWorld,
  viewsEqual,
  viewTransform,
  zoomAt,
  DEFAULT_ZOOM_LIMITS,
  ZOOM_STEP,
  type ZoomBox,
  type ZoomFrame,
  type ZoomPoint,
  type ZoomSize,
  type ZoomView,
} from './zoomMath';

/** A button or key zoom glides this long (auditoría §8: 200 ms), unless motion is reduced. */
export const ZOOM_TRANSITION_MS = 200;
/** One arrow press pans the drawing this far. */
export const ZOOM_PAN_STEP_PX = 48;
export const ZOOM_ROLE_DESCRIPTION = 'lienzo con zoom';
const KEY_SHORTCUTS = '+ - 0 ArrowUp ArrowDown ArrowLeft ArrowRight';
/** Slack on the limits, so ×8 reached by steps of √2 counts as ×8. */
const LIMIT_EPSILON = 1e-9;
const UNMEASURED: ZoomSize = { width: 0, height: 0 };
/** Stands in for the default bounds before the viewport is measured (nothing uses it then). */
const PLACEHOLDER_BOX: ZoomBox = { x: 0, y: 0, width: 1, height: 1 };

export interface ZoomPanOptions {
  /** The canvas' accessible name («Mapa de la ruta», «Marco del planeta»). */
  label: string;
  /** Zoom limits for this scene (default ×1 to ×8). */
  minScale?: number;
  maxScale?: number;
  /** Everything the lab draws, in drawing units; default the viewport (the lab's own framing). */
  bounds?: ZoomBox;
  /** What «Ajustar» frames; default `bounds`. */
  fit?: ZoomBox;
}

type Gestures = Omit<ZoomGestures, 'isPanning' | 'onWheel'>;

/** Spread on the canvas element (a div that holds the svg at its top-left corner). */
export interface ZoomViewportProps extends Gestures {
  ref(element: HTMLDivElement | null): () => void;
  tabIndex: 0;
  role: 'group';
  'aria-roledescription': string;
  'aria-label': string;
  'aria-describedby': string;
  'aria-keyshortcuts': string;
  'data-zoom-viewport': '';
  'data-zoom-panning': '' | undefined;
  style: CSSProperties;
  onKeyDown(event: ReactKeyboardEvent<HTMLElement>): void;
}

export interface ZoomPan {
  readonly view: ZoomView;
  /** The view as an SVG transform, for the group that holds the drawing. */
  readonly transform: string;
  readonly canZoomIn: boolean;
  readonly canZoomOut: boolean;
  readonly canFit: boolean;
  readonly canActualSize: boolean;
  /** Whether the drawing is larger than the viewport, so a drag can move it. */
  readonly isPannable: boolean;
  zoomIn(): void;
  zoomOut(): void;
  fit(): void;
  actualSize(): void;
  panBy(delta: ZoomPoint): void;
  /** Viewport px → drawing units (a pointer, as useDrag reports it) and back. */
  toWorld(point: ZoomPoint): ZoomPoint;
  toScreen(point: ZoomPoint): ZoomPoint;
  /** The id ZoomControls gives the canvas' instructions (aria-describedby). */
  readonly instructionsId: string;
  readonly viewportProps: ZoomViewportProps;
}

function buildFrame(viewport: ZoomSize, options: ZoomPanOptions): ZoomFrame {
  const isMeasured = viewport.width > 0 && viewport.height > 0;
  const bounds = options.bounds ?? (isMeasured ? { x: 0, y: 0, ...viewport } : PLACEHOLDER_BOX);
  const frame = {
    viewport,
    bounds,
    fit: options.fit ?? bounds,
    limits: {
      minScale: options.minScale ?? DEFAULT_ZOOM_LIMITS.minScale,
      maxScale: options.maxScale ?? DEFAULT_ZOOM_LIMITS.maxScale,
    },
  };
  requireZoomFrame(frame);
  return frame;
}

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

/** The glide of button and key zooms: from the view shown to `target`, or a jump. */
function useViewTransition(commit: (view: ZoomView) => void, viewRef: { current: ZoomView }) {
  const isReduced = motionReduced(useGlobalSettings(), usePrefersReducedMotion());
  const isReducedRef = useRef(isReduced);
  isReducedRef.current = isReduced;
  const frameId = useRef<number | undefined>(undefined);
  const targetRef = useRef<ZoomView | undefined>(undefined);

  const stop = useCallback(() => {
    if (frameId.current !== undefined) cancelAnimationFrame(frameId.current);
    frameId.current = undefined;
    targetRef.current = undefined;
  }, []);

  const animateTo = useCallback(
    (target: ZoomView) => {
      stop();
      const from = viewRef.current;
      if (isReducedRef.current || viewsEqual(from, target)) {
        commit(target);
        return;
      }
      const startedAt = performance.now();
      targetRef.current = target;
      const tick = () => {
        const progress = Math.min(1, (performance.now() - startedAt) / ZOOM_TRANSITION_MS);
        commit(interpolateView(from, target, easeOutCubic(progress)));
        frameId.current = progress < 1 ? requestAnimationFrame(tick) : undefined;
        if (progress >= 1) targetRef.current = undefined;
      };
      frameId.current = requestAnimationFrame(tick);
    },
    [commit, stop, viewRef],
  );

  useEffect(() => stop, [stop]);
  /** Where the view is heading: a second press during a glide adds to the first. */
  const destination = useCallback(() => targetRef.current ?? viewRef.current, [viewRef]);
  return { animateTo, stop, destination };
}

/** The measured viewport, kept in state; the ref callback also attaches the wheel listener. */
function useViewport(onWheel: ZoomGestures['onWheel']) {
  const [size, setSize] = useState<ZoomSize>(UNMEASURED);
  const ref = useCallback(
    (element: HTMLDivElement | null) => {
      if (!element) return () => undefined;
      const handleWheel = (event: WheelEvent) => onWheel(event, element);
      element.addEventListener('wheel', handleWheel, { passive: false });
      const observer =
        typeof ResizeObserver === 'undefined'
          ? undefined
          : new ResizeObserver(([entry]) => {
              const { width, height } = entry.contentRect;
              setSize((last) =>
                last.width === width && last.height === height ? last : { width, height },
              );
            });
      observer?.observe(element);
      return () => {
        element.removeEventListener('wheel', handleWheel);
        observer?.disconnect();
      };
    },
    [onWheel],
  );
  return { size, ref };
}

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

/** The live view behind a ref, so stable handlers always read the latest. */
function useViewState() {
  const [view, setView] = useState<ZoomView>(IDENTITY_VIEW);
  const viewRef = useRef(view);
  const commit = useCallback((next: ZoomView) => {
    viewRef.current = next;
    setView(next);
  }, []);
  return { view, viewRef, commit };
}

export function useZoomPan(options: ZoomPanOptions): ZoomPan {
  const instructionsId = `${useId()}-zoom-instructions`;
  const { view, viewRef, commit } = useViewState();
  const frameRef = useRef<ZoomFrame>(buildFrame(UNMEASURED, options));
  const glide = useViewTransition(commit, viewRef);
  const { stop } = glide;
  const host = useMemo<ZoomGestureHost>(
    () => ({ frame: () => frameRef.current, view: () => viewRef.current, commit, stop }),
    [commit, stop, viewRef],
  );
  const { isPanning, onWheel, ...gestures } = useZoomGestures(host);
  const viewport = useViewport(onWheel);
  const frame = buildFrame(viewport.size, options);
  frameRef.current = frame;
  const actions = useZoomActions(frameRef, viewRef, commit, glide);

  // A resized viewport may leave the pan outside the drawing: pull it back.
  useEffect(() => {
    const clamped = clampPan(viewRef.current, frameRef.current);
    if (viewsEqual(clamped, viewRef.current)) return;
    stop();
    commit(clamped);
  }, [viewport.size, commit, stop, viewRef]);

  const isPannable = pannable(view, frame);
  return {
    view,
    transform: viewTransform(view),
    canZoomIn: view.scale < frame.limits.maxScale - LIMIT_EPSILON,
    canZoomOut: view.scale > frame.limits.minScale + LIMIT_EPSILON,
    canFit: !viewsEqual(view, fitView(frame)),
    canActualSize: !viewsEqual(view, actualSizeView(view, frame)),
    isPannable,
    zoomIn: actions.zoomIn,
    zoomOut: actions.zoomOut,
    fit: actions.fit,
    actualSize: actions.actualSize,
    panBy: actions.panBy,
    toWorld: (point) => toWorld(view, point),
    toScreen: (point) => toScreen(view, point),
    instructionsId,
    viewportProps: {
      ref: viewport.ref,
      tabIndex: 0,
      role: 'group',
      'aria-roledescription': ZOOM_ROLE_DESCRIPTION,
      'aria-label': options.label,
      'aria-describedby': instructionsId,
      'aria-keyshortcuts': KEY_SHORTCUTS,
      'data-zoom-viewport': '',
      'data-zoom-panning': isPanning ? '' : undefined,
      style: viewportStyle(isPannable, isPanning),
      onKeyDown: actions.onKeyDown,
      ...gestures,
    },
  };
}

/** Whether the drawing overflows the viewport at this view (so a drag or an arrow moves it). */
function pannable(view: ZoomView, frame: ZoomFrame): boolean {
  const { viewport, bounds } = frame;
  if (viewport.width <= 0 || viewport.height <= 0) return false;
  return (
    bounds.width * view.scale > viewport.width + LIMIT_EPSILON ||
    bounds.height * view.scale > viewport.height + LIMIT_EPSILON
  );
}

/**
 * Touch: while the drawing fits, a vertical swipe scrolls the page (pan-y; the browser's own pinch
 * is off, so a pinch reaches the canvas); once zoomed in, one finger pans the drawing (none).
 */
function viewportStyle(isPannable: boolean, isPanning: boolean): CSSProperties {
  return {
    touchAction: isPannable ? 'none' : 'pan-y',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    cursor: isPanning ? 'grabbing' : isPannable ? 'grab' : undefined,
  };
}

type Glide = ReturnType<typeof useViewTransition>;

/** Buttons and keys: steps about the centre, «Ajustar», «1:1» and the arrows. */
function useZoomActions(
  frameRef: { current: ZoomFrame },
  viewRef: { current: ZoomView },
  commit: (view: ZoomView) => void,
  glide: Glide,
) {
  const { animateTo, destination, stop } = glide;
  const step = useCallback(
    (factor: number) => {
      const { viewport } = frameRef.current;
      const centre = { x: viewport.width / 2, y: viewport.height / 2 };
      animateTo(zoomAt(destination(), factor, centre, frameRef.current));
    },
    [animateTo, destination, frameRef],
  );
  const zoomIn = useCallback(() => step(ZOOM_STEP), [step]);
  const zoomOut = useCallback(() => step(1 / ZOOM_STEP), [step]);
  const fit = useCallback(() => animateTo(fitView(frameRef.current)), [animateTo, frameRef]);
  const actualSize = useCallback(
    () => animateTo(actualSizeView(destination(), frameRef.current)),
    [animateTo, destination, frameRef],
  );
  const pan = useCallback(
    (delta: ZoomPoint) => {
      stop();
      commit(panBy(viewRef.current, delta, frameRef.current));
    },
    [commit, frameRef, stop, viewRef],
  );
  const keyActions = useMemo(() => ({ zoomIn, zoomOut, fit, pan }), [zoomIn, zoomOut, fit, pan]);
  const onKeyDown = useZoomKeys(keyActions, viewRef, destination);
  return { zoomIn, zoomOut, fit, actualSize, panBy: pan, onKeyDown };
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
