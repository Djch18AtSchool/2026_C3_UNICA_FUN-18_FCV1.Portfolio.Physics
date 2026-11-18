/**
 * Writes src/data/instrument-harmonics.json and public/media/sintesis-sonido/{flauta,clarinete}-mib4.mp3
 * from two recordings of the University of Iowa Musical Instrument Samples (MIS): flute and B♭
 * clarinet, mi♭4 ff without vibrato (docs/superpowers/research/2026-11-17-sintesis-sonido.md §3.2).
 *
 * 1. Downloads each AIFF into media-raw/sintesis-sonido/ (git-ignored) and checks its SHA-256
 *    against research §3.2; the files are data, decoded only by ffmpeg.
 * 2. Decodes it with ffmpeg to 44,1 kHz mono float (0,5 L + 0,5 R; the channels are identical) and
 *    analyses the ORIGINAL with our own FFT (src/lib/audio, research §4.1).
 * 3. Cuts the clip of research §6.2 (channel 1, trimmed at the note's start, fades of 10/50 ms),
 *    normalises it to −20 LUFS with ffmpeg loudnorm in two passes (linear gain) and encodes MP3
 *    128 kb/s, the single audio format of the site (spec §4.3).
 *
 * Run with `pnpm run data:harmonics` (needs ffmpeg with libmp3lame); CI does not run it, the JSON
 * and the MP3 files are committed. The JSON records URLs, hashes, the method, ffmpeg's version
 * and the date.
 */
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ENVELOPE_FRAME_S,
  MEASURED_HARMONICS,
  PHASE_PERIODS,
  SUSTAIN_FRAME_S,
  SUSTAIN_SKIP_END_FRAMES,
  SUSTAIN_SKIP_START_FRAMES,
  WAVEFORM_PERIODS,
  analyseRecording,
  type RecordingAnalysis,
} from '../src/lib/audio/sampleAnalysis';
import { WELCH_OVERLAP, WELCH_WINDOW_S, ZERO_PAD } from '../src/lib/audio/spectrum';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = resolve(ROOT, 'src/data/instrument-harmonics.json');
const RAW_DIR = resolve(ROOT, 'media-raw/sintesis-sonido');
const MEDIA_DIR = 'media/sintesis-sonido';
const MIS_PAGE = 'https://theremin.music.uiowa.edu/MIS.html';
const MIS_FILES =
  'https://theremin.music.uiowa.edu/sound%20files/MIS%20Pitches%20-%202014/Woodwinds';
const SAMPLE_RATE = 44100;
/** mi♭4 in equal temperament with la4 = 440 Hz: the first guess of f₁ (research §4.1). */
const F1_GUESS_HZ = 311.13;
const MP3 = {
  bitrate: '128k',
  targetLufs: -20,
  toleranceLu: 0.5,
  /** A first encode further than this from the target is encoded again (see encodeAtTarget). */
  retryLu: 0.05,
  truePeakDb: -1,
  /** Loudness-range target, high enough that loudnorm keeps a single linear gain. */
  rangeLu: 20,
  fadeInS: 0.01,
  fadeOutS: 0.05,
  maxBytes: 60_000,
} as const;
const FFMPEG_BUFFER_BYTES = 64 * 1024 * 1024;
/** Decoding: mean of the two channels, float32 little-endian to stdout. */
const DECODE_ARGS =
  `-af pan=mono|c0=0.5*c0+0.5*c1 -ar ${SAMPLE_RATE} -f f32le -acodec pcm_f32le -`.split(' ');
/** Encoding: mono CBR MP3 without tags, byte-identical from one run to the next. */
const ENCODE_ARGS =
  `-ar ${SAMPLE_RATE} -ac 1 -c:a libmp3lame -b:a ${MP3.bitrate} -map_metadata -1 -fflags +bitexact -flags:a +bitexact`.split(
    ' ',
  );
/** Research §6.2, without its Markdown marks (italics, code). */
const LICENSE = 'may be downloaded and used for any projects, without restrictions';
const CREDIT =
  'Muestras: University of Iowa Electronic Music Studios, Musical Instrument Samples (dir. Lawrence Fritts), ' +
  'theremin.music.uiowa.edu/MIS.html. Clarinete en si♭ Buffet R13, intérprete Christine Bellomy (1998); ' +
  'flauta, intérprete Sonja Feig (2000); cámara anecoica, micrófono Neumann KM 84. Archivos ' +
  'BbClarinet.ff.Eb4.stereo.aif y Flute.nonvib.ff.Eb4.stereo.aif. Recortados, convertidos a mono e ' +
  `igualados en sonoridad por el autor. Uso permitido por el MIS: "${LICENSE}".`;

