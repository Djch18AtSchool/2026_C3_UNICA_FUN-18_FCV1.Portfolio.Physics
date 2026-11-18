/*
 * The torsional flutter of the Tacoma Narrows Bridge: Billah and Scanlan (1991), Table I, «OTN
 * flutter conditions as a function of mechanical damping» (pág. 123, CONFIRMADO in
 * docs/superpowers/research/2026-11-17-resonancia-estructural.md §3.1 and §4). Each row is the wind
 * at which the aerodynamic A2* reaches 14,48 ζ (their eq. 6) for that mechanical ζ; read the other
 * way, it is A2*(U), and (12.11) gives the net damping of the real bridge, ζ_net = ζ_s − A2* / 14,48,
 * with ζ_s = 0,005 (pág. 123).
 */
import { requireNonNegative } from '../physics/validate';
import { TACOMA, type ValueOrigin } from './bridges';

export interface FlutterRow {
  /** Mechanical damping ratio ζ_α. */
  zeta: number;
  /** (A2*)crit = 2Iζ/ρB⁴. */
  a2Critical: number;
  /** U_crit, mph. */
  windMph: number;
}

/** Eq. (6) with the Tacoma deck: (A2*)crit = 2Iζ/(ρB⁴) = 14,48 ζ. */
export const A2_PER_ZETA = 14.48;

export const FLUTTER_TABLE: {
  rows: readonly FlutterRow[];
  origin: ValueOrigin;
  source: string;
} = {
  rows: [
    { zeta: 0.003, a2Critical: 0.043, windMph: 17 },
    { zeta: 0.005, a2Critical: 0.072, windMph: 18.6 },
    { zeta: 0.01, a2Critical: 0.145, windMph: 22.9 },
    { zeta: 0.015, a2Critical: 0.217, windMph: 27.4 },
    { zeta: 0.02, a2Critical: 0.29, windMph: 30.6 },
  ],
  origin: 'producto',
  source: 'Billah y Scanlan, Am. J. Phys. 59(2), 118-124 (1991), Tabla I y ec. (6), pág. 123',
};

/** The winds the page tabulates: the five rows and the 42 mph of 7 November 1940. */
export const FLUTTER_WINDS_MPH: readonly number[] = [
  ...FLUTTER_TABLE.rows.map((row) => row.windMph),
  TACOMA.windMph.value,
];

export interface NetDamping {
  /** A2*(U): read from the table, interpolated, or extrapolated past its last row. */
  a2: number;
  /** (12.11): ζ_s − A2* / 14,48. Negative: the wind feeds the torsion. */
  zetaNet: number;
  /** Beyond the table's last wind (30,6 mph): a straight line through its last two rows. */
  isExtrapolated: boolean;
}

/** The value of y on the straight line through (x0, y0) and (x1, y1) at x. */
const onLine = (x0: number, y0: number, x1: number, y1: number, x: number) =>
  y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);

/**
 * A2*(U) piecewise linear between the rows of Table I, extended past its last row along its last
 * segment; null below the first row, where the table gives nothing (Billah and Scanlan's figure 4
 * suggests A2* < 0 there, but reading a figure is not a datum).
 */
function aerodynamicA2(windMph: number): { a2: number; isExtrapolated: boolean } | null {
  const { rows } = FLUTTER_TABLE;
  if (windMph < rows[0].windMph) return null;
  const upper = rows.findIndex((row) => row.windMph >= windMph);
  if (upper === -1) {
    const [before, last] = rows.slice(-2);
    const a2 = onLine(before.windMph, before.a2Critical, last.windMph, last.a2Critical, windMph);
    return { a2, isExtrapolated: true };
  }
  const exact = rows[upper];
  if (exact.windMph === windMph) return { a2: exact.a2Critical, isExtrapolated: false };
  const lower = rows[upper - 1];
  const a2 = onLine(lower.windMph, lower.a2Critical, exact.windMph, exact.a2Critical, windMph);
  return { a2, isExtrapolated: false };
}

/** (12.11) for the Tacoma torsion at a wind of `windMph`; null below 17,0 mph (no data). */
export function tacomaNetDamping(windMph: number): NetDamping | null {
  requireNonNegative('windMph', windMph);
  const read = aerodynamicA2(windMph);
  if (!read) return null;
  return {
    a2: read.a2,
    zetaNet: TACOMA.torsionDampingRatio.value - read.a2 / A2_PER_ZETA,
    isExtrapolated: read.isExtrapolated,
  };
}
