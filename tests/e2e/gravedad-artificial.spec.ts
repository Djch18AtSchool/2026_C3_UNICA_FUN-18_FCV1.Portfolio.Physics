import { expect, test, type Locator, type Page } from '@playwright/test';

const PAGE = './temas/gravedad-artificial/';

async function setRange(slider: Locator, value: string): Promise<void> {
  await slider.fill(value);
  await slider.dispatchEvent('input');
  await slider.dispatchEvent('change');
}

function readoutRow(page: Page, label: string): Locator {
  return page.getByTestId('habitat-readouts').locator('div', { hasText: label }).first();
}

test.beforeEach(async ({ page }) => {
  await page.goto(PAGE);
});

test('el diagrama del hábitat se ve y anota las ecuaciones', async ({ page }) => {
  const diagram = page.getByTestId('habitat-diagram');

  await expect(diagram).toBeVisible();
  await expect(diagram.locator('text', { hasText: 'ω²' }).first()).toBeAttached();
  await expect(diagram.locator('text', { hasText: '2π' }).first()).toBeAttached();
});

test('en modo "Fijar 1 g", 2 RPM da un radio de 223,6 m', async ({ page }) => {
  const calculator = page.getByTestId('habitat-calculator');
  await calculator.scrollIntoViewIfNeeded();
  await expect(calculator).toHaveAttribute('data-ready', 'true');

  await page.getByRole('radio', { name: 'Fijar 1 g y despejar r' }).check();
  await setRange(page.getByLabel(/^Velocidad de giro/), '2');

  await expect(readoutRow(page, 'Radio necesario').locator('span').last()).toHaveText(
    /^223,6\s?m$/,
  );
});

test('la página cumple la estructura del tema', async ({ page }) => {
  await expect(page.locator('figure[data-type="diagrama"]')).toBeVisible();
  await expect(page.locator('[data-testid="use-case"] [data-part]')).toHaveCount(4);
  expect(await page.locator('[data-testid="sources"] li').count()).toBeGreaterThanOrEqual(4);
  await expect(page.getByTestId('connections')).toBeVisible();
  expect(await page.locator('.katex-display').count()).toBeGreaterThanOrEqual(3);
});

test.describe('a 375 px', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('ningún texto del diagrama queda por debajo de 11 px efectivos', async ({ page }) => {
    const MIN_EFFECTIVE_PX = 11;
    const diagram = page.getByTestId('habitat-diagram');
    await diagram.scrollIntoViewIfNeeded();

    const sizes = await diagram.evaluate((svg: SVGSVGElement) => {
      const scale = svg.getBoundingClientRect().width / svg.viewBox.baseVal.width;
      return (
        [...svg.querySelectorAll('text, tspan')]
          // A hidden <text> hides its <tspan>s too, though they still compute display: inline.
          .filter((node) => getComputedStyle(node.closest('text') ?? node).display !== 'none')
          .map((node) => ({
            text: node.textContent?.trim() ?? '',
            px: parseFloat(getComputedStyle(node).fontSize) * scale,
          }))
      );
    });

    const tooSmall = sizes.filter(({ px }) => px < MIN_EFFECTIVE_PX);
    expect(sizes.length).toBeGreaterThan(0);
    expect(tooSmall).toEqual([]);
  });
});
