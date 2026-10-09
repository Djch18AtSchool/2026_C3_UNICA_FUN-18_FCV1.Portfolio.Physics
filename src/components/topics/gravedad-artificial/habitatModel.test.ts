import { describe, expect, test } from 'vitest';
import {
  INITIAL_HABITAT_STATE,
  snapToStep,
  solveForRadius,
  solveForRpm,
  switchMode,
} from './habitatModel';

describe('habitatModel', () => {
  test('solving for 1 g: 2 rpm needs 223.6 m and 100 m needs 2.99 rpm', () => {
    expect(solveForRadius(2).r).toBeCloseTo(223.64, 2);
    expect(solveForRpm(100).rpm).toBeCloseTo(2.991, 3);
  });

  test('snapToStep rounds to the slider grain and clamps to the range', () => {
    expect(snapToStep(894.56, 5, [5, 4000])).toBe(895);
    expect(snapToStep(0.47, 0.1, [0.1, 10])).toBe(0.5);
    expect(snapToStep(9000, 5, [5, 4000])).toBe(4000);
  });

  test('switching to the radius input snaps r and re-solves the spin for 1 g', () => {
    const next = switchMode(INITIAL_HABITAT_STATE, 'rpm');

    expect(next.mode).toBe('rpm');
    expect(next.settings.r).toBe(895);
    expect(next.settings.rpm).toBeCloseTo(0.9997, 3);
    expect(next.presetId).toBeUndefined();
  });

  test('switching back to the spin input snaps the spin and re-solves r', () => {
    const preset = { mode: 'rpm' as const, settings: { r: 4000, rpm: 0.47 }, presetId: 'x' };

    const next = switchMode(preset, 'radius');

    expect(next).toEqual({ mode: 'radius', settings: solveForRadius(0.5) });
  });
});
