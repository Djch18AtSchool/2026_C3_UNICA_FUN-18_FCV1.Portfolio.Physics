import { describe, expect, test } from 'vitest';
import { PLANETS } from '../../../lib/data/planets';
import { HORIZONS_URL, VOYAGER } from '../../../lib/data/voyager';
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
    expect(FLYBY_PRESETS[0].sourceLabel).toBe('JPL Horizons, 1979-07-09 22:29 UT');
  });

  test('every preset names JPL Horizons and the minute of closest approach, linked to Horizons', () => {
    for (const { sourceLabel, sourceUrl, values } of FLYBY_PRESETS) {
      expect(sourceLabel).toBe(
        `JPL Horizons, ${values.encounter.caUtc.replace('T', ' ').replace('Z', ' UT')}`,
      );
      expect(sourceUrl).toBe(HORIZONS_URL);
    }
    expect(HORIZONS_URL).toBe('https://ssd.jpl.nasa.gov/horizons/');
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
    expect(flybyPreset('v2-jupiter').note).toBe(
      'Máxima aproximación a 721\u202f375\u202fkm del centro (10,09 $R_\\mathrm{J}$), por detrás.',
    );
    expect(flybyPreset('v2-neptune').note).toMatch(
      /^Máxima aproximación a 29\s\d{3}\skm del centro \(1,18 \$R_\\mathrm\{N\}\$\); el giro sale del plano y el modelo usa el lado más cercano, delante\.$/,
    );
  });

  test('each note is a single sentence, the one line under the preset (auditoría §4)', () => {
    for (const { note } of FLYBY_PRESETS) {
      expect(note?.match(/\.(\s|$)/g)).toHaveLength(1);
    }
  });

  test('flybyPreset throws for an unknown id', () => {
    expect(() => flybyPreset('v3-pluto')).toThrow();
  });
});
