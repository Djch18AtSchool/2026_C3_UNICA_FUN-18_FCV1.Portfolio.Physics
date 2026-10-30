import { describe, expect, test } from 'vitest';
import { RW400 } from '../../../lib/data/reactionWheels';
import { tableById } from '../../../lib/tables';
import { formatCell } from '../../../lib/tables/markdown';
import {
  DIAGRAM_FACTS,
  MANEUVER_PEAK,
  maneuverSeries,
  SATURATION,
  saturationSeries,
  WHEEL_COLORS,
} from './wheelFigures';

const SECONDS_PER_DAY = 86_400;

describe('maneuver (step 2)', () => {
  test('the maneuver table row at t = 30 s reads θ_s = 45° and ω_w = −970 rpm', () => {
    const spec = tableById('ruedas-reaccion-maniobra');
    const row = spec.rows.find((candidate) => candidate.t === 30);
    const cell = (key: string) => {
      const column = spec.columns.find((candidate) => candidate.key === key);
      if (!column || !row) throw new Error(key);
      return formatCell(column, row[key]);
    };

    expect(cell('thetaS')).toBe('45');
    expect(cell('omegaW')).toBe('-970');
  });

  test('θ_s rises as an S from 0 to 90° and ω_w is a triangle down to −970 rpm at 30 s', () => {
    const { theta, wheel } = maneuverSeries();

    expect(theta[0]).toEqual({ x: 0, y: 0 });
    expect(theta.at(-1)?.x).toBe(60);
    expect(theta.at(-1)?.y).toBeCloseTo(90, 9);
    for (let i = 1; i < theta.length; i++)
      expect(theta[i].y).toBeGreaterThanOrEqual(theta[i - 1].y);

    const lowest = wheel.reduce((low, point) => (point.y < low.y ? point : low));
    expect(lowest.x).toBe(30);
    expect(Math.round(lowest.y)).toBe(-970);
    expect(wheel.at(-1)?.y).toBeCloseTo(0, 9);
  });

  test('the marked peak is the middle of the turn', () => {
    expect(MANEUVER_PEAK.t).toBe(30);
    expect(MANEUVER_PEAK.thetaDeg).toBeCloseTo(45, 9);
    expect(Math.round(MANEUVER_PEAK.wheelRpm)).toBe(-970);
    expect(MANEUVER_PEAK.wheelLabel).toBe('−970 rpm a los 30 s');
    expect(MANEUVER_PEAK.thetaLabel).toBe('45° a los 30 s');
    expect(MANEUVER_PEAK.thetaLines).toEqual(['45°', 'a los 30 s']);
    expect(MANEUVER_PEAK.wheelLines).toEqual(['−970 rpm', 'a los 30 s']);
  });
});

describe('saturation (step 3)', () => {
  test('the series ramps from an empty wheel and reaches L_max, then stays there', () => {
    const series = saturationSeries();
    const maxIndex = series.findIndex((point) => point.y === RW400.Lmax);

    expect(series[0]).toEqual({ x: 0, y: 0 });
    expect(maxIndex).toBeGreaterThan(0);
    expect(series[maxIndex].x).toBeCloseTo(SATURATION.seconds / SECONDS_PER_DAY, 9);
    for (const point of series.slice(maxIndex)) expect(point.y).toBe(RW400.Lmax);
    for (const point of series) expect(point.y).toBeLessThanOrEqual(RW400.Lmax);
  });

  test('with the largest gravity-gradient torque (2,28·10⁻⁷ N·m) held constant the wheel fills in 2,19·10⁵ s', () => {
    // 2,2847·10⁻⁷ N·m; research §6b writes 2,29 (rounded twice), the page prints the code's 2,28.
    expect(SATURATION.torque).toBeCloseTo(2.2847e-7, 11);
    expect(SATURATION.seconds).toBeCloseTo(2.19e5, -3);
    expect(SATURATION.secondsLabel).toBe('2,19·10⁵ s');
    expect(SATURATION.daysLabel).toBe('2,5 días');
    expect(SATURATION.torqueLabel).toBe('2,28·10⁻⁷ N·m');
  });

  test('a 90° turn in 60 s uses 19 % of L_max', () => {
    expect(SATURATION.maneuverPeak).toBeCloseTo(0.0097, 4);
    expect(SATURATION.maneuverShareLabel).toBe('19 %');
  });
});

describe('diagram facts', () => {
  test('the wheel turns about 485 times for a 90° turn of the 6U, I_s/I_w ≈ 1940', () => {
    expect(DIAGRAM_FACTS.turns).toBe(485);
    expect(DIAGRAM_FACTS.inertiaRatio).toBe(1940);
  });

  test('L_max, the disturbance and the magnetorquer torque are printed from the data', () => {
    expect(DIAGRAM_FACTS.LmaxLabel).toBe('0,050 N·m·s');
    expect(DIAGRAM_FACTS.disturbanceLabel).toBe('2,28·10⁻⁷ N·m');
    expect(DIAGRAM_FACTS.magnetorquerLabel).toBe('1,2·10⁻⁵ N·m');
  });

  test('the magnetorquer torque is about 50 times the disturbance', () => {
    expect(DIAGRAM_FACTS.dumpRatio).toBe(50);
  });

  test('the wheel, the body and the torques wear distinct tokens; the limit wears the warning tone', () => {
    const values = Object.values(WHEEL_COLORS);
    expect(new Set(values).size).toBe(values.length);
    expect(WHEEL_COLORS.limit).toBe('var(--chart-2)');
    expect(WHEEL_COLORS.earth).toBe('var(--chart-1)');
    expect(WHEEL_COLORS.sun).toBe('var(--sun)');
    for (const color of values) expect(color).toMatch(/^var\(--[a-z0-9-]+\)$/);
  });
});
