/**
 * Zoom and pan for a lab's canvas (auditoría §8 and §12.3). The lab draws as always and puts its
 * drawing in a group with the view's transform (or maps its coordinates through the view); the
 * hook owns the view, the viewport's props and the gestures:
 *
 *   const zoom = useZoomPan({ label: 'Mapa de la ruta', fit: ROUTE_BOX });
 *   <div {...zoom.viewportProps} className="relative">      // the focusable, positioned canvas
 *     <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
 *       <g transform={zoom.transform}>…</g>
 *     </svg>
 *     <ZoomOverlay zoom={zoom} scaleBar={{ pxPerUnit: pxPerKm * zoom.view.scale, units: KM }} />
 *   </div>
 *
 * Buttons, keys and reveals glide for ZOOM_TRANSITION_MS (none under reduced motion); wheel,
 * pinch and drag follow the hand. The initial view is the identity: the server paints it and
 * hydration changes nothing. «Ajustar» frames `fit` (start over); «1:1» goes back to ×1, the
 * drawing's nominal scale (one drawing unit per CSS px), keeping the point at the centre. Without
 * a `fit` or `bounds` of its own the two would be the same view, so `hasActualSize` is false and
 * ZoomControls leaves «1:1» out. README, «Zoom y desplazamiento».
 */
