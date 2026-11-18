import { statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { criticalPedestrians, vortexFrequency } from '../physics/resonance';
import { estimatePeriod } from '../video/periodEstimate';
import raw from '../../data/tacoma-torsion.json';
import {
  FT_TO_M,
  MARCH_PACE,
  MARCH_PACE_HZ,
  MILLENNIUM,
  MPH_TO_M_PER_S,
  SETRA_RANGES,
  TACOMA,
  TACOMA_SI,
  TACOMA_TORSION,
  parseTacomaTorsion,
  type SourcedRange,
  type SourcedValue,
} from './bridges';

const PUBLIC = new URL('../../../public/media/resonancia-estructural/', import.meta.url);
const MAX_VIDEO_BYTES = 20 * 1024 * 1024;
const MAX_JSON_BYTES = 40 * 1024;
const JSON_PATH = fileURLToPath(new URL('../../data/tacoma-torsion.json', import.meta.url));

function expectSourced(entry: SourcedValue | SourcedRange): void {
  expect(entry.source.length).toBeGreaterThan(10);
  expect(['producto', 'ilustrativo', 'calculo']).toContain(entry.origin);
}

describe('Tacoma Narrows (FWA 1941; Billah and Scanlan 1991)', () => {
  test('the numbers the page states, each with its source and origin', () => {
    expect(TACOMA.windMph.value).toBe(42);
    expect(TACOMA.torsionCyclesPerMin.value).toBe(12);
    expect(TACOMA.torsionStartCyclesPerMin.value).toBe(14);
    expect([TACOMA.verticalCyclesPerMin.min, TACOMA.verticalCyclesPerMin.max]).toEqual([36, 38]);
    expect(TACOMA.quarterPointRotationDeg.value).toBe(45);
    expect(TACOMA.torsionDampingRatio.value).toBe(0.005);
    expect(TACOMA.deckDepthFt.value).toBe(8);
    expect(TACOMA.strouhal.value).toBe(0.11);
    Object.values(TACOMA).forEach(expectSourced);
    Object.values(TACOMA).forEach((entry) => expect(entry.origin).toBe('producto'));
  });

  test('SI conversions (cálculo propio): 18,8 m/s, 2,44 m, 0,20 Hz, 0,23 Hz, 0,60–0,63 Hz', () => {
    expect(MPH_TO_M_PER_S).toBe(0.44704);
    expect(FT_TO_M).toBe(0.3048);
    expect(TACOMA_SI.windMs.value).toBeCloseTo(18.78, 2);
    expect(TACOMA_SI.deckDepthM.value).toBeCloseTo(2.438, 3);
    expect(TACOMA_SI.torsionHz.value).toBeCloseTo(0.2, 12);
    expect(TACOMA_SI.torsionStartHz.value).toBeCloseTo(0.233, 3);
    expect(TACOMA_SI.verticalHz.min).toBeCloseTo(0.6, 12);
    expect(TACOMA_SI.verticalHz.max).toBeCloseTo(0.633, 3);
    Object.values(TACOMA_SI).forEach((entry) => expect(entry.origin).toBe('calculo'));
  });

  test('vortex shedding at 42 mph is ≈ 0,85 Hz, about 4,2 times the torsion', () => {
    const fs = TACOMA_SI.vortexHz.value;

    expect(fs).toBeCloseTo(0.85, 2);
    expect(fs).toBe(
      vortexFrequency(TACOMA.strouhal.value, TACOMA_SI.windMs.value, TACOMA_SI.deckDepthM.value),
    );
    expect(fs / TACOMA_SI.torsionHz.value).toBeCloseTo(4.2, 1);
  });
});

describe('Millennium Bridge (Dallard et al. 2001; Newland 2002)', () => {
  test('k_p ≈ 300 N·s/m, 166 people on the north span, 37 viscous dampers', () => {
    expect(MILLENNIUM.lateralForceCoefficient.value).toBe(300);
    expect(MILLENNIUM.northSpanCriticalPedestrians.value).toBe(166);
    expect(MILLENNIUM.viscousDampers.value).toBe(37);
  });

  test('damping went from under 1 % to 15–20 % of critical', () => {
    expect(MILLENNIUM.dampingBefore.max).toBe(0.01);
    expect([MILLENNIUM.dampingAfter.min, MILLENNIUM.dampingAfter.max]).toEqual([0.15, 0.2]);
  });

  test('the first central lateral mode gives ≈ 37 people as built and ≈ 1 180 with ζ = 20 %', () => {
    const { cl1Measured, cl1Analysed, lateralForceCoefficient: kp } = MILLENNIUM;
    const asBuilt = criticalPedestrians(
      cl1Measured.dampingRatio.value,
      cl1Measured.frequencyHz.value,
      cl1Measured.modalMassKg.value,
      kp.value,
    );
    const damped = criticalPedestrians(
      0.2,
      cl1Analysed.frequencyHz.value,
      cl1Analysed.modalMassKg.value,
      kp.value,
    );

    expect(Math.round(asBuilt)).toBe(37);
    expect(Math.round(damped / 10) * 10).toBe(1180);
  });

  test('every entry has its source and origin', () => {
    const { cl1Measured, cl1Analysed, ...rest } = MILLENNIUM;
    [...Object.values(rest), ...Object.values(cl1Measured), ...Object.values(cl1Analysed)].forEach(
      expectSourced,
    );
  });
});

describe('Sétra ranges and the march pace', () => {
  test('maximum-risk ranges: vertical 1,7–2,1 Hz, lateral 0,5–1,1 Hz', () => {
    expect([SETRA_RANGES.vertical.min, SETRA_RANGES.vertical.max]).toEqual([1.7, 2.1]);
    expect([SETRA_RANGES.lateral.min, SETRA_RANGES.lateral.max]).toEqual([0.5, 1.1]);
    expectSourced(SETRA_RANGES.vertical);
    expectSourced(SETRA_RANGES.lateral);
  });

  test('quick time is 120 steps/min = 2,0 Hz, inside the vertical range', () => {
    expect(MARCH_PACE.value).toBe(120);
    expectSourced(MARCH_PACE);
    expect(MARCH_PACE_HZ).toBe(2);
    expect(MARCH_PACE_HZ).toBeGreaterThanOrEqual(SETRA_RANGES.vertical.min);
    expect(MARCH_PACE_HZ).toBeLessThanOrEqual(SETRA_RANGES.vertical.max);
  });
});

describe('tacoma-torsion.json (pnpm run data:tacoma)', () => {
  const { shots, series } = TACOMA_TORSION;

  // Ruling R13: shot 1 (0:14,3–0:25,3) reads ≈ 3,58 s, not the research's 3,49 s. Its real
  // horizon tilt is only ±2 px; the 3,49 s came from the prototype's zero-padded smoothing, which
  // turned the tilt into a square wave (frameSignals.ts). The limits are what the data support.
  test('three shots, each with a video period in [3,40; 3,60] s', () => {
    expect(shots).toHaveLength(3);
    shots.forEach((shot) => {
      expect(shot.periodVideoS).toBeGreaterThanOrEqual(3.4);
      expect(shot.periodVideoS).toBeLessThanOrEqual(3.6);
    });
  });

  test('the shots are the research §6.2 ones, in order', () => {
    expect(shots.map((shot) => [shot.startS, shot.endS])).toEqual([
      [14.3, 25.3],
      [25.3, 32.6],
      [61.7, 69.4],
    ]);
    expect(shots.map((shot) => shot.signal)).toEqual(['inclinacion', 'inclinacion', 'borde']);
  });

  test('mean 3,49 ± 0,03 s in the video (shot 1 at 3,58 s included); ×24/16 gives 5,2 ± 0,1 s and 0,19 ± 0,01 Hz', () => {
    const mean = shots.reduce((sum, shot) => sum + shot.periodVideoS, 0) / shots.length;

    expect(TACOMA_TORSION.meanPeriodVideoS).toBeCloseTo(mean, 3);
    expect(Math.abs(TACOMA_TORSION.meanPeriodVideoS - 3.49)).toBeLessThanOrEqual(0.03);
    expect(TACOMA_TORSION.cameraFps).toBe(16);
    expect(TACOMA_TORSION.videoFps).toBe(24);
    expect(TACOMA_TORSION.periodRealS).toBeCloseTo(TACOMA_TORSION.meanPeriodVideoS * 1.5, 3);
    expect(Math.abs(TACOMA_TORSION.periodRealS - 5.2)).toBeLessThanOrEqual(0.1);
    expect(TACOMA_TORSION.frequencyRealHz).toBeCloseTo(1 / TACOMA_TORSION.periodRealS, 4);
    expect(Math.abs(TACOMA_TORSION.frequencyRealHz - 0.19)).toBeLessThanOrEqual(0.01);
  });

  test('each stored series reproduces its period with estimatePeriod', () => {
    const [minS, maxS] = TACOMA_TORSION.method.lagRangeS;

    expect(series.map((s) => s.shotId)).toEqual(shots.map((shot) => shot.id));
    series.forEach((s, i) => {
      expect(s.startS).toBeGreaterThanOrEqual(shots[i].startS);
      expect(s.startS + s.values.length / s.fps).toBeLessThanOrEqual(shots[i].endS);
      expect(estimatePeriod(s.values, s.fps, minS, maxS)).toBeCloseTo(shots[i].periodVideoS, 2);
    });
  });

  test('the same measurement on Commons’ VP9 transcode agrees within 0,02 s per shot', () => {
    const { crossCheck } = TACOMA_TORSION;

    expect(crossCheck.periodsVideoS).toHaveLength(shots.length);
    crossCheck.periodsVideoS.forEach((period, i) => {
      expect(Math.abs(period - shots[i].periodVideoS)).toBeLessThanOrEqual(0.02);
    });
  });

  test('provenance: the Commons page, the license and both downloads with their SHA-256', () => {
    const { source } = TACOMA_TORSION;

    expect(source.page).toBe(
      'https://commons.wikimedia.org/wiki/File:Tacoma_Narrows_Bridge_destruction.ogv',
    );
    expect(source.license).toContain('Prelinger');
    expect(source.files.map((file) => file.id)).toEqual(['original', 'vp9-480p']);
    source.files.forEach((file) => {
      expect(file.url.startsWith('https://upload.wikimedia.org/wikipedia/commons/')).toBe(true);
      expect(file.sha256).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  test('the published videos exist and each stays under 20 MB', () => {
    expect(TACOMA_TORSION.published.map((file) => file.path)).toEqual([
      '/media/resonancia-estructural/tacoma-1940.webm',
      '/media/resonancia-estructural/tacoma-1940.mp4',
      '/media/resonancia-estructural/tacoma-1940-poster.jpg',
    ]);
    TACOMA_TORSION.published.forEach((file) => {
      const name = file.path.split('/').at(-1) ?? '';
      const bytes = statSync(fileURLToPath(new URL(name, PUBLIC))).size;

      expect(bytes).toBe(file.bytes);
      expect(bytes).toBeLessThan(MAX_VIDEO_BYTES);
    });
  });

  test('the JSON stays small', () => {
    expect(statSync(JSON_PATH).size).toBeLessThan(MAX_JSON_BYTES);
  });

  test('parseTacomaTorsion rejects a dataset without its shots', () => {
    const { shots: _omitted, ...broken } = raw as Record<string, unknown>;

    expect(() => parseTacomaTorsion(broken)).toThrow();
    expect(parseTacomaTorsion(raw).meanPeriodVideoS).toBe(TACOMA_TORSION.meanPeriodVideoS);
  });
});
