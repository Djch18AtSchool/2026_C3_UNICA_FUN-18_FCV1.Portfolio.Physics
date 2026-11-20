import { useId, useState, type JSX } from 'react';
import ChartFrame from '../../charts/ChartFrame';
import { LINE_WIDTH, TEXT_COLOR, TICK_FONT_SIZE } from '../../charts/chartTheme';
import { useElementWidth } from '../../hooks/useElementWidth';
import InlineMath from '../../lab/InlineMath';
import { LEGEND_LIST } from '../../lab/LegendKey';
import { linearScale, type Scale } from '../../lab/plotScales';
import { PlotAxes, PlotGrid } from '../../lab/SvgPlotAxes';
import { aspectReserve, COMPACT_WIDTH, PLOT_ASPECT } from '../../lab/svgPlotReserve';
import { formatNumber } from '../../../lib/format';
import {
  COMPACT_SPECTRUM_X_TICKS,
  EVEN_COLOR,
  ODD_COLOR,
  SPECTRUM_DOMAIN,
  SPECTRUM_FLOOR_DB,
  SPECTRUM_HARMONICS,
  SPECTRUM_TICKS,
  type SpectrumBar,
} from './soundPlots';

export interface SpectrumBarsProps {
  bars: readonly SpectrumBar[];
  /** Plain text, with KaTeX inline between `$…$`. */
  title: string;
  /** What a screen reader hears: the figure's reading in words. */
  ariaLabel: string;
  /** Power of the odd harmonics over the even ones (n ≤ 10), dB; shown above the bars. */
  oddEvenDb?: number;
  /** Harmonics on the x axis, n = 1…harmonics: twelve in the figures, ten in the lab. */
  harmonics?: number;
  /** The y axis title: the figures' A_n/A₁ by default. */
  yTitle?: string;
  testId?: string;
}

/** The drawing before React measures it (SSR, jsdom): the article column. */
const FALLBACK_WIDTH = 720;
/** SvgPlot's margins, so the spectrum lines up with the plots beside it. */
const WIDE_MARGIN = { top: 22, right: 28, bottom: 58, left: 84 } as const;
/**
 * On a phone the y title goes above the axis; the top tick («10») sits on the plot's top edge, so
 * the title rises this much more, and the top margin with it, to clear the label.
 */
const COMPACT_TITLE_LIFT = 8;
const COMPACT_MARGIN = { top: 30 + COMPACT_TITLE_LIFT, right: 14, bottom: 50, left: 44 } as const;
/** A bar takes this share of the room of one harmonic. */
const BAR_SHARE = 0.6;
const RANGE_CAP = 4;
const HATCH = 6;
const HATCH_OPACITY = 0.18;
const EVEN_OPACITY = 0.85;
const TICK_SIZE = TICK_FONT_SIZE + 1;
const TITLE_SIZE = TICK_FONT_SIZE + 2;
const SWATCH = { width: 16, height: 12 } as const;
const DEFAULT_Y_TITLE = '$A_n/A_1$ (dB)';

/** «+25,7 dB», «−0,7 dB»; a silent parity is said in words. */
export function oddEvenText(db: number): string {
  if (db === Infinity) return 'sin pares';
  if (db === -Infinity) return 'sin impares';
  return `${db > 0 ? '+' : ''}${formatNumber(db, { precision: 1, unit: 'dB' })}`;
}

function layoutFor(width: number, harmonics: number) {
  const compact = width < COMPACT_WIDTH;
  const margin = compact ? COMPACT_MARGIN : WIDE_MARGIN;
  const aspect = compact ? PLOT_ASPECT.compact : PLOT_ASPECT.wide;
  const height = width / aspect;
  const area = {
    left: margin.left,
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
  };
  return {
    compact,
    width,
    height,
    area,
    x: linearScale({ min: 0.5, max: harmonics + 0.5 }, [area.left, area.right]),
    y: linearScale(SPECTRUM_DOMAIN, [area.bottom, area.top]),
  };
}

