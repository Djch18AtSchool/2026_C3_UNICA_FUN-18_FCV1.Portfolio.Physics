import { describe, expect, test } from 'vitest';
import {
  rateAt,
  requireMedia,
  requireRealSpeed,
  type HostedSource,
  type MediaMarker,
  type RealSpeed,
  type YouTubeSource,
} from './media';

const YOUTUBE: YouTubeSource = {
  kind: 'youtube',
  id: 'CaPHUZapCTI',
  title: "A Game Developer Explains How PS5's DualSense Actually Works",
  channel: 'PlayStation Access',
  published: '2021-08-05',
  duration: 610,
};
const VIDEO: HostedSource = {
  kind: 'video',
  files: [
    { src: 'media/prueba/puente.webm', type: 'video/webm' },
    { src: 'media/prueba/puente.mp4', type: 'video/mp4' },
  ],
  title: 'Puente',
  credit: 'Autor, 1940',
  duration: 150,
  poster: 'media/prueba/puente.jpg',
  width: 640,
  height: 480,
};
const AUDIO: HostedSource = {
  kind: 'audio',
  files: [{ src: 'media/prueba/nota.mp3', type: 'audio/mpeg' }],
  title: 'Nota',
  credit: 'Autor',
  duration: 4,
};
const REAL_SPEED: RealSpeed = { label: 'Velocidad real (×2/3)', rate: 2 / 3, ranges: [[2, 9.6]] };

const marker = (time: number): MediaMarker => ({ time, title: 't', analysis: 'a' });
const withFile = (src: string, type: string): HostedSource => ({
  ...VIDEO,
  files: [{ src, type }],
});

describe('requireMedia, YouTube', () => {
  test('accepts a valid video with markers inside it, in order', () => {
    expect(() => requireMedia(YOUTUBE, [marker(138), marker(255)])).not.toThrow();
  });

  test('rejects an invalid id, a non-positive duration or a date that is not a day', () => {
    expect(() => requireMedia({ ...YOUTUBE, id: 'x' }, [])).toThrow(RangeError);
    expect(() => requireMedia({ ...YOUTUBE, duration: 0 }, [])).toThrow(/duración/);
    expect(() => requireMedia({ ...YOUTUBE, published: '5/8/2021' }, [])).toThrow(/fecha/);
    expect(() => requireMedia({ ...YOUTUBE, published: '2021-13-45' }, [])).toThrow(/fecha/);
    expect(() => requireMedia({ ...YOUTUBE, published: '2021-02-30' }, [])).toThrow(/fecha/);
  });

  test('rejects markers outside the video or out of order', () => {
    expect(() => requireMedia(YOUTUBE, [marker(611)])).toThrow(/fuera del video/);
    expect(() => requireMedia(YOUTUBE, [marker(-1)])).toThrow(/fuera del video/);
    expect(() => requireMedia(YOUTUBE, [marker(255), marker(138)])).toThrow(/orden/);
    expect(() => requireMedia(YOUTUBE, [marker(138), marker(138)])).toThrow(/orden/);
  });
});

describe('requireMedia, hosted video or audio', () => {
  test('accepts a video and an audio with markers inside them, in order', () => {
    expect(() => requireMedia(VIDEO, [marker(0), marker(14.3), marker(149.9)])).not.toThrow();
    expect(() => requireMedia(AUDIO, [marker(0.1), marker(2)])).not.toThrow();
  });

  test('rejects markers outside [0, duration) and out of order, with the same messages', () => {
    expect(() => requireMedia(VIDEO, [marker(150)])).toThrow(
      new RangeError('La marca de 150 s está fuera del video (0 a 150 s)'),
    );
    expect(() => requireMedia(VIDEO, [marker(-1)])).toThrow(/fuera del video/);
    expect(() => requireMedia(VIDEO, [marker(9), marker(2)])).toThrow(
      new RangeError('Las marcas deben ir en orden creciente: 2 s tras 9 s'),
    );
    expect(() => requireMedia(AUDIO, [marker(4)])).toThrow(
      new RangeError('La marca de 4 s está fuera del audio (0 a 4 s)'),
    );
  });

  test('rejects a non-positive duration', () => {
    expect(() => requireMedia({ ...AUDIO, duration: 0 }, [])).toThrow(
      new RangeError('La duración del audio debe ser positiva, no 0 s'),
    );
    expect(() => requireMedia({ ...VIDEO, duration: Number.NaN }, [])).toThrow(/duración/);
  });

  test('rejects an empty list of files', () => {
    expect(() => requireMedia({ ...VIDEO, files: [] }, [])).toThrow(RangeError);
    expect(() => requireMedia({ ...AUDIO, files: [] }, [])).toThrow(/al menos un archivo/);
  });

  test('rejects a type other than video/webm, video/mp4 or audio/mpeg, and one of the other kind', () => {
    expect(() => requireMedia(withFile('media/prueba/puente.ogv', 'video/ogg'), [])).toThrow(
      /«video\/ogg»/,
    );
    expect(() => requireMedia(withFile('media/prueba/nota.mp3', 'audio/mpeg'), [])).toThrow(
      /un video admite video\/webm, video\/mp4/,
    );
    expect(() =>
      requireMedia({ ...AUDIO, files: [{ src: 'media/prueba/nota.mp4', type: 'video/mp4' }] }, []),
    ).toThrow(/un audio admite audio\/mpeg/);
    // A key every object inherits is not an accepted type either.
    expect(() => requireMedia(withFile('media/prueba/puente.webm', 'toString'), [])).toThrow(
      /«toString»/,
    );
  });

  test('rejects a file or a poster that is not a file under public/media/', () => {
    expect(() => requireMedia(withFile('/media/prueba/puente.webm', 'video/webm'), [])).toThrow(
      /public\/media/,
    );
    expect(() =>
      requireMedia(withFile('https://upload.wikimedia.org/puente.webm', 'video/webm'), []),
    ).toThrow(/public\/media/);
    expect(() => requireMedia(withFile('media/../secreto.webm', 'video/webm'), [])).toThrow(
      /public\/media/,
    );
    expect(() => requireMedia({ ...VIDEO, poster: 'puente.jpg' }, [])).toThrow(/public\/media/);
    // Without an extension withBase would turn it into a folder ("…/puente/").
    expect(() => requireMedia(withFile('media/prueba/puente', 'video/webm'), [])).toThrow(
      /public\/media/,
    );
    expect(() => requireMedia(withFile('media/prueba/', 'video/webm'), [])).toThrow(
      /public\/media/,
    );
  });
});

