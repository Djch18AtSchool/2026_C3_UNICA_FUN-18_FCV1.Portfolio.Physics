import { useEffect, useRef, useState, type RefObject } from 'react';

/**
 * Tracks the rendered width of an element so an SVG can be drawn at its real pixel size and keep
 * real-size text at any width. Starts at `initialWidth` until the first ResizeObserver report.
 */
export function useElementWidth<T extends HTMLElement>(
  initialWidth: number,
): [RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(initialWidth);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      const next = Math.round(entry.contentRect.width);
      if (next > 0) setWidth(next);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}
