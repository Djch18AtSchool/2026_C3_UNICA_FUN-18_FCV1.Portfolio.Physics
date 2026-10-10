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

/** The two Pirelli compounds whose 2019 working ranges the Autosport table gives. */
export type Compound = 'C3' | 'C4';

type Window = { from: number; to: number };

const AUTOSPORT_LABEL = (compound: Compound) =>
  `Autosport (Noble, 2019): rango de trabajo del compuesto ${compound} de Pirelli de 2019, generación de 13 pulgadas`;

/**
 * Working ranges of Pirelli's 2019 C3 and C4 compounds (13-inch tyres), both from the table
 * published by Autosport (Noble, 2019-06-06) that the v1 text cites;
 * docs/superpowers/research/2026-10-08-sources.md, section 10.
 */
export const COMPOUND_WINDOWS: Readonly<Record<Compound, DocumentedParams<Window>>> = {
  C3: { values: { from: 105, to: 135 }, sourceLabel: AUTOSPORT_LABEL('C3'), illustrative: false },
  C4: { values: { from: 90, to: 120 }, sourceLabel: AUTOSPORT_LABEL('C4'), illustrative: false },
};

/** The C3 window, the one the v1 figures and text use. */
export const WORKING_WINDOW = COMPOUND_WINDOWS.C3;

/** Isola (Pirelli): the operating range is, by convention, "the peak grip minus 3 %". */
const ISOLA_GRIP_FRACTION = 0.97;
/** Peak grip of the illustrative slick; the order of magnitude, not a measured value. */
const ILLUSTRATIVE_MU_PEAK = 1.8;

/**
 * The illustrative bell calibrated on a compound's window: the optimum at its centre and the
 * Gaussian width that puts 97 % of the peak at both edges,
 * exp(−h²/(2w²)) = 0,97  ⇒  w = h / √(−2 ln 0,97); for a 30 °C window, 15 / 0,2468 ≈ 60,8 °C.
 * Both sides share it: with the optimum at the centre, a narrower hot side would leave the upper
 * edge below the 97 % line (0,946 μ_peak at 135 °C for w = 45 °C) and break the cited window.
 */
export function temperatureModelFor(compound: Compound): TemperatureModel {
  const { from, to } = COMPOUND_WINDOWS[compound].values;
  const width = (to - from) / 2 / Math.sqrt(-2 * Math.log(ISOLA_GRIP_FRACTION));
  return {
    muPeak: ILLUSTRATIVE_MU_PEAK,
    tOpt: (from + to) / 2,
    widthBelow: width,
    widthAbove: width,
  };
}

export const TEMPERATURE_MODEL: DocumentedParams<TemperatureModel> = {
  values: temperatureModelFor('C3'),
  sourceLabel:
    'Curva ilustrativa del autor: μ_pico = 1,8 y anchos ajustados para que μ caiga un 3 % (definición de Isola, Pirelli) en los bordes de la ventana del C3 de 2019',
  illustrative: true,
};

/**
 * The temperature multiplier μ(T)/μ_pico of a compound's bell, between 0 and 1: what a
 * `PERFORMANCE_CURVE` table of temperature|multiplier gives in Assetto Corsa's tyres.ini.
 */
export function gripFactor(compound: Compound, t: number): number {
  const model = temperatureModelFor(compound);
  return gripVsTemperature(model, t) / model.muPeak;
}

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

/** Grip coefficient μ(T) of a compound's bell (C3 by default), sampled in °C. */
export function temperatureSeries(
  from: number,
  to: number,
  step: number,
  compound: Compound = 'C3',
): TemperatureRow[] {
  const model = temperatureModelFor(compound);
  return samplePoints(from, to, step).map((t) => ({ t, mu: gripVsTemperature(model, t) }));
}

/**
 * Peak lateral force at one vertical load (N): the class model μ₀ F_z and the load-sensitive one
 * μ(F_z) F_z, both multiplied by a temperature grip factor (1 by default, the v1 curves). At zero
 * load both forces are zero and the effective μ is undefined (NaN): μ₀ (F_z/F_z0)^(n−1) grows
 * without bound as F_z → 0 when n < 1.
 */
export function loadPoint(fz: number, factor = 1): Omit<LoadRow, 'fz'> {
  if (!(fz >= 0)) throw new RangeError(`La carga vertical no puede ser negativa (recibido ${fz})`);
  if (!(factor > 0) || !Number.isFinite(factor)) {
    throw new RangeError(`El factor de agarre debe ser positivo (recibido ${factor})`);
  }
  if (fz === 0) return { linear: 0, real: 0, muEff: Number.NaN };
  const { mu0, fz0, exponent } = LOAD_MODEL.values;
  const mu = mu0 * factor;
  return {
    linear: mu * fz,
    real: maxLateralForce(mu, fz, fz0, exponent),
    muEff: loadSensitiveMu(mu, fz, fz0, exponent),
  };
}

/** loadPoint sampled from `from` to `to` N (see loadPoint for the zero-load case). */
export function loadSeries(from: number, to: number, step: number, factor = 1): LoadRow[] {
  if (from < 0) throw new RangeError(`La carga vertical no puede ser negativa (recibido ${from})`);
  return samplePoints(from, to, step).map((fz) => ({ fz, ...loadPoint(fz, factor) }));
}
