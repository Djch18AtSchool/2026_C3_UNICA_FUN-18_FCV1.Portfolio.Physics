import { describe, expect, test } from 'vitest';
import { PA_PER_BAR, seriesLoss } from '../physics/hydraulics';
import { GF_PUBLISHED, PG25_40C } from './liquidCooling';
import { lossBreakdown, BREAKDOWN_ROWS } from './liquidCoolingBreakdown';
import { PRESETS, rackPath, serverFlow } from './liquidCoolingCircuit';

/*
 * The comparison of research §7.1 («Comparación con el desglose de GF», with the errata of
 * 2026-11-17): my losses to the farthest server, grouped as GF's fig. 2 groups them.
 */

const REFERENCE = PRESETS.referencia24;
const KPA = 1e3;
const breakdown = lossBreakdown(rackPath(REFERENCE), serverFlow(REFERENCE), PG25_40C);
const computed = (id: string) => breakdown.find((row) => row.id === id)?.computed ?? Number.NaN;

describe('lossBreakdown: the RD109 path to the farthest server, as GF groups its losses', () => {
  test('cold plates 120 kPa, small UQDs 30,2 kPa (2 × 15,1), 3/8″ hoses 4,6 kPa', () => {
    expect(computed('placas-frias') / KPA).toBeCloseTo(120, 6);
    expect(computed('qd-pequenos') / KPA).toBeCloseTo(30.22, 2);
    expect(computed('mangueras') / KPA).toBeCloseTo(4.56, 2);
  });

  test('fittings (the four tees) 8,9 kPa, manifolds 0,9 kPa, main pipes 12,8 kPa', () => {
    expect(computed('accesorios') / PA_PER_BAR).toBeCloseTo(0.089, 3);
    expect(computed('manifolds') / PA_PER_BAR).toBeCloseTo(0.009, 3);
    expect(computed('tuberias') / PA_PER_BAR).toBeCloseTo(0.128, 3);
  });

  test('the rack hoses’ friction, 2,48 kPa, has its own row: GF’s fig. 2 has none for it', () => {
    expect(computed('mangueras-rack') / KPA).toBeCloseTo(2.48, 2);
    expect(breakdown.find((row) => row.id === 'mangueras-rack')?.published).toBeNull();
  });

  test('the big QD and the butterfly valves are GF’s only: I do not model them', () => {
    for (const id of ['qd-grande', 'valvulas']) {
      const row = breakdown.find((candidate) => candidate.id === id);
      expect(row?.computed, id).toBeNull();
      expect(row?.published, id).toBeGreaterThan(0);
    }
  });

  test('the rows add up to the whole path’s loss, 1,799 bar, and GF’s to its 1,98 bar', () => {
    const mine = breakdown.reduce((sum, row) => sum + (row.computed ?? 0), 0);
    const theirs = breakdown.reduce((sum, row) => sum + (row.published ?? 0), 0);

    expect(mine).toBeCloseTo(seriesLoss(rackPath(REFERENCE), serverFlow(REFERENCE), PG25_40C), 6);
    expect(mine / PA_PER_BAR).toBeCloseTo(1.799, 3);
    expect(theirs).toBeCloseTo(GF_PUBLISHED.totalDrop.value, 6);
  });

  test('GF’s published values are copied from fig. 2, in its order, with mine in between', () => {
    const published = Object.fromEntries(GF_PUBLISHED.breakdown.map((row) => [row.id, row.dp]));

    expect(breakdown.map((row) => row.id)).toEqual(BREAKDOWN_ROWS.map((row) => row.id));
    for (const row of breakdown.filter((candidate) => candidate.published !== null)) {
      expect(row.published, row.id).toBe(published[row.id]);
    }
  });

  test('a path without a cold plate leaves its row at zero, never undefined', () => {
    const noPlate = rackPath(REFERENCE).filter((segment) => segment.id !== 'placa-fria');

    const rows = lossBreakdown(noPlate, serverFlow(REFERENCE), PG25_40C);

    expect(rows.find((row) => row.id === 'placas-frias')?.computed).toBe(0);
  });

  test('a segment it cannot place is an error, not a silent zero', () => {
    const odd = [{ ...rackPath(REFERENCE)[0], id: 'bomba' }];

    expect(() => lossBreakdown(odd, serverFlow(REFERENCE), PG25_40C)).toThrow(RangeError);
  });
});