type InstrumentId = 'flauta' | 'clarinete';
interface Original {
  file: string;
  url: string;
  sha256: string;
  /** Clip start in the AIFF (research §6.2), s. */
  trimS: number;
}

/** Research §3.2 (files, hashes) and §6.2 (where each clip starts). */
const ORIGINALS: Record<InstrumentId, Original> = {
  flauta: {
    file: 'Flute.nonvib.ff.Eb4.stereo.aif',
    url: `${MIS_FILES}/Flute/Flute.nonvib.ff.Eb4.stereo.aif`,
    sha256: '9ebd45c80c1a0600b9195d45a368949ea98f826ab621b527ab4eff9941839449',
    trimS: 0.1,
  },
  clarinete: {
    file: 'BbClarinet.ff.Eb4.stereo.aif',
    url: `${MIS_FILES}/Bb%20Clarinet/BbClarinet.ff.Eb4.stereo.aif`,
    sha256: '302660ea9d9cded110dcf26fbfc5b14e988d2006f4f59dc7c276e2ccfeed9a4f',
    trimS: 0.38,
  },
};

const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const roundTo = (value: number, decimals: number) => Number(value.toFixed(decimals));
const roundAll = (values: readonly number[], decimals: number) =>
  values.map((v) => roundTo(v, decimals));

/** The AIFF in media-raw/, downloaded only if missing or different; its hash must match. */
async function ensureOriginal({ file, url, sha256: expected }: Original): Promise<string> {
  const path = resolve(RAW_DIR, file);
  if (existsSync(path) && sha256(readFileSync(path)) === expected) return path;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} respondió ${response.status} ${response.statusText}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const actual = sha256(bytes);
  if (actual !== expected) {
    throw new Error(`${file}: SHA-256 ${actual}, se esperaba ${expected} (investigación §3.2)`);
  }
  mkdirSync(RAW_DIR, { recursive: true });
  writeFileSync(path, bytes);
  return path;
}

/** Runs ffmpeg without a shell; throws with its error output if it fails. */
function ffmpeg(args: readonly string[]): { stdout: Buffer; stderr: string } {
  const result = spawnSync('ffmpeg', ['-hide_banner', '-nostdin', ...args], {
    maxBuffer: FFMPEG_BUFFER_BYTES,
  });
  if (result.error) throw result.error;
  const stderr = result.stderr.toString('utf8');
  if (result.status !== 0) throw new Error(`ffmpeg ${args.join(' ')} falló:\n${stderr}`);
  return { stdout: result.stdout, stderr };
}

/** 44,1 kHz mono float samples of the original (mean of the two identical channels). */
function decode(path: string): Float64Array {
  const { stdout } = ffmpeg(['-v', 'error', '-i', path, ...DECODE_ARGS]);
  const view = new DataView(stdout.buffer, stdout.byteOffset, stdout.byteLength);
  return Float64Array.from({ length: stdout.byteLength / 4 }, (_, i) =>
    view.getFloat32(4 * i, true),
  );
}

/** The loudnorm report (printed as JSON on stderr); every field it gives is a number string. */
function loudnormReport(stderr: string): Record<string, string> {
  const match = stderr.match(/\{[^{}]*"input_i"[^{}]*\}/);
  if (!match) throw new Error(`ffmpeg no imprimió el informe de loudnorm:\n${stderr}`);
  return JSON.parse(match[0]) as Record<string, string>;
}

function reportNumber(report: Record<string, string>, key: string): number {
  const value = Number(report[key]);
  if (!Number.isFinite(value)) throw new Error(`loudnorm: ${key} = ${report[key]}`);
  return value;
}

/** Channel 1, trimmed at trimS, faded in and out (research §6.2). */
function clipFilters({ trimS }: Original, fileDurationS: number): string {
  const fadeOutStart = roundTo(fileDurationS - trimS - MP3.fadeOutS, 4);
  return [
    'pan=mono|c0=c0',
    `atrim=start=${trimS}`,
    'asetpts=PTS-STARTPTS',
    `afade=t=in:st=0:d=${MP3.fadeInS}`,
    `afade=t=out:st=${fadeOutStart}:d=${MP3.fadeOutS}`,
  ].join(',');
}

const loudnormTarget = (lufs: number) =>
  `loudnorm=I=${lufs}:TP=${MP3.truePeakDb}:LRA=${MP3.rangeLu}`;

