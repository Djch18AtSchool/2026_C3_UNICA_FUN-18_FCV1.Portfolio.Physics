import { describe, expect, test } from 'vitest';
import { oddEvenPowerDb, synthesize } from '../physics/harmonics';
import { analyseRecording, measurePhases, sustainWindow, waveformExcerpt } from './sampleAnalysis';

const FS = 44100;
const F1 = 310.2;
const TWO_PI = 2 * Math.PI;
const RECIPE_DB = [0, -34.1, 3.3, -21.2, -7.8, -31.5, -18, -37.3, -27.8, -37.6, -40.1, -28.8];
const AMPLITUDES = RECIPE_DB.map((db) => 10 ** (db / 20));
/** Absolute phases (sine convention) with φ₁ ≠ 0, so the relative phases φ_n − nφ₁ differ. */
const PHASES = AMPLITUDES.map((_, i) => 0.7 + 1.3 * i);
const wrap = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));
const RELATIVE_PHASES = PHASES.map((p, i) => wrap(p - (i + 1) * PHASES[0]));

/** Silence 0,3 s, linear rise 0,2 s, sustain 1,6 s, linear fall 0,15 s, silence 0,25 s. */
function gain(t: number): number {
  if (t < 0.3) return 0;
  if (t < 0.5) return (t - 0.3) / 0.2;
  if (t < 2.1) return 1;
  if (t < 2.25) return 1 - (t - 2.1) / 0.15;
  return 0;
}

const NOTE = Float64Array.from({ length: Math.round(2.5 * FS) }, (_, i) => {
  const t = i / FS;
  return 0.2 * gain(t) * synthesize(AMPLITUDES, PHASES, F1, t);
});

function correlation(u: readonly number[], v: readonly number[]): number {
  const dot = (p: readonly number[], q: readonly number[]) =>
    p.reduce((s, x, i) => s + x * q[i], 0);
  return dot(u, v) / Math.sqrt(dot(u, u) * dot(v, v));
}

describe('sustainWindow (research harmonics.py: 20 ms RMS above half the maximum)', () => {
  test('skips 7 frames (0,14 s) after the note reaches half its level and 5 (0,10 s) before it falls', () => {
    const { start, end } = sustainWindow(NOTE, FS);

    // half level at 0,40 s in the rise and at 2,175 s in the fall
    expect(start % 882).toBe(0);
    expect(Math.abs(start / FS - (0.4 + 0.14))).toBeLessThanOrEqual(0.02);
    expect(Math.abs(end / FS - (2.175 - 0.1))).toBeLessThanOrEqual(0.02);
  });

  test('rejects a note too short to have a sustain', () => {
    const blip = Float64Array.from({ length: FS / 10 }, (_, i) => Math.sin((TWO_PI * F1 * i) / FS));

    expect(() => sustainWindow(blip, FS)).toThrow(RangeError);
  });
});

describe('measurePhases and waveformExcerpt', () => {
  test('measures φ_n − nφ₁ over 40 periods and finds where the fundamental starts a period', () => {
    const { phasesRad, start } = measurePhases(NOTE, FS, F1, Math.round(1.3 * FS), 12);

    phasesRad.forEach((p, i) => expect(Math.abs(wrap(p - RELATIVE_PHASES[i]))).toBeLessThan(0.02));
    expect(Math.abs(start / FS - 1.3)).toBeLessThanOrEqual(0.5 / F1);
    // the fundamental's sine phase is 0 there: 2π f₁ t + φ₁ is a whole number of turns
    const turns = (F1 * start) / FS + PHASES[0] / TWO_PI;
    expect(Math.abs(turns - Math.round(turns))).toBeLessThan(0.003);
  });

  test('cuts periods + ½ period from a fractional start, scaled to a peak of 1', () => {
    const start = 1.3 * FS + 0.25;
    const y = waveformExcerpt(NOTE, FS, F1, start, 4);
    const expected = y.map((_, i) => synthesize(AMPLITUDES, PHASES, F1, (start + i) / FS));

    expect(y).toHaveLength(Math.ceil((4.5 * FS) / F1) + 1);
    expect(Math.max(...y.map(Math.abs))).toBeCloseTo(1, 12);
    expect(correlation(y, expected)).toBeGreaterThan(0.9999);
  });
});