/** The diagonal hatch of the odd bars: a light tint of their color crossed by lines of it. */
function OddPattern({ id }: { id: string }): JSX.Element {
  return (
    <pattern
      id={id}
      width={HATCH}
      height={HATCH}
      patternUnits="userSpaceOnUse"
      patternTransform="rotate(45)"
    >
      <rect width={HATCH} height={HATCH} fill={ODD_COLOR} fillOpacity={HATCH_OPACITY} />
      <line x1={0} y1={0} x2={0} y2={HATCH} stroke={ODD_COLOR} strokeWidth={LINE_WIDTH} />
    </pattern>
  );
}

interface BarsProps {
  bars: readonly SpectrumBar[];
  x: Scale;
  y: Scale;
  patternId: string;
}

/** One bar per harmonic above the floor, from the floor to its level, and its range if any. */
function Bars({ bars, x, y, patternId }: BarsProps): JSX.Element {
  const slot = x.toPx(2) - x.toPx(1);
  const width = slot * BAR_SHARE;
  const floor = y.toPx(SPECTRUM_FLOOR_DB);
  return (
    <g>
      {bars
        .filter((bar) => bar.db > SPECTRUM_FLOOR_DB)
        .map((bar) => {
          const top = y.toPx(Math.min(bar.db, SPECTRUM_DOMAIN.max));
          const centre = x.toPx(bar.n);
          return (
            <g key={bar.n}>
              <rect
                data-harmonic={bar.n}
                data-parity={bar.isOdd ? 'impar' : 'par'}
                x={centre - width / 2}
                y={top}
                width={width}
                height={floor - top}
                fill={bar.isOdd ? `url(#${patternId})` : EVEN_COLOR}
                fillOpacity={bar.isOdd ? undefined : EVEN_OPACITY}
                stroke={bar.isOdd ? ODD_COLOR : EVEN_COLOR}
                strokeWidth={1}
              />
              {bar.range ? <RangeMark centre={centre} range={bar.range} y={y} /> : null}
            </g>
          );
        })}
    </g>
  );
}

function RangeMark({
  centre,
  range,
  y,
}: {
  centre: number;
  range: { min: number; max: number };
  y: Scale;
}): JSX.Element {
  const low = y.toPx(range.min);
  const high = y.toPx(Math.min(range.max, SPECTRUM_DOMAIN.max));
  return (
    <g data-range="" stroke={TEXT_COLOR} strokeWidth={1}>
      <line x1={centre} x2={centre} y1={low} y2={high} />
      <line x1={centre - RANGE_CAP} x2={centre + RANGE_CAP} y1={low} y2={low} />
      <line x1={centre - RANGE_CAP} x2={centre + RANGE_CAP} y1={high} y2={high} />
    </g>
  );
}

/** A small square drawn like the bars: hatched (odd) or filled (even). */
function BarSwatch({ isOdd, patternId }: { isOdd: boolean; patternId: string }): JSX.Element {
  return (
    <svg width={SWATCH.width} height={SWATCH.height} aria-hidden="true" className="shrink-0">
      {isOdd ? (
        <defs>
          <OddPattern id={patternId} />
        </defs>
      ) : null}
      <rect
        x={0.5}
        y={0.5}
        width={SWATCH.width - 1}
        height={SWATCH.height - 1}
        fill={isOdd ? `url(#${patternId})` : EVEN_COLOR}
        fillOpacity={isOdd ? undefined : EVEN_OPACITY}
        stroke={isOdd ? ODD_COLOR : EVEN_COLOR}
      />
    </svg>
  );
}

