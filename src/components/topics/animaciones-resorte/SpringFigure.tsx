import type { JSX } from 'react';
import { formatNumber } from '../../../lib/format';
import { mathTextToString } from '../../../lib/mathNotation';
import { dampingRatio } from '../../../lib/physics/dampedSpring';
import { TICK_COLOR } from '../../charts/chartTheme';
import { Label } from '../../lab/OverlayMarks';
import { PlotPoints } from '../../lab/PlotPoints';
import type { Scale } from '../../lab/plotScales';
import SvgPlot, { type PlotAspect, type PlotSeries } from '../../lab/SvgPlot';
import {
  AMORTIGUADO,
  BAND_EPSILON,
  BEZIER_COLOR,
  INTERRUPTION,
  LIBRE,
  REGIME_COLORS,
  REGIMES,
  restBand,
  TRAVEL,
  type XY,
} from './springPlots';

export type SpringFigureVariant = 'libre' | 'amortiguado' | 'regimenes' | 'interrupcion';

export interface SpringFigureProps {
  variant: SpringFigureVariant;
}

type Scales = { x: Scale; y: Scale };

/** Phones get a squarer plot so the swings keep some height. */
const ASPECT: PlotAspect = { compact: 0.9, wide: 1.6 };
/** The full swing of the damped envelope, −39 to 2 039. */
const WIDE_DOMAIN = { min: -100, max: 2100 } as const;
/** The undamped swing, 100 to 1 900, with room under its troughs for the T₀ label on a phone. */
const LIBRE_DOMAIN = { min: -400, max: 2100 } as const;
const REGIMES_DOMAIN = { min: 0, max: 1400 } as const;
const POSITION_DOMAIN = { min: -100, max: 1100 } as const;
const VELOCITY_DOMAIN = { min: -12000, max: 12000 } as const;
const BAND_OPACITY = 0.18;
const GUIDE_DASH = '4 4';
const LABEL_RISE = 8;
const LABEL_INSET = 6;

const BAND = restBand(TRAVEL.from, TRAVEL.to, BAND_EPSILON);
const comma = (value: number, decimals: number) => formatNumber(value, { precision: decimals });
const PERCENT = `${comma(BAND_EPSILON * 100, 0)} %`;
const TARGET_LABEL = String.raw`$x_\text{obj}$ ± ${PERCENT}`;
const timeAxis = { xLabel: '$t$', xUnit: 's' } as const;
const positionAxis = { yLabel: '$x$', yUnit: 'px' } as const;

/** The rest band x_obj ± 2 % across the plot, the target line and its label at the right. */
function TargetBand({ x, y }: Scales): JSX.Element {
  const [left, right] = x.range;
  const top = y.toPx(BAND.high);
  const target = y.toPx(TRAVEL.to);
  return (
    <g className="pointer-events-none">
      <rect
        data-band="reposo"
        x={left}
        y={top}
        width={right - left}
        height={y.toPx(BAND.low) - top}
        fill={TICK_COLOR}
        fillOpacity={BAND_OPACITY}
      />
      <line
        x1={left}
        x2={right}
        y1={target}
        y2={target}
        stroke={TICK_COLOR}
        strokeDasharray={GUIDE_DASH}
      />
      <Label at={{ x: right, y: top }} dx={-LABEL_INSET} dy={-LABEL_RISE} anchor="end">
        {TARGET_LABEL}
      </Label>
    </g>
  );
}

/** A dashed vertical guide at time t, with its label at the top. */
function TimeGuide({ x, y, t, label, mark }: Scales & { t: number; label: string; mark: string }) {
  const [bottom, top] = y.range;
  const at = x.toPx(t);
  return (
    <g data-mark={mark} className="pointer-events-none">
      <line x1={at} x2={at} y1={top} y2={bottom} stroke={TICK_COLOR} strokeDasharray={GUIDE_DASH} />
      <Label
        at={{ x: at, y: top }}
        dx={LABEL_INSET}
        dy={2 * LABEL_RISE + LABEL_INSET}
        anchor="start"
      >
        {label}
      </Label>
    </g>
  );
}

const LIBRE_PERIOD = `$T_0$ = ${comma(LIBRE.period, 2)} s`;

