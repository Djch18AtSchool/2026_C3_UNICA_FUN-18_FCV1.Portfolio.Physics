import type { JSX } from 'react';
import { BROUGHTON, PEDESTRIAN_FORCES, TACOMA_SI } from '../../../lib/data/bridges';
import { KLIPPER } from '../../../lib/data/klipper';
import { tacomaNetDamping } from '../../../lib/data/tacomaFlutter';
import { formatNumber } from '../../../lib/format';
import { mathTextToString } from '../../../lib/mathNotation';
import { trimTrailingZeros } from '../../charts/chartScale';
import { TICK_COLOR } from '../../charts/chartTheme';
import { Label } from '../../lab/OverlayMarks';
import { PlotPoints, type PlotPoint } from '../../lab/PlotPoints';
import type { Scale } from '../../lab/plotScales';
import SvgPlot, { type PlotAspect, type PlotSeries } from '../../lab/SvgPlot';
import {
  BUILDS_UP_COLOR,
  CURVE_COLORS,
  CURVE_ZETAS,
  DIES_OUT_COLOR,
  freeModes,
  REFERENCE_COLOR,
  resonanceCurve,
  selfExcited,
  troopForces,
} from './resonancePlots';

export type ResonanceFigureVariant = 'libre' | 'curva' | 'tropa' | 'autoexcitacion';

export interface ResonanceFigureProps {
  variant: ResonanceFigureVariant;
}

type Scales = { x: Scale; y: Scale };

/** Phones get a squarer plot so the swings keep some height. */
const ASPECT: PlotAspect = { compact: 0.9, wide: 1.6 };
const GUIDE_DASH = '4 4';
const LABEL_INSET = 6;
const LABEL_DROP = 18;
const DRAW_RADIUS = 4;

const comma = (value: number, decimals: number) => formatNumber(value, { precision: decimals });

/**
 * A dashed vertical guide at x, with its label inside the plot: along the top by default, or just
 * above the x axis where the top is taken (the tallest peak of the resonance curve sits there).
 */
function Guide({
  x,
  y,
  at,
  label,
  labelAt = 'top',
}: Scales & { at: number; label: string; labelAt?: 'top' | 'bottom' }): JSX.Element {
  const [bottom, top] = y.range;
  const px = x.toPx(at);
  const isTop = labelAt === 'top';
  return (
    <g className="pointer-events-none">
      <line x1={px} x2={px} y1={top} y2={bottom} stroke={TICK_COLOR} strokeDasharray={GUIDE_DASH} />
      <Label
        at={{ x: px, y: isTop ? top : bottom }}
        dx={LABEL_INSET}
        dy={isTop ? LABEL_DROP : -LABEL_INSET}
        anchor="start"
      >
        {label}
      </Label>
    </g>
  );
}

// ---------------------------------------------------------------------------------------------
// Paso 1: two modes, two natural frequencies

const FREE = freeModes();
const FREE_DOMAIN = { x: { min: 0, max: 20 }, y: { min: -1.4, max: 1.8 } } as const;
const periodLabel = (periodS: number) => `$T_0$ = ${comma(periodS, 1)} s`;

