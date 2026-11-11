import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { uncoveredChars } from '../../src/lib/typography';
import {
  hydrateAllIslands,
  readoutText as readReadout,
  seekTimeline,
  waitForIsland,
} from './helpers';
import { badgeTouches } from './svgBadgeClearance';

const PAGE = './temas/ruedas-reaccion/';
const TITLE = 'Ruedas de reacción: cómo un satélite se gira sin empujarse contra nada';
const LAB = '[data-testid="wheel-lab"]';
const STEPS = 4;
const TABLE_IDS = [
  'ruedas-reaccion-ruedas',
  'ruedas-reaccion-maniobra',
  'ruedas-reaccion-misiones',
];
/** The readout label of the peak ω_w, as written (its ω_w is KaTeX). */
const PEAK_OMEGA = String.raw`$\omega_w$ máxima de la maniobra`;
const DIAGRAM_TEXTS = ['(8.1)', '(8.2)', '(8.3)', '(8.4)', '485 vueltas', 'la nave deriva'];
const PHONE = { width: 360, height: 800 };
const THEMES = ['light', 'dark'] as const;
const BLOCKING_IMPACTS = ['serious', 'critical'];
/** The table frame scrolls on its own once its content is wider than the frame (1 px of rounding). */
const OVERFLOW_TOLERANCE_PX = 1;
/** Timeline position (of 1000) to start from: the 60 s turn then ends within half a second. */
const NEAR_END = '995';
const PLAYBACK_TIMEOUT_MS = 3000;
const STILL_AT_END_MS = 500;

/** The value text of the readout row of the lab labelled exactly `label` (helpers.ts). */
const readoutText = (page: Page, label: string) => readReadout(page, LAB, label);

async function openLab(page: Page): Promise<void> {
  await page.goto(PAGE);
  // The island hydrates with client:visible; bring it into view and wait for React.
  await page.locator(LAB).scrollIntoViewIfNeeded();
  await waitForIsland(page, LAB);
}

