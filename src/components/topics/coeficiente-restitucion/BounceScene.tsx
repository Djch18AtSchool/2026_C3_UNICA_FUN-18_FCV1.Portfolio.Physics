import { useRef, type JSX, type KeyboardEvent } from 'react';
import { formatNumber } from '../../../lib/format';
import {
  AXIS_COLOR,
  TEXT_COLOR,
  TEXT_FONT_FAMILY,
  TICK_COLOR,
  TICK_FONT_FAMILY,
} from '../../charts/chartTheme';
import { useElementWidth } from '../../hooks/useElementWidth';
import { Knob, Label, type Point } from '../../lab/OverlayMarks';
import { useDrag, type DragPoint } from '../../lab/useDrag';
import { BOUNCE_LIMITS, type BallKind } from './bouncePresets';
import { h0KeyTarget, snapH0, viewY } from './bounceScene';

/** The real ball's color (spec §4.3): ITF optic yellow, FIBA orange; others a neutral ink. */
export const BALL_FILL: Record<BallKind, string> = {
  tenis: 'var(--tennis)',
  baloncesto: 'var(--basketball)',
  neutra: 'var(--fg-muted)',
};
const BALL_STROKE = 'var(--fg)';
const SEAM_COLOR = 'var(--bg-elevated)';
const HANDLE_COLOR = TEXT_COLOR;

/** viewBox width before the container is measured (SSR, jsdom): the article column. */
const FALLBACK_WIDTH = 720;
const COMPACT_WIDTH = 480;
const HEIGHT = { compact: 300, wide: 340 } as const;
const BALL_RADIUS = { compact: 9, wide: 11 } as const;
const MARGIN = { left: 44, right: 12, bottom: 80 } as const;
/** Room above the top line for a ball clamped there and its chevron. */
const TOP_ROOM = 10;
const CHEVRON = 4;
const HATCH_DEPTH = 9;
const HATCH_GAP = 12;
const TITLE_GAP = 25;
const SUBTITLE_GAP = 41;
const STATUS_GAP = 56;
const STATUS_LINE = 14;
const TITLE_SIZE = 13;
const NOTE_SIZE = 11;
const SHADOW_OPACITY = 0.18;
const SHADOW_SHRINK = 0.6;
const SHADOW_HEIGHT = 2.5;
/** Ruler step (m): every 0,5 m up to 2 m of scene, else every metre. */
const FINE_RULER_TOP = 2;
const RULER_STEPS = { fine: 0.5, coarse: 1 } as const;
const TICK_LENGTH = 5;
/** Penetration below this (m) is not worth a label. */
const PENETRATION_LABEL_MIN = 5e-4;
const CM_PER_M = 100;

const [H0_MIN, H0_MAX] = BOUNCE_LIMITS.h0;

export interface SceneBall {
  y: number;
  isResting: boolean;
}

export interface BounceSceneProps {
  h0: number;
  /** Height (m) of the scene's top line. */
  top: number;
  ball: BallKind;
  ideal: SceneBall;
  engine: SceneBall;
  /** Under "Motor de juego": its step and substeps. */
  engineSubtitle: string;
  decimals: number;
  onH0Change(h0: number): void;
  /** A drag of the h₀ handle starts or ends (the lab holds the scene's scale meanwhile). */
  onH0DragPhase(phase: 'start' | 'end'): void;
}

interface Geometry {
  width: number;
  height: number;
  radius: number;
  floorY: number;
  areaTop: number;
  columns: [number, number];
  toPx(y: number): number;
  fromPx(px: number): number;
}

function geometry(width: number, top: number): Geometry {
  const isCompact = width < COMPACT_WIDTH;
  const height = isCompact ? HEIGHT.compact : HEIGHT.wide;
  const radius = isCompact ? BALL_RADIUS.compact : BALL_RADIUS.wide;
  const floorY = height - MARGIN.bottom;
  const areaTop = 2 * radius + TOP_ROOM;
  const columnWidth = (width - MARGIN.left - MARGIN.right) / 2;
  const span = floorY - areaTop;
  return {
    width,
    height,
    radius,
    floorY,
    areaTop,
    columns: [MARGIN.left + columnWidth / 2, MARGIN.left + 1.5 * columnWidth],
    toPx: (y) => floorY - (y / top) * span,
    fromPx: (px) => ((floorY - px) / span) * top,
  };
}

function rulerTicks(top: number): number[] {
  const step = top <= FINE_RULER_TOP ? RULER_STEPS.fine : RULER_STEPS.coarse;
  return Array.from({ length: Math.floor(top / step + 1e-9) + 1 }, (_, i) => i * step);
}

/** Seams that say which ball it is besides its color: a tennis curve, basketball ribs. */
function Seams({ kind, c, r }: { kind: BallKind; c: Point; r: number }): JSX.Element | null {
  if (kind === 'neutra') return null;
  const path =
    kind === 'tenis'
      ? `M${c.x - r * 0.8} ${c.y - r * 0.55} Q${c.x} ${c.y + r * 0.2} ${c.x + r * 0.8} ${c.y - r * 0.55} M${c.x - r * 0.8} ${c.y + r * 0.55} Q${c.x} ${c.y - r * 0.2} ${c.x + r * 0.8} ${c.y + r * 0.55}`
      : `M${c.x - r} ${c.y} H${c.x + r} M${c.x} ${c.y - r} V${c.y + r}`;
  return <path d={path} fill="none" stroke={SEAM_COLOR} strokeWidth={1.2} />;
}

