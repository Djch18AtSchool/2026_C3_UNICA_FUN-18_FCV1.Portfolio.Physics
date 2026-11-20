import { describe, expect, test } from 'vitest';
import { INSTRUMENT_SAMPLES } from '../../../lib/data/instrumentSamples';
import { oddEvenPowerDb } from '../../../lib/physics/harmonics';
import { WAVEFORM_AXES } from './soundPlots';
import {
  AMPLITUDE_RANGE,
  audibleCount,
  CURSOR_RANGE,
  DEFAULT_F1,
  DEFAULT_SAMPLE_RATE,
  F1_RANGE,
  HARMONIC_COUNT,
  INITIAL_SYNTH_STATE,
  presetIdFor,
  randomPhases,
  SAMPLE_RATES,
  setAmplitude,
  setCursor,
  setF1,
  setRandomPhases,
  setSampleRate,
  soundingRecipe,
  SYNTH_PRESETS,
  synthReadings,
  synthSpectrum,
  synthWaveform,
  waveformAt,
  waveformCorrelation,
  withPreset,
  type SynthRecipe,
} from './synthScene';

const preset = (id: string) => {
  const found = SYNTH_PRESETS.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`no preset ${id}`);
  return found;
};
const zeros = (count: number) => Array.from({ length: count }, () => 0);
const CLOSE = 9;

describe('the synthesiser scene: controls', () => {
  test('ten amplitudes from 0 to 1,6 by 0,01 (the flute’s measured A₂ = 1,54 fits), f₁ from 110 to 880 Hz', () => {
    expect(HARMONIC_COUNT).toBe(10);
    expect(AMPLITUDE_RANGE).toEqual({ min: 0, max: 1.6, step: 0.01 });
    expect(F1_RANGE).toEqual({ min: 110, max: 880, step: 0.1 });
    for (const { id, values } of SYNTH_PRESETS) {
      expect(values.amplitudes, id).toHaveLength(HARMONIC_COUNT);
      expect(values.phases, id).toHaveLength(HARMONIC_COUNT);
      for (const a of values.amplitudes) {
        expect(a, id).toBeGreaterThanOrEqual(AMPLITUDE_RANGE.min);
        expect(a, id).toBeLessThanOrEqual(AMPLITUDE_RANGE.max);
      }
    }
  });

  test('the sample rates offered, with 44 100 Hz (the recordings’) as the default', () => {
    expect(SAMPLE_RATES).toEqual([8000, 16000, 22050, 44100, 48000]);
    expect(DEFAULT_SAMPLE_RATE).toBe(44100);
  });

  test('opens on the measured clarinet at 310,1 Hz (its f₁ on the slider grid), measured phases, cursor at 1 ms', () => {
    expect(DEFAULT_F1).toBe(310.1);
    expect(Math.abs(DEFAULT_F1 - INSTRUMENT_SAMPLES.clarinete.f1)).toBeLessThan(F1_RANGE.step);
    expect(INITIAL_SYNTH_STATE).toMatchObject({
      f1: 310.1,
      sampleRate: 44100,
      randomPhases: false,
      cursorMs: 1,
    });
    expect(presetIdFor(INITIAL_SYNTH_STATE)).toBe('clarinete');
    expect(CURSOR_RANGE).toEqual({ min: 0, max: WAVEFORM_AXES.xDomain.max });
  });
});

