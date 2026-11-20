/**
 * «Qué aprendí» (spec §5), the closing section of the cover: its place, the ways in (sidebar and
 * the last topic's «siguiente»), the six topic links of its pairs, the map and axe. Needs the
 * thirteen topics: on a branch without Temas 10 to 13 the map and link tests fail by design.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { PHASE_LABELS, PHASES, TOPICS, topicByNumber } from '../../src/consigna';
import { CLOSING_ANCHOR, CLOSING_PAIRS, CLOSING_TITLE } from '../../src/lib/closing';

/** The consigna's thirteen topics, all on the map once the final delivery is in. */
const COURSE_TOPICS = 13;
const SECTION = `main > section#${CLOSING_ANCHOR}`;
/** The section's h3s: its two parts and its sources. */
const SUBHEADINGS = [
  'El mapa de conexiones',
  'La aplicación propia: detección de caídas',
  'Fuentes',
];
const LAST_TOPIC = TOPICS.at(-1)!;
const DESKTOP = { width: 1280, height: 800 };
const VIEWPORTS = [
  { name: 'móvil', size: { width: 360, height: 800 } },
  { name: 'escritorio', size: DESKTOP },
] as const;
const THEMES = ['light', 'dark'] as const;
const BLOCKING_IMPACTS = ['serious', 'critical'];

test('«Qué aprendí» es la última sección de la portada, con su título y sus dos partes', async ({
  page,
}) => {
  await page.goto('./');
  const section = page.locator(SECTION);

  await expect(section).toHaveCount(1);
  // One h2, its title, and the last of the page: «Fuentes» and the parts sit under it.
  await expect(section.getByRole('heading', { level: 2 })).toHaveCount(1);
  await expect(section.getByRole('heading', { level: 2 })).toHaveText(CLOSING_TITLE);
  await expect(page.locator('main').getByRole('heading', { level: 2 }).last()).toHaveText(
    CLOSING_TITLE,
  );
  await expect(section.getByRole('heading', { level: 3 })).toHaveText(SUBHEADINGS);
  const lastId = await page.evaluate(() => document.querySelector('main')?.lastElementChild?.id);
  expect(lastId).toBe(CLOSING_ANCHOR);
});

test('el índice de la portada enlaza las tres entregas y «Qué aprendí»', async ({ page }) => {
  await page.goto('./');
  const index = page.getByRole('navigation', { name: 'En esta página' });

  await expect(index.getByRole('link')).toHaveText([
    ...PHASES.map((phase) => PHASE_LABELS[phase]),
    CLOSING_TITLE,
  ]);
  for (const phase of PHASES) {
    const href = await index.getByRole('link', { name: PHASE_LABELS[phase] }).getAttribute('href');
    await expect(page.locator(href!)).toHaveCount(1);
  }

  await index.getByRole('link', { name: CLOSING_TITLE }).click();

  await expect(page).toHaveURL(new RegExp(`/#${CLOSING_ANCHOR}$`));
  await expect(page.locator(SECTION).getByRole('heading', { level: 2 })).toBeInViewport();
});

test('el enlace de la barra lateral lleva a «Qué aprendí»', async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await page.goto(`./temas/${TOPICS[0].slug}/`);

  await page.locator('nav[aria-label="Temas"]').getByRole('link', { name: CLOSING_TITLE }).click();

  await expect(page).toHaveURL(new RegExp(`/#${CLOSING_ANCHOR}$`));
  await expect(page.locator(SECTION).getByRole('heading', { level: 2 })).toBeInViewport();
});

test('el «siguiente» del último tema lleva a «Qué aprendí»', async ({ page }) => {
  expect(LAST_TOPIC.number).toBe(COURSE_TOPICS);
  await page.goto(`./temas/${LAST_TOPIC.slug}/`);

  await page
    .getByRole('navigation', { name: 'Tema anterior y siguiente' })
    .locator('a[rel="next"]')
    .click();

  await expect(page).toHaveURL(new RegExp(`/#${CLOSING_ANCHOR}$`));
  await expect(page.locator(SECTION).getByRole('heading', { level: 2 })).toBeInViewport();
});

test('los seis temas de los pares están enlazados y responden', async ({ page, request }) => {
  await page.goto('./');
  const pairs = page.locator(SECTION).getByTestId('closing-pair');
  await expect(pairs).toHaveCount(CLOSING_PAIRS.length);

  for (const [index, { a, b, principle }] of CLOSING_PAIRS.entries()) {
    const pair = pairs.nth(index);
    await expect(pair.getByRole('heading', { level: 4 })).toHaveText(principle);
    for (const number of [a, b]) {
      const topic = topicByNumber(number);
      expect(topic, `Tema ${number}`).toBeDefined();
      const link = pair.locator(`a[href$="/temas/${topic!.slug}/"]`);
      await expect(link, `Tema ${number}`).toHaveCount(1);
      const response = await request.get((await link.getAttribute('href'))!);
      expect(response.status(), `Tema ${number}`).toBe(200);
    }
  }
});

test('el mapa dibuja los 13 temas y resalta los 3 pares, también por escrito', async ({ page }) => {
  await page.goto('./');
  const map = page.getByTestId('connection-map');

  await expect(map.locator('[data-map-node]')).toHaveCount(COURSE_TOPICS);
  await expect(map.locator('[data-pair-edge]')).toHaveCount(CLOSING_PAIRS.length);
  for (const { a, b, principle } of CLOSING_PAIRS) {
    await expect(map.locator(`[data-pair-edge="${a}-${b}"]`)).toContainText(principle);
    // Readable outside the drawing: the description, the legend and the pair's heading.
    await expect(map.locator('desc')).toContainText(principle);
    await expect(page.locator(SECTION).locator('figure li')).toContainText([principle]);
    await expect(page.locator(SECTION).getByRole('heading', { name: principle })).toHaveCount(1);
  }
});

for (const viewport of VIEWPORTS) {
  for (const theme of THEMES) {
    test(`«Qué aprendí» no tiene violaciones serias ni críticas de axe (${viewport.name}, ${theme === 'light' ? 'claro' : 'oscuro'})`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport.size);
      await page.addInitScript((value) => window.localStorage.setItem('theme', value), theme);
      await page.goto(`./#${CLOSING_ANCHOR}`);
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);

      const { violations } = await new AxeBuilder({ page }).include(SECTION).analyze();
      const blocking = violations
        .filter((violation) => BLOCKING_IMPACTS.includes(violation.impact ?? ''))
        .map(({ id, nodes }) => ({ id, targets: nodes.map((node) => node.target.join(' ')) }));

      expect(blocking).toEqual([]);
    });
  }
}
