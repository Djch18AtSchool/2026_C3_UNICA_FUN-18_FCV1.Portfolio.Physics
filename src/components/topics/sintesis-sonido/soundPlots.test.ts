import { describe, expect, test } from 'vitest';
import { INSTRUMENT_SAMPLES, type InstrumentId } from '../../../lib/data/instrumentSamples';
import { classicAmplitudes, sampleAt, synthesize } from '../../../lib/physics/harmonics';
import {
  ENVELOPE_AXES,
  halfWaveSeries,
  EVEN_COLOR,
  ODD_COLOR,
  pipeDrawing,
  RECIPE_F1,
  recipeSpectrum,
  recipeWaveform,
  sampleEnvelope,
  sampleSpectrum,
  sampleWaveform,
  SPECTRUM_DOMAIN,
  SPECTRUM_FLOOR_DB,
  SPECTRUM_TICKS,
  WAVEFORM_AXES,
  WAVEFORM_PERIODS,
  type XY,
} from './soundPlots';

const IDS: readonly InstrumentId[] = ['flauta', 'clarinete'];
const inside = (value: number, { min, max }: { min: number; max: number }) =>
  value >= min && value <= max;
const allInside = (points: readonly XY[], x: { min: number; max: number }, y: typeof x) =>
  points.every((p) => inside(p.x, x) && inside(p.y, y));

describe('both recordings are drawn on identical axes', () => {
  test.each(IDS)('%s: its waveform and its shifted copy fit the shared domains', (id) => {
    const { signal, shifted } = sampleWaveform(id);

    expect(allInside(signal, WAVEFORM_AXES.xDomain, WAVEFORM_AXES.yDomain)).toBe(true);
    expect(allInside(shifted, WAVEFORM_AXES.xDomain, WAVEFORM_AXES.yDomain)).toBe(true);
  });

  test.each(IDS)('%s: its envelope fits the shared domains', (id) => {
    const { points } = sampleEnvelope(id);

    expect(allInside(points, ENVELOPE_AXES.xDomain, ENVELOPE_AXES.yDomain)).toBe(true);
  });

  test.each(IDS)(
    '%s: every bar and range sits inside the shared dB range, above the floor',
    (id) => {
      for (const bar of sampleSpectrum(id)) {
        expect(inside(bar.db, SPECTRUM_DOMAIN), `${id} n = ${bar.n}`).toBe(true);
        expect(bar.range?.max ?? 0).toBeLessThanOrEqual(SPECTRUM_DOMAIN.max);
      }
    },
  );

  test('the spectrum shows n = 1…12 against a −45 dB floor, with every n ticked', () => {
    expect(SPECTRUM_FLOOR_DB).toBe(-45);
    expect(SPECTRUM_DOMAIN.min).toBe(SPECTRUM_FLOOR_DB);
    expect(SPECTRUM_TICKS.x).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(SPECTRUM_TICKS.y.every((tick) => inside(tick, SPECTRUM_DOMAIN))).toBe(true);
  });

  test('odd and even harmonics wear two different colors, by meaning', () => {
    expect(ODD_COLOR).not.toBe(EVEN_COLOR);
    expect(ODD_COLOR).toMatch(/^var\(--chart-\d\)$/);
  });
});

describe('the waveform: four periods and −y(t + T/2) on top, equation (11.6)', () => {
  test.each(IDS)('%s: four periods in ms, T = 1 000/f₁', (id) => {
    const sample = INSTRUMENT_SAMPLES[id];
    const { periodMs, signal } = sampleWaveform(id);

    expect(periodMs).toBeCloseTo(1000 / sample.f1, 9);
    expect(signal[0].x).toBe(0);
    expect(signal[signal.length - 1].x).toBeLessThanOrEqual(WAVEFORM_PERIODS * periodMs);
    expect(signal[signal.length - 1].x).toBeGreaterThan(WAVEFORM_PERIODS * periodMs - 0.03);
  });

  test.each(IDS)('%s: the dashed curve is −y read half a period later', (id) => {
    const { waveform: excerpt, f1 } = INSTRUMENT_SAMPLES[id];
    const half = excerpt.sampleRate / f1 / 2;
    const { signal, shifted } = sampleWaveform(id);

    expect(shifted).toHaveLength(signal.length);
    signal.forEach((point, i) => {
      expect(point.y).toBe(excerpt.y[i]);
      expect(shifted[i].x).toBe(point.x);
      expect(shifted[i].y).toBeCloseTo(-sampleAt(excerpt.y, i + half), 12);
    });
  });

  test('a synthesised recipe: the dashed curve equals −y(t + T/2) of equation (11.4), at peak 1', () => {
    const amplitudes = classicAmplitudes('sierra', 12);
    const zeros = amplitudes.map(() => 0);
    const { periodMs, signal, shifted } = recipeWaveform(amplitudes);
    const peak = Math.max(...signal.map((p) => Math.abs(p.y)));
    const scale = signal[5].y / synthesize(amplitudes, zeros, RECIPE_F1, signal[5].x / 1000);

    expect(periodMs).toBeCloseTo(1000 / RECIPE_F1, 12);
    expect(peak).toBeLessThanOrEqual(1 + 1e-12);
    signal.forEach((point, i) => {
      const tS = point.x / 1000;
      expect(point.y).toBeCloseTo(scale * synthesize(amplitudes, zeros, RECIPE_F1, tS), 9);
      expect(shifted[i].y).toBeCloseTo(
        -scale * synthesize(amplitudes, zeros, RECIPE_F1, tS + periodMs / 2000),
        9,
      );
    });
  });

  test('an excerpt without half a period to spare is refused', () => {
    const fourPeriods = Array.from({ length: 4 * 100 + 1 }, (_, i) =>
      Math.sin((2 * Math.PI * i) / 100),
    );

    expect(() => halfWaveSeries(fourPeriods, 100, 1)).toThrow(RangeError);
  });

  test('only odd harmonics: the dashed curve falls on the solid one', () => {
    const { signal, shifted } = recipeWaveform(classicAmplitudes('cuadrada', 12));

    signal.forEach((point, i) => expect(shifted[i].y).toBeCloseTo(point.y, 9));
  });
});

