import type { JSX } from 'react';
import { formatNumber } from '../../../lib/format';
import { TEXT_COLOR, TICK_COLOR } from '../../charts/chartTheme';
import type { FrameStore } from '../../lab/frameStore';
import SvgPlot, { type OverlayScales, type PlotSeries } from '../../lab/SvgPlot';
import type { BounceModel, EnergyGain } from './bounceScene';

/** Ideal against engine: a neutral pair, the ideal one dashed like the site's references. */
export const IDEAL_COLOR = TICK_COLOR;
export const ENGINE_COLOR = TEXT_COLOR;
/** Energy gains wear the warm red of the site's losses and warnings, plus a triangle shape. */
const GAIN_COLOR = 'var(--chart-2)';
const GAIN_SIZE = 6;
const GAIN_HEIGHT_RATIO = 1.6;
const GAIN_STROKE = 0.75;
const TIME_PRECISION = 2;

function pair(model: BounceModel, key: 'position' | 'energy'): PlotSeries[] {
  return [
    {
      id: 'ideal',
      label: 'Física ideal',
      points: model.ideal[key],
      color: IDEAL_COLOR,
      dashed: true,
    },
    { id: 'engine', label: 'Motor de juego', points: model.engine[key], color: ENGINE_COLOR },
  ];
}

/** The plot's gain triangle, small, to lead the note that explains it. */
function GainKey(): JSX.Element {
  const height = GAIN_SIZE * GAIN_HEIGHT_RATIO;
  return (
    <svg
      aria-hidden="true"
      data-testid="gain-key"
      width={GAIN_SIZE * 2}
      height={height}
      viewBox={`0 0 ${GAIN_SIZE * 2} ${height}`}
      className="inline-block align-baseline"
    >
      <path
        d={`M${GAIN_SIZE} 0 L0 ${height} L${GAIN_SIZE * 2} ${height} Z`}
        style={{ fill: GAIN_COLOR }}
        stroke={TEXT_COLOR}
        strokeWidth={GAIN_STROKE}
      />
    </svg>
  );
}

function GainMarks({ gains, scales }: { gains: EnergyGain[]; scales: OverlayScales }) {
  return (
    <g className="pointer-events-none">
      {gains.map((gain) => {
        const x = scales.x.toPx(gain.t);
        const y = scales.y.toPx(gain.energy) - 2;
        return (
          <path
            key={gain.t}
            data-gain={gain.kind}
            d={`M${x} ${y - GAIN_SIZE * GAIN_HEIGHT_RATIO} L${x - GAIN_SIZE} ${y} L${x + GAIN_SIZE} ${y} Z`}
            style={{ fill: GAIN_COLOR }}
            stroke={TEXT_COLOR}
            strokeWidth={GAIN_STROKE}
          />
        );
      })}
    </g>
  );
}

export interface BouncePlotsProps {
  model: BounceModel;
  /** The settled time and the live one the cursors follow between renders. */
  t: number;
  frame: FrameStore;
  decimals: number;
  onSeek(t: number): void;
}

/**
 * y(t) and E/E₀(t) of both balls under one time cursor that follows the clock and, dragged or
 * moved with the keys, seeks it. The energy plot marks with a triangle every rebound where the engine
 * gains energy: above the previous flight (e > 1) or above what e allows (Baumgarte).
 */
export default function BouncePlots({
  model,
  t,
  frame,
  decimals,
  onSeek,
}: BouncePlotsProps): JSX.Element {
  const xDomain = { min: 0, max: model.duration };
  const cursor = {
    x: t,
    follow: { frame },
    onChange: onSeek,
    label: (x: number) => `t = ${formatNumber(x, { precision: TIME_PRECISION, unit: 's' })}`,
  };
  const m = (value: number) => formatNumber(value, { precision: decimals, unit: 'm' });
  const peak = (points: { y: number }[]) => Math.max(...points.map((p) => p.y));
  const excess = model.gains.filter((gain) => gain.kind === 'excess').length;
  const rises = model.gains.length - excess;

  return (
    <div className="flex flex-col gap-4">
      <SvgPlot
        title="Altura de las pelotas, y(t)"
        xLabel="t"
        xUnit="s"
        yLabel="y"
        yUnit="m"
        series={pair(model, 'position')}
        xDomain={xDomain}
        cursor={cursor}
        ariaLabel={`Altura frente al tiempo de las dos pelotas durante ${formatNumber(model.duration, { precision: TIME_PRECISION, unit: 's' })}: la física ideal llega a ${m(peak(model.ideal.position))} y el motor a ${m(peak(model.engine.position))}.`}
        testId="height-plot"
      />
      <SvgPlot
        title="Energía mecánica, $E/E_0$"
        xLabel="t"
        xUnit="s"
        yLabel="Energía"
        yUnit="E/E_0"
        series={pair(model, 'energy')}
        xDomain={xDomain}
        cursor={cursor}
        overlay={(scales) => <GainMarks gains={model.gains} scales={scales} />}
        ariaLabel={`Energía mecánica sobre la inicial: cada bote la baja un factor e² en la física ideal. Botes en que el motor gana energía: ${model.gains.length}.`}
        testId="energy-plot"
      />
      <p className="m-0 text-sm text-fg-muted">
        {model.gains.length > 0 ? (
          <>
            <GainKey />
            {` Botes en que el motor gana energía: ${rises} por encima del vuelo anterior (e > 1) y ${excess} por encima de lo que e permite (sesgo de Baumgarte). `}
          </>
        ) : null}
        Cada escalón de la física ideal deja una fracción e² de la energía: pierde 1 − e² por bote.
        Con Baumgarte, la penetración cuenta como energía potencial negativa.
      </p>
    </div>
  );
}
