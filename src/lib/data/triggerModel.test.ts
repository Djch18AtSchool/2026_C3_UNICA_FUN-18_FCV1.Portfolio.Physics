import { describe, expect, test } from 'vitest';
import { TRIGGER_LIMITS, TRIGGER_TRAVEL_MM, triggerCurves } from './triggerModel';

describe('triggerCurves', () => {
  test('samples 33 points from 0 to 8 mm in steps of 0,25 mm', () => {
    const curves = triggerCurves({ k: 400, start: 3 });

    expect(curves).toHaveLength(33);
    expect(curves[0].x).toBe(0);
    expect(curves[1].x).toBe(0.25);
    expect(curves[32].x).toBe(TRIGGER_TRAVEL_MM);
  });

  test('the ideal Hooke spring needs 3,2 N at 8 mm with k = 400 N/m', () => {
    const curves = triggerCurves({ k: 400, start: 3 });

    expect(curves[0].hooke).toBe(0);
    expect(curves[32].hooke).toBeCloseTo(3.2, 10);
  });

  test('the trigger gives no resistance before x₀ = 3 mm and 2,0 N at the bottom', () => {
    const curves = triggerCurves({ k: 400, start: 3 });
    const atTwoMm = curves.find((point) => point.x === 2);

    expect(atTwoMm?.trigger).toBe(0);
    expect(curves[32].trigger).toBeCloseTo(2.0, 10);
  });

  test('with x₀ = 0 the trigger profile is the Hooke line', () => {
    const curves = triggerCurves({ k: 250, start: 0 });

    curves.forEach((point) => expect(point.trigger).toBeCloseTo(point.hooke, 10));
  });
});

describe('TRIGGER_LIMITS', () => {
  test('k spans 50–600 N/m and x₀ 0–6 mm, inside the 8 mm travel', () => {
    expect(TRIGGER_LIMITS.k).toEqual([50, 600]);
    expect(TRIGGER_LIMITS.start).toEqual([0, 6]);
    expect(TRIGGER_LIMITS.start[1]).toBeLessThan(TRIGGER_TRAVEL_MM);
  });
});
