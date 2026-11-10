// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import MathText from './components/lab/MathText';
import InlineMath from './components/lab/InlineMath';
import { plexViolations } from './test-glyphs';

describe('plexViolations', () => {
  afterEach(cleanup);

  test('finds a symbol Plex lacks in plain text, and Greek in mono text', () => {
    const { container } = render(
      <div>
        <p>v∞ = 7</p>
        <p className="font-mono">δ = 97</p>
        <p>δ en sans</p>
      </div>,
    );

    expect(plexViolations(container)).toEqual(['∞ in «v∞ = 7»', 'δ in «δ = 97»']);
  });

  test('skips KaTeX formulas and MathText tspans set in KaTeX', () => {
    const { container } = render(
      <div>
        <p>
          <InlineMath text="$\vec v_\infty$ y $\delta$" />
        </p>
        <svg>
          <MathText source="vec v_∞,in δ" x={0} y={0} fontSize={13} />
        </svg>
      </div>,
    );

    expect(plexViolations(container)).toEqual([]);
  });
});
