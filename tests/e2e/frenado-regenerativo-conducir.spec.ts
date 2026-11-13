import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { describeReport, measureGlyphs, openFontSession, settle } from './glyphKit';
import { readoutText as readReadout, waitForIsland } from './helpers';

/*
 * Tema 6, «Conducir» (D3): the reader drives the stretch of «Tramo» with the brake and the
 * accelerator, against the cycle's own car. Keys, pointer, release on blur, the comparison, the
 * summary said on pause and at the end, no JavaScript, both themes, 360 and 1 280 px. Every wait is
 * on a condition.
 */

const PAGE = './temas/frenado-regenerativo/';
const LAB = '[data-testid="regen-lab"]';
const PHONE = { width: 360, height: 800 };
const DESKTOP = { width: 1280, height: 800 };
const THEMES = ['light', 'dark'] as const;
const BLOCKING_IMPACTS = ['serious', 'critical'];
const SETTINGS = /^Ajustes: /;
const VIEW_DRIVE = 'Conducir: el tramo con tus pedales';
/** Every control of the lab measures 40 px high (README, «Escala de medidas»). */
const CONTROL_HEIGHT_PX = 40;
/** A pedal held this deep is clearly down (it reaches the floor in 2 s). */
const DOWN_DEPTH = 0.2;
/** Generous waits for real-time playback (the stretch lasts 26 s at 1×). */
const DRIVE_TIMEOUT_MS = 10_000;
const RUN_TIMEOUT_MS = 30_000;
const SPEED = 'Velocidad v';
const BATTERY = 'Energía a la batería en tu conducción $E_\\text{batería}$';
const REFERENCE = 'Recuperado en el tramo del UDDS, % del frenado en las ruedas';

const readoutText = (page: Page, label: string) => readReadout(page, LAB, label);
const kmh = async (page: Page) =>
  Number.parseFloat((await readoutText(page, SPEED)).replace(',', '.'));
const pedalOf = (lab: Locator, name: 'Freno' | 'Acelerador') =>
  lab.getByRole('group', { name: 'Pedales' }).getByRole('button', { name });
/** A pedal's drawn depth (0 at rest, 1 on the floor), from its fill's scaleX. */
const depthOf = (lab: Locator, id: 'brake' | 'throttle') =>
  lab
    .locator(`[data-pedal="${id}"] [data-pedal-depth]`)
    .evaluate((node) =>
      Number(/scaleX\(([\d.]+)\)/.exec((node as HTMLElement).style.transform)?.[1] ?? 0),
    );
