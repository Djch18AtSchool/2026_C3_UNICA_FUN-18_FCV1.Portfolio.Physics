/**
 * Saturn's rings in Tema 9's planet frame (D2): to radial scale (NSSDCA fact sheet), only at
 * Saturn, both Voyagers' periapsis outside the A ring, scaled by the zoom with the scale bar still
 * true for them, under the track and the probe, colored by the token in both themes, and the
 * corner texts kept apart from them at the lab's framing.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { contrastRatio } from '../../src/lib/color';
import { waitForIsland } from './helpers';

const PAGE = './temas/asistencia-gravitatoria/';
const LAB = '[data-testid="flyby-lab"]';
const FRAME = '[data-testid="flyby-planet-frame"]';
const DESKTOP = { width: 1280, height: 800 };
const PHONE = { width: 360, height: 800 };
const BLOCKING_IMPACTS = ['serious', 'critical'];
const NON_TEXT_MIN = 3;
/** The A ring's outer edge in R_S: the fact sheet's 136 780 km over Saturn's 60 268 km. */
const A_OUTER_RS = 136780 / 60268;
const SATURN_PRESETS = [
  { label: 'V2 · Saturno', rp: 2.67 },
  { label: 'V1 · Saturno', rp: 3.05 },
] as const;
const OTHER_PRESETS = ['V2 · Júpiter', 'V2 · Urano', 'V2 · Neptuno', 'V1 · Júpiter'];
/** What the surface casing adds to a trace's width over the rings (1,5 px a side). */
const CASING_EXTRA_PX = 3;
const TRACES = ['track', 'travelled', 'periapsis'] as const;

async function typeRp(lab: Locator, text: string): Promise<void> {
  const field = lab.getByRole('textbox', { name: 'Máxima aproximación r sub p' });
  await field.fill(text);
  await field.press('Enter');
  await expect(lab.getByTestId('flyby-rp-value')).toContainText(text);
}

async function openLab(page: Page, theme: 'light' | 'dark' = 'light'): Promise<Locator> {
  await page.addInitScript((value) => window.localStorage.setItem('theme', value), theme);
  await page.goto(PAGE);
  await page.locator(LAB).scrollIntoViewIfNeeded();
  await waitForIsland(page, LAB);
  const lab = page.locator(LAB);
  await lab
    .locator('[data-zoom-viewport]')
    .evaluate((element) => element.scrollIntoView({ block: 'center' }));
  return lab;
}

async function chooseEncounter(lab: Locator, label: string): Promise<void> {
  const arrival = lab.getByTestId('flyby-arrival');
  const before = await arrival.textContent();
  await lab.getByRole('combobox', { name: 'Valores de referencia' }).selectOption({ label });
  await expect(arrival).not.toHaveText(before ?? '');
}

const rings = (lab: Locator) => lab.locator('[data-testid="flyby-rings"] circle');

/** The drawing as its attributes say: planet centre and radius, periapsis, and each ring's edges. */
async function drawn(lab: Locator) {
  return lab.locator(FRAME).evaluate((svg) => {
    const number = (element: Element | null, name: string) =>
      Number(element?.getAttribute(name) ?? NaN);
    const planet = svg.querySelector('[data-testid="flyby-planet"]');
    const knob = svg.querySelector('[data-testid="periapsis-handle"] [data-knob]');
    return {
      centre: { x: number(planet, 'cx'), y: number(planet, 'cy') },
      radius: number(planet, 'r'),
      periapsis: { x: number(knob, 'cx'), y: number(knob, 'cy') },
      rings: [...svg.querySelectorAll('[data-testid="flyby-rings"] circle')].map((ring) => {
        const r = number(ring, 'r');
        const half = number(ring, 'stroke-width') / 2;
        return { id: ring.getAttribute('data-ring'), inner: r - half, outer: r + half };
      }),
    };
  });
}

const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);

