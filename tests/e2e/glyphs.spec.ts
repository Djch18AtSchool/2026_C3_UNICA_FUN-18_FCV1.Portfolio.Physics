/**
 * The glyph guard (ruling R4): in the nine topic pages and the cover, at 1 280 and 360 px, light
 * and dark, no text outside KaTeX holds a character IBM Plex does not draw or a notation mark left
 * raw (`_`, `^`, `$`), and the fonts the browser really used (CSS.getPlatformFontsForNode) are only
 * IBM Plex Sans, IBM Plex Mono and KaTeX_*: never a system font. The second check is the one that
 * sees KaTeX_Main falling back to Times for ω, θ or π, which a declared-family check cannot.
 * Each lab is measured as it opens and again after each of its presets and its other states.
 */
import { expect, test, type Locator } from '@playwright/test';
import { hydrateAllIslands, setRange } from './helpers';
import { describeReport, measureGlyphs, openFontSession, settle, type StateStep } from './glyphKit';
import { TOPIC_PAGES } from './topicPages';

const VIEWPORTS = [
  { name: '1280 px', width: 1280, height: 900 },
  { name: '360 px', width: 360, height: 800 },
] as const;
const SCHEMES = ['light', 'dark'] as const;
const PAGES = [
  { slug: 'portada', path: './', labTestId: undefined },
  ...TOPIC_PAGES.map(({ slug, path, labTestId }) => ({ slug, path, labTestId })),
];
const LAB_STATE_TIMEOUT_MS = 120_000;
const OVER_LIMIT_SHARE = 500;

const gear = (lab: Locator) => lab.getByRole('button', { name: 'Ajustes del simulador' });

/** The settings drawer open, then closed again. */
const settingsOpen: StateStep = async (page, lab) => {
  await gear(lab).click();
  await expect(page.getByRole('dialog')).toBeVisible();
};
const settingsClose: StateStep = async (page) => {
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
};

/** Labs that show text only in some states, beyond their presets: [state name, how to reach it]. */
const EXTRA_STATES: Readonly<Record<string, readonly [string, StateStep][]>> = {
  'gravedad-artificial': [
    [
      'Fijar 1 g',
      async (_page, lab) => {
        await lab.getByRole('switch', { name: 'Fijar 1 g' }).check({ force: true });
      },
    ],
  ],
  'coeficiente-restitucion': [
    [
      'choque de dos cuerpos',
      async (_page, lab) => {
        await lab.getByRole('button', { name: 'Choque de dos cuerpos' }).click();
      },
    ],
  ],
  'ruedas-reaccion': [
    [
      'maniobra por encima del límite (el medidor excede L_máx)',
      async (page, lab) => {
        await lab.getByRole('button', { name: /^90° en 60 s/ }).click();
        const field = lab.getByRole('textbox', { name: /^Duración de la maniobra T/ });
        await field.fill('8');
        await field.press('Enter');
        // T = 8 s is below T_min: the warning is the sign that the field was committed.
        await expect(lab.getByRole('status')).toContainText(/la rueda no alcanza/i);
        await setRange(
          lab.getByRole('slider', { name: 'Línea de tiempo' }),
          String(OVER_LIMIT_SHARE),
        );
        await expect(lab.getByTestId('momentum-gauge')).toHaveAttribute('data-exceeds', 'true');
        await settle(page);
      },
    ],
    [
      'perturbación y descarga',
      async (_page, lab) => {
        await lab.getByRole('radio', { name: 'Perturbación y descarga' }).check({ force: true });
      },
    ],
    [
      'descarga con propulsor',
      async (_page, lab) => {
        await lab.getByRole('radio', { name: 'Propulsor' }).check({ force: true });
        await lab.getByRole('button', { name: 'Ir a la descarga' }).click();
      },
    ],
  ],
};

/** The presets of a lab, as steps: buttons of the Presets control, or the options of its select. */
async function presetSteps(lab: Locator): Promise<[string, StateStep][]> {
  const buttons = lab.getByRole('group', { name: 'Valores de referencia' }).getByRole('button');
  const count = await buttons.count();
  if (count > 0) {
    return Promise.all(
      Array.from({ length: count }, async (_, index): Promise<[string, StateStep]> => {
        const label = ((await buttons.nth(index).textContent()) ?? `preajuste ${index}`).trim();
        return [`preajuste «${label}»`, async () => buttons.nth(index).click()];
      }),
    );
  }
  const select = lab.locator('#bounce-preset');
  if ((await select.count()) === 0) return [];
  const values = await select
    .locator('option:not([disabled])')
    .evaluateAll((options) => options.map((option) => (option as HTMLOptionElement).value));
  return values.map((value): [string, StateStep] => [
    `preajuste ${value}`,
    async () => {
      await select.selectOption(value);
    },
  ]);
}

for (const colorScheme of SCHEMES) {
  for (const viewport of VIEWPORTS) {
    test.describe(`${viewport.name}, ${colorScheme}`, () => {
      test.use({ colorScheme, viewport: { width: viewport.width, height: viewport.height } });

      for (const { slug, path, labTestId } of PAGES) {
        test(`${slug}: solo glifos de Plex y KaTeX, en sus fuentes`, async ({ page }) => {
          test.setTimeout(LAB_STATE_TIMEOUT_MS);
          await page.goto(path);
          await hydrateAllIslands(page);
          await page.evaluate(() => document.fonts.ready);
          const cdp = await openFontSession(page);
          const failures: string[] = [];
          const measure = async (state: string, root = 'body') => {
            await settle(page);
            const report = await measureGlyphs(page, cdp, root);
            failures.push(...describeReport(report).map((line) => `[${state}] ${line}`));
          };

          await measure('estado inicial');
          if (labTestId) {
            const lab = page.getByTestId(labTestId);
            const root = `[data-testid="${labTestId}"]`;
            await lab.scrollIntoViewIfNeeded();
            for (const [state, step] of [
              ...(await presetSteps(lab)),
              ...(EXTRA_STATES[slug] ?? []),
            ]) {
              await step(page, lab);
              await measure(state, root);
            }
            await settingsOpen(page, lab);
            await measure('ajustes abiertos', 'body');
            await settingsClose(page, lab);
          }

          expect(failures).toEqual([]);
        });
      }
    });
  }
}
