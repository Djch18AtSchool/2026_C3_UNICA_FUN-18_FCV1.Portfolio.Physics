// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import { PLEX_SANS_ADVANCES, PLEX_SANS_ITALIC_ADVANCES } from '../../lib/glyphAdvances';
import { mathRuns } from '../../lib/mathNotation';
import MathText, { mathMarks, type MathTextProps } from './MathText';

const BASE = { x: 100, y: 50, fontSize: 10 } as const;
const PER_MILLE = 1000;
/** Plex Sans 400 advance of `char`, px at the 10 px of BASE. */
const sansPx = (char: string) =>
  (PLEX_SANS_ADVANCES[char.codePointAt(0) ?? 0] / PER_MILLE) * BASE.fontSize;
/** Arrow insets: 8 % of the letter on each side (MathText's ARROW_INSET). */
const INSET = 0.08;

function draw(props: Partial<MathTextProps> & { source: string }) {
  const { container } = render(
    <svg>
      <MathText {...BASE} {...props} />
    </svg>,
  );
  return container;
}

const spans = (container: HTMLElement) =>
  [...container.querySelectorAll('tspan')].map((tspan) => ({
    text: tspan.textContent,
    dy: tspan.getAttribute('dy'),
    size: tspan.getAttribute('font-size'),
    family: tspan.getAttribute('font-family'),
    style: tspan.getAttribute('font-style'),
  }));

describe('MathText', () => {
  afterEach(cleanup);

  test('a plain label renders as plain text, with no role or tspans', () => {
    const container = draw({ source: 'Júpiter', anchor: 'end', fill: 'red' });
    const text = container.querySelector('text');

    expect(text).toHaveTextContent('Júpiter');
    expect(text).not.toHaveAttribute('role');
    expect(text).toHaveAttribute('text-anchor', 'end');
    expect(text).toHaveAttribute('font-family', 'var(--font-sans)');
    expect(container.querySelectorAll('tspan')).toHaveLength(0);
  });

  test('a subscript is a real one: 75 % and shifted down, then back up', () => {
    const container = draw({ source: 'V_p = 13' });

    expect(spans(container)).toEqual([
      { text: 'V', dy: null, size: null, family: null, style: null },
      { text: 'p', dy: '2.5', size: '75.0%', family: null, style: null },
      { text: ' = 13', dy: '-2.5', size: null, family: null, style: null },
    ]);
  });

  test('a superscript is raised: 10^-7 with a real minus sign', () => {
    const container = draw({ source: '10^-7' });

    expect(spans(container)[1]).toEqual({
      text: '−7',
      dy: '-4',
      size: '75.0%',
      family: null,
      style: null,
    });
  });

  test('lowercase Greek is italic; symbols keep the label’s size; no tspan names a font', () => {
    const container = draw({ source: 'ω_máx ≈ v_∞ Δ' });
    const [omega, , , approx, , infinity] = spans(container);

    expect(omega).toEqual({ text: 'ω', dy: null, size: null, family: null, style: 'italic' });
    expect(approx).toEqual({ text: '≈', dy: null, size: null, family: null, style: null });
    expect(infinity).toMatchObject({ text: '∞', size: '75.0%', family: null });
    expect(container.querySelector('text')).toHaveTextContent('ωmáx ≈ v∞ Δ');
  });

  test('a $…$ label sets its letters italic and its units upright, as the HTML does', () => {
    const container = draw({ source: '$r_p$ = 10 km' });

    expect(spans(container)).toEqual([
      { text: 'r', dy: null, size: null, family: null, style: 'italic' },
      { text: 'p', dy: '2.5', size: '75.0%', family: null, style: 'italic' },
      { text: ' = 10 km', dy: '-2.5', size: null, family: null, style: null },
    ]);
  });

  test('adds no role: a label inside a role="img" plot stays presentational', () => {
    const container = draw({ source: 'v_∞,in' });

    expect(container.querySelector('[role]')).toBeNull();
    expect(container.querySelector('text')).toHaveTextContent('v∞,in');
  });

  test('a vector gets a drawn arrow, never the combining U+20D7', () => {
    const container = draw({ source: 'vec v = vec V_p', fill: 'blue' });

    expect(container.textContent).not.toContain('⃗');
    const arrows = container.querySelectorAll('[data-math-mark="vector"]');
    expect(arrows).toHaveLength(2);
    expect(arrows[0]).toHaveAttribute('stroke', 'blue');
    expect(arrows[0].closest('g')).toHaveAttribute('aria-hidden', 'true');
  });

  test('a halo is drawn under the arrows as well as the text', () => {
    const container = draw({ source: 'vec v', fill: 'blue', halo: { color: 'white', width: 4 } });
    const paths = [...container.querySelectorAll('path')];

    expect(paths.map((path) => path.getAttribute('stroke'))).toEqual(['white', 'blue']);
    expect(container.querySelector('text')).toHaveAttribute('stroke', 'white');
    expect(container.querySelector('text')).toHaveAttribute('paint-order', 'stroke');
  });

  test('≠ is an equals sign with a drawn stroke', () => {
    const container = draw({ source: 'a ≠ b' });

    expect(container.querySelector('text')).toHaveTextContent('a = b');
    expect(container.querySelectorAll('[data-math-mark="not"]')).toHaveLength(1);
  });

  test('a transform moves the arrows with the text', () => {
    const container = draw({ source: 'vec v', transform: 'rotate(-90 10 10)' });

    expect(container.querySelector('g')).toHaveAttribute('transform', 'rotate(-90 10 10)');
    expect(container.querySelector('text')).not.toHaveAttribute('transform');
  });

  test('without marks, the transform and class stay on the text', () => {
    const container = draw({ source: 'v_y', transform: 'rotate(-90 10 10)', className: 'k' });

    expect(container.querySelector('text')).toHaveAttribute('transform', 'rotate(-90 10 10)');
    expect(container.querySelector('text')).toHaveClass('k');
  });
});

