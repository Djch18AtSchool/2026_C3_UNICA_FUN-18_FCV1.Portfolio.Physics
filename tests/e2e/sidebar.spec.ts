import { expect, test, type Page } from '@playwright/test';
import { waitForIsland } from './helpers';

const DESKTOP = { width: 1280, height: 800 };
const PHASE_1_TOPIC = './temas/dron-reparto/';
const SIDEBAR_KEY = 'portafolio.nav.sidebar';

test.use({ viewport: DESKTOP });

function phase(page: Page, n: number) {
  return page.locator(`nav[aria-label="Temas"] details[data-phase="${n}"]`);
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
}

test('en un tema del Avance 1, solo el Avance 1 está desplegado', async ({ page }) => {
  await page.goto(PHASE_1_TOPIC);

  await expect(phase(page, 1)).toHaveAttribute('open', '');
  await expect(phase(page, 2)).not.toHaveAttribute('open');
  await expect(phase(page, 3)).not.toHaveAttribute('open');
  await expect(phase(page, 1).locator('> summary')).toHaveText('Avance 1');
});

test('un avance plegado sigue plegado al recargar', async ({ page }) => {
  await page.goto(PHASE_1_TOPIC);

  await phase(page, 1).locator('> summary').click();
  await expect(phase(page, 1)).not.toHaveAttribute('open');
  await phase(page, 2).locator('> summary').click();
  await expect(phase(page, 2)).toHaveAttribute('open', '');
  await page.reload();

  await expect(phase(page, 1)).not.toHaveAttribute('open');
  await expect(phase(page, 2)).toHaveAttribute('open', '');
});

test('con el almacenamiento bloqueado la página carga y el avance actual está abierto', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error('blocked');
    };
    Storage.prototype.setItem = () => {
      throw new Error('blocked');
    };
  });

  await page.goto(PHASE_1_TOPIC);

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(phase(page, 1)).toHaveAttribute('open', '');
  await expect(phase(page, 2)).not.toHaveAttribute('open');
  await phase(page, 1).locator('> summary').click();
  await expect(phase(page, 1)).not.toHaveAttribute('open');
  await waitForIsland(page, '[data-sidebar-toggle]');
  await page.getByRole('button', { name: 'Ocultar barra lateral' }).click();
  await expect(page.locator('nav[aria-label="Temas"]')).toBeHidden();
  expect(errors).toEqual([]);
});

test('el esquema del tema actual lista sus h2 y marca la sección que se lee', async ({ page }) => {
  await page.goto('./temas/llantas-f1/');

  const outline = page.locator('nav[aria-label="Temas"] [data-outline-current]');
  await expect(outline).toHaveAttribute('open', '');
  const headings = page.locator('.topic-body h2');
  const texts = await headings.allInnerTexts();
  expect(texts.length).toBeGreaterThan(1);
  const links = outline.locator('a');
  await expect(links).toHaveText(texts);
  for (const [i, link] of (await links.all()).entries()) {
    const anchor = (await link.getAttribute('href'))?.split('#')[1] ?? '';
    await expect(page.locator(`[id="${anchor}"]`)).toContainText(texts[i]);
  }

  // A mid-page section, so the page can scroll it to the top of the viewport.
  const anchor = (await links.nth(1).getAttribute('href'))?.split('#')[1] ?? '';
  await page.evaluate((id) => document.getElementById(id)?.scrollIntoView(), anchor);

  await expect(outline.locator('a[aria-current="location"]')).toHaveText(texts[1]);
  await expect(links.first()).not.toHaveAttribute('aria-current');
});

test('los esquemas de los otros temas publicados están plegados', async ({ page }) => {
  await page.goto(PHASE_1_TOPIC);

  const outlines = page.locator('nav[aria-label="Temas"] details.sidenav-outline');
  await expect(outlines).toHaveCount(5);
  await expect(outlines.and(page.locator('[open]'))).toHaveCount(1);
});

