import { describe, expect, test, vi } from 'vitest';
import { loadClosingTopics, pairColor } from './closingData';

const entry = (id: string, number: number, phase: number, related: string[]) => ({
  id,
  data: {
    number,
    phase,
    title: `Título ${number}`,
    shortTitle: `Tema corto ${number}`,
    resourceType: 'diagrama',
    related,
  },
});

vi.mock('astro:content', () => ({
  getCollection: vi.fn(async () => [
    entry('asistencia-gravitatoria', 9, 2, ['coeficiente-restitucion', 'no-registrado']),
    entry('coeficiente-restitucion', 7, 2, ['asistencia-gravitatoria']),
  ]),
}));

describe('loadClosingTopics', () => {
  test('summarises the collection by number and resolves related to numbers', async () => {
    const { topics, related } = await loadClosingTopics();

    expect(topics.map(({ number, slug }) => [number, slug])).toEqual([
      [7, 'coeficiente-restitucion'],
      [9, 'asistencia-gravitatoria'],
    ]);
    expect(related.get(9)).toEqual([7]);
    expect(related.get(7)).toEqual([9]);
  });
});

describe('pairColor', () => {
  test('gives each principle its token', () => {
    expect(pairColor('Momento lineal')).toBe('var(--chart-1)');
    expect(pairColor('Energía con disipación')).toBe('var(--chart-2)');
    expect(pairColor('Frecuencia natural')).toBe('var(--chart-3)');
  });

  test('refuses a principle without a colour', () => {
    expect(() => pairColor('Otro principio')).toThrow('no tiene color');
  });
});
