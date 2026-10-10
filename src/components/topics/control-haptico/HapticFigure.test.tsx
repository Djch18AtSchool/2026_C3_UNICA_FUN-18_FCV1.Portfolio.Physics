// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import HapticFigure from './HapticFigure';

const strokeOf = (container: HTMLElement, id: string) =>
  container.querySelector(`[data-series="${id}"]`)?.getAttribute('stroke');

/** A ResizeObserver that reports every observed element at `width` px, as on a phone. */
function stubWidth(width: number): void {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(private readonly callback: ResizeObserverCallback) {}
      observe(element: Element) {
        this.callback(
          [{ target: element, contentRect: { width } } as unknown as ResizeObserverEntry],
          this as unknown as ResizeObserver,
        );
      }
      disconnect() {}
      unobserve() {}
    },
  );
}

/** Length of an Arrow drawn inside `group`, from its line. */
function arrowLength(group: Element): number {
  const line = group.querySelector('line') as SVGLineElement;
  const [x1, y1, x2, y2] = ['x1', 'y1', 'x2', 'y2'].map((name) => Number(line.getAttribute(name)));
  return Math.hypot(x2 - x1, y2 - y1);
}

describe('HapticFigure', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test('vibration: a constant 1,6 N reads the same at every x; the 400 N/m spring does not', () => {
    const { container } = render(<HapticFigure variant="vibracion" />);
    const legend = screen.getByRole('list', { name: 'Leyenda' });

    expect(legend).toHaveTextContent('Vibración fija, F = F₀');
    expect(legend).toHaveTextContent('Resorte de 400 N/m, F = k x');
    expect(strokeOf(container, 'vibracion')).toBe('var(--chart-3)');
    expect(strokeOf(container, 'hooke')).toBe('var(--chart-1)');
    expect(screen.getAllByText('1,6 N')).toHaveLength(2);
    expect(screen.getByText('0,8 N')).toBeInTheDocument();
    expect(screen.getByText('3,2 N')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /1,6 N a 2 mm y a 8 mm/ })).toBeInTheDocument();
  });

  test('Hooke: the line reaches 3,2 N at 8 mm and the area under it is 12,8 mJ', () => {
    const { container } = render(<HapticFigure variant="hooke" />);

    expect(container.querySelector('[data-area="energia"]')).not.toBeNull();
    expect(screen.getByText('U = 12,8 mJ')).toBeInTheDocument();
    expect(screen.getByText('1,6 N')).toBeInTheDocument();
    expect(screen.getByText('3,2 N')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /12,8 mJ/ })).toBeInTheDocument();
  });

  test('on a phone the plots keep their labels', () => {
    stubWidth(340);
    render(<HapticFigure variant="hooke" />);

    expect(screen.getByText('U = 12,8 mJ')).toBeInTheDocument();
  });

  test('third law: two equal and opposite forces, each on its own body', () => {
    render(<HapticFigure variant="tercera-ley" />);
    const diagram = screen.getByTestId('third-law-diagram');
    const onTrigger = diagram.querySelector('[data-force="dedo-gatillo"]') as Element;
    const onFinger = diagram.querySelector('[data-force="gatillo-dedo"]') as Element;

    expect(arrowLength(onTrigger)).toBeCloseTo(arrowLength(onFinger), 9);
    expect(within(diagram).getByText('Sobre el gatillo')).toBeInTheDocument();
    expect(within(diagram).getByText('Sobre el dedo')).toBeInTheDocument();
    expect(diagram).toHaveTextContent('F gatillo→dedo = −F dedo→gatillo');
    expect(screen.getByRole('img', { name: /tercera ley/i })).toBeInTheDocument();
  });
});
