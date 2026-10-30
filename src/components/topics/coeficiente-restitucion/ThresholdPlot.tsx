import { useId, type JSX } from 'react';
import ChartFrame from '../../charts/ChartFrame';
import {
  CHART_COLORS,
  DASH_PATTERN,
  LINE_WIDTH,
  SURFACE_COLOR,
  TEXT_COLOR,
  TICK_COLOR,
  TICK_FONT_FAMILY,
  TICK_FONT_SIZE,
} from '../../charts/chartTheme';
import { useElementWidth } from '../../hooks/useElementWidth';
import { Arrow } from '../../lab/OverlayMarks';
import { linearScale, niceTicks, type Domain, type Scale } from '../../lab/plotScales';
import { PlotAxes, PlotGrid, yTickLabelChars } from '../../lab/SvgPlotAxes';
import type { PlotArea } from '../../lab/SvgPlotCursor';
import { useGlobalSettings } from '../../lab/useGlobalSettings';
import { formatNumber } from '../../../lib/format';
import { G_EARTH } from '../../../lib/physics';
import {
  formatTrimmed,
  heightSeries,
  THRESHOLD_CASES,
  UMBRAL_DROP,
  type ThresholdFigureCase,
} from './bounceFigures';

/**
 * Step 3's plot: hₙ against n on a logarithmic y axis, where the ideal series e²ⁿh₀ is a straight
 * line. SvgPlot only draws linear axes, so this composes its axes and grid with a log scale.
 */

type XY = { x: number; y: number };
type Margin = { top: number; right: number; bottom: number; left: number };

/** The ideal ball in a neutral color; the two engines in colors that name no real object. */
const IDEAL_COLOR = TICK_COLOR;
const CASE_COLORS: Record<ThresholdFigureCase['id'], string> = {
  box2d: CHART_COLORS[5],
  unity: CHART_COLORS[3],
};
/**
 * The engine series lie on the ideal one until they stop: Box2D's runs wide and translucent under
 * Unity's narrow line, so both show where they overlap.
 */
const CASE_WIDTHS: Record<ThresholdFigureCase['id'], number> = { box2d: 7, unity: LINE_WIDTH };
const CASE_OPACITY: Record<ThresholdFigureCase['id'], number> = { box2d: 0.45, unity: 1 };

/** hₙ from 1 mm to 2 m, in centimetres, labelled at every decade. */
const Y_DOMAIN: Domain = { min: 0.1, max: 200 };
const DECADES = [0.1, 1, 10, 100];
const X_DOMAIN: Domain = { min: 0, max: UMBRAL_DROP.count };

const FALLBACK_WIDTH = 720;
/** Narrowest viewBox drawn, as SvgPlot's, so the plot area keeps a positive width. */
const MIN_VIEWBOX_WIDTH = 240;
const COMPACT_WIDTH = 480;
const WIDE_ASPECT = 1.6;
/** Phones get a squarer plot so four decades keep room. */
const COMPACT_ASPECT = 0.9;
const MARGIN: Margin = { top: 22, right: 28, bottom: 58, left: 84 };
const COMPACT_MARGIN: Omit<Margin, 'left'> = { top: 30, right: 14, bottom: 50 };
/** Compact left margin: the widest y tick label (≈ 8 px per mono character) plus tick and gap. */
const COMPACT_CHAR_WIDTH = 8;
const COMPACT_LABEL_PAD = 12;
const MIN_COMPACT_LEFT = 40;
const X_TICK_SPACING = 100;
/** At least 0, 10, 20, 30 on a phone. */
const MIN_TICK_INTERVALS = 3;
const TICK_SIZE = TICK_FONT_SIZE + 1;
const TITLE_SIZE = TICK_FONT_SIZE + 2;
const LABEL_SIZE = 12;
const HALO_WIDTH = 4;
const DOT_RADIUS = 2.5;
const STOP_RADIUS = 5;
const THRESHOLD_DASH = '2 3';
const THRESHOLD_LABEL_INSET = 4;
const THRESHOLD_LABEL_RISE = 5;
const LEGEND_KEY_WIDTH = 22;
const LEGEND_KEY_HEIGHT = 10;
const PATH_DECIMALS = 2;

