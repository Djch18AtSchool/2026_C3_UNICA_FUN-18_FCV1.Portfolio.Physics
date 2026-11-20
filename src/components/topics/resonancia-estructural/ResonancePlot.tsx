/**
 * The resonance lab's support plot, under one time cursor that follows the clock and, dragged or
 * moved with the keys, seeks it: in «Barrido» the curve (12.3) and the envelope the sweep traces
 * up to now, against ω_d/ω0; in «Tropa» the deck's envelope in step and breaking step with their
 * steady amplitudes; in «Filtro ZV» x(t) after one push and after the two ZV impulses.
 */
import type { JSX } from 'react';
import { formatNumber } from '../../../lib/format';
import { mathTextToString } from '../../../lib/mathNotation';
import { TICK_COLOR } from '../../charts/chartTheme';
import type { FrameStore } from '../../lab/frameStore';
import { Label } from '../../lab/OverlayMarks';
import SvgPlot, { type OverlayScales, type PlotSeries } from '../../lab/SvgPlot';
import type { ActiveModel } from './bridgeFrames';
import { BUILDS_UP_COLOR, DIES_OUT_COLOR, MEASURED_COLOR, REFERENCE_COLOR } from './resonancePlots';
import { traceUntil, type Run } from './resonanceRun';
import { SWEEP_RANGE } from './resonanceScene';

export interface ResonancePlotProps {
  active: ActiveModel;
  /** The settled time and the live one the cursor follows between renders. */
  t: number;
  frame: FrameStore;
  decimals: number;
  onSeek(t: number): void;
}

const MM_PER_M = 1000;
const PERCENT = 100;
const ENVELOPE_POINTS = 300;
const HEADROOM = 1.15;
const GUIDE_DASH = '4 4';
const LABEL_INSET = 6;
const TIME_PRECISION = 2;

const timeLabel = (x: number) =>
  `$t$ = ${formatNumber(x, { precision: TIME_PRECISION, unit: 's' })}`;

/** The run's envelope as (t, mm), from its peaks. */
const envelopeMm = (run: Run) =>
  traceUntil(run, run.duration, ENVELOPE_POINTS).map(({ t, a }) => ({ x: t, y: a * MM_PER_M }));

/** A dashed horizontal guide at y with its label, for a steady amplitude inside the plot. */
function Level({ x, y, at, label }: OverlayScales & { at: number; label: string }) {
  const [left, right] = x.range;
  const py = y.toPx(at);
  return (
    <g className="pointer-events-none">
      <line x1={left} x2={right} y1={py} y2={py} stroke={TICK_COLOR} strokeDasharray={GUIDE_DASH} />
      <Label at={{ x: left, y: py }} dx={LABEL_INSET} dy={-LABEL_INSET}>
        {label}
      </Label>
    </g>
  );
}

function SweepPlot({ active, t, frame, onSeek }: ResonancePlotProps) {
  if (active.mode !== 'barrido') return null;
  const { sweep } = active;
  const span = SWEEP_RANGE.end - SWEEP_RANGE.start;
  const series: PlotSeries[] = [
    {
      id: 'teorica',
      label: 'Estado estacionario, (12.3)',
      points: sweep.curve,
      color: REFERENCE_COLOR,
    },
    {
      id: 'barrido',
      label: 'Envolvente del barrido',
      points: sweep.trace(t),
      color: MEASURED_COLOR,
    },
  ];
  return (
    <SvgPlot
      testId="sweep-plot"
      title="Curva de resonancia: la (12.3) y lo que traza el barrido"
      xLabel="$\omega_d/\omega_0$"
      xUnit="adimensional"
      yLabel="Amplitud relativa $A/(F_0/k)$"
      yUnit="adimensional"
      series={series}
      xDomain={{ min: SWEEP_RANGE.start, max: SWEEP_RANGE.end }}
      yDomain={{ min: 0, max: sweep.yMax }}
      cursor={{
        x: sweep.ratioAt(t),
        follow: { frame, toX: sweep.ratioAt },
        onChange: (ratio) => onSeek(((ratio - SWEEP_RANGE.start) / span) * sweep.duration),
        ariaLabel: 'Frecuencia de la fuerza',
        label: (ratio) =>
          `$\\omega_d/\\omega_0$ = ${formatNumber(ratio, { precision: TIME_PRECISION })}`,
      }}
      ariaLabel={mathTextToString(
        `La curva azul es la amplitud estacionaria de la (12.3) entre $\\omega_d/\\omega_0$ = ${formatNumber(SWEEP_RANGE.start, { precision: 1 })} y ${formatNumber(SWEEP_RANGE.end, { precision: 1 })}; ${Number.isFinite(sweep.peakGain) ? `su pico vale ${formatNumber(sweep.peakGain, { precision: 2 })}` : 'sin amortiguamiento crece sin límite en $\\omega_d = \\omega_0$'}. La violeta es la envolvente que traza el barrido hasta ahora; su pico llega a ${formatNumber(sweep.run.maxPeak, { precision: 2 })}.`,
      )}
    />
  );
}

