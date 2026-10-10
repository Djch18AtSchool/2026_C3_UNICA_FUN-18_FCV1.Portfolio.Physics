import { describe, expect, test } from 'vitest';
import type { TopicSummary } from './topics';
import { buildSearchIndex, filterIndex, normalize, type SearchEntry } from './searchIndex';

const TOPICS: TopicSummary[] = [
  {
    slug: 'salto-personaje',
    number: 2,
    phase: 1,
    title: 'El salto del personaje: cómo los motores de juego falsean la gravedad',
    shortTitle: 'Salto del personaje',
    status: 'publicado',
  },
  {
    slug: 'dron-reparto',
    number: 1,
    phase: 1,
    title: 'Rastreo y navegación de un dron de reparto',
    shortTitle: 'Dron de reparto',
    status: 'publicado',
  },
  {
    slug: 'frenado-regenerativo',
    number: 6,
    phase: 2,
    title: 'Frenado regenerativo en un vehículo eléctrico',
    shortTitle: 'Frenado regenerativo',
    status: 'proximamente',
  },
];

const HEADINGS = {
  'salto-personaje': [
    { depth: 2, text: 'Paso 3 · Qué falta: tiempo al ápice', slug: 'paso-3' },
    { depth: 3, text: 'El ápice en la ecuación', slug: 'el-apice-en-la-ecuacion' },
    { depth: 2, text: 'Conexiones', slug: 'conexiones' },
  ],
  'dron-reparto': [{ depth: 2, text: 'Recurso de apoyo#', slug: 'recurso-de-apoyo' }],
  'frenado-regenerativo': [{ depth: 2, text: 'Energía al frenar', slug: 'energia-al-frenar' }],
};

function index(): SearchEntry[] {
  return buildSearchIndex(TOPICS, HEADINGS);
}

describe('normalize', () => {
  test('lowercases and strips accents', () => {
    expect(normalize('Ápice ÑANDÚ')).toBe('apice nandu');
  });
});

describe('buildSearchIndex', () => {
  test('keeps only depth-2 headings, as text and anchor', () => {
    const salto = index().find((entry) => entry.slug === 'salto-personaje');
    expect(salto?.headings).toEqual([
      { text: 'Paso 3 · Qué falta: tiempo al ápice', anchor: 'paso-3' },
      { text: 'Conexiones', anchor: 'conexiones' },
    ]);
  });

  test('upcoming topics contribute only their title', () => {
    const frenado = index().find((entry) => entry.slug === 'frenado-regenerativo');
    expect(frenado).toEqual({
      slug: 'frenado-regenerativo',
      number: 6,
      phase: 2,
      title: 'Frenado regenerativo en un vehículo eléctrico',
      shortTitle: 'Frenado regenerativo',
      status: 'proximamente',
      headings: [],
    });
  });

  test('strips a trailing anchor mark from the heading text', () => {
    const dron = index().find((entry) => entry.slug === 'dron-reparto');
    expect(dron?.headings).toEqual([{ text: 'Recurso de apoyo', anchor: 'recurso-de-apoyo' }]);
  });

  test('a published topic without collected headings gets an empty list', () => {
    const [entry] = buildSearchIndex([TOPICS[1]], {});
    expect(entry.headings).toEqual([]);
  });

  test('sorts the entries by number', () => {
    expect(index().map((entry) => entry.number)).toEqual([1, 2, 6]);
  });
});

describe('filterIndex', () => {
  test('finds an accented heading from an unaccented query', () => {
    const results = filterIndex(index(), 'apice');
    expect(results).toHaveLength(1);
    expect(results[0].entry.slug).toBe('salto-personaje');
    expect(results[0].headings).toEqual([
      { text: 'Paso 3 · Qué falta: tiempo al ápice', anchor: 'paso-3' },
    ]);
  });

  test('finds the same heading from the accented query', () => {
    expect(filterIndex(index(), 'ápice')[0].headings[0].anchor).toBe('paso-3');
  });

  test('an empty query returns every entry without headings, by number', () => {
    const results = filterIndex(index(), '');
    expect(results.map((result) => result.entry.number)).toEqual([1, 2, 6]);
    expect(results.every((result) => result.headings.length === 0)).toBe(true);
  });

  test('a blank query behaves like an empty one', () => {
    expect(filterIndex(index(), '   ')).toHaveLength(3);
  });

  test('matches titles and short titles case-insensitively, without headings', () => {
    const results = filterIndex(index(), 'FRENADO');
    expect(results).toEqual([{ entry: index()[2], headings: [] }]);
    expect(filterIndex(index(), 'dron de reparto').map((r) => r.entry.slug)).toEqual([
      'dron-reparto',
    ]);
  });

  test('returns topics and sections ordered by number', () => {
    const results = filterIndex(index(), 'e');
    expect(results.map((result) => result.entry.number)).toEqual([1, 2, 6]);
  });

  test('returns nothing when nothing matches', () => {
    expect(filterIndex(index(), 'tacoma')).toEqual([]);
  });
});
