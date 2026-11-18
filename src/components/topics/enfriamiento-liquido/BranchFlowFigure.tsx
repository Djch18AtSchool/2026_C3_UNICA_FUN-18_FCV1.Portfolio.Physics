/**
 * Tema 13, step 4: the flow each server of the 24-server RD109 rack gets (13.4), with and
 * without its cold plate, in direct and in reverse return; under it, the bench of NVIDIA and UT
 * Arlington (Shahi et al., 2023): 6 ports without cold plates, their flow network model as a line
 * and their measurement as points. Colour says plate or no plate; the dash, the return layout.
 */
import { useId, useMemo, type JSX } from 'react';
import { formatNumber } from '../../../lib/format';
import { mathTextToString } from '../../../lib/mathNotation';
import { SHAHI_2023_PORT_FLOWS } from '../../../lib/data/liquidCooling';
import { M3S_PER_LPM } from '../../../lib/physics/hydraulics';
import ChartFrame from '../../charts/ChartFrame';
import {
  SeriesHighlightContext,
  SeriesLegend,
  useSeriesHighlight,
} from '../../charts/seriesHighlight';
import { useElementWidth } from '../../hooks/useElementWidth';
import { linearScale, padDomain, type Domain } from '../../lab/plotScales';
import { yTickLabelChars } from '../../lab/SvgPlotAxes';
import { branchFlowSeries, NO_PLATE_COLOR, shahiSeries, type BranchSeries } from './coolingCharts';
import {
  DRAWING_CONTAINER,
  FALLBACK_WIDTH,
  heightReserve,
  horizontalFrame,
  Panel,
  SeriesDots,
  SeriesLine,
  stepTicks,
  Swatch,
} from './coolingPlotKit';
import { REFERENCE, type Point } from './coolingPlots';

const TITLE = 'Caudal que recibe cada servidor del rack';
const X_TITLE = 'Puerto $i$ (1 = abajo)';
const Y_TITLE = 'Caudal $Q_i$ (L/min)';
const LAYOUT = {
  wide: { top: 12, plot: 200, axis: 58 },
  compact: { top: 28, plot: 170, axis: 50 },
} as const;
const HEIGHTS = {
  wide: LAYOUT.wide.top + LAYOUT.wide.plot + LAYOUT.wide.axis,
  compact: LAYOUT.compact.top + LAYOUT.compact.plot + LAYOUT.compact.axis,
};
const MODEL_PAD = 0.1;
const BENCH_PAD = 0.15;
/** Half a port of room at each end of the port axis. */
const PORT_PAD = 0.5;
const Y_TICK_INTERVALS = 4;
/** Up to this many ports, a tick at each; more, a tick every few ports (4 wide, 6 on a phone). */
const EVERY_PORT_UP_TO = 8;
const PORT_STEP = { wide: 4, compact: 6 } as const;

/** Whole ports only: port 1 and every PORT_STEP-th port, or all of them on a short manifold. */
function portTicks(ports: number, compact: boolean): number[] {
  if (ports <= EVERY_PORT_UP_TO) return Array.from({ length: ports }, (_, i) => i + 1);
  const step = compact ? PORT_STEP.compact : PORT_STEP.wide;
  return [1, ...Array.from({ length: Math.floor(ports / step) }, (_, i) => (i + 1) * step)];
}
const SHAHI_FNM = { id: 'shahi-fnm', label: 'Modelo de red de Shahi et al.: línea' } as const;
const SHAHI_MEASURED = {
  id: 'shahi-medicion',
  label: 'Medición de Shahi et al.: puntos, lectura aproximada',
} as const;

const lpm = (value: number, precision = 2) => formatNumber(value, { precision, unit: 'L/min' });

interface Mark {
  id: string;
  points: Point[];
  color: string;
  dashed?: boolean;
  dot?: boolean;
}

