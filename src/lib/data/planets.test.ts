import { describe, expect, test } from 'vitest';
import { sphereOfInfluence } from '../physics';
import { AU_KM, GM_SUN, PLANETS, PLANET_IDS } from './planets';

/** Newton's constant in km³/(kg·s²) (CODATA 2018: 6,674 30 × 10⁻¹¹ m³/(kg·s²)). */
const G_KM = 6.6743e-20;

describe('GM_SUN and AU_KM', () => {
  test('copy JPL astro_par: GM☉ = 1,327 124 400 412 794 19 × 10²⁰ m³/s², au = 149 597 870 700 m', () => {
    expect(GM_SUN).toBe(132712440041.279419);
    expect(AU_KM).toBe(149597870.7);
  });
});

describe('PLANETS', () => {
  test('lists the four giants in order from the Sun', () => {
    expect(PLANET_IDS).toEqual(['jupiter', 'saturn', 'uranus', 'neptune']);
    expect(PLANET_IDS.map((id) => PLANETS[id].name)).toEqual([
      'Júpiter',
      'Saturno',
      'Urano',
      'Neptuno',
    ]);
    expect(PLANET_IDS.map((id) => PLANETS[id].naifId)).toEqual([599, 699, 799, 899]);
  });

  test('copies the body GM and equatorial radius printed by Horizons (research §4)', () => {
    expect(PLANET_IDS.map((id) => [PLANETS[id].gm, PLANETS[id].radiusKm])).toEqual([
      [126686531.9, 71492],
      [37931206.234, 60268],
      [5793950.6103, 25559],
      [6835099.97, 24766],
    ]);
  });

  test('copies the masses printed by Horizons', () => {
    expect(PLANET_IDS.map((id) => PLANETS[id].massKg)).toEqual([
      18.9819e26, 5.6834e26, 86.813e24, 102.409e24,
    ]);
  });

  test('GM and mass agree with Newton’s constant within 0,1 %', () => {
    PLANET_IDS.forEach((id) => {
      const { gm, massKg } = PLANETS[id];
      expect(Math.abs(gm / massKg / G_KM - 1)).toBeLessThan(1e-3);
    });
  });

  test('names the semantic color token of each planet', () => {
    expect(PLANET_IDS.map((id) => PLANETS[id].token)).toEqual([
      '--jupiter',
      '--saturn',
      '--uranus',
      '--neptune',
    ]);
  });

  test('cites Horizons with the access date', () => {
    PLANET_IDS.forEach((id) => {
      expect(PLANETS[id].source).toMatch(/JPL Horizons/);
      expect(PLANETS[id].source).toMatch(/2026-10-30/);
    });
  });

  test('Jupiter’s sphere of influence at 5,32 AU is about 690 radii (research §5)', () => {
    const { gm, radiusKm } = PLANETS.jupiter;

    expect(sphereOfInfluence(5.32 * AU_KM, gm, GM_SUN) / radiusKm).toBeCloseTo(690, -1);
  });
});
