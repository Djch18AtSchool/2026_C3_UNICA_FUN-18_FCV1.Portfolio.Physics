import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  PARAMETER_ROWS,
  type CoolingParameterId,
} from '../../src/lib/tables/topics/enfriamiento-liquido';
import { hydrateAllIslands, waitForIsland } from './helpers';

const PAGE = './temas/enfriamiento-liquido/';
const TITLE = 'Enfriamiento líquido de un centro de datos: continuidad, caudal y Bernoulli';
const PROFILE = '[data-testid="circuit-profile-figure"]';
const VELOCITY_AREA = '[data-testid="velocity-area-figure"]';
const LOSSES = '[data-testid="loss-breakdown-figure"]';
const BRANCH = '[data-testid="branch-flow-figure"]';
const PHONE = { width: 360, height: 800 };
const THEMES = ['light', 'dark'] as const;
const BLOCKING_IMPACTS = ['serious', 'critical'];
const STEP_COUNT = 4;
const EQUATION_COUNT = 4;
const FIGURES = [VELOCITY_AREA, PROFILE, LOSSES, BRANCH];
const TABLE_IDS = [
  'enfriamiento-liquido-fluido',
  'enfriamiento-liquido-geometria',
  'enfriamiento-liquido-conectores',
  'enfriamiento-liquido-desglose',
];
const MIN_SOURCES = 12;
/** Who the source lines of the figures and tables credit, together. */
const CREDITED = ['OCP', 'LBNL', 'Schneider', 'GF', 'NIST', 'Melinder', 'Shahi et al.'];

/** Text as the reader sees it: every kind of space as one plain space. */
const plain = (text: string) => text.replace(/\s+/g, ' ').trim();
const exactly = (text: string) => new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);

async function open(page: Page, selector: string): Promise<Locator> {
  await page.locator(selector).scrollIntoViewIfNeeded();
  await waitForIsland(page, selector);
  return page.locator(selector);
}

/** «Figura 13.k» / «Tabla 13.k» from the topic counter and the element's position (CSS counters). */
async function numbering(element: Locator, kind: '.content-figure' | '.content-table') {
  return element.evaluate((node, selector) => {
    const body = node.closest<HTMLElement>('[data-topic-number]');
    const position = [...(body?.querySelectorAll(selector) ?? [])].indexOf(node) + 1;
    return `${body?.dataset.topicNumber}.${position}`;
  }, kind);
}

