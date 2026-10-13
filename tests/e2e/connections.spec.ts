import { expect, test } from '@playwright/test';
import { TOPICS } from '../../src/consigna';

/** The frontmatter minimum (topicSchema): every topic relates to at least this many others. */
const MIN_RELATED = 2;

for (const topic of TOPICS) {
  test(`${topic.slug}: «Conexiones» enlaza cada tema relacionado a una página del sitio`, async ({
    page,
  }) => {
    await page.goto(`./temas/${topic.slug}/`);

    const list = page
      .getByTestId('connections')
      .locator('h3', { hasText: 'Con otros temas' })
      .locator('+ ul');
    const items = list.locator('> li');
    expect(await items.count()).toBeGreaterThanOrEqual(MIN_RELATED);
    for (const item of await items.all()) {
      const link = item.getByRole('link');
      await expect(link).toHaveCount(1);
      const href = (await link.getAttribute('href')) ?? '';
      const target = TOPICS.find((candidate) => href.endsWith(`/temas/${candidate.slug}/`));
      expect(target, href).toBeDefined();
      expect(target?.slug).not.toBe(topic.slug);
      await expect(item).toContainText(`Tema ${target!.number}`);
      await expect(link).toHaveText(target!.title);
    }
  });
}
