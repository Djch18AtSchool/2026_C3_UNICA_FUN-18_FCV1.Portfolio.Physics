/**
 * The zoom of Tema 3's habitat ring (D1.3a): the shared pieces (useZoomPan, ZoomControls, the scale
 * bar) on the real page. The ring is drawn through the zoom's view (the person, the band and the
 * vectors grow, text and strokes do not); the scale bar measures the floor radius r; the radius
 * bar is outside the zoomed canvas and the strip with the buttons goes under it.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { seekTimeline, waitForIsland } from './helpers';

const PAGE = './temas/gravedad-artificial/';
const LAB = '[data-testid="habitat-lab"]';
const PHONE = { width: 360, height: 800 };
const NARROW = { width: 320, height: 800 };
const DESKTOP = { width: 1280, height: 800 };
const BLOCKING_IMPACTS = ['serious', 'critical'];
const ZOOM_STEP = Math.SQRT2;
const MAX_ZOOM_CLICKS = 6;
const WHEEL_NOTCH_PX = 100;
const PAN_STEP_PX = 48;
const BUTTON_PX = 40;
const GLYPH_PX = 20;
const STRIP_ROW_PX = 48;
/** The width below which the strip stacks (HabitatZoomStrip) and the lab's own breakpoint. */
const STACK_BELOW_PX = 408;
const PX_SLACK = 1.5;
const DRAG_STEPS = 6;
const BAR_MIN_PX = 64;
const BAR_MAX_PX = 160;
/** Positions of the timeline (of 1000) the ring is turned to: eight angles of the turn. */
const TURN_STOPS = ['0', '125', '250', '375', '500', '625', '750', '875'] as const;
/** The labels may poke out of the ring's square by this much (the box of the text, not its ink). */
const LABEL_SLACK_PX = 1;
/** What the factor reads after 0 to 6 presses of «Acercar» (steps of √2). */
const FACTORS = ['×1', '×1,4', '×2', '×2,8', '×4', '×5,7', '×8'] as const;

async function openLab(page: Page, theme: 'light' | 'dark' = 'light'): Promise<Locator> {
  await page.addInitScript((value) => window.localStorage.setItem('theme', value), theme);
  await page.goto(PAGE);
  await page.locator(LAB).scrollIntoViewIfNeeded();
  await waitForIsland(page, LAB);
  const lab = page.locator(LAB);
  // Away from the sticky header, which would take the pointer of any gesture on the top.
  await canvas(lab).evaluate((element) => element.scrollIntoView({ block: 'center' }));
  return lab;
}

const canvas = (lab: Locator) => lab.locator('[data-zoom-viewport]');
const scene = (lab: Locator) => lab.getByTestId('habitat-scene');
const factor = (lab: Locator) => lab.locator('[data-zoom-factor]');
const ring = (lab: Locator) => lab.getByTestId('habitat-ring');
const hub = (lab: Locator) => lab.locator('[data-hub]');
const radiusHandle = (lab: Locator) => lab.getByTestId('radius-handle');
const strip = (lab: Locator) => lab.locator('[data-zoom-strip]');
const zoomButton = (lab: Locator, name: string) =>
  lab.getByRole('group', { name: 'Zoom' }).getByRole('button', { name, exact: true });

/** The floor radius on screen: the inner circle of the ring path. */
async function ringRadius(lab: Locator): Promise<number> {
  const d = (await ring(lab).getAttribute('d')) ?? '';
  const [, inner] = /Z M[-\d.]+ [-\d.]+ a([\d.]+)/u.exec(d) ?? [];
  return Number(inner);
}

async function hubCentre(lab: Locator): Promise<{ x: number; y: number }> {
  return {
    x: Number(await hub(lab).getAttribute('cx')),
    y: Number(await hub(lab).getAttribute('cy')),
  };
}

/** Waits for a glide to end with the floor drawn `radius` px long. */
async function settleRadius(lab: Locator, radius: number): Promise<void> {
  await expect
    .poll(async () => Math.abs((await ringRadius(lab)) - radius), { message: `r = ${radius}` })
    .toBeLessThan(1e-3);
}

