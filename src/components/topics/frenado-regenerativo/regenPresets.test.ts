import { describe, expect, test, vi } from 'vitest';
import { DEFAULT_REGEN } from '../../../lib/physics/energy';
import type { SimClock } from '../../lab/useSimClock';
import { regenLocalSettings } from './regenLabSettings';
import {
  INITIAL_REGEN_STATE,
  presetIdFor,
  REGEN_PRESETS,
  regenParams,
  VEHICLES,
} from './regenPresets';

describe('regen presets', () => {
  test('the five presets of the plan, in order, each recognised by its own values', () => {
    expect(REGEN_PRESETS.map((preset) => preset.name)).toEqual([
      'Model 3 · ciudad (UDDS)',
      'Model 3 · carretera (HWFET)',
      'Model 3 · agresivo (US06)',
      'Batería fría o llena ($P_\\text{máx}$ 10 kW)',
      'Nissan LEAF 2025 · ciudad',
    ]);
    for (const preset of REGEN_PRESETS) expect(presetIdFor(preset.values)).toBe(preset.id);
  });

  test('five presets make a select, so the one with a formula has a plain option label and a source link', () => {
    const cold = REGEN_PRESETS.find((preset) => preset.id === 'cold-battery');

    expect(cold?.name).toContain('$');
    expect(cold?.optionLabel).toBe('Batería fría o llena (Pmáx 10 kW)');
    expect(cold?.optionLabel).not.toContain('$');
    for (const preset of REGEN_PRESETS.filter(({ id }) => id !== 'cold-battery')) {
      expect(preset.optionLabel).toBeUndefined();
    }
    expect(REGEN_PRESETS.map((preset) => preset.sourceUrl)).toEqual([
      VEHICLES.model3.source.url,
      VEHICLES.model3.source.url,
      VEHICLES.model3.source.url,
      undefined,
      VEHICLES.leaf.source.url,
    ]);
  });

  test('every note is one sentence for the one-line note under the choice', () => {
    for (const { note } of REGEN_PRESETS) {
      expect(note?.match(/[.!?](\s|$)/g)).toHaveLength(1);
    }
  });

  test('the lab opens on the site model: Model 3, UDDS, η 0,80, 239 kW, f(v) on', () => {
    expect(INITIAL_REGEN_STATE).toEqual({
      vehicle: 'model3',
      cycle: 'udds',
      eta: 0.8,
      pMaxKw: 239,
      lowSpeedFade: true,
    });
    expect(regenParams(INITIAL_REGEN_STATE)).toEqual(DEFAULT_REGEN);
    expect(VEHICLES.leaf.name).toBe('Nissan LEAF 2025');
  });

  test('a moved parameter matches no preset', () => {
    expect(presetIdFor({ ...INITIAL_REGEN_STATE, eta: 0.79 })).toBeUndefined();
    expect(presetIdFor({ ...INITIAL_REGEN_STATE, lowSpeedFade: false })).toBeUndefined();
  });
});

describe('regenLocalSettings', () => {
  const clock = {
    state: { t: 0, duration: 1369, playing: false, speed: 1, loop: false },
    setSpeed: vi.fn(),
    setLoop: vi.fn(),
  } as unknown as SimClock;

  test('offers the three cycles, f(v), speed and repeat; an unknown cycle value is ignored', () => {
    const onCycleChange = vi.fn();
    const settings = regenLocalSettings({
      cycle: 'udds',
      lowSpeedFade: false,
      onCycleChange,
      onFadeChange: vi.fn(),
      clock,
    });

    expect(settings.map((setting) => setting.key)).toEqual([
      'cycle',
      'lowSpeedFade',
      'speed',
      'loop',
    ]);
    const cycle = settings[0];
    if (cycle.kind !== 'select') throw new Error('the cycle is a select');
    cycle.onChange('wltc');
    expect(onCycleChange).not.toHaveBeenCalled();
    cycle.onChange('us06');
    expect(onCycleChange).toHaveBeenCalledWith('us06');
  });
});
