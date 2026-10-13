import { describe, expect, test } from 'vitest';
import { TOPICS } from '../consigna';
import { latestPhase, neighbors, sortByNumber, toTopicSummary } from './topics';

describe('sortByNumber', () => {
  test('orders items by ascending topic number', () => {
    // Arrange
    const shuffled = [{ number: 3 }, { number: 1 }, { number: 12 }, { number: 2 }];

    // Act
    const result = sortByNumber(shuffled);

    // Assert
    expect(result.map((item) => item.number)).toEqual([1, 2, 3, 12]);
  });

  test('returns a new array and leaves the input untouched', () => {
    const input = [{ number: 2 }, { number: 1 }];

    const result = sortByNumber(input);

    expect(result).not.toBe(input);
    expect(input.map((item) => item.number)).toEqual([2, 1]);
  });
});

describe('neighbors', () => {
  const all = TOPICS.map(({ number }) => ({ number }));

  test('the first topic has no previous topic', () => {
    const { prev, next } = neighbors(all, 1);

    expect(prev).toBeUndefined();
    expect(next?.number).toBe(2);
  });

  test('a middle topic links to the topics on each side', () => {
    const { prev, next } = neighbors(all, 3);

    expect(prev?.number).toBe(2);
    expect(next?.number).toBe(4);
  });

  test('the last topic offers no next topic', () => {
    const last = all.at(-1)!.number;

    const { prev, next } = neighbors(all, last);

    expect(prev?.number).toBe(last - 1);
    expect(next).toBeUndefined();
  });

  test('skips a gap in the numbering', () => {
    const gapped = [{ number: 1 }, { number: 3 }];

    expect(neighbors(gapped, 1).next?.number).toBe(3);
    expect(neighbors(gapped, 3).prev?.number).toBe(1);
  });

  test('accepts an unsorted list', () => {
    const { prev, next } = neighbors([{ number: 3 }, { number: 1 }, { number: 2 }], 2);

    expect(prev?.number).toBe(1);
    expect(next?.number).toBe(3);
  });

  test('a single topic has no neighbors', () => {
    expect(neighbors([{ number: 1 }], 1)).toEqual({});
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
        resourceType: 'simulacion' as const,
        useCase: { product: 'Un juego de plataformas', industry: 'Videojuegos' },
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
      resourceType: 'simulacion',
    });
  });
});

describe('latestPhase', () => {
  test('is the phase of the highest-numbered topic', () => {
    const topics = [
      { number: 6, phase: 2 as const },
      { number: 1, phase: 1 as const },
    ];

    expect(latestPhase(topics)).toBe(2);
  });

  test('is the first phase when there are no topics', () => {
    expect(latestPhase([])).toBe(1);
  });
});