const haloText = {
  fill: TEXT_COLOR,
  fontFamily: TICK_FONT_FAMILY,
  fontSize: LABEL_SIZE,
  stroke: SURFACE_COLOR,
  strokeWidth: HALO_WIDTH,
  paintOrder: 'stroke',
} as const;

/** A base-10 logarithmic scale; its domain is in data units (both ends positive). */
function logScale(domain: Domain, range: [number, number]): Scale {
  const linear = linearScale({ min: Math.log10(domain.min), max: Math.log10(domain.max) }, range);
  return {
    toPx: (value) => linear.toPx(Math.log10(value)),
    toValue: (px) => 10 ** linear.toValue(px),
    domain: { ...domain },
    range,
  };
}

function layout(measuredWidth: number) {
  const width = Math.max(measuredWidth, MIN_VIEWBOX_WIDTH);
  const compact = width < COMPACT_WIDTH;
  const left = Math.max(
    MIN_COMPACT_LEFT,
    yTickLabelChars(DECADES) * COMPACT_CHAR_WIDTH + COMPACT_LABEL_PAD,
  );
  const margin = compact ? { ...COMPACT_MARGIN, left } : MARGIN;
  const height = Math.round(width / (compact ? COMPACT_ASPECT : WIDE_ASPECT));
  const area: PlotArea = {
    left: margin.left,
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
  };
  const x = linearScale(X_DOMAIN, [area.left, area.right]);
  const y = logScale(Y_DOMAIN, [area.bottom, area.top]);
  const intervals = Math.max(
    MIN_TICK_INTERVALS,
    Math.round((area.right - area.left) / X_TICK_SPACING),
  );
  return {
    width,
    height,
    compact,
    area,
    x,
    y,
    ticks: { x: niceTicks(X_DOMAIN, intervals), y: DECADES },
  };
}

const px = (value: number) => Number(value.toFixed(PATH_DECIMALS));

function linePath(points: readonly XY[], x: Scale, y: Scale): string {
  return points
    .map(
      (point, index) => `${index === 0 ? 'M' : 'L'}${px(x.toPx(point.x))} ${px(y.toPx(point.y))}`,
    )
    .join(' ');
}

interface LegendItem {
  id: string;
  label: string;
  color: string;
  width: number;
  opacity: number;
  dashed: boolean;
}

function Legend({ items }: { items: readonly LegendItem[] }) {
  return (
    <ul aria-label="Leyenda" className="mb-2 flex list-none flex-col gap-1 p-0 text-sm">
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-2 text-fg">
          <svg
            aria-hidden="true"
            width={LEGEND_KEY_WIDTH}
            height={LEGEND_KEY_HEIGHT}
            className="shrink-0"
          >
            <line
              x1="1"
              x2={LEGEND_KEY_WIDTH - 1}
              y1={LEGEND_KEY_HEIGHT / 2}
              y2={LEGEND_KEY_HEIGHT / 2}
              stroke={item.color}
              strokeWidth={item.width}
              strokeOpacity={item.opacity}
              strokeDasharray={item.dashed ? DASH_PATTERN : undefined}
            />
          </svg>
          {item.label}
        </li>
      ))}
    </ul>
  );
}

const IDEAL_LEGEND = 'Ideal, sin umbral: hₙ = e²ⁿ h₀';

const LEGEND_ITEMS: readonly LegendItem[] = [
  {
    id: 'ideal',
    label: IDEAL_LEGEND,
    color: IDEAL_COLOR,
    width: LINE_WIDTH,
    opacity: 1,
    dashed: true,
  },
  ...THRESHOLD_CASES.map((item) => ({
    id: item.id,
    label: item.legend,
    color: CASE_COLORS[item.id],
    width: CASE_WIDTHS[item.id],
    opacity: CASE_OPACITY[item.id],
    dashed: false,
  })),
];

/** The height a threshold equals, v_th²/(2g), as a dotted line labelled at its right end. */
function ThresholdLine({
  item,
  x,
  y,
  area,
}: {
  item: ThresholdFigureCase;
  x: Scale;
  y: Scale;
  area: PlotArea;
}) {
  const level = y.toPx(item.thresholdHeight);
  return (
    <g data-threshold={item.id}>
      <line
        x1={area.left}
        x2={area.right}
        y1={level}
        y2={level}
        stroke={CASE_COLORS[item.id]}
        strokeDasharray={THRESHOLD_DASH}
      />
      <text
        x={x.range[1] - THRESHOLD_LABEL_INSET}
        y={level - THRESHOLD_LABEL_RISE}
        textAnchor="end"
        {...haloText}
      >
        {`${formatNumber(item.thresholdHeight, { precision: 1 })} cm`}
      </text>
    </g>
  );
}

