// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
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

  test('the first render already carries the label of the current theme', () => {
    document.documentElement.dataset.theme = 'dark';

    const html = renderToString(<ThemeToggle />);

    expect(html).toContain(`aria-label="${TO_LIGHT}"`);
  });

  test('two toggles on the page stay in step: a click on one relabels the other', () => {
    render(
      <>
        <ThemeToggle />
        <ThemeToggle />
      </>,
    );
    const [header, footer] = screen.getAllByRole('button', { name: TO_DARK });

    fireEvent.click(footer);

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(header).toHaveAccessibleName(TO_LIGHT);
    expect(footer).toHaveAccessibleName(TO_LIGHT);

    fireEvent.click(header);

    expect(document.documentElement.dataset.theme).toBe('light');
    expect(header).toHaveAccessibleName(TO_DARK);
    expect(footer).toHaveAccessibleName(TO_DARK);
  });

  test('follows a theme change made outside the component', async () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button', { name: TO_DARK });

    document.documentElement.dataset.theme = 'dark';

    await waitFor(() => expect(button).toHaveAccessibleName(TO_LIGHT));
  });
});
