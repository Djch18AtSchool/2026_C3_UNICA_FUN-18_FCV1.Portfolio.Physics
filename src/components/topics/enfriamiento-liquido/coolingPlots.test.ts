import { describe, expect, test } from 'vitest';
import { PG25_40C } from '../../../lib/data/liquidCooling';
import { PRESETS, rackPath, serverFlow } from '../../../lib/data/liquidCoolingCircuit';
import { flowVelocity, seriesLoss, PA_PER_BAR } from '../../../lib/physics/hydraulics';
import { PARAMETER_ROWS } from '../../../lib/tables/topics/enfriamiento-liquido';
import {
  circuitProfileData,
  plateIndex,
  PROFILE_VIEWS,
  profileParameterIds,
  RETURN_COLOR,
  sectionKind,
  SIDE_COLORS,
  SUPPLY_COLOR,
  viewNote,
  viewXDomain,
  viewYDomains,
} from './coolingPlots';

const REFERENCE = PRESETS.referencia24;
const PATH = rackPath(REFERENCE);
const Q = serverFlow(REFERENCE);
const KPA = 1e3;
const data = circuitProfileData(REFERENCE);
/** The two sides joined back into one v(x) staircase (the supply's last point repeats the return's first). */
const velocity = [...data.sides.impulsion.v.slice(0, -1), ...data.sides.retorno.v];
const segmentVelocity = (i: number) => {
  const s = PATH[i];
  const flow = Q * (s.flowMultiple ?? 1);
  return s.area === undefined ? flowVelocity(flow, s.diameter) : flow / s.area;
};

describe('circuitProfileData: v(x) and p(x) of the RD109 path to the farthest server', () => {
  test('the velocity is flat inside each segment and equals flowVelocity of its own flow', () => {
    expect(velocity).toHaveLength(2 * PATH.length);
    PATH.forEach((segment, i) => {
      const [start, end] = [velocity[2 * i], velocity[2 * i + 1]];
      expect(start.x, segment.id).toBeCloseTo(data.bounds[i], 12);
      expect(end.x, segment.id).toBeCloseTo(data.bounds[i + 1], 12);
      expect(start.y, segment.id).toBeCloseTo(segmentVelocity(i), 12);
      expect(end.y, segment.id).toBe(start.y);
    });
  });

  test('the velocity steps exactly where the section changes: same x, new v', () => {
    for (let i = 1; i < PATH.length; i++) {
      const [before, after] = [velocity[2 * i - 1], velocity[2 * i]];
      expect(after.x, PATH[i].id).toBe(before.x);
      if (segmentVelocity(i) !== segmentVelocity(i - 1)) expect(after.y).not.toBe(before.y);
    }
    // 1,69 m/s in the 9,5 mm hose, 2,91 m/s in the 7,24 mm bore of the UQD04 (research §6).
    const hose = PATH.findIndex((s) => s.id === 'manguera-servidor-ida');
    expect(velocity[2 * hose].y).toBeCloseTo(1.69, 2);
    expect(velocity[2 * hose + 2].y).toBeCloseTo(2.91, 2);
  });

  test('p ideal closes the loop at its start value, 400 kPa; p real drops by the total loss', () => {
    const loss = seriesLoss(PATH, Q, PG25_40C) / KPA;

    expect(data.ideal[0].y).toBeCloseTo(400, 9);
    expect(data.ideal.at(-1)?.y).toBeCloseTo(400, 9);
    expect(data.sides.impulsion.p[0].y).toBeCloseTo(400, 9);
    expect(data.sides.retorno.p.at(-1)?.y).toBeCloseTo(400 - loss, 9);
    expect(data.loss).toBeCloseTo(loss, 9);
    expect((data.loss * KPA) / PA_PER_BAR).toBeCloseTo(1.799, 3);
    expect(data.outlet).toBeCloseTo(220.1, 1);
  });

  test('the supply runs from the CDU to the cold plate inlet and the return from there', () => {
    const plate = plateIndex(PATH);
    const plateStart = data.bounds[plate];

    expect(PATH[plate].id).toBe('placa-fria');
    expect(data.sides.impulsion.v.at(-1)?.x).toBe(plateStart);
    expect(data.sides.retorno.v[0].x).toBe(plateStart);
    expect(data.sides.impulsion.p.at(-1)).toEqual(data.sides.retorno.p[0]);
    expect(data.sides.retorno.v.at(-1)?.x).toBeCloseTo(79.4036, 4);
  });

  test('a path without a cold plate is an error, not a profile cut anywhere', () => {
    expect(() => plateIndex(PATH.filter((s) => s.id !== 'placa-fria'))).toThrow(RangeError);
  });
});

