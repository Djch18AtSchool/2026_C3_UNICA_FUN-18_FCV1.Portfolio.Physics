import { statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { escapeSpeed, planarFlyby, specificEnergy } from '../physics';
import { AU_KM, GM_SUN, PLANETS } from './planets';
import raw from '../../data/voyager-speed.json';
import {
  SUN_ONLY_ORBIT,
  VOYAGER,
  VOYAGER_MASS_KG,
  encounterJump,
  escapeSpeedSeries,
  parseVoyagerDataset,
  sunOnlySeries,
  type Encounter,
  type SeriesPoint,
} from './voyager';

const JSON_PATH = fileURLToPath(new URL('../../data/voyager-speed.json', import.meta.url));
const MAX_JSON_BYTES = 100 * 1024;
const SECONDS_PER_JULIAN_YEAR = 365.25 * 86400;
const JUMP_TOLERANCE = 0.05;
/** 1979-07-01 and 1979-07-11, 00:00 TDB. */
const JD_1979_07_01 = 2444055.5;
const JD_1979_07_11 = 2444065.5;

const { v1, v2 } = VOYAGER.series;

function encounter(probe: Encounter['probe'], planet: Encounter['planet']): Encounter {
  const found = VOYAGER.encounters.find((e) => e.probe === probe && e.planet === planet);
  if (!found) throw new Error(`no ${probe} encounter with ${planet}`);
  return found;
}

const V2_ENCOUNTERS = (['jupiter', 'saturn', 'uranus', 'neptune'] as const).map((planet) =>
  encounter('V2', planet),
);

function energy(point: SeriesPoint): number {
  return specificEnergy(point.speed, point.r * AU_KM, GM_SUN);
}

describe('voyager-speed.json', () => {
  test('stays under 100 KB', () => {
    expect(statSync(JSON_PATH).size).toBeLessThan(MAX_JSON_BYTES);
  });

  test('records every Horizons request with its URL and the source lines of its header', () => {
    const { requests } = VOYAGER.query;

    expect(VOYAGER.query.endpoint).toBe('https://ssd.jpl.nasa.gov/api/horizons.api');
    expect(requests.length).toBe(27);
    requests.forEach((request) => {
      expect(request.url.startsWith(`${VOYAGER.query.endpoint}?`)).toBe(true);
      expect(request.url).toContain("EPHEM_TYPE='VECTORS'");
      expect(request.url).toContain("REF_PLANE='ECLIPTIC'");
      expect(request.url).toContain("OUT_UNITS='KM-S'");
      expect(request.sources.some((line) => /\{source: [^}]+\}/.test(line))).toBe(true);
    });
    expect(requests.map((r) => r.id)).toContain('v2-helio-5d');
    expect(requests.map((r) => r.id)).toContain('v1-helio-5d');
  });

  test('base series every 5 d: V2 1977-08-21 → 1990-01-01 and V1 1977-09-06 → 1982-01-01', () => {
    const base = Object.fromEntries(VOYAGER.query.requests.map((r) => [r.id, decodeURI(r.url)]));

    expect(base['v2-helio-5d']).toContain("COMMAND='-32'");
    expect(base['v2-helio-5d']).toContain("CENTER='500@10'");
    expect(base['v2-helio-5d']).toContain("START_TIME='1977-08-21'");
    expect(base['v2-helio-5d']).toContain("STOP_TIME='1990-01-01'");
    expect(base['v2-helio-5d']).toContain("STEP_SIZE='5 d'");
    expect(base['v1-helio-5d']).toContain("COMMAND='-31'");
    expect(base['v1-helio-5d']).toContain("START_TIME='1977-09-06'");
    expect(base['v1-helio-5d']).toContain("STOP_TIME='1982-01-01'");
  });

  test('closest-approach times come from minute steps in UT', () => {
    const minute = VOYAGER.query.requests.filter((r) => r.id.endsWith('-ca-1m'));

    expect(minute.length).toBe(6);
    minute.forEach((r) => {
      expect(r.url).toContain("TIME_TYPE='UT'");
      expect(decodeURI(r.url)).toContain("STEP_SIZE='1 m'");
    });
  });

  test('keeps the retrieval date and the trajectory notes: design conics, never measurements', () => {
    expect(VOYAGER.retrieved).toBe('2026-10-30');
    expect(VOYAGER.sourceNotes.V2).toMatch(/patched conic mission-design/);
    expect(VOYAGER.sourceNotes.V2).toMatch(/1977-Aug-20 to 1989-Aug-29/);
    expect(VOYAGER.sourceNotes.V2).toMatch(/24 impulsive maneuvers/);
    expect(VOYAGER.sourceNotes.V1).toMatch(/1977-Sep-5 to 1981-Jan-1/);
    expect(VOYAGER.gmSun).toBe(GM_SUN);
  });
});

