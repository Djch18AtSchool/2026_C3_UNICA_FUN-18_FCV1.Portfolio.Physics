import { useRef, type JSX, type KeyboardEvent } from 'react';
import { formatNumber } from '../../../lib/format';
import { TEXT_COLOR } from '../../charts/chartTheme';
import { Arrow, Knob, Label, type Point } from '../../lab/OverlayMarks';
import { useDrag, type DragPoint } from '../../lab/useDrag';
import { JUMP_LIMITS, type JumpResult, type JumpSettings } from './jumpModel';
import {
  handleFromSettings,
  settingsFromHandle,
  stateAt,
  timeFromMarkerDrag,
  type PlotScales,
} from './jumpScene';

export type LaunchSpeeds = Pick<JumpSettings, 'v0' | 'vx'>;

export interface JumpOverlayProps {
  scales: PlotScales;
  settings: JumpSettings;
  live: JumpResult;
  t: number;
  /** Metres drawn per m/s, shared by the launch vector and the velocity vector. */
  lengthPerMs: number;
  color: string;
  showTrail: boolean;
  showVelocity: boolean;
  decimals: number;
  onLaunchChange(next: LaunchSpeeds): void;
  /** A launch-vector drag starts or ends (the lab holds the plot window still meanwhile). */
  onLaunchDragPhase(phase: 'start' | 'end'): void;
  onSeek(t: number): void;
}

/** Neutral, so the launch vector never reads as the dashed blue Earth reference (dark mode). */
const LAUNCH_COLOR = TEXT_COLOR;
const TRAIL_WIDTH = 7;
const TRAIL_OPACITY = 0.3;
/** Arrow keys move the handle by these amounts (m/s); the marker by t_air / MARKER_KEY_STEPS. */
const V0_KEY_STEP = 0.5;
const VX_KEY_STEP = 0.25;
const MARKER_KEY_STEPS = 40;

const clampTo = (value: number, [min, max]: readonly [number, number]) =>
  Math.min(Math.max(value, min), max);

/** The launch speeds an arrow key asks for, or undefined for keys the handle ignores. */
function launchKeyTarget(key: string, { v0, vx }: LaunchSpeeds): LaunchSpeeds | undefined {
  const moves: Record<string, LaunchSpeeds> = {
    ArrowUp: { v0: v0 + V0_KEY_STEP, vx },
    ArrowDown: { v0: v0 - V0_KEY_STEP, vx },
    ArrowRight: { v0, vx: vx + VX_KEY_STEP },
    ArrowLeft: { v0, vx: vx - VX_KEY_STEP },
  };
  const next = moves[key];
  return next && { v0: clampTo(next.v0, JUMP_LIMITS.v0), vx: clampTo(next.vx, JUMP_LIMITS.vx) };
}

/** The t an arrow, Home or End key asks the marker for, or undefined for other keys. */
function markerKeyTarget(key: string, t: number, tAir: number): number | undefined {
  const step = tAir / MARKER_KEY_STEPS;
  const moves: Record<string, number> = {
    ArrowRight: t + step,
    ArrowUp: t + step,
    ArrowLeft: t - step,
    ArrowDown: t - step,
    Home: 0,
    End: tAir,
  };
  const next = moves[key];
  return next === undefined ? undefined : clampTo(next, [0, tAir]);
}