interface BallMarkProps {
  testId: string;
  kind: BallKind;
  x: number;
  state: SceneBall;
  top: number;
  geo: Geometry;
}

/** Short status lines under a column: off the top (with its real height), resting, sunk. */
function ballStatus(state: SceneBall, top: number, decimals: number): string[] {
  const view = viewY(state.y, top);
  return [
    view.clamp === 'above'
      ? `↑ fuera: ${formatNumber(state.y, { precision: decimals, unit: 'm' })}`
      : '',
    state.isResting ? 'en reposo' : '',
    view.clamp === 'below' && -state.y >= PENETRATION_LABEL_MIN
      ? `hundida ${formatNumber(-state.y * CM_PER_M, { precision: 1, unit: 'cm' })}`
      : '',
  ].filter(Boolean);
}

/** One ball drawn on the floor line at its height, clamped into the scene (a chevron when above). */
function BallMark({ testId, kind, x, state, top, geo }: BallMarkProps): JSX.Element {
  const view = viewY(state.y, top);
  const r = geo.radius;
  const c = { x, y: geo.toPx(view.y) - r };
  const shadowScale = 1 - SHADOW_SHRINK * (view.y / top);
  const chevronY = c.y - r - 2;
  return (
    <g
      data-testid={testId}
      data-ball={kind}
      data-resting={state.isResting}
      data-clamped={view.clamp}
    >
      <ellipse
        cx={x}
        cy={geo.floorY}
        rx={r * shadowScale}
        ry={SHADOW_HEIGHT}
        fill={TEXT_COLOR}
        opacity={SHADOW_OPACITY}
      />
      <circle
        cx={c.x}
        cy={c.y}
        r={r}
        style={{ fill: BALL_FILL[kind] }}
        stroke={BALL_STROKE}
        strokeWidth={1.5}
      />
      <Seams kind={kind} c={c} r={r} />
      {view.clamp === 'above' ? (
        <path
          d={`M${x - CHEVRON} ${chevronY} L${x} ${chevronY - CHEVRON} L${x + CHEVRON} ${chevronY}`}
          fill="none"
          stroke={TEXT_COLOR}
          strokeWidth={1.5}
        />
      ) : null}
    </g>
  );
}

function describeScene({ h0, ideal, engine, decimals }: BounceSceneProps): string {
  const m = (value: number) => formatNumber(value, { precision: decimals, unit: 'm' });
  const describe = (state: SceneBall) =>
    state.isResting ? 'en reposo en el piso' : `a ${m(Math.max(state.y, 0))}`;
  return `Dos pelotas iguales soltadas desde h₀ = ${m(h0)}. A la izquierda, la física ideal, ${describe(ideal)}; a la derecha, el motor de juego, ${describe(engine)}.`;
}

/** The h₀ handle: a knob on the release line between the columns, dragged or moved with keys. */
function H0Handle({
  h0,
  top,
  geo,
  decimals,
  onH0Change,
  onH0DragPhase,
}: Pick<BounceSceneProps, 'h0' | 'top' | 'decimals' | 'onH0Change' | 'onH0DragPhase'> & {
  geo: Geometry;
}): JSX.Element {
  const at = { x: (geo.columns[0] + geo.columns[1]) / 2, y: geo.toPx(h0) };
  const grabOffsetRef = useRef(0);
  const text = `h₀ = ${formatNumber(h0, { precision: decimals, unit: 'm' })}`;

  const drag = useDrag(({ y, phase }: DragPoint) => {
    if (phase === 'start') {
      grabOffsetRef.current = y - at.y;
      onH0DragPhase('start');
      return;
    }
    const next = snapH0(Math.min(geo.fromPx(y - grabOffsetRef.current), top));
    onH0Change(next);
    if (phase === 'end') onH0DragPhase('end');
  });

  const onKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    const isCoarse = event.shiftKey;
    const next = h0KeyTarget(event.key, isCoarse, h0);
    if (next === undefined) return;
    event.preventDefault();
    onH0Change(next);
  };

  return (
    <g
      data-testid="h0-handle"
      role="slider"
      tabIndex={0}
      aria-label="Altura de suelta h₀"
      aria-orientation="vertical"
      aria-valuemin={H0_MIN}
      aria-valuemax={H0_MAX}
      aria-valuenow={h0}
      aria-valuetext={text}
      className="group cursor-ns-resize outline-none"
      onKeyDown={onKeyDown}
      {...drag}
    >
      <Knob at={at} fill={HANDLE_COLOR} />
      {/* Below the line: the balls rest on it at release, so the label never covers them. */}
      <Label at={at} dx={14} dy={18}>
        {text}
      </Label>
    </g>
  );
}

