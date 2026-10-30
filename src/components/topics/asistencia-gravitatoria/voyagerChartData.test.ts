import { describe, expect, test } from 'vitest';
import { SUN_ONLY_ORBIT, VOYAGER, encounterJump } from '../../../lib/data/voyager';
import { AU_KM } from '../../../lib/data/planets';
import { jdFromIso } from './dateAxis';
import {
  ENCOUNTER_MARKERS,
  MISSION,
  VOYAGER_CHART_SOURCE,
  detailReadout,
  encounterDetail,
  hyperbolicRegions,
  missionReadout,
  valueAt,
  type ChartPoint,
} from './voyagerChartData';

const NNBSP = '\u202f';
const MINUS = '−';

describe('VOYAGER_CHART_SOURCE', () => {
  test('cites Horizons, the query date and the design segment, never a measured trajectory', () => {
    expect(VOYAGER_CHART_SOURCE).toBe(
      'Datos: NASA/JPL Horizons, consultados el 30 de octubre de 2026; trayectoria de diseño reconstruida hasta el 29 de agosto de 1989 y ajuste de 2022 a datos de seguimiento después',
    );
    expect(VOYAGER.retrieved).toBe('2026-10-30');
    expect(VOYAGER_CHART_SOURCE).not.toMatch(/medid/i);
  });
});

describe('ENCOUNTER_MARKERS', () => {
  test('the four Voyager 2 encounters, in planet colors, labelled with the signed vis-viva jump', () => {
    expect(ENCOUNTER_MARKERS.map((m) => [m.key, m.name, m.token])).toEqual([
      ['J', 'Júpiter', 'var(--jupiter)'],
      ['S', 'Saturno', 'var(--saturn)'],
      ['U', 'Urano', 'var(--uranus)'],
      ['N', 'Neptuno', 'var(--neptune)'],
    ]);
    expect(ENCOUNTER_MARKERS.map((m) => m.label)).toEqual([
      `+10,2${NNBSP}km/s`,
      `+4,9${NNBSP}km/s`,
      `+1,9${NNBSP}km/s`,
      `${MINUS}2,1${NNBSP}km/s`,
    ]);
  });

  test('each jump is encounterJump on the V2 series at its closest approach', () => {
    for (const marker of ENCOUNTER_MARKERS) {
      expect(marker.jump).toBe(encounterJump(VOYAGER.series.v2, marker.caJd, VOYAGER.gmSun));
    }
    expect(ENCOUNTER_MARKERS[1].caUtc).toBe('1981-08-26T03:24Z');
  });
});

describe('valueAt and hyperbolicRegions', () => {
  const line = (ys: number[]): ChartPoint[] => ys.map((y, x) => ({ x, y }));

  test('valueAt interpolates inside the points and is undefined outside them', () => {
    expect(valueAt(line([0, 10, 20]), 1.5)).toBe(15);
    expect(valueAt(line([0, 10, 20]), 2)).toBe(20);
    expect(valueAt(line([0, 10, 20]), 2.5)).toBeUndefined();
    expect(valueAt([], 0)).toBeUndefined();
  });

  test('a region runs from crossing to crossing, along the speed and back along the escape', () => {
    const regions = hyperbolicRegions(line([1, 3, 3, 1]), line([2, 2, 2, 2]));

    expect(regions).toHaveLength(1);
    const xs = regions[0].map((p) => p.x);
    expect(Math.min(...xs)).toBe(0.5);
    expect(Math.max(...xs)).toBe(2.5);
    expect(regions[0]).toContainEqual({ x: 1, y: 3 });
    expect(regions[0]).toContainEqual({ x: 1, y: 2 });
  });

  test('a speed above escape at both ends gives a region closed at the ends', () => {
    const regions = hyperbolicRegions(line([3, 1, 3]), line([2, 2, 2]));

    expect(regions).toHaveLength(2);
    expect(regions[0][0]).toEqual({ x: 0, y: 3 });
    expect(regions[1].some((p) => p.x === 2 && p.y === 3)).toBe(true);
  });
});

