import type { JSX } from 'react';
import { formatNumber } from '../../../lib/format';
import { AXIS_COLOR, TEXT_COLOR, TICK_COLOR, TICK_FONT_FAMILY } from '../../charts/chartTheme';
import { useElementWidth } from '../../hooks/useElementWidth';
import { monoTextWidth } from '../../lab/plotScales';
import type { LabReadout } from '../../lab/LabShell';
import { Arrow, Label } from '../../lab/OverlayMarks';
import ParamField from '../../lab/ParamField';
import { SwitchField } from '../../lab/SettingsFields';
import {
  arrowTip,
  bodyBoxes,
  COLLISION_LIMITS,
  labelCentre,
  SCENE_EDGE_PX,
  VELOCITY_LABEL_SIZE,
  trackToPx,
  type CollisionOutcome,
  type CollisionSettings,
} from './collisionScene';

/** Two neutral bodies told apart by shade and number, never by a series color. */
const BODY_FILL = ['var(--fg-muted)', 'color-mix(in srgb, var(--fg) 14%, var(--bg-elevated))'];
const BODY_TEXT = ['var(--bg-elevated)', 'var(--fg)'];
const BAR_FILL = 'var(--fg-muted)';

const FALLBACK_WIDTH = 720;
const SIDE_PAD = SCENE_EDGE_PX;
const TRACK_Y = 104;
/** The two arrows ride at different heights so their labels never meet. */
const ARROW_ROWS = [36, 14];
const WALL_HEIGHT = 64;
const HATCH_GAP = 10;
const BARS_TOP = TRACK_Y + 38;
const BAR_ROW = 26;
const BAR_HEIGHT = 12;
const BAR_LABEL_WIDTH = 92;
/** Gap (px) between a bar's end and its value label (the Label's dx) plus slack. */
const VALUE_GAP = 10;
const LABEL_SIZE = 11;
const MASS_STEP = 0.1;
const VELOCITY_STEP = 0.1;
const E_STEP = 0.005;

const [M_MIN, M_MAX] = COLLISION_LIMITS.mass;
const [V_MIN, V_MAX] = COLLISION_LIMITS.velocity;
const [E_MIN, E_MAX] = COLLISION_LIMITS.e;

interface BarRow {
  label: string;
  value: number;
  unit: string;
  /** Drawn as a dashed outline from `value` up to it: the energy lost. */
  lostUpTo?: number;
}

/** Bars of one quantity: signed from the centre (p) or from the left (K), on one shared scale. */
function Bars({
  rows,
  top,
  width,
  isSigned,
  decimals,
}: {
  rows: BarRow[];
  top: number;
  width: number;
  isSigned: boolean;
  decimals: number;
}): JSX.Element {
  const left = BAR_LABEL_WIDTH;
  const texts = rows.map((row) => formatNumber(row.value, { precision: decimals, unit: row.unit }));
  // Room right of the bars for the widest value label, so "-100,00 kg·m/s" stays on the canvas.
  const valueRoom =
    Math.max(...texts.map((text) => monoTextWidth(text, VELOCITY_LABEL_SIZE))) + VALUE_GAP;
  const right = width - SIDE_PAD - valueRoom;
  const reach = rows.map((row) => row.lostUpTo ?? row.value);
  const hasNegative = isSigned && reach.some((value) => value < 0);
  const hasPositive = reach.some((value) => value > 0);
  // The zero sits at the left unless some bar points left: then in the middle, or at the right.
  const zero = !hasNegative ? left : hasPositive ? (left + right) / 2 : right;
  const room = hasNegative && hasPositive ? (right - left) / 2 : right - left;
  const largest = Math.max(...reach.map(Math.abs), 1e-9);
  const toPx = (value: number) => zero + (value / largest) * room;
  return (
    <g>
      <line x1={zero} x2={zero} y1={top - 4} y2={top + rows.length * BAR_ROW} stroke={AXIS_COLOR} />
      {rows.map((row, index) => {
        const y = top + index * BAR_ROW;
        const end = toPx(row.value);
        const text = texts[index];
        return (
          <g key={row.label} data-bar={row.label}>
            <text
              x={4}
              y={y + BAR_HEIGHT - 2}
              fontFamily={TICK_FONT_FAMILY}
              fontSize={LABEL_SIZE}
              fill={TICK_COLOR}
            >
              {row.label}
            </text>
            <rect
              x={Math.min(zero, end)}
              y={y}
              width={Math.abs(end - zero)}
              height={BAR_HEIGHT}
              style={{ fill: BAR_FILL }}
            />
            {row.lostUpTo !== undefined && row.lostUpTo > row.value ? (
              <rect
                data-lost=""
                x={end}
                y={y}
                width={toPx(row.lostUpTo) - end}
                height={BAR_HEIGHT}
                fill="none"
                stroke={TEXT_COLOR}
                strokeDasharray="4 3"
              />
            ) : null}
            <Label
              at={{ x: Math.max(end, zero, toPx(row.lostUpTo ?? row.value)), y }}
              dx={6}
              dy={10}
            >
              {text}
            </Label>
          </g>
        );
      })}
    </g>
  );
}

