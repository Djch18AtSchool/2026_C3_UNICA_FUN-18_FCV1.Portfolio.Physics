import type { JSX } from 'react';
import { formatNumber } from '../../../lib/format';
import { mathTextToString } from '../../../lib/mathNotation';
import {
  dampingRatio,
  dampingRegime,
  overshootRatio,
  type DampingRegime,
} from '../../../lib/physics/dampedSpring';
import {
  AXIS_COLOR,
  SURFACE_COLOR,
  TEXT_COLOR,
  TEXT_FONT_FAMILY,
  TICK_COLOR,
  TICK_FONT_FAMILY,
} from '../../charts/chartTheme';
import { useElementWidth } from '../../hooks/useElementWidth';
import { CANVAS_INSET } from '../../lab/canvasInset';
import type { FrameStore } from '../../lab/frameStore';
import MathText from '../../lab/MathText';
import { useFrameDerived } from '../../lab/useFrameTime';
import {
  comparisonLabel,
  COMPARISON_LANE,
  REGIME_WORDS,
  regimeLabel,
  SPRING_LANE,
} from './springLabText';
import { BAND_EPSILON, BEZIER_COLOR, REGIME_COLORS } from './springPlots';
import { bezierAt, cardsAt, MARKS, springAt, TRAVEL_PX, type SpringRun } from './springScene';

/** viewBox width before the canvas is measured (SSR, jsdom); the height never follows it. */
const FALLBACK_WIDTH = 720;
const SIDE = 16;
const CARD = { width: 48, height: 28, radius: 4 } as const;
/** A lane: its title and chip, then the card on its rail. */
const LANE = { height: 88, gap: 8, title: 16, chip: 34, card: 64, rail: 82 } as const;
const RULER = { gap: 4, height: 48, tick: 6, label: 20, target: 38 } as const;
const TITLE_SIZE = 13;
const NOTE_SIZE = 12;
const SWATCH = 10;
const SWATCH_GAP = 6;
/** Room around the marks, as a share of the travel, beyond the plain step's own overshoot. */
const PAD_SHARE = 0.25;
const GUIDE_DASH = '4 4';
const GHOST_DASH = '4 3';
const GHOST_OPACITY = 0.15;
const BAND_OPACITY = 0.18;
const CHEVRON = 5;
const PX_DECIMALS = 2;
/** Float slack before a card counts as past the drawn track. */
const CLAMP_SLACK = 1e-6;
/** The card's two lines of «text», on its own surface. */
const CARD_LINES = 'M-14 -4 H14 M-14 4 H6';

type Lane = 'spring' | 'bezier';

export interface SpringCardProps {
  run: SpringRun;
  /** The clock's live time, which the cards follow frame by frame. */
  frame: FrameStore;
  /** The settled time: the description and the curve's duration under its title. */
  t: number;
  showComparison: boolean;
  showBand: boolean;
}

interface Track {
  width: number;
  height: number;
  lanes: number;
  rulerTop: number;
  toPx(x: number): number;
  bounds: [number, number];
}

const laneTop = (index: number) => index * (LANE.height + LANE.gap);
/** The top of the cards (and of the guides and the band): just above the first lane's card. */
const MARKS_TOP = LANE.card - CARD.height / 2 - CHEVRON;

/**
 * The drawn track: the marks with room for the plain step's overshoot (M_p of the travel, all of
 * it without damping) and a quarter of the travel at least, between the canvas's sides.
 */
function track(run: SpringRun, width: number, lanes: number): Track {
  const pad = TRAVEL_PX * Math.max(PAD_SHARE, overshootRatio(dampingRatio(run.params)));
  const [low, high] = [MARKS.from - pad, MARKS.to + pad];
  const [left, right] = [SIDE + CARD.width / 2, width - SIDE - CARD.width / 2];
  const rulerTop = laneTop(lanes) - LANE.gap + RULER.gap;
  return {
    width,
    height: rulerTop + RULER.height,
    lanes,
    rulerTop,
    toPx: (x) => left + ((x - low) / (high - low)) * (right - left),
    bounds: [left, right],
  };
}

/** Where a card is drawn: its x, or the track's edge when past it (and which edge). */
function placement(geo: Track, x: number): { px: number; clamped?: 'left' | 'right' } {
  const px = geo.toPx(x);
  const [left, right] = geo.bounds;
  if (px < left - CLAMP_SLACK) return { px: left, clamped: 'left' };
  if (px > right + CLAMP_SLACK) return { px: right, clamped: 'right' };
  return { px };
}

