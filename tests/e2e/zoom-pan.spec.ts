/**
 * The shared zoom pieces (D1) on a test page outside the site (tests/e2e/fixtures/lab-zoom):
 * useZoomPan, ZoomOverlay (ScaleBar and ZoomControls) and the time badge in a LabShell whose canvas
 * is a 40 km map with a draggable handle; a second lab has a short canvas with the buttons in a
 * row. The labs that adopt them (D1.2 onwards) have their own specs.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { FIXTURE_BUILD_TIMEOUT_MS, startFixtureSite, type FixtureSite } from './fixtureSite';
import { waitForIsland } from './helpers';
import { expectSameHeightAfterHydration, HYDRATION_WIDTHS } from './hydrationStability';

const LAB = '[data-testid="zoom-fixture-lab"]';
const ROW_LAB = '[data-testid="zoom-fixture-lab-row"]';
/** «Ajustar» frames the fixture's route: 37 of the map's 40 km across (ROUTE_BOX_KM). */
const FIT_SCALE = 40 / 37;
const BLOCKING_IMPACTS = ['serious', 'critical'];
const VIEWPORTS = [
  { width: 1280, height: 800 },
  { width: 360, height: 800 },
] as const;
const ZOOM_NAMES = ['Acercar', 'Alejar', 'Ajustar', 'Tamaño real 1:1'] as const;
/** One arrow press (ZOOM_PAN_STEP_PX) and one wheel notch. */
const PAN_STEP_PX = 48;
const WHEEL_NOTCH_PX = 100;
/** A background drag, well past the 4 px threshold. */
const DRAG = { x: -60, y: -40 } as const;
const HANDLE_DRAG = { x: 30, y: 20 } as const;
const DRAG_STEPS = 6;
/** Sub-pixel slack of the pointer and of the transform's printed numbers. */
const PX_SLACK = 1.5;
const BUTTON_PX = 40;
const GLYPH_PX = 20;
/** The zoom's polite region speaks once a change holds this long (ZOOM_ANNOUNCE_DELAY_MS), and more. */
const ANNOUNCE_SETTLED_MS = 1000;

let site: FixtureSite;

test.describe.configure({ mode: 'serial' });
test.beforeAll(async () => {
  test.setTimeout(FIXTURE_BUILD_TIMEOUT_MS);
  site = await startFixtureSite('lab-zoom');
});
test.afterAll(async () => {
  await site?.stop();
});

async function openFixture(
  page: Page,
  theme: 'light' | 'dark' = 'light',
  selector: string = LAB,
): Promise<Locator> {
  await page.goto(`${site.url}?theme=${theme}`);
  await waitForIsland(page, selector);
  return page.locator(selector);
}

/** Focuses the canvas from the keyboard (Tab from the gear), so its focus shows (:focus-visible). */
async function tabToCanvas(page: Page, lab: Locator): Promise<void> {
  await lab.getByRole('button', { name: 'Ajustes del simulador' }).focus();
  await page.keyboard.press('Tab');
  await expect(viewport(lab)).toBeFocused();
}

const viewport = (lab: Locator) => lab.locator('[data-zoom-viewport]');
const factor = (lab: Locator) => lab.locator('[data-zoom-factor]');
const zoomButton = (lab: Locator, name: string) =>
  lab.getByRole('group', { name: 'Zoom' }).getByRole('button', { name, exact: true });
const handle = (lab: Locator) => lab.getByRole('slider', { name: 'Punto de prueba' });

interface View {
  scale: number;
  x: number;
  y: number;
}

/** The view, read back from the drawing group's transform. */
async function viewOf(lab: Locator): Promise<View> {
  const transform = await lab.locator('[data-zoom-content]').getAttribute('transform');
  const match = /^translate\((\S+) (\S+)\) scale\((\S+)\)$/u.exec(transform ?? '');
  if (!match) throw new Error(`transform inesperado: ${transform}`);
  return { x: Number(match[1]), y: Number(match[2]), scale: Number(match[3]) };
}

