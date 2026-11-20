import { useEffect, useMemo } from 'react';
import { useSimClock, type SimClock } from '../../lab/useSimClock';
import { activeModel, type ActiveModel } from './bridgeFrames';
import type { ResonanceSettings } from './resonancePresets';

/** The settings of the mode in view: only they rebuild its run. */
function modeSettings(settings: ResonanceSettings) {
  if (settings.mode === 'barrido') return settings.sweep;
  return settings.mode === 'tropa' ? settings.troop : settings.zv;
}

/**
 * The run of the mode in view and its clock: computed once per change of that mode's settings
 * (nothing is integrated per frame), on a clock of the run's length and time scale, rewound to
 * t = 0 whenever the run changes (a new sweep, troop or push).
 */
export function useResonanceRun(settings: ResonanceSettings): {
  active: ActiveModel;
  clock: SimClock;
} {
  const values = modeSettings(settings);
  // Keyed on the mode's own values, not on the whole settings: a change elsewhere keeps the run.
  const active = useMemo(() => activeModel(settings), [settings.mode, values]);
  const clock = useSimClock(active.duration, { timeScale: active.timeScale });
  const { reset } = clock;
  useEffect(() => reset(), [active, reset]);
  return { active, clock };
}