interface CardProps {
  lane: Lane;
  x: number;
  color: string;
  geo: Track;
  index: number;
}

/** A UI card: a filled rounded box with two lines of «text»; a chevron when it is clamped. */
function Card({ lane, x, color, geo, index }: CardProps): JSX.Element {
  const { px, clamped } = placement(geo, x);
  const half = CARD.width / 2;
  const tip = clamped === 'left' ? -half - CHEVRON - 2 : half + CHEVRON + 2;
  const back = clamped === 'left' ? tip + CHEVRON : tip - CHEVRON;
  return (
    <g
      data-testid={`card-${lane}`}
      data-x={x.toFixed(PX_DECIMALS)}
      data-clamped={clamped}
      transform={`translate(${px.toFixed(PX_DECIMALS)} ${laneTop(index) + LANE.card})`}
    >
      <rect
        x={-half}
        y={-CARD.height / 2}
        width={CARD.width}
        height={CARD.height}
        rx={CARD.radius}
        fill={color}
        stroke={TEXT_COLOR}
      />
      <path d={CARD_LINES} stroke={SURFACE_COLOR} strokeWidth={2} strokeLinecap="round" />
      {clamped ? (
        <path
          d={`M${back} ${-CHEVRON} L${tip} 0 L${back} ${CHEVRON}`}
          fill="none"
          stroke={TEXT_COLOR}
          strokeWidth={1.5}
        />
      ) : null}
    </g>
  );
}

/** The faint outline of a card standing on the current target. */
function Ghost({ geo, target, color, index }: Omit<CardProps, 'lane' | 'x'> & { target: number }) {
  return (
    <rect
      data-ghost=""
      x={geo.toPx(target) - CARD.width / 2}
      y={laneTop(index) + LANE.card - CARD.height / 2}
      width={CARD.width}
      height={CARD.height}
      rx={CARD.radius}
      fill={color}
      fillOpacity={GHOST_OPACITY}
      stroke={color}
      strokeDasharray={GHOST_DASH}
    />
  );
}

/** The band of ±2 % of the travel around the current target, across every lane. */
function Band({ geo, target }: { geo: Track; target: number }): JSX.Element {
  const half = BAND_EPSILON * TRAVEL_PX;
  const [x1, x2] = [geo.toPx(target - half), geo.toPx(target + half)];
  return (
    <rect
      data-band="reposo"
      data-target={target}
      x={x1}
      y={MARKS_TOP}
      width={x2 - x1}
      height={geo.rulerTop - MARKS_TOP}
      fill={TICK_COLOR}
      fillOpacity={BAND_OPACITY}
    />
  );
}

interface LayerProps {
  run: SpringRun;
  frame: FrameStore;
  geo: Track;
  regime: DampingRegime;
  showBand: boolean;
}

/** The moving layer: the band, the ghosts, «destino» and both cards at the live time. */
function CardsLayer({ run, frame, geo, regime, showBand }: LayerProps): JSX.Element {
  const cards = useFrameDerived(frame, (time) => cardsAt(run, time));
  const { target } = cards.spring;
  const lanes: [Lane, number, string][] = [
    ['spring', cards.spring.x, REGIME_COLORS[regime]],
    ['bezier', cards.bezier.x, BEZIER_COLOR],
  ];
  const shown = lanes.slice(0, geo.lanes);
  return (
    <g className="pointer-events-none">
      {showBand ? <Band geo={geo} target={target} /> : null}
      {shown.map(([lane, , color], index) => (
        <Ghost key={lane} geo={geo} target={target} color={color} index={index} />
      ))}
      <text
        data-testid="target-label"
        data-target={target}
        x={geo.toPx(target)}
        y={geo.rulerTop + RULER.target}
        textAnchor="middle"
        fontFamily={TICK_FONT_FAMILY}
        fontSize={NOTE_SIZE}
        fill={TEXT_COLOR}
      >
        destino
      </text>
      {shown.map(([lane, x, color], index) => (
        <Card key={lane} lane={lane} x={x} color={color} geo={geo} index={index} />
      ))}
    </g>
  );
}

interface LaneHeaderProps {
  index: number;
  width: number;
  title: string;
  /** In the MathText notation, with its formulas between `$…$`. */
  chip: string;
  color: string;
  testId: string;
  regime?: DampingRegime;
}