/** Waits for a glide to end on `scale` (the factor reads it rounded before the glide ends). */
async function settleAt(lab: Locator, scale: number): Promise<void> {
  await expect
    .poll(async () => Math.abs((await viewOf(lab)).scale - scale), { message: `×${scale}` })
    .toBeLessThan(1e-9);
}

type Box = { x: number; y: number; width: number; height: number };

/** Whether two boxes share no area. */
const isApart = (a: Box, b: Box) =>
  a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y;

const isInside = (inner: Box, outer: Box) =>
  inner.x >= outer.x &&
  inner.y >= outer.y &&
  inner.x + inner.width <= outer.x + outer.width &&
  inner.y + inner.height <= outer.y + outer.height;

/** A point of the canvas' background, away from the handle, the buttons and the scale bar. */
async function backgroundPoint(lab: Locator): Promise<{ x: number; y: number }> {
  const box = (await viewport(lab).boundingBox())!;
  return { x: box.x + box.width * 0.45, y: box.y + box.height * 0.3 };
}

async function dragMouse(page: Page, from: { x: number; y: number }, by: { x: number; y: number }) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + by.x, from.y + by.y, { steps: DRAG_STEPS });
  await page.mouse.up();
}

/** Whether the default of the next wheel on the page was prevented (read after it bubbles). */
async function watchWheel(page: Page): Promise<() => Promise<boolean | null>> {
  await page.evaluate(() => {
    (window as unknown as { lastWheel: boolean | null }).lastWheel = null;
    document.addEventListener(
      'wheel',
      (event) => {
        (window as unknown as { lastWheel: boolean | null }).lastWheel = event.defaultPrevented;
      },
      { once: true },
    );
  });
  return () => page.evaluate(() => (window as unknown as { lastWheel: boolean | null }).lastWheel);
}

for (const size of VIEWPORTS) {
  test.describe(`a ${size.width} px`, () => {
    test.use({ viewport: size });

    test('los botones acercan y alejan hasta sus límites, y «Ajustar» y «1:1» vuelven al encuadre', async ({
      page,
    }) => {
      const lab = await openFixture(page);

      await expect(factor(lab)).toHaveText('×1');
      // The route («Ajustar») is framed tighter than the lab's own frame; ×1 is the frame.
      for (const name of ['Acercar', 'Ajustar']) {
        await expect(zoomButton(lab, name)).not.toHaveAttribute('aria-disabled');
      }
      for (const name of ['Alejar', 'Tamaño real 1:1']) {
        await expect(zoomButton(lab, name)).toHaveAttribute('aria-disabled', 'true');
      }

      await zoomButton(lab, 'Acercar').click();
      await expect(factor(lab)).toHaveText('×1,4');
      for (let i = 0; i < 5; i += 1) await zoomButton(lab, 'Acercar').click();
      await expect(factor(lab)).toHaveText('×8');
      await expect(zoomButton(lab, 'Acercar')).toHaveAttribute('aria-disabled', 'true');
      await zoomButton(lab, 'Acercar').click({ force: true }); // inert: Playwright waits on aria-disabled
      await expect(factor(lab)).toHaveText('×8');
      await expect.poll(async () => (await viewOf(lab)).scale).toBe(8);

      await zoomButton(lab, 'Ajustar').click();
      await expect(factor(lab)).toHaveText('×1,1');
      await settleAt(lab, FIT_SCALE);
      await expect(zoomButton(lab, 'Ajustar')).toHaveAttribute('aria-disabled', 'true');

      await zoomButton(lab, 'Tamaño real 1:1').click();
      await expect(factor(lab)).toHaveText('×1');
      await expect.poll(() => viewOf(lab)).toEqual({ scale: 1, x: 0, y: 0 });
      await zoomButton(lab, 'Alejar').click({ force: true });
      await expect(factor(lab)).toHaveText('×1');
    });

    for (const selector of [LAB, ROW_LAB]) {
      test(`${selector}: botones de 40 px con glifo de 20; botones, barra de escala e insignia de tiempo dentro del lienzo sin tocarse`, async ({
        page,
      }) => {
        const lab = await openFixture(page, 'light', selector);
        const canvas = (await viewport(lab).boundingBox())!;
        const controls = (await lab.locator('[data-zoom-controls]').boundingBox())!;
        const bar = (await lab.locator('div[data-scale-bar]').boundingBox())!;
        const badge = (await lab.locator('div[data-time-scale-badge]').boundingBox())!;

        for (const name of ZOOM_NAMES) {
          const box = (await zoomButton(lab, name).boundingBox())!;
          expect(box.width).toBe(BUTTON_PX);
          expect(box.height).toBe(BUTTON_PX);
        }
        for (const glyph of await lab.locator('[data-zoom-controls] svg').all()) {
          expect((await glyph.boundingBox())!.width).toBe(GLYPH_PX);
        }
        for (const box of [controls, bar, badge]) expect(isInside(box, canvas)).toBe(true);
        expect(isApart(controls, bar)).toBe(true);
        expect(isApart(controls, badge)).toBe(true);
        expect(isApart(bar, badge)).toBe(true);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
          size.width,
        );
      });
    }

    test('la barra de escala da una longitud redonda de 64 a 160 px y se recalcula con el zoom', async ({
      page,
    }) => {
      const lab = await openFixture(page);
      const bar = lab.locator('div[data-scale-bar]');
      const line = lab.locator('[data-scale-bar-line]');
      const read = async () => ({
        text: (await bar.textContent())!.replace(/\s+/gu, ' ').trim(),
        px: (await line.boundingBox())!.width,
      });
      const before = await read();

      await zoomButton(lab, 'Acercar').click();
      await zoomButton(lab, 'Acercar').click();
      await settleAt(lab, 2);
      const after = await read();

      for (const reading of [before, after]) {
        expect(reading.text).toMatch(/^(1|2|5)(0*) k?m$/u);
        expect(reading.px).toBeGreaterThanOrEqual(64);
        expect(reading.px).toBeLessThanOrEqual(160);
      }
      expect(after.text).not.toBe(before.text);
      await expect(bar).toHaveAttribute('aria-hidden', 'true');
      await expect(lab.locator('[data-scale-bar-words]')).toHaveText(/^Barra de escala: /u);
    });
  });
}

