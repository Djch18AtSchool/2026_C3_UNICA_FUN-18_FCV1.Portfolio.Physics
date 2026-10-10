import { describe, expect, test } from 'vitest';
import { CUSTOM_WORLD, worldForGravity, worldForPreset } from './jumpWorlds';

describe('jumpWorlds', () => {
  test('real bodies follow convention: Tierra blue, Luna grey', () => {
    expect(worldForGravity(9.81)).toEqual({ name: 'Tierra', color: 'var(--chart-1)' });
    expect(worldForGravity(1.62)).toEqual({ name: 'Luna', color: 'var(--fg-muted)' });
  });

  test('the games wear other palette colors, never the orange kept for Marte', () => {
    for (const g of [112.5, 28.1]) expect(worldForGravity(g).color).not.toBe('var(--chart-2)');
    expect(worldForGravity(112.5).name).toBe('Celeste');
    expect(worldForGravity(28.1).name).toBe('Super Mario Bros.');
  });

  test('any other gravity is the custom jump', () => {
    expect(worldForGravity(20)).toBe(CUSTOM_WORLD);
  });

  test('an unknown preset id is an error', () => {
    expect(() => worldForPreset('marte')).toThrow(/marte/);
  });
});
