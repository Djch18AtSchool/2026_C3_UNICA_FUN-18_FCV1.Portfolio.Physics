/**
 * Tema 13, step 3: where the pressure goes on the way to the farthest server. One row per group
 * of table 13.4 (GF's fig. 2 groups): my loss as a bar, GF's published value as a point, on one kPa
 * axis. A group I do not model says so where its bar would be; a group GF has no row for has no
 * point. The note under it gives the share of the plates and the small couplings.
 */
import { useId, useMemo, type JSX } from 'react';
import { formatNumber } from '../../../lib/format';
import { mathTextToString } from '../../../lib/mathNotation';
import ChartFrame from '../../charts/ChartFrame';
import { SURFACE_COLOR, TEXT_COLOR, TICK_COLOR, TICK_FONT_SIZE } from '../../charts/chartTheme';
import {
  emphasisProps,
  SeriesHighlightContext,
  SeriesLegend,
  useSeriesEmphasis,
  useSeriesHighlight,
} from '../../charts/seriesHighlight';
import { useElementWidth } from '../../hooks/useElementWidth';
import InlineMath from '../../lab/InlineMath';
import MathText from '../../lab/MathText';
import { linearScale } from '../../lab/plotScales';
import {
  lossChartData,
  MODEL_LOSS_COLOR,
  PUBLISHED_LOSS_COLOR,
  type LossBar,
  type LossChartData,
} from './coolingCharts';
import {
  DRAWING_CONTAINER,
  FALLBACK_WIDTH,
  heightReserve,
  horizontalFrame,
  Panel,
  stepTicks,
  Swatch,
  type Scales,
} from './coolingPlotKit';

const TITLE = 'Pérdidas hasta el servidor más lejano, por grupo';
const X_TITLE = 'Pérdida de presión (kPa)';
const NOT_MODELLED = 'sin modelar';
const LEGEND = [
  { id: 'calculo', label: 'Este cálculo (barras)' },
  { id: 'gf', label: 'GF, publicado con Sinetz (puntos)' },
] as const;
/** A row: the group's name on one line, its bar under it. */
const ROW = { label: 14, bar: 12, gap: 14 } as const;
const ROW_HEIGHT = ROW.label + 4 + ROW.bar + ROW.gap;
const TOP = 8;
const AXIS = { wide: 58, compact: 50 } as const;
/** Bars start near the edge: their names sit above them, so no y labels need a margin. */
const EDGE = { left: 12, wide: 28, compact: 14 } as const;
const X_TICK_INTERVALS = 5;
const DOT_RADIUS = 5;
const DOT_RING = 2;
const BAR_OPACITY = 0.8;
/** «sin modelar» starts past GF's point, so the point never covers it. */
const NOTE_CLEARANCE = DOT_RADIUS + 6;
const PERCENT = 100;

const heights = (rows: number) => ({
  wide: TOP + rows * ROW_HEIGHT + AXIS.wide,
  compact: TOP + rows * ROW_HEIGHT + AXIS.compact,
});

function geometry(width: number, data: LossChartData) {
  const { compact } = horizontalFrame(width, 0);
  const frame = {
    width,
    compact,
    left: EDGE.left,
    right: width - (compact ? EDGE.compact : EDGE.wide),
  };
  const bottom = TOP + data.rows.length * ROW_HEIGHT;
  const x = linearScale({ min: 0, max: data.max }, [frame.left, frame.right]);
  // Rows are laid out by index; the y scale only serves the axes, which draw no y ticks.
  const y = linearScale({ min: 0, max: 1 }, [bottom, TOP]);
  return {
    frame,
    area: { left: frame.left, right: frame.right, top: TOP, bottom },
    scales: { x, y },
    ticks: { x: stepTicks({ min: 0, max: data.max }, X_TICK_INTERVALS), y: [] },
    height: compact ? heights(data.rows.length).compact : heights(data.rows.length).wide,
  };
}

