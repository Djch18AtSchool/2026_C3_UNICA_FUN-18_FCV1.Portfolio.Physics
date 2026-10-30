import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { setRange, waitForIsland } from './helpers';

const PAGE = './temas/frenado-regenerativo/';
const TITLE = 'Frenado regenerativo en un vehículo eléctrico';
const LAB = '[data-testid="regen-lab"]';
const CHART = '[data-testid="energy-balance-chart"]';
const PHONE = { width: 360, height: 800 };
const THEMES = ['light', 'dark'] as const;
const BLOCKING_IMPACTS = ['serious', 'critical'];
const STEP_COUNT = 4;
const TABLE_IDS = ['frenado-regenerativo-vehiculo', 'frenado-regenerativo-ciclos'] as const;
/** Timeline position (of 1000) to start from, so the cycle ends within a second at 1×. */
const NEAR_END = '995';
/** Longest the last 0,5 % of the UDDS (≈ 0,34 s at 1×) may take to reach the end. */
const PLAYBACK_TIMEOUT_MS = 3000;
const STILL_AT_END_MS = 500;
const SCROLL_STEP_PX = 600;
const BATTERY = 'Energía a la batería E_batería';
const BLENDED = 'Frenando con el motor y con fricción';

/** The value text of a LabShell readout row. */
async function readoutText(page: Page, label: string): Promise<string> {
  const row = page.locator(LAB).locator('div', { has: page.getByText(label, { exact: true }) });
  return ((await row.last().locator('span').last().textContent()) ?? '').trim();
}

/** Islands hydrate with client:visible: walk the page so every one renders. */
async function hydrateAllIslands(page: Page): Promise<void> {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y <= height; y += SCROLL_STEP_PX) {
    await page.mouse.wheel(0, SCROLL_STEP_PX);
  }
  await page.waitForLoadState('networkidle');
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  await page.evaluate(() => window.scrollTo(0, 0));
}

async function openLab(page: Page): Promise<void> {
  await page.locator(LAB).scrollIntoViewIfNeeded();
  await waitForIsland(page, LAB);
}

test.describe('página', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
  });

  test('lleva el título del tema', async ({ page }) => {
    await expect(page).toHaveTitle(new RegExp(`^Tema 6: ${TITLE}`));
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

  test('solo la gráfica de energías lleva insignia, "Visualización de datos", con EPA y FASTSim en su fuente', async ({
    page,
  }) => {
    const badged = page.locator('figure[data-testid="figure"]:has(.figure-head)');

    await expect(badged).toHaveCount(1);
    await expect(badged).toHaveAttribute('data-type', 'visualizacion');
    await expect(badged.locator(CHART)).toBeAttached();
    await expect(badged.locator('.figure-head')).toHaveText('Visualización de datos');
    const source = badged.locator('.figure-source');
    await expect(source).toContainText('EPA');
    await expect(source).toContainText('FASTSim');
  });

  test('la gráfica de energías termina el UDDS con el 40,4 % de la tracción en la batería', async ({
    page,
  }) => {
    const chart = page.locator(CHART);
    await chart.scrollIntoViewIfNeeded();
    await waitForIsland(page, CHART);

    await expect(chart.getByTestId('energy-balance-readout')).toContainText('40,4');
  });

  test('las dos tablas se numeran 6.1 y 6.2, en orden', async ({ page }) => {
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
      expect(label).toBe(`Tabla 6.${index + 1}`);
    }
  });

  test('cumple la estructura del tema', async ({ page }) => {
    await expect(page.locator('[data-testid="use-case"] [data-part]')).toHaveCount(4);
    await expect(page.locator('[data-testid="callout"][data-variant="clase"]')).toHaveCount(1);
    await expect(page.getByTestId('connections')).toBeVisible();
    expect(await page.locator('[data-testid="sources"] li').count()).toBeGreaterThanOrEqual(7);
  });
});

test.describe('laboratorio', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
    await openLab(page);
  });

  test('el ciclo termina, vuelve a "Reproducir" y no repite', async ({ page }) => {
    const lab = page.locator(LAB);
    // Exact: the energy plot's cursor is "Tiempo", the transport's slider "Línea de tiempo".
    const timeline = lab.getByRole('slider', { name: 'Línea de tiempo', exact: true });
    await setRange(timeline, NEAR_END);

    await lab.getByRole('button', { name: 'Reproducir', exact: true }).click();
    await expect(timeline).toHaveValue('1000', { timeout: PLAYBACK_TIMEOUT_MS });

    await expect(lab).toHaveAttribute('data-playing', 'false');
    await expect(lab.getByRole('button', { name: 'Reproducir', exact: true })).toBeVisible();
    // The UDDS lasts 1369 s, a run of minutes: the transport reads its end as 22,82 min.
    await expect(timeline).toHaveAttribute('aria-valuetext', /^t = 22,82\smin$/);
    await page.waitForTimeout(STILL_AT_END_MS);
    await expect(timeline).toHaveValue('1000');
    await expect(lab).toHaveAttribute('data-playing', 'false');
  });

  test('cambiar η cambia la energía que llega a la batería', async ({ page }) => {
    const before = await readoutText(page, BATTERY);

    await setRange(
      page.locator(LAB).getByRole('slider', { name: 'Rendimiento rueda → batería η', exact: true }),
      '0.5',
    );

    await expect.poll(() => readoutText(page, BATTERY)).not.toBe(before);
  });

  test('la nota dice a qué velocidad va la reproducción y qué deja fuera el modelo', async ({
    page,
  }) => {
    const footnote = page.locator(LAB).getByTestId('lab-footnote');

    await expect(footnote).toContainText('20 veces');
    for (const left of ['pendiente', 'viento', 'temperatura', 'carga']) {
      await expect(footnote).toContainText(left);
    }
  });
});

test.describe('a 360 px', () => {
  test.use({ viewport: PHONE });

  test('la página no desborda en horizontal, tampoco con el laboratorio en régimen mixto', async ({
    page,
  }) => {
    await page.goto(PAGE);
    await page.evaluate(() => document.fonts.ready);
    await hydrateAllIslands(page);
    await openLab(page);
    const lab = page.locator(LAB);

    await lab
      .getByRole('group', { name: 'Valores de referencia' })
      .getByRole('button', { name: /^Batería fría o llena/ })
      .click();

    const regime = lab.getByTestId('regen-scene').getByText(BLENDED, { exact: true });
    await expect(regime).toBeVisible();
    const box = await regime.boundingBox();
    expect(box).not.toBeNull();
    expect((box?.x ?? 0) + (box?.width ?? Infinity)).toBeLessThanOrEqual(PHONE.width);
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