/** One panel of the figure: ports on x, flow on y, its marks, measured to its container. */
function FlowPanel({
  heading,
  marks,
  legend,
  ports,
  ariaLabel,
  testId,
}: {
  heading: string;
  marks: readonly Mark[];
  legend: readonly { id: string; label: string; color: string; dashed?: boolean; dot?: boolean }[];
  ports: number;
  ariaLabel: string;
  testId: string;
}): JSX.Element {
  const [ref, width, isMeasured] = useElementWidth<HTMLDivElement>(FALLBACK_WIDTH);
  const clipId = `reparto-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const highlight = useSeriesHighlight(legend.map(({ id }) => id));
  const compact = horizontalFrame(width, 0).compact;
  const part = compact ? LAYOUT.compact : LAYOUT.wide;
  const yDomain: Domain = padDomain(
    marks.flatMap((mark) => mark.points.map((point) => point.y)),
    marks.some((mark) => mark.dot) ? BENCH_PAD : MODEL_PAD,
  );
  const y = linearScale(yDomain, [part.top + part.plot, part.top]);
  const xDomain = { min: 1 - PORT_PAD, max: ports + PORT_PAD };
  const ticks = { x: portTicks(ports, compact), y: stepTicks(yDomain, Y_TICK_INTERVALS) };
  const frame = horizontalFrame(width, yTickLabelChars(ticks.y));
  const x = linearScale(xDomain, [frame.left, frame.right]);
  const scales = { x, y };
  const reserve = heightReserve(HEIGHTS, isMeasured);
  return (
    <div data-testid={testId} className="mt-3 first:mt-0">
      <p className="m-0 mb-2 text-sm font-medium">{heading}</p>
      <SeriesHighlightContext value={highlight.highlighted}>
        <SeriesLegend
          entries={legend.map((entry) => ({
            id: entry.id,
            label: entry.label,
            swatch: (
              <Swatch
                color={entry.color}
                dashed={entry.dashed}
                shape={entry.dot ? 'dot' : 'line'}
              />
            ),
          }))}
          highlight={highlight}
        />
        <div ref={ref} className={DRAWING_CONTAINER}>
          <svg
            role="img"
            aria-label={ariaLabel}
            viewBox={`0 0 ${frame.width} ${compact ? HEIGHTS.compact : HEIGHTS.wide}`}
            width="100%"
            className={reserve.className}
            style={reserve.style}
          >
            <Panel
              clipId={clipId}
              area={{
                left: frame.left,
                right: frame.right,
                top: part.top,
                bottom: part.top + part.plot,
              }}
              scales={scales}
              ticks={ticks}
              xTitle={X_TITLE}
              yTitle={Y_TITLE}
              frame={frame}
            >
              {marks.map((mark) =>
                mark.dot ? (
                  <SeriesDots
                    key={mark.id}
                    legendId={mark.id}
                    points={mark.points}
                    color={mark.color}
                    scales={scales}
                  />
                ) : (
                  <SeriesLine
                    key={mark.id}
                    legendId={mark.id}
                    points={mark.points}
                    color={mark.color}
                    dashed={mark.dashed}
                    scales={scales}
                  />
                ),
              )}
            </Panel>
          </svg>
        </div>
      </SeriesHighlightContext>
    </div>
  );
}

const spread = (series: BranchSeries) => {
  const flows = series.points.map((point) => point.y);
  return `de ${lpm(Math.max(...flows), 3)} a ${lpm(Math.min(...flows), 3)}`;
};

export default function BranchFlowFigure(): JSX.Element {
  const model = useMemo(() => branchFlowSeries(REFERENCE), []);
  const bench = useMemo(() => shahiSeries(), []);
  const rackFlow = formatNumber(REFERENCE.rackFlow / M3S_PER_LPM, { precision: 1 });
  const benchFlow = formatNumber(SHAHI_2023_PORT_FLOWS.totalFlow.value / M3S_PER_LPM, {
    precision: 1,
  });
  const modelLabel = mathTextToString(
    `Caudal por puerto del rack de ${REFERENCE.servers} servidores a ${rackFlow} L/min: ${model.map((s) => `${s.label.toLowerCase()}, ${spread(s)}`).join('; ')}.`,
  );
  const benchLabel = mathTextToString(
    `Banco de ${bench.fnm.length} puertos sin placas frías a ${benchFlow} L/min: el modelo de red de Shahi et al. baja de ${lpm(bench.fnm[0].y)} en el puerto 1 a ${lpm(bench.fnm[bench.fnm.length - 1].y)} en el ${bench.fnm.length}; la medición varía sin orden entre ${lpm(Math.min(...bench.measured.map((p) => p.y)))} y ${lpm(Math.max(...bench.measured.map((p) => p.y)))}.`,
  );
  return (
    <ChartFrame title={TITLE} testId="branch-flow-figure">
      <FlowPanel
        testId="branch-flow-model"
        heading={`Mi modelo: rack RD109 de ${REFERENCE.servers} servidores a ${rackFlow} L/min`}
        ports={REFERENCE.servers}
        marks={model}
        legend={model}
        ariaLabel={modelLabel}
      />
      <FlowPanel
        testId="branch-flow-bench"
        heading={`Banco de NVIDIA y UT Arlington: ${bench.fnm.length} puertos sin placas frías a ${benchFlow} L/min`}
        ports={bench.fnm.length}
        marks={[
          { id: SHAHI_FNM.id, points: bench.fnm, color: NO_PLATE_COLOR },
          { id: SHAHI_MEASURED.id, points: bench.measured, color: NO_PLATE_COLOR, dot: true },
        ]}
        legend={[
          { ...SHAHI_FNM, color: NO_PLATE_COLOR },
          { ...SHAHI_MEASURED, color: NO_PLATE_COLOR, dot: true },
        ]}
        ariaLabel={benchLabel}
      />
    </ChartFrame>
  );
}
