import { expect, type Locator, type Page } from '@playwright/test';

const SCROLL_STEP_PX = 600;

/** Set a native range input and fire the events React listens to. */
export async function setRange(slider: Locator, value: string): Promise<void> {
  await slider.fill(value);
  await slider.dispatchEvent('input');
  await slider.dispatchEvent('change');
}

/** The transport's reading at the start of a run, before any seek took: «t = 0,000 s», «t = 0 s». */
const AT_START = /^t = 0(,0+)?\D/;
/** How long one seek may take to show in the transport before it is sent again. */
const SEEK_SETTLE_MS = 1000;

/**
 * Seeks the transport's timeline and waits until the clock took it. An island can drop the first
 * input event (fired before React listens) and hydrate the slider back to 0, so the seek is sent
 * again until the transport reads the new time.
 */
export async function seekTimeline(timeline: Locator, value: string): Promise<void> {
  await expect(async () => {
    await setRange(timeline, value);
    await expect(timeline).not.toHaveAttribute('aria-valuetext', AT_START, {
      timeout: SEEK_SETTLE_MS,
    });
    await expect(timeline).toHaveValue(value, { timeout: SEEK_SETTLE_MS });
  }).toPass();
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

/**
 * The text of an element as its author wrote it: each KaTeX formula back to `$tex$` (from its
 * MathML annotation), whitespace collapsed. The one conversion the e2e suites share.
 */
export async function mathSource(locator: Locator): Promise<string> {
  return locator.evaluate((element) => {
    const copy = element.cloneNode(true) as Element;
    for (const katex of copy.querySelectorAll('.katex')) {
      katex.replaceWith('$' + (katex.querySelector('annotation')?.textContent ?? '') + '$');
    }
    return (copy.textContent ?? '').trim().replace(/\s+/g, ' ');
  });
}

/**
 * The value text of the LabShell readout row of `labSelector` whose label, as its author wrote it
 * (see mathSource), is exactly `label`; plain spaces. An unknown label throws and lists the
 * labels there are.
 */
export async function readoutText(page: Page, labSelector: string, label: string): Promise<string> {
  const rows = page.locator(labSelector).locator('[data-readout]');
  const count = await rows.count();
  const known: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const row = rows.nth(index);
    const name = await mathSource(row.locator(':scope > :first-child'));
    if (name === label) {
      const value = (await row.locator(':scope > :last-child').textContent()) ?? '';
      return value.trim().replace(/\s/g, ' ');
    }
    known.push(`«${name}»`);
  }
  throw new Error(`No readout labelled «${label}»; there are ${known.join(', ')}`);
}
