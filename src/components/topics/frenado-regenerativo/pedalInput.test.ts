import { describe, expect, test } from 'vitest';
import {
  ARROW_PEDALS,
  heldOf,
  HOLD_KEYS,
  NO_PEDALS,
  pressPedal,
  releasePedal,
  type PedalSources,
} from './pedalInput';

describe('pedal input: each pedal is held while any of its sources holds it', () => {
  test('nothing held at first', () => {
    expect(heldOf(NO_PEDALS)).toEqual({ throttle: false, brake: false });
  });

  test('a press holds its pedal; the release of that source lets it go', () => {
    const pressed = pressPedal(NO_PEDALS, 'brake', 'arrow');

    expect(heldOf(pressed)).toEqual({ throttle: false, brake: true });
    expect(heldOf(releasePedal(pressed, 'brake', 'arrow'))).toEqual(heldOf(NO_PEDALS));
  });

  test('two sources on one pedal: releasing one keeps it held (a key and a finger)', () => {
    const both = pressPedal(pressPedal(NO_PEDALS, 'throttle', 'arrow'), 'throttle', 'pointer-1');

    expect(heldOf(releasePedal(both, 'throttle', 'pointer-1')).throttle).toBe(true);
    expect(heldOf(releasePedal(both, 'throttle', 'arrow')).throttle).toBe(true);
  });

  test('a repeated press or a release of a source that is not holding changes nothing', () => {
    const pressed = pressPedal(NO_PEDALS, 'brake', 'key');

    expect(pressPedal(pressed, 'brake', 'key')).toBe(pressed);
    expect(releasePedal(pressed, 'throttle', 'key')).toBe(pressed);
  });

  test('never mutates the sources it receives', () => {
    const sources: PedalSources = { throttle: [], brake: ['arrow'] };
    const copy = structuredClone(sources);

    pressPedal(sources, 'throttle', 'key');
    releasePedal(sources, 'brake', 'arrow');

    expect(sources).toEqual(copy);
  });

  test('↑ is the accelerator and ↓ the brake; Space and Enter hold the focused pedal', () => {
    expect(ARROW_PEDALS).toEqual({ ArrowUp: 'throttle', ArrowDown: 'brake' });
    expect(HOLD_KEYS).toEqual([' ', 'Enter']);
  });
});
