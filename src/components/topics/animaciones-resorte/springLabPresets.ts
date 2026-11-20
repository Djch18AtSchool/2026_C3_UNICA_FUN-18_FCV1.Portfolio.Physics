/**
 * The presets of Tema 10's laboratory: the five of src/lib/data/springPresets.ts (four products'
 * own values and one illustrative assumption), each option saying which it is, with a one-sentence
 * note whose numbers the core computes (cálculo propio) and the data module's source.
 */
import { APPLE_FORWARD_EXAMPLE } from '../../../lib/data/springReferences';
import { SPRING_PRESETS, type SpringPreset } from '../../../lib/data/springPresets';
import { formatNumber } from '../../../lib/format';
import {
  dampingRatio,
  dampingRegime,
  overshootRatio,
  settlingTime,
  type SpringParams,
} from '../../../lib/physics/dampedSpring';
import type { Preset } from '../../../lib/presets';
import { PRESET_NAMES } from '../../../lib/tables/topics/animaciones-resorte';
import { BAND_EPSILON } from './springPlots';

/** The sliders' ranges: k in N/m, b in N·s/m, m in kg. */
export const SPRING_LIMITS = {
  k: [10, 1000],
  b: [0, 100],
  m: [0.1, 5],
} as const satisfies Record<keyof SpringParams, readonly [number, number]>;
/** The grid of all three sliders: Apple's printed values, 157,9 and 17,6, sit on it. */
export const PARAM_STEP = 0.1;
const GRID_DECIMALS = 1;
export const DEFAULT_PRESET_ID = 'motion-defecto';

const PERCENT = 100;
const MOTION_TAG = 'https://github.com/motiondivision/motion/blob/v14.14.0/packages/motion-dom/src';
/** Where each product's value can be read; the illustrative preset has no page. */
const SOURCE_URLS: Readonly<Record<string, string>> = {
  'motion-defecto': `${MOTION_TAG}/animation/generators/spring.ts#L22-L24`,
  'motion-xy': `${MOTION_TAG}/animation/utils/default-transitions.ts#L4-L18`,
  'motion-escala-cero': `${MOTION_TAG}/animation/utils/default-transitions.ts#L4-L18`,
  'apple-ejemplo': 'https://developer.apple.com/documentation/swiftui/spring',
};

/**
 * A shorter plain name for the select than the data module's label: a native <select> is as wide
 * as its longest option, and with the text at 200 % (WCAG 1.4.4) «Apple, ejemplo de la
 * documentación (producto)» ran past the card. The full name stays in the note line and the table.
 */
const OPTION_LABELS: Readonly<Record<string, string>> = {
  'apple-ejemplo': 'Apple, ejemplo',
};

const comma = (value: number, decimals: number) => formatNumber(value, { precision: decimals });
/** ζ with two decimals, or a whole number as it is (2, not 2,00). */
const zetaText = (params: SpringParams) => {
  const zeta = dampingRatio(params);
  return comma(zeta, Number.isInteger(zeta) ? 0 : 2);
};
const overshootText = (params: SpringParams) =>
  formatNumber(overshootRatio(dampingRatio(params)) * PERCENT, { precision: 2, unit: '%' });
/** The 2 % settling time of a step from rest: the band is a share of any travel. */
const settleText = (params: SpringParams) =>
  formatNumber(settlingTime(params, -1, 0, BAND_EPSILON), { precision: 2, unit: 's' });

const onGrid = (value: number) =>
  Number((Math.round(value / PARAM_STEP) * PARAM_STEP).toFixed(GRID_DECIMALS));

/**
 * A preset's values on the sliders' 0,1 grid, so the number boxes show at most one decimal; kept
 * exact when the grid would change the regime the preset is about (b = 2√550 is critical, its
 * nearest grid value is not).
 */
export function labValues(params: SpringParams): SpringParams {
  const rounded = { k: onGrid(params.k), b: onGrid(params.b), m: onGrid(params.m) };
  return dampingRegime(rounded) === dampingRegime(params) ? rounded : params;
}

/** One sentence per preset: what it teaches, with the core's numbers. */
function presetNote({ id, params }: SpringPreset): string {
  const { duration, bounce, published } = APPLE_FORWARD_EXAMPLE;
  const notes: Readonly<Record<string, string>> = {
    'motion-defecto': `El generador de Motion sin opciones: $\\zeta$ = ${zetaText(params)}, y la tarjeta se pasa un ${overshootText(params)} del recorrido antes de volver.`,
    'motion-xy': `La transición que Motion da a una traslación sin opciones propias: $\\zeta$ = ${zetaText(params)}, con un sobrepaso del ${overshootText(params)}.`,
    'motion-escala-cero':
      'El crítico exacto, $b = 2\\sqrt{k m}$, que Motion usa cuando la escala va a 0 para que no se vuelva negativa.',
    'apple-ejemplo': `La (10.10) con $d$ = ${comma(duration, 1)} s y $\\beta$ = ${comma(bounce, 1)} da los ${comma(published.k, 1)} N/m y ${comma(published.b, 1)} N·s/m que imprime Apple: $\\zeta$ = ${zetaText(labValues(params))}.`,
    sobreamortiguado: `El doble del amortiguamiento crítico, $\\zeta$ = ${zetaText(params)}: llega sin pasarse, pero tarda ${settleText(params)} en asentarse al 2 %.`,
  };
  return notes[id];
}

function toLabPreset(preset: SpringPreset): Preset<SpringParams> {
  const origin = ` (${preset.origin})`;
  return {
    id: preset.id,
    name: `${PRESET_NAMES[preset.id] ?? preset.label}${origin}`,
    optionLabel: `${OPTION_LABELS[preset.id] ?? preset.label}${origin}`,
    values: labValues(preset.params),
    note: presetNote(preset),
    sourceLabel: preset.source,
    sourceUrl: SOURCE_URLS[preset.id],
  };
}

export const SPRING_LAB_PRESETS: readonly Preset<SpringParams>[] = SPRING_PRESETS.map(toLabPreset);
