// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import MathText from './components/lab/MathText';
import InlineMath from './components/lab/InlineMath';
import { plexViolations } from './test-glyphs';

describe('plexViolations', () => {
  afterEach(cleanup);

  test('finds a character no font of the stack draws, and Greek in the numbering’s mono', () => {
    const { container } = render(
      <div>
        <p>M☉ = 2</p>
        <p>v∞ = 7, drawn by the sans stack’s symbol face</p>
        <p className="numbering">δ = 97</p>
        <p>δ en sans</p>
      </div>,
    );

    expect(plexViolations(container)).toEqual(['☉ in «M☉ = 2»', 'δ in «δ = 97»']);
  });

  test('finds a subscript, a power or a formula written raw', () => {
    const { container } = render(
      <div>
        <p>Carga F_z</p>
        <p>10^-7</p>
        <p>cuesta $5</p>
      </div>,
    );

    expect(plexViolations(container)).toEqual([
      '_ in «Carga F_z»',
      '^ in «10^-7»',
      '$ in «cuesta $5»',
    ]);
  });

  test('skips KaTeX formulas and passes MathText’s Greek and symbols, all in the sans stack', () => {
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