describe('measurePhases and waveformExcerpt near the ends of the signal', () => {
  test('reject a window or an excerpt that does not fit', () => {
    expect(() => measurePhases(NOTE, FS, F1, 100, 12)).toThrow(RangeError);
    expect(() => waveformExcerpt(NOTE, FS, F1, -1, 4)).toThrow(RangeError);
    expect(() => waveformExcerpt(NOTE, FS, F1, NOTE.length - 100, 4)).toThrow(RangeError);
  });
});

describe('analyseRecording (research §4.1 on a synthetic note with a known recipe)', () => {
  const analysis = analyseRecording(NOTE, FS, 311.13, 12);

  test('recovers f₁ within 0,05 Hz and each harmonic within 0,2 dB, with tight window ranges', () => {
    expect(Math.abs(analysis.f1 - F1)).toBeLessThan(0.05);
    analysis.amplitudesDb.forEach((db, i) => {
      expect(Math.abs(db - RECIPE_DB[i])).toBeLessThan(0.2);
      expect(analysis.amplitudeRangesDb.min[i]).toBeLessThanOrEqual(db + 0.05);
      expect(analysis.amplitudeRangesDb.max[i]).toBeGreaterThanOrEqual(db - 0.05);
      expect(analysis.amplitudeRangesDb.max[i] - analysis.amplitudeRangesDb.min[i]).toBeLessThan(
        0.5,
      );
    });
  });

  test('odd/even power and the half-wave correlation follow the recipe', () => {
    const odd = AMPLITUDES.filter((_, i) => i % 2 === 0).reduce((s, a) => s + a * a, 0);
    const even = AMPLITUDES.filter((_, i) => i % 2 === 1).reduce((s, a) => s + a * a, 0);

    expect(analysis.oddEvenDb).toBeCloseTo(oddEvenPowerDb(AMPLITUDES), 1);
    expect(analysis.halfWaveCorrelation).toBeCloseTo((odd - even) / (odd + even), 2);
  });

  test('the attack is 80 % of the 0,2 s rise and the release 80 % of the 0,15 s fall', () => {
    expect(Math.abs(analysis.attackS - 0.16)).toBeLessThanOrEqual(0.02);
    expect(analysis.attack.startS).toBeGreaterThanOrEqual(0.3);
    expect(Math.abs(analysis.release.endS - analysis.release.startS - 0.12)).toBeLessThanOrEqual(
      0.02,
    );
    expect(analysis.analysisWindow.startS).toBeGreaterThan(analysis.attack.endS);
    expect(analysis.analysisWindow.endS).toBeLessThan(analysis.release.endS);
  });

  test('the 10 ms envelope is relative to the sustain level', () => {
    const { frameS, level } = analysis.envelope;

    expect(frameS).toBe(0.01);
    expect(level).toHaveLength(250);
    expect(Math.abs(level[150] - 1)).toBeLessThan(0.03);
    expect(level[10]).toBe(0);
  });

  test('the waveform starts a period of the fundamental, so (11.4) with the measured recipe rebuilds it', () => {
    const { startS, sampleRate, periods, y } = analysis.waveform;
    const amplitudes = analysis.amplitudesDb.map((db) => 10 ** (db / 20));
    const rebuilt = y.map((_, i) =>
      synthesize(amplitudes, analysis.phasesRad, analysis.f1, i / sampleRate),
    );

    expect(sampleRate).toBe(FS);
    expect(periods).toBe(4);
    expect(startS).toBeGreaterThan(analysis.analysisWindow.startS);
    expect(startS).toBeLessThan(analysis.analysisWindow.endS);
    expect(correlation(y, rebuilt)).toBeGreaterThan(0.999);
  });
});