/**
 * The bounce laboratory's canvas: the same ball twice, "Física ideal" on the left (exact events)
 * and "Motor de juego" on the right (its latest frame), on one floor and one metre scale. The
 * dashed release line carries the h₀ handle. A ball above the scene's top or below the floor
 * (Baumgarte penetration) is drawn on the edge and labelled with its real height.
 */
export default function BounceScene(props: BounceSceneProps): JSX.Element {
  const { h0, top, ball, ideal, engine, engineSubtitle, decimals } = props;
  const [wrapperRef, width] = useElementWidth<HTMLDivElement>(FALLBACK_WIDTH);
  const geo = geometry(width, top);
  const { floorY, columns } = geo;
  const right = width - MARGIN.right;
  const divider = (columns[0] + columns[1]) / 2;
  const hatches = Array.from(
    { length: Math.ceil((right - MARGIN.left) / HATCH_GAP) },
    (_, i) => MARGIN.left + i * HATCH_GAP,
  );
  const titles: [string, string, number, SceneBall][] = [
    ['Física ideal', 'eventos exactos', columns[0], ideal],
    ['Motor de juego', engineSubtitle, columns[1], engine],
  ];

  return (
    <div ref={wrapperRef} className="w-full px-3 sm:px-0">
      <svg
        data-testid="bounce-scene"
        viewBox={`0 0 ${width} ${geo.height}`}
        width="100%"
        className="block h-auto"
      >
        <g role="img" aria-label={describeScene(props)}>
          {rulerTicks(top).map((tick) => (
            <g key={tick}>
              <line
                x1={MARGIN.left - TICK_LENGTH}
                x2={MARGIN.left}
                y1={geo.toPx(tick)}
                y2={geo.toPx(tick)}
                stroke={AXIS_COLOR}
              />
              <text
                x={MARGIN.left - TICK_LENGTH - 3}
                y={geo.toPx(tick) + 4}
                textAnchor="end"
                fontFamily={TICK_FONT_FAMILY}
                fontSize={NOTE_SIZE}
                fill={TICK_COLOR}
              >
                {formatNumber(tick, { precision: tick % 1 === 0 ? 0 : 1 })}
              </text>
            </g>
          ))}
          <text
            x={4}
            y={geo.areaTop - 8}
            fontFamily={TICK_FONT_FAMILY}
            fontSize={NOTE_SIZE}
            fill={TICK_COLOR}
          >
            y (m)
          </text>
          <line
            x1={MARGIN.left}
            x2={MARGIN.left}
            y1={geo.areaTop}
            y2={floorY}
            stroke={AXIS_COLOR}
          />
          <line
            x1={divider}
            x2={divider}
            y1={geo.areaTop}
            y2={floorY}
            stroke={AXIS_COLOR}
            strokeDasharray="2 4"
          />
          <line
            x1={MARGIN.left}
            x2={right}
            y1={geo.toPx(h0)}
            y2={geo.toPx(h0)}
            stroke={TICK_COLOR}
            strokeDasharray="6 4"
          />
          <line x1={MARGIN.left} x2={right} y1={floorY} y2={floorY} stroke={TEXT_COLOR} />
          {hatches.map((x) => (
            <line
              key={x}
              x1={x}
              x2={x - HATCH_DEPTH}
              y1={floorY}
              y2={floorY + HATCH_DEPTH}
              stroke={AXIS_COLOR}
            />
          ))}
          {titles.map(([title, subtitle, x, state]) => (
            <g key={title}>
              <text
                x={x}
                y={floorY + TITLE_GAP}
                textAnchor="middle"
                fontFamily={TEXT_FONT_FAMILY}
                fontSize={TITLE_SIZE}
                fontWeight={600}
                fill={TEXT_COLOR}
              >
                {title}
              </text>
              <text
                x={x}
                y={floorY + SUBTITLE_GAP}
                textAnchor="middle"
                fontFamily={TICK_FONT_FAMILY}
                fontSize={NOTE_SIZE}
                fill={TICK_COLOR}
              >
                {subtitle}
              </text>
              {ballStatus(state, top, decimals).map((line, index) => (
                <text
                  key={line}
                  data-status=""
                  x={x}
                  y={floorY + STATUS_GAP + index * STATUS_LINE}
                  textAnchor="middle"
                  fontFamily={TICK_FONT_FAMILY}
                  fontSize={NOTE_SIZE}
                  fill={TEXT_COLOR}
                >
                  {line}
                </text>
              ))}
            </g>
          ))}
          <BallMark
            testId="ball-ideal"
            kind={ball}
            x={columns[0]}
            state={ideal}
            top={top}
            geo={geo}
          />
          <BallMark
            testId="ball-engine"
            kind={ball}
            x={columns[1]}
            state={engine}
            top={top}
            geo={geo}
          />
        </g>
        <H0Handle
          h0={h0}
          top={top}
          geo={geo}
          decimals={decimals}
          onH0Change={props.onH0Change}
          onH0DragPhase={props.onH0DragPhase}
        />
      </svg>
    </div>
  );
}
