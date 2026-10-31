import type { JSX, KeyboardEvent } from 'react';
import { formatNumber } from '../../../lib/format';
import {
  AXIS_COLOR,
  SURFACE_COLOR,
  TEXT_COLOR,
  TICK_COLOR,
  TICK_FONT_FAMILY,
} from '../../charts/chartTheme';
import { useElementWidth } from '../../hooks/useElementWidth';
import type { FrameStore } from '../../lab/frameStore';
import { Knob, Label } from '../../lab/OverlayMarks';
import { useDrag, type DragPoint } from '../../lab/useDrag';
import { useFrameDerived } from '../../lab/useFrameTime';
import { LIMIT_COLOR } from './MomentumGauge';
import type { DumpActuator, WheelMode } from './wheelLabModel';
import {
  arcPath,
  BODY_FOOTPRINT,
  BODY_HALF_DIAGONAL,
  bodyCorners,
  DEG,
  pointerToDegrees,
  pointsAttribute,
  polar,
  rateArcSweep,
  rotateAbout,
  spokeOpacity,
  TARGET_LIMITS,
  targetKeyTarget,
  type Point,
} from './wheelScene';
import { DisturbanceMarks, FieldLines, RateArc, type SceneGeometry } from './WheelSceneMarks';

/** Neutral body and wheel; the rates in the accent, red when the wheel passes its top speed. */
const BODY_FILL = 'color-mix(in srgb, var(--fg) 7%, var(--bg-elevated))';
const BODY_STROKE = 'var(--fg)';
const RATE_COLOR = 'var(--accent)';

/** viewBox width before the container is measured (SSR, jsdom): the article column. */
const FALLBACK_WIDTH = 720;
/** The dial lives in a square of at most this side. */
const MAX_SIDE = 400;
/** Room outside the dial for the knob and its degree labels. */
const DIAL_MARGIN = 34;
/** Gap between the body's corners and the dial, where the body's rate arc runs. */
const BODY_GAP = 18;
/** The wheel is drawn as this share of the body's short side: not to scale. */
const WHEEL_SHARE = 0.3;
const SPOKES = [0, 120, 240];
const HUB_RADIUS = 3;
const TICK_EVERY = 45;
const TICK_LENGTH = 5;
const NOTE_SIZE = 12;
const NOSE = { depth: 7, half: 6 } as const;
/** The body's rate arc: at most 60° for the plan's peak, centred behind the nose. */
const BODY_ARC_MAX = 60;
const WHEEL_ARC_GAP = 6;
const ZERO_LABEL_GAP = 6;
const TARGET_PRECISION = 0;
const TEXT_INSET = 8;
/** Decimals of the turned groups' angles: a stable attribute string per frame. */
const ANGLE_DECIMALS = 2;
/**
 * The rate arcs grow in steps of this many degrees, so a slow ramp redraws them every few frames:
 * half a degree on the body's wide arc (a degree there is 2,7 px), a degree on the wheel's.
 */
const BODY_ARC_GRAIN_DEG = 0.5;
const WHEEL_ARC_GRAIN_DEG = 1;

const quantize = (value: number, grain: number) => Math.round(value / grain) * grain;
/** SVG's rotate turns clockwise on screen; the laboratory counts counterclockwise, like polar(). */
const rotateAttr = (degrees: number, c: Point) =>
  `rotate(${(-degrees).toFixed(ANGLE_DECIMALS)} ${c.x} ${c.y})`;

/** The body's and the wheel's angles and rates at one time. */
export interface SpinState {
  /** Body angle (°) and rate (°/s). */
  thetaS: number;
  omegaS: number;
  /** Inertial wheel angle (rad) and rate (rpm). */
  thetaW: number;
  omegaW: number;
}

/** The live clock and the spin at any of its times: what the moving layer draws. */
export interface LiveSpin {
  frame: FrameStore;
  spinAt(t: number): SpinState;
}

