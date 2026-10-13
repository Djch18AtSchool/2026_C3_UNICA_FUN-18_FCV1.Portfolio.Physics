import { expect, test, type Page } from '@playwright/test';
import { REPO_URL, TOPICS } from '../../src/consigna';

test('la portada lista los temas con sus títulos exactos agrupados por avance', async ({
  page,
}) => {
  await page.goto('./');

  const links = page.getByTestId('topic-link');
  await expect(links).toHaveText(TOPICS.map((topic) => topic.title));

  const groups = page.getByTestId('phase-group');
  await expect(groups).toHaveCount(3);
  await expect(groups.getByRole('heading', { level: 2 })).toHaveText([
    'Avance 1',
    'Avance 2',
    'Entrega Final',
  ]);
  await expect(groups.nth(0).getByTestId('topic-card')).toHaveCount(TOPICS.length);

  await expect(page.locator('main')).not.toContainText('de 13 temas publicados');
  await expect(page.locator('main')).not.toContainText('Temas 1 a 5');
  await expect(page.locator('main')).not.toContainText('Publicado');
});

test('las fases futuras de la portada solo muestran su encabezado y la insignia', async ({
  page,
}) => {
  await page.goto('./');
  const groups = page.getByTestId('phase-group');

  await expect(groups.nth(0).getByTestId('upcoming-phase')).toHaveCount(0);
  for (const n of [1, 2]) {
    const group = groups.nth(n);
    await expect(group.getByTestId('topic-card')).toHaveCount(0);
    await expect(group.getByRole('listitem')).toHaveCount(0);
    await expect(group.getByTestId('upcoming-phase')).toHaveText('Se publica con su consigna');
    await expect(group.getByTestId('upcoming-phase')).toHaveCSS('border-style', 'dashed');
  }
  await expect(page.locator('main')).not.toContainText('Próximamente');
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

test('la portada nombra la universidad y el curso sin la escuela ni los datos del curso', async ({
  page,
}) => {
  await page.goto('./');

  const meta = page.getByTestId('cover-meta');
  await expect(meta.locator('dd').nth(1)).toHaveText('Universidad CENFOTEC');
  await expect(meta.locator('dd').nth(2)).toHaveText('Física I');
  const main = page.locator('main');
  for (const text of ['Escuela de Fundamentos', 'FUN-18', 'FCV1', 'Sección', '2026-C3'])
    await expect(main).not.toContainText(text);
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

const COURSE_NAME = 'Física I';
/** Phone widths where the header title must wrap, and a narrow one to be safe. */
const NARROW_WIDTHS = [320, 360, 390];

/** How many lines the first occurrence of `phrase` spans inside the element. */
async function linesSpanned(page: Page, selector: string, phrase: string): Promise<number> {
  return page.locator(selector).evaluate((element, wanted) => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      // The markup may join the words with a no-break space.
      const text = (node.textContent ?? '').replace(/\u00a0/g, ' ');
      const start = text.indexOf(wanted);
      if (start === -1) continue;
      const range = document.createRange();
      range.setStart(node, start);
      range.setEnd(node, start + wanted.length);
      return new Set([...range.getClientRects()].map((rect) => Math.round(rect.top))).size;
    }
    throw new Error(`"${wanted}" not found`);
  }, phrase);
}

for (const width of NARROW_WIDTHS) {
  test(`a ${width} px los títulos no separan un numeral de su palabra («Física I», «Fórmula 1»)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('./');

    expect(await linesSpanned(page, 'header a[href$="/"] >> nth=0', COURSE_NAME)).toBe(1);
    expect(await linesSpanned(page, 'footer p >> nth=0', COURSE_NAME)).toBe(1);
    expect(await linesSpanned(page, 'main h1', COURSE_NAME)).toBe(1);

    // A topic title keeps its numeral with the word before it too.
    await page.goto('./temas/llantas-f1/');
    expect(await linesSpanned(page, 'main h1', 'Fórmula 1')).toBe(1);
  });
}

for (const { width, isStacked } of [
  { width: 390, isStacked: true },
  { width: 1280, isStacked: false },
]) {
  test(`a ${width} px las fases futuras de la portada se maquetan igual`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('./');
    const groups = page.getByTestId('phase-group');

    for (const n of [1, 2]) {
      const heading = await groups.nth(n).getByRole('heading', { level: 2 }).boundingBox();
      const badge = await groups.nth(n).getByTestId('upcoming-phase').boundingBox();
      if (!heading || !badge) throw new Error('missing heading or badge');
      const isBelow = badge.y >= heading.y + heading.height - 1;
      expect(isBelow, `fase ${n + 1}`).toBe(isStacked);
      if (isStacked) expect(Math.round(badge.x)).toBe(Math.round(heading.x));
    }
  });
}

test('las filas de los temas muestran número, título y tipo de recurso, sin el caso', async ({
  page,
}) => {
  await page.goto('./');

  const published = page.getByTestId('topic-card');
  await expect(published).toHaveCount(TOPICS.length);
  await expect(page.locator('main')).not.toContainText('Caso:');
  for (const product of ['Assetto Corsa', 'Celeste', 'DualSense']) {
    await expect(published.filter({ hasText: product })).toHaveCount(0);
  }
  await expect(page.locator('main')).not.toContainText('Recurso por definir');
});

const PREV_NEXT = 'Tema anterior y siguiente';
const LAST_TOPIC = TOPICS.at(-1)!;
const SECOND_TO_LAST_TOPIC = TOPICS.at(-2)!;

test('anterior y siguiente enlazan los temas vecinos; el último no ofrece siguiente', async ({
  page,
}) => {
  await page.goto(`./temas/${LAST_TOPIC.slug}/`);
  const nav = page.getByRole('navigation', { name: PREV_NEXT });
  await expect(nav.locator('a[rel="prev"]')).toHaveAttribute(
    'href',
    new RegExp(`/temas/${SECOND_TO_LAST_TOPIC.slug}/$`),
  );
  await expect(nav.locator('a[rel="next"]')).toHaveCount(0);
  await expect(nav).not.toContainText('Tema siguiente');

  await page.goto(`./temas/${TOPICS[0].slug}/`);
  await expect(page.getByRole('navigation', { name: PREV_NEXT }).locator('a')).toHaveCount(1);
  await expect(
    page.getByRole('navigation', { name: PREV_NEXT }).locator('a[rel="next"]'),
  ).toHaveAttribute('href', new RegExp(`/temas/${TOPICS[1].slug}/$`));
});

test('con un solo lado, la tarjeta ocupa su columna sin dejar el otro lado vacío', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`./temas/${LAST_TOPIC.slug}/`);

  const nav = page.getByRole('navigation', { name: PREV_NEXT });
  // The previous card keeps the left column, where it sits on every other topic.
  const navBox = (await nav.boundingBox())!;
  const prevBox = (await nav.locator('a[rel="prev"]').boundingBox())!;
  expect(Math.round(prevBox.x)).toBe(Math.round(navBox.x));
  await expect(nav.locator('> *')).toHaveCount(1);
});

test('la barra lateral marca el tema activo y navega', async ({ page }) => {
  await page.goto('./temas/dron-reparto/');

  const nav = page.locator('nav[aria-label="Temas"]');
  const links = nav.getByTestId('topic-link');
  await expect(links).toHaveCount(TOPICS.length);

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
  await expect(nav.getByTestId('topic-link')).toHaveCount(TOPICS.length);
  await expect(nav.locator('[data-phase-future]')).toHaveCount(2);
  await expect(page.locator('main')).not.toContainText('trece');
  await expect(page.locator('main')).toContainText('ver los temas por avance');
});
