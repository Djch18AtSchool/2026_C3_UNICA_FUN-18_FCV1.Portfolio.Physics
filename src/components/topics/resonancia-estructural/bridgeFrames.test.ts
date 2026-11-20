import { describe, expect, test } from 'vitest';
import { MARCH_PACE_HZ } from '../../../lib/data/bridges';
import {
  activeModel,
  bridgeFrame,
  drawingFull,
  PUSH_FLASH_S,
  TROOP_DRAWING_FULL_M,
} from './bridgeFrames';
import { DEFAULT_SETTINGS } from './resonancePresets';
import { xAt } from './resonanceRun';
import type { ResonanceSettings } from './resonancePresets';

const troopSettings = (patch: Partial<ResonanceSettings['troop']>): ResonanceSettings => ({
  ...DEFAULT_SETTINGS,
  mode: 'tropa',
  troop: { ...DEFAULT_SETTINGS.troop, ...patch },
});

describe('the active model', () => {
  test('is the mode in view, with its run’s length, time scale and events', () => {
    const sweep = activeModel(DEFAULT_SETTINGS);
    expect(sweep.mode).toBe('barrido');
    expect(sweep.duration).toBe(400);
    expect(sweep.timeScale).toBe(8);
    expect(sweep.markers.map((marker) => marker.label)).toEqual([
      'Paso por la resonancia',
      'Pico de la envolvente',
    ]);

    const troop = activeModel(troopSettings({}));
    expect(troop.mode).toBe('tropa');
    expect(troop.timeScale).toBe(1);
    expect(troop.markers).toHaveLength(1);

    const zv = activeModel({ ...DEFAULT_SETTINGS, mode: 'filtro-zv' });
    expect(zv.mode).toBe('filtro-zv');
    expect(zv.timeScale).toBe(1);
    expect(zv.markers.map((marker) => marker.label)).toEqual(['Segundo impulso']);
  });
});

describe('the frame the bridge draws', () => {
  test('«Barrido»: one deck at x/yMax, the drive’s frequency and the force’s phase', () => {
    const active = activeModel(DEFAULT_SETTINGS);
    if (active.mode !== 'barrido') throw new Error('barrido');
    const frame = bridgeFrame(active, 200);

    expect(frame.decks).toHaveLength(1);
    expect(frame.decks[0].fraction).toBeCloseTo(xAt(active.sweep.run, 200) / active.sweep.yMax, 9);
    expect(frame.decks[0].envelope).toBeGreaterThan(0.6);
    expect(frame.decks[0].isClamped).toBe(false);
    expect(frame.driveHz).toBeCloseTo(1, 9);
    expect(Math.abs(frame.force ?? 2)).toBeLessThanOrEqual(1);
    expect(drawingFull(active)).toBe(active.sweep.yMax);
  });

  test('«Tropa»: the step in view, on a fixed scale of 0,5 m, and the march’s phase', () => {
    const inStep = activeModel(troopSettings({}));
    const breaking = activeModel(troopSettings({ step: 'rompiendo' }));
    const t = 60;

    const big = bridgeFrame(inStep, t).decks[0];
    const small = bridgeFrame(breaking, t).decks[0];

    expect(drawingFull(inStep)).toBe(TROOP_DRAWING_FULL_M);
    expect(big.envelope).toBeGreaterThan(5 * small.envelope);
    expect(bridgeFrame(inStep, t).marchPhase).toBeCloseTo(2 * Math.PI * MARCH_PACE_HZ * t, 9);
  });

  test('«Tropa» without damping at the pace: clamped to the drawing’s edge, never past it', () => {
    const active = activeModel(troopSettings({ zeta: 0, n: 200 }));
    const end = bridgeFrame(active, active.duration).decks[0];

    expect(end.isClamped).toBe(true);
    expect(end.envelope).toBe(1);
    expect(Math.abs(end.fraction)).toBeLessThanOrEqual(1);
  });

  test('«Filtro ZV»: two decks, and each push shown for a moment after it lands', () => {
    const active = activeModel({ ...DEFAULT_SETTINGS, mode: 'filtro-zv' });
    if (active.mode !== 'filtro-zv') throw new Error('filtro-zv');
    const second = active.zv.secondImpulse;

    expect(bridgeFrame(active, 0).decks.map((deck) => deck.id)).toEqual([
      'un-empujon',
      'dos-empujones',
    ]);
    expect(bridgeFrame(active, 0.05).pushes?.map((push) => push.isActive)).toEqual([
      true,
      true,
      false,
    ]);
    expect(bridgeFrame(active, second + PUSH_FLASH_S / 2).pushes?.[2].isActive).toBe(true);
    const after = bridgeFrame(active, second + 2);
    expect(after.pushes?.every((push) => !push.isActive)).toBe(true);
    expect(after.decks[1].envelope).toBeLessThan(0.01 * after.decks[0].envelope);
  });
});
