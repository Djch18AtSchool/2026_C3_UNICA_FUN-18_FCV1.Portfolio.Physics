import type { Locator, Page } from '@playwright/test';

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
