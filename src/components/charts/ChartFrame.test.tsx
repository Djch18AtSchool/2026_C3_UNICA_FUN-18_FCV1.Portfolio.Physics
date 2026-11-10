// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import ChartFrame from './ChartFrame';

describe('ChartFrame', () => {
  afterEach(cleanup);

  test('renders the title, the children and the footnote', () => {
    render(
      <ChartFrame title="Velocidad" footnote="Sin rozamiento del aire.">
        <p>gráfica</p>
      </ChartFrame>,
    );

    expect(screen.getByText('Velocidad')).toBeInTheDocument();
    expect(screen.getByText('gráfica')).toBeInTheDocument();
    expect(screen.getByText('Sin rozamiento del aire.')).toBeInTheDocument();
  });

  test('omits the footnote when none is given', () => {
    render(
      <ChartFrame title="Velocidad">
        <p>gráfica</p>
      </ChartFrame>,
    );

    expect(screen.queryByTestId('chart-footnote')).not.toBeInTheDocument();
  });
});

describe('ChartFrame with KaTeX', () => {
  afterEach(cleanup);

  test('typesets $…$ in the title and the footnote', () => {
    const { container } = render(
      <ChartFrame title="Rapidez $|\vec v|$" footnote="Escape $\sqrt{2GM/r}$">
        <p>gráfica</p>
      </ChartFrame>,
    );

    expect(container.querySelectorAll('.inline-math')).toHaveLength(2);
    expect(screen.getByTestId('chart-footnote')).toHaveTextContent(/^Escape/);
  });
});
