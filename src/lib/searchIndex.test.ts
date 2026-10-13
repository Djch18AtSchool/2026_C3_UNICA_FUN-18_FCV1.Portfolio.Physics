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
    resourceType: 'simulacion',
  },
  {
    slug: 'dron-reparto',
    number: 1,
    phase: 1,
    title: 'Rastreo y navegación de un dron de reparto',
    shortTitle: 'Dron de reparto',
    resourceType: 'visualizacion',
  },
  {
    slug: 'gravedad-artificial',
    number: 3,
    phase: 1,
    title: 'Gravedad artificial por rotación en hábitats espaciales',
    shortTitle: 'Gravedad artificial',
    resourceType: 'diagrama',
  },
];

const HEADINGS = {
  'salto-personaje': [
    { depth: 2, text: 'Paso 3 · Qué falta: tiempo al ápice', slug: 'paso-3' },
    { depth: 3, text: 'El ápice en la ecuación', slug: 'el-apice-en-la-ecuacion' },
    { depth: 2, text: 'Conexiones', slug: 'conexiones' },
  ],
  'dron-reparto': [{ depth: 2, text: 'Recurso de apoyo#', slug: 'recurso-de-apoyo' }],
  'gravedad-artificial': [{ depth: 2, text: 'Peso aparente', slug: 'peso-aparente' }],
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

  test('every topic contributes its title and its section headings', () => {
    const gravedad = index().find((entry) => entry.slug === 'gravedad-artificial');
    expect(gravedad).toEqual({
      slug: 'gravedad-artificial',
      number: 3,
      phase: 1,
      title: 'Gravedad artificial por rotación en hábitats espaciales',
      shortTitle: 'Gravedad artificial',
      headings: [{ text: 'Peso aparente', anchor: 'peso-aparente' }],
    });
  });

  test('strips a trailing anchor mark from the heading text', () => {
    const dron = index().find((entry) => entry.slug === 'dron-reparto');
    expect(dron?.headings).toEqual([{ text: 'Recurso de apoyo', anchor: 'recurso-de-apoyo' }]);
  });

  test('a topic without collected headings gets an empty list', () => {
    const [entry] = buildSearchIndex([TOPICS[1]], {});
    expect(entry.headings).toEqual([]);
  });

  test('sorts the entries by number', () => {
    expect(index().map((entry) => entry.number)).toEqual([1, 2, 3]);
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
    expect(results.map((result) => result.entry.number)).toEqual([1, 2, 3]);
    expect(results.every((result) => result.headings.length === 0)).toBe(true);
  });

  test('a blank query behaves like an empty one', () => {
    expect(filterIndex(index(), '   ')).toHaveLength(3);
  });

  test('matches titles and short titles case-insensitively, without headings', () => {
    const results = filterIndex(index(), 'GRAVEDAD ARTIFICIAL');
    expect(results).toEqual([{ entry: index()[2], headings: [] }]);
    expect(filterIndex(index(), 'dron de reparto').map((r) => r.entry.slug)).toEqual([
      'dron-reparto',
    ]);
  });

  test('returns topics and sections ordered by number', () => {
    const results = filterIndex(index(), 'e');
    expect(results.map((result) => result.entry.number)).toEqual([1, 2, 3]);
  });

  test('returns nothing when nothing matches', () => {
    expect(filterIndex(index(), 'ornitorrinco')).toEqual([]);
  });
});
