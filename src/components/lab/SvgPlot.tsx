import { useId, type ReactNode } from 'react';
import ChartFrame from '../charts/ChartFrame';
import {
  CHART_COLORS,
  DASH_PATTERN,
  DEFAULT_ASPECT_RATIO,
  LINE_WIDTH,
  SURFACE_COLOR,
  TEXT_COLOR,
  TICK_COLOR,
  TICK_FONT_FAMILY,
  TICK_FONT_SIZE,
} from '../charts/chartTheme';
import { linearScale, padDomain, type Domain, type Scale } from './plotScales';
import { axisTicks, PlotAxes, PlotGrid } from './SvgPlotAxes';
import SvgPlotCursor, { type PlotArea } from './SvgPlotCursor';
import { useGlobalSettings } from './useGlobalSettings';

export interface PlotSeries {
  id: string;
  label: string;
  points: { x: number; y: number }[];
  color?: string;
  dashed?: boolean;
}
export interface PlotBand {
  from: number;
  to: number;
  label: string;
}
export interface PlotCursor {
  x: number;
  onChange?: (x: number) => void;
  label?: (x: number) => string;
}
export interface PlotMarker {
  x: number;
  y: number;
  label?: string;
}
export interface SvgPlotProps {
  title: string;
  xLabel: string;
  xUnit: string;
  yLabel: string;
  yUnit: string;
  series: PlotSeries[];
  xDomain?: Domain;
  yDomain?: Domain;
  /** Equal units per pixel on both axes; the viewBox height then follows the y range. */
  equalAspect?: boolean;
  /** viewBox width over height when not equalAspect (default 1.6). */
  aspectRatio?: number;
  bands?: PlotBand[];
  cursor?: PlotCursor;
  marker?: PlotMarker;
  /** Defaults to the global grid setting. */
  showGrid?: boolean;
  /** Custom SVG drawn in viewBox pixels, clipped to the plot area, above the series. */
  overlay?: (scales: { x: Scale; y: Scale }) => ReactNode;
  ariaLabel: string;
  testId?: string;
}

export type { Domain, Scale } from './plotScales';

const VIEWBOX_WIDTH = 720;
const MARGIN = { top: 22, right: 28, bottom: 58, left: 84 } as const;
const AUTO_PAD = 0.05;
const FALLBACK_DOMAIN: Domain = { min: 0, max: 1 };
const MIN_SERIES_FOR_LEGEND = 2;
/** Font sizes in viewBox units; the svg scales with its container. */
const TICK_SIZE = TICK_FONT_SIZE + 1;
const TITLE_SIZE = TICK_FONT_SIZE + 2;
const NOTE_SIZE = TICK_FONT_SIZE;
const BAND_OPACITY = 0.12;
const BAND_LABEL_OFFSET = 16;
const MARKER_RADIUS = 5;
const MARKER_LABEL_GAP = 10;
const HALO_WIDTH = 4;
const PATH_DECIMALS = 2;
const LEGEND_KEY_WIDTH = 18;

type Point = { x: number; y: number };

const isFinitePoint = (p: Point) => Number.isFinite(p.x) && Number.isFinite(p.y);

function seriesColor(series: PlotSeries, index: number): string {
  return series.color ?? CHART_COLORS[index % CHART_COLORS.length];
}

/** Explicit domains win; otherwise 5 % around every finite point and the marker, y reaching 0. */
function resolveDomains({ series, marker, xDomain, yDomain }: SvgPlotProps) {
  const points = [...series.flatMap((s) => s.points), ...(marker ? [marker] : [])].filter(
    isFinitePoint,
  );
  const derive = (values: number[], includeZero: boolean) =>
    values.length === 0 ? FALLBACK_DOMAIN : padDomain(values, AUTO_PAD, includeZero);
  return {
    x:
      xDomain ??
      derive(
        points.map((p) => p.x),
        false,
      ),
    y:
      yDomain ??
      derive(
        points.map((p) => p.y),
        true,
      ),
  };
}

function computeLayout(props: SvgPlotProps) {
  const domains = resolveDomains(props);
  const aspectRatio = props.aspectRatio ?? DEFAULT_ASPECT_RATIO;
  if (!(aspectRatio > 0) || !Number.isFinite(aspectRatio)) {
    throw new RangeError(`SvgPlot: aspectRatio debe ser positivo (${aspectRatio})`);
  }
  const plotWidth = VIEWBOX_WIDTH - MARGIN.left - MARGIN.right;
  const x = linearScale(domains.x, [MARGIN.left, MARGIN.left + plotWidth]);
  const unitsPerPx = (domains.x.max - domains.x.min) / plotWidth;
  const plotHeight = props.equalAspect
    ? (domains.y.max - domains.y.min) / unitsPerPx
    : VIEWBOX_WIDTH / aspectRatio - MARGIN.top - MARGIN.bottom;
  const area: PlotArea = {
    left: MARGIN.left,
    top: MARGIN.top,
    right: MARGIN.left + plotWidth,
    bottom: MARGIN.top + plotHeight,
  };
  const y = linearScale(domains.y, [area.bottom, area.top]);
  const height = Number((area.bottom + MARGIN.bottom).toFixed(PATH_DECIMALS));
  return { x, y, area, height };
}

const px = (value: number) => Number(value.toFixed(PATH_DECIMALS));

/** "M x y L x y …", starting a new subpath after every non-finite point. */
function seriesPath(points: Point[], x: Scale, y: Scale): string {
  return points
    .map((p, i) => {
      if (!isFinitePoint(p)) return null;
      const command = i > 0 && isFinitePoint(points[i - 1]) ? 'L' : 'M';
      return `${command}${px(x.toPx(p.x))} ${px(y.toPx(p.y))}`;
    })
    .filter((command) => command !== null)
    .join(' ');
}

