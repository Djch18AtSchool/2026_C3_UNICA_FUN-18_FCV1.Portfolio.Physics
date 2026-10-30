import type { JSX } from 'react';
import { formatNumber } from '../../../lib/format';
import { TEXT_COLOR, TICK_COLOR, TICK_FONT_FAMILY } from '../../charts/chartTheme';
import { flowWidth, FLOW_COLORS, W_PER_KW, type FlowLink } from './regenScene';

/** Battery, motor, wheels and friction brakes, left to right. */
const NODES = ['Batería', 'Motor', 'Ruedas', 'Frenos'] as const;
export const NODE_RADIUS = 16;
/** Room between a node's circle and the end of a link. */
const LINK_GAP = 3;
/** Arrowhead: base length plus a share of the stroke width, and half-height past the stroke. */
const HEAD_BASE = 7;
const HEAD_PER_WIDTH = 0.4;
const HEAD_HALF_PAD = 4;
const LABEL_RISE = 9;
const LABEL_SIZE = 12;
const NODE_LABEL_DROP = 16;
const NODE_STROKE = 1.5;
const IDLE_DASH = '2 4';
const POWER_PRECISION = 1;
const NODE_FILL = 'var(--bg-elevated)';

/** Centre x of node i when the row spans x0..x1. */
export function nodeX(i: number, x0: number, x1: number): number {
  return x0 + ((x1 - x0) * (i + 0.5)) / NODES.length;
}

/** The small drawing inside each node: cell, motor, wheel, brake disc. */
function NodeGlyph({ index, cx, cy }: { index: number; cx: number; cy: number }): JSX.Element {
  const stroke = { stroke: TEXT_COLOR, strokeWidth: NODE_STROKE, fill: 'none' } as const;
  switch (index) {
    case 0:
      return (
        <g {...stroke}>
          <rect x={cx - 7} y={cy - 4.5} width={13} height={9} rx={1} />
          <rect x={cx + 6} y={cy - 2} width={2} height={4} fill={TEXT_COLOR} />
        </g>
      );
    case 1:
      return (
        <text
          x={cx}
          y={cy}
          dy="0.35em"
          textAnchor="middle"
          fontFamily={TICK_FONT_FAMILY}
          fontSize={LABEL_SIZE}
          fill={TEXT_COLOR}
        >
          M
        </text>
      );
    case 2:
      return (
        <g {...stroke}>
          <circle cx={cx} cy={cy} r={8} />
          <line x1={cx - 8} y1={cy} x2={cx + 8} y2={cy} />
          <line x1={cx} y1={cy - 8} x2={cx} y2={cy + 8} />
        </g>
      );
    default:
      return (
        <g {...stroke}>
          <circle cx={cx} cy={cy} r={8} />
          <path d={`M${cx - 5} ${cy - 10} A11 11 0 0 1 ${cx + 5} ${cy - 10}`} strokeWidth={4} />
        </g>
      );
  }
}

interface LinkProps {
  flow: FlowLink;
  from: number;
  to: number;
  y: number;
}

/** One link: a stroke as wide as its power with a head at the receiving end, or a dashed idle line. */
function Link({ flow, from, to, y }: LinkProps): JSX.Element {
  const { id, kind } = flow;
  const width = flowWidth(flow.power);
  const data = { 'data-flow': id, 'data-kind': kind, 'data-width': width };
  if (kind === 'idle') {
    return (
      <g {...data}>
        <line
          x1={from}
          y1={y}
          x2={to}
          y2={y}
          stroke={TICK_COLOR}
          strokeWidth={1}
          strokeDasharray={IDLE_DASH}
        />
      </g>
    );
  }
  const color = FLOW_COLORS[kind];
  const [start, end] = flow.towards === 'right' ? [from, to] : [to, from];
  const direction = Math.sign(end - start);
  const headLength = HEAD_BASE + HEAD_PER_WIDTH * width;
  const shaftEnd = end - direction * headLength;
  const half = width / 2 + HEAD_HALF_PAD;
  const power = formatNumber(flow.power / W_PER_KW, { precision: POWER_PRECISION, unit: 'kW' });
  return (
    <g {...data}>
      <line x1={start} y1={y} x2={shaftEnd} y2={y} stroke={color} strokeWidth={width} />
      <polygon
        points={`${end},${y} ${shaftEnd},${y - half} ${shaftEnd},${y + half}`}
        fill={color}
      />
      <text
        x={(from + to) / 2}
        y={y - NODE_RADIUS - LABEL_RISE}
        textAnchor="middle"
        fontFamily={TICK_FONT_FAMILY}
        fontSize={LABEL_SIZE}
        fill={TEXT_COLOR}
      >
        {flow.isLowerBound ? `≥ ${power}` : power}
      </text>
    </g>
  );
}

export interface PowerFlowProps {
  flows: FlowLink[];
  x0: number;
  x1: number;
  y: number;
}

/**
 * The live power flow: four nodes in a row, battery to friction brakes, and between them links as
 * wide as the power they carry (4 kW per pixel), pointing the way it flows, labelled in kW.
 */
export default function PowerFlow({ flows, x0, x1, y }: PowerFlowProps): JSX.Element {
  const centres = NODES.map((_, i) => nodeX(i, x0, x1));
  return (
    <g data-testid="power-flow">
      {flows.map((flow, i) => (
        <Link
          key={flow.id}
          flow={flow}
          from={centres[i] + NODE_RADIUS + LINK_GAP}
          to={centres[i + 1] - NODE_RADIUS - LINK_GAP}
          y={y}
        />
      ))}
      {NODES.map((name, i) => (
        <g key={name}>
          <circle
            cx={centres[i]}
            cy={y}
            r={NODE_RADIUS}
            fill={NODE_FILL}
            stroke={TEXT_COLOR}
            strokeWidth={NODE_STROKE}
          />
          <NodeGlyph index={i} cx={centres[i]} cy={y} />
          <text
            x={centres[i]}
            y={y + NODE_RADIUS + NODE_LABEL_DROP}
            textAnchor="middle"
            fontSize={LABEL_SIZE}
            fill={TEXT_COLOR}
          >
            {name}
          </text>
        </g>
      ))}
    </g>
  );
}
