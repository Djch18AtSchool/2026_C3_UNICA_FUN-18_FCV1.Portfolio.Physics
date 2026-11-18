import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { splitInlineMath } from '../../inlineSegments';
import { looseSymbols, texVariables, withoutInterpolations } from '../../looseSymbols';
import { RD109, UQD04 } from '../../data/liquidCooling';
import { PRESETS, rackPath } from '../../data/liquidCoolingCircuit';
import { tableById } from '../index';
import { tableMarkdown } from '../markdown';
import {
  ORIGIN_LABELS,
  PARAMETER_ROWS,
  TABLES,
  type CoolingParameterId,
} from './enfriamiento-liquido';

/** Markdown rows as plain cells: "| a | b |" → ['a', 'b'], with every space normalised. */
function markdownRows(markdown: string): string[][] {
  return markdown
    .split('\n')
    .filter((line) => line.startsWith('| '))
    .map((line) =>
      line
        .slice(2, -2)
        .split(' | ')
        .map((cell) => cell.replace(/\s+/g, ' ')),
    );
}

const rowsOf = (id: string) => markdownRows(tableMarkdown(tableById(id))).slice(2);
const rowNamed = (id: string, name: string) => rowsOf(id).find(([first]) => first === name);
const REFERENCE = PRESETS.referencia24;

describe('enfriamiento-liquido tables', () => {
  test('four tables in the registry under the topic slug: fluid, geometry, connectors, breakdown', () => {
    expect(TABLES.map((table) => table.id)).toEqual([
      'enfriamiento-liquido-fluido',
      'enfriamiento-liquido-geometria',
      'enfriamiento-liquido-conectores',
      'enfriamiento-liquido-desglose',
    ]);
    expect(tableById('enfriamiento-liquido-desglose')).toBe(TABLES[3]);
  });

  test('the parameter tables say the origin of every value and give it one source', () => {
    for (const table of TABLES.slice(0, 3)) {
      expect(table.columns.map((column) => column.key)).toEqual([
        'parametro',
        'simbolo',
        'valor',
        'unidad',
        'origen',
        'fuente',
      ]);
      for (const row of table.rows) {
        expect([...Object.values(ORIGIN_LABELS), 'Constante']).toContain(row.origen);
        expect(String(row.fuente).trim().length, String(row.parametro)).toBeGreaterThan(0);
        expect(String(row.parametro), 'el nombre se lee sin fórmulas').not.toContain('$');
      }
    }
    expect(ORIGIN_LABELS).toEqual({
      producto: 'Producto',
      ilustrativo: 'Supuesto',
      calculo: 'Cálculo propio',
    });
  });

  test('fluido: PG25 at 40 °C from Melinder, the flows of GF and the OCP rule', () => {
    expect(
      rowNamed('enfriamiento-liquido-fluido', 'Densidad del PG25 a 40 °C')?.slice(1, 5),
    ).toEqual(['$\\rho$', '1 010,6', 'kg/m³', 'Cálculo propio']);
    expect(rowNamed('enfriamiento-liquido-fluido', 'Viscosidad del PG25 a 40 °C')?.[2]).toBe(
      '1,394',
    );
    expect(rowNamed('enfriamiento-liquido-fluido', 'Caudal del CDU')?.slice(2, 5)).toEqual([
      '23',
      'L/s',
      'Producto',
    ]);
    expect(
      rowNamed('enfriamiento-liquido-fluido', 'Caudal medio por servidor')?.slice(2, 5),
    ).toEqual(['7,19', 'L/min', 'Cálculo propio']);
    expect(
      rowNamed('enfriamiento-liquido-fluido', 'Caudal por potencia, regla de diseño')?.[2],
    ).toBe('1,5');
    expect(tableById('enfriamiento-liquido-fluido').caption).toMatch(/NIST/);
    // One source per number: each server's 7,19 L/min is GF's 23 L/s shared out; OCP's rule only
    // says what flow a load asks for, and the caption gives the load these flows stand for.
    expect(tableById('enfriamiento-liquido-fluido').caption.replace(/\s+/g, ' ')).toContain(
      'Los 172,5 L/min por rack equivalen a la regla de OCP con 115 kW (cálculo propio).',
    );
  });

  test('geometria: the main pipe is computed from d160 SDR11, the lengths are assumptions', () => {
    expect(
      rowNamed('enfriamiento-liquido-geometria', 'Tubería principal: diámetro interior'),
    ).toEqual(expect.arrayContaining(['130,9', 'mm', 'Cálculo propio']));
    expect(
      rowNamed('enfriamiento-liquido-geometria', 'Tubería principal: longitud por sentido'),
    ).toEqual(expect.arrayContaining(['35', 'm', 'Supuesto']));
    expect(rowNamed('enfriamiento-liquido-geometria', 'Manifold: diámetro hidráulico')?.[2]).toBe(
      '37,7',
    );
    expect(
      rowNamed('enfriamiento-liquido-geometria', 'Manifold: subida hasta el servidor 24')?.[2],
    ).toBe('1,067');
  });

  test('conectores: the 1,2 bar of the cold plate is GF’s design value and its flow an assumption', () => {
    const drop = rowNamed('enfriamiento-liquido-conectores', 'Placa fría: caída de diseño');
    const flow = rowNamed(
      'enfriamiento-liquido-conectores',
      'Placa fría: caudal al que pierde esa caída',
    );

    expect(drop?.slice(2, 5)).toEqual(['1,2', 'bar', 'Producto']);
    expect(drop?.[5]).toMatch(/GF.*valor de diseño/);
    expect(flow?.slice(2, 5)).toEqual(['7,19', 'L/min', 'Supuesto']);
    expect(rowNamed('enfriamiento-liquido-conectores', 'UQD04: caudal nominal')?.[2]).toBe('6,44');
    // The 24-server reference runs each UQD04 above its nominal flow, and the caption says so.
    expect(tableById('enfriamiento-liquido-conectores').caption.replace(/\s+/g, ' ')).toContain(
      'cada UQD04 lleva 7,19 L/min, más que sus 6,44 L/min nominales',
    );
    expect(
      rowNamed('enfriamiento-liquido-conectores', 'UQD04: rango de la especificación')?.[2],
    ).toBe('1,1–1,6');
  });

  test('desglose: mine against GF’s fig. 2, totals 1,799 and 1,98 bar, 9,2 % apart', () => {
    const [header, , ...rows] = markdownRows(
      tableMarkdown(tableById('enfriamiento-liquido-desglose')),
    );
    const total = rows.at(-1);

    expect(header).toEqual([
      'Grupo de pérdidas',
      'Este cálculo (bar)',
      'GF, Sinetz (bar)',
      'Cómo lo calculo',
    ]);
    expect(rows[0].slice(0, 3)).toEqual(['Placas frías y su tubería interna', '1,200', '1,20']);
    expect(rows.find(([name]) => name === 'Conector grande')?.slice(1, 3)).toEqual(['—', '0,01']);
    expect(rows.find(([name]) => name === 'Mangueras de rack de 2″')?.slice(1, 3)).toEqual([
      '0,025',
      '—',
    ]);
    expect(total?.slice(0, 3)).toEqual(['Total hasta el servidor más lejano', '1,799', '1,98']);
    expect(total?.[3]).toContain('9,2 %');
    // The pumping power the page no longer argues in its prose: P = Δp·Q at 23 L/s.
    expect(tableById('enfriamiento-liquido-desglose').caption.replace(/\s+/g, ' ')).toContain(
      'Bombear los 23 L/s contra esa pérdida pide $P = \\Delta p\\,Q$ = 4,1 kW (cálculo propio).',
    );
  });
});

