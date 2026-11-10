/**
 * Characters of rendered text that IBM Plex does not draw, outside KaTeX, and the notation marks
 * that were never typeset (`_`, `^`, `$`: a subscript, a power or a formula written raw, which
 * Plex does draw and so no glyph check would see): the unit-test guard of a lab or a figure, the
 * counterpart of the page-level e2e (tests/e2e/glyphs.spec.ts). A text node counts as mono
 * when an ancestor sets the mono family (font-family attribute or Tailwind's font-mono); text in
 * a KaTeX formula or in a MathText tspan set in KaTeX's fonts is skipped. Returns "char in «text»"
 * entries, empty when every character is covered.
 */
import { rawNotationMarks, uncoveredChars, type PlexFamily } from './lib/typography';

const KATEX_FAMILY = /KaTeX/;

function familyOf(element: Element): PlexFamily | 'katex' {
  for (let node: Element | null = element; node; node = node.parentElement) {
    const family = node.getAttribute('font-family') ?? '';
    if (KATEX_FAMILY.test(family)) return 'katex';
    if (family.includes('mono') || node.classList.contains('font-mono')) return 'mono';
    if (family.includes('sans')) return 'sans';
  }
  return 'sans';
}

export function plexViolations(root: Element): string[] {
  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const found: string[] = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const parent = node.parentElement;
    if (!parent || parent.closest('.katex')) continue;
    const family = familyOf(parent);
    if (family === 'katex') continue;
    const text = node.textContent ?? '';
    const raw = rawNotationMarks(text);
    found.push(
      ...[...uncoveredChars(text, family), ...raw].map((char) => `${char} in «${text.trim()}»`),
    );
  }
  return found;
}
