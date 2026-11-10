import { describe, expect, test } from 'vitest';
import { presetIdFor, WHEEL_PRESETS } from './wheelPresets';

describe('WHEEL_PRESETS', () => {
  test('three presets, the 90° turn first, each with its source and a note', () => {
    expect(WHEEL_PRESETS.map((preset) => preset.id)).toEqual([
      'giro-90-60',
      'giro-mas-rapido',
      'tres-dias-perturbacion',
    ]);
    for (const { note, sourceLabel } of WHEEL_PRESETS) {
      expect(note).toBeTruthy();
      expect(sourceLabel).toBeTruthy();
    }
  });

  test('each note is a single sentence, the line under the preset (auditoría §4)', () => {
    for (const { id, note } of WHEEL_PRESETS) {
      expect(note?.match(/\.(\s|$)/g), id).toHaveLength(1);
    }
  });

  test('the notes keep the figures the model computes', () => {
    const [slow, fast, disturbance] = WHEEL_PRESETS.map((preset) => preset.note ?? '');

    expect(slow).toMatch(/0,32\smN·m/);
    expect(slow).toMatch(/19\s%/);
    expect(slow).toMatch(/485 vueltas/);
    expect(fast).toMatch(/12,1\ss por torque y 11,6\ss por momento/);
    expect(fast).toMatch(/99\s%.*96\s%/);
    expect(disturbance).toMatch(/48,6\sh/);
    expect(disturbance).toMatch(/57\smin/);
    expect(disturbance).toMatch(/tercero/);
  });

  test('a preset is active when the controls its mode uses match', () => {
    const [slow, fast, disturbance] = WHEEL_PRESETS;

    expect(presetIdFor(slow.values)).toBe('giro-90-60');
    expect(presetIdFor(fast.values)).toBe('giro-mas-rapido');
    expect(presetIdFor(disturbance.values)).toBe('tres-dias-perturbacion');
    expect(presetIdFor({ ...slow.values, thetaDeg: 45 })).toBeUndefined();
  });
});
