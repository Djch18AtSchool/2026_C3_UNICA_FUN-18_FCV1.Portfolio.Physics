import { describe, expect, test } from 'vitest';
import { clockReducer, createClock, type ClockState } from './clock';

const c: ClockState = createClock(10);

describe('createClock', () => {
  test('starts paused at t = 0 with unit speed and no loop', () => {
    expect(createClock(2)).toEqual({ t: 0, duration: 2, playing: false, speed: 1, loop: false });
  });

  test('accepts a zero duration and rejects a negative or NaN one', () => {
    expect(createClock(0).duration).toBe(0);
    expect(() => createClock(-1)).toThrow(RangeError);
    expect(() => createClock(Number.NaN)).toThrow(RangeError);
  });
});

describe('clockReducer: tick', () => {
  test('stops at the end when not looping', () => {
    expect(
      clockReducer({ ...c, t: 0.9, duration: 1, playing: true }, { type: 'tick', dt: 0.2 }),
    ).toMatchObject({ t: 1, playing: false });
  });

  test('wraps around and keeps playing when looping', () => {
    expect(
      clockReducer(
        { ...c, t: 0.9, duration: 1, playing: true, loop: true },
        { type: 'tick', dt: 0.2 },
      ),
    ).toMatchObject({ t: expect.closeTo(0.1, 9), playing: true });
  });

  test('advances by dt · speed', () => {
    expect(
      clockReducer({ ...c, t: 1, playing: true, speed: 2 }, { type: 'tick', dt: 0.25 }),
    ).toMatchObject({ t: 1.5 });
  });

  test('is ignored while paused', () => {
    const paused = { ...c, t: 1 };
    expect(clockReducer(paused, { type: 'tick', dt: 0.25 })).toBe(paused);
  });

  test('stops a looping zero-duration clock instead of dividing by zero', () => {
    expect(
      clockReducer({ ...c, duration: 0, playing: true, loop: true }, { type: 'tick', dt: 0.1 }),
    ).toMatchObject({ t: 0, playing: false });
  });

  test('rejects a negative or non-finite dt', () => {
    const playing = { ...c, playing: true };
    expect(() => clockReducer(playing, { type: 'tick', dt: -0.1 })).toThrow(RangeError);
    expect(() => clockReducer(playing, { type: 'tick', dt: Number.POSITIVE_INFINITY })).toThrow(
      RangeError,
    );
  });
});

describe('clockReducer: seek and step', () => {
  test('seek clamps to [0, duration] and pauses', () => {
    expect(clockReducer({ ...c, duration: 2 }, { type: 'seek', t: 5 })).toMatchObject({
      t: 2,
      playing: false,
    });
    expect(clockReducer({ ...c, playing: true }, { type: 'seek', t: -3 })).toMatchObject({
      t: 0,
      playing: false,
    });
  });

  test('step clamps to [0, duration] and pauses', () => {
    expect(clockReducer({ ...c, t: 0 }, { type: 'step', dt: -1 })).toMatchObject({ t: 0 });
    expect(clockReducer({ ...c, t: 1, playing: true }, { type: 'step', dt: 0.5 })).toMatchObject({
      t: 1.5,
      playing: false,
    });
    expect(clockReducer({ ...c, t: 9.9 }, { type: 'step', dt: 1 })).toMatchObject({ t: 10 });
  });

  test('seek and step reject a non-finite value', () => {
    expect(() => clockReducer(c, { type: 'seek', t: Number.NaN })).toThrow(RangeError);
    expect(() => clockReducer(c, { type: 'step', dt: Number.NaN })).toThrow(RangeError);
  });
});

describe('clockReducer: playback controls', () => {
  test('play restarts from 0 at the end', () => {
    expect(clockReducer({ ...c, t: 2, duration: 2 }, { type: 'play' })).toMatchObject({
      t: 0,
      playing: true,
    });
  });

  test('play keeps t when not at the end', () => {
    expect(clockReducer({ ...c, t: 3 }, { type: 'play' })).toMatchObject({ t: 3, playing: true });
  });

  test('pause stops playback without moving t', () => {
    expect(clockReducer({ ...c, t: 3, playing: true }, { type: 'pause' })).toMatchObject({
      t: 3,
      playing: false,
    });
  });

  test('toggle flips playing and restarts from 0 at the end', () => {
    expect(clockReducer({ ...c, playing: true }, { type: 'toggle' }).playing).toBe(false);
    expect(clockReducer({ ...c, t: 10 }, { type: 'toggle' })).toMatchObject({
      t: 0,
      playing: true,
    });
  });

  test('reset returns to t = 0 paused and keeps speed, loop and duration', () => {
    expect(
      clockReducer({ ...c, t: 4, playing: true, speed: 2, loop: true }, { type: 'reset' }),
    ).toEqual({ t: 0, duration: 10, playing: false, speed: 2, loop: true });
  });
});

describe('clockReducer: settings', () => {
  test('setSpeed sets a positive speed and rejects zero or negative', () => {
    expect(clockReducer(c, { type: 'setSpeed', speed: 0.5 }).speed).toBe(0.5);
    expect(() => clockReducer(c, { type: 'setSpeed', speed: 0 })).toThrow(RangeError);
    expect(() => clockReducer(c, { type: 'setSpeed', speed: -1 })).toThrow(RangeError);
  });

  test('setLoop sets the flag', () => {
    expect(clockReducer(c, { type: 'setLoop', loop: true }).loop).toBe(true);
  });

  test('setDuration clamps t to the new duration and rejects a negative one', () => {
    expect(
      clockReducer({ ...c, t: 3, duration: 5 }, { type: 'setDuration', duration: 2 }),
    ).toMatchObject({ t: 2 });
    expect(clockReducer({ ...c, t: 3 }, { type: 'setDuration', duration: 20 })).toMatchObject({
      t: 3,
      duration: 20,
    });
    expect(() => clockReducer(c, { type: 'setDuration', duration: -1 })).toThrow(RangeError);
  });
});

describe('clockReducer: immutability', () => {
  test('never mutates the input state', () => {
    const before = { ...c };
    clockReducer(before, { type: 'play' });
    expect(before.playing).toBe(false);
  });

  test('returns a new object for every state-changing action', () => {
    const frozen = Object.freeze({ ...c, t: 1, playing: true });
    const actions = [
      { type: 'play' },
      { type: 'pause' },
      { type: 'toggle' },
      { type: 'reset' },
      { type: 'seek', t: 2 },
      { type: 'step', dt: 0.1 },
      { type: 'tick', dt: 0.1 },
      { type: 'setSpeed', speed: 2 },
      { type: 'setLoop', loop: true },
      { type: 'setDuration', duration: 5 },
    ] as const;
    for (const action of actions) {
      const next = clockReducer(frozen, action);
      expect(next).not.toBe(frozen);
    }
    expect(frozen).toEqual({ ...c, t: 1, playing: true });
  });
});
