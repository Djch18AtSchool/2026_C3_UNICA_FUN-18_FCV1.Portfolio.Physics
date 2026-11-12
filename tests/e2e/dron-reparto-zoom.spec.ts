/**
 * The zoom of Tema 1's route map (D1.2a): the shared pieces (useZoomPan, ZoomControls, the scale
 * bar) on the plot of the drone lab. The zoom moves the map window, so the axes, the route and the
 * scale bar are checked in metres, read from what the plot draws: its tick labels and gridlines.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { waitForIsland } from './helpers';

const PAGE = './temas/dron-reparto/';
const LAB = '[data-testid="drone-lab"]';
const MAP = '[data-testid="route-map"]';
const BLOCKING_IMPACTS = ['serious', 'critical'];
const VIEWPORTS = [
  { width: 1280, height: 800 },
  { width: 360, height: 800 },
] as const;
/** A button step is √2: four are ×4, six are ×8 (the limit). */
const STEPS_TO_X4 = 4;
const STEPS_TO_LIMIT = 6;
const MAX_SCALE = 8;
/** Pixel slack of a read-back (positions are printed to hundredths; knobs are drawn at px). */
const PX_SLACK = 1.5;
const WHEEL_NOTCH_PX = 100;
type Delta = { x: number; y: number };
const DRAG: Delta = { x: -60, y: -40 };
const STOP_DRAG: Delta = { x: 40, y: 30 };
/** The room `reveal` leaves around a focused handle (REVEAL_MARGIN_PX). */
const REVEAL_MARGIN_PX = 16;
/** Widths from a small phone's to the desktop's, where the scale bar and stop C come close. */
/** The air the scale bar keeps from a stop's knob at least (routeScaleBarMaxPx leaves 8 from its reach). */
const BAR_AIR_PX = 6;
const PHONE_AND_DESKTOP_WIDTHS = [320, 360, 375, 390, 414, 1280] as const;
const DRAG_STEPS = 6;
/** Stop C's default position (m) and the stops' key step (m). */
const STOP_C = { x: 300, y: 1100 } as const;
const KEY_STEP_M = 10;
/** Where the stops, the depot and the drone's first leg are at the opening (m). */
const DEFAULT_STOPS = ['stop-A', 'stop-B', 'stop-C'] as const;

test.use({ reducedMotion: 'reduce' });

test.beforeEach(async ({ page }) => {
  await page.goto(PAGE);
  await page
    .locator('[data-testid="drone-lab-loading"], ' + LAB)
    .first()
    .scrollIntoViewIfNeeded();
  await expect(page.locator(LAB)).toBeVisible();
  await waitForIsland(page, LAB);
  await centreMap(page);
});

async function centreMap(page: Page): Promise<void> {
  await page
    .locator(MAP)
    .evaluate((map) => map.scrollIntoView({ block: 'center', behavior: 'instant' }));
}

const lab = (page: Page) => page.locator(LAB);
const viewport = (page: Page) => page.locator('[data-zoom-viewport]');
const factor = (page: Page) => page.locator('[data-zoom-factor]');
const zoomButton = (page: Page, name: string) =>
  lab(page).getByRole('group', { name: 'Zoom' }).getByRole('button', { name, exact: true });

async function press(page: Page, name: string, times = 1): Promise<void> {
  for (let i = 0; i < times; i += 1) await zoomButton(page, name).click({ force: true });
}

interface Tick {
  value: number;
  /** Position along its axis, in px from the plot area's top-left corner. */
  px: number;
}
interface Axes {
  x: Tick[];
  y: Tick[];
}

/** The numbers on the plot's axes with where they are drawn, read from the plot's own svg. */
async function readAxes(page: Page): Promise<Axes> {
  return page.locator(`${MAP} svg[role="img"]`).evaluate((svg) => {
    const clip = svg.querySelector('clipPath rect');
    const left = Number(clip?.getAttribute('x'));
    const top = Number(clip?.getAttribute('y'));
    const read = (text: Element, position: number): { value: number; px: number } | undefined => {
      const value = Number(
        (text.textContent ?? '')
          .replace(/[\s  ]/gu, '')
          .replace('−', '-')
          .replace(',', '.'),
      );
      return Number.isFinite(value) ? { value, px: position } : undefined;
    };
    const labels = [...svg.querySelectorAll('text[text-anchor]')];
    const isTick = <T>(tick: T | undefined): tick is T => tick !== undefined;
    return {
      x: labels
        .filter((text) => text.getAttribute('text-anchor') === 'middle')
        .map((text) => read(text, Number(text.getAttribute('x')) - left))
        .filter(isTick),
      y: labels
        .filter((text) => text.getAttribute('text-anchor') === 'end')
        .map((text) => read(text, Number(text.getAttribute('y')) - top))
        .filter(isTick),
    };
  });
}

