import { describe, expect, test } from 'vitest';
import { DRONE_ROUTE } from '../../../lib/data/droneRoute';
import { buildMapScale, routeDomain } from './mapScale';

const DOMAIN = routeDomain(DRONE_ROUTE.stops, 100);

describe('routeDomain', () => {
  test('pads the extent of the stops on every side', () => {
    expect(DOMAIN).toEqual({ x: [-100, 1000], y: [-100, 1200] });
  });
});

describe('buildMapScale', () => {
  test('uses the same pixels per metre on both axes, with y pointing up', () => {
    const scale = buildMapScale(640, DOMAIN, 440);

    expect(scale.x(100) - scale.x(0)).toBeCloseTo(scale.y(0) - scale.y(100), 9);
    expect(scale.y(1200)).toBeLessThan(scale.y(0));
  });

  test('fits the available width and caps the plot height', () => {
    const wide = buildMapScale(1200, DOMAIN, 440);
    const narrow = buildMapScale(300, DOMAIN, 440);

    expect(wide.plot.bottom - wide.plot.top).toBeCloseTo(440, 9);
    expect(wide.width).toBeLessThanOrEqual(1200);
    expect(narrow.width).toBeLessThanOrEqual(300);
    expect(narrow.x(1000)).toBeCloseTo(narrow.plot.right, 9);
  });

  test('spaces the ticks 400 m apart when 200 m would crowd a narrow map', () => {
    const scale = buildMapScale(260, DOMAIN, 440);

    expect(scale.xTicks).toEqual([0, 400, 800]);
    expect(scale.yTicks).toEqual([0, 400, 800, 1200]);
  });

  test('puts ticks every 200 m inside the domain', () => {
    const scale = buildMapScale(640, DOMAIN, 440);

    expect(scale.xTicks).toEqual([0, 200, 400, 600, 800, 1000]);
    expect(scale.yTicks).toEqual([0, 200, 400, 600, 800, 1000, 1200]);
  });
});