/** Where the engine's ball stops dead: its last apex, then straight to the floor (h = 0). */
function StopMark({
  item,
  x,
  y,
  area,
}: {
  item: ThresholdFigureCase;
  x: Scale;
  y: Scale;
  area: PlotArea;
}) {
  const color = CASE_COLORS[item.id];
  const last = { x: x.toPx(item.bounces), y: y.toPx(item.lastHeight) };
  return (
    <g data-stop={item.id}>
      <Arrow
        from={last}
        to={{ x: x.toPx(item.bounces + 1), y: area.bottom }}
        color={color}
        dashed
      />
      <circle
        cx={last.x}
        cy={last.y}
        r={STOP_RADIUS}
        fill={color}
        stroke={SURFACE_COLOR}
        strokeWidth={2}
      />
    </g>
  );
}

function ariaLabel(): string {
  const { h0, e } = UMBRAL_DROP;
  const stops = [...THRESHOLD_CASES]
    .reverse()
    .map(
      (item) =>
        `con ${formatTrimmed(item.vth)} m/s (${item.engine}, ${formatNumber(item.thresholdHeight, { precision: 1 })} cm) se queda en el piso tras ${item.bounces} rebotes, el último de ${formatNumber(item.lastHeight, { precision: 1 })} cm`,
    )
    .join(', y ');
  return `hₙ frente a n en escala logarítmica para una pelota de e = ${formatTrimmed(e)} soltada desde ${formatTrimmed(h0)} m: la serie ideal baja en línea recta y no se corta; ${stops}.`;
}

const IDEAL_POINTS = heightSeries(UMBRAL_DROP.h0, UMBRAL_DROP.e, G_EARTH, UMBRAL_DROP.count);

export default function ThresholdPlot(): JSX.Element {
  const settings = useGlobalSettings();
  const clipId = `umbral-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const [ref, measuredWidth] = useElementWidth<HTMLDivElement>(FALLBACK_WIDTH);
  const { width, height, compact, area, x, y, ticks } = layout(measuredWidth);
  return (
    <ChartFrame title="Altura de cada rebote, sin umbral y con el umbral de dos motores">
      <Legend items={LEGEND_ITEMS} />
      <div ref={ref} className="w-full min-w-0">
        <svg
          role="img"
          aria-label={ariaLabel()}
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          className="block h-auto"
        >
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
          {settings.grid ? <PlotGrid ticks={ticks} x={x} y={y} area={area} /> : null}
          <PlotAxes
            ticks={ticks}
            x={x}
            y={y}
            area={area}
            xTitle="n (número de rebote)"
            yTitle="hₙ (cm, escala logarítmica)"
            tickFontSize={TICK_SIZE}
            titleFontSize={TITLE_SIZE}
            compact={compact}
            viewWidth={width}
          />
          <g clipPath={`url(#${clipId})`}>
            {THRESHOLD_CASES.map((item) => (
              <ThresholdLine key={item.id} item={item} x={x} y={y} area={area} />
            ))}
            <path
              data-series="ideal"
              d={linePath(IDEAL_POINTS, x, y)}
              fill="none"
              stroke={IDEAL_COLOR}
              strokeWidth={LINE_WIDTH}
              strokeDasharray={DASH_PATTERN}
            />
            <g fill={IDEAL_COLOR}>
              {IDEAL_POINTS.map((point) => (
                <circle key={point.x} cx={x.toPx(point.x)} cy={y.toPx(point.y)} r={DOT_RADIUS} />
              ))}
            </g>
            {THRESHOLD_CASES.map((item) => (
              <path
                key={item.id}
                data-series={item.id}
                d={linePath(item.points, x, y)}
                fill="none"
                stroke={CASE_COLORS[item.id]}
                strokeWidth={CASE_WIDTHS[item.id]}
                strokeOpacity={CASE_OPACITY[item.id]}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            {THRESHOLD_CASES.map((item) => (
              <StopMark key={item.id} item={item} x={x} y={y} area={area} />
            ))}
          </g>
        </svg>
      </div>
    </ChartFrame>
  );
}
