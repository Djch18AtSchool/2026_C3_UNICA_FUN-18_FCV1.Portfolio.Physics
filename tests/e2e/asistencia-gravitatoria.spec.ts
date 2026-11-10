import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { hydrateAllIslands, readoutText as readReadout, waitForIsland } from './helpers';

const PAGE = './temas/asistencia-gravitatoria/';
const TITLE = 'Asistencia gravitatoria: cómo la Voyager ganó velocidad sin gastar combustible';
const LAB = '[data-testid="flyby-lab"]';
const CHART = '[data-testid="voyager-speed-chart"]';
const PHONE = { width: 360, height: 800 };
const THEMES = ['light', 'dark'] as const;
const BLOCKING_IMPACTS = ['serious', 'critical'];
const STEP_COUNT = 4;
const TABLE_IDS = ['asistencia-gravitatoria-constantes', 'asistencia-gravitatoria-encuentros'];
const MIN_SOURCES = 8;
const DELTA = 'Ángulo de giro δ';
/** The chart's source sentence (VOYAGER_CHART_SOURCE): printed once, by the Figure, never twice. */
const SOURCE_SENTENCE = 'trayectoria de diseño reconstruida hasta el 29 de agosto de 1989';

/** The value text of the readout row of the lab labelled exactly `label` (helpers.ts). */
const readoutText = (page: Page, label: string) => readReadout(page, LAB, label);

async function open(page: Page, selector: string): Promise<void> {
  await page.locator(selector).scrollIntoViewIfNeeded();
  await waitForIsland(page, selector);
}

test.describe('página', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
  });

  test('lleva el título del tema', async ({ page }) => {
    await expect(page).toHaveTitle(new RegExp(`^Tema 9: ${TITLE}`));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(TITLE);
  });

  test('tiene cuatro pasos, cada uno con su "Por qué" y su figura', async ({ page }) => {
    const steps = page.locator('section.step');

    await expect(steps).toHaveCount(STEP_COUNT);
    for (let n = 1; n <= STEP_COUNT; n += 1) {
      const step = page.locator(`section.step#paso-${n}`);
      await expect(step).toContainText(`Paso ${n}`);
      await expect(step.locator('.why')).toHaveCount(1);
      expect(await step.locator('figure').count()).toBeGreaterThanOrEqual(1);
    }
    expect(await page.locator('.katex-display').count()).toBeGreaterThanOrEqual(STEP_COUNT);
  });

  test('solo la gráfica de la Voyager lleva insignia, "Visualización de datos", con su fuente una sola vez', async ({
    page,
  }) => {
    const badged = page.locator('figure[data-testid="figure"]:has(.figure-head)');

    await expect(badged).toHaveCount(1);
    await expect(badged).toHaveAttribute('data-type', 'visualizacion');
    await expect(badged.locator(CHART)).toBeAttached();
    await expect(badged.locator('.figure-head')).toHaveText('Visualización de datos');
    const source = badged.locator('.figure-source');
    await expect(source).toContainText('NASA/JPL Horizons');
    await expect(source).toContainText('trayectoria de diseño');
    // The chart's own footnote carries only the Δ|v| method, so the sentence is not repeated.
    const occurrences = await page.evaluate(
      (sentence) => (document.body.textContent ?? '').split(sentence).length - 1,
      SOURCE_SENTENCE,
    );
    expect(occurrences).toBe(1);
  });

  test('las dos tablas se numeran 9.1 y 9.2, en orden', async ({ page }) => {
    const tables = page.getByTestId('data-table');

    await expect(tables).toHaveCount(TABLE_IDS.length);
    for (const [index, id] of TABLE_IDS.entries()) {
      const table = tables.nth(index);
      await expect(table).toHaveAttribute('id', id);
      // getComputedStyle does not resolve counters: check the topic number and the position.
      const label = await table.evaluate((figure) => {
        const body = figure.closest<HTMLElement>('[data-topic-number]');
        const position = [...(body?.querySelectorAll('.content-table') ?? [])].indexOf(figure) + 1;
        return `Tabla ${body?.dataset.topicNumber}.${position}`;
      });
      expect(label).toBe(`Tabla 9.${index + 1}`);
    }
  });

  test('cumple la estructura del tema', async ({ page }) => {
    await expect(page.locator('[data-testid="use-case"] [data-part]')).toHaveCount(4);
    await expect(page.locator('[data-testid="callout"][data-variant="clase"]')).toHaveCount(1);
    await expect(page.getByTestId('connections')).toBeVisible();
    expect(await page.locator('[data-testid="sources"] li').count()).toBeGreaterThanOrEqual(
      MIN_SOURCES,
    );
  });

  test('el cursor de la gráfica se mueve con el teclado y cambia la lectura', async ({ page }) => {
    await open(page, CHART);
    const chart = page.locator(CHART);
    const cursor = chart.getByRole('slider', { name: 'Fecha', exact: true });
    const readout = chart.getByTestId('voyager-readout');
    const before = await readout.textContent();
    const dateBefore = await cursor.getAttribute('aria-valuetext');

    await cursor.focus();
    await cursor.press('PageUp');

    await expect(cursor).not.toHaveAttribute('aria-valuetext', dateBefore ?? '');
    await expect(readout).not.toHaveText(before ?? '');
  });
});

test.describe('laboratorio', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
    await open(page, LAB);
  });

  test('un preajuste cambia el ángulo de giro δ', async ({ page }) => {
    const before = await readoutText(page, DELTA);

    await page
      .locator(LAB)
      .getByRole('group', { name: 'Valores de referencia' })
      .getByRole('button', { name: /^V2 · Saturno/ })
      .click();

    await expect.poll(() => readoutText(page, DELTA)).not.toBe(before);
  });

  test('la nota dice cuánto dura cada paso y qué deja fuera el modelo', async ({ page }) => {
    const footnote = page.locator(LAB).getByTestId('lab-footnote');

    await expect(footnote).toContainText('12 s');
    for (const left of ['plano', 'eclíptica', 'lunas', 'cónicas empalmadas']) {
      await expect(footnote).toContainText(left);
    }
  });
});

test.describe('a 360 px', () => {
  test.use({ viewport: PHONE });

  test('la página no desborda en horizontal con todas las islas dibujadas', async ({ page }) => {
    await page.goto(PAGE);
    await page.evaluate(() => document.fonts.ready);
    await hydrateAllIslands(page);

    const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(documentWidth).toBeLessThanOrEqual(PHONE.width);
  });
});

for (const theme of THEMES) {
  test.describe(`tema ${theme === 'light' ? 'claro' : 'oscuro'}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((value) => window.localStorage.setItem('theme', value), theme);
    });

    test('axe no encuentra violaciones serias ni críticas', async ({ page }) => {
      await page.goto(PAGE);
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await hydrateAllIslands(page);

      const { violations } = await new AxeBuilder({ page }).analyze();
      const blocking = violations
        .filter((violation) => BLOCKING_IMPACTS.includes(violation.impact ?? ''))
        .map(({ id, impact, nodes }) => ({
          id,
          impact,
          targets: nodes.map((node) => node.target.join(' ')),
        }));

      expect(blocking).toEqual([]);
    });
  });
}
