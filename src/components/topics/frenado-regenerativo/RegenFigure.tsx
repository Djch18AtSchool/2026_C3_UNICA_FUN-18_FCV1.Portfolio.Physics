import type { JSX } from 'react';
import { DRIVE_CYCLES } from '../../../lib/data/driveCycles';
import { MODEL3_LR_RWD_2025 } from '../../../lib/data/evModels';
import { formatNumber } from '../../../lib/format';
import { cycleBalance, DEFAULT_REGEN } from '../../../lib/physics/energy';
import { regenModelText } from '../../../lib/physics/regenModelText';
import { useElementWidth } from '../../hooks/useElementWidth';
import { PlotPoints, type PlotPoint } from '../../lab/PlotPoints';
import type { Scale } from '../../lab/plotScales';
import SvgPlot from '../../lab/SvgPlot';
import {
  brakingWindow,
  energyColor,
  KINETIC_COLOR,
  kineticEnergyFigure,
  largestBrakingEvent,
  NO_FADE_REGEN,
  ROAD_LOAD_MAX_SPEED,
  roadLoadCrossover,
  roadLoadTerms,
  STATE_COLOR,
  toKmh,
  type Point,
} from './regenFigures';

export type RegenFigureVariant = 'energia-cinetica' | 'carga-carretera' | 'frenada';

export interface RegenFigureProps {
  variant: RegenFigureVariant;
}

const CAR = MODEL3_LR_RWD_2025;
const UDDS = DRIVE_CYCLES.udds.samples;

/** Wide figures keep the plotter's 1,6; phones get a squarer plot so the curves keep height. */
const WIDE_ASPECT = 1.6;
const COMPACT_ASPECT = 0.9;
const COMPACT_WIDTH = 480;
const FALLBACK_WIDTH = 720;
/** Room above the highest K for the label of the largest drop, rounded up to 50 kJ. */
const KINETIC_HEADROOM = 1.25;
const KINETIC_ROUND_KJ = 50;
/** Opacity of the stacked areas of step 3: the lines on their top edges stay legible. */
const AREA_OPACITY = 0.3;

const kj = (joules: number) => formatNumber(joules / 1000, { precision: 0, unit: 'kJ' });
const newtons = (value: number) => formatNumber(value, { precision: 0, unit: 'N' });

/** A wrapper ref and the aspect ratio for its measured width: squarer below 480 px. */
function usePlotAspect() {
  const [ref, width] = useElementWidth<HTMLDivElement>(FALLBACK_WIDTH);
  return { ref, aspectRatio: width < COMPACT_WIDTH ? COMPACT_ASPECT : WIDE_ASPECT };
}

/** Figure of step 1: K(t) over the first 200 s of the UDDS, each fall of K drawn in ink. */
function KineticFigure(): JSX.Element {
  const { ref, aspectRatio } = usePlotAspect();
  const figure = kineticEnergyFigure(UDDS, CAR.m);
  const { largest } = figure;
  const peak = Math.max(...figure.k.map((p) => p.y));
  const top = Math.ceil((peak * KINETIC_HEADROOM) / KINETIC_ROUND_KJ) * KINETIC_ROUND_KJ;
  const label: PlotPoint = {
    id: 'mayor',
    x: largest.tStart,
    y: figure.k.find((p) => p.x === largest.tStart)?.y ?? 0,
    label: `−${kj(largest.drop)} en ${largest.tEnd - largest.tStart} s`,
    anchor: 'start',
  };
  return (
    <div ref={ref} data-testid="regen-figure-energia-cinetica">
      <SvgPlot
        aspectRatio={aspectRatio}
        title="Energía cinética del Model 3 en los primeros 200 s del ciclo UDDS"
        xLabel="Tiempo t"
        xUnit="s"
        yLabel="Energía cinética K"
        yUnit="kJ"
        xDomain={{ min: 0, max: figure.k[figure.k.length - 1].x }}
        yDomain={{ min: 0, max: top }}
        series={[
          {
            id: 'k',
            label: 'Energía cinética K = ½ m v²',
            points: figure.k,
            color: KINETIC_COLOR,
          },
          { id: 'frenadas', label: 'Frenadas: K baja', points: figure.drops, color: STATE_COLOR },
        ]}
        overlay={(scales) => <PlotPoints points={[label]} scales={scales} />}
        ariaLabel={`K(t) del auto, de ${formatNumber(CAR.m, { precision: 2, unit: 'kg' })}, en los primeros 200 s del UDDS: K baja en ${figure.events.length} desaceleraciones; la mayor, de ${largest.tStart} a ${largest.tEnd} s, desde ${formatNumber(toKmh(largest.vStart), { precision: 0, unit: 'km/h' })} hasta detenerse, quita ${kj(largest.drop)}.`}
      />
    </div>
  );
}

