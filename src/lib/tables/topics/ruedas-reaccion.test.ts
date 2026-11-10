import { describe, expect, test } from 'vitest';
import { MISSIONS } from '../../data/reactionWheels';
import { formatCell } from '../markdown';
import type { DataTableSpec } from '../types';
import { uncoveredChars } from '../../typography';
import {
  formatScientific,
  formatScientificNotation,
  MANEUVER_TIMES,
  maneuverRow,
  TABLES,
} from './ruedas-reaccion';

/** What a text shows outside its `$…$` formulas, which KaTeX draws. */
const outsideKatex = (text: string) => text.replace(/\$[^$]*\$/g, '');

const table = (id: string): DataTableSpec => {
  const found = TABLES.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`missing ${id}`);
  return found;
};

/** Every cell of a row as printed on the page, keyed by column. */
const printed = (spec: DataTableSpec, index: number) =>
  Object.fromEntries(
    spec.columns.map((column) => [column.key, formatCell(column, spec.rows[index][column.key])]),
  );

describe('formatScientific', () => {
  test('writes TeX for InlineMath: a braced decimal comma and a real power of ten', () => {
    expect(formatScientific(6.37e-3)).toBe('6{,}37 \\cdot 10^{-3}');
    expect(formatScientific(9.549e-5)).toBe('9{,}55 \\cdot 10^{-5}');
    expect(formatScientific(218_340)).toBe('2{,}18 \\cdot 10^{5}');
    expect(formatScientific(1.2e-5, 2)).toBe('1{,}2 \\cdot 10^{-5}');
  });

  test('carries a rounded mantissa into the exponent and keeps the sign', () => {
    expect(formatScientific(9.996e-5)).toBe('1{,}00 \\cdot 10^{-4}');
    expect(formatScientific(-2.29e-7)).toBe('-2{,}29 \\cdot 10^{-7}');
    expect(formatScientific(4.5e12, 2)).toBe('4{,}5 \\cdot 10^{12}');
  });

  test('prints 0 and non-finite values without a power', () => {
    expect(formatScientific(0)).toBe('0');
    expect(formatScientific(Number.NaN)).toBe('—');
  });
});

describe('formatScientificNotation', () => {
  test('writes the MathText notation: comma decimals, ^ for the power, a hyphen MathText draws as a minus', () => {
    expect(formatScientificNotation(6.37e-3)).toBe('6,37·10^-3');
    expect(formatScientificNotation(218_340)).toBe('2,18·10^5');
    expect(formatScientificNotation(-2.29e-7)).toBe('−2,29·10^-7');
    expect(formatScientificNotation(1.2e-5, 2)).toBe('1,2·10^-5');
  });

  test('prints 0 and non-finite values without a power', () => {
    expect(formatScientificNotation(0)).toBe('0');
    expect(formatScientificNotation(Number.NaN)).toBe('—');
  });
});

describe('maneuverRow', () => {
  test('at t = 30 s the 6U has turned 45° at 3°/s and the wheel spins at −970 rpm', () => {
    const row = maneuverRow(30);

    expect(row.thetaS).toBeCloseTo(45, 9);
    expect(row.omegaS).toBeCloseTo(0.0524, 4);
    expect(row.omegaW).toBeCloseTo(-969.5, 1);
    expect(row.Lw).toBeCloseTo(-0.0097, 4);
  });

  test('the turn starts and ends at rest with the wheel back at 0 rpm', () => {
    expect(maneuverRow(0)).toEqual({ t: 0, omegaS: 0, thetaS: 0, omegaW: -0, Lw: -0 });
    const end = maneuverRow(60);
    expect(end.thetaS).toBeCloseTo(90, 9);
    expect(end.omegaW).toBeCloseTo(0, 9);
  });
});

