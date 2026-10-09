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
});