describe('VOYAGER.series', () => {
  test('spans the requested dates in full Julian days (TDB), up to the last 5 d step', () => {
    const lastStepBefore = (stop: number) => (jd: number) => jd <= stop && jd > stop - 5;

    expect(v2[0].jd).toBe(2443376.5);
    expect(lastStepBefore(2447892.5)(v2[v2.length - 1].jd)).toBe(true);
    expect(v1[0].jd).toBe(2443392.5);
    expect(lastStepBefore(2444970.5)(v1[v1.length - 1].jd)).toBe(true);
  });

  test('every point is finite and positive, in strictly increasing time', () => {
    [v1, v2].forEach((series) => {
      series.forEach((point, i) => {
        expect(Number.isFinite(point.jd)).toBe(true);
        expect(point.speed).toBeGreaterThan(0);
        expect(point.r).toBeGreaterThan(0);
        if (i > 0) expect(point.jd).toBeGreaterThan(series[i - 1].jd);
      });
    });
  });

  test('samples every hour within ±5 d of each closest approach', () => {
    VOYAGER.encounters.forEach((e) => {
      const series = e.probe === 'V2' ? v2 : v1;
      const window = series.filter((p) => Math.abs(p.jd - e.caJd) <= 5);
      expect(window.length).toBeGreaterThanOrEqual(240);
    });
  });

  test('keeps the speed peak inside Jupiter’s well: 26,87 km/s for V2 (research §5)', () => {
    const jupiter = encounter('V2', 'jupiter');
    const peak = Math.max(
      ...v2.filter((p) => Math.abs(p.jd - jupiter.caJd) < 5).map((p) => p.speed),
    );

    expect(peak).toBeCloseTo(26.87, 1);
  });

  test('V2 is bound to the Sun before 1979-07-01 and unbound after 1979-07-11', () => {
    v2.filter((p) => p.jd < JD_1979_07_01).forEach((p) => expect(energy(p)).toBeLessThan(0));
    v2.filter((p) => p.jd > JD_1979_07_11).forEach((p) => expect(energy(p)).toBeGreaterThan(0));
  });

  test('V2 leaves at v∞ = √(2ε) ≈ 14,86 km/s = 3,13 AU/yr (NSSDCA: about 3.13 AU/year)', () => {
    const vInf = Math.sqrt(2 * energy(v2[v2.length - 1]));

    expect(vInf).toBeCloseTo(14.86, 1);
    expect(Math.abs((vInf * SECONDS_PER_JULIAN_YEAR) / AU_KM - 3.13)).toBeLessThan(0.01);
  });

  test('V2 moves steadily outward after Jupiter', () => {
    const jupiter = encounter('V2', 'jupiter');
    const after = v2.filter((p) => p.jd > jupiter.caJd);

    after.slice(1).forEach((p, i) => expect(p.r).toBeGreaterThanOrEqual(after[i].r));
  });
});

