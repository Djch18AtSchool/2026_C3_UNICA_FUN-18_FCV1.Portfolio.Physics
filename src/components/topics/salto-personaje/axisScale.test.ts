import { describe, expect, test } from 'vitest';
import { niceAxis } from './axisScale';

describe('niceAxis', () => {
  test('rounds the top up to a 1-2-2.5-5 step and lists every tick from 0', () => {
    expect(niceAxis(5.607, 4)).toEqual({ max: 6, ticks: [0, 2, 4, 6] });
  });

  test('picks 2.5 steps when they fit the target count best', () => {
    expect(niceAxis(9.6, 4)).toEqual({ max: 10, ticks: [0, 2.5, 5, 7.5, 10] });
  });

  test('handles sub-metre ranges without floating noise', () => {
    expect(niceAxis(0.84, 4)).toEqual({ max: 1, ticks: [0, 0.25, 0.5, 0.75, 1] });
  });

  test('falls back to [0, 1] for empty or invalid spans', () => {
    expect(niceAxis(0, 4)).toEqual({ max: 1, ticks: [0, 0.25, 0.5, 0.75, 1] });
    expect(niceAxis(Number.NaN, 4).max).toBe(1);
  });
});
