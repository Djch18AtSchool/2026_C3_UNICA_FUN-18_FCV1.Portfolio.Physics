import type { JSX } from 'react';
import {
  CHART_COLORS,
  GRID_COLOR,
  TEXT_COLOR,
  TICK_COLOR,
  TICK_FONT_FAMILY,
} from '../../charts/chartTheme';
import { useElementWidth } from '../../hooks/useElementWidth';
import { Arrow } from '../../lab/OverlayMarks';
import {
  COLLISION_CASE,
  collisionRows,
  formatTrimmed,
  type CollisionAfter,
  type CollisionState,
} from './bounceFigures';

/** Two generic bodies of the class example: colors that name no real object (spec §4.3). */
const BODY_1_COLOR = CHART_COLORS[3];
const BODY_2_COLOR = CHART_COLORS[5];
/** K of the centre of mass in a neutral fill; the relative K, the part e² scales, in green. */
const KINETIC_CM_COLOR = TICK_COLOR;
const KINETIC_REL_COLOR = CHART_COLORS[2];

/**
 * Two layouts in viewBox pixels. Wide: one line per row, momentum and energy in columns with
 * headers. Narrow (phones): the momentum arrow and the energy bar go under the balls, labelled
 * "p = …" and "K = …", so the text keeps its real size in a 260 px column.
 */
interface Layout {
  width: number;
  rowHeight: number;
  /** Momentum arrow and K bar: left edge and drop below the balls' line. */
  momentum: { x: number; dy: number };
  kinetic: { x: number; dy: number };
  hasColumnHeaders: boolean;
  keyX: number;
}
const WIDE: Layout = {
  width: 360,
  rowHeight: 66,
  momentum: { x: 216, dy: 0 },
  kinetic: { x: 288, dy: 0 },
  hasColumnHeaders: true,
  keyX: 62,
};
const NARROW: Layout = {
  width: 260,
  rowHeight: 104,
  momentum: { x: 60, dy: 44 },
  kinetic: { x: 150, dy: 44 },
  hasColumnHeaders: false,
  keyX: 4,
};
/** Containers narrower than the wide layout get the narrow one, never a shrunken wide one. */
const NARROW_BELOW_PX = WIDE.width;
const FALLBACK_WIDTH = 720;

const HEADER_Y = 16;
const ROW_TOP = 26;
/** Line of the balls below a row's top. */
const ROW_MIDDLE = 34;
const KEY_GAP = 18;
const LABEL_X = 2;
const LABEL_SIZE = 12;
const SMALL_SIZE = 11;
/** The mass labels sit side by side over the balls of the first row. */
const MASS_SIZE = 10;
/** Ball radii scale as ∛m (same density): 12 px for 2 kg, 12/∛2 for 1 kg. */
const BALL_1 = { id: 1, x: 78, r: 12 } as const;
const BALL_2 = { id: 2, x: 146, r: 12 / Math.cbrt(2) } as const;
const BALL_STROKE = 1.5;
/** Pixels per m/s of a velocity arrow, per kg·m/s of the momentum arrow and per J of the bar. */
/**
 * 11 px per m/s keeps m₂'s fastest arrow (4 m/s, tip at 199,5) 16,5 px clear of the momentum
 * arrow in the wide layout, so the two never read as one chained vector.
 */
const PX_PER_SPEED = 11;
const PX_PER_MOMENTUM = 8;
const PX_PER_JOULE = 7;
const BAR_HEIGHT = 12;
const LOST_DASH = '3 2';
const UNDER_LABEL = 16;
const SPEED_LABEL_GAP = 13;
const MASS_LABEL_GAP = 6;
const KEY_SWATCH = 10;
const KEY_TEXT_GAP = 4;
const KEY_ITEM_GAP = 14;
/** Advance of one character of the 11 px mono font. */
const SMALL_CHAR = SMALL_SIZE * 0.6;

const textStyle = { fontFamily: TICK_FONT_FAMILY, fill: TEXT_COLOR } as const;

const speedLabel = (v: number) => `${formatTrimmed(v)} m/s`;

function Balls({
  state,
  middle,
  isBefore,
}: {
  state: CollisionState;
  middle: number;
  isBefore: boolean;
}) {
  const balls = [
    { ...BALL_1, v: state.v1, color: BODY_1_COLOR, mass: `m₁ = ${COLLISION_CASE.m1} kg` },
    { ...BALL_2, v: state.v2, color: BODY_2_COLOR, mass: `m₂ = ${COLLISION_CASE.m2} kg` },
  ];
  return (
    <g>
      {balls.map((ball) => (
        <g key={ball.id} data-body={ball.id}>
          <circle
            cx={ball.x}
            cy={middle}
            r={ball.r}
            fill={ball.color}
            stroke={TEXT_COLOR}
            strokeWidth={BALL_STROKE}
          />
          {ball.v > 0 ? (
            <g data-velocity={ball.id}>
              <Arrow
                from={{ x: ball.x + ball.r, y: middle }}
                to={{ x: ball.x + ball.r + ball.v * PX_PER_SPEED, y: middle }}
                color={TEXT_COLOR}
              />
            </g>
          ) : null}
          <text
            x={ball.x}
            y={middle + ball.r + SPEED_LABEL_GAP}
            textAnchor="middle"
            fontSize={SMALL_SIZE}
            {...textStyle}
          >
            {speedLabel(ball.v)}
          </text>
          {isBefore ? (
            <text
              x={ball.x}
              y={middle - ball.r - MASS_LABEL_GAP}
              textAnchor="middle"
              fontSize={MASS_SIZE}
              {...textStyle}
            >
              {ball.mass}
            </text>
          ) : null}
        </g>
      ))}
    </g>
  );
}

