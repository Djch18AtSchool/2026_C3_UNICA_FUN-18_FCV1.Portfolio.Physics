import { describe, expect, test } from 'vitest';
import { DEFAULT_REGEN } from '../../physics/energy';
import { regenModelText } from '../../physics/regenModelText';
import { tableById } from '../index';
import { tableMarkdown } from '../markdown';
import { TABLES } from './frenado-regenerativo';

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

const HWFET_ROW = [
  'HWFET',
  '1,775',
  '0,624',
  '0,285',
  '0,221',
  '0,055',
  '0,008',
  '12,5',
  '47,1',
  '0,150',
];
const US06_ROW = [
  'US06',
  '2,431',
  '1,452',
  '0,976',
  '0,748',
  '0,187',
  '0,041',
  '30,7',
  '70,8',
  '0,314',
];

describe('frenado-regenerativo tables', () => {
  test('both tables are in the registry under the topic slug', () => {
    expect(TABLES.map((table) => table.id)).toEqual([
      'frenado-regenerativo-vehiculo',
      'frenado-regenerativo-ciclos',
    ]);
    expect(tableById('frenado-regenerativo-ciclos')).toBe(TABLES[1]);
  });

  test('vehiculo: ETW and the target A, B, C as the EPA prints them and in SI', () => {
    const [header, , model3, leaf] = markdownRows(tableMarkdown(TABLES[0]));

    expect(header).toEqual([
      'Vehículo',
      'Masa de prueba, ETW (lb)',
      'Masa m (kg)',
      'A (lbf)',
      'A (N)',
      'B (lbf/mph)',
      'B (N·s/m)',
      'C (lbf/mph²)',
      'C (N·s²/m²)',
    ]);
    expect(model3).toEqual([
      'Tesla Model 3 Long Range RWD 2025',
      '4 250',
      '1 927,77',
      '27,02',
      '120,19',
      '0,2873',
      '2,8587',
      '0,01220',
      '0,27155',
    ]);
    expect(leaf.slice(0, 4)).toEqual(['Nissan LEAF 2025', '3 875', '1 757,67', '25,89']);
    expect(leaf.slice(4)).toEqual(['115,16', '0,3449', '3,4319', '0,01945', '0,43293']);
  });

  test('ciclos: the share of traction back in the battery is 40,4 / 12,5 / 30,7 %', () => {
    const rows = markdownRows(tableMarkdown(TABLES[1]));
    const share = rows[0].indexOf('Batería / tracción (%)');
    const byCycle = Object.fromEntries(rows.slice(2).map((row) => [row[0], row]));

    expect(share).toBeGreaterThan(0);
    expect(byCycle.UDDS[share]).toBe('40,4');
    expect(byCycle.HWFET[share]).toBe('12,5');
    expect(byCycle.US06[share]).toBe('30,7');
  });

  test('ciclos: energies in kWh with three decimals, peak power in kW and peak deceleration in g', () => {
    const rows = markdownRows(tableMarkdown(TABLES[1]));

    expect(rows[0]).toEqual([
      'Ciclo',
      'Tracción en las ruedas (kWh)',
      '$\\Delta K$ quitado al desacelerar (kWh)',
      'Frenado en las ruedas (kWh)',
      'A la batería (kWh)',
      'Pérdidas de conversión $(1 - \\eta)$ (kWh)',
      'Calor de fricción (kWh)',
      'Batería / tracción (%)',
      'Potencia de frenado máx. (kW)',
      'Desaceleración máx. (g)',
    ]);
    expect(rows[2]).toEqual([
      'UDDS',
      '1,597',
      '1,124',
      '0,869',
      '0,645',
      '0,161',
      '0,062',
      '40,4',
      '33,2',
      '0,150',
    ]);
    expect(rows[3]).toEqual(HWFET_ROW);
    expect(rows[4]).toEqual(US06_ROW);
  });

  test('ciclos: brake at the wheels = battery + conversion loss + friction in every row', () => {
    for (const row of TABLES[1].rows) {
      const { frenado, bateria, perdidas, friccion } = row as Record<string, number>;
      expect(bateria + perdidas + friccion, String(row.ciclo)).toBeCloseTo(frenado, 9);
    }
  });

  test('the cycle table derives the model from DEFAULT_REGEN and states the denominator', () => {
    const cycles = TABLES[1];

    expect(cycles.caption).toContain(regenModelText(DEFAULT_REGEN));
    expect(cycles.caption).toContain('dividida entre la energía de tracción en las ruedas');
    expect(cycles.source.text).toContain('EPA (datos reales)');
    expect(cycles.source.text).toContain('FASTSim');
    expect(TABLES[0].source.text).toContain('3R124-782214');
    expect(TABLES[0].source.text).not.toContain('JNSX10050525');
  });
});
