/**
 * The frequency ruler under the resonance lab's bridge: the axis in Hz, the bands that matter in
 * the mode in view (the sweep, Sétra's range 1, Klipper's ± 5 %), its fixed marks (the march pace,
 * f_ZV), the moving drive of the sweep and the f0 knob, dragged or moved with the keys.
 */
import { useRef, type JSX, type KeyboardEvent } from 'react';
import { formatNumber } from '../../../lib/format';
import { mathTextToString } from '../../../lib/mathNotation';
import {
  AXIS_COLOR,
  TEXT_COLOR,
  TICK_COLOR,
  TICK_FONT_FAMILY,
  TICK_FONT_SIZE,
} from '../../charts/chartTheme';
import type { FrameStore } from '../../lab/frameStore';
import MathText from '../../lab/MathText';
import { Knob, LABEL_SIZE } from '../../lab/OverlayMarks';
import { useDrag, type DragPoint } from '../../lab/useDrag';
import { useFrameDerived } from '../../lab/useFrameTime';
import type { Limit } from './resonancePresets';

export interface RulerBand {
  from: number;
  to: number;
  /** Plain text, or `$…$` for a formula. */
  label: string;
  color: string;
}

export interface RulerMark {
  at: number;
  label: string;
}

/** A mark that moves with the clock (the sweep's drive). */
export interface LiveRulerMark {
  frame: FrameStore;
  at(t: number): number;
  label: string;
  color: string;
}

export interface FrequencyRulerProps {
  /** Left and right ends of the axis, and its height, in the svg's px. */
  left: number;
  right: number;
  axisY: number;
  domain: { min: number; max: number };
  bands: readonly RulerBand[];
  marks: readonly RulerMark[];
  live?: LiveRulerMark;
  f0: number;
  limits: Limit;
  decimals: number;
  onF0Change(f0: number): void;
}

const TICK_STEP_HZ = 0.5;
const TICK_LENGTH = 6;
const TICK_LABEL_DROP = 20;
const BAND_HEIGHT = 8;
const BAND_LABEL_RISE = 32;
const MARK_HEIGHT = 14;
const KNOB_LABEL_RISE = 16;
const HALO = { color: 'var(--bg-elevated)', width: 4 } as const;
/** Arrows move f0 one step; with Shift, or PageUp/PageDown, five. */
export const COARSE_STEPS = 5;
const KEY_STEPS: Readonly<Record<string, number>> = {
  ArrowRight: 1,
  ArrowUp: 1,
  ArrowLeft: -1,
  ArrowDown: -1,
  PageUp: COARSE_STEPS,
  PageDown: -COARSE_STEPS,
};
const F0_NAME = mathTextToString('Frecuencia natural $f_0$');

/** Decimal places of a step as written (0,05 → 2). */
const decimalsOf = (step: number) => (String(step).split('.')[1] ?? '').length;

/** The value on the grid min + k·step nearest to `value`, inside the limits. */
export function snapToLimit(value: number, { min, max, step }: Limit): number {
  const snapped = min + Math.round((value - min) / step) * step;
  return Number(Math.min(Math.max(snapped, min), max).toFixed(decimalsOf(step)));
}

/** Where a key moves f0, or undefined for a key the knob does not use. */
export function f0KeyTarget(key: string, isCoarse: boolean, f0: number, limits: Limit) {
  if (key === 'Home') return limits.min;
  if (key === 'End') return limits.max;
  const steps = KEY_STEPS[key];
  if (steps === undefined) return undefined;
  const factor = isCoarse && Math.abs(steps) === 1 ? COARSE_STEPS : 1;
  return snapToLimit(f0 + steps * factor * limits.step, limits);
}

function ticksOf({ min, max }: { min: number; max: number }): number[] {
  const first = Math.ceil(min / TICK_STEP_HZ - 1e-9);
  const last = Math.floor(max / TICK_STEP_HZ + 1e-9);
  return Array.from({ length: last - first + 1 }, (_, i) => (first + i) * TICK_STEP_HZ);
}

/** The sweep's drive, moving along the axis with the live clock. */
function LiveMark({
  live,
  toPx,
  axisY,
}: {
  live: LiveRulerMark;
  toPx(f: number): number;
  axisY: number;
}) {
  // One transform per frame moves the tick and its label together (lab-performance budget).
  const x = useFrameDerived(live.frame, (t) => toPx(live.at(t)));
  return (
    <g
      data-testid="ruler-drive"
      transform={`translate(${x.toFixed(2)} 0)`}
      className="pointer-events-none"
    >
      <line
        x1={0}
        x2={0}
        y1={axisY - MARK_HEIGHT}
        y2={axisY + TICK_LENGTH}
        stroke={live.color}
        strokeWidth={3}
      />
      <MathText
        source={live.label}
        x={0}
        y={axisY + TICK_LABEL_DROP * 2}
        anchor="middle"
        fontSize={TICK_FONT_SIZE}
        fill={TEXT_COLOR}
        halo={HALO}
      />
    </g>
  );
}