/** p₁ and p₂ head to tail, in each body's color: the same total length in every row. */
function MomentumArrow({
  state,
  x,
  y,
  label,
}: {
  state: CollisionState;
  x: number;
  y: number;
  label: string;
}) {
  const segments = [
    { p: state.p1, color: BODY_1_COLOR },
    { p: state.p2, color: BODY_2_COLOR },
  ].filter((segment) => segment.p > 0);
  const length = state.momentum * PX_PER_MOMENTUM;
  const starts = segments.map(
    (_, index) =>
      x + segments.slice(0, index).reduce((sum, segment) => sum + segment.p, 0) * PX_PER_MOMENTUM,
  );
  return (
    <g data-momentum="" data-start={x} data-length={length}>
      {segments.map((segment, index) => {
        const from = { x: starts[index], y };
        const to = { x: starts[index] + segment.p * PX_PER_MOMENTUM, y };
        return index === segments.length - 1 ? (
          <Arrow key={segment.color} from={from} to={to} color={segment.color} />
        ) : (
          <line
            key={segment.color}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke={segment.color}
            strokeWidth={2}
          />
        );
      })}
      <text
        x={x + length / 2}
        y={y + UNDER_LABEL}
        textAnchor="middle"
        fontSize={SMALL_SIZE}
        {...textStyle}
      >
        {label}
      </text>
    </g>
  );
}

/** K as a bar: the centre-of-mass part, the relative part and, after, the lost part outlined. */
function KineticBar({
  state,
  initial,
  x,
  y,
  isBefore,
}: {
  state: CollisionState;
  initial: number;
  x: number;
  y: number;
  isBefore: boolean;
}) {
  const top = y - BAR_HEIGHT / 2;
  const cmWidth = state.kineticCM * PX_PER_JOULE;
  const total = state.kinetic * PX_PER_JOULE;
  const lost = (initial - state.kinetic) * PX_PER_JOULE;
  const label = `${isBefore ? 'K' : 'K′'} = ${formatTrimmed(state.kinetic)} J`;
  return (
    <g>
      <rect
        data-kinetic="cm"
        x={x}
        y={top}
        width={cmWidth}
        height={BAR_HEIGHT}
        fill={KINETIC_CM_COLOR}
      />
      <rect
        data-kinetic="rel"
        x={x + cmWidth}
        y={top}
        width={state.kineticRel * PX_PER_JOULE}
        height={BAR_HEIGHT}
        fill={KINETIC_REL_COLOR}
      />
      {lost > 0 ? (
        <rect
          data-kinetic="lost"
          x={x + total}
          y={top}
          width={lost}
          height={BAR_HEIGHT}
          fill="none"
          stroke={TICK_COLOR}
          strokeDasharray={LOST_DASH}
        />
      ) : null}
      <rect
        data-kinetic="total"
        x={x}
        y={top}
        width={total}
        height={BAR_HEIGHT}
        fill="none"
        stroke={TEXT_COLOR}
      />
      <text
        x={x + (initial * PX_PER_JOULE) / 2}
        y={y + UNDER_LABEL}
        textAnchor="middle"
        fontSize={SMALL_SIZE}
        {...textStyle}
      >
        {label}
      </text>
    </g>
  );
}

interface RowSpec {
  id: string;
  label: string;
  state: CollisionState;
  isBefore: boolean;
}

function Row({
  row,
  top,
  initial,
  layout,
}: {
  row: RowSpec;
  top: number;
  initial: number;
  layout: Layout;
}) {
  const middle = top + ROW_MIDDLE;
  const momentum = `${layout.hasColumnHeaders ? '' : 'p = '}${formatTrimmed(row.state.momentum)} kg·m/s`;
  return (
    <g data-row={row.id}>
      <text x={LABEL_X} y={middle + 4} fontSize={LABEL_SIZE} {...textStyle}>
        {row.label}
      </text>
      <Balls state={row.state} middle={middle} isBefore={row.isBefore} />
      <MomentumArrow
        state={row.state}
        x={layout.momentum.x}
        y={middle + layout.momentum.dy}
        label={momentum}
      />
      <KineticBar
        state={row.state}
        initial={initial}
        x={layout.kinetic.x}
        y={middle + layout.kinetic.dy}
        isBefore={row.isBefore}
      />
    </g>
  );
}

