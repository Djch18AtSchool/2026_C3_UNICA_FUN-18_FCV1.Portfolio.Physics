import { useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { formatNumber } from '../../lib/format';
import { SURFACE_COLOR, TEXT_COLOR, TICK_FONT_FAMILY } from '../charts/chartTheme';
import type { Domain, Scale } from './plotScales';
import type { PlotCursor } from './SvgPlot';
import { preventTouchPan } from './useDrag';

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
/** Half the width of the invisible hit strip along the line: a 24 px touch target. */
const HIT_HALF_WIDTH = 12;
const LABEL_GAP = 14;
/** Past this fraction of the plot width the label flips to the left of the handle. */
const LABEL_FLIP_FRACTION = 0.7;
const HALO_WIDTH = 4;

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
  const inverse = ctm.inverse();
  return inverse.a * event.clientX + inverse.c * event.clientY + inverse.e;
}

/** The vertical cursor line; with onChange, a draggable, keyboard-operable slider handle. */
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
  const { onChange } = cursor;
  const value = clamp(cursor.x, x.domain);
  const cx = x.toPx(value);
  const labelText = cursor.label?.(value);
  const isLabelLeft = cx > area.left + (area.right - area.left) * LABEL_FLIP_FRACTION;

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
    const handle = event.currentTarget;
    event.preventDefault();
    handle.focus();
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

  const line = (
    <line
      x1={cx}
      x2={cx}
      y1={area.top}
      y2={area.bottom}
      stroke={TEXT_COLOR}
      strokeWidth={LINE_WIDTH}
    />
  );

  const label = labelText ? (
    <text
      x={isLabelLeft ? cx - LABEL_GAP : cx + LABEL_GAP}
      y={area.top}
      dy="0.35em"
      textAnchor={isLabelLeft ? 'end' : 'start'}
      fill={TEXT_COLOR}
      fontFamily={TICK_FONT_FAMILY}
      fontSize={fontSize}
      stroke={SURFACE_COLOR}
      strokeWidth={HALO_WIDTH}
      paintOrder="stroke"
      className="pointer-events-none"
    >
      {labelText}
    </text>
  ) : null;

  if (!onChange) {
    return (
      <g data-cursor="">
        {line}
        {label}
      </g>
    );
  }

  return (
    <g data-cursor="">
      <g
        ref={preventTouchPan}
        role="slider"
        tabIndex={0}
        aria-label={xLabel}
        aria-valuemin={x.domain.min}
        aria-valuemax={x.domain.max}
        aria-valuenow={value}
        aria-valuetext={labelText ?? formatNumber(value, { precision: decimals, unit: xUnit })}
        aria-orientation="horizontal"
        className="group pointer-events-auto cursor-ew-resize touch-none outline-none"
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
          x={cx - HIT_HALF_WIDTH}
          y={area.top - HIT_HALF_WIDTH}
          width={HIT_HALF_WIDTH * 2}
          height={area.bottom - area.top + HIT_HALF_WIDTH}
          fill="transparent"
        />
        {line}
        <circle
          cx={cx}
          cy={area.top}
          r={FOCUS_RING_RADIUS}
          fill="none"
          stroke={FOCUS_RING_COLOR}
          strokeWidth={2}
          className="opacity-0 group-focus-visible:opacity-100"
        />
        <circle
          cx={cx}
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