/** px per metre and the metre at the plot's top-left corner, from an axis' two end ticks. */
function lineOf(ticks: Tick[]): { pxPerMetre: number; atOrigin: number } {
  const [first, last] = [ticks[0], ticks[ticks.length - 1]];
  // Signed: the y axis runs the other way (values grow upward, px downward).
  const slope = (last.px - first.px) / (last.value - first.value);
  return { pxPerMetre: Math.abs(slope), atOrigin: first.value - first.px / slope };
}

const readFactor = async (page: Page) => (await factor(page).textContent())?.trim() ?? '';

/**
 * The scale bar: what it says (metres) and the length it is drawn at (px), from the path the
 * browser paints. (An SVG inside a foreignObject answers getBBox one frame late in Chromium.)
 */
async function readScaleBar(page: Page): Promise<{ metres: number; px: number }> {
  const words = (await page.locator('[data-scale-bar-words]').textContent()) ?? '';
  const metres = Number(/(\d[\d\s\u202f\u00a0]*)\s*m\s*$/u.exec(words)?.[1].replace(/\s/gu, ''));
  const d = (await page.locator(`${MAP} [data-scale-bar] path`).getAttribute('d')) ?? '';
  const [left, right] = [/^M(-?[\d.]+)/u.exec(d)?.[1], /H(-?[\d.]+)/u.exec(d)?.[1]].map(Number);
  return { metres, px: right - left };
}

const box = async (locator: Locator) => {
  const found = await locator.boundingBox();
  expect(found).not.toBeNull();
  return found as { x: number; y: number; width: number; height: number };
};

/** An element's own box (getBoundingClientRect): no stroke, so no halo of a text. */
const clientBox = (locator: Locator) =>
  locator.evaluate((element) => {
    const { x, y, width, height } = element.getBoundingClientRect();
    return { x, y, width, height };
  });

const overlaps = (
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
  air = 0,
) =>
  a.x < b.x + b.width + air &&
  b.x < a.x + a.width + air &&
  a.y < b.y + b.height + air &&
  b.y < a.y + a.height + air;

/** Centre of a handle's visible knob, in page coordinates. */
async function knobCentre(page: Page, testId: string): Promise<{ x: number; y: number }> {
  const found = await box(page.getByTestId(testId).locator('[data-knob]'));
  return { x: found.x + found.width / 2, y: found.y + found.height / 2 };
}

async function mouseDrag(page: Page, from: { x: number; y: number }, by: Delta) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + by.x / 2, from.y + by.y / 2, { steps: DRAG_STEPS });
  await page.mouse.move(from.x + by.x, from.y + by.y, { steps: DRAG_STEPS });
  await page.mouse.up();
}

/** A point of the plot clear of every handle, the zoom's group and the scale bar (page px). */
async function emptyPoint(page: Page): Promise<{ x: number; y: number }> {
  const plot = await box(viewport(page));
  return { x: plot.x + plot.width * 0.45, y: plot.y + plot.height * 0.15 };
}

const stopValues = async (page: Page, testId: string) => {
  const text = (await page.getByTestId(testId).getAttribute('aria-valuetext')) ?? '';
  // «x = 300 m, y = 1 100 m»: the thousands separator is a (no-break) space between digits.
  const plain = text.replace(/(\d)[\s\u202f\u00a0](?=\d)/gu, '$1');
  const [x, y] = [...plain.matchAll(/(-?\d+)\s*m/gu)].map((m) => Number(m[1]));
  return { x, y };
};

