import type { JSX, KeyboardEvent } from 'react';
import { TRIGGER_TRAVEL_MM } from '../../../lib/data/triggerModel';
import { formatNumber } from '../../../lib/format';
import { TEXT_COLOR, TICK_COLOR, TICK_FONT_FAMILY } from '../../charts/chartTheme';
import { useElementWidth } from '../../hooks/useElementWidth';
import { Arrow, ARROW_HEAD, Knob, Label, type Point } from '../../lab/OverlayMarks';
import { useDrag, type DragPoint } from '../../lab/useDrag';
import { useGlobalSettings } from '../../lab/useGlobalSettings';
import { PROFILE_COLOR } from './hapticPlots';
import { leverAngle, triggerKeyTarget, xFromPointer } from './triggerScene';

export interface TriggerLeverProps {
  /** Travel of the trigger, mm (0–8). */
  xMm: number;
  /** Start of the resistance x₀, mm. */
  x0Mm: number;
  /** Force of the trigger on the finger, N. */
  forceN: number;
  /** A travel picked by pointer or key (mm): the finger holds the trigger there. */
  onPress(xMm: number): void;
  /** The pointer let go of the lever at this travel (mm), read from the release point. */
  onRelease(xMm: number): void;
}

/** The lever turns this much over the 8 mm travel, from REST_DEG (slightly up) to 12° down. */
export const MAX_ANGLE_DEG = 24;
const REST_DEG = -12;
const FALLBACK_WIDTH = 720;
const ARM_SHARE = 0.6;
const MIN_ARM = 150;
const MAX_ARM = 280;
/** The pivot sits a little left of centre, so the arc labels fit on the right. */
const PIVOT_SHIFT = 20;
/** The force arrow: 15 px per newton, so 4,8 N (600 N/m at 8 mm) is 72 px. */
const PX_PER_NEWTON = 15;
const MAX_ARROW = 72;
const TOP_ROOM = 22;
/** The finger presses here along the lever, so the force arrow stays clear of the travel arc. */
const CONTACT_SHARE = 0.86;
const BOTTOM_ROOM = 46;
const ARC_GAP = 18;
const TICK_LENGTH = 6;
const TICK_LABEL_GAP = 16;
const X0_LABEL_GAP = 14;
const LEVER_WIDTH = 12;
const LEVER_OUTLINE = 2;
const HIT_WIDTH = 36;
const PIVOT_RADIUS = 7;
const MOUNT = { width: 34, height: 44, hatch: 9 } as const;
/** The value label sits below the tip, leaning left, clear of the arc labels on the right. */
const VALUE_LABEL_DROP = 30;
const VALUE_LABEL_LEAN = 10;
/** F sits left of its arrow tip, away from the x₀ mark and the arc on the right. */
const FORCE_LABEL_GAP = 8;
const TICKS_MM = [0, 2, 4, 6, 8];
const TEXT_SIZE = 12;
const LEVER_FILL = 'color-mix(in srgb, var(--fg) 12%, var(--bg-elevated))';
const DEG = Math.PI / 180;
const X_PRECISION = 1;

const xText = (xMm: number) => formatNumber(xMm, { precision: X_PRECISION, unit: 'mm' });

function polar(c: Point, radius: number, degrees: number): Point {
  return { x: c.x + radius * Math.cos(degrees * DEG), y: c.y + radius * Math.sin(degrees * DEG) };
}

/** The scene's geometry for a measured width: arm length, pivot and canvas height. */
function sceneGeometry(width: number) {
  const arm = Math.min(MAX_ARM, Math.max(MIN_ARM, width * ARM_SHARE));
  const rise = arm * Math.sin(Math.abs(REST_DEG) * DEG);
  const contactRise = CONTACT_SHARE * rise;
  // Above the pivot: the lever at rest, or the longest arrow on the pressed lever.
  const above = Math.max(rise, MAX_ARROW - contactRise);
  const pivot = { x: (width - arm) / 2 - PIVOT_SHIFT, y: TOP_ROOM + above };
  return { arm, pivot, height: pivot.y + rise + BOTTOM_ROOM };
}

