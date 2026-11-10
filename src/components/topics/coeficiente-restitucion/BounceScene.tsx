import { useRef, type JSX, type KeyboardEvent } from 'react';
import { formatNumber } from '../../../lib/format';
import { mathTextToString } from '../../../lib/mathNotation';
import {
  AXIS_COLOR,
  TEXT_COLOR,
  TEXT_FONT_FAMILY,
  TICK_COLOR,
  TICK_FONT_FAMILY,
} from '../../charts/chartTheme';
import { useElementWidth } from '../../hooks/useElementWidth';
import type { FrameStore } from '../../lab/frameStore';
import MathText from '../../lab/MathText';
import { Knob, Label, type Point } from '../../lab/OverlayMarks';
import { wrapLabel } from '../../lab/SvgPlotMarks';
import { useDrag, type DragPoint } from '../../lab/useDrag';
import { useFrameDerived } from '../../lab/useFrameTime';
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

/**
 * The scene is never wider than this, which is also the viewBox width the server (and jsdom) draw
 * before the container is measured. Its height does not follow its width (only a wrapped subtitle
 * adds lines), so the svg's box takes the drawing's height in px: the server's box is already as
 * tall as the hydrated one, with the 400 px drawing fitted inside until React measures the stage.
 */
const MAX_WIDTH = 400;
const FALLBACK_WIDTH = MAX_WIDTH;
const HEIGHT = 300;
const BALL_RADIUS = 9;
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
/** Room kept between a column's subtitle and the next column. */
const SUBTITLE_PAD = 8;
const IDEAL_SUBTITLE = 'eventos exactos';
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

const H0_HANDLE_NAME = mathTextToString('Altura de suelta h_0');
const [H0_MIN, H0_MAX] = BOUNCE_LIMITS.h0;
const ORIGIN: Point = { x: 0, y: 0 };
/** Decimals of a ball's translation: a stable attribute string per frame. */
const PX_DECIMALS = 2;

export interface SceneBall {
  y: number;
  isResting: boolean;
}

export interface SceneBalls {
  ideal: SceneBall;
  engine: SceneBall;
}

/** The live clock and the two balls at any of its times: what the moving layer draws. */
export interface LiveBalls {
  frame: FrameStore;
  ballsAt(t: number): SceneBalls;
}

