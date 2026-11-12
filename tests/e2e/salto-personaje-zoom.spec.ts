/**
 * The zoom of Tema 2's trajectory (D1.3c): the shared pieces (useZoomPan, ZoomControls, the scale
 * bar) on the plot of the jump lab. The zoom moves the plot's window, so the axes, the trajectory
 * and the scale bar are checked in metres, read from what the plot draws: its tick labels. The
 * launch and velocity vectors keep their length on screen; the buttons sit in a strip under the plot.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Browser, type Locator, type Page } from '@playwright/test';
import { seekTimeline, waitForIsland } from './helpers';

const PAGE = './temas/salto-personaje/';
const LAB = '[data-testid="jump-lab"]';
const PLOT = '[data-testid="jump-plot"]';
const BLOCKING_IMPACTS = ['serious', 'critical'];
const DESKTOP = { width: 1280, height: 800 };
const PHONE = { width: 360, height: 800 };
const VIEWPORTS = [DESKTOP, PHONE] as const;
/** A button step is √2: four are ×4, six are ×8 (the limit). */
const STEPS_TO_X4 = 4;
const STEPS_TO_LIMIT = 6;
const MAX_SCALE = 8;
/** Pixel slack of a read-back (positions are printed to hundredths; knobs are drawn at px). */
const PX_SLACK = 1.5;
const WHEEL_NOTCH_PX = 100;
const DRAG = { x: -60, y: -30 } as const;
const HANDLE_DRAG_PX = 24;
const DRAG_STEPS = 6;
/** The factor and the drawn scale agree to this share (the ticks are read to a hundredth of a px). */
const DRAWN_SCALE_TOLERANCE = 0.005;
const BUTTON_PX = 40;
const GLYPH_PX = 20;
const STRIP_PX = 48;
/** A knob's hit target reaches this far from its centre (KNOB_HIT_RADIUS is 16); test inside it. */
const HIT_INSIDE_PX = 14;
const KEY_PRESSES = 12;
const MIN_BAR_PX = 64;
const MAX_BAR_PX = 160;

// Buttons and keys glide; under reduced motion they jump, so a test reads the end at once.
test.use({ reducedMotion: 'reduce' });

test.beforeEach(async ({ page }) => {
  await page.goto(PAGE);
  await page.locator(LAB).scrollIntoViewIfNeeded();
  await waitForIsland(page, LAB);
  await centrePlot(page);
});

async function centrePlot(page: Page): Promise<void> {
  await page
    .locator(PLOT)
    .evaluate((plot) => plot.scrollIntoView({ block: 'center', behavior: 'instant' }));
}

const lab = (page: Page) => page.locator(LAB);
const viewport = (page: Page) => page.locator('[data-zoom-viewport]');
const factor = (page: Page) => page.locator('[data-zoom-factor]');
const zoomButton = (page: Page, name: string) =>
  lab(page).getByRole('group', { name: 'Zoom' }).getByRole('button', { name, exact: true });

/**
 * Two frames: Chromium answers getBoundingClientRect of what is inside the plot's foreignObject one
 * frame late after a change, and a reveal by focus reads those boxes. (Frames, not a clock.)
 */
async function settle(page: Page): Promise<void> {
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
}

async function press(page: Page, name: string, times = 1): Promise<void> {
  for (let i = 0; i < times; i += 1) await zoomButton(page, name).click({ force: true });
  await settle(page);
}

