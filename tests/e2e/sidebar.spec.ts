import { expect, test, type Page } from '@playwright/test';
import { PHASE_LABELS, TOPICS } from '../../src/consigna';
import { waitForIsland } from './helpers';

const DESKTOP = { width: 1280, height: 800 };
const TALL = { width: 1280, height: 2000 };
const PHASE_1_TOPIC = './temas/dron-reparto/';
const PHASE_2_TOPIC = './temas/frenado-regenerativo/';
const PUBLISHED_MIN = 5;
const FUTURE_PHASES = [2, 3] as const;
const FUTURE_NOTE = 'se publica con su consigna';

test.use({ viewport: DESKTOP });

function phase(page: Page, n: number) {
  return page.locator(`nav[aria-label="Temas"] details[data-phase="${n}"]`);
}

function futurePhase(page: Page, n: number) {
  return page.locator(`nav[aria-label="Temas"] [data-phase-future="${n}"]`);
}

/** Future phases: a disabled header and the note, with nothing of their topics. */
async function expectFuturePhasesDisabled(page: Page): Promise<void> {
  for (const n of FUTURE_PHASES) {
    const header = futurePhase(page, n).getByRole('button', { name: PHASE_LABELS[n] });
    await expect(header).toBeDisabled();
    await expect(futurePhase(page, n)).toContainText(FUTURE_NOTE);
    await expect(futurePhase(page, n).getByRole('link')).toHaveCount(0);
  }
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
}

test('en un tema del Avance 1, el Avance 1 está desplegado y las fases futuras deshabilitadas', async ({
  page,
}) => {
  await page.goto(PHASE_1_TOPIC);

  await expect(phase(page, 1)).toHaveAttribute('open', '');
  await expect(phase(page, 1).locator('> summary')).toHaveText('Avance 1');
  await expect(page.locator('nav[aria-label="Temas"] details[data-phase]')).toHaveCount(1);
  await expectFuturePhasesDisabled(page);
});

test('los encabezados de fase van en mayúsculas pequeñas', async ({ page }) => {
  await page.goto(PHASE_1_TOPIC);
  const summary = phase(page, 1).locator('> summary');
  const header = futurePhase(page, 2).getByRole('button');

  await expect(summary).toHaveCSS('text-transform', 'uppercase');
  await expect(summary).toHaveCSS('font-size', '12px');
  await expect(summary).toHaveCSS('font-weight', '600');
  await expect(header).toHaveCSS('text-transform', 'uppercase');
  await expect(header).not.toHaveCSS('cursor', 'pointer');
  // Only the + is dimmed: the label keeps the muted text color at full strength.
  await expect(header).toHaveCSS('opacity', '1');
  await expect(header.locator('span')).toHaveCSS('opacity', '1');
});

test('el encabezado de una fase futura no responde al clic ni recibe el foco', async ({ page }) => {
  await page.goto(PHASE_1_TOPIC);
  const future = futurePhase(page, 2);
  const header = future.getByRole('button');
  const before = {
    html: await future.innerHTML(),
    links: await page.locator('nav[aria-label="Temas"] a').count(),
  };

  await header.click({ force: true });

  expect(await future.innerHTML()).toBe(before.html);
  await expect(page.locator('nav[aria-label="Temas"] a')).toHaveCount(before.links);
  await expect(header).not.toHaveAttribute('aria-expanded');

  await page.locator('nav[aria-label="Temas"] a').last().focus();
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press('Tab');
    await expect(header).not.toBeFocused();
    await expect(futurePhase(page, 3).getByRole('button')).not.toBeFocused();
  }
});

test('la barra no revela nombres ni conteos de los temas futuros', async ({ page }) => {
  await page.goto(PHASE_1_TOPIC);
  const list = page.locator('#sidenav-lista');
  const futureTopics = TOPICS.filter((topic) => topic.phase !== 1);

  const hrefs = await list
    .getByRole('link')
    .evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''));
  for (const topic of futureTopics) {
    expect(hrefs.some((href) => href.includes(`/temas/${topic.slug}/`))).toBe(false);
    await expect(list).not.toContainText(topic.title);
  }
  await expect(list).not.toContainText('Próximamente');
  await expect(list).not.toContainText(/\b13\b|temas?\s+\d/);
});

test('los temas publicados son filas planas con número de dos cifras', async ({ page }) => {
  await page.goto(PHASE_1_TOPIC);
  const links = page.locator('nav[aria-label="Temas"]').getByTestId('topic-link');

  await expect(links).toHaveCount(PUBLISHED_MIN);
  await expect(links.locator('.font-mono')).toHaveText(['01', '02', '03', '04', '05']);
  await expect(page.locator('#sidenav-lista details:not([data-phase])')).toHaveCount(0);
});

test('un avance plegado sigue plegado al recargar', async ({ page }) => {
  await page.goto(PHASE_1_TOPIC);

  await phase(page, 1).locator('> summary').click();
  await expect(phase(page, 1)).not.toHaveAttribute('open');
  await page.reload();

  await expect(phase(page, 1)).not.toHaveAttribute('open');
  await phase(page, 1).locator('> summary').click();
  await page.reload();
  await expect(phase(page, 1)).toHaveAttribute('open', '');
});

test('un valor guardado de una fase futura no la abre', async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('portafolio.nav.avance-2', 'open'));
  await page.goto(PHASE_1_TOPIC);

  await expectFuturePhasesDisabled(page);
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
});

