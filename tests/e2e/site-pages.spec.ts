import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { TOPICS } from '../../src/consigna';

/**
 * Topics of the Avance 2 and the Entrega Final do not exist on the site until their consigna
 * arrives: no page, no link, no name. These are the names and slugs they had while the site
 * listed them by name only; nothing built may carry them again.
 */
const RETIRED_SLUGS = [
  'frenado-regenerativo',
  'coeficiente-restitucion',
  'ruedas-reaccion',
  'asistencia-gravitatoria',
  'spring-animations',
  'sintesis-sonido',
  'resonancia-tacoma',
  'enfriamiento-datacenter',
] as const;
const RETIRED_NAMES = [
  'Frenado regenerativo',
  'coeficiente de restitución',
  'Ruedas de reacción',
  'Asistencia gravitatoria',
  'Voyager',
  'Spring animations',
  'Síntesis de sonido',
  'Tacoma',
  'Enfriamiento líquido',
] as const;
const DIST_DIR = join(process.cwd(), 'dist');
const TEXT_FILE = /\.(html|js|mjs|css|json|txt|xml|svg)$/;
const FUTURE_PHASE_LABELS = ['Avance 2', 'Entrega Final'];

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

  expect(pages).toEqual(['404.html', 'index.html', ...topicPages].sort());
  expect(topicPages).toHaveLength(5);
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

test('la portada conserva el Avance 2 y la Entrega Final, solo con su insignia', async ({
  page,
}) => {
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

test('la barra lateral conserva las dos fases futuras, deshabilitadas', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`./temas/${TOPICS[0].slug}/`);
  const nav = page.locator('nav[aria-label="Temas"]');

  for (const label of FUTURE_PHASE_LABELS) {
    await expect(nav.getByRole('button', { name: label })).toBeDisabled();
  }
  await expect(nav.locator('[data-phase-future]')).toHaveCount(FUTURE_PHASE_LABELS.length);
  await expect(nav.locator('[data-phase-future]').getByRole('link')).toHaveCount(0);
});
