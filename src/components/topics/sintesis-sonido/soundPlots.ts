/**
 * Data and axes of Tema 11's figures: the waveform with −y(t + T/2) on top (11.6), the spectrum
 * of n = 1…12 in dB relative to A₁ (11.4), the RMS envelope of a whole recording with its bands
 * (11.7) and the modes of the two ideal pipes (11.2, 11.3). The two recordings and the synthesised
 * recipes share every axis, so a figure reads the same way in every step. Research
 * docs/superpowers/research/2026-11-17-sintesis-sonido.md §5 and §6.3.
 */
import { CHART_COLORS } from '../../charts/chartTheme';
import { MEASURED_HARMONICS } from '../../../lib/audio/sampleAnalysis';
import {
  INSTRUMENT_SAMPLES,
  MS_PER_S,
  toClipTime,
  type InstrumentId,
} from '../../../lib/data/instrumentSamples';
import { halfWaveCorrelation, sampleAt, waveform } from '../../../lib/physics/harmonics';
import {
  pipeLength,
  pipeModeNumbers,
  standingWaveProfile,
  type PipeKind,
} from '../../../lib/physics/pipes';

export type XY = { x: number; y: number };
export interface Span {
  from: number;
  to: number;
}

/**
 * Odd and even harmonics wear one color each in every figure of the topic (meaning, never series
 * order), and odd bars are also hatched: the parity never rests on color alone. The instruments
 * get no color of their own.
 */
export const ODD_COLOR = CHART_COLORS[0];
export const EVEN_COLOR = CHART_COLORS[1];
/** The signal y(t) and its shifted, inverted copy −y(t + T/2). */
export const SIGNAL_COLOR = CHART_COLORS[2];
export const SHIFTED_COLOR = CHART_COLORS[3];

/** Four periods: 12,9 ms at 310 Hz (research §6.3). */
export const WAVEFORM_PERIODS = 4;
/**
 * The synthesised recipes of Pasos 1 and 3 sound at the clarinet's measured f₁, 310,10 Hz, so their
 * period bracket is the recordings' (an illustrative choice: a recipe has no pitch of its own).
 */
export const RECIPE_F1 = INSTRUMENT_SAMPLES.clarinete.f1;
/** Points per period of a synthesised recipe: even, so half a period is a whole number of points. */
const RECIPE_SAMPLES_PER_PERIOD = 120;

export const SPECTRUM_HARMONICS = MEASURED_HARMONICS;
export const SPECTRUM_FLOOR_DB = -45;
/** From the floor to 10 dB: the flute's 5th harmonic reaches +5,6 dB in one window. */
export const SPECTRUM_DOMAIN = { min: SPECTRUM_FLOOR_DB, max: 10 } as const;
export const SPECTRUM_TICKS = {
  x: Array.from({ length: SPECTRUM_HARMONICS }, (_, i) => i + 1),
  y: [-40, -30, -20, -10, 0, 10],
} as const;
/** On a phone two-digit labels a harmonic apart collide: 1 and then every even n. */
export const COMPACT_SPECTRUM_X_TICKS = [1, 2, 4, 6, 8, 10, 12] as const;

/** 0–13 ms holds four periods of 310 Hz; above the peak 1 sits the bracket of one period. */
export const WAVEFORM_AXES = {
  xLabel: 'Tiempo $t$',
  xUnit: 'ms',
  yLabel: 'Señal $y$ / pico',
  yUnit: 'adimensional',
  xDomain: { min: 0, max: 13 },
  yDomain: { min: -1.25, max: 1.5 },
} as const;
/** Where the period bracket is drawn, in the waveform's y units: above every peak. */
export const PERIOD_BRACKET_Y = 1.22;

/** 0–3 s holds both clips (2,52 and 2,86 s); the envelope peaks at 1,15 times the sustain. */
export const ENVELOPE_AXES = {
  xLabel: 'Tiempo del audio $t$',
  xUnit: 's',
  yLabel: 'Nivel RMS / sostenido',
  yUnit: 'adimensional',
  xDomain: { min: 0, max: 3 },
  yDomain: { min: 0, max: 1.25 },
} as const;
/** The analysis window's bracket, low in the plot, under the sustain and above the band labels. */
export const WINDOW_BRACKET_Y = 0.25;

/** Wolfe (UNSW), «Open vs Closed pipes»: c ≈ 340 m/s; the pipes of Paso 2 give 310 Hz. */
export const SOUND_SPEED = 340;
export const PIPE_F1 = 310;
const PIPE_MODES = 3;
const PIPE_POINTS = 96;

export interface WaveformData {
  /** T = 1 000/f₁, ms. */
  periodMs: number;
  /** y(t) over four periods, t in ms. */
  signal: XY[];
  /** −y(t + T/2) at the same instants. */
  shifted: XY[];
}

/**
 * Four periods of a uniformly sampled excerpt (index i at i/sampleRate s) and its copy shifted by
 * half a period and inverted, read between samples by linear interpolation; the excerpt must hold
 * half a period more than it draws.
 */
export function halfWaveSeries(
  y: readonly number[],
  sampleRate: number,
  f1: number,
  periods = WAVEFORM_PERIODS,
): WaveformData {
  const samplesPerPeriod = sampleRate / f1;
  const half = samplesPerPeriod / 2;
  const count = Math.floor(periods * samplesPerPeriod) + 1;
  if (count - 1 + Math.ceil(half) >= y.length) {
    throw new RangeError(
      `the excerpt needs ${periods} periods and a half (${count + Math.ceil(half)} samples), got ${y.length}`,
    );
  }
  const msPerSample = MS_PER_S / sampleRate;
  const indices = Array.from({ length: count }, (_, i) => i);
  return {
    periodMs: MS_PER_S / f1,
    signal: indices.map((i) => ({ x: i * msPerSample, y: y[i] })),
    shifted: indices.map((i) => ({ x: i * msPerSample, y: -sampleAt(y, i + half) })),
  };
}

