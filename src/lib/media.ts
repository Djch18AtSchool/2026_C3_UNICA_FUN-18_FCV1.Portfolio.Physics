import { requireMarkersInside } from './videoMarkers';
import { requireVideoId } from './youtube';

/** A third-party video embedded from YouTube, with what its credit line needs. */
export interface YouTubeSource {
  kind: 'youtube';
  /** YouTube id, 11 characters. */
  id: string;
  /** Original title, as the channel published it. */
  title: string;
  channel: string;
  /** Publication day, YYYY-MM-DD. */
  published: string;
  /** Length, s. */
  duration: number;
}

/**
 * One encoding of a hosted medium: its file under public/, with its extension
 * ("media/resonancia-estructural/tacoma-1940.webm"), and its MIME type.
 */
export interface MediaFile {
  src: string;
  type: string;
}

/** A video or an audio served by the site itself, from public/media/<slug>/. */
export interface HostedSource {
  kind: 'video' | 'audio';
  /** In order of preference; the first the browser can play wins. */
  files: readonly MediaFile[];
  /** The medium's accessible name. */
  title: string;
  /** Who made it, when and under which licence; the credit line prints it after «Video: ». */
  credit: string;
  /** Length, s. */
  duration: number;
  /** Video only: the still shown before playing, a path under public/media/ like `files`. */
  poster?: string;
  /** Video only: intrinsic size, px, so the box keeps its aspect ratio before the metadata loads. */
  width?: number;
  height?: number;
}

export type MediaSource = YouTubeSource | HostedSource;

/** One analysed instant of the medium: when (s), its title and the written analysis. */
export interface MediaMarker {
  time: number;
  title: string;
  analysis: string;
}

/**
 * A rate the reader can switch on that applies only inside `ranges` (s, ascending, without
 * overlapping): Tema 12's «Velocidad real (×2/3)» plays the shots filmed at 16 fps at their real
 * speed and leaves the rest of the film at 1×. Each range is half-open, [start, end): `start`
 * plays at `rate`, `end` already at 1×. A range that ends where a marker starts the next shot
 * should end one frame before that marker, so the frame shown at the marker is never slowed down.
 */
export interface RealSpeed {
  label: string;
  rate: number;
  ranges: readonly (readonly [number, number])[];
}

const NORMAL_RATE = 1;
/** The encodings every target browser plays between them (spec §4.3), with their names. */
const ACCEPTED_TYPES: Readonly<Record<HostedSource['kind'], Readonly<Record<string, string>>>> = {
  video: { 'video/webm': 'WebM', 'video/mp4': 'MP4' },
  audio: { 'audio/mpeg': 'MP3' },
};
/**
 * A file under public/media/ with its extension (without one, withBase would make it a folder,
 * "…/x/"), with no way out of it ("..") and no scheme or leading slash.
 */
const PUBLIC_MEDIA_PATH = /^media\/(?!.*\.\.)[\w./-]*[\w-]\.[A-Za-z0-9]+$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** "2021-08-05" is a day; "5/8/2021" or "2021-02-30" are not (the round trip must match). */
function isCalendarDay(text: string): boolean {
  const date = new Date(text);
  return DAY.test(text) && !Number.isNaN(date.getTime()) && date.toISOString().startsWith(text);
}

/** The medium's noun in a message: "del video", "del audio". */
const nounOf = (source: MediaSource) => (source.kind === 'audio' ? 'audio' : 'video');

/** The name of a file's format for the download link ("WebM", "MP3"); assumes a valid source. */
export function formatName(file: MediaFile): string {
  return ACCEPTED_TYPES.video[file.type] ?? ACCEPTED_TYPES.audio[file.type];
}

function requireYouTube(source: YouTubeSource): void {
  requireVideoId(source.id);
  if (!isCalendarDay(source.published)) {
    throw new RangeError(`La fecha del video debe ser AAAA-MM-DD, no "${source.published}"`);
  }
}

function requirePublicMedia(path: string): void {
  if (!PUBLIC_MEDIA_PATH.test(path)) {
    throw new RangeError(
      `"${path}" debe ser un archivo de public/media/ con su extensión, como "media/<slug>/archivo.webm"`,
    );
  }
}

function requireHosted(source: HostedSource): void {
  if (source.files.length === 0) {
    throw new RangeError(`El ${source.kind} «${source.title}» necesita al menos un archivo`);
  }
  const accepted = ACCEPTED_TYPES[source.kind];
  source.files.forEach(({ src, type }) => {
    requirePublicMedia(src);
    if (!Object.hasOwn(accepted, type)) {
      throw new RangeError(
        `El archivo ${src} es de tipo «${type}»; un ${source.kind} admite ${Object.keys(accepted).join(', ')}`,
      );
    }
  });
  if (source.poster !== undefined) requirePublicMedia(source.poster);
}

/**
 * Fails the build unless the medium's data can be trusted to build the player: a positive
 * duration, markers inside it in ascending order, and, for YouTube, a valid id and publication
 * day; for a hosted medium, at least one file, each a path under public/media/ in an accepted type.
 */
export function requireMedia(source: MediaSource, markers: readonly MediaMarker[]): void {
  if (source.kind === 'youtube') requireYouTube(source);
  else requireHosted(source);
  if (!(source.duration > 0)) {
    throw new RangeError(
      `La duración del ${nounOf(source)} debe ser positiva, no ${source.duration} s`,
    );
  }
  requireMarkersInside(markers, source.duration, nounOf(source));
}

function requireRanges(ranges: RealSpeed['ranges'], duration: number): void {
  if (ranges.length === 0) throw new RangeError('La velocidad real necesita al menos un tramo');
  ranges.forEach(([start, end], index) => {
    if (!(start >= 0 && start < end && end <= duration)) {
      throw new RangeError(
        `El tramo de ${start} a ${end} s debe empezar antes de acabar, dentro de 0 a ${duration} s`,
      );
    }
    if (index > 0 && start < ranges[index - 1][1]) {
      throw new RangeError(
        `Los tramos deben ir en orden y sin solaparse: ${start} s antes de ${ranges[index - 1][1]} s`,
      );
    }
  });
}

/**
 * Fails the build unless the real speed, if any, belongs to a hosted medium (the page does not
 * drive YouTube's rate), has a name and a positive rate, and its ranges lie inside the medium in
 * ascending order without overlapping.
 */
export function requireRealSpeed(source: MediaSource, realSpeed: RealSpeed | undefined): void {
  if (!realSpeed) return;
  if (source.kind === 'youtube') {
    throw new RangeError('La velocidad real solo se aplica a un video o audio alojado en el sitio');
  }
  if (realSpeed.label.trim() === '') {
    throw new RangeError('La velocidad real necesita un nombre para su botón');
  }
  if (!(realSpeed.rate > 0 && Number.isFinite(realSpeed.rate))) {
    throw new RangeError(`La velocidad real debe ser positiva y finita, no ${realSpeed.rate}`);
  }
  requireRanges(realSpeed.ranges, source.duration);
}

/** The playback rate at `time` (s): the real-speed rate inside one of its ranges while on, else 1. */
export function rateAt(time: number, realSpeed: RealSpeed | undefined, isOn: boolean): number {
  if (!isOn || !realSpeed) return NORMAL_RATE;
  const isInside = realSpeed.ranges.some(([start, end]) => time >= start && time < end);
  return isInside ? realSpeed.rate : NORMAL_RATE;
}