import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { FocusEvent as ReactFocusEvent, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { usePointerPress, type PointerPress, type PointerPressProps } from './usePointerPress';
import { useViewTransition } from './useViewTransition';
import { useZoomActions, type ZoomActions } from './useZoomActions';
import { useZoomGestures, type ZoomGestureHost, type ZoomGestures } from './useZoomGestures';
import {
  isPannableAt,
  UNMEASURED,
  useZoomViewport,
  viewportStyle,
  ZOOM_EPSILON,
} from './useZoomViewport';
import {
  actualSizeView,
  clampPan,
  DEFAULT_ZOOM_LIMITS,
  fitView,
  IDENTITY_VIEW,
  requireZoomFrame,
  toScreen,
  toWorld,
  viewsEqual,
  viewTransform,
  type ZoomBox,
  type ZoomFrame,
  type ZoomPoint,
  type ZoomSize,
  type ZoomView,
} from './zoomMath';

export { ZOOM_TRANSITION_MS } from './useViewTransition';
export { ZOOM_PAN_STEP_PX } from './useZoomActions';
export const ZOOM_ROLE_DESCRIPTION = 'lienzo con zoom';
/** ARIA spells the plus key «Plus»: a bare «+» is its separator of modifiers. */
export const ZOOM_KEY_SHORTCUTS = 'Plus - 0 ArrowUp ArrowDown ArrowLeft ArrowRight';
/** Stands in for the default bounds before the viewport is measured (nothing uses it then). */
const PLACEHOLDER_BOX: ZoomBox = Object.freeze({ x: 0, y: 0, width: 1, height: 1 });
const PLACEHOLDER_FRAME: ZoomFrame = Object.freeze({
  viewport: UNMEASURED,
  bounds: PLACEHOLDER_BOX,
  fit: PLACEHOLDER_BOX,
  limits: DEFAULT_ZOOM_LIMITS,
});

export interface ZoomPanOptions {
  /** The canvas' accessible name («Mapa de la ruta», «Marco del planeta»). */
  label: string;
  /** Zoom limits for this scene (default ×1 to ×8). */
  minScale?: number;
  maxScale?: number;
  /** Everything the lab draws, in drawing units; default the viewport (the lab's own framing). */
  bounds?: ZoomBox;
  /** What «Ajustar» frames (start over); default `bounds`. */
  fit?: ZoomBox;
}

type Gestures = Omit<ZoomGestures, 'isPanning' | 'onWheel'>;

/** Spread on the canvas element (a div that holds the svg at its top-left corner). */
export interface ZoomViewportProps extends Gestures, PointerPressProps {
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
  /** A handle focused outside the view is brought into it, unless a pointer's press focused it. */
  onFocus(event: ReactFocusEvent<HTMLElement>): void;
}

export interface ZoomPan extends Omit<ZoomActions, 'onFocus' | 'onKeyDown'> {
  readonly view: ZoomView;
  /** The view as an SVG transform, for the group that holds the drawing. */
  readonly transform: string;
  readonly canZoomIn: boolean;
  readonly canZoomOut: boolean;
  readonly canFit: boolean;
  readonly canActualSize: boolean;
  /**
   * Whether «1:1» differs from «Ajustar» by construction: the lab declared a `fit` or `bounds` of
   * its own. Known on the server too (it depends on the options, not on a measure).
   */
  readonly hasActualSize: boolean;
  /** Whether the drawing is larger than the viewport, so a drag can move it. */
  readonly isPannable: boolean;
  /**
   * Whether a pointer is pressing inside the canvas now (R30): a handle with a reveal of its own
   * (useKnobReveal) asks it in its focus, as the canvas' own reveal does.
   */
  isPointerPressing(): boolean;
  /** The canvas' measured size (0 × 0 before it is measured: on the server, at the first render). */
  readonly viewportSize: ZoomSize;
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

/** The live view behind a ref, so stable handlers always read the latest. */
function useViewState() {
  const [view, setView] = useState<ZoomView>(IDENTITY_VIEW);
  const viewRef = useRef(view);
  const commit = useMemo(
    () => (next: ZoomView) => {
      viewRef.current = next;
      setView(next);
    },
    [],
  );
  return { view, viewRef, commit };
}

interface ZoomPanParts {
  view: ZoomView;
  frame: ZoomFrame;
  options: ZoomPanOptions;
  actions: ZoomActions;
  gestures: Gestures;
  press: PointerPress;
  isPanning: boolean;
  ref: ZoomViewportProps['ref'];
  instructionsId: string;
}

/** The hook's result, from its parts. */
function zoomPanOf(parts: ZoomPanParts): ZoomPan {
  const { view, frame, options, actions, gestures, press, isPanning, ref, instructionsId } = parts;
  const { onFocus, onKeyDown, ...requests } = actions;
  const isPannable = isPannableAt(view, frame);
  return {
    view,
    transform: viewTransform(view),
    canZoomIn: view.scale < frame.limits.maxScale - ZOOM_EPSILON,
    canZoomOut: view.scale > frame.limits.minScale + ZOOM_EPSILON,
    canFit: !viewsEqual(view, fitView(frame)),
    canActualSize: !viewsEqual(view, actualSizeView(view, frame)),
    hasActualSize: options.fit !== undefined || options.bounds !== undefined,
    isPannable,
    ...requests,
    isPointerPressing: press.isPressing,
    viewportSize: frame.viewport,
    toWorld: (point) => toWorld(view, point),
    toScreen: (point) => toScreen(view, point),
    instructionsId,
    viewportProps: {
      ref,
      tabIndex: 0,
      role: 'group',
      'aria-roledescription': ZOOM_ROLE_DESCRIPTION,
      'aria-label': options.label,
      'aria-describedby': instructionsId,
      'aria-keyshortcuts': ZOOM_KEY_SHORTCUTS,
      'data-zoom-viewport': '',
      'data-zoom-panning': isPanning ? '' : undefined,
      style: viewportStyle(isPannable, isPanning),
      onKeyDown,
      onFocus,
      ...press.props,
      ...gestures,
    },
  };
}

export function useZoomPan(options: ZoomPanOptions): ZoomPan {
  const instructionsId = `${useId()}-zoom-instructions`;
  const { view, viewRef, commit } = useViewState();
  const frameRef = useRef<ZoomFrame>(PLACEHOLDER_FRAME);
  const glide = useViewTransition(commit, viewRef);
  const { stop } = glide;
  const host = useMemo<ZoomGestureHost>(
    () => ({ frame: () => frameRef.current, view: () => viewRef.current, commit, stop }),
    [commit, stop, viewRef],
  );
  const { isPanning, onWheel, ...gestures } = useZoomGestures(host);
  const viewport = useZoomViewport(onWheel);
  const frame = buildFrame(viewport.size, options);
  frameRef.current = frame;
  const press = usePointerPress();
  const actions = useZoomActions(
    { frameRef, viewRef, commit, isPressing: press.isPressing },
    glide,
  );

  // A resized viewport may leave the pan outside the drawing: pull it back.
  useEffect(() => {
    const clamped = clampPan(viewRef.current, frameRef.current);
    if (viewsEqual(clamped, viewRef.current)) return;
    stop();
    commit(clamped);
  }, [viewport.size, commit, stop, viewRef]);

  const ref = viewport.ref;
  return zoomPanOf({
    view,
    frame,
    options,
    actions,
    gestures,
    press,
    isPanning,
    ref,
    instructionsId,
  });
}
