import { useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { formatNumber } from '../../lib/format';
import { mathTextToString, mathTextWidth } from '../../lib/mathNotation';
import { SURFACE_COLOR, TEXT_COLOR } from '../charts/chartTheme';
import MathText from './MathText';
import type { Domain, Scale } from './plotScales';
import type { PlotCursor } from './SvgPlot';
import { svgPointFromClient } from './dragMath';
import { isPrimaryPointer, preventTouchPan } from './useDrag';
import { useOptionalFrameTime } from './useFrameTime';

/** The plot area inside the viewBox, in viewBox units. */
export interface PlotArea {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface SvgPlotCursorProps {
  cursor: PlotCursor;
  x: Scale;
  area: PlotArea;
  xLabel: string;
  xUnit: string;
  decimals: number;
  fontSize: number;
}

const FINE_STEP = 0.01;
const COARSE_STEP = 0.1;
const LINE_WIDTH = 1.5;
const KNOB_RADIUS = 7;
const FOCUS_RING_RADIUS = 11;
const FOCUS_RING_COLOR = 'var(--accent)';
/** Half the width of the invisible hit strip along the line: a 24 px target for mouse and pen. */
const HIT_HALF_WIDTH = 12;
/**
 * Half the height of the knob's touch target (24 × 44 px). Only this target cancels touch
 * panning: a vertical swipe that starts on the line below it still scrolls the page.
 */
const KNOB_TARGET_HALF_HEIGHT = 22;
const LABEL_GAP = 14;
/** Centres the label on the plot's top edge (the former dy="0.35em"). */
const LABEL_BASELINE_EM = 0.35;
/** Past this fraction of the plot width, or when it would overrun the plot, the label flips left. */
const LABEL_FLIP_FRACTION = 0.7;
const HALO_WIDTH = 4;
/**
 * Margin of the surface plate under the label. A halo outlines the glyphs only: a series line
 * along the top of the plot (an h₀ or ±L_max) still showed through the spaces of «t = 0,00 s».
 */
const PLATE_PAD = 3;
const PLATE_RADIUS = 2;
/** The plate reaches back to the knob's edge (7 px and its 1 px ring), so no series peeks between. */
const PLATE_KNOB_GAP = KNOB_RADIUS + 1;
/** Decimals of the group's translation, so a frame writes a stable attribute string. */
const TRANSLATE_DECIMALS = 2;

const sameValue = (t: number) => t;

export function clamp(value: number, { min, max }: Domain): number {
  return Math.min(max, Math.max(min, value));
}

/** The cursor value a key moves to, or undefined for keys the slider does not handle. */
export function keyTarget(
  key: string,
  isCoarse: boolean,
  x: number,
  domain: Domain,
): number | undefined {
  const span = domain.max - domain.min;
  const step = span * (isCoarse ? COARSE_STEP : FINE_STEP);
  switch (key) {
    case 'ArrowRight':
    case 'ArrowUp':
      return x + step;
    case 'ArrowLeft':
    case 'ArrowDown':
      return x - step;
    case 'PageUp':
      return x + span * COARSE_STEP;
    case 'PageDown':
      return x - span * COARSE_STEP;
    case 'Home':
      return domain.min;
    case 'End':
      return domain.max;
    default:
      return undefined;
  }
}

/** viewBox x of a pointer, through the inverse of the svg's screen transform. */
function pointerViewBoxX(event: PointerEvent<SVGGElement>): number | undefined {
  const ctm = event.currentTarget.ownerSVGElement?.getScreenCTM();
  if (!ctm) return undefined;
  return svgPointFromClient(ctm.inverse(), event.clientX, event.clientY).x;
}

/**
 * The vertical cursor line; with onChange, a draggable, keyboard-operable slider handle. Everything
 * is drawn at x = 0 inside one group translated to the cursor, so following a playing clock costs
 * one attribute per frame (and the label's text), not one per element. With `cursor.follow` the
 * group tracks the live time; the slider's aria values and its keyboard steps keep the settled x.
 */
export default function SvgPlotCursor({
  cursor,
  x,
  area,
  xLabel,
  xUnit,
  decimals,
  fontSize,
}: SvgPlotCursorProps) {
  const isDraggingRef = useRef(false);
  /** Pointer x minus handle x at grab time, so the knob keeps its offset instead of jumping. */
  const grabOffsetRef = useRef(0);
  const { onChange, follow } = cursor;
  const value = clamp(cursor.x, x.domain);
  const liveT = useOptionalFrameTime(follow?.frame, Number.NaN);
  const shown = follow ? clamp((follow.toX ?? sameValue)(liveT), x.domain) : value;
  const cx = x.toPx(shown);
  const labelText = cursor.label?.(shown);
  const isPastFlipLine = cx > area.left + (area.right - area.left) * LABEL_FLIP_FRACTION;
  const labelWidth = labelText === undefined ? 0 : mathTextWidth(labelText, fontSize, 'mono');
  const wouldOverrun = labelText !== undefined && cx + LABEL_GAP + labelWidth > area.right;
  const isLabelLeft = isPastFlipLine || wouldOverrun;

  const emit = (next: number) => {
    const clamped = clamp(next, x.domain);
    if (onChange && clamped !== value) onChange(clamped);
  };

  const handleKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    const next = keyTarget(event.key, event.shiftKey, value, x.domain);
    if (next === undefined) return;
    event.preventDefault();
    emit(next);
  };

  const handlePointerDown = (event: PointerEvent<SVGGElement>) => {
    // A right- or middle-click opens menus or scrolls; only the primary contact drags.
    if (!isPrimaryPointer(event)) return;
    const handle = event.currentTarget;
    event.preventDefault();
    handle.focus({ preventScroll: true });
    if (typeof handle.setPointerCapture === 'function') handle.setPointerCapture(event.pointerId);
    const px = pointerViewBoxX(event);
    grabOffsetRef.current = px === undefined ? 0 : px - cx;
    isDraggingRef.current = true;
  };

  const handlePointerMove = (event: PointerEvent<SVGGElement>) => {
    if (!isDraggingRef.current) return;
    const px = pointerViewBoxX(event);
    if (px === undefined) return;
    emit(x.toValue(px - grabOffsetRef.current));
  };

  const endDrag = (event: PointerEvent<SVGGElement>) => {
    isDraggingRef.current = false;
    const handle = event.currentTarget;
    if (
      typeof handle.hasPointerCapture === 'function' &&
      handle.hasPointerCapture(event.pointerId)
    ) {
      handle.releasePointerCapture(event.pointerId);
    }
  };

  const translate = `translate(${cx.toFixed(TRANSLATE_DECIMALS)} 0)`;
  const line = (
    <line
      x1={0}
      x2={0}
      y1={area.top}
      y2={area.bottom}
      stroke={TEXT_COLOR}
      strokeWidth={LINE_WIDTH}
    />
  );

  // From here on, x coordinates are relative to the cursor (the group is translated to cx).
  const labelX = isLabelLeft ? -LABEL_GAP : LABEL_GAP;
  const label = labelText ? (
    <>
      <rect
        data-cursor-plate=""
        x={isLabelLeft ? labelX - labelWidth - PLATE_PAD : PLATE_KNOB_GAP}
        y={area.top - fontSize / 2 - PLATE_PAD}
        width={labelWidth + PLATE_PAD + LABEL_GAP - PLATE_KNOB_GAP}
        height={fontSize + 2 * PLATE_PAD}
        rx={PLATE_RADIUS}
        fill={SURFACE_COLOR}
        className="pointer-events-none"
      />
      <MathText
        source={labelText}
        x={labelX}
        y={area.top}
        dy={fontSize * LABEL_BASELINE_EM}
        anchor={isLabelLeft ? 'end' : 'start'}
        fill={TEXT_COLOR}
        fontSize={fontSize}
        halo={{ color: SURFACE_COLOR, width: HALO_WIDTH }}
        className="pointer-events-none"
      />
    </>
  ) : null;

  if (!onChange) {
    return (
      <g data-cursor="" transform={translate}>
        {line}
        {label}
      </g>
    );
  }

  return (
    <g data-cursor="" transform={translate}>
      <g
        role="slider"
        tabIndex={0}
        aria-label={mathTextToString(cursor.ariaLabel || xLabel)}
        aria-valuemin={x.domain.min}
        aria-valuemax={x.domain.max}
        aria-valuenow={value}
        aria-valuetext={
          labelText === undefined
            ? formatNumber(value, { precision: decimals, unit: xUnit })
            : mathTextToString(labelText)
        }
        aria-orientation="horizontal"
        className="group pointer-events-auto cursor-ew-resize outline-none"
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={() => {
          isDraggingRef.current = false;
        }}
      >
        <rect
          data-cursor-strip=""
          x={-HIT_HALF_WIDTH}
          y={area.top}
          width={HIT_HALF_WIDTH * 2}
          height={area.bottom - area.top}
          fill="transparent"
        />
        <rect
          ref={preventTouchPan}
          data-cursor-knob-target=""
          x={-HIT_HALF_WIDTH}
          y={area.top - KNOB_TARGET_HALF_HEIGHT}
          width={HIT_HALF_WIDTH * 2}
          height={KNOB_TARGET_HALF_HEIGHT * 2}
          fill="transparent"
          className="touch-none"
        />
        {line}
        <circle
          cx={0}
          cy={area.top}
          r={FOCUS_RING_RADIUS}
          fill="none"
          stroke={FOCUS_RING_COLOR}
          strokeWidth={2}
          className="opacity-0 group-focus-visible:opacity-100"
        />
        <circle
          data-knob=""
          cx={0}
          cy={area.top}
          r={KNOB_RADIUS}
          fill={TEXT_COLOR}
          stroke={SURFACE_COLOR}
          strokeWidth={2}
        />
      </g>
      {label}
    </g>
  );
}
