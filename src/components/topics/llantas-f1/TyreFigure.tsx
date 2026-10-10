import type { JSX } from 'react';
import {
  loadPoint,
  PACEJKA_EXAMPLE,
  pacejkaSeries,
  temperatureModelFor,
} from '../../../lib/data/tyreModels';
import { formatNumber } from '../../../lib/format';
import { gripVsTemperature, magicFormula, magicFormulaPeak } from '../../../lib/physics';
import { CHART_COLORS } from '../../charts/chartTheme';
import SvgPlot from '../../lab/SvgPlot';
import { BOX, boxFriction } from './tyreLabModel';
import { PlotPoints, type PlotPoint } from '../../lab/PlotPoints';
import { loadPlot, temperaturePlot, usePlotAspect } from './tyrePlots';

export type TyreFigureVariant = 'caja' | 'carga' | 'temperatura' | 'pacejka';

export interface TyreFigureProps {
  variant: TyreFigureVariant;
}

/** Wide figures keep the plotter's 1,6; phones get a squarer plot so the curves keep height. */
const WIDE_ASPECT = 1.6;
const COMPACT_ASPECT = 0.8;
/** The push axis runs past the static limit far enough to show the kinetic plateau. */
const PUSH_MAX = 60;
const BOX_FORCE_DOMAIN = { min: 0, max: 50 } as const;
const REFERENCE_LOAD = 4000;
const DOUBLE_LOAD = 8000;
const COLD = 60;
const HOT = 160;
/** Slip from 0 to 1: the peak near 0,18 and the value 0,91 at x = 1 that the text quotes. */
const SLIP_MAX = 1;
const SLIP_SAMPLE_STEP = 0.005;
const NORMALIZED_FORCE_DOMAIN = { min: 0, max: 1.2 } as const;

const newtons = (value: number) => formatNumber(value, { precision: 0, unit: 'N' });
const oneDecimal = (value: number) => formatNumber(value, { precision: 1 });
const twoDecimals = (value: number) => formatNumber(value, { precision: 2 });

function BoxPlot(): JSX.Element {
  const { ref, aspectRatio } = usePlotAspect(WIDE_ASPECT, COMPACT_ASPECT);
  const points: PlotPoint[] = [
    {
      id: 'estatico',
      x: BOX.staticLimit,
      y: BOX.staticLimit,
      label: `f_s,máx = ${oneDecimal(BOX.staticLimit)} N`,
      anchor: 'end',
    },
    {
      id: 'cinetico',
      x: PUSH_MAX - 10,
      y: BOX.kinetic,
      label: `f_k = ${oneDecimal(BOX.kinetic)} N`,
      anchor: 'end',
      side: 1,
    },
  ];
  return (
    <div ref={ref} data-testid="tyre-figure-caja">
      <SvgPlot
        aspectRatio={aspectRatio}
        title="Fricción sobre la caja de 10 kg frente a la fuerza aplicada"
        xLabel="Fuerza aplicada F"
        xUnit="N"
        yLabel="Fricción f"
        yUnit="N"
        xDomain={{ min: 0, max: PUSH_MAX }}
        yDomain={BOX_FORCE_DOMAIN}
        series={[
          {
            id: 'friccion',
            label: 'Fricción sobre la caja f',
            points: boxFriction(PUSH_MAX),
            color: CHART_COLORS[0],
          },
          {
            id: 'limite',
            label: 'Límite estático μ_s n',
            points: [
              { x: 0, y: BOX.staticLimit },
              { x: PUSH_MAX, y: BOX.staticLimit },
            ],
            color: CHART_COLORS[1],
            dashed: true,
          },
        ]}
        overlay={(scales) => <PlotPoints points={points} scales={scales} />}
        ariaLabel="La fricción estática iguala la fuerza aplicada hasta 39,2 N, el límite μ_s n; entonces la caja desliza y la fricción baja a la cinética, 29,4 N."
      />
    </div>
  );
}

