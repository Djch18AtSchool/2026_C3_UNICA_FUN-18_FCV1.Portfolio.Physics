/**
 * The drawing pieces Tema 13's figures share: the horizontal frame (SvgPlot's margins, the compact
 * left one fitted to the y tick labels), a panel with grid, axes and a clip, lines and points that
 * follow the legend's highlight, the legend's keys, the view buttons and the CSS height a drawing
 * reserves before it measures its width. Each figure is one role="img" svg with several panels
 * on one x scale, which SvgPlot (one panel, linear axes) cannot draw.
 */
import type { CSSProperties, JSX, ReactNode } from 'react';
import { DASH_PATTERN, LINE_WIDTH, SURFACE_COLOR, TICK_FONT_SIZE } from '../../charts/chartTheme';
import { emphasisProps, useSeriesEmphasis } from '../../charts/seriesHighlight';
import InlineMath from '../../lab/InlineMath';
import { LegendKey } from '../../lab/LegendKey';
import { isFinitePoint, type Scale } from '../../lab/plotScales';
import { PlotAxes, PlotGrid, type AxisTicks } from '../../lab/SvgPlotAxes';
import type { PlotArea } from '../../lab/SvgPlotCursor';
import { COMPACT_WIDTH } from '../../lab/svgPlotReserve';
import { useGlobalSettings } from '../../lab/useGlobalSettings';
import type { Point } from './coolingPlots';

/** viewBox width before the container is measured (SSR, jsdom): the article column. */
export const FALLBACK_WIDTH = 720;
/** SvgPlot's sizes: ticks one px over the theme's 12, titles two. */
export const TICK_SIZE = TICK_FONT_SIZE + 1;
export const TITLE_SIZE = TICK_FONT_SIZE + 2;
const WIDE_MARGIN = { left: 84, right: 28 } as const;
const COMPACT_RIGHT = 14;
/** As SvgPlot: about 8 px per character of the widest y tick label, plus tick and gap. */
const COMPACT_CHAR_WIDTH = 8;
const COMPACT_LABEL_PAD = 12;
const MIN_COMPACT_LEFT = 40;
const DOT_RADIUS = 5;
const DOT_RING = 2;
const PATH_DECIMALS = 2;

export interface HorizontalFrame {
  width: number;
  left: number;
  right: number;
  compact: boolean;
}

/** The plot's left and right edges at a measured width: SvgPlot's wide or compact margins. */
export function horizontalFrame(width: number, yTickChars: number): HorizontalFrame {
  const compact = width < COMPACT_WIDTH;
  if (!compact) return { width, compact, left: WIDE_MARGIN.left, right: width - WIDE_MARGIN.right };
  const left = Math.max(MIN_COMPACT_LEFT, yTickChars * COMPACT_CHAR_WIDTH + COMPACT_LABEL_PAD);
  return { width, compact, left, right: width - COMPACT_RIGHT };
}

const px = (value: number) => Number(value.toFixed(PATH_DECIMALS));

/** Steps of 1, 2 or 5 × 10ⁿ only: a 2,5 step would need a third decimal the ticks never print. */
const TICK_MANTISSAS = [1, 2, 5, 10];
const TICK_EPSILON = 1e-9;
const TICK_DIGITS = 12;

/** About `intervals` ticks inside the domain, at the 1-2-5 step closest to its span / intervals. */
export function stepTicks(domain: { min: number; max: number }, intervals: number): number[] {
  const raw = (domain.max - domain.min) / intervals;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = TICK_MANTISSAS.map((m) => m * magnitude).reduce((best, candidate) =>
    Math.abs(candidate - raw) < Math.abs(best - raw) ? candidate : best,
  );
  const first = Math.ceil(domain.min / step - TICK_EPSILON);
  const last = Math.floor(domain.max / step + TICK_EPSILON);
  return Array.from({ length: last - first + 1 }, (_, i) =>
    Number(((first + i) * step).toPrecision(TICK_DIGITS)),
  );
}

/** "M x y L x y …", a new subpath after every non-finite point. */
export function linePath(points: readonly Point[], x: Scale, y: Scale): string {
  return points
    .map((point, i) => {
      if (!isFinitePoint(point)) return '';
      const command = i > 0 && isFinitePoint(points[i - 1]) ? 'L' : 'M';
      return `${command}${px(x.toPx(point.x))} ${px(y.toPx(point.y))}`;
    })
    .filter(Boolean)
    .join(' ');
}

export interface Scales {
  x: Scale;
  y: Scale;
}

export interface PanelProps {
  clipId: string;
  area: PlotArea;
  scales: Scales;
  ticks: AxisTicks;
  /** Axis titles in the MathText notation, unit included: "Velocidad media $v$ (m/s)". */
  xTitle: string;
  yTitle: string;
  frame: HorizontalFrame;
  children: ReactNode;
}

