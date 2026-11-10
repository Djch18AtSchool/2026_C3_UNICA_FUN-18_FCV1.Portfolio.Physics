import { describe, expect, test } from 'vitest';
import { formatNumber } from '../format';
import { DEFAULT_REGEN } from './energy';
import { regenModelText } from './regenModelText';

describe('regenModelText', () => {
  test('names η, P_máx and the fade from the parameters it is given, as KaTeX', () => {
    const text = regenModelText(DEFAULT_REGEN);

    expect(text).toContain(`$\\eta$ = ${formatNumber(DEFAULT_REGEN.eta, { precision: 2 })}`);
    expect(text).toContain(
      `$P_\\text{máx}$ = ${formatNumber(DEFAULT_REGEN.pMax / 1000, { precision: 0, unit: 'kW' })}`,
    );
    expect(text).toContain(DEFAULT_REGEN.lowSpeedFade ? 'con $f(v)$' : 'sin $f(v)$');
  });

  test('says "sin f(v)" without the fade and follows other values', () => {
    expect(regenModelText({ eta: 0.7, pMax: 10_000, lowSpeedFade: false })).toBe(
      '$\\eta$ = 0,70, $P_\\text{máx}$ = 10 kW, sin $f(v)$',
    );
    expect(regenModelText({ eta: 0.875, pMax: 0, lowSpeedFade: true })).toBe(
      '$\\eta$ = 0,88, $P_\\text{máx}$ = 0 kW, con $f(v)$',
    );
  });
});
