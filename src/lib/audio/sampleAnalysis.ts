/**
 * The whole analysis of one recorded note (Tema 11), as the research did it (§4.1; prototypes
 * `harmonics.py`, `final_pair.py`, `robust.py`, `halfwave.py`, `envelope.py`): the sustain window,
 * the Welch recipe with its per-window range, the phases, the odd/even power, the half-wave
 * correlation, the attack and release, the envelope and a waveform excerpt. Pure functions on
 * samples; scripts/generate-instrument-harmonics.ts decodes the file and stores the result.
 */
import { halfWaveCorrelation, oddEvenPowerDb, sampleAt } from '../physics/harmonics';
import {
  F1_SEARCH_TOLERANCE,
  WELCH_OVERLAP,
  WELCH_WINDOW_S,
  attackTime,
  envelopeEvents,
  harmonicAmplitudes,
  harmonicLevelsDb,
  hann,
  peakNear,
  rmsEnvelope,
  windowSpectra,
} from './spectrum';

/** Harmonics measured per note: n = 1…12, as the research's «Receta medida» (§4.1). */
export const MEASURED_HARMONICS = 12;
/** Sustain detection (`steady_segment`): 20 ms RMS frames above half the loudest frame. */
export const SUSTAIN_FRAME_S = 0.02;
const SUSTAIN_THRESHOLD = 0.5;
/**
 * Frames skipped after the first and before the last frame above the threshold. The prototype
 * writes int(0.15/0.02) = 7 (0,14 s: the quotient is 7,4999… in floating point) and
 * int(0.10/0.02) = 5; we keep 7 and 5 so the window is the research's (clarinet 0,60–2,24 s).
 */
export const SUSTAIN_SKIP_START_FRAMES = 7;
export const SUSTAIN_SKIP_END_FRAMES = 5;
/** Envelope for the attack and release: 10 ms RMS frames (`envelope.py`). */
export const ENVELOPE_FRAME_S = 0.01;
/** Phases are measured over 40 periods at the centre of the sustain (`final_pair.py`). */
export const PHASE_PERIODS = 40;
/** The stored waveform: 4 periods (plus half a period, so −y(t + T/2) covers all four). */
export const WAVEFORM_PERIODS = 4;

const TWO_PI = 2 * Math.PI;
const wrap = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));
const dbToAmplitude = (db: number) => 10 ** (db / 20);

export interface TimeSpan {
  startS: number;
  endS: number;
}

export interface RecordingAnalysis {
  /** Fundamental (Hz): Welch spectrum, median of f_k/k for k = 1…6. */
  f1: number;
  /** A_n/A₁ in dB for n = 1…count (index 0 = n 1 = 0 dB), Welch average. */
  amplitudesDb: number[];
  /** The same level in each 0,25 s window: lowest and highest (`robust.py`). */
  amplitudeRangesDb: { min: number[]; max: number[] };
  /** φ_n − nφ₁ in the sine convention of (11.4), radians in (−π, π]; index 0 = 0. */
  phasesRad: number[];
  oddEvenDb: number;
  halfWaveCorrelation: number;
  analysisWindow: TimeSpan;
  attackS: number;
  attack: TimeSpan;
  release: TimeSpan;
  /** 10 ms RMS envelope of the whole file, divided by the sustain level. */
  envelope: { frameS: number; level: number[] };
  /** Excerpt starting where the fundamental starts a period (sine phase 0), peak scaled to 1. */
  waveform: { startS: number; sampleRate: number; periods: number; y: number[] };
}

/** Sample range [start, end) of the steady part of the note (`steady_segment`, whole sustain). */
export function sustainWindow(
  x: ArrayLike<number>,
  sampleRate: number,
): { start: number; end: number } {
  const envelope = Array.from(rmsEnvelope(x, sampleRate, SUSTAIN_FRAME_S));
  const threshold = SUSTAIN_THRESHOLD * Math.max(...envelope);
  const first = envelope.findIndex((v) => v > threshold) + SUSTAIN_SKIP_START_FRAMES;
  const last = envelope.findLastIndex((v) => v > threshold) - SUSTAIN_SKIP_END_FRAMES;
  if (!(last > first)) {
    throw new RangeError('the note has no sustain left after skipping its attack and release');
  }
  const frame = Math.floor(SUSTAIN_FRAME_S * sampleRate);
  return { start: first * frame, end: last * frame };
}

/** Phase θ of y ≈ A cos(2π f t + θ), from a Hann-windowed DFT at f (t from the frame start). */
function cosinePhase(
  frame: Float64Array,
  window: Float64Array,
  f: number,
  sampleRate: number,
): number {
  let re = 0;
  let im = 0;
  frame.forEach((v, i) => {
    const angle = (TWO_PI * f * i) / sampleRate;
    re += v * window[i] * Math.cos(angle);
    im -= v * window[i] * Math.sin(angle);
  });
  return Math.atan2(im, re);
}