test('con el teclado: el lienzo entra en el orden de foco y + − 0 y las flechas lo manejan', async ({
  page,
}) => {
  const lab = await openFixture(page);
  await tabToCanvas(page, lab);
  await expect(viewport(lab)).toHaveAttribute('aria-roledescription', 'lienzo con zoom');
  const described = await viewport(lab).getAttribute('aria-describedby');
  await expect(page.locator(`[id="${described}"]`)).toContainText('las flechas lo desplazan');

  await page.keyboard.press('+');
  await expect(factor(lab)).toHaveText('×1,4');
  await page.keyboard.press('+');
  await expect(factor(lab)).toHaveText('×2');
  await settleAt(lab, 2);
  const before = await viewOf(lab);
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowUp');
  const after = await viewOf(lab);
  expect(after.x - before.x).toBeCloseTo(PAN_STEP_PX, 3);
  expect(after.y - before.y).toBeCloseTo(PAN_STEP_PX, 3);
  await page.keyboard.press('-');
  await expect(factor(lab)).toHaveText('×1,4');
  await page.keyboard.press('0');
  await settleAt(lab, FIT_SCALE);
  const fitted = await viewOf(lab);

  // Then the handle (its arrows move it, not the view), then the zoom buttons.
  await page.keyboard.press('Tab');
  await expect(handle(lab)).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(handle(lab)).toHaveAttribute('aria-valuetext', /^x = 11,0\skm$/u);
  expect(await viewOf(lab)).toEqual(fitted);
  await page.keyboard.press('Tab');
  await expect(zoomButton(lab, 'Acercar')).toBeFocused();
});

test('al llegar al límite, un botón inerte conserva el foco', async ({ page }) => {
  const lab = await openFixture(page);
  await zoomButton(lab, 'Acercar').focus();

  for (let i = 0; i < 7; i += 1) await page.keyboard.press('Enter');

  await expect(factor(lab)).toHaveText('×8');
  await expect(zoomButton(lab, 'Acercar')).toHaveAttribute('aria-disabled', 'true');
  await expect(zoomButton(lab, 'Acercar')).toBeFocused();
});

