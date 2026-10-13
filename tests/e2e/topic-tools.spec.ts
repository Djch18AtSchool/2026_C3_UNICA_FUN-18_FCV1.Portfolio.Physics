import { expect, test } from '@playwright/test';
import { PHASE_LABELS, REPO_URL, RESOURCE_LABELS, SITE_URL } from '../../src/consigna';
import { SECTION_HEADINGS } from '../../src/lib/sectionHeadings';
import { waitForIsland } from './helpers';

const TOPIC_2 = './temas/salto-personaje/';
const UPCOMING_TOPIC = './temas/frenado-regenerativo/';
const TOPIC_2_URL = `${SITE_URL}temas/salto-personaje/`;
const TOPIC_2_SOURCE = `${REPO_URL}/blob/main/src/content/topics/salto-personaje.mdx`;
const DESKTOP = { width: 1280, height: 800 };
const NARROW_DESKTOP = { width: 1024, height: 768 };
const TABLET = { width: 768, height: 1024 };
const PHONE = { width: 390, height: 844 };
/** Vertical rhythm that replaces the strip's old hairlines. */
const MIN_GAP_BEFORE_STRIP_PX = 32;
const MIN_GAP_INSIDE_STRIP_PX = 16;
const MIN_GAP_AFTER_STRIP_PX = 48;
/** Viewports where the sidebar sits beside the article, so the strip is at most ~830 px wide. */
const WITH_SIDEBAR = [DESKTOP, NARROW_DESKTOP];
/** A word that is really on screen, not a 1 px visually-hidden box. */
const MIN_WORD_PX = 30;
/** The tools row starts flush with the facts: its ghost padding is pulled back into the margin. */
const ALIGN_TOLERANCE_PX = 2;
/**
 * A section far enough down that the header has left the view (so the bar shows) and far enough
 * from the bottom that the page can scroll it up to the bar.
 */
const ANCHOR_ID = SECTION_HEADINGS.Connections.slug;
/** The jump must bring the target near the top, or the gap check proves nothing. */
const NEAR_TOP_PX = 120;
const OLD_FOOTER_TEXTS = ['Ver fuente de esta página en GitHub', 'Actualizado el'];

/** Each published topic and its prescribed resource type (frontmatter `resourceType`). */
const PRESCRIBED_TYPES = [
  ['dron-reparto', 'visualizacion'],
  ['salto-personaje', 'simulacion'],
  ['gravedad-artificial', 'diagrama'],
  ['llantas-f1', 'visualizacion'],
  ['control-haptico', 'multimedia'],
] as const;

for (const [slug, type] of PRESCRIBED_TYPES) {
  test(`${slug}: solo la figura del recurso prescrito lleva insignia de tipo`, async ({ page }) => {
    await page.goto(`./temas/${slug}/`);

    const figures = page.locator('article figure[data-testid="figure"]');
    expect(await figures.count()).toBeGreaterThanOrEqual(4);
    const badged = figures.filter({ has: page.locator('> .figure-head') });
    await expect(badged).toHaveCount(1);
    await expect(badged).toHaveAttribute('data-type', type);
    // No other type label inside the figures: the labs carry no mark of their own.
    for (const label of Object.values(RESOURCE_LABELS)) {
      const expected = label === RESOURCE_LABELS[type] ? 1 : 0;
      await expect(figures.getByText(label, { exact: true })).toHaveCount(expected);
    }
  });
}

