/**
 * Judges one Tailwind class against the scale (scaleRules.ts). Variants (`md:`, `@min-[…]/lab:`,
 * `lab-split:`) are breakpoints and states, never lengths, so only the utility after the last
 * one is read. Only length utilities count: spacing, sizes, text sizes, line heights, radii and
 * borders; fractions (`w-1/2`), keywords (`h-full`, `top-auto`), variables (`h-(--x)`) and
 * relative units inside brackets (`max-h-[85dvh]`) are out of scope. A bracketed length in em is
 * off the scale; `text-*` reads its line-height modifier (`text-sm/6`, `text-sm/[22px]`); an
 * arbitrary property (`[margin-top:5px]`) is read as the CSS declaration it is.
 */
import {
  cssValueViolations,
  isOnScale,
  lengthLiterals,
  TAILWIND_STEP_PX,
  type ScaleRule,
} from './scaleRules';

export interface ClassViolation {
  rule: ScaleRule;
  /** The utility without its variants or `!` (`-mt-7`, `size-[18px]`). */
  value: string;
}

type ValueKind = 'step' | 'track' | 'px' | 'text' | 'leading' | 'radius';

const SIDES = ['', 'x', 'y', 't', 'r', 'b', 'l', 's', 'e'];
const SPACING = [
  ...SIDES.map((side) => `p${side}`),
  ...SIDES.map((side) => `m${side}`),
  ...SIDES.map((side) => `scroll-m${side}`),
  ...SIDES.map((side) => `scroll-p${side}`),
  'gap',
  'gap-x',
  'gap-y',
  'space-x',
  'space-y',
  'inset',
  'inset-x',
  'inset-y',
  'top',
  'right',
  'bottom',
  'left',
  'start',
  'end',
  'translate',
  'translate-x',
  'translate-y',
  'indent',
  'basis',
];
const SIZE = ['w', 'h', 'size', 'min-w', 'min-h', 'max-w', 'max-h'];
/** Counts (`grid-cols-2`) unless the value is a bracketed template. */
const TRACKS = ['grid-cols', 'grid-rows', 'auto-cols', 'auto-rows'];
const BORDER = [
  ...SIDES.map((side) => (side ? `border-${side}` : 'border')),
  'outline',
  'outline-offset',
  'divide-x',
  'divide-y',
  'ring',
  'ring-offset',
];
const RADIUS = [
  '',
  't',
  'r',
  'b',
  'l',
  's',
  'e',
  'tl',
  'tr',
  'br',
  'bl',
  'ss',
  'se',
  'es',
  'ee',
].map((corner) => (corner ? `rounded-${corner}` : 'rounded'));

interface Utility {
  prefix: string;
  rule: ScaleRule;
  kind: ValueKind;
}

/** Longest prefix first, so `gap-x-4` is `gap-x` and `max-w-…` is not `m-…`. */
const UTILITIES: readonly Utility[] = (
  [
    ...SPACING.map((prefix): Utility => ({ prefix, rule: 'spacing', kind: 'step' })),
    ...SIZE.map((prefix): Utility => ({ prefix, rule: 'size', kind: 'step' })),
    ...TRACKS.map((prefix): Utility => ({ prefix, rule: 'size', kind: 'track' })),
    ...BORDER.map((prefix): Utility => ({ prefix, rule: 'border', kind: 'px' })),
    ...RADIUS.map((prefix): Utility => ({ prefix, rule: 'radius', kind: 'radius' })),
    { prefix: 'text', rule: 'text', kind: 'text' },
    { prefix: 'leading', rule: 'leading', kind: 'leading' },
  ] satisfies Utility[]
).sort((a, b) => b.prefix.length - a.prefix.length);

const TEXT_NAMED_PX: Readonly<Record<string, number>> = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
  '6xl': 60,
  '7xl': 72,
  '8xl': 96,
  '9xl': 128,
};
/** `rounded-base` reads --radius (tokens.css), which the CSS check measures where it is set. */
const RADIUS_NAMED_PX: Readonly<Record<string, number>> = {
  '': 4,
  none: 0,
  xs: 2,
  sm: 4,
  base: 4,
  md: 6,
  lg: 8,
  xl: 12,
  '2xl': 16,
  '3xl': 24,
  '4xl': 32,
  full: 9999,
};
/** Tailwind's container scale, which `w-*`, `min-w-*` and `max-w-*` also accept. */
const CONTAINER_NAMED_PX: Readonly<Record<string, number>> = {
  '3xs': 256,
  '2xs': 288,
  xs: 320,
  sm: 384,
  md: 448,
  lg: 512,
  xl: 576,
  '2xl': 672,
  '3xl': 768,
  '4xl': 896,
  '5xl': 1024,
  '6xl': 1152,
  '7xl': 1280,
};
const STEP = /^\d+(\.\d+)?$/;
const WHOLE = /^\d+$/;
/** A 2 px-thick rule drawn as a box. */
const RULE_BOXES = new Set(['w', 'h']);

/** The utility after the last variant (a `:` outside brackets and parentheses). */
function stripVariants(token: string): string {
  let depth = 0;
  let start = 0;
  for (let index = 0; index < token.length; index += 1) {
    const char = token[index];
    if (char === '[' || char === '(') depth += 1;
    else if (char === ']' || char === ')') depth -= 1;
    else if (char === ':' && depth === 0) start = index + 1;
  }
  return token.slice(start).replace(/^!|!$/g, '');
}

