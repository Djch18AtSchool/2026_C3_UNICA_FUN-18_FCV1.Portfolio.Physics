/**
 * The canvas of Tema 13's lab: the rack seen from the side, its supply manifold (cold, blue) on
 * the left and its return manifold (warm, orange) on the right, and one bar per server between
 * them, as long as that server's flow, against a dashed line at each server's minimum. The inlet
 * is at the bottom of the supply; the outlet at the bottom of the return (direct return) or at its
 * top (reverse return). The server that gets least is marked and numbered. Above the drawing, the
 * status chips: the split when it does not converge, the worst server against its minimum, the
 * UQD04 against its nominal flow. Fixed height; the width is measured.
 */
import type { JSX } from 'react';
import { mathTextToString } from '../../../lib/mathNotation';
import {
  AXIS_COLOR,
  TEXT_COLOR,
  TICK_COLOR,
  TICK_FONT_FAMILY,
  TICK_FONT_SIZE,
} from '../../charts/chartTheme';
import { useElementWidth } from '../../hooks/useElementWidth';
import StatusChips from '../../lab/StatusChips';
import { FALLBACK_WIDTH } from './coolingPlotKit';
import { RETURN_COLOR, SUPPLY_COLOR } from './coolingPlots';
import { rackSummary, statusChips } from './coolingLabText';
import type { CoolingScene } from './coolingScene';

/** The drawing's height (px): fixed, so the server draws the height it will have. */
export const RACK_HEIGHT = 240;
const TOP = 28;
const BOTTOM = 32;
/** Room on each side for the port numbers, the inlet and the outlet. */
const SIDE = 64;
const MANIFOLD_WIDTH = 10;
const BAR_GAP = 8;
/** A bar fills this share of its row, and is never thinner than 2 px (44 servers). */
const ROW_FILL = 0.6;
const MIN_BAR = 2;
const FLOW_HEADROOM = 1.15;
const LABEL_GAP = 8;
const ARROW = 6;
const PORT_CLEARANCE = 2;
const FONT = TICK_FONT_SIZE;
const DASH = '4 3';
const NOT_CONVERGED =
  'El reparto no converge con estos valores: el dibujo y las lecturas son los del último reparto válido.';

interface Frame {
  left: number;
  right: number;
  top: number;
  bottom: number;
  /** Bars start here and are `span` px long at the scale's top flow. */
  start: number;
  span: number;
  scale: number;
}

function frameOf(width: number, scene: CoolingScene): Frame {
  const left = SIDE;
  const right = Math.max(width - SIDE, left + 2 * BAR_GAP + 1);
  const start = left + BAR_GAP;
  return {
    left,
    right,
    top: TOP,
    bottom: RACK_HEIGHT - BOTTOM,
    start,
    span: right - BAR_GAP - start,
    scale: Math.max(...scene.flows, scene.minimum) * FLOW_HEADROOM,
  };
}

/** A manifold: a vertical band in its colour, between the rows' top and bottom. */
function Manifold({ x, frame, color }: { x: number; frame: Frame; color: string }) {
  return (
    <rect
      x={x}
      y={frame.top}
      width={MANIFOLD_WIDTH}
      height={frame.bottom - frame.top}
      fill={color}
    />
  );
}

/** «Entra» or «Sale» by an arrow at a manifold's end: into the manifold, or out of it. */
function Port({
  x,
  y,
  side,
  isInlet,
  text,
}: {
  x: number;
  y: number;
  side: 'below' | 'above';
  isInlet: boolean;
  text: string;
}): JSX.Element {
  const outward = side === 'below' ? 1 : -1;
  const near = y + outward * PORT_CLEARANCE;
  const far = near + outward * ARROW;
  const [base, tip] = isInlet ? [far, near] : [near, far];
  return (
    <g>
      <path
        d={`M${x - ARROW / 2} ${base} L${x + ARROW / 2} ${base} L${x} ${tip} Z`}
        fill={TEXT_COLOR}
      />
      <text
        x={x}
        y={side === 'below' ? far + FONT + PORT_CLEARANCE : far - PORT_CLEARANCE * 2}
        textAnchor="middle"
        fill={TEXT_COLOR}
      >
        {text}
      </text>
    </g>
  );
}

