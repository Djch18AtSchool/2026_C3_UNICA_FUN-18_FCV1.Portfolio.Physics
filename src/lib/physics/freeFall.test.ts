import { describe, expect, test } from 'vitest';
import { formatNumber } from '../format';
import { G_EARTH } from './constants';
import { freeFallSpeed, freeFallTime, jumpWeightlessTime } from './freeFall';

/** The wrist's height in «Qué aprendí», an assumption the page declares (m). */
const WRIST_HEIGHT = 0.8;
/** The jump of the page's counterexample (m). */
const JUMP_HEIGHT = 0.3;

describe('free fall from rest', () => {
  test('lasts t = √(2h/g): 0,40 s from the wrist', () => {
    expect(freeFallTime(WRIST_HEIGHT, G_EARTH)).toBeCloseTo(0.40386, 5);
    expect(formatNumber(freeFallTime(WRIST_HEIGHT, G_EARTH), { precision: 2 })).toBe('0,40');
  });

  test('ends at v = √(2gh): 3,96 m/s from the wrist', () => {
    expect(freeFallSpeed(WRIST_HEIGHT, G_EARTH)).toBeCloseTo(3.96182, 5);
    expect(formatNumber(freeFallSpeed(WRIST_HEIGHT, G_EARTH), { precision: 2 })).toBe('3,96');
  });

  test('time and speed agree with v = g t', () => {
    expect(freeFallSpeed(WRIST_HEIGHT, G_EARTH)).toBeCloseTo(
      G_EARTH * freeFallTime(WRIST_HEIGHT, G_EARTH),
    );
  });

  test('a fall of zero height takes no time and reaches no speed', () => {
    expect(freeFallTime(0, G_EARTH)).toBe(0);
    expect(freeFallSpeed(0, G_EARTH)).toBe(0);
  });

  test('rejects a negative height or a gravity that is not positive', () => {
    expect(() => freeFallTime(-1, G_EARTH)).toThrow(RangeError);
    expect(() => freeFallSpeed(1, 0)).toThrow(RangeError);
    expect(() => freeFallTime(Number.NaN, G_EARTH)).toThrow(RangeError);
  });
});

describe('a jump', () => {
  test('of 30 cm is weightless 0,49 s: longer than the fall from the wrist', () => {
    const weightless = jumpWeightlessTime(JUMP_HEIGHT, G_EARTH);

    expect(weightless).toBeCloseTo(0.49462, 5);
    expect(formatNumber(weightless, { precision: 2 })).toBe('0,49');
    expect(weightless).toBeGreaterThan(freeFallTime(WRIST_HEIGHT, G_EARTH));
  });

  test('is weightless twice the fall from its apex, up and down', () => {
    expect(jumpWeightlessTime(JUMP_HEIGHT, G_EARTH)).toBeCloseTo(
      2 * freeFallTime(JUMP_HEIGHT, G_EARTH),
    );
  });

  test('rejects a jump without height', () => {
    expect(() => jumpWeightlessTime(0, G_EARTH)).toThrow(RangeError);
  });
});
