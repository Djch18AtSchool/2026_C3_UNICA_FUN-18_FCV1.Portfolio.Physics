/**
 * Drawing pieces of the Voyager chart, in viewBox pixels (one per CSS pixel): a date or offset x
 * axis with its labelled ticks, value y axes with rotated titles, gridlines, clipped series and
 * shaded regions, the legend and the encounter labels with their leaders. SvgPlot draws one
 * numeric panel; this chart needs two panels on one time axis, so it composes these instead.
 */
import type { JSX, ReactNode } from 'react';
import { formatNumber } from '../../../lib/format';
import {
  AXIS_COLOR,
  DASH_PATTERN,
  GRID_COLOR,
  LINE_WIDTH,
  SURFACE_COLOR,
  TEXT_COLOR,
  TICK_COLOR,
  TICK_FONT_FAMILY,
  TICK_FONT_SIZE,
} from '../../charts/chartTheme';
import { fitCentre, monoTextWidth, type Scale } from '../../lab/plotScales';
import type { PlotArea } from '../../lab/SvgPlotCursor';
import type { AxisTick } from './dateAxis';
import type { PlacedLabel } from './labelLayout';
import type { ChartPoint } from './voyagerChartData';

export const FONT_SIZE = TICK_FONT_SIZE;
const TITLE_SIZE = TICK_FONT_SIZE + 1;
export const LINE_HEIGHT = 14;
const TICK_LENGTH = 5;
const X_LABEL_OFFSET = 18;
const X_TITLE_OFFSET = 40;
const Y_LABEL_OFFSET = 8;
/** Centre of the rotated y titles, from the left edge of the viewBox. */
const Y_TITLE_X = 12;
const PATH_DECIMALS = 2;
const REGION_OPACITY = 0.16;
const DOT_RADIUS = 4;
const HALO_WIDTH = 4;
const LEGEND_KEY_WIDTH = 22;
/** The thinner, paler stroke of secondary lines (V1, the Sun-only lines). */
export const THIN_LINE_WIDTH = 1.5;
export const DOT_DASH = '2 4';

/** Below this viewBox width (phones) the panels are shorter and the margins tighter. */
const COMPACT_WIDTH = 480;
/** Room under the bottom panel for the tick values and the x title. */
export const AXIS_BOTTOM = 52;

export interface Frame {
  width: number;
  left: number;
  right: number;
  isCompact: boolean;
}

/**
 * Horizontal frame for a measured width. The left margin holds the rotated y title and two-digit
 * tick values; the right one, half of the last year label ("1990").
 */
export function frameFor(width: number): Frame {
  const isCompact = width < COMPACT_WIDTH;
  return isCompact
    ? { width, left: 44, right: width - 16, isCompact }
    : { width, left: 56, right: width - 24, isCompact };
}

export interface Scales {
  x: Scale;
  y: Scale;
}

export const haloText = {
  fill: TEXT_COLOR,
  fontFamily: TICK_FONT_FAMILY,
  fontSize: FONT_SIZE,
  stroke: SURFACE_COLOR,
  strokeWidth: HALO_WIDTH,
  paintOrder: 'stroke',
} as const;

const px = (value: number) => Number(value.toFixed(PATH_DECIMALS));