/** One bar per server, port 1 at the bottom; the worst one numbered in the left margin. */
function Servers({ scene, frame }: { scene: CoolingScene; frame: Frame }): JSX.Element {
  const rows = scene.flows.length;
  const row = (frame.bottom - frame.top) / rows;
  const height = Math.max(MIN_BAR, row * ROW_FILL);
  return (
    <g>
      {scene.flows.map((flow, i) => {
        const port = i + 1;
        const centre = frame.bottom - (i + 0.5) * row;
        const isWorst = port === scene.worst.port;
        return (
          <g key={port}>
            <line
              x1={frame.left}
              x2={frame.right}
              y1={centre}
              y2={centre}
              stroke={AXIS_COLOR}
              strokeWidth={1}
            />
            <rect
              data-server={port}
              data-worst={isWorst ? '' : undefined}
              x={frame.start}
              y={centre - height / 2}
              width={(flow / frame.scale) * frame.span}
              height={height}
              fill={TEXT_COLOR}
            />
            {isWorst || port === 1 || port === rows ? (
              <text
                x={frame.left - MANIFOLD_WIDTH - LABEL_GAP}
                y={centre}
                dy="0.35em"
                textAnchor="end"
                fontWeight={isWorst ? 600 : 400}
                fill={isWorst ? TEXT_COLOR : TICK_COLOR}
              >
                {port}
              </text>
            ) : null}
          </g>
        );
      })}
    </g>
  );
}

export interface RackDiagramProps {
  /** The last valid scene: it stays drawn while a new split does not converge. */
  scene: CoolingScene;
  isConverged: boolean;
}

export default function RackDiagram({ scene, isConverged }: RackDiagramProps): JSX.Element {
  const [ref, width] = useElementWidth<HTMLDivElement>(FALLBACK_WIDTH);
  const frame = frameOf(width, scene);
  const minimumX = frame.start + (scene.minimum / frame.scale) * frame.span;
  const isDirect = scene.config.layout === 'directo';
  const supplyX = frame.left - MANIFOLD_WIDTH / 2;
  const returnX = frame.right + MANIFOLD_WIDTH / 2;
  return (
    <div className="flex flex-col gap-2">
      <StatusChips
        label="Estado del circuito"
        items={statusChips(scene, isConverged)}
        testId="cooling-status"
      />
      <p role="status" className="sr-only">
        {isConverged ? '' : NOT_CONVERGED}
      </p>
      <div ref={ref} className="w-full min-w-0">
        <svg
          data-testid="rack-diagram"
          role="img"
          aria-label={mathTextToString(rackSummary(scene))}
          viewBox={`0 0 ${width} ${RACK_HEIGHT}`}
          width="100%"
          height={RACK_HEIGHT}
          className="block"
          fontFamily={TICK_FONT_FAMILY}
          fontSize={FONT}
        >
          <Manifold x={frame.left - MANIFOLD_WIDTH} frame={frame} color={SUPPLY_COLOR} />
          <Manifold x={frame.right} frame={frame} color={RETURN_COLOR} />
          <Servers scene={scene} frame={frame} />
          <line
            data-minimum=""
            x1={minimumX}
            x2={minimumX}
            y1={frame.top}
            y2={frame.bottom}
            stroke={TICK_COLOR}
            strokeWidth={2}
            strokeDasharray={DASH}
          />
          <Port x={supplyX} y={frame.bottom} side="below" isInlet text="Entra" />
          <g data-outlet={isDirect ? 'abajo' : 'arriba'}>
            <Port
              x={returnX}
              y={isDirect ? frame.bottom : frame.top}
              side={isDirect ? 'below' : 'above'}
              isInlet={false}
              text="Sale"
            />
          </g>
        </svg>
      </div>
    </div>
  );
}
