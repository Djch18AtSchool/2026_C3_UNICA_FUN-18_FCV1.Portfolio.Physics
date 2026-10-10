import { useId, type ReactNode } from 'react';
import ChartFrame from '../charts/ChartFrame';
import {
  CHART_COLORS,
  DASH_PATTERN,
  DEFAULT_ASPECT_RATIO,
  LINE_WIDTH,
  TICK_FONT_SIZE,
} from '../charts/chartTheme';
import { isFinitePoint, linearScale, padDomain, type Domain, type Scale } from './plotScales';
import { axisTicks, PlotAxes, PlotGrid, yTickLabelChars } from './SvgPlotAxes';
import SvgPlotCursor, { type PlotArea } from './SvgPlotCursor';
import { Bands, Marker } from './SvgPlotMarks';
import { useElementWidth } from '../hooks/useElementWidth';
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
  /** Where the label sits: along the top of the plot area (default) or along its bottom. */
  labelAt?: 'top' | 'bottom';
  /**
   * Put the label just left of the band, ending at its left edge and wrapped to the room there,
   * so a cursor inside the band never crosses it; centred on the band when no word fits.
   */
  labelBefore?: boolean;
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
  /** viewBox width over height when not equalAspect (default 1.6, or 1.25 below 480 px). */
  aspectRatio?: number;
  bands?: PlotBand[];
  cursor?: PlotCursor;
  marker?: PlotMarker;
  /** Defaults to the global grid setting. */
  showGrid?: boolean;
  /** Custom SVG drawn in viewBox pixels, clipped to the plot area, above the series. */
  overlay?: (scales: OverlayScales) => ReactNode;
  /**
   * Pixels the overlay may draw past the plot area on every side (default 0): a draggable knob
   * that can sit on the plot's edge then stays whole and keeps its full hit target. The overlay
   * then wraps everything but its knobs (vectors, trails, labels) in `plotClipPath`.
   */
  overlayBleed?: number;
  ariaLabel: string;
  testId?: string;
}

export type { Domain, Scale } from './plotScales';

/** What the overlay draws with: the scales and, with a bleed, the plain plot-area clip. */
export interface OverlayScales {
  x: Scale;
  y: Scale;
  /** `url(#…)` of a clip to the plot area itself, for marks that must not use the bleed. */
  plotClipPath?: string;
}

/** viewBox width before the container is measured (SSR, jsdom): the article column. */
const FALLBACK_WIDTH = 720;
/** Narrowest viewBox drawn, so the plot area keeps a positive width inside the margins. */
const MIN_VIEWBOX_WIDTH = 240;
/** equalAspect keeps the plot height within these multiples of the plot width. */
const MIN_EQUAL_ASPECT_HEIGHT = 0.5;
const MAX_EQUAL_ASPECT_HEIGHT = 1.5;
type Margin = { top: number; right: number; bottom: number; left: number };
const MARGIN: Margin = { top: 22, right: 28, bottom: 58, left: 84 };
/** Below this viewBox width (phones) the margins tighten so the plot area keeps most of the width. */
const COMPACT_WIDTH = 480;
const COMPACT_MARGIN: Omit<Margin, 'left'> = { top: 30, right: 14, bottom: 50 };
/** Default aspect below 480 px: at 1.6 a phone plot area would be under 90 px tall. */
const COMPACT_ASPECT_RATIO = 1.25;
/**
 * With a draggable cursor, its knob sits on the top edge of the plot area: a compact plot then
 * grows its top margin, and lifts its horizontal y title by as much, so the knob clears the title.
 */
const COMPACT_HANDLE_LIFT = 12;
/** Compact left margin: the widest y tick label (≈ 8 px per mono character) plus tick and gap. */
const COMPACT_CHAR_WIDTH = 8;
const COMPACT_LABEL_PAD = 12;
const MIN_COMPACT_LEFT = 40;
/** Re-measures the tick labels this many times at most (labels change little between passes). */
const COMPACT_PASSES = 2;
const AUTO_PAD = 0.05;
const FALLBACK_DOMAIN: Domain = { min: 0, max: 1 };
const MIN_SERIES_FOR_LEGEND = 2;
/** Font sizes in CSS pixels: the viewBox follows the measured width, so one unit is one pixel. */
const TICK_SIZE = TICK_FONT_SIZE + 1;
const TITLE_SIZE = TICK_FONT_SIZE + 2;
const NOTE_SIZE = TICK_FONT_SIZE;
const PATH_DECIMALS = 2;
const LEGEND_KEY_WIDTH = 18;

type Point = { x: number; y: number };

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

/** Widens a domain symmetrically about its centre to the given span. */
function widenTo(domain: Domain, span: number): Domain {
  const centre = (domain.min + domain.max) / 2;
  return { min: centre - span / 2, max: centre + span / 2 };
}

/**
 * Equal units per pixel on both axes, with the plot height kept between 0.5 and 1.5 times the plot
 * width; when the data would leave those bounds, the smaller domain is widened symmetrically.
 */
