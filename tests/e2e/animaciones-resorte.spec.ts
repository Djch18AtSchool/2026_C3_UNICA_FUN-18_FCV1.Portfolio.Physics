import { expect, test } from '@playwright/test';
import { RESOURCE_LABELS, topicBySlug } from '../../src/consigna';
import { waitForIsland } from './helpers';

const SLUG = 'animaciones-resorte';
const PAGE = `./temas/${SLUG}/`;
const TOPIC = topicBySlug(SLUG);
const STEP_FIGURES = ['libre', 'amortiguado', 'regimenes', 'interrupcion'] as const;
const TABLE_IDS = ['animaciones-resorte-preajustes', 'animaciones-resorte-conversion'];
/** (10.1) to (10.11): two, three, three and three per step, as in the research's numbering. */
const DISPLAY_EQUATIONS = 11;
const PHONE = { width: 360, height: 800 };

test.describe('Tema 10, página', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
  });

  test('lleva el título de la consigna y cuatro pasos, cada uno con su "Por qué"', async ({
    page,
  }) => {
    expect(TOPIC).toBeDefined();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(TOPIC?.title ?? '');
    const steps = page.locator('section.step');

    await expect(steps).toHaveCount(4);
    for (const n of [1, 2, 3, 4]) {
      await expect(
        page.getByRole('heading', { level: 2, name: new RegExp(`^Paso ${n} · `) }),
      ).toBeVisible();
    }
    for (const step of await steps.all()) await expect(step.locator('.why')).toHaveCount(1);
  });

  test('las cuatro figuras de los pasos se numeran 10.1 a 10.4, una por paso', async ({ page }) => {
    const figures = page
      .getByTestId('figure')
      .filter({ has: page.locator('[data-testid^="spring-figure-"]') });
    await expect(figures).toHaveCount(STEP_FIGURES.length);

    // getComputedStyle does not resolve counters: check the prefix, the topic and each position.
    const numbers = await figures.evaluateAll((elements) =>
      elements.map((figure) => {
        const body = figure.closest<HTMLElement>('[data-topic-number]');
        // Its own caption: the plots inside (ChartFrame) hold figcaptions of their own.
        const prefix = getComputedStyle(
          figure.querySelector(':scope > figcaption') as Element,
          '::before',
        ).content;
        const position = [...(body?.querySelectorAll('.content-figure') ?? [])].indexOf(figure) + 1;
        const step = figure.closest('section.step')?.id;
        return { prefix, label: `Figura ${body?.dataset.topicNumber}.${position}`, step };
      }),
    );

    expect(numbers.map(({ label }) => label)).toEqual([
      'Figura 10.1',
      'Figura 10.2',
      'Figura 10.3',
      'Figura 10.4',
    ]);
    expect(numbers.map(({ step }) => step)).toEqual(['paso-1', 'paso-2', 'paso-3', 'paso-4']);
    for (const { prefix } of numbers) {
      expect(prefix).toBe('"Figura " counter(topic) "." counter(figure) " · "');
    }
    for (const variant of STEP_FIGURES) {
      await expect(page.getByTestId(`spring-figure-${variant}`)).toHaveCount(1);
    }
  });

  test('las dos tablas se numeran Tabla 10.1 (preajustes) y 10.2 (conversión)', async ({
    page,
  }) => {
    const tables = page.getByTestId('data-table');
    await expect(tables).toHaveCount(TABLE_IDS.length);

    const labels = await tables.evaluateAll((figures) =>
      figures.map((figure) => {
        const body = figure.closest<HTMLElement>('[data-topic-number]');
        const prefix = getComputedStyle(
          figure.querySelector('figcaption') as Element,
          '::before',
        ).content;
        const position = [...(body?.querySelectorAll('.content-table') ?? [])].indexOf(figure) + 1;
        return { id: figure.id, prefix, label: `Tabla ${body?.dataset.topicNumber}.${position}` };
      }),
    );

    expect(labels.map(({ id }) => id)).toEqual(TABLE_IDS);
    expect(labels.map(({ label }) => label)).toEqual(['Tabla 10.1', 'Tabla 10.2']);
    for (const { prefix } of labels) {
      expect(prefix).toBe('"Tabla " counter(topic) "." counter(table) " · "');
    }
    await expect(tables.first()).toContainText('157,91');
    await expect(tables.first()).toContainText('Ilustrativo');
    await expect(tables.last()).toContainText('(1.0, 157.9, 17.6)');
  });

  test('solo la figura del laboratorio lleva la insignia «Simulación interactiva»', async ({
    page,
  }) => {
    const badges = page
      .getByTestId('figure')
      .getByText(RESOURCE_LABELS.visualizacion, { exact: true })
      .or(page.getByTestId('figure').getByText(RESOURCE_LABELS.simulacion, { exact: true }));
    const labFigure = page.locator('section.step#paso-4 figure[data-type="simulacion"]', {
      has: page.getByTestId('spring-lab'),
    });

    await expect(badges).toHaveCount(1);
    await expect(page.locator('.content-figure .figure-head')).toHaveCount(1);
    await expect(labFigure.getByText(RESOURCE_LABELS.simulacion, { exact: true })).toHaveCount(1);
    await expect(labFigure.locator('.figure-source')).toContainText('Simulación que programé');
  });

  test('la página cumple la estructura del tema y numera once ecuaciones', async ({ page }) => {
    await expect(page.locator('[data-testid="use-case"] [data-part]')).toHaveCount(4);
    await expect(page.getByTestId('use-case')).toContainText(
      'return s.target - c.env * (c.A * c.sin + s.delta * c.cos)',
    );
    await expect(
      page.getByTestId('callout').and(page.locator('[data-variant="clase"]')),
    ).toContainText('No corresponde usar MRUA');
    expect(await page.locator('[data-testid="sources"] li').count()).toBeGreaterThanOrEqual(10);
    for (const slug of ['control-haptico', 'coeficiente-restitucion']) {
      await expect(page.getByTestId('connections')).toContainText(topicBySlug(slug)?.title ?? '-');
    }
    await expect(page.locator('.equation')).toHaveCount(DISPLAY_EQUATIONS);
  });

  test('cada figura hidrata y dibuja sus curvas', async ({ page }) => {
    for (const variant of STEP_FIGURES) {
      const testId = `[data-testid="spring-figure-${variant}"]`;
      await page.locator(testId).scrollIntoViewIfNeeded();
      await waitForIsland(page, testId);
      expect(await page.locator(`${testId} [data-series]`).count()).toBeGreaterThan(0);
    }
    const interruption = page.getByTestId('spring-figure-interrupcion');
    await expect(interruption.getByRole('img')).toHaveCount(2);
    await expect(interruption.locator('[data-mark="interrupcion"]')).toHaveCount(2);
  });
});

test.describe('Tema 10 en un teléfono', () => {
  test.use({ viewport: PHONE });

  test('a 360 px la página no desborda', async ({ page }) => {
    await page.goto(PAGE);
    for (const variant of STEP_FIGURES) {
      const testId = `[data-testid="spring-figure-${variant}"]`;
      await page.locator(testId).scrollIntoViewIfNeeded();
      await waitForIsland(page, testId);
    }

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
