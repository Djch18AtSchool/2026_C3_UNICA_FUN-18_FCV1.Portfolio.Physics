/**
 * The labs' microinteractions (D4, auditoría §8) on a test page outside the site
 * (tests/e2e/fixtures/lab-micro): the preset transition, the legend's highlight of a series and a
 * knob's focus ring and growth while dragged, with the mouse, the keyboard and touch, in both
 * themes and with reduced motion (the system's and the site's). The real labs are checked in
 * lab-preset-transition.spec.ts and lab-microinteractions.spec.ts.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { FIXTURE_BUILD_TIMEOUT_MS, startFixtureSite, type FixtureSite } from './fixtureSite';
import { waitForIsland } from './helpers';

const LAB = '[data-testid="micro-fixture-lab"]';
const TRANSITION_ID = 'lab-preset-transition';
const KNOB_GROWTH = 1.25;
/** --motion-fast (global.css), as getComputedStyle writes it. */
const FAST = '0.12s';
const DIM_OPACITY = '0.25';
const BLOCKING_IMPACTS = ['serious', 'critical'];
const MIN_RING_CONTRAST = 3;
const PX_SLACK = 0.5;

let site: FixtureSite;

test.describe.configure({ mode: 'serial' });
test.beforeAll(async () => {
  test.setTimeout(FIXTURE_BUILD_TIMEOUT_MS);
  site = await startFixtureSite('lab-micro');
});
test.afterAll(async () => {
  await site?.stop();
});

async function openFixture(
  page: Page,
  { theme = 'light', motion }: { theme?: 'light' | 'dark'; motion?: 'reduced' } = {},
): Promise<Locator> {
  if (motion) {
    await page.addInitScript(() =>
      window.localStorage.setItem('portafolio.settings', JSON.stringify({ motion: 'reduced' })),
    );
  }
  await page.goto(`${site.url}?theme=${theme}`);
  await waitForIsland(page, LAB);
  return page.locator(LAB);
}

const legendEntry = (lab: Locator, name: string) =>
  lab
    .getByRole('toolbar', { name: 'Leyenda: realzar una serie' })
    .getByRole('button', { name, exact: true });
const series = (lab: Locator, id: string) => lab.locator(`path[data-series="${id}"]`);
const knob = (lab: Locator) => lab.getByTestId('micro-knob');
const dot = (lab: Locator) => knob(lab).locator('[data-knob]');

/** Every series' emphasis as drawn ("" = as always). */
const emphases = (lab: Locator) =>
  lab
    .locator('path[data-series]')
    .evaluateAll((paths) => paths.map((path) => path.getAttribute('data-emphasis') ?? ''));

const centreOf = async (locator: Locator) => {
  const box = (await locator.boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2, width: box.width };
};