/** "M x y L x y …" through the samples up to t, ending at the state at t. */
function trailPath(live: JumpResult, t: number, scales: PlotScales): string {
  const swept = [...live.points.filter((p) => p.t < t), stateAt(live, t)];
  return swept
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${scales.x.toPx(p.x)} ${scales.y.toPx(p.y)}`)
    .join(' ');
}

/**
 * Everything drawn over the jump plot: the trail up to t, the velocity vector at t, the draggable
 * marker on the curve (seeks t) and the draggable launch vector v⃗₀ = (vₓ, v₀) from the origin.
 * Both handles also take the arrow keys; the sliders below the canvas are their other alternative.
 */
export default function JumpOverlay({
  scales,
  settings,
  live,
  t,
  lengthPerMs,
  color,
  showTrail,
  showVelocity,
  decimals,
  onLaunchChange,
  onLaunchDragPhase,
  onSeek,
}: JumpOverlayProps): JSX.Element {
  const origin = { x: scales.x.toPx(0), y: scales.y.toPx(0) };
  const tip = handleFromSettings(settings, scales, lengthPerMs);
  const now = stateAt(live, t);
  const body = { x: scales.x.toPx(now.x), y: scales.y.toPx(now.y) };
  const velocityTip = {
    x: scales.x.toPx(now.x + settings.vx * lengthPerMs),
    y: scales.y.toPx(now.y + now.vy * lengthPerMs),
  };
  /** Pointer minus tip at grab time, so the knob keeps its offset instead of jumping. */
  const grabOffsetRef = useRef<Point>({ x: 0, y: 0 });
  const format = (value: number, unit: string) =>
    formatNumber(value, { precision: decimals, unit });

  const launchDrag = useDrag(({ x, y, phase }: DragPoint) => {
    if (phase === 'start') {
      grabOffsetRef.current = { x: x - tip.x, y: y - tip.y };
      onLaunchDragPhase('start');
      return;
    }
    const target = { x: x - grabOffsetRef.current.x, y: y - grabOffsetRef.current.y };
    onLaunchChange(settingsFromHandle(target, scales, lengthPerMs, JUMP_LIMITS));
    if (phase === 'end') onLaunchDragPhase('end');
  });

  const markerDrag = useDrag(({ x }: DragPoint) => onSeek(timeFromMarkerDrag(x, scales.x, live)));

  const onLaunchKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    const next = launchKeyTarget(event.key, settings);
    if (!next) return;
    event.preventDefault();
    onLaunchChange(next);
  };

  const onMarkerKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    const next = markerKeyTarget(event.key, t, live.tAir);
    if (next === undefined) return;
    event.preventDefault();
    onSeek(next);
  };

  return (
    <g>
      {showTrail ? (
        <path
          data-trail=""
          d={trailPath(live, t, scales)}
          fill="none"
          stroke={color}
          strokeWidth={TRAIL_WIDTH}
          strokeOpacity={TRAIL_OPACITY}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="pointer-events-none"
        />
      ) : null}
      {showVelocity ? (
        <g data-velocity="">
          <Arrow from={body} to={velocityTip} color={TEXT_COLOR} />
          <Label at={velocityTip}>v</Label>
        </g>
      ) : null}
      <Arrow from={origin} to={tip} color={LAUNCH_COLOR} />
      <Label at={tip}>v₀</Label>
      <g
        data-testid="jump-marker"
        role="slider"
        tabIndex={0}
        aria-label="Instante en la trayectoria"
        aria-valuemin={0}
        aria-valuemax={live.tAir}
        aria-valuenow={t}
        aria-valuetext={`t = ${format(t, 's')}`}
        className="group cursor-ew-resize outline-none"
        onKeyDown={onMarkerKeyDown}
        {...markerDrag}
      >
        <Knob at={body} fill={color} />
      </g>
      <g
        data-testid="launch-handle"
        role="slider"
        tabIndex={0}
        aria-label="Vector de lanzamiento"
        aria-orientation="vertical"
        aria-valuemin={JUMP_LIMITS.v0[0]}
        aria-valuemax={JUMP_LIMITS.v0[1]}
        aria-valuenow={settings.v0}
        aria-valuetext={`v₀ = ${format(settings.v0, 'm/s')}, vₓ = ${format(settings.vx, 'm/s')}`}
        className="group cursor-move outline-none"
        onKeyDown={onLaunchKeyDown}
        {...launchDrag}
      >
        <Knob at={tip} fill={LAUNCH_COLOR} />
      </g>
    </g>
  );
}
