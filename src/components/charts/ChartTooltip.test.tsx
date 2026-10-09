// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import ChartTooltip from './ChartTooltip';
import { EXACT_TEXT } from '../../test-exact-text';

const FORMAT = { xLabel: 't', xUnit: 's', yUnit: 'm' };

describe('ChartTooltip', () => {
  afterEach(cleanup);

  test('renders nothing when inactive', () => {
    const { container } = render(
      <ChartTooltip {...FORMAT} active={false} label={1} payload={[]} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  test('shows the x value with its unit and one line per series with the y unit', () => {
    render(
      <ChartTooltip
        {...FORMAT}
        active
        label={1.5}
        payload={[
          { name: 'Altura', value: 5.1, color: 'var(--chart-1)' },
          { name: 'Velocidad', value: 12.345, color: 'var(--chart-2)' },
        ]}
      />,
    );

    expect(screen.getByText('t = 1,50\u202fs', EXACT_TEXT)).toBeInTheDocument();
    expect(screen.getByText('5,10\u202fm', EXACT_TEXT)).toBeInTheDocument();
    expect(screen.getByText('12,35\u202fm', EXACT_TEXT)).toBeInTheDocument();
    expect(screen.getByText('Altura')).toBeInTheDocument();
  });

  test('skips entries without a numeric value', () => {
    render(
      <ChartTooltip
        {...FORMAT}
        active
        label={0}
        payload={[{ name: 'Altura', value: undefined, color: 'var(--chart-1)' }]}
      />,
    );

    expect(screen.queryByText('Altura')).not.toBeInTheDocument();
  });
  test('prints values with the requested precision and a value unit apart from the axis unit', () => {
    render(
      <ChartTooltip
        xLabel="Temperatura"
        xUnit="°C"
        yUnit=""
        xPrecision={0}
        yPrecision={3}
        active
        label={120}
        payload={[{ name: 'μ', value: 1.8, color: 'var(--chart-1)' }]}
      />,
    );

    expect(screen.getByText('Temperatura = 120\u202f°C', EXACT_TEXT)).toBeInTheDocument();
    expect(screen.getByText('1,800', EXACT_TEXT)).toBeInTheDocument();
  });

  test('adds extra rows read from the hovered data row', () => {
    render(
      <ChartTooltip
        {...FORMAT}
        active
        label={2}
        payload={[
          {
            name: 'Fuerza',
            value: 6400,
            color: 'var(--chart-1)',
            payload: { fz: 4000, real: 6400, muEff: 1.6 },
          },
        ]}
        extras={[{ key: 'muEff', name: 'μ efectivo', precision: 3 }]}
      />,
    );

    expect(screen.getByTestId('tooltip-extras')).toHaveTextContent('μ efectivo');
    expect(screen.getByText('1,600', EXACT_TEXT)).toBeInTheDocument();
  });

  test('skips extra rows whose value is not a finite number', () => {
    render(
      <ChartTooltip
        {...FORMAT}
        active
        label={0}
        payload={[
          {
            name: 'Fuerza',
            value: 0,
            color: 'var(--chart-1)',
            payload: { fz: 0, real: 0, muEff: Number.NaN },
          },
        ]}
        extras={[{ key: 'muEff', name: 'μ efectivo' }]}
      />,
    );

    expect(screen.queryByText('μ efectivo')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tooltip-extras')).not.toBeInTheDocument();
  });
});
