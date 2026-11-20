import { describe, expect, test } from 'vitest';
import { BROUGHTON, MARCH_PACE_HZ, STEEL_FOOTBRIDGE_DAMPING } from '../../../lib/data/bridges';
import { KLIPPER } from '../../../lib/data/klipper';
import {
  DEFAULT_SETTINGS,
  PRESET_GROUPS,
  presetIdFor,
  RESONANCE_LIMITS,
  RESONANCE_PRESETS,
  type ResonanceSettings,
} from './resonancePresets';

/** Every limited value of the mode's settings, with its limits. */
function limitedValues(settings: ResonanceSettings) {
  const values: Record<string, number> = {
    barrido: settings.sweep,
    tropa: settings.troop,
    'filtro-zv': settings.zv,
  }[settings.mode] as unknown as Record<string, number>;
  const limits = {
    barrido: RESONANCE_LIMITS.sweep,
    tropa: RESONANCE_LIMITS.troop,
    'filtro-zv': RESONANCE_LIMITS.zv,
  }[settings.mode] as Record<string, { min: number; max: number; step: number }>;
  return Object.entries(limits).map(([key, limit]) => ({ key, value: values[key], ...limit }));
}

describe('the resonance lab’s defaults', () => {
  test('open on the slow sweep with Klipper’s ζ, and keep sourced values for the other modes', () => {
    expect(DEFAULT_SETTINGS.mode).toBe('barrido');
    expect(DEFAULT_SETTINGS.sweep).toEqual({
      f0: 1,
      zeta: KLIPPER.defaultDampingRatio.value,
      sweepS: 400,
    });
    expect(DEFAULT_SETTINGS.troop).toMatchObject({
      n: BROUGHTON.soldiersOnBridge.value,
      f0: MARCH_PACE_HZ,
      zeta: STEEL_FOOTBRIDGE_DAMPING.value,
      step: 'al-paso',
    });
    expect(DEFAULT_SETTINGS.zv.fZv).toBe(DEFAULT_SETTINGS.zv.f0);
    expect(presetIdFor(DEFAULT_SETTINGS)).toBe(RESONANCE_PRESETS[0].id);
  });
});

describe('the resonance lab’s presets', () => {
  test('every value sits on its slider’s grid, inside its limits', () => {
    for (const preset of RESONANCE_PRESETS) {
      for (const { key, value, min, max, step } of limitedValues(preset.values)) {
        expect(value, `${preset.id}.${key}`).toBeGreaterThanOrEqual(min);
        expect(value, `${preset.id}.${key}`).toBeLessThanOrEqual(max);
        const steps = (value - min) / step;
        expect(Math.abs(steps - Math.round(steps)), `${preset.id}.${key}`).toBeLessThan(1e-9);
      }
    }
  });

  test('each is found again from its own values, and grouped by its mode', () => {
    for (const preset of RESONANCE_PRESETS) {
      expect(presetIdFor(preset.values)).toBe(preset.id);
      expect(preset.group).toBe(preset.values.mode);
      expect(PRESET_GROUPS.map((group) => group.id)).toContain(preset.group);
    }
  });

  test('a plain option label, a note and a source each', () => {
    for (const preset of RESONANCE_PRESETS) {
      expect(preset.name).not.toContain('$');
      expect(preset.note, preset.id).toBeTruthy();
      expect(preset.sourceLabel, preset.id).toBeTruthy();
    }
  });

  test('in step, the draw does not matter: a new seed keeps the preset', () => {
    const inStep = DEFAULT_SETTINGS.troop;
    const settings: ResonanceSettings = {
      ...DEFAULT_SETTINGS,
      mode: 'tropa',
      troop: { ...inStep, seed: inStep.seed + 1 },
    };
    expect(presetIdFor(settings)).toBe('tropa-al-paso');
    expect(presetIdFor({ ...settings, troop: { ...settings.troop, step: 'rompiendo' } })).toBe(
      undefined,
    );
  });

  test('an edit of the mode in view leaves the preset; the other modes’ values do not count', () => {
    const edited = { ...DEFAULT_SETTINGS, sweep: { ...DEFAULT_SETTINGS.sweep, f0: 1.05 } };
    expect(presetIdFor(edited)).toBeUndefined();
    const elsewhere = { ...DEFAULT_SETTINGS, zv: { ...DEFAULT_SETTINGS.zv, f0: 1.5 } };
    expect(presetIdFor(elsewhere)).toBe(RESONANCE_PRESETS[0].id);
  });

  test('the notes print the numbers the models compute', () => {
    const note = (id: string) => RESONANCE_PRESETS.find((preset) => preset.id === id)?.note ?? '';
    expect(note('barrido-lento')).toContain('$T_b$ = 400 s');
    expect(note('sin-amortiguamiento')).toContain('crece sin límite');
    expect(note('tropa-rompiendo')).toContain('$\\sqrt{60}$');
    expect(note('zv-afinado')).toContain('menos del 1 %');
    expect(note('zv-desafinado')).toMatch(/queda un 1\d,\d %/);
  });
});
