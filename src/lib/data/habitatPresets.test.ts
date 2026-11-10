import { describe, expect, test } from 'vitest';
import { solveHabitat } from '../physics';
import { formatNumber } from '../format';
import {
  HABITAT_LIMITS,
  HABITAT_PRESETS,
  STANFORD_TORUS_SP413,
  type HabitatSettings,
} from './habitatPresets';

const KEYS: (keyof HabitatSettings)[] = ['r', 'rpm'];

function presetById(id: string) {
  const preset = HABITAT_PRESETS.find((candidate) => candidate.id === id);
  if (!preset) throw new Error(`missing preset ${id}`);
  return preset;
}

describe('HABITAT_PRESETS', () => {
  test('lists the three presets in order', () => {
    expect(HABITAT_PRESETS.map((preset) => preset.id)).toEqual([
      'toro-stanford',
      'limite-sp413',
      'centrifuga-pequena',
    ]);
  });

  test.each(HABITAT_PRESETS.map((preset) => [preset.id, preset] as const))(
    '%s stays inside HABITAT_LIMITS',
    (_id, preset) => {
      for (const key of KEYS) {
        const [low, high] = HABITAT_LIMITS[key];
        expect(preset.values[key], key).toBeGreaterThanOrEqual(low);
        expect(preset.values[key], key).toBeLessThanOrEqual(high);
      }
    },
  );

  test('every preset names its source and explains itself', () => {
    for (const preset of HABITAT_PRESETS) {
      expect(preset.sourceLabel?.trim()).toBeTruthy();
      expect(preset.note?.trim()).toBeTruthy();
    }
  });

  test('the Stanford torus is 830 m at 1 rpm and gives 0.93 g', () => {
    // ω = 2π/60 = 0.1047 rad/s; a_c = ω² · 830 = 9.10 m/s² = 0.93 g (SP-413: 0.95 ± 0.05 g).
    const stanford = presetById('toro-stanford');
    expect(stanford.values).toEqual({ r: 830, rpm: 1 });
    expect(solveHabitat(stanford.values).gRatio).toBeCloseTo(0.93, 2);
  });

  test('the SP-413 limit is 895 m at 1 rpm and gives 1.00 g', () => {
    // SP-413: only radii greater than 895 m reach 1 g below 1 rpm; ω² · 895 = 9.81 m/s².
    const limit = presetById('limite-sp413');
    expect(limit.values).toEqual({ r: 895, rpm: 1 });
    expect(solveHabitat(limit.values).gRatio).toBeCloseTo(1, 2);
  });

  test('the SP-413 note says 895 m is the tube’s outermost point, with its 1,00 g and 93,7 m/s', () => {
    // The note's numbers, each from the data: SP-413's R and tube radius, their sum (the preset)
    // and what the model gives there at 1 rpm.
    const { R, tubeRadius } = STANFORD_TORUS_SP413;
    const limit = presetById('limite-sp413');
    const { gRatio, v } = solveHabitat(limit.values);
    expect(presetById('toro-stanford').values.r).toBe(R);
    expect(limit.values.r).toBe(R + tubeRadius);
    expect(limit.note).toBe(
      `Solo los radios mayores de ${limit.values.r} m dan 1 g por debajo de 1 RPM; es el punto más exterior del tubo del Toro de Stanford (${R} + ${tubeRadius} m), con ${formatNumber(gRatio, { precision: 2 })} g y un piso a ${formatNumber(v, { precision: 1 })} m/s.`,
    );
  });

  test('the small centrifuge gives 1 g at 10 m', () => {
    // ω = √(9.81/10) = 0.990 rad/s = 9.46 rpm.
    const centrifuge = presetById('centrifuga-pequena');
    expect(centrifuge.values).toEqual({ r: 10, rpm: 9.46 });
    expect(solveHabitat(centrifuge.values).gRatio).toBeCloseTo(1, 1);
  });
});
