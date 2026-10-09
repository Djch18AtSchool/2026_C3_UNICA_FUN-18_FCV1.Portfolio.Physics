import { describe, expect, test } from 'vitest';
import { canonicalUrl, topicUrl, withBase } from './url';

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

describe('canonicalUrl', () => {
  const SITE = 'https://user.github.io/repo/';

  test('joins the site URL and the path without the base', () => {
    expect(canonicalUrl('/repo/temas/x/', SITE, '/repo/')).toBe(
      'https://user.github.io/repo/temas/x/',
    );
  });
  test('maps the base itself to the site URL', () => {
    expect(canonicalUrl('/repo/', SITE, '/repo/')).toBe(SITE);
  });
  test('accepts a base without its trailing slash', () => {
    expect(canonicalUrl('/repo/temas/x/', SITE, '/repo')).toBe(
      'https://user.github.io/repo/temas/x/',
    );
  });
  test('keeps a path outside the base under the site URL', () => {
    expect(canonicalUrl('/otra/', SITE, '/repo/')).toBe('https://user.github.io/repo/otra/');
  });
});
