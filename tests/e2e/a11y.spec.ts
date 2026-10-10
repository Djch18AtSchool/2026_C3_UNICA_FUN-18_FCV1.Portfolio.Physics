import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { waitForIsland } from './helpers';

const PAGES = [
  { name: 'la portada', path: './' },
  { name: 'el tema 1', path: './temas/dron-reparto/' },
  { name: 'el tema 2', path: './temas/salto-personaje/' },
  { name: 'el tema 3', path: './temas/gravedad-artificial/' },
  { name: 'el tema 4', path: './temas/llantas-f1/' },
  { name: 'el tema 5', path: './temas/control-haptico/' },
  { name: 'la página 404', path: './no-existe/' },
] as const;
/** The sidebar can be hidden from the header; scan pages that have one in both states. */
const SIDEBAR_STATES = [
  { name: 'barra lateral abierta', stored: null },
  { name: 'barra lateral cerrada', stored: 'closed' },
] as const;
const THEMES = ['light', 'dark'] as const;
/** Wide equations only overflow (and need a keyboard stop) on phones, so scan both widths. */
const VIEWPORTS = [
  { name: 'escritorio', size: { width: 1280, height: 800 } },
  { name: 'móvil', size: { width: 375, height: 812 } },
] as const;
/** Each v2 laboratory, by the LabShell test id its page renders. */
const LABS = [
  { name: 'el laboratorio del tema 1', path: './temas/dron-reparto/', testId: 'drone-lab' },
  { name: 'el laboratorio del tema 2', path: './temas/salto-personaje/', testId: 'jump-lab' },
  {
    name: 'el laboratorio del tema 3',
    path: './temas/gravedad-artificial/',
    testId: 'habitat-lab',
  },
  { name: 'el laboratorio del tema 4', path: './temas/llantas-f1/', testId: 'tyre-lab' },
  { name: 'el laboratorio del tema 5', path: './temas/control-haptico/', testId: 'trigger-lab' },
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

async function expectNoBlockingViolations(page: Page): Promise<void> {
  const { violations } = await new AxeBuilder({ page }).analyze();
  const blocking = violations
    .filter((violation) => BLOCKING_IMPACTS.includes(violation.impact ?? ''))
    .map(({ id, impact, nodes }) => ({
      id,
      impact,
      targets: nodes.map((node) => node.target.join(' ')),
    }));

  expect(blocking).toEqual([]);
}

for (const viewport of VIEWPORTS) {
  for (const theme of THEMES) {
    for (const sidebar of SIDEBAR_STATES) {
      test.describe(`${viewport.name}, tema ${theme === 'light' ? 'claro' : 'oscuro'}, ${sidebar.name}`, () => {
        test.use({ viewport: viewport.size });
        test.beforeEach(async ({ page }) => {
          await page.addInitScript(
            ({ value, stored }) => {
              window.localStorage.setItem('theme', value);
              if (stored) window.localStorage.setItem('portafolio.nav.sidebar', stored);
            },
            { value: theme, stored: sidebar.stored },
          );
        });

        // The cover has no sidebar: scan it once, with the sidebar state untouched.
        const pages = sidebar.stored ? PAGES.filter(({ path }) => path !== './') : PAGES;
        for (const { name, path } of pages) {
          test(`${name} no tiene violaciones serias ni críticas de axe`, async ({ page }) => {
            await page.goto(path);
            await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
            if (sidebar.stored) {
              await expect(page.locator('html')).toHaveAttribute('data-sidebar', sidebar.stored);
            }
            await hydrateAllIslands(page);

            await expectNoBlockingViolations(page);
          });
        }
      });
    }
  }
}

test.describe('escritorio, búsqueda en la barra lateral', () => {
  test.use({ viewport: VIEWPORTS[0].size });

  for (const query of ['conexiones', 'zzzz']) {
    test(`los resultados de "${query}" no tienen violaciones serias ni críticas de axe`, async ({
      page,
    }) => {
      await page.goto('./temas/salto-personaje/');
      await hydrateAllIslands(page);

      await page.getByRole('searchbox', { name: 'Buscar en el portafolio' }).fill(query);
      await expect(
        page.getByRole('status').filter({ hasText: /Sin resultados|encontrad/ }),
      ).toHaveCount(1);

      await expectNoBlockingViolations(page);
    });
  }
});

/** Opens a lab's settings drawer and waits for the modal to show. */
async function openLabSettings(page: Page, testId: string): Promise<void> {
  const lab = page.getByTestId(testId);
  // Tema 1's lab shows a placeholder while its dataset chunk loads.
  await page
    .locator(`[data-testid="${testId}"], [data-testid="drone-lab-loading"]`)
    .first()
    .scrollIntoViewIfNeeded();
  await expect(lab).toBeVisible();
  await waitForIsland(page, `[data-testid="${testId}"]`);
  await lab.getByRole('button', { name: 'Ajustes del simulador' }).click();
  await expect(page.getByRole('dialog', { name: /^Ajustes: / })).toBeVisible();
}

for (const viewport of VIEWPORTS) {
  for (const theme of THEMES) {
    test.describe(`${viewport.name}, tema ${theme === 'light' ? 'claro' : 'oscuro'}, panel de ajustes abierto`, () => {
      test.use({ viewport: viewport.size, colorScheme: theme });
      test.beforeEach(async ({ page }) => {
        await page.addInitScript((value) => window.localStorage.setItem('theme', value), theme);
      });

      for (const { name, path, testId } of LABS) {
        test(`${name} no tiene violaciones serias ni críticas de axe en ninguna pestaña`, async ({
          page,
        }) => {
          await page.goto(path);
          await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
          await openLabSettings(page, testId);
          await expectNoBlockingViolations(page);

          const dialog = page.getByRole('dialog', { name: /^Ajustes: / });
          await dialog.getByRole('tab', { name: 'Global' }).click();
          await expect(dialog.getByRole('tabpanel', { name: 'Global' })).toBeVisible();
          await expectNoBlockingViolations(page);
        });
      }
    });
  }
}