function Legend({ series }: { series: PlotSeries[] }) {
  return (
    <ul aria-label="Leyenda" className="mb-2 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-sm">
      {series.map((s, index) => (
        <li key={s.id} className="flex items-center gap-2 text-fg">
          <svg aria-hidden="true" width={LEGEND_KEY_WIDTH} height="8" className="shrink-0">
            <line
              x1="1"
              x2={LEGEND_KEY_WIDTH - 1}
              y1="4"
              y2="4"
              stroke={seriesColor(s, index)}
              strokeWidth={LINE_WIDTH}
              strokeLinecap="round"
              strokeDasharray={s.dashed ? '4 3' : undefined}
            />
          </svg>
          {s.label}
        </li>
      ))}
    </ul>
  );
}

const haloText = {
  fill: TEXT_COLOR,
  fontFamily: TICK_FONT_FAMILY,
  fontSize: NOTE_SIZE,
  stroke: SURFACE_COLOR,
  strokeWidth: HALO_WIDTH,
  paintOrder: 'stroke',
} as const;

function Bands({ bands, x, area }: { bands: PlotBand[]; x: Scale; area: PlotArea }) {
  return (
    <g>
      {bands.map((band) => {
        const from = x.toPx(Math.max(Math.min(band.from, band.to), x.domain.min));
        const to = x.toPx(Math.min(Math.max(band.from, band.to), x.domain.max));
        if (to <= from) return null;
        return (
          <g key={`${band.from}-${band.to}-${band.label}`}>
            <rect
              aria-label={band.label}
              x={from}
              y={area.top}
              width={to - from}
              height={area.bottom - area.top}
              fill={TICK_COLOR}
              fillOpacity={BAND_OPACITY}
            />
            <text
              x={(from + to) / 2}
              y={area.top + BAND_LABEL_OFFSET}
              textAnchor="middle"
              {...haloText}
            >
              {band.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function Marker({ marker, x, y }: { marker: PlotMarker; x: Scale; y: Scale }) {
  if (!isFinitePoint(marker)) return null;
  const cx = x.toPx(marker.x);
  const cy = y.toPx(marker.y);
  return (
    <g>
      <circle
        data-marker=""
        cx={cx}
        cy={cy}
        r={MARKER_RADIUS}
        fill={TEXT_COLOR}
        stroke={SURFACE_COLOR}
        strokeWidth={2}
      />
      {marker.label ? (
        <text x={cx + MARKER_LABEL_GAP} y={cy - MARKER_LABEL_GAP} {...haloText}>
          {marker.label}
        </text>
      ) : null}
    </g>
  );
}

/**
 * The lab plotter: a fixed-viewBox SVG that scales to its container. The figure itself is one
 * role="img" layer; the overlay and the cursor live in a stacked layer with the same viewBox so
 * the slider stays reachable by assistive technology (an img's children are presentational).
 */
export default function SvgPlot(props: SvgPlotProps) {
  const {
    title,
    xLabel,
    xUnit,
    yLabel,
    yUnit,
    series,
    bands = [],
    cursor,
    marker,
    overlay,
  } = props;
  const settings = useGlobalSettings();
  const showGrid = props.showGrid ?? settings.grid;
  const clipBase = `svgplot-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const { x, y, area, height } = computeLayout(props);
  const ticks = axisTicks(x, y);
  const viewBox = `0 0 ${VIEWBOX_WIDTH} ${height}`;
  const clipRect = (id: string) => (
    <defs>
      <clipPath id={id}>
        <rect
          x={area.left}
          y={area.top}
          width={area.right - area.left}
          height={area.bottom - area.top}
        />
      </clipPath>
    </defs>
  );

  return (
    <ChartFrame title={title} testId={props.testId}>
      {series.length >= MIN_SERIES_FOR_LEGEND ? <Legend series={series} /> : null}
      <div className="relative w-full min-w-0">
        <svg
          role="img"
          aria-label={props.ariaLabel}
          viewBox={viewBox}
          width="100%"
          className="block h-auto"
        >
          {clipRect(`${clipBase}-plot`)}
          {showGrid ? <PlotGrid ticks={ticks} x={x} y={y} area={area} /> : null}
          <Bands bands={bands} x={x} area={area} />
          <PlotAxes
            ticks={ticks}
            x={x}
            y={y}
            area={area}
            xTitle={`${xLabel} (${xUnit})`}
            yTitle={`${yLabel} (${yUnit})`}
            tickFontSize={TICK_SIZE}
            titleFontSize={TITLE_SIZE}
          />
          <g
            clipPath={`url(#${clipBase}-plot)`}
            fill="none"
            strokeWidth={LINE_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {series.map((s, index) => (
              <path
                key={s.id}
                data-series={s.id}
                d={seriesPath(s.points, x, y)}
                stroke={seriesColor(s, index)}
                strokeDasharray={s.dashed ? DASH_PATTERN : undefined}
              />
            ))}
          </g>
          {marker ? <Marker marker={marker} x={x} y={y} /> : null}
        </svg>
        <svg
          role="presentation"
          viewBox={viewBox}
          className="pointer-events-none absolute inset-0 block h-full w-full"
        >
          {clipRect(`${clipBase}-overlay`)}
          {overlay ? (
            <g clipPath={`url(#${clipBase}-overlay)`} className="pointer-events-auto">
              {overlay({ x, y })}
            </g>
          ) : null}
          {cursor ? (
            <SvgPlotCursor
              cursor={cursor}
              x={x}
              area={area}
              xLabel={xLabel}
              xUnit={xUnit}
              decimals={settings.decimals}
              fontSize={NOTE_SIZE}
            />
          ) : null}
        </svg>
      </div>
    </ChartFrame>
  );
}
