import { expect, type Browser, type Page } from '@playwright/test';
import { HYDRATION_TIMEOUT_MS, waitForIsland } from './helpers';

/**
 * Phone; a 540 px window, whose one-column stage (~495 px) sits just past SvgPlot's 480 px
 * switch to its wide layout; and the 1 280 px desktop, where the stage measures about 430 px.
 */
export const HYDRATION_WIDTHS = [360, 540, 1280] as const;
/** Sub-pixel rounding between two layouts of the same boxes. */
const HEIGHT_TOLERANCE_PX = 1;
const VIEWPORT_HEIGHT = 800;

/**
 * The drawings of a lab's canvas: SvgPlot's plots and the scenes the labs draw themselves. Rule
 * (README, «Laboratorios por niveles»): each draws at the width it measures, its viewBox as wide as
 * its box; one with a fixed viewBox would keep notYetMeasured waiting until it fails, by name.
 */
const DRAWINGS = '[data-lab-canvas] :is(svg[role=img], svg[data-testid])[viewBox]';

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
 * What still keeps the lab from being the one React made: not hydrated yet (React has not
 * claimed the lab's root), or a drawing that has not measured its width (its viewBox is not its
 * box's width: the server's 720 px, or a plot still under SvgPlot's reserve). Empty once ready.
 * Astro drops the island's `ssr` flag when it starts hydrating, before React commits and before
 * any ResizeObserver reports, so waitForIsland alone is not enough to compare.
 */
export async function notYetMeasured(page: Page, labSelector: string): Promise<string[]> {
  return page.locator(labSelector).evaluate(
    (lab, { drawings, slack }) => {
      const isHydrated = Object.keys(lab).some((key) => key.startsWith('__reactFiber'));
      const pending = [...lab.querySelectorAll(drawings)].flatMap((node, index) => {
        const svg = node as SVGSVGElement;
        const gap = Math.abs(svg.viewBox.baseVal.width - svg.getBoundingClientRect().width);
        return gap > slack ? [`dibujo ${index} sin medir (${gap.toFixed(1)} px)`] : [];
      });
      return [...(isHydrated ? [] : ['sin hidratar']), ...pending];
    },
    { drawings: DRAWINGS, slack: HEIGHT_TOLERANCE_PX },
  );
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
  options: { measureDelayMs?: number } = {},
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
  if (options.measureDelayMs) await delayMeasuring(page, options.measureDelayMs);
  await page.goto(url);
  await page.locator(labSelector).scrollIntoViewIfNeeded();
  await waitForIsland(page, labSelector);
  await page.evaluate(() => document.fonts.ready);
  await expect
    .poll(() => notYetMeasured(page, labSelector), {
      message: `${labSelector} a ${width} px: hidratado y con sus dibujos medidos`,
      timeout: HYDRATION_TIMEOUT_MS,
    })
    .toEqual([]);
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
      timeout: HYDRATION_TIMEOUT_MS,
    })
    .toEqual([]);
  await expect
    .poll(() => letterboxed(page, labSelector), {
      message: `${labSelector} a ${width} px: dibujos sin bandas vacías`,
      timeout: HYDRATION_TIMEOUT_MS,
    })
    .toEqual([]);
  await live.close();
}

/**
 * The measured drawings whose box has another shape than their viewBox: a height forced in CSS
 * for one layout while React drew the other leaves empty bands above and below the drawing.
 * (Measured, SvgPlot drops its reserve; this guards a wrapper that forces an aspect again.)
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

/**
 * For the helper's own checks (lab-shell.spec.ts): every ResizeObserver report of the page comes
 * `ms` late, as on a loaded machine, so a comparison that did not wait for the drawings to measure
 * would read the server's 720 px drawings under SvgPlot's reserve.
 */
export async function delayMeasuring(page: Page, ms: number): Promise<void> {
  await page.addInitScript((delay) => {
    const Real = window.ResizeObserver;
    window.ResizeObserver = class extends Real {
      constructor(callback: ResizeObserverCallback) {
        super((entries, observer) => setTimeout(() => callback(entries, observer), delay));
      }
    };
  }, ms);
}