describe('encounterJump (vis-viva at the encounter distance, ε 120 d before and after)', () => {
  test('V2 gains +10,22, +4,94 and +1,87 km/s and loses −2,12 at Neptune (research §5)', () => {
    const expected = [10.22, 4.94, 1.87, -2.12];

    V2_ENCOUNTERS.forEach((e, i) => {
      expect(Math.abs(encounterJump(v2, e.caJd, GM_SUN) - expected[i])).toBeLessThan(
        JUMP_TOLERANCE,
      );
    });
  });

  test('V1 gains +10,93 km/s at Jupiter and +1,50 at Saturn (research §5)', () => {
    const jupiter = encounterJump(v1, encounter('V1', 'jupiter').caJd, GM_SUN);
    const saturn = encounterJump(v1, encounter('V1', 'saturn').caJd, GM_SUN);

    expect(Math.abs(jupiter - 10.93)).toBeLessThan(JUMP_TOLERANCE);
    expect(Math.abs(saturn - 1.5)).toBeLessThan(JUMP_TOLERANCE);
  });

  test('follows the definition by hand at sample instants, and is ≈ 0 between encounters', () => {
    // 1983-08-13, on the 5 d grid between Saturn and Uranus; ±120 d are grid samples too.
    const at = (jd: number) => v2.find((p) => p.jd === jd)!;
    const center = at(2445401.5);
    const before = at(2445281.5);
    const after = at(2445521.5);
    const rEnc = center.r * AU_KM;
    const byHand =
      Math.sqrt(2 * (energy(after) + GM_SUN / rEnc)) -
      Math.sqrt(2 * (energy(before) + GM_SUN / rEnc));

    expect(encounterJump(v2, center.jd, GM_SUN)).toBeCloseTo(byHand, 12);
    expect(Math.abs(byHand)).toBeLessThan(0.05);
  });

  test('a shorter window still inside the sphere of influence overstates Jupiter’s jump', () => {
    const jupiter = encounter('V2', 'jupiter');

    expect(encounterJump(v2, jupiter.caJd, GM_SUN, 10)).toBeGreaterThan(
      encounterJump(v2, jupiter.caJd, GM_SUN) + 0.5,
    );
  });

  test('rejects a window that leaves the series and a non-positive window', () => {
    const neptune = encounter('V2', 'neptune');

    expect(() => encounterJump(v2, neptune.caJd, GM_SUN, 200)).toThrow(RangeError);
    expect(() => encounterJump(v2, neptune.caJd, GM_SUN, 0)).toThrow(RangeError);
    expect(() => encounterJump([], neptune.caJd, GM_SUN)).toThrow(RangeError);
  });
});

describe('escapeSpeedSeries', () => {
  test('evaluates √(2GM☉/r) at the probe’s distance, one value per sample', () => {
    const escape = escapeSpeedSeries(v2);

    expect(escape.length).toBe(v2.length);
    escape.forEach((point, i) => {
      expect(point.jd).toBe(v2[i].jd);
      expect(point.speed).toBeCloseTo(escapeSpeed(v2[i].r * AU_KM, GM_SUN), 12);
    });
  });

  test('V2 speed is below escape before Jupiter and above it after', () => {
    const escape = escapeSpeedSeries(v2);

    v2.forEach((p, i) => {
      if (p.jd < JD_1979_07_01) expect(p.speed).toBeLessThan(escape[i].speed);
      if (p.jd > JD_1979_07_11) expect(p.speed).toBeGreaterThan(escape[i].speed);
    });
  });
});

describe('VOYAGER.encounters (osculating hyperbola at closest approach, research §5)', () => {
  test('lists six encounters, four of V2 and two of V1', () => {
    expect(VOYAGER.encounters.map((e) => `${e.probe} ${e.planet}`)).toEqual([
      'V2 jupiter',
      'V2 saturn',
      'V2 uranus',
      'V2 neptune',
      'V1 jupiter',
      'V1 saturn',
    ]);
  });

  test('closest approach to the minute in UT, Saturn–V2 at 03:24 as Horizons gives it', () => {
    expect(VOYAGER.encounters.map((e) => e.caUtc)).toEqual([
      '1979-07-09T22:29Z',
      '1981-08-26T03:24Z',
      '1986-01-24T17:59Z',
      '1989-08-25T03:56Z',
      '1979-03-05T12:05Z',
      '1980-11-12T23:46Z',
    ]);
  });

  test('periapsis distances from the planet centre within 1 km', () => {
    const expected = [721375, 160691, 107154, 29240, 348436, 184031];

    VOYAGER.encounters.forEach((e, i) => {
      expect(Math.abs(e.rpKm - expected[i])).toBeLessThanOrEqual(1);
    });
  });

  test('v∞ in and out from the planet-frame energy 10 d before and after', () => {
    const expected = [
      [7.639, 7.579],
      [10.675, 10.675],
      [14.732, 14.732],
      [16.743, 16.742],
      [10.765, 10.772],
      [15.169, 15.11],
    ];

    VOYAGER.encounters.forEach((e, i) => {
      expect(e.vInfIn).toBeCloseTo(expected[i][0], 2);
      expect(e.vInfOut).toBeCloseTo(expected[i][1], 2);
    });
  });

  test('V2 turn angles δ = 97,5 / 84,8 / 23,0 / 54,2°', () => {
    const expected = [97.5, 84.8, 23.0, 54.2];

    V2_ENCOUNTERS.forEach((e, i) => {
      expect(Math.abs(e.deltaDeg - expected[i])).toBeLessThanOrEqual(0.5);
    });
  });

  test('V2 patched-conic jumps +9,91 / +4,92 / +1,86 / −2,13 km/s', () => {
    const expected = [9.91, 4.92, 1.86, -2.13];

    V2_ENCOUNTERS.forEach((e, i) => {
      expect(Math.abs(e.conicAfter - e.conicBefore - expected[i])).toBeLessThan(JUMP_TOLERANCE);
    });
  });

  test('V2 at Jupiter: V_p = 12,749 km/s, θ_in = 131,5°, v∞ = 7,616 km/s, 9,59 → 19,50 km/s', () => {
    const jupiter = encounter('V2', 'jupiter');

    expect(jupiter.VpKms).toBeCloseTo(12.749, 2);
    expect(jupiter.thetaInDeg).toBeCloseTo(131.5, 0);
    expect(jupiter.vInf).toBeCloseTo(7.616, 2);
    expect(jupiter.conicBefore).toBeCloseTo(9.59, 1);
    expect(jupiter.conicAfter).toBeCloseTo(19.5, 1);
  });
});