/**
 * The scale bar and the floor radius, read in one go (one frame, so one view even mid-glide): the
 * bar's length in px as it is declared (its style: the box follows a frame later, see
 * `drawnBarWidth`) and its round value in metres, and the floor radius on screen in px.
 */
async function scaleReading(lab: Locator) {
  const reading = await lab.evaluate((root) => {
    const bar = root.querySelector('div[data-scale-bar]') as HTMLElement;
    const line = bar.querySelector('[data-scale-bar-line]') as HTMLElement;
    const d = root.querySelector('[data-testid="habitat-ring"]')?.getAttribute('d') ?? '';
    return {
      px: Number.parseFloat(line.style.width),
      text: (bar.textContent ?? '').replace(/\s+/gu, ' ').trim(),
      ring: Number(/Z M[-\d.]+ [-\d.]+ a([\d.]+)/u.exec(d)?.[1]),
    };
  });
  const [, digits, unit] = /^([\d ]+) (m|km)$/u.exec(reading.text) ?? [];
  const value = Number(digits.replace(/ /gu, ''));
  return { ...reading, metres: unit === 'km' ? value * 1000 : value };
}

/** The bar's line as laid out: equal to its declared length once the layout has caught up. */
const drawnBarWidth = (lab: Locator) =>
  lab.locator('[data-scale-bar-line]').evaluate((line) => line.getBoundingClientRect().width);

type Box = { x: number; y: number; width: number; height: number };
const isApart = (a: Box, b: Box) =>
  a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y;
const isInside = (inner: Box, outer: Box) =>
  inner.x >= outer.x &&
  inner.y >= outer.y &&
  inner.x + inner.width <= outer.x + outer.width &&
  inner.y + inner.height <= outer.y + outer.height;

async function setRadius(lab: Locator, metres: string): Promise<void> {
  await lab.getByRole('switch', { name: 'Fijar 1 g' }).uncheck({ force: true });
  const field = lab.getByRole('textbox', { name: /^Radio del piso/ });
  await field.fill(metres);
  await field.press('Enter');
  await expect(radiusHandle(lab)).toHaveAttribute('aria-valuenow', metres);
}

async function dragMouse(page: Page, from: { x: number; y: number }, by: { x: number; y: number }) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + by.x, from.y + by.y, { steps: DRAG_STEPS });
}

/** Focuses the canvas from the keyboard (Tab from the gear), so its focus shows. */
async function tabToCanvas(page: Page, lab: Locator): Promise<void> {
  await lab.getByRole('button', { name: 'Ajustes del simulador' }).focus();
  await page.keyboard.press('Tab');
  await expect(canvas(lab)).toBeFocused();
}

