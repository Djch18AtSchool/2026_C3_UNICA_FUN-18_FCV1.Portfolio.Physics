/**
 * The soft change of scene when a preset is chosen (auditoría §8): the lab's canvas comes back
 * from faint to full in PRESET_TRANSITION_MS, with the new values already drawn. Only opacity, as
 * a Web Animation: nothing moves (no box a reader or a test measures changes), nothing waits (the
 * values, the readouts and their announcements change at once) and nothing stays (no attribute or
 * class: the animation ends by itself, and a second choice replaces the first). Under reduced
 * motion, or in a browser without Web Animations, the values just change.
 *
 * LabShell provides the canvas (PresetTransitionContext); LabPresets plays it after the commit
 * that draws the chosen preset, so the first painted frame is already the new scene, faint.
 */
import { createContext } from 'react';

/** auditoría §8: 200 ms in the scene. */
export const PRESET_TRANSITION_MS = 200;
/** The animation's id, so a second choice finds and replaces it (and a test finds it). */
export const PRESET_TRANSITION_ID = 'lab-preset-transition';
/** The new scene's opacity in its first frame. */
const PRESET_TRANSITION_FROM_OPACITY = 0.4;
const PRESET_TRANSITION_KEYFRAMES: Keyframe[] = [
  { opacity: PRESET_TRANSITION_FROM_OPACITY },
  { opacity: 1 },
];

/**
 * Fades `element` in from faint, replacing a transition still running on it. Does nothing under
 * reduced motion, without an element or without Web Animations; returns the animation it started.
 */
export function playPresetTransition(
  element: Element | null,
  isReduced: boolean,
): Animation | undefined {
  if (!element || isReduced || typeof element.animate !== 'function') return undefined;
  const running = typeof element.getAnimations === 'function' ? element.getAnimations() : [];
  for (const animation of running) {
    if (animation.id === PRESET_TRANSITION_ID) animation.cancel();
  }
  const animation = element.animate(PRESET_TRANSITION_KEYFRAMES, {
    duration: PRESET_TRANSITION_MS,
    easing: 'ease-out',
  });
  animation.id = PRESET_TRANSITION_ID;
  return animation;
}

/** Plays the transition on the lab's canvas; outside a LabShell, nothing. */
export const PresetTransitionContext = createContext<() => void>(() => undefined);