function TroopPlot({ active, t, frame, onSeek }: ResonancePlotProps) {
  if (active.mode !== 'tropa') return null;
  const { troop } = active;
  const inStep = envelopeMm(troop.runs.inStep);
  const breaking = envelopeMm(troop.runs.breaking);
  const levels = [
    { id: 'al-paso', value: troop.steady.inStep * MM_PER_M, name: 'al paso' },
    { id: 'rompiendo', value: troop.steady.breaking * MM_PER_M, name: 'rompiendo el paso' },
  ].filter(({ value }) => Number.isFinite(value));
  const top =
    HEADROOM *
    Math.max(...inStep.map((p) => p.y), ...levels.map(({ value }) => value), Number.EPSILON);
  /** Where an envelope settles, in words: its steady amplitude, or no limit without damping. */
  const upTo = (steady: number) =>
    Number.isFinite(steady)
      ? formatNumber(steady * MM_PER_M, { precision: 1, unit: 'mm' })
      : 'crecer sin límite';
  return (
    <SvgPlot
      testId="troop-plot"
      title="Amplitud del tablero, al paso y rompiendo el paso"
      xLabel="$t$"
      xUnit="s"
      yLabel="Amplitud"
      yUnit="mm"
      series={[
        { id: 'al-paso', label: 'Al paso', points: inStep, color: BUILDS_UP_COLOR },
        { id: 'rompiendo', label: 'Rompiendo el paso', points: breaking, color: DIES_OUT_COLOR },
      ]}
      xDomain={{ min: 0, max: troop.duration }}
      yDomain={{ min: 0, max: top }}
      cursor={{ x: t, follow: { frame }, onChange: onSeek, label: timeLabel }}
      overlay={(scales) =>
        levels.map(({ id, value, name }) => (
          <Level key={id} {...scales} at={value} label={`estacionaria ${name}`} />
        ))
      }
      ariaLabel={`La amplitud del tablero sube desde cero: al paso hasta ${upTo(troop.steady.inStep)}, rompiendo el paso hasta ${upTo(troop.steady.breaking)}, en ${formatNumber(troop.duration, { precision: 0, unit: 's' })}.`}
    />
  );
}

function ZvPlot({ active, t, frame, onSeek }: ResonancePlotProps) {
  if (active.mode !== 'filtro-zv') return null;
  const { zv } = active;
  const samples = (run: Run) => Array.from(run.samples, (x, i) => ({ x: i * run.sampleDt, y: x }));
  return (
    <SvgPlot
      testId="zv-plot"
      title="Un empujón frente a los dos impulsos del filtro ZV"
      xLabel="$t$"
      xUnit="s"
      yLabel="$x/A_1$"
      yUnit="adimensional"
      series={[
        {
          id: 'un-empujon',
          label: 'Un empujón',
          points: samples(zv.runs.single),
          color: BUILDS_UP_COLOR,
        },
        {
          id: 'dos-empujones',
          label: 'Dos impulsos (ZV)',
          points: samples(zv.runs.shaped),
          color: DIES_OUT_COLOR,
        },
      ]}
      xDomain={{ min: 0, max: zv.duration }}
      yDomain={{ min: -1.1, max: 1.1 }}
      cursor={{ x: t, follow: { frame }, onChange: onSeek, label: timeLabel }}
      overlay={({ x, y }) => (
        <line
          x1={x.toPx(zv.secondImpulse)}
          x2={x.toPx(zv.secondImpulse)}
          y1={y.range[0]}
          y2={y.range[1]}
          stroke={TICK_COLOR}
          strokeDasharray={GUIDE_DASH}
          className="pointer-events-none"
        />
      )}
      ariaLabel={`Tras un empujón la estructura oscila y se apaga despacio; con los dos impulsos del filtro, el segundo a los ${formatNumber(zv.secondImpulse, { precision: 3, unit: 's' })}, queda, según la estimación de Klipper, un ${formatNumber(zv.residual * PERCENT, { precision: 1 })} % de la vibración de un empujón.`}
    />
  );
}

export default function ResonancePlot(props: ResonancePlotProps): JSX.Element {
  return (
    <>
      <SweepPlot {...props} />
      <TroopPlot {...props} />
      <ZvPlot {...props} />
    </>
  );
}
