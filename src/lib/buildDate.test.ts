import { describe, expect, test } from 'vitest';
import {
  formatBuildDateIso,
  formatBuildDateLabel,
  readLastCommitDate,
  BUILD_DATE_ISO,
} from './buildDate';

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

describe('readLastCommitDate', () => {
  test('parses the committer date printed by git', () => {
    const run = () => '2026-10-10T14:30:00-06:00\n';

    const date = readLastCommitDate(run);

    expect(date.toISOString()).toBe('2026-10-10T20:30:00.000Z');
  });

  test('fails with a clear message when git cannot run', () => {
    const run = () => {
      throw new Error('spawn git ENOENT');
    };

    expect(() => readLastCommitDate(run)).toThrow(/No se pudo leer la fecha del último commit/);
  });

  test('fails with a clear message when git prints something that is not a date', () => {
    const run = () => 'not a date\n';

    expect(() => readLastCommitDate(run)).toThrow(/no es una fecha válida/);
  });

  test('fails when git prints nothing', () => {
    expect(() => readLastCommitDate(() => '')).toThrow(/no es una fecha válida/);
  });
});

describe('BUILD_DATE_ISO', () => {
  test('is the last commit date of this repository', () => {
    expect(BUILD_DATE_ISO).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
