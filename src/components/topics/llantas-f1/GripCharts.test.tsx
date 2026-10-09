// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import GripCharts from './GripCharts';

describe('GripCharts', () => {
  afterEach(cleanup);

  test('the temperature chart renders its title and marks itself ready', () => {
    render(<GripCharts chart="temperatura" />);

    expect(screen.getByText(/en función de la temperatura/)).toBeInTheDocument();
    expect(screen.getByTestId('grip-chart-temperatura')).toHaveAttribute('data-ready', 'true');
  });

  test('the load chart renders its title', () => {
    render(<GripCharts chart="carga" />);

    expect(screen.getByText(/en función de la carga vertical/)).toBeInTheDocument();
    expect(screen.queryByTestId('chart-empty')).not.toBeInTheDocument();
  });
});