/**
 * Phases of harmonics 1…count over 40 periods centred on `centre` (a sample index). With θ_n the
 * cosine phases at the frame start, the fundamental's sine phase is θ₁ + π/2; at the instant where
 * it is 0 the sine phase of harmonic n is θ_n − nθ₁ − (n − 1)π/2. `start` is that instant (a
 * fractional sample index), the one nearest to the centre.
 */
export function measurePhases(
  x: Float64Array,
  sampleRate: number,
  f1: number,
  centre: number,
  count: number,
): { phasesRad: number[]; start: number } {
  const length = Math.round((sampleRate * PHASE_PERIODS) / f1);
  const begin = centre - Math.floor(length / 2);
  if (begin < 0 || begin + length > x.length) {
    throw new RangeError(
      `${PHASE_PERIODS} periods around sample ${centre} do not fit in the signal`,
    );
  }
  const frame = x.subarray(begin, begin + length);
  const window = hann(length);
  const theta = Array.from({ length: count }, (_, i) =>
    cosinePhase(frame, window, (i + 1) * f1, sampleRate),
  );
  const period = sampleRate / f1;
  const firstZero = (-(theta[0] + Math.PI / 2) / TWO_PI) * period;
  return {
    phasesRad: theta.map((t, i) => wrap(t - (i + 1) * theta[0] - (i * Math.PI) / 2)),
    start: begin + firstZero + Math.round((centre - begin - firstZero) / period) * period,
  };
}

/** periods + ½ period of x from a fractional sample index, interpolated, scaled to a peak of 1. */
export function waveformExcerpt(
  x: ArrayLike<number>,
  sampleRate: number,
  f1: number,
  start: number,
  periods: number,
): number[] {
  const count = Math.ceil(((periods + 0.5) * sampleRate) / f1) + 1;
  if (start < 0 || start + count - 1 > x.length - 1) {
    throw new RangeError(`the excerpt from sample ${start} does not fit in the signal`);
  }
  const y = Array.from({ length: count }, (_, i) => sampleAt(x, start + i));
  const peak = y.reduce((max, v) => Math.max(max, Math.abs(v)), 0);
  return y.map((v) => v / peak);
}

/** Lowest and highest level of each harmonic over the Welch windows, f₁ found per window. */
export function harmonicRangesDb(
  x: ArrayLike<number>,
  sampleRate: number,
  f1Guess: number,
  count: number,
): { min: number[]; max: number[] } {
  const rows = windowSpectra(x, sampleRate, WELCH_WINDOW_S, WELCH_OVERLAP).map((spectrum) =>
    harmonicLevelsDb(spectrum, peakNear(spectrum, f1Guess, F1_SEARCH_TOLERANCE).frequency, count),
  );
  const column = (n: number) => rows.map((row) => row[n]);
  return {
    min: Array.from({ length: count }, (_, n) => Math.min(...column(n))),
    max: Array.from({ length: count }, (_, n) => Math.max(...column(n))),
  };
}

/** Everything research §4.1 measures on one note, from the decoded samples (mono, f_s Hz). */
export function analyseRecording(
  x: Float64Array,
  sampleRate: number,
  f1Guess: number,
  count: number,
): RecordingAnalysis {
  const { start, end } = sustainWindow(x, sampleRate);
  const sustain = x.subarray(start, end);
  const { f1, amplitudesDb } = harmonicAmplitudes(sustain, sampleRate, f1Guess, count);
  const phases = measurePhases(x, sampleRate, f1, Math.floor((start + end) / 2), count);
  const envelope = rmsEnvelope(x, sampleRate, ENVELOPE_FRAME_S);
  const frameRate = 1 / ENVELOPE_FRAME_S;
  const events = envelopeEvents(envelope, frameRate);
  return {
    f1,
    amplitudesDb,
    amplitudeRangesDb: harmonicRangesDb(sustain, sampleRate, f1Guess, count),
    phasesRad: phases.phasesRad,
    oddEvenDb: oddEvenPowerDb(amplitudesDb.map(dbToAmplitude)),
    halfWaveCorrelation: halfWaveCorrelation(Array.from(sustain), sampleRate / f1),
    analysisWindow: { startS: start / sampleRate, endS: end / sampleRate },
    attackS: attackTime(envelope, frameRate),
    attack: { startS: events.attackStartS, endS: events.attackEndS },
    release: { startS: events.releaseStartS, endS: events.releaseEndS },
    envelope: {
      frameS: ENVELOPE_FRAME_S,
      level: Array.from(envelope, (v) => v / events.sustainLevel),
    },
    waveform: {
      startS: phases.start / sampleRate,
      sampleRate,
      periods: WAVEFORM_PERIODS,
      y: waveformExcerpt(x, sampleRate, f1, phases.start, WAVEFORM_PERIODS),
    },
  };
}
