import {
  CartesianGrid,
  Label,
  Legend,
  Line,
  LineChart as RechartsLineChart,
  ReferenceArea,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatNumber } from '../../lib/format';
import ChartFrame from './ChartFrame';
import ChartTooltip from './ChartTooltip';
import { tickPrecision, trimTrailingZeros } from './chartScale';
import {
  ACTIVE_DOT_RADIUS,
  AXIS_COLOR,
  CHART_COLORS,
  DASH_PATTERN,
  DEFAULT_ASPECT_RATIO,
  GRID_COLOR,
  LINE_WIDTH,
  MAX_CHART_WIDTH,
  SURFACE_COLOR,
  TEXT_COLOR,
  TEXT_FONT_FAMILY,
  TICK_COLOR,
  TICK_FONT_FAMILY,
  TICK_FONT_SIZE,
} from './chartTheme';

export interface AxisSpec {
  label: string;
  unit: string;
  domain?: [number, number];
}

export interface SeriesSpec {
  key: string;
  name: string;
  color?: string;
  dashed?: boolean;
}

export interface ReferenceBand {
  from: number;
  to: number;
  label: string;
}

export interface LineChartProps {
  title: string;
  data: Record<string, number>[];
  xKey: string;
  xAxis: AxisSpec;
  yAxis: AxisSpec;
  series: SeriesSpec[];
  bands?: ReferenceBand[];
  aspectRatio?: number;
}

const MARGIN = { top: 8, right: 16, bottom: 8, left: 4 } as const;
const Y_AXIS_WIDTH = 64;
const X_AXIS_HEIGHT = 48;
const MIN_SERIES_FOR_LEGEND = 2;
/** On narrow screens aspectRatio alone leaves too little plot; the legend needs room too. */
const MIN_PLOT_HEIGHT = 260;
const LEGEND_ALLOWANCE = 70;

function assertUnits({ xAxis, yAxis }: Pick<LineChartProps, 'xAxis' | 'yAxis'>): void {
  if (xAxis.unit.trim() === '') throw new Error('LineChart: el eje x necesita unidad');
  if (yAxis.unit.trim() === '') throw new Error('LineChart: el eje y necesita unidad');
}

function axisTitle({ label, unit }: AxisSpec): string {
  return `${label} (${unit})`;
}

/** Numeric extent of an axis: its explicit domain, else the range of the plotted values. */
function extentOf(values: number[], domain?: [number, number]): [number, number] {
  if (domain) return domain;
  const finite = values.filter(Number.isFinite);
  return finite.length === 0 ? [0, 0] : [Math.min(...finite), Math.max(...finite)];
}

function tickFormatter(extent: [number, number]): (value: number) => string {
  const precision = tickPrecision(extent[1] - extent[0]);
  return (value) => trimTrailingZeros(formatNumber(value, { precision }));
}

const TICK_STYLE = {
  fill: TICK_COLOR,
  fontFamily: TICK_FONT_FAMILY,
  fontSize: TICK_FONT_SIZE,
} as const;

const AXIS_TITLE_STYLE = {
  fill: TEXT_COLOR,
  fontFamily: TEXT_FONT_FAMILY,
  fontSize: TICK_FONT_SIZE + 1,
} as const;

export default function LineChart({
  title,
  data,
  xKey,
  xAxis,
  yAxis,
  series,
  bands = [],
  aspectRatio = DEFAULT_ASPECT_RATIO,
}: LineChartProps) {
  assertUnits({ xAxis, yAxis });

  if (data.length === 0) {
    return (
      <ChartFrame title={title}>
        <p data-testid="chart-empty" className="py-10 text-center text-sm text-fg-muted">
          Sin datos para graficar
        </p>
      </ChartFrame>
    );
  }

  const xExtent = extentOf(
    data.map((row) => row[xKey]),
    xAxis.domain,
  );
  const yExtent = extentOf(
    data.flatMap((row) => series.map(({ key }) => row[key])),
    yAxis.domain,
  );

  const hasLegend = series.length >= MIN_SERIES_FOR_LEGEND;
  const minHeight = MIN_PLOT_HEIGHT + X_AXIS_HEIGHT + (hasLegend ? LEGEND_ALLOWANCE : 0);
  // Container query units keep the chart from widening its parent (aspect-ratio + min-height would).
  const plotHeight = `max(${minHeight}px, calc(min(100cqw, ${MAX_CHART_WIDTH}px) / ${aspectRatio}))`;

  return (
    <ChartFrame title={title}>
      <div className="@container w-full min-w-0">
        <RechartsLineChart
          responsive
          style={{ width: '100%', maxWidth: MAX_CHART_WIDTH, height: plotHeight }}
          data={data}
          margin={MARGIN}
          accessibilityLayer
        >
          <CartesianGrid stroke={GRID_COLOR} strokeWidth={1} />
          <XAxis
            dataKey={xKey}
            type="number"
            niceTicks="snap125"
            domain={xAxis.domain ?? ['dataMin', 'dataMax']}
            height={X_AXIS_HEIGHT}
            tick={TICK_STYLE}
            tickFormatter={tickFormatter(xExtent)}
            stroke={AXIS_COLOR}
          >
            <Label
              value={axisTitle(xAxis)}
              position="insideBottom"
              offset={4}
              {...AXIS_TITLE_STYLE}
            />
          </XAxis>
          <YAxis
            type="number"
            niceTicks="snap125"
            domain={yAxis.domain ?? ['auto', 'auto']}
            width={Y_AXIS_WIDTH}
            tick={TICK_STYLE}
            tickFormatter={tickFormatter(yExtent)}
            stroke={AXIS_COLOR}
          >
            <Label
              value={axisTitle(yAxis)}
              angle={-90}
              position="insideLeft"
              offset={4}
              style={{ textAnchor: 'middle' }}
              {...AXIS_TITLE_STYLE}
            />
          </YAxis>
          {bands.map((band) => (
            <ReferenceArea
              key={`${band.from}-${band.to}-${band.label}`}
              x1={band.from}
              x2={band.to}
              fill={TICK_COLOR}
              fillOpacity={0.12}
              stroke="none"
            >
              <Label
                value={band.label}
                position="insideTop"
                fill={TEXT_COLOR}
                fontSize={TICK_FONT_SIZE}
              />
            </ReferenceArea>
          ))}
          <Tooltip
            cursor={{ stroke: TICK_COLOR, strokeWidth: 1 }}
            isAnimationActive={false}
            content={({ active, label, payload }) => (
              <ChartTooltip
                xLabel={xAxis.label}
                xUnit={xAxis.unit}
                yUnit={yAxis.unit}
                active={active}
                label={label}
                payload={payload}
              />
            )}
          />
          {hasLegend ? (
            <Legend
              position="top"
              iconType="plainline"
              formatter={(value: string) => <span className="text-sm text-fg">{value}</span>}
            />
          ) : null}
          {series.map((spec, index) => {
            const color = spec.color ?? CHART_COLORS[index % CHART_COLORS.length];
            return (
              <Line
                key={spec.key}
                dataKey={spec.key}
                name={spec.name}
                type="monotone"
                stroke={color}
                strokeWidth={LINE_WIDTH}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={spec.dashed ? DASH_PATTERN : undefined}
                dot={false}
                activeDot={{
                  r: ACTIVE_DOT_RADIUS,
                  fill: color,
                  stroke: SURFACE_COLOR,
                  strokeWidth: 2,
                }}
                isAnimationActive={false}
              />
            );
          })}
        </RechartsLineChart>
      </div>
    </ChartFrame>
  );
}