describe('MISSION', () => {
  test('spans 1977-08-21 (first sample) to 1990-01-01, V1 only until 1982', () => {
    expect(MISSION.domain.min).toBe(VOYAGER.series.v2[0].jd);
    expect(MISSION.domain.max).toBe(jdFromIso('1990-01-01'));
    expect(MISSION.speed.v1.at(-1)?.x).toBeLessThanOrEqual(jdFromIso('1982-01-01'));
    expect(MISSION.distance.v2).toHaveLength(VOYAGER.series.v2.length);
  });

  test('the escape speed stays below the V2 speed from 1979-07-10 on', () => {
    const after = jdFromIso('1979-07-10');
    MISSION.speed.v2.forEach((point, i) => {
      if (point.x < after) return;
      expect(MISSION.speed.escape[i].x).toBe(point.x);
      expect(MISSION.speed.escape[i].y, String(point.x)).toBeLessThan(point.y);
    });
  });

  test('one hyperbolic region, from the crossing ~13 h before Jupiter to the end of the data', () => {
    expect(MISSION.hyperbolic).toHaveLength(1);
    const xs = MISSION.hyperbolic[0].map((p) => p.x);
    expect(Math.min(...xs)).toBeGreaterThan(jdFromIso('1979-07-09T09:00Z'));
    expect(Math.min(...xs)).toBeLessThan(jdFromIso('1979-07-09T10:00Z'));
    expect(Math.max(...xs)).toBe(VOYAGER.series.v2.at(-1)?.jd);
  });

  test('the Sun-only counterfactual starts on 1979-01-01 and bottoms out at 6,21 km/s at aphelion', () => {
    const { sunOnly } = MISSION.speed;
    expect(sunOnly[0].x).toBe(jdFromIso('1979-01-01'));
    const slowest = sunOnly.reduce((low, p) => (p.y < low.y ? p : low));
    expect(slowest.y).toBeCloseTo(6.21, 2);
    expect(valueAt(MISSION.distance.sunOnly, slowest.x)).toBeCloseTo(
      SUN_ONLY_ORBIT.aphelion / AU_KM,
      2,
    );
    expect(Math.max(...sunOnly.map((p) => p.y))).toBeLessThan(40);
  });
});

describe('encounterDetail', () => {
  test('Jupiter: the peak inside the well (26,87 km/s) is not the jump (+10,2 km/s)', () => {
    const detail = encounterDetail('J');
    const ca = detail.marker.caJd;

    expect(detail.domain).toEqual({ min: ca - 5, max: ca + 5 });
    expect(detail.peak.y).toBe(26.868);
    expect(detail.peak.x - ca).toBeCloseTo(0.355, 2);
    expect(detail.after - detail.before).toBeCloseTo(detail.marker.jump, 12);
    expect(detail.before).toBeLessThan(detail.after);
    expect(detail.peak.y - detail.after).toBeGreaterThan(5);
    expect(detail.speed.length).toBeGreaterThan(200);
    expect(detail.hyperbolic).toHaveLength(1);
  });

  test('Neptune: the probe leaves slower than it came, so the jump is negative', () => {
    const detail = encounterDetail('N');

    expect(detail.after).toBeLessThan(detail.before);
    expect(detail.marker.label).toBe(`${MINUS}2,1${NNBSP}km/s`);
    expect(detail.peak.y).toBe(27.862);
  });
});

describe('readouts', () => {
  test('mission: date, both probes while V1 has data, bound or escaping, and the counterfactual', () => {
    const text = missionReadout(jdFromIso('1980-01-01'));

    expect(text).toMatch(/^1 ene 1980\. Voyager 2: \d+,\d{2}\u202fkm\/s/);
    expect(text).toContain('escapa del Sol');
    expect(text).toContain('Voyager 1:');
    expect(text).toContain('Solo el Sol:');
  });

  test('mission before 1979 and after 1982: no counterfactual yet, then no V1', () => {
    expect(missionReadout(jdFromIso('1978-06-01'))).toContain('ligada al Sol');
    expect(missionReadout(jdFromIso('1978-06-01'))).not.toContain('Solo el Sol');
    expect(missionReadout(jdFromIso('1985-06-01'))).not.toContain('Voyager 1');
  });

  test('detail: time from closest approach and the hourly speed', () => {
    const detail = encounterDetail('J');
    const text = detailReadout(detail, detail.peak.x);

    expect(text).toMatch(/^MA \+0,35\u202fd: 26,87\u202fkm\/s/);
    expect(text).toContain('escapa del Sol');
  });
});