test.describe('el anillo del hábitat, con zoom', () => {
  test.use({ viewport: DESKTOP });

  test('lleva los botones compartidos con «Ajustar» y sin «1:1»; la barra del radio queda fuera del lienzo', async ({
    page,
  }) => {
    const lab = await openLab(page);

    await expect(lab.locator('[data-zoom-viewport]')).toHaveCount(1);
    await expect(canvas(lab)).toHaveAttribute('aria-label', 'Anillo del hábitat');
    await expect(canvas(lab).getByTestId('habitat-scene')).toHaveCount(1);
    await expect(canvas(lab).getByTestId('radius-handle')).toHaveCount(0);
    await expect(canvas(lab).getByRole('button', { name: 'Acercar' })).toHaveCount(0);
    await expect(zoomButton(lab, 'Tamaño real 1:1')).toHaveCount(0);
    await expect(factor(lab)).toHaveText('×1');
    for (const name of ['Alejar', 'Ajustar']) {
      await expect(zoomButton(lab, name)).toHaveAttribute('aria-disabled', 'true');
    }
    await expect(zoomButton(lab, 'Acercar')).not.toHaveAttribute('aria-disabled');
  });

  test('los botones acercan hasta ×8 y «Ajustar» vuelve al anillo entero', async ({ page }) => {
    const lab = await openLab(page);
    const start = await ringRadius(lab);
    const startCentre = await hubCentre(lab);

    await zoomButton(lab, 'Acercar').click();
    await expect(factor(lab)).toHaveText('×1,4');
    await settleRadius(lab, start * ZOOM_STEP);
    for (let step = 1; step < MAX_ZOOM_CLICKS; step += 1) {
      await zoomButton(lab, 'Acercar').click();
    }
    await expect(factor(lab)).toHaveText('×8');
    await expect(zoomButton(lab, 'Acercar')).toHaveAttribute('aria-disabled', 'true');
    await settleRadius(lab, start * 8);
    // About the centre: the hub, which is at the centre, does not move.
    expect((await hubCentre(lab)).x).toBeCloseTo(startCentre.x, 3);

    await zoomButton(lab, 'Ajustar').click();
    await expect(factor(lab)).toHaveText('×1');
    await settleRadius(lab, start);
    await expect(zoomButton(lab, 'Ajustar')).toHaveAttribute('aria-disabled', 'true');
  });

  test('la barra de escala mide el radio: su largo en px es el del anillo por sus metros sobre r, a cada zoom', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const lab = await openLab(page);
    const readings: string[] = [];

    for (const radius of ['5', '223.6', '894.6', '4000']) {
      await setRadius(lab, radius);
      await zoomButton(lab, 'Ajustar').click({ force: true });
      for (let click = 0; click <= MAX_ZOOM_CLICKS; click += 1) {
        if (click > 0) await zoomButton(lab, 'Acercar').click();
        await expect(factor(lab)).toHaveText(FACTORS[click]);
        const bar = await scaleReading(lab);

        // The floor is r metres from the hub on screen, whatever the zoom.
        expect(bar.px / bar.ring, `${bar.text}, r = ${radius}, ×${click}`).toBeCloseTo(
          bar.metres / Number(radius),
          3,
        );
        expect(bar.px).toBeGreaterThanOrEqual(BAR_MIN_PX - PX_SLACK);
        expect(bar.px).toBeLessThanOrEqual(BAR_MAX_PX + PX_SLACK);
        readings.push(bar.text);
        await expect.poll(() => drawnBarWidth(lab)).toBeCloseTo(bar.px, 0);
      }
    }

    expect(new Set(readings).size).toBeGreaterThan(4);
    await expect(lab.locator('[data-scale-bar-words]')).toHaveText(
      /^Barra de escala: \d+\s(m|km)$/u,
    );
  });

  test('con el teclado: el lienzo entra en el orden de foco, + − 0 y las flechas lo manejan, y luego van el manejador del radio y los botones', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const lab = await openLab(page);
    const start = await ringRadius(lab);
    await tabToCanvas(page, lab);
    await expect(canvas(lab)).toHaveAttribute('aria-roledescription', 'lienzo con zoom');
    const described = await canvas(lab).getAttribute('aria-describedby');
    await expect(page.locator(`[id="${described}"]`)).toContainText('las flechas lo desplazan');

    await page.keyboard.press('+');
    await page.keyboard.press('+');
    await expect(factor(lab)).toHaveText('×2');
    await settleRadius(lab, start * 2);
    const before = await hubCentre(lab);
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowUp');
    const after = await hubCentre(lab);
    expect(after.x - before.x).toBeCloseTo(PAN_STEP_PX, 3);
    expect(after.y - before.y).toBeCloseTo(PAN_STEP_PX, 3);
    await page.keyboard.press('-');
    await expect(factor(lab)).toHaveText('×1,4');
    await page.keyboard.press('0');
    await expect(factor(lab)).toHaveText('×1');
    await settleRadius(lab, start);

    await page.keyboard.press('Tab');
    await expect(radiusHandle(lab)).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(zoomButton(lab, 'Acercar')).toBeFocused();
  });

  test('la rueda con Ctrl acerca bajo el puntero y no deja que la página haga zoom', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const lab = await openLab(page);
    const box = (await canvas(lab).boundingBox())!;
    // A point of the drawing away from the centre: the left end of the ring's floor.
    const at = { x: box.width * 0.3, y: box.height * 0.4 };

    await page.mouse.move(box.x + at.x, box.y + at.y);
    await page.keyboard.down('Control');
    await page.mouse.wheel(0, -WHEEL_NOTCH_PX);
    await page.keyboard.up('Control');

    await expect(factor(lab)).toHaveText('×1,4');
    // The point under the pointer stays there: the hub moves away from it by √2 of its distance.
    const centre = { x: box.width / 2, y: box.height / 2 };
    const hubNow = await hubCentre(lab);
    expect(hubNow.x).toBeCloseTo(at.x + (centre.x - at.x) * ZOOM_STEP, 0);
    expect(hubNow.y).toBeCloseTo(at.y + (centre.y - at.y) * ZOOM_STEP, 0);
    expect(await page.evaluate(() => window.visualViewport?.scale)).toBe(1);
  });

  test('arrastrar el fondo desplaza el anillo; arrastrar el manejador del radio cambia r y no mueve la vista', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const lab = await openLab(page);
    for (let click = 0; click < 2; click += 1) await zoomButton(lab, 'Acercar').click();
    await expect(factor(lab)).toHaveText('×2');
    const box = (await canvas(lab).boundingBox())!;

    const background = { x: box.x + 40, y: box.y + box.height * 0.45 };
    const before = await hubCentre(lab);
    await dragMouse(page, background, { x: -30, y: 20 });
    await page.mouse.up();
    const panned = await hubCentre(lab);
    expect(Math.abs(panned.x - (before.x - 30))).toBeLessThan(PX_SLACK);
    expect(Math.abs(panned.y - (before.y + 20))).toBeLessThan(PX_SLACK);

    await lab.getByRole('switch', { name: 'Fijar 1 g' }).uncheck({ force: true });
    await radiusHandle(lab).scrollIntoViewIfNeeded();
    const knob = (await radiusHandle(lab).locator('[data-knob]').boundingBox())!;
    const grip = { x: knob.x + knob.width / 2, y: knob.y + knob.height / 2 };
    const value = Number(await radiusHandle(lab).getAttribute('aria-valuenow'));
    await dragMouse(page, grip, { x: -60, y: 0 });
    await page.mouse.up();

    expect(Number(await radiusHandle(lab).getAttribute('aria-valuenow'))).toBeLessThan(value);
    expect(await hubCentre(lab)).toEqual(panned);
    await expect(factor(lab)).toHaveText('×2');
  });

  test('con la reproducción en pausa se llega a la persona: la rueda con Ctrl sobre ella la deja bajo el puntero y la hace crecer', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const lab = await openLab(page);
    const area = (await canvas(lab).boundingBox())!;
    const feet = async () => {
      const person = (await lab.locator('[data-person]').boundingBox())!;
      return { x: person.x + person.width / 2, y: person.y + person.height, height: person.height };
    };
    const start = await feet();

    await page.mouse.move(start.x, start.y - start.height / 2);
    await page.keyboard.down('Control');
    for (let notch = 0; notch < MAX_ZOOM_CLICKS; notch += 1)
      await page.mouse.wheel(0, -WHEEL_NOTCH_PX);
    await page.keyboard.up('Control');

    await expect.poll(async () => (await feet()).height).toBeGreaterThan(start.height * 4);
    const close = await feet();
    // The point under the pointer (the middle of the person) is still under it.
    expect(Math.abs(close.x - start.x)).toBeLessThan(PX_SLACK * 2);
    expect(Math.abs(close.y - close.height / 2 - (start.y - start.height / 2))).toBeLessThan(
      PX_SLACK * 2 + close.height * 0.05,
    );
    expect(isInside((await lab.locator('[data-person] circle').boundingBox())!, area)).toBe(true);
  });

  test('elegir un preajuste o «Restablecer» vuelve a encuadrar el anillo; cambiar r conserva el zoom', async ({
    page,
  }) => {
    const lab = await openLab(page);
    await zoomButton(lab, 'Acercar').click();
    await zoomButton(lab, 'Acercar').click();
    await expect(factor(lab)).toHaveText('×2');

    await radiusHandle(lab).focus();
    await page.keyboard.press('ArrowLeft');
    await expect(factor(lab)).toHaveText('×2');

    await lab
      .getByRole('region', { name: 'Escenario' })
      .getByRole('button', { name: /^Toro de Stanford/ })
      .click();
    await expect(factor(lab)).toHaveText('×1');

    await zoomButton(lab, 'Acercar').click();
    await expect(factor(lab)).toHaveText('×1,4');
    await lab.getByRole('button', { name: 'Restablecer' }).click();
    await expect(factor(lab)).toHaveText('×1');
  });

  test('el servidor pinta el encuadre inicial, con los botones y la barra de escala', async ({
    browser,
  }) => {
    const plain = await browser.newContext({ javaScriptEnabled: false, viewport: DESKTOP });
    const server = await plain.newPage();
    await server.goto(PAGE);
    const lab = server.locator(LAB);

    await expect(factor(lab)).toHaveText('×1');
    await expect(lab.locator('[data-zoom-controls] button')).toHaveCount(3);
    await expect(lab.locator('div[data-scale-bar]')).toHaveCount(1);
    await expect(ring(lab)).toHaveCount(1);
    await plain.close();
  });

  test('«Cómo se usa» dice cómo acercar, que la persona se ve con la reproducción en pausa y qué mide la barra', async ({
    page,
  }) => {
    const lab = await openLab(page);
    const usage = lab.locator('details[data-lab-note="usage"]');

    await usage.locator('summary').click();

    await expect(usage).toContainText('El anillo se acerca con los botones');
    await expect(usage).toContainText(
      'Con la reproducción en pausa puedes acercarte a la persona con Ctrl y la rueda sobre ella',
    );
    await expect(usage).toContainText(
      'la persona es un símbolo: la barra de escala mide solo el radio',
    );
  });
});