test.describe('página', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
  });

  test('lleva el título de la consigna y cuatro pasos', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(TITLE);
    await expect(page.locator('section.step')).toHaveCount(STEPS);
    for (let n = 1; n <= STEPS; n++) {
      await expect(
        page.getByRole('heading', { level: 2, name: new RegExp(`^Paso ${n} · `) }),
      ).toBeVisible();
    }
  });

  test('cada paso tiene su "Por qué", su ecuación y al menos una figura', async ({ page }) => {
    for (const step of await page.locator('section.step').all()) {
      await expect(step.locator('.why')).toHaveCount(1);
      await expect(step.locator('.equation')).toHaveCount(1);
      expect(await step.locator('figure[data-testid="figure"]').count()).toBeGreaterThanOrEqual(1);
    }
  });

  test('solo el diagrama de la rueda lleva insignia, la de "Diagrama"', async ({ page }) => {
    const badges = page.locator('figure[data-testid="figure"] .figure-head');

    await expect(badges).toHaveCount(1);
    await expect(badges.getByText('Diagrama', { exact: true })).toHaveCount(1);
    // `has` is relative to each figure: the one figure whose head shows a badge.
    const badged = page.locator('figure[data-testid="figure"]', {
      has: page.locator('.figure-head'),
    });
    await expect(badged).toHaveAttribute('data-type', 'diagrama');
    await expect(badged.getByTestId('wheel-diagram')).toBeAttached();
  });

  test('el diagrama anota las ecuaciones (8.1) a (8.4), las 485 vueltas y la deriva', async ({
    page,
  }) => {
    const diagram = page.getByTestId('wheel-diagram');

    await expect(diagram).toBeVisible();
    for (const text of DIAGRAM_TEXTS) {
      await expect(diagram.locator('text', { hasText: text }).first()).toBeAttached();
    }
  });

  test('el diagrama dibuja sus símbolos con MathText: nada cae a una tipografía de reserva', async ({
    page,
  }) => {
    const diagram = page.getByTestId('wheel-diagram');
    await expect(diagram).toBeVisible();

    const texts = await diagram.locator('text, tspan').evaluateAll((nodes) =>
      nodes.flatMap((node) => {
        const own = [...node.childNodes]
          .filter((child) => child.nodeType === Node.TEXT_NODE)
          .map((child) => child.textContent ?? '')
          .join('');
        if (!own.trim()) return [];
        const family = getComputedStyle(node).fontFamily;
        return [{ text: own, isKatex: /KaTeX/.test(family.split(',')[0]) }];
      }),
    );

    const outside = texts
      .filter(({ isKatex }) => !isKatex)
      .flatMap(({ text }) => uncoveredChars(text, 'sans'));
    expect(outside).toEqual([]);
    expect(texts.some(({ isKatex }) => isKatex)).toBe(true);
  });

  test('en el detalle M, el rótulo «rueda» queda debajo del título, sin tocarlo', async ({
    page,
  }) => {
    const diagram = page.getByTestId('wheel-diagram');
    const box = async (label: string) =>
      (await diagram.locator(`text[data-label="${label}"]`).boundingBox())!;

    const title = await box('detalle-titulo');
    const wheel = await box('detalle-rueda');

    expect(wheel.y).toBeGreaterThan(title.y + title.height);
  });

  test('el paso 4 pone el diagrama antes del laboratorio', async ({ page }) => {
    const figures = page.locator('section.step#paso-4 figure[data-testid="figure"]');

    await expect(figures).toHaveCount(2);
    await expect(figures.nth(0).getByTestId('wheel-diagram')).toBeAttached();
    await expect(figures.nth(1)).toHaveAttribute('data-type', 'simulacion');
    await expect(figures.nth(1).getByTestId('wheel-lab')).toBeAttached();
    await expect(figures.nth(1).locator('details[data-lab-note="usage"]')).toContainText(
      'tiempo real',
    );
  });

  test('las tres tablas se numeran Tabla 8.1 a 8.3, en orden', async ({ page }) => {
    const tables = page.getByTestId('data-table');

    await expect(tables).toHaveCount(TABLE_IDS.length);
    // getComputedStyle does not resolve counters: check the prefix, the topic and each position.
    const labels = await tables.evaluateAll((figures) =>
      figures.map((figure) => {
        const body = figure.closest<HTMLElement>('[data-topic-number]');
        const prefix = getComputedStyle(
          figure.querySelector('figcaption') as Element,
          '::before',
        ).content;
        const position = [...(body?.querySelectorAll('.content-table') ?? [])].indexOf(figure) + 1;
        return { id: figure.id, prefix, label: `Tabla ${body?.dataset.topicNumber}.${position}` };
      }),
    );

    expect(labels.map(({ id }) => id)).toEqual(TABLE_IDS);
    expect(labels.map(({ label }) => label)).toEqual(['Tabla 8.1', 'Tabla 8.2', 'Tabla 8.3']);
    for (const { prefix } of labels) {
      expect(prefix).toBe('"Tabla " counter(topic) "." counter(table) " · "');
    }
  });

  test('la página cumple la estructura del tema', async ({ page }) => {
    await expect(page.locator('[data-testid="use-case"] [data-part]')).toHaveCount(4);
    await expect(
      page.getByTestId('callout').and(page.locator('[data-variant="clase"]')),
    ).toHaveCount(1);
    await expect(page.getByTestId('connections')).toBeVisible();
    expect(await page.locator('[data-testid="sources"] li').count()).toBeGreaterThanOrEqual(10);
  });
});

