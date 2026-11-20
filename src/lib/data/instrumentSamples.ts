import { z } from 'astro/zod';
import raw from '../../data/instrument-harmonics.json';
import { MEASURED_HARMONICS, type TimeSpan } from '../audio/sampleAnalysis';

/** The two recordings of Tema 11: flute and B♭ clarinet, both mi♭4 (≈ 310 Hz), ff, no vibrato. */
export type InstrumentId = 'flauta' | 'clarinete';

/** One analysed recording; every number is our own calculation from the original AIFF. */
export interface InstrumentSample {
  id: InstrumentId;
  /** Spanish label. */
  name: string;
  /** Who played it, when and on what, from the MIS page of the instrument (research §3.2). */
  recording: Recording;
  /** The format of the MIS file as downloaded (research §3.2 and §9), not the one the site announces. */
  original: OriginalFormat;
  /** The original file of the MIS (AIFF, 24-bit, 44,1 kHz, two identical channels). */
  file: string;
  source: { page: string; url: string; sha256: string; retrieved: string };
  /** Site path of the published clip under public/ (pass it through withBase). */
  mp3: string;
  /** How the clip was cut from the original: it starts at trimStartS of the AIFF timeline. */
  clip: {
    trimStartS: number;
    fadeInS: number;
    fadeOutS: number;
    durationS: number;
    loudnessLufs: number;
    bytes: number;
    sha256: string;
  };
  /** Attribution of research §6.2 (Markdown marks removed) and the MIS permission it quotes. */
  credit: string;
  license: string;
  origin: 'calculo';
  /** Fundamental, Hz. */
  f1: number;
  /** A_n/A₁ in dB, n = 1…12 (index 0 = n 1 = 0 dB): Welch average over the analysis window. */
  amplitudesDb: number[];
  /** Lowest and highest A_n/A₁ (dB) over the 0,25 s windows of the analysis window. */
  amplitudeRangesDb: { min: number[]; max: number[] };
  /** φ_n − nφ₁ (rad) in y = Σ A_n sin(2π n f₁ t + φ_n), measured over 40 periods. */
  phasesRad: number[];
  /** Power of n = 1, 3, 5, 7, 9 over n = 2, 4, 6, 8, 10, dB. */
  oddEvenDb: number;
  /** corr(y(t), −y(t + T/2)) over the analysis window, equation (11.6). */
  halfWaveCorrelation: number;
  /** Attack, 10 % → 90 % of the sustain level, s. */
  attackS: number;
  /** Bands on the AIFF timeline (s): attack, analysis window (sustain) and release («caída»). */
  attack: TimeSpan;
  analysisWindow: TimeSpan;
  release: TimeSpan;
  /** 10 ms RMS envelope of the whole AIFF divided by the sustain level (1 = sustain). */
  envelope: { frameS: number; level: number[] };
  /**
   * Original samples from startS on (where the fundamental starts a period), peak 1: `periods`
   * periods plus half a period, so −y(t + T/2) can be drawn over all of them; t/T = i f₁/f_s.
   */
  waveform: { startS: number; sampleRate: number; periods: number; tOverT: number[]; y: number[] };
}

const NAMES: Record<InstrumentId, string> = { flauta: 'Flauta', clarinete: 'Clarinete en si♭' };

/** A recording's performer and date, and the instrument (with its model) when the MIS records it. */
export interface Recording {
  performer: string;
  date: string;
  instrument?: string;
}

/**
 * The MIS instrument pages (research §3.2): the flute by Sonja Feig in April 2000; the B♭ clarinet,
 * a Buffet R13, by Christine Bellomy on 3 August 1998.
 */
const RECORDINGS: Readonly<Record<InstrumentId, Recording>> = {
  flauta: { performer: 'Sonja Feig', date: 'abril de 2000' },
  clarinete: {
    performer: 'Christine Bellomy',
    date: '3 de agosto de 1998',
    instrument: 'clarinete Buffet R13',
  },
};

/** A file's container, bit depth, sample rate and channels. */
export interface OriginalFormat {
  container: string;
  bitDepth: number;
  sampleRateHz: number;
  channels: number;
  /** Both channels carry the same samples (|L − R| = 0, research §3.2). */
  identicalChannels: boolean;
}

/**
 * Both downloaded files (research §3.2, «MIS Pitches - 2014»): AIFF, 24 bits, 44,1 kHz, two identical
 * channels. The MIS main page announces 24/96 since 2011; research §9 asks to state the real format.
 */
const ORIGINAL_FORMAT: OriginalFormat = {
  container: 'AIFF',
  bitDepth: 24,
  sampleRateHz: 44100,
  channels: 2,
  identicalChannels: true,
};