export interface BounceSceneProps {
  h0: number;
  /** Height (m) of the scene's top line. */
  top: number;
  ball: BallKind;
  /** The balls at the settled time, for the description; the drawing follows `live`. */
  ideal: SceneBall;
  engine: SceneBall;
  live: LiveBalls;
  /**
   * Under "Motor de juego": its step and substeps. On a narrow canvas it wraps at its spaces to
   * fit its column; no-break spaces keep a group («Δt = 1/60 s») on one line. In the MathText
   * notation.
   */
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

/** Half the drawing width between the ruler and the right edge: one ball's column. */
const columnWidth = (width: number) => (width - MARGIN.left - MARGIN.right) / 2;

/** A subtitle's lines: whole when it fits its column, else wrapped at its (breaking) spaces. */
export function subtitleLines(text: string, width: number): string[] {
  return wrapLabel(text, columnWidth(width) - SUBTITLE_PAD, NOTE_SIZE) ?? text.split(' ');
}

/** `extraLines` subtitle lines past the first grow the canvas below the floor. */
function geometry(width: number, top: number, extraLines: number): Geometry {
  const height = HEIGHT + extraLines * STATUS_LINE;
  const radius = BALL_RADIUS;
  const floorY = height - MARGIN.bottom - extraLines * STATUS_LINE;
  const areaTop = 2 * radius + TOP_ROOM;
  const column = columnWidth(width);
  const span = floorY - areaTop;
  return {
    width,
    height,
    radius,
    floorY,
    areaTop,
    columns: [MARGIN.left + column / 2, MARGIN.left + 1.5 * column],
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

/**
 * One ball drawn on the floor line at its height, clamped into the scene (a chevron when above).
 * The ball, its seams and the chevron sit in one group translated to the centre, so a frame of
 * flight costs that translation and the shadow's width.
 */
function BallMark({ testId, kind, x, state, top, geo }: BallMarkProps): JSX.Element {
  const view = viewY(state.y, top);
  const r = geo.radius;
  const cy = geo.toPx(view.y) - r;
  const shadowScale = 1 - SHADOW_SHRINK * (view.y / top);
  const chevronY = -r - 2;
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
      <g transform={`translate(${x} ${cy.toFixed(PX_DECIMALS)})`}>
        <circle
          data-ball-body=""
          cx={0}
          cy={0}
          r={r}
          style={{ fill: BALL_FILL[kind] }}
          stroke={BALL_STROKE}
          strokeWidth={1.5}
        />
        <Seams kind={kind} c={ORIGIN} r={r} />
        {view.clamp === 'above' ? (
          <path
            d={`M${-CHEVRON} ${chevronY} L0 ${chevronY - CHEVRON} L${CHEVRON} ${chevronY}`}
            fill="none"
            stroke={TEXT_COLOR}
            strokeWidth={1.5}
          />
        ) : null}
      </g>
    </g>
  );
}

interface BallsLayerProps {
  live: LiveBalls;
  kind: BallKind;
  top: number;
  geo: Geometry;
  decimals: number;
  /** Baseline of the first status line under a column. */
  statusTop: number;
}

/** The moving layer: both balls at the live time and the status lines under their columns. */
function BallsLayer({ live, kind, top, geo, decimals, statusTop }: BallsLayerProps): JSX.Element {
  const balls = useFrameDerived(live.frame, live.ballsAt);
  const columns: [string, number, SceneBall][] = [
    ['ball-ideal', geo.columns[0], balls.ideal],
    ['ball-engine', geo.columns[1], balls.engine],
  ];
  return (
    <>
      {columns.map(([testId, x, state]) =>
        ballStatus(state, top, decimals).map((line, index) => (
          <text
            key={`${testId}-${line}`}
            data-status=""
            x={x}
            y={statusTop + index * STATUS_LINE}
            textAnchor="middle"
            fontFamily={TICK_FONT_FAMILY}
            fontSize={NOTE_SIZE}
            fill={TEXT_COLOR}
          >
            {line}
          </text>
        )),
      )}
      {columns.map(([testId, x, state]) => (
        <BallMark
          key={testId}
          testId={testId}
          kind={kind}
          x={x}
          state={state}
          top={top}
          geo={geo}
        />
      ))}
    </>
  );
}

function describeScene({ h0, ideal, engine, decimals }: BounceSceneProps): string {
  const m = (value: number) => formatNumber(value, { precision: decimals, unit: 'm' });
  const describe = (state: SceneBall) =>
    state.isResting ? 'en reposo en el piso' : `a ${m(Math.max(state.y, 0))}`;
  return mathTextToString(
    `Dos pelotas iguales soltadas desde h_0 = ${m(h0)}. A la izquierda, la física ideal, ${describe(ideal)}; a la derecha, el motor de juego, ${describe(engine)}.`,
  );
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
  const text = `h_0 = ${formatNumber(h0, { precision: decimals, unit: 'm' })}`;

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
      aria-label={H0_HANDLE_NAME}
      aria-orientation="vertical"
      aria-valuemin={H0_MIN}
      aria-valuemax={H0_MAX}
      aria-valuenow={h0}
      aria-valuetext={mathTextToString(text)}
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
  const { h0, top, ball, live, engineSubtitle, decimals } = props;
  const [wrapperRef, width] = useElementWidth<HTMLDivElement>(FALLBACK_WIDTH);
  const subtitles = [IDEAL_SUBTITLE, engineSubtitle].map((text) => subtitleLines(text, width));
  const extraLines = Math.max(...subtitles.map((lines) => lines.length)) - 1;
  const geo = geometry(width, top, extraLines);
  const { floorY, columns } = geo;
  const right = width - MARGIN.right;
  const divider = (columns[0] + columns[1]) / 2;
  const hatches = Array.from(
    { length: Math.ceil((right - MARGIN.left) / HATCH_GAP) },
    (_, i) => MARGIN.left + i * HATCH_GAP,
  );
  const titles: [string, string[], number][] = [
    ['Física ideal', subtitles[0], columns[0]],
    ['Motor de juego', subtitles[1], columns[1]],
  ];
  const statusTop = floorY + STATUS_GAP + extraLines * STATUS_LINE;

  return (
    <div ref={wrapperRef} className="mx-auto w-full px-3 sm:px-0" style={{ maxWidth: MAX_WIDTH }}>
      <svg
        data-testid="bounce-scene"
        viewBox={`0 0 ${width} ${geo.height}`}
        width="100%"
        height={geo.height}
        className="block"
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
          {titles.map(([title, subtitle, x]) => (
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
              <g data-subtitle="" data-x={x}>
                {subtitle.map((line, index) => (
                  <MathText
                    key={line}
                    source={line}
                    x={x}
                    y={floorY + SUBTITLE_GAP + index * STATUS_LINE}
                    anchor="middle"
                    fontSize={NOTE_SIZE}
                    fill={TICK_COLOR}
                  />
                ))}
              </g>
            </g>
          ))}
          <BallsLayer
            live={live}
            kind={ball}
            top={top}
            geo={geo}
            decimals={decimals}
            statusTop={statusTop}
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
