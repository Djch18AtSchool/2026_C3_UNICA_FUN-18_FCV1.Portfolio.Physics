import { expect, test } from '@playwright/test';
import { TOPICS } from '../../src/consigna';
import { PENDING_MEDIA } from './helpers';

const BASE_PATH = '/2026_C3_UNICA_FUN-18_FCV1.Portfolio.Physics/';
const PAGES = ['./', ...TOPICS.map((topic) => `./temas/${topic.slug}/`)];

test('todos los enlaces internos de la portada y de los 13 temas responden 200', async ({
  page,
  request,
}) => {
  const hrefs = new Set<string>();
  for (const path of PAGES) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    // A root-relative link that skipped withBase() would 404 on GitHub Pages.
    await expect(
      page.locator(`a[href^="/"]:not([href^="${BASE_PATH}"])`),
      `${path} has an internal link without the base path`,
    ).toHaveCount(0);
    // Tema 5's video is published after recording; until then the player's download link (server
    // rendered, removed once the error state hydrates) 404s. See PENDING_MEDIA in helpers.ts.
    const found = await page
      .locator(`a[href^="${BASE_PATH}"]:not([href*="${PENDING_MEDIA}"])`)
      .evaluateAll((anchors) => anchors.map((anchor) => anchor.getAttribute('href') ?? ''));
    found.forEach((href) => hrefs.add(href.split('#')[0]));
  }

  // Index, 13 topic pages, at minimum.
  expect(hrefs.size).toBeGreaterThanOrEqual(14);
  for (const href of hrefs) {
    const response = await request.get(href);
    expect(response.status(), href).toBe(200);
  }
});

test('cada cita [n] se anuncia con su fuente y apunta a una entrada de Fuentes', async ({
  page,
}) => {
  const published = TOPICS.filter((topic) => topic.phase === 1);
  for (const topic of published) {
    await page.goto(`./temas/${topic.slug}/`);
    const cites = page.locator('a.cite');
    expect(await cites.count(), topic.slug).toBeGreaterThan(0);
    for (const cite of await cites.all()) {
      const text = (await cite.textContent()) ?? '';
      const n = /^\[(\d+)\]$/.exec(text)?.[1];
      expect(n, `${topic.slug}: visible text ${text}`).toBeDefined();
      await expect(cite).toHaveAccessibleName(new RegExp(`^Fuente ${n}: \\S.+`));
      const target = (await cite.getAttribute('href')) ?? '';
      await expect(page.locator(target), `${topic.slug}: ${target}`).toHaveCount(1);
    }
  }
});
