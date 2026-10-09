import { expect, test } from '@playwright/test';
import { TOPICS } from '../../src/consigna';

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
    const found = await page
      .locator(`a[href^="${BASE_PATH}"]`)
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
