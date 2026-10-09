import type { Locator, Page } from '@playwright/test';

/**
 * Tema 5's video and poster are published after the author records them; until then requests
 * to them 404 by design. control-haptico.spec.ts checks the fallback while they are missing.
 */
export const PENDING_MEDIA = 'media/tema-05-dualsense.';

/** Set a native range input and fire the events React listens to. */
export async function setRange(slider: Locator, value: string): Promise<void> {
  await slider.fill(value);
  await slider.dispatchEvent('input');
  await slider.dispatchEvent('change');
}

/** Wait until the React island that contains `inner` has hydrated (Astro drops its `ssr` flag). */
export async function waitForIsland(page: Page, inner: string): Promise<void> {
  await page.locator(`astro-island:has(${inner}):not([ssr])`).waitFor({ state: 'attached' });
}
