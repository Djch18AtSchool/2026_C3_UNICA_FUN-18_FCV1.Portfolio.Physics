import { expect, test, type Locator, type Page } from '@playwright/test';
import { waitForIsland } from './helpers';

const LABS = [
  { path: './temas/dron-reparto/', testId: 'drone-lab' },
  { path: './temas/salto-personaje/', testId: 'jump-lab' },
  { path: './temas/gravedad-artificial/', testId: 'habitat-lab' },
  { path: './temas/llantas-f1/', testId: 'tyre-lab' },
  { path: './temas/control-haptico/', testId: 'trigger-lab' },
] as const;
const VIEWPORTS = [
  { name: '1280', size: { width: 1280, height: 800 } },
  { name: '390', size: { width: 390, height: 844 } },
] as const;
const SCHEMES = ['light', 'dark'] as const;
const TABS = ['Este simulador', 'Global'] as const;
/** Selects that must keep label and control on one row. */
const INLINE_SELECTS = ['Integrador', 'Velocidad', 'Movimiento'] as const;
const SAME_ROW_TOLERANCE_PX = 6;
const SUBPIXEL_PX = 1;

interface SelectMetrics {
  label: string;
  selected: string;
  left: number;
  right: number;
  centerY: number;
  labelCenterY: number;
  dialogLeft: number;
  dialogRight: number;
  scrollOverflow: number;
  textWidth: number;
  textRoom: number;
}

/** Choose the longest option of a select and read where it and its label end up. */
async function selectLongestAndMeasure(select: Locator): Promise<SelectMetrics> {
  const longest = await select.evaluate((node) => {
    const options = Array.from((node as HTMLSelectElement).options);
    return options.reduce((best, option) => (option.text.length > best.text.length ? option : best))
      .value;
  });
  await select.selectOption(longest);
  return select.evaluate((node) => {
    const element = node as HTMLSelectElement;
    const dialog = element.closest('dialog') as HTMLDialogElement;
    const labelNode = document.querySelector(`label[for="${element.id}"]`) as HTMLElement;
    const rect = element.getBoundingClientRect();
    const labelRect = labelNode.getBoundingClientRect();
    const dialogRect = dialog.getBoundingClientRect();
    const style = getComputedStyle(element);
    const context = document.createElement('canvas').getContext('2d') as CanvasRenderingContext2D;
    context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const selected = element.selectedOptions[0].text;
    const padding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
    const borders = parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth);
    return {
      label: labelNode.textContent ?? '',
      selected,
      left: rect.left,
      right: rect.right,
      centerY: rect.top + rect.height / 2,
      labelCenterY: labelRect.top + labelRect.height / 2,
      dialogLeft: dialogRect.left,
      dialogRight: dialogRect.right,
      scrollOverflow: dialog.scrollWidth - dialog.clientWidth,
      textWidth: context.measureText(selected).width,
      textRoom: rect.width - padding - borders,
    };
  });
}

async function openSettings(page: Page, testId: string): Promise<Locator> {
  const lab = page.getByTestId(testId);
  await page
    .locator(`[data-testid="${testId}"], [data-testid="drone-lab-loading"]`)
    .first()
    .scrollIntoViewIfNeeded();
  await expect(lab).toBeVisible();
  await waitForIsland(page, `[data-testid="${testId}"]`);
  await lab.getByRole('button', { name: 'Ajustes del simulador' }).click();
  const dialog = page.getByRole('dialog', { name: /^Ajustes: / });
  await expect(dialog).toBeVisible();
  return dialog;
}

for (const viewport of VIEWPORTS) {
  for (const scheme of SCHEMES) {
    test.describe(`selects de ajustes a ${viewport.name} px, ${scheme}`, () => {
      test.use({ viewport: viewport.size, colorScheme: scheme });

      for (const lab of LABS) {
        test(`${lab.testId}: caben en el cajón con la opción más larga a la vista`, async ({
          page,
        }) => {
          await page.goto(lab.path);
          const dialog = await openSettings(page, lab.testId);
          let checked = 0;

          for (const tabName of TABS) {
            await dialog.getByRole('tab', { name: tabName }).click();
            const panel = dialog.getByRole('tabpanel', { name: tabName });
            const selects = panel.locator('select');
            for (let index = 0; index < (await selects.count()); index += 1) {
              const metrics = await selectLongestAndMeasure(selects.nth(index));
              const where = `${tabName} / ${metrics.label}: «${metrics.selected}»`;
              expect(metrics.scrollOverflow, `${where} desborda el cajón`).toBeLessThanOrEqual(0);
              expect(metrics.left, `${where} sale por la izquierda`).toBeGreaterThanOrEqual(
                metrics.dialogLeft - SUBPIXEL_PX,
              );
              expect(metrics.right, `${where} sale por la derecha`).toBeLessThanOrEqual(
                metrics.dialogRight + SUBPIXEL_PX,
              );
              expect(metrics.textWidth, `${where} recorta el texto`).toBeLessThanOrEqual(
                metrics.textRoom + SUBPIXEL_PX,
              );
              if (INLINE_SELECTS.includes(metrics.label as (typeof INLINE_SELECTS)[number])) {
                expect(
                  Math.abs(metrics.centerY - metrics.labelCenterY),
                  `${where} debería seguir en línea con su etiqueta`,
                ).toBeLessThanOrEqual(SAME_ROW_TOLERANCE_PX);
              }
              checked += 1;
            }
          }

          expect(checked).toBeGreaterThan(0);
          for (const tabName of TABS) {
            await dialog.getByRole('tab', { name: tabName }).click();
            const strays = await dialog.evaluate((node) => {
              const limit = node.getBoundingClientRect().right + 1;
              return Array.from(node.querySelectorAll('*'))
                .filter((element) => element.getBoundingClientRect().right > limit)
                .map((element) => element.tagName + '#' + element.id);
            });
            expect(strays, `${tabName}: elementos fuera del cajón`).toEqual([]);
          }
        });
      }
    });
  }
}
