import { describe, expect, test } from 'vitest';
import { DRONE_ROUTE } from '../../../lib/data/droneRoute';
import { constantSpeedFlight, firstLegProfile } from './droneFigures';

describe('constantSpeedFlight', () => {
  const flight = constantSpeedFlight(DRONE_ROUTE);

  test('flies each leg at vₘₐₓ along its heading: (600, 200) m gives vₓ = 9,49 and v_y = 3,16 m/s', () => {
    // Corners of the first leg: (0, 0), then the jump to cruise at t = 0.
    expect(flight.vx[1].y).toBeCloseTo((10 * 600) / Math.hypot(600, 200), 9);
    expect(flight.vy[1].y).toBeCloseTo((10 * 200) / Math.hypot(600, 200), 9);
    expect(flight.vx[1].y).toBeCloseTo(9.49, 2);
    expect(flight.vy[1].y).toBeCloseTo(3.16, 2);
  });

  test('velocity jumps at takeoff and landing of every leg: eight jump instants', () => {
    expect(flight.jumps).toHaveLength(8);
    expect(flight.jumps[0]).toBe(0);
    expect(flight.jumps[1]).toBeCloseTo(Math.hypot(600, 200) / 10, 9);
    expect(flight.jumps[2]).toBeCloseTo(Math.hypot(600, 200) / 10 + 20, 9);
  });

  test('each jump is vertical: two points at the same instant with different velocity', () => {
    const atFirstLanding = flight.vx.filter((p) => p.x === flight.jumps[1]);

    expect(atFirstLanding).toHaveLength(2);
    expect(atFirstLanding[0].y).not.toBe(atFirstLanding[1].y);
  });

  test('lasts the legs at 10 m/s plus the three 20 s deliveries', () => {
    const legs = [
      Math.hypot(600, 200),
      Math.hypot(300, 600),
      Math.hypot(600, 300),
      Math.hypot(300, 1100),
    ];
    const expected = legs.reduce((sum, d) => sum + d / 10, 0) + 60;

    expect(flight.duration).toBeCloseTo(expected, 9);
    expect(flight.vx.at(-1)).toEqual({ x: flight.duration, y: 0 });
  });
});

describe('firstLegProfile', () => {
  const profile = firstLegProfile(DRONE_ROUTE);

  test('the trapezoid reaches 10 m/s at t_a = 4 s and ends at T = d/v + v/a = 67,2 s', () => {
    expect(profile.tAccel).toBe(4);
    expect(profile.duration).toBeCloseTo(Math.hypot(600, 200) / 10 + 4, 9);
    expect(profile.trapezoid).toEqual([
      { x: 0, y: 0 },
      { x: 4, y: 10 },
      { x: profile.duration - 4, y: 10 },
      { x: profile.duration, y: 0 },
    ]);
  });

  test('the constant-speed rectangle covers the same 632,5 m in d/v = 63,2 s', () => {
    const [, top, end] = profile.rectangle;

    expect(top).toEqual({ x: 0, y: 10 });
    expect(end.x).toBeCloseTo(63.246, 3);
    expect(profile.distance).toBeCloseTo(632.456, 3);
  });
});