test.describe('the buttons and the keys', () => {
  test('«Acercar» and «Alejar» move the axes to the metres on show, and «Ajustar» gives back the whole map', async ({
    page,
  }) => {
    const whole = await readAxes(page);
    expect(await readFactor(page)).toBe('×1');
    await expect(zoomButton(page, 'Alejar')).toHaveAttribute('aria-disabled', 'true');

    await press(page, 'Acercar', STEPS_TO_X4);

    await expect.poll(() => readFactor(page)).toBe('×4');
    const zoomed = await readAxes(page);
    expect(lineOf(zoomed.x).pxPerMetre / lineOf(whole.x).pxPerMetre).toBeCloseTo(STEPS_TO_X4, 0);
    // Both axes keep the same metres per px: the map is not stretched.
    expect(lineOf(zoomed.y).pxPerMetre).toBeCloseTo(lineOf(zoomed.x).pxPerMetre, 1);

    await press(page, 'Alejar', 2);
    await expect.poll(() => readFactor(page)).toBe('×2');
    await press(page, 'Ajustar');
    await expect.poll(() => readFactor(page)).toBe('×1');
    const fitted = await readAxes(page);
    expect(fitted.x.map((tick) => tick.value)).toEqual(whole.x.map((tick) => tick.value));
    expect(fitted.y.map((tick) => tick.value)).toEqual(whole.y.map((tick) => tick.value));
  });

  test('stops at ×8 and has no «1:1»: the whole window is both the fit and the nominal scale', async ({
    page,
  }) => {
    await press(page, 'Acercar', STEPS_TO_LIMIT + 2);

    await expect.poll(() => readFactor(page)).toBe(`×${MAX_SCALE}`);
    await expect(zoomButton(page, 'Acercar')).toHaveAttribute('aria-disabled', 'true');
    await expect(
      lab(page).getByRole('group', { name: 'Zoom' }).getByRole('button', { name: /1:1/ }),
    ).toHaveCount(0);
  });

  test('+, − and 0 on the map focused with the keyboard, and the arrows pan it', async ({
    page,
  }) => {
    await lab(page).getByRole('button', { name: 'Ajustes del simulador' }).focus();
    await page.keyboard.press('Tab');
    await expect(viewport(page)).toBeFocused();

    await page.keyboard.press('+');
    await page.keyboard.press('+');
    await expect.poll(() => readFactor(page)).toBe('×2');
    const before = lineOf((await readAxes(page)).x);
    await page.keyboard.press('ArrowRight');
    await expect
      .poll(async () => lineOf((await readAxes(page)).x).atOrigin)
      .toBeGreaterThan(before.atOrigin);
    await page.keyboard.press('-');
    await expect.poll(() => readFactor(page)).toBe('×1,4');
    await page.keyboard.press('0');
    await expect.poll(() => readFactor(page)).toBe('×1');
  });

  test('another view of the route takes the map back to its whole window', async ({ page }) => {
    await press(page, 'Acercar', STEPS_TO_X4);
    await expect.poll(() => readFactor(page)).toBe('×4');

    await lab(page).getByRole('radio', { name: 'Ruta' }).click({ force: true });

    await expect.poll(() => readFactor(page)).toBe('×1');
  });

  test('«Restablecer» also gives back the whole window', async ({ page }) => {
    await press(page, 'Acercar', STEPS_TO_X4);

    await lab(page).getByRole('button', { name: 'Restablecer' }).click();

    await expect.poll(() => readFactor(page)).toBe('×1');
  });
});

test.describe('the scale bar', () => {
  test('is round metres, as long as it says: px = metres · px per metre, at several zooms', async ({
    page,
  }) => {
    const zooms = [
      { steps: 0, factor: '×1' },
      { steps: 2, factor: '×2' },
      { steps: STEPS_TO_X4, factor: '×4' },
      { steps: STEPS_TO_LIMIT, factor: `×${MAX_SCALE}` },
    ];
    for (const { steps, factor } of zooms) {
      await press(page, 'Ajustar');
      await press(page, 'Acercar', steps);
      await expect.poll(() => readFactor(page)).toBe(factor);
      const bar = await readScaleBar(page);
      const { pxPerMetre } = lineOf((await readAxes(page)).x);
      expect(bar.metres).toBeGreaterThan(0);
      expect(/^[125]0*$/u.test(String(bar.metres))).toBe(true);
      expect(bar.px).toBeGreaterThanOrEqual(64);
      expect(bar.px).toBeLessThanOrEqual(160 + PX_SLACK);
      expect(Math.abs(bar.px - bar.metres * pxPerMetre)).toBeLessThan(PX_SLACK + 2);
    }
  });

  test('at ×4 it is 100 m on a plot as wide as the lab’s', async ({ page }) => {
    await press(page, 'Acercar', STEPS_TO_X4);
    await expect.poll(() => readFactor(page)).toBe('×4');

    const bar = await readScaleBar(page);
    expect([50, 100, 200]).toContain(bar.metres);
  });
});

