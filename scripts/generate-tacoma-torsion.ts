/**
 * Writes src/data/tacoma-torsion.json and public/media/resonancia-estructural/tacoma-1940.{webm,mp4}
 * plus its poster from Wikimedia Commons' «Tacoma Narrows Bridge destruction.ogv» (public domain by
 * the Prelinger Archives' dedication), measuring the torsion period frame by frame in the three
 * shots of docs/superpowers/research/2026-11-17-resonancia-estructural.md §6.2.
 *
 * Run with `pnpm run data:tacoma` (needs ffmpeg). The original and Commons' own VP9 transcode go to
 * media-raw/tacoma/ (git-ignored), are checked against their SHA-256 before use and are only ever
 * decoded by ffmpeg, never executed. Each shot is decoded to 320 × 240 grey frames, reduced to one
 * number per frame (horizon tilt or deck-edge height, src/lib/video/frameSignals.ts) and its period
 * read with src/lib/video/periodEstimate.ts; the transcode repeats the measurement as a check. CI
 * does not run this script: the JSON and the media are committed.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  edgeSeries,
  frameCount,
  movingAverage,
  tiltSeries,
  type Band,
  type GrayFrames,
} from '../src/lib/video/frameSignals';
import { estimatePeriod } from '../src/lib/video/periodEstimate';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RAW_DIR = resolve(ROOT, 'media-raw/tacoma');
const OUTPUT = resolve(ROOT, 'src/data/tacoma-torsion.json');
const MEDIA_DIR = resolve(ROOT, 'public/media/resonancia-estructural');
const MEDIA_URL = '/media/resonancia-estructural';
const USER_AGENT = 'physics-portfolio-data-script/1.0 (educational, non-commercial)';
const MAX_MEDIA_BYTES = 20 * 1024 * 1024;
const MAX_FFMPEG_OUTPUT = 512 * 1024 * 1024;
const DOWNLOAD_RETRIES = 3;
const DOWNLOAD_RETRY_DELAY_S = 30;

const PAGE = 'https://commons.wikimedia.org/wiki/File:Tacoma_Narrows_Bridge_destruction.ogv';
const UPLOAD = 'https://upload.wikimedia.org/wikipedia/commons';
const LICENSE =
  'Dominio público: dedicación Creative Commons Public Domain de los Prelinger Archives (plantilla {{Prelinger}} de Commons)';
const CREDIT =
  'Barney Elliott y Harbine Monroe (The Camera Shop, Tacoma), 7 de noviembre de 1940. Prelinger Archives vía Wikimedia Commons, dominio público';
const FPS_SOURCE =
  'Olson, Wolf y Hook, «The Tacoma Narrows Bridge collapse», Physics Today 68(11), 64-65 (2015): las tomas de Elliott a 16 fps, copiadas como 24';

interface Download {
  id: string;
  name: string;
  url: string;
  bytes: number;
  sha256: string;
  /** SHA-1 that the Commons API (prop=videoinfo) publishes for the file, when it does. */
  sha1?: string;
}

/** SHA-256 pinned on the first download (2026-11-17); the original's SHA-1 is Commons' own. */
const DOWNLOADS: readonly Download[] = [
  {
    id: 'original',
    name: 'Tacoma_Narrows_Bridge_destruction.ogv',
    url: `${UPLOAD}/f/f2/Tacoma_Narrows_Bridge_destruction.ogv`,
    bytes: 20088869,
    sha256: '09cd775bbf96a043013b3994e9ec4eab8ae7b36dfed2f75ee30116125cd715a7',
    sha1: '53b77793ad54afd0feba0739b3e1007bcbc315bb',
  },
  {
    id: 'vp9-480p',
    name: 'Tacoma_Narrows_Bridge_destruction.ogv.480p.vp9.webm',
    url: `${UPLOAD}/transcoded/f/f2/Tacoma_Narrows_Bridge_destruction.ogv/Tacoma_Narrows_Bridge_destruction.ogv.480p.vp9.webm`,
    bytes: 11100673,
    sha256: '615d37573675335206c2c21b12404ce661d1dac256ce1fb13c71b9012b8c63a9',
  },
];