interface Measure {
  px: number;
  hairline: boolean;
  /** Written in em: it follows the local size, so it is off the scale (scaleRules.ts). */
  relative?: boolean;
  /** A named icon or icon-button size (CONTROL_CLASSES), which may be 20, 40 or 44. */
  control?: boolean;
}

/** The only classes that may measure 20 (icons), 40 or 44 (icon buttons and controls). */
const CONTROL_CLASSES = new Set(
  ['size', 'w', 'h', 'min-w', 'min-h'].flatMap((prefix) =>
    ['5', '10', '11']
      .filter((step) => step !== '5' || !prefix.startsWith('min'))
      .map((step) => `${prefix}-${step}`),
  ),
);

function bracketed(value: string, rule: ScaleRule): Measure[] | undefined {
  if (!value.startsWith('[') || !value.endsWith(']')) return undefined;
  return lengthLiterals(value.slice(1, -1).replaceAll('_', ' '), rule).map(({ px, unit }) => ({
    px,
    hairline: true,
    relative: unit === 'em',
  }));
}

function named(table: Readonly<Record<string, number>>, value: string): Measure[] | undefined {
  return value in table ? [{ px: table[value], hairline: false }] : undefined;
}

function step(utility: Utility, value: string): Measure[] | undefined {
  if (value === 'px') return [{ px: 1, hairline: true }];
  if (STEP.test(value)) {
    const px = Number(value) * TAILWIND_STEP_PX;
    const control = CONTROL_CLASSES.has(`${utility.prefix}-${value}`);
    return [{ px, hairline: RULE_BOXES.has(utility.prefix), control }];
  }
  return utility.rule === 'size' && utility.prefix !== 'h' && utility.prefix !== 'min-h'
    ? named(CONTAINER_NAMED_PX, value)
    : undefined;
}

/** The lengths a utility's value stands for; undefined when it is not one this utility reads. */
function measure(utility: Utility, value: string): Measure[] | undefined {
  const inBrackets = bracketed(value, utility.rule);
  if (inBrackets) return inBrackets;
  switch (utility.kind) {
    case 'step':
      return step(utility, value);
    case 'leading':
      return STEP.test(value)
        ? [{ px: Number(value) * TAILWIND_STEP_PX, hairline: false }]
        : undefined;
    case 'px':
      if (value === '') return [{ px: 1, hairline: true }];
      return WHOLE.test(value) ? [{ px: Number(value), hairline: true }] : undefined;
    case 'radius':
      return named(RADIUS_NAMED_PX, value);
    case 'text':
      return named(TEXT_NAMED_PX, value);
    case 'track':
      return undefined;
  }
}

const isOff = (rule: ScaleRule, measures: readonly Measure[]): boolean =>
  measures.some(
    ({ px, hairline, relative, control }) =>
      relative === true || !isOnScale(rule, px, hairline, control),
  );

/** `text-sm/6`, `text-sm/[22px]`: the size and the line height after the last top-level `/`. */
function splitModifier(value: string): [string, string | undefined] {
  let depth = 0;
  for (let index = value.length - 1; index >= 0; index -= 1) {
    const char = value[index];
    if (char === ']' || char === ')') depth += 1;
    else if (char === '[' || char === '(') depth -= 1;
    else if (char === '/' && depth === 0) return [value.slice(0, index), value.slice(index + 1)];
  }
  return [value, undefined];
}

const LEADING: Utility = { prefix: 'leading', rule: 'leading', kind: 'leading' };

/** A text size and its optional line-height modifier; undefined when the base is not a size. */
function checkText(
  utility: Utility,
  value: string,
  text: string,
): ClassViolation | null | undefined {
  const [base, modifier] = splitModifier(value);
  const size = measure(utility, base);
  if (size === undefined) return undefined;
  if (isOff('text', size)) return { rule: 'text', value: text };
  const leading = modifier === undefined ? undefined : measure(LEADING, modifier);
  return leading && isOff('leading', leading) ? { rule: 'leading', value: text } : null;
}

/** `[margin-top:5px]`: a CSS declaration in a class; undefined when the class is not one. */
function checkArbitraryProperty(text: string): ClassViolation | null | undefined {
  const match = /^\[(--[\w-]+|[a-z-]+):(.+)\]$/.exec(text);
  if (!match) return undefined;
  const [violation] = cssValueViolations(match[1], match[2].replaceAll('_', ' '));
  return violation ? { rule: violation.rule, value: text } : null;
}

/** The class's violation of the scale, if it is a length utility off the scale. */
export function checkClass(token: string): ClassViolation | undefined {
  const utilityText = stripVariants(token);
  const arbitrary = checkArbitraryProperty(utilityText);
  if (arbitrary !== undefined) return arbitrary ?? undefined;
  const unsigned = utilityText.replace(/^-/, '');
  for (const utility of UTILITIES) {
    const { prefix } = utility;
    const isBare = unsigned === prefix;
    if (!isBare && !unsigned.startsWith(`${prefix}-`)) continue;
    const value = isBare ? '' : unsigned.slice(prefix.length + 1);
    if (utility.kind === 'text') {
      const text = checkText(utility, value, utilityText);
      if (text === undefined) continue;
      return text ?? undefined;
    }
    const measures = measure(utility, value);
    if (measures === undefined) continue;
    return isOff(utility.rule, measures) ? { rule: utility.rule, value: utilityText } : undefined;
  }
  return undefined;
}