test.describe('the mouse', () => {
  test('Ctrl and the wheel zoom about the pointer and never zoom the page, also over a stop', async ({
    page,
  }) => {
    const before = lineOf((await readAxes(page)).x);
    const target = await knobCentre(page, 'stop-B');
    await page.mouse.move(target.x, target.y);

    await page.keyboard.down('Control');
    await page.mouse.wheel(0, -WHEEL_NOTCH_PX);
    await page.keyboard.up('Control');

    await expect.poll(() => readFactor(page)).not.toBe('×1');
    const after = lineOf((await readAxes(page)).x);
    expect(after.pxPerMetre).toBeGreaterThan(before.pxPerMetre);
    expect(await page.evaluate(() => window.visualViewport?.scale)).toBe(1);
    // The metre under the pointer stays under it (stop B is there, to the pixel).
    const bValues = await stopValues(page, 'stop-B');
    const plot = await box(viewport(page));
    const metreAtPointer = after.atOrigin + (target.x - plot.x) / after.pxPerMetre;
    expect(Math.abs(metreAtPointer - bValues.x)).toBeLessThan((2 * PX_SLACK) / after.pxPerMetre);
  });

  test('dragging the background pans the map with the hand', async ({ page }) => {
    await press(page, 'Acercar', STEPS_TO_X4);
    await expect.poll(() => readFactor(page)).toBe('×4');
    const before = await readAxes(page);

    await mouseDrag(page, await emptyPoint(page), DRAG);

    await expect
      .poll(async () => lineOf((await readAxes(page)).x).atOrigin)
      .toBeGreaterThan(lineOf(before.x).atOrigin);
    const after = await readAxes(page);
    // The map follows the hand: dragging left by 60 px moves the window right by 60 px of metres.
    const { pxPerMetre } = lineOf(after.x);
    const moved = lineOf(after.x).atOrigin - lineOf(before.x).atOrigin;
    expect(Math.abs(moved + DRAG.x / pxPerMetre)).toBeLessThan(PX_SLACK / pxPerMetre);
    expect(lineOf(after.y).atOrigin).toBeLessThan(lineOf(before.y).atOrigin);
  });

  test('dragging a stop moves the stop, not the map, and keeps its offset to the pointer', async ({
    page,
  }) => {
    await zoomAbout(page, await knobCentre(page, 'stop-A'));
    const before = await readAxes(page);
    const valuesBefore = await stopValues(page, 'stop-A');
    const from = await knobCentre(page, 'stop-A');

    await mouseDrag(page, from, STOP_DRAG);

    await expect.poll(() => stopValues(page, 'stop-A')).not.toEqual(valuesBefore);
    const { pxPerMetre } = lineOf((await readAxes(page)).x);
    const values = await stopValues(page, 'stop-A');
    expect(Math.abs(values.x - valuesBefore.x - STOP_DRAG.x / pxPerMetre)).toBeLessThan(
      (2 * PX_SLACK) / pxPerMetre,
    );
    expect(Math.abs(values.y - valuesBefore.y + STOP_DRAG.y / pxPerMetre)).toBeLessThan(
      (2 * PX_SLACK) / pxPerMetre,
    );
    // The window did not move with the stop: the same metres are at the same px.
    expect(lineOf((await readAxes(page)).x).atOrigin).toBeCloseTo(lineOf(before.x).atOrigin, 1);
    await expect(page.getByTestId('route-modified')).toBeVisible();
  });
});

const nextFrames = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );

/** Reaches a handle with the keyboard (Tab), so its focus is the one the browser shows. */
async function tabTo(page: Page, testId: string): Promise<void> {
  const handle = page.getByTestId(testId);
  await handle.focus();
  await page.keyboard.press('Shift+Tab');
  // A reader presses Tab a frame or more apart; Chromium answers the box of what is inside the
  // plot's foreignObject only after the frame that moved it.
  await nextFrames(page);
  await page.keyboard.press('Tab');
  await expect(handle).toBeFocused();
}

