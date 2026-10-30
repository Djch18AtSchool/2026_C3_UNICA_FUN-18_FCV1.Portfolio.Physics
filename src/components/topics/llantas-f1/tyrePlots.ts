/**
 * Axes, domains and series of Tema 4's two plots (μ against temperature, F_y against load),
 * shared by the static figures of steps 2–3 and the laboratory of step 4, plus the measured
 * series of Figura 4.3: the temperature table of MUR's tyres.ini.
 */
import {
  COMPOUND_WINDOWS,
  gripCurvePoints,
  loadSeries,
  temperatureSeries,
  type Compound,
} from '../../../lib/data/tyreModels';
import { CHART_COLORS } from '../../charts/chartTheme';
import { useElementWidth } from '../../hooks/useElementWidth';
import type { Domain, PlotSeries, SvgPlotProps } from '../../lab/SvgPlot';
import { LOAD_DOMAIN, TEMPERATURE_DOMAIN, windowLabel } from './tyreLabModel';

/**
 * Models wear chart 1 (μ(T) and the linear load model, the latter dashed); what is real wears
 * chart 2: the load-sensitive curve and the pairs read from MUR's file.
 */
export const MU_COLOR = CHART_COLORS[0];
export const LINEAR_COLOR = CHART_COLORS[0];
export const REAL_COLOR = CHART_COLORS[1];
export const GRIP_CURVE_COLOR = CHART_COLORS[1];
/** The temperatures the six quoted pairs of tcurve_F3soft.lut span (the file itself reaches 300). */
export const GRIP_CURVE_DOMAIN: Readonly<Domain> = { min: 0, max: 240 };
export const GRIP_CURVE_SERIES_ID = 'lut-mur';

/** μ from 0 to 2, as v1's chart A; F_y to 16 000 N, a round top above μ₀ · 10 000 N. */
const MU_DOMAIN = { min: 0, max: 2 } as const;
const FORCE_DOMAIN = { min: 0, max: 16000 } as const;
const TEMPERATURE_SAMPLE_STEP = 1;
const LOAD_SAMPLE_STEP = 100;

type PlotFrame = Pick<
  SvgPlotProps,
  'xLabel' | 'xUnit' | 'yLabel' | 'yUnit' | 'series' | 'xDomain' | 'yDomain' | 'bands'
>;

export const TEMPERATURE_AXIS = { label: 'Temperatura T', unit: '°C' } as const;
export const LOAD_AXIS = { label: 'Carga vertical F_z', unit: 'N' } as const;

/**
 * μ(T) of a compound's bell, with its 2019 working window as a band, over the lab's 40–160 °C
 * unless another domain is given (the static figure widens it to the file's 0–240).
 */
export function temperaturePlot(
  compound: Compound,
  domain: Readonly<Domain> = TEMPERATURE_DOMAIN,
): PlotFrame {
  const rows = temperatureSeries(domain.min, domain.max, TEMPERATURE_SAMPLE_STEP, compound);
  return {
    xLabel: TEMPERATURE_AXIS.label,
    xUnit: TEMPERATURE_AXIS.unit,
    yLabel: 'Coeficiente μ',
    yUnit: 'adimensional',
    xDomain: domain,
    yDomain: MU_DOMAIN,
    series: [
      {
        id: 'mu',
        label: 'μ(T)',
        points: rows.map(({ t, mu }) => ({ x: t, y: mu })),
        color: MU_COLOR,
      },
    ],
    bands: [
      // Along the bottom, clear of the lab's cursor knob and label at the top, and before the
      // band, so the cursor at the optimum (inside the window) never crosses it.
      {
        ...COMPOUND_WINDOWS[compound].values,
        label: windowLabel(compound),
        labelAt: 'bottom',
        labelBefore: true,
      },
    ],
  };
}

/**
 * Six temperature|multiplier pairs of tcurve_F3soft.lut (MUR), scaled by the bell's μ_pico so
 * they share Figura 4.3's axis; the legend says so. Dashed: the line only joins the pairs (the
 * file does not say how the game reads between them); the pairs themselves are drawn as dots.
 */
export function gripCurveSeries(muPeak: number): PlotSeries {
  if (!(muPeak > 0)) throw new RangeError(`μ_pico debe ser positivo (recibido ${muPeak})`);
  return {
    id: GRIP_CURVE_SERIES_ID,
    label: 'tcurve_F3soft.lut de MUR, multiplicador × μ_pico',
    points: gripCurvePoints().map(({ t, multiplier }) => ({ x: t, y: multiplier * muPeak })),
    color: GRIP_CURVE_COLOR,
    dashed: true,
  };
}

/**
 * Peak lateral force over 0–10 000 N: the linear model (dashed) and the load-sensitive one. Given
 * a temperature factor f(T) = μ(T)/μ_pico, both curves are multiplied by it and the legend says
 * so; without one they are the v1 curves (the static figure).
 */
export function loadPlot(temperatureFactor?: number): PlotFrame {
  const factor = temperatureFactor ?? 1;
  const thermal = temperatureFactor === undefined ? '' : ' f(T)';
  const rows = loadSeries(LOAD_DOMAIN.min, LOAD_DOMAIN.max, LOAD_SAMPLE_STEP, factor);
  return {
    xLabel: LOAD_AXIS.label,
    xUnit: LOAD_AXIS.unit,
    yLabel: 'Fuerza lateral máx. F_y',
    yUnit: 'N',
    xDomain: LOAD_DOMAIN,
    yDomain: FORCE_DOMAIN,
    series: [
      {
        id: 'lineal',
        label: `Modelo lineal F = μ₀${thermal} F_z`,
        points: rows.map(({ fz, linear }) => ({ x: fz, y: linear })),
        color: LINEAR_COLOR,
        dashed: true,
      },
      {
        id: 'real',
        label: `Con sensibilidad a la carga, F = μ(F_z)${thermal} F_z`,
        points: rows.map(({ fz, real }) => ({ x: fz, y: real })),
        color: REAL_COLOR,
      },
    ],
  };
}

/** Below this measured width (phones) a plot gets a squarer aspect so its curves keep height. */
const COMPACT_WIDTH = 480;
const FALLBACK_WIDTH = 720;

/** A wrapper ref and the aspect ratio for its measured width: `wide` from 480 px, else `compact`. */
export function usePlotAspect(wide: number, compact: number) {
  const [ref, width] = useElementWidth<HTMLDivElement>(FALLBACK_WIDTH);
  return { ref, aspectRatio: width < COMPACT_WIDTH ? compact : wide };
}
