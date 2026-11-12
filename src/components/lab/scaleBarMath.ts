/**
 * The length a scale bar shows (ScaleBar, auditoría §8 and §12.3): a round 1 · 2 · 5 × 10ⁿ of the
 * drawing's unit that measures 64 to 160 px at the current zoom, written the site's way («1 000
 * km», «0,5 km», «1 $R_J$»). Since consecutive round lengths are at most 2,5 times apart, and
 * 160 / 64 = 2,5, one always fits. No React.
 */
import { formatNumber } from '../../lib/format';
import { inlineMathToSpeech, splitInlineMath } from '../../lib/inlineMath';
import { rawNotationMarks } from '../../lib/typography';

/**
 * One unit of a ladder: its label (words, formulas between $…$) and its size in base units. The
 * first unit is the base (size 1, the one pxPerUnit counts); the ratios need not be powers of 10.
 */
export interface ScaleUnit {
  readonly label: string;
  readonly size: number;
}

export interface ScaleBarLength {
  /** The length in the unit it is written in. */
  readonly value: number;
  /** The bar's length on screen, CSS px. */
  readonly px: number;
  /** «1 000 km», «1 $R_J$»: number and unit with U+202F between, formulas between $…$. */
  readonly text: string;
}

export const SCALE_BAR_MIN_PX = 64;
export const SCALE_BAR_MAX_PX = 160;
const MANTISSAS = [5, 2, 1] as const;
const DECADE = 10;
/** A length within this share of the maximum still fits (floating-point noise). */
const FIT_SLACK = 1e-9;

/** Fails fast with the fix: units from small to large, positive sizes, formulas between $…$. */
export function requireScaleUnits(units: readonly ScaleUnit[]): void {
  if (units.length === 0) throw new RangeError('ScaleBar: hace falta al menos una unidad.');
  units.forEach((unit, index) => {
    if (unit.label.trim() === '') throw new RangeError('ScaleBar: una unidad sin nombre.');
    if (!(Number.isFinite(unit.size) && unit.size > 0)) {
      throw new RangeError(`ScaleBar: la unidad «${unit.label}» necesita un tamaño positivo.`);
    }
    if (index === 0 && unit.size !== 1) {
      throw new RangeError(
        `ScaleBar: la primera unidad («${unit.label}») es la que cuenta pxPerUnit y mide 1.`,
      );
    }
    if (index > 0 && unit.size <= units[index - 1].size) {
      throw new RangeError('ScaleBar: las unidades van de la menor a la mayor.');
    }
    const raw = splitInlineMath(unit.label)
      .filter((segment) => segment.kind === 'text')
      .flatMap((segment) => rawNotationMarks(segment.text));
    if (raw.length > 0) {
      throw new RangeError(
        `ScaleBar: la unidad «${unit.label}» tiene ${raw.join(' ')} fuera de $…$; escribe la fórmula entre $…$ (p. ej. $R_J$).`,
      );
    }
  });
}

/** m × 10^k, divided rather than multiplied for k < 0, so 0,2 is 2 / 10 and not 2 × 0,1. */
const roundLength = (mantissa: number, exponent: number) =>
  exponent >= 0 ? mantissa * DECADE ** exponent : mantissa / DECADE ** -exponent;

/**
 * The largest round length (base units) whose bar fits in `maxPx`. 10^⌊log₁₀ longest⌋ always
 * fits; the decade above is tried too in case log10 rounds an exact power down.
 */
function largestRoundLength(pxPerUnit: number, maxPx: number): number {
  const longest = (maxPx * (1 + FIT_SLACK)) / pxPerUnit;
  const exponent = Math.floor(Math.log10(longest));
  const candidates = [exponent + 1, exponent].flatMap((k) =>
    MANTISSAS.map((m) => roundLength(m, k)),
  );
  return candidates.find((length) => length <= longest) ?? roundLength(1, exponent);
}

/** Decimals that write a round length exactly: 0 from 1 up, one per decade below. */
const decimalsFor = (value: number) => Math.max(0, -Math.floor(Math.log10(value)));

/**
 * The bar for `pxPerUnit` CSS px per base unit (the lab's own scale times the zoom). The round
 * length is sought in each unit of the ladder, from the largest down: the first unit in which a
 * whole round count (1, 2, 5, 10…) fits is the one written, so a ladder need not be decimal (km
 * then $R_J$ reads «1 $R_J$», never 1,4 radii rounded to «1»). The base unit takes any round
 * length, below one too («0,5 km»). The bar is at most `maxPx` long (SCALE_BAR_MAX_PX by default;
 * a narrow canvas asks for less so the bar clears what is drawn beside it) and, the 1·2·5 steps
 * being at most 2,5 apart, at least `maxPx` / 2,5. Undefined when the scale is not a positive
 * finite number; a `maxPx` under SCALE_BAR_MIN_PX is a programming error.
 */
export function scaleBarLength(
  pxPerUnit: number,
  units: readonly ScaleUnit[],
  maxPx: number = SCALE_BAR_MAX_PX,
): ScaleBarLength | undefined {
  if (!(Number.isFinite(maxPx) && maxPx >= SCALE_BAR_MIN_PX)) {
    throw new RangeError(
      `ScaleBar: maxPx (${maxPx}) debe ser un número finito de al menos ${SCALE_BAR_MIN_PX} px.`,
    );
  }
  if (!(Number.isFinite(pxPerUnit) && pxPerUnit > 0)) return undefined;
  const lengths = [...units].reverse().map((unit) => ({
    unit,
    value: largestRoundLength(pxPerUnit * unit.size, maxPx),
  }));
  const { unit, value } =
    lengths.find((candidate) => candidate.value >= 1) ?? lengths[lengths.length - 1];
  const text = formatNumber(value, { precision: decimalsFor(value), unit: unit.label });
  return { value, px: value * unit.size * pxPerUnit, text };
}

/** «Barra de escala: 1 000 km», a formula said in words («1 R sub J»). */
export function scaleBarSpoken(text: string): string {
  return `Barra de escala: ${inlineMathToSpeech(text)}`;
}
