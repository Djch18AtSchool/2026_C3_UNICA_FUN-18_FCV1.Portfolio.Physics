import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { splitInlineMath } from '../../inlineSegments';
import { looseSymbols, texVariables, withoutInterpolations } from '../../looseSymbols';
import { MILLENNIUM, TACOMA_TORSION } from '../../data/bridges';
import { tableById } from '../index';
import { tableMarkdown } from '../markdown';
import { TABLES } from './resonancia-estructural';

const SETRA = 'resonancia-estructural-setra';
const MILLENNIUM_ID = 'resonancia-estructural-millennium';
const FLUTTER = 'resonancia-estructural-aleteo';
const TACOMA_ID = 'resonancia-estructural-tacoma';
const MEASUREMENT = 'resonancia-estructural-medicion';
/** The thin no-break space formatNumber groups thousands with. */
const NNBSP = ' ';

const rowOf = (id: string, name: string) => {
  const row = tableById(id).rows.find((candidate) => candidate.magnitud === name);
  if (!row) throw new Error(`${id}: no row «${name}»`);
  return row;
};

describe('resonancia-estructural tables', () => {
  test('registers five tables in the order of the page', () => {
    expect(TABLES.map((table) => table.id)).toEqual([
      SETRA,
      MILLENNIUM_ID,
      FLUTTER,
      TACOMA_ID,
      MEASUREMENT,
    ]);
    TABLES.forEach((table) => expect(tableById(table.id)).toBe(table));
  });

  test('every value row says whether it is published data, my calculation or an extrapolation', () => {
    const allowed = ['Dato publicado', 'Cálculo propio', 'Extrapolado (cálculo propio)'];
    for (const id of [SETRA, MILLENNIUM_ID, FLUTTER, TACOMA_ID]) {
      tableById(id).rows.forEach((row) => expect(allowed, `${id}`).toContain(row.origen));
    }
  });
});

describe('Sétra and the march (Paso 3)', () => {
  test('the march pace sits inside the vertical range of maximum risk', () => {
    const markdown = tableMarkdown(tableById(SETRA));

    expect(markdown).toContain('| Rango 1 vertical, riesgo máximo de resonancia | 1,7–2,1 | Hz |');
    expect(markdown).toContain('| Paso militar, en hercios | 2,0 | Hz | Cálculo propio |');
    expect(markdown).toContain('| 120 | pasos/min | Dato publicado |');
  });

  test('a pedestrian pushes 280 N vertically; 60 in step, 16,8 kN; breaking step, 2,2 kN', () => {
    expect(rowOf(SETRA, 'Fuerza vertical de un peatón, $F_1 = 0{,}4\\,G_0$').valor).toBe('280');
    expect(rowOf(SETRA, '60 soldados al paso, $N F_1$').valor).toBe('16,8');
    expect(rowOf(SETRA, '60 soldados rompiendo el paso, $\\sqrt{N}\\,F_1$').valor).toBe('2,2');
  });

  test('a steel footbridge: ζ = 0,4 %, a peak 0,016 Hz wide at 2 Hz, amplification 125', () => {
    expect(rowOf(SETRA, 'Amortiguamiento de cálculo, pasarela de acero').valor).toBe('0,4');
    expect(rowOf(SETRA, 'Ancho del pico, $2\\zeta f_0$, con $f_0$ = 2,0 Hz').valor).toBe('0,016');
    expect(rowOf(SETRA, 'Amplificación en resonancia, $1/(2\\zeta)$').valor).toBe('125');
  });
});

