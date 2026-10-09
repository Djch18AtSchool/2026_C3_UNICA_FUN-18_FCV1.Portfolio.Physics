import { expect, test } from '@playwright/test';
import { PHASE_LABELS, TOPICS } from '../../src/consigna';

test('la portada lista los 13 temas con sus títulos exactos agrupados por avance', async ({
  page,
}) => {
  await page.goto('./');

  const links = page.getByTestId('topic-link');
  await expect(links).toHaveCount(13);
  await expect(links).toHaveText(TOPICS.map((topic) => topic.title));

  const groups = page.getByTestId('phase-group');
  await expect(groups).toHaveCount(3);
  await expect(groups.getByRole('heading', { level: 2 })).toHaveText([
    'Avance 1',
    'Avance 2',
    'Entrega Final',
  ]);
  await expect(groups.nth(0).getByTestId('topic-card')).toHaveCount(5);
  await expect(groups.nth(1).getByTestId('topic-card')).toHaveCount(4);
  await expect(groups.nth(2).getByTestId('topic-card')).toHaveCount(4);

  await expect(page.locator('main')).toContainText('de 13 temas publicados');
});

test('un tema próximo muestra el aviso de su avance', async ({ page }) => {
  await page.goto('./temas/frenado-regenerativo/');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Frenado regenerativo en un vehículo eléctrico',
  );
  await expect(page.locator('main')).toContainText('Tema 6 · Avance 2');
  const notice = page.getByTestId('upcoming-notice');
  await expect(notice).toBeVisible();
  await expect(notice).toContainText(`Se publica en el ${PHASE_LABELS[2]}`);
});

test('la barra lateral marca el tema activo y navega', async ({ page }) => {
  await page.goto('./temas/dron-reparto/');

  const nav = page.locator('nav[aria-label="Temas"]');
  const links = nav.getByTestId('topic-link');
  await expect(links).toHaveCount(13);

  const current = nav.locator('[aria-current="page"]');
  await expect(current).toHaveCount(1);
  await expect(current).toHaveAttribute('href', /\/temas\/dron-reparto\/$/);

  await nav.locator('a[href$="/temas/salto-personaje/"]').click();

  await expect(page).toHaveURL(/\/temas\/salto-personaje\/$/);
  await expect(nav.locator('[aria-current="page"]')).toHaveAttribute(
    'href',
    /\/temas\/salto-personaje\/$/,
  );
});

test('la página 404 muestra la navegación', async ({ page }) => {
  const response = await page.goto('./no-existe/');

  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Página no encontrada');
  const nav = page.locator('nav[aria-label="Temas"]');
  await expect(nav).toBeVisible();
  await expect(nav.getByTestId('topic-link')).toHaveCount(13);
});