/** The ring's distinct radii during one zoom step: one with movimiento reducido, many without. */
async function radiiDuringZoom(page: Page, lab: Locator): Promise<number[]> {
  const start = await ringRadius(lab);
  await ring(lab).evaluate((path) => {
    const seen: string[] = [];
    (window as unknown as { seen: string[] }).seen = seen;
    new MutationObserver(() => seen.push(path.getAttribute('d') ?? '')).observe(path, {
      attributes: true,
      attributeFilter: ['d'],
    });
  });
  await zoomButton(lab, 'Acercar').click();
  await settleRadius(lab, start * ZOOM_STEP);
  const seen = await page.evaluate(() => (window as unknown as { seen: string[] }).seen);
  return [...new Set(seen)].map((d) => Number(/Z M[-\d.]+ [-\d.]+ a([\d.]+)/u.exec(d)?.[1]));
}

test('un botón desliza el zoom; con movimiento reducido salta, sin pasos intermedios', async ({
  browser,
}) => {
  const smooth = await browser.newContext({ viewport: DESKTOP });
  const smoothPage = await smooth.newPage();
  const glided = await radiiDuringZoom(smoothPage, await openLab(smoothPage));
  await smooth.close();

  const reduced = await browser.newContext({ reducedMotion: 'reduce', viewport: DESKTOP });
  const reducedPage = await reduced.newPage();
  const jumped = await radiiDuringZoom(reducedPage, await openLab(reducedPage));
  await reduced.close();

  expect(glided.length).toBeGreaterThan(2);
  expect(jumped).toHaveLength(1);
});