/** Zooms about the pointer over `target` (page px) to ×4 with Ctrl and the wheel, keeping it in place. */
async function zoomAbout(page: Page, target: { x: number; y: number }): Promise<void> {
  await page.mouse.move(target.x, target.y);
  await page.keyboard.down('Control');
  for (let i = 0; i < STEPS_TO_X4; i += 1) await page.mouse.wheel(0, -WHEEL_NOTCH_PX);
  await page.keyboard.up('Control');
  await expect.poll(() => readFactor(page)).toBe('×4');
}

/** Pans the map by a background drag until `handle`'s centre is `edge` px from the plot's left edge. */
async function panHandleToLeftEdge(page: Page, testId: string, edge: number): Promise<void> {
  const plot = await box(viewport(page));
  const knob = await knobCentre(page, testId);
  await mouseDrag(page, await emptyPoint(page), { x: plot.x + edge - knob.x, y: 0 });
  await expect
    .poll(async () => (await knobCentre(page, testId)).x - plot.x)
    .toBeLessThan(REVEAL_MARGIN_PX);
}

test.describe('a press on a handle near the edge', () => {
  const EDGE_PX = 6;

  test('does not move the view under the pointer: the stop follows the hand to the pixel', async ({
    page,
  }) => {
    await zoomAbout(page, await knobCentre(page, 'stop-A'));
    await panHandleToLeftEdge(page, 'stop-A', EDGE_PX);
    const view = await readAxes(page);
    const valuesBefore = await stopValues(page, 'stop-A');
    const from = await knobCentre(page, 'stop-A');

    await mouseDrag(page, from, STOP_DRAG);

    await expect.poll(() => stopValues(page, 'stop-A')).not.toEqual(valuesBefore);
    const { pxPerMetre, atOrigin } = lineOf((await readAxes(page)).x);
    expect(atOrigin).toBeCloseTo(lineOf(view.x).atOrigin, 6);
    const values = await stopValues(page, 'stop-A');
    // The stop moved by what the hand moved, to the 10 m grid of the keys and the pixel of the drag.
    expect(Math.abs(values.x - valuesBefore.x - STOP_DRAG.x / pxPerMetre)).toBeLessThan(
      (2 * PX_SLACK) / pxPerMetre,
    );
    expect(Math.abs(values.y - valuesBefore.y + STOP_DRAG.y / pxPerMetre)).toBeLessThan(
      (2 * PX_SLACK) / pxPerMetre,
    );
  });

  test('does the same for the drone: the map stays and the clock follows the hand', async ({
    page,
  }) => {
    await zoomAbout(page, await knobCentre(page, 'drone-marker'));
    await panHandleToLeftEdge(page, 'drone-marker', EDGE_PX);
    const view = lineOf((await readAxes(page)).x).atOrigin;
    const timeBefore = await page.getByTestId('drone-marker').getAttribute('aria-valuetext');

    await mouseDrag(page, await knobCentre(page, 'drone-marker'), { x: 30, y: 0 });

    await expect
      .poll(() => page.getByTestId('drone-marker').getAttribute('aria-valuetext'))
      .not.toBe(timeBefore);
    expect(lineOf((await readAxes(page)).x).atOrigin).toBeCloseTo(view, 6);
  });

  test('is still brought into view when the focus comes from the keyboard', async ({ page }) => {
    await press(page, 'Acercar', STEPS_TO_LIMIT);
    await tabTo(page, 'stop-C');

    await expect
      .poll(async () => {
        const knob = await box(page.getByTestId('stop-C').locator('[data-knob]'));
        const plot = await box(viewport(page));
        return knob.x >= plot.x && knob.x + knob.width <= plot.x + plot.width;
      })
      .toBe(true);
  });
});

