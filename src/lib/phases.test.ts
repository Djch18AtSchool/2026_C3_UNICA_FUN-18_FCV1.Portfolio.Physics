import { describe, expect, test } from 'vitest';
import type { Phase } from '../consigna';
import { defaultOpenPhase, groupByPhase, topicNumberLabel } from './phases';

type Status = 'publicado' | 'proximamente';

const topic = (number: number, phase: Phase, status: Status) => ({ number, phase, status });

/** The site today: Avance 1 published, Avance 2 and the final delivery still to come. */
const AVANCE_1_ONLY = [
  topic(2, 1, 'publicado'),
  topic(1, 1, 'publicado'),
  topic(6, 2, 'proximamente'),
  topic(7, 2, 'proximamente'),
  topic(10, 3, 'proximamente'),
];

describe('groupByPhase', () => {
  test('returns every phase in order with its label', () => {
    const groups = groupByPhase(AVANCE_1_ONLY);

    expect(groups.map(({ phase, label }) => [phase, label])).toEqual([
      [1, 'Avance 1'],
      [2, 'Avance 2'],
      [3, 'Entrega Final'],
    ]);
  });

  test('a phase with published topics lists them by number and is not future', () => {
    const [first] = groupByPhase(AVANCE_1_ONLY);

    expect(first.isFuture).toBe(false);
    expect(first.topics.map((item) => item.number)).toEqual([1, 2]);
  });

  test('a phase without published topics is future and carries no topics', () => {
    const [, second, third] = groupByPhase(AVANCE_1_ONLY);

    expect(second).toMatchObject({ isFuture: true, topics: [] });
    expect(third).toMatchObject({ isFuture: true, topics: [] });
  });

  test('derives the future phases from the status, not from the phase number', () => {
    const groups = groupByPhase([
      topic(1, 1, 'publicado'),
      topic(6, 2, 'publicado'),
      topic(10, 3, 'proximamente'),
    ]);

    expect(groups.map((group) => group.isFuture)).toEqual([false, false, true]);
  });

  test('a published phase leaves out its topics that are still upcoming', () => {
    const [, second] = groupByPhase([topic(6, 2, 'publicado'), topic(7, 2, 'proximamente')]);

    expect(second.topics.map((item) => item.number)).toEqual([6]);
  });

  test('every phase is future while nothing is published', () => {
    const groups = groupByPhase([topic(1, 1, 'proximamente')]);

    expect(groups.every((group) => group.isFuture)).toBe(true);
  });
});

describe('defaultOpenPhase', () => {
  test('is the current phase when it has published topics', () => {
    const topics = [...AVANCE_1_ONLY, topic(8, 2, 'publicado')];

    expect(defaultOpenPhase(topics, 2)).toBe(2);
  });

  test('on a future phase, falls back to the delivery in progress', () => {
    expect(defaultOpenPhase(AVANCE_1_ONLY, 2)).toBe(1);
    expect(defaultOpenPhase(AVANCE_1_ONLY, 3)).toBe(1);
  });
});

describe('topicNumberLabel', () => {
  test('pads single digits with a zero', () => {
    expect(topicNumberLabel(1)).toBe('01');
  });

  test('keeps two-digit numbers as they are', () => {
    expect(topicNumberLabel(13)).toBe('13');
  });
});