/** One group: its name, my bar (or «sin modelar») and GF's point, at row `index`. */
function LossRow({ row, index, scales }: { row: LossBar; index: number; scales: Scales }) {
  const top = TOP + index * ROW_HEIGHT;
  const barTop = top + ROW.label + 4;
  const middle = barTop + ROW.bar / 2;
  const zero = scales.x.toPx(0);
  const barEmphasis = emphasisProps(useSeriesEmphasis('calculo'));
  const dotEmphasis = emphasisProps(useSeriesEmphasis('gf'), DOT_RING);
  return (
    <g data-row={row.id}>
      <MathText
        source={row.label}
        x={zero}
        y={top + ROW.label - 2}
        fontSize={TICK_FONT_SIZE}
        fill={TEXT_COLOR}
      />
      {row.computed === null ? (
        <MathText
          source={NOT_MODELLED}
          x={row.published === null ? zero + 2 : scales.x.toPx(row.published) + NOTE_CLEARANCE}
          y={middle + TICK_FONT_SIZE / 3}
          fontSize={TICK_FONT_SIZE}
          fill={TICK_COLOR}
        />
      ) : (
        <rect
          data-series="calculo"
          data-group={row.id}
          x={zero}
          y={barTop}
          width={scales.x.toPx(row.computed) - zero}
          height={ROW.bar}
          fill={MODEL_LOSS_COLOR}
          fillOpacity={BAR_OPACITY}
          {...barEmphasis}
        />
      )}
      {row.published === null ? null : (
        <circle
          data-series="gf"
          data-group={row.id}
          cx={scales.x.toPx(row.published)}
          cy={middle}
          r={DOT_RADIUS}
          fill={PUBLISHED_LOSS_COLOR}
          stroke={SURFACE_COLOR}
          strokeWidth={DOT_RING}
          {...dotEmphasis}
        />
      )}
    </g>
  );
}

const kpa = (value: number | null) =>
  value === null ? NOT_MODELLED : formatNumber(value, { precision: 1, unit: 'kPa' });
const percent = (share: number) => formatNumber(share * PERCENT, { precision: 0, unit: '%' });

function spoken(data: LossChartData): string {
  const rows = data.rows
    .map((row) => {
      const gf = row.published === null ? 'GF no la separa' : `GF ${kpa(row.published)}`;
      return `${row.label}: este cálculo ${kpa(row.computed)}, ${gf}`;
    })
    .join('; ');
  return mathTextToString(`Pérdidas hasta el servidor más lejano, por grupo. ${rows}.`);
}

/** The note under the chart: what share the server's plates and couplings take, mine and GF's. */
export function lossNote(data: LossChartData): string {
  return `Las placas frías y los conectores UQD04 se llevan el ${percent(data.serverShare.computed)} de mi pérdida y el ${percent(data.serverShare.published)} de la de GF.`;
}

export default function LossBreakdownFigure(): JSX.Element {
  const [ref, width, isMeasured] = useElementWidth<HTMLDivElement>(FALLBACK_WIDTH);
  const clipId = `perdidas-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const data = useMemo(() => lossChartData(), []);
  const highlight = useSeriesHighlight(LEGEND.map(({ id }) => id));
  const layout = geometry(width, data);
  const reserve = heightReserve(heights(data.rows.length), isMeasured);
  return (
    <ChartFrame title={TITLE} testId="loss-breakdown-figure">
      <SeriesHighlightContext value={highlight.highlighted}>
        <SeriesLegend
          entries={[
            {
              id: 'calculo',
              label: LEGEND[0].label,
              swatch: (
                <svg aria-hidden="true" width={18} height={10} className="shrink-0">
                  <rect width={18} height={10} fill={MODEL_LOSS_COLOR} fillOpacity={BAR_OPACITY} />
                </svg>
              ),
            },
            {
              id: 'gf',
              label: LEGEND[1].label,
              swatch: <Swatch color={PUBLISHED_LOSS_COLOR} shape="dot" />,
            },
          ]}
          highlight={highlight}
        />
        <div ref={ref} className={DRAWING_CONTAINER}>
          <svg
            role="img"
            aria-label={spoken(data)}
            viewBox={`0 0 ${layout.frame.width} ${layout.height}`}
            width="100%"
            className={reserve.className}
            style={reserve.style}
          >
            <Panel
              clipId={clipId}
              area={layout.area}
              scales={layout.scales}
              ticks={layout.ticks}
              xTitle={X_TITLE}
              yTitle=""
              frame={layout.frame}
            >
              {data.rows.map((row, index) => (
                <LossRow key={row.id} row={row} index={index} scales={layout.scales} />
              ))}
            </Panel>
          </svg>
        </div>
      </SeriesHighlightContext>
      <p data-testid="loss-breakdown-note" className="m-0 mt-3 text-sm">
        <InlineMath text={lossNote(data)} />
      </p>
    </ChartFrame>
  );
}
