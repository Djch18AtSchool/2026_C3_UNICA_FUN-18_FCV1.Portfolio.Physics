import { expect, type Locator, type Page } from '@playwright/test';

const SCROLL_STEP_PX = 600;

/** Tema 1's lab shows this placeholder while its dataset chunk loads; the others never do. */
export const LAB_LOADING_TEST_ID = 'drone-lab-loading';

/** The lab with this test id, or the placeholder that stands in for it while it loads. */
export const labOrPlaceholder = (page: Page, testId: string): Locator =>
  page.locator(`[data-testid="${testId}"], [data-testid="${LAB_LOADING_TEST_ID}"]`).first();

/** Set a native range input and fire the events React listens to. */
export async function setRange(slider: Locator, value: string): Promise<void> {
  await slider.fill(value);
  await slider.dispatchEvent('input');
  await slider.dispatchEvent('change');
}

/** How long one seek may take to show in the transport before it is sent again. */
const SEEK_SETTLE_MS = 1000;
/** How long a seek may keep failing before the test says so (a few resends, not the whole test). */
const SEEK_GIVE_UP_MS = 10_000;

/**
 * Whether the timeline's reading left `before`. A lab's own reading (formatTime) can read two
 * neighbouring positions alike (Tema 8 in the thruster's dump: one position is under 0,1 s of
 * orbit, the hours do not move): when the text stays, the seek is taken as done once the range
 * holds the value, which is all a reading at fixed decimals lets a test see.
 */
async function readingMoved(timeline: Locator, before: string, value: string): Promise<boolean> {
  try {
    await expect(timeline).not.toHaveAttribute('aria-valuetext', before, {
      timeout: SEEK_SETTLE_MS,
    });
    return true;
  } catch {
    return (await timeline.inputValue()) === value;
  }
}

/**
 * Seeks the transport's timeline and waits until the clock took it. An island can drop the first
 * input event (fired before React listens) and hydrate the slider back, so the seek is sent again
 * until the timeline's aria-valuetext, which only React writes, has left the one it had before
 * (whatever the lab's origin or reading: «t = 0», «t = 376,00 s», «t = 0 h») and the range holds
 * the new value. A seek to the position the range already holds only checks the value; one whose
 * destination reads like its origin (readingMoved) settles on the value after SEEK_SETTLE_MS.
 */
export async function seekTimeline(timeline: Locator, value: string): Promise<void> {
  const before = (await timeline.getAttribute('aria-valuetext')) ?? '';
  const isMove = (await timeline.inputValue()) !== value;
  await expect(async () => {
    await setRange(timeline, value);
    if (isMove) expect(await readingMoved(timeline, before, value)).toBe(true);
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
 * (a component may return several) means the whole island is React's and listening. A lab's
 * drawings then measure their width (the server drew them at 720 px): until each one has, a box
 * read could move under the test (a point taken at ×1 before a zoom, a knob before a drag), so
 * that is waited for too (README, «Todo dibujo del lienzo mide su ancho»).
 */
export async function waitForIsland(page: Page, inner: string): Promise<void> {
  const islands = page.locator(`astro-island:has(${inner}):not([ssr])`);
  await islands.first().waitFor({ state: 'attached', timeout: HYDRATION_TIMEOUT_MS });
  // One island holds `inner`: a selector that matched two would make every read below depend on
  // which one comes first, so fail by name instead of waiting on whichever that is.
  const count = await islands.count();
  if (count !== 1) throw new Error(`waitForIsland: ${count} islas contienen ${inner}, no una sola`);
  const island = islands.first();
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
  await expect
    .poll(() => island.evaluate(unmeasuredDrawings, DRAWING_SLACK_PX), {
      message: `los dibujos de ${inner} medidos`,
      timeout: HYDRATION_TIMEOUT_MS,
    })
    .toEqual([]);
}

/** Sub-pixel rounding between a drawing's viewBox and its box. */
const DRAWING_SLACK_PX = 1;

/**
 * The drawings of a lab (its canvas and its support plots) whose viewBox is not yet their box's
 * width: SvgPlot's plots and the scenes that measure themselves. Hidden ones (no box) wait for none.
 */
function unmeasuredDrawings(root: Element, slack: number): string[] {
  const drawings = root.querySelectorAll(
    ':is([data-lab-canvas], [data-lab-charts]) :is(svg[role=img], svg[data-testid])[viewBox]',
  );
  return [...drawings].flatMap((node, index) => {
    const svg = node as SVGSVGElement;
    const { width } = svg.getBoundingClientRect();
    const gap = Math.abs(svg.viewBox.baseVal.width - width);
    return width > 0 && gap > slack ? [`dibujo ${index}: ${gap.toFixed(1)} px`] : [];
  });
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
 * A CSS length («var(--lab-flow-section)», «42rem») in px as it resolves inside `host`: a
 * custom property overridden there reads as the host's, not the root's.
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
