/** Test-only: a SimClock whose transitions are spies and whose live time is a real frame store. */
import { vi } from 'vitest';
import { createFrameStore } from './components/lab/frameStore';
import type { SimClock } from './components/lab/useSimClock';
import { createClock, type ClockState } from './lib/physics/clock';

export function fakeClock(overrides: Partial<ClockState> = {}, duration = 4): SimClock {
  const state = { ...createClock(duration), ...overrides };
  return {
    state,
    frame: createFrameStore(state.t),
    play: vi.fn(),
    pause: vi.fn(),
    toggle: vi.fn(),
    reset: vi.fn(),
    seek: vi.fn(),
    step: vi.fn(),
    setSpeed: vi.fn(),
    setLoop: vi.fn(),
  };
}
