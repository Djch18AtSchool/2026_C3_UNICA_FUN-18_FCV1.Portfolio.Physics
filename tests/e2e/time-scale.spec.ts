/**
 * The shared time pieces (B4.1) on a test page outside the site (tests/e2e/fixtures/lab-time):
 * TransportBar's events (marks, «Evento anterior / siguiente», the announced event) and
 * TimeScaleBadge, in a LabShell with a 1 369 s run at ×20, 17 stops and one peak. The labs that
 * use them have their own specs.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { startFixtureSite, type FixtureSite } from './fixtureSite';
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
/** Rounding of rem at the site's root size against the measured transport. */
const ROOM_SLACK_PX = 1;
const BLOCKING_IMPACTS = ['serious', 'critical'];
const VIEWPORTS = [
  { width: 1280, height: 800 },
  { width: 360, height: 800 },
] as const;

let site: FixtureSite;

test.describe.configure({ mode: 'serial' });
test.beforeAll(async () => {
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

    test('las marcas de evento van bajo la línea de tiempo, sin tocar el pulgar, e inertes', async ({
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
        // Under the range (and so under its thumb), in the 8 px strip below it.
        expect(box.y).toBeGreaterThanOrEqual(range!.y + range!.height);
        expect(box.height).toBeGreaterThan(0);
      }
      // A click on a mark reaches the range (the marks are not hit) and lands the thumb's centre
      // on the mark: the mark sits where the thumb stands at its time.
      const lastBox = boxes.at(-1)!;
      const centre = { x: lastBox.x + lastBox.width / 2, y: range!.y + range!.height / 2 };
      await page.mouse.click(centre.x, centre.y);
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

  expect(Math.abs(room - bar!.height)).toBeLessThanOrEqual(ROOM_SLACK_PX);
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
  await expect(lab.getByRole('status').filter({ hasText: 'Escala de tiempo' })).toHaveText(
    'Escala de tiempo: 20 veces la velocidad real, cámara rápida',
  );
  await expect(lab.locator('svg g[data-time-scale-badge]')).toHaveText(/×20/u);
});

test('con movimiento reducido el factor dice el paso que se reproduce', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const lab = await openFixture(page);

  // 60 pasos de 250 ms: el ciclo de 1 369 s en 15 s, unas 91 veces la velocidad real.
  await expect(lab.locator('div[data-time-scale-badge]')).toHaveText(/^×91\s*cámara rápida$/u);
});

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
