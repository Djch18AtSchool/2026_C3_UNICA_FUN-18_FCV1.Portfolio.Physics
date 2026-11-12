import { describe, expect, test } from 'vitest';
import {
  requireScaleUnits,
  SCALE_BAR_MAX_PX,
  SCALE_BAR_MIN_PX,
  scaleBarLength,
  scaleBarSpoken,
} from './scaleBarMath';

const NNBSP = ' ';
const KM = [{ label: 'km', size: 1 }];
const METRES_AND_KM = [
  { label: 'm', size: 1 },
  { label: 'km', size: 1000 },
];

describe('scaleBarLength', () => {
  test('picks a round 1·2·5 × 10ⁿ length that measures 64 to 160 px', () => {
    // 0,25 px per km: 160 px are 640 km, so 500 km (125 px).
    expect(scaleBarLength(0.25, KM)).toEqual({ value: 500, px: 125, text: `500${NNBSP}km` });
  });

  test.each([0.0007, 0.013, 0.2, 1, 3.3, 47, 160, 999, 12_345])(
    'at %f px per unit the bar is round and between 64 and 160 px',
    (pxPerUnit) => {
      const bar = scaleBarLength(pxPerUnit, KM)!;
      const mantissa = bar.value / 10 ** Math.floor(Math.log10(bar.value));

      expect(bar.px).toBeGreaterThanOrEqual(SCALE_BAR_MIN_PX - 1e-9);
      expect(bar.px).toBeLessThanOrEqual(SCALE_BAR_MAX_PX + 1e-9);
      expect([1, 2, 5]).toContain(Number(mantissa.toPrecision(6)));
    },
  );

  test('a length that lands exactly on 160 px is taken', () => {
    expect(scaleBarLength(1.6, KM)).toEqual({ value: 100, px: 160, text: `100${NNBSP}km` });
  });

  test('thousands with the site’s thin space: «1 000 km»', () => {
    expect(scaleBarLength(0.15, KM)?.text).toBe(`1${NNBSP}000${NNBSP}km`);
  });

  test('decimals with a comma below one unit: «0,5 km», «0,02 km»', () => {
    expect(scaleBarLength(300, KM)?.text).toBe(`0,5${NNBSP}km`);
    expect(scaleBarLength(5000, KM)?.text).toBe(`0,02${NNBSP}km`);
  });

  test('a unit with math is kept between $…$ for InlineMath: «1 $R_J$»', () => {
    expect(scaleBarLength(100, [{ label: '$R_J$', size: 1 }])?.text).toBe(`1${NNBSP}$R_J$`);
  });

  test('with a ladder of units, the largest one the length reaches: «500 m», then «2 km»', () => {
    expect(scaleBarLength(0.25, METRES_AND_KM)?.text).toBe(`500${NNBSP}m`);
    expect(scaleBarLength(0.05, METRES_AND_KM)?.text).toBe(`2${NNBSP}km`);
    expect(scaleBarLength(0.125, METRES_AND_KM)?.text).toBe(`1${NNBSP}km`);
  });

  test('below the smallest unit of the ladder it keeps that unit, with decimals', () => {
    expect(scaleBarLength(500, METRES_AND_KM)?.text).toBe(`0,2${NNBSP}m`);
  });

  test.each([0, -1, Number.NaN, Infinity])('draws nothing at %f px per unit', (pxPerUnit) => {
    expect(scaleBarLength(pxPerUnit, KM)).toBeUndefined();
  });
});

describe('scaleBarLength with a ladder that is not decimal (km, then R_J = 71 492 km)', () => {
  const KM_AND_JUPITER = [
    { label: 'km', size: 1 },
    { label: '$R_J$', size: 71_492 },
  ];

  test.each([0.0012, 0.0008, 0.0002, 0.00003, 0.003, 0.02])(
    'at %f px per km the bar is a round count of its unit, exactly as long as it says',
    (pxPerUnit) => {
      const bar = scaleBarLength(pxPerUnit, KM_AND_JUPITER)!;
      const unit = KM_AND_JUPITER.find((candidate) => bar.text.endsWith(candidate.label))!;
      const mantissa = bar.value / 10 ** Math.floor(Math.log10(bar.value));

      expect(bar.px / pxPerUnit / unit.size).toBeCloseTo(bar.value, 9);
      expect([1, 2, 5]).toContain(Number(mantissa.toPrecision(6)));
      expect(bar.px).toBeGreaterThanOrEqual(SCALE_BAR_MIN_PX - 1e-9);
      expect(bar.px).toBeLessThanOrEqual(SCALE_BAR_MAX_PX + 1e-9);
    },
  );

  test('«1 $R_J$» once a whole radius fits; below that, kilometres', () => {
    expect(scaleBarLength(0.0012, KM_AND_JUPITER)?.text).toBe(`1${NNBSP}$R_J$`);
    expect(scaleBarLength(0.0008, KM_AND_JUPITER)?.text).toBe(`2${NNBSP}$R_J$`);
    expect(scaleBarLength(0.003, KM_AND_JUPITER)?.text).toBe(`50${NNBSP}000${NNBSP}km`);
  });
});

describe('requireScaleUnits', () => {
  test('accepts a ladder from small to large with positive sizes', () => {
    expect(() => requireScaleUnits(METRES_AND_KM)).not.toThrow();
  });

  test.each([
    ['an empty ladder', []],
    ['a size of zero', [{ label: 'm', size: 0 }]],
    ['sizes out of order', [...METRES_AND_KM, { label: 'hm', size: 100 }]],
    ['an empty label', [{ label: '', size: 1 }]],
    ['no base unit of size 1 (what pxPerUnit counts)', [{ label: 'km', size: 1000 }]],
  ])('throws with %s, naming the fix', (_name, units) => {
    expect(() => requireScaleUnits(units)).toThrow(/ScaleBar/u);
  });

  test('a unit with a subscript outside $…$ throws: it would print «R_J»', () => {
    expect(() => requireScaleUnits([{ label: 'R_J', size: 1 }])).toThrow(/\$…\$/u);
  });
});

describe('scaleBarSpoken', () => {
  test('says the length with the unit in words', () => {
    expect(scaleBarSpoken(`1${NNBSP}000${NNBSP}km`)).toBe(
      `Barra de escala: 1${NNBSP}000${NNBSP}km`,
    );
    expect(scaleBarSpoken(`1${NNBSP}$R_J$`)).toBe(`Barra de escala: 1${NNBSP}R sub J`);
  });
});
