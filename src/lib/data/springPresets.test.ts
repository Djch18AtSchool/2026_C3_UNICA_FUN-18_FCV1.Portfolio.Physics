import { describe, expect, test } from 'vitest';
import { dampingRatio, dampingRegime, fromPerceptual } from '../physics/dampedSpring';
import { SPRING_PRESETS } from './springPresets';

const byId = (id: string) => {
  const preset = SPRING_PRESETS.find((p) => p.id === id);
  if (!preset) throw new Error(`no preset ${id}`);
  return preset;
};

describe('springPresets', () => {
  test('the five presets, in order', () =>
    expect(SPRING_PRESETS.map(({ id }) => id)).toEqual([
      'motion-defecto',
      'motion-xy',
      'motion-escala-cero',
      'apple-ejemplo',
      'sobreamortiguado',
    ]));

  test('every preset says where its values come from', () =>
    SPRING_PRESETS.forEach(({ origin, source, label }) => {
      expect(['producto', 'ilustrativo']).toContain(origin);
      expect(source.trim()).not.toBe('');
      // Labels go into a native <option>, which cannot hold KaTeX.
      expect(label.trim()).not.toBe('');
      expect(label).not.toContain('$');
    }));

  test('Motion por omisión da ζ = 0,5 (100, 10, 1; spring.ts L22-L24)', () => {
    const { params, origin, source } = byId('motion-defecto');
    expect(params).toEqual({ k: 100, b: 10, m: 1 });
    expect(dampingRatio(params)).toBe(0.5);
    expect(origin).toBe('producto');
    expect(source).toContain('v14.14.0');
    expect(source).toContain('spring.ts L22-L24');
  });

  test('Motion x/y is 500/25 from default-transitions.ts L4-L18', () => {
    const { params, origin, source } = byId('motion-xy');
    expect(params).toEqual({ k: 500, b: 25, m: 1 });
    expect(origin).toBe('producto');
    expect(source).toContain('v14.14.0');
    expect(source).toContain('default-transitions.ts L4-L18');
  });

  test('Motion scale towards 0 is exactly critical', () => {
    const { params, origin, source } = byId('motion-escala-cero');
    expect(params).toEqual({ k: 550, b: 2 * Math.sqrt(550), m: 1 });
    expect(dampingRegime(params)).toBe('critico');
    expect(origin).toBe('producto');
    expect(source).toContain('default-transitions.ts');
  });

  test("Apple's documented example is (10.10) at 0,5 s and bounce 0,3", () => {
    const { params, origin, source } = byId('apple-ejemplo');
    expect(params).toEqual(fromPerceptual(0.5, 0.3));
    expect(origin).toBe('producto');
    expect(source).toContain('Spring(duration: 0.5, bounce: 0.3)');
    expect(source).toContain('https://developer.apple.com/documentation/swiftui/spring');
  });

  test('the overdamped preset is an illustrative model assumption, ζ = 2', () => {
    const { params, origin } = byId('sobreamortiguado');
    expect(params).toEqual({ k: 100, b: 40, m: 1 });
    expect(dampingRatio(params)).toBe(2);
    expect(dampingRegime(params)).toBe('sobreamortiguado');
    expect(origin).toBe('ilustrativo');
  });
});
