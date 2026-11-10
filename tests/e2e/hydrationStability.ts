import { expect, type Browser, type Page } from '@playwright/test';
import { waitForIsland } from './helpers';

/** Phone and the 1 280 px desktop, where the stage of a tiered lab measures about 395 px. */
export const HYDRATION_WIDTHS = [360, 1280] as const;
/** Sub-pixel rounding between two layouts of the same boxes. */
const HEIGHT_TOLERANCE_PX = 1;
const VIEWPORT_HEIGHT = 800;

/** Heights of the lab and of every drawing in its canvas, as laid out right now. */
async function measureLab(page: Page, labSelector: string): Promise<number[]> {
  return page.locator(labSelector).evaluate((lab) => {
    const height = (element: Element) => element.getBoundingClientRect().height;
    const canvas = lab.querySelector('[data-lab-canvas]');
    const drawings = canvas ? [...canvas.querySelectorAll('svg[role=img], svg[data-testid]')] : [];
    return [height(lab), ...(canvas ? [height(canvas)] : []), ...drawings.map(height)];
  });
}

/**
 * A lab whose drawings measure their own width must not change height when React takes over: the
 * server draws them at the article's width, and the stage of a tiered lab is narrower. The page
 * without scripts shows what the server sent; the same page after hydration shows what React made.
 */
export async function expectSameHeightAfterHydration(
  browser: Browser,
  url: string,
  labSelector: string,
  width: number,
): Promise<void> {
  const viewport = { width, height: VIEWPORT_HEIGHT };
  const plain = await browser.newContext({ viewport, javaScriptEnabled: false });
  const server = await plain.newPage();
  await server.goto(url);
  const sent = await measureLab(server, labSelector);
  await plain.close();

  const live = await browser.newContext({ viewport });
  const page = await live.newPage();
  await page.goto(url);
  await page.locator(labSelector).scrollIntoViewIfNeeded();
  await waitForIsland(page, labSelector);
  await page.evaluate(() => document.fonts.ready);
  await expect
    .poll(async () => (await measureLab(page, labSelector)).map((h) => Math.round(h)), {
      message: `${labSelector} a ${width} px: alturas del laboratorio, el lienzo y sus dibujos`,
    })
    .toEqual(sent.map((h) => Math.round(h)));
  const hydrated = await measureLab(page, labSelector);
  await live.close();

  hydrated.forEach((height, index) => {
    expect(Math.abs(height - sent[index])).toBeLessThanOrEqual(HEIGHT_TOLERANCE_PX);
  });
}