export interface WheelSceneProps extends SpinState {
  mode: WheelMode;
  /** The spin at the settled time (the description); the drawing follows `live`. */
  live: LiveSpin;
  /** The rate the body's arc is scaled to (°/s). */
  omegaSReference: number;
  rpmMax: number;
  targetDeg: number;
  actuator: DumpActuator;
  dumping: boolean;
  showArrows: boolean;
  onTargetChange(degrees: number): void;
}

type Geometry = SceneGeometry;

function layout(width: number): { side: number; geometry: Geometry } {
  const side = Math.min(width, MAX_SIDE);
  const dial = side / 2 - DIAL_MARGIN;
  const scale = (dial - BODY_GAP) / BODY_HALF_DIAGONAL;
  return {
    side,
    geometry: {
      c: { x: width / 2, y: side / 2 },
      dial,
      scale,
      wheel: WHEEL_SHARE * BODY_FOOTPRINT.short * scale,
    },
  };
}

/** The dial: a thin circle with a tick every 45° and "0°" where the body starts pointing. */
function Dial({ c, dial }: Geometry): JSX.Element {
  const ticks = Array.from({ length: 360 / TICK_EVERY }, (_, i) => i * TICK_EVERY);
  const zero = polar(c, dial + ZERO_LABEL_GAP, 0);
  return (
    <g className="pointer-events-none">
      <circle cx={c.x} cy={c.y} r={dial} fill="none" stroke={AXIS_COLOR} strokeWidth={1.5} />
      {ticks.map((degrees) => {
        const inner = polar(c, dial - TICK_LENGTH, degrees);
        const outer = polar(c, dial, degrees);
        return (
          <line
            key={degrees}
            x1={inner.x}
            y1={inner.y}
            x2={outer.x}
            y2={outer.y}
            stroke={TICK_COLOR}
          />
        );
      })}
      <text
        x={zero.x}
        y={zero.y}
        dy="0.35em"
        fontFamily={TICK_FONT_FAMILY}
        fontSize={NOTE_SIZE}
        fill={TICK_COLOR}
      >
        0°
      </text>
    </g>
  );
}

/** The 6U footprint at `angle` (°), solid or as the dashed target outline, with its nose. */
function Body({
  geometry,
  angle,
  isGhost = false,
}: {
  geometry: Geometry;
  angle: number;
  isGhost?: boolean;
}): JSX.Element {
  const { c, scale } = geometry;
  const radians = angle * DEG;
  const front = c.x + (BODY_FOOTPRINT.long / 2) * scale;
  // The nose marks the front face (the instrument's side), drawn level and turned with the body.
  const nose = [
    { x: front, y: c.y },
    { x: front - NOSE.depth, y: c.y - NOSE.half },
    { x: front - NOSE.depth, y: c.y + NOSE.half },
  ].map((p) => rotateAbout(p, c, radians));
  return (
    <g data-body={isGhost ? 'target' : 'live'} className="pointer-events-none">
      <polygon
        points={pointsAttribute(bodyCorners(c, scale, radians))}
        style={isGhost ? undefined : { fill: BODY_FILL }}
        fill={isGhost ? 'none' : undefined}
        stroke={isGhost ? TICK_COLOR : BODY_STROKE}
        strokeWidth={isGhost ? 1.25 : 1.5}
        strokeDasharray={isGhost ? '5 4' : undefined}
      />
      <polygon
        points={pointsAttribute(nose)}
        fill={isGhost ? 'none' : TICK_COLOR}
        stroke={isGhost ? TICK_COLOR : 'none'}
      />
    </g>
  );
}

/**
 * The wheel seen face-on: rim, hub and three spokes turned to θ_w by one group rotation, fading as
 * it speeds up.
 */