for (const size of [DESKTOP, PHONE, NARROW]) {
  test.describe(`a ${size.width} px`, () => {
    test.use({ viewport: size });

    test('la franja de zoom va bajo la barra del radio y bajo el dibujo: botones de 40 px con glifo de 20, y la barra de escala y los botones no se tocan', async ({
      page,
    }) => {
      const lab = await openLab(page);
      const area = (await canvas(lab).boundingBox())!;
      const radiusBar = (await radiusHandle(lab).boundingBox())!;
      const stripBox = (await strip(lab).boundingBox())!;
      const controls = (await lab.locator('[data-zoom-controls]').boundingBox())!;
      const bar = (await lab.locator('div[data-scale-bar]').boundingBox())!;

      for (const name of ['Acercar', 'Alejar', 'Ajustar']) {
        const box = (await zoomButton(lab, name).boundingBox())!;
        expect(box.width).toBe(BUTTON_PX);
        expect(box.height).toBe(BUTTON_PX);
      }
      for (const glyph of await lab.locator('[data-zoom-controls] svg').all()) {
        expect((await glyph.boundingBox())!.width).toBe(GLYPH_PX);
      }
      // Under the ring's square and under the radius bar: nothing of the zoom covers the ring.
      expect(stripBox.y).toBeGreaterThanOrEqual(area.y + area.height);
      expect(stripBox.y).toBeGreaterThanOrEqual(radiusBar.y + radiusBar.height);
      expect(isApart(controls, bar)).toBe(true);
      expect(isInside(controls, stripBox)).toBe(true);
      expect(isInside(bar, stripBox)).toBe(true);
      // One row of 48 px when the lab is wide enough for both, two when it is not.
      const rows =
        (await lab.locator('[data-lab-canvas]').boundingBox())!.width < STACK_BELOW_PX ? 2 : 1;
      expect(stripBox.height).toBe(rows * STRIP_ROW_PX);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        size.width,
      );
    });

    test('el zoom no cambia el alto del laboratorio ni mueve lo de debajo', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const lab = await openLab(page);
      const height = async () => (await lab.boundingBox())!.height;
      const sceneBox = async () => (await scene(lab).boundingBox())!;
      const before = { lab: await height(), scene: await sceneBox() };

      for (let click = 0; click < MAX_ZOOM_CLICKS; click += 1)
        await zoomButton(lab, 'Acercar').click();
      await expect(factor(lab)).toHaveText('×8');

      expect(await height()).toBe(before.lab);
      expect(await sceneBox()).toEqual(before.scene);
    });

    test('a ningún zoom queda dibujo fuera de su lienzo: el svg del anillo recorta en su cuadro', async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const lab = await openLab(page);
      for (let click = 0; click < MAX_ZOOM_CLICKS; click += 1)
        await zoomButton(lab, 'Acercar').click();
      const area = (await canvas(lab).boundingBox())!;
      const radiusBar = (await radiusHandle(lab).boundingBox())!;

      // The zoomed ring does not paint over the radius bar below it.
      expect(await scene(lab).evaluate((svg) => getComputedStyle(svg).overflow)).toBe('hidden');
      expect(area.y + area.height).toBeLessThanOrEqual(radiusBar.y + 1);
    });
  });
}