describe('out-of-plane turns: what the planar model can and cannot rebuild', () => {
  const DEG = Math.PI / 180;
  const lawOfCosines = (Vp: number, vInf: number, thetaDeg: number) =>
    Math.sqrt(Vp * Vp + vInf * vInf + 2 * Vp * vInf * Math.cos(thetaDeg * DEG));

  test('V_p, v∞ and the asymptote angles θ_in, θ_out rebuild both conics for all six', () => {
    VOYAGER.encounters.forEach((e) => {
      expect(lawOfCosines(e.VpKms, e.vInf, e.thetaInDeg)).toBeCloseTo(e.conicBefore, 2);
      expect(lawOfCosines(e.VpKms, e.vInf, e.thetaOutDeg)).toBeCloseTo(e.conicAfter, 2);
    });
  });

  test('the (θ_in, δ, side) planar turn reproduces all but V2 Neptune and V1 Saturn', () => {
    expect(VOYAGER.encounters.map((e) => [e.probe, e.planet, e.planarSide])).toEqual([
      ['V2', 'jupiter', 'behind'],
      ['V2', 'saturn', 'behind'],
      ['V2', 'uranus', 'behind'],
      ['V2', 'neptune', null],
      ['V1', 'jupiter', 'behind'],
      ['V1', 'saturn', null],
    ]);
    VOYAGER.encounters.forEach((e) => {
      expect(e.planarTurnReproduces).toBe(e.planarSide !== null);
    });
  });

  test('where it reproduces, the planar turn lands within 0,05 km/s of the 3D conic', () => {
    VOYAGER.encounters
      .filter((e) => e.planarSide !== null)
      .forEach((e) => {
        const { gm } = PLANETS[e.planet];
        const f = planarFlyby(e.VpKms, e.vInf, e.thetaInDeg * DEG, e.rpKm, gm, e.planarSide!);
        expect(Math.abs(f.vOut - e.conicAfter)).toBeLessThan(JUMP_TOLERANCE);
        expect(f.vIn).toBeCloseTo(e.conicBefore, 2);
      });
  });

  test('V2 at Neptune turns out of the plane: θ_out is not θ_in ± δ', () => {
    const neptune = encounter('V2', 'neptune');

    expect(Math.abs(neptune.thetaOutDeg - (neptune.thetaInDeg - neptune.deltaDeg))).toBeGreaterThan(
      5,
    );
    expect(Math.abs(neptune.thetaOutDeg - (neptune.thetaInDeg + neptune.deltaDeg))).toBeGreaterThan(
      5,
    );
  });
});

