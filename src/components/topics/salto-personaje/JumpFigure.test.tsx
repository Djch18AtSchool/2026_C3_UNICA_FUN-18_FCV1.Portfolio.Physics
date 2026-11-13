// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { mathTextWidth } from '../../../lib/mathNotation';
import { mathSourceText } from '../../../test-inline-math';
import { plexViolations } from '../../../test-glyphs';
import { svgText } from '../../../test-svg-text';
import JumpFigure from './JumpFigure';

const strokeOf = (container: HTMLElement, id: string) =>
  container.querySelector(`[data-series="${id}"]`)?.getAttribute('stroke');

describe('JumpFigure', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

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
    const legend = screen.getByRole('toolbar', { name: 'Leyenda: realzar una serie' });

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
    expect(screen.getByText(svgText(/^th = 0,53\ss$/))).toBeInTheDocument();
    expect(screen.getByText(svgText(/^th = 0,12\ss$/))).toBeInTheDocument();
  });

  // The figure's plot is about 290 px wide on a 375 px phone.
  test.each([343, 300, 290])(
    "design at %i px: Celeste's apex label ends before Mario's dotted guide",
    (width) => {
      vi.stubGlobal(
        'ResizeObserver',
        class {
          constructor(private readonly callback: ResizeObserverCallback) {}
          observe(target: Element) {
            const entry = { target, contentRect: { width } } as unknown as ResizeObserverEntry;
            this.callback([entry], this as unknown as ResizeObserver);
          }
          unobserve() {}
          disconnect() {}
        },
      );
      const { container } = render(<JumpFigure variant="diseno" />);
      const [mario, celeste] = [...container.querySelectorAll('[data-apex]')];
      const guideX = Number(mario.querySelector('circle')?.getAttribute('cx'));
      const [text, ...otherLines] = [...celeste.querySelectorAll('text')];
      const longest = Math.max(
        ...[text, ...otherLines].map((line) =>
          mathTextWidth(line.getAttribute('data-notation') ?? line.textContent ?? '', 12, 'mono'),
        ),
      );

      expect(Number(text.getAttribute('x')) + longest).toBeLessThanOrEqual(guideX - 4);
      // …and still starts right of its own apex dot (radius 5).
      const apexX = Number(celeste.querySelector('circle')?.getAttribute('cx'));
      expect(Number(text.getAttribute('x'))).toBeGreaterThanOrEqual(apexX + 6);
    },
  );

  test('the free-fall title and the designs legend write v_0 in KaTeX', () => {
    const free = render(<JumpFigure variant="caida-libre" />);
    expect(mathSourceText(free.container)).toContain('$v_0$ = 13,1 m/s');
    cleanup();
    const design = render(<JumpFigure variant="diseno" />);
    expect(
      mathSourceText(screen.getByRole('toolbar', { name: 'Leyenda: realzar una serie' })),
    ).toContain('Celeste: g = 112,5 m/s², $v_0$ = 13,1 m/s');
    expect(design.container.querySelector('svg[role="img"]')?.getAttribute('aria-label')).toContain(
      't sub h',
    );
  });

  test.each(['caida-libre', 'gravedades', 'diseno'] as const)(
    '%s: every character outside KaTeX is one IBM Plex draws',
    (variant) => {
      const { container } = render(<JumpFigure variant={variant} />);

      expect(plexViolations(container)).toEqual([]);
    },
  );
});
