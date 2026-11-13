/**
 * Rule B4 (README, «Escala de tiempo y eventos»): a laboratory declares its time scale on the
 * canvas. Tema 3 plays the turn 6 times faster (TIME_LAPSE) and Tema 5 plays the trigger's return
 * 10 times slower (SLOW_MOTION); both declare it with the HTML badge, one status region each. The
 * other labs have their own specs; Temas 2 and 7 run at real time and carry no badge.
 */
import { expect, test, type Page } from '@playwright/test';
import { LOCKED_LIMITS } from '../../src/components/topics/gravedad-artificial/habitatModel';
import { HABITAT_LIMITS } from '../../src/lib/data/habitatPresets';
import { waitForIsland } from './helpers';
import { badgeTouches } from './svgBadgeClearance';

const HABITAT = { page: './temas/gravedad-artificial/', lab: '[data-testid="habitat-lab"]' };
const TRIGGER = { page: './temas/control-haptico/', lab: '[data-testid="trigger-lab"]' };
const WIDTHS = [320, 360, 540, 1280] as const;
const HEIGHT = 800;
const BADGE = '[data-time-scale-badge]';
/** The badge's status, which says (data-settled) when the scale took its baseline. */
const STATUS = `${BADGE} ~ [role="status"]`;

async function openLab(page: Page, { page: path, lab }: typeof HABITAT): Promise<void> {
  await page.goto(path);
  await page.locator(lab).scrollIntoViewIfNeeded();
  await waitForIsland(page, lab);
}

/** Whether two client rectangles share any area. */
const overlaps = (a: DOMRect, b: DOMRect) =>
  a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

test.describe('Tema 3: el giro a ×6', () => {
  test('la insignia dice ×6 cámara rápida, derivada del reloj, con una sola región de estado', async ({
    page,
  }) => {
    await openLab(page, HABITAT);
    const lab = page.locator(HABITAT.lab);

    await expect(lab.locator(`div${BADGE}`)).toHaveText(/^×6\s*cámara rápida$/u);
    await expect(lab.locator(BADGE)).toHaveCount(1);
    await expect(lab.locator(STATUS)).toHaveCount(1);
    await expect(lab.locator('[data-time-scale-words]')).toHaveText(
      'Escala de tiempo: 6 veces la velocidad real, cámara rápida',
    );
    // The first settling is silent.
    await expect(lab.locator(STATUS)).toHaveAttribute('data-settled', 'true');
    await expect(lab.locator(STATUS)).toBeEmpty();
  });

  test('seguir la velocidad: 2× dice ×12 y el cambio se anuncia', async ({ page }) => {
    await openLab(page, HABITAT);
    const lab = page.locator(HABITAT.lab);
    await expect(lab.locator(STATUS)).toHaveAttribute('data-settled', 'true');

    await lab.getByRole('button', { name: 'Velocidad 1×' }).click();
    await page.getByRole('dialog').getByRole('combobox', { name: 'Velocidad' }).selectOption('2');

    await expect(lab.locator(`div${BADGE}`)).toHaveText(/^×12\s*cámara rápida$/u);
    await expect(lab.locator(STATUS)).toHaveText(
      'Escala de tiempo: 12 veces la velocidad real, cámara rápida',
    );
  });

  test('con movimiento reducido dice el paso que se ve (×4) y no anuncia el asentamiento', async ({
    browser,
  }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await openLab(page, HABITAT);
    const lab = page.locator(HABITAT.lab);

    await expect(lab.locator(`div${BADGE}`)).toHaveText(/^×4\s*cámara rápida$/u);
    await expect(lab.locator(STATUS)).toHaveAttribute('data-settled', 'true');
    await expect(lab.locator(STATUS)).toBeEmpty();
    await context.close();
  });

  for (const width of WIDTHS) {
    test(`a ${width} px la insignia, en la esquina inferior derecha del cuadrado del anillo, no toca nada`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: HEIGHT });
      await openLab(page, HABITAT);
      const lab = page.locator(HABITAT.lab);
      const scene = lab.getByTestId('habitat-scene');
      const radius = lab.getByRole('textbox', { name: /^Radio del piso/ });

      // The default radius, the largest ring and the smallest one 1 g allows (the drawing follows r).
      for (const metres of [894.6, HABITAT_LIMITS.r[1], LOCKED_LIMITS.r[0]]) {
        await radius.fill(String(metres).replace('.', ','));
        await radius.press('Enter');
        await expect(lab.getByTestId('radius-handle')).toHaveAttribute(
          'aria-valuenow',
          String(metres),
        );
        expect(await badgeTouches(scene, `${HABITAT.lab} ${BADGE}`), `r = ${metres}`).toEqual([]);
      }

      const rects = await page.evaluate(
        ({ labSelector, badge }) => {
          const root = document.querySelector(labSelector) as Element;
          const rect = (element: Element | null) =>
            (element?.getBoundingClientRect().toJSON() ?? null) as DOMRect | null;
          const square = root.querySelector('[data-habitat-badge-box]');
          return {
            badge: rect(root.querySelector(badge)),
            square: rect(square),
            strip: rect(root.querySelector('[data-zoom-strip]')),
            bar: rect(root.querySelector('[data-testid="radius-handle"]')),
          };
        },
        { labSelector: HABITAT.lab, badge: `div${BADGE}` },
      );
      const { badge, square, strip, bar } = rects;
      // Inside the ring's square, in its bottom-right corner; apart from the zoom and the bar.
      expect(badge!.right).toBeLessThanOrEqual(square!.right);
      expect(badge!.bottom).toBeLessThanOrEqual(square!.bottom);
      expect(overlaps(badge!, strip!)).toBe(false);
      expect(overlaps(badge!, bar!)).toBe(false);
    });
  }
});

