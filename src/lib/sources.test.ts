import { describe, expect, test } from 'vitest';
import { formatSource, sourceIndex } from './sources';

describe('sourceIndex', () => {
  test('returns the 1-based position of the source', () => {
    expect(sourceIndex([{ id: 'a' }, { id: 'b' }], 'b')).toBe(2);
  });
  test('throws a RangeError when the id is not declared', () => {
    expect(() => sourceIndex([{ id: 'a' }], 'z')).toThrow(RangeError);
  });
});

describe('formatSource', () => {
  test('formats authors, year and title', () => {
    expect(formatSource({ id: 'x', title: 'T', authors: 'A', year: 2020 })).toBe('A (2020). T.');
  });
  test('appends the publisher when present', () => {
    expect(formatSource({ id: 'x', title: 'T', authors: 'A', year: 2020, publisher: 'P' })).toBe(
      'A (2020). T. P.',
    );
  });
  test('starts with the title when there are no authors', () => {
    expect(formatSource({ id: 'x', title: 'T', year: 2020, publisher: 'P' })).toBe('T (2020). P.');
  });
  test('omits the year when it is missing', () => {
    expect(formatSource({ id: 'x', title: 'T', authors: 'A' })).toBe('A. T.');
  });
  test('does not double the final period of a title', () => {
    expect(formatSource({ id: 'x', title: 'Why?', authors: 'A', year: 2020 })).toBe(
      'A (2020). Why?',
    );
  });
});
