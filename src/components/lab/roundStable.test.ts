import { describe, expect, test } from 'vitest';
import { roundStable } from './roundStable';

describe('roundStable', () => {
  test('rounds to the given decimals, ties upward, like toFixed on clean values', () => {
    expect(roundStable(1.234, 2)).toBe(1.23);
    expect(roundStable(1.236, 2)).toBe(1.24);
    expect(roundStable(641.875, 2)).toBe(641.88);
    expect(roundStable(-0.006, 2)).toBe(-0.01);
  });

  test('a tie blurred by float noise rounds the same way on both sides (no flip between renders)', () => {
    // An equal-aspect plot height on a tie: the zoom's domains give it ±1e-13 px of noise, and
    // toFixed(2) wrote 641.87 or 641.88 by turns (Tema 1's map, 766 px wide).
    const below = 641.875 - 1e-13;
    const above = 641.875 + 1e-13;

    expect(Number(below.toFixed(2))).not.toBe(Number(above.toFixed(2)));
    expect(roundStable(below, 2)).toBe(roundStable(above, 2));
  });
});