/** loudnorm's report on a file after the filters (first pass, or the check of the MP3). */
function measureLoudness(path: string, filters: string): Record<string, string> {
  const measure = `${loudnormTarget(MP3.targetLufs)}:print_format=json`;
  const chain = filters ? `${filters},${measure}` : measure;
  return loudnormReport(ffmpeg(['-i', path, '-af', chain, '-f', 'null', '-']).stderr);
}

/** Second loudnorm pass with the first pass's measurements: one linear gain, aim − measured I. */
function secondPass(first: Record<string, string>, aimLufs: number): string {
  const [i, tp, lra, thresh] = ['input_i', 'input_tp', 'input_lra', 'input_thresh'].map((key) =>
    reportNumber(first, key),
  );
  return (
    `${loudnormTarget(aimLufs)}:measured_I=${i}:measured_TP=${tp}:measured_LRA=${lra}` +
    `:measured_thresh=${thresh}:linear=true:print_format=json`
  );
}

/** Encodes the MP3 with the gain aimed at aimLufs; returns the loudness of the MP3 itself. */
function encodeMp3(
  input: string,
  filters: string,
  first: Record<string, string>,
  aimLufs: number,
  output: string,
): number {
  const filterChain = `${filters},${secondPass(first, aimLufs)}`;
  const { stderr } = ffmpeg(['-y', '-i', input, '-af', filterChain, ...ENCODE_ARGS, output]);
  const normalization = loudnormReport(stderr).normalization_type;
  if (normalization !== 'linear')
    throw new Error(`${output}: loudnorm aplicó ${normalization}, no una ganancia lineal`);
  return reportNumber(measureLoudness(output, ''), 'input_i');
}

/**
 * The clip at −20 LUFS measured on the MP3. LAME at 128 kb/s plays these notes ≈ 0,4 dB softer
 * than its input (also a plain 310 Hz sine; not at 320 kb/s), so when the first encode misses the
 * target by more than MP3.retryLu, a second one aims the linear gain that much higher.
 */
function encodeAtTarget(input: string, filters: string, output: string): number {
  const first = measureLoudness(input, filters);
  const firstTry = encodeMp3(input, filters, first, MP3.targetLufs, output);
  const miss = MP3.targetLufs - firstTry;
  const loudness =
    Math.abs(miss) > MP3.retryLu
      ? encodeMp3(input, filters, first, roundTo(MP3.targetLufs + miss, 2), output)
      : firstTry;
  if (Math.abs(loudness - MP3.targetLufs) > MP3.toleranceLu) {
    throw new Error(`${output}: ${loudness} LUFS, fuera de ${MP3.targetLufs} ± ${MP3.toleranceLu}`);
  }
  return loudness;
}

/** Cuts, normalises and encodes the clip; checks its loudness and size. */
function encodeClip(id: InstrumentId, original: Original, path: string, fileDurationS: number) {
  const src = `${MEDIA_DIR}/${id}-mib4.mp3`;
  const output = resolve(ROOT, 'public', src);
  mkdirSync(dirname(output), { recursive: true });
  const loudnessLufs = encodeAtTarget(path, clipFilters(original, fileDurationS), output);
  const bytes = readFileSync(output);
  if (bytes.length >= MP3.maxBytes)
    throw new Error(`${src}: ${bytes.length} B, el límite es ${MP3.maxBytes} B`);
  return {
    src,
    trimStartS: original.trimS,
    fadeInS: MP3.fadeInS,
    fadeOutS: MP3.fadeOutS,
    durationS: roundTo(fileDurationS - original.trimS, 3),
    loudnessLufs,
    bytes: bytes.length,
    sha256: sha256(bytes),
  };
}

/** The analysis as stored: dB, Hz, rad and correlations with 4 decimals, times with 2–6. */
function analysisJson(a: RecordingAnalysis) {
  const span = ({ startS, endS }: { startS: number; endS: number }) => ({
    startS: roundTo(startS, 2),
    endS: roundTo(endS, 2),
  });
  return {
    f1: roundTo(a.f1, 4),
    amplitudesDb: roundAll(a.amplitudesDb, 4),
    amplitudeRangesDb: {
      min: roundAll(a.amplitudeRangesDb.min, 4),
      max: roundAll(a.amplitudeRangesDb.max, 4),
    },
    phasesRad: roundAll(a.phasesRad, 4),
    oddEvenDb: roundTo(a.oddEvenDb, 4),
    halfWaveCorrelation: roundTo(a.halfWaveCorrelation, 4),
    attackS: roundTo(a.attackS, 2),
    attack: span(a.attack),
    analysisWindow: span(a.analysisWindow),
    release: span(a.release),
    envelope: { frameS: a.envelope.frameS, level: roundAll(a.envelope.level, 4) },
    waveform: {
      ...a.waveform,
      startS: roundTo(a.waveform.startS, 6),
      y: roundAll(a.waveform.y, 4),
    },
  };
}

