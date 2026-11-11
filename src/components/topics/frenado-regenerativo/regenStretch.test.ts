import { describe, expect, test } from 'vitest';
import { DRIVE_CYCLES } from '../../../lib/data/driveCycles';
import { MODEL3_LR_RWD_2025 } from '../../../lib/data/evModels';
import { cycleBalance, DEFAULT_REGEN, type CycleSample } from '../../../lib/physics/energy';
import { BRAKING_PAD_S, brakingWindow, largestBrakingEvent } from './regenFigures';
import { balanceAt, cumulativeDistance } from './regenScene';
import {
  balanceSince,
  brakingStretch,
  stretchAxisMax,
  CYCLE_TIME_LAPSE,
  cycleStops,
  markersInStretch,
  stopMarkers,
  viewSwitchTime,
  viewTiming,
} from './regenStretch';

const UDDS = DRIVE_CYCLES.udds.samples;
const HWFET = DRIVE_CYCLES.hwfet.samples;
const speedAt = (samples: readonly CycleSample[], t: number) =>
  samples.find((sample) => sample.t === t)?.v;

/** A made-up run: rest, a ramp up to `top` m/s, a cruise, a ramp down to rest, rest again. */
function oneStop(restBefore: number, restAfter: number, top = 15): CycleSample[] {
  const profile = [
    ...Array.from({ length: restBefore }, () => 0),
    ...Array.from({ length: 6 }, (_, i) => (top * (i + 1)) / 6),
    ...Array.from({ length: 5 }, () => top),
    ...Array.from({ length: 6 }, (_, i) => (top * (5 - i)) / 6),
    ...Array.from({ length: restAfter }, () => 0),
  ];
  return profile.map((v, t) => ({ t, v }));
}

describe('cycleStops', () => {
  const stops = cycleStops(UDDS);

  test('the UDDS stops 17 times: each stop is a sample at v = 0 right after one in motion', () => {
    expect(stops).toHaveLength(17);
    for (const t of stops) {
      expect(speedAt(UDDS, t)).toBe(0);
      expect(speedAt(UDDS, t - 1)).toBeGreaterThan(0);
    }
  });

  test('the rest before the first start is not a stop; the first is at 125 s and the last at 1 367 s', () => {
    expect(stops[0]).toBe(125);
    expect(stops.at(-1)).toBe(1367);
    expect(stops).toEqual([...stops].sort((a, b) => a - b));
  });

  test('a stop of a single second counts (the UDDS touches 0 at 766 s and leaves)', () => {
    expect(stops).toContain(766);
    expect(speedAt(UDDS, 767)).toBeGreaterThan(0);
  });

  test('the highway cycle stops once, at its end; a run that never moves has none', () => {
    expect(cycleStops(HWFET)).toEqual([763]);
    expect(
      cycleStops([
        { t: 0, v: 0 },
        { t: 1, v: 0 },
      ]),
    ).toEqual([]);
  });

  test('a run that ends in motion has no stop at its end', () => {
    expect(
      cycleStops([
        { t: 0, v: 0 },
        { t: 1, v: 2 },
        { t: 2, v: 3 },
      ]),
    ).toEqual([]);
  });
});

describe('stopMarkers', () => {
  test('one stop marker per stop, named by its place in the cycle', () => {
    const markers = stopMarkers([125, 333, 397]);

    expect(markers).toEqual([
      { t: 125, label: 'Detención 1 de 3', kind: 'stop' },
      { t: 333, label: 'Detención 2 de 3', kind: 'stop' },
      { t: 397, label: 'Detención 3 de 3', kind: 'stop' },
    ]);
  });

  test('none without stops; a single stop is just «Detención», not «1 de 1»', () => {
    expect(stopMarkers([])).toEqual([]);
    expect(stopMarkers([763])).toEqual([{ t: 763, label: 'Detención', kind: 'stop' }]);
  });
});

describe('brakingStretch', () => {
  test('in the UDDS it is figure 6.3: the braking of 381–397 s with 5 s on each side, 376–402 s', () => {
    const { steps } = cycleBalance(UDDS, MODEL3_LR_RWD_2025, DEFAULT_REGEN);
    const figure = brakingWindow(steps, largestBrakingEvent(steps), DEFAULT_REGEN.eta);

    expect(brakingStretch(UDDS)).toEqual({ start: 376, end: 402 });
    expect(figure.brake[0].x).toBe(376);
    expect(figure.brake.at(-1)?.x).toBe(402);
    expect(BRAKING_PAD_S).toBe(5);
  });

  test('the stretch holds the whole braking, down to the stop', () => {
    const { start, end } = brakingStretch(UDDS);

    expect(speedAt(UDDS, start)).toBeGreaterThan(0);
    expect(cycleStops(UDDS).filter((t) => t >= start && t <= end)).toEqual([397]);
  });

  test('the last braking of a cycle ends at the cycle: the highway stretch stops at 765 s, not 768 s', () => {
    expect(brakingStretch(HWFET)).toEqual({ start: 729, end: 765 });
  });

  test('a braking near the start begins the stretch at the cycle’s first instant', () => {
    const run = oneStop(0, 10);

    expect(brakingStretch(run).start).toBe(5);
    expect(brakingStretch(run, 20).start).toBe(0);
  });

  test('with a single braking, the stretch is it and its pads, clamped to the run', () => {
    const run = oneStop(3, 2);

    expect(brakingStretch(run)).toEqual({ start: 8, end: run.at(-1)?.t });
  });

  test('the stretch does not depend on the car the lab shows: it is the cycle’s, with the reference car', () => {
    expect(brakingStretch(UDDS)).toEqual(brakingStretch(UDDS, BRAKING_PAD_S, MODEL3_LR_RWD_2025));
  });

  test('a run without braking has no stretch', () => {
    expect(() =>
      brakingStretch([
        { t: 0, v: 0 },
        { t: 1, v: 1 },
      ]),
    ).toThrow(RangeError);
  });
});