function F0Knob({
  x,
  axisY,
  f0,
  limits,
  decimals,
  fromPx,
  onF0Change,
}: Pick<FrequencyRulerProps, 'axisY' | 'f0' | 'limits' | 'decimals' | 'onF0Change'> & {
  x: number;
  fromPx(px: number): number;
}): JSX.Element {
  const grabOffsetRef = useRef(0);
  const text = `$f_0$ = ${formatNumber(f0, { precision: decimals, unit: 'Hz' })}`;
  const drag = useDrag(({ x: pointer, phase }: DragPoint) => {
    if (phase === 'start') {
      grabOffsetRef.current = pointer - x;
      return;
    }
    const next = snapToLimit(fromPx(pointer - grabOffsetRef.current), limits);
    if (next !== f0) onF0Change(next);
  });
  const onKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    const next = f0KeyTarget(event.key, event.shiftKey, f0, limits);
    if (next === undefined) return;
    event.preventDefault();
    if (next !== f0) onF0Change(next);
  };
  return (
    <g
      data-testid="f0-handle"
      role="slider"
      tabIndex={0}
      aria-label={F0_NAME}
      aria-orientation="horizontal"
      aria-valuemin={limits.min}
      aria-valuemax={limits.max}
      aria-valuenow={f0}
      aria-valuetext={mathTextToString(text)}
      className="group cursor-ew-resize outline-none"
      onKeyDown={onKeyDown}
      {...drag}
    >
      <Knob at={{ x, y: axisY }} fill={TEXT_COLOR} />
      <MathText
        source={text}
        x={x}
        y={axisY - KNOB_LABEL_RISE}
        anchor="middle"
        fontSize={LABEL_SIZE}
        fill={TEXT_COLOR}
        halo={HALO}
        className="pointer-events-none"
      />
    </g>
  );
}

interface Axis {
  axisY: number;
  toPx(f: number): number;
}

const BAND_OPACITY = 0.45;

/** The bands that matter in the mode in view, labelled at their left edge. */
function RulerBands({
  bands,
  domain,
  axisY,
  toPx,
}: Axis & Pick<FrequencyRulerProps, 'bands' | 'domain'>): JSX.Element {
  return (
    <>
      {bands.map((band) => {
        const from = toPx(Math.max(band.from, domain.min));
        const to = toPx(Math.min(band.to, domain.max));
        return (
          <g key={band.label} data-ruler-band="" className="pointer-events-none">
            <rect
              x={from}
              y={axisY - BAND_HEIGHT}
              width={Math.max(to - from, 1)}
              height={BAND_HEIGHT}
              fill={band.color}
              opacity={BAND_OPACITY}
            />
            <MathText
              source={band.label}
              x={from}
              y={axisY - BAND_LABEL_RISE}
              fontSize={TICK_FONT_SIZE}
              fill={TICK_COLOR}
              halo={HALO}
            />
          </g>
        );
      })}
    </>
  );
}

/** The axis, a tick every 0,5 Hz with its value, and the unit after the last one. */
function RulerTicks({
  domain,
  axisY,
  toPx,
  left,
  right,
}: Axis & Pick<FrequencyRulerProps, 'domain' | 'left' | 'right'>): JSX.Element {
  const text = { fontFamily: TICK_FONT_FAMILY, fontSize: TICK_FONT_SIZE, fill: TICK_COLOR };
  return (
    <g className="pointer-events-none">
      <line x1={left} x2={right} y1={axisY} y2={axisY} stroke={AXIS_COLOR} strokeWidth={2} />
      {ticksOf(domain).map((f) => (
        <g key={f}>
          <line x1={toPx(f)} x2={toPx(f)} y1={axisY} y2={axisY + TICK_LENGTH} stroke={AXIS_COLOR} />
          <text x={toPx(f)} y={axisY + TICK_LABEL_DROP} textAnchor="middle" {...text}>
            {formatNumber(f, { precision: 1 })}
          </text>
        </g>
      ))}
      <text x={right} y={axisY + TICK_LABEL_DROP} dx={TICK_FONT_SIZE} {...text}>
        Hz
      </text>
    </g>
  );
}

/** The fixed marks (the march pace, f_ZV), labelled under the axis. */
function RulerMarks({ marks, axisY, toPx }: Axis & Pick<FrequencyRulerProps, 'marks'>) {
  return (
    <>
      {marks.map((mark) => (
        <g key={mark.label} data-ruler-mark="" className="pointer-events-none">
          <line
            x1={toPx(mark.at)}
            x2={toPx(mark.at)}
            y1={axisY - MARK_HEIGHT}
            y2={axisY + TICK_LENGTH}
            stroke={TEXT_COLOR}
            strokeWidth={2}
          />
          <MathText
            source={mark.label}
            x={toPx(mark.at)}
            y={axisY + TICK_LABEL_DROP * 2}
            anchor="middle"
            fontSize={TICK_FONT_SIZE}
            fill={TEXT_COLOR}
            halo={HALO}
          />
        </g>
      ))}
    </>
  );
}

export default function FrequencyRuler(props: FrequencyRulerProps): JSX.Element {
  const { left, right, axisY, domain, live } = props;
  const span = domain.max - domain.min;
  const toPx = (f: number) => left + ((f - domain.min) / span) * (right - left);
  const fromPx = (px: number) => domain.min + ((px - left) / (right - left)) * span;
  return (
    <g data-testid="frequency-ruler">
      <RulerBands {...props} toPx={toPx} />
      <RulerTicks {...props} toPx={toPx} />
      <RulerMarks {...props} toPx={toPx} />
      {live ? <LiveMark live={live} toPx={toPx} axisY={axisY} /> : null}
      <F0Knob {...props} x={toPx(props.f0)} fromPx={fromPx} />
    </g>
  );
}