test('la rueda con Ctrl acerca bajo el puntero y no deja que la página haga zoom', async ({
  page,
}) => {
  const lab = await openFixture(page);
  const point = await backgroundPoint(lab);
  const canvas = (await viewport(lab).boundingBox())!;
  const prevented = await watchWheel(page);

  await page.mouse.move(point.x, point.y);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -WHEEL_NOTCH_PX);
  await page.keyboard.up('Control');

  await expect(factor(lab)).toHaveText('×1,4');
  expect(await prevented()).toBe(true);
  const view = await viewOf(lab);
  // The drawing point under the pointer stayed there.
  const local = { x: point.x - canvas.x, y: point.y - canvas.y };
  const world = { x: (local.x - view.x) / view.scale, y: (local.y - view.y) / view.scale };
  expect(Math.abs(world.x - local.x)).toBeLessThan(PX_SLACK);
  expect(Math.abs(world.y - local.y)).toBeLessThan(PX_SLACK);
  expect(await page.evaluate(() => window.visualViewport?.scale)).toBe(1);
});

test('la rueda sola desplaza la página sin foco y tras un clic; acerca si el lienzo se enfocó con el teclado', async ({
  page,
}) => {
  const lab = await openFixture(page);
  const point = await backgroundPoint(lab);
  await page.mouse.move(point.x, point.y);
  const unfocused = await watchWheel(page);

  await page.mouse.wheel(0, WHEEL_NOTCH_PX);

  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  expect(await unfocused()).toBe(false);
  await expect(factor(lab)).toHaveText('×1');

  // A click focuses the canvas without showing it: the wheel still scrolls the page.
  await page.evaluate(() => window.scrollTo(0, 0));
  const clicked = await backgroundPoint(lab);
  await page.mouse.click(clicked.x, clicked.y);
  await expect(viewport(lab)).toBeFocused();
  const afterClick = await watchWheel(page);
  await page.mouse.wheel(0, WHEEL_NOTCH_PX);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  expect(await afterClick()).toBe(false);
  await expect(factor(lab)).toHaveText('×1');

  await page.evaluate(() => window.scrollTo(0, 0));
  await tabToCanvas(page, lab);
  const again = await backgroundPoint(lab);
  await page.mouse.move(again.x, again.y);
  const zoomed = await watchWheel(page);
  await page.mouse.wheel(0, -WHEEL_NOTCH_PX);

  await expect(factor(lab)).toHaveText('×1,4');
  expect(await zoomed()).toBe(true);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

test('un arrastre soltado fuera del lienzo no sigue al ratón cuando vuelve', async ({ page }) => {
  const lab = await openFixture(page);
  await zoomButton(lab, 'Acercar').click();
  await zoomButton(lab, 'Acercar').click();
  await settleAt(lab, 2);
  const zoomed = await viewOf(lab);
  const canvas = (await viewport(lab).boundingBox())!;
  const start = { x: canvas.x + canvas.width * 0.45, y: canvas.y + 6 };

  // Down near the top edge, one move out (no pan yet: under the threshold inside), up outside.
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x, canvas.y - 40);
  await page.mouse.up();
  await page.mouse.move(start.x + 40, start.y + 100, { steps: DRAG_STEPS + 2 });

  expect(await viewOf(lab)).toEqual(zoomed);
  await expect(viewport(lab)).not.toHaveAttribute('data-zoom-panning');
});

test('a ×8, el Tab trae el asidero a la vista y sus flechas no lo sacan de ella', async ({
  page,
}) => {
  const lab = await openFixture(page);
  for (let i = 0; i < 6; i += 1) await zoomButton(lab, 'Acercar').click();
  await settleAt(lab, 8);
  const canvas = (await viewport(lab).boundingBox())!;
  expect(isInside((await handle(lab).boundingBox())!, canvas)).toBe(false);

  await tabToCanvas(page, lab);
  await page.keyboard.press('Tab');
  await expect(handle(lab)).toBeFocused();

  await expect.poll(async () => isInside((await handle(lab).boundingBox())!, canvas)).toBe(true);
  for (let i = 0; i < 5; i += 1) await page.keyboard.press('ArrowLeft');
  await expect.poll(async () => isInside((await handle(lab).boundingBox())!, canvas)).toBe(true);
  await expect(factor(lab)).toHaveText('×8');
});

test('arrastrar el fondo desplaza el dibujo; arrastrar el asidero lo mueve a él, no al dibujo', async ({
  page,
}) => {
  const lab = await openFixture(page);
  // Zoom about the handle, so it stays on screen: Ctrl + wheel keeps it under the pointer.
  const knob = (await handle(lab).boundingBox())!;
  const centre = { x: knob.x + knob.width / 2, y: knob.y + knob.height / 2 };
  await page.mouse.move(centre.x, centre.y);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -WHEEL_NOTCH_PX);
  await page.mouse.wheel(0, -WHEEL_NOTCH_PX);
  await page.keyboard.up('Control');
  await expect(factor(lab)).toHaveText('×2');
  const zoomed = await viewOf(lab);
  const valueBefore = Number(await handle(lab).getAttribute('aria-valuenow'));

  await dragMouse(page, centre, HANDLE_DRAG);

  expect(await viewOf(lab)).toEqual(zoomed);
  const moved = Number(await handle(lab).getAttribute('aria-valuenow'));
  expect(moved).toBeGreaterThan(valueBefore);

  const point = await backgroundPoint(lab);
  await dragMouse(page, point, DRAG);
  const panned = await viewOf(lab);
  expect(panned.scale).toBe(zoomed.scale);
  expect(Math.abs(panned.x - (zoomed.x + DRAG.x))).toBeLessThan(PX_SLACK);
  expect(Math.abs(panned.y - (zoomed.y + DRAG.y))).toBeLessThan(PX_SLACK);
  expect(Number(await handle(lab).getAttribute('aria-valuenow'))).toBe(moved);

  // A click on the background is a click: nothing moves.
  await page.mouse.click(point.x, point.y);
  expect(await viewOf(lab)).toEqual(panned);
});

