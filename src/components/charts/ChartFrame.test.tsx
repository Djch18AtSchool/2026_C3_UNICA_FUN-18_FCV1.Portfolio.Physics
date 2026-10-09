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
