import { describe, expect, test } from 'vitest';
import { resolveRelated } from './related';

describe('resolveRelated', () => {
  const published = new Set(['dron-reparto', 'llantas-f1']);

  test('keeps the frontmatter order and marks which related topics are published', () => {
    // Arrange
    const slugs = ['llantas-f1', 'frenado-regenerativo', 'dron-reparto'];

    // Act
    const related = resolveRelated(slugs, published);

    // Assert
    expect(related.map(({ number, isPublished }) => [number, isPublished])).toEqual([
      [4, true],
      [6, false],
      [1, true],
    ]);
  });

  test('carries the consigna title and phase, never anything about a future topic beyond them', () => {
    const [upcoming] = resolveRelated(['spring-animations'], published);

    expect(upcoming).toEqual({
      number: 10,
      slug: 'spring-animations',
      title: 'Spring animations en interfaces',
      phase: 3,
      isPublished: false,
    });
  });

  test('throws on a slug the consigna does not list', () => {
    expect(() => resolveRelated(['no-existe'], published)).toThrow(
      'Connections: el tema "no-existe" no existe en la consigna',
    );
  });
});
