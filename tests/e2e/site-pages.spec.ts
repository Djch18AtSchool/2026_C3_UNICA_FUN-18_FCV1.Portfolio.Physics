import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { TOPICS } from '../../src/consigna';

/**
 * Topics of the Entrega Final (10 to 13) do not exist on the site until their consigna
 * arrives: no page, no link, no name. These are the names and slugs they had while the site
 * listed them by name only, and nothing built may carry them now. The Avance 2 consigna arrived
 * on 2026-10-30, so its topics (6 to 9) left this list. Update the guard when the final
 * delivery's consigna arrives: a retired name or slug may legitimately come back with it.
 */
const RETIRED_SLUGS = [
  'spring-animations',
  'sintesis-sonido',
  'resonancia-tacoma',
  'enfriamiento-datacenter',
] as const;
const RETIRED_NAMES = [
  'Spring animations',
  'Síntesis de sonido',
  'Tacoma',
  'Enfriamiento líquido',
] as const;
const DIST_DIR = join(process.cwd(), 'dist');
const TEXT_FILE = /\.(html|js|mjs|css|json|txt|xml|svg)$/;
const FUTURE_PHASE_LABELS = ['Entrega Final'];
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

test('la portada conserva la Entrega Final, solo con su insignia', async ({ page }) => {
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

test('la portada muestra el Avance 2 con sus cuatro temas', async ({ page }) => {
  await page.goto('./');
  const group = page.getByTestId('phase-group').filter({
    has: page.getByRole('heading', { level: 2, name: 'Avance 2' }),
  });

  await expect(group).toHaveCount(1);
  await expect(group.getByTestId('upcoming-phase')).toHaveCount(0);
  await expect(group.getByRole('listitem')).toHaveCount(4);
});

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
