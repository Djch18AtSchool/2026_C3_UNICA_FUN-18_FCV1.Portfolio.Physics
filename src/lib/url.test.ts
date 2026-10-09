import { describe, expect, test } from 'vitest';
import { topicUrl, withBase } from './url';

describe('withBase', () => {
  test('keeps a route path and ensures trailing slash', () => {
    expect(withBase('temas/x/', '/repo/')).toBe('/repo/temas/x/');
  });
  test('strips the leading slash and adds the trailing one', () => {
    expect(withBase('/temas/x', '/repo/')).toBe('/repo/temas/x/');
  });
  test('does not add a trailing slash to file paths', () => {
    expect(withBase('media/v.mp4', '/repo/')).toBe('/repo/media/v.mp4');
  });
  test('returns the base for an empty path', () => {
    expect(withBase('', '/repo/')).toBe('/repo/');
  });
  test('collapses duplicate slashes at the join', () => {
    expect(withBase('//temas//x', '/repo/')).toBe('/repo/temas/x/');
  });
  test('defaults to import.meta.env.BASE_URL', () => {
    expect(withBase('temas/x/')).toBe(
      `${import.meta.env.BASE_URL}temas/x/`.replace(/\/{2,}/g, '/'),
    );
  });
});

describe('topicUrl', () => {
  test('builds the topic route under the base', () => {
    expect(topicUrl('salto-personaje', '/repo/')).toBe('/repo/temas/salto-personaje/');
  });
});
