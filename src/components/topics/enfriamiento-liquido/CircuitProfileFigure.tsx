/**
 * Tema 13's prescribed resource (visualización de datos): the velocity and the pressure of the
 * coolant along the circuit, from the CDU to the farthest server of an RD109 rack and back, as a
 * function of the section it crosses. Two panels on one x (v in m/s; real p in kPa with the ideal
 * Bernoulli p dashed over it) and the strip of sections under them, drawn to scale in diameter.
 * Three views: the whole circuit, the rack, the server. The figure names the declared parameters
 * it is computed with (data-parameters: tables 13.1 to 13.3).
 */
import { useId, useMemo, useState, type JSX } from 'react';
import { formatNumber } from '../../../lib/format';
import { mathTextToString } from '../../../lib/mathNotation';
import ChartFrame from '../../charts/ChartFrame';
import {
  SeriesHighlightContext,
  SeriesLegend,
  useSeriesHighlight,
} from '../../charts/seriesHighlight';
import { useElementWidth } from '../../hooks/useElementWidth';
import InlineMath from '../../lab/InlineMath';
import { linearScale, type Domain } from '../../lab/plotScales';
import { axisTicks, yTickLabelChars } from '../../lab/SvgPlotAxes';
import {
  circuitProfileData,
  IDEAL_COLOR,
  PROFILE_VIEWS,
  profileParameterIds,
  SIDE_COLORS,
  SIDES,
  viewNote,
  viewXDomain,
  viewYDomains,
  type CircuitProfileData,
  type ProfileViewId,
} from './coolingPlots';
import {
  DRAWING_CONTAINER,
  FALLBACK_WIDTH,
  heightReserve,
  horizontalFrame,
  Panel,
  SeriesLine,
  stepTicks,
  Swatch,
  ViewButtons,
} from './coolingPlotKit';
import SectionStrip, { labelWidth, stripTotalHeight, StripKey } from './SectionStrip';
import { stripPlacement, stripSections } from './stripLayout';

const TITLE = 'Velocidad y presión a lo largo del recorrido, del CDU al servidor 24 y de vuelta';
const FOOTNOTE =
  'En la franja, el largo de cada tramo está a escala, y su alto es proporcional a su diámetro interior con la escala de cada vista; la placa fría va sin escala.';
const X_TITLE = 'Posición en el recorrido $x$ (m)';
const V_TITLE = 'Velocidad media $v$ (m/s)';
const P_TITLE = 'Presión absoluta $p$ (kPa)';

const LEGEND = [
  {
    id: 'impulsion',
    label: 'Impulsión, del CDU a la placa fría: $v$ y $p$ real',
    color: SIDE_COLORS.impulsion,
  },
  {
    id: 'retorno',
    label: 'Retorno, de la placa fría al CDU: $v$ y $p$ real',
    color: SIDE_COLORS.retorno,
  },
  { id: 'ideal', label: '$p$ ideal de Bernoulli, sin pérdidas', color: IDEAL_COLOR, dashed: true },
] as const;

/** Heights (viewBox px) of the parts, wide and compact: the compact y titles sit above each panel. */
const LAYOUT = {
  wide: { top: 12, v: 140, between: 40, p: 200, axis: 58 },
  compact: { top: 28, v: 120, between: 56, p: 170, axis: 50 },
} as const;
const BOTTOM_PAD = 4;
const heightOf = (part: (typeof LAYOUT)['wide' | 'compact'], compact: boolean) =>
  part.top + part.v + part.between + part.p + part.axis + stripTotalHeight(compact) + BOTTOM_PAD;
const HEIGHTS = { compact: heightOf(LAYOUT.compact, true), wide: heightOf(LAYOUT.wide, false) };
/** v reads best with a tick every whole m/s (0 to 3): about three intervals. */
const V_TICK_INTERVALS = 3;

/** Areas, scales and ticks of the two panels at a measured width, for one view's x range. */
function geometry(width: number, x: Domain, y: { v: Domain; p: Domain }) {
  const compactProbe = horizontalFrame(width, 0).compact;
  const part = compactProbe ? LAYOUT.compact : LAYOUT.wide;
  const vTop = part.top;
  const pTop = vTop + part.v + part.between;
  const vY = linearScale(y.v, [vTop + part.v, vTop]);
  const pY = linearScale(y.p, [pTop + part.p, pTop]);
  const probe = linearScale(x, [0, 1]);
  const chars = Math.max(
    yTickLabelChars(stepTicks(y.v, V_TICK_INTERVALS)),
    yTickLabelChars(axisTicks(probe, pY).y),
  );
  const frame = horizontalFrame(width, chars);
  const xScale = linearScale(x, [frame.left, frame.right]);
  const area = (top: number, height: number) => ({
    left: frame.left,
    right: frame.right,
    top,
    bottom: top + height,
  });
  return {
    frame,
    height: compactProbe ? HEIGHTS.compact : HEIGHTS.wide,
    v: {
      area: area(vTop, part.v),
      scales: { x: xScale, y: vY },
      ticks: { x: axisTicks(xScale, vY).x, y: stepTicks(y.v, V_TICK_INTERVALS) },
    },
    p: { area: area(pTop, part.p), scales: { x: xScale, y: pY }, ticks: axisTicks(xScale, pY) },
    stripTop: pTop + part.p + part.axis,
  };
}

