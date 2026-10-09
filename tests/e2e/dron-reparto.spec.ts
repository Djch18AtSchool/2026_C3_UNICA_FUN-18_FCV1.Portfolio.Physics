import { expect, test } from '@playwright/test';
import { setRange } from './helpers';

const PAGE = './temas/dron-reparto/';

test.beforeEach(async ({ page }) => {
  await page.goto(PAGE);
  // The island hydrates with client:visible; bring it into view and wait for React.
  await page.getByTestId('drone-profiles').scrollIntoViewIfNeeded();
  await expect(page.getByTestId('drone-profiles')).toHaveAttribute('data-ready', 'true');
});

test('muestra el mapa de la ruta y las cuatro gráficas', async ({ page }) => {
  await expect(page.getByTestId('route-map')).toBeVisible();
  // Legend icons are .recharts-surface too; count only each chart's main surface.
  await expect(page.locator('.recharts-wrapper > .recharts-surface')).toHaveCount(4);
});

test('mover el tiempo desplaza el marcador del dron', async ({ page }) => {
  const marker = page.getByTestId('drone-marker');
  const before = await marker.getAttribute('cx');

  await setRange(page.getByLabel(/^Tiempo/), '30');

  await expect(page.getByLabel(/^Tiempo/)).toHaveValue('30');
  await expect(marker).not.toHaveAttribute('cx', before ?? '');
});

test('la figura es una visualización con fuente de ArduPilot', async ({ page }) => {
  const figure = page.locator('figure[data-type="visualizacion"]');

  await expect(figure).toBeVisible();
  await expect(figure.locator('.figure-source')).toContainText('ArduPilot');
});

test('la página cumple la estructura del tema', async ({ page }) => {
  await expect(page.locator('[data-testid="use-case"] [data-part]')).toHaveCount(4);
  expect(await page.locator('[data-testid="sources"] li').count()).toBeGreaterThanOrEqual(4);
  await expect(page.getByTestId('connections')).toBeVisible();
  expect(await page.locator('.katex-display').count()).toBeGreaterThanOrEqual(3);
});