describe('markersInStretch', () => {
  const markers = stopMarkers(cycleStops(UDDS));

  test('the UDDS stretch holds the 3rd stop, on the stretch’s own clock and with the cycle’s name', () => {
    expect(markersInStretch(markers, { start: 376, end: 402 })).toEqual([
      { t: 21, label: 'Detención 3 de 17', kind: 'stop' },
    ]);
  });

  test('a marker on either end of the stretch is kept; outside, dropped', () => {
    expect(markersInStretch(markers, { start: 397, end: 429 }).map((m) => m.t)).toEqual([0, 32]);
    expect(markersInStretch(markers, { start: 398, end: 428 })).toEqual([]);
  });

  test('the given markers are not touched', () => {
    const before = structuredClone(markers);
    markersInStretch(markers, { start: 376, end: 402 });

    expect(markers).toEqual(before);
  });
});

describe('view timing', () => {
  const stretch = { start: 376, end: 402 };

  test('«Tramo» plays the stretch at real time on its own clock; «Ciclo», the whole cycle 20 times faster', () => {
    expect(viewTiming('tramo', stretch, 1369)).toEqual({ offset: 376, duration: 26, timeScale: 1 });
    expect(viewTiming('ciclo', stretch, 1369)).toEqual({
      offset: 0,
      duration: 1369,
      timeScale: CYCLE_TIME_LAPSE,
    });
    expect(CYCLE_TIME_LAPSE).toBe(20);
  });

  test('switching keeps the instant of the cycle when the new view holds it', () => {
    const tramo = viewTiming('tramo', stretch, 1369);
    const ciclo = viewTiming('ciclo', stretch, 1369);

    expect(viewSwitchTime(ciclo, 389)).toBe(389);
    expect(viewSwitchTime(tramo, 389)).toBe(13);
    expect(viewSwitchTime(tramo, 376)).toBe(0);
    expect(viewSwitchTime(tramo, 402)).toBe(26);
  });

  test('outside the stretch, «Tramo» starts from its beginning', () => {
    const tramo = viewTiming('tramo', stretch, 1369);

    expect(viewSwitchTime(tramo, 116)).toBe(0);
    expect(viewSwitchTime(tramo, 1369)).toBe(0);
  });
});

describe('balanceSince', () => {
  const { steps } = cycleBalance(UDDS, MODEL3_LR_RWD_2025, DEFAULT_REGEN);
  const distances = cumulativeDistance(UDDS);
  const at = (t: number) => balanceAt(steps, distances, t);
  const ENERGIES = [
    'eTraction',
    'eRoadLoad',
    'eBrake',
    'eBattery',
    'eConversionLoss',
    'eFriction',
  ] as const;

  test('at the stretch’s start every energy of the stretch is 0, and so is the share', () => {
    const start = balanceSince(at(376), at(376));

    for (const key of ENERGIES) expect(start[key]).toBe(0);
    expect(start.recoveredShare).toBe(0);
  });

  test('at its end the stretch holds figure 6.3’s braking: 224 kJ = battery + losses + friction', () => {
    const event = largestBrakingEvent(steps);
    const figure = brakingWindow(steps, event, DEFAULT_REGEN.eta).energies;
    const end = balanceSince(at(402), at(376));

    expect(end.eBrake).toBeCloseTo(figure.brake, 6);
    expect(end.eBattery).toBeCloseTo(figure.battery, 6);
    expect(end.eConversionLoss).toBeCloseTo(figure.losses, 6);
    expect(end.eFriction).toBeCloseTo(figure.friction, 6);
    expect(Math.round(end.eBrake / 1000)).toBe(224);
  });

  test('the share recovered in a stretch is of its braking at the wheels: 75,0 % in the UDDS’s', () => {
    const end = balanceSince(at(402), at(376));

    expect(end.recoveredShare).toBeCloseTo(end.eBattery / end.eBrake, 12);
    expect(end.recoveredShare * 100).toBeCloseTo(75.0, 1);
  });

  test('speed, distance and powers stay the instant’s own', () => {
    const now = at(389);
    const since = balanceSince(now, at(376));

    expect([since.t, since.v, since.distance, since.pWheel, since.pBattery]).toEqual([
      now.t,
      now.v,
      now.distance,
      now.pWheel,
      now.pBattery,
    ]);
  });
});

describe('stretchAxisMax', () => {
  const { steps } = cycleBalance(UDDS, MODEL3_LR_RWD_2025, DEFAULT_REGEN);
  const distances = cumulativeDistance(UDDS);
  const at = (t: number) => balanceAt(steps, distances, t);

  test('the bars of a stretch end at its largest energy rounded up to 50 kJ: 250 kJ in the UDDS', () => {
    expect(stretchAxisMax(at(376), at(402))).toBe(250);
  });

  test('never below 50 kJ, even for a stretch where nothing happens', () => {
    expect(stretchAxisMax(at(0), at(10))).toBe(50);
  });
});