function RangeSwatch(): JSX.Element {
  const middle = SWATCH.width / 2;
  return (
    <svg width={SWATCH.width} height={SWATCH.height} aria-hidden="true" className="shrink-0">
      <g stroke={TEXT_COLOR} strokeWidth={1}>
        <line x1={middle} x2={middle} y1={1} y2={SWATCH.height - 1} />
        <line x1={middle - RANGE_CAP} x2={middle + RANGE_CAP} y1={1} y2={1} />
        <line
          x1={middle - RANGE_CAP}
          x2={middle + RANGE_CAP}
          y1={SWATCH.height - 1}
          y2={SWATCH.height - 1}
        />
      </g>
    </svg>
  );
}

function Legend({ hasRanges, patternId }: { hasRanges: boolean; patternId: string }) {
  return (
    <ul aria-label="Leyenda del espectro" className={`${LEGEND_LIST} mb-3`}>
      <li className="m-0 flex items-center gap-2">
        <BarSwatch isOdd patternId={`${patternId}-key`} />
        <InlineMath text="Impares, $n$ = 1, 3, 5…" />
      </li>
      <li className="m-0 flex items-center gap-2">
        <BarSwatch isOdd={false} patternId={patternId} />
        <InlineMath text="Pares, $n$ = 2, 4, 6…" />
      </li>
      {hasRanges ? (
        <li className="m-0 flex items-center gap-2">
          <RangeSwatch />
          <span>Rango entre ventanas de 0,25 s</span>
        </li>
      ) : null}
    </ul>
  );
}

/**
 * The harmonic content of a sound: one bar per harmonic n = 1…12, in dB relative to the
 * fundamental, from a floor of −45 dB. Odd harmonics are hatched in one color and even ones filled
 * in another (parity never rests on color alone); a recording adds the range of each harmonic
 * over its 0,25 s windows. Every n is ticked, and the odd/even power is printed above.
 */
export default function SpectrumBars({
  bars,
  title,
  ariaLabel,
  oddEvenDb,
  harmonics = SPECTRUM_HARMONICS,
  yTitle = DEFAULT_Y_TITLE,
  testId,
}: SpectrumBarsProps): JSX.Element {
  const patternId = `espectro-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}-impar`;
  const [ref, measuredWidth, isMeasured] = useElementWidth<HTMLDivElement>(FALLBACK_WIDTH);
  const [reserve] = useState(() => aspectReserve(PLOT_ASPECT));
  const layout = layoutFor(measuredWidth, harmonics);
  const ticks = {
    x: layout.compact
      ? COMPACT_SPECTRUM_X_TICKS.filter((n) => n <= harmonics)
      : Array.from({ length: harmonics }, (_, i) => i + 1),
    y: [...SPECTRUM_TICKS.y],
  };
  const hasRanges = bars.some((bar) => bar.range !== undefined);
  return (
    <ChartFrame title={title} testId={testId}>
      {oddEvenDb === undefined ? null : (
        <p data-testid="odd-even" className="m-0 mb-2 text-sm">
          <InlineMath text={`Impares sobre pares, $n \\le 10$: ${oddEvenText(oddEvenDb)}`} />
        </p>
      )}
      <Legend hasRanges={hasRanges} patternId={patternId} />
      <div ref={ref} className="@container/plot relative w-full min-w-0">
        <svg
          role="img"
          aria-label={ariaLabel}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          width="100%"
          className={`block ${isMeasured ? 'h-auto' : reserve.className}`}
          style={isMeasured ? undefined : reserve.style}
        >
          <defs>
            <OddPattern id={patternId} />
          </defs>
          <PlotGrid ticks={ticks} x={layout.x} y={layout.y} area={layout.area} />
          <PlotAxes
            ticks={ticks}
            x={layout.x}
            y={layout.y}
            area={layout.area}
            xTitle="Armónico $n$ (adimensional)"
            yTitle={yTitle}
            tickFontSize={TICK_SIZE}
            titleFontSize={TITLE_SIZE}
            compact={layout.compact}
            compactTitleLift={COMPACT_TITLE_LIFT}
            viewWidth={layout.width}
          />
          <Bars bars={bars} x={layout.x} y={layout.y} patternId={patternId} />
        </svg>
      </div>
    </ChartFrame>
  );
}
