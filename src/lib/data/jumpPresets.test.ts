import { describe, expect, test } from 'vitest';
import { JUMP_LIMITS, type JumpSettings } from '../../components/topics/salto-personaje/jumpModel';
import { DEFAULT_JUMP_PRESET_ID, JUMP_PRESETS } from './jumpPresets';

const KEYS: (keyof JumpSettings)[] = ['v0', 'g', 'vx', 'fallMultiplier'];

function presetById(id: string) {
  const preset = JUMP_PRESETS.find((candidate) => candidate.id === id);
  if (!preset) throw new Error(`missing preset ${id}`);
  return preset;
}

describe('JUMP_PRESETS', () => {
  test('lists the four presets in order', () => {
    expect(JUMP_PRESETS.map((preset) => preset.id)).toEqual([
      'tierra',
      'luna',
      'celeste',
      'super-mario-bros',
    ]);
  });

  test.each(JUMP_PRESETS.map((preset) => [preset.id, preset] as const))(
    '%s stays inside JUMP_LIMITS',
    (_id, preset) => {
      for (const key of KEYS) {
        const [low, high] = JUMP_LIMITS[key];
        expect(preset.values[key], key).toBeGreaterThanOrEqual(low);
        expect(preset.values[key], key).toBeLessThanOrEqual(high);
      }
    },
  );

  test('every preset names its source and states its scale', () => {
    for (const preset of JUMP_PRESETS) {
      expect(preset.sourceLabel?.trim()).toBeTruthy();
      expect(preset.note?.trim()).toBeTruthy();
    }
  });

  test('Earth and Moon use the standard surface gravities', () => {
    expect(presetById('tierra').values.g).toBe(9.81);
    expect(presetById('luna').values.g).toBe(1.62);
  });

  test('Celeste converts Player.cs at 8 px = 1 m', () => {
    // Gravity 900 px/s², JumpSpeed 105 px/s, MaxRun 90 px/s divided by 8 px/m.
    expect(presetById('celeste').values).toEqual({
      v0: 13.1,
      g: 112.5,
      vx: 11.25,
      fallMultiplier: 1,
    });
  });

  test('the simulator opens on Celeste, a gravity far from Earth', () => {
    expect(DEFAULT_JUMP_PRESET_ID).toBe('celeste');
    expect(presetById(DEFAULT_JUMP_PRESET_ID).values.g).toBeGreaterThan(9.81);
  });

  test('Super Mario Bros converts the disassembly at 16 px = 1 m and 60 frames/s', () => {
    // 4 px/frame · 60 / 16; 0.125 px/frame² · 3600 / 16; 0.4375 / 0.125 = 3.5.
    expect(presetById('super-mario-bros').values).toEqual({
      v0: 15,
      g: 28.1,
      vx: 6,
      fallMultiplier: 3.5,
    });
  });
});
