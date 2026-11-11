import { expect, type Locator, type Page } from '@playwright/test';

const SCROLL_STEP_PX = 600;

/** Set a native range input and fire the events React listens to. */
export async function setRange(slider: Locator, value: string): Promise<void> {
  await slider.fill(value);
  await slider.dispatchEvent('input');
  await slider.dispatchEvent('change');
}

/**
 * The transport's reading at the very start of a run, before any seek took: «t = 0,000 s» or
 * «t = 0 s», not «t = 0,5 s» (the unit follows after a space, U+202F or a plain one).
 */
const AT_START = /^t = 0(,0+)?\s/u;
/** How long one seek may take to show in the transport before it is sent again. */
const SEEK_SETTLE_MS = 1000;
/** How long a seek may keep failing before the test says so (a few resends, not the whole test). */
const SEEK_GIVE_UP_MS = 10_000;

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
  }).toPass({ timeout: SEEK_GIVE_UP_MS });
}

/**
 * How long an island may take to hydrate once Astro starts it (client:visible, KaTeX, eight
 * workers on a loaded machine): longer than expect's 5 s, shorter than a test.
 */
export const HYDRATION_TIMEOUT_MS = 15_000;

/**
 * Wait until the React island that contains `inner` has hydrated. Astro drops the island's `ssr`
 * flag as it starts hydrating, before React has rendered anything: an event fired then is lost and
 * hydration puts the control back. React tags a host element with its fiber when it completes it,
 * and commits right after the last one; so every top-level element of the island carrying a fiber
 * (a component may return several) means the whole island is React's and listening. A lab also
 * decides, once it has measured its stage, whether the stage sticks (LabShell): boxes read before
 * that could move under a sticky stage the moment it engages, so that is waited for too.
 */
export async function waitForIsland(page: Page, inner: string): Promise<void> {
  const island = page.locator(`astro-island:has(${inner}):not([ssr])`).first();
  await island.waitFor({ state: 'attached', timeout: HYDRATION_TIMEOUT_MS });
  await expect
    .poll(
      () =>
        island.evaluate((node) => {
          const roots = [
            ...node.querySelectorAll(':scope > :not(template, script, style, astro-slot)'),
          ];
          const isReact = (root: Element) =>
            Object.keys(root).some((key) => key.startsWith('__reactFiber'));
          return roots.length > 0 && roots.every(isReact);
        }),
      { message: `la isla de ${inner} hidratada por React`, timeout: HYDRATION_TIMEOUT_MS },
    )
    .toBe(true);
  const stage = island.locator('[data-lab-stage]');
  if ((await stage.count()) > 0) {
    await expect(stage, `${inner}: el escenario medido`).toHaveAttribute(
      'data-lab-stage-fits',
      /^(true|false)$/,
      { timeout: HYDRATION_TIMEOUT_MS },
    );
  }
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

/**
 * A CSS length («var(--lab-transport-room)», «42rem») in px as it resolves inside `host`: a
 * custom property overridden there (a lab's stage) reads as the host's, not the root's.
 */
export async function cssLengthPxIn(host: Locator, length: string): Promise<number> {
  return host.evaluate((node, value) => {
    const probe = document.createElement('div');
    probe.style.height = value;
    node.append(probe);
    const height = probe.getBoundingClientRect().height;
    probe.remove();
    return height;
  }, length);
}
