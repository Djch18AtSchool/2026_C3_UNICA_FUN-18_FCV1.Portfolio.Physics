import { describe, expect, test } from 'vitest';
import { KLIPPER } from './klipper';

describe('Klipper v0.13.0 (commit 61c0c8d)', () => {
  test('the resonance sweep: 5 to 135 Hz at 1 Hz/s (resonance_tester.py L49-L78)', () => {
    expect(KLIPPER.sweepMinHz.value).toBe(5);
    expect(KLIPPER.sweepMaxHz.value).toBe(135);
    expect(KLIPPER.sweepHzPerSecond.value).toBe(1);
    expect(KLIPPER.sweepMinHz.source).toContain('resonance_tester.py L49-L78');
  });

  test('damping ratios: 0,1 by default and 0,075, 0,1 and 0,15 to test the shapers', () => {
    expect(KLIPPER.defaultDampingRatio.value).toBe(0.1);
    expect(KLIPPER.defaultDampingRatio.source).toContain('shaper_defs.py L9');
    expect(KLIPPER.testDampingRatios.values).toEqual([0.075, 0.1, 0.15]);
    expect(KLIPPER.testDampingRatios.source).toContain('shaper_calibrate.py L14');
  });

  test('ZV reduces the vibration 10 times within ±5 % of its frequency (documentation)', () => {
    expect(KLIPPER.zvTolerance.value).toBe(0.05);
    expect(KLIPPER.zvReduction.value).toBe(10);
  });

  test('every value is the product’s own, with its file and lines', () => {
    const { testDampingRatios, ...values } = KLIPPER;
    [...Object.values(values), testDampingRatios].forEach((entry) => {
      expect(entry.origin).toBe('producto');
      expect(entry.source).toMatch(/Klipper v0\.13\.0/);
    });
  });
});
