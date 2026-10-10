import type { JSX } from 'react';
import {
  CHART_COLORS,
  SURFACE_COLOR,
  TEXT_COLOR,
  TICK_COLOR,
  TICK_FONT_FAMILY,
} from '../../charts/chartTheme';
import { useElementWidth } from '../../hooks/useElementWidth';
import type { Scale } from '../../lab/plotScales';
import SvgPlot from '../../lab/SvgPlot';
import ApparentWeightDiagram from './ApparentWeightDiagram';
import {
  accelerationLine,
  COMFORT,
  CONFORT_POINTS,
  RADIUS_POINTS,
  spinForOneG,
  type FigurePoint,
} from './habitatFigures';

export type HabitatFigureVariant = 'peso-aparente' | 'radio' | 'confort';

export interface HabitatFigureProps {
  variant: HabitatFigureVariant;
}

/** Earth's 1 g wears chart 1, dashed; the two spins wear charts 3 and 4. */
const EARTH_COLOR = CHART_COLORS[0];
const ONE_RPM_COLOR = CHART_COLORS[2];
const TWO_RPM_COLOR = CHART_COLORS[3];
const RADIUS_DOMAIN = { x: { min: 0, max: 1050 }, y: { min: 0, max: 1.4 } } as const;
const CONFORT_DOMAIN = { x: { min: 0, max: 250 }, y: { min: 0, max: 14 } } as const;
const POINT_RADIUS = 5;
/** Plot areas narrower than this (phones) split point labels into two lines. */
const SPLIT_BELOW_PX = 400;
const LABEL_LINE = 14;
/** Width of one character of the 12 px mono label font, to keep centred labels inside the plot. */
const CHAR_WIDTH = 7.3;
/** Phones get a squarer plot so the curves and labels keep some height. */
const COMPACT_WIDTH = 480;
const COMPACT_ASPECT = 0.8;
const WIDE_ASPECT = 1.6;
const FALLBACK_WIDTH = 720;
const LABEL_GAP = 10;
const LABEL_SIZE = 12;
const HALO_WIDTH = 4;
const BAND_OPACITY = 0.12;
const BAND_LABEL_INSET = 6;
const BAND_LABEL_DROP = 16;

const haloText = {
  fill: TEXT_COLOR,
  fontFamily: TICK_FONT_FAMILY,
  fontSize: LABEL_SIZE,
  stroke: SURFACE_COLOR,
  strokeWidth: HALO_WIDTH,
  paintOrder: 'stroke',
} as const;

type Scales = { x: Scale; y: Scale };

/**
 * A point's label on one line or, on a narrow plot, split after its colon into two lines that
 * grow away from the point (upward above it, downward below it).
 */
/** The label's lines: the whole label, or split after its colon on a narrow plot. */
function labelLines(label: string, isSplit: boolean): string[] {
  const colon = label.indexOf(': ');
  return isSplit && colon > 0 ? [label.slice(0, colon + 1), label.slice(colon + 2)] : [label];
}

function PointDot({ x, y }: { x: number; y: number }) {
  return (
    <circle
      cx={x}
      cy={y}
      r={POINT_RADIUS}
      fill={TEXT_COLOR}
      stroke={SURFACE_COLOR}
      strokeWidth={2}
    />
  );
}

/**
 * A point whose label sits away from it, at `labelAt`, centred and kept inside the plot, with a
 * leader line from the point to just above the text.
 */