/** "M x y L x y …" through the points. */
export function pathOf(points: readonly ChartPoint[], { x, y }: Scales): string {
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${px(x.toPx(p.x))} ${px(y.toPx(p.y))}`)
    .join(' ');
}

export function ClipArea({ id, area }: { id: string; area: PlotArea }): JSX.Element {
  return (
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
}

export interface LineSpec {
  id: string;
  label: string;
  color: string;
  dash?: string;
  width?: number;
  /** A shaded area instead of a line (legend key only). */
  isArea?: boolean;
}

export function SeriesPath({
  spec,
  points,
  scales,
}: {
  spec: LineSpec;
  points: readonly ChartPoint[];
  scales: Scales;
}): JSX.Element {
  return (
    <path
      data-series={spec.id}
      d={pathOf(points, scales)}
      fill="none"
      stroke={spec.color}
      strokeWidth={spec.width ?? LINE_WIDTH}
      strokeDasharray={spec.dash}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

/** Closed, softly filled polygons (the hyperbolic zone). */
export function Regions({
  id,
  regions,
  color,
  scales,
}: {
  id: string;
  regions: readonly ChartPoint[][];
  color: string;
  scales: Scales;
}): JSX.Element {
  return (
    <g data-region={id} fill={color} fillOpacity={REGION_OPACITY} stroke="none">
      {regions.map((region) => (
        <path key={region[0].x} d={`${pathOf(region, scales)} Z`} />
      ))}
    </g>
  );
}

/** Hairline gridlines at the x ticks and the y ticks of one panel. */
export function Grid({
  area,
  xTicks,
  yTicks,
  scales,
}: {
  area: PlotArea;
  xTicks: readonly AxisTick[];
  yTicks: readonly number[];
  scales: Scales;
}): JSX.Element {
  return (
    <g data-grid="" stroke={GRID_COLOR} strokeWidth={1} shapeRendering="crispEdges">
      {xTicks.map((tick) => (
        <line
          key={`gx-${tick.x}`}
          x1={scales.x.toPx(tick.x)}
          x2={scales.x.toPx(tick.x)}
          y1={area.top}
          y2={area.bottom}
        />
      ))}
      {yTicks.map((value) => (
        <line
          key={`gy-${value}`}
          x1={area.left}
          x2={area.right}
          y1={scales.y.toPx(value)}
          y2={scales.y.toPx(value)}
        />
      ))}
    </g>
  );
}

/** The left baseline with outward ticks, values and a rotated "label (unit)" title. */
export function YAxis({
  area,
  ticks,
  scale,
  title,
}: {
  area: PlotArea;
  ticks: readonly number[];
  scale: Scale;
  title: string;
}): JSX.Element {
  const middle = (area.top + area.bottom) / 2;
  return (
    <g fontFamily={TICK_FONT_FAMILY}>
      <g stroke={AXIS_COLOR} strokeWidth={1} shapeRendering="crispEdges">
        <line x1={area.left} x2={area.left} y1={area.top} y2={area.bottom} />
        {ticks.map((value) => (
          <line
            key={value}
            x1={area.left - TICK_LENGTH}
            x2={area.left}
            y1={scale.toPx(value)}
            y2={scale.toPx(value)}
          />
        ))}
      </g>
      <g fill={TICK_COLOR} fontSize={FONT_SIZE} className="tabular-nums" textAnchor="end">
        {ticks.map((value) => (
          <text key={value} x={area.left - Y_LABEL_OFFSET} y={scale.toPx(value)} dy="0.35em">
            {formatNumber(value, { precision: 0 })}
          </text>
        ))}
      </g>
      <text
        x={Y_TITLE_X}
        y={middle}
        fill={TEXT_COLOR}
        fontSize={TITLE_SIZE}
        textAnchor="middle"
        transform={`rotate(-90 ${Y_TITLE_X} ${middle})`}
      >
        {title}
      </text>
    </g>
  );
}

/**
 * The bottom baseline of a panel with a tick at every AxisTick; with `title`, the labelled ticks
 * get their values (kept inside the viewBox) and the axis its title.
 */
export function XAxis({
  area,
  ticks,
  scale,
  title,
  viewWidth,
}: {
  area: PlotArea;
  ticks: readonly AxisTick[];
  scale: Scale;
  title?: string;
  viewWidth: number;
}): JSX.Element {
  return (
    <g fontFamily={TICK_FONT_FAMILY}>
      <g stroke={AXIS_COLOR} strokeWidth={1} shapeRendering="crispEdges">
        <line x1={area.left} x2={area.right} y1={area.bottom} y2={area.bottom} />
        {ticks.map((tick) => (
          <line
            key={tick.x}
            x1={scale.toPx(tick.x)}
            x2={scale.toPx(tick.x)}
            y1={area.bottom}
            y2={area.bottom + (tick.label === undefined ? TICK_LENGTH / 2 : TICK_LENGTH)}
          />
        ))}
      </g>
      {title ? (
        <>
          <g fill={TICK_COLOR} fontSize={FONT_SIZE} className="tabular-nums" textAnchor="middle">
            {ticks.flatMap((tick) =>
              tick.label === undefined
                ? []
                : [
                    <text
                      key={tick.x}
                      data-tick-label=""
                      x={fitCentre(
                        scale.toPx(tick.x),
                        monoTextWidth(tick.label, FONT_SIZE),
                        0,
                        viewWidth,
                      )}
                      y={area.bottom + X_LABEL_OFFSET}
                    >
                      {tick.label}
                    </text>,
                  ],
            )}
          </g>
          <text
            x={(area.left + area.right) / 2}
            y={area.bottom + X_TITLE_OFFSET}
            fill={TEXT_COLOR}
            fontSize={TITLE_SIZE}
            textAnchor="middle"
          >
            {title}
          </text>
        </>
      ) : null}
    </g>
  );
}

/** One line of the legend: a short stroke (or swatch) in the line's color and dash. */
function LegendKey({ spec }: { spec: LineSpec }): JSX.Element {
  return (
    <svg aria-hidden="true" width={LEGEND_KEY_WIDTH} height="10" className="shrink-0">
      {spec.isArea ? (
        <rect
          x="1"
          y="0"
          width={LEGEND_KEY_WIDTH - 2}
          height="10"
          fill={spec.color}
          fillOpacity={REGION_OPACITY * 2}
        />
      ) : (
        <line
          x1="1"
          x2={LEGEND_KEY_WIDTH - 1}
          y1="5"
          y2="5"
          stroke={spec.color}
          strokeWidth={spec.width ?? LINE_WIDTH}
          strokeDasharray={spec.dash}
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

export function Legend({ specs }: { specs: readonly LineSpec[] }): JSX.Element {
  return (
    <ul aria-label="Leyenda" className="mb-2 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-sm">
      {specs.map((spec) => (
        <li key={spec.id} className="flex items-center gap-2 text-fg">
          <LegendKey spec={spec} />
          {spec.label}
        </li>
      ))}
    </ul>
  );
}

export interface EncounterLabel extends PlacedLabel {
  lines: [string, string];
  color: string;
}

/**
 * The encounter labels in rows above the plot (row 0 lowest), each with a dot in the planet's
 * color under it and a dashed guide in that color down through both panels at closest approach.
 */
export function EncounterLabels({
  labels,
  top,
  rows,
  rowHeight,
  guideBottom,
}: {
  labels: readonly EncounterLabel[];
  top: number;
  rows: number;
  rowHeight: number;
  guideBottom: number;
}): JSX.Element {
  return (
    <g>
      {labels.map((label) => {
        const rowTop = top + (rows - 1 - label.row) * rowHeight;
        const dotY = rowTop + 2 * LINE_HEIGHT + DOT_RADIUS + 2;
        const centre = label.left + label.width / 2;
        return (
          <g
            key={label.id}
            data-encounter={label.id}
            data-x={label.x}
            data-left={label.left}
            data-width={label.width}
            data-row={label.row}
          >
            <line
              data-guide=""
              x1={label.x}
              x2={label.x}
              y1={dotY}
              y2={guideBottom}
              stroke={label.color}
              strokeWidth={THIN_LINE_WIDTH}
              strokeDasharray={DASH_PATTERN}
            />
            <circle
              cx={label.x}
              cy={dotY}
              r={DOT_RADIUS}
              fill={label.color}
              stroke={SURFACE_COLOR}
              strokeWidth={1.5}
            />
            <text
              x={centre}
              y={rowTop + LINE_HEIGHT - 3}
              textAnchor="middle"
              fontWeight={600}
              {...haloText}
            >
              {label.lines[0]}
            </text>
            <text x={centre} y={rowTop + 2 * LINE_HEIGHT - 3} textAnchor="middle" {...haloText}>
              {label.lines[1]}
            </text>
          </g>
        );
      })}
    </g>
  );
}

/** A haloed note at (x, y); `children` is plain text. */
export function Note({
  x,
  y,
  anchor = 'start',
  children,
}: {
  x: number;
  y: number;
  anchor?: 'start' | 'middle' | 'end';
  children: ReactNode;
}): JSX.Element {
  return (
    <text x={x} y={y} textAnchor={anchor} {...haloText}>
      {children}
    </text>
  );
}