describe('the spectrum: n = 1…12 in dB relative to A₁', () => {
  test('the clarinet: the measured recipe, odd n flagged, with its windows’ range', () => {
    const bars = sampleSpectrum('clarinete');
    const { amplitudesDb, amplitudeRangesDb } = INSTRUMENT_SAMPLES.clarinete;

    expect(bars.map((bar) => bar.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(bars.map((bar) => bar.db)).toEqual(amplitudesDb);
    expect(bars.filter((bar) => bar.isOdd).map((bar) => bar.n)).toEqual([1, 3, 5, 7, 9, 11]);
    expect(bars[2].range).toEqual({ min: amplitudeRangesDb.min[2], max: amplitudeRangesDb.max[2] });
  });

  test('a range below the floor is clipped to it', () => {
    // The clarinet's 11th harmonic dips to −57,8 dB in one window.
    expect(INSTRUMENT_SAMPLES.clarinete.amplitudeRangesDb.min[10]).toBeLessThan(SPECTRUM_FLOOR_DB);
    expect(sampleSpectrum('clarinete')[10].range?.min).toBe(SPECTRUM_FLOOR_DB);
  });

  test('a recipe: 20 log₁₀|A_n/A₁|, and a missing harmonic has no bar', () => {
    const square = recipeSpectrum(classicAmplitudes('cuadrada', 12));
    const saw = recipeSpectrum(classicAmplitudes('sierra', 12));

    expect(square[0].db).toBe(0);
    expect(square[2].db).toBeCloseTo(20 * Math.log10(1 / 3), 12);
    expect(square[1].db).toBe(-Infinity);
    expect(saw[1].db).toBeCloseTo(20 * Math.log10(1 / 2), 12);
    expect(square.every((bar) => bar.range === undefined)).toBe(true);
  });
});

describe('the envelope: the whole clip with its attack, analysis window and release', () => {
  test.each(IDS)('%s: on the clip’s timeline, which starts trimStartS into the AIFF', (id) => {
    const { envelope, clip } = INSTRUMENT_SAMPLES[id];
    const { points } = sampleEnvelope(id);
    const first = Math.round(clip.trimStartS / envelope.frameS);

    expect(points[0].x).toBeCloseTo(0, 9);
    expect(points[0].y).toBe(envelope.level[first]);
    expect(points[points.length - 1].x).toBeLessThanOrEqual(clip.durationS);
  });

  test.each(IDS)('%s: the attack band starts at the measured attack and lasts attackS', (id) => {
    const sample = INSTRUMENT_SAMPLES[id];
    const { attack } = sampleEnvelope(id);

    expect(attack.from).toBeCloseTo(sample.attack.startS - sample.clip.trimStartS, 9);
    expect(attack.to - attack.from).toBeCloseTo(sample.attackS, 9);
  });

  test('the bands overlap where the data say so: the clarinet’s window opens inside its attack, the flute’s closes inside its release', () => {
    const clarinet = sampleEnvelope('clarinete');
    const flute = sampleEnvelope('flauta');

    expect(clarinet.window.from).toBeGreaterThan(clarinet.attack.from);
    expect(clarinet.window.from).toBeLessThan(clarinet.attack.to);
    expect(flute.window.to).toBeGreaterThan(flute.release.from);
    expect(flute.window.to).toBeLessThan(flute.release.to);
  });
});

describe('the pipes of Paso 2: equations (11.2) and (11.3) at 310 Hz', () => {
  test('open at both ends: n = 1, 2, 3 at 310, 620 and 930 Hz in 0,548 m', () => {
    const open = pipeDrawing('abierto');

    expect(open.length).toBeCloseTo(0.548, 3);
    expect(open.modes.map((mode) => mode.n)).toEqual([1, 2, 3]);
    expect(open.modes.map((mode) => mode.frequency)).toEqual([310, 620, 930]);
    expect(open.modes.map((mode) => mode.isOdd)).toEqual([true, false, true]);
  });

  test('closed at one end: n = 1, 3, 5 at 310, 930 and 1 550 Hz in half the length', () => {
    const closed = pipeDrawing('cerrado');

    expect(closed.length).toBeCloseTo(pipeDrawing('abierto').length / 2, 12);
    expect(closed.modes.map((mode) => mode.n)).toEqual([1, 3, 5]);
    expect(closed.modes.map((mode) => mode.frequency)).toEqual([310, 930, 1550]);
    const [fundamental] = closed.modes;
    expect(fundamental.points[0]).toEqual({ x: 0, y: 0 });
    expect(fundamental.points[fundamental.points.length - 1].x).toBeCloseTo(closed.length, 12);
    expect(fundamental.points[fundamental.points.length - 1].y).toBeCloseTo(1, 12);
  });
});
