import { useMemo, type JSX } from 'react';
import { formatNumber } from '../../../lib/format';
import { inlineMathToSpeech } from '../../../lib/inlineMath';
import { dampingRegime } from '../../../lib/physics/dampedSpring';
import { TICK_COLOR } from '../../charts/chartTheme';
import type { FrameStore } from '../../lab/frameStore';
import { PlotPoints } from '../../lab/PlotPoints';
import type { Scale } from '../../lab/plotScales';
import SvgPlot, { type PlotSeries } from '../../lab/SvgPlot';
import { COMPARISON_LANE, formatSeconds, REGIME_WORDS, SPRING_LANE } from './springLabText';
import { BAND_EPSILON, BAND_OPACITY, BEZIER_COLOR, GUIDE_DASH, REGIME_COLORS } from './springPlots';
import { MARKS, runCurves, runMarkers, springAt, TRAVEL_PX, type SpringRun } from './springScene';

type Scales = { x: Scale; y: Scale };

const seconds = formatSeconds;

/** Where each leg of the spring ends: the next press, or the end of the run. */
const legEnds = (run: SpringRun) =>
  run.spring.map((_, i) => run.spring[i + 1]?.start ?? run.duration);

/** The target, leg by leg, as a dashed step: 1 000 px, then the other mark after each press. */
function TargetSteps({ run, x, y }: Scales & { run: SpringRun }): JSX.Element {
  const ends = legEnds(run);
  const d = run.spring
    .map((leg, i) => {
      const level = y.toPx(leg.target);
      const start = i === 0 ? `M${x.toPx(0)} ${level}` : `V${level}`;
      return `${start} H${x.toPx(ends[i])}`;
    })
    .join(' ');
  return (
    <path
      data-mark="destino"
      d={d}
      fill="none"
      stroke={TICK_COLOR}
      strokeDasharray={GUIDE_DASH}
      className="pointer-events-none"
    />
  );
}

/** The band of ±2 % of the travel around each leg's target, for as long as the leg lasts. */
function LegBands({ run, x, y }: Scales & { run: SpringRun }): JSX.Element {
  const ends = legEnds(run);
  const half = BAND_EPSILON * TRAVEL_PX;
  return (
    <g className="pointer-events-none">
      {run.spring.map((leg, i) => {
        const [left, right] = [x.toPx(leg.start), x.toPx(ends[i])];
        const top = y.toPx(leg.target + half);
        return (
          <rect
            key={`${leg.start}-${i}`}
            data-band="reposo"
            x={left}
            y={top}
            width={right - left}
            height={y.toPx(leg.target - half) - top}
            fill={TICK_COLOR}
            fillOpacity={BAND_OPACITY}
          />
        );
      })}
    </g>
  );
}

/** A dashed vertical guide at each press, t*. */
function PressGuides({ run, x, y }: Scales & { run: SpringRun }): JSX.Element {
  const [bottom, top] = y.range;
  return (
    <g data-mark="interrupcion" className="pointer-events-none">
      {run.retargets.map((t, i) => (
        <line
          key={`${t}-${i}`}
          x1={x.toPx(t)}
          x2={x.toPx(t)}
          y1={top}
          y2={bottom}
          stroke={TICK_COLOR}
          strokeDasharray={GUIDE_DASH}
        />
      ))}
    </g>
  );
}

/** The first overshoot of each leg from rest; the plain step's is labelled with its t_p. */
function peakPoints(run: SpringRun) {
  const color = REGIME_COLORS[dampingRegime(run.params)];
  const firstPress = run.retargets[0] ?? Infinity;
  return runMarkers(run)
    .filter(({ kind }) => kind === 'peak')
    .map(({ t }, i) => ({
      id: `pico-${i}`,
      x: t,
      y: springAt(run, t).x,
      label: t < firstPress ? `$t_p$ = ${seconds(t)}` : undefined,
      color,
    }));
}

function describePlot(run: SpringRun, showComparison: boolean): string {
  const px = (value: number) => formatNumber(value, { precision: 0, unit: 'px' });
  const regime = REGIME_WORDS[dampingRegime(run.params)];
  const presses = run.retargets.length;
  const curve = showComparison
    ? ` La curva de duración fija va de ${px(MARKS.from)} a ${px(MARKS.to)} en ${seconds(run.bezier[0].duration)}.`
    : '';
  const pressText = presses > 0 ? ` Interrupciones: ${presses}, cada una cambia el destino.` : '';
  return inlineMathToSpeech(
    `Posición $x$ frente al tiempo durante ${seconds(run.duration)}. El resorte, ${regime}, sale de ${px(MARKS.from)} hacia ${px(MARKS.to)}.${curve}${pressText}`,
  );
}

export interface SpringPlotProps {
  run: SpringRun;
  /** The settled time and the live one the cursor follows between renders. */
  t: number;
  frame: FrameStore;
  showComparison: boolean;
  showBand: boolean;
  onSeek(t: number): void;
}

/**
 * x(t) of both cards over the whole run, under a time cursor that follows the clock and, dragged
 * or moved with the keys, seeks it: the target as a dashed step, the band of ±2 % of each leg,
 * a guide at each press and the first overshoot of each leg from rest.
 */
export default function SpringPlot({
  run,
  t,
  frame,
  showComparison,
  showBand,
  onSeek,
}: SpringPlotProps): JSX.Element {
  const curves = useMemo(() => runCurves(run), [run]);
  const series: PlotSeries[] = [
    {
      id: 'resorte',
      label: SPRING_LANE,
      points: curves.spring,
      color: REGIME_COLORS[dampingRegime(run.params)],
    },
    ...(showComparison
      ? [{ id: 'curva', label: COMPARISON_LANE, points: curves.bezier, color: BEZIER_COLOR }]
      : []),
  ];
  return (
    <div data-testid="spring-plot">
      <SvgPlot
        title="Posición de las dos tarjetas, $x(t)$"
        xLabel="$t$"
        xUnit="s"
        yLabel="$x$"
        yUnit="px"
        series={series}
        xDomain={{ min: 0, max: run.duration }}
        cursor={{
          x: t,
          follow: { frame },
          onChange: onSeek,
          label: (time: number) => `$t$ = ${seconds(time)}`,
          ariaLabel: 'Instante en la gráfica de posición',
        }}
        overlay={(scales) => (
          <>
            {showBand ? <LegBands run={run} {...scales} /> : null}
            <TargetSteps run={run} {...scales} />
            <PressGuides run={run} {...scales} />
            <PlotPoints points={peakPoints(run)} scales={scales} />
          </>
        )}
        ariaLabel={describePlot(run, showComparison)}
      />
    </div>
  );
}
