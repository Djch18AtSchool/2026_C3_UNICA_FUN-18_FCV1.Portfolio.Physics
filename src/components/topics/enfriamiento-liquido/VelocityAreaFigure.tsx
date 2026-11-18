/**
 * Tema 13, step 1: continuity drawn as v against A. Each of the circuit's three flows (the CDU's,
 * one rack's, one server's) is a hyperbola v = Q/A; each section of the path is a numbered point
 * on the hyperbola of the flow it carries, and the manifold runs down its one area from the rack's
 * hyperbola to a server's. The area axis is logarithmic: the sections span three decades.
 */
import { Fragment, useId, useMemo, type JSX } from 'react';
import { formatNumber } from '../../../lib/format';
import { mathTextToString } from '../../../lib/mathNotation';
import ChartFrame from '../../charts/ChartFrame';
import { GRID_COLOR, TEXT_COLOR, TICK_FONT_SIZE } from '../../charts/chartTheme';
import {
  SeriesHighlightContext,
  SeriesLegend,
  useSeriesHighlight,
} from '../../charts/seriesHighlight';
import { useElementWidth } from '../../hooks/useElementWidth';
import MathText from '../../lab/MathText';
import { linearScale, textWidth } from '../../lab/plotScales';
import { useGlobalSettings } from '../../lab/useGlobalSettings';
import { axisTicks, yTickLabelChars } from '../../lab/SvgPlotAxes';
import {
  decadeTicks,
  HYPERBOLA_COLOR,
  logScale,
  SECTION_COLOR,
  velocityAreaData,
  type FlowCurve,
  type VelocityAreaData,
} from './coolingCharts';
import {
  DRAWING_CONTAINER,
  FALLBACK_WIDTH,
  heightReserve,
  horizontalFrame,
  Panel,
  SeriesDots,
  SeriesLine,
  Swatch,
  Unbroken,
  type Scales,
} from './coolingPlotKit';

const TITLE = 'Velocidad media frente al área de cada sección del circuito RD109';
const X_TITLE = 'Área de la sección $A$ (mm², escala logarítmica)';
/** On a phone the long title would not fit under the plot. */
const X_TITLE_COMPACT = 'Área $A$ (mm², escala log.)';
/** On a phone the hyperbolas have no room for their labels: a line under the chart names them. */
const FLOWS_INTRO = 'Hipérbolas, de izquierda a derecha:';
const Y_TITLE = 'Velocidad media $v$ (m/s)';
const LEGEND = [
  { id: 'hiperbolas', label: 'Hipérbola $v = Q/A$ de cada caudal', color: HYPERBOLA_COLOR },
  { id: 'secciones', label: 'Sección del circuito (punto)', color: SECTION_COLOR, dot: true },
  { id: 'manifold', label: 'Manifold: su caudal baja de puerto en puerto', color: SECTION_COLOR },
] as const;
const LAYOUT = {
  wide: { top: 12, plot: 300, axis: 58 },
  compact: { top: 28, plot: 240, axis: 50 },
} as const;
const HEIGHTS = {
  wide: LAYOUT.wide.top + LAYOUT.wide.plot + LAYOUT.wide.axis,
  compact: LAYOUT.compact.top + LAYOUT.compact.plot + LAYOUT.compact.axis,
};
/** Minor grid lines at 2 and 5 times each decade, unlabelled. */
const MINOR_MULTIPLES = [2, 5];
/** Heights (fractions of the v axis) at which a hyperbola's label is tried, top first. */
const LABEL_LEVELS = [0.93, 0.8, 0.66, 0.52];
const LABEL_SIZE = TICK_FONT_SIZE;
const LABEL_GAP = 6;
const NUMBER_OFFSET = 8;
const SMALL_AREA = 100;

function geometry(width: number, data: VelocityAreaData) {
  const compact = horizontalFrame(width, 0).compact;
  const part = compact ? LAYOUT.compact : LAYOUT.wide;
  const y = linearScale(data.v, [part.top + part.plot, part.top]);
  const chars = yTickLabelChars(axisTicks(linearScale({ min: 0, max: 1 }, [0, 1]), y).y);
  const frame = horizontalFrame(width, chars);
  const x = logScale(data.area, [frame.left, frame.right]);
  const ticks = { x: decadeTicks(data.area), y: axisTicks(x, y).y };
  const area = {
    left: frame.left,
    right: frame.right,
    top: part.top,
    bottom: part.top + part.plot,
  };
  return { frame, area, scales: { x, y }, ticks, height: compact ? HEIGHTS.compact : HEIGHTS.wide };
}

/**
 * Where a hyperbola's label goes: right of the curve at the highest level where it fits inside
 * the plot without reaching the next curve to its right; none if no level has room.
 */
function curveLabel(curve: FlowCurve, next: FlowCurve | undefined, { x, y }: Scales, vMax: number) {
  const width = textWidth(curve.label, LABEL_SIZE);
  const right = x.range[1];
  for (const level of LABEL_LEVELS) {
    const v = vMax * level;
    const atCurve = x.toPx((curve.flow / v) * 1e6);
    const limit = next ? x.toPx((next.flow / v) * 1e6) - LABEL_GAP : right;
    const start = atCurve + LABEL_GAP;
    if (start + width <= Math.min(limit, right)) return { x: start, y: y.toPx(v) };
  }
  return null;
}