test.describe('laboratorio', () => {
  test.beforeEach(async ({ page }) => {
    await openLab(page);
  });

  test('la perilla del ángulo objetivo, con el teclado, cambia la velocidad máxima de la rueda', async ({
    page,
  }) => {
    const knob = page.locator(LAB).getByRole('slider', { name: 'Dial del ángulo objetivo' });
    await expect(knob).toHaveAttribute('aria-valuetext', /90/);
    const before = await readoutText(page, PEAK_OMEGA);

    await knob.focus();
    await page.keyboard.press('Shift+ArrowDown');

    await expect(knob).toHaveAttribute('aria-valuetext', /80/);
    await expect(knob).toBeFocused();
    await expect.poll(() => readoutText(page, PEAK_OMEGA)).not.toBe(before);
  });

  test('reproducir termina el giro, vuelve a "Reproducir" y no repite', async ({ page }) => {
    const lab = page.locator(LAB);
    const timeline = lab.getByRole('slider', { name: 'Línea de tiempo' });
    await seekTimeline(timeline, NEAR_END);

    await lab.getByRole('button', { name: 'Reproducir' }).click();
    await expect(timeline).toHaveValue('1000', { timeout: PLAYBACK_TIMEOUT_MS });

    await expect(lab).toHaveAttribute('data-playing', 'false');
    await expect(lab.getByRole('button', { name: 'Reproducir' })).toBeVisible();
    await page.waitForTimeout(STILL_AT_END_MS);
    await expect(timeline).toHaveValue('1000');
    await expect(lab).toHaveAttribute('data-playing', 'false');
  });
});

/** Widths where the presets' one-line chips (LabPresets, no wrap) must fit inside the panel. */
const CHIP_FIT_VIEWPORTS = [
  { name: '360 px', size: PHONE },
  { name: '1 280 px', size: { width: 1280, height: 800 } },
] as const;

for (const { name, size } of CHIP_FIT_VIEWPORTS) {
  test.describe(`a ${name}`, () => {
    test.use({ viewport: size });

    test('las fichas de los tres preajustes caben en el panel, sin salirse por la derecha', async ({
      page,
    }) => {
      await openLab(page);
      const panel = await page.locator(`${LAB} [data-lab-panel]`).boundingBox();
      const chips = page.locator(`${LAB} [data-lab-presets="chips"]`).getByRole('button');

      await expect(chips).toHaveCount(3);
      for (const chip of await chips.all()) {
        const box = await chip.boundingBox();
        const label = (await chip.textContent())?.trim();
        expect((box?.x ?? 0) + (box?.width ?? 0), label).toBeLessThanOrEqual(
          (panel?.x ?? 0) + (panel?.width ?? 0),
        );
      }
    });
  });
}

test.describe('a 360 px', () => {
  test.use({ viewport: PHONE });

  test('la página no desborda y cada tabla se desplaza dentro de su marco', async ({ page }) => {
    await page.goto(PAGE);
    await hydrateAllIslands(page);
    await page.evaluate(() => document.fonts.ready);

    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      PHONE.width,
    );
    for (const frame of await page.locator('[data-testid="data-table"] .table-frame').all()) {
      const { overflows, overflowX } = await frame.evaluate(
        (element, tolerance) => ({
          overflows: element.scrollWidth - element.clientWidth > tolerance,
          overflowX: getComputedStyle(element).overflowX,
        }),
        OVERFLOW_TOLERANCE_PX,
      );
      expect(overflowX).toBe('auto');
      if (overflows) await expect(frame).toHaveAttribute('role', 'region');
    }
  });
});

for (const theme of THEMES) {
  test(`axe no encuentra violaciones serias ni críticas en el tema ${theme === 'light' ? 'claro' : 'oscuro'}`, async ({
    page,
  }) => {
    await page.addInitScript((value) => window.localStorage.setItem('theme', value), theme);
    await page.goto(PAGE);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await hydrateAllIslands(page);

    const { violations } = await new AxeBuilder({ page }).analyze();
    const blocking = violations
      .filter((violation) => BLOCKING_IMPACTS.includes(violation.impact ?? ''))
      .map(({ id, impact, nodes }) => ({
        id,
        impact,
        targets: nodes.map((node) => node.target.join(' ')),
      }));

    expect(blocking).toEqual([]);
  });
}

const SCENE = '[data-testid="wheel-scene"]';
const SCENE_BADGE = `${SCENE} g[data-time-scale-badge]`;
const SCENE_WIDTHS = [320, 360, 1280] as const;
const REAL_TIME = /^×1\s*velocidad real$/u;
const FILL_FACTOR = /^×7\s200\s*cámara rápida$/u;
const MAGNETORQUER_DUMP = /^×1\s700\s*cámara rápida$/u;
const THRUSTER_DUMP = /^×2,5\s*cámara rápida$/u;
const REDUCED_MANEUVER = /^×4\s*cámara rápida$/u;
const REDUCED_FILL = /^×18\s000\s*cámara rápida$/u;

