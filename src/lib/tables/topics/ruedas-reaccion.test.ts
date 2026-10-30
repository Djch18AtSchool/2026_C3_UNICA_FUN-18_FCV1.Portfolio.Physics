import { describe, expect, test } from 'vitest';
import { MISSIONS } from '../../data/reactionWheels';
import { formatCell } from '../markdown';
import type { DataTableSpec } from '../types';
import { formatScientific, MANEUVER_TIMES, maneuverRow, TABLES } from './ruedas-reaccion';

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
  test('writes a mantissa with comma decimals and a superscript power of ten', () => {
    expect(formatScientific(6.37e-3)).toBe('6,37·10⁻³');
    expect(formatScientific(9.549e-5)).toBe('9,55·10⁻⁵');
    expect(formatScientific(218_340)).toBe('2,18·10⁵');
    expect(formatScientific(1.2e-5, 2)).toBe('1,2·10⁻⁵');
  });

  test('carries a rounded mantissa into the exponent and keeps the sign as a minus', () => {
    expect(formatScientific(9.996e-5)).toBe('1,00·10⁻⁴');
    expect(formatScientific(-2.29e-7)).toBe('−2,29·10⁻⁷');
    expect(formatScientific(4.5e12, 2)).toBe('4,5·10¹²');
  });

  test('prints 0 and non-finite values without a power', () => {
    expect(formatScientific(0)).toBe('0');
    expect(formatScientific(Number.NaN)).toBe('—');
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

  test('prints L_max and the mass with the precision each datasheet prints, no more', () => {
    expect(printed(spec, 0)).toMatchObject({ Lmax: '4,0', mass: '2,5\u202Fkg' });
    expect(printed(spec, 1)).toMatchObject({ Lmax: '0,050', mass: '375\u202Fg' });
  });

  test('prints the inertia the sheet gives, and marks the derived one as cálculo propio', () => {
    expect(printed(spec, 0)).toMatchObject({ inertia: '6,37·10⁻³', origin: 'impresa en la hoja' });
    expect(printed(spec, 1).inertia).toBe('9,55·10⁻⁵');
    expect(printed(spec, 1).origin).toMatch(/^cálculo propio/);
    expect(printed(spec, 0).origin).not.toMatch(/cálculo propio/);
  });
});

describe('ruedas-reaccion-maniobra', () => {
  const spec = table('ruedas-reaccion-maniobra');

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
