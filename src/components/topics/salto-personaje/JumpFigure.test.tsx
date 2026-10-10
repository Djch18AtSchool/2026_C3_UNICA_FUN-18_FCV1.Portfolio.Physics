// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import JumpFigure from './JumpFigure';

const strokeOf = (container: HTMLElement, id: string) =>
  container.querySelector(`[data-series="${id}"]`)?.getAttribute('stroke');

describe('JumpFigure', () => {
  afterEach(() => cleanup());

  test('free fall: one Earth curve y(t) with its apex marked', () => {
    const { container } = render(<JumpFigure variant="caida-libre" />);

    expect(screen.getByText('t (s)')).toBeInTheDocument();
    expect(screen.getByText('y (m)')).toBeInTheDocument();
    expect(strokeOf(container, 'tierra')).toBe('var(--chart-1)');
    expect(container.querySelector('[data-marker]')).not.toBeNull();
    expect(screen.getByRole('img', { name: /8,75\sm/ })).toBeInTheDocument();
  });

  test('three gravities with the same impulse, each curve labelled and in its own color', () => {
    const { container } = render(<JumpFigure variant="gravedades" />);
    const legend = screen.getByRole('list', { name: 'Leyenda' });

    expect(legend).toHaveTextContent('Tierra, g = 9,81 m/s²');
    expect(legend).toHaveTextContent('Super Mario Bros., g = 28,1 m/s²');
    expect(legend).toHaveTextContent('Celeste, g = 112,5 m/s²');
    expect(strokeOf(container, 'tierra')).toBe('var(--chart-1)');
    expect(strokeOf(container, 'super-mario-bros')).toBe('var(--chart-3)');
    expect(strokeOf(container, 'celeste')).toBe('var(--chart-4)');
  });

  test("design: the rise of Celeste's and Mario's jumps up to the apex (t_h, h) each asks for", () => {
    const { container } = render(<JumpFigure variant="diseno" />);

    expect(strokeOf(container, 'celeste')).toBe('var(--chart-4)');
    expect(strokeOf(container, 'super-mario-bros')).toBe('var(--chart-3)');
    expect(container.querySelectorAll('[data-apex]')).toHaveLength(2);
    expect(screen.getByText(/h = 4,00 m/)).toBeInTheDocument();
    expect(screen.getByText(/h = 0,76 m/)).toBeInTheDocument();
  });
});
