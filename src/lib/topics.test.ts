import { describe, expect, test } from 'vitest';
import { TOPICS } from '../consigna';
import { neighbors, publishedCount, sortByNumber, toTopicSummary } from './topics';

const sorted = TOPICS.map(({ number }) => ({ number }));

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

describe('neighbors', () => {
  test('the first topic has no previous topic', () => {
    const { prev, next } = neighbors(sorted, 1);

    expect(prev).toBeUndefined();
    expect(next?.number).toBe(2);
  });

  test('the last topic has no next topic', () => {
    const { prev, next } = neighbors(sorted, 13);

    expect(prev?.number).toBe(12);
    expect(next).toBeUndefined();
  });

  test('a middle topic links to the topics on each side', () => {
    const { prev, next } = neighbors(sorted, 5);

    expect(prev?.number).toBe(4);
    expect(next?.number).toBe(6);
  });

  test('a number that is not in the list has no neighbors', () => {
    expect(neighbors(sorted, 99)).toEqual({});
  });
});

describe('publishedCount', () => {
  test('counts only topics with status publicado', () => {
    const items = [{ status: 'publicado' }, { status: 'proximamente' }, { status: 'publicado' }];

    expect(publishedCount(items)).toBe(2);
  });

  test('is zero for an empty list', () => {
    expect(publishedCount([])).toBe(0);
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
