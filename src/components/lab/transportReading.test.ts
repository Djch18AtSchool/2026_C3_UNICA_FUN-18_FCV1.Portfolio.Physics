import { describe, expect, test } from 'vitest';
import { normalizeMarkers } from './transportMarkers';
import { readingFormatter, transportTexts, widestReading } from './transportReading';

const NNBSP = ' ';
const STRETCH = 26;
const STOPS = normalizeMarkers(
  [
    { t: 5, label: 'Detención' },
    { t: 21, label: 'Detención' },
  ],
  STRETCH,
);

describe('readingFormatter', () => {
  test('without an origin or a format, it is the transport’s own «t = …» in the run’s unit', () => {
    const textOf = readingFormatter({ duration: STRETCH, timeUnit: 's' });

    expect(textOf(13)).toBe(`t = 13,00${NNBSP}s`);
  });

  test('shifts by the origin; an origin that is not finite shifts nothing', () => {
    expect(readingFormatter({ duration: STRETCH, timeUnit: 's', timeOrigin: 376 })(21)).toBe(
      `t = 397,00${NNBSP}s`,
    );
    for (const timeOrigin of [Number.NaN, Number.NEGATIVE_INFINITY]) {
      expect(readingFormatter({ duration: STRETCH, timeUnit: 's', timeOrigin })(21)).toBe(
        `t = 21,00${NNBSP}s`,
      );
    }
  });

  test('a format replaces the text and receives the shifted time', () => {
    const seen: number[] = [];
    const textOf = readingFormatter({
      duration: STRETCH,
      timeOrigin: 100,
      formatTime: (time) => {
        seen.push(time);
        return `t = ${time / 10} h`;
      },
    });

    expect(textOf(0)).toBe('t = 10 h');
    expect(textOf(STRETCH)).toBe('t = 12.6 h');
    expect(seen).toEqual([100, 126]);
  });

  test('a format that gives back no text falls back to the transport’s own', () => {
    const textOf = readingFormatter({ duration: STRETCH, timeUnit: 's', formatTime: () => '' });

    expect(textOf(13)).toBe(`t = 13,00${NNBSP}s`);
  });
});

describe('widestReading', () => {
  test('is the longest text over the run: with a negative origin, the start', () => {
    const textOf = readingFormatter({ duration: STRETCH, timeUnit: 's', timeOrigin: -100 });

    expect(widestReading(textOf, STRETCH)).toBe(`t = −100,00${NNBSP}s`);
  });

  test('sees a longer text in the middle of the run, not only at its ends', () => {
    const textOf = (t: number) => (t > 10 && t < 16 ? 'a much longer reading' : 'short');

    expect(widestReading(textOf, STRETCH)).toBe('a much longer reading');
  });
});

describe('transportTexts', () => {
  const textOf = readingFormatter({ duration: STRETCH, timeUnit: 's', timeOrigin: 376 });

  test('on an event: the reading, the event in aria-valuetext, no «next»', () => {
    const texts = transportTexts({ events: STOPS, t: 21, duration: STRETCH, textOf });

    expect(texts.timeText).toBe(`t = 397,00${NNBSP}s`);
    expect(texts.event).toBe('Detención 2 de 2');
    expect(texts.valueText).toBe(`t = 397,00${NNBSP}s · Detención 2 de 2`);
    expect(texts.next).toBeUndefined();
  });

  test('between events: the next one, named with its reading', () => {
    const texts = transportTexts({ events: STOPS, t: 8, duration: STRETCH, textOf });

    expect(texts.event).toBeUndefined();
    expect(texts.valueText).toBe(`t = 384,00${NNBSP}s`);
    expect(texts.next).toBe(`Siguiente: Detención 2 de 2 · t = 397,00${NNBSP}s`);
  });

  test('after the last event there is no «next»', () => {
    expect(
      transportTexts({ events: STOPS, t: 25, duration: STRETCH, textOf }).next,
    ).toBeUndefined();
  });
});
