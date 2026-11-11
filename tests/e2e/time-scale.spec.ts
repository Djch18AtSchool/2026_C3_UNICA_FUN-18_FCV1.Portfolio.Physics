/**
 * The shared time pieces (B4.1) on a test page outside the site (tests/e2e/fixtures/lab-time):
 * TransportBar's events (marks, «Evento anterior / siguiente», the announced event) and
 * TimeScaleBadge, in a LabShell with a 1 369 s run at ×20, 17 stops and one peak. The labs that
 * use them have their own specs.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { FIXTURE_BUILD_TIMEOUT_MS, startFixtureSite, type FixtureSite } from './fixtureSite';
import { cssLengthPxIn, waitForIsland } from './helpers';
import { expectSameHeightAfterHydration, HYDRATION_WIDTHS } from './hydrationStability';

const LAB = '[data-testid="time-fixture-lab"]';
const MARKER_COUNT = 18;
/** The timeline's integer positions (TIMELINE_STEPS) and the run, as the fixture sets them. */
const STEPS = 1000;
const DURATION = 1369;
const FIRST_STOP = 22;
const LAST_STOP = 1360;
/** A click on a native range lands its thumb within one position of the point. */
const POSITION_SLACK = 1;
/** Half the native thumb (16 px): the marks start below it. */
const THUMB_HALF_PX = 8;
/** The badge's status speaks a change once it holds this long (SCALE_ANNOUNCE_DELAY_MS), and more. */
const SCALE_SETTLED_MS = 1000;
const BLOCKING_IMPACTS = ['serious', 'critical'];
const VIEWPORTS = [
  { width: 1280, height: 800 },
  { width: 360, height: 800 },
] as const;

let site: FixtureSite;

test.describe.configure({ mode: 'serial' });
test.beforeAll(async () => {
  test.setTimeout(FIXTURE_BUILD_TIMEOUT_MS);
  site = await startFixtureSite('lab-time');
});
test.afterAll(async () => {
  await site?.stop();
});

async function openFixture(page: Page, theme: 'light' | 'dark' = 'light'): Promise<Locator> {
  await page.goto(`${site.url}?theme=${theme}`);
  await waitForIsland(page, LAB);
  return page.locator(LAB);
}

const timeline = (lab: Locator) => lab.getByRole('slider', { name: 'Línea de tiempo' });
const next = (lab: Locator) => lab.getByRole('button', { name: 'Evento siguiente' });
const previous = (lab: Locator) => lab.getByRole('button', { name: 'Evento anterior' });

for (const viewport of VIEWPORTS) {
  test.describe(`a ${viewport.width} px`, () => {
    test.use({ viewport });

    test('las marcas van bajo el pulgar, sin tocarlo, y un clic sobre una lleva el pulgar a ella', async ({
      page,
    }) => {
      const lab = await openFixture(page);
      const range = await timeline(lab).boundingBox();
      const marks = lab.locator('[data-transport-marks] [data-transport-mark]');

      await expect(marks).toHaveCount(MARKER_COUNT);
      await expect(lab.locator('[data-transport-marks]')).toHaveAttribute('aria-hidden', 'true');
      const boxes = await marks.evaluateAll((nodes) =>
        nodes.map((node) => node.getBoundingClientRect().toJSON() as DOMRect),
      );
      for (const box of boxes) {
        expect(box.x).toBeGreaterThanOrEqual(range!.x);
        expect(box.x + box.width).toBeLessThanOrEqual(range!.x + range!.width);
        // In the strip at the bottom of the range's box, below the thumb (centred, 16 px).
        expect(box.y).toBeGreaterThanOrEqual(range!.y + range!.height / 2 + THUMB_HALF_PX);
        expect(box.y + box.height).toBeLessThanOrEqual(range!.y + range!.height + 1);
        expect(box.height).toBeGreaterThan(0);
      }
      // A click right on a mark: the mark lets it through to the range, which paints over the
      // strip, and the thumb's centre lands where the mark is.
      const last = boxes.at(-1)!;
      const onMark = { x: last.x + last.width / 2, y: last.y + last.height / 2 };
      const hit = await page.evaluate(
        ({ x, y }) => document.elementFromPoint(x, y)?.getAttribute('aria-label') ?? null,
        onMark,
      );
      expect(hit).toBe('Línea de tiempo');
      await page.mouse.click(onMark.x, onMark.y);
      const value = Number(await timeline(lab).inputValue());
      expect(Math.abs(value - (LAST_STOP / DURATION) * STEPS)).toBeLessThanOrEqual(POSITION_SLACK);
    });

    test('«Evento siguiente» y «Evento anterior» saltan entre eventos y los anuncian', async ({
      page,
    }) => {
      const lab = await openFixture(page);
      await expect(previous(lab)).toHaveAttribute('aria-disabled', 'true');

      await next(lab).click();

      await expect(timeline(lab)).toHaveAttribute(
        'aria-valuetext',
        /^t = 22 s · Detención 1 de 17$/u,
      );
      await expect(lab.getByRole('status').filter({ hasText: 'Detención' })).toHaveText(
        `Detención 1 de 17 · t = ${FIRST_STOP} s`,
      );
      await expect(lab.locator('[data-transport-event]')).toHaveText('Detención 1 de 17');

      // 125 s, 190 s, then the peak at 240 s.
      for (let i = 0; i < 3; i += 1) await next(lab).click();
      await expect(timeline(lab)).toHaveAttribute('aria-valuetext', /Rapidez máxima$/u);
      await previous(lab).click();
      await expect(timeline(lab)).toHaveAttribute('aria-valuetext', /Detención 3 de 17$/u);
    });
  });
}