test.describe('Tema 5: el retorno a ×0,1', () => {
  test('la insignia dice ×0,1 cámara lenta, derivada del modelo, con una sola región de estado', async ({
    page,
  }) => {
    await openLab(page, TRIGGER);
    const lab = page.locator(TRIGGER.lab);

    await expect(lab.locator(`div${BADGE}`)).toHaveText(/^×0,1\s*cámara lenta$/u);
    await expect(lab.locator(BADGE)).toHaveCount(1);
    await expect(lab.locator(STATUS)).toHaveCount(1);
    await expect(lab.locator('[data-time-scale-words]')).toHaveText(
      'Escala de tiempo: 0,1 veces la velocidad real, cámara lenta',
    );
    await expect(lab.locator(STATUS)).toHaveAttribute('data-settled', 'true');
    await expect(lab.locator(STATUS)).toBeEmpty();
  });

  test('con movimiento reducido el retorno es instantáneo: no hay escala que declarar', async ({
    browser,
  }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await openLab(page, TRIGGER);

    await expect(page.locator(TRIGGER.lab).locator(BADGE)).toHaveCount(0);
    await context.close();
  });

  for (const width of WIDTHS) {
    test(`a ${width} px la insignia, abajo a la izquierda, no toca la palanca ni sus rótulos`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: HEIGHT });
      await openLab(page, TRIGGER);
      const lab = page.locator(TRIGGER.lab);
      const lever = lab.getByTestId('trigger-lever');
      const slider = lab.getByRole('slider', { name: 'Recorrido del gatillo x', exact: true });
      const start = lab.getByRole('textbox', { name: /^Inicio de la resistencia/ });
      const touches = () => badgeTouches(lever, `${TRIGGER.lab} ${BADGE}`);

      expect(await touches(), 'en reposo').toEqual([]);
      await slider.focus();
      await page.keyboard.press('End');
      await expect(slider).toHaveAttribute('aria-valuenow', '8');
      expect(await touches(), 'apretado 8 mm').toEqual([]);
      await start.fill('6');
      await start.press('Enter');
      expect(await touches(), 'apretado, con x₀ = 6 mm').toEqual([]);
      const [badge, box] = await Promise.all([
        lab.locator(`div${BADGE}`).boundingBox(),
        lever.boundingBox(),
      ]);
      expect(badge!.x).toBeGreaterThanOrEqual(box!.x);
      expect(badge!.y + badge!.height).toBeLessThanOrEqual(box!.y + box!.height);
    });
  }
});
