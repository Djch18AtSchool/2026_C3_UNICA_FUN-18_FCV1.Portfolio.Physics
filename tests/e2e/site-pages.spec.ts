import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { PHASE_LABELS, PHASES, TOPICS, topicsByPhase } from '../../src/consigna';

/**
 * Names and slugs the final delivery's topics had while the site listed them by name only. A name
 * or slug that now belongs to a registered topic stops being retired; the rest must not appear in
 * anything built.
 */
const REGISTERED_SLUGS: readonly string[] = TOPICS.map((topic) => topic.slug);
const REGISTERED_TITLES = TOPICS.map((topic) => topic.title.toLowerCase());
const RETIRED_SLUGS = [
  'spring-animations',
  'sintesis-sonido',
  'resonancia-tacoma',
  'enfriamiento-datacenter',
].filter((slug) => !REGISTERED_SLUGS.includes(slug));
const RETIRED_NAMES = [
  'Spring animations',
  'Síntesis de sonido',
  'Tacoma',
  'Enfriamiento líquido',
].filter((name) => !REGISTERED_TITLES.some((title) => title.includes(name.toLowerCase())));
const DIST_DIR = join(process.cwd(), 'dist');
const TEXT_FILE = /\.(html|js|mjs|css|json|txt|xml|svg)$/;
/** A phase is future iff no registered topic belongs to it. */
const FUTURE_PHASES = PHASES.filter((phase) => topicsByPhase(phase, TOPICS).length === 0);
const FUTURE_PHASE_LABELS = FUTURE_PHASES.map((phase) => PHASE_LABELS[phase]);
const PHASES_WITH_TOPICS = PHASES.filter((phase) => topicsByPhase(phase, TOPICS).length > 0);
/** The pages that are not a topic: the cover and the 404. */
const NON_TOPIC_PAGES = ['404.html', 'index.html'];

/** Every file under `dir`, as paths relative to it. */
function listFiles(dir: string, prefix = ''): string[] {
  return readdirSync(dir).flatMap((name) => {
    const relative = join(prefix, name);
    return statSync(join(dir, name)).isDirectory()
      ? listFiles(join(dir, name), relative)
      : [relative];
  });
}

test('la construcción tiene la portada, la 404 y una página por tema, nada más', () => {
  const pages = listFiles(DIST_DIR)
    .filter((file) => file.endsWith('.html'))
    .sort();
  const topicPages = TOPICS.map((topic) => join('temas', topic.slug, 'index.html'));

  expect(pages).toEqual([...NON_TOPIC_PAGES, ...topicPages].sort());
  expect(pages).toHaveLength(NON_TOPIC_PAGES.length + TOPICS.length);
});

test('ningún archivo construido nombra ni enlaza un tema futuro', () => {
  const needles = [...RETIRED_SLUGS, ...RETIRED_NAMES].map((needle) => needle.toLowerCase());
  const hits = listFiles(DIST_DIR)
    .filter((file) => TEXT_FILE.test(file))
    .flatMap((file) => {
      const text = readFileSync(join(DIST_DIR, file), 'utf8').toLowerCase();
      return needles
        .filter((needle) => text.includes(needle))
        .map((needle) => `${file}: ${needle}`);
    });

  expect(hits).toEqual([]);
});

for (const slug of RETIRED_SLUGS) {
  test(`/temas/${slug}/ responde 404`, async ({ request }) => {
    const response = await request.get(`./temas/${slug}/`);

    expect(response.status()).toBe(404);
  });
}

test('la portada conserva cada fase futura, solo con su insignia', async ({ page }) => {
  await page.goto('./');

  for (const label of FUTURE_PHASE_LABELS) {
    const group = page.getByTestId('phase-group').filter({
      has: page.getByRole('heading', { level: 2, name: label }),
    });
    await expect(group).toHaveCount(1);
    await expect(group.getByTestId('upcoming-phase')).toHaveText('Se publica con su consigna');
    await expect(group.getByRole('listitem')).toHaveCount(0);
    await expect(group.getByRole('link')).toHaveCount(0);
  }
});

for (const phase of PHASES_WITH_TOPICS) {
  const label = PHASE_LABELS[phase];
  const count = topicsByPhase(phase, TOPICS).length;
  test(`la portada muestra ${label} con sus ${count} temas`, async ({ page }) => {
    await page.goto('./');
    const group = page.getByTestId('phase-group').filter({
      has: page.getByRole('heading', { level: 2, name: label }),
    });

    await expect(group).toHaveCount(1);
    await expect(group.getByTestId('upcoming-phase')).toHaveCount(0);
    await expect(group.getByRole('listitem')).toHaveCount(count);
  });
}

test('la barra lateral conserva la fase futura, deshabilitada', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`./temas/${TOPICS[0].slug}/`);
  const nav = page.locator('nav[aria-label="Temas"]');

  for (const label of FUTURE_PHASE_LABELS) {
    await expect(nav.getByRole('button', { name: label })).toBeDisabled();
  }
  await expect(nav.locator('[data-phase-future]')).toHaveCount(FUTURE_PHASE_LABELS.length);
  await expect(nav.locator('[data-phase-future]').getByRole('link')).toHaveCount(0);
});

/** A page's `<meta>` content by its `name` or `property`, or null when it has none. */
const metaContent = (page: Page, key: string) =>
  page.locator(`meta[name="${key}"], meta[property="${key}"]`).first().getAttribute('content');

const OG_PAGES = [{ name: 'la portada', path: './', type: 'website' }].concat(
  TOPICS.map(({ slug, number }) => ({
    name: `el tema ${number}`,
    path: `./temas/${slug}/`,
    type: 'article',
  })),
);

for (const { name, path, type } of OG_PAGES) {
  test(`${name} lleva los metadatos Open Graph y Twitter de su título y su descripción`, async ({
    page,
  }) => {
    await page.goto(path);

    expect(await metaContent(page, 'og:title')).toBe(await page.title());
    const description = await metaContent(page, 'description');
    expect(description).toBeTruthy();
    expect(await metaContent(page, 'og:description')).toBe(description);
    expect(await metaContent(page, 'og:type')).toBe(type);
    expect(await metaContent(page, 'og:locale')).toBe('es_CR');
    expect(await metaContent(page, 'twitter:card')).toBe('summary');
    expect(await page.locator('meta[property="og:image"]').count()).toBe(0);
  });
}