function LibrePlot(): JSX.Element {
  return (
    <div data-testid="spring-figure-libre">
      <SvgPlot
        aspectRatio={ASPECT}
        title="Valor animado por un resorte sin amortiguamiento"
        {...timeAxis}
        {...positionAxis}
        series={[
          {
            id: 'sin-amortiguar',
            label: 'Sin amortiguar',
            points: LIBRE.curve,
            color: REGIME_COLORS['sin-amortiguar'],
          },
        ]}
        xDomain={{ min: 0, max: LIBRE.tEnd }}
        yDomain={LIBRE_DOMAIN}
        overlay={(scales) => (
          <>
            <TargetBand {...scales} />
            <PlotPoints
              points={[
                {
                  id: 'periodo',
                  x: LIBRE.period,
                  y: TRAVEL.from,
                  label: LIBRE_PERIOD,
                  side: 1,
                  color: REGIME_COLORS['sin-amortiguar'],
                },
              ]}
              scales={scales}
            />
          </>
        )}
        ariaLabel={mathTextToString(
          `Valor x frente al tiempo con k = 100 N/m, m = 1 kg y b = 0, de ${TRAVEL.from} hacia ${TRAVEL.to}: un coseno que oscila entre ${TRAVEL.from} y ${2 * TRAVEL.to - TRAVEL.from}, vuelve al punto de partida cada T_0 = ${comma(LIBRE.period, 2)} s y nunca se queda en la banda de ±${PERCENT} del destino.`,
        )}
      />
    </div>
  );
}

/** The two envelope branches as one dashed series, apart at a gap. */
const ENVELOPE: XY[] = [
  ...AMORTIGUADO.envelope.upper,
  { x: Number.NaN, y: Number.NaN },
  ...AMORTIGUADO.envelope.lower,
];
const SETTLING_LABEL = `$t$ = ${comma(AMORTIGUADO.settling, 2)} s`;

function AmortiguadoPlot(): JSX.Element {
  const color = REGIME_COLORS.subamortiguado;
  return (
    <div data-testid="spring-figure-amortiguado">
      <SvgPlot
        aspectRatio={ASPECT}
        title="Valor animado por el resorte por omisión de Motion y su envolvente"
        {...timeAxis}
        {...positionAxis}
        series={[
          {
            id: 'amortiguado',
            label: String.raw`Motion por omisión, $\zeta$ = 0,5`,
            points: AMORTIGUADO.curve,
            color,
          },
          {
            id: 'envolvente',
            label: String.raw`Envolvente $x_\text{obj} \pm A_0 e^{-(b/2m)\,t}$`,
            points: ENVELOPE,
            color,
            dashed: true,
          },
        ]}
        xDomain={{ min: 0, max: AMORTIGUADO.tEnd }}
        yDomain={WIDE_DOMAIN}
        overlay={(scales) => (
          <>
            <TargetBand {...scales} />
            <TimeGuide
              {...scales}
              t={AMORTIGUADO.settling}
              label={SETTLING_LABEL}
              mark="asentamiento"
            />
          </>
        )}
        ariaLabel={mathTextToString(
          `Valor x frente al tiempo con k = 100 N/m, b = 10 N·s/m y m = 1 kg, ζ = 0,5: oscila de ${TRAVEL.from} hacia ${TRAVEL.to} con vaivenes cada vez menores, entre las dos envolventes exponenciales, y entra para siempre en la banda de ±${PERCENT} a los ${comma(AMORTIGUADO.settling, 2)} s.`,
        )}
      />
    </div>
  );
}

const REGIME_NAMES = {
  subamortiguado: 'Subamortiguado',
  critico: 'Crítico',
  sobreamortiguado: 'Sobreamortiguado',
} as const;

/** «Subamortiguado, ζ = 0,29»: ζ with two decimals, or 1 for the critical test. */
function regimeLabel(id: keyof typeof REGIME_NAMES, zeta: number): string {
  const value = zeta === 1 ? '1' : comma(zeta, 2);
  return String.raw`${REGIME_NAMES[id]}, $\zeta$ = ${value}`;
}

const REGIME_SERIES: PlotSeries[] = REGIMES.map(({ id, zeta, curve }) => ({
  id,
  label: regimeLabel(id, zeta),
  points: curve,
  color: REGIME_COLORS[id],
}));

/** Motion's expected values, as dots in each regime's color. */
const TEST_DOTS = REGIMES.flatMap(({ id, test }) =>
  test.expected.map((value, i) => ({
    id: `${id}-${i}`,
    x: i * test.stepS,
    y: value,
    color: REGIME_COLORS[id],
  })),
);

