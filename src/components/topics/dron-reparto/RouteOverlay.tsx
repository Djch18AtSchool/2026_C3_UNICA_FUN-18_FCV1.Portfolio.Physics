import { useMemo, useRef, type JSX, type KeyboardEvent } from 'react';
import { formatNumber } from '../../../lib/format';
import type { RouteSample, RouteStop } from '../../../lib/data/droneRoute';
import { CHART_COLORS, SURFACE_COLOR, TEXT_COLOR } from '../../charts/chartTheme';
import type { FrameStore } from '../../lab/frameStore';
import { Arrow, Knob, Label, type Point } from '../../lab/OverlayMarks';
import type { Scale } from '../../lab/plotScales';
import { useDrag, type DragPoint } from '../../lab/useDrag';
import { useFrameDerived } from '../../lab/useFrameTime';
import { clampStop, STOP_BOUNDS, stopKeyTarget, timeFromPoint, trailSamples } from './droneScene';

export type StopIndex = 1 | 2 | 3;

/** v and a wear two palette colors, told apart in the legend (chart 3 and chart 4, as in v1). */
export const VELOCITY_COLOR = CHART_COLORS[2];
export const ACCEL_COLOR = CHART_COLORS[3];
export const ROUTE_COLOR = CHART_COLORS[0];

/** A part of the route's clock (s): the whole route in «Ruta», one leg in «Tramo». */
export interface TimeRange {
  from: number;
  to: number;
}

/** The live clock and the flight's sample at any of its times: what the moving layer draws. */
export interface LiveFlight {
  frame: FrameStore;
  sampleAt(t: number): RouteSample;
}

