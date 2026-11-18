// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { plexViolations } from '../../../test-glyphs';
import { plain, strayDollars, stubWidth } from './soundTestKit';
import ToneFigure from './ToneFigure';

describe('ToneFigure', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test('seno: one curve without its shifted copy, and a single bar at n = 1', () => {
    const { container } = render(<ToneFigure variant="seno" />);

    expect(container.querySelectorAll('[data-series]')).toHaveLength(1);
    expect(
      [...container.querySelectorAll('rect[data-harmonic]')].map((bar) =>
        bar.getAttribute('data-harmonic'),
      ),
    ).toEqual(['1']);
    expect(screen.queryByTestId('odd-even')).toBeNull();
    expect(plain(screen.getAllByRole('img')[0].getAttribute('aria-label'))).toContain(
      'T = 3,22 ms',
    );
  });

  test('recetas: the square wave (odd only) and the sawtooth (all), each with its odd/even power', () => {
    render(<ToneFigure variant="recetas" />);
    const square = screen.getByTestId('receta-cuadrada');
    const saw = screen.getByTestId('receta-sierra');

    expect(square.querySelectorAll('rect[data-parity="par"]')).toHaveLength(0);
    expect(saw.querySelectorAll('rect[data-parity="par"]')).toHaveLength(6);
    expect(plain(square.querySelector('[data-testid="odd-even"]')?.textContent)).toMatch(
      /sin pares$/,
    );
    expect(plain(saw.querySelector('[data-testid="odd-even"]')?.textContent)).toMatch(/\+5,1 dB$/);
    expect(square.querySelectorAll('[data-series]')).toHaveLength(2);
  });

  test.each(['seno', 'recetas'] as const)(
    '%s at 360 px: Plex draws every character, with no raw $',
    (variant) => {
      stubWidth(360);
      const { container } = render(<ToneFigure variant={variant} />);

      expect(plexViolations(container)).toEqual([]);
      expect(strayDollars(container)).toEqual([]);
    },
  );
});