/** Hatched block behind the pivot: the controller's body, fixed. */
function Mount({ pivot }: { pivot: Point }): JSX.Element {
  const left = pivot.x - MOUNT.width;
  const top = pivot.y - MOUNT.height / 2;
  const hatches = Array.from(
    { length: Math.floor(MOUNT.height / MOUNT.hatch) },
    (_, index) => `M${left} ${top + (index + 1) * MOUNT.hatch} l${MOUNT.hatch} ${-MOUNT.hatch}`,
  ).join(' ');
  return (
    <g>
      <line
        x1={pivot.x}
        y1={top}
        x2={pivot.x}
        y2={top + MOUNT.height}
        stroke={TEXT_COLOR}
        strokeWidth={2}
      />
      <path d={hatches} stroke={TICK_COLOR} fill="none" />
    </g>
  );
}

/** The dashed travel arc beyond the tip, with a tick every 2 mm and, from x₀ > 0, its mark. */
function TravelArc({ pivot, radius, x0Mm }: { pivot: Point; radius: number; x0Mm: number }) {
  const angleOf = (mm: number) => REST_DEG + leverAngle(mm, TRIGGER_TRAVEL_MM, MAX_ANGLE_DEG);
  const from = polar(pivot, radius, REST_DEG);
  const to = polar(pivot, radius, REST_DEG + MAX_ANGLE_DEG);
  const x0Angle = angleOf(x0Mm);
  return (
    <g fontFamily={TICK_FONT_FAMILY} fontSize={TEXT_SIZE}>
      <path
        d={`M${from.x} ${from.y} A${radius} ${radius} 0 0 1 ${to.x} ${to.y}`}
        fill="none"
        stroke={TICK_COLOR}
        strokeDasharray="3 3"
      />
      {TICKS_MM.map((mm) => {
        const inner = polar(pivot, radius - TICK_LENGTH / 2, angleOf(mm));
        const outer = polar(pivot, radius + TICK_LENGTH / 2, angleOf(mm));
        const label = polar(pivot, radius + TICK_LABEL_GAP, angleOf(mm));
        return (
          <g key={mm}>
            <line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke={TICK_COLOR} />
            <text x={label.x} y={label.y + 4} fill={TICK_COLOR}>
              {mm === TRIGGER_TRAVEL_MM ? `${mm} mm` : mm}
            </text>
          </g>
        );
      })}
      {x0Mm > 0 ? (
        <g data-mark="x0">
          <line
            x1={polar(pivot, radius - TICK_LENGTH, x0Angle).x}
            y1={polar(pivot, radius - TICK_LENGTH, x0Angle).y}
            x2={polar(pivot, radius + TICK_LENGTH, x0Angle).x}
            y2={polar(pivot, radius + TICK_LENGTH, x0Angle).y}
            stroke={PROFILE_COLOR}
            strokeWidth={2}
          />
          <text
            x={polar(pivot, radius - X0_LABEL_GAP, x0Angle).x}
            y={polar(pivot, radius - X0_LABEL_GAP, x0Angle).y + 4}
            fill={TEXT_COLOR}
            textAnchor="end"
          >
            x₀
          </text>
        </g>
      ) : null}
    </g>
  );
}

/**
 * Tema 5's trigger, not to scale: a lever on a pivot pressed through 8 mm (24° of turn), with its
 * travel arc and the force of the trigger on the finger as a live arrow at the tip. The lever is a
 * slider: drag it (pointer anywhere on it), or use the arrow keys (0,1 mm; Shift, 1 mm), Page
 * keys (1 mm), Home and End. The viewBox follows the measured width, so text keeps its size.
 */
