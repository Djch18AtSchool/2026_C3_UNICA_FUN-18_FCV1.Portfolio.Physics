import { describe, expect, test } from 'vitest';
import { DRIVE_CYCLES } from '../../../lib/data/driveCycles';
import { MODEL3_LR_RWD_2025 } from '../../../lib/data/evModels';
import { cycleBalance, DEFAULT_REGEN } from '../../../lib/physics/energy';
import {
  brakingEvents,
  brakingWindow,
  cycleDistance,
  ENERGY_BALANCE_SOURCE,
  energyBalanceSeries,
  FADE_REGEN,
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
const FADED = cycleBalance(UDDS, CAR, FADE_REGEN);

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

describe('brakingWindow', () => {
  const event = largestBrakingEvent(FADED.steps);
  const window = brakingWindow(FADED.steps, event, FADE_REGEN.eta);

  test('the f(v) model picks the same stop, since brake power does not depend on regen', () => {
    expect(event).toEqual(largestBrakingEvent(SITE.steps));
  });

  test('the series cover the stop with 5 s on each side, as steps of one second', () => {
    expect(window.brake[0].x).toBe(376);
    expect(window.brake.at(-1)?.x).toBe(402);
    // Two points per one-second interval.
    expect(window.brake).toHaveLength(2 * (402 - 376));
    expect(window.battery).toHaveLength(window.brake.length);
    expect(window.regen).toHaveLength(window.brake.length);
  });

  test('battery + conversion losses + friction = the brake energy of the stop', () => {
    const { brake, battery, losses, friction } = window.energies;

    expect(battery + losses + friction).toBeCloseTo(brake, 6);
    expect(brake).toBeCloseTo(event.energy, 6);
    expect(friction).toBeGreaterThan(0);
    expect(battery).toBeCloseTo(FADE_REGEN.eta * (brake - friction), 6);
  });

  test('the drawn areas (kW × s) equal those energies (kJ)', () => {
    expect(stepArea(window.brake)).toBeCloseTo(window.energies.brake / 1000, 6);
    expect(stepArea(window.regen)).toBeCloseTo(
      (window.energies.brake - window.energies.friction) / 1000,
      6,
    );
    expect(stepArea(window.battery)).toBeCloseTo(window.energies.battery / 1000, 6);
  });

  test('the stack never inverts: battery ≤ regenerated ≤ brake at every instant', () => {
    window.brake.forEach((point, i) => {
      expect(window.battery[i].y).toBeLessThanOrEqual(window.regen[i].y + 1e-12);
      expect(window.regen[i].y).toBeLessThanOrEqual(point.y + 1e-12);
    });
  });
});

describe('energyBalanceSeries', () => {
  const series = energyBalanceSeries(SITE.steps);

  test('one point per second for v (km/h) and for each of the five cumulative energies (kWh)', () => {
    expect(series.speed).toHaveLength(UDDS.length);
    expect(series.energies.map((s) => s.id)).toEqual([
      'traccion',
      'carga',
      'frenado',
      'bateria',
      'friccion',
    ]);
    for (const energy of series.energies) expect(energy.points).toHaveLength(UDDS.length);
    expect(series.speed[100].y).toBeCloseTo(UDDS[100].v * 3.6, 9);
  });

  test('the series end at the cycle totals: battery 0,695 kWh of 1,597 kWh of traction', () => {
    const end = (id: string) => series.energies.find((s) => s.id === id)?.points.at(-1)?.y;

    expect(end('traccion')).toBeCloseTo(SITE.totals.traction / J_PER_KWH, 9);
    expect(end('bateria')).toBeCloseTo(0.695, 3);
    expect(end('traccion')).toBeCloseTo(1.597, 3);
  });

  test('battery is green (--chart-3) and friction heat orange-red (--chart-2)', () => {
    const color = (id: string) => series.energies.find((s) => s.id === id)?.color;

    expect(color('bateria')).toBe('var(--chart-3)');
    expect(color('friccion')).toBe('var(--chart-2)');
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
