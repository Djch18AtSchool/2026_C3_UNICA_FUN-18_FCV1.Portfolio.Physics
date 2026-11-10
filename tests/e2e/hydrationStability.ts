import { expect, type Browser, type Page } from '@playwright/test';
import { waitForIsland } from './helpers';

/**
 * Phone; a 540 px window, whose one-column stage (~495 px) sits just past SvgPlot's 480 px
 * switch to its wide layout; and the 1 280 px desktop, where the stage measures about 430 px.
 */
export const HYDRATION_WIDTHS = [360, 540, 1280] as const;
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
  // Fonts set the wrapping of every label; measure both pages with them in place.
  await server.evaluate(() => document.fonts.ready);
  const sent = await measureLab(server, labSelector);
  await plain.close();

  const live = await browser.newContext({ viewport });
  const page = await live.newPage();
  await page.goto(url);
  await page.locator(labSelector).scrollIntoViewIfNeeded();
  await waitForIsland(page, labSelector);
  await page.evaluate(() => document.fonts.ready);
  // Each height against the server's, unrounded, within the tolerance: [] once all agree.
  const drift = async () => {
    const hydrated = await measureLab(page, labSelector);
    if (hydrated.length !== sent.length) return [`${hydrated.length} cajas, no ${sent.length}`];
    return hydrated.flatMap((height, index) =>
      Math.abs(height - sent[index]) > HEIGHT_TOLERANCE_PX
        ? [`caja ${index}: ${sent[index].toFixed(1)} → ${height.toFixed(1)} px`]
        : [],
    );
  };
  await expect
    .poll(drift, {
      message: `${labSelector} a ${width} px: alturas del laboratorio, el lienzo y sus dibujos`,
    })
    .toEqual([]);
  expect(await letterboxed(page, labSelector), `${labSelector} a ${width} px`).toEqual([]);
  await live.close();
}

/**
 * The hydrated drawings whose box has another shape than their viewBox: a height reserved in CSS
 * for one layout while React drew the other leaves empty bands above and below the drawing.
 */
async function letterboxed(page: Page, labSelector: string): Promise<string[]> {
  return page.locator(labSelector).evaluate((lab, tolerance) => {
    const drawings = [...lab.querySelectorAll('[data-lab-canvas] svg[role=img][viewBox]')];
    return drawings.flatMap((svg, index) => {
      const box = svg.getBoundingClientRect();
      const view = (svg as SVGSVGElement).viewBox.baseVal;
      const drawn = (box.width * view.height) / view.width;
      return Math.abs(drawn - box.height) > tolerance
        ? [`dibujo ${index}: caja ${box.height.toFixed(1)} px, dibujo ${drawn.toFixed(1)} px`]
        : [];
    });
  }, HEIGHT_TOLERANCE_PX);
}