test('un pellizco con dos dedos acerca en torno a su punto medio', async ({ page }) => {
  const lab = await openFixture(page);
  const box = (await viewport(lab).boundingBox())!;
  const mid = { x: box.x + box.width / 2, y: box.y + box.height / 2 };

  await lab
    .locator('[data-testid="zoom-scene"] rect')
    .first()
    .evaluate(
      (target, { mid, gap }) => {
        const fire = (type: string, pointerId: number, x: number) =>
          target.dispatchEvent(
            new PointerEvent(type, {
              bubbles: true,
              cancelable: true,
              pointerId,
              pointerType: 'touch',
              isPrimary: pointerId === 1,
              clientX: x,
              clientY: mid.y,
            }),
          );
        fire('pointerdown', 1, mid.x - gap);
        fire('pointerdown', 2, mid.x + gap);
        fire('pointermove', 1, mid.x - 2 * gap);
        fire('pointermove', 2, mid.x + 2 * gap);
        fire('pointerup', 1, mid.x - 2 * gap);
        fire('pointerup', 2, mid.x + 2 * gap);
      },
      { mid, gap: 40 },
    );

  await expect(factor(lab)).toHaveText('×2');
  const view = await viewOf(lab);
  const centre = { x: box.width / 2, y: box.height / 2 };
  expect(Math.abs((centre.x - view.x) / view.scale - centre.x)).toBeLessThan(PX_SLACK);
});

test('al tacto, la página se desplaza sobre el lienzo mientras cabe; acercado, un dedo mueve el dibujo', async ({
  page,
}) => {
  const lab = await openFixture(page);

  await expect(viewport(lab)).toHaveCSS('touch-action', 'pan-y');
  await zoomButton(lab, 'Acercar').click();
  await expect(factor(lab)).toHaveText('×1,4');
  await expect(viewport(lab)).toHaveCSS('touch-action', 'none');
  await expect(viewport(lab)).toHaveCSS('cursor', 'grab');
});