/** Figure of step 2: F_RL(v) and its three terms with the Model 3's EPA target coefficients. */
function RoadLoadFigure(): JSX.Element {
  const { ref, aspectRatio } = usePlotAspect();
  const { A, B, C } = CAR.roadLoad;
  const terms = roadLoadTerms(CAR.roadLoad);
  const crossover = roadLoadCrossover(CAR.roadLoad);
  const atTop = terms.total[terms.total.length - 1];
  const point: PlotPoint = {
    id: 'cruce',
    x: crossover,
    y: A,
    label: `Cv² = A a ${formatNumber(crossover, { precision: 1, unit: 'm/s' })}`,
    anchor: 'end',
  };
  return (
    <div ref={ref} data-testid="regen-figure-carga-carretera">
      <SvgPlot
        aspectRatio={aspectRatio}
        title="Fuerza de carga en carretera del Model 3 y sus tres términos"
        xLabel="Velocidad v"
        xUnit="m/s"
        yLabel="Fuerza F_RL"
        yUnit="N"
        xDomain={{ min: 0, max: ROAD_LOAD_MAX_SPEED }}
        series={[
          {
            id: 'total',
            label: 'F_RL = A + Bv + Cv²',
            points: terms.total,
            color: STATE_COLOR,
          },
          {
            id: 'rodadura',
            label: `A = ${formatNumber(A, { precision: 2, unit: 'N' })} (rodadura)`,
            points: terms.rolling,
            color: 'var(--chart-5)',
            dashed: true,
          },
          {
            id: 'lineal',
            label: `Bv, B = ${formatNumber(B, { precision: 4, unit: 'N·s/m' })}`,
            points: terms.linear,
            color: 'var(--fg-muted)',
            dashed: true,
          },
          {
            id: 'aire',
            label: `Cv², C = ${formatNumber(C, { precision: 5, unit: 'N·s²/m²' })} (aire)`,
            points: terms.aero,
            color: 'var(--chart-1)',
            dashed: true,
          },
        ]}
        overlay={(scales) => <PlotPoints points={[point]} scales={scales} />}
        ariaLabel={`Con los coeficientes de la EPA del Model 3, F_RL vale ${newtons(A)} en reposo y ${newtons(atTop.y)} a ${formatNumber(atTop.x, { precision: 0, unit: 'm/s' })}; el término del aire, Cv², supera al constante, A, desde ${formatNumber(crossover, { precision: 1, unit: 'm/s' })}.`}
      />
    </div>
  );
}

/** A closed area between two stair series of the same length (upper forward, lower back). */
function bandPath(upper: Point[], lower: Point[], { x, y }: { x: Scale; y: Scale }): string {
  const forward = upper.map((p) => `${x.toPx(p.x)} ${y.toPx(p.y)}`);
  const back = [...lower].reverse().map((p) => `${x.toPx(p.x)} ${y.toPx(p.y)}`);
  return `M${[...forward, ...back].join(' L')} Z`;
}

