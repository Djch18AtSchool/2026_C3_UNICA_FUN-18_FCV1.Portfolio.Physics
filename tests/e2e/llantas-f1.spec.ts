import { expect, test } from '@playwright/test';

const PAGE = './temas/llantas-f1/';

const CHART_IDS = ['grip-chart-temperatura', 'grip-chart-carga'];

test.beforeEach(async ({ page }) => {
  await page.goto(PAGE);
  // Each chart is its own client:visible island; bring it into view and wait for React.
  for (const id of CHART_IDS) {
    await page.getByTestId(id).scrollIntoViewIfNeeded();
    await expect(page.getByTestId(id)).toHaveAttribute('data-ready', 'true');
  }
});

test('muestra las dos gráficas de agarre', async ({ page }) => {
  // Legend icons are .recharts-surface too; count only each chart's main surface.
  await expect(page.locator('.recharts-wrapper > .recharts-surface')).toHaveCount(2);
});

test('los ejes llevan unidades en °C y en N', async ({ page }) => {
  const labels = page.locator('.recharts-label');

  await expect(labels.filter({ hasText: 'Temperatura (°C)' })).toHaveCount(1);
  await expect(labels.filter({ hasText: 'Coeficiente de agarre μ (adimensional)' })).toHaveCount(1);
  await expect(labels.filter({ hasText: 'Carga vertical F_z (N)' })).toHaveCount(1);
  await expect(labels.filter({ hasText: 'Fuerza lateral máxima F_y (N)' })).toHaveCount(1);
});

test('la ventana de trabajo del C3 está rotulada', async ({ page }) => {
  await expect(
    page.locator('.recharts-label', { hasText: 'Ventana de trabajo C3 (2019)' }),
  ).toHaveCount(1);
});

test('el tooltip de la carga muestra el μ efectivo', async ({ page }) => {
  const chart = page.getByTestId('grip-chart-carga');
  const surface = chart.locator('.recharts-wrapper > .recharts-surface');
  const box = await surface.boundingBox();
  if (!box) throw new Error('la gráfica de carga no tiene tamaño');

  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.5);

  await expect(chart.getByTestId('tooltip-extras')).toContainText('μ efectivo');
});

test('las dos figuras son visualizaciones con fuente', async ({ page }) => {
  const figures = page.locator('figure[data-type="visualizacion"]');

  await expect(figures).toHaveCount(2);
  await expect(figures.nth(0).locator('.figure-source')).toContainText('Autosport');
  await expect(figures.nth(0).locator('.figure-source')).toContainText('ilustrativ');
  await expect(figures.nth(1).locator('.figure-source')).toContainText('Milliken');
  await expect(figures.nth(1).locator('.figure-source')).toContainText('ilustrativ');
});

test('la página cumple la estructura del tema', async ({ page }) => {
  await expect(page.locator('[data-testid="use-case"] [data-part]')).toHaveCount(4);
  expect(await page.locator('[data-testid="sources"] li').count()).toBeGreaterThanOrEqual(4);
  await expect(page.getByTestId('connections')).toBeVisible();
  await expect(page.locator('[data-testid="callout"][data-variant="clase"]')).toBeVisible();
  expect(await page.locator('.katex-display').count()).toBeGreaterThanOrEqual(3);
});
