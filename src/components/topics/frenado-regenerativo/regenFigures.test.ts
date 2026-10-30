import { describe, expect, test } from 'vitest';
import { DRIVE_CYCLES } from '../../../lib/data/driveCycles';
import { MODEL3_LR_RWD_2025 } from '../../../lib/data/evModels';
import { cycleBalance, DEFAULT_REGEN } from '../../../lib/physics/energy';
import { ENERGY_SERIES } from './regenScene';
import {
  brakingEvents,
  brakingWindow,
  cycleDistance,
  ENERGY_BALANCE_SOURCE,
  energyBalanceSeries,
  energyColor,
  NO_FADE_REGEN,
  J_PER_KWH,
  KINETIC_WINDOW_S,
  kineticEnergyFigure,
  largestBrakingEvent,
  roadLoadCrossover,
  roadLoadTerms,
} from './regenFigures';

const UDDS = DRIVE_CYCLES.udds.samples;
const CAR = MODEL3_LR_RWD_2025;
const SITE = cycleBalance(UDDS, CAR, DEFAULT_REGEN);
const NO_FADE = cycleBalance(UDDS, CAR, NO_FADE_REGEN);

/** Area under a piecewise-constant series drawn as (t0, p), (t1, p) pairs: Σ p·Δt. */
function stepArea(points: { x: number; y: number }[]): number {
  let area = 0;
  for (let i = 1; i < points.length; i += 1) {
    if (points[i].y === points[i - 1].y) area += points[i].y * (points[i].x - points[i - 1].x);
  }
  return area;
}

describe('kineticEnergyFigure', () => {
  const figure = kineticEnergyFigure(UDDS, CAR.m);

  test('K(t) covers the first 200 s of the UDDS, one point per second, in kJ', () => {
    expect(KINETIC_WINDOW_S).toBe(200);
    expect(figure.k).toHaveLength(201);
    expect(figure.k.at(-1)?.x).toBe(200);
    const sample = UDDS[120];
    expect(figure.k[120].y).toBeCloseTo((0.5 * CAR.m * sample.v ** 2) / 1000, 9);
  });

  test('every deceleration in the window is drawn: one segment per run of falling speed', () => {
    const segments = figure.drops.filter((p) => Number.isNaN(p.y)).length;

    expect(figure.events).toHaveLength(segments);
    expect(figure.events).toHaveLength(12);
    for (const event of figure.events) {
      expect(UDDS[event.end].v).toBeLessThan(UDDS[event.start].v);
    }
  });

  test('the largest drop is the stop at 113–125 s: 202 kJ, from about 52 km/h', () => {
    expect(figure.largest.tStart).toBe(113);
    expect(figure.largest.tEnd).toBe(125);
    expect(figure.largest.drop / 1000).toBeCloseTo(202.2, 1);
    expect(figure.largest.vStart * 3.6).toBeCloseTo(52.1, 1);
  });
});

describe('roadLoadTerms', () => {
  const terms = roadLoadTerms(CAR.roadLoad);

  test('the three terms add up to F_RL at every speed, with A constant', () => {
    expect(terms.total).toHaveLength(terms.rolling.length);
    terms.total.forEach((point, i) => {
      expect(point.y).toBeCloseTo(terms.rolling[i].y + terms.linear[i].y + terms.aero[i].y, 9);
      expect(terms.rolling[i].y).toBeCloseTo(CAR.roadLoad.A, 9);
    });
    expect(terms.total[0]).toEqual({ x: 0, y: CAR.roadLoad.A });
  });

  test('the speed axis reaches the US06 top speed, 80,3 mph = 35,9 m/s', () => {
    expect(terms.total.at(-1)?.x).toBeGreaterThanOrEqual(35.9);
  });

  test('air overtakes rolling at v = √(A/C) = 21,0 m/s', () => {
    expect(roadLoadCrossover(CAR.roadLoad)).toBeCloseTo(21.04, 2);
  });
});

describe('brakingEvents', () => {
  const events = brakingEvents(SITE.steps);

  test('the events partition the brake energy of the cycle', () => {
    const total = events.reduce((sum, e) => sum + e.energy, 0);

    expect(events.length).toBeGreaterThan(50);
    expect(total).toBeCloseTo(SITE.totals.brake, 6);
  });

  test('the largest is the stop at 381–397 s from 36,4 mph, 224 kJ at the wheels', () => {
    const largest = largestBrakingEvent(SITE.steps);

    expect(largest.energy).toBe(Math.max(...events.map((e) => e.energy)));
    expect(SITE.steps[largest.start].t).toBe(381);
    expect(SITE.steps[largest.end].t).toBe(397);
    expect(largest.energy / 1000).toBeCloseTo(224.0, 1);
  });

  test('a cycle with no braking has no event, and largestBrakingEvent says so', () => {
    const cruise = cycleBalance(
      [
        { t: 0, v: 0 },
        { t: 1, v: 1 },
      ],
      CAR,
      DEFAULT_REGEN,
    );

    expect(brakingEvents(cruise.steps)).toEqual([]);
    expect(() => largestBrakingEvent(cruise.steps)).toThrow(RangeError);
  });
});

describe('NO_FADE_REGEN', () => {
  test('is the site model with the fade off, the contrast of step 3', () => {
    expect(NO_FADE_REGEN).toEqual({ ...DEFAULT_REGEN, lowSpeedFade: false });
    expect(DEFAULT_REGEN.lowSpeedFade).toBe(true);
  });
});

