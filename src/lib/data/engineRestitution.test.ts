import { describe, expect, test } from 'vitest';
import { sourceSchema } from '../../content/topicSchema';
import { ENGINE_RESTITUTION, type EngineRestitutionRow } from './engineRestitution';

const ACCESSED = '2026-10-30';

function row(engine: string): EngineRestitutionRow {
  const found = ENGINE_RESTITUTION.find((r) => r.engine === engine);
  if (!found) throw new Error(`missing row ${engine}`);
  return found;
}

describe('ENGINE_RESTITUTION', () => {
  test('has the seven engines of research §3–§4, in table order', () => {
    expect(ENGINE_RESTITUTION.map((r) => r.engine)).toEqual([
      'Box2D v3',
      'Unity 3D',
      'PhysX',
      'Unity 2D',
      'Bullet 3.25',
      'Jolt',
      'Godot',
    ]);
  });

  test.each([
    ['Box2D v3', 1, 'max'],
    ['Unity 3D', 2, 'average'],
    ['PhysX', 2, 'average'],
    ['Unity 2D', null, 'max'],
    ['Bullet 3.25', 0.2, 'multiply'],
    ['Jolt', 1, 'max'],
    ['Godot', 1, 'sumClamped'],
  ] as const)('%s: threshold %s m/s, combine %s', (engine, threshold, combine) => {
    const r = row(engine);

    expect(r.threshold).toBe(threshold);
    expect(r.combine).toBe(combine);
  });

  test('Unity 2D leaves the threshold undocumented', () => {
    expect(row('Unity 2D').thresholdNote).toMatch(/no documentado/);
  });

  test('the notes quote the code or documentation they come from', () => {
    expect(row('Box2D v3').thresholdNote).toContain(
      'def.restitutionThreshold = 1.0f * lengthUnits;',
    );
    expect(row('Unity 3D').thresholdNote).toContain('default 2');
    expect(row('PhysX').thresholdNote).toContain('0.2 * PxTolerancesScale::speed');
    expect(row('Bullet 3.25').thresholdNote).toContain('m_restitutionVelocityThreshold = 0.2f;');
    expect(row('Jolt').thresholdNote).toContain('mMinVelocityForRestitution = 1.0f;');
    expect(row('Godot').thresholdNote).toContain('bounce_velocity_threshold');
    expect(row('Godot').combineNote).toContain('CLAMP(A->get_bounce() + B->get_bounce(), 0, 1)');
    expect(row('Bullet 3.25').combineNote).toContain(
      'body0->getRestitution() * body1->getRestitution()',
    );
  });

  test('every row cites valid topic sources with URL and the research access date', () => {
    for (const r of ENGINE_RESTITUTION) {
      for (const source of [r.source, r.combineSource]) {
        expect(sourceSchema.safeParse(source).success).toBe(true);
        expect(source.url).toMatch(/^https:\/\//);
        expect(source.accessed).toBe(ACCESSED);
      }
      expect(r.thresholdNote.trim()).not.toBe('');
      expect(r.combineNote.trim()).not.toBe('');
    }
  });

  test('a source id always names the same source object', () => {
    const seen = new Map<string, unknown>();
    for (const r of ENGINE_RESTITUTION) {
      for (const source of [r.source, r.combineSource]) {
        const previous = seen.get(source.id);
        if (previous) expect(source).toBe(previous);
        seen.set(source.id, source);
      }
    }
  });

  test('code sources are pinned to a tag or commit, never a moving branch', () => {
    for (const r of ENGINE_RESTITUTION) {
      for (const { url } of [r.source, r.combineSource]) {
        if (url?.includes('github.com')) expect(url).not.toMatch(/\/blob\/(main|master)\//);
      }
    }
  });

  test('mentions no game whose engine or values the research could not confirm', () => {
    expect(JSON.stringify(ENGINE_RESTITUTION)).not.toMatch(/Rocket League|Angry Birds|RocketSim/i);
  });
});
