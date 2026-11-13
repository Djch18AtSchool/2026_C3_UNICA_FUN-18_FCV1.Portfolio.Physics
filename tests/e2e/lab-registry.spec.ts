/**
 * The registry of laboratories (topicPages.ts) against the DOM each topic page builds. The suites
 * that measure clocks, events and zooms derive their lists from it; if a lab gains one of those
 * without its flag (a Tema 10 written without touching the registry), or the registry claims one
 * the lab no longer has, this fails by topic and by feature instead of the lab quietly leaving the
 * suites that would measure it.
 */
import { expect, test } from '@playwright/test';
import { labOrPlaceholder, waitForIsland } from './helpers';
import { TOPIC_PAGES } from './topicPages';

/** The marker each feature leaves in the lab's DOM. */
const FEATURES = [
  {
    flag: 'hasClock',
    selector: '[data-lab-transport]',
    what: 'un reloj con barra de reproducción',
  },
  { flag: 'hasEvents', selector: '[data-transport-events]', what: 'eventos en la reproducción' },
  { flag: 'hasZoom', selector: '[data-zoom-viewport]', what: 'un dibujo con zoom' },
] as const;

for (const topic of TOPIC_PAGES) {
  test(`el registro dice lo que construye el laboratorio del tema ${topic.number}`, async ({
    page,
  }) => {
    await page.goto(topic.path);
    await labOrPlaceholder(page, topic.labTestId).scrollIntoViewIfNeeded();
    await waitForIsland(page, `[data-testid="${topic.labTestId}"]`);
    const lab = page.getByTestId(topic.labTestId);

    for (const { flag, selector, what } of FEATURES) {
      const isInDom = (await lab.locator(selector).count()) > 0;
      expect(isInDom, `${topic.slug}: ${flag} = ${topic[flag]}, pero ${what}: ${isInDom}`).toBe(
        topic[flag],
      );
    }
  });
}