function Wheel({
  geometry,
  thetaW,
  spokeOpacity,
}: {
  geometry: Geometry;
  thetaW: number;
  spokeOpacity: number;
}): JSX.Element {
  const { c, wheel } = geometry;
  return (
    <g data-wheel="" className="pointer-events-none">
      <circle
        cx={c.x}
        cy={c.y}
        r={wheel}
        style={{ fill: SURFACE_COLOR }}
        stroke={BODY_STROKE}
        strokeWidth={1.5}
      />
      <g opacity={spokeOpacity} transform={rotateAttr(thetaW / DEG, c)}>
        {SPOKES.map((offset) => {
          const end = polar(c, wheel, offset);
          return (
            <line
              key={offset}
              x1={c.x}
              y1={c.y}
              x2={end.x}
              y2={end.y}
              stroke={BODY_STROKE}
              strokeWidth={1.5}
            />
          );
        })}
      </g>
      <circle cx={c.x} cy={c.y} r={HUB_RADIUS} fill={BODY_STROKE} />
    </g>
  );
}

/** The arc swept from 0° to the target along the dial, under the knob. */
function TargetSweep({ c, dial, targetDeg }: Geometry & { targetDeg: number }): JSX.Element | null {
  if (targetDeg === 0) return null;
  return (
    <path
      d={arcPath(c, dial, 0, targetDeg)}
      fill="none"
      stroke={RATE_COLOR}
      strokeWidth={3}
      strokeOpacity={0.45}
      strokeLinecap="round"
      className="pointer-events-none"
    />
  );
}

const targetText = (degrees: number) =>
  `θ objetivo = ${formatNumber(degrees, { precision: TARGET_PRECISION, unit: '°' })}`;

/** The target knob on the dial (role="slider"): drag it round, or arrows 1° and Shift 10°. */
function TargetHandle({
  geometry,
  targetDeg,
  onTargetChange,
}: {
  geometry: Geometry;
  targetDeg: number;
  onTargetChange(degrees: number): void;
}): JSX.Element {
  const { c, dial } = geometry;
  const knob = polar(c, dial, targetDeg);
  const drag = useDrag(({ x, y }: DragPoint) => {
    const next = pointerToDegrees(c, { x, y });
    if (next !== targetDeg) onTargetChange(next);
  });
  const onKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    const next = targetKeyTarget(event.key, event.shiftKey, targetDeg);
    if (next === undefined) return;
    event.preventDefault();
    if (next !== targetDeg) onTargetChange(next);
  };
  return (
    <g
      data-testid="target-handle"
      role="slider"
      tabIndex={0}
      aria-label="Dial del ángulo objetivo"
      aria-valuemin={TARGET_LIMITS[0]}
      aria-valuemax={TARGET_LIMITS[1]}
      aria-valuenow={targetDeg}
      aria-valuetext={targetText(targetDeg)}
      className="group cursor-grab outline-none active:cursor-grabbing"
      onKeyDown={onKeyDown}
      {...drag}
    >
      <Knob at={knob} fill={TEXT_COLOR} stroke={SURFACE_COLOR} />
    </g>
  );
}

/**
 * The moving layer: the body turned to the live θ_s by one group rotation, the wheel at θ_w and,
 * with arrows on, the two rate arcs (their sweeps quantized to their grain).
 */
function SpinLayer({
  geometry,
  live,
  omegaSReference,
  rpmMax,
  showArrows,
}: {
  geometry: Geometry;
  live: LiveSpin;
  omegaSReference: number;
  rpmMax: number;
  showArrows: boolean;
}): JSX.Element {
  const { thetaS, omegaS, thetaW, omegaW } = useFrameDerived(live.frame, live.spinAt);
  const { c, dial, wheel } = geometry;
  const wheelArc = rateArcSweep(omegaW, rpmMax);
  const bodyArc = rateArcSweep(omegaS, omegaSReference, BODY_ARC_MAX);
  return (
    <>
      <g data-body-turn="" transform={rotateAttr(thetaS, c)}>
        <Body geometry={geometry} angle={0} />
      </g>
      <Wheel geometry={geometry} thetaW={thetaW} spokeOpacity={spokeOpacity(omegaW)} />
      {showArrows ? (
        <>
          <RateArc
            c={c}
            radius={dial - BODY_GAP / 2}
            centreDeg={thetaS + 180}
            sweep={Math.sign(omegaS) * quantize(bodyArc.sweep, BODY_ARC_GRAIN_DEG)}
            color={RATE_COLOR}
            label="ω_s"
          />
          <RateArc
            c={c}
            radius={wheel + WHEEL_ARC_GAP}
            centreDeg={90}
            sweep={Math.sign(omegaW) * quantize(wheelArc.sweep, WHEEL_ARC_GRAIN_DEG)}
            color={wheelArc.isOver ? LIMIT_COLOR : RATE_COLOR}
            label="ω_w"
          />
        </>
      ) : null}
    </>
  );
}

