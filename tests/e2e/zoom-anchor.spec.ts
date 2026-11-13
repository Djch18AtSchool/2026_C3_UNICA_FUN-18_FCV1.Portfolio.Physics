/**
 * R33 on the real labs: «Acercar» zooms about each lab's point of interest, so at ×2,8 and ×8 what
 * the topic studies is still in the frame (Tema 9: the planet; Tema 1: the leg flown; Tema 2: the
 * launch point; Tema 3: the person at rest; Tema 8: the craft). The pieces are tried in
 * useZoomPan.test and zoomMath.test; this checks each lab passes its anchor.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { waitForIsland } from './helpers';

/** Presses of «Acercar» (steps of √2) for ×2,8 and for ×8. */
const STEPS = { 'x2.8': 3, x8: 6 } as const;
const WIDTHS = [1280, 360] as const;

interface AnchorCase {
  topic: number;
  path: string;
  lab: string;
  /** What must stay in the frame, and how it is found. */
  what: string;
  point(lab: Locator): Promise<{ x: number; y: number }>;
  prepare?(page: Page, lab: Locator): Promise<void>;
}

const centreOf = async (locator: Locator) => {
  const box = (await locator.boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};

const CASES: readonly AnchorCase[] = [
  {
    topic: 9,
    path: './temas/asistencia-gravitatoria/',
    lab: 'flyby-lab',
    what: 'el centro de Saturno',
    point: (lab) => centreOf(lab.getByTestId('flyby-planet')),
    async prepare(_page, lab) {
      await lab
        .getByRole('combobox', { name: 'Valores de referencia' })
        .selectOption({ label: 'V2 · Saturno' });
      await expect(lab.getByRole('group', { name: 'Marco de Saturno' })).toBeVisible();
    },
  },
  {
    topic: 1,
    path: './temas/dron-reparto/',
    lab: 'drone-lab',
    what: 'el punto medio del tramo (depósito a A)',
    async point(lab) {
      const [depot, a] = await Promise.all([
        centreOf(lab.getByTestId('depot')),
        centreOf(lab.getByTestId('stop-A').locator('[data-knob]')),
      ]);
      return { x: (depot.x + a.x) / 2, y: (depot.y + a.y) / 2 };
    },
  },
  {
    topic: 2,
    path: './temas/salto-personaje/',
    lab: 'jump-lab',
    what: 'el punto de lanzamiento (el personaje al inicio)',
    point: (lab) => centreOf(lab.getByTestId('jump-marker').locator('[data-knob]')),
  },
  {
    topic: 3,
    path: './temas/gravedad-artificial/',
    lab: 'habitat-lab',
    what: 'la persona en reposo',
    point: (lab) => centreOf(lab.locator('[data-person]')),
  },
  {
    topic: 8,
    path: './temas/ruedas-reaccion/',
    lab: 'wheel-lab',
    what: 'la nave',
    point: (lab) => centreOf(lab.locator('[data-body="live"]')),
  },
];

async function openLab(page: Page, { path, lab: testId }: AnchorCase): Promise<Locator> {
  await page.goto(path);
  await page
    .locator(`[data-testid="${testId}-loading"], [data-testid="${testId}"]`)
    .first()
    .scrollIntoViewIfNeeded();
  await waitForIsland(page, `[data-testid="${testId}"]`);
  return page.getByTestId(testId);
}

const isInside = (
  point: { x: number; y: number },
  box: { x: number; y: number; width: number; height: number },
) =>
  point.x >= box.x &&
  point.x <= box.x + box.width &&
  point.y >= box.y &&
  point.y <= box.y + box.height;

test.use({ reducedMotion: 'reduce' });

for (const width of WIDTHS) {
  for (const anchor of CASES) {
    test.describe(`Tema ${anchor.topic} a ${width} px`, () => {
      test.use({ viewport: { width, height: 900 } });

      test(`«Acercar» deja ${anchor.what} en el cuadro, en el mismo sitio, a ×2,8 y a ×8`, async ({
        page,
      }) => {
        const lab = await openLab(page, anchor);
        await anchor.prepare?.(page, lab);
        const canvas = lab.locator('[data-zoom-viewport]');
        await canvas.evaluate((node) => node.scrollIntoView({ block: 'center' }));
        const acercar = lab.getByRole('group', { name: 'Zoom' }).getByRole('button', {
          name: 'Acercar',
          exact: true,
        });
        const start = await anchor.point(lab);
        expect(isInside(start, (await canvas.boundingBox())!), 'a ×1').toBe(true);

        let pressed = 0;
        for (const [factor, steps] of Object.entries(STEPS)) {
          for (; pressed < steps; pressed += 1) await acercar.click();
          await expect(lab.locator('[data-zoom-factor]')).toHaveText(
            `×${factor.slice(1).replace('.', ',')}`,
          );
          const box = (await canvas.boundingBox())!;
          await expect
            .poll(async () => isInside(await anchor.point(lab), box), { message: factor })
            .toBe(true);
          const now = await anchor.point(lab);
          // Zoomed about it: the point has not moved on screen (a pixel of rounding).
          expect(Math.abs(now.x - start.x), `${factor} x`).toBeLessThanOrEqual(1.5);
          expect(Math.abs(now.y - start.y), `${factor} y`).toBeLessThanOrEqual(1.5);
        }
      });
    });
  }
}