/** «Sonja Feig, abril de 2000»; «Christine Bellomy, clarinete Buffet R13, 3 de agosto de 1998». */
export function recordingText({ recording }: InstrumentSample): string {
  const instrument = recording.instrument ? `${recording.instrument}, ` : '';
  return `${recording.performer}, ${instrument}${recording.date}`;
}

export const MS_PER_S = 1000;

/** T = 1/f₁, ms. */
export const periodMs = (sample: InstrumentSample): number => MS_PER_S / sample.f1;

/** A time of the original AIFF (s) on the timeline of the published clip, which starts trimStartS in. */
export const toClipTime = (sample: InstrumentSample, aiffS: number): number =>
  aiffS - sample.clip.trimStartS;

const FLAT = '♭';

/** A note or a name with its flat sign typeset by KaTeX, which IBM Plex lacks: «si$\flat$». */
export const typesetFlat = (text: string): string => text.replaceAll(FLAT, '$\\flat$');

/** The same text as a screen reader should say it: «Clarinete en si bemol», «mi bemol 4». */
export const spokenFlat = (text: string): string =>
  text.replace(/♭(?=\d)/gu, ' bemol ').replaceAll(FLAT, ' bemol');

const spanSchema = z.object({ startS: z.number().nonnegative(), endS: z.number().positive() });
const recipe = z.array(z.number()).length(MEASURED_HARMONICS);

const sampleSchema = z.object({
  file: z.string().min(1),
  url: z.url(),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  mp3: z.object({
    src: z.string().regex(/^media\/sintesis-sonido\/[a-z0-9-]+\.mp3$/),
    trimStartS: z.number().nonnegative(),
    fadeInS: z.number().positive(),
    fadeOutS: z.number().positive(),
    durationS: z.number().positive(),
    loudnessLufs: z.number(),
    bytes: z.number().int().positive(),
    sha256: z.string().regex(/^[0-9a-f]{64}$/),
  }),
  f1: z.number().positive(),
  amplitudesDb: recipe,
  amplitudeRangesDb: z.object({ min: recipe, max: recipe }),
  phasesRad: recipe,
  oddEvenDb: z.number(),
  halfWaveCorrelation: z.number().min(-1).max(1),
  attackS: z.number().positive(),
  attack: spanSchema,
  analysisWindow: spanSchema,
  release: spanSchema,
  envelope: z.object({
    frameS: z.number().positive(),
    level: z.array(z.number().nonnegative()).min(2),
  }),
  waveform: z.object({
    startS: z.number().nonnegative(),
    sampleRate: z.number().positive(),
    periods: z.number().int().positive(),
    y: z.array(z.number().min(-1).max(1)).min(2),
  }),
});

const fileSchema = z.object({
  query: z.object({ page: z.url() }),
  retrieved: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  credit: z.string().min(1),
  license: z.string().min(1),
  samples: z.object({ flauta: sampleSchema, clarinete: sampleSchema }),
});

type FileJson = z.infer<typeof fileSchema>;

function toSample(id: InstrumentId, file: FileJson): InstrumentSample {
  const { file: name, url, sha256, mp3, waveform, ...analysis } = file.samples[id];
  const { src, ...clip } = mp3;
  return {
    id,
    name: NAMES[id],
    recording: RECORDINGS[id],
    original: ORIGINAL_FORMAT,
    file: name,
    source: { page: file.query.page, url, sha256, retrieved: file.retrieved },
    mp3: src,
    clip,
    credit: file.credit,
    license: file.license,
    origin: 'calculo',
    ...analysis,
    waveform: {
      ...waveform,
      tOverT: waveform.y.map((_, i) => (i * analysis.f1) / waveform.sampleRate),
    },
  };
}

/**
 * Validates the JSON written by scripts/generate-instrument-harmonics.ts (`pnpm run
 * data:harmonics`) and returns both analysed recordings. Throws if the shape is wrong.
 */
export function parseInstrumentHarmonics(json: unknown): Record<InstrumentId, InstrumentSample> {
  const file = fileSchema.parse(json);
  return { flauta: toSample('flauta', file), clarinete: toSample('clarinete', file) };
}

/**
 * Flute and B♭ clarinet, mi♭4 ff without vibrato, from the University of Iowa Musical Instrument
 * Samples (theremin.music.uiowa.edu/MIS.html), analysed with our own FFT (research §4.1).
 */
export const INSTRUMENT_SAMPLES: Readonly<Record<InstrumentId, InstrumentSample>> =
  parseInstrumentHarmonics(raw);
