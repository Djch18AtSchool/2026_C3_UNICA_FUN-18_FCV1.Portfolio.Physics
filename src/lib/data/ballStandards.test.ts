import { describe, expect, test } from 'vitest';
import { sourceSchema } from '../../content/topicSchema';
import { restitutionFromHeights } from '../physics';
import { BALL_STANDARDS, ballStandardById, type BallStandard } from './ballStandards';

const ACCESSED = '2026-10-30';

function byId(id: string): BallStandard {
  return ballStandardById(id);
}

describe('BALL_STANDARDS', () => {
  test('lists the six balls of research §4, in table order', () => {
    expect(BALL_STANDARDS.map((ball) => ball.id)).toEqual([
      'tenis-itf',
      'baloncesto-fiba',
      'futbol-fifa-pro',
      'superbola',
      'beisbol',
      'plastilina',
    ]);
  });

  test('ITF type 2: 254 cm → 135–147 cm gives e = 0,729–0,761', () => {
    const ball = byId('tenis-itf');

    expect(ball.test).toEqual({
      kind: 'drop',
      dropHeight: 2.54,
      reboundMin: 1.35,
      reboundMax: 1.47,
    });
    expect(ball.eMin).toBeCloseTo(0.729, 3);
    expect(ball.eMax).toBeCloseTo(0.761, 3);
    expect(ball.sources.map((s) => s.id)).toEqual(['itf-rules-2026', 'itf-tests']);
  });

  test('FIBA 2026: 1 800 mm → 1 035–1 085 mm gives e = 0,758–0,776', () => {
    const ball = byId('baloncesto-fiba');

    expect(ball.test).toEqual({
      kind: 'drop',
      dropHeight: 1.8,
      reboundMin: 1.035,
      reboundMax: 1.085,
    });
    expect(ball.eMin).toBeCloseTo(0.758, 3);
    expect(ball.eMax).toBeCloseTo(0.776, 3);
    expect(ball.sources.map((s) => s.id)).toEqual(['fiba-2026-eq']);
  });

  test('FIFA Quality PRO: 2,00 m → 135–155 cm gives e = 0,822–0,880', () => {
    const ball = byId('futbol-fifa-pro');

    expect(ball.test).toEqual({ kind: 'drop', dropHeight: 2, reboundMin: 1.35, reboundMax: 1.55 });
    expect(ball.eMin).toBeCloseTo(0.822, 3);
    expect(ball.eMax).toBeCloseTo(0.88, 3);
    expect(ball.sources.map((s) => s.id)).toEqual(['fifa-balls-2018']);
  });

  test('superball on hardwood: e_y = 0,86 from −4,13 → 3,57 m/s (Cross 2002)', () => {
    const ball = byId('superbola');

    expect(ball.test).toEqual({ kind: 'speeds', incident: 4.13, rebound: 3.57 });
    expect(ball.eMin).toBeCloseTo(0.86, 2);
    expect(ball.eMax).toBe(ball.eMin);
    expect(ball.sources.map((s) => s.id)).toEqual(['cross-2002-superball']);
  });

  test('baseball ≈ 0,49 and plasticine 0 at low speed (Cross 1999, Table I)', () => {
    const baseball = byId('beisbol');
    const plasticine = byId('plastilina');

    expect(baseball.test).toEqual({ kind: 'speeds', incident: 1.25, rebound: 0.61 });
    expect(baseball.eMin).toBeCloseTo(0.49, 2);
    expect(plasticine.test).toEqual({ kind: 'speeds', incident: 1.47, rebound: 0 });
    expect(plasticine.eMin).toBe(0);
    expect(plasticine.eMax).toBe(0);
    expect(baseball.sources.map((s) => s.id)).toEqual(['cross-1999-bounce']);
    expect(plasticine.sources).toEqual(baseball.sources);
  });

  test('every e range is computed from the cited heights or speeds', () => {
    for (const ball of BALL_STANDARDS) {
      const { test: t } = ball;
      if (t.kind === 'drop') {
        expect(ball.eMin).toBe(restitutionFromHeights(t.dropHeight, t.reboundMin));
        expect(ball.eMax).toBe(restitutionFromHeights(t.dropHeight, t.reboundMax));
      } else {
        expect(ball.eMin).toBe(t.rebound / t.incident);
        expect(ball.eMax).toBe(ball.eMin);
      }
      expect(ball.eMin).toBeLessThanOrEqual(ball.eMax);
    }
  });

  test('every source is a valid topic source with a URL and the research access date', () => {
    for (const ball of BALL_STANDARDS) {
      expect(ball.sources.length).toBeGreaterThan(0);
      for (const source of ball.sources) {
        expect(sourceSchema.safeParse(source).success).toBe(true);
        expect(source.url).toMatch(/^https:\/\//);
        expect(source.accessed).toBe(ACCESSED);
      }
    }
  });

  test('every ball has a Spanish name and a standard line', () => {
    for (const ball of BALL_STANDARDS) {
      expect(ball.name.trim()).not.toBe('');
      expect(ball.standard.trim()).not.toBe('');
    }
  });

  test('cites the 2026 FIBA edition, not the older 1 200–1 400 mm figure', () => {
    const fiba = byId('baloncesto-fiba');

    expect(fiba.sources[0].title).toMatch(/2026/);
    expect(JSON.stringify(fiba)).not.toMatch(/\b1[\s.,]?(200|400)\b/);
  });

  test('leaves out golf, whose USGA limit the research could not confirm', () => {
    expect(JSON.stringify(BALL_STANDARDS)).not.toMatch(/golf|usga|0[.,]830/i);
  });
});

describe('ballStandardById', () => {
  test('throws for an unknown ball', () => {
    expect(() => ballStandardById('golf')).toThrow(RangeError);
  });
});