describe('colours with meaning, never series order', () => {
  test('cold supply in blue and warm return in orange-red, the OCP convention', () => {
    expect(SUPPLY_COLOR).toBe('var(--chart-1)');
    expect(RETURN_COLOR).toBe('var(--chart-2)');
    expect(SIDE_COLORS).toEqual({ impulsion: SUPPLY_COLOR, retorno: RETURN_COLOR });
  });
});

describe('the three views of the profile', () => {
  test('the whole circuit, the rack (its two hoses) and the server with a little manifold', () => {
    const [circuit, rack, server] = PROFILE_VIEWS.map((view) => viewXDomain(PATH, view.id));

    expect(PROFILE_VIEWS.map((view) => view.label)).toEqual([
      'Todo el circuito',
      'Rack',
      'Servidor',
    ]);
    expect(circuit.min).toBe(0);
    expect(circuit.max).toBeCloseTo(79.4036, 4);
    expect(rack.min).toBeCloseTo(35, 9);
    expect(rack.max).toBeCloseTo(44.4036, 4);
    expect(server.min).toBeCloseTo(39.0668 - 0.15, 4);
    expect(server.max).toBeCloseTo(40.3368 + 0.15, 4);
  });

  test('each view’s y ranges hold every value drawn inside it', () => {
    for (const view of PROFILE_VIEWS) {
      const x = viewXDomain(PATH, view.id);
      const { v, p } = viewYDomains(data, x);
      const inside = data.points.filter((point) => point.x >= x.min && point.x <= x.max);

      expect(v.min, view.id).toBe(0);
      for (const point of inside) {
        expect(point.v, view.id).toBeLessThanOrEqual(v.max);
        expect(point.pReal / KPA, view.id).toBeGreaterThanOrEqual(p.min);
        expect(point.pIdeal / KPA, view.id).toBeLessThanOrEqual(p.max);
      }
    }
  });
});

describe('profileParameterIds: what the figure uses, all declared in tables 13.1 to 13.3', () => {
  test('every id is a row of the parameter tables', () => {
    const ids = profileParameterIds(PATH);

    expect(ids.length).toBeGreaterThan(25);
    for (const id of ids) expect(PARAMETER_ROWS[id], id).toBeDefined();
  });

  test('the ids follow the pieces of the path: no manifold, no manifold parameters', () => {
    const withoutManifold = PATH.filter((s) => sectionKind(s) !== 'manifold');

    expect(profileParameterIds(PATH)).toEqual(expect.arrayContaining(['manifold-dh', 'uqd-cv']));
    expect(profileParameterIds(withoutManifold)).not.toContain('manifold-dh');
  });

  test('sectionKind names every segment of the path and rejects an unknown one', () => {
    expect(new Set(PATH.map(sectionKind))).toEqual(
      new Set(['tuberia', 'manguera-rack', 'manifold', 'manguera-servidor', 'uqd', 'placa-fria']),
    );
    expect(() => sectionKind({ ...PATH[0], id: 'bomba' })).toThrow(RangeError);
  });
});

describe('viewNote: what each view shows, in numbers the code computes', () => {
  const plain = (text: string) => text.replace(/\s+/g, ' ');

  test('the circuit: 400,0 → 220,1 kPa, 1,80 bar, 89 % inside the server, Bernoulli back at 400,0', () => {
    expect(plain(viewNote(data, 'circuito'))).toBe(
      'Del CDU al servidor 24 y de vuelta, la presión baja de 400,0 a 220,1 kPa: 179,9 kPa, o 1,80 bar. El 89 % se pierde dentro del servidor. Sin pérdidas, Bernoulli volvería a 400,0 kPa.',
    );
  });

  test('the rack: ρgΔy over the 1,07 m of manifold, and v falling from port to port', () => {
    expect(plain(viewNote(data, 'rack'))).toBe(
      'Al subir 1,07 m por el manifold de impulsión, la presión baja $\\rho g \\Delta y$ = 10,6 kPa, que recupera al bajar por el de retorno. En el manifold, la velocidad baja de 1,84 a 0,08 m/s: cada puerto se lleva el caudal de un servidor.',
    );
  });

  test('the server: 2,8 kPa reversible in the UQD04 against its 15,1 kPa loss, 120,0 in the plate', () => {
    expect(plain(viewNote(data, 'servidor'))).toBe(
      'En la boca del UQD04 el líquido va a 2,91 m/s: Bernoulli baja la presión 2,8 kPa y la devuelve en la manguera, pero cada conector pierde 15,1 kPa. La placa fría pierde 120,0 kPa, el valor de diseño de GF. Dentro de la placa dibujo la velocidad de la manguera: su interior no es público.',
    );
  });
});
