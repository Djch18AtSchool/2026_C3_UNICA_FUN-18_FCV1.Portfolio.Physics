/**
 * The instant of the Tema 1 profile charts: a dashed vertical line at t inside each plot (drawn
 * in SvgPlot's overlay layer, so the memoised plots never redraw) and a text row under the plot
 * with every series read at t, interpolated like the laboratory's readouts. The line takes t from
 * MarkerTimeContext, which crosses the memo boundary; the row gets it as a prop.
 */
import { createContext, useContext, type JSX } from 'react';
import { formatNumber } from '../../../lib/format';
import {
  CHART_COLORS,
  SURFACE_COLOR,
  TEXT_COLOR,
  TICK_FONT_FAMILY,
  TICK_FONT_SIZE,
} from '../../charts/chartTheme';
import { monoTextWidth, type Scale } from '../../lab/plotScales';
import type { PlotSeries } from '../../lab/SvgPlot';
import { useGlobalSettings } from '../../lab/useGlobalSettings';
import { interpolateAt } from './routeSeries';

/** The laboratory's instant (s), read by every marker line; the plots above it never see it change. */
export const MarkerTimeContext = createContext(0);

/** What a reading draws on: the curves of its chart and their values at every sample. */
export interface MarkerSource {
  series: PlotSeries[];
  /** Series by series, the quantity at each sample (not decimated), in the chart's unit. */
  values: readonly (readonly number[])[];
  /** Series by series, the short name printed in the reading (the legend keeps the long one). */
  readingLabels: readonly string[];
  unit: string;
}

const LINE_DASH = '4 3';
const LINE_WIDTH = 1.5;
/** The t label: beside the line, on the band labels' line, with the same halo as theirs. */
const LABEL_GAP = 8;
const LABEL_BASELINE = 16;
const HALO_WIDTH = 4;
const FONT_SIZE = TICK_FONT_SIZE;
const PATH_DECIMALS = 2;
const SWATCH_WIDTH = 14;
const SWATCH_HEIGHT = 4;

const px = (value: number) => Number(value.toFixed(PATH_DECIMALS));

/** t held inside the sampled flight, so the reading never runs past its last sample. */
export function clampTime(times: readonly number[], t: number): number {
  return Math.min(times[times.length - 1], Math.max(times[0], t));
}

const timeText = (t: number, decimals: number) =>
  `t = ${formatNumber(t, { precision: decimals, unit: 's' })}`;

export interface ProfileMarkerProps {
  /** The samples' times (s), ascending. */
  times: readonly number[];
  /** Decimals of the t label: those of the timeline's step. */
  timeDecimals: number;
  x: Scale;
  y: Scale;
}

/**
 * The dashed line at t with its short label. The group is translated to the line's x, so a frame
 * changes one transform and the label's digits; the label flips left of the line near the right
 * edge of the plot area.
 */
export function ProfileMarker({ times, timeDecimals, x, y }: ProfileMarkerProps): JSX.Element {
  const t = clampTime(times, useContext(MarkerTimeContext));
  const [, right] = x.range;
  const [bottom, top] = y.range;
  const cx = x.toPx(t);
  const label = timeText(t, timeDecimals);
  const isLeft = cx + LABEL_GAP + monoTextWidth(label, FONT_SIZE) > right;
  return (
    <g
      data-profile-marker=""
      data-marker-t={t}
      transform={`translate(${px(cx)} 0)`}
      className="pointer-events-none"
    >
      <line
        x1={0}
        x2={0}
        y1={px(top)}
        y2={px(bottom)}
        stroke={TEXT_COLOR}
        strokeWidth={LINE_WIDTH}
        strokeDasharray={LINE_DASH}
      />
      <text
        x={isLeft ? -LABEL_GAP : LABEL_GAP}
        y={px(top + LABEL_BASELINE)}
        textAnchor={isLeft ? 'end' : 'start'}
        fill={TEXT_COLOR}
        fontFamily={TICK_FONT_FAMILY}
        fontSize={FONT_SIZE}
        stroke={SURFACE_COLOR}
        strokeWidth={HALO_WIDTH}
        paintOrder="stroke"
      >
        {label}
      </text>
    </g>
  );
}

export interface ProfileReadingProps {
  source: MarkerSource;
  times: readonly number[];
  t: number;
  timeDecimals: number;
}

/**
 * The values of a chart's series at t, interpolated between samples as the laboratory does: a
 * definition list with t first and then, per series, its colour swatch, short name and value with
 * unit (global decimals). Plain text for assistive technology, no live region (the laboratory's
 * announcer already speaks); it wraps on narrow screens.
 */
export function ProfileReading({
  source,
  times,
  t,
  timeDecimals,
}: ProfileReadingProps): JSX.Element {
  const { decimals } = useGlobalSettings();
  const at = clampTime(times, t);
  return (
    <dl
      data-profile-reading=""
      className="m-0 flex flex-wrap items-baseline gap-x-4 gap-y-1 px-1 text-sm tabular-nums"
    >
      {/* The bare spaces are not laid out by the flex boxes but keep the text content readable. */}
      <div className="flex items-baseline gap-1.5">
        <dt className="text-fg-muted">t</dt>{' '}
        <dd className="m-0 font-mono">
          {formatNumber(at, { precision: timeDecimals, unit: 's' })}
        </dd>
      </div>
      {source.series.map((series, k) => (
        <div key={series.id} className="flex items-baseline gap-1.5">
          <svg aria-hidden="true" width={SWATCH_WIDTH} height={SWATCH_HEIGHT} className="shrink-0">
            <line
              x1="0"
              x2={SWATCH_WIDTH}
              y1={SWATCH_HEIGHT / 2}
              y2={SWATCH_HEIGHT / 2}
              stroke={series.color ?? CHART_COLORS[k % CHART_COLORS.length]}
              strokeWidth={2}
            />
          </svg>
          <dt className="text-fg-muted">{source.readingLabels[k]}</dt>{' '}
          <dd className="m-0 font-mono font-medium">
            {formatNumber(interpolateAt(times, source.values[k], at), {
              precision: decimals,
              unit: source.unit,
            })}
          </dd>
        </div>
      ))}
    </dl>
  );
}