export interface CollisionSceneProps {
  settings: CollisionSettings;
  outcome: CollisionOutcome;
  t: number;
  decimals: number;
}

function describeCollision({ settings: s, outcome: o, decimals }: CollisionSceneProps): string {
  const n = (value: number, unit: string) => formatNumber(value, { precision: decimals, unit });
  const second = s.isWall
    ? 'el piso, inmóvil (m₂ → ∞)'
    : `el cuerpo 2 de ${n(s.m2, 'kg')} a ${n(s.v2, 'm/s')}`;
  const result = o.isApproaching
    ? `Después: v₁′ = ${n(o.v1After, 'm/s')}${s.isWall ? '' : ` y v₂′ = ${n(o.v2After, 'm/s')}`}. La energía cinética pasa de ${n(o.kBefore, 'J')} a ${n(o.kAfter, 'J')}.`
    : 'No se acercan, así que no chocan.';
  return `Choque en una dimensión, e = ${n(s.e, '')}: el cuerpo 1 de ${n(s.m1, 'kg')} a ${n(s.v1, 'm/s')} contra ${second}. ${result}`;
}

/**
 * The two-body mode's canvas: the bodies sliding on a track (they touch at 1 s) with their
 * velocity arrows, then bars of p and K before and after. The p bars match for any e; the K
 * bar loses the dashed ΔK = ½ μ (1 − e²) v_rel².
 */
