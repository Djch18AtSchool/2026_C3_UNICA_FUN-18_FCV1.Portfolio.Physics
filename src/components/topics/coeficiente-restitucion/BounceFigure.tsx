import type { JSX } from 'react';
import { SURFACE_COLOR, TEXT_COLOR, TICK_COLOR, TICK_FONT_FAMILY } from '../../charts/chartTheme';
import { useElementWidth } from '../../hooks/useElementWidth';
import { fitCentre, monoTextWidth } from '../../lab/plotScales';
import SvgPlot, { type OverlayScales } from '../../lab/SvgPlot';
import { formatNumber } from '../../../lib/format';
import { bounceSeries, G_EARTH } from '../../../lib/physics';
import { apexPoints, bounceTrajectory, ITF_DROP } from './bounceFigures';
import CollisionDiagram from './CollisionDiagram';
import ThresholdPlot from './ThresholdPlot';

export type BounceFigureVariant = 'rebote' | 'choque' | 'umbral';

export interface BounceFigureProps {
  variant: BounceFigureVariant;
}

/** The ITF ball wears the tennis color (spec §4.3). */
const TENNIS_COLOR = 'var(--tennis)';
/** Flights drawn: after 20 the rest last 0,02 s, less than a pixel before T. */
const FLIGHTS = 20;
const SAMPLES_PER_FLIGHT = 24;
const APEX_COUNT = 4;
const REBOTE_DOMAIN = { x: { min: 0, max: 5.5 }, y: { min: 0, max: 2.8 } } as const;
const FALLBACK_WIDTH = 720;
const COMPACT_WIDTH = 480;
/** Phones get a taller plot so the apex labels, band and T keep apart. */
const COMPACT_ASPECT = 0.75;
/** Plot areas narrower than this (phones) print the short apex and band labels. */
const SHORT_LABELS_BELOW_PX = 360;
const WIDE_ASPECT = 1.6;
const LABEL_SIZE = 12;
const HALO_WIDTH = 4;
const APEX_LABEL_RISE = 8;
const BAND_OPACITY = 0.14;
const BAND_LABEL_INSET = 6;
const BAND_LABEL_DROP = 14;
const T_LABEL_INSET = 4;
/** Below the h₀ label's line, so the two never meet on a phone. */
const T_LABEL_DROP = 32;
const T_DASH = '4 4';

const haloText = {
  fill: TEXT_COLOR,
  fontFamily: TICK_FONT_FAMILY,
  fontSize: LABEL_SIZE,
  stroke: SURFACE_COLOR,
  strokeWidth: HALO_WIDTH,
  paintOrder: 'stroke',
} as const;

const { h0, e } = ITF_DROP;
const TOTAL_TIME = bounceSeries(h0, e, G_EARTH, 1).totalTime;
/** y(t) to the last flight drawn, then at rest on the floor from T to the end of the axis. */
const TRAJECTORY = [
  ...bounceTrajectory(h0, e, G_EARTH, FLIGHTS, SAMPLES_PER_FLIGHT),
  { x: TOTAL_TIME, y: 0 },
  { x: REBOTE_DOMAIN.x.max, y: 0 },
];
const APEXES = apexPoints(h0, e, G_EARTH, APEX_COUNT);
const comma = (value: number, decimals: number) => formatNumber(value, { precision: decimals });
const T_LABEL = `T = ${comma(TOTAL_TIME, 2)} s`;
const BAND_RANGE = `${comma(ITF_DROP.reboundMin, 2)}–${comma(ITF_DROP.reboundMax, 2)} m`;
const BAND_LABEL = `Rebote ITF: ${BAND_RANGE}`;
const SHORT_BAND_LABEL = `ITF: ${BAND_RANGE}`;

/**
 * The rebound band the ITF admits, the apex labels and the time T when the bounces end. The band
 * label ends before the T line, under the band, where only the low late flights pass.
 */
function ReboteOverlay({ x, y }: OverlayScales): JSX.Element {
  const [left, right] = x.range;
  const [bottom, top] = y.range;
  const bandTop = y.toPx(ITF_DROP.reboundMax);
  const bandBottom = y.toPx(ITF_DROP.reboundMin);
  const tx = x.toPx(TOTAL_TIME);
  const isShort = right - left < SHORT_LABELS_BELOW_PX;
  return (
    <g className="pointer-events-none">
      <rect
        data-band="itf"
        x={left}
        y={bandTop}
        width={right - left}
        height={bandBottom - bandTop}
        fill={TENNIS_COLOR}
        fillOpacity={BAND_OPACITY}
      />
      <text
        x={tx - BAND_LABEL_INSET}
        y={bandBottom + BAND_LABEL_DROP}
        textAnchor="end"
        {...haloText}
      >
        {isShort ? SHORT_BAND_LABEL : BAND_LABEL}
      </text>
      <line x1={tx} x2={tx} y1={top} y2={bottom} stroke={TICK_COLOR} strokeDasharray={T_DASH} />
      <text x={tx - T_LABEL_INSET} y={top + T_LABEL_DROP} textAnchor="end" {...haloText}>
        {T_LABEL}
      </text>
      {APEXES.map((apex) => {
        const label = isShort ? apex.shortLabel : apex.label;
        return (
          <g key={apex.n} data-apex={apex.n}>
            <text
              x={fitCentre(x.toPx(apex.t), monoTextWidth(label, LABEL_SIZE), left, right)}
              y={y.toPx(apex.h) - APEX_LABEL_RISE}
              textAnchor="middle"
              {...haloText}
            >
              {label}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function reboteAriaLabel(): string {
  const rebounds = APEXES.slice(1)
    .map((apex) => `${comma(apex.h, 2)} m`)
    .join(', ');
  return `Altura y de la pelota de tenis ITF frente al tiempo, soltada desde ${comma(h0, 2)} m con e = ${comma(e, 3)}: los rebotes suben a ${rebounds}, cada uno e² = ${comma(e * e, 3)} veces el anterior, dentro de la banda de la ITF el primero, y se acaban en ${T_LABEL}.`;
}

function ReboundPlot(): JSX.Element {
  const [ref, width] = useElementWidth<HTMLDivElement>(FALLBACK_WIDTH);
  return (
    <div ref={ref}>
      <SvgPlot
        aspectRatio={width < COMPACT_WIDTH ? COMPACT_ASPECT : WIDE_ASPECT}
        title="Altura de la pelota de tenis ITF en sus rebotes"
        xLabel="t"
        xUnit="s"
        yLabel="y"
        yUnit="m"
        series={[
          {
            id: 'tenis-itf',
            label: 'Pelota de tenis ITF',
            points: TRAJECTORY,
            color: TENNIS_COLOR,
          },
        ]}
        xDomain={REBOTE_DOMAIN.x}
        yDomain={REBOTE_DOMAIN.y}
        overlay={(scales) => <ReboteOverlay {...scales} />}
        ariaLabel={reboteAriaLabel()}
      />
    </div>
  );
}

/** The static figures of Tema 7's steps 1–3. */
export default function BounceFigure({ variant }: BounceFigureProps): JSX.Element {
  switch (variant) {
    case 'rebote':
      return <ReboundPlot />;
    case 'choque':
      return <CollisionDiagram />;
    case 'umbral':
      return <ThresholdPlot />;
  }
}
