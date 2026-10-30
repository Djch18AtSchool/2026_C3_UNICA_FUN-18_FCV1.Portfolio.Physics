import { describe, expect, test } from 'vitest';
import { PLANETS } from '../../../lib/data/planets';
import { VOYAGER } from '../../../lib/data/voyager';
import { DEFAULT_FLYBY_PRESET_ID, FLYBY_PRESETS, flybyPreset, nearestSide } from './flybyPresets';

describe('FLYBY_PRESETS', () => {
  test('one preset per Voyager encounter, V2 first, in the order of the voyage', () => {
    expect(FLYBY_PRESETS.map((p) => p.name)).toEqual([
      'V2 · Júpiter',
      'V2 · Saturno',
      'V2 · Urano',
      'V2 · Neptuno',
      'V1 · Júpiter',
      'V1 · Saturno',
    ]);
    expect(FLYBY_PRESETS).toHaveLength(VOYAGER.encounters.length);
  });

  test('V2 at Jupiter opens the laboratory: 10,09 R_J, passing behind', () => {
    const { values } = flybyPreset(DEFAULT_FLYBY_PRESET_ID);

    expect(values.encounter.planet).toBe('jupiter');
    expect(values.rp).toBeCloseTo(721375 / PLANETS.jupiter.radiusKm, 9);
    expect(values.side).toBe('behind');
    expect(FLYBY_PRESETS[0].sourceLabel).toBe('1979-07-09 22:29 UT');
  });

  test('a planar encounter takes its side from the data (planarSide)', () => {
    for (const { values } of FLYBY_PRESETS) {
      if (values.encounter.planarSide) expect(values.side).toBe(values.encounter.planarSide);
    }
  });

  test('an out-of-plane encounter takes the side whose planar result is nearest the data', () => {
    const neptune = flybyPreset('v2-neptune').values;
    const saturnV1 = flybyPreset('v1-saturn').values;

    expect(neptune.encounter.planarTurnReproduces).toBe(false);
    expect(neptune.side).toBe('front');
    expect(nearestSide(saturnV1.encounter)).toBe('behind');
  });

  test('each note says where the probe passed; out-of-plane ones say the model does not reproduce it', () => {
    expect(flybyPreset('v2-jupiter').note).toMatch(/721\s375\skm/);
    expect(flybyPreset('v2-jupiter').note).toMatch(/por detrás/);
    expect(flybyPreset('v2-neptune').note).toMatch(/giro sale del plano/);
  });

  test('flybyPreset throws for an unknown id', () => {
    expect(() => flybyPreset('v3-pluto')).toThrow();
  });
});
