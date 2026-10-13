import { describe, expect, test } from 'vitest';
import { TOPICS } from '../consigna';
import {
  isPublished,
  latestPublishedPhase,
  publishedNeighbors,
  sortByNumber,
  toTopicSummary,
} from './topics';

describe('sortByNumber', () => {
  test('orders items by ascending topic number', () => {
    // Arrange
    const shuffled = [{ number: 3 }, { number: 1 }, { number: 13 }, { number: 2 }];

    // Act
    const result = sortByNumber(shuffled);

    // Assert
    expect(result.map((item) => item.number)).toEqual([1, 2, 3, 13]);
  });

  test('returns a new array and leaves the input untouched', () => {
    const input = [{ number: 2 }, { number: 1 }];

    const result = sortByNumber(input);

    expect(result).not.toBe(input);
    expect(input.map((item) => item.number)).toEqual([2, 1]);
  });
});

describe('publishedNeighbors', () => {
  const topic = (number: number, status: 'publicado' | 'proximamente') => ({ number, status });
  // Topics 1 to 5 published, 6 to 13 upcoming: the Avance 1 state.
  const all = TOPICS.map(({ number }) => topic(number, number <= 5 ? 'publicado' : 'proximamente'));

  test('the first topic has no previous topic', () => {
    const { prev, next } = publishedNeighbors(all, 1);

    expect(prev).toBeUndefined();
    expect(next?.number).toBe(2);
  });

  test('a middle published topic links to the topics on each side', () => {
    const { prev, next } = publishedNeighbors(all, 3);

    expect(prev?.number).toBe(2);
    expect(next?.number).toBe(4);
  });

  test('the last published topic offers no next topic, even though topic 6 exists', () => {
    const { prev, next } = publishedNeighbors(all, 5);

    expect(prev?.number).toBe(4);
    expect(next).toBeUndefined();
  });

  test('an upcoming topic links back only to the last published topic', () => {
    for (const number of [6, 9, 13]) {
      const { prev, next } = publishedNeighbors(all, number);

      expect(prev?.number).toBe(5);
      expect(next).toBeUndefined();
    }
  });

  test('skips an upcoming topic between two published ones', () => {
    const gapped = [topic(1, 'publicado'), topic(2, 'proximamente'), topic(3, 'publicado')];

    const { prev, next } = publishedNeighbors(gapped, 1);

    expect(prev).toBeUndefined();
    expect(next?.number).toBe(3);
    expect(publishedNeighbors(gapped, 3).prev?.number).toBe(1);
  });

  test('accepts an unsorted list', () => {
    const shuffled = [topic(3, 'publicado'), topic(1, 'publicado'), topic(2, 'publicado')];

    const { prev, next } = publishedNeighbors(shuffled, 2);

    expect(prev?.number).toBe(1);
    expect(next?.number).toBe(3);
  });

  test('nothing published means no neighbors', () => {
    expect(publishedNeighbors([topic(1, 'proximamente'), topic(2, 'proximamente')], 1)).toEqual(
      {},
    );
  });
});

describe('toTopicSummary', () => {
  test('keeps the fields the navigation needs and takes the slug from the entry id', () => {
    const entry = {
      id: 'salto-personaje',
      data: {
        number: 2,
        phase: 1 as const,
        title: 'El salto del personaje: cómo los motores de juego falsean la gravedad',
        shortTitle: 'El salto del personaje',
        concept: 'Caída libre y tiro parabólico.',
        status: 'publicado' as const,
        resourceType: 'simulacion' as const,
        sources: [],
        related: [],
        classRefs: [],
        updated: new Date('2026-10-08'),
      },
    };

    expect(toTopicSummary(entry)).toEqual({
      slug: 'salto-personaje',
      number: 2,
      phase: 1,
      title: entry.data.title,
      shortTitle: 'El salto del personaje',
      status: 'publicado',
      resourceType: 'simulacion',
    });
  });
});

describe('latestPublishedPhase', () => {
  const topic = (number: number, phase: 1 | 2 | 3, status: 'publicado' | 'proximamente') => ({
    number,
    phase,
    status,
  });

  test('is the phase of the highest-numbered published topic', () => {
    const topics = [
      topic(1, 1, 'publicado'),
      topic(6, 2, 'publicado'),
      topic(10, 3, 'proximamente'),
    ];
    expect(latestPublishedPhase(topics)).toBe(2);
  });

  test('is the first phase while nothing is published', () => {
    expect(latestPublishedPhase([topic(1, 1, 'proximamente')])).toBe(1);
  });
});

describe('isPublished', () => {
  test('is true only for the publicado status', () => {
    expect(isPublished({ status: 'publicado' })).toBe(true);
    expect(isPublished({ status: 'proximamente' })).toBe(false);
  });
});
