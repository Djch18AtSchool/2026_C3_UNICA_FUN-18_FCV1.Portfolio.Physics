/**
 * Finds the lengths a source file writes and checks them against the scale (scaleRules.ts):
 *
 * - Tailwind classes in every string literal of .ts/.tsx/.astro/.mdx (class attributes,
 *   `className`, class constants, `class:list`), read by scaleTailwind.ts.
 * - CSS declarations in .css files, Astro `<style>` blocks and `style="…"` attributes.
 * - React-style `style={{ … }}` objects in .tsx, .ts and .astro: literal values only (a bare
 *   number is px); a value computed from a constant or a variable, or an object kept in a
 *   constant, is not followed.
 * - `@apply` in CSS, as classes. A class list may cross lines (attribute values, templates).
 *
 * Out of scope: SVG drawing (viewBox, `width`, `height`, `r`, `x`, `y`, `strokeWidth`, `fontSize`
 * and `dy` attributes, stroke-width in CSS), lengths a script computes (reserves that mirror a
 * drawing, `'2rem'` constants: tested against the drawing with resolveCssLength), media and
 * container queries and Tailwind variants (breakpoints are not spacing), letter-spacing,
 * text-underline-offset, text-decoration-thickness and background-image gradients (their 1 px
 * lines), unitless line heights, comments and prose.
 * A line can name an exception with a `scale-exempt: <reason>` comment (scaleSource.ts).
 */
import { cssValueViolations, type ScaleRule } from './scaleRules';
import {
  blank,
  blankJsComments,
  blankMatches,
  captures,
  CSS_COMMENT,
  exemptions,
  HTML_COMMENT,
  JSX_COMMENT,
  lineAt,
  lineStarts,
  stringLiterals,
  words,
  type Region,
} from './scaleSource';
import { checkClass } from './scaleTailwind';

export interface ScaleViolation {
  rule: ScaleRule;
  /** A class (`gap-1.5`) or a declaration with its offending length (`margin: 1.25rem`). */
  value: string;
  line: number;
  /** The reason of a `scale-exempt` comment that covers the line. */
  exempt?: string;
}

interface Found {
  rule: ScaleRule;
  value: string;
  offset: number;
}

const AT_RULE_PRELUDE = /@(media|container|supports|custom-variant|utility)[^{;]*/g;
/** A declaration after `{`, `;` or a nested rule's `}`; a selector (`a:hover {`) never ends in `;`/`}`. */
const DECLARATION = /(?:^|[{;}])\s*([\w-]+)\s*:\s*([^;{}]+?)\s*(?=;|}|$)/g;
const APPLY = /@apply\s+([^;{}]+)/g;
/** React properties whose bare numbers are not px. */
const UNITLESS = new Set(['line-height', 'flex', 'opacity', 'z-index', 'font-weight', 'order']);

function checkDeclaration(property: string, value: string, offset: number): Found[] {
  return cssValueViolations(property, value).map(({ rule, literal }) => ({
    rule,
    value: `${property}: ${literal}`,
    offset,
  }));
}

/** CSS text (a stylesheet, a `<style>` block or a `style` attribute's value). */
function scanCss(region: Region): Found[] {
  const css = blankMatches(blankMatches(region.text, CSS_COMMENT), AT_RULE_PRELUDE);
  const declarations = [...css.matchAll(DECLARATION)].flatMap((match) => {
    const offset = region.offset + (match.index ?? 0) + match[0].indexOf(match[1]);
    return checkDeclaration(match[1], match[2], offset);
  });
  const applied = captures(css, APPLY)
    .flatMap((classes) => words({ ...classes, offset: region.offset + classes.offset }))
    .flatMap(checkWord);
  return [...declarations, ...applied];
}

function checkWord(word: Region): Found[] {
  const violation = checkClass(word.text);
  return violation ? [{ ...violation, offset: word.offset }] : [];
}

function scanClasses(text: string): Found[] {
  return stringLiterals(text).flatMap(words).flatMap(checkWord);
}

const kebab = (name: string): string => name.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);

/** The bodies of `style={{ … }}` objects, braces matched (a `${…}` inside does not end one). */
function styleObjects(text: string): Region[] {
  return [...text.matchAll(/style=\{\{/g)].map((match) => {
    const offset = (match.index ?? 0) + match[0].length;
    let depth = 1;
    let end = offset;
    while (end < text.length && depth > 0) {
      if (text[end] === '{') depth += 1;
      else if (text[end] === '}') depth -= 1;
      end += 1;
    }
    return { text: text.slice(offset, end - 1), offset };
  });
}

const STYLE_ENTRY = /(\w+)\s*:\s*(?:'([^']*)'|"([^"]*)"|(-?\d+(?:\.\d+)?)(?![\w.]))/g;

/** `key: 'literal'` or `key: 12` (px, unless the property is unitless) in a style object. */
function scanStyleObjects(text: string): Found[] {
  return styleObjects(text).flatMap((region) =>
    [...region.text.matchAll(STYLE_ENTRY)].flatMap(([, key, single, double, number]) => {
      const property = kebab(key);
      const literal = single ?? double;
      if (literal === undefined && UNITLESS.has(property)) return [];
      const value = literal ?? `${number}px`;
      const shown = literal ?? number;
      const offset = region.offset + region.text.indexOf(key);
      return checkDeclaration(property, value, offset).map((found) => ({
        ...found,
        value: literal === undefined ? `${key}: ${shown}` : found.value.replace(property, key),
      }));
    }),
  );
}

function scanAstro(text: string): Found[] {
  const source = blankMatches(text, HTML_COMMENT);
  const styleBlocks = captures(source, /<style[^>]*>([\s\S]*?)<\/style>/g);
  const withoutStyles = styleBlocks.reduce(
    (current, { text: css, offset }) =>
      current.slice(0, offset) + blank(css) + current.slice(offset + css.length),
    source,
  );
  const code = blankJsComments(withoutStyles);
  return [
    ...styleBlocks.flatMap(scanCss),
    ...captures(code, /\sstyle="([^"]*)"/g).flatMap(scanCss),
    ...captures(code, /\sstyle=\{`([^`]*)`\}/g).flatMap(scanCss),
    ...scanStyleObjects(code),
    ...scanClasses(code),
  ];
}

function scanByType(path: string, text: string): Found[] {
  if (path.endsWith('.css')) return scanCss({ text, offset: 0 });
  if (path.endsWith('.astro')) return scanAstro(text);
  if (path.endsWith('.mdx')) {
    const source = blankMatches(blankMatches(text, JSX_COMMENT), HTML_COMMENT);
    return [...scanClasses(source), ...captures(source, /\sstyle="([^"]*)"/g).flatMap(scanCss)];
  }
  const code = blankJsComments(text);
  return [...scanClasses(code), ...scanStyleObjects(code)];
}

/** The lengths off the scale in one source file, in source order. */
export function scanSource(path: string, text: string): ScaleViolation[] {
  const starts = lineStarts(text);
  const exempt = exemptions(text);
  return scanByType(path, text)
    .sort((a, b) => a.offset - b.offset)
    .map(({ rule, value, offset }) => {
      const line = lineAt(starts, offset);
      const reason = exempt.get(line);
      return reason === undefined ? { rule, value, line } : { rule, value, line, exempt: reason };
    });
}
