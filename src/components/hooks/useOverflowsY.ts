import { useEffect, useRef, useState, type RefObject } from 'react';

/** Content this much taller than its box is layout rounding, not something hidden. */
const ROUNDING_PX = 1;

/**
 * Whether an element's content is taller than the element (it scrolls vertically), kept current
 * as the element or any of its children resizes. False on the server and until first measured.
 */
export function useOverflowsY<T extends HTMLElement>(): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [overflows, setOverflows] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(() => {
      setOverflows(element.scrollHeight > element.clientHeight + ROUNDING_PX);
    });
    observer.observe(element);
    for (const child of element.children) observer.observe(child);
    return () => observer.disconnect();
  }, []);
  return [ref, overflows];
}