/** «rgb(…)» or «color(srgb …)», as the browser computes a stroke, to #rrggbb. */
function toHex(css: string): string {
  const srgb = /color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)/u.exec(css);
  const rgb = /rgba?\((\d+), (\d+), (\d+)/u.exec(css);
  const channels = srgb
    ? srgb.slice(1).map((c) => Math.round(Number(c) * 255))
    : (rgb?.slice(1) ?? []).map(Number);
  if (channels.length !== 3) throw new Error(`No color in «${css}»`);
  return `#${channels.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

type Box = { x: number; y: number; width: number; height: number };
const isApart = (a: Box, b: Box) =>
  a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y;
const isInside = (inner: Box, outer: Box) =>
  inner.x >= outer.x &&
  inner.y >= outer.y &&
  inner.x + inner.width <= outer.x + outer.width &&
  inner.y + inner.height <= outer.y + outer.height;

test.describe('los anillos de Saturno en el marco del planeta', () => {
  test.use({ viewport: DESKTOP });

  test('solo Saturno lleva anillos: C, B y A; ningún otro planeta', async ({ page }) => {
    const lab = await openLab(page);

    await expect(rings(lab)).toHaveCount(0);
    for (const label of OTHER_PRESETS.slice(1)) {
      await chooseEncounter(lab, label);
      await expect(rings(lab), label).toHaveCount(0);
    }
    for (const { label } of SATURN_PRESETS) {
      await chooseEncounter(lab, label);
      await expect(rings(lab)).toHaveCount(3);
      await expect(rings(lab).first()).toBeVisible();
      expect((await drawn(lab)).rings.map(({ id }) => id)).toEqual(['C', 'B', 'A']);
    }
  });

  test('a escala radial: la V2 (2,67 R_S) y la V1 (3,05 R_S) pasan por fuera del anillo A', async ({
    page,
  }) => {
    const lab = await openLab(page);

    for (const { label, rp } of SATURN_PRESETS) {
      await chooseEncounter(lab, label);
      const { centre, radius, periapsis, rings: edges } = await drawn(lab);
      const outer = edges[2].outer;

      expect(
        edges.map(({ inner, outer: o }) => [inner / radius, o / radius].map((v) => v.toFixed(2))),
      ).toEqual([
        ['1.24', '1.53'],
        ['1.53', '1.95'],
        ['2.03', '2.27'],
      ]);
      expect(distance(periapsis, centre), label).toBeGreaterThan(outer);
      expect((distance(periapsis, centre) - outer) / radius).toBeCloseTo(rp - A_OUTER_RS, 1);
    }
  });

  test('el zoom los escala con el planeta y la barra de escala sigue siendo cierta para ellos', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const lab = await openLab(page);
    await chooseEncounter(lab, 'V2 · Saturno');
    const before = await drawn(lab);
    const acercar = lab
      .getByRole('group', { name: 'Zoom' })
      .getByRole('button', { name: 'Acercar', exact: true });

    await acercar.click();
    await acercar.click();
    await expect(lab.locator('[data-zoom-factor]')).toHaveText('×2');
    const after = await drawn(lab);
    const bar = await lab.locator(`${FRAME} g[data-scale-bar]`).evaluate((group) => {
      const [, left, right] = /^M([\d.-]+) [\d.-]+V[\d.-]+H([\d.-]+)V/u.exec(
        group.querySelector('path')?.getAttribute('d') ?? '',
      ) ?? ['', 'NaN', 'NaN'];
      return { px: Number(right) - Number(left), text: group.querySelector('text')?.textContent };
    });
    const [, value] = /^(\d+)\s*R/u.exec((bar.text ?? '').trim()) ?? [];

    expect(after.rings[2].outer).toBeCloseTo(2 * before.rings[2].outer, 6);
    expect(after.rings[0].inner).toBeCloseTo(2 * before.rings[0].inner, 6);
    // The bar is `value` R_S long: the A ring's outer edge measured with it is 2,27 R_S.
    expect((after.rings[2].outer / bar.px) * Number(value)).toBeCloseTo(A_OUTER_RS, 3);
  });

  test('la hipérbola, la sonda y el punto de máxima aproximación van encima de los anillos', async ({
    page,
  }) => {
    const lab = await openLab(page);
    await chooseEncounter(lab, 'V2 · Saturno');
    const order = await lab.locator(FRAME).evaluate((svg) => {
      const ringGroup = svg.querySelector('[data-testid="flyby-rings"]')!;
      const follows = (selector: string) =>
        ringGroup.compareDocumentPosition(svg.querySelector(selector)!) ===
        Node.DOCUMENT_POSITION_FOLLOWING;
      return ['[data-testid="flyby-planet"]', 'path', '[data-testid="flyby-probe"]'].map(follows);
    });
    const knob = lab.getByTestId('periapsis-handle').locator('[data-knob]');
    const at = (await knob.boundingBox())!;
    const hit = await page.evaluate(
      ({ x, y }) =>
        document.elementFromPoint(x, y)?.closest('[data-testid]')?.getAttribute('data-testid'),
      { x: at.x + at.width / 2, y: at.y + at.height / 2 },
    );

    expect(order).toEqual([true, true, true]);
    expect(hit).toBe('periapsis-handle');
  });

  test('describe los anillos al lector y la nota dice el plano y los colores ilustrativos', async ({
    page,
  }) => {
    const lab = await openLab(page);
    await chooseEncounter(lab, 'V2 · Saturno');

    await expect(
      lab.getByRole('img', { name: /^Sobrevuelo en el marco de Saturno/ }),
    ).toHaveAccessibleName(
      /Los anillos principales, de 1,24 a 2,27 R sub S.*plano del sobrevuelo.*por fuera del anillo A\.$/u,
    );
    const leftOut = lab.locator('details[data-lab-note="left-out"]');
    await leftOut.locator('summary').click();
    await expect(leftOut).toContainText('se verían como elipses');
    await expect(leftOut).toContainText('Los colores de los planetas son ilustrativos');
  });
});

for (const theme of ['light', 'dark'] as const) {
  for (const size of [DESKTOP, PHONE]) {
    test(`a ${size.width} px (${theme}): anillos con el color del token, visibles y lejos de los textos de las esquinas`, async ({
      page,
    }) => {
      await page.setViewportSize(size);
      const lab = await openLab(page, theme);

      for (const { label } of SATURN_PRESETS) {
        await chooseEncounter(lab, label);
        const colors = await rings(lab).evaluateAll((circles) =>
          circles.map((circle) => getComputedStyle(circle).stroke),
        );
        const planet = await lab
          .getByTestId('flyby-planet')
          .evaluate((circle) => getComputedStyle(circle).fill);
        const surface = await lab
          .locator(FRAME)
          .evaluate((svg) =>
            getComputedStyle(svg.ownerDocument.documentElement).getPropertyValue('--bg-elevated'),
          );
        const [c, b, a] = colors.map(toHex);
        const edges = (
          await lab
            .locator(`${FRAME} [data-ring-edge]`)
            .evaluateAll((circles) => circles.map((circle) => getComputedStyle(circle).stroke))
        ).map(toHex);
        const contour = toHex(
          await lab
            .getByTestId('flyby-planet')
            .evaluate((circle) => getComputedStyle(circle).stroke),
        );

        // The fills are paler than the globe (C fainter); each band keeps a 3:1 outline in the
        // token (C darker), and the globe's contour stands 3:1 apart from every fill (round 2, I2).
        expect(b).not.toBe(toHex(planet));
        expect(a).toBe(b);
        expect(c).not.toBe(b);
        expect(edges.slice(2)).toEqual([
          toHex(planet),
          toHex(planet),
          toHex(planet),
          toHex(planet),
        ]);
        expect(edges[0]).not.toBe(toHex(planet));
        for (const edge of [edges[0], edges[2]]) {
          expect(contrastRatio(edge, surface.trim())).toBeGreaterThanOrEqual(NON_TEXT_MIN);
        }
        for (const fill of [c, b]) {
          expect(contrastRatio(contour, fill), `contorno sobre ${fill}`).toBeGreaterThanOrEqual(
            NON_TEXT_MIN,
          );
        }

        const ringBox = (await lab.getByTestId('flyby-rings').boundingBox())!;
        const svg = (await lab.locator(FRAME).boundingBox())!;
        expect(isInside(ringBox, svg)).toBe(true);
        for (const hud of [
          lab.locator(`${FRAME} g[data-time-scale-badge]`),
          lab.getByTestId('flyby-rp-value'),
          lab.locator(`${FRAME} g[data-scale-bar]`),
          lab.locator(`${FRAME} [data-hud-backdrop="vp-key"]`),
        ]) {
          expect(isApart(ringBox, (await hud.boundingBox())!)).toBe(true);
        }
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        size.width,
      );
    });
  }

  test(`con r_p = 2 R_S (${theme}), la pista, el tramo recorrido y la línea de r_p se leen sobre los anillos: 3:1 contra su borde`, async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP);
    const lab = await openLab(page, theme);
    await chooseEncounter(lab, 'V2 · Saturno');
    await typeRp(lab, '2');
    // Halfway through the pass the probe is at periapsis: the stretch flown reaches the rings.
    await lab.getByRole('slider', { name: 'Línea de tiempo' }).press('End');
    const { centre, radius, rings: edges } = await drawn(lab);
    const surface = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--bg-elevated').trim(),
    );

    for (const name of TRACES) {
      const pair = await lab.locator(FRAME).evaluate((svg, traceName) => {
        const trace = svg.querySelector(`[data-trace="${traceName}"]`) as SVGGeometryElement;
        const casing = trace.previousElementSibling as SVGGeometryElement;
        const at = (k: number) => trace.getPointAtLength((trace.getTotalLength() * k) / 64);
        return {
          casing: casing.getAttribute('data-casing'),
          traceColor: getComputedStyle(trace).stroke,
          casingColor: getComputedStyle(casing).stroke,
          widths: [trace, casing].map((element) =>
            Number(getComputedStyle(element).strokeWidth.replace('px', '')),
          ),
          points: Array.from({ length: 65 }, (_, k) => ({ x: at(k).x, y: at(k).y })),
        };
      }, name);
      const overRings = pair.points.filter((point) => {
        const r = distance(point, centre);
        return edges.some(({ inner, outer }) => r >= inner && r <= outer);
      });

      expect(pair.casing, name).toBe(name);
      expect(overRings.length, `${name} cruza los anillos`).toBeGreaterThan(0);
      expect(toHex(pair.casingColor), name).toBe(surface);
      expect(pair.widths[1] - pair.widths[0], name).toBeCloseTo(CASING_EXTRA_PX, 6);
      expect(
        contrastRatio(toHex(pair.traceColor), toHex(pair.casingColor)),
        name,
      ).toBeGreaterThanOrEqual(NON_TEXT_MIN);
    }
    expect(radius).toBeGreaterThan(0);
  });

  test(`«planeta agrandado» sobre su fondo, sin tocar las marcas de la barra (${theme})`, async ({
    page,
  }) => {
    await page.setViewportSize(PHONE);
    const lab = await openLab(page, theme);
    await chooseEncounter(lab, 'V2 · Saturno');
    await typeRp(lab, '100');
    const note = lab.locator(FRAME).getByText('planeta agrandado');
    const backdrop = lab.locator(`${FRAME} [data-hud-backdrop="note"]`);

    await expect(note).toBeVisible();
    const fill = await backdrop.evaluate((rect) => getComputedStyle(rect).fill);
    const surface = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--bg-elevated').trim(),
    );
    expect(toHex(fill)).toBe(surface);
    expect(isInside((await note.boundingBox())!, (await backdrop.boundingBox())!)).toBe(true);
    const ticks = (await lab.locator(`${FRAME} g[data-scale-bar] path`).boundingBox())!;
    expect(isApart((await backdrop.boundingBox())!, ticks)).toBe(true);
  });

  test(`sin violaciones graves de accesibilidad con Saturno (${theme})`, async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    const lab = await openLab(page, theme);
    await chooseEncounter(lab, 'V2 · Saturno');

    const { violations } = await new AxeBuilder({ page }).include(LAB).analyze();

    expect(
      violations
        .filter((violation) => BLOCKING_IMPACTS.includes(violation.impact ?? ''))
        .map(({ id, nodes }) => ({ id, targets: nodes.map((node) => node.target.join(' ')) })),
    ).toEqual([]);
  });
}
