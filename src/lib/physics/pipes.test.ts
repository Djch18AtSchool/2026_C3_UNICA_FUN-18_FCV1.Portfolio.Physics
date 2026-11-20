import { describe, expect, test } from 'vitest';
import { pipeLength, pipeModeNumbers, standingWaveProfile } from './pipes';

describe('pipe modes: equations (11.2) and (11.3)', () => {
  test('an open-open pipe admits every n and a closed-open one only odd n', () => {
    expect(pipeModeNumbers('abierto', 4)).toEqual([1, 2, 3, 4]);
    expect(pipeModeNumbers('cerrado', 4)).toEqual([1, 3, 5, 7]);
    expect(() => pipeModeNumbers('abierto', 0)).toThrow(RangeError);
  });

  test('310 Hz with v = 340 m/s needs 0,548 m open and 0,274 m closed (research §4.4)', () => {
    expect(pipeLength('abierto', 310, 340)).toBeCloseTo(0.548, 3);
    expect(pipeLength('cerrado', 310, 340)).toBeCloseTo(0.274, 3);
    expect(() => pipeLength('cerrado', 0, 340)).toThrow(RangeError);
  });

  test('the open pipe has displacement antinodes at both ends', () => {
    [1, 2, 3].forEach((n) => {
      expect(Math.abs(standingWaveProfile('abierto', n, 0))).toBeCloseTo(1, 12);
      expect(Math.abs(standingWaveProfile('abierto', n, 1))).toBeCloseTo(1, 12);
    });
    expect(standingWaveProfile('abierto', 1, 0.5)).toBeCloseTo(0, 12);
  });

  test('the closed pipe has a node at the closed end and an antinode at the open one', () => {
    [1, 3, 5].forEach((n) => {
      expect(standingWaveProfile('cerrado', n, 0)).toBeCloseTo(0, 12);
      expect(Math.abs(standingWaveProfile('cerrado', n, 1))).toBeCloseTo(1, 12);
    });
    // n = 3 has one more node inside, at a third of the length: L = 3λ/4, λ/2 from the open end.
    expect(standingWaveProfile('cerrado', 3, 2 / 3)).toBeCloseTo(0, 12);
  });

  test('rejects an even mode in a closed pipe or a position outside it', () => {
    expect(() => standingWaveProfile('cerrado', 2, 0.5)).toThrow(RangeError);
    expect(() => standingWaveProfile('abierto', 1, 1.2)).toThrow(RangeError);
  });
});
