import type { JSX } from 'react';
import { formatNumber } from '../../../lib/format';
import { LINE_WIDTH, TICK_COLOR, TICK_FONT_FAMILY } from '../../charts/chartTheme';
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
const KEY_WIDTH = 26;
const KEY_HEIGHT = 12;
/** Keeps "(1 − η)" on one line. */
const NBSP = '\u00a0';

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

function LegendKey({ color }: { color: string }): JSX.Element {
  const mid = KEY_HEIGHT / 2;
  return (
    <svg width={KEY_WIDTH} height={KEY_HEIGHT} aria-hidden="true" className="shrink-0">
      <line
        x1="1"
        y1={mid}
        x2={KEY_WIDTH - 8}
        y2={mid}
        stroke={color}
        strokeWidth={LINE_WIDTH + 2}
      />
      <polygon
        points={`${KEY_WIDTH - 1},${mid} ${KEY_WIDTH - 9},1 ${KEY_WIDTH - 9},11`}
        fill={color}
      />
    </svg>
  );
}

const LEGEND: readonly { color: string; text: string }[] = [
  { color: FLOW_COLORS.traction, text: 'Tracción: de la batería a las ruedas' },
  { color: FLOW_COLORS.regen, text: 'Regeneración: de las ruedas a la batería' },
  { color: FLOW_COLORS.friction, text: 'Calor de fricción en los frenos' },
];

/**
 * The regenerative-braking lab's canvas: the car on the cycle drawn as a road, what the wheels are
 * doing now, and the live power flow battery ↔ motor ↔ wheels → friction brakes with widths
 * proportional to |P|. The viewBox follows the measured width, so text keeps its pixel size.
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
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" className="block h-auto">
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
      <ul
        aria-label="Leyenda del flujo de potencia"
        className="m-0 flex list-none flex-wrap gap-x-5 gap-y-1 p-0 text-sm"
      >
        {LEGEND.map(({ color, text }) => (
          <li key={text} className="m-0 flex items-center gap-2">
            <LegendKey color={color} />
            {text}
          </li>
        ))}
      </ul>
      <p className="m-0 text-sm text-fg-muted">
        El grosor es proporcional a |P|: 20 kW = 5 px. Al regenerar, la diferencia de grosor entre
        el enlace del motor y el de la batería son las pérdidas de conversión (1{NBSP}−{NBSP}η). El
        aro verde en las ruedas indica que frena el motor y el naranja, que frenan las pastillas. Al
        traccionar, el modelo solo calcula la potencia en las ruedas: la batería entrega al menos
        eso (≥).
      </p>
    </div>
  );
}
