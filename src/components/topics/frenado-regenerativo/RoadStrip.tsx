import type { JSX } from 'react';
import { formatNumber } from '../../../lib/format';
import { TEXT_COLOR, TICK_COLOR, TICK_FONT_FAMILY } from '../../charts/chartTheme';
import type { FrameStore } from '../../lab/frameStore';
import { useFrameDerived } from '../../lab/useFrameTime';
import {
  drivePhase,
  FLOW_COLORS,
  M_PER_KM,
  roadPosition,
  roadTicks,
  type BalanceAt,
} from './regenScene';

const ROAD_HEIGHT = 10;
const LANE_DASH = '8 6';
const WHEEL_RADIUS = 5;
/** Wheel centres sit this far ahead of and behind the car's centre. */
const AXLE_OFFSET = 14;
/** The car is drawn about 46 px long: never to scale against a road of kilometres. */
export const CAR_HALF_LENGTH = 23;
const REGEN_HALO = 3;
const FRICTION_HALO = 6;
const HALO_WIDTH = 2;
const TICK_LENGTH = 4;
const LABEL_SIZE = 12;
const LABEL_DROP = 16;
const KM_PRECISION = 2;
const ROAD_FILL = 'color-mix(in srgb, var(--fg) 12%, var(--bg-elevated))';
const COVERED_FILL = 'color-mix(in srgb, var(--accent) 28%, var(--bg-elevated))';
const BODY_FILL = 'color-mix(in srgb, var(--fg) 14%, var(--bg-elevated))';
/** Decimals of the car's translation: a stable attribute string per frame. */
const PX_DECIMALS = 2;

/** The live clock and the cycle's balance at any of its times: what the moving layer draws. */
export interface LiveBalance {
  frame: FrameStore;
  atTime(t: number): BalanceAt;
}

/** The stretch of the cycle the road stands for (m) and its tick step (m). */
export interface RoadRange {
  from: number;
  to: number;
  tickEvery: number;
  /** What the strip says under the road, between its end labels: what is not to scale. */
  note: string;
  /** «Conducir»: the stop line, where the cycle's car stops (m of the cycle). */
  line?: number;
}

export interface RoadStripProps {
  range: RoadRange;
  /** Ends of the road and the y of its top edge, in viewBox pixels. */
  x0: number;
  x1: number;
  y: number;
  live: LiveBalance;
}

/** A side view of a hatchback facing right, wheels on y, centred on x. */
function Car({
  x,
  y,
  isRegenerating,
  isFrictionBraking,
}: {
  x: number;
  y: number;
  isRegenerating: boolean;
  isFrictionBraking: boolean;
}): JSX.Element {
  const axle = y - WHEEL_RADIUS;
  const sill = axle - 1;
  const body = `M${x - 23} ${sill} L${x - 23} ${sill - 8} L${x - 13} ${sill - 9} L${x - 7} ${sill - 16} L${x + 8} ${sill - 16} L${x + 15} ${sill - 9} L${x + 22} ${sill - 7} L${x + 23} ${sill} Z`;
  return (
    <g>
      <path d={body} style={{ fill: BODY_FILL }} stroke={TEXT_COLOR} strokeWidth={1.5} />
      {[x - AXLE_OFFSET, x + AXLE_OFFSET].map((cx) => (
        <g key={cx}>
          {isFrictionBraking ? (
            <circle
              data-halo="friction"
              cx={cx}
              cy={axle}
              r={WHEEL_RADIUS + FRICTION_HALO}
              fill="none"
              stroke={FLOW_COLORS.friction}
              strokeWidth={HALO_WIDTH}
            />
          ) : null}
          {isRegenerating ? (
            <circle
              data-halo="regen"
              cx={cx}
              cy={axle}
              r={WHEEL_RADIUS + REGEN_HALO}
              fill="none"
              stroke={FLOW_COLORS.regen}
              strokeWidth={HALO_WIDTH}
            />
          ) : null}
          <circle cx={cx} cy={axle} r={WHEEL_RADIUS} fill={TEXT_COLOR} />
        </g>
      ))}
    </g>
  );
}

const kmLabel = (meters: number) =>
  formatNumber(meters / M_PER_KM, { precision: KM_PRECISION, unit: 'km' });

/**
 * The moving layer: the stretch already driven and the car at the live time, translated along the
 * road (one attribute per frame, plus the tint's width), with its halos from the live phase.
 */
function RoadLive({ range, x0, x1, y, live }: RoadStripProps): JSX.Element {
  const at = useFrameDerived(live.frame, live.atTime);
  const phase = drivePhase(at);
  const along = at.distance - range.from;
  const length = range.to - range.from;
  const carX = roadPosition(along, length, x0 + CAR_HALF_LENGTH, x1 - CAR_HALF_LENGTH);
  const coveredX = roadPosition(along, length, x0, x1);
  return (
    <>
      <rect
        data-covered=""
        x={x0}
        y={y}
        width={(coveredX - x0).toFixed(PX_DECIMALS)}
        height={ROAD_HEIGHT}
        style={{ fill: COVERED_FILL }}
      />
      <g
        data-testid="regen-car"
        data-x={carX}
        transform={`translate(${carX.toFixed(PX_DECIMALS)} 0)`}
      >
        <Car
          x={0}
          y={y}
          isRegenerating={phase === 'regen' || phase === 'blended'}
          isFrictionBraking={phase === 'friction' || phase === 'blended'}
        />
      </g>
    </>
  );
}

/**
 * A stretch of the cycle as a road (the whole cycle, or the stretch of the view «Tramo»): its
 * length spans the strip, what is already driven is tinted, a tick marks every `tickEvery` metres
 * and the car stands where the cycle has taken it, clamped to the road. The end labels give the
 * cycle's distance there. Green halos on the wheels mean the motor brakes; orange-red ones, the
 * friction brakes.
 */
export default function RoadStrip(props: RoadStripProps): JSX.Element {
  const { range, x0, x1, y } = props;
  const length = range.to - range.from;
  return (
    <g>
      <g data-testid="regen-road" data-x1={x1}>
        <rect x={x0} y={y} width={x1 - x0} height={ROAD_HEIGHT} style={{ fill: ROAD_FILL }} />
        <RoadLive {...props} />
        <line
          x1={x0}
          y1={y + ROAD_HEIGHT / 2}
          x2={x1}
          y2={y + ROAD_HEIGHT / 2}
          style={{ stroke: 'var(--bg-elevated)' }}
          strokeDasharray={LANE_DASH}
        />
        {roadTicks(range.from, range.to, range.tickEvery).map((distance) => {
          const tickX = roadPosition(distance - range.from, length, x0, x1);
          return (
            <line
              key={distance}
              x1={tickX}
              y1={y + ROAD_HEIGHT}
              x2={tickX}
              y2={y + ROAD_HEIGHT + TICK_LENGTH}
              stroke={TICK_COLOR}
            />
          );
        })}
        <text
          x={x0}
          y={y + ROAD_HEIGHT + LABEL_DROP}
          fontFamily={TICK_FONT_FAMILY}
          fontSize={LABEL_SIZE}
          fill={TICK_COLOR}
        >
          {kmLabel(range.from)}
        </text>
        <text
          x={x1}
          y={y + ROAD_HEIGHT + LABEL_DROP}
          textAnchor="end"
          fontFamily={TICK_FONT_FAMILY}
          fontSize={LABEL_SIZE}
          fill={TICK_COLOR}
        >
          {kmLabel(range.to)}
        </text>
      </g>
    </g>
  );
}