/** The recording's stored excerpt (peak 1, from where its fundamental starts a period). */
export function sampleWaveform(id: InstrumentId): WaveformData {
  const { waveform: excerpt, f1 } = INSTRUMENT_SAMPLES[id];
  return halfWaveSeries(excerpt.y, excerpt.sampleRate, f1, excerpt.periods);
}

/** A recipe of signed amplitudes A_n with zero phases, synthesised by (11.4) and scaled to peak 1. */
export function recipeWaveform(amplitudes: readonly number[], f1 = RECIPE_F1): WaveformData {
  const zeros = amplitudes.map(() => 0);
  const { y } = waveform(amplitudes, zeros, WAVEFORM_PERIODS + 1, RECIPE_SAMPLES_PER_PERIOD);
  const peak = Math.max(...y.map(Math.abs));
  return halfWaveSeries(
    y.map((value) => value / peak),
    RECIPE_SAMPLES_PER_PERIOD * f1,
    f1,
  );
}

/** Equation (11.6) measured on the drawn recipe: corr(y(t), −y(t + T/2)) over whole periods. */
export function recipeHalfWave(amplitudes: readonly number[]): number {
  const zeros = amplitudes.map(() => 0);
  const { y } = waveform(amplitudes, zeros, WAVEFORM_PERIODS + 1, RECIPE_SAMPLES_PER_PERIOD);
  return halfWaveCorrelation(y, RECIPE_SAMPLES_PER_PERIOD);
}

export interface SpectrumBar {
  n: number;
  /** A_n/A₁ in dB; −∞ for a harmonic the recipe does not have. */
  db: number;
  isOdd: boolean;
  /** A recording's lowest and highest level over its 0,25 s windows, clipped to the floor. */
  range?: { min: number; max: number };
}

const atFloor = (db: number) => Math.max(db, SPECTRUM_FLOOR_DB);

/** The recording's measured recipe (Welch average) with each harmonic's range over the windows. */
export function sampleSpectrum(id: InstrumentId): SpectrumBar[] {
  const { amplitudesDb, amplitudeRangesDb } = INSTRUMENT_SAMPLES[id];
  return amplitudesDb.map((db, i) => ({
    n: i + 1,
    db,
    isOdd: i % 2 === 0,
    range: { min: atFloor(amplitudeRangesDb.min[i]), max: amplitudeRangesDb.max[i] },
  }));
}

/** A recipe's levels, 20 log₁₀|A_n/A₁| for n = 1…12. */
export function recipeSpectrum(amplitudes: readonly number[]): SpectrumBar[] {
  const reference = Math.abs(amplitudes[0]);
  return amplitudes.slice(0, SPECTRUM_HARMONICS).map((a, i) => ({
    n: i + 1,
    db: 20 * Math.log10(Math.abs(a) / reference),
    isOdd: i % 2 === 0,
  }));
}

export interface EnvelopeData {
  /** Level over the sustain level against the clip's time, s. */
  points: XY[];
  attack: Span;
  window: Span;
  release: Span;
}

/**
 * The 10 ms RMS envelope measured on the original AIFF, moved to the timeline of the published
 * clip (AIFF time − trimStartS, what the audio player shows), with the attack (10 → 90 %), the
 * analysis window (the sustain) and the release (90 → 10 %) on the same timeline. The bands may
 * overlap: the research measures the window and the attack with different thresholds.
 */
export function sampleEnvelope(id: InstrumentId): EnvelopeData {
  const sample = INSTRUMENT_SAMPLES[id];
  const { envelope, clip, attack, analysisWindow, release } = sample;
  const toClip = (s: number) => toClipTime(sample, s);
  const points = envelope.level
    .map((level, i) => ({ x: toClip(i * envelope.frameS), y: level }))
    .filter(({ x }) => x > -envelope.frameS / 2 && x <= clip.durationS);
  const span = ({ startS, endS }: { startS: number; endS: number }) => ({
    from: toClip(startS),
    to: toClip(endS),
  });
  return {
    points: points.map((point, i) => (i === 0 ? { ...point, x: Math.max(point.x, 0) } : point)),
    attack: span(attack),
    window: span(analysisWindow),
    release: span(release),
  };
}

export interface ModeCurve {
  n: number;
  /** n f₁, Hz. */
  frequency: number;
  isOdd: boolean;
  /** Displacement amplitude (peak 1) along the pipe, x in m. */
  points: XY[];
}

export interface PipeDrawing {
  kind: PipeKind;
  /** Effective length, m. */
  length: number;
  modes: ModeCurve[];
}

/** The first three modes of the ideal pipe whose fundamental is 310 Hz, to scale. */
export function pipeDrawing(kind: PipeKind, f1 = PIPE_F1, v = SOUND_SPEED): PipeDrawing {
  const length = pipeLength(kind, f1, v);
  const modes = pipeModeNumbers(kind, PIPE_MODES).map((n) => ({
    n,
    frequency: n * f1,
    isOdd: n % 2 === 1,
    points: Array.from({ length: PIPE_POINTS + 1 }, (_, i) => ({
      x: (i / PIPE_POINTS) * length,
      y: standingWaveProfile(kind, n, i / PIPE_POINTS),
    })),
  }));
  return { kind, length, modes };
}
