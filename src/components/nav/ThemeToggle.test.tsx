// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import ThemeToggle from './ThemeToggle';

const TO_DARK = 'Cambiar a tema oscuro';
const TO_LIGHT = 'Cambiar a tema claro';

describe('ThemeToggle', () => {
  beforeEach(() => {
    document.documentElement.dataset.theme = 'light';
    localStorage.clear();
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  test('switches from light to dark, updates its label and persists the choice', () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button', { name: TO_DARK });
    expect(button).toHaveAttribute('type', 'button');

    fireEvent.click(button);

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(button).toHaveAccessibleName(TO_LIGHT);
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  test('reads the initial theme from the data-theme attribute', () => {
    document.documentElement.dataset.theme = 'dark';
    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole('button', { name: TO_LIGHT }));

    expect(document.documentElement.dataset.theme).toBe('light');
    expect(screen.getByRole('button')).toHaveAccessibleName(TO_DARK);
  });

  test('still switches the theme when storage throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    render(<ThemeToggle />);
    const button = screen.getByRole('button', { name: TO_DARK });

    expect(() => fireEvent.click(button)).not.toThrow();

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(button).toHaveAccessibleName(TO_LIGHT);
  });
});
