import { formatNumber } from '../format';
import type { RegenParams } from './energy';

const W_PER_KW = 1000;

/**
 * The regenerative model in words, from its parameters (never typed by hand), with KaTeX inline
 * between `$…$`: e.g. "$\\eta$ = 0,80, $P_\\text{máx}$ = 239 kW, con $f(v)$". Tema 6's captions,
 * tables and figure titles use it.
 */
export function regenModelText({ eta, pMax, lowSpeedFade }: RegenParams): string {
  const efficiency = formatNumber(eta, { precision: 2 });
  const limit = formatNumber(pMax / W_PER_KW, { precision: 0, unit: 'kW' });
  return `$\\eta$ = ${efficiency}, $P_\\text{máx}$ = ${limit}, ${lowSpeedFade ? 'con' : 'sin'} $f(v)$`;
}
