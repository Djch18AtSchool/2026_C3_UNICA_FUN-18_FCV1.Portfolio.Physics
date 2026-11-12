import type { JSX } from 'react';
import { formatNumber } from '../../../lib/format';
import { mathTextToString } from '../../../lib/mathNotation';
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
import { TimeScaleBadgeSvg } from '../../lab/TimeScaleBadge';
import { timeScaleLabel, timeScaleSpoken } from '../../lab/timeScaleFormat';
import { useDrag, type DragPoint } from '../../lab/useDrag';
import { useFrameDerived } from '../../lab/useFrameTime';
import { useZoomPan } from '../../lab/useZoomPan';
import { LIMIT_COLOR } from './MomentumGauge';
import type { DumpActuator, WheelMode } from './wheelLabModel';
import {
  arcPath,
  BODY_FOOTPRINT,
  BODY_HALF_DIAGONAL,
  bodyCorners,
  DEG,
  DIAL_MARGIN,
  pointerToDegrees,
  pointsAttribute,
  polar,
  rateArcSweep,
  rotateAbout,
  spokeOpacity,
  TARGET_LIMITS,
  type Point,
  type SceneGeometry,
} from './wheelScene';
import { DisturbanceMarks, FieldLines, RateArc } from './WheelSceneMarks';
import { pxPerCm, zoomGeometry } from './wheelZoom';
import WheelZoomStrip from './WheelZoomStrip';
import { useRefit } from '../../lab/useRefit';
import { useTargetReveal, type TargetKnobHandlers } from './useTargetReveal';

/** Neutral body and wheel; the rates in the accent, red when the wheel passes its top speed. */
const BODY_FILL = 'color-mix(in srgb, var(--fg) 7%, var(--bg-elevated))';
const BODY_STROKE = 'var(--fg)';
const RATE_COLOR = 'var(--accent)';

/**
 * The dial lives in a square of at most this side, and the scene is never wider: the server (and
 * jsdom) draw that square before the width is measured, so the scene keeps its height when it
 * hydrates in the lab's stage, whatever the stage's width (no layout shift).
 */
const MAX_SIDE = 400;
const FALLBACK_WIDTH = MAX_SIDE;
/** Gap between the body's corners and the dial, where the body's rate arc runs. */
const BODY_GAP = 18;
/** The wheel is drawn as this share of the body's short side: not to scale. */
const WHEEL_SHARE = 0.3;
const ZOOM_LABEL = 'Escena de la nave y la rueda';
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
const NOTE_BASELINE = 16;
/** A halo as wide as the badge's and the labels': the note reads over a body or a wheel. */
const NOTE_HALO = 4;
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
  /** Orbit (or maneuver) seconds per real second, the scale the badge declares (wheelTimeScale). */
  timeScale: number;
  onTargetChange(degrees: number): void;
  /** A counter: each change frames the drawing again, as «Ajustar» does («Restablecer»). */
  refit: number;
}

type Geometry = SceneGeometry;

interface ScaleBadgeProps {
  factor: number;
  side: number;
}

/** The drawing as the lab frames it (×1): the view then maps it onto the screen. */
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
      zoom: 1,
      extent: { width, height: side },
    },
  };
}