describe('rateAt', () => {
  test('is the real-speed rate inside a declared range while the toggle is on', () => {
    expect(rateAt(5, REAL_SPEED, true)).toBe(2 / 3);
  });

  test('is 1 outside every range, with the toggle off and without a real speed', () => {
    expect(rateAt(120, REAL_SPEED, true)).toBe(1);
    expect(rateAt(5, REAL_SPEED, false)).toBe(1);
    expect(rateAt(5, undefined, true)).toBe(1);
  });

  test('a range includes its start and excludes its end, where the next shot begins at 1×', () => {
    expect(rateAt(1.99, REAL_SPEED, true)).toBe(1);
    expect(rateAt(2, REAL_SPEED, true)).toBe(2 / 3);
    expect(rateAt(9.6, REAL_SPEED, true)).toBe(1);
  });

  test('with several ranges, only a time inside one of them slows down', () => {
    const shots: RealSpeed = {
      ...REAL_SPEED,
      ranges: [
        [2, 42.8],
        [46.1, 115.8],
      ],
    };

    expect(rateAt(44, shots, true)).toBe(1);
    expect(rateAt(50, shots, true)).toBe(2 / 3);
    expect(rateAt(115.8, shots, true)).toBe(1);
  });
});

describe('requireRealSpeed', () => {
  test('accepts ascending ranges inside a hosted medium, and no real speed at all', () => {
    const shots: RealSpeed = {
      ...REAL_SPEED,
      ranges: [
        [0, 42.8],
        [46.1, 150],
      ],
    };

    expect(() => requireRealSpeed(VIDEO, shots)).not.toThrow();
    expect(() => requireRealSpeed(VIDEO, undefined)).not.toThrow();
    expect(() => requireRealSpeed(YOUTUBE, undefined)).not.toThrow();
  });

  test('rejects a real speed on a YouTube video, whose rate the page does not control', () => {
    expect(() => requireRealSpeed(YOUTUBE, REAL_SPEED)).toThrow(/alojado/);
  });

  test('rejects an empty label or a rate that is not positive and finite', () => {
    expect(() => requireRealSpeed(VIDEO, { ...REAL_SPEED, label: ' ' })).toThrow(/nombre/);
    expect(() => requireRealSpeed(VIDEO, { ...REAL_SPEED, rate: 0 })).toThrow(/velocidad/);
    expect(() => requireRealSpeed(VIDEO, { ...REAL_SPEED, rate: Infinity })).toThrow(/velocidad/);
  });

  test('rejects no ranges, or one that is empty, reversed, outside the medium or overlapping', () => {
    const ranges = (...list: [number, number][]): RealSpeed => ({ ...REAL_SPEED, ranges: list });

    expect(() => requireRealSpeed(VIDEO, ranges())).toThrow(/tramo/);
    expect(() => requireRealSpeed(VIDEO, ranges([5, 5]))).toThrow(/tramo de 5 a 5 s/);
    expect(() => requireRealSpeed(VIDEO, ranges([9, 2]))).toThrow(/tramo de 9 a 2 s/);
    expect(() => requireRealSpeed(VIDEO, ranges([-1, 2]))).toThrow(/tramo/);
    expect(() => requireRealSpeed(VIDEO, ranges([100, 151]))).toThrow(/tramo/);
    expect(() => requireRealSpeed(VIDEO, ranges([2, 50], [40, 60]))).toThrow(/orden/);
  });
});
