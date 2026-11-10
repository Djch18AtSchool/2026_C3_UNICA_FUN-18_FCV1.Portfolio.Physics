import type { JSX } from 'react';
import { formatNumber } from '../../../lib/format';
import { SURFACE_COLOR, TEXT_COLOR, TICK_COLOR, TICK_FONT_FAMILY } from '../../charts/chartTheme';
import { mathTextToString } from '../../../lib/mathNotation';
import MathText from '../../lab/MathText';
import { arrow, spinArc, type Point } from './diagramGeometry';
import { DIAGRAM_FACTS, WHEEL_COLORS } from './wheelFigures';

const VIEW = { width: 360, height: 300 } as const;
const DIVIDER_X = 190;
/** Top view: body footprint (6U proportions, not to scale), wheel and the two spin arcs. */
const TOP = { x: 95, y: 150 } as const;
const BODY = { width: 88, height: 128 } as const;
const WHEEL_RADIUS = 26;
const WHEEL_SPIN_RADIUS = 35;
const BODY_SPIN_RADIUS = 86;
/** Side view: the z axis and the two angular momenta drawn from one point, equal and opposite. */
const AXIS_X = 236;
const ORIGIN_Y = 150;
const L_LENGTH = 70;
const AXIS_REACH = 100;
const VECTOR_WIDTH = 3;
const TITLE_Y = 24;
const BOTTOM_Y = 278;
const TEXT_SIZE = 14;
const MATH_SIZE = 16;
const HALO_WIDTH = 4;

const textStyle = { fontFamily: TICK_FONT_FAMILY, fontSize: TEXT_SIZE, fill: TEXT_COLOR } as const;
const HALO = { color: SURFACE_COLOR, width: HALO_WIDTH } as const;

/** An equation or symbol of the sketch in the MathText notation, in the text color on a halo. */
function Equation({
  source,
  x,
  y,
  anchor = 'start',
}: {
  source: string;
  x: number;
  y: number;
  anchor?: 'start' | 'middle' | 'end';
}): JSX.Element {
  return (
    <MathText
      source={source}
      x={x}
      y={y}
      anchor={anchor}
      fontSize={MATH_SIZE}
      fill={TEXT_COLOR}
      halo={HALO}
    />
  );
}

/** A straight vector (diagramGeometry's `arrow`) in one color. */
function Vector({
  name,
  from,
  to,
  color,
}: {
  name: string;
  from: Point;
  to: Point;
  color: string;
}) {
  const vector = arrow(from, to);
  return (
    <g data-vector={name} stroke={color} fill={color}>
      <line
        x1={vector.x1}
        y1={vector.y1}
        x2={vector.x2}
        y2={vector.y2}
        strokeWidth={VECTOR_WIDTH}
      />
      <polygon points={vector.head} strokeWidth={1} />
    </g>
  );
}

/**
 * A circular arc around `centre` from `from` to `to` degrees (diagramGeometry's `spinArc`):
 * growing angles turn clockwise on screen.
 */
function SpinArc({
  name,
  centre,
  radius,
  from,
  to,
  color,
}: {
  name: string;
  centre: Point;
  radius: number;
  from: number;
  to: number;
  color: string;
}) {
  const arc = spinArc({ cx: centre.x, cy: centre.y, rx: radius, ry: radius }, from, to);
  return (
    <g data-spin={name} data-sense={arc.sense}>
      <path d={arc.d} fill="none" stroke={color} strokeWidth={VECTOR_WIDTH} strokeLinecap="round" />
      <polygon points={arc.head} fill={color} />
    </g>
  );
}

