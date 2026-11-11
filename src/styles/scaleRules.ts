/**
 * The site's measurement scale (plan C, audit §6.2; root and reading size 16 px, Dylan
 * 2026-11-10) and how each kind of length is judged against it. scaleScan.ts finds the lengths;
 * this module only says whether one is on the scale.
 *
 * - spacing (margins, paddings, gaps, offsets): 0 · 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 px.
 * - size (widths, heights, grid tracks): the spacing scale, 20 (icons), 40 and 44 (icon buttons
 *   and controls) and, past 64, multiples of 4 rem (64 px).
 * - text: 12 · 14 · 16 · 18 · 20 · 24 · 36 px; leading: the line heights Tailwind pairs with them
 *   (16 · 20 · 24 · 28 · 32 · 40 px); a unitless line height is out of scope.
 * - radius: 4 and 8 (and 0 or full); border: 1 and 2 (and 0).
 * - A raw 1px or 2px (a hairline: a rule's thickness, a nudge past a border) passes as spacing or
 *   size; Tailwind's own half step (`gap-0.5`) does not, except a 2 px-thick `w-0.5`/`h-0.5`.
 * - em counts against the 16 px body; a font-size percentage too (the root's 106.25 % was 17 px).
 *   ch, vw, vh, dvh, cqw, fr and other percentages are relative and out of scope.
 */
export type ScaleRule = 'spacing' | 'size' | 'text' | 'leading' | 'radius' | 'border';

export const ROOT_PX = 16;
/** Tailwind's --spacing (0.25rem): `p-3` is 3 steps. */
export const TAILWIND_STEP_PX = 4;
export const SPACING_PX = [0, 4, 8, 12, 16, 24, 32, 48, 64] as const;
export const HAIRLINE_PX = [1, 2] as const;
export const ICON_PX = 20;
export const CONTROL_PX = [40, 44] as const;
/** Past the spacing scale, widths and heights go in steps of 4 rem. */
export const WIDE_STEP_PX = 64;
export const TEXT_PX = [12, 14, 16, 18, 20, 24, 36] as const;
export const LEADING_PX = [16, 20, 24, 28, 32, 40] as const;
export const RADIUS_PX = [0, 4, 8] as const;
/** `rounded-full` and `border-radius: 9999px`. */
export const FULL_RADIUS_PX = 9999;
export const BORDER_PX = [0, 1, 2] as const;

const EPSILON = 1e-6;
const PERCENT = 100;

function isAmong(list: readonly number[], px: number): boolean {
  return list.some((value) => Math.abs(value - px) < EPSILON);
}

function isWideStep(px: number): boolean {
  const steps = px / WIDE_STEP_PX;
  return px > WIDE_STEP_PX && Math.abs(steps - Math.round(steps)) < EPSILON;
}

/**
 * Whether `px` is on the scale for `rule`. `hairline`: the length was written as a raw 1px/2px
 * (or Tailwind's `px`), not as a Tailwind step.
 */
export function isOnScale(rule: ScaleRule, px: number, hairline: boolean): boolean {
  const size = Math.abs(px);
  const thin = hairline && isAmong(HAIRLINE_PX, size);
  switch (rule) {
    case 'spacing':
      return isAmong(SPACING_PX, size) || thin;
    case 'size':
      return (
        isAmong(SPACING_PX, size) ||
        isAmong([ICON_PX, ...CONTROL_PX], size) ||
        thin ||
        isWideStep(size)
      );
    case 'text':
      return isAmong(TEXT_PX, size);
    case 'leading':
      return isAmong(LEADING_PX, size);
    case 'radius':
      return isAmong(RADIUS_PX, size) || size >= FULL_RADIUS_PX;
    case 'border':
      return isAmong(BORDER_PX, size);
  }
}

export interface LengthLiteral {
  /** The literal as written (`0.35em`). */
  text: string;
  px: number;
}

const LENGTH = /(?<![\w.#])(-?(?:\d+\.?\d*|\.\d+))(px|rem|em|%)(?![\w-])/g;

/**
 * The px/rem/em lengths written in a CSS value (and, for text, its percentages), in pixels at the
 * 16 px root and body. Relative units (ch, vw, cqw, fr, other %) are left out.
 */
export function lengthLiterals(value: string, rule: ScaleRule): LengthLiteral[] {
  const literals: LengthLiteral[] = [];
  for (const [text, amount, unit] of value.matchAll(LENGTH)) {
    const number = Number(amount);
    if (unit === 'px') literals.push({ text, px: number });
    else if (unit === '%') {
      if (rule === 'text') literals.push({ text, px: (number / PERCENT) * ROOT_PX });
    } else literals.push({ text, px: number * ROOT_PX });
  }
  return literals;
}

const CSS_PROPERTY_RULES: readonly (readonly [RegExp, ScaleRule])[] = [
  [/^border(-[a-z]+)*-radius$/, 'radius'],
  [/^(margin|padding|scroll-margin|scroll-padding|inset)(-[a-z]+)*$/, 'spacing'],
  [
    /^(top|right|bottom|left|gap|row-gap|column-gap|text-indent|background-position|box-shadow)$/,
    'spacing',
  ],
  [/^((min|max)-)?(width|height|inline-size|block-size)$/, 'size'],
  [
    /^(flex-basis|grid-template-columns|grid-template-rows|grid-auto-columns|grid-auto-rows|background-size|column-width)$/,
    'size',
  ],
  [/^font-size$/, 'text'],
  [/^line-height$/, 'leading'],
  [
    /^(border|outline|column-rule)(-(top|right|bottom|left|block|inline|start|end|width|offset))*$/,
    'border',
  ],
];

const CUSTOM_PROPERTY_RULES: readonly (readonly [RegExp, ScaleRule])[] = [
  [/radius/, 'radius'],
  [/^--(text|font-size)(-|$)/, 'text'],
  [/^--(leading|line-height)(-|$)/, 'leading'],
];

function customPropertyRule(property: string): ScaleRule {
  return CUSTOM_PROPERTY_RULES.find(([pattern]) => pattern.test(property))?.[1] ?? 'size';
}

/**
 * The rule a CSS property's lengths answer to, or undefined when the property is out of scope
 * (letter-spacing, text-underline-offset, stroke-width and other SVG paint, transitions…). A
 * custom property is a radius, a text size or a line height by its name (`--radius`, `--text-*`,
 * `--leading-*`) and any other length otherwise.
 */
export function cssPropertyRule(property: string): ScaleRule | undefined {
  if (property.startsWith('--')) return customPropertyRule(property);
  return CSS_PROPERTY_RULES.find(([pattern]) => pattern.test(property))?.[1];
}