/** WCAG contrast between two computed `rgb(…)` colors. */
function contrast(a: string, b: string): number {
  const luminance = (rgb: string) => {
    const [r, g, bl] = (rgb.match(/[\d.]+/gu) ?? []).slice(0, 3).map((value) => {
      const c = Number(value) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

test.describe('la transición de preajuste', () => {
  test('funde el lienzo en 200 ms y no deja nada; con movimiento reducido no hay transición', async ({
    page,
  }) => {
    // Every Web Animation the page starts, kept (one that already ended is still counted).
    await page.addInitScript(() => {
      const animate = Element.prototype.animate;
      const started: Animation[] = [];
      Object.assign(window, { startedAnimations: started });
      Element.prototype.animate = function (
        this: Element,
        ...args: Parameters<Element['animate']>
      ) {
        const animation = animate.apply(this, args);
        if (this.matches('[data-lab-canvas]')) started.push(animation);
        return animation;
      };
    });
    const lab = await openFixture(page);
    const canvas = lab.locator('[data-lab-canvas]');
    const started = () =>
      page.evaluate(() =>
        (window as unknown as { startedAnimations: Animation[] }).startedAnimations.map(
          (animation) => ({
            id: animation.id,
            duration: Number(animation.effect?.getTiming().duration),
          }),
        ),
      );

    await lab.getByRole('button', { name: 'Medio' }).click();

    await expect.poll(started).toEqual([{ id: TRANSITION_ID, duration: 200 }]);
    const transitions = () =>
      canvas.evaluate(
        (node, id) =>
          node
            .getAnimations()
            .filter((animation) => animation.id === id)
            .map((animation) => Number(animation.effect?.getTiming().duration)),
        TRANSITION_ID,
      );
    await canvas.evaluate((node) => Promise.all(node.getAnimations().map((a) => a.finished)));
    expect(await transitions()).toEqual([]);
    await expect(canvas).toHaveCSS('opacity', '1');

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await lab.getByRole('button', { name: 'Rápido' }).click();
    await expect(lab.getByRole('button', { name: 'Rápido' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(await transitions()).toEqual([]);
    expect(await started()).toHaveLength(1);
  });
});

test.describe('el realce de una serie desde su leyenda', () => {
  test('con el ratón: ensancha la serie y atenúa las demás mientras dura, sin cambiar nombres', async ({
    page,
  }) => {
    const lab = await openFixture(page);
    // A formula in the label is named in words (mathAriaLabel), like the site's other controls.
    await expect(
      lab
        .getByRole('toolbar', { name: 'Leyenda: realzar una serie' })
        .getByRole('button', { name: /^Suelo, y .*0$/u }),
    ).toBeVisible();
    const width = await series(lab, 'luna').evaluate((path) => getComputedStyle(path).strokeWidth);
    const spoken = await lab.locator('[aria-live], [role="status"]').allTextContents();

    await legendEntry(lab, 'Luna').hover();

    await expect.poll(() => emphases(lab)).toEqual(['dim', 'focus', 'dim']);
    await expect(series(lab, 'tierra')).toHaveCSS('opacity', DIM_OPACITY);
    await expect
      .poll(() => series(lab, 'luna').evaluate((path) => getComputedStyle(path).strokeWidth))
      .not.toBe(width);
    await expect(series(lab, 'luna')).toHaveCSS('transition-duration', `${FAST}, ${FAST}`);
    // The image keeps its name and nothing is announced.
    await expect(lab.getByRole('img', { name: /^Dos trayectorias/ })).toBeVisible();
    expect(await lab.locator('[aria-live], [role="status"]').allTextContents()).toEqual(spoken);

    await page.mouse.move(0, 0);
    await expect.poll(() => emphases(lab)).toEqual(['', '', '']);
    await expect(series(lab, 'tierra')).toHaveCSS('opacity', '1');
  });

  test('con el teclado: una sola parada; las flechas, Inicio y Fin recorren y realzan, Intro fija y Escape suelta', async ({
    page,
  }) => {
    const lab = await openFixture(page);
    const toolbar = lab.getByRole('toolbar', { name: 'Leyenda: realzar una serie' });
    // From the knob, the next stop back is the legend: one stop, its first entry.
    await knob(lab).focus();
    await page.keyboard.press('Shift+Tab');
    await expect(legendEntry(lab, 'Tierra')).toBeFocused();
    await expect(toolbar).toHaveAttribute('aria-orientation', 'horizontal');
    await expect.poll(() => emphases(lab)).toEqual(['focus', 'dim', 'dim']);

    await page.keyboard.press('ArrowRight');
    await expect(legendEntry(lab, 'Luna')).toBeFocused();
    await expect.poll(() => emphases(lab)).toEqual(['dim', 'focus', 'dim']);
    await page.keyboard.press('End');
    await expect(toolbar.getByRole('button').last()).toBeFocused();
    await page.keyboard.press('Home');
    await expect(legendEntry(lab, 'Tierra')).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(legendEntry(lab, 'Tierra')).toHaveAttribute('aria-pressed', 'true');
    // One stop: Tab leaves the legend for the knob, and the pinned series stays.
    await page.keyboard.press('Tab');
    await expect(knob(lab)).toBeFocused();
    await expect.poll(() => emphases(lab)).toEqual(['focus', 'dim', 'dim']);
    // Back in, the stop is the pinned entry.
    await page.keyboard.press('Shift+Tab');
    await expect(legendEntry(lab, 'Tierra')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(legendEntry(lab, 'Tierra')).toHaveAttribute('aria-pressed', 'false');
    await page.keyboard.press('Tab');
    await expect.poll(() => emphases(lab)).toEqual(['', '', '']);
  });

  test('con el ajuste «Movimiento: reducido», el realce llega sin transición', async ({ page }) => {
    const lab = await openFixture(page, { motion: 'reduced' });

    await legendEntry(lab, 'Luna').hover();

    await expect.poll(() => emphases(lab)).toEqual(['dim', 'focus', 'dim']);
    await expect(series(lab, 'luna')).toHaveCSS('transition-property', 'none');
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`sin violaciones graves de accesibilidad con una serie realzada y el asidero enfocado (${theme})`, async ({
      page,
    }) => {
      const lab = await openFixture(page, { theme });
      await legendEntry(lab, 'Luna').click();
      await knob(lab).focus();
      await page.keyboard.press('ArrowRight');

      const results = await new AxeBuilder({ page }).include(LAB).analyze();

      expect(
        results.violations
          .filter(({ impact }) => BLOCKING_IMPACTS.includes(impact ?? ''))
          .map(({ id }) => id),
      ).toEqual([]);
    });
  }
});

test.describe('el realce en pantalla táctil', () => {
  test.use({ hasTouch: true, viewport: { width: 360, height: 800 } });

  test('tocar la entrada fija el realce; tocarla otra vez o fuera lo suelta', async ({ page }) => {
    const lab = await openFixture(page);

    await legendEntry(lab, 'Luna').tap();
    await expect(legendEntry(lab, 'Luna')).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => emphases(lab)).toEqual(['dim', 'focus', 'dim']);
    await legendEntry(lab, 'Luna').tap();
    await expect.poll(() => emphases(lab)).toEqual(['', '', '']);

    await legendEntry(lab, 'Tierra').tap();
    await expect.poll(() => emphases(lab)).toEqual(['focus', 'dim', 'dim']);
    await lab.getByRole('heading', { name: 'Parámetros' }).tap();
    await expect.poll(() => emphases(lab)).toEqual(['', '', '']);
  });
});

test.describe('el asidero', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`enfocado con el teclado muestra su aro, con contraste ≥ 3:1 sobre la superficie (${theme})`, async ({
      page,
    }) => {
      const lab = await openFixture(page, { theme });
      await knob(lab).focus();
      await page.keyboard.press('ArrowRight');

      const ring = knob(lab).locator('[data-knob-ring]');
      const casing = knob(lab).locator('[data-knob-ring-casing]');
      await expect(ring).toHaveCSS('opacity', '1');
      await expect(casing).toHaveCSS('opacity', '1');
      const [ringColor, casingColor] = await Promise.all(
        [ring, casing].map((mark) => mark.evaluate((node) => getComputedStyle(node).stroke)),
      );
      expect(contrast(ringColor, casingColor)).toBeGreaterThanOrEqual(MIN_RING_CONTRAST);

      await lab.getByRole('button', { name: 'Restablecer' }).focus();
      await expect(ring).toHaveCSS('opacity', '0');
    });
  }

  test('crece mientras se arrastra, sin mover su centro ni su área de toque, y suelta como estaba', async ({
    page,
  }) => {
    const lab = await openFixture(page);
    const hit = knob(lab).locator('circle').first();
    const before = await centreOf(dot(lab));
    const hitBefore = await hit.boundingBox();
    await expect(knob(lab)).toHaveCSS('cursor', 'ew-resize');

    await page.mouse.move(before.x, before.y);
    await page.mouse.down();

    await expect(knob(lab)).toHaveAttribute('data-dragging', '');
    await expect(knob(lab)).toHaveCSS('cursor', 'grabbing');
    await expect(dot(lab)).toHaveCSS('transition-duration', FAST);
    await expect
      .poll(async () => (await centreOf(dot(lab))).width / before.width)
      .toBeCloseTo(KNOB_GROWTH, 2);
    const grown = await centreOf(dot(lab));
    expect(Math.abs(grown.x - before.x)).toBeLessThanOrEqual(PX_SLACK);
    expect(Math.abs(grown.y - before.y)).toBeLessThanOrEqual(PX_SLACK);
    expect(await hit.boundingBox()).toEqual(hitBefore);

    // The drag follows the hand as before: the knob's centre stays under the pointer.
    const value = await knob(lab).getAttribute('aria-valuenow');
    await page.mouse.move(before.x + 60, before.y, { steps: 4 });
    await expect(knob(lab)).not.toHaveAttribute('aria-valuenow', value ?? '');
    await expect
      .poll(async () => Math.abs((await centreOf(dot(lab))).x - (before.x + 60)))
      .toBeLessThan(6);

    await page.mouse.up();
    await expect(knob(lab)).not.toHaveAttribute('data-dragging');
    await expect.poll(async () => (await centreOf(dot(lab))).width).toBeCloseTo(before.width, 1);
  });

  test('con movimiento reducido del sistema crece sin transición', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const lab = await openFixture(page);
    const before = await centreOf(dot(lab));

    await page.mouse.move(before.x, before.y);
    await page.mouse.down();

    await expect(knob(lab)).toHaveAttribute('data-dragging', '');
    const duration = await dot(lab).evaluate((node) => getComputedStyle(node).transitionDuration);
    expect(Number.parseFloat(duration)).toBeLessThan(0.001);
    await page.mouse.up();
  });

  test('con el ajuste «Movimiento: reducido» crece sin transición', async ({ page }) => {
    const lab = await openFixture(page, { motion: 'reduced' });

    await expect(dot(lab)).toHaveCSS('transition-property', 'none');
  });
});