/** One panel: grid (as the global setting says), axes and titles, and its marks clipped to it. */
export function Panel({
  clipId,
  area,
  scales,
  ticks,
  xTitle,
  yTitle,
  frame,
  children,
}: PanelProps): JSX.Element {
  const { grid } = useGlobalSettings();
  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <rect
            x={area.left}
            y={area.top}
            width={area.right - area.left}
            height={area.bottom - area.top}
          />
        </clipPath>
      </defs>
      {grid ? <PlotGrid ticks={ticks} x={scales.x} y={scales.y} area={area} /> : null}
      <PlotAxes
        ticks={ticks}
        x={scales.x}
        y={scales.y}
        area={area}
        xTitle={xTitle}
        yTitle={yTitle}
        tickFontSize={TICK_SIZE}
        titleFontSize={TITLE_SIZE}
        compact={frame.compact}
        viewWidth={frame.width}
      />
      <g clipPath={`url(#${clipId})`}>{children}</g>
    </g>
  );
}

export interface MarkProps {
  /** The legend entry that highlights this mark; also its `data-series`. */
  legendId: string;
  points: readonly Point[];
  color: string;
  scales: Scales;
}

/** A model's line: solid or dashed, wider when its legend entry is highlighted. */
export function SeriesLine({
  legendId,
  points,
  color,
  scales,
  dashed = false,
}: MarkProps & { dashed?: boolean }): JSX.Element {
  return (
    <path
      data-series={legendId}
      d={linePath(points, scales.x, scales.y)}
      fill="none"
      stroke={color}
      strokeWidth={LINE_WIDTH}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={dashed ? DASH_PATTERN : undefined}
      {...emphasisProps(useSeriesEmphasis(legendId))}
    />
  );
}

/** A measurement or a section: points with a ring in the surface colour, never joined. */
export function SeriesDots({ legendId, points, color, scales }: MarkProps): JSX.Element {
  const emphasis = useSeriesEmphasis(legendId);
  return (
    <g {...emphasisProps(emphasis, DOT_RING)}>
      {points.map((point, i) => (
        <circle
          key={i}
          data-series={legendId}
          cx={px(scales.x.toPx(point.x))}
          cy={px(scales.y.toPx(point.y))}
          r={DOT_RADIUS}
          fill={color}
          stroke={SURFACE_COLOR}
          strokeWidth={DOT_RING}
        />
      ))}
    </g>
  );
}

/** A legend key drawn like its mark: a line (solid or dashed) or a point. */
export function Swatch({
  color,
  shape = 'line',
  dashed = false,
}: {
  color: string;
  shape?: 'line' | 'dot';
  dashed?: boolean;
}): JSX.Element {
  return <LegendKey color={color} shape={shape} dashed={dashed} />;
}

/**
 * A symbol with its «=» and its value, kept on one line: KaTeX's formula is an atomic inline, so a
 * line may break right after it whatever space follows; a nowrap box keeps the three together.
 */
export function Unbroken({ text }: { text: string }): JSX.Element {
  return (
    <span className="whitespace-nowrap">
      <InlineMath text={text} />
    </span>
  );
}

const BUTTON =
  'inline-flex min-h-10 items-center rounded-base border px-3 py-2 text-sm font-medium transition-colors';
const BUTTON_ACTIVE = 'border-accent bg-accent/10';
const BUTTON_IDLE = 'border-border bg-bg-elevated hover:border-fg-muted';

/** A row of toggle buttons (aria-pressed) that picks one view, as the Voyager chart's. */
export function ViewButtons<T extends string>({
  label,
  views,
  value,
  onSelect,
}: {
  label: string;
  views: readonly { id: T; label: string }[];
  value: T;
  onSelect: (id: T) => void;
}): JSX.Element {
  return (
    <div role="group" aria-label={label} className="mb-3 flex flex-wrap gap-2">
      {views.map((view) => (
        <button
          key={view.id}
          type="button"
          aria-pressed={view.id === value}
          onClick={() => onSelect(view.id)}
          className={`${BUTTON} ${view.id === value ? BUTTON_ACTIVE : BUTTON_IDLE}`}
        >
          {view.label}
        </button>
      ))}
    </div>
  );
}

/** The container a drawing measures itself in; its height reserve queries this container. */
export const DRAWING_CONTAINER = '@container/plot relative w-full min-w-0';
const RESERVE_CLASS = 'h-(--plot-height-compact) @min-[479.5px]/plot:h-(--plot-height-wide)';

/**
 * Before the drawing measures its width (the server draws at 720 px), CSS gives it the height it
 * will have in its layout, compact below 480 px or wide, so the page does not move when it
 * hydrates (as SvgPlot's equal-aspect reserve, svgPlotReserve.ts). Measured, its height is its own.
 */
export function heightReserve(
  heights: { compact: number; wide: number },
  isMeasured: boolean,
): { className: string; style?: CSSProperties } {
  if (isMeasured) return { className: 'block h-auto' };
  return {
    className: `block ${RESERVE_CLASS}`,
    style: {
      '--plot-height-compact': `${heights.compact}px`,
      '--plot-height-wide': `${heights.wide}px`,
    } as CSSProperties,
  };
}
