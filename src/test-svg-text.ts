/**
 * A Testing Library matcher for an SVG <text> by its whole rendered text. MathText splits a
 * label into tspans (V_p → "V" + subscript "p"), which getByText's own-text matching cannot see;
 * this compares the <text>'s textContent, whitespace collapsed (U+202F included), so a test
 * asserts what the reader sees: screen.getByText(svgText('Carga vertical Fz (N)')).
 */
import type { MatcherFunction } from '@testing-library/react';

const collapse = (text: string) => text.replace(/\s+/g, ' ').trim();

export function svgText(expected: string | RegExp): MatcherFunction {
  return (_content, element) => {
    if (element?.tagName.toLowerCase() !== 'text') return false;
    const text = collapse(element.textContent ?? '');
    return typeof expected === 'string' ? text === collapse(expected) : expected.test(text);
  };
}