export default function TriggerLever({
  xMm,
  x0Mm,
  forceN,
  onPress,
  onRelease,
}: TriggerLeverProps): JSX.Element {
  const [wrapperRef, width] = useElementWidth<HTMLDivElement>(FALLBACK_WIDTH);
  const { decimals } = useGlobalSettings();
  const { arm, pivot, height } = sceneGeometry(width);
  const angle = REST_DEG + leverAngle(xMm, TRIGGER_TRAVEL_MM, MAX_ANGLE_DEG);
  const tip = polar(pivot, arm, angle);
  const contact = polar(pivot, CONTACT_SHARE * arm, angle);
  const arrowLength = Math.min(MAX_ARROW, Math.max(0, forceN) * PX_PER_NEWTON);
  // The trigger pushes the finger back along the lever's normal, against the press.
  const arrowTip = polar(contact, arrowLength, angle - 90);
  const drag = useDrag(({ x, y, phase }: DragPoint) => {
    const travel = xFromPointer({ x, y }, pivot, REST_DEG, TRIGGER_TRAVEL_MM, MAX_ANGLE_DEG);
    if (phase === 'end') onRelease(travel);
    else onPress(travel);
  });
  const onKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    const next = triggerKeyTarget(event.key, event.shiftKey, xMm);
    if (next === undefined) return;
    event.preventDefault();
    onPress(next);
  };
  const rest = polar(pivot, arm, REST_DEG);

  return (
    <div ref={wrapperRef} className="w-full">
      <svg
        data-testid="trigger-lever"
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        className="block h-auto overflow-visible"
      >
        <g
          role="img"
          aria-label={`Gatillo, no a escala, apretado ${xText(xMm)}; empuja el dedo con ${formatNumber(forceN, { precision: decimals, unit: 'N' })}.`}
        >
          <text x={8} y={16} fontFamily={TICK_FONT_FAMILY} fontSize={TEXT_SIZE} fill={TICK_COLOR}>
            no a escala
          </text>
          <Mount pivot={pivot} />
          <line
            x1={pivot.x}
            y1={pivot.y}
            x2={rest.x}
            y2={rest.y}
            stroke={TICK_COLOR}
            strokeDasharray="2 4"
          />
          <TravelArc pivot={pivot} radius={arm + ARC_GAP} x0Mm={x0Mm} />
          <line
            x1={pivot.x}
            y1={pivot.y}
            x2={tip.x}
            y2={tip.y}
            stroke={TEXT_COLOR}
            strokeWidth={LEVER_WIDTH + 2 * LEVER_OUTLINE}
            strokeLinecap="round"
          />
          <line
            x1={pivot.x}
            y1={pivot.y}
            x2={tip.x}
            y2={tip.y}
            style={{ stroke: LEVER_FILL }}
            strokeWidth={LEVER_WIDTH}
            strokeLinecap="round"
          />
          <circle
            cx={pivot.x}
            cy={pivot.y}
            r={PIVOT_RADIUS}
            style={{ fill: 'var(--bg-elevated)' }}
            stroke={TEXT_COLOR}
            strokeWidth={2}
          />
          {arrowLength >= ARROW_HEAD ? (
            <g data-vector="fuerza">
              <Arrow from={contact} to={arrowTip} color={PROFILE_COLOR} />
              <Label at={arrowTip} dx={-FORCE_LABEL_GAP} dy={4} anchor="end">
                F
              </Label>
            </g>
          ) : null}
        </g>
        <g
          data-testid="trigger-handle"
          role="slider"
          tabIndex={0}
          aria-label="Recorrido del gatillo x"
          aria-valuemin={0}
          aria-valuemax={TRIGGER_TRAVEL_MM}
          aria-valuenow={Number(xMm.toFixed(X_PRECISION))}
          aria-valuetext={`x = ${xText(xMm)}`}
          className="group cursor-grab outline-none"
          onKeyDown={onKeyDown}
          {...drag}
        >
          <line
            x1={pivot.x}
            y1={pivot.y}
            x2={tip.x}
            y2={tip.y}
            stroke="transparent"
            strokeWidth={HIT_WIDTH}
            strokeLinecap="round"
          />
          <Knob at={tip} fill={TEXT_COLOR} />
        </g>
        <Label at={tip} dx={VALUE_LABEL_LEAN} dy={VALUE_LABEL_DROP} anchor="end">
          {`x = ${xText(xMm)}`}
        </Label>
      </svg>
    </div>
  );
}