function RegimesPlot(): JSX.Element {
  const zetas = REGIMES.map(({ test }) => comma(dampingRatio(test.params), 2)).join('; ');
  return (
    <div data-testid="spring-figure-regimenes">
      <SvgPlot
        aspectRatio={ASPECT}
        title="Las tres pruebas del resorte de Motion: tres regímenes desde el mismo punto"
        {...timeAxis}
        {...positionAxis}
        series={REGIME_SERIES}
        xDomain={{ min: 0, max: REGIMES[0].curve.at(-1)?.x ?? 0 }}
        yDomain={REGIMES_DOMAIN}
        overlay={(scales) => (
          <>
            <TargetBand {...scales} />
            <PlotPoints points={TEST_DOTS} scales={scales} />
          </>
        )}
        ariaLabel={mathTextToString(
          `Valor x frente al tiempo, de ${TRAVEL.from} a ${TRAVEL.to}, para las tres pruebas de Motion (ζ = ${zetas}): el subamortiguado se pasa del destino y oscila, el crítico llega sin pasarse y el sobreamortiguado llega sin pasarse pero más tarde. Los puntos son los valores que esperan las pruebas cada 0,2 s y caen sobre las curvas.`,
        )}
      />
    </div>
  );
}

const SPRING_LABEL = 'Resorte, transición de Motion para $x$';
const BEZIER_LABEL = 'Curva de duración fija, ease-in-out';
const RETARGET_LABEL = `$t^*$ = ${comma(INTERRUPTION.tStar, 2)} s`;

function interruptionSeries(key: 'position' | 'velocity'): PlotSeries[] {
  return [
    {
      id: 'resorte',
      label: SPRING_LABEL,
      points: INTERRUPTION.spring[key],
      color: REGIME_COLORS.subamortiguado,
    },
    { id: 'bezier', label: BEZIER_LABEL, points: INTERRUPTION.bezier[key], color: BEZIER_COLOR },
  ];
}

/** The target, 1 000 until the retarget and 100 after it, as a dashed step. */
function TargetStep({ x, y }: Scales): JSX.Element {
  const [left, right] = x.range;
  const at = x.toPx(INTERRUPTION.tStar);
  const [high, low] = [y.toPx(TRAVEL.to), y.toPx(TRAVEL.from)];
  return (
    <path
      data-mark="destino"
      d={`M${left} ${high} H${at} V${low} H${right}`}
      fill="none"
      stroke={TICK_COLOR}
      strokeDasharray={GUIDE_DASH}
      className="pointer-events-none"
    />
  );
}

const speed = (value: number) => formatNumber(Math.round(value), { precision: 0 });

function InterruptionPlots(): JSX.Element {
  const { spring, bezier, duration } = INTERRUPTION;
  const retarget = (scales: Scales) => (
    <TimeGuide {...scales} t={INTERRUPTION.tStar} label={RETARGET_LABEL} mark="interrupcion" />
  );
  return (
    <div data-testid="spring-figure-interrupcion" className="flex flex-col gap-4">
      <SvgPlot
        aspectRatio={ASPECT}
        title="Posición al interrumpir: el resorte frente a una curva de duración fija"
        {...timeAxis}
        {...positionAxis}
        series={interruptionSeries('position')}
        xDomain={{ min: 0, max: INTERRUPTION.tEnd }}
        yDomain={POSITION_DOMAIN}
        overlay={(scales) => (
          <>
            <TargetStep {...scales} />
            {retarget(scales)}
          </>
        )}
        ariaLabel={mathTextToString(
          `Posición x frente al tiempo. Los dos parten de ${TRAVEL.from} hacia ${TRAVEL.to}; la curva ease-in-out dura ${comma(duration, 2)} s. A los t* = ${comma(INTERRUPTION.tStar, 2)} s el destino vuelve a ${TRAVEL.from}: el resorte sigue un poco hacia arriba y vuelve sin esquina; la curva da la vuelta en seco desde donde estaba.`,
        )}
      />
      <SvgPlot
        aspectRatio={ASPECT}
        title="Velocidad al interrumpir: la del resorte es continua, la de la curva salta"
        {...timeAxis}
        yLabel="$v$"
        yUnit="px/s"
        series={interruptionSeries('velocity')}
        xDomain={{ min: 0, max: INTERRUPTION.tEnd }}
        yDomain={VELOCITY_DOMAIN}
        overlay={retarget}
        ariaLabel={mathTextToString(
          `Velocidad v frente al tiempo. En t* = ${comma(INTERRUPTION.tStar, 2)} s la velocidad del resorte sigue en ${speed(spring.jump.before)} px/s, sin salto; la de la curva cae a 0 desde ${speed(bezier.jump.before)} px/s, porque una curva con duración arranca siempre desde el reposo.`,
        )}
      />
    </div>
  );
}

/** The static figures of Tema 10's four steps. */
export default function SpringFigure({ variant }: SpringFigureProps): JSX.Element {
  switch (variant) {
    case 'libre':
      return <LibrePlot />;
    case 'amortiguado':
      return <AmortiguadoPlot />;
    case 'regimenes':
      return <RegimesPlot />;
    case 'interrupcion':
      return <InterruptionPlots />;
  }
}
