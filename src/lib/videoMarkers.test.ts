import { describe, expect, test } from 'vitest';
import {
  activeMarkerIndex,
  formatTimestamp,
  formatVideoDate,
  requireMarkersInside,
} from './videoMarkers';

const marker = (time: number) => ({ time });

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

describe('requireMarkersInside', () => {
  test('accepts markers inside the medium, in ascending order', () => {
    expect(() => requireMarkersInside([marker(0), marker(138), marker(609.9)], 610)).not.toThrow();
  });

  test('rejects a marker outside [0, duration), naming the medium', () => {
    expect(() => requireMarkersInside([marker(610)], 610)).toThrow(
      new RangeError('La marca de 610 s está fuera del video (0 a 610 s)'),
    );
    expect(() => requireMarkersInside([marker(-1)], 4, 'audio')).toThrow(/fuera del audio/);
  });

  test('rejects markers out of order or repeated', () => {
    expect(() => requireMarkersInside([marker(255), marker(138)], 610)).toThrow(/orden/);
    expect(() => requireMarkersInside([marker(138), marker(138)], 610)).toThrow(/orden/);
  });
});
