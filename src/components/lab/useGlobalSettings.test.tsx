// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import { resetSettingsForTests, setSettings } from '../../lib/settingsStore';
import { useGlobalSettings } from './useGlobalSettings';

function DecimalsProbe() {
  const { decimals } = useGlobalSettings();
  return <span data-testid="decimals">{decimals}</span>;
}

describe('useGlobalSettings', () => {
  afterEach(() => {
    cleanup();
    resetSettingsForTests();
    localStorage.clear();
  });

  test('rerenders with the new decimals when setSettings is called', () => {
    render(<DecimalsProbe />);

    expect(screen.getByTestId('decimals').textContent).toBe('2');

    act(() => {
      setSettings({ decimals: 1 });
    });

    expect(screen.getByTestId('decimals').textContent).toBe('1');
  });
});
