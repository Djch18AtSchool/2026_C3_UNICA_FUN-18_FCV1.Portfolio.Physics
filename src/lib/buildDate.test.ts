import { describe, expect, test } from 'vitest';
import { formatBuildDateIso, formatBuildDateLabel } from './buildDate';

describe('formatBuildDateLabel', () => {
  test('formats a fixed date as a Spanish long date in Costa Rica time', () => {
    // Arrange: noon UTC is 06:00 in Costa Rica (UTC-6), so the calendar day does not shift.
    const date = new Date('2026-10-09T12:00:00Z');

    // Act
    const label = formatBuildDateLabel(date);

    // Assert
    expect(label).toBe('9 de octubre de 2026');
  });
});

describe('formatBuildDateIso', () => {
  test('formats a fixed date as YYYY-MM-DD in Costa Rica time', () => {
    const date = new Date('2026-10-09T12:00:00Z');

    const iso = formatBuildDateIso(date);

    expect(iso).toBe('2026-10-09');
  });
});
