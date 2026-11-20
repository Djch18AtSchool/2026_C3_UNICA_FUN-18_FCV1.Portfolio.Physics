import { useState, type KeyboardEvent } from 'react';
import type { SimClock } from '../../lab/useSimClock';
import type { ResonanceEdits } from './ResonanceControls';
import {
  DEFAULT_SETTINGS,
  RESONANCE_LIMITS,
  type Limit,
  type ResonancePreset,
  type ResonanceSettings,
} from './resonancePresets';
import type { ResonanceMode } from './resonanceScene';

/** Each mode's key in the settings and in RESONANCE_LIMITS. */
const KEY_OF: Readonly<Record<ResonanceMode, keyof typeof RESONANCE_LIMITS>> = {
  barrido: 'sweep',
  tropa: 'troop',
  'filtro-zv': 'zv',
};

export interface ResonanceSettingsState {
  settings: ResonanceSettings;
  edit: ResonanceEdits;
  setMode(mode: ResonanceMode): void;
  /** The mode in view's f0, which the ruler's knob moves, and its limits. */
  f0: number;
  f0Limits: Limit;
  setF0(f0: number): void;
  /** A preset sets its mode and that mode's values; the other modes keep theirs. */
  choosePreset(preset: ResonancePreset): void;
  /** Another breaking-step draw: the next seed. */
  newDraw(): void;
  reset(): void;
}

/** The lab's settings and every way they change. */
export function useResonanceSettings(): ResonanceSettingsState {
  const [settings, setSettings] = useState<ResonanceSettings>(DEFAULT_SETTINGS);
  const edit: ResonanceEdits = {
    sweep: (patch) => setSettings((prev) => ({ ...prev, sweep: { ...prev.sweep, ...patch } })),
    troop: (patch) => setSettings((prev) => ({ ...prev, troop: { ...prev.troop, ...patch } })),
    zv: (patch) => setSettings((prev) => ({ ...prev, zv: { ...prev.zv, ...patch } })),
  };
  const key = KEY_OF[settings.mode];
  return {
    settings,
    edit,
    setMode: (mode) => setSettings((prev) => ({ ...prev, mode })),
    f0: settings[key].f0,
    f0Limits: RESONANCE_LIMITS[key].f0,
    setF0: (f0) => edit[key]({ f0 }),
    choosePreset: ({ values }) => {
      const presetKey = KEY_OF[values.mode];
      setSettings((prev) => ({ ...prev, mode: values.mode, [presetKey]: values[presetKey] }));
    },
    newDraw: () => edit.troop({ seed: settings.troop.seed + 1 }),
    reset: () => setSettings(DEFAULT_SETTINGS),
  };
}

/** Keys that keep their native meaning: fields, buttons and anything inside the drawer. */
const NATIVE_KEYS_SELECTOR = 'input, select, textarea, button, a, dialog';
/** One step of «,» and «.»: a frame of 1/60 s of playback. */
const FRAMES_PER_SECOND = 60;

/**
 * The lab's shortcuts, outside the fields: Space or K plays and pauses, R rewinds, «,» and «.»
 * step one frame of playback (the time scale's seconds of the run) back or forward.
 */
export function shortcutHandler(clock: SimClock, timeScale: number) {
  return (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
    if ((event.target as Element).closest(NATIVE_KEYS_SELECTOR)) return;
    const frame = timeScale / FRAMES_PER_SECOND;
    const actions: Record<string, () => void> = {
      ' ': clock.toggle,
      k: clock.toggle,
      r: clock.reset,
      '.': () => clock.step(frame),
      ',': () => clock.step(-frame),
    };
    const action = actions[event.key.toLowerCase()];
    if (!action) return;
    event.preventDefault();
    action();
  };
}
