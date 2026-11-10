// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import { mathTextWidth } from '../../../lib/mathNotation';
import { plexViolations } from '../../../test-glyphs';
import CollisionDiagram from './CollisionDiagram';

/** Left and right edge of a drawn label, from its x, its anchor and its drawn width. */
function extent(text: Element): { left: number; right: number } {
  const x = Number(text.getAttribute('x'));
  const width = mathTextWidth(
    text.getAttribute('data-notation') ?? '',
    Number(text.getAttribute('font-size')),
    'mono',
  );
  return text.getAttribute('text-anchor') === 'end'
    ? { left: x - width, right: x }
    : { left: x, right: x + width };
}

describe('CollisionDiagram', () => {
  afterEach(cleanup);

  test('the two mass labels are drawn at 12 px or more and clear of each other', () => {
    const { container } = render(<CollisionDiagram />);
    const labels = ['m_1 = 2 kg', 'm_2 = 1 kg'].map(
      (source) => container.querySelector(`text[data-notation="${source}"]`) as Element,
    );
    const [first, second] = labels.map(extent);

    expect(labels.map((label) => Number(label.getAttribute('font-size')))).toEqual([12, 12]);
    expect(second.left - first.right).toBeGreaterThanOrEqual(16);
  });

  test('every character outside KaTeX is one IBM Plex draws, and no notation is left raw', () => {
    const { container } = render(<CollisionDiagram />);

    expect(plexViolations(container)).toEqual([]);
  });
});