describe('Millennium Bridge (Paso 3)', () => {
  test('the first central lateral mode, as measured: 0,48 Hz, 130 t; damping 0,6–1,0 %', () => {
    const markdown = tableMarkdown(tableById(MILLENNIUM_ID));

    expect(markdown).toContain('| 0,48 | Hz | Dato publicado |');
    expect(markdown).toContain('| 130 | t | Dato publicado |');
    expect(markdown).toContain('| 0,6–1,0 | % | Dato publicado |');
  });

  test('N_L from (12.8): 37 people as built, 1 046 with ζ = 20 % on the same mode', () => {
    expect(rowOf(MILLENNIUM_ID, '$N_L$ con la (12.8), tal como se construyó').valor).toBe('37');
    expect(rowOf(MILLENNIUM_ID, '$N_L$ con la (12.8) y $\\zeta$ = 20 %').valor).toBe(
      `1${NNBSP}046`,
    );
    expect(rowOf(MILLENNIUM_ID, 'Umbral medido en el vano norte, sin amortiguadores').valor).toBe(
      String(MILLENNIUM.northSpanCriticalPedestrians.value),
    );
  });

  test('amplification 1/(2ζ): 71 before the dampers, 2,5 after', () => {
    expect(rowOf(MILLENNIUM_ID, 'Amplificación en resonancia antes, $1/(2\\zeta)$').valor).toBe(
      '71',
    );
    expect(rowOf(MILLENNIUM_ID, 'Amplificación en resonancia después, $1/(2\\zeta)$').valor).toBe(
      '2,5',
    );
  });

  test('the caption keeps the two thresholds apart: different spans, different modes', () => {
    expect(tableById(MILLENNIUM_ID).caption).toContain('vano norte');
  });
});

describe('flutter of the torsion (Paso 4)', () => {
  test('one row per wind: the five of Table I and the 42 mph of 7 November', () => {
    expect(tableById(FLUTTER).rows.map((row) => row.viento)).toEqual([
      17, 18.6, 22.9, 27.4, 30.6, 42,
    ]);
  });

  test('ζ_net and the exact energy per cycle, e^{−4πζ_net} − 1', () => {
    const markdown = tableMarkdown(tableById(FLUTTER));

    expect(markdown).toMatch(/\| 22,9 \| 0,010 \| 0,145 \| −0,005 \| 6,5 \| Dato publicado \|/);
    expect(markdown).toMatch(/\| 27,4 \| 0,015 \| 0,217 \| −0,010 \| 13,4 \|/);
    expect(markdown).toMatch(/\| 30,6 \| 0,020 \| 0,290 \| −0,015 \| 20,8 \|/);
    expect(markdown).toMatch(
      /\| 42,0 \| — \| 0,550 \| −0,033 \| 51,4 \| Extrapolado \(cálculo propio\) \|/,
    );
    expect(markdown).toMatch(/\| 17,0 \| 0,003 \| 0,043 \| 0,002 \| −2,5 \|/);
  });

  test('says the energy is the exact form and the last row an extrapolation', () => {
    const { caption, source } = tableById(FLUTTER);

    expect(caption).toContain('e^{-4\\pi\\zeta_\\text{neto}} - 1');
    expect(`${caption} ${source.text}`).toMatch(/extrapol/);
  });
});

describe('Tacoma Narrows (Paso 4)', () => {
  test('the facts of 7 November with their units', () => {
    const markdown = tableMarkdown(tableById(TACOMA_ID));

    expect(markdown).toContain('| 42 | mph | Dato publicado |');
    expect(markdown).toContain('| 18,8 | m/s | Cálculo propio |');
    expect(markdown).toContain('| 36–38 | ciclos/min | Dato publicado |');
    expect(markdown).toContain('| 0,20 | Hz | Cálculo propio |');
    expect(markdown).toContain('| 0,005 | — | Dato publicado |');
  });

  test('vortex shedding at 0,85 Hz, 4,2 times the torsion; resonance would amplify ×100', () => {
    expect(rowOf(TACOMA_ID, 'Desprendimiento de vórtices, $f_s$ con la (12.9)').valor).toBe('0,85');
    expect(rowOf(TACOMA_ID, 'Vórtices frente a torsión, $f_s/f_0$').valor).toBe('4,2');
    expect(
      rowOf(TACOMA_ID, 'Amplificación si fuera resonancia forzada, $1/(2\\zeta_s)$').valor,
    ).toBe('100');
  });
});

