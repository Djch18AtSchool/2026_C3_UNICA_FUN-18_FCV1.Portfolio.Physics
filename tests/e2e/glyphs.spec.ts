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
import {
  describeReport,
  measureGlyphs,
  openFontSession,
  requireStates,
  settle,
  type StateStep,
} from './glyphKit';
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

/** The only lab without presets: its dynamic text comes from editing the route (see EXTRA_STATES). */
const LAB_WITHOUT_PRESETS = 'dron-reparto';

/** Labs that show text only in some states, beyond their presets: [state name, how to reach it]. */
const EXTRA_STATES: Readonly<Record<string, readonly [string, StateStep][]>> = {
  'dron-reparto': [
    [
      'ruta modificada (parada C movida con el teclado)',
      async (page, lab) => {
        await lab.getByTestId('stop-C').focus();
        await page.keyboard.press('Shift+ArrowLeft');
        await expect(lab.getByTestId('route-modified')).toBeVisible();
      },
    ],
  ],
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

/** Steps that choose each option of a select, by value. */
async function optionSteps(select: Locator): Promise<[string, StateStep][]> {
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

/**
 * The presets of a lab, as steps: the chips of LabPresets' group, or the options of its select
 * (more than four presets, in <optgroup>s or not).
 */
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
  const select = lab.locator('[data-lab-presets="select"] select');
  return (await select.count()) > 0 ? optionSteps(select) : [];
}

/** A tiered lab's two disclosures, opened: their text is measured drawn, not only as characters. */
const notesOpen: StateStep = async (_page, lab) => {
  const summaries = lab.locator('details[data-lab-note] > summary');
  for (const summary of await summaries.all()) await summary.click();
  await expect(lab.locator('details[data-lab-note]:not([open])')).toHaveCount(0);
};

/**
 * States every lab of the shell has, beyond its own: its disclosures opened. A lab without them
 * fails (a renamed data-lab-note must not drop the measure in silence), and so does a lab that is
 * not on the shell at all.
 */
async function shellStates(slug: string, lab: Locator): Promise<[string, StateStep][]> {
  await expect(lab, `${slug}: el laboratorio va en LabShell`).toHaveAttribute(
    'data-lab-shell',
    'tiered',
  );
  const hasNotes = (await lab.locator('details[data-lab-note]').count()) > 0;
  const states: [string, StateStep][] = hasNotes
    ? [['«Cómo se usa» y «Qué deja fuera el modelo» abiertos', notesOpen]]
    : [];
  return [...requireStates(`${slug} (desplegables del diseño por niveles)`, states)];
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
            failures.push(...describeReport(report, root).map((line) => `[${state}] ${line}`));
          };

          await measure('estado inicial');
          if (labTestId) {
            const lab = page.getByTestId(labTestId);
            const root = `[data-testid="${labTestId}"]`;
            await lab.scrollIntoViewIfNeeded();
            const presets = await presetSteps(lab);
            // A renamed group or select must fail the guard, not silently empty it.
            if (slug !== LAB_WITHOUT_PRESETS) requireStates(`${slug} (preajustes)`, presets);
            const states = requireStates(slug, [
              ...presets,
              ...(EXTRA_STATES[slug] ?? []),
              ...(await shellStates(slug, lab)),
            ]);
            for (const [state, step] of states) {
              await step(page, lab);
              await measure(state, root);
            }
            await settingsOpen(page, lab);
            // Every tab of the drawer, not only the one that opens; a renamed tab role fails here.
            const dialog = page.getByRole('dialog');
            const tabs = requireStates(
              `${slug} (pestañas del cajón)`,
              await dialog.getByRole('tab').all(),
            );
            for (const tab of tabs) {
              await tab.click();
              await measure(`ajustes, pestaña «${(await tab.textContent())?.trim()}»`);
            }
            await settingsClose(page, lab);
          }

          expect(failures).toEqual([]);
        });
      }
    });
  }
}
