import { requireVideoId } from './youtube';

/** A third-party video embedded from YouTube, with what its credit line needs. */
export interface EmbeddedVideo {
  /** YouTube id, 11 characters. */
  id: string;
  /** Original title, as the channel published it. */
  title: string;
  channel: string;
  /** Publication day, YYYY-MM-DD. */
  published: string;
  /** Length, s. */
  duration: number;
  /** Spoken language and captions, as the facade states it ("en inglés, con subtítulos…"). */
  language: string;
}

/** One analysed instant of the video: when (s), its title and the written analysis. */
export interface VideoMarker {
  time: number;
  title: string;
  analysis: string;
}

const SECONDS_PER_MINUTE = 60;
/** A seek lands on the nearest frame, a few ms before the requested time; still "at" the marker. */
const SEEK_TOLERANCE_S = 0.05;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
// Calendar days ("2021-08-05"): formatted in UTC so the day never shifts.
const DATE_FORMAT = new Intl.DateTimeFormat('es-CR', { dateStyle: 'long', timeZone: 'UTC' });

/** 18 → "0:18", 610 → "10:10". */
export function formatTimestamp(seconds: number): string {
  const minutes = Math.floor(seconds / SECONDS_PER_MINUTE);
  const rest = Math.floor(seconds % SECONDS_PER_MINUTE);
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

/** "2021-08-05" → "5 de agosto de 2021". */
export function formatVideoDate(day: string): string {
  return DATE_FORMAT.format(new Date(day));
}

/** Index of the last marker time (ascending) the playback has reached, or −1 before the first. */
export function activeMarkerIndex(times: readonly number[], time: number): number {
  return times.map((markerTime) => markerTime <= time + SEEK_TOLERANCE_S).lastIndexOf(true);
}

function requireMarkersInside(markers: readonly VideoMarker[], duration: number): void {
  markers.forEach(({ time }, index) => {
    if (!(time >= 0 && time < duration)) {
      throw new RangeError(`La marca de ${time} s está fuera del video (0 a ${duration} s)`);
    }
    if (index > 0 && time <= markers[index - 1].time) {
      throw new RangeError(
        `Las marcas deben ir en orden creciente: ${time} s tras ${markers[index - 1].time} s`,
      );
    }
  });
}

/**
 * The video, if its data can be trusted to build the player: a valid id, a positive duration, a
 * publication day and markers inside the video in ascending order. Fails the build otherwise.
 */
export function requireEmbeddedVideo(
  video: EmbeddedVideo,
  markers: readonly VideoMarker[],
): EmbeddedVideo {
  requireVideoId(video.id);
  if (!(video.duration > 0)) {
    throw new RangeError(`La duración del video debe ser positiva, no ${video.duration} s`);
  }
  if (!DAY.test(video.published)) {
    throw new RangeError(`La fecha del video debe ser AAAA-MM-DD, no "${video.published}"`);
  }
  requireMarkersInside(markers, video.duration);
  return video;
}