describe('the «solo el Sol» counterfactual from V2’s state on 1979-01-01 (research §5, §8)', () => {
  const AU_YEAR_S = 365.25 * 86400;

  test('records the Horizons request and the state at 1979-01-01 00:00 TDB', () => {
    const request = VOYAGER.query.requests.find((r) => r.id === 'v2-state-1979-01-01');

    expect(request).toBeDefined();
    expect(decodeURI(request!.url)).toContain("START_TIME='1979-01-01'");
    expect(VOYAGER.sunOnlyState.jd).toBe(2443874.5);
    expect(VOYAGER.sunOnlyState.r).toHaveLength(3);
    expect(VOYAGER.sunOnlyState.v).toHaveLength(3);
  });

  test('bound orbit: a = 3,64 AU, e = 0,727, perihelion 0,997 AU, aphelion 6,29 AU, 6,96 yr', () => {
    expect(SUN_ONLY_ORBIT.energy).toBeCloseTo(-121.6, 0);
    expect(SUN_ONLY_ORBIT.a / AU_KM).toBeCloseTo(3.64, 2);
    expect(SUN_ONLY_ORBIT.e).toBeCloseTo(0.727, 3);
    expect(SUN_ONLY_ORBIT.perihelion / AU_KM).toBeCloseTo(0.997, 2);
    expect(SUN_ONLY_ORBIT.aphelion / AU_KM).toBeCloseTo(6.29, 2);
    expect(SUN_ONLY_ORBIT.period / AU_YEAR_S).toBeCloseTo(6.96, 2);
  });

  test('its speed would bottom out at 6,21 km/s at aphelion and come back', () => {
    const start = VOYAGER.sunOnlyState.jd;
    const jds = Array.from({ length: 1000 }, (_, k) => start + k * 3);
    const series = sunOnlySeries(jds);
    const slowest = series.reduce((min, p) => (p.speed < min.speed ? p : min));

    expect(slowest.speed).toBeCloseTo(6.21, 2);
    expect(slowest.r).toBeCloseTo(6.29, 1);
    const afterwards = series.filter((p) => p.jd > slowest.jd);
    expect(Math.max(...afterwards.map((p) => p.speed))).toBeGreaterThan(slowest.speed + 5);
  });

  test('starts on the data and follows it in the following weeks, before Jupiter pulls', () => {
    const { jd, r, v } = VOYAGER.sunOnlyState;
    const [first] = sunOnlySeries([jd]);
    const following = v2.filter((p) => p.jd > jd && p.jd < jd + 30);
    const propagated = sunOnlySeries(following.map((p) => p.jd));

    expect(first.speed).toBeCloseTo(Math.hypot(...v), 9);
    expect(first.r).toBeCloseTo(Math.hypot(...r) / AU_KM, 9);
    expect(following.length).toBe(6);
    following.forEach((p, k) => {
      expect(Math.abs(propagated[k].speed - p.speed)).toBeLessThan(0.01);
      expect(Math.abs(propagated[k].r - p.r)).toBeLessThan(0.001);
    });
  });

  test('conserves the solar energy along the whole counterfactual', () => {
    const series = sunOnlySeries([2443874.5, 2444500.5, 2445500.5, 2446000.5]);

    series.forEach((p) => expect(energy(p)).toBeCloseTo(SUN_ONLY_ORBIT.energy, 2));
  });

  test('rejects a date before the state', () => {
    expect(() => sunOnlySeries([VOYAGER.sunOnlyState.jd - 1])).toThrow(RangeError);
  });
});

describe('VOYAGER_MASS_KG and Jupiter’s recoil', () => {
  test('721,9 kg (NASA, NSSDCA)', () => {
    expect(VOYAGER_MASS_KG).toBe(721.9);
  });
});

describe('parseVoyagerDataset', () => {
  test('accepts the committed JSON', () => {
    expect(parseVoyagerDataset(raw).series.v2.length).toBe(v2.length);
  });

  test('rejects a point with a non-finite or negative speed', () => {
    const broken = structuredClone(raw) as { series: { v2: number[][] } };
    broken.series.v2[0][1] = -1;

    expect(() => parseVoyagerDataset(broken)).toThrow();
  });

  test('rejects an unknown probe or planet in the encounters', () => {
    const broken = structuredClone(raw) as { encounters: { planet: string }[] };
    broken.encounters[0].planet = 'pluto';

    expect(() => parseVoyagerDataset(broken)).toThrow();
  });
});
