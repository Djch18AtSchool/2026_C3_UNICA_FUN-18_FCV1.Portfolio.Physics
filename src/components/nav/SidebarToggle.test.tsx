// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import SidebarToggle from './SidebarToggle';

const LABEL = 'Barra lateral';
const SIDEBAR_ID = 'barra-lateral';

describe('SidebarToggle', () => {
  beforeEach(() => {
    delete document.documentElement.dataset.sidebar;
    localStorage.clear();
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  test('is a disclosure button for the sidebar column with a fixed label', () => {
    render(<SidebarToggle />);
    const button = screen.getByRole('button', { name: LABEL });

    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveAttribute('aria-controls', SIDEBAR_ID);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(button).not.toHaveAttribute('aria-pressed');
  });

  test('hides the sidebar, collapses and persists the choice', () => {
    render(<SidebarToggle />);
    const button = screen.getByRole('button', { name: LABEL });

    fireEvent.click(button);

    expect(document.documentElement.dataset.sidebar).toBe('closed');
    expect(button).toHaveAccessibleName(LABEL);
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(localStorage.getItem('portafolio.nav.sidebar')).toBe('closed');
  });

  test('starts from data-sidebar and shows the sidebar again', () => {
    document.documentElement.dataset.sidebar = 'closed';
    render(<SidebarToggle />);
    const button = screen.getByRole('button', { name: LABEL });
    expect(button).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(button);

    expect(document.documentElement.dataset.sidebar).toBe('open');
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(localStorage.getItem('portafolio.nav.sidebar')).toBe('open');
  });

  test('still toggles when storage throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    render(<SidebarToggle />);

    expect(() => fireEvent.click(screen.getByRole('button', { name: LABEL }))).not.toThrow();

    expect(document.documentElement.dataset.sidebar).toBe('closed');
  });

  test('the first render already reflects a closed sidebar', () => {
    document.documentElement.dataset.sidebar = 'closed';

    const html = renderToString(<SidebarToggle />);

    expect(html).toContain(`aria-label="${LABEL}"`);
    expect(html).toContain('aria-expanded="false"');
  });
});
