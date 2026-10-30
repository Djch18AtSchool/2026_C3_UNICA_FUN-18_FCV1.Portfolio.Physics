import { describe, expect, test } from 'vitest';
import { formatNumber } from '../format';
import { DEFAULT_REGEN } from './energy';
import { regenModelText } from './regenModelText';

describe('regenModelText', () => {
  test('names η, P_máx and the fade from the parameters it is given', () => {
    const text = regenModelText(DEFAULT_REGEN);

    expect(text).toContain(`η = ${formatNumber(DEFAULT_REGEN.eta, { precision: 2 })}`);
    expect(text).toContain(
      `P_máx = ${formatNumber(DEFAULT_REGEN.pMax / 1000, { precision: 0, unit: 'kW' })}`,
    );
    expect(text).toContain(DEFAULT_REGEN.lowSpeedFade ? 'con f(v)' : 'sin f(v)');
  });

  test('says "sin f(v)" without the fade and follows other values', () => {
    expect(regenModelText({ eta: 0.7, pMax: 10_000, lowSpeedFade: false })).toBe(
      'η = 0,70, P_máx = 10 kW, sin f(v)',
    );
    expect(regenModelText({ eta: 0.875, pMax: 0, lowSpeedFade: true })).toBe(
      'η = 0,88, P_máx = 0 kW, con f(v)',
    );
  });
});