export interface RouteOverlayProps {
  scales: { x: Scale; y: Scale };
  stops: readonly RouteStop[];
  samples: RouteSample[];
  /** The sample at the settled time (the marker's aria values and keyboard steps). */
  now: RouteSample;
  live: LiveFlight;
  /** What the drone can be dragged or keyed over, and where its trail begins. */
  timeRange: TimeRange;
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
/** The drone marker steps a hundredth of its time range per arrow key. */
const DRONE_KEY_STEPS = 100;
const ORIGIN: Point = { x: 0, y: 0 };
/** Decimals of the moving groups' translations: a stable attribute string per frame. */
const PX_DECIMALS = 2;

const translate = ({ x, y }: Point) =>
  `translate(${x.toFixed(PX_DECIMALS)} ${y.toFixed(PX_DECIMALS)})`;

const clampTime = (t: number, { from, to }: TimeRange) => Math.min(Math.max(t, from), to);

function path(points: Point[], scales: RouteOverlayProps['scales']): string {
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${scales.x.toPx(p.x)} ${scales.y.toPx(p.y)}`)
    .join(' ');
}

/**
 * A vector from the drone (the origin of its group) to `tip`, with its letter just past the tip,
 * along the vector, so it points away from the drone. The letter sits in a group translated to
 * the tip: on a straight leg only that translation changes.
 */
function DroneVector({
  tip,
  color,
  text,
}: {
  tip: Point;
  color: string;
  text: string;
}): JSX.Element {
  const length = Math.hypot(tip.x, tip.y) || 1;
  const along = { x: tip.x / length, y: tip.y / length };
  return (
    <>
      <Arrow from={ORIGIN} to={tip} color={color} />
      <g transform={translate(tip)}>
        <Label
          at={ORIGIN}
          dx={along.x * VECTOR_LABEL_GAP}
          dy={along.y * VECTOR_LABEL_GAP + LABEL_HALF_HEIGHT}
          anchor="middle"
        >
          {text}
        </Label>
      </g>
    </>
  );
}

interface FlightLayerProps {
  live: LiveFlight;
  samples: RouteSample[];
  scales: RouteOverlayProps['scales'];
  /** Where the trail starts: the beginning of the view, not always of the route. */
  trailFrom: number;
  showTrail: boolean;
  showVectors: boolean;
  velocityScale: number;
  accelScale: number;
}

/**
 * The moving layer: the trail flown so far and the drone's v and a vectors at the live time,
 * drawn relative to the drone inside a translated group.
 */
function FlightLayer(props: FlightLayerProps): JSX.Element {
  const { live, samples, scales, trailFrom, showTrail, showVectors } = props;
  const { velocityScale, accelScale } = props;
  const now = useFrameDerived(live.frame, live.sampleAt);
  const toPx = (p: Point) => ({ x: scales.x.toPx(p.x), y: scales.y.toPx(p.y) });
  const drone = toPx(now);
  const relative = (p: Point) => {
    const px = toPx(p);
    return { x: px.x - drone.x, y: px.y - drone.y };
  };
  const velocityTip = relative({
    x: now.x + now.vx * velocityScale,
    y: now.y + now.vy * velocityScale,
  });
  const accelTip = relative({ x: now.x + now.ax * accelScale, y: now.y + now.ay * accelScale });
  return (
    <>
      {showTrail ? (
        <path
          data-trail=""
          d={path(trailSamples(samples, now, trailFrom), scales)}
          fill="none"
          stroke={ROUTE_COLOR}
          strokeWidth={TRAIL_WIDTH}
          strokeOpacity={TRAIL_OPACITY}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="pointer-events-none"
        />
      ) : null}
      {showVectors ? (
        <g data-vectors="" transform={translate(drone)}>
          <DroneVector tip={velocityTip} color={VELOCITY_COLOR} text="vec v" />
          <DroneVector tip={accelTip} color={ACCEL_COLOR} text="vec a" />
        </g>
      ) : null}
    </>
  );
}

/** The drone's knob at the live position, inside its slider group. */
function DroneKnob({ live, scales }: Pick<FlightLayerProps, 'live' | 'scales'>): JSX.Element {
  const now = useFrameDerived(live.frame, live.sampleAt);
  return (
    <g transform={translate({ x: scales.x.toPx(now.x), y: scales.y.toPx(now.y) })}>
      <Knob at={ORIGIN} fill={TEXT_COLOR} />
    </g>
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
  const { scales, stops, samples, now, live, timeRange, decimals, onSeek } = props;
  /** The part of the flight the drone can be dragged over. */
  const reachable = useMemo(
    () => samples.filter((sample) => sample.t >= timeRange.from && sample.t <= timeRange.to),
    [samples, timeRange],
  );
  const toPx = (p: Point) => ({ x: scales.x.toPx(p.x), y: scales.y.toPx(p.y) });
  const depot = toPx(stops[0]);
  const droneDrag = useDrag(({ x, y }: DragPoint) =>
    onSeek(timeFromPoint(reachable, scales.x.toValue(x), scales.y.toValue(y))),
  );
  const onDroneKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    const step = (timeRange.to - timeRange.from) / DRONE_KEY_STEPS;
    const moves: Record<string, number> = {
      ArrowRight: now.t + step,
      ArrowUp: now.t + step,
      ArrowLeft: now.t - step,
      ArrowDown: now.t - step,
      Home: timeRange.from,
      End: timeRange.to,
    };
    const next = moves[event.key];
    if (next === undefined) return;
    event.preventDefault();
    onSeek(clampTime(next, timeRange));
  };

  return (
    <g>
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
      {/* After the depot, so at t = 0 the vectors and the trail paint over its square and label. */}
      <FlightLayer
        live={live}
        samples={samples}
        scales={scales}
        trailFrom={timeRange.from}
        showTrail={props.showTrail}
        showVectors={props.showVectors}
        velocityScale={props.velocityScale}
        accelScale={props.accelScale}
      />
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
        aria-valuemin={timeRange.from}
        aria-valuemax={timeRange.to}
        aria-valuenow={now.t}
        aria-valuetext={`t = ${formatNumber(now.t, { precision: decimals, unit: 's' })}`}
        className="group cursor-grab outline-none"
        onKeyDown={onDroneKeyDown}
        {...droneDrag}
      >
        <DroneKnob live={live} scales={scales} />
      </g>
    </g>
  );
}
