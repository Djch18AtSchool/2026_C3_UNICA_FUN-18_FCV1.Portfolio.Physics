import { expect, test, type Page } from '@playwright/test';
import { waitForIsland } from './helpers';

const DESKTOP = { width: 1280, height: 800 };
const TALL = { width: 1280, height: 2000 };
const PHASE_1_TOPIC = './temas/dron-reparto/';
const PHASE_2_TOPIC = './temas/frenado-regenerativo/';
const SIDEBAR_KEY = 'portafolio.nav.sidebar';
const TOGGLE_NAME = 'Barra lateral';
const PUBLISHED_MIN = 5;

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

test('visitar un tema sin tocar la barra no guarda el estado por defecto de los avances', async ({
  page,
}) => {
  await page.goto(PHASE_1_TOPIC);
  await expect(phase(page, 1)).toHaveAttribute('open', '');
  // Give any parser-initiated toggle event time to fire, then replay one: Chromium can fire
  // `toggle` for a <details> parsed with `open`, which is not a change by the reader.
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => {
    document
      .querySelectorAll('[data-sidenav] details[data-phase]')
      .forEach((details) => details.dispatchEvent(new Event('toggle')));
  });
  const storedPhases = await page.evaluate(() =>
    Object.keys(window.localStorage).filter((key) => key.startsWith('portafolio.nav.avance-')),
  );
  expect(storedPhases).toEqual([]);

  await page.goto(PHASE_2_TOPIC);

  await expect(phase(page, 2)).toHaveAttribute('open', '');
  await expect(phase(page, 1)).not.toHaveAttribute('open');
  await expect(phase(page, 3)).not.toHaveAttribute('open');
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
  const toggle = page.getByRole('button', { name: TOGGLE_NAME });
  await toggle.click();
  await expect(page.locator('nav[aria-label="Temas"]')).toBeHidden();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  expect(errors).toEqual([]);
});

test('el esquema de cada tema publicado lista sus h2 y cada ancla existe', async ({ page }) => {
  await page.goto(PHASE_1_TOPIC);
  const published = await page
    .locator(
      'nav[aria-label="Temas"] li:has(> details.sidenav-outline) > a[data-testid="topic-link"]',
    )
    .evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''));
  expect(published.length).toBeGreaterThanOrEqual(PUBLISHED_MIN);

  for (const href of published) {
    await page.goto(href);
    const outline = page.locator('nav[aria-label="Temas"] [data-outline-current]');
    await expect(outline).toHaveAttribute('open', '');
    const texts = await page.locator('.topic-body h2').allInnerTexts();
    expect(texts.length, href).toBeGreaterThan(1);
    const links = outline.locator('a');
    await expect(links, href).toHaveText(texts);
    for (const [i, link] of (await links.all()).entries()) {
      const anchor = (await link.getAttribute('href'))?.split('#')[1] ?? '';
      await expect(page.locator(`[id="${anchor}"]`), `${href}#${anchor}`).toContainText(texts[i]);
    }
  }
});

test('el esquema marca la sección que se lee y la última al llegar al final', async ({ page }) => {
  // Tall enough that, at the bottom, the last heading stays below the reading line: only the
  // bottom-of-page rule can mark it.
  await page.setViewportSize(TALL);
  await page.goto('./temas/llantas-f1/');
  const links = page.locator('nav[aria-label="Temas"] [data-outline-current] a');
  const texts = await links.allInnerTexts();

  // A mid-page section, so the page can scroll it to the top of the viewport.
  const anchor = (await links.nth(1).getAttribute('href'))?.split('#')[1] ?? '';
  await page.evaluate((id) => document.getElementById(id)?.scrollIntoView(), anchor);
  await expect(links.and(page.locator('[aria-current="location"]'))).toHaveText(texts[1]);
  await expect(links.first()).not.toHaveAttribute('aria-current');

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const lastTop = await page.evaluate(
    (id) => document.getElementById(id)?.getBoundingClientRect().top ?? 0,
    (await links.last().getAttribute('href'))?.split('#')[1] ?? '',
  );
  expect(lastTop).toBeGreaterThan(TALL.height * 0.3);
  await expect(links.and(page.locator('[aria-current="location"]'))).toHaveText(texts.at(-1) ?? '');
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

  const toggle = page.getByRole('button', { name: TOGGLE_NAME });
  await expect(toggle).toHaveAttribute('aria-controls', 'barra-lateral');
  await expect(page.locator('#barra-lateral')).toContainText('Temas del portafolio');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await toggle.click();

  await expect(nav).toBeHidden();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('html')).toHaveAttribute('data-sidebar', 'closed');
  expect((await article.boundingBox())?.width ?? 0).toBeGreaterThan(openWidth);
  await expectNoHorizontalOverflow(page);

  await page.reload();
  await expect(nav).toBeHidden();
  // Corrected before hydration by SiteHeader's inline script.
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expectNoHorizontalOverflow(page);

  await waitForIsland(page, '[data-sidebar-toggle]');
  await toggle.click();
  await expect(nav).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(toggle).toBeFocused();
});

test('el botón de la cabecera responde al teclado', async ({ page }) => {
  await page.goto(PHASE_1_TOPIC);
  await waitForIsland(page, '[data-sidebar-toggle]');

  await page.getByRole('button', { name: TOGGLE_NAME }).focus();
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
