import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const PAGES = [
  { name: 'la portada', path: './' },
  { name: 'el tema 1', path: './temas/dron-reparto/' },
  { name: 'el tema 2', path: './temas/salto-personaje/' },
  { name: 'el tema 3', path: './temas/gravedad-artificial/' },
  { name: 'el tema 4', path: './temas/llantas-f1/' },
  { name: 'el tema 5', path: './temas/control-haptico/' },
] as const;
const THEMES = ['light', 'dark'] as const;
/** Wide equations only overflow (and need a keyboard stop) on phones, so scan both widths. */
const VIEWPORTS = [
  { name: 'escritorio', size: { width: 1280, height: 800 } },
  { name: 'móvil', size: { width: 375, height: 812 } },
] as const;
const BLOCKING_IMPACTS = ['serious', 'critical'];
const SCROLL_STEP_PX = 600;

/** Islands hydrate with client:visible: walk the page so every one renders before the scan. */
async function hydrateAllIslands(page: Page): Promise<void> {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y <= height; y += SCROLL_STEP_PX) {
    await page.mouse.wheel(0, SCROLL_STEP_PX);
  }
  await page.waitForLoadState('networkidle');
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  await page.evaluate(() => window.scrollTo(0, 0));
}

for (const viewport of VIEWPORTS) {
  for (const theme of THEMES) {
    test.describe(`${viewport.name}, tema ${theme === 'light' ? 'claro' : 'oscuro'}`, () => {
      test.use({ viewport: viewport.size });
      test.beforeEach(async ({ page }) => {
        await page.addInitScript((value) => {
          window.localStorage.setItem('theme', value);
        }, theme);
      });

      for (const { name, path } of PAGES) {
        test(`${name} no tiene violaciones serias ni críticas de axe`, async ({ page }) => {
          await page.goto(path);
          await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
          await hydrateAllIslands(page);

          const { violations } = await new AxeBuilder({ page }).analyze();
          const blocking = violations
            .filter((violation) => BLOCKING_IMPACTS.includes(violation.impact ?? ''))
            .map(({ id, impact, nodes }) => ({
              id,
              impact,
              targets: nodes.map((node) => node.target.join(' ')),
            }));

          expect(blocking).toEqual([]);
        });
      }
    });
  }
}
