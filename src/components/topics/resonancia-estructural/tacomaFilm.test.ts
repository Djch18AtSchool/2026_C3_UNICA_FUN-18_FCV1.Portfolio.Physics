import { describe, expect, test } from 'vitest';
import { rateAt, requireMedia, requireRealSpeed } from '../../../lib/media';
import { TACOMA_TORSION } from '../../../lib/data/bridges';
import {
  COLLAPSE_S,
  FILE_FRAME_S,
  TACOMA_FILM,
  TACOMA_MARKER_TIMES,
  TACOMA_REAL_SPEED,
} from './tacomaFilm';

const REAL = 2 / 3;
const at = (time: number) => rateAt(time, TACOMA_REAL_SPEED, true);

describe('the hosted 1940 film', () => {
  test('WebM first, then MP4, with the poster and the size of the Commons file', () => {
    expect(TACOMA_FILM.kind).toBe('video');
    expect(TACOMA_FILM.files).toEqual([
      { src: 'media/resonancia-estructural/tacoma-1940.webm', type: 'video/webm' },
      { src: 'media/resonancia-estructural/tacoma-1940.mp4', type: 'video/mp4' },
    ]);
    expect(TACOMA_FILM.poster).toBe('media/resonancia-estructural/tacoma-1940-poster.jpg');
    expect([TACOMA_FILM.width, TACOMA_FILM.height]).toEqual([640, 480]);
    expect(TACOMA_FILM.duration).toBe(149.6);
  });

  test('the credit is the brief’s, the same the measurement dataset records', () => {
    expect(TACOMA_FILM.credit).toBe(
      'Barney Elliott y Harbine Monroe (The Camera Shop, Tacoma), 7 de noviembre de 1940. Prelinger Archives vía Wikimedia Commons, dominio público',
    );
    expect(TACOMA_FILM.credit).toBe(TACOMA_TORSION.source.credit);
  });

  test('the published files are the ones the dataset lists', () => {
    const published = TACOMA_TORSION.published.map((file) => file.path.slice(1));

    TACOMA_FILM.files.forEach((file) => expect(published).toContain(file.src));
    expect(published).toContain(TACOMA_FILM.poster);
  });

  test('passes the media validation with its five markers and its real speed', () => {
    const markers = TACOMA_MARKER_TIMES.map((time) => ({ time, title: 't', analysis: 'a' }));

    expect(() => requireMedia(TACOMA_FILM, markers)).not.toThrow();
    expect(() => requireRealSpeed(TACOMA_FILM, TACOMA_REAL_SPEED)).not.toThrow();
  });
});

describe('«Velocidad real (×2/3)» only on Elliott’s 16 fps shots (Review Focus 5)', () => {
  test('label and rate: 16/24 = 2/3', () => {
    expect(TACOMA_REAL_SPEED.label).toBe('Velocidad real (×2/3)');
    expect(TACOMA_REAL_SPEED.rate).toBe(REAL);
    expect(TACOMA_REAL_SPEED.rate).toBe(TACOMA_TORSION.cameraFps / TACOMA_TORSION.videoFps);
  });

  test('two ranges: 0:02–0:42,8 and 0:46,1 up to one file frame before the collapse', () => {
    expect(FILE_FRAME_S).toBeCloseTo(1001 / 30000, 12);
    expect(COLLAPSE_S).toBe(115.8);
    expect(TACOMA_REAL_SPEED.ranges).toEqual([
      [2, 42.8],
      [46.1, COLLAPSE_S - FILE_FRAME_S],
    ]);
  });

  test('the montage’s title cards play at 1×: «Disaster» and «The Crash»', () => {
    expect(at(0)).toBe(1);
    expect(at(1.9)).toBe(1);
    expect(at(42.8)).toBe(1);
    expect(at(45)).toBe(1);
  });

  test('every marker on a torsion shot lands at 2/3; the collapse marker at 1×', () => {
    const [collapse, ...torsion] = [...TACOMA_MARKER_TIMES].reverse();

    torsion.forEach((time) => expect(at(time), `${time} s`).toBe(REAL));
    expect(collapse).toBe(COLLAPSE_S);
    expect(at(collapse)).toBe(1);
  });

  test('a seek to the collapse that lands on the frame before it is already at 1×', () => {
    expect(at(COLLAPSE_S - FILE_FRAME_S)).toBe(1);
    expect(at(COLLAPSE_S - 1.5 * FILE_FRAME_S)).toBe(REAL);
    expect(at(130)).toBe(1);
  });
});