test.describe('a stop under the zoom buttons', () => {
  test('is the one the pointer reaches there, not the button below it', async ({ page }) => {
    const stop = page.getByTestId('stop-A');
    await stop.focus();
    // To the corner of the map the buttons cover: (1 300, 0), by keys of 100 m.
    for (let i = 0; i < 7; i += 1) await page.keyboard.press('Shift+ArrowRight');
    for (let i = 0; i < 2; i += 1) await page.keyboard.press('Shift+ArrowDown');
    await expect.poll(() => stopValues(page, 'stop-A')).toEqual({ x: 1300, y: 0 });
    const centre = await knobCentre(page, 'stop-A');
    const controls = await box(page.locator(`${MAP} [data-zoom-controls]`));
    expect(overlaps(controls, { x: centre.x, y: centre.y, width: 0, height: 0 })).toBe(true);

    const owner = await page.evaluate(
      ({ x, y }) =>
        document.elementFromPoint(x, y)?.closest('[data-testid]')?.getAttribute('data-testid'),
      centre,
    );

    expect(owner).toBe('stop-A');
  });

  test('can be dragged away from there with the mouse', async ({ page }) => {
    await page.getByTestId('stop-A').focus();
    for (let i = 0; i < 7; i += 1) await page.keyboard.press('Shift+ArrowRight');
    for (let i = 0; i < 2; i += 1) await page.keyboard.press('Shift+ArrowDown');
    await expect.poll(() => stopValues(page, 'stop-A')).toEqual({ x: 1300, y: 0 });

    await mouseDrag(page, await knobCentre(page, 'stop-A'), { x: -80, y: -60 });

    await expect.poll(async () => (await stopValues(page, 'stop-A')).x).toBeLessThan(1300);
  });

  test('leaves the buttons clickable where no stop is over them', async ({ page }) => {
    await zoomButton(page, 'Acercar').click();

    await expect.poll(() => readFactor(page)).toBe('×1,4');
  });
});

test.describe('the handles', () => {
  test('a focused stop outside the window is brought into view (×8, Tab to it)', async ({
    page,
  }) => {
    await press(page, 'Acercar', STEPS_TO_LIMIT);
    await expect.poll(() => readFactor(page)).toBe(`×${MAX_SCALE}`);

    await tabTo(page, 'stop-C');

    await expect
      .poll(async () => {
        const knob = await box(page.getByTestId('stop-C').locator('[data-knob]'));
        const plot = await box(viewport(page));
        return (
          knob.x >= plot.x &&
          knob.y >= plot.y &&
          knob.x + knob.width <= plot.x + plot.width &&
          knob.y + knob.height <= plot.y + plot.height
        );
      })
      .toBe(true);
  });

  test('an arrow key that moves a stop keeps it in view, 10 m at a time', async ({ page }) => {
    await press(page, 'Acercar', STEPS_TO_LIMIT);
    await page.getByTestId('stop-C').focus();
    await expect.poll(() => stopValues(page, 'stop-C')).toEqual(STOP_C);

    for (let i = 0; i < 25; i += 1) await page.keyboard.press('ArrowRight');

    await expect
      .poll(() => stopValues(page, 'stop-C'))
      .toEqual({ x: STOP_C.x + 25 * KEY_STEP_M, y: STOP_C.y });
    const knob = await box(page.getByTestId('stop-C').locator('[data-knob]'));
    const plot = await box(viewport(page));
    expect(knob.x + knob.width).toBeLessThanOrEqual(plot.x + plot.width + PX_SLACK);
  });

  test('the drone marker is reachable and the map follows it to the end of the leg', async ({
    page,
  }) => {
    await press(page, 'Acercar', STEPS_TO_LIMIT);
    await page.getByTestId('drone-marker').focus();

    await page.keyboard.press('End');

    await expect
      .poll(async () => {
        const knob = await box(page.getByTestId('drone-marker').locator('[data-knob]'));
        const plot = await box(viewport(page));
        return (
          knob.x >= plot.x &&
          knob.y >= plot.y &&
          knob.x + knob.width <= plot.x + plot.width &&
          knob.y + knob.height <= plot.y + plot.height
        );
      })
      .toBe(true);
  });
});

for (const width of PHONE_AND_DESKTOP_WIDTHS) {
  test.describe(`the scale bar at ${width} px`, () => {
    test.use({ viewport: { width, height: 800 } });

    test('does not touch any stop, nor the name beside it', async ({ page }) => {
      await centreMap(page);
      // Geometry without the text halos (the 4 px background stroke Playwright's box includes).
      const bar = await clientBox(page.locator(`${MAP} [data-scale-bar]`));

      for (const stop of DEFAULT_STOPS) {
        const knob = await clientBox(page.getByTestId(stop).locator('[data-knob]'));
        const name = await clientBox(page.getByTestId(stop).locator('text'));
        expect(overlaps(bar, knob, BAR_AIR_PX), `${stop}'s knob`).toBe(false);
        expect(overlaps(bar, name), `${stop}'s name`).toBe(false);
      }
    });
  });
}

