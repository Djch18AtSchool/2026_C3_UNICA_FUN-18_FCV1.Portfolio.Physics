import type { JSX, KeyboardEvent } from 'react';
import { HABITAT_LIMITS } from '../../../lib/data/habitatPresets';
import { formatNumber } from '../../../lib/format';
import {
  AXIS_COLOR,
  SURFACE_COLOR,
  TEXT_COLOR,
  TICK_COLOR,
  TICK_FONT_FAMILY,
} from '../../charts/chartTheme';
import { Knob, Label } from '../../lab/OverlayMarks';
import { useDrag, type DragPoint } from '../../lab/useDrag';
import { LOG_TICKS, radiusKeyTarget, radiusToSlider, sliderToRadius } from './habitatScene';

export interface RadiusBarProps {
  r: number;
  /** Left and right ends of the track and its height, in viewBox pixels. */
  x0: number;
  x1: number;
  y: number;
  /** A radius picked on the bar (m), by pointer or by key. */
  onRadiusChange(r: number): void;
}

const TRACK_WIDTH = 4;
const TICK_LENGTH = 6;
const MINOR_TICK_LENGTH = 4;
const TICK_LABEL_GAP = 18;
/** The captions sit under the tick labels, so the knob's value label above never meets them. */
const CAPTION_GAP = 38;
const CAPTION_SIZE = 12;
/** Bars shorter than this (phones) put "escala logarítmica" on a second caption line. */
export const COMPACT_BAR = 380;
export const CAPTION_LINE = 16;
const TICK_LABEL_SIZE = 12;
/** Invisible hit band around the track: a 36 px touch target along its whole length. */
const HIT_HALF_HEIGHT = 18;
const HIT_OVERHANG = 12;
/** The radius as the handle announces and labels it, to the 0,1 m a solved radius keeps. */
const RADIUS_PRECISION = 1;

/** Near either end of the bar the value label leans inward, so it never leaves the canvas. */
const END_ZONE = 44;
const VALUE_LABEL_RISE = -14;
const VALUE_LABEL_LEAN = 8;

function valueLabelPlacement(x: number, x0: number, x1: number) {
  if (x - x0 < END_ZONE)
    return { dx: -VALUE_LABEL_LEAN, dy: VALUE_LABEL_RISE, anchor: 'start' as const };
  if (x1 - x < END_ZONE)
    return { dx: VALUE_LABEL_LEAN, dy: VALUE_LABEL_RISE, anchor: 'end' as const };
  return { dx: 0, dy: VALUE_LABEL_RISE, anchor: 'middle' as const };
}

const radiusText = (r: number) => formatNumber(r, { precision: RADIUS_PRECISION, unit: 'm' });

/**
 * The radius r on a logarithmic bar from 5 to 4 000 m, annotated "escala logarítmica", with a
 * draggable handle (role="slider"): pointer anywhere on the bar picks the radius under it, and the
 * arrow keys move it by 1 % of the bar (Shift: 10 %), Home and End to the ends.
 */
export default function RadiusBar({ r, x0, x1, y, onRadiusChange }: RadiusBarProps): JSX.Element {
  const toX = (radius: number) => x0 + radiusToSlider(radius) * (x1 - x0);
  const knob = { x: toX(r), y };
  const drag = useDrag(({ x }: DragPoint) => onRadiusChange(sliderToRadius((x - x0) / (x1 - x0))));
  const onKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    const next = radiusKeyTarget(event.key, event.shiftKey, r);
    if (next === undefined) return;
    event.preventDefault();
    onRadiusChange(next);
  };
  const captionY = y + CAPTION_GAP;
  // On a short bar the two captions would meet: the second one drops to its own line.
  const isCompact = x1 - x0 < COMPACT_BAR;

  return (
    <g>
      <g className="pointer-events-none" fontFamily={TICK_FONT_FAMILY}>
        <text x={x0} y={captionY} fontSize={CAPTION_SIZE} fill={TEXT_COLOR}>
          Radio del piso r
        </text>
        <text
          x={x1}
          y={isCompact ? captionY + CAPTION_LINE : captionY}
          fontSize={CAPTION_SIZE}
          fill={TICK_COLOR}
          textAnchor="end"
        >
          escala logarítmica
        </text>
        <line
          x1={x0}
          y1={y}
          x2={x1}
          y2={y}
          stroke={AXIS_COLOR}
          strokeWidth={TRACK_WIDTH}
          strokeLinecap="round"
        />
        {LOG_TICKS.map((tick) => {
          const x = toX(tick.r);
          const length = tick.label ? TICK_LENGTH : MINOR_TICK_LENGTH;
          return (
            <g key={tick.r}>
              <line
                x1={x}
                y1={y + TRACK_WIDTH / 2}
                x2={x}
                y2={y + TRACK_WIDTH / 2 + length}
                stroke={TICK_COLOR}
              />
              {tick.label ? (
                <text
                  x={x}
                  y={y + TICK_LABEL_GAP}
                  fontSize={TICK_LABEL_SIZE}
                  fill={TICK_COLOR}
                  textAnchor="middle"
                >
                  {tick.label}
                </text>
              ) : null}
            </g>
          );
        })}
      </g>
      <g
        data-testid="radius-handle"
        role="slider"
        tabIndex={0}
        aria-label="Radio en la barra logarítmica"
        aria-valuemin={HABITAT_LIMITS.r[0]}
        aria-valuemax={HABITAT_LIMITS.r[1]}
        aria-valuenow={r}
        aria-valuetext={`r = ${radiusText(r)}`}
        className="group cursor-ew-resize outline-none"
        onKeyDown={onKeyDown}
        {...drag}
      >
        <rect
          x={x0 - HIT_OVERHANG}
          y={y - HIT_HALF_HEIGHT}
          width={x1 - x0 + 2 * HIT_OVERHANG}
          height={2 * HIT_HALF_HEIGHT}
          fill="transparent"
        />
        <Knob at={knob} fill={TEXT_COLOR} stroke={SURFACE_COLOR} />
      </g>
      <Label at={knob} {...valueLabelPlacement(knob.x, x0, x1)}>
        {radiusText(r)}
      </Label>
    </g>
  );
}
