import { expect, type Browser, type Page } from '@playwright/test';
import { HYDRATION_TIMEOUT_MS, waitForIsland } from './helpers';

/**
 * Phone; a 540 px window, whose canvas (~495 px) sits just past SvgPlot's 480 px switch to its
 * wide layout; and the 1 280 px desktop, where the canvas is the article column's 766 px.
 */
export const HYDRATION_WIDTHS = [360, 540, 1280] as const;
/** Sub-pixel rounding between two layouts of the same boxes. */
const HEIGHT_TOLERANCE_PX = 1;
const VIEWPORT_HEIGHT = 800;

/**
 * Where a lab draws: its canvas (the scene) and its support plots after the readouts (LabShell
 * `charts`). Both hold drawings that measure their width, so both are checked alike.
 */
const DRAWN = ':is([data-lab-canvas], [data-lab-charts])';
/**
 * The drawings of a lab: SvgPlot's plots and the scenes the labs draw themselves. Rule (README,
 * «Laboratorios por niveles»): each draws at the width it measures, its viewBox as wide as its
 * box; one with a fixed viewBox would keep notYetMeasured waiting until it fails, by name.
 */
const DRAWINGS = `${DRAWN} :is(svg[role=img], svg[data-testid])[viewBox]`;

/** Heights of the lab, of its canvas and support plots, and of every drawing in them, as laid out right now. */
async function measureLab(page: Page, labSelector: string): Promise<number[]> {
  return page.locator(labSelector).evaluate((lab, drawn) => {
    const height = (element: Element) => element.getBoundingClientRect().height;
    const places = [...lab.querySelectorAll(drawn)];
    const drawings = places.flatMap((place) => [
      ...place.querySelectorAll('svg[role=img], svg[data-testid]'),
    ]);
    return [height(lab), ...places.map(height), ...drawings.map(height)];
  }, DRAWN);
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

/** The widths of the canvas' drawings' viewBoxes: 720 (the server's) until each one measures. */
export async function drawingWidths(page: Page, labSelector: string): Promise<number[]> {
  return page
    .locator(labSelector)
    .evaluate(
      (lab, drawings) =>
        [...lab.querySelectorAll(drawings)].map(
          (svg) => (svg as SVGSVGElement).viewBox.baseVal.width,
        ),
      DRAWINGS,
    );
}

/** The heights of the lab as the server sent it: the page without scripts, fonts in place. */
export async function measureServer(
  browser: Browser,
  url: string,
  labSelector: string,
  width: number,
): Promise<number[]> {
  const plain = await browser.newContext({
    viewport: { width, height: VIEWPORT_HEIGHT },
    javaScriptEnabled: false,
  });
  const server = await plain.newPage();
  await server.goto(url);
  // Fonts set the wrapping of every label; measure both pages with them in place.
  await server.evaluate(() => document.fonts.ready);
  const sent = await measureLab(server, labSelector);
  await plain.close();
  return sent;
}

/**
 * On a hydrated page: waits until React has the lab and every drawing has measured, then holds
 * its heights to the server's and its drawings to their boxes. Returns the drawings' viewBox
 * widths it accepted, so its own check can tell it compared the measured lab (lab-shell.spec.ts).
 */
export async function compareHydrated(
  page: Page,
  labSelector: string,
  sent: readonly number[],
  width: number,
): Promise<number[]> {
  const at = `${labSelector} a ${width} px`;
  await expect
    .poll(() => notYetMeasured(page, labSelector), {
      message: `${at}: hidratado y con sus dibujos medidos`,
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
      message: `${at}: alturas del laboratorio, el lienzo y sus dibujos`,
      timeout: HYDRATION_TIMEOUT_MS,
    })
    .toEqual([]);
  await expect
    .poll(() => letterboxed(page, labSelector), {
      message: `${at}: dibujos sin bandas vacías`,
      timeout: HYDRATION_TIMEOUT_MS,
    })
    .toEqual([]);
  return drawingWidths(page, labSelector);
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
  const sent = await measureServer(browser, url, labSelector, width);
  const live = await browser.newContext({ viewport: { width, height: VIEWPORT_HEIGHT } });
  const page = await live.newPage();
  await page.goto(url);
  await page.locator(labSelector).scrollIntoViewIfNeeded();
  await waitForIsland(page, labSelector);
  await page.evaluate(() => document.fonts.ready);
  await compareHydrated(page, labSelector, sent, width);
  await live.close();
}

/**
 * The measured drawings whose box has another shape than their viewBox: a height forced in CSS
 * for one layout while React drew the other leaves empty bands above and below the drawing.
 * (Measured, SvgPlot drops its reserve; this guards a wrapper that forces an aspect again.)
 */
async function letterboxed(page: Page, labSelector: string): Promise<string[]> {
  return page.locator(labSelector).evaluate(
    (lab, { drawn, tolerance }) => {
      const drawings = [...lab.querySelectorAll(`${drawn} svg[role=img][viewBox]`)];
      return drawings.flatMap((svg, index) => {
        const box = svg.getBoundingClientRect();
        const view = (svg as SVGSVGElement).viewBox.baseVal;
        const drawn = (box.width * view.height) / view.width;
        return Math.abs(drawn - box.height) > tolerance
          ? [`dibujo ${index}: caja ${box.height.toFixed(1)} px, dibujo ${drawn.toFixed(1)} px`]
          : [];
      });
    },
    { drawn: DRAWN, tolerance: HEIGHT_TOLERANCE_PX },
  );
}

/**
 * For the helper's own check (lab-shell.spec.ts): every ResizeObserver report of the page waits
 * until the test calls releaseMeasuring, as a loaded machine might make it wait, but with no clock.
 */
export async function holdMeasuring(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const held: (() => void)[] = [];
    Object.assign(window, {
      __releaseMeasuring: () => held.splice(0).forEach((report) => report()),
    });
    const Real = window.ResizeObserver;
    window.ResizeObserver = class extends Real {
      constructor(callback: ResizeObserverCallback) {
        super((entries, observer) => {
          held.push(() => callback(entries, observer));
        });
      }
    };
  });
}

/** Lets the held ResizeObserver reports through (see holdMeasuring). */
export async function releaseMeasuring(page: Page): Promise<void> {
  await page.evaluate(() =>
    (window as unknown as { __releaseMeasuring: () => void }).__releaseMeasuring(),
  );
}
