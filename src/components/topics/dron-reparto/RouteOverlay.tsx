import { useRef, type JSX, type KeyboardEvent } from 'react';
import { formatNumber } from '../../../lib/format';
import type { RouteSample, RouteStop } from '../../../lib/data/droneRoute';
import { CHART_COLORS, SURFACE_COLOR, TEXT_COLOR } from '../../charts/chartTheme';
import { Arrow, Knob, Label, type Point } from '../../lab/OverlayMarks';
import type { Scale } from '../../lab/plotScales';
import { useDrag, type DragPoint } from '../../lab/useDrag';
import { clampStop, STOP_BOUNDS, stopKeyTarget, timeFromPoint, trailSamples } from './droneScene';

export type StopIndex = 1 | 2 | 3;

/** v and a wear two palette colors, told apart in the legend (chart 3 and chart 4, as in v1). */
export const VELOCITY_COLOR = CHART_COLORS[2];
export const ACCEL_COLOR = CHART_COLORS[3];
export const ROUTE_COLOR = CHART_COLORS[0];

export interface RouteOverlayProps {
  scales: { x: Scale; y: Scale };
  stops: readonly RouteStop[];
  samples: RouteSample[];
  now: RouteSample;
  duration: number;
  showVectors: boolean;
  showTrail: boolean;
  /** Map metres per m/s of velocity; the acceleration uses `accelScale` metres per m/s². */
  velocityScale: number;
  accelScale: number;
  decimals: number;
  /** A stop is being dragged to `at` (m): `end` commits it, `start` lets the lab pause. */
  onStopDrag(index: StopIndex, at: Point, phase: DragPoint['phase']): void;
  onSeek(t: number): void;
}

const DELIVERY_INDICES: readonly StopIndex[] = [1, 2, 3];
const DEPOT_SIZE = 10;
const TRAIL_WIDTH = 7;
const TRAIL_OPACITY = 0.3;
/** Below and right of the depot: under the first leg and inside the plot area on phones too. */
const DEPOT_LABEL_OFFSET = { dx: 10, dy: 13 };
/** Stop names sit up and to the left of their knob, clear of the vector labels past the tips. */
const STOP_LABEL_OFFSET = { dx: -10, dy: -10, anchor: 'end' } as const;
/** A vector's letter sits this far past its tip, along the vector. */
const VECTOR_LABEL_GAP = 12;
/** Half the letter height, to centre it vertically on its anchor point. */
const LABEL_HALF_HEIGHT = 4;
/** The drone marker steps duration / DRONE_KEY_STEPS per arrow key. */
const DRONE_KEY_STEPS = 100;

const clampTime = (t: number, duration: number) => Math.min(Math.max(t, 0), duration);