describe('brakingWindow', () => {
  const event = largestBrakingEvent(SITE.steps);
  const stop = brakingWindow(SITE.steps, event, DEFAULT_REGEN.eta);
  const contrast = brakingWindow(NO_FADE.steps, event, NO_FADE_REGEN.eta);

  test('the no-fade model picks the same stop, since brake power does not depend on regen', () => {
    expect(largestBrakingEvent(NO_FADE.steps)).toEqual(event);
  });

  test('the series cover the stop with 5 s on each side, as steps of one second', () => {
    expect(stop.brake[0].x).toBe(376);
    expect(stop.brake.at(-1)?.x).toBe(402);
    // Two points per one-second interval.
    expect(stop.brake).toHaveLength(2 * (402 - 376));
    expect(stop.battery).toHaveLength(stop.brake.length);
    expect(stop.regen).toHaveLength(stop.brake.length);
  });

  test('battery + conversion losses + friction = the brake energy of the stop', () => {
    const { brake, battery, losses, friction } = stop.energies;
    const [first, last] = [SITE.steps[event.start], SITE.steps[event.end]];

    expect(battery + losses + friction).toBeCloseTo(brake, 6);
    expect(brake).toBeCloseTo(event.energy, 6);
    expect(friction).toBeGreaterThan(0);
    expect(losses).toBeCloseTo(last.eConversionLoss - first.eConversionLoss, 6);
    expect(battery).toBeCloseTo(DEFAULT_REGEN.eta * (brake - friction), 6);
  });

  test('without the fade nothing goes to friction and the battery gets η of the braking', () => {
    expect(contrast.energies.friction).toBeCloseTo(0, 9);
    expect(contrast.energies.battery).toBeCloseTo(NO_FADE_REGEN.eta * contrast.energies.brake, 6);
    expect(contrast.energies.battery).toBeGreaterThan(stop.energies.battery);
  });

  test('the drawn areas (kW × s) equal those energies (kJ)', () => {
    expect(stepArea(stop.brake)).toBeCloseTo(stop.energies.brake / 1000, 6);
    expect(stepArea(stop.regen)).toBeCloseTo(
      (stop.energies.brake - stop.energies.friction) / 1000,
      6,
    );
    expect(stepArea(stop.battery)).toBeCloseTo(stop.energies.battery / 1000, 6);
  });

  test('the stack never inverts: battery ≤ regenerated ≤ brake at every instant', () => {
    stop.brake.forEach((point, i) => {
      expect(stop.battery[i].y).toBeLessThanOrEqual(stop.regen[i].y + 1e-12);
      expect(stop.regen[i].y).toBeLessThanOrEqual(point.y + 1e-12);
    });
  });
});

describe('energyBalanceSeries', () => {
  const series = energyBalanceSeries(SITE.steps);

  test('one point per second for v (km/h) and for each of the six cumulative energies (kWh)', () => {
    expect(series.speed).toHaveLength(UDDS.length);
    expect(series.energies.map((s) => s.key)).toEqual(ENERGY_SERIES.map((s) => s.key));
    expect(series.energies.map((s) => s.key)).toEqual([
      'eTraction',
      'eRoadLoad',
      'eBrake',
      'eBattery',
      'eConversionLoss',
      'eFriction',
    ]);
    for (const energy of series.energies) expect(energy.points).toHaveLength(UDDS.length);
    expect(series.speed[100].y).toBeCloseTo(UDDS[100].v * 3.6, 9);
  });

  test('the series end at the cycle totals of the site model', () => {
    const end = (key: string) => series.energies.find((s) => s.key === key)?.points.at(-1)?.y;

    expect(end('eTraction')).toBeCloseTo(SITE.totals.traction / J_PER_KWH, 9);
    expect(end('eBattery')).toBeCloseTo(SITE.totals.battery / J_PER_KWH, 9);
    expect(end('eConversionLoss')).toBeCloseTo(SITE.totals.conversionLoss / J_PER_KWH, 9);
    expect(end('eFriction')).toBeCloseTo(SITE.totals.friction / J_PER_KWH, 9);
    expect(end('eBattery')).toBeCloseTo(0.645, 3);
  });

  test('battery green, conversion loss cyan, friction orange-red, brake not a neutral', () => {
    const color = (key: string) => series.energies.find((s) => s.key === key)?.color;

    expect(color('eBattery')).toBe('var(--chart-3)');
    expect(color('eConversionLoss')).toBe('var(--chart-6)');
    expect(color('eFriction')).toBe('var(--chart-2)');
    expect(color('eBrake')).not.toBe(color('eConversionLoss'));
    expect(energyColor('eBrake')).toBe(color('eBrake'));
    for (const energy of series.energies) expect(energy.color).toMatch(/^var\(--[a-z0-9-]+\)$/);
  });
});

describe('cycleDistance', () => {
  test('the UDDS is 11,99 km long (research §4)', () => {
    expect(cycleDistance(DRIVE_CYCLES.udds) / 1000).toBeCloseTo(11.99, 2);
  });
});

describe('ENERGY_BALANCE_SOURCE', () => {
  test('separates real data (EPA) from the model (own calculation with FASTSim)', () => {
    expect(ENERGY_BALANCE_SOURCE.text).toBe(
      'Ciclo UDDS y coeficientes de carga: EPA (datos reales); reparto regenerativo/fricción: cálculo propio con el modelo y los parámetros de FASTSim',
    );
    expect(ENERGY_BALANCE_SOURCE.url).toMatch(/^https:\/\/www\.epa\.gov\//);
  });
});
