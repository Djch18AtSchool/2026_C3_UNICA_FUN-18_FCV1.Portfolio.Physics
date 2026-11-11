import { describe, expect, test } from 'vitest';
import { compareTokenMath, tokenMath } from './scaleCalc';

describe('tokenMath: CSS math that leans on custom properties', () => {
  test('finds a calc() with a var() in a declaration, without its spaces', () => {
    // Arrange
    const css = ':root { --room: calc(var(--icon-button-touch) + 2 * var(--space-3) + 1px); }';

    // Act
    const found = tokenMath('src/styles/a.css', css);

    // Assert
    expect(found).toEqual(['calc(var(--icon-button-touch)+2*var(--space-3)+1px)']);
  });

  test('leaves out math made of literals only', () => {
    expect(tokenMath('src/a.css', '.a { width: calc(100% - 2rem); }')).toEqual([]);
    expect(tokenMath('src/A.tsx', "const A = '@min-[calc(481.5px+2rem)]:h-4';")).toEqual([]);
  });

  test('reads a nested expression whole, and min(), max() and clamp() too', () => {
    const tsx = [
      "const A = 'h-[calc((100cqw-2rem)/var(--chart-compact)+8rem)]';",
      "const B = 'w-[min(var(--a),20rem)] h-[clamp(1rem,var(--b),4rem)] p-[max(var(--c),1rem)]';",
    ].join('\n');

    expect(tokenMath('src/A.tsx', tsx)).toEqual([
      'calc((100cqw-2rem)/var(--chart-compact)+8rem)',
      'min(var(--a),20rem)',
      'clamp(1rem,var(--b),4rem)',
      'max(var(--c),1rem)',
    ]);
  });

  test('lists an expression once per file, however many times it is written', () => {
    const tsx =
      "const T = 'after:top-[calc(var(--space-1)-var(--border-thin))] after:left-[calc(var(--space-1)-var(--border-thin))]';";

    expect(tokenMath('src/T.tsx', tsx)).toEqual(['calc(var(--space-1)-var(--border-thin))']);
  });

  test('skips comments: CSS, HTML, JSX and line comments', () => {
    const css = '/* calc(var(--a) - 1px) */ .a { margin: 0; }';
    const astro = '<!-- calc(var(--a)) -->\n{/* calc(var(--b)) */}\n<div />';
    const ts = '// calc(var(--a) + 1px)\nconst x = 1;';

    expect(tokenMath('src/a.css', css)).toEqual([]);
    expect(tokenMath('src/A.astro', astro)).toEqual([]);
    expect(tokenMath('src/a.ts', ts)).toEqual([]);
  });

  test('stops at the end of the text when a parenthesis never closes', () => {
    expect(tokenMath('src/a.css', '.a { top: calc(var(--a) + 1px')).toEqual(['calc(var(--a)+1px']);
  });
});

describe('compareTokenMath: every expression reviewed, every review still in use', () => {
  const REASON = 'the thumb sits 4 px inside the outer edge, less the 1 px border';

  test('an expression with its reason passes', () => {
    const found = { 'src/T.tsx': ['calc(var(--space-1)-var(--border-thin))'] };
    const reviewed = { 'src/T.tsx': { 'calc(var(--space-1)-var(--border-thin))': REASON } };

    expect(compareTokenMath(found, reviewed)).toEqual({ unreviewed: [], gone: [] });
  });

  test('a new expression, or one without a real reason, is unreviewed', () => {
    const found = { 'src/T.tsx': ['calc(var(--a)-1px)', 'calc(var(--b)+1px)'] };
    const reviewed = { 'src/T.tsx': { 'calc(var(--b)+1px)': ' ok ' } };

    expect(compareTokenMath(found, reviewed).unreviewed).toEqual([
      'src/T.tsx: calc(var(--a)-1px)',
      'src/T.tsx: calc(var(--b)+1px)',
    ]);
  });

  test('a reviewed expression no longer written is gone', () => {
    const reviewed = { 'src/T.tsx': { 'calc(var(--a)-1px)': REASON } };

    expect(compareTokenMath({}, reviewed)).toEqual({
      unreviewed: [],
      gone: ['src/T.tsx: calc(var(--a)-1px)'],
    });
  });
});
