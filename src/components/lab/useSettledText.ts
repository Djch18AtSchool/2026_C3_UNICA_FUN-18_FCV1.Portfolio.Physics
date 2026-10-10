import { useEffect, useRef, useState } from 'react';

/**
 * The text once it has stopped changing for `delayMs`, for a polite live region: a drag or a
 * playing clock changes it every frame, and only the value it settles on is worth announcing.
 * Starts empty and stays empty until the text first differs from its value at mount, so loading
 * the page announces nothing.
 */
export function useSettledText(text: string, delayMs: number): string {
  const [settled, setSettled] = useState('');
  const initialRef = useRef(text);

  useEffect(() => {
    if (text === initialRef.current && settled === '') return undefined;
    const timer = setTimeout(() => setSettled(text), delayMs);
    return () => clearTimeout(timer);
    // `settled` only gates the first announcement; re-running on its change is not needed.
  }, [text, delayMs]);

  return settled;
}
