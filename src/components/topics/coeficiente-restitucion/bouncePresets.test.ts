import { describe, expect, test } from 'vitest';
import {
  BOUNCE_PRESETS,
  DEFAULT_PRESET_ID,
  PRESET_GROUPS,
  presetById,
  SPEED_FIT,
} from './bouncePresets';

describe('BOUNCE_PRESETS', () => {
  test('every preset belongs to a listed group and has a source and a note', () => {
    const groups = PRESET_GROUPS.map(({ group }) => group);

    expect(new Set(BOUNCE_PRESETS.map(({ id }) => id)).size).toBe(BOUNCE_PRESETS.length);
    for (const { id, group, sourceLabel, note } of BOUNCE_PRESETS) {
      expect(groups, id).toContain(group);
      expect(sourceLabel, id).toBeTruthy();
      expect(note, id).toBeTruthy();
    }
  });

  test('each note is a single sentence, the line under the preset (auditoría §4)', () => {
    for (const { id, note } of BOUNCE_PRESETS) {
      expect(note?.match(/\.(\s|$)/g), id).toHaveLength(1);
    }
  });

  test('the ball presets keep the measured range and the e and h0 the lab uses', () => {
    expect(presetById('tenis-itf').note).toMatch(
      /e entre 0,729 y 0,761 .*uso 0,745 con \$h_0\$ = 2,54 m\.$/,
    );
    expect(presetById('baloncesto-fiba').note).toMatch(/uso 0,767 con \$h_0\$ = 1,80 m\.$/);
    expect(presetById('superbola').note).toMatch(/e = 0,864 .*uso 0,860/);
  });

  test('the ball notes no longer repeat the engine defaults, which the engine chips show', () => {
    for (const { id, note } of BOUNCE_PRESETS.filter(({ id }) => id !== 'box2d')) {
      expect(note, id).not.toMatch(/valores por defecto de Box2D/);
    }
  });

  test('the Unity threshold preset keeps its figures', () => {
    const { note } = presetById('umbral-unity');

    expect(note).toMatch(/e quedaría a la mitad y la altura del rebote, a la cuarta parte/);
    expect(note).toMatch(/0,450/);
    expect(note).toMatch(/tras 8 botes, el último de 18,5\scm/);
  });

  test('the combination-rule preset gives the pair e of both floors', () => {
    const { note } = presetById('mezcla');

    expect(note).toMatch(/suelo de 0,5: máx .* 0,850; promedio .* 0,675; producto .* 0,425/);
    expect(note).toMatch(/suelo de 0: máx .* 0,850; promedio .* 0,425; producto .* 0,000/);
  });

  test('the lab opens on the ITF tennis ball, and the e(v) fit is the one the note states', () => {
    expect(DEFAULT_PRESET_ID).toBe('tenis-itf');
    expect(presetById('realista-mejorado').note).toContain('e(v) = 0,79 − 0,009·|v|');
    expect(SPEED_FIT).toEqual({ e0: 0.79, k: 0.009 });
  });

  test('presetById throws for an unknown id', () => {
    expect(() => presetById('nada')).toThrow(RangeError);
  });
});
