import { describe, expect, test } from 'vitest';
import {
  activeMarkerIndex,
  formatTimestamp,
  formatVideoDate,
  requireEmbeddedVideo,
  type EmbeddedVideo,
  type VideoMarker,
} from './videoMarkers';

const VIDEO: EmbeddedVideo = {
  id: 'CaPHUZapCTI',
  title: "A Game Developer Explains How PS5's DualSense Actually Works",
  channel: 'PlayStation Access',
  published: '2021-08-05',
  duration: 610,
  language: 'en inglés, con subtítulos automáticos',
};

const marker = (time: number): VideoMarker => ({ time, title: 't', analysis: 'a' });

describe('formatTimestamp', () => {
  test('writes minutes and two-digit seconds', () => {
    expect(formatTimestamp(0)).toBe('0:00');
    expect(formatTimestamp(18)).toBe('0:18');
    expect(formatTimestamp(255)).toBe('4:15');
    expect(formatTimestamp(610)).toBe('10:10');
  });

  test('drops the fraction of a second', () => {
    expect(formatTimestamp(138.9)).toBe('2:18');
  });
});

describe('formatVideoDate', () => {
  test('writes a calendar day in Spanish, without shifting it by the time zone', () => {
    expect(formatVideoDate('2021-08-05')).toBe('5 de agosto de 2021');
  });
});

describe('activeMarkerIndex', () => {
  const times = [138, 198, 242, 255];

  test('is −1 before the first marker', () => {
    expect(activeMarkerIndex(times, 0)).toBe(-1);
    expect(activeMarkerIndex(times, 137.5)).toBe(-1);
  });

  test('is the last marker the playback has reached', () => {
    expect(activeMarkerIndex(times, 138)).toBe(0);
    expect(activeMarkerIndex(times, 241.9)).toBe(1);
    expect(activeMarkerIndex(times, 600)).toBe(3);
  });

  test('a seek that lands a few milliseconds early still counts as the marker', () => {
    expect(activeMarkerIndex(times, 254.97)).toBe(3);
  });
});

describe('requireEmbeddedVideo', () => {
  test('returns a valid video with markers inside it, in order', () => {
    const markers = [marker(138), marker(255)];

    expect(requireEmbeddedVideo(VIDEO, markers)).toBe(VIDEO);
  });

  test('rejects an invalid id, a non-positive duration or a date that is not a day', () => {
    expect(() => requireEmbeddedVideo({ ...VIDEO, id: 'x' }, [])).toThrow(RangeError);
    expect(() => requireEmbeddedVideo({ ...VIDEO, duration: 0 }, [])).toThrow(/duración/);
    expect(() => requireEmbeddedVideo({ ...VIDEO, published: '5/8/2021' }, [])).toThrow(/fecha/);
  });

  test('rejects markers outside the video or out of order', () => {
    expect(() => requireEmbeddedVideo(VIDEO, [marker(611)])).toThrow(/fuera del video/);
    expect(() => requireEmbeddedVideo(VIDEO, [marker(-1)])).toThrow(/fuera del video/);
    expect(() => requireEmbeddedVideo(VIDEO, [marker(255), marker(138)])).toThrow(/orden/);
    expect(() => requireEmbeddedVideo(VIDEO, [marker(138), marker(138)])).toThrow(/orden/);
  });
});