function describeScene(props: WheelSceneProps): string {
  const deg = (value: number) => formatNumber(value, { precision: 1, unit: '°' });
  const rpm = formatNumber(props.omegaW, { precision: 0, unit: 'rpm' });
  if (props.mode === 'perturbacion') {
    const phase = props.dumping ? 'la descarga la está frenando' : 'absorbe el torque externo';
    return `Vista superior del CubeSat 6U, quieto a 0°, con su rueda de reacción a ${rpm}: ${phase}.`;
  }
  return `Vista superior del CubeSat 6U con su rueda de reacción: la nave está a ${deg(props.thetaS)} de un objetivo de ${deg(props.targetDeg)} y la rueda gira a ${rpm}, en sentido contrario.`;
}

/**
 * The laboratory's canvas: the 6U seen along its slew axis (to scale, 366,0 × 226,3 mm) turning
 * at θ_s inside a dial, the wheel (not to scale) spinning the other way at θ_w, the rate arcs
 * ω_s and ω_w, and the target knob with its dashed outline. In the disturbance mode the body is
 * held at 0° and the dial shows the disturbance and the dump actuator instead of the target.
 */
export default function WheelScene(props: WheelSceneProps): JSX.Element {
  const { mode, live, omegaSReference, rpmMax, targetDeg, showArrows } = props;
  const [wrapperRef, width] = useElementWidth<HTMLDivElement>(FALLBACK_WIDTH);
  const { side, geometry } = layout(width);
  const { c } = geometry;
  const isManeuver = mode === 'maniobra';

  return (
    <div ref={wrapperRef} className="w-full">
      <svg
        data-testid="wheel-scene"
        viewBox={`0 0 ${width} ${side}`}
        width="100%"
        className="block h-auto overflow-visible"
      >
        <g role="img" aria-label={describeScene(props)}>
          <text x={8} y={16} fontFamily={TICK_FONT_FAMILY} fontSize={NOTE_SIZE} fill={TICK_COLOR}>
            6U a escala; rueda no a escala
          </text>
          {!isManeuver && props.actuator === 'magnetopar' ? <FieldLines {...geometry} /> : null}
          <Dial {...geometry} />
          {isManeuver ? <TargetSweep {...geometry} targetDeg={targetDeg} /> : null}
          {isManeuver ? <Body geometry={geometry} angle={targetDeg} isGhost /> : null}
          <SpinLayer
            geometry={geometry}
            live={live}
            omegaSReference={omegaSReference}
            rpmMax={rpmMax}
            showArrows={showArrows}
          />
          {isManeuver ? null : (
            <DisturbanceMarks
              geometry={geometry}
              actuator={props.actuator}
              dumping={props.dumping}
            />
          )}
        </g>
        {isManeuver ? (
          <g data-testid="wheel-dial" data-cx={c.x} data-cy={c.y}>
            <TargetHandle
              geometry={geometry}
              targetDeg={targetDeg}
              onTargetChange={props.onTargetChange}
            />
            <Label at={{ x: width - TEXT_INSET, y: side - TEXT_INSET }} dx={0} dy={0} anchor="end">
              {targetText(targetDeg)}
            </Label>
          </g>
        ) : null}
      </svg>
    </div>
  );
}