/** Both files run at 30000/1001 fps (ffprobe), with the same 4 486 frames. */
const FILE_FPS = 30000 / 1001;
/** The research measured at 320 × 240 (prototypes edge.py and tilt.py). */
const FRAME = { width: 320, height: 240 } as const;
/** The shot table has 0,1 s resolution: start and end 0,1 s inside each cut, past its mixed frames. */
const CUT_INSET_S = 0.1;
/**
 * Lags searched, video seconds: the 12-14 cycles/min of 1940 give 2,86-3,33 s at ×1,5, and this
 * brackets them widely while leaving out the half-period anticorrelation (≈ 1,7 s).
 */
const LAG_RANGE_S: [number, number] = [2.5, 4.5];
const CAMERA_FPS = 16;
const VIDEO_FPS = 24;
const POSTER_S = 27.2;

interface ShotPlan {
  id: string;
  label: string;
  signal: 'inclinacion' | 'borde';
  startS: number;
  endS: number;
  /** Left and right bands for the tilt, one band for the edge (320 × 240 coordinates). */
  bands: Band[];
  /** Moving-average width of the prototypes: 9 frames for the tilt, 7 for the edge. */
  smoothingFrames: number;
}

/**
 * Research §6.2: the shots, signals, columns and rows of the prototype runs. Shot 1's horizon tilts
 * only ±2 px, so it is the least certain (3,58 s; the research's 3,49 s was a zero-padding artefact).
 */
const SHOTS: readonly ShotPlan[] = [
  {
    id: 'calzada',
    label: 'Sobre la calzada',
    signal: 'inclinacion',
    startS: 14.3,
    endS: 25.3,
    bands: [
      { x0: 10, x1: 50, y0: 90, y1: 200 },
      { x0: 270, x1: 310, y0: 90, y1: 200 },
    ],
    smoothingFrames: 9,
  },
  {
    id: 'calzada-auto',
    label: 'Sobre la calzada, con el auto',
    signal: 'inclinacion',
    startS: 25.3,
    endS: 32.6,
    bands: [
      { x0: 10, x1: 50, y0: 60, y1: 200 },
      { x0: 270, x1: 310, y0: 60, y1: 200 },
    ],
    smoothingFrames: 9,
  },
  {
    id: 'torre',
    label: 'Desde debajo de la torre',
    signal: 'borde',
    startS: 61.7,
    endS: 69.4,
    bands: [{ x0: 170, x1: 194, y0: 95, y1: 175 }],
    smoothingFrames: 7,
  },
];

const QUANTITY = {
  inclinacion: 'inclinación del horizonte (fila izquierda − fila derecha)',
  borde: 'altura del borde del tablero (hacia arriba)',
} as const;

const round = (value: number, decimals: number): number => {
  const k = 10 ** decimals;
  return Math.round(value * k) / k;
};

const hash = (algorithm: 'sha256' | 'sha1', data: Buffer): string =>
  createHash(algorithm).update(data).digest('hex');

// ---------------------------------------------------------------------------------------------
// Downloads

function checked(file: Download, data: Buffer): boolean {
  return (
    data.length === file.bytes &&
    hash('sha256', data) === file.sha256 &&
    (!file.sha1 || hash('sha1', data) === file.sha1)
  );
}

/**
 * Path of a verified local copy, downloading it when missing or different. The download uses curl:
 * on 2026-11-17 upload.wikimedia.org answered Node's own HTTP clients (fetch, https, http2) with
 * HTTP 429 while curl, with the same User-Agent and at the same minute, got the file. curl retries
 * on 429 itself; the bytes land in a .part file and replace the copy only once verified.
 */
function ensureDownload(file: Download): string {
  const path = resolve(RAW_DIR, file.name);
  if (existsSync(path) && checked(file, readFileSync(path))) return path;
  mkdirSync(RAW_DIR, { recursive: true });
  const part = `${path}.part`;
  execFileSync('curl', [
    ...'--fail --silent --show-error --location'.split(' '),
    ...['--retry', String(DOWNLOAD_RETRIES), '--retry-delay', String(DOWNLOAD_RETRY_DELAY_S)],
    ...['--user-agent', USER_AGENT, '--output', part, file.url],
  ]);
  const data = readFileSync(part);
  if (!checked(file, data)) {
    rmSync(part);
    throw new Error(
      `${file.id}: ${data.length} bytes, SHA-256 ${hash('sha256', data)}; expected ` +
        `${file.bytes} bytes, ${file.sha256}. Commons changed the file: review it before pinning.`,
    );
  }
  renameSync(part, path);
  console.log(`${file.id}: descargado y verificado (${data.length} bytes)`);
  return path;
}