/** What was done, with the numbers of the method (research §4.1, §6.2). */
function methodJson(ffmpegVersion: string) {
  return {
    decode: `ffmpeg → ${SAMPLE_RATE} Hz mono float32, 0,5 L + 0,5 R (the two channels are identical)`,
    f1GuessHz: F1_GUESS_HZ,
    sustain: `${SUSTAIN_FRAME_S * 1000} ms RMS frames above half the loudest one, minus ${SUSTAIN_SKIP_START_FRAMES} frames at the start and ${SUSTAIN_SKIP_END_FRAMES} at the end`,
    welch: {
      window: 'hann (symmetric)',
      windowS: WELCH_WINDOW_S,
      overlap: WELCH_OVERLAP,
      zeroPad: ZERO_PAD,
    },
    peaks:
      'strongest bin within ±6 % (f₁) or ±2 % (n f₁), parabolic interpolation of the log magnitude',
    f1: 'median of f_k/k over the peaks of harmonics k = 1…6',
    harmonics: MEASURED_HARMONICS,
    ranges: 'lowest and highest A_n/A₁ over the single 0,25 s windows, f₁ found per window',
    oddEven: '10 log10[(A1² + A3² + A5² + A7² + A9²) / (A2² + A4² + A6² + A8² + A10²)]',
    halfWave:
      'Pearson correlation of y(t) and −y(t + T/2) over whole periods of the sustain, T = f_s/f₁ samples, linear interpolation',
    envelope: `${ENVELOPE_FRAME_S * 1000} ms RMS; attack = first frame above 10 % → first above 90 % of the sustain median; release = last above 90 % → last above 10 %`,
    phases: `Hann-windowed DFT at n f₁ over ${PHASE_PERIODS} periods at the centre of the sustain; φ_n − nφ₁, sine convention`,
    waveform: `${WAVEFORM_PERIODS} + ½ periods from the instant the fundamental starts a period, peak scaled to 1`,
    mp3: `channel 1, trimmed, fades ${MP3.fadeInS * 1000}/${MP3.fadeOutS * 1000} ms, ffmpeg loudnorm two passes (linear) to ${MP3.targetLufs} LUFS, libmp3lame ${MP3.bitrate}b/s CBR mono`,
    ffmpeg: ffmpegVersion,
    script: 'scripts/generate-instrument-harmonics.ts',
    research: 'docs/superpowers/research/2026-11-17-sintesis-sonido.md',
  };
}

/** JSON with each array of numbers on one line, so the file stays readable. */
function formatJson(data: unknown): string {
  return `${JSON.stringify(data, null, 2).replace(/\[\s+(-?\d[^[\]{}"]*?)\s+\]/g, (_, inner: string) => `[${inner.split(/,\s+/).join(', ')}]`)}\n`;
}

async function processSample(id: InstrumentId) {
  const original = ORIGINALS[id];
  const path = await ensureOriginal(original);
  const x = decode(path);
  const analysis = analyseRecording(x, SAMPLE_RATE, F1_GUESS_HZ, MEASURED_HARMONICS);
  const mp3 = encodeClip(id, original, path, x.length / SAMPLE_RATE);
  console.log(
    `${id}: f1 = ${analysis.f1.toFixed(2)} Hz, impar/par = ${analysis.oddEvenDb.toFixed(1)} dB, ` +
      `media onda = ${analysis.halfWaveCorrelation.toFixed(3)}, ataque = ${analysis.attackS.toFixed(2)} s; ` +
      `${mp3.src}: ${mp3.bytes} B, ${mp3.loudnessLufs} LUFS`,
  );
  return {
    file: original.file,
    url: original.url,
    sha256: original.sha256,
    mp3,
    ...analysisJson(analysis),
  };
}

async function main(): Promise<void> {
  const ffmpegVersion = ffmpeg(['-version']).stdout.toString('utf8').split('\n')[0];
  const flauta = await processSample('flauta');
  const clarinete = await processSample('clarinete');
  const json = {
    query: {
      page: MIS_PAGE,
      urls: { flauta: ORIGINALS.flauta.url, clarinete: ORIGINALS.clarinete.url },
    },
    retrieved: new Date().toISOString().slice(0, 10),
    credit: CREDIT,
    license: LICENSE,
    method: methodJson(ffmpegVersion),
    samples: { flauta, clarinete },
  };
  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, formatJson(json));
}

main().catch((error: unknown) => {
  console.error('No se pudo generar instrument-harmonics.json:', error);
  process.exitCode = 1;
});
