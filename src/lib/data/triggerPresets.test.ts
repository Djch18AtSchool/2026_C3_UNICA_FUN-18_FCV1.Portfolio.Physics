import { describe, expect, test } from 'vitest';
import { hookeForce } from '../physics';
import {
  EXAMPLE_K,
  EXAMPLE_SPRING,
  TRIGGER_PRESETS,
  triggerReadings,
  VIBRATION_AMPLITUDE_N,
} from './triggerPresets';

describe('triggerPresets', () => {
  test('the example spring is k = 400 N/m from rest, and every preset uses it', () => {
    expect(EXAMPLE_K).toBe(400);
    expect(EXAMPLE_SPRING).toEqual({ k: 400, x0Mm: 0 });
    expect(TRIGGER_PRESETS.map(({ values }) => values.k)).toEqual([400, 400, 400]);
  });

  test('F₀ equals the example spring at mid travel, 1,6 N', () => {
    expect(VIBRATION_AMPLITUDE_N).toBe(1.6);
    expect(VIBRATION_AMPLITUDE_N).toBe(triggerReadings(EXAMPLE_SPRING, 4).hooke);
  });

  test('hooke is the magnitude of the kernel force −k x', () => {
    const { hooke } = triggerReadings({ k: 400, x0Mm: 3 }, 8);

    expect(hooke).toBe(-hookeForce(400, 0.008));
    expect(hooke).toBeCloseTo(3.2, 12);
    expect(triggerReadings(EXAMPLE_SPRING, 0).hooke).toBe(0);
  });
});
