import { describe, expect, test } from 'vitest';
import { GM_SUN, PLANETS, PLANET_IDS } from '../../data/planets';
import { VOYAGER, encounterJump } from '../../data/voyager';
import { tableById } from '../index';
import { tableMarkdown } from '../markdown';
import { TABLES } from './asistencia-gravitatoria';

const ENCUENTROS = 'asistencia-gravitatoria-encuentros';
const CONSTANTES = 'asistencia-gravitatoria-constantes';

describe('asistencia-gravitatoria tables', () => {
  test('registers the encounter table and the constants table', () => {
    expect(TABLES.map((table) => table.id)).toEqual([ENCUENTROS, CONSTANTES]);
    expect(tableById(ENCUENTROS)).toBe(TABLES[0]);
  });

  test('one row per encounter in VOYAGER.encounters, values taken from the dataset', () => {
    const table = tableById(ENCUENTROS);

    expect(table.rows).toHaveLength(VOYAGER.encounters.length);
    VOYAGER.encounters.forEach((encounter, i) => {
      const row = table.rows[i];
      const series = encounter.probe === 'V2' ? VOYAGER.series.v2 : VOYAGER.series.v1;
      expect(row.planeta).toBe(PLANETS[encounter.planet].name);
      expect(row.rp).toBe(encounter.rpKm);
      expect(row.vInfIn).toBe(encounter.vInfIn);
      expect(row.vInfOut).toBe(encounter.vInfOut);
      expect(row.delta).toBe(encounter.deltaDeg);
      expect(row.conicas).toBe(encounter.conicAfter - encounter.conicBefore);
      expect(row.datos).toBe(encounterJump(series, encounter.caJd, VOYAGER.gmSun));
    });
  });

  test('renders the Voyager 2 encounters as the page prints them', () => {
    const markdown = tableMarkdown(tableById(ENCUENTROS));

    expect(markdown).toContain(
      '| Voyager\u00a02 | Júpiter | 1979-07-09 22:29 | 721\u202f375 | 7,639 | 7,579 | 97,5 | 9,91 | 10,23 |',
    );
    expect(markdown).toContain('| Voyager\u00a02 | Saturno | 1981-08-26 03:24 |');
    expect(markdown).toContain('| Voyager\u00a02 | Neptuno | 1989-08-25 03:56 | 29\u202f240 |');
    expect(markdown).toMatch(/\| Neptuno \|[^\n]*\| −2,13 \| −2,12 \|/);
    expect(markdown).toContain('| Voyager\u00a01 | Saturno | 1980-11-12 23:46 |');
  });

  test('declares the Saturn time discrepancy and calls the trajectory a design one', () => {
    const table = tableById(ENCUENTROS);

    expect(table.caption).toContain('03:24 UT');
    expect(table.caption).toContain('01:21 UT');
    expect(table.source.text).toContain('trayectorias de diseño');
    expect(`${table.caption} ${table.source.text}`).not.toMatch(/medid/i);
  });

  test('constants: GM of the Sun and GM and equatorial radius of each planet, as used', () => {
    const table = tableById(CONSTANTES);

    expect(table.rows.map((row) => row.cuerpo)).toEqual([
      'Sol',
      ...PLANET_IDS.map((id) => PLANETS[id].name),
    ]);
    expect(table.rows[0].gm).toBe(GM_SUN);
    PLANET_IDS.forEach((id, i) => {
      expect(table.rows[i + 1].gm).toBe(PLANETS[id].gm);
      expect(table.rows[i + 1].radio).toBe(PLANETS[id].radiusKm);
    });
    const markdown = tableMarkdown(table);
    expect(markdown).toContain('| Júpiter | 126\u202f686\u202f531,90 | 71\u202f492 |');
    expect(markdown).toContain('| Neptuno | 6\u202f835\u202f099,97 | 24\u202f766 |');
    expect(markdown).toContain('| Sol | 132\u202f712\u202f440\u202f041,28 | — |');
  });
});