test('con el teclado: los botones de evento llegan al final, quedan inertes y no pierden el foco', async ({
  page,
}) => {
  const lab = await openFixture(page);
  await next(lab).focus();

  for (let i = 0; i < MARKER_COUNT + 2; i += 1) await page.keyboard.press('Enter');

  await expect(next(lab)).toBeFocused();
  await expect(next(lab)).toHaveAttribute('aria-disabled', 'true');
  await expect(timeline(lab)).toHaveAttribute('aria-valuetext', /Detención 17 de 17$/u);
  await page.keyboard.press('Shift+Tab');
  await expect(previous(lab)).toBeFocused();
  await page.keyboard.press('Space');
  await expect(timeline(lab)).toHaveAttribute('aria-valuetext', /Detención 16 de 17$/u);
});

test('la línea de tiempo conserva sus teclas nativas', async ({ page }) => {
  const lab = await openFixture(page);
  await timeline(lab).focus();

  await page.keyboard.press('End');

  await expect(timeline(lab)).toHaveValue(String(STEPS));
  await expect(next(lab)).toHaveAttribute('aria-disabled', 'true');
});

test('la reproducción con eventos reserva sus dos filas bajo un control del lienzo', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const lab = await openFixture(page);
  const stage = lab.locator('[data-lab-stage]');

  const room = await cssLengthPxIn(stage, 'var(--lab-transport-room)');
  const bar = await lab.locator('[data-lab-transport]').boundingBox();

  // At the 16 px root the room and the transport are whole pixels: they match exactly.
  expect(room).toBe(bar!.height);
});

test('el factor de tiempo va en la esquina del lienzo, sin tapar ni atrapar el puntero', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const lab = await openFixture(page);
  const badge = lab.locator('[data-lab-canvas] div[data-time-scale-badge]');
  const canvas = await lab.locator('[data-lab-canvas]').boundingBox();
  const box = await badge.boundingBox();

  await expect(badge).toHaveText(/^×20\s*cámara rápida$/u);
  await expect(badge).toHaveAttribute('aria-hidden', 'true');
  expect(box!.x + box!.width).toBeLessThanOrEqual(canvas!.x + canvas!.width);
  expect(box!.y).toBeGreaterThanOrEqual(canvas!.y);
  const hit = await page.evaluate(
    ({ x, y }) => document.elementFromPoint(x, y)?.closest('[data-time-scale-badge]') ?? null,
    { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 },
  );
  expect(hit).toBeNull();
  await expect(lab.locator('[data-time-scale-words]')).toHaveText(
    'Escala de tiempo: 20 veces la velocidad real, cámara rápida',
  );
  await expect(lab.locator('svg g[data-time-scale-badge]')).toHaveText(/×20/u);
});

