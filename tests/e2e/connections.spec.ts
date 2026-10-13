import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { TOPICS } from '../../src/consigna';
import { phaseWithArticle } from '../../src/lib/phases';

const CONTENT_DIR = new URL('../../src/content/topics/', import.meta.url);
const STATUS_LINE = /^status:\s*['"]?(\w+)/m;

/** Each topic's status as its MDX frontmatter declares it: the data, not the phase. */
function statusOf(slug: string): string {
  const source = readFileSync(new URL(`${slug}.mdx`, CONTENT_DIR), 'utf8');
  const status = STATUS_LINE.exec(source)?.[1];
  if (!status) throw new Error(`${slug}.mdx has no status line`);
  return status;
}

const PUBLISHED = TOPICS.filter((topic) => statusOf(topic.slug) === 'publicado');
const UPCOMING = TOPICS.filter((topic) => statusOf(topic.slug) !== 'publicado');

test('los datos tienen temas publicados y próximos que comprobar', () => {
  expect(PUBLISHED.length).toBeGreaterThan(0);
  expect(UPCOMING.length).toBeGreaterThan(0);
});

for (const topic of PUBLISHED) {
  test(`${topic.slug}: «Conexiones» no enlaza ningún tema próximo`, async ({ page }) => {
    await page.goto(`./temas/${topic.slug}/`);

    const connections = page.getByTestId('connections');
    await expect(connections).toBeVisible();
    for (const upcoming of UPCOMING)
      await expect(connections.locator(`a[href$="/temas/${upcoming.slug}/"]`)).toHaveCount(0);
  });
}

test('un tema próximo relacionado aparece solo por nombre, con su avance y apagado', async ({
  page,
}) => {
  // Tema 5 relates to Temas 10 and 12, both upcoming in the Avance 1 data.
  await page.goto('./temas/control-haptico/');
  const items = page.getByTestId('connections').locator('[data-upcoming]');
  expect(await items.count()).toBeGreaterThan(0);
  const mutedInk = await page
    .getByTestId('connections')
    .locator('.connections-number')
    .first()
    .evaluate((node) => getComputedStyle(node).color);

  for (const item of await items.all()) {
    await expect(item.locator('a')).toHaveCount(0);
    const text = (await item.innerText()).replace(/\s+/g, ' ');
    const topic = UPCOMING.find((candidate) => text.includes(candidate.title));
    expect(topic, text).toBeDefined();
    expect(text).toContain(`Tema ${topic!.number}`);
    expect(text).toContain(`se publica en ${phaseWithArticle(topic!.phase)}`);
    // Muted like the topic numbers, not in the body ink of the linked titles.
    const color = await item.evaluate((node) => getComputedStyle(node).color);
    expect(color).toBe(mutedInk);
  }
});
