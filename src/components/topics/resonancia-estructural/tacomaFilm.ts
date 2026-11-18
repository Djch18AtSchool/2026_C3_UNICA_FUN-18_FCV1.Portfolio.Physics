/**
 * The film of the prescribed resource: `File:Tacoma Narrows Bridge destruction.ogv` (Wikimedia
 * Commons, public domain by the Prelinger Archives' dedication), re-encoded by `pnpm run
 * data:tacoma` into WebM and MP4, and the instants the page analyses (research §6.3).
 */
import { TACOMA_TORSION } from '../../../lib/data/bridges';
import type { HostedSource, RealSpeed } from '../../../lib/media';

/** One frame of the Commons file, which runs at 30000/1001 fps (29,97). */
export const FILE_FRAME_S = 1001 / 30000;

/** The analysed instants of the file, s: the five markers of the page, in order. */
export const TACOMA_MARKS = {
  /** 0:14,3, on the roadway: the white centre line hardly moves. */
  nodo: 14.3,
  /** 0:32,6, looking down from the edge: the 8 ft plate girder of the H section. */
  viga: 32.6,
  /** 0:51,1, the Narrows with whitecaps: the wind. */
  viento: 51.1,
  /** 1:01,7, from under the tower: two whole cycles to count. */
  ciclos: 61.7,
  /** 1:55,8, Monroe's collapse, filmed at 24 fps. */
  colapso: 115.8,
} as const;

export const TACOMA_MARKER_TIMES: readonly number[] = Object.values(TACOMA_MARKS);
export const COLLAPSE_S = TACOMA_MARKS.colapso;

export const TACOMA_FILM: HostedSource = {
  kind: 'video',
  files: [
    { src: 'media/resonancia-estructural/tacoma-1940.webm', type: 'video/webm' },
    { src: 'media/resonancia-estructural/tacoma-1940.mp4', type: 'video/mp4' },
  ],
  title: 'Película muda de la destrucción del puente de Tacoma Narrows, 7 de noviembre de 1940',
  credit: TACOMA_TORSION.source.credit,
  duration: 149.6,
  poster: 'media/resonancia-estructural/tacoma-1940-poster.jpg',
  width: 640,
  height: 480,
};

/**
 * Elliott's camera ran at 16 fps and the copy plays it at 24 (Olson et al. 2015), so his torsion
 * shots run 1,5 times too fast: at 16/24 = 2/3 they play at the speed of 1940. The ranges are his
 * shots only (research §6.3): after the «Disaster» card (0:00–0:02) up to the «The Crash» card
 * (0:42,8–0:46,1), and from there up to Monroe's collapse at 1:55,8, filmed at 24 fps and already
 * at real speed. That range ends one file frame early (ranges are half-open), so a seek to the
 * collapse that lands on the frame before it still plays at 1×.
 */
export const TACOMA_REAL_SPEED: RealSpeed = {
  label: 'Velocidad real (×2/3)',
  rate: TACOMA_TORSION.cameraFps / TACOMA_TORSION.videoFps,
  ranges: [
    [2, 42.8],
    [46.1, COLLAPSE_S - FILE_FRAME_S],
  ],
};