/** Unlabelled lines at 2 and 5 times each decade, when the grid is on (the global setting). */
function MinorGrid({
  scales,
  area,
  data,
}: {
  scales: Scales;
  area: { top: number; bottom: number };
  data: VelocityAreaData;
}) {
  const { grid } = useGlobalSettings();
  if (!grid) return null;
  const decades = decadeTicks({ min: data.area.min / 10, max: data.area.max });
  const values = decades
    .flatMap((decade) => MINOR_MULTIPLES.map((m) => decade * m))
    .filter((value) => value > data.area.min && value < data.area.max);
  return (
    <g stroke={GRID_COLOR} strokeWidth={1} strokeOpacity={0.6} shapeRendering="crispEdges">
      {values.map((value) => (
        <line
          key={value}
          x1={scales.x.toPx(value)}
          x2={scales.x.toPx(value)}
          y1={area.top}
          y2={area.bottom}
        />
      ))}
    </g>
  );
}

const areaText = (mm2: number) =>
  formatNumber(mm2, { precision: mm2 < SMALL_AREA ? 1 : 0, unit: 'mm²' });
const speedText = (v: number) => formatNumber(v, { precision: 2, unit: 'm/s' });

function spoken(data: VelocityAreaData): string {
  const sections = data.sections
    .map((s) => `${s.n}, ${s.name}: $A$ = ${areaText(s.area)}, $v$ = ${speedText(s.v)}`)
    .join('; ');
  return mathTextToString(
    `Velocidad media frente al área de la sección, con el eje de áreas logarítmico. Tres hipérbolas $v = Q/A$: ${data.curves.map((c) => c.label).join(', ')}. Secciones: ${sections}.`,
  );
}

export default function VelocityAreaFigure(): JSX.Element {
  const [ref, width, isMeasured] = useElementWidth<HTMLDivElement>(FALLBACK_WIDTH);
  const clipId = `va-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const data = useMemo(() => velocityAreaData(), []);
  const highlight = useSeriesHighlight(LEGEND.map(({ id }) => id));
  const layout = geometry(width, data);
  const reserve = heightReserve(HEIGHTS, isMeasured);
  const labels = data.curves.map((curve, i) => ({
    curve,
    at: curveLabel(curve, data.curves[i - 1], layout.scales, data.v.max),
  }));
  return (
    <ChartFrame title={TITLE} testId="velocity-area-figure">
      <SeriesHighlightContext value={highlight.highlighted}>
        <SeriesLegend
          entries={LEGEND.map((entry) => ({
            id: entry.id,
            label: entry.label,
            swatch: <Swatch color={entry.color} shape={'dot' in entry ? 'dot' : 'line'} />,
          }))}
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
            <MinorGrid scales={layout.scales} area={layout.area} data={data} />
            <Panel
              clipId={clipId}
              area={layout.area}
              scales={layout.scales}
              ticks={layout.ticks}
              xTitle={layout.frame.compact ? X_TITLE_COMPACT : X_TITLE}
              yTitle={Y_TITLE}
              frame={layout.frame}
            >
              {data.curves.map((curve) => (
                <SeriesLine
                  key={curve.id}
                  legendId="hiperbolas"
                  points={curve.points}
                  color={HYPERBOLA_COLOR}
                  scales={layout.scales}
                />
              ))}
              <SeriesLine
                legendId="manifold"
                points={data.manifold}
                color={SECTION_COLOR}
                scales={layout.scales}
              />
              <SeriesDots
                legendId="secciones"
                points={data.sections.map((s) => ({ x: s.area, y: s.v }))}
                color={SECTION_COLOR}
                scales={layout.scales}
              />
              {labels.map(({ curve, at }) =>
                at ? (
                  <MathText
                    key={curve.id}
                    source={curve.label}
                    x={at.x}
                    y={at.y - LABEL_GAP}
                    fontSize={LABEL_SIZE}
                    fill={TEXT_COLOR}
                  />
                ) : null,
              )}
              {data.sections.map((s) => (
                <text
                  key={s.id}
                  x={layout.scales.x.toPx(s.area) + NUMBER_OFFSET}
                  y={layout.scales.y.toPx(s.v) - NUMBER_OFFSET}
                  fontSize={LABEL_SIZE}
                  fill={TEXT_COLOR}
                  className="tabular-nums"
                >
                  {s.n}
                </text>
              ))}
            </Panel>
          </svg>
        </div>
      </SeriesHighlightContext>
      {labels.some(({ at }) => at === null) ? (
        <p data-testid="velocity-area-flows" className="m-0 mt-3 text-sm">
          {FLOWS_INTRO}{' '}
          {[...data.curves].reverse().map((curve, i) => (
            <Fragment key={curve.id}>
              {i > 0 ? '; ' : ''}
              <Unbroken text={curve.label} />
            </Fragment>
          ))}
          .
        </p>
      ) : null}
      <ol aria-label="Secciones del circuito" className="m-0 mt-3 grid list-none gap-1 p-0 text-sm">
        {data.sections.map((s) => (
          <li key={s.id} className="m-0">
            <span className="font-medium tabular-nums">{s.n}</span> {s.name}:{' '}
            <Unbroken text={`$A$ = ${areaText(s.area)}`} />,{' '}
            <Unbroken text={`$v$ = ${speedText(s.v)}`} />
          </li>
        ))}
      </ol>
    </ChartFrame>
  );
}