describe('my measurement of the film (Paso 4)', () => {
  test('three shots, their mean and Farquharson’s stopwatch', () => {
    const table = tableById(MEASUREMENT);

    expect(table.rows.map((row) => row.toma)).toEqual([
      ...TACOMA_TORSION.shots.map((shot) => shot.label),
      'Media de las tres tomas',
      'Farquharson, cronómetro (1940)',
    ]);
  });

  test('3,58 / 3,45 / 3,43 s in the video, mean 3,49 s → 5,23 s, 0,191 Hz, 11,5 cycles/min', () => {
    const markdown = tableMarkdown(tableById(MEASUREMENT));

    expect(markdown).toContain(
      '| Sobre la calzada | 0:14,3–0:25,3 | Inclinación del horizonte | 3,58 | 5,37 | 0,186 | 11,2 |',
    );
    expect(markdown).toContain('| 3,45 | 5,17 | 0,193 | 11,6 |');
    expect(markdown).toContain(
      '| Desde debajo de la torre | 1:01,7–1:09,4 | Altura del borde del tablero | 3,43 | 5,15 | 0,194 | 11,7 |',
    );
    expect(markdown).toContain('| Media de las tres tomas | — | — | 3,49 | 5,23 | 0,191 | 11,5 |');
    expect(markdown).toContain(
      '| Farquharson, cronómetro (1940) | — | — | — | 5,00 | 0,200 | 12,0 |',
    );
  });

  test('the caption states the correction and how far below Farquharson I land', () => {
    const { caption } = tableById(MEASUREMENT);

    expect(caption).toContain('16');
    expect(caption).toContain('24');
    expect(caption).toContain('4 %');
  });
});

/*
 * The loose-letter guard (src/content/looseSymbols.test.ts) reads this module's own literals, but
 * the tables also print strings written in the data modules (every «Fuente» cell of a published
 * value, the shot names). Here every caption, source line and text cell the page prints goes
 * through the same check, with the page's magnitudes collected as the guard collects them.
 */
describe('no loose magnitude letter in what the tables print', () => {
  const LATEX_ATTRIBUTE = /\blatex=(?:"([^"]*)"|\{`([^`]*)`\})/gu;
  const SYMBOL_KEY = /\bsymbol:\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/gu;
  /** Not the unit column: a lone «t» or «m» there is tonnes or metres. */
  const TEXT_CELLS = ['magnitud', 'origen', 'fuente', 'toma', 'instantes', 'senal'];
  /** The guard's own exception: Billah and Scanlan number their table with a Roman I. */
  const ROMAN_TABLE = /Tabla I(?![\p{L}])/u;
  const mdx = readFileSync(
    join(process.cwd(), 'src/content/topics/resonancia-estructural.mdx'),
    'utf8',
  );
  const groups = (text: string, pattern: RegExp) =>
    [...text.matchAll(pattern)].map((match) =>
      (match.slice(1).find((group) => group !== undefined) ?? '').replace(/\\\\/gu, '\\'),
    );
  const formulas = (text: string) =>
    splitInlineMath(withoutInterpolations(text)).flatMap((segment) =>
      segment.kind === 'math' ? [segment.tex] : [],
    );
  const printed = TABLES.flatMap((table) => [
    { where: `${table.id}: pie`, text: table.caption },
    { where: `${table.id}: fuente`, text: table.source.text },
    ...table.rows.flatMap((row) =>
      TEXT_CELLS.filter((key) => key in row).map((key) => ({
        where: `${table.id}: ${key} de «${String(row.magnitud ?? row.toma ?? row.viento)}»`,
        text: String(row[key]),
      })),
    ),
  ]);
  const symbols = new Set(
    [
      ...groups(mdx, LATEX_ATTRIBUTE),
      ...groups(mdx, SYMBOL_KEY),
      ...formulas(mdx),
      ...printed.flatMap(({ text }) => formulas(text)),
    ].flatMap(texVariables),
  );

  test('the page writes its magnitudes: k, N, D, S, U, I and the Greek are symbols here', () => {
    for (const letter of ['k', 'N', 'D', 'S', 'U', 'I', 'f', 'b', 'ζ', 'δ']) {
      expect(symbols.has(letter), letter).toBe(true);
    }
  });

  test('every caption, source line and text cell keeps its letters inside $…$', () => {
    const loose = printed.flatMap(({ where, text }) =>
      looseSymbols(text, symbols)
        .filter(({ near }) => !ROMAN_TABLE.test(near))
        .map(({ letter, context }) => `${where} [${letter}] …${context}…`),
    );

    expect(loose).toEqual([]);
  });
});
