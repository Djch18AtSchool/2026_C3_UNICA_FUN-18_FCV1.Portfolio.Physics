import { describe, expect, test } from 'vitest';
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