test('con movimiento reducido el factor pasa, tras hidratar, al paso que se reproduce, sin anunciarlo', async ({
  browser,
}) => {
  // The server cannot know reduced motion: it sends the nominal ×20.
  const plain = await browser.newContext({ javaScriptEnabled: false, reducedMotion: 'reduce' });
  const server = await plain.newPage();
  await server.goto(site.url);
  await expect(server.locator('div[data-time-scale-badge]')).toHaveText(/^×20\s*cámara rápida$/u);
  await plain.close();

  const live = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await live.newPage();
  const lab = await openFixture(page);
  const status = lab.locator('[data-time-scale-badge] ~ [role="status"]');

  // Once mounted it reads the stepped pace: 60 steps of 250 ms play the 1 369 s run in 15 s, some
  // 91 times real time. The wait is for that one change after mount (README, «Escala de tiempo
  // y eventos»); the live region must stay silent through it.
  await expect(lab.locator('div[data-time-scale-badge]')).toHaveText(/^×91\s*cámara rápida$/u);
  await page.waitForTimeout(SCALE_SETTLED_MS);
  await expect(status).toBeEmpty();
  await live.close();
});

test('un cambio de velocidad sí se anuncia', async ({ page }) => {
  const lab = await openFixture(page);
  const status = lab.locator('[data-time-scale-badge] ~ [role="status"]');
  // Nothing on the page tells when the badge took its baseline (the first scale that holds after
  // mount): wait past it, as a reader would, so the change below is a change.
  await page.waitForTimeout(SCALE_SETTLED_MS);

  await lab.getByRole('button', { name: 'Velocidad 1×' }).click();
  await page.getByRole('dialog').getByRole('combobox', { name: 'Velocidad' }).selectOption('0.25');

  await expect(status).toHaveText('Escala de tiempo: 5 veces la velocidad real, cámara rápida');
});

test('con colores forzados las marcas siguen viéndose', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' });
  const lab = await openFixture(page);

  const inks = await lab.locator('[data-transport-mark]').evaluateAll((nodes) =>
    nodes.map((node) => {
      const style = getComputedStyle(node);
      return { width: parseFloat(style.borderLeftWidth), color: style.borderLeftColor };
    }),
  );
  const canvas = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);

  for (const ink of inks) {
    expect(ink.width).toBeGreaterThan(0);
    expect(ink.color).not.toBe(canvas);
  }
});

for (const width of [360, 320]) {
  test(`a ${width} px la fila de eventos cabe y no cambia de alto al avanzar t`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    const lab = await openFixture(page);
    const transport = lab.locator('[data-lab-transport]');
    const height = async () => (await transport.boundingBox())!.height;
    const atStart = await height();

    // At an event (its name on two lines), then at the end (the widest readout).
    for (let i = 0; i < 4; i += 1) await next(lab).click();
    await expect(lab.locator('[data-transport-event]')).toHaveText('Rapidez máxima');
    expect(await height()).toBe(atStart);
    await timeline(lab).focus();
    await page.keyboard.press('End');
    await expect(timeline(lab)).toHaveAttribute('aria-valuetext', /^t = 1\u202F369\u202Fs/u);
    expect(await height()).toBe(atStart);

    const overflow = await transport.evaluate((node) => {
      const box = node.getBoundingClientRect();
      return [...node.querySelectorAll('button, [data-transport-event], span.font-mono')]
        .map((child) => child.getBoundingClientRect())
        .filter((child) => child.left < box.left - 1 || child.right > box.right + 1).length;
    });
    expect(overflow).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
  });
}

for (const width of HYDRATION_WIDTHS) {
  test(`a ${width} px el servidor y la página hidratada miden lo mismo`, async ({ browser }) => {
    await expectSameHeightAfterHydration(browser, site.url, LAB, width);
  });
}

for (const theme of ['light', 'dark'] as const) {
  test(`sin violaciones graves de accesibilidad (${theme})`, async ({ page }) => {
    await openFixture(page, theme);
    await page.locator(LAB).getByRole('button', { name: 'Evento siguiente' }).click();

    const { violations } = await new AxeBuilder({ page }).include(LAB).analyze();

    expect(
      violations
        .filter((violation) => BLOCKING_IMPACTS.includes(violation.impact ?? ''))
        .map(({ id, nodes }) => ({ id, targets: nodes.map((node) => node.target.join(' ')) })),
    ).toEqual([]);
  });
}