for (const size of VIEWPORTS) {
  test.describe(`at ${size.width} px`, () => {
    test.use({ viewport: size });

    test('the buttons and the scale bar are inside the plot and clear of each other and of the stops', async ({
      page,
    }) => {
      await centreMap(page);
      const plot = await box(viewport(page));
      const controls = await box(page.locator(`${MAP} [data-zoom-controls]`));
      const bar = await box(page.locator(`${MAP} [data-scale-bar]`));

      for (const piece of [controls, bar]) {
        expect(piece.x).toBeGreaterThanOrEqual(plot.x - PX_SLACK);
        expect(piece.y).toBeGreaterThanOrEqual(plot.y - PX_SLACK);
        expect(piece.x + piece.width).toBeLessThanOrEqual(plot.x + plot.width + PX_SLACK);
        expect(piece.y + piece.height).toBeLessThanOrEqual(plot.y + plot.height + PX_SLACK);
      }
      expect(overlaps(controls, bar)).toBe(false);
      for (const stop of DEFAULT_STOPS) {
        const knob = await box(page.getByTestId(stop).locator('[data-knob]'));
        expect(overlaps(controls, knob), `${stop} under the buttons`).toBe(false);
      }
    });

    test('the time scale badge, in the figure’s corner, stays clear of the buttons', async ({
      page,
    }) => {
      await centreMap(page);
      const badge = await box(page.locator('[data-time-scale-badge]').first());
      const controls = await box(page.locator(`${MAP} [data-zoom-controls]`));

      expect(overlaps(badge, controls)).toBe(false);
    });

    test('the buttons are 40 px and the figure and the plot keep their size at every zoom step', async ({
      page,
    }) => {
      await centreMap(page);
      const acercar = await box(zoomButton(page, 'Acercar'));
      expect(acercar.width).toBeCloseTo(40, 0);
      expect(acercar.height).toBeCloseTo(40, 0);

      const before = { figure: await box(page.locator(MAP)), plot: await box(viewport(page)) };
      const labBefore = await box(lab(page));
      for (let step = 0; step < STEPS_TO_LIMIT; step += 1) {
        await press(page, 'Acercar');
        // Every step, and every pan across 1 000 m, leaves the figure and the plot as they were.
        expect(await box(page.locator(MAP))).toEqual(before.figure);
        expect(await box(viewport(page))).toEqual(before.plot);
      }
      await press(page, 'Ajustar');
      expect(await box(page.locator(MAP))).toEqual(before.figure);
      expect(await box(lab(page))).toEqual(labBefore);
    });
  });
}

test.describe('accessibility', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`no serious violations in the lab with the map zoomed, ${theme} theme`, async ({
      page,
    }) => {
      await page.evaluate((value) => {
        document.documentElement.dataset.theme = value;
      }, theme);
      await press(page, 'Acercar', STEPS_TO_X4);

      const results = await new AxeBuilder({ page }).include(LAB).analyze();
      const blocking = results.violations.filter((v) => BLOCKING_IMPACTS.includes(v.impact ?? ''));

      expect(blocking.map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
    });
  }

  test('the map is a named group with instructions the screen reader can reach', async ({
    page,
  }) => {
    const map = viewport(page);

    await expect(map).toHaveAttribute('role', 'group');
    await expect(map).toHaveAttribute('aria-label', 'Mapa de la ruta');
    const describedBy = await map.getAttribute('aria-describedby');
    await expect(page.locator(`[id="${describedBy}"]`)).toContainText('Ctrl y la rueda');
  });

  test('the focused map shows its focus ring, inside the plot', async ({ page }) => {
    await lab(page).getByRole('button', { name: 'Ajustes del simulador' }).focus();
    await page.keyboard.press('Tab');
    await expect(viewport(page)).toBeFocused();

    const outline = await viewport(page).evaluate((element) => {
      const style = getComputedStyle(element);
      return { width: style.outlineWidth, offset: style.outlineOffset };
    });

    expect(outline.width).not.toBe('0px');
    expect(Number.parseFloat(outline.offset)).toBeLessThan(0);
  });
});
