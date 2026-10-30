import { describe, expect, test } from 'vitest';
import {
  arcPath,
  BODY_FOOTPRINT,
  bodyCorners,
  momentumGauge,
  pointerToDegrees,
  polar,
  rateArcSweep,
  spokeOpacity,
  targetKeyTarget,
} from './wheelScene';

const C = { x: 100, y: 100 };

describe('angles on screen (counterclockwise positive, SVG y down)', () => {
  test('polar puts 0° to the right and 90° straight up', () => {
    expect(polar(C, 10, 0)).toEqual({ x: 110, y: 100 });
    const up = polar(C, 10, 90);
    expect(up.x).toBeCloseTo(100, 9);
    expect(up.y).toBeCloseTo(90, 9);
  });

  test('pointerToDegrees inverts polar to whole degrees in [−180, 180]', () => {
    expect(pointerToDegrees(C, polar(C, 40, 45.4))).toBe(45);
    expect(pointerToDegrees(C, polar(C, 40, -120))).toBe(-120);
    expect(pointerToDegrees(C, { x: 60, y: 100 })).toBe(180);
    expect(pointerToDegrees(C, C)).toBe(0);
  });

  test('arcPath sweeps counterclockwise on screen for a positive span and clockwise otherwise', () => {
    expect(arcPath(C, 10, 0, 90)).toBe('M110 100 A10 10 0 0 0 100 90');
    expect(arcPath(C, 10, 0, -90)).toBe('M110 100 A10 10 0 0 1 100 110');
    expect(arcPath(C, 10, 0, 270)).toContain('A10 10 0 1 0');
  });
});

describe('targetKeyTarget', () => {
  test('arrows move 1°, Shift and Page keys 10°, Home and End to the ends, clamped to ±180°', () => {
    expect(targetKeyTarget('ArrowRight', false, 90)).toBe(91);
    expect(targetKeyTarget('ArrowDown', false, 90)).toBe(89);
    expect(targetKeyTarget('ArrowUp', true, 90)).toBe(100);
    expect(targetKeyTarget('PageDown', false, 90)).toBe(80);
    expect(targetKeyTarget('Home', false, 90)).toBe(-180);
    expect(targetKeyTarget('End', false, 90)).toBe(180);
    expect(targetKeyTarget('ArrowRight', true, 175)).toBe(180);
    expect(targetKeyTarget('Enter', false, 90)).toBeUndefined();
  });
});

describe('body', () => {
  test('the 6U footprint along the slew axis is 366,0 × 226,3 mm, and its corners turn with it', () => {
    expect(BODY_FOOTPRINT).toEqual({ long: 0.366, short: 0.2263 });
    const level = bodyCorners(C, 100, 0);
    const turned = bodyCorners(C, 100, Math.PI / 2);

    expect(level[0].x).toBeCloseTo(100 + 18.3, 9);
    expect(level[0].y).toBeCloseTo(100 - 11.315, 9);
    expect(turned[0].x).toBeCloseTo(100 - 11.315, 9);
    expect(turned[0].y).toBeCloseTo(100 - 18.3, 9);
  });
});

describe('rates and the momentum gauge', () => {
  test('rate arcs grow with |rate| / reference up to 300°, flagging an over-limit rate', () => {
    expect(rateArcSweep(0, 5000)).toEqual({ sweep: 0, isOver: false });
    expect(rateArcSweep(-2500, 5000)).toEqual({ sweep: 150, isOver: false });
    expect(rateArcSweep(7000, 5000)).toEqual({ sweep: 300, isOver: true });
    expect(rateArcSweep(1, 0)).toEqual({ sweep: 0, isOver: false });
  });

  test('spokes fade as the wheel speeds up, so a strobing wheel never reads as a slow one', () => {
    expect(spokeOpacity(0)).toBe(1);
    expect(spokeOpacity(-5000)).toBeCloseTo(0.25, 9);
    expect(spokeOpacity(300)).toBeLessThan(1);
  });

  test('the gauge fills with |L_w| / L_max, clamps at the full bar and says when it exceeds', () => {
    const under = momentumGauge(-0.0097, 0.05);
    expect(under.percent).toBeCloseTo(19.4, 9);
    expect(under.fill).toBeCloseTo(0.194, 9);
    expect(under.exceeds).toBe(false);
    const over = momentumGauge(0.0727, 0.05);
    expect(over.percent).toBeCloseTo(145.4, 9);
    expect(over.fill).toBe(1);
    expect(over.exceeds).toBe(true);
  });
});