test.describe('cabecera de un tema publicado', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test('una franja sin líneas reúne los metadatos y las tres herramientas', async ({ page }) => {
    await page.goto(TOPIC_2);

    const strip = page.getByTestId('topic-meta');
    await expect(strip).toBeVisible();
    await expect(strip).toHaveCSS('border-top-width', '0px');
    await expect(strip).toHaveCSS('border-bottom-width', '0px');

    const facts = strip.getByTestId('topic-facts').locator('> li');
    await expect(facts).toHaveCount(3);
    await expect(facts.nth(0)).toHaveText(RESOURCE_LABELS.simulacion);
    await expect(facts.nth(1)).toHaveText(/^\d+ min de lectura$/);
    await expect(facts.nth(2)).toHaveText(/^Actualizado \d{1,2} \S+ \d{4}$/);
    await expect(facts.nth(2).locator('time')).toHaveAttribute('datetime', /^\d{4}-\d{2}-\d{2}$/);
    // The reading time and the date each carry a small decorative icon.
    for (const index of [1, 2])
      await expect(facts.nth(index).locator('svg[aria-hidden="true"]')).toHaveCount(1);

    const tools = strip.getByTestId('topic-tools');
    await expect(tools.getByRole('button', { name: 'Copiar URL' })).toBeVisible();
    await expect(tools.getByRole('button', { name: 'Copiar Markdown' })).toBeVisible();
    await expect(tools.getByRole('link', { name: 'Abrir en GitHub' })).toHaveAttribute(
      'href',
      TOPIC_2_SOURCE,
    );
  });

  test('la cabecera ya no repite el tema y el avance ni lleva el bloque "Estado"', async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto(TOPIC_2);

    const head = page.locator('[data-topic-head]');
    await expect(head).not.toContainText('Tema 2 ·');
    await expect(head).not.toContainText('Estado');
    await expect(head).not.toContainText('Publicado');
    // The breadcrumbs and the sticky bar still say where the reader is.
    await expect(page.getByRole('navigation', { name: 'Ruta de navegación' })).toContainText(
      PHASE_LABELS[1],
    );
    await expect(page.locator('[data-topic-sticky-bar]')).toContainText(
      `Tema 2 · ${PHASE_LABELS[1]}`,
    );
  });

  for (const viewport of [DESKTOP, NARROW_DESKTOP, TABLET, PHONE]) {
    test(`a ${viewport.width} px el espaciado separa concepto, metadatos, herramientas y cuerpo`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto(TOPIC_2);

      const bottomOf = async (selector: string) => {
        const box = (await page.locator(selector).first().boundingBox())!;
        return box.y + box.height;
      };
      const topOf = async (selector: string) =>
        (await page.locator(selector).first().boundingBox())!.y;
      const concept = await bottomOf('[data-topic-head] > p');
      const factsTop = await topOf('[data-testid="topic-facts"]');
      const factsBottom = await bottomOf('[data-testid="topic-facts"]');
      const toolsTop = await topOf('[data-testid="topic-tools"]');
      const toolsBottom = await bottomOf('[data-testid="topic-tools"]');
      const body = await topOf('.topic-body');

      // A clear rhythm stands in for the hairlines: wider before the strip and after it than
      // inside it, so the facts and the tools still read as one group.
      expect(factsTop - concept).toBeGreaterThanOrEqual(MIN_GAP_BEFORE_STRIP_PX);
      if (toolsTop >= factsBottom)
        expect(toolsTop - factsBottom).toBeGreaterThanOrEqual(MIN_GAP_INSIDE_STRIP_PX);
      expect(body - toolsBottom).toBeGreaterThanOrEqual(MIN_GAP_AFTER_STRIP_PX);
    });
  }

  for (const viewport of [DESKTOP, NARROW_DESKTOP, PHONE]) {
    test(`a ${viewport.width} px se ven las palabras completas de los metadatos`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto(TOPIC_2);

      const facts = page.getByTestId('topic-facts');
      for (const words of [/de lectura/, /Actualizado/]) {
        const text = facts.getByText(words);
        await expect(text).toBeVisible();
        const box = await text.boundingBox();
        expect(box!.width).toBeGreaterThan(MIN_WORD_PX);
      }
    });
  }

  for (const viewport of WITH_SIDEBAR) {
    test(`a ${viewport.width} px las herramientas pasan bajo los metadatos`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto(TOPIC_2);

      const facts = await page.getByTestId('topic-facts').boundingBox();
      const firstTool = page.getByRole('button', { name: 'Copiar URL' });
      const toolBox = await firstTool.boundingBox();
      expect(toolBox!.y).toBeGreaterThanOrEqual(facts!.y + facts!.height);
      // Its copy icon lines up with the badge's edge, not indented by the button's padding.
      const icon = await firstTool.locator('svg[data-icon="copy"]').boundingBox();
      expect(Math.abs(icon!.x - facts!.x)).toBeLessThan(ALIGN_TOLERANCE_PX);
    });
  }

  test('en un teléfono la franja se apila en dos filas sin desbordar', async ({ page }) => {
    await page.setViewportSize(PHONE);
    await page.goto(TOPIC_2);

    const facts = await page.getByTestId('topic-facts').boundingBox();
    const tools = await page.getByTestId('topic-tools').boundingBox();
    expect(facts).not.toBeNull();
    expect(tools).not.toBeNull();
    expect(tools!.y).toBeGreaterThanOrEqual(facts!.y + facts!.height);
    expect(tools!.x + tools!.width).toBeLessThanOrEqual(PHONE.width);
    const controls = page.getByTestId('topic-tools').locator('button, a');
    await expect(controls).toHaveCount(3);
    const tops = await controls.evaluateAll((nodes) =>
      nodes.map((node) => node.getBoundingClientRect().top),
    );
    // The three tools fit on a single row.
    expect(new Set(tops).size).toBe(1);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(PHONE.width);
  });

  test('"Copiar URL" escribe la URL del tema en el portapapeles', async ({ page }) => {
    await page.goto(TOPIC_2);
    await waitForIsland(page, '[data-testid="topic-tools"]');

    const button = page.getByRole('button', { name: 'Copiar URL' });
    const idleWidth = (await button.boundingBox())!.width;
    await button.click();

    const copied = page.getByRole('button', { name: 'Copiado' });
    await expect(copied).toBeVisible();
    // Both faces share one cell: confirming never resizes the button or shifts its neighbours.
    expect((await copied.boundingBox())!.width).toBe(idleWidth);
    await expect(copied.locator('svg[data-icon="check"]')).toBeVisible();
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

test('un tema próximo no tiene franja, herramientas ni el pie anterior', async ({ page }) => {
  await page.goto(UPCOMING_TOPIC);

  await expect(page.getByTestId('topic-meta')).toHaveCount(0);
  await expect(page.getByTestId('topic-tools')).toHaveCount(0);
  await expect(page.locator('#topic-markdown')).toHaveCount(0);
  for (const text of OLD_FOOTER_TEXTS)
    await expect(page.locator('article')).not.toContainText(text);
});