// ---------------------------------------------------------------------------------------------
// Measurement

function ffmpeg(args: string[]): Buffer {
  return execFileSync('ffmpeg', ['-v', 'error', '-nostdin', ...args], {
    maxBuffer: MAX_FFMPEG_OUTPUT,
  });
}

/** Frames first … last (indices in the file) as 320 × 240 grey bytes. */
function grayFrames(path: string, first: number, last: number): GrayFrames {
  const count = last - first + 1;
  const filter = `select='between(n,${first},${last})',scale=${FRAME.width}:${FRAME.height},format=gray`;
  const out = ffmpeg([
    ...['-i', path, '-an', '-vf', filter],
    ...`-fps_mode passthrough -frames:v ${count} -f rawvideo -pix_fmt gray -`.split(' '),
  ]);
  const frames = { ...FRAME, data: new Uint8Array(out.buffer, out.byteOffset, out.byteLength) };
  if (frameCount(frames) !== count) {
    throw new Error(`${path}: expected ${count} frames from ${first}, got ${frameCount(frames)}`);
  }
  return frames;
}

interface Measured {
  periodVideoS: number;
  firstFrame: number;
  values: number[];
}

/** One shot: its signal per frame, smoothed and centred (0,1 px), and the period it gives. */
function measureShot(path: string, shot: ShotPlan): Measured {
  const first = Math.ceil((shot.startS + CUT_INSET_S) * FILE_FPS);
  const last = Math.floor((shot.endS - CUT_INSET_S) * FILE_FPS);
  const frames = grayFrames(path, first, last);
  const [a, b] = shot.bands;
  const raw =
    shot.signal === 'inclinacion' ? tiltSeries(frames, a, b) : edgeSeries(frames, a).map((y) => -y);
  const smooth = movingAverage(raw, shot.smoothingFrames);
  const mean = smooth.reduce((sum, v) => sum + v, 0) / smooth.length;
  const values = smooth.map((v) => round(v - mean, 1));
  return {
    periodVideoS: estimatePeriod(values, FILE_FPS, ...LAG_RANGE_S),
    firstFrame: first + (shot.smoothingFrames - 1) / 2,
    values,
  };
}

// ---------------------------------------------------------------------------------------------
// Published media

interface Published {
  path: string;
  bytes: number;
  sha256: string;
  codec: string;
}

/** Shared output options; +bitexact keeps the muxers from writing random IDs, so reruns match. */
const VIDEO_COMMON =
  '-fflags +bitexact -map 0:v:0 -an -map_metadata -1 -pix_fmt yuv420p -g 60'.split(' ');

/** The published files: WebM (VP9) and MP4 (H.264, moov first) at the file's 640 × 480, and
 * a JPEG poster. `seek` goes before the input, `args` after it. */
const MEDIA_OUTPUTS: readonly { name: string; codec: string; seek: string[]; args: string[] }[] = [
  {
    name: 'tacoma-1940.webm',
    codec: 'VP9 (libvpx-vp9, CRF 31), sin audio',
    seek: [],
    args: [
      ...'-c:v libvpx-vp9 -b:v 0 -crf 31 -row-mt 1 -deadline good -cpu-used 2'.split(' '),
      ...VIDEO_COMMON,
    ],
  },
  {
    name: 'tacoma-1940.mp4',
    codec: 'H.264 (libx264, CRF 22, perfil high), +faststart, sin audio',
    seek: [],
    args: [
      ...'-c:v libx264 -preset slow -crf 22 -profile:v high -movflags +faststart'.split(' '),
      ...VIDEO_COMMON,
    ],
  },
  {
    name: 'tacoma-1940-poster.jpg',
    codec: 'JPEG, cuadro de 0:27,2 (máximo de inclinación de la toma con el auto)',
    seek: ['-ss', String(POSTER_S)],
    args: ['-frames:v', '1', '-q:v', '3', '-map_metadata', '-1'],
  },
];

