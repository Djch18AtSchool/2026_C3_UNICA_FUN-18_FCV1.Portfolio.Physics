/**
 * Tema 10's laboratory in the browser: the prescribed simulation runs in the page, its controls
 * recompute the spring, «Interrumpir» keeps the spring's x and v while the fixed-duration curve
 * starts again from rest (Review Focus 4), b = 0 reads «Sin amortiguar» and settles «nunca»
 * (Review Focus 3), and reduced motion opens on the final frame.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { mathSource, readoutText, seekTimeline, waitForIsland } from './helpers';

const PAGE = './temas/animaciones-resorte/';
const LAB = '[data-testid="spring-lab"]';
/** The timeline's position of 0,2 s in Motion's default run of 3 s (1 000 positions). */
const MID_FLIGHT = '67';
const PHONE = { width: 360, height: 800 };

async function openLab(page: Page): Promise<Locator> {
  await page.goto(PAGE);
  const lab = page.getByTestId('spring-lab');
  await lab.scrollIntoViewIfNeeded();
  await waitForIsland(page, LAB);
  return lab;
}

const readout = (page: Page, label: string) => readoutText(page, LAB, label);
const timeline = (lab: Locator) => lab.getByRole('slider', { name: 'Línea de tiempo' });
const interrupt = (lab: Locator) => lab.getByRole('button', { name: 'Interrumpir' });

test.describe('Tema 10, laboratorio del resorte', () => {
  test('carga los cinco preajustes, cada uno dice si es del producto o ilustrativo', async ({
    page,
  }) => {
    const lab = await openLab(page);
    const options = lab.getByRole('combobox', { name: 'Valores de referencia' }).locator('option');

    await expect(options).toHaveText([
      'Motion, por omisión (producto)',
      'Motion, posición x e y (producto)',
      'Motion, escala hacia 0 (producto)',
      'Apple, ejemplo de la documentación (producto)',
      'Sobreamortiguado (ilustrativo)',
    ]);
    await expect(lab.getByTestId('spring-regime')).toHaveAttribute('data-regime', 'subamortiguado');
    await expect(lab.getByTestId('card-spring')).toBeVisible();
    await expect(lab.getByTestId('card-bezier')).toBeVisible();
  });

  test('mover b recalcula: con b = 0 dice «Sin amortiguar» y que no se asienta nunca', async ({
    page,
  }) => {
    const lab = await openLab(page);
    const field = lab.getByRole('textbox', { name: /^Amortiguamiento b/ });

    await field.fill('0');
    await field.press('Enter');

    await expect(lab.getByTestId('spring-regime')).toHaveAttribute('data-regime', 'sin-amortiguar');
    await expect(lab.getByTestId('summary-settling')).toContainText(/^nunca/);
    expect(await readout(page, 'Sobrepaso previsto $M_p$')).toBe('100,00 %');
  });

  test('«Interrumpir» a mitad de camino: el resorte conserva v y la curva arranca en reposo', async ({
    page,
  }) => {
    const lab = await openLab(page);
    await expect(interrupt(lab)).toBeDisabled();
    await seekTimeline(timeline(lab), MID_FLIGHT);
    const before = await readout(page, 'Velocidad del resorte $v$');

    await interrupt(lab).click();

    await expect.poll(() => readout(page, 'Destino $x_\\text{obj}$')).toBe('100 px');
    expect(await readout(page, 'Velocidad del resorte $v$')).toBe(before);
    expect(await readout(page, 'Velocidad de la curva $v$')).toBe('0 px/s');
    expect(await mathSource(lab.getByTestId('summary-jump'))).toMatch(/el resorte sigue a/);
  });

  test('pulsada dos veces mientras corre, la animación sigue y vuelve al destino de partida', async ({
    page,
  }) => {
    const lab = await openLab(page);
    await lab.getByRole('button', { name: 'Reproducir' }).click();
    await expect(interrupt(lab)).toBeEnabled();

    await interrupt(lab).click();
    await interrupt(lab).click();

    await expect(lab).toHaveAttribute('data-playing', 'true');
    await expect.poll(() => readout(page, 'Destino $x_\\text{obj}$')).toBe('1 000 px');
    await expect(lab).toHaveAttribute('data-playing', 'false', { timeout: 10_000 });
    expect(await readout(page, 'Posición del resorte $x$')).toMatch(/^(999,\d|1 000,\d) px$/);
  });

  test('con el teclado: Tab llega a «Interrumpir» desde los parámetros y Enter lo pulsa', async ({
    page,
  }) => {
    const lab = await openLab(page);
    await seekTimeline(timeline(lab), MID_FLIGHT);
    await lab.getByRole('slider', { name: /^Masa m/ }).focus();

    for (let press = 0; press < 6; press += 1) {
      if (await interrupt(lab).evaluate((node) => node === document.activeElement)) break;
      await page.keyboard.press('Tab');
    }
    await expect(interrupt(lab)).toBeFocused();
    await page.keyboard.press('Enter');

    await expect.poll(() => readout(page, 'Destino $x_\\text{obj}$')).toBe('100 px');
  });
});

test.describe('Tema 10 con movimiento reducido', () => {
  test.use({ reducedMotion: 'reduce' });

  test('abre en el cuadro final, con la gráfica entera', async ({ page }) => {
    const lab = await openLab(page);

    await expect(timeline(lab)).toHaveValue('1000');
    await expect.poll(() => readout(page, 'Posición del resorte $x$')).toBe('1 000,0 px');
    await expect(lab.getByTestId('spring-plot').locator('[data-series]')).toHaveCount(2);
  });
});

test.describe('Tema 10, laboratorio en un teléfono', () => {
  test.use({ viewport: PHONE });

  test('a 360 px el laboratorio no desborda y las dos tarjetas caben en el lienzo', async ({
    page,
  }) => {
    const lab = await openLab(page);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    const scene = (await lab.getByTestId('spring-scene').boundingBox())!;
    for (const card of ['card-spring', 'card-bezier']) {
      const box = (await lab.getByTestId(card).boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(scene.x);
      expect(box.x + box.width).toBeLessThanOrEqual(scene.x + scene.width);
    }
  });
});
