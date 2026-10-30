import type { JSX } from 'react';
import { SURFACE_COLOR, TEXT_COLOR, TICK_COLOR, TICK_FONT_FAMILY } from '../../charts/chartTheme';
import { DIAGRAM_FACTS, WHEEL_COLORS } from './wheelFigures';

type Point = { x: number; y: number };
/** A run of math: an italic symbol with an optional subscript, or plain text between symbols. */
type MathPart = string | { symbol: string; sub?: string };

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
const HEAD = 10;
const VECTOR_WIDTH = 3;
const TITLE_Y = 24;
const BOTTOM_Y = 278;
const TEXT_SIZE = 14;
const MATH_SIZE = 16;
const SUB_DY = 4;
const SUB_SIZE = '0.75em';
const MATH_FONT = "KaTeX_Main, 'Times New Roman', serif";
const DEG = Math.PI / 180;

const textStyle = { fontFamily: TICK_FONT_FAMILY, fontSize: TEXT_SIZE, fill: TEXT_COLOR } as const;
const halo = { stroke: SURFACE_COLOR, strokeWidth: 4, paintOrder: 'stroke' } as const;

/** Text with italic symbols and their subscripts, as the equations print them. */
function MathText({
  x,
  y,
  parts,
  anchor = 'start',
}: {
  x: number;
  y: number;
  parts: readonly MathPart[];
  anchor?: 'start' | 'middle' | 'end';
}): JSX.Element {
  let pending = 0;
  const spans = parts.flatMap((part, index) => {
    const dy = pending;
    if (typeof part === 'string') {
      pending = 0;
      return [
        <tspan key={index} dy={dy || undefined}>
          {part}
        </tspan>,
      ];
    }
    pending = part.sub ? -SUB_DY : 0;
    return [
      <tspan key={index} dy={dy || undefined} fontStyle="italic">
        {part.symbol}
      </tspan>,
      ...(part.sub
        ? [
            <tspan key={`${index}-sub`} dy={SUB_DY} fontSize={SUB_SIZE} fontStyle="italic">
              {part.sub}
            </tspan>,
          ]
        : []),
    ];
  });
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      fontFamily={MATH_FONT}
      fontSize={MATH_SIZE}
      fill={TEXT_COLOR}
      {...halo}
    >
      {spans}
    </text>
  );
}

/** Corners of an arrowhead with its tip at `tip`, pointing along the unit vector `u`. */
function headPoints(tip: Point, u: Point): string {
  const base = { x: tip.x - u.x * HEAD, y: tip.y - u.y * HEAD };
  const half = HEAD * 0.45;
  return [
    [tip.x, tip.y],
    [base.x - u.y * half, base.y + u.x * half],
    [base.x + u.y * half, base.y - u.x * half],
  ]
    .map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`)
    .join(' ');
}

/** A straight vector whose shaft stops at the base of its head. */
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
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const u = { x: (to.x - from.x) / length, y: (to.y - from.y) / length };
  return (
    <g data-vector={name} stroke={color} fill={color}>
      <line
        x1={from.x}
        y1={from.y}
        x2={to.x - u.x * HEAD}
        y2={to.y - u.y * HEAD}
        strokeWidth={VECTOR_WIDTH}
      />
      <polygon points={headPoints(to, u)} strokeWidth={1} />
    </g>
  );
}

/**
 * A circular arc around `centre` from `from` to `to` degrees (SVG angles, y down) with a head at
 * its end. Increasing angles turn clockwise on screen.
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
  const at = (degrees: number) => ({
    x: centre.x + radius * Math.cos(degrees * DEG),
    y: centre.y + radius * Math.sin(degrees * DEG),
  });
  const isClockwise = to > from;
  const start = at(from);
  const end = at(to);
  const sweep = Math.abs(to - from);
  const direction = isClockwise ? 1 : -1;
  const tangent = { x: -Math.sin(to * DEG) * direction, y: Math.cos(to * DEG) * direction };
  const tip = { x: end.x + tangent.x * HEAD * 0.6, y: end.y + tangent.y * HEAD * 0.6 };
  const d = `M${start.x.toFixed(1)} ${start.y.toFixed(1)} A${radius} ${radius} 0 ${sweep > 180 ? 1 : 0} ${isClockwise ? 1 : 0} ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
  return (
    <g data-spin={name} data-sense={isClockwise ? 'horario' : 'antihorario'}>
      <path d={d} fill="none" stroke={color} strokeWidth={VECTOR_WIDTH} strokeLinecap="round" />
      <polygon points={headPoints(tip, tangent)} fill={color} />
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
      <MathText x={TOP.x + 20} y={TOP.y - 46} parts={[{ symbol: 'ω', sub: 'w' }]} />
      <SpinArc
        name="nave"
        centre={TOP}
        radius={BODY_SPIN_RADIUS}
        from={-160}
        to={70}
        color={WHEEL_COLORS.body}
      />
      <MathText x={TOP.x - 82} y={TOP.y - 76} parts={[{ symbol: 'ω', sub: 's' }]} />
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
      <MathText
        x={AXIS_X + 12}
        y={ORIGIN_Y - L_LENGTH + 14}
        parts={[
          { symbol: 'L', sub: 'w' },
          ' = ',
          { symbol: 'I', sub: 'w' },
          ' ',
          { symbol: 'ω', sub: 'w' },
        ]}
      />
      <MathText
        x={AXIS_X + 12}
        y={ORIGIN_Y + 5}
        parts={[{ symbol: 'L', sub: 's' }, ' + ', { symbol: 'L', sub: 'w' }, ' = 0']}
      />
      <MathText
        x={AXIS_X + 12}
        y={ORIGIN_Y + L_LENGTH - 6}
        parts={[
          { symbol: 'L', sub: 's' },
          ' = ',
          { symbol: 'I', sub: 's' },
          ' ',
          { symbol: 'ω', sub: 's' },
        ]}
      />
    </g>
  );
}

/**
 * Step 1's sketch: with no external torque and everything starting at rest, the wheel and the body
 * turn opposite ways (top view) and their angular momenta along z are equal and opposite (side
 * view). I_s/I_w ≈ 1940 for the 6U and the RW400, so the wheel turns about 1940 times faster.
 */
export default function ExchangeDiagram(): JSX.Element {
  const ratio = String(DIAGRAM_FACTS.inertiaRatio);
  return (
    <svg
      role="img"
      aria-label={`Momento angular de la nave y de la rueda. Vista desde arriba: la rueda gira en sentido antihorario y la nave en sentido horario. Sobre el eje z: L_w hacia arriba y L_s hacia abajo, del mismo largo, de modo que L_s + L_w = 0. Con I_s/I_w ≈ ${ratio}, la rueda gira unas ${ratio} veces más rápido que la nave.`}
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
      <MathText
        x={TOP.x}
        y={BOTTOM_Y}
        anchor="middle"
        parts={[
          { symbol: 'I', sub: 's' },
          ' ',
          { symbol: 'ω', sub: 's' },
          ' + ',
          { symbol: 'I', sub: 'w' },
          ' ',
          { symbol: 'ω', sub: 'w' },
          ' = 0',
        ]}
      />
      <MathText
        x={(DIVIDER_X + VIEW.width) / 2}
        y={BOTTOM_Y}
        anchor="middle"
        parts={[{ symbol: 'ω', sub: 'w' }, ` ≈ −${ratio} `, { symbol: 'ω', sub: 's' }]}
      />
    </svg>
  );
}