/**
 * Figure of step 3: the UDDS stop with the most brake energy under the site's model (f(v) on).
 * The stack's outer edge is P_freno; under it, the battery, the conversion loss and the friction
 * heat; the dashed green line is what the battery would get without f(v), the contrast.
 */
function BrakingFigure(): JSX.Element {
  const { ref, aspectRatio } = usePlotAspect();
  const { steps } = cycleBalance(UDDS, CAR, DEFAULT_REGEN);
  const event = largestBrakingEvent(steps);
  const stop = brakingWindow(steps, event, DEFAULT_REGEN.eta);
  const noFade = brakingWindow(
    cycleBalance(UDDS, CAR, NO_FADE_REGEN).steps,
    event,
    NO_FADE_REGEN.eta,
  );
  const zero = stop.brake.map((p) => ({ x: p.x, y: 0 }));
  const { brake, battery, losses, friction } = stop.energies;
  const [tStart, tEnd] = [steps[event.start].t, steps[event.end].t];
  const areas = [
    { id: 'bateria', upper: stop.battery, lower: zero, color: energyColor('eBattery') },
    {
      id: 'perdidas',
      upper: stop.regen,
      lower: stop.battery,
      color: energyColor('eConversionLoss'),
    },
    { id: 'friccion', upper: stop.brake, lower: stop.regen, color: energyColor('eFriction') },
  ];
  return (
    <div ref={ref} data-testid="regen-figure-frenada">
      <SvgPlot
        aspectRatio={aspectRatio}
        title={`Potencia de frenado en la mayor frenada del UDDS (de ${tStart} a ${tEnd} s), modelo del sitio: ${regenModelText(DEFAULT_REGEN)}`}
        xLabel="Tiempo t"
        xUnit="s"
        yLabel="Potencia P"
        yUnit="kW"
        xDomain={{ min: stop.brake[0].x, max: stop.brake[stop.brake.length - 1].x }}
        series={[
          {
            id: 'friccion',
            label: 'Calor de fricción: P_freno − P_regen',
            points: stop.brake,
            color: energyColor('eFriction'),
          },
          {
            id: 'perdidas',
            label: 'Pérdidas de conversión: (1 − η) P_regen',
            points: stop.regen,
            color: energyColor('eConversionLoss'),
          },
          {
            id: 'bateria',
            label: 'A la batería: η P_regen',
            points: stop.battery,
            color: energyColor('eBattery'),
          },
          {
            id: 'sin-fv',
            label: 'A la batería sin f(v), contraste',
            points: noFade.battery,
            color: energyColor('eBattery'),
            dashed: true,
          },
          {
            id: 'freno',
            label: 'Borde superior: P_freno, frenado en las ruedas',
            points: stop.brake,
            color: energyColor('eBrake'),
          },
        ]}
        overlay={(scales) => (
          <g className="pointer-events-none" fillOpacity={AREA_OPACITY} stroke="none">
            {areas.map((area) => (
              <path
                key={area.id}
                data-area={area.id}
                d={bandPath(area.upper, area.lower, scales)}
                fill={area.color}
              />
            ))}
          </g>
        )}
        ariaLabel={`Frenada de ${tStart} a ${tEnd} s del UDDS, desde ${formatNumber(toKmh(steps[event.start].v), { precision: 0, unit: 'km/h' })}: ${kj(brake)} de frenado en las ruedas; ${kj(battery)} llegan a la batería, ${kj(losses)} se pierden en la conversión y ${kj(friction)} los disipa la fricción, sobre todo al final, cuando f(v) apaga la regeneración a baja velocidad. Sin f(v) la batería recibiría ${kj(noFade.energies.battery)} y no habría fricción.`}
      />
    </div>
  );
}

/** The static figures of Tema 6, steps 1 to 3. */
export default function RegenFigure({ variant }: RegenFigureProps): JSX.Element {
  switch (variant) {
    case 'energia-cinetica':
      return <KineticFigure />;
    case 'carga-carretera':
      return <RoadLoadFigure />;
    case 'frenada':
      return <BrakingFigure />;
  }
}