function equalAspectFit(domains: { x: Domain; y: Domain }, plotWidth: number) {
  const xSpan = domains.x.max - domains.x.min;
  const ySpan = domains.y.max - domains.y.min;
  const naturalHeight = (ySpan / xSpan) * plotWidth;
  const plotHeight = Math.min(
    Math.max(naturalHeight, plotWidth * MIN_EQUAL_ASPECT_HEIGHT),
    plotWidth * MAX_EQUAL_ASPECT_HEIGHT,
  );
  if (naturalHeight > plotHeight) {
    return { plotHeight, x: widenTo(domains.x, (ySpan / plotHeight) * plotWidth), y: domains.y };
  }
  if (naturalHeight < plotHeight) {
    return { plotHeight, x: domains.x, y: widenTo(domains.y, (xSpan / plotWidth) * plotHeight) };
  }
  return { plotHeight, ...domains };
}

function layoutWith(props: SvgPlotProps, width: number, margin: Margin) {
  const defaultAspect = width < COMPACT_WIDTH ? COMPACT_ASPECT_RATIO : DEFAULT_ASPECT_RATIO;
  const aspectRatio = props.aspectRatio ?? defaultAspect;
  if (!(aspectRatio > 0) || !Number.isFinite(aspectRatio)) {
    throw new RangeError(`SvgPlot: aspectRatio debe ser positivo (${aspectRatio})`);
  }
  const plotWidth = width - margin.left - margin.right;
  const resolved = resolveDomains(props);
  const fit = props.equalAspect
    ? equalAspectFit(resolved, plotWidth)
    : { plotHeight: width / aspectRatio - margin.top - margin.bottom, ...resolved };
  const area: PlotArea = {
    left: margin.left,
    top: margin.top,
    right: margin.left + plotWidth,
    bottom: margin.top + fit.plotHeight,
  };
  const x = linearScale(fit.x, [area.left, area.right]);
  const y = linearScale(fit.y, [area.bottom, area.top]);
  const height = Number((area.bottom + margin.bottom).toFixed(PATH_DECIMALS));
  return { x, y, area, width, height };
}

const compactLeft = (chars: number) =>
  Math.max(MIN_COMPACT_LEFT, chars * COMPACT_CHAR_WIDTH + COMPACT_LABEL_PAD);

/**
 * From 480 px up, the fixed margins (the desktop layout). Narrower, tight margins with the left
 * one fitted to the widest y tick label; the labels depend on the layout, so it is re-measured.
 */
function computeLayout(props: SvgPlotProps, measuredWidth: number) {
  const width = Math.max(measuredWidth, MIN_VIEWBOX_WIDTH);
  if (width >= COMPACT_WIDTH) {
    return { ...layoutWith(props, width, MARGIN), compact: false, titleLift: 0 };
  }
  const titleLift = props.cursor?.onChange ? COMPACT_HANDLE_LIFT : 0;
  const margin = { ...COMPACT_MARGIN, top: COMPACT_MARGIN.top + titleLift };
  let left = MIN_COMPACT_LEFT;
  let layout = layoutWith(props, width, { ...margin, left });
  for (let pass = 0; pass < COMPACT_PASSES; pass++) {
    const needed = compactLeft(yTickLabelChars(axisTicks(layout.x, layout.y).y));
    if (needed <= left) break;
    left = needed;
    layout = layoutWith(props, width, { ...margin, left });
  }
  return { ...layout, compact: true, titleLift };
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
              strokeDasharray={s.dashed ? DASH_PATTERN : undefined}
            />
          </svg>
          {s.label}
        </li>
      ))}
    </ul>
  );
}

/**
 * The lab plotter: an SVG whose viewBox follows its container's measured width (720 until
 * measured), so text and handles keep their CSS-pixel size on phones. The figure itself is one
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
  const [wrapperRef, measuredWidth] = useElementWidth<HTMLDivElement>(FALLBACK_WIDTH);
  const { x, y, area, width, height, compact, titleLift } = computeLayout(props, measuredWidth);
  const ticks = axisTicks(x, y);
  const viewBox = `0 0 ${width} ${height}`;
  const clipRect = (id: string, bleed = 0) => (
    <defs>
      <clipPath id={id}>
        <rect
          x={area.left - bleed}
          y={area.top - bleed}
          width={area.right - area.left + 2 * bleed}
          height={area.bottom - area.top + 2 * bleed}
        />
      </clipPath>
    </defs>
  );

  return (
    <ChartFrame title={title} testId={props.testId}>
      {series.length >= MIN_SERIES_FOR_LEGEND ? <Legend series={series} /> : null}
      <div ref={wrapperRef} className="relative w-full min-w-0">
        <svg
          role="img"
          aria-label={props.ariaLabel}
          viewBox={viewBox}
          width="100%"
          className="block h-auto"
        >
          {clipRect(`${clipBase}-plot`)}
          {showGrid ? <PlotGrid ticks={ticks} x={x} y={y} area={area} /> : null}
          <Bands bands={bands} x={x} area={area} width={width} />
          <PlotAxes
            ticks={ticks}
            x={x}
            y={y}
            area={area}
            xTitle={`${xLabel} (${xUnit})`}
            yTitle={`${yLabel} (${yUnit})`}
            tickFontSize={TICK_SIZE}
            compact={compact}
            compactTitleLift={titleLift}
            titleFontSize={TITLE_SIZE}
            viewWidth={width}
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
          {clipRect(`${clipBase}-overlay`, props.overlayBleed)}
          {props.overlayBleed ? clipRect(`${clipBase}-overlay-plot`) : null}
          {overlay ? (
            <g clipPath={`url(#${clipBase}-overlay)`} className="pointer-events-auto">
              {overlay({
                x,
                y,
                plotClipPath: props.overlayBleed ? `url(#${clipBase}-overlay-plot)` : undefined,
              })}
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
