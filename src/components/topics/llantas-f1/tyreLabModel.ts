/** State and readings of Tema 4's laboratory, and the data of the step 1 box figure. Pure. */
import {
  COMPOUND_WINDOWS,
  gripFactor,
  loadPoint,
  temperatureModelFor,
  type Compound,
} from '../../../lib/data/tyreModels';
import { G_EARTH, gripVsTemperature } from '../../../lib/physics';
import type { Domain } from '../../lab/plotScales';

export interface TyreLabState {
  /** Tread temperature, °C. */
  t: number;
  /** Vertical load on the tyre, N. */
  fz: number;
  compound: Compound;
}

/** 40–160 °C, as v1's chart A: a cold tyre, both windows and an overheated one. */
export const TEMPERATURE_DOMAIN: Readonly<Domain> = { min: 40, max: 160 };
/** 0–10 000 N, as v1's chart B: 2,5 F_z0, far enough for the two models to separate. */
export const LOAD_DOMAIN: Readonly<Domain> = { min: 0, max: 10000 };
/** Grains of the parameters and cursors, so a drag lands where the slider can show it. */
export const TEMPERATURE_STEP = 1;
export const LOAD_STEP = 50;

/** The C3 optimum (the compound v1 uses) and the reference load: the v1 numbers on opening. */
export const INITIAL_TYRE_STATE: Readonly<TyreLabState> = { t: 120, fz: 4000, compound: 'C3' };

export const COMPOUNDS: readonly Compound[] = ['C3', 'C4'];

function snap(value: number, { min, max }: Domain, step: number): number {
  const clamped = Math.min(max, Math.max(min, value));
  return Math.round(clamped / step) * step;
}

export function setTemperature(state: TyreLabState, t: number): TyreLabState {
  return { ...state, t: snap(t, TEMPERATURE_DOMAIN, TEMPERATURE_STEP) };
}

export function setLoad(state: TyreLabState, fz: number): TyreLabState {
  return { ...state, fz: snap(fz, LOAD_DOMAIN, LOAD_STEP) };
}

export function setCompound(state: TyreLabState, compound: Compound): TyreLabState {
  return { ...state, compound };
}

/** The band label of a compound's 2019 working window. */
export function windowLabel(compound: Compound): string {
  return `Ventana de trabajo ${compound} (2019)`;
}

/** "C3 (105–135 °C)", for the compound selector. */
export function compoundOptionLabel(compound: Compound): string {
  const { from, to } = COMPOUND_WINDOWS[compound].values;
  return `${compound} (${from}–${to} °C)`;
}

export interface TyreReadings {
  /** μ(T) of the compound's bell. */
  mu: number;
  /** μ(T)/μ_pico, the temperature multiplier applied to the load curves. */
  factor: number;
  linear: number;
  real: number;
  /** F_y real / F_z; NaN at zero load. */
  muEff: number;
}

/**
 * What the lab reads: μ(T) on the temperature plot and, on the load plot, both peak lateral
 * forces at F_z scaled by the temperature multiplier, so the two plots are coupled.
 */
export function tyreReadings({ t, fz, compound }: TyreLabState): TyreReadings {
  const mu = gripVsTemperature(temperatureModelFor(compound), t);
  const factor = gripFactor(compound, t);
  return { mu, factor, ...loadPoint(fz, factor) };
}

/** The class example: a 10 kg box with μ_s = 0,40 and μ_k = 0,30 on a level floor, g = 9,81. */
const BOX_MASS = 10;
const BOX_MU_S = 0.4;
const BOX_MU_K = 0.3;
const BOX_NORMAL = BOX_MASS * G_EARTH;
export const BOX = {
  mass: BOX_MASS,
  muS: BOX_MU_S,
  muK: BOX_MU_K,
  normal: BOX_NORMAL,
  staticLimit: BOX_MU_S * BOX_NORMAL,
  kinetic: BOX_MU_K * BOX_NORMAL,
} as const;

/**
 * Friction on the box against the horizontal push F: static friction matches F up to μ_s n,
 * then the box slides and friction drops to μ_k n (the textbook's f–F graph).
 */
export function boxFriction(pushMax: number): { x: number; y: number }[] {
  return [
    { x: 0, y: 0 },
    { x: BOX.staticLimit, y: BOX.staticLimit },
    { x: BOX.staticLimit, y: BOX.kinetic },
    { x: pushMax, y: BOX.kinetic },
  ];
}
