import { vi } from 'vitest';
import type { SvgPlotProps } from './SvgPlot';

/** Shared fixtures of the SvgPlot test files. */
export const PROPS: SvgPlotProps = {
  title: 'Trayectoria',
  xLabel: 'x',
  xUnit: 'm',
  yLabel: 'y',
  yUnit: 'm',
  series: [
    {
      id: 'path',
      label: 'Trayectoria',
      points: [
        { x: 0, y: 0 },
        { x: 5, y: 3 },
        { x: 10, y: 0 },
      ],
    },
  ],
  xDomain: { min: 0, max: 10 },
  yDomain: { min: 0, max: 4 },
  ariaLabel: 'Trayectoria parabólica del salto',
};

/** Identity CTM on the slider's svg: client pixels are viewBox units. */
export function mockIdentityCtm(slider: HTMLElement): void {
  const svg = slider.closest('svg') as SVGSVGElement;
  Object.defineProperty(svg, 'getScreenCTM', {
    configurable: true,
    value: () => ({ inverse: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }) }),
  });
}

/** A ResizeObserver that reports `width` for every observed element as soon as it observes it. */
export function stubResizeObserver(width: number): void {
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
}

export function viewBoxOf(svg: Element): number[] {
  return (svg.getAttribute('viewBox') ?? '').split(' ').map(Number);
}
