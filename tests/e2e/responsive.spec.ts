import { expect, test, type Locator, type Page } from '@playwright/test';
import { setRange, waitForIsland } from './helpers';

const PHONE = { width: 375, height: 812 };
const TOPIC_COUNT = 13;
/** WCAG 2.2 target size (minimum): a drag handle answers anywhere in a 24 × 24 px square. */
const MIN_TARGET_PX = 24;
/** Sub-pixel slack for layout rounding. */
const ROUNDING_PX = 1;
/**
 * Tema 1 opens braking into stop A, where the drone marker sits under A's knob (they overlap at
 * any width). The timeline slider is its equivalent control (WCAG 2.5.8 exception), so the size
 * check moves the drone mid-leg first.
 */
const DRONE_MID_LEG_S = '30';
const LABS = [
  { name: 'tema 1', path: './temas/dron-reparto/', testId: 'drone-lab' },
  { name: 'tema 2', path: './temas/salto-personaje/', testId: 'jump-lab' },
  { name: 'tema 3', path: './temas/gravedad-artificial/', testId: 'habitat-lab' },
  { name: 'tema 4', path: './temas/llantas-f1/', testId: 'tyre-lab' },
  { name: 'tema 5', path: './temas/control-haptico/', testId: 'trigger-lab' },
] as const;

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
}

test.use({ viewport: PHONE });

test('la portada no desborda en horizontal a 375 px', async ({ page }) => {
  await page.goto('./');
  await expectNoHorizontalOverflow(page);
});

test('el tema 2 no desborda en horizontal a 375 px', async ({ page }) => {
  await page.goto('./temas/salto-personaje/');
  await page.getByRole('slider').first().scrollIntoViewIfNeeded();
  await expectNoHorizontalOverflow(page);
});

test('el cajón de temas se abre en móvil y lista los 13 temas', async ({ page }) => {
  await page.goto('./temas/salto-personaje/');
  const nav = page.locator('nav[aria-label="Temas"]');
  const links = nav.getByTestId('topic-link');
  await expect(links.first()).toBeHidden();

  await nav.locator('summary').first().click();

  await expect(links).toHaveCount(TOPIC_COUNT);
  await expect(
    nav.locator('details[data-phase="1"] [data-testid="topic-link"]').first(),
  ).toBeVisible();
  for (const phase of [2, 3]) await nav.locator(`details[data-phase="${phase}"] > summary`).click();
  for (const link of await links.all()) await expect(link).toBeVisible();
});

for (const width of [360, PHONE.width]) {
  test(`con la barra lateral guardada como cerrada, el tema 2 no desborda a ${width} px y conserva el cajón`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: PHONE.height });
    await page.addInitScript(() => window.localStorage.setItem('portafolio.nav.sidebar', 'closed'));
    await page.goto('./temas/salto-personaje/');
    const nav = page.locator('nav[aria-label="Temas"]');

    await expect(page.locator('[data-sidebar-toggle]')).toBeHidden();
    await expect(nav).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await nav.locator('summary').first().click();
    await expect(nav.getByTestId('topic-link').first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
}

async function openLab(page: Page, path: string, testId: string): Promise<Locator> {
  await page.goto(path);
  const lab = page.getByTestId(testId);
  // Tema 1's lab shows a placeholder while its dataset chunk loads.
  await page
    .locator(`[data-testid="${testId}"], [data-testid="drone-lab-loading"]`)
    .first()
    .scrollIntoViewIfNeeded();
  await expect(lab).toBeVisible();
  await waitForIsland(page, `[data-testid="${testId}"]`);
  return lab;
}

/**
 * Points of the 24 × 24 px square centred on the handle's knob that do not reach the handle
 * (empty when the whole square is its hit target). The knob is scrolled to mid-screen first,
 * clear of the sticky bars.
 */
async function missedTargetPoints(handle: Locator): Promise<string[]> {
  const knob = handle.locator('[data-knob]');
  await knob.evaluate((node) => node.scrollIntoView({ block: 'center', behavior: 'instant' }));
  return handle.evaluate(
    (slider, half) => {
      const knobBox = slider.querySelector('[data-knob]')?.getBoundingClientRect();
      if (!knobBox) return ['sin perilla'];
      const cx = knobBox.left + knobBox.width / 2;
      const cy = knobBox.top + knobBox.height / 2;
      const offsets = [-half, 0, half];
      return offsets.flatMap((dx) =>
        offsets.flatMap((dy) => {
          const hit = document.elementFromPoint(cx + dx, cy + dy);
          return hit?.closest('[role="slider"]') === slider ? [] : [`(${dx}, ${dy})`];
        }),
      );
    },
    MIN_TARGET_PX / 2 - ROUNDING_PX,
  );
}

for (const { name, path, testId } of LABS) {
  test.describe(`laboratorio del ${name} a 375 px`, () => {
    test('no desborda en horizontal, ni con el panel de ajustes abierto', async ({ page }) => {
      const lab = await openLab(page, path, testId);
      await expectNoHorizontalOverflow(page);

      await lab.getByRole('button', { name: 'Ajustes del simulador' }).click();
      await expect(page.getByRole('dialog', { name: /^Ajustes: / })).toBeVisible();
      await expectNoHorizontalOverflow(page);
    });

    test('cada manejador y cursor responde en un cuadrado de 24 × 24 px', async ({ page }) => {
      const lab = await openLab(page, path, testId);
      if (testId === 'drone-lab') {
        await setRange(lab.getByRole('slider', { name: 'Línea de tiempo' }), DRONE_MID_LEG_S);
      }
      const handles = await lab.locator('svg [role="slider"]').all();
      expect(handles.length).toBeGreaterThan(0);

      for (const handle of handles) {
        const label = await handle.getAttribute('aria-label');
        expect(await missedTargetPoints(handle), label ?? '').toEqual([]);
      }
    });

    test('las lecturas, las leyendas y los textos de las figuras caben sin recortarse', async ({
      page,
    }) => {
      const lab = await openLab(page, path, testId);
      const clipped = await lab.evaluate((root, slack) => {
        const width = window.innerWidth;
        const out: string[] = [];
        const name = (node: Element) => (node.textContent ?? '').trim().slice(0, 40);
        for (const row of root.querySelectorAll('[data-readout]')) {
          const [label, value] = [...row.children].map((child) => child.getBoundingClientRect());
          const box = row.getBoundingClientRect();
          if (
            label.right > value.left + slack ||
            value.right > box.right + slack ||
            box.right > width
          ) {
            out.push(`lectura: ${name(row)}`);
          }
        }
        for (const item of root.querySelectorAll('ul[aria-label="Leyenda"] li')) {
          const box = item.getBoundingClientRect();
          if (box.left < -slack || box.right > width + slack) out.push(`leyenda: ${name(item)}`);
        }
        for (const text of root.querySelectorAll('svg text')) {
          const svg = (text as SVGTextElement).ownerSVGElement?.getBoundingClientRect();
          const box = text.getBoundingClientRect();
          if (!svg || box.width === 0) continue;
          if (box.left < svg.left - slack || box.right > svg.right + slack) {
            out.push(`texto: ${name(text)}`);
          }
        }
        return out;
      }, ROUNDING_PX);

      expect(clipped).toEqual([]);
    });
  });
}