/** The distinct scales the drawing showed while «Acercar» played out. */
async function scalesDuringZoom(page: Page, lab: Locator): Promise<number[]> {
  await lab.locator('[data-zoom-content]').evaluate((group) => {
    const seen: string[] = [];
    (window as unknown as { seen: string[] }).seen = seen;
    new MutationObserver(() => seen.push(group.getAttribute('transform') ?? '')).observe(group, {
      attributes: true,
    });
  });
  const seen = () => page.evaluate(() => (window as unknown as { seen: string[] }).seen);
  const scaleOf = (transform: string) => Number(/scale\((\S+)\)/u.exec(transform)?.[1]);
  await zoomButton(lab, 'Acercar').click();
  // The glide ends on ×√2: wait for the last transform to say so.
  await expect
    .poll(async () => Math.abs(scaleOf((await seen()).at(-1) ?? '') - Math.SQRT2))
    .toBeLessThan(1e-9);
  return [...new Set((await seen()).map(scaleOf))];
}

test('un botón desliza el zoom; con movimiento reducido salta, sin pasos intermedios', async ({
  browser,
}) => {
  const smooth = await browser.newContext();
  const smoothPage = await smooth.newPage();
  await smoothPage.goto(site.url);
  await waitForIsland(smoothPage, LAB);
  const glided = await scalesDuringZoom(smoothPage, smoothPage.locator(LAB));
  await smooth.close();

  const reduced = await browser.newContext({ reducedMotion: 'reduce' });
  const reducedPage = await reduced.newPage();
  await reducedPage.goto(site.url);
  await waitForIsland(reducedPage, LAB);
  const jumped = await scalesDuringZoom(reducedPage, reducedPage.locator(LAB));
  await reduced.close();

  expect(glided.length).toBeGreaterThan(2);
  expect(jumped).toHaveLength(1);
  expect(jumped[0]).toBeCloseTo(Math.SQRT2, 6);
});

test('un cambio de zoom se anuncia una vez asentado; al cargar, nada', async ({ page }) => {
  await page.clock.install();
  const lab = await openFixture(page);
  const status = lab.locator('[data-zoom-controls] ~ [role="status"]');
  await page.clock.runFor(ANNOUNCE_SETTLED_MS);
  await expect(status).toBeEmpty();

  await zoomButton(lab, 'Acercar').click();
  await page.clock.runFor(ANNOUNCE_SETTLED_MS);

  await expect(status).toHaveText('Zoom: 1,4 veces la escala del dibujo');
  await expect(lab.locator('[data-zoom-words]')).toHaveText('Zoom: 1,4 veces la escala del dibujo');
});

test('el servidor pinta el encuadre inicial, con los botones y la barra', async ({ browser }) => {
  const plain = await browser.newContext({ javaScriptEnabled: false });
  const page = await plain.newPage();
  await page.goto(site.url);
  const lab = page.locator(LAB);

  await expect(lab.locator('[data-zoom-content]')).toHaveAttribute(
    'transform',
    'translate(0 0) scale(1)',
  );
  await expect(factor(lab)).toHaveText('×1');
  await expect(lab.locator('[data-zoom-controls] button')).toHaveCount(ZOOM_NAMES.length);
  await expect(lab.locator('div[data-scale-bar]')).toHaveCount(1);
  await plain.close();
});

for (const width of HYDRATION_WIDTHS) {
  test(`a ${width} px el servidor y la página hidratada miden lo mismo`, async ({ browser }) => {
    await expectSameHeightAfterHydration(browser, site.url, LAB, width);
    await expectSameHeightAfterHydration(browser, site.url, ROW_LAB, width);
  });
}

for (const theme of ['light', 'dark'] as const) {
  test(`sin violaciones graves de accesibilidad (${theme})`, async ({ page }) => {
    const lab = await openFixture(page, theme);
    await zoomButton(lab, 'Acercar').click();
    await expect(factor(lab)).toHaveText('×1,4');

    const { violations } = await new AxeBuilder({ page }).include(LAB).analyze();

    expect(
      violations
        .filter((violation) => BLOCKING_IMPACTS.includes(violation.impact ?? ''))
        .map(({ id, nodes }) => ({ id, targets: nodes.map((node) => node.target.join(' ')) })),
    ).toEqual([]);
  });
}
