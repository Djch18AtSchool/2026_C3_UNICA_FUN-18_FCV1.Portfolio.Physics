import {
  gripVsTemperature,
  loadSensitiveMu,
  maxLateralForce,
  type TemperatureModel,
} from '../physics';

/**
 * Model parameters with the place they come from. `illustrative` marks values chosen by the
 * author (not printed in any source); the figure source line must say so.
 */
export interface DocumentedParams<T> {
  values: T;
  sourceLabel: string;
  illustrative: boolean;
}

export interface TemperatureRow {
  t: number;
  mu: number;
}

export interface LoadRow {
  fz: number;
  linear: number;
  real: number;
  muEff: number;
}

/**
 * Working range of Pirelli's 2019 C3 compound (13-inch tyres), from the table published by
 * Autosport (Noble, 2019-06-06); docs/superpowers/research/2026-10-08-sources.md, section 10.
 */
export const WORKING_WINDOW: DocumentedParams<{ from: number; to: number }> = {
  values: { from: 105, to: 135 },
  sourceLabel:
    'Autosport (Noble, 2019): rango de trabajo del compuesto C3 de Pirelli de 2019, generación de 13 pulgadas',
  illustrative: false,
};

/** Isola (Pirelli): the operating range is, by convention, "the peak grip minus 3 %". */
const ISOLA_GRIP_FRACTION = 0.97;
/** Peak grip of the illustrative slick; the order of magnitude, not a measured value. */
const ILLUSTRATIVE_MU_PEAK = 1.8;

const WINDOW_CENTRE = (WORKING_WINDOW.values.from + WORKING_WINDOW.values.to) / 2;
const WINDOW_HALF_WIDTH = (WORKING_WINDOW.values.to - WORKING_WINDOW.values.from) / 2;
/**
 * Gaussian width that puts 97 % of the peak at both window edges:
 * exp(−h²/(2w²)) = 0,97  ⇒  w = h / √(−2 ln 0,97) = 15 / 0,2468 ≈ 60,8 °C.
 * Both sides share it: with the optimum at the centre, a narrower hot side would leave
 * 135 °C below the 97 % line (0,946 μ_peak for w = 45 °C) and break the cited window.
 */
const WINDOW_WIDTH = WINDOW_HALF_WIDTH / Math.sqrt(-2 * Math.log(ISOLA_GRIP_FRACTION));

export const TEMPERATURE_MODEL: DocumentedParams<TemperatureModel> = {
  values: {
    muPeak: ILLUSTRATIVE_MU_PEAK,
    tOpt: WINDOW_CENTRE,
    widthBelow: WINDOW_WIDTH,
    widthAbove: WINDOW_WIDTH,
  },
  sourceLabel:
    'Curva ilustrativa del autor: μ_pico = 1,8 y anchos ajustados para que μ caiga un 3 % (definición de Isola, Pirelli) en los bordes de la ventana del C3 de 2019',
  illustrative: true,
};

export const LOAD_MODEL: DocumentedParams<{ mu0: number; fz0: number; exponent: number }> = {
  values: { mu0: 1.6, fz0: 4000, exponent: 0.9 },
  sourceLabel:
    'Ley de potencia del autor con parámetros ilustrativos, inspirada en la sensibilidad a la carga de Milliken y Milliken (1995) y en el exponente LS_EXPY del tyres.ini del equipo MUR',
  illustrative: true,
};

/** Evenly spaced values from `from` to `to`; counts by index so the steps do not drift. */
function samplePoints(from: number, to: number, step: number): number[] {
  if (!(step > 0)) throw new RangeError(`El paso debe ser positivo (recibido ${step})`);
  if (!(to >= from)) throw new RangeError(`El rango va hacia atrás: ${from} → ${to}`);
  const count = Math.floor((to - from) / step + 1e-9) + 1;
  return Array.from({ length: count }, (_, i) => from + i * step);
}

/** Grip coefficient μ(T) of TEMPERATURE_MODEL, sampled in °C. */
export function temperatureSeries(from: number, to: number, step: number): TemperatureRow[] {
  return samplePoints(from, to, step).map((t) => ({
    t,
    mu: gripVsTemperature(TEMPERATURE_MODEL.values, t),
  }));
}

/**
 * Peak lateral force against vertical load (N): the class model μ₀ F_z and the load-sensitive
 * one μ(F_z) F_z. At zero load both forces are zero and the effective μ is undefined (NaN):
 * μ₀ (F_z/F_z0)^(n−1) grows without bound as F_z → 0 when n < 1.
 */
export function loadSeries(from: number, to: number, step: number): LoadRow[] {
  if (from < 0) throw new RangeError(`La carga vertical no puede ser negativa (recibido ${from})`);
  const { mu0, fz0, exponent } = LOAD_MODEL.values;
  return samplePoints(from, to, step).map((fz) => {
    if (fz === 0) return { fz, linear: 0, real: 0, muEff: Number.NaN };
    return {
      fz,
      linear: mu0 * fz,
      real: maxLateralForce(mu0, fz, fz0, exponent),
      muEff: loadSensitiveMu(mu0, fz, fz0, exponent),
    };
  });
}
