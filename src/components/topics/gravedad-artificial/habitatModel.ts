/**
 * State of the habitat lab: the (r, rpm) pair and the "fijar 1 g" mode that, while on, solves
 * one parameter from the other so that a_c = ω² r = g.
 */
import { G_EARTH, radiusForGravity, rpmForGravity } from '../../../lib/physics';
import { clamp, type Range } from '../../../lib/limits';
import { HABITAT_LIMITS, type HabitatSettings } from '../../../lib/data/habitatPresets';
import type { Preset } from '../../../lib/presets';

export type HabitatParam = 'r' | 'rpm';

export interface HabitatState {
  settings: HabitatSettings;
  /** "Fijar 1 g": each edit solves the other parameter for a_c = g. */
  isLocked: boolean;
  /** The parameter edited last; turning "fijar 1 g" on keeps it and solves the other. */
  lastEdited: HabitatParam;
  /** Set while a preset's published pair is shown as is. */
  presetId?: string;
}

/** A solved radius is rounded to 0,1 m and a solved spin to 0,001 rpm. */
const RADIUS_DECIMALS = 1;
const RPM_DECIMALS = 3;
const INITIAL_RPM = 1;

const roundTo = (value: number, decimals: number) => Number(value.toFixed(decimals));
const ceilTo = (value: number, decimals: number) =>
  Math.ceil(value * 10 ** decimals) / 10 ** decimals;

/** r = g/ω² for the given spin, rounded to 0,1 m. */
export function solveForRadius(rpm: number): HabitatSettings {
  return { r: roundTo(radiusForGravity(G_EARTH, rpm), RADIUS_DECIMALS), rpm };
}

/** rpm = (60/2π)·√(g/r) for the given radius, rounded to 0,001 rpm. */
export function solveForRpm(r: number): HabitatSettings {
  return { r, rpm: roundTo(rpmForGravity(G_EARTH, r), RPM_DECIMALS) };
}

/**
 * With 1 g fixed, the inputs are kept where the solved parameter stays inside its control:
 * at least 0,48 rpm (r ≤ 4 000 m) and at least 9 m (≤ 10 rpm).
 */
export const LOCKED_LIMITS: { r: Range; rpm: Range } = {
  r: [
    ceilTo(radiusForGravity(G_EARTH, HABITAT_LIMITS.rpm[1]), RADIUS_DECIMALS),
    HABITAT_LIMITS.r[1],
  ],
  rpm: [ceilTo(rpmForGravity(G_EARTH, HABITAT_LIMITS.r[1]), 2), HABITAT_LIMITS.rpm[1]],
};

export const INITIAL_HABITAT_STATE: HabitatState = {
  settings: solveForRadius(INITIAL_RPM),
  isLocked: true,
  lastEdited: 'rpm',
};

function solveFrom(param: HabitatParam, value: number): HabitatSettings {
  return param === 'rpm'
    ? solveForRadius(clamp(value, LOCKED_LIMITS.rpm))
    : solveForRpm(clamp(value, LOCKED_LIMITS.r));
}

function edit(state: HabitatState, param: HabitatParam, value: number): HabitatState {
  const settings = state.isLocked
    ? solveFrom(param, value)
    : { ...state.settings, [param]: clamp(value, HABITAT_LIMITS[param]) };
  return { settings, isLocked: state.isLocked, lastEdited: param };
}

/** A new spin rate; with "fijar 1 g" on, the radius follows. */
export function setRpm(state: HabitatState, rpm: number): HabitatState {
  return edit(state, 'rpm', rpm);
}

/** A new radius; with "fijar 1 g" on, the spin rate follows. */
export function setRadius(state: HabitatState, r: number): HabitatState {
  return edit(state, 'r', r);
}

/** Turning "fijar 1 g" on keeps the parameter edited last and solves the other; off keeps both. */
export function setLocked(state: HabitatState, isLocked: boolean): HabitatState {
  if (!isLocked) return { ...state, isLocked };
  const { lastEdited } = state;
  return {
    settings: solveFrom(lastEdited, state.settings[lastEdited]),
    isLocked,
    lastEdited,
  };
}

/** A preset's published pair, shown as is: "fijar 1 g" goes off so its g stays visible. */
export function applyPreset(preset: Preset<HabitatSettings>): HabitatState {
  return {
    settings: {
      r: clamp(preset.values.r, HABITAT_LIMITS.r),
      rpm: clamp(preset.values.rpm, HABITAT_LIMITS.rpm),
    },
    isLocked: false,
    lastEdited: 'rpm',
    presetId: preset.id,
  };
}
