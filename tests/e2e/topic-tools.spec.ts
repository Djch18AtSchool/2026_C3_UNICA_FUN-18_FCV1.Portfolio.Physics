import { expect, test } from '@playwright/test';
import { REPO_URL, RESOURCE_LABELS, SITE_URL } from '../../src/consigna';
import { SECTION_HEADINGS } from '../../src/lib/sectionHeadings';
import { waitForIsland } from './helpers';

const TOPIC_2 = './temas/salto-personaje/';
const UPCOMING_TOPIC = './temas/frenado-regenerativo/';
const TOPIC_2_URL = `${SITE_URL}temas/salto-personaje/`;
const TOPIC_2_SOURCE = `${REPO_URL}/blob/main/src/content/topics/salto-personaje.mdx`;
const DESKTOP = { width: 1280, height: 800 };
/**
 * A section far enough down that the header has left the view (so the bar shows) and far enough
 * from the bottom that the page can scroll it up to the bar.
 */
const ANCHOR_ID = SECTION_HEADINGS.Connections.slug;
/** The jump must bring the target near the top, or the gap check proves nothing. */
const NEAR_TOP_PX = 120;
const OLD_FOOTER_TEXTS = ['Ver fuente de esta página en GitHub', 'Actualizado el'];

test.describe('cabecera de un tema publicado', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test('muestra las tres insignias y los tres botones de herramientas', async ({ page }) => {
    await page.goto(TOPIC_2);

    const badges = page.getByTestId('topic-badges').locator('> li');
    await expect(badges).toHaveCount(3);
    await expect(badges.nth(0)).toHaveText(RESOURCE_LABELS.simulacion);
    await expect(badges.nth(1)).toHaveText(/^≈ \d+ min de lectura$/);
    await expect(badges.nth(2)).toHaveText(/^Contenido actualizado el \d{1,2} de \S+ de \d{4}$/);
    await expect(badges.nth(2).locator('time')).toHaveAttribute('datetime', /^\d{4}-\d{2}-\d{2}$/);

    const tools = page.getByTestId('topic-tools');
    await expect(tools.getByRole('button', { name: 'Copiar URL' })).toBeVisible();
    await expect(tools.getByRole('button', { name: 'Copiar Markdown' })).toBeVisible();
    await expect(tools.getByRole('link', { name: 'Abrir en GitHub' })).toHaveAttribute(
      'href',
      TOPIC_2_SOURCE,
    );
  });

  test('"Copiar URL" escribe la URL del tema en el portapapeles', async ({ page }) => {
    await page.goto(TOPIC_2);
    await waitForIsland(page, '[data-testid="topic-tools"]');

    await page.getByRole('button', { name: 'Copiar URL' }).click();

    await expect(page.getByRole('button', { name: 'Copiado' })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(TOPIC_2_URL);
    await expect(page.getByRole('button', { name: 'Copiar URL' })).toBeVisible();
  });

  test('"Copiar Markdown" copia el cuerpo MDX sin las líneas de import', async ({ page }) => {
    await page.goto(TOPIC_2);
    await waitForIsland(page, '[data-testid="topic-tools"]');

    await page.getByRole('button', { name: 'Copiar Markdown' }).click();

    await expect(page.getByRole('button', { name: 'Copiado' })).toBeVisible();
    const markdown = await page.evaluate(() => navigator.clipboard.readText());
    expect(markdown).toContain('<UseCase>');
    expect(markdown).not.toMatch(/^import /m);
  });

  test('el pie del tema ya no repite la fecha ni el enlace a la fuente', async ({ page }) => {
    await page.goto(TOPIC_2);

    const article = page.locator('article');
    for (const text of OLD_FOOTER_TEXTS) await expect(article).not.toContainText(text);
    await expect(page.getByText('Ver fuente de esta página en GitHub')).toHaveCount(0);
  });

  test('en Conexiones las dos listas van una debajo de la otra', async ({ page }) => {
    await page.goto(TOPIC_2);

    const headings = page.getByTestId('connections').locator('h3');
    await expect(headings).toHaveText(['Con otros temas', 'Con lo visto en clase']);
    const first = await headings.nth(0).boundingBox();
    const second = await headings.nth(1).boundingBox();
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(second!.y).toBeGreaterThan(first!.y + first!.height);
    expect(second!.x).toBe(first!.x);
  });
});

test('un ancla deja su destino por debajo de la barra fija de escritorio', async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await page.goto(`${TOPIC_2}#${ANCHOR_ID}`);

  const bar = page.locator('[data-topic-sticky-bar]');
  await expect(bar).toHaveAttribute('data-visible', 'true');
  // The bar slides in; measure once it rests at the top of the viewport.
  await expect.poll(() => bar.evaluate((node) => node.getBoundingClientRect().top)).toBe(0);
  const { barBottom, targetTop } = await page.evaluate(
    (id) => ({
      barBottom: document.querySelector('[data-topic-sticky-bar]')!.getBoundingClientRect().bottom,
      targetTop: document.getElementById(id)!.getBoundingClientRect().top,
    }),
    ANCHOR_ID,
  );
  expect(targetTop).toBeGreaterThanOrEqual(barBottom);
  expect(targetTop).toBeLessThan(NEAR_TOP_PX);
});

test('un tema próximo no tiene insignias, herramientas ni el pie anterior', async ({ page }) => {
  await page.goto(UPCOMING_TOPIC);

  await expect(page.getByTestId('topic-badges')).toHaveCount(0);
  await expect(page.getByTestId('topic-tools')).toHaveCount(0);
  await expect(page.locator('#topic-markdown')).toHaveCount(0);
  for (const text of OLD_FOOTER_TEXTS)
    await expect(page.locator('article')).not.toContainText(text);
});