const statusOf = (lab: Locator) => lab.getByTestId('drive-status');
/** A car's x on the road: the drawn translation (the ghost carries no data-x). */
const xOf = (lab: Locator, testId: string) =>
  lab
    .getByTestId(testId)
    .evaluate((node) =>
      Number(/translate\(([-\d.]+)/.exec(node.getAttribute('transform') ?? '')?.[1]),
    );

/** Opens the lab and picks «Conducir» in the drawer with the keyboard. */
async function openDrive(page: Page): Promise<Locator> {
  await page.goto(PAGE);
  const lab = page.locator(LAB);
  await lab.scrollIntoViewIfNeeded();
  await waitForIsland(page, LAB);
  await lab.getByRole('button', { name: 'Ajustes del simulador' }).click();
  const dialog = page.getByRole('dialog', { name: SETTINGS });
  await dialog.getByRole('combobox', { name: 'Vista' }).selectOption({ label: VIEW_DRIVE });
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(lab.getByRole('group', { name: 'Pedales' })).toBeVisible();
  return lab;
}

test.describe('Conducir', () => {
  test('↓ con un pedal enfocado arranca y frena; al soltar, el pedal vuelve', async ({ page }) => {
    const lab = await openDrive(page);
    await pedalOf(lab, 'Freno').focus();

    await page.keyboard.down('ArrowDown');
    await expect(lab).toHaveAttribute('data-playing', 'true');
    await expect
      .poll(() => depthOf(lab, 'brake'), { timeout: DRIVE_TIMEOUT_MS })
      .toBeGreaterThan(DOWN_DEPTH);
    await expect.poll(() => kmh(page), { timeout: DRIVE_TIMEOUT_MS }).toBeLessThan(50);
    await page.keyboard.up('ArrowDown');

    await expect.poll(() => depthOf(lab, 'brake'), { timeout: DRIVE_TIMEOUT_MS }).toBe(0);
    expect(await readoutText(page, BATTERY)).not.toBe('0,0 kJ');
  });

  test('el acelerador mantenido con el puntero adelanta al auto del ciclo; al soltar, vuelve', async ({
    page,
  }) => {
    const lab = await openDrive(page);
    // hover scrolls the pedal into view and checks that the pointer lands on it (not on the
    // transport pinned at the window's bottom).
    await pedalOf(lab, 'Acelerador').hover();
    await page.mouse.down();
    await expect(lab).toHaveAttribute('data-playing', 'true');
    await expect
      .poll(async () => (await xOf(lab, 'regen-car')) - (await xOf(lab, 'regen-ghost')), {
        timeout: DRIVE_TIMEOUT_MS,
      })
      .toBeGreaterThan(1);
    await page.mouse.up();

    await expect.poll(() => depthOf(lab, 'throttle'), { timeout: DRIVE_TIMEOUT_MS }).toBe(0);
  });

  test('si el foco sale de los pedales con la tecla aún pulsada, el pedal se suelta', async ({
    page,
  }) => {
    const lab = await openDrive(page);
    await pedalOf(lab, 'Acelerador').focus();
    await page.keyboard.down('ArrowUp');
    await expect
      .poll(() => depthOf(lab, 'throttle'), { timeout: DRIVE_TIMEOUT_MS })
      .toBeGreaterThan(DOWN_DEPTH);

    await lab.getByRole('button', { name: 'Restablecer' }).focus();

    await expect.poll(() => depthOf(lab, 'throttle'), { timeout: DRIVE_TIMEOUT_MS }).toBe(0);
    await page.keyboard.up('ArrowUp');
  });

  test('el orden de foco va de los pedales a la leyenda de la gráfica (una parada) y a la reproducción', async ({
    page,
  }) => {
    const lab = await openDrive(page);
    const legend = lab
      .getByTestId('drive-speed-plot')
      .getByRole('toolbar', { name: 'Leyenda: realzar una serie' });
    await pedalOf(lab, 'Freno').focus();

    await page.keyboard.press('Tab');
    await expect(pedalOf(lab, 'Acelerador')).toBeFocused();
    // The plot's legend is one stop (R32): its first entry; the arrows move within it.
    await page.keyboard.press('Tab');
    await expect(legend.getByRole('button').first()).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(legend.getByRole('button').nth(1)).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(lab.getByRole('button', { name: 'Reproducir' })).toBeFocused();
  });

  test('la comparación con el ciclo real se ve: fantasma, línea, gráfica con leyenda y lectura', async ({
    page,
  }) => {
    const lab = await openDrive(page);
    const plot = lab.getByTestId('drive-speed-plot');

    await expect(lab.getByTestId('regen-ghost')).toHaveCount(1);
    await expect(lab.getByTestId('regen-stop-line')).toHaveCount(1);
    await expect(plot).toContainText('Tu conducción');
    await expect(plot).toContainText('Auto del UDDS (dato real)');
    expect(await readoutText(page, REFERENCE)).toBe('0,0 %');
    await expect(lab.getByTestId('drive-canvas-note')).toContainText('contorno discontinuo');
  });

  test('al pausar, un resumen en la región de estado (y nada mientras conduce)', async ({
    page,
  }) => {
    const lab = await openDrive(page);
    const status = statusOf(lab);
    await expect(status).toHaveAttribute('role', 'status');
    await pedalOf(lab, 'Freno').focus();
    await page.keyboard.down('ArrowDown');
    await expect
      .poll(() => depthOf(lab, 'brake'), { timeout: DRIVE_TIMEOUT_MS })
      .toBeGreaterThan(DOWN_DEPTH);
    // Driving says nothing until a limit or the end: the hint went away when the run started.
    await expect(status).toHaveText('');
    await page.keyboard.up('ArrowDown');

    await lab.getByRole('button', { name: 'Pausar' }).click();

    await expect(status).toHaveText(/^En pausa en t = 37\d,\d\d\ss: llevas \d+\sm/u);
    await expect(status).toContainText('A la batería llegaron');
  });

  test('al terminar el tramo, el resumen compara con el UDDS: 75,0 %', async ({ page }) => {
    test.setTimeout(RUN_TIMEOUT_MS * 2);
    const lab = await openDrive(page);
    // Four times faster: the 26 s stretch in 6,5 s (the badge says so).
    await lab.getByRole('button', { name: 'Ajustes del simulador' }).click();
    const dialog = page.getByRole('dialog', { name: SETTINGS });
    await dialog.getByRole('combobox', { name: /^Velocidad/ }).selectOption('4');
    await page.keyboard.press('Escape');
    await pedalOf(lab, 'Freno').focus();

    await page.keyboard.down('ArrowDown');
    await expect.poll(() => kmh(page), { timeout: DRIVE_TIMEOUT_MS }).toBe(0);
    await page.keyboard.up('ArrowDown');

    await expect(lab).toHaveAttribute('data-playing', 'false', { timeout: RUN_TIMEOUT_MS });
    await expect(statusOf(lab)).toHaveText(/^Fin del tramo: recorriste \d+\sm y te detuviste/u);
    await expect(statusOf(lab)).toContainText(
      /el auto del UDDS en el tramo: 168,1\skJ y 75,0\s%\.$/u,
    );
    expect(await readoutText(page, REFERENCE)).toBe('75,0 %');
  });

  test('sin JavaScript el servidor pinta «Tramo», sin pedales', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(PAGE);
    const lab = page.locator(LAB);

    await expect(lab.locator('[data-lab-canvas] [data-time-scale-badge]')).toHaveText(
      /^×1\s*velocidad real$/u,
    );
    await expect(lab.getByRole('group', { name: 'Pedales' })).toHaveCount(0);
    await expect(lab.getByTestId('regen-ghost')).toHaveCount(0);
    await context.close();
  });
});