/** The dial: a thin circle with a tick every 45° and "0°" where the body starts pointing. */
function Dial({ c, dial }: Geometry): JSX.Element {
  const ticks = Array.from({ length: 360 / TICK_EVERY }, (_, i) => i * TICK_EVERY);
  const zero = polar(c, dial + ZERO_LABEL_GAP, 0);
  return (
    <g className="pointer-events-none">
      <circle
        data-dial=""
        cx={c.x}
        cy={c.y}
        r={dial}
        fill="none"
        stroke={AXIS_COLOR}
        strokeWidth={1.5}
      />
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
  const { c, scale, zoom } = geometry;
  const radians = angle * DEG;
  const front = c.x + (BODY_FOOTPRINT.long / 2) * scale;
  // The nose marks the front face (the instrument's side), drawn level and turned with the body;
  // it is part of the body, so it grows with the zoom.
  const nose = [
    { x: front, y: c.y },
    { x: front - NOSE.depth * zoom, y: c.y - NOSE.half * zoom },
    { x: front - NOSE.depth * zoom, y: c.y + NOSE.half * zoom },
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
  const { c, wheel, zoom } = geometry;
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
      <circle cx={c.x} cy={c.y} r={HUB_RADIUS * zoom} fill={BODY_STROKE} />
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
  keys,
}: {
  geometry: Geometry;
  targetDeg: number;
  onTargetChange(degrees: number): void;
  keys: TargetKnobHandlers;
}): JSX.Element {
  const { c, dial } = geometry;
  const knob = polar(c, dial, targetDeg);
  // The angle about the dial's centre is the same on screen and in the drawing: no zoom.toWorld.
  const drag = useDrag(({ x, y }: DragPoint) => {
    const next = pointerToDegrees(c, { x, y });
    if (next !== targetDeg) onTargetChange(next);
  });
  return (
    <g
      data-testid="target-handle"
      role="slider"
      tabIndex={0}
      aria-label="Dial del ángulo objetivo"
      aria-valuemin={TARGET_LIMITS[0]}
      aria-valuemax={TARGET_LIMITS[1]}
      aria-valuenow={targetDeg}
      aria-valuetext={mathTextToString(targetText(targetDeg))}
      className="group cursor-grab outline-none active:cursor-grabbing"
      {...keys}
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
  const { c, dial, wheel, zoom } = geometry;
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
            radius={dial - (BODY_GAP / 2) * zoom}
            centreDeg={thetaS + 180}
            sweep={Math.sign(omegaS) * quantize(bodyArc.sweep, BODY_ARC_GRAIN_DEG)}
            color={RATE_COLOR}
            label="ω_s"
          />
          <RateArc
            c={c}
            radius={wheel + WHEEL_ARC_GAP * zoom}
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
  const scale = `${timeScaleSpoken(props.timeScale, timeScaleLabel(props.timeScale))}.`;
  if (props.mode === 'perturbacion') {
    const phase = props.dumping ? 'la descarga la está frenando' : 'absorbe el torque externo';
    return `Vista superior del CubeSat 6U, quieto a 0°, con su rueda de reacción a ${rpm}: ${phase}. ${scale}`;
  }
  return `Vista superior del CubeSat 6U con su rueda de reacción: la nave está a ${deg(props.thetaS)} de un objetivo de ${deg(props.targetDeg)} y la rueda gira a ${rpm}, en sentido contrario. ${scale}`;
}

/** The badge's two lines (the factor, then its words) end on the same baseline as the corner texts. */
const BADGE_LINE_GAP = 16;

/**
 * The scale the canvas declares, in the same corner in both modes, bottom-left, so the eye finds
 * it again after a mode switch: the target's text and the dump's law go bottom-right. Drawing
 * only: the scene's description says it in words, and the lab's one live region stays the
 * warning's.
 */
function ScaleBadge({ factor, side }: ScaleBadgeProps): JSX.Element {
  return (
    <TimeScaleBadgeSvg
      factor={factor}
      x={TEXT_INSET}
      y={side - TEXT_INSET - BADGE_LINE_GAP}
      anchor="start"
    />
  );
}

/**
 * What is to scale. Painted after the body and the wheel, with the badge: zoomed in, they fill the
 * canvas, and the note that says the bar is the body's, not the wheel's, must not go under them.
 */
function ScaleNote(): JSX.Element {
  return (
    <text
      data-scale-note=""
      x={TEXT_INSET}
      y={NOTE_BASELINE}
      fontFamily={TICK_FONT_FAMILY}
      fontSize={NOTE_SIZE}
      fill={TICK_COLOR}
      stroke={SURFACE_COLOR}
      strokeWidth={NOTE_HALO}
      paintOrder="stroke"
      className="pointer-events-none"
    >
      6U a escala; rueda no a escala
    </text>
  );
}

interface SceneSvgProps {
  props: WheelSceneProps;
  geometry: Geometry;
  keys: TargetKnobHandlers;
}

/** The drawing, through the zoom's geometry: the moving layer, the marks, the badge and the knob. */
function SceneSvg({ props, geometry, keys }: SceneSvgProps): JSX.Element {
  const { mode, live, omegaSReference, rpmMax, targetDeg, showArrows } = props;
  const { c, extent } = geometry;
  const { width, height: side } = extent;
  const isManeuver = mode === 'maniobra';
  return (
    <svg
      data-testid="wheel-scene"
      viewBox={`0 0 ${width} ${side}`}
      width="100%"
      className="block h-auto"
    >
      <g role="img" aria-label={describeScene(props)}>
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
          <DisturbanceMarks geometry={geometry} actuator={props.actuator} dumping={props.dumping} />
        )}
        <ScaleNote />
        <ScaleBadge factor={props.timeScale} side={side} />
      </g>
      {isManeuver ? (
        <g data-testid="wheel-dial" data-cx={c.x} data-cy={c.y}>
          <TargetHandle
            geometry={geometry}
            targetDeg={targetDeg}
            onTargetChange={props.onTargetChange}
            keys={keys}
          />
          <Label at={{ x: width - TEXT_INSET, y: side - TEXT_INSET }} dx={0} dy={0} anchor="end">
            {targetText(targetDeg)}
          </Label>
        </g>
      ) : null}
    </svg>
  );
}

/**
 * The laboratory's canvas: the 6U seen along its slew axis (to scale, 366,0 × 226,3 mm) turning
 * at θ_s inside a dial, the wheel (not to scale) spinning the other way at θ_w, the rate arcs
 * ω_s and ω_w, and the target knob with its dashed outline. In the disturbance mode the body is
 * held at 0° and the dial shows the disturbance and the dump actuator instead of the target.
 *
 * It zooms (useZoomPan): the dial, the body, the wheel and the lines of the field follow the
 * view, and the scale bar, in centimetres of the body (the one part to scale), is recomputed
 * with it; the texts, the strokes, the arrows' size and the knob keep theirs. The bar and the
 * buttons sit in a strip under the square, so they never cover the dial or the knob; the
 * square is the zoom's canvas, so the view's limits are the drawing's own.
 */
export default function WheelScene(props: WheelSceneProps): JSX.Element {
  const [wrapperRef, width] = useElementWidth<HTMLDivElement>(FALLBACK_WIDTH);
  const zoom = useZoomPan({ label: ZOOM_LABEL });
  useRefit(zoom, props.refit);
  const { geometry: base } = layout(width);
  const geometry = zoomGeometry(base, zoom.view);
  const keys = useTargetReveal({
    targetDeg: props.targetDeg,
    onTargetChange: props.onTargetChange,
    zoom,
    knobAt: polar(base.c, base.dial, props.targetDeg),
  });
  return (
    <div ref={wrapperRef} className="mx-auto w-full" style={{ maxWidth: MAX_SIDE }}>
      <div {...zoom.viewportProps} className="relative">
        <SceneSvg props={props} geometry={geometry} keys={keys} />
      </div>
      <WheelZoomStrip zoom={zoom} pxPerCm={pxPerCm(base.scale, zoom.view.scale)} />
    </div>
  );
}