describe('mathMarks', () => {
  const arrowOf = (props: Omit<MathTextProps, 'source'> & { source: string }) => {
    const [mark] = mathMarks(mathRuns(props.source), props);
    const numbers = mark.d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
    return { from: numbers[0], y: numbers[1], to: numbers[2] };
  };

  test('the arrow spans the base letter, from the start, by its Plex Sans advance', () => {
    const v = sansPx('v');
    const arrow = arrowOf({ ...BASE, source: 'vec v' });

    expect(arrow.from).toBeCloseTo(100 + INSET * v, 1);
    expect(arrow.to).toBeCloseTo(100 + (1 - INSET) * v, 1);
  });

  test('follows the anchor: centred and right-aligned labels shift the arrow', () => {
    const v = sansPx('v');
    const middle = arrowOf({ ...BASE, source: 'vec v', anchor: 'middle' });
    const end = arrowOf({ ...BASE, source: 'vec v', anchor: 'end' });

    expect(middle.from).toBeCloseTo(100 - v / 2 + INSET * v, 1);
    expect(end.to).toBeCloseTo(100 - INSET * v, 1);
  });

  test('sits higher over a capital than over a short letter, and follows dy', () => {
    const short = arrowOf({ ...BASE, source: 'vec v' });
    const capital = arrowOf({ ...BASE, source: 'vec V' });
    const lowered = arrowOf({ ...BASE, source: 'vec v', dy: 4 });

    expect(short.y).toBeCloseTo(50 - (0.516 + 0.12) * 10);
    expect(capital.y).toBeLessThan(short.y);
    expect(lowered.y).toBeCloseTo(short.y + 4);
  });

  test('a later vector starts after the width of what precedes it', () => {
    const marks = mathMarks(mathRuns('vec v = vec V_p'), { ...BASE, source: '' });
    const second = Number(marks[1].d.match(/^M(-?[\d.]+)/)?.[1]);

    // "v = " before V, in Plex Sans advances.
    const before = [...'v = '].reduce((sum, char) => sum + sansPx(char), 0);
    expect(second).toBeCloseTo(100 + before + INSET * sansPx('V'), 1);
  });

  test('an italic base leans its arrow right and spans the italic’s own advance', () => {
    const upright = arrowOf({ ...BASE, source: 'vec v' });
    const italic = arrowOf({ ...BASE, source: '$\\vec v$' });
    const italicV = (PLEX_SANS_ITALIC_ADVANCES[0x76] / PER_MILLE) * BASE.fontSize;

    expect(italic.from).toBeGreaterThan(upright.from);
    expect(italic.to - italic.from).toBeCloseTo((1 - 2 * INSET) * italicV, 1);
  });
});

describe('MathText for layout and tests', () => {
  afterEach(cleanup);

  test('a label in notation keeps its source in data-notation; plain text does not', () => {
    const notation = draw({ source: 'vec v_∞,in' });
    const plain = draw({ source: 'Júpiter' });

    expect(notation.querySelector('text')).toHaveAttribute('data-notation', 'vec v_∞,in');
    expect(plain.querySelector('text')).not.toHaveAttribute('data-notation');
  });
});
