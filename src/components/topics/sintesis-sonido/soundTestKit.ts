/**
 * Fixtures of Tema 11's figure tests: a ResizeObserver that reports a width, the text a reader
 * reads (narrow no-break spaces as spaces) and every paint a figure uses.
 */
import { vi } from 'vitest';

/** A ResizeObserver that reports every observed element at `width` px. */
export function stubWidth(width: number): void {
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

/** formatNumber's narrow no-break spaces (thousands, units) read as plain spaces. */
export const plain = (text: string | null | undefined): string =>
  (text ?? '').replace(/[  ]/g, ' ');

/** Every fill and stroke a drawing uses. */
export const paints = (container: Element): string[] =>
  [...container.querySelectorAll('[fill], [stroke]')].flatMap((element) =>
    ['fill', 'stroke'].map((name) => element.getAttribute(name) ?? ''),
  );

/** Text nodes outside KaTeX that still hold a raw `$`. */
export const strayDollars = (container: Element): string[] =>
  [...container.querySelectorAll('*')]
    .flatMap((element) => [...element.childNodes])
    .filter((node) => node.nodeType === 3 && node.textContent?.includes('$'))
    .filter((node) => !node.parentElement?.closest('.katex'))
    .map((node) => node.textContent ?? '');