test.describe('escala de tiempo en el lienzo', () => {
  async function openScene(page: Page, width = 1280): Promise<ReturnType<Page['locator']>> {
    await page.setViewportSize({ width, height: 900 });
    await openLab(page);
    return page.locator(LAB);
  }

  for (const width of SCENE_WIDTHS) {
    test(`a ${width} px el factor no toca texto ni trazo en la maniobra ni en la perturbación`, async ({
      page,
    }) => {
      const lab = await openScene(page, width);
      const scene = lab.locator(SCENE);

      await expect(lab.locator(SCENE_BADGE)).toHaveText(REAL_TIME);
      expect(await badgeTouches(scene)).toEqual([]);

      await lab.getByRole('radio', { name: 'Perturbación y descarga' }).check({ force: true });
      await expect(lab.locator(SCENE_BADGE)).toHaveText(FILL_FACTOR);
      expect(await badgeTouches(scene), 'magnetopar, relleno').toEqual([]);
      await lab.getByRole('button', { name: 'Ir a la descarga' }).click();
      await expect(lab.locator(SCENE_BADGE)).toHaveText(MAGNETORQUER_DUMP);
      expect(await badgeTouches(scene), 'magnetopar, descarga').toEqual([]);

      await lab.getByRole('radio', { name: 'Propulsor' }).check({ force: true });
      await lab.getByRole('button', { name: 'Ir a la descarga' }).click();
      await expect(lab.locator(SCENE_BADGE)).toHaveText(THRUSTER_DUMP);
      expect(await badgeTouches(scene), 'propulsor, descarga').toEqual([]);
    });
  }

  test('la maniobra lo dice en la esquina izquierda y la perturbación en la derecha, bajo el dibujo', async ({
    page,
  }) => {
    const lab = await openScene(page);
    const scene = (await lab.locator(SCENE).boundingBox())!;
    const place = async () => {
      const box = (await lab.locator(SCENE_BADGE).boundingBox())!;
      return {
        left: box.x - scene.x,
        right: scene.x + scene.width - (box.x + box.width),
        bottom: scene.y + scene.height - (box.y + box.height),
      };
    };

    const maneuver = await place();
    await lab.getByRole('radio', { name: 'Perturbación y descarga' }).check({ force: true });
    await expect(lab.locator(SCENE_BADGE)).toHaveText(FILL_FACTOR);
    const disturbance = await place();

    expect(maneuver.left).toBeLessThan(maneuver.right);
    expect(disturbance.right).toBeLessThan(disturbance.left);
    for (const edge of [maneuver.bottom, disturbance.bottom]) expect(edge).toBeLessThan(16);
  });

  test('sigue habiendo una sola región status en el laboratorio: la escala va en la descripción del dibujo', async ({
    page,
  }) => {
    const lab = await openScene(page);
    await lab.getByRole('radio', { name: 'Perturbación y descarga' }).check({ force: true });

    await expect(lab.getByRole('status')).toHaveCount(1);
    await expect(lab.locator(`${SCENE} [role="img"]`)).toHaveAttribute(
      'aria-label',
      /Escala de tiempo: 7\s200 veces la velocidad real, cámara rápida\.$/u,
    );
  });

  test('con movimiento reducido lee el paso que se ve: la maniobra de 60 s en 15 s es ×4, el relleno ×18 000', async ({
    browser,
  }) => {
    const server = await browser.newContext({ javaScriptEnabled: false, reducedMotion: 'reduce' });
    const plain = await server.newPage();
    await plain.goto(PAGE);
    // The server cannot know reduced motion: it sends real time.
    await expect(plain.locator(SCENE_BADGE)).toHaveText(REAL_TIME);
    await server.close();

    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await openLab(page);
    const lab = page.locator(LAB);
    await expect(lab.locator(SCENE_BADGE)).toHaveText(REDUCED_MANEUVER);
    await lab.getByRole('radio', { name: 'Perturbación y descarga' }).check({ force: true });
    await expect(lab.locator(SCENE_BADGE)).toHaveText(REDUCED_FILL);
    await context.close();
  });
});