test('en un tema futuro el Avance 1 sigue abierto, sin fila actual', async ({ page }) => {
  await page.goto(PHASE_2_TOPIC);
  const nav = page.locator('nav[aria-label="Temas"]');

  await expect(phase(page, 1)).toHaveAttribute('open', '');
  await expectFuturePhasesDisabled(page);
  await expect(nav.locator('[aria-current="page"]')).toHaveCount(0);
  await expect(nav.locator('[data-outline-current]')).toHaveCount(0);
});

test('en un tema futuro se respeta el Avance 1 plegado', async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('portafolio.nav.avance-1', 'closed'));
  await page.goto(PHASE_2_TOPIC);

  await expect(phase(page, 1)).not.toHaveAttribute('open');
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
  await expectFuturePhasesDisabled(page);
  await phase(page, 1).locator('> summary').click();
  await expect(phase(page, 1)).not.toHaveAttribute('open');
  await expect(page.locator('nav[aria-label="Temas"]')).toBeVisible();
  expect(errors).toEqual([]);
});

test('el tema actual lista siempre sus h2 y cada ancla existe', async ({ page }) => {
  await page.goto(PHASE_1_TOPIC);
  const published = await page
    .locator('nav[aria-label="Temas"] [data-testid="topic-link"]')
    .evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''));
  expect(published.length).toBeGreaterThanOrEqual(PUBLISHED_MIN);

  for (const href of published) {
    await page.goto(href);
    const outline = page.locator('nav[aria-label="Temas"] [data-outline-current]');
    await expect(outline).toHaveCount(1);
    await expect(outline).toBeVisible();
    // Section headings only: a lab's settings <dialog> titles itself with an h2 too.
    const texts = await page.locator('.topic-body h2:not(dialog h2)').allInnerTexts();
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

test('solo el tema actual muestra su esquema, sin desplegables por tema', async ({ page }) => {
  await page.goto(PHASE_1_TOPIC);
  const nav = page.locator('nav[aria-label="Temas"]');
  const outline = nav.locator('[data-outline-current]');

  await expect(outline).toHaveCount(1);
  const current = nav.locator('[aria-current="page"]');
  await expect(current).toHaveAttribute('href', /\/temas\/dron-reparto\/$/);
  const outlineLinks = await outline.locator('[data-outline-link]').count();
  expect(outlineLinks).toBeGreaterThan(1);
  await expect(nav.locator('[data-outline-link]')).toHaveCount(outlineLinks);
  for (const href of await outline
    .locator('[data-outline-link]')
    .evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''))) {
    expect(href).toMatch(/\/temas\/dron-reparto\/#/);
  }
  await expect(nav.locator('[data-outline-link]').first()).toBeVisible();
});

test('la sección activa del esquema usa el color de acento', async ({ page }) => {
  await page.setViewportSize(TALL);
  await page.goto('./temas/llantas-f1/');
  const links = page.locator('nav[aria-label="Temas"] [data-outline-current] a');
  const anchor = (await links.nth(1).getAttribute('href'))?.split('#')[1] ?? '';
  await page.evaluate((id) => document.getElementById(id)?.scrollIntoView(), anchor);
  const active = links.and(page.locator('[aria-current="location"]'));
  await expect(active).toHaveCount(1);

  const [color, accent] = await active.evaluate((link) => {
    const probe = document.createElement('span');
    probe.style.color = 'var(--accent)';
    document.body.append(probe);
    const result = [getComputedStyle(link).color, getComputedStyle(probe).color];
    probe.remove();
    return result;
  });
  expect(color).toBe(accent);
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

test('la búsqueda no encuentra ni cuenta los temas futuros', async ({ page }) => {
  await page.goto(PHASE_1_TOPIC);
  await waitForIsland(page, 'input[type="search"]');
  const nav = page.locator('nav[aria-label="Temas"]');
  const search = nav.getByRole('searchbox', { name: 'Buscar en el portafolio' });

  await search.fill('frenado');
  await expect(nav.getByRole('status')).toHaveText('Sin resultados');

  await search.fill('a');
  const results = nav.getByRole('list', { name: 'Resultados de la búsqueda' });
  await expect(results).toBeVisible();
  const hrefs = await results
    .getByRole('link')
    .evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''));
  const published = TOPICS.filter((topic) => topic.phase === 1).map((topic) => topic.slug);
  for (const href of hrefs) {
    expect(
      published.some((slug) => href.includes(`/temas/${slug}/`)),
      href,
    ).toBe(true);
  }
  const announced = Number((await nav.getByRole('status').textContent())?.match(/\d+/)?.[0]);
  expect(announced).toBeLessThanOrEqual(published.length);
  await expect(results).not.toContainText('próximamente');
  await expect(results.getByRole('link').first()).toContainText(/^01/);
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

test('en escritorio la barra lateral está siempre visible y no desborda', async ({ page }) => {
  await page.goto(PHASE_1_TOPIC);
  await expect(page.locator('nav[aria-label="Temas"]')).toBeVisible();
  await expect(page.locator('#barra-lateral')).toContainText('Temas del portafolio');
  await expectNoHorizontalOverflow(page);
});

test('una clave antigua de barra cerrada no oculta la barra lateral', async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('portafolio.nav.sidebar', 'closed'));
  await page.goto(PHASE_1_TOPIC);

  await expect(page.locator('nav[aria-label="Temas"]')).toBeVisible();
  await expect(page.locator('html')).not.toHaveAttribute('data-sidebar');
});

test('la cabecera ya no tiene el botón de la barra lateral', async ({ page }) => {
  for (const path of [PHASE_1_TOPIC, './no-existe/', './']) {
    await page.goto(path);
    await expect(page.locator('[data-sidebar-toggle]')).toHaveCount(0);
    await expect(page.locator('header').getByRole('button', { name: 'Barra lateral' })).toHaveCount(
      0,
    );
  }
});
