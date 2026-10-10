import { describe, expect, test } from 'vitest';
import { rpmToOmega } from '../../../lib/physics';
import {
  angleAt,
  LOG_TICKS,
  MAX_DRAWN_G,
  radiusKeyTarget,
  radiusToSlider,
  ringRadius,
  sliderToRadius,
  vectorLength,
} from './habitatScene';

describe('log radius scale', () => {
  test('a radius on the 5 m grid survives the round trip', () => {
    expect(sliderToRadius(radiusToSlider(830))).toBe(830);
  });

  test('the ends of the slider are the ends of the range', () => {
    expect(sliderToRadius(0)).toBe(5);
    expect(sliderToRadius(1)).toBe(4000);
    expect(radiusToSlider(5)).toBe(0);
    expect(radiusToSlider(4000)).toBe(1);
  });

  test('equal steps of the slider multiply the radius by the same factor', () => {
    const middle = radiusToSlider(Math.sqrt(5 * 4000));

    expect(middle).toBeCloseTo(0.5, 10);
  });

  test('values outside the range are clamped on both sides', () => {
    expect(radiusToSlider(1)).toBe(0);
    expect(radiusToSlider(10_000)).toBe(1);
    expect(sliderToRadius(-0.5)).toBe(5);
    expect(sliderToRadius(1.5)).toBe(4000);
  });

  test('sliderToRadius rounds to 5 m', () => {
    expect(sliderToRadius(radiusToSlider(223.6)) % 5).toBe(0);
    expect(sliderToRadius(radiusToSlider(223.6))).toBe(225);
  });
});

describe('angleAt', () => {
  test('one minute at 1 rpm is one whole turn, back to 0', () => {
    expect(angleAt(rpmToOmega(1), 60)).toBeCloseTo(0, 9);
  });

  test('half a period is half a turn', () => {
    expect(angleAt(rpmToOmega(2), 15)).toBeCloseTo(Math.PI, 9);
  });

  test('stays in [0, 2π) for many turns and for negative times', () => {
    const angle = angleAt(rpmToOmega(3), 1234.5);

    expect(angle).toBeGreaterThanOrEqual(0);
    expect(angle).toBeLessThan(2 * Math.PI);
    expect(angleAt(1, -Math.PI / 2)).toBeCloseTo((3 * Math.PI) / 2, 9);
  });
});

describe('radiusKeyTarget', () => {
  test('arrows move 1 % of the log bar, with Shift 10 %', () => {
    expect(radiusKeyTarget('ArrowRight', false, 830)).toBe(
      sliderToRadius(radiusToSlider(830) + 0.01),
    );
    expect(radiusKeyTarget('ArrowUp', true, 830)).toBe(sliderToRadius(radiusToSlider(830) + 0.1));
    expect(radiusKeyTarget('ArrowLeft', false, 830)).toBe(
      sliderToRadius(radiusToSlider(830) - 0.01),
    );
    expect(radiusKeyTarget('ArrowDown', true, 830)).toBe(sliderToRadius(radiusToSlider(830) - 0.1));
  });

  test('where 1 % rounds back to the same 5 m, it moves one 5 m step instead', () => {
    expect(radiusKeyTarget('ArrowRight', false, 5)).toBe(10);
    expect(radiusKeyTarget('ArrowRight', false, 10)).toBe(15);
    expect(radiusKeyTarget('ArrowLeft', false, 10)).toBe(5);
  });

  test('Home, End and the page keys; the ends hold; other keys are ignored', () => {
    expect(radiusKeyTarget('Home', false, 830)).toBe(5);
    expect(radiusKeyTarget('End', false, 830)).toBe(4000);
    expect(radiusKeyTarget('PageUp', false, 830)).toBe(sliderToRadius(radiusToSlider(830) + 0.1));
    expect(radiusKeyTarget('PageDown', false, 830)).toBe(sliderToRadius(radiusToSlider(830) - 0.1));
    expect(radiusKeyTarget('ArrowLeft', false, 5)).toBe(5);
    expect(radiusKeyTarget('ArrowRight', true, 4000)).toBe(4000);
    expect(radiusKeyTarget('Enter', false, 830)).toBeUndefined();
  });

  test('from a solved radius off the 5 m grid it lands on the grid', () => {
    expect(radiusKeyTarget('ArrowLeft', false, 223.6)).toBe(210);
  });
});

describe('drawing scales', () => {
  test('the drawn ring grows with the log radius between its two sizes', () => {
    expect(ringRadius(0, 100)).toBeCloseTo(50, 10);
    expect(ringRadius(1, 100)).toBe(100);
    expect(ringRadius(0.5, 100)).toBeCloseTo(75, 10);
  });

  test('vectors are drawn to scale up to MAX_DRAWN_G and clipped beyond', () => {
    expect(vectorLength(1, 40)).toEqual({ length: 40, isClipped: false });
    expect(vectorLength(0.25, 40)).toEqual({ length: 10, isClipped: false });
    expect(vectorLength(30, 40)).toEqual({ length: MAX_DRAWN_G * 40, isClipped: true });
  });

  test('the log ticks span the range in increasing order', () => {
    expect(LOG_TICKS[0].r).toBe(5);
    expect(LOG_TICKS.at(-1)?.r).toBe(4000);
    expect(LOG_TICKS.map((tick) => tick.r)).toEqual(
      [...LOG_TICKS.map((t) => t.r)].sort((a, b) => a - b),
    );
    expect(LOG_TICKS.filter((tick) => tick.label).map((tick) => tick.label)).toEqual([
      '5',
      '10',
      '100',
      '1 000',
      '4 000',
    ]);
  });
});