function LoadFigure(): JSX.Element {
  const { ref, aspectRatio } = usePlotAspect(WIDE_ASPECT, COMPACT_ASPECT);
  const atDouble = loadPoint(DOUBLE_LOAD);
  const atReference = loadPoint(REFERENCE_LOAD);
  const points: PlotPoint[] = [
    {
      id: 'referencia',
      x: REFERENCE_LOAD,
      y: atReference.real,
      label: `${newtons(atReference.real)} a ${newtons(REFERENCE_LOAD)}`,
      // On phones the 4 000 N is read off the tick right below; the force alone fits beside.
      compactLabel: newtons(atReference.real),
      side: 1,
    },
    {
      id: 'lineal',
      x: DOUBLE_LOAD,
      y: atDouble.linear,
      label: newtons(atDouble.linear),
      anchor: 'end',
    },
    {
      id: 'real',
      x: DOUBLE_LOAD,
      y: atDouble.real,
      label: newtons(atDouble.real),
      anchor: 'start',
      side: 1,
    },
  ];
  return (
    <div ref={ref} data-testid="tyre-figure-carga">
      <SvgPlot
        aspectRatio={aspectRatio}
        title="Fuerza lateral máxima frente a la carga vertical sobre la llanta"
        {...loadPlot()}
        overlay={(scales) => <PlotPoints points={points} scales={scales} />}
        ariaLabel="El modelo lineal y el de sensibilidad a la carga se cruzan en 6 400 N a 4 000 N; a 8 000 N el lineal da 12 800 N y el real, 11 943 N."
      />
    </div>
  );
}

function TemperatureFigure(): JSX.Element {
  const { ref, aspectRatio } = usePlotAspect(WIDE_ASPECT, COMPACT_ASPECT);
  const model = temperatureModelFor('C3');
  const points: PlotPoint[] = [COLD, HOT].map((t) => ({
    id: `t-${t}`,
    x: t,
    y: gripVsTemperature(model, t),
    label: `${t} °C: ${twoDecimals(gripVsTemperature(model, t))}`,
    anchor: t === HOT ? 'end' : 'start',
    side: 1,
  }));
  return (
    <div ref={ref} data-testid="tyre-figure-temperatura">
      <SvgPlot
        aspectRatio={aspectRatio}
        title="Coeficiente de agarre μ en función de la temperatura de la banda de rodadura"
        {...temperaturePlot('C3')}
        overlay={(scales) => <PlotPoints points={points} scales={scales} />}
        ariaLabel="μ(T) es una campana con pico de 1,8 a 120 °C; dentro de la ventana del C3, de 105 a 135 °C, no baja de 1,75; a 60 °C vale 1,11 y a 160 °C, 1,45."
      />
    </div>
  );
}

function PacejkaFigure(): JSX.Element {
  const { ref, aspectRatio } = usePlotAspect(WIDE_ASPECT, COMPACT_ASPECT);
  const coefficients = PACEJKA_EXAMPLE.values;
  const peak = magicFormulaPeak(coefficients);
  const atEnd = magicFormula(SLIP_MAX, coefficients);
  const points: PlotPoint[] = [
    {
      id: 'pico',
      x: peak.x,
      y: peak.y,
      label: `Pico: x ≈ ${twoDecimals(peak.x)}; y = ${twoDecimals(peak.y)}`,
      anchor: 'start',
    },
    {
      id: 'final',
      x: SLIP_MAX,
      y: atEnd,
      label: `x = ${SLIP_MAX}: y = ${twoDecimals(atEnd)}`,
      anchor: 'end',
      side: 1,
    },
  ];
  return (
    <div ref={ref} data-testid="tyre-figure-pacejka">
      <SvgPlot
        aspectRatio={aspectRatio}
        title="Fuerza normalizada frente al deslizamiento, Fórmula Mágica con los valores de ejemplo"
        xLabel="Deslizamiento x"
        xUnit="adimensional"
        yLabel="Fuerza y"
        yUnit="adimensional"
        xDomain={{ min: 0, max: SLIP_MAX }}
        yDomain={NORMALIZED_FORCE_DOMAIN}
        series={[
          {
            id: 'pacejka',
            label: 'Fórmula Mágica, ecuación (4.4)',
            points: pacejkaSeries(SLIP_MAX, SLIP_SAMPLE_STEP),
            color: CHART_COLORS[0],
          },
        ]}
        overlay={(scales) => <PlotPoints points={points} scales={scales} />}
        ariaLabel={`La fuerza normalizada crece casi en recta, llega al pico, y = ${twoDecimals(peak.y)}, en x ≈ ${twoDecimals(peak.x)} y baja a ${twoDecimals(atEnd)} en x = ${SLIP_MAX}.`}
      />
    </div>
  );
}

/** The static figures of Tema 4: steps 1–3 and the Magic Formula of step 4. */
export default function TyreFigure({ variant }: TyreFigureProps): JSX.Element {
  switch (variant) {
    case 'caja':
      return <BoxPlot />;
    case 'carga':
      return <LoadFigure />;
    case 'temperatura':
      return <TemperatureFigure />;
    case 'pacejka':
      return <PacejkaFigure />;
  }
}
