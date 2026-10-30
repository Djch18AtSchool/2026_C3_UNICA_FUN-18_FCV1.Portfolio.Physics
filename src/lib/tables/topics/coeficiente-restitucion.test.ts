import { describe, expect, test } from 'vitest';
import { BALL_STANDARDS } from '../../data/ballStandards';
import { ENGINE_RESTITUTION } from '../../data/engineRestitution';
import { tableById } from '../index';
import { tableMarkdown } from '../markdown';
import type { DataTableSpec } from '../types';
import { TABLES } from './coeficiente-restitucion';

const byId = (id: string): DataTableSpec => {
  const table = TABLES.find((candidate) => candidate.id === id);
  if (!table) throw new Error(`missing ${id}`);
  return table;
};

const column = (table: DataTableSpec, key: string) => table.rows.map((row) => row[key]);

describe('coeficiente-restitucion tables', () => {
  test('registers the ball and the engine tables', () => {
    expect(TABLES.map((table) => table.id)).toEqual([
      'coeficiente-restitucion-pelotas',
      'coeficiente-restitucion-motores',
    ]);
    expect(tableById('coeficiente-restitucion-pelotas')).toBe(TABLES[0]);
    expect(tableById('coeficiente-restitucion-motores')).toBe(TABLES[1]);
  });

  describe('pelotas', () => {
    const table = byId('coeficiente-restitucion-pelotas');

    test('has ball, standard, drop height, admitted rebound and e range columns', () => {
      expect(table.columns.map((item) => [item.key, item.align, item.unit])).toEqual([
        ['pelota', 'text', undefined],
        ['ensayo', 'text', undefined],
        ['caida', 'num', 'cm'],
        ['rebote', 'num', 'cm'],
        ['e', 'num', undefined],
      ]);
    });

    test('one row per ball of the data module, named as it is', () => {
      expect(column(table, 'pelota')).toEqual(BALL_STANDARDS.map((ball) => ball.name));
      expect(column(table, 'ensayo')).toEqual(BALL_STANDARDS.map((ball) => ball.standard));
    });

    test('the drop tests give e = 0,729–0,761, 0,758–0,776 and 0,822–0,880', () => {
      expect(column(table, 'e').slice(0, 3)).toEqual(['0,729–0,761', '0,758–0,776', '0,822–0,880']);
      expect(column(table, 'caida').slice(0, 3)).toEqual([254, 180, 200]);
      expect(column(table, 'rebote').slice(0, 3)).toEqual(['135–147', '103,5–108,5', '135–155']);
    });

    test('the measured speeds print e as their source does: 0,86, 0,49 and 0', () => {
      expect(column(table, 'e').slice(3)).toEqual(['0,86', '0,49', '0']);
      expect(column(table, 'caida').slice(3)).toEqual(['—', '—', '—']);
      expect(column(table, 'rebote').slice(3)).toEqual(['—', '—', '—']);
    });

    test('cites every source of the data module and says the e are its own calculation', () => {
      for (const ball of BALL_STANDARDS) {
        for (const source of ball.sources) expect(table.source.text).toContain(source.authors);
      }
      expect(table.source.text).toContain(
        'Los rangos de e de las normas y el 0,49 del béisbol son cálculo propio, con e = √(h′/h) y e = v₂/v₁; el 0,86 de la superbola y el 0 de la plastilina son de Cross.',
      );
      expect(table.source.text).not.toContain('Los valores de e son cálculo propio');
    });

    test('exports as a Markdown table with the drop height in whole centimetres', () => {
      const markdown = tableMarkdown(table);

      expect(markdown).toContain('| Tenis (ITF, tipo 2) |');
      expect(markdown).toContain('| 254 |');
      expect(markdown).toContain('Caída (cm)');
      expect(markdown).toContain('| e calculado |');
    });
  });

  describe('motores', () => {
    const table = byId('coeficiente-restitucion-motores');

    test('has engine, threshold (m/s, one decimal), combine rule and source columns', () => {
      expect(table.columns.map((item) => [item.key, item.align, item.unit])).toEqual([
        ['motor', 'text', undefined],
        ['umbral', 'num', 'm/s'],
        ['mezcla', 'text', undefined],
        ['fuente', 'text', undefined],
      ]);
      expect(table.columns[1]).toMatchObject({ precision: 1 });
    });

    test('lists the seven engines; Godot is labelled with Jolt, whose threshold it is', () => {
      expect(column(table, 'motor')).toEqual([
        'Box2D v3',
        'Unity 3D',
        'PhysX',
        'Unity 2D',
        'Bullet 3.25',
        'Jolt',
        'Godot (con Jolt)',
      ]);
    });

    test('thresholds come from the data; Unity 2D has no documented default', () => {
      expect(column(table, 'umbral')).toEqual([1, 2, 2, 'No documentado', 0.2, 1, 1]);
      expect(column(table, 'umbral')).toEqual(
        ENGINE_RESTITUTION.map((row) => row.threshold ?? 'No documentado'),
      );
    });

    test('each engine mixes the two e with its own rule', () => {
      expect(column(table, 'mezcla')).toEqual([
        'máx(e₁, e₂)',
        '(e₁ + e₂)/2',
        '(e₁ + e₂)/2',
        'máx(e₁, e₂)',
        'e₁ · e₂',
        'máx(e₁, e₂)',
        'mín(e₁ + e₂, 1)',
      ]);
    });

    test('names the source of the threshold and, when it differs, of the rule', () => {
      const sources = column(table, 'fuente');

      expect(sources[0]).toBe('Box2D v3.2.0 (tag v3.2.0, commit 178495b)');
      expect(sources[1]).toBe(
        'Physics.bounceThreshold. Unity Scripting API, Unity 6.6; Physics Material component reference. Unity 6.6 User Manual',
      );
      expect(table.source.text).toContain(
        'El 1,0 m/s de Box2D (1.0f × lengthUnits, que vale 1) y el 2,0 m/s de PhysX (0,2 × PxTolerancesScale::speed, que vale 10) son cálculo propio a partir de su código.',
      );
      expect(table.source.text).toContain('Erin Catto');
      expect(table.source.text).toContain('Unity Technologies');
    });

    test('exports the thresholds with one decimal', () => {
      const markdown = tableMarkdown(table);

      expect(markdown).toContain('| Box2D v3 | 1,0 |');
      expect(markdown).toContain('| Bullet 3.25 | 0,2 |');
      expect(markdown).toContain('| Unity 2D | No documentado |');
    });
  });
});