const KEY_ITEMS = [
  { label: 'K del CM', fill: KINETIC_CM_COLOR, isOutline: false },
  { label: 'K relativa', fill: KINETIC_REL_COLOR, isOutline: false },
  { label: 'perdida', fill: 'none', isOutline: true },
] as const;

/** Width of one key item: swatch, gap, label and the space before the next item. */
const keyItemWidth = (label: string) =>
  KEY_SWATCH + KEY_TEXT_GAP + label.length * SMALL_CHAR + KEY_ITEM_GAP;

function EnergyKey({ x, y }: { x: number; y: number }) {
  return (
    <g>
      {KEY_ITEMS.map((item, index) => {
        const at =
          x +
          KEY_ITEMS.slice(0, index).reduce(
            (sum, previous) => sum + keyItemWidth(previous.label),
            0,
          );
        return (
          <g key={item.label}>
            <rect
              x={at}
              y={y - KEY_SWATCH + 1}
              width={KEY_SWATCH}
              height={KEY_SWATCH}
              fill={item.fill}
              stroke={item.isOutline ? TICK_COLOR : undefined}
              strokeDasharray={item.isOutline ? LOST_DASH : undefined}
            />
            <text x={at + KEY_SWATCH + KEY_TEXT_GAP} y={y} fontSize={SMALL_SIZE} {...textStyle}>
              {item.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function ColumnHeaders({ layout, before }: { layout: Layout; before: CollisionState }) {
  return (
    <g textAnchor="middle" fontSize={SMALL_SIZE} fontFamily={TICK_FONT_FAMILY} fill={TICK_COLOR}>
      <text x={(BALL_1.x + BALL_2.x) / 2} y={HEADER_Y}>
        Velocidad
      </text>
      {layout.hasColumnHeaders ? (
        <>
          <text x={layout.momentum.x + (before.momentum * PX_PER_MOMENTUM) / 2} y={HEADER_Y}>
            Momento p
          </text>
          <text x={layout.kinetic.x + (before.kinetic * PX_PER_JOULE) / 2} y={HEADER_Y}>
            Energía
          </text>
        </>
      ) : null}
    </g>
  );
}

function ariaLabel(before: CollisionState, after: readonly CollisionAfter[]): string {
  const { m1, v1, m2 } = COLLISION_CASE;
  const es = after.map((row) => formatTrimmed(row.e)).join(', ');
  const energies = after.map((row) => `${formatTrimmed(row.kinetic)} J`).join(', ');
  return `Choque de m₁ = ${m1} kg a ${v1} m/s contra m₂ = ${m2} kg en reposo, antes y después con e = ${es}: el momento total es ${formatTrimmed(before.momentum)} kg·m/s en las cuatro filas; la energía cinética pasa de ${formatTrimmed(before.kinetic)} J a ${energies}, porque solo cambia su parte relativa, que se multiplica por e².`;
}

/**
 * Step 2's figure, not to scale in position: the class collision before and just after for
 * e = 0, 0,75 and 1. Velocity arrows scale with v; the momentum arrow (p₁ + p₂, head to tail) is
 * the same in every row; the K bar keeps its centre-of-mass part and loses (1 − e²) of the rest.
 */
export default function CollisionDiagram(): JSX.Element {
  const [ref, measuredWidth] = useElementWidth<HTMLDivElement>(FALLBACK_WIDTH);
  const isNarrow = measuredWidth < NARROW_BELOW_PX;
  const layout = isNarrow ? NARROW : WIDE;
  const { before, after } = collisionRows();
  const rows: RowSpec[] = [
    { id: 'antes', label: 'Antes', state: before, isBefore: true },
    ...after.map((row) => ({
      id: `e-${formatTrimmed(row.e)}`,
      label: `e = ${formatTrimmed(row.e)}`,
      state: row,
      isBefore: false,
    })),
  ];
  const keyY = ROW_TOP + rows.length * layout.rowHeight + KEY_GAP;
  const height = keyY + KEY_GAP / 2;
  return (
    <div ref={ref} className="w-full min-w-0">
      <svg
        data-testid="collision-diagram"
        data-layout={isNarrow ? 'narrow' : 'wide'}
        role="img"
        aria-label={ariaLabel(before, after)}
        viewBox={`0 0 ${layout.width} ${height}`}
        width="100%"
        className={`mx-auto block h-auto ${isNarrow ? '' : 'max-w-[28rem]'}`}
      >
        <ColumnHeaders layout={layout} before={before} />
        <line
          x1={LABEL_X}
          x2={layout.width - LABEL_X}
          y1={ROW_TOP + layout.rowHeight}
          y2={ROW_TOP + layout.rowHeight}
          stroke={GRID_COLOR}
        />
        {rows.map((row, index) => (
          <Row
            key={row.id}
            row={row}
            top={ROW_TOP + index * layout.rowHeight}
            initial={before.kinetic}
            layout={layout}
          />
        ))}
        <EnergyKey x={layout.keyX} y={keyY} />
      </svg>
    </div>
  );
}
