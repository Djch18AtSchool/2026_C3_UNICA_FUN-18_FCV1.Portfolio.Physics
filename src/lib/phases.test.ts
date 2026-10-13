import { describe, expect, test } from 'vitest';
import type { Phase } from '../consigna';
import { groupByPhase, topicNumberLabel } from './phases';

const topic = (number: number, phase: Phase) => ({ number, phase });

/** The site today: Avance 1 written, Avance 2 and the final delivery still without topics. */
const AVANCE_1_ONLY = [topic(2, 1), topic(1, 1)];

describe('groupByPhase', () => {
  test('returns every phase in order with its label', () => {
    const groups = groupByPhase(AVANCE_1_ONLY);

    expect(groups.map(({ phase, label }) => [phase, label])).toEqual([
      [1, 'Avance 1'],
      [2, 'Avance 2'],
      [3, 'Entrega Final'],
    ]);
  });

  test('a phase with topics lists them by number and is not future', () => {
    const [first] = groupByPhase(AVANCE_1_ONLY);

    expect(first.isFuture).toBe(false);
    expect(first.topics.map((item) => item.number)).toEqual([1, 2]);
  });

  test('a phase without topics is future and carries none', () => {
    const [, second, third] = groupByPhase(AVANCE_1_ONLY);

    expect(second).toMatchObject({ isFuture: true, topics: [] });
    expect(third).toMatchObject({ isFuture: true, topics: [] });
  });

  test('derives the future phases from the topics, not from the phase number', () => {
    const groups = groupByPhase([topic(1, 1), topic(6, 2)]);

    expect(groups.map((group) => group.isFuture)).toEqual([false, false, true]);
  });

  test('every phase is future when there are no topics', () => {
    expect(groupByPhase([]).every((group) => group.isFuture)).toBe(true);
  });
});

describe('topicNumberLabel', () => {
  test('pads single digits with a zero', () => {
    expect(topicNumberLabel(1)).toBe('01');
  });

  test('keeps two-digit numbers as they are', () => {
    expect(topicNumberLabel(12)).toBe('12');
  });
});