/** Focus the way Tab does: a key first, so the browser shows the focus ring (:focus-visible). */
async function focusWithKeyboard(page: Page, locator: Locator): Promise<void> {
  await settle(page);
  await page.keyboard.press('Shift');
  await locator.focus();
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
  return page.locator(`${PLOT} svg[role="img"]`).evaluate((svg) => {
    const clip = svg.querySelector('clipPath rect');
    const left = Number(clip?.getAttribute('x'));
    const top = Number(clip?.getAttribute('y'));
    const read = (text: Element, position: number): { value: number; px: number } | undefined => {
      const value = Number(
        (text.textContent ?? '')
          .replace(/[\s  ]/gu, '')
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

/** px per metre from whichever axis has two ticks (a zoomed phone plot may show one on the other). */
function drawnScale({ x, y }: Axes): number {
  const [axis] = [x, y].filter((ticks) => ticks.length >= 2);
  return lineOf(axis).pxPerMetre;
}

const readFactor = async (page: Page) => (await factor(page).textContent())?.trim() ?? '';

/**
 * The scale bar: what it says (metres, with a decimal comma) and the length it is drawn at (px),
 * from the path the browser paints. (An SVG inside a foreignObject answers getBBox a frame late.)
 */
async function readScaleBar(page: Page): Promise<{ metres: number; px: number }> {
  const words = (await page.locator('[data-scale-bar-words]').textContent()) ?? '';
  const said = /(\d[\d\s  ]*(?:,\d+)?)\s*m\s*$/u.exec(words)?.[1] ?? '';
  const metres = Number(said.replace(/[\s  ]/gu, '').replace(',', '.'));
  const d = (await page.locator(`${PLOT} [data-scale-bar] path`).getAttribute('d')) ?? '';
  const [left, right] = [/^M(-?[\d.]+)/u.exec(d)?.[1], /H(-?[\d.]+)/u.exec(d)?.[1]].map(Number);
  return { metres, px: right - left };
}

type Box = { x: number; y: number; width: number; height: number };

const box = async (locator: Locator): Promise<Box> => {
  const found = await locator.boundingBox();
  expect(found).not.toBeNull();
  return found as Box;
};

const overlaps = (a: Box, b: Box) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

const isInside = (inner: Box, outer: Box, slack = PX_SLACK) =>
  inner.x >= outer.x - slack &&
  inner.y >= outer.y - slack &&
  inner.x + inner.width <= outer.x + outer.width + slack &&
  inner.y + inner.height <= outer.y + outer.height + slack;

/** Centre of a handle's visible knob, in page coordinates. */
async function knobCentre(page: Page, testId: string): Promise<{ x: number; y: number }> {
  const found = await box(page.getByTestId(testId).locator('[data-knob]'));
  return { x: found.x + found.width / 2, y: found.y + found.height / 2 };
}

/** Length in px of the launch vector: from the marker at t = 0 (the launch point) to its tip. */
async function launchVectorPx(page: Page): Promise<number> {
  const [tip, origin] = [
    await knobCentre(page, 'launch-handle'),
    await knobCentre(page, 'jump-marker'),
  ];
  return Math.hypot(tip.x - origin.x, tip.y - origin.y);
}

async function mouseDrag(page: Page, from: { x: number; y: number }, by: { x: number; y: number }) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + by.x / 2, from.y + by.y / 2, { steps: DRAG_STEPS });
  await page.mouse.move(from.x + by.x, from.y + by.y, { steps: DRAG_STEPS });
  await page.mouse.up();
}

/** A point of the plot clear of every handle, the vectors and the scale bar (page px). */
async function emptyPoint(page: Page): Promise<{ x: number; y: number }> {
  const plot = await box(viewport(page));
  return { x: plot.x + plot.width * 0.5, y: plot.y + plot.height * 0.9 };
}

const v0Slider = (page: Page) => page.getByRole('slider', { name: /Impulso de salto/ });
const readV0 = async (page: Page) => Number(await v0Slider(page).inputValue());

async function isKnobInPlot(page: Page, testId: string): Promise<boolean> {
  const knob = await box(page.getByTestId(testId).locator('[data-knob]'));
  return isInside(knob, await box(viewport(page)));
}

test.describe('the buttons and the keys', () => {
  test('«Acercar» and «Alejar» move the axes to the metres on show, and «Ajustar» gives back the whole jump', async ({
    page,
  }) => {
    const whole = await readAxes(page);
    expect(await readFactor(page)).toBe('×1');
    await expect(zoomButton(page, 'Alejar')).toHaveAttribute('aria-disabled', 'true');

    await press(page, 'Acercar', STEPS_TO_X4);

    await expect.poll(() => readFactor(page)).toBe('×4');
    const zoomed = await readAxes(page);
    expect(lineOf(zoomed.x).pxPerMetre / lineOf(whole.x).pxPerMetre).toBeCloseTo(STEPS_TO_X4, 0);
    // Both axes keep the same metres per px: the trajectory is not stretched.
    expect(lineOf(zoomed.y).pxPerMetre).toBeCloseTo(lineOf(zoomed.x).pxPerMetre, 0);

    await press(page, 'Alejar', 2);
    await expect.poll(() => readFactor(page)).toBe('×2');
    await press(page, 'Ajustar');
    await expect.poll(() => readFactor(page)).toBe('×1');
    const fitted = await readAxes(page);
    expect(fitted.x.map((tick) => tick.value)).toEqual(whole.x.map((tick) => tick.value));
    expect(fitted.y.map((tick) => tick.value)).toEqual(whole.y.map((tick) => tick.value));
  });

  test('stops at ×8 and has no «1:1»: the whole jump is both the fit and the nominal scale', async ({
    page,
  }) => {
    await press(page, 'Acercar', STEPS_TO_LIMIT + 2);

    await expect.poll(() => readFactor(page)).toBe(`×${MAX_SCALE}`);
    await expect(zoomButton(page, 'Acercar')).toHaveAttribute('aria-disabled', 'true');
    await expect(
      lab(page).getByRole('group', { name: 'Zoom' }).getByRole('button', { name: /1:1/ }),
    ).toHaveCount(0);
  });

  test('+, − and 0 on the plot focused with the keyboard, and the arrows pan it', async ({
    page,
  }) => {
    await focusWithKeyboard(page, viewport(page));
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

  test('Tab reaches the plot, the two handles and then the buttons, in that order', async ({
    page,
  }) => {
    await focusWithKeyboard(page, viewport(page));

    const order: string[] = [];
    for (let i = 0; i < 5; i += 1) {
      await page.keyboard.press('Tab');
      order.push(
        await page.evaluate(() => {
          const active = document.activeElement;
          return active?.getAttribute('data-testid') ?? active?.getAttribute('aria-label') ?? '';
        }),
      );
    }

    expect(order.slice(0, 2)).toEqual(['jump-marker', 'launch-handle']);
    expect(order.slice(2, 5)).toEqual(['Acercar', 'Alejar', 'Ajustar']);
  });

  test('a preset, and «Restablecer», frame the new jump whole', async ({ page }) => {
    await press(page, 'Acercar', STEPS_TO_X4);
    await expect.poll(() => readFactor(page)).toBe('×4');

    await lab(page).getByRole('button', { name: /^Luna/ }).click();
    await expect.poll(() => readFactor(page)).toBe('×1');

    await press(page, 'Acercar', STEPS_TO_X4);
    await lab(page).getByRole('button', { name: 'Restablecer' }).click();
    await expect.poll(() => readFactor(page)).toBe('×1');
  });

  test('a slider changes the jump and keeps the zoom', async ({ page }) => {
    await press(page, 'Acercar', STEPS_TO_X4);
    await expect.poll(() => readFactor(page)).toBe('×4');

    await v0Slider(page).focus();
    await page.keyboard.press('ArrowRight');

    await expect.poll(() => readV0(page)).toBeGreaterThan(13.1);
    await expect.poll(() => readFactor(page)).toBe('×4');
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
    for (const { steps, factor: expected } of zooms) {
      await press(page, 'Ajustar');
      await press(page, 'Acercar', steps);
      await expect.poll(() => readFactor(page)).toBe(expected);
      const bar = await readScaleBar(page);
      const { pxPerMetre } = lineOf((await readAxes(page)).x);
      expect(bar.metres).toBeGreaterThan(0);
      // 1, 2 or 5 times a power of ten, whatever its sign.
      expect(/^[125]$/u.test(String(bar.metres).replace(/[0.]/gu, ''))).toBe(true);
      expect(bar.px).toBeGreaterThanOrEqual(MIN_BAR_PX);
      expect(bar.px).toBeLessThanOrEqual(MAX_BAR_PX + PX_SLACK);
      expect(Math.abs(bar.px - bar.metres * pxPerMetre)).toBeLessThan(PX_SLACK + 2);
    }
  });

  test('shortens as the zoom grows: Celeste’s whole jump is a metre-sized bar, ×8 a tenth of it', async ({
    page,
  }) => {
    const whole = await readScaleBar(page);
    await press(page, 'Acercar', STEPS_TO_LIMIT);
    await expect.poll(() => readFactor(page)).toBe(`×${MAX_SCALE}`);

    const closest = await readScaleBar(page);

    expect(whole.metres).toBeGreaterThanOrEqual(0.5);
    expect(closest.metres).toBeLessThan(whole.metres);
  });
});

test.describe('the vectors', () => {
  test('keep their length on screen at ×4 and ×8', async ({ page }) => {
    const whole = await launchVectorPx(page);
    expect(whole).toBeGreaterThan(MIN_BAR_PX / 4);

    const drift = async () => Math.abs((await launchVectorPx(page)) - whole);

    await press(page, 'Acercar', STEPS_TO_X4);
    await expect.poll(() => readFactor(page)).toBe('×4');
    await expect.poll(drift).toBeLessThan(PX_SLACK);

    await press(page, 'Acercar', STEPS_TO_LIMIT - STEPS_TO_X4);
    await expect.poll(() => readFactor(page)).toBe(`×${MAX_SCALE}`);
    await expect.poll(drift).toBeLessThan(PX_SLACK);
  });
});

test.describe('the mouse', () => {
  test('Ctrl and the wheel zoom about the pointer and never zoom the page, also over the marker', async ({
    page,
  }) => {
    const before = lineOf((await readAxes(page)).x);
    const target = await knobCentre(page, 'jump-marker');
    await page.mouse.move(target.x, target.y);

    await page.keyboard.down('Control');
    await page.mouse.wheel(0, -WHEEL_NOTCH_PX);
    await page.keyboard.up('Control');

    await expect.poll(() => readFactor(page)).not.toBe('×1');
    const after = lineOf((await readAxes(page)).x);
    expect(after.pxPerMetre).toBeGreaterThan(before.pxPerMetre);
    expect(await page.evaluate(() => window.visualViewport?.scale)).toBe(1);
    // The metre under the pointer stays under it (to a px of read-back).
    const plot = await box(viewport(page));
    const metreAt = (line: typeof before) => line.atOrigin + (target.x - plot.x) / line.pxPerMetre;
    expect(Math.abs(metreAt(after) - metreAt(before))).toBeLessThan(PX_SLACK / after.pxPerMetre);
  });

  test('the wheel alone scrolls the page over a plot nobody focused', async ({ page }) => {
    const target = await box(viewport(page));
    await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2);
    const scrolled = await page.evaluate(() => window.scrollY);

    await page.mouse.wheel(0, WHEEL_NOTCH_PX);

    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(scrolled);
    expect(await readFactor(page)).toBe('×1');
  });

  test('dragging the background pans the plot with the hand', async ({ page }) => {
    await press(page, 'Acercar', 2);
    await expect.poll(() => readFactor(page)).toBe('×2');
    const before = await readAxes(page);

    await mouseDrag(page, await emptyPoint(page), DRAG);

    await expect
      .poll(async () => lineOf((await readAxes(page)).x).atOrigin)
      .toBeGreaterThan(lineOf(before.x).atOrigin);
    const after = await readAxes(page);
    // The plot follows the hand: dragging left by 60 px moves the window right by 60 px of metres.
    const { pxPerMetre } = lineOf(after.x);
    const moved = lineOf(after.x).atOrigin - lineOf(before.x).atOrigin;
    expect(Math.abs(moved + DRAG.x / pxPerMetre)).toBeLessThan(PX_SLACK / pxPerMetre);
    // And up by 30 px: the window moves down, to smaller heights.
    expect(lineOf(after.y).atOrigin).toBeLessThan(lineOf(before.y).atOrigin);
  });

  test('dragging the launch handle at ×4 sets the same v0 per px as at ×1, and the window holds still meanwhile', async ({
    page,
  }) => {
    const dragUp = async () => {
      const from = await knobCentre(page, 'launch-handle');
      await page.mouse.move(from.x, from.y);
      await page.mouse.down();
      await page.mouse.move(from.x, from.y - HANDLE_DRAG_PX / 2, { steps: DRAG_STEPS });
      await page.mouse.move(from.x, from.y - HANDLE_DRAG_PX, { steps: DRAG_STEPS });
      const duringDrag = lineOf((await readAxes(page)).x);
      await page.mouse.up();
      return duringDrag;
    };
    const v0Start = await readV0(page);
    await dragUp();
    const atOne = (await readV0(page)) - v0Start;
    expect(atOne).toBeGreaterThan(0);

    await lab(page).getByRole('button', { name: 'Restablecer' }).click();
    await expect.poll(() => readV0(page)).toBeCloseTo(v0Start, 5);
    await press(page, 'Acercar', STEPS_TO_X4);
    await expect.poll(() => readFactor(page)).toBe('×4');
    await focusWithKeyboard(page, page.getByTestId('launch-handle'));
    await expect.poll(() => isKnobInPlot(page, 'launch-handle')).toBe(true);
    const before = lineOf((await readAxes(page)).x);

    const during = await dragUp();

    expect(during.atOrigin).toBeCloseTo(before.atOrigin, 3);
    expect(during.pxPerMetre).toBeCloseTo(before.pxPerMetre, 3);
    // The same px, the same v0 (to the 0,1 m/s the field snaps to and a px of read-back).
    expect((await readV0(page)) - v0Start).toBeCloseTo(atOne, 0);
  });

  /** Zoom to ×4 with the launch handle in view, then pan the plot so it sits 6 px from the left edge. */
  async function panHandleToLeftEdge(page: Page): Promise<void> {
    await press(page, 'Acercar', STEPS_TO_X4);
    await focusWithKeyboard(page, page.getByTestId('launch-handle'));
    await expect.poll(() => isKnobInPlot(page, 'launch-handle')).toBe(true);
    const plot = await box(viewport(page));
    const knob = await knobCentre(page, 'launch-handle');
    await page.getByTestId('launch-handle').blur();
    await mouseDrag(page, await emptyPoint(page), { x: plot.x + 6 - knob.x, y: 0 });
    await expect
      .poll(async () => (await knobCentre(page, 'launch-handle')).x)
      .toBeLessThan(plot.x + 8);
  }

  /** Presses on the handle and moves 2 px: the window the plot shows during the press. */
  async function windowDuringPress(page: Page): Promise<number> {
    await settle(page);
    const grab = await knobCentre(page, 'launch-handle');
    await page.mouse.move(grab.x, grab.y);
    await page.mouse.down();
    await page.mouse.move(grab.x, grab.y - 2);
    const during = lineOf((await readAxes(page)).x).atOrigin;
    await page.mouse.up();
    return during;
  }

  test('a press on the handle does not pan the view, even near the plot’s edge', async ({
    page,
  }) => {
    await panHandleToLeftEdge(page);
    const before = lineOf((await readAxes(page)).x).atOrigin;

    expect(await windowDuringPress(page)).toBeCloseTo(before, 3);
  });

  // R30: a script `focus()` inherits :focus-visible when the last thing the user did was a key, so
  // :focus-visible cannot tell a press; the canvas' pointer flag (usePointerPress) can.
  test('a press on the handle near the edge after a key on the slider does not pan the view (R30)', async ({
    page,
  }) => {
    await panHandleToLeftEdge(page);
    const before = lineOf((await readAxes(page)).x).atOrigin;
    await page.keyboard.press('Shift');
    await v0Slider(page).focus();
    await centrePlot(page);

    expect(await windowDuringPress(page)).toBeCloseTo(before, 3);
  });

  test('the origin’s knob keeps its whole hit target on the plot’s corner, past the plot area', async ({
    page,
  }) => {
    const knob = await knobCentre(page, 'jump-marker');
    const plot = await box(viewport(page));
    // Just inside the 16 px reach, left of and below the plot area, where the origin sits.
    const probes = [
      { x: knob.x - HIT_INSIDE_PX, y: knob.y, outside: knob.x - HIT_INSIDE_PX < plot.x },
      {
        x: knob.x,
        y: knob.y + HIT_INSIDE_PX,
        outside: knob.y + HIT_INSIDE_PX > plot.y + plot.height,
      },
    ];

    for (const probe of probes) {
      expect(probe.outside, 'a point past the plot area').toBe(true);
      const hit = await page.evaluate(
        ({ x, y }) =>
          document.elementFromPoint(x, y)?.closest('[data-testid]')?.getAttribute('data-testid'),
        probe,
      );
      expect(hit).toBe('jump-marker');
    }
  });
});

for (const size of VIEWPORTS) {
  test.describe(`the handles at ${size.width} px`, () => {
    test.use({ viewport: size });

    for (const handle of ['launch-handle', 'jump-marker']) {
      test(`${handle} focused outside the window is brought into view (×8, Tab to it)`, async ({
        page,
      }) => {
        await press(page, 'Acercar', STEPS_TO_LIMIT);
        await expect.poll(() => readFactor(page)).toBe(`×${MAX_SCALE}`);
        expect(await isKnobInPlot(page, handle)).toBe(false);

        await focusWithKeyboard(page, page.getByTestId(handle));

        await expect.poll(() => isKnobInPlot(page, handle)).toBe(true);
      });
    }

    test('an arrow key that moves the launch handle keeps it in view, 0,5 m/s at a time', async ({
      page,
    }) => {
      await press(page, 'Acercar', STEPS_TO_LIMIT);
      await focusWithKeyboard(page, page.getByTestId('launch-handle'));
      const start = await readV0(page);

      for (let i = 0; i < KEY_PRESSES; i += 1) await page.keyboard.press('ArrowUp');

      await expect.poll(() => readV0(page)).toBeCloseTo(start + KEY_PRESSES * 0.5, 5);
      await expect.poll(() => isKnobInPlot(page, 'launch-handle')).toBe(true);
    });

    for (const world of ['Tierra', 'Luna']) {
      for (const steps of [STEPS_TO_X4, STEPS_TO_LIMIT]) {
        test(`${world} at ×${steps === STEPS_TO_X4 ? 4 : MAX_SCALE}: 24 ↑ and 24 ↓ on the launch handle leave it in view after each one`, async ({
          page,
        }) => {
          await lab(page)
            .getByRole('button', { name: new RegExp(`^${world}`) })
            .click();
          await press(page, 'Acercar', steps);
          await focusWithKeyboard(page, page.getByTestId('launch-handle'));
          await expect.poll(() => isKnobInPlot(page, 'launch-handle')).toBe(true);

          // The jump changes shape with v0, so the plot's height does too: the handle must still be
          // in view once the plot has settled, key after key.
          for (const key of ['ArrowUp', 'ArrowDown']) {
            for (let i = 0; i < KEY_PRESSES * 2; i += 1) {
              await page.keyboard.press(key);
              await expect
                .poll(() => isKnobInPlot(page, 'launch-handle'), { message: `${key} ${i + 1}` })
                .toBe(true);
            }
          }
        });
      }
    }

    test('the marker follows its own key moves to the end of the jump', async ({ page }) => {
      await press(page, 'Acercar', STEPS_TO_LIMIT);
      await focusWithKeyboard(page, page.getByTestId('jump-marker'));

      await page.keyboard.press('End');

      await expect.poll(() => isKnobInPlot(page, 'jump-marker')).toBe(true);
    });
  });
}

/** The distinct plot shapes the trajectory takes in one click on «Acercar»: many glide, one jumps. */
async function pathsDuringZoom(page: Page): Promise<number> {
  const path = page.locator(`${PLOT} [data-series="live"]`);
  await path.evaluate((element) => {
    const seen: string[] = [];
    (window as unknown as { seen: string[] }).seen = seen;
    new MutationObserver(() => seen.push(element.getAttribute('d') ?? '')).observe(element, {
      attributes: true,
      attributeFilter: ['d'],
    });
  });
  await zoomButton(page, 'Acercar').click();
  await expect.poll(() => readFactor(page)).toBe('×1,4');
  await expect
    .poll(
      async () =>
        (await page.evaluate(() => (window as unknown as { seen: string[] }).seen)).length,
    )
    .toBeGreaterThan(0);
  // Let any glide finish: the last shape no longer changes.
  await expect
    .poll(async () => {
      const first = await path.getAttribute('d');
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
      return first === (await path.getAttribute('d'));
    })
    .toBe(true);
  const seen = await page.evaluate(() => (window as unknown as { seen: string[] }).seen);
  return new Set(seen).size;
}

async function openIn(browser: Browser, options: Parameters<Browser['newContext']>[0]) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  await page.goto(PAGE);
  await page.locator(LAB).scrollIntoViewIfNeeded();
  await waitForIsland(page, LAB);
  return { context, page };
}

test('a button glides the zoom; with reduced motion it jumps, with no steps between', async ({
  browser,
}) => {
  const smooth = await openIn(browser, { viewport: DESKTOP, reducedMotion: 'no-preference' });
  const glided = await pathsDuringZoom(smooth.page);
  await smooth.context.close();

  const reduced = await openIn(browser, { viewport: DESKTOP, reducedMotion: 'reduce' });
  const jumped = await pathsDuringZoom(reduced.page);
  await reduced.context.close();

  expect(glided).toBeGreaterThan(2);
  expect(jumped).toBe(1);
});

test('the server paints the first framing, with the buttons and the scale bar', async ({
  browser,
}) => {
  const plain = await browser.newContext({ javaScriptEnabled: false, viewport: DESKTOP });
  const server = await plain.newPage();
  await server.goto(PAGE);

  await expect(factor(server)).toHaveText('×1');
  await expect(server.locator(`${LAB} [data-zoom-controls] button`)).toHaveCount(3);
  await expect(server.locator(`${LAB} ${PLOT} [data-scale-bar]`)).toHaveCount(1);
  await expect(server.locator(`${LAB} [data-zoom-strip]`)).toHaveCount(1);
  await plain.close();
});

for (const size of VIEWPORTS) {
  test.describe(`at ${size.width} px`, () => {
    test.use({ viewport: size });

    test('the buttons are 40 px with a 20 px glyph, in a 48 px strip under the plot’s card, clear of the transport', async ({
      page,
    }) => {
      await centrePlot(page);
      for (const name of ['Acercar', 'Alejar', 'Ajustar']) {
        const button = await box(zoomButton(page, name));
        expect(button.width).toBeCloseTo(BUTTON_PX, 0);
        expect(button.height).toBeCloseTo(BUTTON_PX, 0);
        const glyph = await box(zoomButton(page, name).locator('svg'));
        expect(glyph.width).toBeCloseTo(GLYPH_PX, 0);
      }
      const strip = await box(page.locator(`${LAB} [data-zoom-strip]`));
      const card = await box(page.locator(PLOT));
      const transport = await box(page.locator(`${LAB} [data-lab-transport]`));

      expect(strip.height).toBeCloseTo(STRIP_PX, 0);
      expect(strip.y).toBeGreaterThanOrEqual(card.y + card.height - PX_SLACK);
      expect(strip.y + strip.height).toBeLessThanOrEqual(transport.y + PX_SLACK);
    });

    test('the scale bar is inside the plot and clear of both handles at ×1', async ({ page }) => {
      await centrePlot(page);
      const plot = await box(viewport(page));
      const bar = await box(page.locator(`${PLOT} [data-scale-bar]`));

      expect(isInside(bar, plot)).toBe(true);
      for (const handle of ['launch-handle', 'jump-marker']) {
        const knob = await box(page.getByTestId(handle).locator('[data-knob]'));
        expect(overlaps(bar, knob), `${handle} under the scale bar`).toBe(false);
      }
    });

    for (const world of ['Celeste', 'Tierra', 'Luna']) {
      test(`${world}: the plot and the figure keep their size at every zoom and pan`, async ({
        page,
      }) => {
        await lab(page)
          .getByRole('button', { name: new RegExp(`^${world}`) })
          .click();
        await settle(page);
        await centrePlot(page);
        const sizes = async () => [
          await box(viewport(page)),
          await box(page.locator(PLOT)),
          await box(page.locator(`${LAB} [data-lab-stage]`)),
        ];
        const whole = await sizes();
        const same = async () =>
          (await sizes()).every(
            (now, i) =>
              Math.abs(now.width - whole[i].width) < 0.5 &&
              Math.abs(now.height - whole[i].height) < 0.5,
          );

        const wholeScale = drawnScale(await readAxes(page));

        await focusWithKeyboard(page, viewport(page));
        for (let step = 0; step < STEPS_TO_LIMIT; step += 1) {
          await page.keyboard.press('+');
          await settle(page);
          expect(await same(), `${world} zoom step ${step + 1}`).toBe(true);
          // What the factor says is what is drawn: √2 per step, to the read-back of the ticks.
          const drawn = drawnScale(await readAxes(page)) / wholeScale;
          expect(
            Math.abs(drawn / Math.SQRT2 ** (step + 1) - 1),
            `${world} step ${step + 1}`,
          ).toBeLessThan(DRAWN_SCALE_TOLERANCE);
        }
        for (const key of ['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft']) {
          for (let i = 0; i < 3; i += 1) {
            await page.keyboard.press(key);
            await settle(page);
            expect(await same(), `${world} ${key} ${i + 1}`).toBe(true);
          }
        }
      });
    }
  });
}

/** The jump seen at eleven instants, from take-off to landing: where the marker and the arrow are. */
const INSTANTS = Array.from({ length: 11 }, (_, i) => String(i * 100));

for (const size of [DESKTOP, PHONE, { width: 320, height: 800 }]) {
  test.describe(`the scale bar through Luna's jump at ${size.width} px`, () => {
    test.use({ viewport: size });

    test('stays inside the plot and under the marker and the velocity arrow, at every instant', async ({
      page,
    }) => {
      await lab(page).getByRole('button', { name: /^Luna/ }).click();
      await settle(page);
      await centrePlot(page);
      const timeline = lab(page).getByRole('slider', { name: 'Línea de tiempo' });
      const plot = await box(viewport(page));
      const bar = page.locator(`${PLOT} [data-scale-bar]`);
      // Drawn first, so the marks that pass over it are painted over it.
      const order = await bar.evaluate((element) => {
        const above = (selector: string) =>
          Boolean(
            element.compareDocumentPosition(document.querySelector(selector)!) &
            Node.DOCUMENT_POSITION_FOLLOWING,
          );
        return [above('[data-testid="jump-marker"]'), above('[data-velocity]')];
      });
      expect(order).toEqual([true, true]);

      for (const value of INSTANTS) {
        await seekTimeline(timeline, value);
        await settle(page);
        expect(isInside(await box(bar), plot), `bar at ${value}`).toBe(true);
        const marker = await box(page.getByTestId('jump-marker').locator('[data-knob]'));
        expect(
          isInside(marker, {
            ...plot,
            x: plot.x - 16,
            y: plot.y - 16,
            width: plot.width + 32,
            height: plot.height + 32,
          }),
          `marker at ${value}`,
        ).toBe(true);
      }
    });
  });
}

test.describe('accessibility', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`no serious violations in the lab with the plot zoomed, ${theme} theme`, async ({
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

  test('the plot is a named group with instructions the screen reader can reach', async ({
    page,
  }) => {
    const plot = viewport(page);

    await expect(plot).toHaveAttribute('role', 'group');
    await expect(plot).toHaveAttribute('aria-label', 'Trayectoria del salto');
    const describedBy = await plot.getAttribute('aria-describedby');
    await expect(page.locator(`[id="${describedBy}"]`)).toContainText('Ctrl y la rueda');
  });

  test('the focused plot shows its focus ring, inside it', async ({ page }) => {
    await focusWithKeyboard(page, viewport(page));
    await expect(viewport(page)).toBeFocused();

    const outline = await viewport(page).evaluate((element) => {
      const style = getComputedStyle(element);
      return { width: style.outlineWidth, offset: style.outlineOffset };
    });

    expect(outline.width).not.toBe('0px');
    expect(Number.parseFloat(outline.offset)).toBeLessThan(0);
  });
});
