/**
 * Tema 13's laboratory in the browser: it sits in step 4 without the resource badge, opens on the
 * RD109 reference that the page validates against GF, its four parameters recompute the rack, the
 * pump chart's cursor moves the pump's flow, the MGX preset redraws 44 servers, and the extremes
 * of Review Focus 3 (a single server on a 1/4″ hose at full flow) read finite numbers, never NaN.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { readoutText, waitForIsland } from './helpers';

const PAGE = './temas/enfriamiento-liquido/';
const LAB = '[data-testid="cooling-lab"]';
const PHONE = { width: 360, height: 800 };
const BLOCKING_IMPACTS = ['serious', 'critical'];
const WORST = 'Caudal del servidor 24, el más lejano';
const DROP = 'Caída hasta el más lejano $\\Delta p$';
const POWER = 'Potencia de bombeo del CDU $P = \\Delta p\\,Q$';

async function openLab(page: Page): Promise<Locator> {
  await page.goto(PAGE);
  const lab = page.getByTestId('cooling-lab');
  await lab.scrollIntoViewIfNeeded();
  await waitForIsland(page, LAB);
  return lab;
}

const readout = (page: Page, label: string) => readoutText(page, LAB, label);
const pumpFlow = (lab: Locator) =>
  lab.getByRole('textbox', { name: /^Caudal de la bomba por rack/ });

async function commit(field: Locator, value: string): Promise<void> {
  await field.fill(value);
  await field.press('Enter');
}

test.describe('Tema 13, laboratorio del circuito', () => {
  test('va en el paso 4, como simulación sin insignia, tras la figura del reparto', async ({
    page,
  }) => {
    await page.goto(PAGE);
    const figure = page.locator(`figure[data-testid="figure"]:has(${LAB})`);

    await expect(figure).toHaveCount(1);
    await expect(figure).toHaveAttribute('data-type', 'simulacion');
    await expect(figure.locator('.figure-head')).toHaveCount(0);
    await expect(page.locator(`section.step#paso-4 ${LAB}`)).toHaveCount(1);
    // The Figure's own caption, not the captions of the lab's plots.
    await expect(figure.locator(':scope > figcaption')).toContainText(
      'subir el caudal un 46 % triplica el bombeo',
    );
    await expect(page.getByTestId('use-case')).toContainText(
      'subir el caudal un 46 % triplicaría el bombeo (paso 4)',
    );
  });

  test('abre en la referencia: 7,18 L/min al más lejano, 179,9 kPa y 4,14 kW', async ({ page }) => {
    const lab = await openLab(page);

    expect(await readout(page, WORST)).toBe('7,18 L/min');
    expect(await readout(page, DROP)).toBe('179,9 kPa');
    expect(await readout(page, POWER)).toBe('4,14 kW');
    await expect(lab.getByTestId('cooling-status')).toContainText(
      'El servidor más lejano alcanza el objetivo de diseño de OCP (1,5 L/min por kW)',
    );
    await expect(lab.getByTestId('rack-diagram').locator('[data-server]')).toHaveCount(24);
    await expect(lab.getByTestId('preset-note')).toContainText('frente a sus 1,98');
  });

  test('con menos caudal el más lejano queda por debajo del objetivo de OCP, y la nota dice cuánto subirlo', async ({
    page,
  }) => {
    const lab = await openLab(page);

    await commit(pumpFlow(lab), '150');

    await expect(lab.getByTestId('cooling-status')).toContainText(
      'El servidor más lejano está por debajo del objetivo de diseño de OCP (1,5 L/min por kW)',
    );
    await expect(lab.getByTestId('cooling-shortfall')).toContainText('tiene que subir un 2,1 %');
    const worst = lab.locator('[data-worst]');
    const minimum = lab.locator('[data-minimum]');
    const end = await worst.evaluate(
      (bar) => Number(bar.getAttribute('x')) + Number(bar.getAttribute('width')),
    );
    expect(end).toBeLessThan(Number(await minimum.getAttribute('x1')));
  });

  test('el retorno invertido saca el líquido por arriba y el peor servido es el del medio', async ({
    page,
  }) => {
    const lab = await openLab(page);

    await lab.getByRole('radio', { name: 'Invertido' }).check({ force: true });

    await expect(lab.locator('[data-outlet]')).toHaveAttribute('data-outlet', 'arriba');
    expect(await readout(page, 'Caudal del servidor 12, el peor servido')).toBe('7,19 L/min');
  });

  test('el cursor de la gráfica de la bomba mueve el caudal de la bomba', async ({ page }) => {
    const lab = await openLab(page);
    const cursor = lab.getByTestId('cooling-pump-plot').getByRole('slider');
    await cursor.scrollIntoViewIfNeeded();

    await cursor.focus();
    await page.keyboard.press('Shift+ArrowRight');

    await expect(pumpFlow(lab)).not.toHaveValue('172,5');
    await expect(lab.getByTestId('cooling-pump-note')).not.toContainText('23,0 L/s');
  });

  test('el preajuste MGX dibuja 44 servidores, cada UQD04 dentro de su caudal nominal', async ({
    page,
  }) => {
    const lab = await openLab(page);

    await lab.getByRole('button', { name: /^MGX: 44 puertos/ }).click();

    await expect(lab.getByTestId('rack-diagram').locator('[data-server]')).toHaveCount(44);
    await expect(lab.getByTestId('cooling-status')).toContainText(
      'Cada UQD04 va dentro de su caudal nominal',
    );
    await expect(lab.getByTestId('cooling-lab-profile')).toContainText('al servidor 44');
    await expect(lab.getByTestId('cooling-plate')).toContainText('Placa fría de «MGX: 44 puertos»');
  });

  test('un servidor con manguera de 1/4″ a 300 L/min: lecturas finitas, sin NaN (Review Focus 3)', async ({
    page,
  }) => {
    const lab = await openLab(page);

    await commit(lab.getByRole('textbox', { name: /^Servidores en el rack/ }), '1');
    await lab.getByRole('radio', { name: /^1\/4″/ }).check({ force: true });
    await commit(pumpFlow(lab), '300');

    await expect(lab.getByTestId('rack-diagram').locator('[data-server]')).toHaveCount(1);
    await expect(lab.getByTestId('cooling-pump-note')).toContainText('Ninguna curva publicada');
    // The duty point is far above the pump's axis: drawn on its top edge, with its value.
    await expect(lab.locator('[data-point="pedido-fuera"]')).toHaveCount(1);
    await expect(lab.locator('[data-point="pedido-fuera"]')).toContainText('fuera de escala');
    expect(await readout(page, 'Caudal del servidor 1, el más lejano')).toBe('300,00 L/min');
    for (const label of [DROP, POWER]) {
      expect(await readout(page, label)).toMatch(/^\d[\d\s,]*\s\S+$/);
    }
    expect(await lab.textContent()).not.toMatch(/NaN|Infinity/);
  });

  test('en un teléfono el laboratorio no desborda la página', async ({ page }) => {
    await page.setViewportSize(PHONE);
    await openLab(page);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`axe no encuentra violaciones serias ni críticas en el laboratorio (${theme})`, async ({
      page,
    }) => {
      await page.addInitScript((value) => window.localStorage.setItem('theme', value), theme);
      await openLab(page);

      const { violations } = await new AxeBuilder({ page }).include(LAB).analyze();
      const blocking = violations
        .filter((violation) => BLOCKING_IMPACTS.includes(violation.impact ?? ''))
        .map(({ id, nodes }) => `${id}: ${nodes.map((node) => node.target).join(' | ')}`);

      expect(blocking).toEqual([]);
    });
  }
});