for (const theme of ['light', 'dark'] as const) {
  test(`sin violaciones graves de accesibilidad con el zoom (${theme})`, async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    const lab = await openLab(page, theme);
    await zoomButton(lab, 'Acercar').click();
    await expect(factor(lab)).toHaveText('×1,4');

    const { violations } = await new AxeBuilder({ page }).include(LAB).analyze();

    expect(
      violations.filter((violation) => BLOCKING_IMPACTS.includes(violation.impact ?? '')),
    ).toEqual([]);
  });
}

/** Viewports whose canvas is ~280, ~320, ~440 (the widest square) and 422 px wide. */
const LABEL_VIEWPORTS = [
  { width: 320, height: 800 },
  { width: 360, height: 800 },
  { width: 600, height: 800 },
  DESKTOP,
] as const;

for (const size of LABEL_VIEWPORTS) {
  test(`a ${size.width} px, con r = 4 000 m y más de 1,5 g, ningún rótulo del anillo sale de su cuadrado a ningún ángulo`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    const lab = await openLab(page);
    await setRadius(lab, '4000');
    const timeline = lab.getByRole('slider', { name: 'Línea de tiempo' });

    for (const stop of TURN_STOPS) {
      await seekTimeline(timeline, stop);
      // The boxes of every text of the drawing but the note, against the svg's own box.
      const overflow = await scene(lab).evaluate((svg) => {
        const box = svg.getBoundingClientRect();
        return [...svg.querySelectorAll('text')]
          .filter((text) => !text.closest('[data-testid="habitat-note"]'))
          .map((text) => {
            const rect = text.getBoundingClientRect();
            return {
              label: text.getAttribute('data-notation') ?? text.textContent,
              out: Math.max(
                box.left - rect.left,
                rect.right - box.right,
                box.top - rect.top,
                rect.bottom - box.bottom,
              ),
            };
          });
      });

      expect(overflow.length).toBeGreaterThanOrEqual(4);
      for (const { label, out } of overflow) {
        expect(out, `«${label}» a ${stop}/1000`).toBeLessThanOrEqual(LABEL_SLACK_PX);
      }
    }
  });
}
