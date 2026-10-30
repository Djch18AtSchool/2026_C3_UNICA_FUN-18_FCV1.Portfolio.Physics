import { describe, expect, test } from 'vitest';
import {
  COLLISION_DEFAULTS,
  COLLISION_DURATION_S,
  collisionOutcome,
  facePositions,
  trackHalfSpan,
  type CollisionSettings,
} from './collisionScene';

const settings = (overrides: Partial<CollisionSettings>): CollisionSettings => ({
  ...COLLISION_DEFAULTS,
  ...overrides,
});

describe('collisionOutcome', () => {
  test.each([0, 0.5, 1])('conserves p and loses ΔK = (1 − e²) K_rel for e = %s', (e) => {
    const outcome = collisionOutcome(settings({ e, m1: 2, m2: 5, v1: 3, v2: -1 }));

    expect(outcome.pAfter).toBeCloseTo(outcome.pBefore, 12);
    expect(outcome.lossFraction).toBeCloseTo(1 - e * e, 12);
    // μ = 10/7 kg, v_rel = 4 m/s.
    expect(outcome.relativeEnergy).toBeCloseTo(0.5 * (10 / 7) * 16, 12);
  });

  test('e = 0 leaves both bodies with the centre-of-mass velocity', () => {
    const outcome = collisionOutcome(settings({ e: 0, m1: 1, m2: 3, v1: 4, v2: 0 }));

    expect(outcome.v1After).toBeCloseTo(1, 12);
    expect(outcome.v2After).toBeCloseTo(1, 12);
  });

  test('the wall is m₂ → ∞: v₁′ = −e v₁ and the wall takes the impulse 2·m₁v₁ at e = 1', () => {
    const outcome = collisionOutcome(settings({ isWall: true, e: 1, m1: 2, v1: 3, v2: 7 }));

    expect(outcome.v1After).toBeCloseTo(-3, 12);
    expect(outcome.v2After).toBe(0);
    expect(outcome.impulse).toBeCloseTo(-12, 12);
    expect(outcome.kineticLoss).toBeCloseTo(0, 12);
  });

  test('bodies that do not approach do not collide: nothing changes', () => {
    const outcome = collisionOutcome(settings({ v1: -1, v2: 2 }));

    expect(outcome.isApproaching).toBe(false);
    expect(outcome.v1After).toBe(-1);
    expect(outcome.kineticLoss).toBe(0);
    expect(outcome.lossFraction).toBe(0);
  });
});

describe('facePositions and trackHalfSpan', () => {
  test('the faces meet at x = 0 at 1 s and never overlap', () => {
    for (const s of [settings({}), settings({ v1: -1, v2: 2 }), settings({ e: 0 })]) {
      const outcome = collisionOutcome(s);
      for (let t = 0; t <= COLLISION_DURATION_S; t += 0.1) {
        const { x1, x2 } = facePositions(s, outcome, t);
        expect(x2 - x1).toBeGreaterThanOrEqual(-1e-12);
      }
    }
    const s = settings({});
    const contact = facePositions(s, collisionOutcome(s), 1);
    expect(Math.abs(contact.x1)).toBe(0);
    expect(Math.abs(contact.x2)).toBe(0);
  });

  test('the track holds every position over the timeline', () => {
    const s = settings({ v1: 8, v2: -6 });
    const outcome = collisionOutcome(s);
    const half = trackHalfSpan(s, outcome);

    for (const t of [0, COLLISION_DURATION_S]) {
      const { x1, x2 } = facePositions(s, outcome, t);
      expect(Math.abs(x1)).toBeLessThan(half);
      expect(Math.abs(x2)).toBeLessThan(half);
    }
    expect(
      trackHalfSpan(settings({ v1: 0.1, v2: 0 }), collisionOutcome(settings({ v1: 0.1 }))),
    ).toBe(1);
  });
});