/** A lane's title and, under it, its chip (a swatch of the card's color and a label); its rail. */
function LaneHeader({ index, width, title, chip, color, testId, regime }: LaneHeaderProps) {
  const top = laneTop(index);
  return (
    <g>
      <text
        x={SIDE}
        y={top + LANE.title}
        fontFamily={TEXT_FONT_FAMILY}
        fontSize={TITLE_SIZE}
        fontWeight={600}
        fill={TEXT_COLOR}
      >
        {title}
      </text>
      <g data-testid={testId} data-regime={regime}>
        <rect
          x={SIDE}
          y={top + LANE.chip - SWATCH}
          width={SWATCH}
          height={SWATCH}
          rx={2}
          fill={color}
        />
        <MathText
          source={chip}
          x={SIDE + SWATCH + SWATCH_GAP}
          y={top + LANE.chip}
          fontSize={NOTE_SIZE}
          fill={TEXT_COLOR}
        />
      </g>
      <line
        x1={SIDE}
        x2={width - SIDE}
        y1={top + LANE.rail}
        y2={top + LANE.rail}
        stroke={AXIS_COLOR}
      />
    </g>
  );
}

/** The marks on the ruler under the lanes, with their positions, and their guides up the lanes. */
function Marks({ geo }: { geo: Track }): JSX.Element {
  return (
    <g>
      <line
        x1={SIDE}
        x2={geo.width - SIDE}
        y1={geo.rulerTop}
        y2={geo.rulerTop}
        stroke={AXIS_COLOR}
      />
      {[MARKS.from, MARKS.to].map((mark) => {
        const x = geo.toPx(mark);
        return (
          <g key={mark} data-mark={mark}>
            <line
              x1={x}
              x2={x}
              y1={MARKS_TOP}
              y2={geo.rulerTop}
              stroke={TICK_COLOR}
              strokeDasharray={GUIDE_DASH}
            />
            <line
              x1={x}
              x2={x}
              y1={geo.rulerTop}
              y2={geo.rulerTop + RULER.tick}
              stroke={AXIS_COLOR}
            />
            <text
              x={x}
              y={geo.rulerTop + RULER.label}
              textAnchor="middle"
              fontFamily={TICK_FONT_FAMILY}
              fontSize={NOTE_SIZE}
              fill={TICK_COLOR}
            >
              {formatNumber(mark, { precision: 0, unit: 'px' })}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function describeScene(run: SpringRun, t: number, showComparison: boolean): string {
  const px = (value: number) => formatNumber(value, { precision: 0, unit: 'px' });
  const spring = springAt(run, t);
  const regime = REGIME_WORDS[dampingRegime(run.params)];
  const lead = `Dos tarjetas van de ${px(MARKS.from)} a ${px(MARKS.to)}. El resorte, ${regime}, está en ${px(spring.x)}, con destino ${px(spring.target)}`;
  return showComparison
    ? `${lead}; la curva de duración fija, en ${px(bezierAt(run, t).x)}.`
    : `${lead}.`;
}

/**
 * Tema 10's canvas: the spring's card and, under it, the fixed-duration curve's card, each in its
 * lane over one track from 100 px to 1 000 px; the guides of the two marks, the band of ±2 % and a
 * faint card on the current target. The spring's card and chip wear its regime's color, as in the
 * figures. A card past the drawn track stays on its edge with a chevron. The height is fixed by
 * the lanes, so the server draws the box the client keeps.
 */
export default function SpringCard({
  run,
  frame,
  t,
  showComparison,
  showBand,
}: SpringCardProps): JSX.Element {
  const [wrapperRef, width] = useElementWidth<HTMLDivElement>(FALLBACK_WIDTH);
  const geo = track(run, width, showComparison ? 2 : 1);
  const regime = dampingRegime(run.params);
  return (
    <div ref={wrapperRef} className={`w-full ${CANVAS_INSET}`}>
      <svg
        data-testid="spring-scene"
        viewBox={`0 0 ${width} ${geo.height}`}
        width="100%"
        height={geo.height}
        className="block"
      >
        <g role="img" aria-label={mathTextToString(describeScene(run, t, showComparison))}>
          <LaneHeader
            index={0}
            width={width}
            title={SPRING_LANE}
            chip={regimeLabel(run.params)}
            color={REGIME_COLORS[regime]}
            testId="spring-regime"
            regime={regime}
          />
          {showComparison ? (
            <LaneHeader
              index={1}
              width={width}
              title={COMPARISON_LANE}
              chip={comparisonLabel(run, t)}
              color={BEZIER_COLOR}
              testId="comparison-duration"
            />
          ) : null}
          <Marks geo={geo} />
          <CardsLayer run={run} frame={frame} geo={geo} regime={regime} showBand={showBand} />
        </g>
      </svg>
    </div>
  );
}