test('buscar "llantas" deja una coincidencia y su enlace navega', async ({ page }) => {
  await page.goto(PHASE_1_TOPIC);
  await waitForIsland(page, 'input[type="search"]');
  const nav = page.locator('nav[aria-label="Temas"]');

  await nav.getByRole('searchbox', { name: 'Buscar en el portafolio' }).fill('llantas');

  const results = nav.getByRole('list', { name: 'Resultados de la búsqueda' });
  await expect(results.getByRole('link')).toHaveCount(1);
  await expect(nav.getByTestId('topic-link').first()).toBeHidden();
  await results.getByRole('link').click();
  await expect(page).toHaveURL(/\/temas\/llantas-f1\/$/);
});

test('una búsqueda sin coincidencias dice "Sin resultados"', async ({ page }) => {
  await page.goto(PHASE_1_TOPIC);
  await waitForIsland(page, 'input[type="search"]');
  const nav = page.locator('nav[aria-label="Temas"]');

  await nav.getByRole('searchbox').fill('zzzz');

  await expect(nav.getByRole('status')).toHaveText('Sin resultados');
  await nav.getByRole('searchbox').fill('');
  await expect(nav.getByTestId('topic-link').first()).toBeVisible();
});

test('el botón de la cabecera oculta la barra, persiste y no desborda', async ({ page }) => {
  await page.goto(PHASE_1_TOPIC);
  await waitForIsland(page, '[data-sidebar-toggle]');
  const nav = page.locator('nav[aria-label="Temas"]');
  const article = page.locator('article');
  const openWidth = (await article.boundingBox())?.width ?? 0;
  await expectNoHorizontalOverflow(page);

  const hide = page.getByRole('button', { name: 'Ocultar barra lateral' });
  await expect(hide).toHaveAttribute('aria-pressed', 'false');
  await hide.click();

  await expect(nav).toBeHidden();
  await expect(page.locator('html')).toHaveAttribute('data-sidebar', 'closed');
  expect((await article.boundingBox())?.width ?? 0).toBeGreaterThan(openWidth);
  await expectNoHorizontalOverflow(page);

  await page.reload();
  await expect(nav).toBeHidden();
  const show = page.getByRole('button', { name: 'Mostrar barra lateral' });
  await expect(show).toHaveAttribute('aria-pressed', 'true');
  await expectNoHorizontalOverflow(page);

  await waitForIsland(page, '[data-sidebar-toggle]');
  await show.click();
  await expect(nav).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ocultar barra lateral' })).toBeFocused();
});

test('el botón de la cabecera responde al teclado', async ({ page }) => {
  await page.goto(PHASE_1_TOPIC);
  await waitForIsland(page, '[data-sidebar-toggle]');

  await page.getByRole('button', { name: 'Ocultar barra lateral' }).focus();
  await page.keyboard.press('Enter');

  await expect(page.locator('nav[aria-label="Temas"]')).toBeHidden();
  await page.keyboard.press('Space');
  await expect(page.locator('nav[aria-label="Temas"]')).toBeVisible();
});

test('sin parpadeo: la barra cerrada ya está aplicada al empezar a pintar el cuerpo', async ({
  page,
}) => {
  await page.addInitScript((key) => {
    window.localStorage.setItem(key, 'closed');
    const record = window as unknown as Record<string, string | undefined>;
    // The value when <body> first enters the DOM, before anything in it can be painted. Init
    // scripts run before <html> exists, so watch the whole document.
    new MutationObserver((_, observer) => {
      if (!document.body) return;
      record.__sidebarAtBody = document.documentElement.dataset.sidebar ?? 'none';
      observer.disconnect();
    }).observe(document, { childList: true, subtree: true });
    document.addEventListener('DOMContentLoaded', () => {
      record.__sidebarAtDcl = document.documentElement.dataset.sidebar ?? 'none';
    });
  }, SIDEBAR_KEY);

  await page.goto(PHASE_1_TOPIC, { waitUntil: 'domcontentloaded' });

  const captured = await page.evaluate(() => {
    const record = window as unknown as Record<string, string | undefined>;
    return { body: record.__sidebarAtBody, dcl: record.__sidebarAtDcl };
  });
  expect(captured).toEqual({ body: 'closed', dcl: 'closed' });
});

test('la portada no muestra el botón de la barra lateral', async ({ page }) => {
  await page.goto('./');

  await expect(page.locator('[data-sidebar-toggle]')).toHaveCount(0);
});
