/**
 * Who holds each pedal of «Conducir»: the arrow keys, Space or Enter on a focused pedal, and every
 * pointer (mouse, pen, each finger) pressing it. A pedal is held while any source holds it, so
 * releasing one finger does not let go of a key. Pure: each change returns new sources.
 */
import type { PedalsHeld } from '../../../lib/physics/regenDrive';

export type PedalId = keyof PedalsHeld;
/** 'arrow' (↑/↓), 'key' (Space or Enter on the pedal) or `pointer-<id>`. */
export type PedalSource = string;
export type PedalSources = Readonly<Record<PedalId, readonly PedalSource[]>>;

export const NO_PEDALS: PedalSources = { throttle: [], brake: [] };

/** ↑ is the accelerator and ↓ the brake, while a pedal has the focus. */
export const ARROW_PEDALS: Readonly<Record<string, PedalId>> = {
  ArrowUp: 'throttle',
  ArrowDown: 'brake',
};
/** The keys that hold the focused pedal down, as a button is held. */
export const HOLD_KEYS: readonly string[] = [' ', 'Enter'];

export function pressPedal(
  sources: PedalSources,
  pedal: PedalId,
  source: PedalSource,
): PedalSources {
  if (sources[pedal].includes(source)) return sources;
  return { ...sources, [pedal]: [...sources[pedal], source] };
}

export function releasePedal(
  sources: PedalSources,
  pedal: PedalId,
  source: PedalSource,
): PedalSources {
  if (!sources[pedal].includes(source)) return sources;
  return { ...sources, [pedal]: sources[pedal].filter((held) => held !== source) };
}

export function heldOf(sources: PedalSources): PedalsHeld {
  return { throttle: sources.throttle.length > 0, brake: sources.brake.length > 0 };
}