function LeaderLabel({
  point,
  scales,
  isSplit,
}: {
  point: FigurePoint;
  scales: Scales;
  isSplit: boolean;
}) {
  const at = point.labelAt ?? point;
  const lines = labelLines(point.label, isSplit);
  const half = (Math.max(...lines.map((line) => line.length)) * CHAR_WIDTH) / 2;
  const [left, right] = scales.x.range;
  const x = Math.min(Math.max(scales.x.toPx(at.x), left + half), right - half);
  const y = scales.y.toPx(at.y);
  const cx = scales.x.toPx(point.x);
  const cy = scales.y.toPx(point.y);
  return (
    <g data-point={point.id}>
      <line
        x1={cx}
        y1={cy + POINT_RADIUS}
        x2={x}
        y2={y - LABEL_SIZE}
        stroke={TICK_COLOR}
        strokeDasharray="2 3"
      />
      <PointDot x={cx} y={cy} />
      <text x={x} y={y} textAnchor="middle" {...haloText}>
        {lines.map((line, index) => (
          <tspan key={line} x={x} dy={index === 0 ? 0 : LABEL_LINE}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
}

function PointLabel({
  point,
  x,
  y,
  isSplit,
}: {
  point: FigurePoint;
  x: number;
  y: number;
  isSplit: boolean;
}) {
  const lines = labelLines(point.label, isSplit);
  const firstY = point.side < 0 ? y - (lines.length - 1) * LABEL_LINE : y;
  return (
    <text x={x} y={firstY} textAnchor={point.anchor} {...haloText}>
      {lines.map((line, index) => (
        <tspan key={line} x={x} dy={index === 0 ? 0 : LABEL_LINE}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

/** Labelled points over a plot, each label beside its point on the side the data asks for. */
function Points({ points, scales }: { points: readonly FigurePoint[]; scales: Scales }) {
  return (
    <g className="pointer-events-none">
      {points.map((point) => {
        const cx = scales.x.toPx(point.x);
        const cy = scales.y.toPx(point.y);
        const isSplit = scales.x.range[1] - scales.x.range[0] < SPLIT_BELOW_PX;
        if (point.labelAt) {
          return <LeaderLabel key={point.id} point={point} scales={scales} isSplit={isSplit} />;
        }
        const dx = point.anchor === 'start' ? LABEL_GAP : -LABEL_GAP;
        const dy = point.side * LABEL_GAP + (point.side > 0 ? LABEL_SIZE / 2 : 0);
        return (
          <g key={point.id} data-point={point.id}>
            <PointDot x={cx} y={cy} />
            <PointLabel point={point} x={cx + dx} y={cy + dy} isSplit={isSplit} />
          </g>
        );
      })}
    </g>
  );
}

/** The plot's aspect ratio for its measured width, inside a wrapper that measures it. */
function useFigureAspect() {
  const [ref, width] = useElementWidth<HTMLDivElement>(FALLBACK_WIDTH);
  return { ref, aspectRatio: width < COMPACT_WIDTH ? COMPACT_ASPECT : WIDE_ASPECT };
}

function RadiusPlot(): JSX.Element {
  const rMax = RADIUS_DOMAIN.x.max;
  const { ref, aspectRatio } = useFigureAspect();
  return (
    <div ref={ref}>
      <SvgPlot
        aspectRatio={aspectRatio}
        title="Gravedad aparente a 1 y 2 RPM frente al radio"
        xLabel="r"
        xUnit="m"
        yLabel="a_c"
        yUnit="g"
        series={[
          {
            id: 'una-rpm',
            label: '1 RPM',
            points: accelerationLine(1, rMax),
            color: ONE_RPM_COLOR,
          },
          {
            id: 'dos-rpm',
            label: '2 RPM',
            points: accelerationLine(2, rMax),
            color: TWO_RPM_COLOR,
          },
          {
            id: 'tierra',
            label: '1 g terrestre (9,81 m/s²)',
            points: [
              { x: 0, y: 1 },
              { x: rMax, y: 1 },
            ],
            color: EARTH_COLOR,
            dashed: true,
          },
        ]}
        xDomain={RADIUS_DOMAIN.x}
        yDomain={RADIUS_DOMAIN.y}
        overlay={(scales) => <Points points={RADIUS_POINTS} scales={scales} />}
        ariaLabel="a_c/g crece en proporción a r: a 2 RPM llega a 1 g en 223,6 m y a 1 RPM en 894,6 m; el Toro de Stanford, a 830 m y 1 RPM, queda en 0,93 g."
      />
    </div>
  );
}

/** The comfort bands: minimum radius (a vertical strip) and maximum spin (a horizontal one). */
function ComfortBands({ scales }: { scales: Scales }) {
  const { x, y } = scales;
  const [left, right] = [x.range[0], x.range[1]];
  const [bottom, top] = [y.range[0], y.range[1]];
  const rFrom = x.toPx(COMFORT.rMin[0]);
  const rTo = x.toPx(COMFORT.rMin[1]);
  const spinLow = y.toPx(COMFORT.rpmMax[0]);
  const spinHigh = y.toPx(COMFORT.rpmMax[1]);
  const radiusLabel = `Radio mínimo: ${COMFORT.rMin[0]} a ${COMFORT.rMin[1]} m`;
  const spinLabel = `Giro máximo: ${COMFORT.rpmMax[0]} a ${COMFORT.rpmMax[1]} RPM`;
  return (
    <g className="pointer-events-none">
      <rect
        data-band="radio-minimo"
        x={rFrom}
        y={top}
        width={rTo - rFrom}
        height={bottom - top}
        fill={TICK_COLOR}
        fillOpacity={BAND_OPACITY}
      />
      <text x={rTo + BAND_LABEL_INSET} y={top + BAND_LABEL_DROP} {...haloText}>
        {radiusLabel}
      </text>
      <rect
        data-band="giro-maximo"
        x={left}
        y={spinHigh}
        width={right - left}
        height={spinLow - spinHigh}
        fill={TICK_COLOR}
        fillOpacity={BAND_OPACITY}
      />
      <text
        x={right - BAND_LABEL_INSET}
        y={spinHigh - BAND_LABEL_INSET}
        textAnchor="end"
        {...haloText}
      >
        {spinLabel}
      </text>
    </g>
  );
}

function ComfortPlot(): JSX.Element {
  const { ref, aspectRatio } = useFigureAspect();
  return (
    <div ref={ref}>
      <SvgPlot
        aspectRatio={aspectRatio}
        title="Giro que pide 1 g frente al radio, con los límites de confort"
        xLabel="r"
        xUnit="m"
        yLabel="N"
        yUnit="RPM"
        series={[
          {
            id: 'giro-1g',
            label: 'Giro para 1 g',
            points: spinForOneG(5, CONFORT_DOMAIN.x.max),
            color: TWO_RPM_COLOR,
          },
        ]}
        xDomain={CONFORT_DOMAIN.x}
        yDomain={CONFORT_DOMAIN.y}
        overlay={(scales) => (
          <>
            <ComfortBands scales={scales} />
            <Points points={CONFORT_POINTS} scales={scales} />
          </>
        )}
        ariaLabel="Giro necesario para 1 g frente al radio: 9,46 RPM a 10 m, 2,99 RPM a 100 m y 2 RPM a 223,6 m, con gradientes cabeza–pies del 18 %, 1,8 % y 0,8 %; la banda del giro máximo va de 3 a 6 RPM y la del radio mínimo, de 4 a 12 m."
      />
    </div>
  );
}

/** The static figures of Tema 3's steps 1–3. */
export default function HabitatFigure({ variant }: HabitatFigureProps): JSX.Element {
  switch (variant) {
    case 'peso-aparente':
      return <ApparentWeightDiagram />;
    case 'radio':
      return <RadiusPlot />;
    case 'confort':
      return <ComfortPlot />;
  }
}
