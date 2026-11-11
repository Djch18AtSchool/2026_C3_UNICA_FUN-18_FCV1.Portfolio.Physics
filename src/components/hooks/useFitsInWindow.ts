import { useEffect, useRef, useState, type RefObject } from 'react';

/**
 * Whether an element fits the window below an offset (a CSS length, e.g. the topic bar's
 * clearance): what a sticky element needs, since one taller than the window would leave its foot
 * out of reach. Kept current as the element or the window resizes. Undefined on the server and
 * until first measured, so whatever it switches on (stickiness) starts off; switching it on later
 * moves nothing in the layout.
 */
export function useFitsInWindow<T extends HTMLElement>(
  offset: string,
): [RefObject<T | null>, boolean | undefined] {
  const ref = useRef<T>(null);
  const [fits, setFits] = useState<boolean | undefined>(undefined);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === 'undefined') return undefined;
    const check = () =>
      setFits(
        element.getBoundingClientRect().height + lengthPx(element, offset) <= window.innerHeight,
      );
    const observer = new ResizeObserver(check);
    observer.observe(element);
    window.addEventListener('resize', check);
    check();
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', check);
    };
  }, [offset]);
  return [ref, fits];
}

/** A CSS length resolved in the element's context: the height of a probe of that height. */
function lengthPx(element: HTMLElement, length: string): number {
  const probe = document.createElement('div');
  probe.dataset.fitsProbe = '';
  probe.style.cssText = `position:absolute;visibility:hidden;width:0;height:${length}`;
  element.append(probe);
  const height = probe.getBoundingClientRect().height;
  probe.remove();
  return height;
}
