import { describe, expect, test } from 'vitest';
import { HABITAT_PRESETS } from '../../../lib/data/habitatPresets';
import { solveHabitat } from '../../../lib/physics';
import {
  applyPreset,
  INITIAL_HABITAT_STATE,
  LOCKED_LIMITS,
  setLocked,
  setRadius,
  setRpm,
  solveForRadius,
  solveForRpm,
  type HabitatState,
} from './habitatModel';

const STANFORD = HABITAT_PRESETS[0];
const unlocked: HabitatState = { ...INITIAL_HABITAT_STATE, isLocked: false };

describe('solving for 1 g', () => {
  test('2 rpm needs 223,6 m (to 0,1 m) and 100 m needs 2,991 rpm (to 0,001 rpm)', () => {
    expect(solveForRadius(2)).toEqual({ r: 223.6, rpm: 2 });
    expect(solveForRpm(100)).toEqual({ r: 100, rpm: 2.991 });
  });

  test('the SP-413 limit and the small centrifuge come back at 1 g', () => {
    expect(solveForRpm(895).rpm).toBe(1);
    expect(solveForRpm(10).rpm).toBeCloseTo(9.46, 2);
  });
});

describe('habitat state', () => {
  test('opens with "fijar 1 g" on at 1 rpm, so r = 894,6 m', () => {
    expect(INITIAL_HABITAT_STATE).toEqual({
      settings: { r: 894.6, rpm: 1 },
      isLocked: true,
      lastEdited: 'rpm',
    });
  });

  test('locked, a new spin solves the radius; unlocked, the radius stays', () => {
    expect(setRpm(INITIAL_HABITAT_STATE, 2).settings).toEqual({ r: 223.6, rpm: 2 });
    expect(setRpm(unlocked, 2).settings).toEqual({ r: 894.6, rpm: 2 });
  });

  test('locked, a new radius solves the spin; unlocked, the spin stays', () => {
    expect(setRadius(INITIAL_HABITAT_STATE, 100).settings).toEqual({ r: 100, rpm: 2.991 });
    expect(setRadius(unlocked, 100).settings).toEqual({ r: 100, rpm: 1 });
  });

  test('every edit records the edited parameter and drops the preset', () => {
    const fromPreset = applyPreset(STANFORD);

    const byRadius = setRadius(fromPreset, 500);
    const bySpin = setRpm(fromPreset, 3);

    expect([byRadius.lastEdited, bySpin.lastEdited]).toEqual(['r', 'rpm']);
    expect([byRadius.presetId, bySpin.presetId]).toEqual([undefined, undefined]);
  });

  test('locked, the inputs stay where 1 g keeps both parameters inside the controls', () => {
    const slow = setRpm(INITIAL_HABITAT_STATE, 0.1);
    const small = setRadius(INITIAL_HABITAT_STATE, 5);

    expect(slow.settings.rpm).toBe(LOCKED_LIMITS.rpm[0]);
    expect(slow.settings.r).toBeLessThanOrEqual(4000);
    expect(small.settings.r).toBe(LOCKED_LIMITS.r[0]);
    expect(small.settings.rpm).toBeLessThanOrEqual(10);
    for (const { settings } of [slow, small]) {
      expect(solveHabitat(settings).gRatio).toBeCloseTo(1, 2);
    }
  });

  test('unlocked, the inputs are clamped to the control ranges', () => {
    expect(setRpm(unlocked, 50).settings.rpm).toBe(10);
    expect(setRadius(unlocked, 1).settings.r).toBe(5);
  });

  test('a preset shows its published pair as is, with "fijar 1 g" off', () => {
    const next = applyPreset(STANFORD);

    expect(next).toEqual({
      settings: { r: 830, rpm: 1 },
      isLocked: false,
      lastEdited: 'rpm',
      presetId: 'toro-stanford',
    });
    expect(solveHabitat(next.settings).gRatio).toBeCloseTo(0.928, 3);
  });

  test('turning "fijar 1 g" on solves from the parameter edited last', () => {
    const preset = applyPreset(STANFORD);
    const afterRadius = setRadius({ ...preset, isLocked: false }, 100);

    expect(setLocked(preset, true).settings).toEqual({ r: 894.6, rpm: 1 });
    expect(setLocked(afterRadius, true).settings).toEqual({ r: 100, rpm: 2.991 });
    expect(setLocked(afterRadius, true).presetId).toBeUndefined();
  });

  test('turning it off keeps the pair', () => {
    expect(setLocked(INITIAL_HABITAT_STATE, false)).toEqual(unlocked);
  });
});
