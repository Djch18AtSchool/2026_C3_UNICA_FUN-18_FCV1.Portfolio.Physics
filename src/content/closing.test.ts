/**
 * «Qué aprendí» (spec §5): the closing section's text in src/content/closing/que-aprendi.mdx.
 * The consigna asks for one paragraph per pair and half a page for the own application; these
 * tests hold the word limits, the headings, the sources and the numbers the page computes.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import { describe, expect, test } from 'vitest';
import { topicByNumber } from '../consigna';
import { CLOSING_PAIRS, CLOSING_TITLE } from '../lib/closing';
import { formatNumber } from '../lib/format';
import { looseSymbols, texVariables } from '../lib/looseSymbols';
import { splitInlineMath } from '../lib/inlineSegments';
import { G_EARTH } from '../lib/physics/constants';
import { freeFallSpeed, freeFallTime, jumpWeightlessTime } from '../lib/physics/freeFall';
import { readingStats } from '../lib/readingTime';
import { sourceSchema } from './topicSchema';

const FILE = join(process.cwd(), 'src', 'content', 'closing', 'que-aprendi.mdx');
const { data, content } = matter(readFileSync(FILE, 'utf8'));

/** «un párrafo cada par» (consigna): the pair's paragraph, its equation's legend included. */
const MAX_PAIR_WORDS = 150;
/** «media página» (consigna): about half a page of the site's body text. */
const MAX_APPLICATION_WORDS = 350;
const MAP_HEADING = '### El mapa de conexiones';
const APPLICATION_HEADING = '### La aplicación propia: detección de caídas';
const SOURCES_TAG = '<Sources';
/** The wrist's height and the jump the application assumes (m), as the page declares them. */
const WRIST_HEIGHT = 0.8;
const JUMP_HEIGHT = 0.3;

const PAIR_BLOCK = /<ClosingPair index=\{(\d+)\}>([\s\S]*?)<\/ClosingPair>/g;
const CITE_ID = /<Cite id="([^"]+)"/g;
const LATEX_ATTRIBUTE = /\blatex="([^"]*)"/g;
const SYMBOL_KEY = /\bsymbol:\s*'((?:[^'\\]|\\.)*)'/g;
const MEANING_KEY = /\bmeaning:\s*'((?:[^'\\]|\\.)*)'/g;

const words = (text: string) => {
  const { proseWords, propWords } = readingStats(text);
  return proseWords + propWords;
};
const pairBlocks = [...content.matchAll(PAIR_BLOCK)].map(([, index, body]) => ({
  index: Number(index),
  body,
}));
const application = content.slice(
  content.indexOf(APPLICATION_HEADING) + APPLICATION_HEADING.length,
  content.indexOf(SOURCES_TAG),
);
/** A number as the page states it: «0,49» in prose, «0{,}49» inside a formula. */
const stated = (value: number) => {
  const text = formatNumber(value, { precision: 2 });
  return [text, text.replace(',', '{,}')];
};

describe('«Qué aprendí»', () => {
  test('lleva su título y sus dos partes, en orden', () => {
    expect(CLOSING_TITLE).toBe('Qué aprendí');
    const map = content.indexOf(MAP_HEADING);
    const own = content.indexOf(APPLICATION_HEADING);

    expect(map).toBeGreaterThanOrEqual(0);
    expect(own).toBeGreaterThan(map);
    expect(content.indexOf(SOURCES_TAG)).toBeGreaterThan(own);
  });

  test('explica cada par en un solo bloque, en el orden del mapa', () => {
    expect(pairBlocks.map(({ index }) => index)).toEqual(CLOSING_PAIRS.map((_, index) => index));
    for (const { body } of pairBlocks) {
      expect(body.match(/<Equation\b(?!\s+inline)/g), body.slice(0, 60)).toHaveLength(1);
    }
  });

  test.each(CLOSING_PAIRS.map((pair, index) => [pair.principle, index] as const))(
    'el párrafo de «%s» no pasa de 150 palabras',
    (_, index) => {
      expect(words(pairBlocks[index].body)).toBeLessThanOrEqual(MAX_PAIR_WORDS);
    },
  );

  test('la aplicación propia cabe en media página (≤ 350 palabras)', () => {
    expect(words(application)).toBeGreaterThan(MAX_APPLICATION_WORDS / 2);
    expect(words(application)).toBeLessThanOrEqual(MAX_APPLICATION_WORDS);
  });

  // Red on a branch without Temas 10 to 13: every pair must link two published topics.
  test('cada par une dos temas registrados', () => {
    for (const { a, b, principle } of CLOSING_PAIRS) {
      expect(topicByNumber(a), `${principle}: Tema ${a}`).toBeDefined();
      expect(topicByNumber(b), `${principle}: Tema ${b}`).toBeDefined();
    }
  });
});

describe('fuentes y números de «Qué aprendí»', () => {
  const sources = (data.sources ?? []) as unknown[];
  const ids = sources.map((source) => sourceSchema.parse(source).id);
  const cited = [...content.matchAll(CITE_ID)].map(([, id]) => id);

  test('cada fuente valida, sin ids repetidos', () => {
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('cada cita apunta a una fuente declarada y cada fuente se cita', () => {
    expect(new Set(cited)).toEqual(new Set(ids));
  });

  test('no cita la página de soporte de Apple, que no se pudo abrir', () => {
    expect(JSON.stringify(data)).not.toMatch(/support\.apple\.com/);
  });

  test('los números de cálculo propio son los del código', () => {
    const numbers = [
      freeFallTime(WRIST_HEIGHT, G_EARTH),
      freeFallSpeed(WRIST_HEIGHT, G_EARTH),
      jumpWeightlessTime(JUMP_HEIGHT, G_EARTH),
    ];

    for (const value of numbers) {
      const forms = stated(value);
      expect(
        forms.some((form) => application.includes(form)),
        forms[0],
      ).toBe(true);
    }
    expect(application).toContain('h = 0{,}8');
    expect(application).toContain('30 cm');
  });

  test('ninguna letra de magnitud queda fuera de una fórmula', () => {
    const formulas = [
      ...[...content.matchAll(LATEX_ATTRIBUTE)].map(([, tex]) => tex),
      ...[...content.matchAll(SYMBOL_KEY)].map(([, tex]) => tex.replace(/\\\\/g, '\\')),
      ...splitInlineMath(content).flatMap((part) => (part.kind === 'math' ? [part.tex] : [])),
    ];
    const symbols = new Set(formulas.flatMap(texVariables));
    const prose = content
      .replace(/^import .*$/gm, ' ')
      .replace(LATEX_ATTRIBUTE, ' ')
      .replace(/<[A-Za-z/][^>]*?(?:\/>|>)/gs, ' ');
    const meanings = [...content.matchAll(MEANING_KEY)].map(([, text]) => text);
    const loose = [prose, ...meanings].flatMap((text) =>
      looseSymbols(text, symbols).map(({ letter, context }) => `[${letter}] …${context}…`),
    );

    expect(loose).toEqual([]);
  });
});
