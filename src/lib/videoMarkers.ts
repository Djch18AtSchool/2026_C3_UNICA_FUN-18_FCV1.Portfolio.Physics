/**
 * The timed markers of an analysed medium (AnalyzedMedia): how a time reads, which marker the
 * playback has reached, and the check that every marker lies inside the medium.
 */
const SECONDS_PER_MINUTE = 60;
/** A seek lands on the nearest frame, a few ms before the requested time; still "at" the marker. */
const SEEK_TOLERANCE_S = 0.05;
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

/**
 * Fails the build unless every marker lies inside the medium, [0, `duration`) s, in ascending
 * order; `noun` names the medium in the message ("video", "audio").
 */
export function requireMarkersInside(
  markers: readonly { time: number }[],
  duration: number,
  noun = 'video',
): void {
  markers.forEach(({ time }, index) => {
    if (!(time >= 0 && time < duration)) {
      throw new RangeError(`La marca de ${time} s está fuera del ${noun} (0 a ${duration} s)`);
    }
    if (index > 0 && time <= markers[index - 1].time) {
      throw new RangeError(
        `Las marcas deben ir en orden creciente: ${time} s tras ${markers[index - 1].time} s`,
      );
    }
  });
}
