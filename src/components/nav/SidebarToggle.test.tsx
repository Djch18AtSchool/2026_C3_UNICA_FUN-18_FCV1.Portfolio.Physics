// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import SidebarToggle from './SidebarToggle';

const HIDE = 'Ocultar barra lateral';
const SHOW = 'Mostrar barra lateral';

describe('SidebarToggle', () => {
  beforeEach(() => {
    delete document.documentElement.dataset.sidebar;
    localStorage.clear();
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  test('hides the sidebar, updates its state and persists the choice', () => {
    render(<SidebarToggle />);
    const button = screen.getByRole('button', { name: HIDE });
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(button);

    expect(document.documentElement.dataset.sidebar).toBe('closed');
    expect(button).toHaveAccessibleName(SHOW);
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(localStorage.getItem('portafolio.nav.sidebar')).toBe('closed');
  });

  test('starts from data-sidebar and shows the sidebar again', () => {
    document.documentElement.dataset.sidebar = 'closed';
    render(<SidebarToggle />);

    fireEvent.click(screen.getByRole('button', { name: SHOW }));

    expect(document.documentElement.dataset.sidebar).toBe('open');
    expect(screen.getByRole('button')).toHaveAccessibleName(HIDE);
    expect(localStorage.getItem('portafolio.nav.sidebar')).toBe('open');
  });

  test('still toggles when storage throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    render(<SidebarToggle />);

    expect(() => fireEvent.click(screen.getByRole('button', { name: HIDE }))).not.toThrow();

    expect(document.documentElement.dataset.sidebar).toBe('closed');
  });

  test('the first render already reflects a closed sidebar', () => {
    document.documentElement.dataset.sidebar = 'closed';

    const html = renderToString(<SidebarToggle />);

    expect(html).toContain(`aria-label="${SHOW}"`);
    expect(html).toContain('aria-pressed="true"');
  });
});
