import { expect, test } from '@playwright/test';

const PAGE = './temas/control-haptico/';
const VIDEO_URL = './media/tema-05-dualsense.mp4';
const HTTP_NOT_FOUND = 404;
const HTTP_OK = 200;

test.beforeEach(async ({ page }) => {
  await page.goto(PAGE);
});

test('el video se reproduce o, si aún no está publicado, muestra el respaldo', async ({
  page,
  request,
}) => {
  const response = await request.get(VIDEO_URL);
  const player = page.getByTestId('haptic-video-player');

  if (response.status() === HTTP_NOT_FOUND) {
    await expect(page.locator('[data-state="error"]')).toBeVisible();
    const fallback = page.getByTestId('haptic-video-fallback');
    await expect(fallback).toBeVisible();
    await expect(fallback.getByTestId('haptic-video-transcript')).toBeVisible();
    // No link to the URL that just failed, and nothing to seek.
    await expect(player.getByRole('link', { name: /Descargar el video/ })).toHaveCount(0);
    await expect(page.getByTestId('haptic-video-markers').getByRole('button')).toHaveCount(0);
  } else {
    expect(response.status()).toBe(HTTP_OK);
    await expect(player).toHaveAttribute('data-state', 'ok');
    await expect(player.getByTestId('haptic-video')).toHaveAttribute('controls', '');
    await expect(page.getByTestId('haptic-video-fallback')).toHaveCount(0);
    await expect(player.getByRole('link', { name: 'Descargar el video (MP4)' })).toBeVisible();
    await expect(page.getByTestId('haptic-video-markers').getByRole('button')).toHaveCount(3);
  }
});

test('hay tres marcas de tiempo con su análisis escrito', async ({ page }) => {
  const markers = page.getByTestId('haptic-video-markers');

  await expect(markers.getByTestId('marker-label')).toHaveCount(3);
  await expect(markers.getByTestId('marker-label').nth(0)).toHaveText(/^0:05 · /);
  await expect(markers.getByTestId('marker-analysis')).toHaveCount(3);
  for (const analysis of await markers.getByTestId('marker-analysis').all()) {
    await expect(analysis).toBeVisible();
  }
});

test('el recurso es multimedia con fuente', async ({ page }) => {
  const figure = page.locator('figure[data-type="multimedia"]');

  await expect(figure).toHaveCount(1);
  await expect(figure.getByTestId('haptic-video-player')).toBeVisible();
  await expect(figure.locator('.figure-source')).toContainText('Astro');
});

test('la curva del resorte responde a k y muestra la energía', async ({ page }) => {
  const chart = page.getByTestId('spring-force-curve');
  await chart.scrollIntoViewIfNeeded();
  await expect(chart).toHaveAttribute('data-ready', 'true');

  await expect(chart.locator('.recharts-wrapper > .recharts-surface')).toHaveCount(1);
  const labels = chart.locator('.recharts-label');
  await expect(labels.filter({ hasText: 'Desplazamiento x (mm)' })).toHaveCount(1);
  await expect(labels.filter({ hasText: 'Fuerza F (N)' })).toHaveCount(1);
  await expect(chart.getByText('Hooke ideal', { exact: true })).toBeVisible();
  await expect(chart.getByText('Gatillo adaptativo', { exact: true })).toBeVisible();

  const energy = chart.getByTestId('spring-readouts');
  await expect(energy).toContainText('12,8');
  await chart.getByLabel(/^Rigidez k/).fill('200');
  await expect(energy).toContainText('6,4');

  const figure = page.locator('figure[data-type="simulacion"]');
  await expect(figure.locator('.figure-source')).toContainText('supuesto de 8 mm');
});

test('la página cumple la estructura del tema', async ({ page }) => {
  await expect(page.locator('[data-testid="use-case"] [data-part]')).toHaveCount(4);
  expect(await page.locator('[data-testid="sources"] li').count()).toBeGreaterThanOrEqual(5);
  await expect(page.getByTestId('connections')).toBeVisible();
  await expect(page.locator('[data-testid="callout"][data-variant="clase"]')).toBeVisible();
  expect(await page.locator('.katex-display').count()).toBeGreaterThanOrEqual(3);
});