describe('PARAMETER_ROWS: every declared parameter, by id, as its table prints it', () => {
  test('ids are unique and each names the table and the row it sits in', () => {
    const ids = Object.keys(PARAMETER_ROWS);

    expect(new Set(ids).size).toBe(ids.length);
    for (const [id, row] of Object.entries(PARAMETER_ROWS)) {
      const printed = rowNamed(row.table, row.parametro);
      expect(printed, id).toBeDefined();
      expect(printed?.[2], id).toBe(row.valor.replace(/\s+/g, ' '));
    }
  });

  test('the printed values are the ones the reference path uses', () => {
    const path = rackPath(REFERENCE);
    const mm = (id: CoolingParameterId) => PARAMETER_ROWS[id].valor;
    const segment = (id: string) => path.find((s) => s.id === id);

    expect(mm('tuberia-diametro')).toBe('130,9');
    expect((segment('tuberia-ida')?.diameter ?? 0) * 1e3).toBeCloseTo(130.909, 3);
    expect(segment('manguera-servidor-ida')?.diameter).toBe(RD109.serverHoseDiameter.value);
    expect(mm('manguera-servidor-diametro')).toBe('9,5');
    expect(segment('uqd-ida')?.cv).toBe(UQD04.cv.value);
    expect(mm('uqd-cv')).toBe('1,29');
    expect(segment('tuberia-ida')?.length).toBe(35);
    expect(mm('tuberia-longitud')).toBe('35');
  });
});

/*
 * The loose-letter guard (src/content/looseSymbols.test.ts) reads this module's own literals,
 * but the tables also print strings written in the data modules (every «Fuente» cell, the
 * breakdown's group names). Here every caption, source line and text cell the page prints goes
 * through the same check, with the page's magnitudes collected as the guard collects them.
 */
describe('no loose magnitude letter in what the tables print', () => {
  const LATEX_ATTRIBUTE = /\blatex=(?:"([^"]*)"|\{`([^`]*)`\})/gu;
  const SYMBOL_KEY = /\bsymbol:\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/gu;
  // Not the unit column: a lone «m» there is metres, as the guard's own exception for a scale bar.
  const TEXT_CELLS = ['parametro', 'simbolo', 'origen', 'fuente', 'grupo', 'como'];
  const mdx = readFileSync(
    join(process.cwd(), 'src/content/topics/enfriamiento-liquido.mdx'),
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
        where: `${table.id}: ${key} de «${String(row.parametro ?? row.grupo)}»`,
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

  test('the page writes its magnitudes: n, P, Q, D and the rest are symbols here', () => {
    for (const letter of ['n', 'P', 'Q', 'D', 'L', 'K', 'y'])
      expect(symbols.has(letter)).toBe(true);
  });

  test('every caption, source line and text cell keeps its letters inside $…$', () => {
    const loose = printed.flatMap(({ where, text }) =>
      looseSymbols(text, symbols).map(({ letter, context }) => `${where} [${letter}] …${context}…`),
    );

    expect(loose).toEqual([]);
  });

  test('the perimeter of D_h is P_m: P stays the pump’s power on this page', () => {
    const dh = printed.find(({ text }) => text.includes('D_h = 4A'));

    expect(dh?.text).toContain('$D_h = 4A/P_m$');
    expect(dh?.text).toContain('perímetro mojado');
  });
});
