import { expect, type Locator, type Page } from '@playwright/test';

const SCROLL_STEP_PX = 600;

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

/** Islands hydrate with client:visible: walk the page so every one renders, then back to the top. */
export async function hydrateAllIslands(page: Page): Promise<void> {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y <= height; y += SCROLL_STEP_PX) {
    await page.mouse.wheel(0, SCROLL_STEP_PX);
  }
  await page.waitForLoadState('networkidle');
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  await page.evaluate(() => window.scrollTo(0, 0));
}
