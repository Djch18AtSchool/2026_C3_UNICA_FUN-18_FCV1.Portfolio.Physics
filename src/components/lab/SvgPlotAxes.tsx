import { formatNumber } from '../../lib/format';
import {
  AXIS_COLOR,
  GRID_COLOR,
  TEXT_COLOR,
  TICK_COLOR,
  TICK_FONT_FAMILY,
} from '../charts/chartTheme';
import { trimTrailingZeros } from '../charts/chartScale';
import { fitCentre, monoTextWidth, niceTicks, tickDecimals, type Scale } from './plotScales';
import type { PlotArea } from './SvgPlotCursor';

/** Viewbox pixels between ticks: about six on a 720-wide x axis, five on a 375-tall y axis. */
const X_TICK_SPACING = 100;
const Y_TICK_SPACING = 75;
const MIN_TICK_INTERVALS = 2;
const TICK_LENGTH = 5;
const X_TICK_LABEL_OFFSET = 20;
const Y_TICK_LABEL_OFFSET = 9;
const X_TITLE_OFFSET = 46;
const Y_TITLE_X = 18;
/** Compact layout (narrow plots): x title closer to its ticks, y title horizontal above the axis. */
const COMPACT_X_TITLE_OFFSET = 40;
const COMPACT_Y_TITLE_X = 2;
const COMPACT_Y_TITLE_RISE = 10;

export interface AxisTicks {
  x: number[];
  y: number[];
}

function ticksFor(scale: Scale, spacing: number): number[] {
  const length = Math.abs(scale.range[1] - scale.range[0]);
  const intervals = Math.max(MIN_TICK_INTERVALS, Math.round(length / spacing));
  return niceTicks(scale.domain, intervals);
}

export function axisTicks(x: Scale, y: Scale): AxisTicks {
  return { x: ticksFor(x, X_TICK_SPACING), y: ticksFor(y, Y_TICK_SPACING) };
}

/** Tick values in Spanish notation with the decimals their step needs ("2,5", "5", "0,25"). */
function tickFormatter(ticks: number[]): (value: number) => string {
  const step = ticks.length > 1 ? ticks[1] - ticks[0] : 1;
  const precision = tickDecimals(step);
  return (value) => trimTrailingZeros(formatNumber(value, { precision }));
}

/** Characters of the longest y tick label, as PlotAxes prints it. */
export function yTickLabelChars(ticks: number[]): number {
  const format = tickFormatter(ticks);
  return Math.max(0, ...ticks.map((value) => format(value).length));
}

interface GridProps {
  ticks: AxisTicks;
  x: Scale;
  y: Scale;
  area: PlotArea;
}

/** Hairline gridlines one step off the surface, at every tick. */
export function PlotGrid({ ticks, x, y, area }: GridProps) {
  return (
    <g data-grid="" stroke={GRID_COLOR} strokeWidth={1} shapeRendering="crispEdges">
      {ticks.x.map((value) => (
        <line
          key={`gx-${value}`}
          x1={x.toPx(value)}
          x2={x.toPx(value)}
          y1={area.top}
          y2={area.bottom}
        />
      ))}
      {ticks.y.map((value) => (
        <line
          key={`gy-${value}`}
          x1={area.left}
          x2={area.right}
          y1={y.toPx(value)}
          y2={y.toPx(value)}
        />
      ))}
    </g>
  );
}

interface AxesProps extends GridProps {
  xTitle: string;
  yTitle: string;
  tickFontSize: number;
  titleFontSize: number;
  /** Narrow plots: the y title goes horizontally above the axis instead of in a rotated band. */
  compact?: boolean;
  /** Extra rise of the compact y title above the plot area (room for a cursor knob). */
  compactTitleLift?: number;
  /** viewBox width: an x tick label that would cross its edge is shifted inside. */
  viewWidth?: number;
}

/** Baselines on the left and bottom of the plot, outward ticks, values and "label (unit)" titles. */
export function PlotAxes({
  ticks,
  x,
  y,
  area,
  xTitle,
  yTitle,
  tickFontSize,
  titleFontSize,
  compact = false,
  compactTitleLift = 0,
  viewWidth = Infinity,
}: AxesProps) {
  const formatX = tickFormatter(ticks.x);
  const formatY = tickFormatter(ticks.y);
  const middleY = (area.top + area.bottom) / 2;
  return (
    <g fontFamily={TICK_FONT_FAMILY}>
      <g stroke={AXIS_COLOR} strokeWidth={1} shapeRendering="crispEdges">
        <line x1={area.left} x2={area.right} y1={area.bottom} y2={area.bottom} />
        <line x1={area.left} x2={area.left} y1={area.top} y2={area.bottom} />
        {ticks.x.map((value) => (
          <line
            key={`tx-${value}`}
            x1={x.toPx(value)}
            x2={x.toPx(value)}
            y1={area.bottom}
            y2={area.bottom + TICK_LENGTH}
          />
        ))}
        {ticks.y.map((value) => (
          <line
            key={`ty-${value}`}
            x1={area.left - TICK_LENGTH}
            x2={area.left}
            y1={y.toPx(value)}
            y2={y.toPx(value)}
          />
        ))}
      </g>
      <g fill={TICK_COLOR} fontSize={tickFontSize} className="tabular-nums">
        {ticks.x.map((value) => (
          <text
            key={`lx-${value}`}
            x={fitCentre(
              x.toPx(value),
              monoTextWidth(formatX(value), tickFontSize),
              -Infinity,
              viewWidth,
            )}
            y={area.bottom + X_TICK_LABEL_OFFSET}
            textAnchor="middle"
          >
            {formatX(value)}
          </text>
        ))}
        {ticks.y.map((value) => (
          <text
            key={`ly-${value}`}
            x={area.left - Y_TICK_LABEL_OFFSET}
            y={y.toPx(value)}
            dy="0.35em"
            textAnchor="end"
          >
            {formatY(value)}
          </text>
        ))}
      </g>
      <g fill={TEXT_COLOR} fontSize={titleFontSize}>
        <text
          x={(area.left + area.right) / 2}
          y={area.bottom + (compact ? COMPACT_X_TITLE_OFFSET : X_TITLE_OFFSET)}
          textAnchor="middle"
        >
          {xTitle}
        </text>
        {compact ? (
          <text
            x={COMPACT_Y_TITLE_X}
            y={area.top - COMPACT_Y_TITLE_RISE - compactTitleLift}
            textAnchor="start"
          >
            {yTitle}
          </text>
        ) : (
          <text
            x={Y_TITLE_X}
            y={middleY}
            textAnchor="middle"
            transform={`rotate(-90 ${Y_TITLE_X} ${middleY})`}
          >
            {yTitle}
          </text>
        )}
      </g>
    </g>
  );
}
