import { formatNumber } from '../format';
import type { RegenParams } from './energy';

const W_PER_KW = 1000;

/**
 * The regenerative model in words, from its parameters (never typed by hand): e.g.
 * "η = 0,80, P_máx = 239 kW, con f(v)". Tema 6's captions, tables and figure titles use it.
 */
export function regenModelText({ eta, pMax, lowSpeedFade }: RegenParams): string {
  const efficiency = formatNumber(eta, { precision: 2 });
  const limit = formatNumber(pMax / W_PER_KW, { precision: 0, unit: 'kW' });
  return `η = ${efficiency}, P_máx = ${limit}, ${lowSpeedFade ? 'con' : 'sin'} f(v)`;
}