function path(points: Point[], scales: RouteOverlayProps['scales']): string {
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${scales.x.toPx(p.x)} ${scales.y.toPx(p.y)}`)
    .join(' ');
}

/** A vector's letter just past its tip, along the vector, so it points away from the drone. */
function VectorLabel({ from, to, text }: { from: Point; to: Point; text: string }): JSX.Element {
  const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  const along = { x: (to.x - from.x) / length, y: (to.y - from.y) / length };
  return (
    <Label
      at={to}
      dx={along.x * VECTOR_LABEL_GAP}
      dy={along.y * VECTOR_LABEL_GAP + LABEL_HALF_HEIGHT}
      anchor="middle"
    >
      {text}
    </Label>
  );
}

interface StopHandleProps {
  index: StopIndex;
  stop: RouteStop;
  scales: RouteOverlayProps['scales'];
  onStopDrag: RouteOverlayProps['onStopDrag'];
}

/** A delivery stop: draggable with the pointer, moved 10 m (Shift: 100 m) per arrow key. */
function StopHandle({ index, stop, scales, onStopDrag }: StopHandleProps): JSX.Element {
  const at = { x: scales.x.toPx(stop.x), y: scales.y.toPx(stop.y) };
  /** Pointer minus knob at grab time, so the stop keeps its offset instead of jumping. */
  const grabOffsetRef = useRef<Point>({ x: 0, y: 0 });
  const drag = useDrag(({ x, y, phase }: DragPoint) => {
    if (phase === 'start') grabOffsetRef.current = { x: x - at.x, y: y - at.y };
    const px = { x: x - grabOffsetRef.current.x, y: y - grabOffsetRef.current.y };
    onStopDrag(index, clampStop({ x: scales.x.toValue(px.x), y: scales.y.toValue(px.y) }), phase);
  });
  const onKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    const next = stopKeyTarget(event.key, event.shiftKey, stop);
    if (!next) return;
    event.preventDefault();
    onStopDrag(index, next, 'end');
  };
  const metres = (value: number) => formatNumber(value, { precision: 0, unit: 'm' });
  return (
    <g
      data-testid={`stop-${stop.name}`}
      role="slider"
      tabIndex={0}
      aria-label={`Parada ${stop.name}`}
      aria-valuemin={STOP_BOUNDS.x[0]}
      aria-valuemax={STOP_BOUNDS.x[1]}
      aria-valuenow={stop.x}
      aria-valuetext={`x = ${metres(stop.x)}, y = ${metres(stop.y)}`}
      className="group cursor-move outline-none"
      onKeyDown={onKeyDown}
      {...drag}
    >
      <Knob at={at} fill={SURFACE_COLOR} stroke={TEXT_COLOR} />
      <Label at={at} {...STOP_LABEL_OFFSET}>
        {stop.name}
      </Label>
    </g>
  );
}

/**
 * Everything drawn over the route map: the trail flown up to t, the depot, the drone with its v
 * and a vectors, and the three draggable delivery stops. The drone can be dragged along the route
 * (it seeks t) and takes the arrow keys; the stops take them too.
 */
export default function RouteOverlay(props: RouteOverlayProps): JSX.Element {
  const { scales, stops, samples, now, duration, decimals, onSeek } = props;
  const toPx = (p: Point) => ({ x: scales.x.toPx(p.x), y: scales.y.toPx(p.y) });
  const drone = toPx(now);
  const velocityTip = toPx({
    x: now.x + now.vx * props.velocityScale,
    y: now.y + now.vy * props.velocityScale,
  });
  const accelTip = toPx({
    x: now.x + now.ax * props.accelScale,
    y: now.y + now.ay * props.accelScale,
  });
  const depot = toPx(stops[0]);
  const droneDrag = useDrag(({ x, y }: DragPoint) =>
    onSeek(timeFromPoint(samples, scales.x.toValue(x), scales.y.toValue(y))),
  );
  const onDroneKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    const step = duration / DRONE_KEY_STEPS;
    const moves: Record<string, number> = {
      ArrowRight: now.t + step,
      ArrowUp: now.t + step,
      ArrowLeft: now.t - step,
      ArrowDown: now.t - step,
      Home: 0,
      End: duration,
    };
    const next = moves[event.key];
    if (next === undefined) return;
    event.preventDefault();
    onSeek(clampTime(next, duration));
  };

  return (
    <g>
      {props.showTrail ? (
        <path
          data-trail=""
          d={path(trailSamples(samples, now), scales)}
          fill="none"
          stroke={ROUTE_COLOR}
          strokeWidth={TRAIL_WIDTH}
          strokeOpacity={TRAIL_OPACITY}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="pointer-events-none"
        />
      ) : null}
      <g className="pointer-events-none">
        <rect
          data-testid="depot"
          x={depot.x - DEPOT_SIZE / 2}
          y={depot.y - DEPOT_SIZE / 2}
          width={DEPOT_SIZE}
          height={DEPOT_SIZE}
          fill={TEXT_COLOR}
          stroke={SURFACE_COLOR}
          strokeWidth={2}
        />
        <Label at={depot} {...DEPOT_LABEL_OFFSET}>
          Depósito
        </Label>
      </g>
      {props.showVectors ? (
        <g data-vectors="">
          <Arrow from={drone} to={velocityTip} color={VELOCITY_COLOR} />
          <VectorLabel from={drone} to={velocityTip} text="v" />
          <Arrow from={drone} to={accelTip} color={ACCEL_COLOR} />
          <VectorLabel from={drone} to={accelTip} text="a" />
        </g>
      ) : null}
      {DELIVERY_INDICES.map((index) => (
        <StopHandle
          key={index}
          index={index}
          stop={stops[index]}
          scales={scales}
          onStopDrag={props.onStopDrag}
        />
      ))}
      {/* Drawn after the stops: where the drone meets one, the drone stays grabbable. */}
      <g
        data-testid="drone-marker"
        role="slider"
        tabIndex={0}
        aria-label="Instante en la ruta"
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={now.t}
        aria-valuetext={`t = ${formatNumber(now.t, { precision: decimals, unit: 's' })}`}
        className="group cursor-grab outline-none"
        onKeyDown={onDroneKeyDown}
        {...droneDrag}
      >
        <Knob at={drone} fill={TEXT_COLOR} />
      </g>
    </g>
  );
}
