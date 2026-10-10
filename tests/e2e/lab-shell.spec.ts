import { expect, test, type Locator, type Page } from '@playwright/test';
import { waitForIsland } from './helpers';

const DESKTOP = { width: 1280, height: 800 };
const JUMP_PAGE = './temas/salto-personaje/';
const JUMP_LAB = 'jump-lab';
const LABS = [
  { path: './temas/dron-reparto/', testId: 'drone-lab' },
  { path: JUMP_PAGE, testId: JUMP_LAB },
  { path: './temas/gravedad-artificial/', testId: 'habitat-lab' },
  { path: './temas/llantas-f1/', testId: 'tyre-lab' },
  { path: './temas/control-haptico/', testId: 'trigger-lab' },
] as const;
const SETTINGS_TITLE = /^Ajustes: /;
const WHEEL_PX = 400;
/** LabShell's READOUT_ANNOUNCE_DELAY_MS: readouts are spoken once still for this long. */
const READOUT_SETTLE_MS = 750;

test.use({ viewport: DESKTOP });

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

test('el panel de ajustes bloquea el desplazamiento sin mover la página y lo devuelve al cerrar', async ({
  page,
}) => {
  const lab = await openLab(page, JUMP_PAGE, JUMP_LAB);
  const gear = lab.getByRole('button', { name: 'Ajustes del simulador' });
  const articleLeft = () =>
    page
      .locator('article')
      .first()
      .evaluate((node) => node.getBoundingClientRect().left);
  const before = await articleLeft();

  await gear.click();
  await expect(page.getByRole('dialog', { name: SETTINGS_TITLE })).toBeVisible();
  const scrollWhileOpen = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, WHEEL_PX);

  await expect(page.locator('html')).toHaveCSS('overflow-y', 'hidden');
  expect(await articleLeft()).toBe(before);
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollWhileOpen);

  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: SETTINGS_TITLE })).toBeHidden();
  await expect(page.locator('html')).not.toHaveCSS('overflow-y', 'hidden');
  await expect(gear).toBeFocused();
});

test('un decimal elegido en el salto rige también las lecturas del hábitat', async ({ page }) => {
  const jump = await openLab(page, JUMP_PAGE, JUMP_LAB);
  await jump.getByRole('button', { name: 'Ajustes del simulador' }).click();
  const dialog = page.getByRole('dialog', { name: SETTINGS_TITLE });
  await dialog.getByRole('tab', { name: 'Global' }).click();
  await dialog.getByText('1', { exact: true }).click();
  await page.keyboard.press('Escape');

  const habitat = await openLab(page, './temas/gravedad-artificial/', 'habitat-lab');
  for (const label of ['Velocidad angular ω', 'Velocidad tangencial v', 'Período T']) {
    const value = habitat
      .locator('div', { has: page.getByText(label, { exact: true }) })
      .last()
      .locator('span')
      .last();
    await expect(value).toHaveText(/^\d+,\d\s\S+$/);
  }
});

test('el título del panel solo es un encabezado mientras el panel está abierto', async ({
  page,
}) => {
  const lab = await openLab(page, JUMP_PAGE, JUMP_LAB);

  await expect(page.getByRole('heading', { name: SETTINGS_TITLE })).toHaveCount(0);
  await lab.getByRole('button', { name: 'Ajustes del simulador' }).click();
  await expect(page.getByRole('heading', { name: SETTINGS_TITLE })).toHaveCount(1);
});

test('la búsqueda no indexa el título del panel de ajustes', async ({ page }) => {
  await page.goto(JUMP_PAGE);
  await waitForIsland(page, 'input[type="search"]');

  await page.getByRole('searchbox', { name: 'Buscar en el portafolio' }).fill('Ajustes');

  await expect(page.getByRole('status').filter({ hasText: 'Sin resultados' })).toHaveCount(1);
});

test('las lecturas se anuncian una vez quietas, no en cada pulsación', async ({ page }) => {
  const lab = await openLab(page, JUMP_PAGE, JUMP_LAB);
  const announcer = lab.getByTestId('readout-announcer');
  await expect(announcer).toHaveAttribute('aria-live', 'polite');
  await expect(announcer).toHaveText('');

  const handle = lab.getByTestId('launch-handle');
  await handle.focus();
  const pressedAt = Date.now();
  await handle.press('ArrowUp');
  // One read, no retries: still inside the settle window, nothing has been announced yet.
  const early = (await announcer.textContent()) ?? '';
  const readAfterMs = Date.now() - pressedAt;
  if (readAfterMs < READOUT_SETTLE_MS) expect(early).toBe('');

  await expect.poll(async () => (await announcer.textContent()) ?? '').toContain('Altura máxima:');
  expect(Date.now() - pressedAt).toBeGreaterThanOrEqual(READOUT_SETTLE_MS);
});

for (const { path, testId } of LABS) {
  test(`cada manejador de ${testId} muestra el anillo de foco con el teclado`, async ({ page }) => {
    const lab = await openLab(page, path, testId);
    const handles = await lab.locator('svg [role="slider"]').all();
    expect(handles.length).toBeGreaterThan(0);

    for (const handle of handles) {
      const name = (await handle.getAttribute('aria-label')) ?? '';
      expect(name.length, 'nombre accesible').toBeGreaterThan(0);
      expect(await handle.getAttribute('aria-valuetext'), name).toBeTruthy();
      // A key press first, so the browser treats the scripted focus as keyboard focus.
      await page.keyboard.press('Shift');
      await handle.focus();
      const ring = handle.locator('circle[stroke="var(--accent)"]');
      await expect(ring, name).toHaveCSS('opacity', '1');
    }
  });
}
