import { expect, test } from '@playwright/test';
import { PHASE_LABELS, REPO_URL, TOPICS } from '../../src/consigna';

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

  await expect(page.locator('main')).not.toContainText('de 13 temas publicados');
  await expect(page.locator('main')).not.toContainText('Temas 1 a 5');
  await expect(page.locator('main')).not.toContainText('Publicado');
});

test('la portada muestra la lista de definición del curso en el orden exacto', async ({ page }) => {
  await page.goto('./');

  const meta = page.getByTestId('cover-meta');
  await expect(meta.locator('dt')).toHaveText([
    'Autor',
    'Universidad',
    'Curso',
    'Docente',
    'Última actualización',
  ]);
});

test('la fecha de "Última actualización" de la portada coincide con la del pie', async ({
  page,
}) => {
  await page.goto('./');

  const coverDate = await page.getByTestId('cover-meta').locator('dd').last().innerText();
  const footerDate = await page.locator('footer time').innerText();

  expect(coverDate).toBe(footerDate);
});

test('la portada ofrece un botón para ver el repositorio', async ({ page }) => {
  await page.goto('./');

  const link = page
    .getByRole('region', { name: 'Portafolio de evidencias de Física I' })
    .getByRole('link', { name: 'Ver repositorio' });
  await expect(link).toHaveAttribute('href', REPO_URL);
});

test('la cabecera enlaza al repositorio con el icono de GitHub junto al tema', async ({ page }) => {
  for (const path of ['./', './temas/llantas-f1/']) {
    await page.goto(path);

    const header = page.locator('header').first();
    const link = header.getByRole('link', { name: 'Repositorio en GitHub' });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', REPO_URL);
    await expect(link.locator('svg')).toHaveAttribute('aria-hidden', 'true');
    await expect(header.locator('[data-theme-toggle]')).toBeVisible();
  }
});

test('las filas publicadas muestran número, título y tipo de recurso, sin el caso', async ({
  page,
}) => {
  await page.goto('./');

  const published = page.getByTestId('topic-card').filter({ hasNotText: 'Próximamente' });
  await expect(published).toHaveCount(5);
  await expect(page.locator('main')).not.toContainText('Caso:');
  for (const product of ['Assetto Corsa', 'Celeste', 'DualSense']) {
    await expect(published.filter({ hasText: product })).toHaveCount(0);
  }
});

test('las filas de los temas futuros no muestran "Recurso por definir"', async ({ page }) => {
  await page.goto('./');

  const upcomingCards = page.getByTestId('topic-card').filter({ hasText: 'Próximamente' });
  await expect(upcomingCards).toHaveCount(8);
  await expect(page.locator('main')).not.toContainText('Recurso por definir');
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
  await expect(notice).not.toContainText('Caso de uso en Ingeniería del Software');
  await expect(notice).not.toContainText('estas secciones, en este orden');
  await expect(page.locator('main')).not.toContainText(
    'Trabajo, energía cinética y potencia en la recuperación de energía al frenar.',
  );
  await expect(page.locator('main')).not.toContainText('Recurso por definir');
  await expect(page.locator('main')).not.toContainText('Estado');
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