const kpa = (value: number) => formatNumber(value, { precision: 1, unit: 'kPa' });

/** What the drawing says to a screen reader: the loop's numbers and the view's reading. */
function spokenSummary(data: CircuitProfileData, view: ProfileViewId): string {
  const name = PROFILE_VIEWS.find((candidate) => candidate.id === view)?.label ?? '';
  return mathTextToString(
    `Velocidad y presión del refrigerante a lo largo de ${formatNumber(data.bounds[data.bounds.length - 1], { precision: 1, unit: 'm' })} de recorrido; vista: ${name}. La presión real sale del CDU a ${kpa(data.inlet)} y vuelve a ${kpa(data.outlet)}, ${formatNumber(data.loss / 100, { precision: 2, unit: 'bar' })} menos; la de Bernoulli sin pérdidas vuelve a ${kpa(data.ideal[data.ideal.length - 1].y)}. ${viewNote(data, view)}`,
  );
}

export default function CircuitProfileFigure(): JSX.Element {
  const [viewId, setViewId] = useState<ProfileViewId>('circuito');
  const [ref, width, isMeasured] = useElementWidth<HTMLDivElement>(FALLBACK_WIDTH);
  const clipBase = `perfil-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const data = useMemo(() => circuitProfileData(), []);
  const sections = useMemo(() => stripSections(data.path), [data]);
  const highlight = useSeriesHighlight(LEGEND.map(({ id }) => id));
  const view = PROFILE_VIEWS.find((candidate) => candidate.id === viewId) ?? PROFILE_VIEWS[0];
  const x = viewXDomain(data.path, viewId);
  const layout = geometry(width, x, viewYDomains(data, x));
  const placement = stripPlacement(
    sections,
    view.labelLevel,
    layout.p.scales.x,
    labelWidth,
    layout.frame.compact,
  );
  const reserve = heightReserve(HEIGHTS, isMeasured);
  return (
    <ChartFrame title={TITLE} footnote={FOOTNOTE} testId="circuit-profile-figure">
      <div data-parameters={profileParameterIds(data.path).join(' ')}>
        <ViewButtons
          label="Vista del recorrido"
          views={PROFILE_VIEWS}
          value={viewId}
          onSelect={setViewId}
        />
        <SeriesHighlightContext value={highlight.highlighted}>
          <SeriesLegend
            entries={LEGEND.map((entry) => ({
              id: entry.id,
              label: entry.label,
              swatch: <Swatch color={entry.color} dashed={'dashed' in entry} />,
            }))}
            highlight={highlight}
          />
          <div ref={ref} className={DRAWING_CONTAINER}>
            <svg
              role="img"
              aria-label={spokenSummary(data, viewId)}
              viewBox={`0 0 ${layout.frame.width} ${layout.height}`}
              width="100%"
              className={reserve.className}
              style={reserve.style}
            >
              <Panel
                clipId={`${clipBase}-v`}
                {...layout.v}
                xTitle=""
                yTitle={V_TITLE}
                frame={layout.frame}
              >
                {SIDES.map((side) => (
                  <SeriesLine
                    key={side}
                    legendId={side}
                    points={data.sides[side].v}
                    color={SIDE_COLORS[side]}
                    scales={layout.v.scales}
                  />
                ))}
              </Panel>
              <Panel
                clipId={`${clipBase}-p`}
                {...layout.p}
                xTitle={X_TITLE}
                yTitle={P_TITLE}
                frame={layout.frame}
              >
                {SIDES.map((side) => (
                  <SeriesLine
                    key={side}
                    legendId={side}
                    points={data.sides[side].p}
                    color={SIDE_COLORS[side]}
                    scales={layout.p.scales}
                  />
                ))}
                <SeriesLine
                  legendId="ideal"
                  points={data.ideal}
                  color={IDEAL_COLOR}
                  scales={layout.p.scales}
                  dashed
                />
              </Panel>
              <SectionStrip
                sections={sections}
                placement={placement}
                x={layout.p.scales.x}
                top={layout.stripTop}
                compact={layout.frame.compact}
              />
            </svg>
          </div>
        </SeriesHighlightContext>
        <StripKey placement={placement} />
        <p data-testid="circuit-profile-note" className="m-0 mt-3 text-sm">
          <InlineMath text={viewNote(data, viewId)} />
        </p>
      </div>
    </ChartFrame>
  );
}
