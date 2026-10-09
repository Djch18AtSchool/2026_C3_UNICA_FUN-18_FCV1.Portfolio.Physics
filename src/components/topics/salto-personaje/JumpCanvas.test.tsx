// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import JumpCanvas from './JumpCanvas';
import { computeJump, JUMP_DEFAULTS } from './jumpModel';

type ChangeListener = (event: MediaQueryListEvent) => void;

/** A controllable `prefers-reduced-motion` query: flip it with `setReduced`. */
function stubReducedMotion(initiallyReduced: boolean) {
  const listeners = new Set<ChangeListener>();
  const query = {
    matches: initiallyReduced,
    media: '(prefers-reduced-motion: reduce)',
    addEventListener: (_type: 'change', listener: ChangeListener) => listeners.add(listener),
    removeEventListener: (_type: 'change', listener: ChangeListener) => listeners.delete(listener),
  };
  vi.stubGlobal('matchMedia', () => query);
  return {
    listenerCount: () => listeners.size,
    setReduced(reduced: boolean) {
      query.matches = reduced;
      listeners.forEach((listener) => listener({ matches: reduced } as MediaQueryListEvent));
    },
  };
}

const live = computeJump(JUMP_DEFAULTS);
const ghost = computeJump(JUMP_DEFAULTS);

function marker(): Element | null {
  return screen.getByTestId('jump-canvas').querySelector('circle');
}

describe('JumpCanvas', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', () => 0);
    vi.stubGlobal('cancelAnimationFrame', () => undefined);
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test('animates the marker when motion is allowed', () => {
    stubReducedMotion(false);

    render(<JumpCanvas live={live} ghost={ghost} g={JUMP_DEFAULTS.g} />);

    expect(marker()).not.toBeNull();
  });

  test('stops animating when the reduced-motion preference turns on after mount', () => {
    const media = stubReducedMotion(false);
    render(<JumpCanvas live={live} ghost={ghost} g={JUMP_DEFAULTS.g} />);

    act(() => media.setReduced(true));

    expect(marker()).toBeNull();
  });

  test('resumes the animation when the preference turns off again', () => {
    const media = stubReducedMotion(true);
    render(<JumpCanvas live={live} ghost={ghost} g={JUMP_DEFAULTS.g} />);
    expect(marker()).toBeNull();

    act(() => media.setReduced(false));

    expect(marker()).not.toBeNull();
  });

  test('stops listening on unmount', () => {
    const media = stubReducedMotion(false);
    const { unmount } = render(<JumpCanvas live={live} ghost={ghost} g={JUMP_DEFAULTS.g} />);
    expect(media.listenerCount()).toBe(1);

    unmount();

    expect(media.listenerCount()).toBe(0);
  });
});
