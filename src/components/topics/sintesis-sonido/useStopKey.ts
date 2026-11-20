/**
 * A key that silences the synthesiser (WCAG 1.4.2's «mechanism to stop», besides «Detener»):
 * K, with the focus anywhere inside the lab but where it types (a number field, a select), and
 * with no modifier. Listened to on the lab's card, so it never takes K from the rest of the page.
 */
import { useEffect, useRef, type RefObject } from 'react';

export const STOP_KEY = 'k';

/** Where K is a letter being typed or an option being sought, not a command. */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.matches(
      'textarea, select, input:not([type="range"]):not([type="checkbox"]):not([type="radio"])',
    )
  );
}

/** Stops through `onStop` while `isPlaying`, when K is pressed inside the lab that holds `anchor`. */
export function useStopKey(
  anchor: RefObject<HTMLElement | null>,
  isPlaying: boolean,
  onStop: () => void,
): void {
  const latest = useRef({ isPlaying, onStop });
  latest.current = { isPlaying, onStop };
  useEffect(() => {
    const lab = anchor.current?.closest<HTMLElement>('[data-lab-shell]');
    if (!lab) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      const hasModifier = event.altKey || event.ctrlKey || event.metaKey;
      if (event.key.toLowerCase() !== STOP_KEY || hasModifier || isTypingTarget(event.target)) {
        return;
      }
      if (!latest.current.isPlaying) return;
      event.preventDefault();
      latest.current.onStop();
    };
    lab.addEventListener('keydown', onKeyDown);
    return () => lab.removeEventListener('keydown', onKeyDown);
  }, [anchor]);
}
