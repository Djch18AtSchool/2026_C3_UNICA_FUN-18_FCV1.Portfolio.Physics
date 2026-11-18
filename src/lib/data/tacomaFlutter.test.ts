import { describe, expect, test } from 'vitest';
import { energyGrowthPerCycle } from '../physics/resonance';
import { TACOMA } from './bridges';
import {
  A2_PER_ZETA,
  FLUTTER_TABLE,
  FLUTTER_WINDS_MPH,
  tacomaNetDamping,
  type NetDamping,
} from './tacomaFlutter';

/** tacomaNetDamping at a wind the table covers, where it is never null. */
function netAt(windMph: number): NetDamping {
  const net = tacomaNetDamping(windMph);
  if (!net) throw new Error(`no A2* at ${windMph} mph`);
  return net;
}

describe('Billah and Scanlan (1991), Table I', () => {
  test('five rows: mechanical ζ, critical A2*, critical wind in mph, as printed', () => {
    expect(FLUTTER_TABLE.rows.map((row) => row.zeta)).toEqual([0.003, 0.005, 0.01, 0.015, 0.02]);
    expect(FLUTTER_TABLE.rows.map((row) => row.a2Critical)).toEqual([
      0.043, 0.072, 0.145, 0.217, 0.29,
    ]);
    expect(FLUTTER_TABLE.rows.map((row) => row.windMph)).toEqual([17, 18.6, 22.9, 27.4, 30.6]);
    expect(FLUTTER_TABLE.origin).toBe('producto');
    expect(FLUTTER_TABLE.source).toContain('Tabla I');
  });

  test('each critical A2* is 14,48 ζ (their eq. 6) to the table’s rounding', () => {
    expect(A2_PER_ZETA).toBe(14.48);
    FLUTTER_TABLE.rows.forEach(({ zeta, a2Critical }) => {
      expect(Math.abs(a2Critical - A2_PER_ZETA * zeta)).toBeLessThan(0.001);
    });
  });
});

describe('tacomaNetDamping (12.11), with ζ_s = 0,005', () => {
  test('at a wind of the table, A2* is the table’s and ζ_net = ζ_s − A2*/14,48', () => {
    const zetaS = TACOMA.torsionDampingRatio.value;
    FLUTTER_TABLE.rows.forEach(({ windMph, a2Critical }) => {
      const net = netAt(windMph);

      expect(net.a2).toBe(a2Critical);
      expect(net.zetaNet).toBeCloseTo(zetaS - a2Critical / A2_PER_ZETA, 12);
      expect(net.isExtrapolated).toBe(false);
    });
  });

  test('the critical wind for ζ_s = 0,005 is 18,6 mph: ζ_net ≈ 0 there, < 0 above', () => {
    expect(netAt(18.6).zetaNet).toBeCloseTo(0, 3);
    expect(netAt(17).zetaNet).toBeGreaterThan(0);
    expect(netAt(22.9).zetaNet).toBeCloseTo(-0.005, 4);
    expect(netAt(30.6).zetaNet).toBeCloseTo(-0.015, 4);
  });

  test('between rows it interpolates A2* linearly', () => {
    const net = netAt((22.9 + 27.4) / 2);

    expect(net.a2).toBeCloseTo((0.145 + 0.217) / 2, 12);
  });

  test('42 mph lies beyond the table: A2* ≈ 0,55 extrapolated from its last two points', () => {
    const net = netAt(TACOMA.windMph.value);

    expect(net.isExtrapolated).toBe(true);
    expect(net.a2).toBeCloseTo(0.29 + ((0.29 - 0.217) / (30.6 - 27.4)) * (42 - 30.6), 12);
    expect(net.a2).toBeCloseTo(0.55, 2);
    expect(net.zetaNet).toBeCloseTo(-0.033, 3);
  });

  test('exact energy per cycle at the research’s winds: +6,5, +13,4, +20,8 and ≈ +51 %', () => {
    const gains = [22.9, 27.4, 30.6, 42].map((u) => energyGrowthPerCycle(netAt(u).zetaNet));

    expect(gains[0]).toBeCloseTo(0.065, 3);
    expect(gains[1]).toBeCloseTo(0.134, 3);
    expect(gains[2]).toBeCloseTo(0.208, 3);
    expect(gains[3]).toBeCloseTo(0.514, 3);
  });

  test('below the first row the table gives no A2*: null, never a guess', () => {
    expect(tacomaNetDamping(10)).toBeNull();
    expect(tacomaNetDamping(16.99)).toBeNull();
  });

  test('the winds the page tabulates are the five rows and the 42 mph of 7 November', () => {
    expect(FLUTTER_WINDS_MPH).toEqual([17, 18.6, 22.9, 27.4, 30.6, 42]);
  });

  test('rejects a wind that is not a finite non-negative number', () => {
    expect(() => tacomaNetDamping(-1)).toThrow(RangeError);
    expect(() => tacomaNetDamping(Number.NaN)).toThrow(RangeError);
  });
});
