import { describe, expect, test } from 'vitest';
import { resolveRelated } from './related';

describe('resolveRelated', () => {
  test('keeps the frontmatter order and carries the consigna number and title', () => {
    // Arrange
    const slugs = ['llantas-f1', 'dron-reparto'];

    // Act
    const related = resolveRelated(slugs);

    // Assert
    expect(related.map(({ number, title }) => [number, title])).toEqual([
      [4, 'Llantas de Fórmula 1: la ventana de temperatura y el agarre'],
      [1, 'Rastreo y navegación de un dron de reparto'],
    ]);
  });

  test('throws on a slug the consigna does not list', () => {
    expect(() => resolveRelated(['no-existe'])).toThrow(
      'Connections: el tema "no-existe" no existe en la consigna',
    );
  });
});