export function CollisionScene(props: CollisionSceneProps): JSX.Element {
  const { settings: s, outcome: o, t, decimals } = props;
  const [wrapperRef, width] = useElementWidth<HTMLDivElement>(FALLBACK_WIDTH);
  const toPx = trackToPx(s, o, width);
  const isAfter = o.isApproaching && t >= 1;
  const boxes = bodyBoxes(s, o, t, width);
  const sides = boxes.map((box) => box.side);
  const velocities = [isAfter ? o.v1After : s.v1, isAfter ? o.v2After : s.isWall ? 0 : s.v2];
  const body1 = { x: boxes[0].left, y: TRACK_Y - sides[0] };
  const body2 = { x: boxes[1].left, y: TRACK_Y - sides[1] };
  const centres = boxes.map((box) => box.centre);
  const prime = isAfter ? '′' : '';
  const pRows: BarRow[] = [
    { label: s.isWall ? 'p₁ antes' : 'p antes', value: o.pBefore, unit: 'kg·m/s' },
    { label: s.isWall ? 'p₁ después' : 'p después', value: o.pAfter, unit: 'kg·m/s' },
  ];
  const kRows: BarRow[] = [
    { label: 'K antes', value: o.kBefore, unit: 'J' },
    { label: 'K después', value: o.kAfter, unit: 'J', lostUpTo: o.kBefore },
  ];
  const height = BARS_TOP + 4 * BAR_ROW + BAR_ROW / 2;
  const wallX = toPx(0);

  return (
    <div ref={wrapperRef} className="w-full px-3 sm:px-0">
      <svg
        data-testid="collision-scene"
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        className="block h-auto"
      >
        <g role="img" aria-label={describeCollision(props)}>
          <line x1={SIDE_PAD} x2={width - SIDE_PAD} y1={TRACK_Y} y2={TRACK_Y} stroke={TEXT_COLOR} />
          {s.isWall ? (
            <g data-wall="">
              <rect
                x={wallX}
                y={TRACK_Y - WALL_HEIGHT}
                width={width - SIDE_PAD - wallX}
                height={WALL_HEIGHT}
                style={{ fill: BODY_FILL[1] }}
                stroke={TEXT_COLOR}
              />
              {Array.from({ length: Math.ceil((width - SIDE_PAD - wallX) / HATCH_GAP) }, (_, i) => (
                <line
                  key={i}
                  x1={wallX + i * HATCH_GAP}
                  x2={wallX + i * HATCH_GAP + HATCH_GAP}
                  y1={TRACK_Y}
                  y2={TRACK_Y - HATCH_GAP}
                  stroke={AXIS_COLOR}
                />
              ))}
            </g>
          ) : (
            <rect
              x={body2.x}
              y={body2.y}
              width={sides[1]}
              height={sides[1]}
              style={{ fill: BODY_FILL[1] }}
              stroke={TEXT_COLOR}
            />
          )}
          <rect
            x={body1.x}
            y={body1.y}
            width={sides[0]}
            height={sides[0]}
            style={{ fill: BODY_FILL[0] }}
            stroke={TEXT_COLOR}
          />
          {(s.isWall ? [0] : [0, 1]).map((index) => {
            const y = TRACK_Y - Math.max(...sides) - ARROW_ROWS[index];
            const from = { x: centres[index], y };
            const to = { x: arrowTip(centres[index], velocities[index], width), y };
            const text = `v${index === 0 ? '₁' : '₂'}${prime} = ${formatNumber(velocities[index], { precision: decimals, unit: 'm/s' })}`;
            return (
              <g key={index} data-velocity={index + 1}>
                <Arrow from={from} to={to} color={TEXT_COLOR} />
                <Label
                  at={{ x: labelCentre(centres[index], text, width), y }}
                  dx={0}
                  dy={-8}
                  anchor="middle"
                >
                  {text}
                </Label>
              </g>
            );
          })}
          <text
            x={centres[0]}
            y={TRACK_Y - sides[0] / 2 + 4}
            textAnchor="middle"
            fontFamily={TICK_FONT_FAMILY}
            fontSize={LABEL_SIZE}
            fill={BODY_TEXT[0]}
          >
            1
          </text>
          {s.isWall ? null : (
            <text
              x={centres[1]}
              y={TRACK_Y - sides[1] / 2 + 4}
              textAnchor="middle"
              fontFamily={TICK_FONT_FAMILY}
              fontSize={LABEL_SIZE}
              fill={BODY_TEXT[1]}
            >
              2
            </text>
          )}
          <Bars rows={pRows} top={BARS_TOP} width={width} isSigned decimals={decimals} />
          <Bars
            rows={kRows}
            top={BARS_TOP + 2 * BAR_ROW + BAR_ROW / 2}
            width={width}
            isSigned={false}
            decimals={decimals}
          />
        </g>
      </svg>
    </div>
  );
}

export interface CollisionParamsProps {
  settings: CollisionSettings;
  outcome: CollisionOutcome;
  onChange(patch: Partial<CollisionSettings>): void;
}

