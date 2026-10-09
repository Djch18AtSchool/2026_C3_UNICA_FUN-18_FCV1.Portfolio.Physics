import { G_EARTH, radiusForGravity, rpmForGravity } from '../../../lib/physics';
import { clamp } from '../../../lib/limits';
import { HABITAT_LIMITS, type HabitatSettings } from '../../../lib/data/habitatPresets';

/** "radius": fix 1 g and the spin rate, solve r. "rpm": fix 1 g and r, solve the spin rate. */
export type HabitatMode = 'radius' | 'rpm';

export interface HabitatState {
  mode: HabitatMode;
  settings: HabitatSettings;
  /** Set while a preset's published (r, rpm) pair is shown as is, instead of solving for 1 g. */
  presetId?: string;
}

export const RADIUS_STEP = 5;
export const RPM_STEP = 0.1;
const INITIAL_RPM = 1;

/** Snap to the slider grain so a range input never receives a value it cannot show. */
export function snapToStep(value: number, step: number, range: readonly [number, number]): number {
  const snapped = Math.round(value / step) * step;
  return clamp(Number(snapped.toFixed(3)), range);
}

/** Mode 1: the spin rate is the input and r = g/ω² follows. */
export function solveForRadius(rpm: number): HabitatSettings {
  return { r: radiusForGravity(G_EARTH, rpm), rpm };
}

/** Mode 2: the radius is the input and ω = √(g/r) follows. */
export function solveForRpm(r: number): HabitatSettings {
  return { r, rpm: rpmForGravity(G_EARTH, r) };
}

export const INITIAL_HABITAT_STATE: HabitatState = {
  mode: 'radius',
  settings: solveForRadius(INITIAL_RPM),
};

/** Switching mode keeps the current habitat and re-solves from the new mode's input. */
export function switchMode(state: HabitatState, mode: HabitatMode): HabitatState {
  if (mode === 'radius') {
    return {
      mode,
      settings: solveForRadius(snapToStep(state.settings.rpm, RPM_STEP, HABITAT_LIMITS.rpm)),
    };
  }
  return {
    mode,
    settings: solveForRpm(snapToStep(state.settings.r, RADIUS_STEP, HABITAT_LIMITS.r)),
  };
}
