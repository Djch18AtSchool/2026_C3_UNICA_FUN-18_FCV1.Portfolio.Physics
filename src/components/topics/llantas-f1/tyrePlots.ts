/**
 * Axes, domains and series of Tema 4's two plots (μ against temperature, F_y against load),
 * shared by the static figures of steps 2–3 and the laboratory of step 4.
 */
import {
  COMPOUND_WINDOWS,
  loadSeries,
  temperatureSeries,
  type Compound,
} from '../../../lib/data/tyreModels';
import { CHART_COLORS } from '../../charts/chartTheme';
import { useElementWidth } from '../../hooks/useElementWidth';
import type { SvgPlotProps } from '../../lab/SvgPlot';
import { LOAD_DOMAIN, TEMPERATURE_DOMAIN, windowLabel } from './tyreLabModel';

/** μ(T) and the linear model wear chart 1 (the linear one dashed); the real curve, chart 2. */
export const MU_COLOR = CHART_COLORS[0];
export const LINEAR_COLOR = CHART_COLORS[0];
export const REAL_COLOR = CHART_COLORS[1];

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

/** μ(T) of a compound's bell over 40–160 °C, with its 2019 working window as a band. */
export function temperaturePlot(compound: Compound): PlotFrame {
  const rows = temperatureSeries(
    TEMPERATURE_DOMAIN.min,
    TEMPERATURE_DOMAIN.max,
    TEMPERATURE_SAMPLE_STEP,
    compound,
  );
  return {
    xLabel: TEMPERATURE_AXIS.label,
    xUnit: TEMPERATURE_AXIS.unit,
    yLabel: 'Coeficiente μ',
    yUnit: 'adimensional',
    xDomain: TEMPERATURE_DOMAIN,
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
      // Along the bottom, clear of the lab's cursor knob and label at the top.
      { ...COMPOUND_WINDOWS[compound].values, label: windowLabel(compound), labelAt: 'bottom' },
    ],
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
