// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import HabitatFigure from './HabitatFigure';

const strokeOf = (container: HTMLElement, id: string) =>
  container.querySelector(`[data-series="${id}"]`)?.getAttribute('stroke');

describe('HabitatFigure', () => {
  afterEach(() => cleanup());

  test('apparent weight: on Earth n = m g; in a ship that does not spin, n = 0', () => {
    render(<HabitatFigure variant="peso-aparente" />);
    const diagram = screen.getByRole('img', { name: /peso aparente/i });

    expect(diagram).toHaveTextContent('En la Tierra');
    expect(diagram).toHaveTextContent('En órbita, sin girar');
    expect(diagram).toHaveTextContent('n = m g');
    expect(diagram).toHaveTextContent('n = 0');
    expect(diagram.querySelector('[data-force="peso"]')?.getAttribute('stroke')).toBe(
      'var(--chart-1)',
    );
  });

  test('radius: a_c/g lines at 1 and 2 rpm, the Earth 1 g line and the marked points', () => {
    const { container } = render(<HabitatFigure variant="radio" />);
    const legend = screen.getByRole('list', { name: 'Leyenda' });

    expect(legend).toHaveTextContent('1 RPM');
    expect(legend).toHaveTextContent('2 RPM');
    expect(legend).toHaveTextContent('1 g terrestre');
    expect(strokeOf(container, 'tierra')).toBe('var(--chart-1)');
    expect(screen.getByText('2 RPM: 223,6 m')).toBeInTheDocument();
    expect(screen.getByText('Toro de Stanford: 0,93 g')).toBeInTheDocument();
    expect(screen.getByText('r (m)')).toBeInTheDocument();
  });

  test('comfort: the spin for 1 g with the comfort bands and the gradient points', () => {
    const { container } = render(<HabitatFigure variant="confort" />);

    expect(container.querySelector('[data-series="giro-1g"]')).not.toBeNull();
    expect(container.querySelectorAll('[data-band]')).toHaveLength(2);
    expect(screen.getByText('Radio mínimo: 4 a 12 m')).toBeInTheDocument();
    expect(screen.getByText('Giro máximo: 3 a 6 RPM')).toBeInTheDocument();
    expect(screen.getByText('10 m: 9,46 RPM, 18 %')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-point]')).toHaveLength(3);
  });
});
