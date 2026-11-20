/**
 * Tema 12's laboratory on the real page: the sweep traces its envelope over (12.3) on a stated
 * time scale, the troop goes in step or breaking step around Sétra's range, the ZV filter leaves
 * less than 1 % tuned and more off tune, and nothing reads NaN or Infinity with ζ = 0 at exact
 * resonance (Review Focus 3).
 */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { readoutText, seekTimeline, waitForIsland } from './helpers';

const PAGE = './temas/resonancia-estructural/';
const LAB = '[data-testid="resonance-lab"]';

async function openLab(page: Page): Promise<Locator> {
  await page.goto(PAGE);
  const lab = page.locator(LAB);
  await lab.scrollIntoViewIfNeeded();
  await waitForIsland(page, LAB);
  return lab;
}

const readout = (page: Page, label: string) => readoutText(page, LAB, label);
const notes = (lab: Locator) => lab.locator('[data-lab-canvas-notes]');
const presets = (lab: Locator) => lab.getByRole('combobox', { name: 'Valores de referencia' });
const timeline = (lab: Locator) => lab.getByRole('slider', { name: 'Línea de tiempo' });

/** Every readout and every path of the lab: no «—», NaN or Infinity anywhere. */
async function expectFinite(lab: Locator): Promise<void> {
  const values = await lab
    .locator('[data-readout] > :last-child')
    .evaluateAll((nodes) => nodes.map((node) => node.textContent ?? ''));
  for (const value of values) expect(value).not.toMatch(/—|NaN|Infinity|∞/);
  const paths = await lab
    .locator('svg path')
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('d') ?? ''));
  for (const d of paths) expect(d).not.toMatch(/NaN|Infinity/);
}

test.describe('el laboratorio de la resonancia', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('va en el paso 3 como simulación sin insignia: la única insignia es la del video', async ({
    page,
  }) => {
    await openLab(page);
    const figure = page.locator('figure[data-testid="figure"]', { has: page.locator(LAB) });

    await expect(figure).toHaveAttribute('data-type', 'simulacion');
    await expect(figure.locator('.figure-head')).toHaveCount(0);
    await expect(page.locator('section.step', { has: figure })).toContainText(
      'Al paso o rompiendo el paso',
    );
    await expect(page.locator('figure[data-testid="figure"]:has(.figure-head)')).toHaveCount(1);
  });

  test('«Barrido»: a cámara rápida, con dos eventos, y en la resonancia la fuerza va a f0', async ({
    page,
  }) => {
    const lab = await openLab(page);

    await expect(lab.locator('[data-time-scale-badge]')).toContainText('×8');
    await expect(lab.locator('[data-transport-events]')).toHaveCount(1);
    await lab.getByRole('button', { name: 'Evento siguiente' }).click();

    await expect.poll(() => readout(page, 'Frecuencia de la fuerza $f_d$')).toBe('1,00 Hz');
    await expect.poll(() => readout(page, '$\\omega_d/\\omega_0$')).toBe('1,00');
    await expectFinite(lab);
  });

  test('«Barrido»: reproducir traza la envolvente sobre la curva de la (12.3)', async ({
    page,
  }) => {
    const lab = await openLab(page);
    const trace = lab.locator('[data-testid="sweep-plot"] [data-series="barrido"]');
    const length = () => trace.evaluate((node) => (node.getAttribute('d') ?? '').length);
    const before = await length();

    await lab.getByRole('button', { name: 'Reproducir' }).click();
    await expect.poll(length, { timeout: 5000 }).toBeGreaterThan(before + 100);
    await lab.getByRole('button', { name: 'Pausar' }).click();
  });

  test('«Sin amortiguamiento»: crece sin límite, y en la resonancia todo sigue finito (Review Focus 3)', async ({
    page,
  }) => {
    const lab = await openLab(page);
    await presets(lab).selectOption('sin-amortiguamiento');

    await seekTimeline(timeline(lab), '500');

    await expect(notes(lab)).toContainText('crece sin límite');
    await expectFinite(lab);
  });

  test('«Tropa»: rompiendo el paso, otro sorteo cambia el cociente; √N lo da en media cuadrática', async ({
    page,
  }) => {
    const lab = await openLab(page);
    await presets(lab).selectOption('tropa-rompiendo');
    const label = 'Al paso / rompiendo el paso, este sorteo';
    const before = await readout(page, label);

    await lab.getByRole('button', { name: 'Nuevo sorteo' }).click();

    await expect.poll(() => readout(page, label)).not.toBe(before);
    expect(await readout(page, 'En media cuadrática, $\\sqrt{N}$')).toBe('7,7');
    await expect(lab.locator('[data-transport-events]')).toHaveCount(1);
  });

  test('«Tropa»: con la perilla, f0 sale del rango de Sétra y la amplitud cae', async ({
    page,
  }) => {
    const lab = await openLab(page);
    await presets(lab).selectOption('tropa-al-paso');
    await expect(notes(lab)).toContainText('dentro del rango de riesgo máximo');
    const knob = lab.getByTestId('f0-handle');

    await knob.focus();
    await page.keyboard.press('Shift+ArrowRight');
    await page.keyboard.press('Shift+ArrowRight');

    await expect(knob).toHaveAttribute('aria-valuenow', '2.5');
    await expect(notes(lab)).toContainText('fuera del rango de riesgo máximo');
  });

  test('«Tropa» sin amortiguamiento al paso: el tablero llega al borde, «fuera de escala», y nada es NaN', async ({
    page,
  }) => {
    const lab = await openLab(page);
    await presets(lab).selectOption('tropa-al-paso');
    const zeta = lab.getByRole('textbox', { name: /^Amortiguamiento zeta/ });

    await zeta.fill('0');
    await zeta.press('Enter');
    await seekTimeline(timeline(lab), '1000');

    await expect(notes(lab)).toContainText('al paso: crece sin límite');
    await expect(lab.getByTestId('deck-puente')).toHaveAttribute('data-clamped', 'true');
    await expect(lab.getByTestId('deck-puente').getByText('fuera de escala')).toBeVisible();
    await expectFinite(lab);
  });

  test('«Filtro ZV»: afinado queda menos del 1 %; con f0 un 10 % arriba, mucho más', async ({
    page,
  }) => {
    const lab = await openLab(page);
    await presets(lab).selectOption('zv-afinado');

    expect(await readout(page, 'Vibración residual')).toBe('0,0 %');
    await expect(notes(lab)).toContainText('dentro de ±5 %');
    // One event, «Segundo impulso»: its mark and line, without the pair of buttons.
    await expect(lab.locator('[data-transport-events]')).toHaveCount(1);
    await expect(lab.getByRole('button', { name: 'Evento siguiente' })).toHaveCount(0);

    await presets(lab).selectOption('zv-desafinado');

    await expect.poll(() => readout(page, 'Vibración residual')).toMatch(/^1\d,\d %$/);
    await expect(notes(lab)).toContainText('fuera de ±5 %');
  });
});