describe('the synthesiser scene: presets', () => {
  test('six presets: four classic recipes and the two measured ones, each saying its origin (R8)', () => {
    expect(
      SYNTH_PRESETS.map(({ id, name, optionLabel, origin }) => [id, name, optionLabel, origin]),
    ).toEqual([
      ['seno', 'Seno', 'Seno (receta clásica)', 'producto'],
      ['cuadrada', 'Cuadrada', 'Cuadrada (receta clásica)', 'producto'],
      ['sierra', 'Diente de sierra', 'Diente de sierra (receta clásica)', 'producto'],
      ['triangular', 'Triangular', 'Triangular (receta clásica)', 'producto'],
      ['flauta', 'Flauta (medida)', 'Flauta (medida: grabación MIS)', 'calculo'],
      ['clarinete', 'Clarinete (medido)', 'Clarinete (medida: grabación MIS)', 'calculo'],
    ]);
    for (const { id, note, sourceLabel, sourceUrl } of SYNTH_PRESETS) {
      expect(note, id).toBeTruthy();
      expect(sourceLabel, id).toBeTruthy();
      expect(sourceUrl, id).toMatch(/^https:\/\//);
    }
  });

  test('the classic recipes are the Web Audio ones relative to A₁: |A_n/A₁|, phase π where the sign is negative', () => {
    const third = 1 / 3;
    expect(preset('seno').values).toEqual({ amplitudes: [1, ...zeros(9)], phases: zeros(10) });
    const square = preset('cuadrada').values;
    expect(square.amplitudes[2]).toBeCloseTo(third, CLOSE);
    expect(square.amplitudes.filter((_, i) => i % 2 === 1)).toEqual(zeros(5));
    expect(square.phases).toEqual(zeros(10));
    const saw = preset('sierra').values;
    saw.amplitudes.forEach((a, i) => expect(a).toBeCloseTo(1 / (i + 1), CLOSE));
    expect(saw.phases).toEqual(saw.phases.map((_, i) => (i % 2 === 1 ? Math.PI : 0)));
    const triangle = preset('triangular').values;
    expect(triangle.amplitudes[2]).toBeCloseTo(1 / 9, CLOSE);
    expect(triangle.amplitudes[4]).toBeCloseTo(1 / 25, CLOSE);
    expect(triangle.phases).toEqual([0, 0, Math.PI, 0, 0, 0, Math.PI, 0, 0, 0]);
  });

  test('the measured recipes are the first ten harmonics of the recordings, amplitudes and phases', () => {
    for (const id of ['flauta', 'clarinete'] as const) {
      const sample = INSTRUMENT_SAMPLES[id];
      const { amplitudes, phases } = preset(id).values;
      amplitudes.forEach((a, i) =>
        expect(a).toBeCloseTo(10 ** (sample.amplitudesDb[i] / 20), CLOSE),
      );
      expect(phases).toEqual(sample.phasesRad.slice(0, HARMONIC_COUNT));
    }
    expect(preset('flauta').values.amplitudes[1]).toBeGreaterThan(1.5);
  });

  test('each note is one sentence and the measured ones name their recording and table', () => {
    expect(preset('flauta').note).toContain('tabla 11.2');
    expect(preset('clarinete').note).toContain('si$\\flat$');
    expect(preset('clarinete').note).not.toContain('♭');
  });

  test('choosing a preset keeps f₁, f_s and the random phases: the preset is the timbre', () => {
    const state = setRandomPhases(setF1(INITIAL_SYNTH_STATE, 440), true);
    const next = withPreset(state, preset('sierra').values);

    expect(next).toMatchObject({ f1: 440, randomPhases: true, phaseDraw: state.phaseDraw });
    expect(presetIdFor(next)).toBe('sierra');
  });

  test('an edit leaves the preset, snapped to the slider grid; undoing it returns to the preset', () => {
    const sine = withPreset(INITIAL_SYNTH_STATE, preset('seno').values);
    const edited = setAmplitude(sine, 2, 0.1234);

    expect(edited.amplitudes[1]).toBe(0.12);
    expect(presetIdFor(edited)).toBeUndefined();
    expect(presetIdFor(setAmplitude(edited, 2, 0))).toBe('seno');
    expect(setAmplitude(sine, 3, 7).amplitudes[2]).toBe(AMPLITUDE_RANGE.max);
    expect(setAmplitude(sine, 3, -1).amplitudes[2]).toBe(0);
    expect(sine.amplitudes[1]).toBe(0);
    expect(() => setAmplitude(sine, 11, 1)).toThrow(RangeError);
    expect(() => setAmplitude(sine, 0, 1)).toThrow(RangeError);
  });

  test('f₁ and f_s do not leave the preset; f₁ snaps and clamps; only a listed f_s is taken', () => {
    expect(presetIdFor(setF1(INITIAL_SYNTH_STATE, 523.25))).toBe('clarinete');
    expect(setF1(INITIAL_SYNTH_STATE, 523.25).f1).toBe(523.3);
    expect(setF1(INITIAL_SYNTH_STATE, 5000).f1).toBe(F1_RANGE.max);
    expect(setF1(INITIAL_SYNTH_STATE, 20).f1).toBe(F1_RANGE.min);
    expect(setSampleRate(INITIAL_SYNTH_STATE, 8000).sampleRate).toBe(8000);
    expect(presetIdFor(setSampleRate(INITIAL_SYNTH_STATE, 8000))).toBe('clarinete');
    expect(() => setSampleRate(INITIAL_SYNTH_STATE, 12345)).toThrow(RangeError);
  });

  test('the cursor stays on the waveform’s axis', () => {
    expect(setCursor(INITIAL_SYNTH_STATE, 4.5).cursorMs).toBe(4.5);
    expect(setCursor(INITIAL_SYNTH_STATE, 40).cursorMs).toBe(CURSOR_RANGE.max);
    expect(setCursor(INITIAL_SYNTH_STATE, -1).cursorMs).toBe(0);
  });
});

describe('the synthesiser scene: what is drawn', () => {
  const sine: SynthRecipe = preset('seno').values;
  const square: SynthRecipe = preset('cuadrada').values;

  test('the waveform is (11.4) of the recipe, peak 1, on the shared 0–13 ms axis', () => {
    const f1 = 250;
    const data = synthWaveform(sine, f1);
    const quarter = data.signal.reduce((best, point) =>
      Math.abs(point.x - 1) < Math.abs(best.x - 1) ? point : best,
    );

    expect(data.periodMs).toBeCloseTo(4, CLOSE);
    expect(quarter.y).toBeCloseTo(1, 6);
    expect(data.signal[0]).toEqual({ x: 0, y: 0 });
    expect(Math.max(...data.signal.map(({ y }) => Math.abs(y)))).toBeLessThanOrEqual(1 + 1e-9);
    expect(data.signal.at(-1)?.x).toBeGreaterThanOrEqual(WAVEFORM_AXES.xDomain.max - 0.1);
  });

  test('odd harmonics only: −y(t + T/2) falls on y(t), equation (11.6)', () => {
    const data = synthWaveform(square, 310.1);
    data.signal.forEach(({ y }, i) => expect(data.shifted[i].y).toBeCloseTo(y, 6));
    const saw = synthWaveform(preset('sierra').values, 310.1);
    expect(saw.signal.some(({ y }, i) => Math.abs(saw.shifted[i].y - y) > 0.1)).toBe(true);
  });

  test('at any f₁ the waveform fills the axis and keeps its shape in t/T: the timbre is the recipe', () => {
    const clarinet = preset('clarinete').values;
    const low = synthWaveform(clarinet, 110);
    const high = synthWaveform(clarinet, 880);
    const atFraction = (f1: number, fraction: number) =>
      waveformAt(clarinet, f1, (fraction * 1000) / f1);

    for (const data of [low, high]) {
      expect(data.signal.at(-1)?.x).toBeGreaterThanOrEqual(WAVEFORM_AXES.xDomain.max - 0.1);
    }
    for (const fraction of [0.1, 0.37, 0.8]) {
      expect(atFraction(880, fraction).y).toBeCloseTo(atFraction(110, fraction).y, 9);
    }
  });

  test('the cursor reads y(t) and −y(t + T/2) on the drawn scale', () => {
    const at = waveformAt(square, 310.1, 0.7);
    expect(at.shifted).toBeCloseTo(at.y, 9);
    const sineAt = waveformAt(sine, 250, 1);
    expect(sineAt).toEqual({ y: expect.closeTo(1, 9), shifted: expect.closeTo(1, 9) });
  });

  test('a silent recipe draws a flat line and reads no strongest harmonic, never NaN on the plot', () => {
    const silence = { amplitudes: zeros(10), phases: zeros(10) };
    const data = synthWaveform(silence, 310.1);

    expect(data.signal.every(({ y }) => y === 0)).toBe(true);
    expect(data.shifted.every(({ y }) => y === 0)).toBe(true);
    expect(waveformAt(silence, 310.1, 1)).toEqual({ y: 0, shifted: 0 });
    const state = { ...INITIAL_SYNTH_STATE, ...silence };
    expect(synthReadings(state).strongest).toBeNaN();
  });

  test('the spectrum is 20 log₁₀ A_n of each of the ten harmonics; a silent one has no bar', () => {
    const bars = synthSpectrum(preset('clarinete').values.amplitudes);

    expect(bars.map(({ n }) => n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    bars.forEach((bar, i) =>
      expect(bar.db).toBeCloseTo(INSTRUMENT_SAMPLES.clarinete.amplitudesDb[i], 6),
    );
    expect(bars.map(({ isOdd }) => isOdd)).toEqual([
      true,
      false,
      true,
      false,
      true,
      false,
      true,
      false,
      true,
      false,
    ]);
    expect(synthSpectrum(square.amplitudes)[1].db).toBe(-Infinity);
    const edited = setAmplitude(withPreset(INITIAL_SYNTH_STATE, square), 2, 0.5);
    expect(synthSpectrum(edited.amplitudes)[1].db).toBeCloseTo(20 * Math.log10(0.5), 9);
  });
});

describe('the synthesiser scene: random phases', () => {
  test('φ₁ = 0 and the rest uniform in [0, 2π), the same draw for the same count, another for the next', () => {
    const first = randomPhases(1);

    expect(first).toHaveLength(HARMONIC_COUNT);
    expect(first[0]).toBe(0);
    for (const phase of first.slice(1)) {
      expect(phase).toBeGreaterThanOrEqual(0);
      expect(phase).toBeLessThan(2 * Math.PI);
    }
    expect(randomPhases(1)).toEqual(first);
    expect(randomPhases(2)).not.toEqual(first);
  });

  test('switching them on draws anew each time; off plays the recipe’s own phases again', () => {
    const on = setRandomPhases(INITIAL_SYNTH_STATE, true);
    const again = setRandomPhases(setRandomPhases(on, false), true);

    expect(on.phaseDraw).toBe(INITIAL_SYNTH_STATE.phaseDraw + 1);
    expect(soundingRecipe(on).phases).toEqual(randomPhases(on.phaseDraw));
    expect(again.phaseDraw).toBe(on.phaseDraw + 1);
    expect(soundingRecipe(setRandomPhases(on, false)).phases).toEqual(INITIAL_SYNTH_STATE.phases);
    expect(setRandomPhases(on, true)).toBe(on);
    expect(presetIdFor(on)).toBe('clarinete');
  });

  test('the clarinet’s waveform changes (correlation with the zero-phase one < 0,9) and its spectrum does not', () => {
    const clarinet = preset('clarinete').values;
    const zeroPhase = { amplitudes: clarinet.amplitudes, phases: zeros(10) };
    const on = soundingRecipe(setRandomPhases(INITIAL_SYNTH_STATE, true));

    expect(waveformCorrelation(on, zeroPhase)).toBeLessThan(0.9);
    expect(waveformCorrelation(on, clarinet)).toBeLessThan(0.9);
    expect(waveformCorrelation(zeroPhase, zeroPhase)).toBeCloseTo(1, 9);
    expect(synthSpectrum(on.amplitudes)).toEqual(synthSpectrum(clarinet.amplitudes));
  });

  test('the first four draws, switching the phases off and on again, all change the clarinet’s shape', () => {
    const clarinet = preset('clarinete').values;
    const zeroPhase = { amplitudes: clarinet.amplitudes, phases: zeros(10) };
    for (const draw of [1, 2, 3, 4]) {
      const drawn = { amplitudes: clarinet.amplitudes, phases: randomPhases(draw) };
      expect(waveformCorrelation(drawn, zeroPhase), `sorteo ${draw}`).toBeLessThan(0.9);
      expect(waveformCorrelation(drawn, clarinet), `sorteo ${draw}`).toBeLessThan(0.9);
    }
  });

  test('random phases keep the half-wave symmetry of an odd-only recipe: (11.6) does not depend on φ_n', () => {
    const state = setRandomPhases(withPreset(INITIAL_SYNTH_STATE, preset('cuadrada').values), true);
    const data = synthWaveform(soundingRecipe(state), state.f1);

    data.signal.forEach(({ y }, i) => expect(data.shifted[i].y).toBeCloseTo(y, 6));
  });
});

describe('the synthesiser scene: Nyquist and the readouts', () => {
  test('only n ≤ ⌊f_s/(2f₁)⌋ sound (11.9): 4 at 880 Hz and 8 kHz, 9 at 16 kHz, all ten at 44,1 kHz', () => {
    expect(audibleCount(880, 8000)).toBe(4);
    expect(audibleCount(880, 16000)).toBe(9);
    expect(audibleCount(310.1, 44100)).toBe(HARMONIC_COUNT);
    expect(audibleCount(110, 8000)).toBe(HARMONIC_COUNT);
  });

  test('what sounds drops the harmonics above Nyquist and keeps the sliders’ values', () => {
    const state = setSampleRate(setF1(INITIAL_SYNTH_STATE, 880), 8000);
    const sounding = soundingRecipe(state);

    expect(sounding.amplitudes.slice(0, 4)).toEqual(state.amplitudes.slice(0, 4));
    expect(sounding.amplitudes.slice(4)).toEqual(zeros(6));
    expect(state.amplitudes[4]).toBeGreaterThan(0);
  });

  test('readouts: f₁, T, odd over even power and the strongest harmonic, of what sounds', () => {
    const clarinet = synthReadings(INITIAL_SYNTH_STATE);
    expect(clarinet.f1).toBe(310.1);
    expect(clarinet.periodMs).toBeCloseTo(1000 / 310.1, CLOSE);
    expect(clarinet.oddEvenDb).toBeCloseTo(oddEvenPowerDb(INITIAL_SYNTH_STATE.amplitudes), CLOSE);
    expect(clarinet.oddEvenDb).toBeGreaterThan(20);
    expect(clarinet.strongest).toBe(3);

    const flute = synthReadings(withPreset(INITIAL_SYNTH_STATE, preset('flauta').values));
    expect(flute.strongest).toBe(2);
    expect(
      synthReadings(withPreset(INITIAL_SYNTH_STATE, preset('cuadrada').values)).oddEvenDb,
    ).toBe(Infinity);

    const muffled = synthReadings(setSampleRate(setF1(INITIAL_SYNTH_STATE, 880), 8000));
    expect(muffled.oddEvenDb).toBeCloseTo(
      oddEvenPowerDb(INITIAL_SYNTH_STATE.amplitudes.slice(0, 4)),
      CLOSE,
    );
  });
});