function LibrePlot(): JSX.Element {
  const { vertical, torsion } = FREE;
  const points: PlotPoint[] = [
    {
      id: 'periodo-vertical',
      x: vertical.periodS,
      y: 1,
      label: periodLabel(vertical.periodS),
      anchor: 'start',
      color: REFERENCE_COLOR,
    },
    {
      id: 'periodo-torsion',
      x: 2 * torsion.periodS,
      y: 1,
      label: periodLabel(torsion.periodS),
      anchor: 'start',
      color: BUILDS_UP_COLOR,
    },
  ];
  return (
    <div data-testid="resonance-figure-libre">
      <SvgPlot
        aspectRatio={ASPECT}
        title="Dos modos del puente de Tacoma Narrows como oscilaciones libres"
        xLabel="$t$"
        xUnit="s"
        yLabel="$x/A$"
        yUnit="adimensional"
        series={[
          {
            id: 'vertical',
            label: `Modo vertical, ${vertical.cyclesPerMin} ciclos/min`,
            points: vertical.points,
            color: REFERENCE_COLOR,
          },
          {
            id: 'torsion',
            label: `Torsión de un nodo, ${torsion.cyclesPerMin} ciclos/min`,
            points: torsion.points,
            color: BUILDS_UP_COLOR,
          },
        ]}
        xDomain={FREE_DOMAIN.x}
        yDomain={FREE_DOMAIN.y}
        overlay={(scales) => <PlotPoints points={points} scales={scales} />}
        ariaLabel={mathTextToString(
          `Dos cosenos de amplitud 1 durante 20 s. El modo vertical, a ${vertical.cyclesPerMin} ciclos por minuto, vuelve a su punto de partida cada ${comma(vertical.periodS, 1)} s; la torsión de un nodo, a ${torsion.cyclesPerMin} ciclos por minuto, cada ${comma(torsion.periodS, 1)} s.`,
        )}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Paso 2: the resonance curve

/** Up to 8, so the ω_d = ω0 guide's label clears the tallest peak (6,7). */
const CURVE_DOMAIN = { x: { min: 0, max: 2 }, y: { min: 0, max: 8 } } as const;
const KLIPPER_DEFAULT = KLIPPER.defaultDampingRatio.value;
/** «0,075», «0,1», «0,15»: the ζ as Klipper writes them, without trailing zeros. */
const zetaLabel = (zeta: number) => `$\\zeta$ = ${trimTrailingZeros(comma(zeta, 3))}`;

function CurvaPlot(): JSX.Element {
  const series: PlotSeries[] = CURVE_ZETAS.map((zeta) => ({
    id: `zeta-${zeta}`,
    label:
      zeta === KLIPPER_DEFAULT ? `${zetaLabel(zeta)}, la de Klipper por omisión` : zetaLabel(zeta),
    points: resonanceCurve(zeta),
    color: CURVE_COLORS[zeta],
  }));
  const peaks: PlotPoint[] = CURVE_ZETAS.map((zeta) => ({
    id: `pico-${zeta}`,
    x: 1,
    y: 1 / (2 * zeta),
    label: comma(1 / (2 * zeta), 1),
    anchor: 'start',
    color: CURVE_COLORS[zeta],
  }));
  return (
    <div data-testid="resonance-figure-curva">
      <SvgPlot
        aspectRatio={ASPECT}
        title="Curva de resonancia: amplitud frente a la frecuencia de la fuerza"
        xLabel="$\omega_d/\omega_0$"
        xUnit="adimensional"
        yLabel="Amplitud relativa $A/(F_0/k)$"
        yUnit="adimensional"
        series={series}
        xDomain={CURVE_DOMAIN.x}
        yDomain={CURVE_DOMAIN.y}
        overlay={(scales) => (
          <>
            <Guide {...scales} at={1} label="$\omega_d = \omega_0$" labelAt="bottom" />
            {/* Plated: right of each peak the taller curve comes down across the label. */}
            <PlotPoints plated points={peaks} scales={scales} />
          </>
        )}
        ariaLabel={mathTextToString(
          'Tres curvas que valen 1 con la fuerza lenta, suben hasta un pico en ω_d = ω_0 y caen por encima. En el pico valen 1 sobre 2 zeta: 6,7 con ζ = 0,075, 5,0 con ζ = 0,1 y 3,3 con ζ = 0,15. Menos amortiguamiento, pico más alto y más angosto.',
        )}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Paso 3: the troop

const F1 = PEDESTRIAN_FORCES.verticalN.value;
const SOLDIERS = BROUGHTON.soldiersOnBridge.value;
const TROOP = troopForces({ maxN: 200, step: 10, F1, seed: 1831 });
const TROOP_DOMAIN = { x: { min: 0, max: 200 }, y: { min: 0, max: 60 } } as const;
const KN_PER_N = 1 / 1000;

function TroopDraws({ x, y }: Scales): JSX.Element {
  return (
    <g className="pointer-events-none">
      {TROOP.draws.map((draw) => (
        <circle
          key={draw.x}
          data-draw=""
          cx={x.toPx(draw.x)}
          cy={y.toPx(draw.y)}
          r={DRAW_RADIUS}
          fill={DIES_OUT_COLOR}
        />
      ))}
    </g>
  );
}

function TropaPlot(): JSX.Element {
  const inStep = SOLDIERS * F1 * KN_PER_N;
  const breaking = Math.sqrt(SOLDIERS) * F1 * KN_PER_N;
  const points: PlotPoint[] = [
    {
      id: 'soldados-al-paso',
      x: SOLDIERS,
      y: inStep,
      label: `${comma(inStep, 1)} kN`,
      anchor: 'end',
      color: BUILDS_UP_COLOR,
    },
    {
      id: 'soldados-rompiendo',
      x: SOLDIERS,
      y: breaking,
      label: `${comma(breaking, 1)} kN`,
      // Left of the point: the seeded draws just right of 60 would sit under the label.
      anchor: 'end',
      color: DIES_OUT_COLOR,
    },
  ];
  return (
    <div data-testid="resonance-figure-tropa">
      <SvgPlot
        aspectRatio={ASPECT}
        title="Fuerza total de $N$ personas al paso y rompiendo el paso"
        xLabel="$N$"
        xUnit="personas"
        yLabel="Fuerza total $|F|$"
        yUnit="kN"
        series={[
          {
            id: 'al-paso',
            label: 'Al paso, $N F_1$',
            points: TROOP.inStep,
            color: BUILDS_UP_COLOR,
          },
          {
            id: 'rompiendo',
            label: 'Rompiendo el paso, $\\sqrt{N}\\,F_1$',
            points: TROOP.rms,
            color: DIES_OUT_COLOR,
          },
        ]}
        xDomain={TROOP_DOMAIN.x}
        yDomain={TROOP_DOMAIN.y}
        overlay={(scales) => (
          <>
            <Guide {...scales} at={SOLDIERS} label={`${SOLDIERS} soldados`} />
            <TroopDraws {...scales} />
            <PlotPoints points={points} scales={scales} />
          </>
        )}
        ariaLabel={mathTextToString(
          `Con F_1 = ${comma(F1, 0)} N por persona, la fuerza al paso crece en recta, N F_1, hasta ${comma(200 * F1 * KN_PER_N, 0)} kN con 200 personas; rompiendo el paso crece como la raíz de N, y los puntos de un sorteo de fases al azar caen a su alrededor. Con ${SOLDIERS} soldados: ${comma(inStep, 1)} kN al paso y ${comma(breaking, 1)} kN rompiendo el paso.`,
        )}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Paso 4: self-excitation at three winds

const F0 = TACOMA_SI.torsionHz.value;
const SELF_END_S = 30;
/** Up to 5, so the label of the largest growth (×3,5 at 30 s) stays inside on a phone. */
const SELF_DOMAIN = { x: { min: 0, max: SELF_END_S }, y: { min: -4, max: 5 } } as const;
const WINDS = [
  { mph: 17, color: DIES_OUT_COLOR, extrapolated: false },
  { mph: 30.6, color: BUILDS_UP_COLOR, extrapolated: false },
  { mph: 42, color: BUILDS_UP_COLOR, extrapolated: true },
] as const;

function windCase({ mph, color, extrapolated }: (typeof WINDS)[number]) {
  const net = tacomaNetDamping(mph);
  if (!net) throw new Error(`ResonanceFigure: sin A₂* a ${mph} mph`);
  const run = selfExcited(net.zetaNet, F0, SELF_END_S);
  const name = extrapolated ? `${comma(mph, 0)} mph, extrapolado` : `${comma(mph, 1)} mph`;
  return {
    series: {
      id: `u-${mph}`,
      label: `${name}: $\\zeta_\\text{neto}$ = ${comma(net.zetaNet, 3)}`,
      points: run.points,
      color,
      dashed: extrapolated,
    } satisfies PlotSeries,
    growth: run.envelope.at(-1)?.y ?? 1,
    color,
    mph,
  };
}

const CASES = WINDS.map(windCase);

function AutoexcitacionPlot(): JSX.Element {
  // A decaying case labels below its point, a growing one above: ×0,93 and ×1,8 end close.
  const ends: PlotPoint[] = CASES.map(({ growth, color, mph }) => ({
    id: `fin-${mph}`,
    x: SELF_END_S,
    y: growth,
    label: `×${comma(growth, growth < 1 ? 2 : 1)}`,
    anchor: 'end',
    side: growth < 1 ? 1 : -1,
    color,
  }));
  return (
    <div data-testid="resonance-figure-autoexcitacion">
      <SvgPlot
        aspectRatio={ASPECT}
        title="Torsión del Tacoma con tres vientos: decae o crece sola"
        xLabel="$t$"
        xUnit="s"
        yLabel="Ángulo relativo $\theta/\theta_0$"
        yUnit="adimensional"
        series={CASES.map((c) => c.series)}
        xDomain={SELF_DOMAIN.x}
        yDomain={SELF_DOMAIN.y}
        // Plated: on a phone the curves' last swing crosses the end labels.
        overlay={(scales) => <PlotPoints plated points={ends} scales={scales} />}
        ariaLabel={mathTextToString(
          `La torsión a 0,20 Hz durante ${SELF_END_S} s, seis vueltas, sin ninguna fuerza que oscile. Con 17 mph su amplitud baja a ×${comma(CASES[0].growth, 2)}; con 30,6 mph sube a ×${comma(CASES[1].growth, 1)}; con 42 mph, extrapolando la tabla, a ×${comma(CASES[2].growth, 1)}.`,
        )}
      />
    </div>
  );
}

/** The static figures of Tema 12's four steps. */
export default function ResonanceFigure({ variant }: ResonanceFigureProps): JSX.Element {
  switch (variant) {
    case 'libre':
      return <LibrePlot />;
    case 'curva':
      return <CurvaPlot />;
    case 'tropa':
      return <TropaPlot />;
    case 'autoexcitacion':
      return <AutoexcitacionPlot />;
  }
}