describe('ruedas-reaccion-ruedas', () => {
  const spec = table('ruedas-reaccion-ruedas');

  test('lists the VRW-D-4 and the RW400 with their datasheet values', () => {
    expect(spec.rows.map((row) => row.rueda)).toEqual([
      'VECTRONIC Aerospace VRW-D-4',
      'AAC Clyde Space RW400 (50 mN·m·s)',
    ]);
    expect(printed(spec, 0)).toMatchObject({ tauMax: '50', rpmMax: '6\u202F000' });
    expect(printed(spec, 1)).toMatchObject({ tauMax: '8', rpmMax: '5\u202F000' });
  });

  test('right-aligns every numeric column, the datasheet-written ones too', () => {
    expect(spec.columns.filter((column) => column.align === 'num').map(({ key }) => key)).toEqual([
      'Lmax',
      'tauMax',
      'rpmMax',
      'mass',
      'inertia',
    ]);
  });

  test('prints L_max and the mass with the precision each datasheet prints, no more', () => {
    expect(printed(spec, 0)).toMatchObject({ Lmax: '4,0', mass: '2,5\u202Fkg' });
    expect(printed(spec, 1)).toMatchObject({ Lmax: '0,050', mass: '375\u202Fg' });
  });

  test('prints the inertia in kg·m² with its power of ten, typeset in the cell', () => {
    expect(spec.columns.find((column) => column.key === 'inertia')?.unit).toBe('kg·m²');
    expect(printed(spec, 0)).toMatchObject({
      inertia: String.raw`$6{,}37 \cdot 10^{-3}$`,
      origin: 'impresa en la hoja',
    });
    expect(printed(spec, 1)).toMatchObject({
      inertia: String.raw`$9{,}55 \cdot 10^{-5}$`,
      origin: String.raw`cálculo propio: $L_\text{máx}/\omega_\text{máx}$`,
    });
  });

  test('labels the limits with real subscripts in KaTeX: L_máx, τ_máx, ω_máx', () => {
    expect(spec.columns.map((column) => column.label).slice(1, 4)).toEqual([
      String.raw`$L_\text{máx}$`,
      String.raw`$\tau_\text{máx}$`,
      String.raw`$\omega_\text{máx}$`,
    ]);
    expect(spec.caption).toContain(String.raw`$L_\text{máx}/\omega_\text{máx}$`);
    expect(JSON.stringify(spec)).not.toMatch(/_(max|min)\b/);
  });

  test('the source line groups the RW400 top speed as the table does: 5 000 rpm', () => {
    expect(spec.source.text).toContain('las 5\u202F000\u202Frpm de la hoja');
    expect(spec.source.text).not.toMatch(/5000/);
  });
});

describe('ruedas-reaccion-maniobra', () => {
  const spec = table('ruedas-reaccion-maniobra');

  test('the source line holds the formulas and inertias, typeset, as the datasheets give them', () => {
    expect(spec.source.text).toContain(String.raw`$\tau = 4 I_s \theta/T^2$`);
    expect(spec.source.text).toContain('$I_s$ = 0,1852 kg·m²');
    expect(spec.source.text).toContain(String.raw`$I_w = 9{,}55 \cdot 10^{-5}$ kg·m²`);
    expect(spec.caption).not.toContain('$');
  });

  test('has one row every 10 s from 0 to 60 s', () => {
    expect(MANEUVER_TIMES).toEqual([0, 10, 20, 30, 40, 50, 60]);
    expect(spec.rows.map((row) => row.t)).toEqual([0, 10, 20, 30, 40, 50, 60]);
  });

  test('prints the t = 30 s row as θ_s = 45° and ω_w = −970 rpm, as research §7', () => {
    expect(printed(spec, 3)).toEqual({
      t: '30',
      omegaS: '0,0524',
      thetaS: '45',
      omegaW: '−970',
      Lw: '−0,00970',
    });
    expect(printed(spec, 1)).toMatchObject({ thetaS: '5', omegaW: '−323' });
    expect(printed(spec, 6)).toMatchObject({ thetaS: '90', omegaW: '0', Lw: '0,00000' });
  });
});

describe('every table', () => {
  test('captions, headers, cells and sources leave IBM Plex only inside $…$ (KaTeX)', () => {
    for (const spec of TABLES) {
      const texts = [
        spec.caption,
        spec.source.text,
        ...spec.columns.map((column) => column.label),
        ...spec.rows.flatMap((row) =>
          spec.columns.map((column) => formatCell(column, row[column.key])),
        ),
      ];
      expect(
        texts.flatMap((text) => uncoveredChars(outsideKatex(text), 'sans')),
        spec.id,
      ).toEqual([]);
    }
  });
});

describe('ruedas-reaccion-misiones', () => {
  const spec = table('ruedas-reaccion-misiones');

  test('has one row per mission fact, in the research order', () => {
    expect(spec.rows).toHaveLength(MISSIONS.length);
    expect(spec.rows.map((row) => row.mission)).toEqual(MISSIONS.map((fact) => fact.mission));
  });

  test('cites each fact by author and year, once per author and year', () => {
    expect(spec.rows[0].sources).toBe('Roger Hunter (NASA Ames), 2012');
    expect(spec.rows[2].sources).toBe('The Kepler Team, 2013');
    expect(spec.rows.at(-1)?.sources).toBe(
      'NASA Webb Mission Team, 2021; Bely, Illingworth et al., 2025',
    );
  });

  test('the source line cites every author and year the rows cite, each once', () => {
    const cited = new Set(spec.rows.flatMap((row) => String(row.sources).split('; ')));

    for (const citation of cited) expect(spec.source.text).toContain(citation);
    expect(spec.source.text).toContain('Bely, Illingworth et al., 2025');
    expect(spec.source.text).toContain('NASA Science, 2025');
    expect(spec.source.text.split('Roger Hunter (NASA Ames), 2012')).toHaveLength(2);
  });

  test('never states a Hubble wheel capacity in N·m·s', () => {
    const hubble = spec.rows.filter((row) => row.mission === 'Hubble');
    expect(hubble.length).toBeGreaterThan(0);
    for (const row of hubble) expect(String(row.fact)).not.toMatch(/N·m·s/);
  });
});