for (const viewport of [DESKTOP, PHONE]) {
  test.describe(`a ${viewport.width} px`, () => {
    test.use({ viewport });

    test('pedales de 40 px, dentro del lienzo, y rótulos de la carretera sin choques', async ({
      page,
    }) => {
      const lab = await openDrive(page);
      const canvas = await lab.locator('[data-lab-canvas]').boundingBox();
      for (const name of ['Freno', 'Acelerador'] as const) {
        const box = await pedalOf(lab, name).boundingBox();
        expect(box?.height, name).toBeGreaterThanOrEqual(CONTROL_HEIGHT_PX);
        expect(
          box && canvas && box.x >= canvas.x && box.x + box.width <= canvas.x + canvas.width,
        ).toBe(true);
      }
      const labels = await lab
        .getByTestId('regen-scene')
        .locator('svg text')
        .evaluateAll((nodes) =>
          nodes
            .map((node) => node.getBoundingClientRect())
            .filter((box) => box.width > 0)
            .map(({ left, right, top, bottom }) => ({ left, right, top, bottom })),
        );
      const overlaps = labels.flatMap((a, i) =>
        labels
          .slice(i + 1)
          .filter(
            (b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom,
          ),
      );
      expect(overlaps).toEqual([]);
    });

    for (const theme of THEMES) {
      test(`tema ${theme === 'light' ? 'claro' : 'oscuro'}: axe y glifos con un resumen a la vista`, async ({
        page,
      }) => {
        await page.addInitScript((value) => window.localStorage.setItem('theme', value), theme);
        const lab = await openDrive(page);
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
        await pedalOf(lab, 'Freno').focus();
        await page.keyboard.down('ArrowDown');
        await expect
          .poll(() => depthOf(lab, 'brake'), { timeout: DRIVE_TIMEOUT_MS })
          .toBeGreaterThan(DOWN_DEPTH);
        await page.keyboard.up('ArrowDown');
        await lab.getByRole('button', { name: 'Pausar' }).click();
        await expect(statusOf(lab)).toHaveText(/^En pausa/);
        await settle(page);

        const { violations } = await new AxeBuilder({ page }).include(LAB).analyze();
        const blocking = violations.filter(({ impact }) => BLOCKING_IMPACTS.includes(impact ?? ''));
        expect(blocking.map(({ id, nodes }) => `${id}: ${nodes.length}`)).toEqual([]);
        const report = await measureGlyphs(page, await openFontSession(page), LAB);
        expect(describeReport(report, LAB)).toEqual([]);
      });
    }
  });
}
