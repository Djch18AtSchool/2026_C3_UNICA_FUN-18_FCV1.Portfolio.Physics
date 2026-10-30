// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import FlybyFigure from './FlybyFigure';

const strokeOf = (container: HTMLElement, id: string) =>
  container.querySelector(`[data-series="${id}"]`)?.getAttribute('stroke');

describe('FlybyFigure', () => {
  afterEach(cleanup);

  test('vis-viva: data dots on the bound orbit before Jupiter and on a hyperbolic one after', () => {
    const { container } = render(<FlybyFigure variant="vis-viva" />);
    const legend = screen.getByRole('list', { name: 'Leyenda' });

    expect(legend).toHaveTextContent('Datos de Horizons');
    expect(legend).toHaveTextContent('Solo el Sol antes de Júpiter');
    expect(legend).toHaveTextContent('Después de Júpiter');
    expect(legend).toHaveTextContent('Escape');
    expect(strokeOf(container, 'despues')).toBe('var(--jupiter)');
    expect(strokeOf(container, 'escape')).toBe('var(--sun)');
    expect(container.querySelectorAll('[data-dot]').length).toBeGreaterThan(40);
    expect(screen.getByText(`Afelio: 6,29 UA, 6,21 km/s`)).toBeInTheDocument();
    expect(screen.getByText('r (UA)')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /ε = −121,7/ })).toBeInTheDocument();
  });

  test('hiperbola: the V2 path in Jupiter frame with r_p, e and δ, and equal v∞ arrows', () => {
    const { container } = render(<FlybyFigure variant="hiperbola" />);

    expect(container.querySelector('[data-planet="jupiter"]')?.getAttribute('fill')).toBe(
      'var(--jupiter)',
    );
    expect(screen.getByText('e = 1,330')).toBeInTheDocument();
    expect(screen.getByText('δ = 97,5°')).toBeInTheDocument();
    expect(screen.getByText(`rₚ = 10,09 R_J`)).toBeInTheDocument();
    expect(screen.getAllByText(`v∞ = 7,62 km/s`)).toHaveLength(2);
    expect(screen.getByRole('img', { name: /721\u202f375\u202fkm/ })).toBeInTheDocument();
  });

  test('triangulo: Jupiter gains +9,91 km/s and Neptune loses 2,13 km/s, side by side', () => {
    const { container } = render(<FlybyFigure variant="triangulo" />);

    expect(screen.getByText(`Júpiter (V2): +9,91 km/s`)).toBeInTheDocument();
    expect(screen.getByText(`Neptuno (V2): −2,13 km/s`)).toBeInTheDocument();
    expect(strokeOf(container, 'vp-jupiter')).toBe('var(--jupiter)');
    expect(strokeOf(container, 'vp-neptune')).toBe('var(--neptune)');
    expect(screen.getByRole('img', { name: /Neptuno.*giro fuera del plano/ })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Júpiter/ })).not.toHaveAccessibleName(
      /fuera del plano/,
    );
    expect(screen.getByText(/4,4·10⁻²¹\sm\/s/)).toBeInTheDocument();
  });
});