test.describe('página', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
  });

  test('lleva el título del tema', async ({ page }) => {
    await expect(page).toHaveTitle(new RegExp(`^Tema 13: ${TITLE}`));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(TITLE);
  });

  test('tiene cuatro pasos, cada uno con su "Por qué", y cuatro ecuaciones numeradas', async ({
    page,
  }) => {
    await expect(page.locator('section.step')).toHaveCount(STEP_COUNT);
    for (let n = 1; n <= STEP_COUNT; n += 1) {
      const step = page.locator(`section.step#paso-${n}`);
      await expect(step).toContainText(`Paso ${n}`);
      await expect(step.locator('.why')).toHaveCount(1);
      // Its own Figure: a DataTable is a <figure> too, and does not count (ruling R16).
      expect(await step.locator('figure[data-testid="figure"]').count()).toBeGreaterThanOrEqual(1);
    }
    await expect(page.locator('.equation')).toHaveCount(EQUATION_COUNT);
  });

  test('las cuatro figuras se numeran 13.1 a 13.4 y solo el perfil lleva la insignia', async ({
    page,
  }) => {
    for (const [index, selector] of FIGURES.entries()) {
      const figure = page.locator(`figure[data-testid="figure"]:has(${selector})`);
      expect(await numbering(figure, '.content-figure')).toBe(`13.${index + 1}`);
    }
    const badged = page.locator('figure[data-testid="figure"]:has(.figure-head)');
    await expect(badged).toHaveCount(1);
    await expect(badged).toHaveAttribute('data-type', 'visualizacion');
    await expect(badged.locator(PROFILE)).toBeAttached();
    await expect(badged.locator('.figure-head')).toHaveText('Visualización de datos');
  });

  test('las cuatro tablas se numeran 13.1 a 13.4, en orden', async ({ page }) => {
    const tables = page.getByTestId('data-table');

    await expect(tables).toHaveCount(TABLE_IDS.length);
    for (const [index, id] of TABLE_IDS.entries()) {
      await expect(tables.nth(index)).toHaveAttribute('id', id);
      expect(await numbering(tables.nth(index), '.content-table')).toBe(`13.${index + 1}`);
    }
  });

  test('las tablas declaran cada parámetro con el que se calcula el perfil, con su valor', async ({
    page,
  }) => {
    const ids = plain(
      (await page.locator(`${PROFILE} [data-parameters]`).getAttribute('data-parameters')) ?? '',
    ).split(' ');

    expect(ids.length).toBeGreaterThan(25);
    for (const id of ids) {
      const row = PARAMETER_ROWS[id as CoolingParameterId];
      expect(row, `${id} no está en las tablas 13.1 a 13.3`).toBeDefined();
      const printed = page
        .locator(`#${row.table} tbody tr`)
        .filter({ has: page.locator('th', { hasText: exactly(row.parametro) }) });
      await expect(printed, id).toHaveCount(1);
      const cells = await printed.locator('th, td').allTextContents();
      expect(plain(cells[2]), id).toBe(plain(row.valor));
      expect(['Producto', 'Supuesto', 'Cálculo propio', 'Constante'], id).toContain(
        plain(cells[4]),
      );
    }
  });

  test('las líneas de fuente citan OCP, LBNL, Schneider y GF, NIST y Melinder, y Shahi et al.', async ({
    page,
  }) => {
    const sources = plain((await page.locator('.figure-source').allTextContents()).join(' '));

    for (const name of CREDITED) expect(sources, name).toContain(name);
  });

  test('cumple la estructura del tema', async ({ page }) => {
    await expect(page.locator('[data-testid="use-case"] [data-part]')).toHaveCount(4);
    await expect(page.locator('[data-testid="callout"][data-variant="clase"]')).toHaveCount(1);
    await expect(page.getByTestId('connections')).toBeVisible();
    expect(await page.locator('[data-testid="sources"] li').count()).toBeGreaterThanOrEqual(
      MIN_SOURCES,
    );
  });
});

test.describe('el perfil del recorrido', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
  });

  test('las tres vistas cambian el eje y la franja; la del servidor nombra el conector y la placa', async ({
    page,
  }) => {
    const profile = await open(page, PROFILE);
    const strip = profile.locator('[data-section-strip]');
    const note = profile.getByTestId('circuit-profile-note');

    await expect(note).toContainText('400,0 a 220,1 kPa');
    await expect(strip).toContainText('Rack');

    await profile.getByRole('button', { name: 'Servidor', exact: true }).click();

    await expect(profile.getByRole('button', { name: 'Servidor', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(strip).toContainText('Placa fría');
    await expect(strip).toContainText('UQD04');
    await expect(note).toContainText('15,1 kPa');
  });

  test('en un teléfono la franja numera sus tramos y la clave los nombra, sin desbordar la página', async ({
    page,
  }) => {
    await page.setViewportSize(PHONE);
    const profile = await open(page, PROFILE);

    await profile.getByRole('button', { name: 'Rack', exact: true }).click();

    const key = profile.getByRole('list', { name: 'Tramos de la franja' });
    await expect(key.getByRole('listitem')).toHaveCount(5);
    await expect(key).toContainText('Manguera de rack');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('el dibujo mide su ancho sin mover la página al hidratarse', async ({ page }) => {
    await page.setViewportSize(PHONE);
    const svg = page.locator(`${PROFILE} svg[role="img"]`);
    await svg.scrollIntoViewIfNeeded();
    const before = (await svg.boundingBox())?.height ?? 0;

    await waitForIsland(page, PROFILE);

    const after = (await svg.boundingBox())?.height ?? 0;
    expect(Math.abs(after - before)).toBeLessThanOrEqual(1);
  });
});

for (const theme of THEMES) {
  test.describe(`tema ${theme === 'light' ? 'claro' : 'oscuro'}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((value) => window.localStorage.setItem('theme', value), theme);
    });

    test('axe no encuentra violaciones serias ni críticas en las figuras', async ({ page }) => {
      await page.goto(PAGE);
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await hydrateAllIslands(page);

      const builder = FIGURES.reduce(
        (axe, selector) => axe.include(selector),
        new AxeBuilder({ page }),
      );
      const { violations } = await builder.analyze();
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
