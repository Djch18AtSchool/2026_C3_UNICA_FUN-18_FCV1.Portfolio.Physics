import { describe, expect, test } from 'vitest';
import { contrastRatio } from './color';

describe('contrastRatio', () => {
  test('black on white is 21:1', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
  });
  test('#777777 on white is about 4.48:1', () => {
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
  });
  test('is symmetric in its arguments', () => {
    expect(contrastRatio('#ffffff', '#777777')).toBe(contrastRatio('#777777', '#ffffff'));
  });
  test('is 1 for identical colors and accepts uppercase hex', () => {
    expect(contrastRatio('#ABCDEF', '#abcdef')).toBe(1);
  });
  test('throws on anything that is not a 6-digit hex color', () => {
    expect(() => contrastRatio('#fff', '#000000')).toThrow(/hex/);
    expect(() => contrastRatio('red', '#000000')).toThrow(/hex/);
  });
});
