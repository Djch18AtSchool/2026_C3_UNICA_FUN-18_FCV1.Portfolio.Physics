import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { hydrateAllIslands, labOrPlaceholder, waitForIsland } from './helpers';
import { TOPIC_PAGES } from './topicPages';

const TOPICS_SCANNED = TOPIC_PAGES.map(({ number, path }) => ({ name: `el tema ${number}`, path }));
const PAGES = [
  { name: 'la portada', path: './' },
  ...TOPICS_SCANNED,
  { name: 'la página 404', path: './no-existe/' },
];
const THEMES = ['light', 'dark'] as const;
/** Wide equations only overflow (and need a keyboard stop) on phones, so scan both widths. */
const VIEWPORTS = [
  { name: 'escritorio', size: { width: 1280, height: 800 } },
  { name: 'móvil', size: { width: 375, height: 812 } },
] as const;
/** Each laboratory, by the LabShell test id its page renders. */
const LABS = TOPIC_PAGES.map(({ number, path, labTestId }) => ({
  name: `el laboratorio del tema ${number}`,
  path,
  testId: labTestId,
}));
const BLOCKING_IMPACTS = ['serious', 'critical'];

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
    test.describe(`${viewport.name}, tema ${theme === 'light' ? 'claro' : 'oscuro'}`, () => {
      test.use({ viewport: viewport.size });
      test.beforeEach(async ({ page }) => {
        await page.addInitScript((value) => window.localStorage.setItem('theme', value), theme);
      });

      for (const { name, path } of PAGES) {
        test(`${name} no tiene violaciones serias ni críticas de axe`, async ({ page }) => {
          await page.goto(path);
          await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
          await hydrateAllIslands(page);

          await expectNoBlockingViolations(page);
        });
      }
    });
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
  await labOrPlaceholder(page, testId).scrollIntoViewIfNeeded();
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

test.describe('móvil, regiones desplazables', () => {
  test.use({ viewport: VIEWPORTS[1].size });

  for (const { name, path } of TOPICS_SCANNED) {
    test(`en ${name} cada región desplazable tiene un nombre único (landmark-unique)`, async ({
      page,
    }) => {
      await page.goto(path);
      await hydrateAllIslands(page);
      // Fonts change the widths: wait until they are in, as the region sync does.
      await page.evaluate(() => document.fonts.ready);

      const names = await page
        .locator('[role="region"][data-scroll-label]')
        .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('aria-label') ?? ''));
      expect(names.length, 'regiones desplazables a 375 px').toBeGreaterThan(0);
      expect(new Set(names).size).toBe(names.length);
      for (const label of names)
        expect(label).toMatch(
          /^(Ecuación \(\d+\.\d+\)|Figura \d+\.\d+|Tabla \d+\.\d+) desplazable$/,
        );

      const { violations } = await new AxeBuilder({ page })
        .withRules(['landmark-unique'])
        .analyze();
      expect(violations.map(({ id, nodes }) => ({ id, count: nodes.length }))).toEqual([]);
    });
  }
});