/** m₁, m₂, v₁, v₂ and e, the "m₂ → ∞" switch, and what the mode shows. */
export function CollisionParams({
  settings: s,
  outcome,
  onChange,
}: CollisionParamsProps): JSX.Element {
  const field = (
    key: 'm1' | 'm2' | 'v1' | 'v2',
    label: string,
    unit: string,
    [min, max]: readonly [number, number],
    step: number,
  ) => (
    <ParamField
      id={`collision-${key}`}
      label={label}
      unit={unit}
      min={min}
      max={max}
      step={step}
      value={s[key]}
      onChange={(value) => onChange({ [key]: value })}
    />
  );
  return (
    <>
      <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
        {field('m1', 'Masa m₁', 'kg', [M_MIN, M_MAX], MASS_STEP)}
        {s.isWall ? null : field('m2', 'Masa m₂', 'kg', [M_MIN, M_MAX], MASS_STEP)}
        {field('v1', 'Velocidad v₁', 'm/s', [V_MIN, V_MAX], VELOCITY_STEP)}
        {s.isWall ? null : field('v2', 'Velocidad v₂', 'm/s', [V_MIN, V_MAX], VELOCITY_STEP)}
        <ParamField
          id="collision-e"
          label="Coeficiente de restitución e"
          unit=""
          min={E_MIN}
          max={E_MAX}
          step={E_STEP}
          value={s.e}
          onChange={(e) => onChange({ e })}
        />
      </div>
      <SwitchField
        id="collision-wall"
        label="Cuerpo 2 fijo (m₂ → ∞, como el piso)"
        checked={s.isWall}
        onChange={(isWall) => onChange({ isWall })}
      />
      <ul
        data-testid="collision-notes"
        className="m-0 flex list-disc flex-col gap-1 pl-5 text-sm text-fg-muted"
      >
        <li>
          El momento lineal es el mismo antes y después para cualquier e; la energía cinética no: se
          pierde ΔK = ½ μ (1 − e²) v_rel², con μ = m₁m₂/(m₁ + m₂), así que ΔK/K_rel = 1 − e². En las
          barras, el tramo punteado es ΔK.
        </li>
        {s.isWall ? (
          <li>
            Con m₂ → ∞ el cuerpo 2 es el piso: v₁′ = −e v₁, el rebote de la pelota. El piso recibe
            el impulso sin moverse, así que el momento del cuerpo 1 solo no se conserva.
          </li>
        ) : null}
        {outcome.isApproaching ? null : (
          <li>Con v₁ ≤ v₂ los cuerpos no se acercan: no hay choque y nada cambia.</li>
        )}
      </ul>
    </>
  );
}

/** p before and after (equal), the velocities after, ΔK and ΔK/K_rel beside 1 − e². */
export function collisionReadouts(s: CollisionSettings, o: CollisionOutcome): LabReadout[] {
  const momentum: LabReadout[] = s.isWall
    ? [
        { id: 'p-before', label: 'p₁ antes', value: o.pBefore, unit: 'kg·m/s' },
        { id: 'p-after', label: 'p₁ después', value: o.pAfter, unit: 'kg·m/s' },
        { id: 'v1', label: 'v₁′', value: o.v1After, unit: 'm/s' },
        { id: 'impulse', label: 'Impulso del piso sobre 1', value: o.impulse, unit: 'N·s' },
      ]
    : [
        { id: 'p-before', label: 'p antes', value: o.pBefore, unit: 'kg·m/s' },
        { id: 'p-after', label: 'p después', value: o.pAfter, unit: 'kg·m/s' },
        { id: 'v1', label: 'v₁′', value: o.v1After, unit: 'm/s' },
        { id: 'v2', label: 'v₂′', value: o.v2After, unit: 'm/s' },
      ];
  return [
    ...momentum,
    { id: 'loss', label: 'ΔK perdida', value: o.kineticLoss, unit: 'J' },
    { id: 'fraction', label: 'ΔK/K_rel', value: o.lossFraction, unit: '' },
    { id: 'one-minus-e2', label: '1 − e²', value: 1 - s.e * s.e, unit: '' },
  ];
}