/** Encodes MEDIA_OUTPUTS from the original and checks each stays under 20 MB. */
function encodeMedia(original: string): Published[] {
  mkdirSync(MEDIA_DIR, { recursive: true });
  return MEDIA_OUTPUTS.map(({ name, codec, seek, args }) => {
    const target = resolve(MEDIA_DIR, name);
    ffmpeg(['-y', ...seek, '-i', original, ...args, target]);
    const data = readFileSync(target);
    if (data.length >= MAX_MEDIA_BYTES) throw new Error(`${name}: ${data.length} bytes ≥ 20 MB`);
    console.log(`${name}: ${(data.length / 1048576).toFixed(1)} MB`);
    return {
      path: `${MEDIA_URL}/${name}`,
      bytes: data.length,
      sha256: hash('sha256', data),
      codec,
    };
  });
}

// ---------------------------------------------------------------------------------------------

const METHOD_NOTE =
  'Luminancia gris a 320 × 240; por cuadro, la fila del escalón claro→oscuro más fuerte en cada banda (media de columnas, suavizado de 3 filas sin relleno); serie suavizada con media móvil centrada y centrada en 0; periodo = pico de la autocorrelación normalizada por solapamiento, refinado con una parábola.';

/** The JSON: provenance, method, shots with their periods, the fps correction and the series. */
function buildDataset(measured: Measured[], crossCheck: number[], published: Published[]) {
  const periods = measured.map((m) => m.periodVideoS);
  const meanPeriodVideoS = periods.reduce((sum, p) => sum + p, 0) / periods.length;
  const periodRealS = (meanPeriodVideoS * VIDEO_FPS) / CAMERA_FPS;
  return {
    retrieved: new Date().toISOString().slice(0, 10),
    source: {
      page: PAGE,
      license: LICENSE,
      credit: CREDIT,
      files: DOWNLOADS.map(({ name: _name, ...file }) => file),
    },
    method: {
      tool: execFileSync('ffmpeg', ['-version']).toString().split('\n')[0],
      frame: FRAME,
      fileFps: FILE_FPS,
      cutInsetS: CUT_INSET_S,
      lagRangeS: LAG_RANGE_S,
      note: METHOD_NOTE,
    },
    shots: SHOTS.map((shot, i) => ({ ...shot, periodVideoS: round(periods[i], 4) })),
    meanPeriodVideoS: round(meanPeriodVideoS, 4),
    cameraFps: CAMERA_FPS,
    videoFps: VIDEO_FPS,
    fpsSource: FPS_SOURCE,
    periodRealS: round(periodRealS, 4),
    frequencyRealHz: round(1 / periodRealS, 5),
    series: SHOTS.map((shot, i) => ({
      shotId: shot.id,
      startS: round(measured[i].firstFrame / FILE_FPS, 5),
      fps: FILE_FPS,
      quantity: QUANTITY[shot.signal],
      unit: 'px',
      values: measured[i].values,
    })),
    crossCheck: { fileId: DOWNLOADS[1].id, periodsVideoS: crossCheck },
    published,
  };
}

function main(): void {
  const original = ensureDownload(DOWNLOADS[0]);
  const transcode = ensureDownload(DOWNLOADS[1]);
  const measured = SHOTS.map((shot) => measureShot(original, shot));
  const crossCheck = SHOTS.map((shot) => round(measureShot(transcode, shot).periodVideoS, 4));
  const dataset = buildDataset(measured, crossCheck, encodeMedia(original));
  writeFileSync(OUTPUT, `${JSON.stringify(dataset)}\n`);
  dataset.shots.forEach((shot, i) =>
    console.log(
      `${shot.id}: T = ${shot.periodVideoS} s en el video (VP9 de Commons: ${crossCheck[i]} s)`,
    ),
  );
  console.log(
    `media ${dataset.meanPeriodVideoS} s → ×${VIDEO_FPS}/${CAMERA_FPS} = ${dataset.periodRealS} s, ` +
      `${dataset.frequencyRealHz} Hz`,
  );
}

try {
  main();
} catch (error: unknown) {
  console.error('No se pudo generar tacoma-torsion.json:', error);
  process.exitCode = 1;
}
