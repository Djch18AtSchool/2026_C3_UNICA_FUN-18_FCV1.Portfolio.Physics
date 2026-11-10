import type { JSX } from 'react';
import { SURFACE_COLOR, TEXT_COLOR, TICK_COLOR } from '../../charts/chartTheme';
import { useElementWidth } from '../../hooks/useElementWidth';
import {
  boxAround,
  clearSpot,
  segmentsOf,
  textBox,
  type Box,
  type Point,
  type Segment,
} from '../../lab/labelClearance';
import MathText from '../../lab/MathText';
import { fitCentre } from '../../lab/plotScales';
import SvgPlot, { type OverlayScales } from '../../lab/SvgPlot';
import { formatNumber } from '../../../lib/format';
import { mathTextToString, mathTextWidth } from '../../../lib/mathNotation';
import { bounceSeries, G_EARTH } from '../../../lib/physics';
import { apexPoints, bounceTrajectory, ITF_DROP, type ApexPoint } from './bounceFigures';
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
/** Plot areas narrower than this (phones) print the short band label. */
const SHORT_LABELS_BELOW_PX = 360;
const WIDE_ASPECT = 1.6;
const LABEL_SIZE = 12;
const HALO_WIDTH = 4;
const APEX_LABEL_RISE = 8;
/**
 * A label set beside its apex starts (or ends) this far back over it, px: still above the arc,
 * which falls away from the apex, and the further back the more room before the T line.
 */
const APEX_LABEL_LEADS = [4, 12];
/** Ascent and descent of a 12 px line, around its baseline (0,8 em and 0,25 em). */
const LABEL_HEIGHT = 1.05 * LABEL_SIZE;
const BASELINE_BELOW_CENTRE = 0.275 * LABEL_SIZE;
const BAND_OPACITY = 0.14;
const BAND_LABEL_INSET = 6;
const BAND_LABEL_DROP = 14;
const T_LABEL_INSET = 4;
/** Below the h₀ label's line, so the two never meet on a phone. */
const T_LABEL_DROP = 32;
const T_DASH = '4 4';

const HALO = { color: SURFACE_COLOR, width: HALO_WIDTH } as const;

/** A 12 px label in the figures' ink with the surface halo, in the MathText notation. */
function HaloLabel({
  source,
  x,
  y,
  anchor,
}: {
  source: string;
  x: number;
  y: number;
  anchor: 'middle' | 'end';
}): JSX.Element {
  return (
    <MathText
      source={source}
      x={x}
      y={y}
      anchor={anchor}
      fontSize={LABEL_SIZE}
      fill={TEXT_COLOR}
      halo={HALO}
    />
  );
}

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

interface ApexLabel {
  n: number;
  text: string;
  /** Centre of the label's box; the text is drawn centred on it. */
  at: Point;
}

interface ApexLayout {
  labels: ApexLabel[];
  /** Every label found a clear spot. */
  isClear: boolean;
}

/**
 * Each apex label (in one form: with the unit or without) where it crosses no arc, line or other
 * label, inside the plot: centred over its apex when that is clear (wide plots), else starting
 * at the apex or ending at it. Above its apex and past it a label meets only lower flights, so
 * on a phone the start position is usually clear. A label with no clear spot stays centred.
 */
