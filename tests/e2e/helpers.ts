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

/**
 * The value text of the LabShell readout row of `labSelector` whose label, as its author wrote it
 * (each KaTeX formula back to `$tex$`), is exactly `label`; plain spaces. An unknown label throws
 * and lists the labels there are.
 */
export async function readoutText(page: Page, labSelector: string, label: string): Promise<string> {
  return page.locator(labSelector).evaluate((lab, wanted) => {
    const source = (element: Element): string => {
      const copy = element.cloneNode(true) as Element;
      for (const katex of copy.querySelectorAll('.katex')) {
        katex.replaceWith('$' + (katex.querySelector('annotation')?.textContent ?? '') + '$');
      }
      return (copy.textContent ?? '').trim();
    };
    const rows = [...lab.querySelectorAll('[data-readout]')];
    const row = rows.find((candidate) => source(candidate.firstElementChild as Element) === wanted);
    if (!row) {
      const known = rows.map((r) => '«' + source(r.firstElementChild as Element) + '»').join(', ');
      throw new Error('No readout labelled «' + wanted + '»; there are ' + known);
    }
    return (row.lastElementChild?.textContent ?? '').trim().replace(/\s/g, ' ');
  }, label);
}