function TopView(): JSX.Element {
  return (
    <g>
      <text x={TOP.x} y={TITLE_Y} textAnchor="middle" {...textStyle}>
        Vista desde arriba
      </text>
      <text x={TOP.x} y={TITLE_Y + 18} textAnchor="middle" {...textStyle} fill={TICK_COLOR}>
        (z apunta hacia ti)
      </text>
      <rect
        x={TOP.x - BODY.width / 2}
        y={TOP.y - BODY.height / 2}
        width={BODY.width}
        height={BODY.height}
        rx={3}
        fill={`color-mix(in srgb, ${TEXT_COLOR} 7%, ${SURFACE_COLOR})`}
        stroke={TEXT_COLOR}
        strokeWidth={1.75}
      />
      <circle
        cx={TOP.x}
        cy={TOP.y}
        r={WHEEL_RADIUS}
        fill={SURFACE_COLOR}
        stroke={TEXT_COLOR}
        strokeWidth={1.5}
      />
      <text x={TOP.x} y={TOP.y + 5} textAnchor="middle" {...textStyle}>
        rueda
      </text>
      <text x={TOP.x} y={TOP.y + BODY.height / 2 - 10} textAnchor="middle" {...textStyle}>
        nave
      </text>
      {/* The wheel turns counterclockwise (ω_w along +z), the body clockwise (ω_s along −z). */}
      <SpinArc
        name="rueda"
        centre={TOP}
        radius={WHEEL_SPIN_RADIUS}
        from={60}
        to={-190}
        color={WHEEL_COLORS.wheel}
      />
      <Equation x={TOP.x + 20} y={TOP.y - 46} source="ω_w" />
      <SpinArc
        name="nave"
        centre={TOP}
        radius={BODY_SPIN_RADIUS}
        from={-160}
        to={70}
        color={WHEEL_COLORS.body}
      />
      <Equation x={TOP.x - 82} y={TOP.y - 76} source="ω_s" />
    </g>
  );
}

function AxisView(): JSX.Element {
  const origin = { x: AXIS_X, y: ORIGIN_Y };
  return (
    <g>
      <text x={(DIVIDER_X + VIEW.width) / 2} y={TITLE_Y} textAnchor="middle" {...textStyle}>
        Sobre el eje z
      </text>
      <line
        x1={AXIS_X}
        y1={ORIGIN_Y - AXIS_REACH}
        x2={AXIS_X}
        y2={ORIGIN_Y + AXIS_REACH}
        stroke={TICK_COLOR}
        strokeDasharray="10 3 2 3"
      />
      <text x={AXIS_X - 8} y={ORIGIN_Y - AXIS_REACH + 6} textAnchor="end" {...textStyle}>
        z
      </text>
      <Vector
        name="L-rueda"
        from={origin}
        to={{ x: AXIS_X, y: ORIGIN_Y - L_LENGTH }}
        color={WHEEL_COLORS.wheel}
      />
      <Vector
        name="L-nave"
        from={origin}
        to={{ x: AXIS_X, y: ORIGIN_Y + L_LENGTH }}
        color={WHEEL_COLORS.body}
      />
      <circle cx={AXIS_X} cy={ORIGIN_Y} r={3} fill={TEXT_COLOR} />
      <Equation x={AXIS_X + 12} y={ORIGIN_Y - L_LENGTH + 14} source="L_w = I_w ω_w" />
      <Equation x={AXIS_X + 12} y={ORIGIN_Y + 5} source="L_s + L_w = 0" />
      <Equation x={AXIS_X + 12} y={ORIGIN_Y + L_LENGTH - 6} source="L_s = I_s ω_s" />
    </g>
  );
}

/**
 * Step 1's sketch: with no external torque and everything starting at rest, the wheel and the body
 * turn opposite ways (top view) and their angular momenta along z are equal and opposite (side
 * view). I_s/I_w ≈ 1940 for the 6U and the RW400, so the wheel turns about 1940 times faster.
 */
export default function ExchangeDiagram(): JSX.Element {
  const ratio = formatNumber(DIAGRAM_FACTS.inertiaRatio, { precision: 0 });
  const wheelPerBody = formatNumber(-DIAGRAM_FACTS.inertiaRatio, { precision: 0 });
  return (
    <svg
      role="img"
      aria-label={mathTextToString(
        `Momento angular de la nave y de la rueda. Vista desde arriba: la rueda gira en sentido antihorario y la nave en sentido horario. Sobre el eje z: L_w hacia arriba y L_s hacia abajo, del mismo largo, de modo que L_s + L_w = 0. Con I_s/I_w ≈ ${ratio}, la rueda gira unas ${ratio} veces más rápido que la nave.`,
      )}
      viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
      width="100%"
      className="mx-auto block h-auto max-w-[30rem]"
    >
      <line
        x1={DIVIDER_X}
        y1={TITLE_Y + 12}
        x2={DIVIDER_X}
        y2={BOTTOM_Y - 26}
        stroke={TICK_COLOR}
        strokeDasharray="4 4"
      />
      <TopView />
      <AxisView />
      <Equation x={TOP.x} y={BOTTOM_Y} anchor="middle" source="I_s ω_s + I_w ω_w = 0" />
      <Equation
        x={(DIVIDER_X + VIEW.width) / 2}
        y={BOTTOM_Y}
        anchor="middle"
        source={`ω_w ≈ ${wheelPerBody} ω_s`}
      />
    </svg>
  );
}