function layApexLabels(
  apexes: readonly ApexPoint[],
  form: 'label' | 'shortLabel',
  scales: OverlayScales,
  lines: readonly Segment[],
  texts: readonly Box[],
): ApexLayout {
  const [left, right] = scales.x.range;
  const [bottom, top] = scales.y.range;
  const area = { left, right, top, bottom };
  return apexes.reduce<ApexLayout>(
    ({ labels, isClear }, apex) => {
      const text = apex[form];
      const width = mathTextWidth(text, LABEL_SIZE, 'mono');
      const ax = scales.x.toPx(apex.t);
      const cy = scales.y.toPx(apex.h) - APEX_LABEL_RISE - BASELINE_BELOW_CENTRE;
      const spots = [
        { x: fitCentre(ax, width, left, right), y: cy },
        ...APEX_LABEL_LEADS.flatMap((lead) => [
          { x: ax - lead + width / 2, y: cy },
          { x: ax + lead - width / 2, y: cy },
        ]),
      ];
      const blocked = [
        ...texts,
        ...labels.map((label) =>
          boxAround(label.at, mathTextWidth(label.text, LABEL_SIZE, 'mono'), LABEL_HEIGHT),
        ),
      ];
      const at = clearSpot(spots, { width, height: LABEL_HEIGHT }, lines, area, blocked);
      return {
        labels: [...labels, { n: apex.n, text, at: at ?? spots[0] }],
        isClear: isClear && at !== undefined,
      };
    },
    { labels: [], isClear: true },
  );
}

/**
 * The apex labels with their unit («h₁ = 1,41 m») when every one finds a clear spot, else all
 * without it («h₁ = 1,41»; the axis gives the metre): the four always read alike.
 */
function placeApexLabels(
  apexes: readonly ApexPoint[],
  scales: OverlayScales,
  lines: readonly Segment[],
  texts: readonly Box[],
): ApexLabel[] {
  const full = layApexLabels(apexes, 'label', scales, lines, texts);
  return full.isClear
    ? full.labels
    : layApexLabels(apexes, 'shortLabel', scales, lines, texts).labels;
}

/**
 * The rebound band the ITF admits, the apex labels and the time T when the bounces end. The band
 * label ends before the T line, under the band, where only the low late flights pass.
 */
function ReboteOverlay(scales: OverlayScales): JSX.Element {
  const { x, y } = scales;
  const [left, right] = x.range;
  const [bottom, top] = y.range;
  const bandTop = y.toPx(ITF_DROP.reboundMax);
  const bandBottom = y.toPx(ITF_DROP.reboundMin);
  const tx = x.toPx(TOTAL_TIME);
  const isShort = right - left < SHORT_LABELS_BELOW_PX;
  const bandLabel = isShort ? SHORT_BAND_LABEL : BAND_LABEL;
  const bandAt = { x: tx - BAND_LABEL_INSET, y: bandBottom + BAND_LABEL_DROP };
  const tAt = { x: tx - T_LABEL_INSET, y: top + T_LABEL_DROP };
  const apexLabels = placeApexLabels(
    APEXES,
    scales,
    [
      ...segmentsOf(TRAJECTORY.map((p) => ({ x: x.toPx(p.x), y: y.toPx(p.y) }))),
      [
        { x: tx, y: top },
        { x: tx, y: bottom },
      ],
    ],
    [textBox(bandAt, bandLabel, LABEL_SIZE, 'end'), textBox(tAt, T_LABEL, LABEL_SIZE, 'end')],
  );
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
      <HaloLabel source={bandLabel} x={bandAt.x} y={bandAt.y} anchor="end" />
      <line x1={tx} x2={tx} y1={top} y2={bottom} stroke={TICK_COLOR} strokeDasharray={T_DASH} />
      <HaloLabel source={T_LABEL} x={tAt.x} y={tAt.y} anchor="end" />
      {apexLabels.map(({ n, text, at }) => (
        <g key={n} data-apex={n}>
          <HaloLabel source={text} x={at.x} y={at.y + BASELINE_BELOW_CENTRE} anchor="middle" />
        </g>
      ))}
    </g>
  );
}

function reboteAriaLabel(): string {
  const rebounds = APEXES.slice(1)
    .map((apex) => `${comma(apex.h, 2)} m`)
    .join(', ');
  return mathTextToString(
    `Altura y de la pelota de tenis ITF frente al tiempo, soltada desde ${comma(h0, 2)} m con e = ${comma(e, 3)}: los rebotes suben a ${rebounds}, cada uno e² = ${comma(e * e, 3)} veces el anterior, dentro de la banda de la ITF el primero, y se acaban en ${T_LABEL}.`,
  );
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
