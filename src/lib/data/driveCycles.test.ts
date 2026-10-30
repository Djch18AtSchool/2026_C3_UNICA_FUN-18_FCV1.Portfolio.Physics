import { describe, expect, test } from 'vitest';
import raw from '../../data/drive-cycles.json';
import { MS_PER_MPH, type CycleSample } from '../physics/energy';
import { DRIVE_CYCLES, parseDriveCycles } from './driveCycles';

const M_PER_KM = 1000;
/** Distance by the same rule as the energy balance: mean speed of each interval times Δt. */
const distanceKm = (samples: CycleSample[]) =>
  samples
    .slice(1)
    .reduce((sum, s, i) => sum + ((samples[i].v + s.v) / 2) * (s.t - samples[i].t), 0) / M_PER_KM;
const maxMph = (samples: CycleSample[]) => Math.max(...samples.map((s) => s.v)) / MS_PER_MPH;

describe('DRIVE_CYCLES (EPA dynamometer schedules, research §4)', () => {
  test('UDDS has 1370 samples, one per second from 0 to 1369 s', () => {
    const { samples } = DRIVE_CYCLES.udds;

    expect(samples).toHaveLength(1370);
    samples.forEach((s, i) => expect(s.t).toBe(i));
  });

  test('UDDS covers 11,99 km and peaks at 56,7 mph', () => {
    expect(Math.abs(distanceKm(DRIVE_CYCLES.udds.samples) - 11.99)).toBeLessThanOrEqual(0.01);
    expect(maxMph(DRIVE_CYCLES.udds.samples)).toBeCloseTo(56.7, 6);
  });

  test('HWFET lasts 765 s (766 samples in the file), 16,507 km, up to 59,9 mph', () => {
    const { samples } = DRIVE_CYCLES.hwfet;

    expect(samples).toHaveLength(766);
    expect(samples[samples.length - 1].t).toBe(765);
    expect(distanceKm(samples)).toBeCloseTo(16.507, 3);
    expect(maxMph(samples)).toBeCloseTo(59.9, 6);
  });

  test('US06 lasts 600 s (601 samples in the file), 12,888 km, up to 80,3 mph', () => {
    const { samples } = DRIVE_CYCLES.us06;

    expect(samples).toHaveLength(601);
    expect(samples[samples.length - 1].t).toBe(600);
    expect(distanceKm(samples)).toBeCloseTo(12.888, 3);
    expect(maxMph(samples)).toBeCloseTo(80.3, 6);
  });

  test.each(['udds', 'hwfet', 'us06'] as const)(
    '%s starts and ends at rest; speeds are the file mph (0,1 mph steps) converted to m/s',
    (id) => {
      const { samples } = DRIVE_CYCLES[id];

      expect(samples[0].v).toBe(0);
      expect(samples[samples.length - 1].v).toBe(0);
      samples.forEach(({ v }) => {
        const tenthsOfMph = (v / MS_PER_MPH) * 10;
        expect(Math.abs(tenthsOfMph - Math.round(tenthsOfMph))).toBeLessThan(1e-4);
      });
    },
  );

  test('names the cycles and cites the downloaded EPA files with their hashes', () => {
    expect(DRIVE_CYCLES.udds.name).toBe('UDDS');
    expect(DRIVE_CYCLES.hwfet.name).toBe('HWFET');
    expect(DRIVE_CYCLES.us06.name).toBe('US06');
    expect(DRIVE_CYCLES.udds.source.url).toBe(
      'https://www.epa.gov/sites/default/files/2015-10/uddscol.txt',
    );
    expect(DRIVE_CYCLES.hwfet.source.url).toBe(
      'https://www.epa.gov/sites/default/files/2015-10/hwycol.txt',
    );
    expect(DRIVE_CYCLES.us06.source.url).toBe(
      'https://www.epa.gov/system/files/other-files/2025-03/us06col.txt',
    );
    expect(DRIVE_CYCLES.udds.source.sha256.startsWith('cc9f3edf')).toBe(true);
    expect(DRIVE_CYCLES.hwfet.source.sha256.startsWith('e48e278a')).toBe(true);
    expect(DRIVE_CYCLES.us06.source.sha256.startsWith('84e9d8cc')).toBe(true);
    Object.values(DRIVE_CYCLES).forEach(({ source }) =>
      expect(source.retrieved).toMatch(/^\d{4}-\d{2}-\d{2}$/),
    );
  });

  test('records the query: the EPA page and the three file URLs', () => {
    expect(raw.query.page).toBe(
      'https://www.epa.gov/vehicle-and-fuel-emissions-testing/dynamometer-drive-schedules',
    );
    expect(Object.keys(raw.query.urls).sort()).toEqual(['hwfet', 'udds', 'us06']);
  });
});

describe('parseDriveCycles', () => {
  const withUdds = (samples: unknown) => ({
    ...raw,
    cycles: { ...raw.cycles, udds: { ...raw.cycles.udds, samples } },
  });

  test('rejects a file without one of the three cycles', () => {
    const { us06: _dropped, ...cycles } = raw.cycles;

    expect(() => parseDriveCycles({ ...raw, cycles })).toThrow();
  });

  test('rejects a negative speed', () => {
    expect(() =>
      parseDriveCycles(
        withUdds([
          { t: 0, v: 0 },
          { t: 1, v: -1 },
        ]),
      ),
    ).toThrow();
  });

  test('rejects time that does not increase', () => {
    expect(() =>
      parseDriveCycles(
        withUdds([
          { t: 0, v: 0 },
          { t: 0, v: 1 },
        ]),
      ),
    ).toThrow(/increase/);
  });

  test('rejects a cycle with fewer than two samples', () => {
    expect(() => parseDriveCycles(withUdds([{ t: 0, v: 0 }]))).toThrow();
  });
});
