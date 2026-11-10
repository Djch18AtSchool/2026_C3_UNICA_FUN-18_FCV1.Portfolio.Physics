import type { JSX } from 'react';
import { formatNumber } from '../../../lib/format';
import { TICK_COLOR, TICK_FONT_FAMILY } from '../../charts/chartTheme';
import { useElementWidth } from '../../hooks/useElementWidth';
import PowerFlow, { NODE_RADIUS } from './PowerFlow';
import {
  drivePhase,
  FLOW_COLORS,
  KMH_PER_MS,
  M_PER_KM,
  PHASE_TEXT,
  powerFlows,
  W_PER_KW,
  type BalanceAt,
  type DrivePhase,
  type FlowLink,
} from './regenScene';
import RoadStrip, { type LiveBalance } from './RoadStrip';

export interface RegenSceneProps {
  /** The balance at the settled time (phase, flows, description); the car follows `live`. */
  at: BalanceAt;
  live: LiveBalance;
  /** Length of the cycle (m). */
  totalDistance: number;
  vehicleName: string;
  cycleName: string;
  decimals: number;
}

/** viewBox width before the container is measured (SSR, jsdom): the article column. */
const FALLBACK_WIDTH = 720;
const SIDE_PAD = 16;
/** The road's top edge: room above it for the car, about 22 px tall. */
const ROAD_Y = 30;
/** Baseline of "no a escala", level with the km labels under the road. */
const SCALE_NOTE_DROP = 26;
/** From the road's top edge to the row of nodes: road, km labels and the flow labels above the nodes. */
const FLOW_DROP = 84;
/** Under the node row: the node names. */
const FLOW_BOTTOM = 40;
const NOTE_SIZE = 12;
const PHASE_COLORS: Readonly<Record<DrivePhase, string>> = {
  stopped: TICK_COLOR,
  coasting: TICK_COLOR,
  traction: FLOW_COLORS.traction,
  regen: FLOW_COLORS.regen,
  blended: FLOW_COLORS.friction,
  friction: FLOW_COLORS.friction,
};

const FLOW_NAMES: Readonly<Record<FlowLink['id'], string>> = {
  'battery-motor': 'batería–motor',
  'motor-wheels': 'motor–ruedas',
  'wheels-brakes': 'ruedas–frenos',
};

function describeScene(
  { at, totalDistance, vehicleName, cycleName, decimals }: RegenSceneProps,
  flows: FlowLink[],
): string {
  const n = (value: number, unit: string, precision = decimals) =>
    formatNumber(value, { precision, unit });
  const active = flows.filter((flow) => flow.kind !== 'idle');
  const flowText =
    active.length === 0
      ? 'no fluye potencia'
      : active
          .map((flow) => `${FLOW_NAMES[flow.id]}, ${n(flow.power / W_PER_KW, 'kW', 1)}`)
          .join('; ');
  return `${vehicleName} en el ciclo ${cycleName}, no a escala: ${PHASE_TEXT[drivePhase(at)].toLowerCase()} a ${n(at.v * KMH_PER_MS, 'km/h')}, ${n(at.distance / M_PER_KM, 'km')} de ${n(totalDistance / M_PER_KM, 'km')}. Flujo de potencia: ${flowText}.`;
}

/**
 * The regenerative-braking lab's canvas: the car on the cycle drawn as a road, what the wheels are
 * doing now, and the live power flow battery ↔ motor ↔ wheels → friction brakes with widths
 * proportional to |P|. The viewBox follows the measured width, so text keeps its pixel size; the
 * key to the colors and how to read the widths are canvas notes (RegenNotes).
 */
export default function RegenScene(props: RegenSceneProps): JSX.Element {
  const { at, live, totalDistance, vehicleName, cycleName } = props;
  const [wrapperRef, width] = useElementWidth<HTMLDivElement>(FALLBACK_WIDTH);
  const flows = powerFlows(at);
  const phase = drivePhase(at);
  const x0 = SIDE_PAD;
  const x1 = width - SIDE_PAD;
  const flowY = ROAD_Y + FLOW_DROP;
  const height = flowY + NODE_RADIUS + FLOW_BOTTOM;

  return (
    <div data-testid="regen-scene" className="flex flex-col gap-3">
      {/* HTML, not SVG text: the car's name and the longest regime wrap instead of clipping on a phone. */}
      <div className="flex flex-col gap-1">
        <p className="m-0 text-xs text-fg-muted">{`${vehicleName} · ${cycleName}`}</p>
        <p className="m-0 flex items-center gap-2 text-sm font-semibold">
          <span
            aria-hidden="true"
            className="size-2.5 shrink-0 rounded-[2px]"
            style={{ background: PHASE_COLORS[phase] }}
          />
          {PHASE_TEXT[phase]}
        </p>
      </div>
      <div ref={wrapperRef} className="w-full">
        {/* The height is the drawing's own, whatever the width: the server draws it at 720 px. */}
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} className="block">
          <g role="img" aria-label={describeScene(props, flows)}>
            {/* Between the km labels under the road. */}
            <text
              x={width / 2}
              y={ROAD_Y + SCALE_NOTE_DROP}
              textAnchor="middle"
              fontFamily={TICK_FONT_FAMILY}
              fontSize={NOTE_SIZE}
              fill={TICK_COLOR}
            >
              no a escala
            </text>
            <RoadStrip total={totalDistance} x0={x0} x1={x1} y={ROAD_Y} live={live} />
            <PowerFlow flows={flows} x0={x0} x1={x1} y={flowY} />
          </g>
        </svg>
      </div>
    </div>
  );
}
