/**
 * The preset transition (D4, auditoría §8) in every lab with presets: choosing another one fades
 * the canvas in from faint in 200 ms, with the new values already drawn and read, and leaves
 * nothing behind; with reduced motion (the system's or the site's) there is no transition at all.
 * Tema 1 has no presets (its scenario is the view and the leg).
 */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { waitForIsland } from './helpers';
import { TOPIC_PAGES, type TopicPage } from './topicPages';

const TRANSITION_ID = 'lab-preset-transition';
const TRANSITION_MS = 200;
const PRESET_LABS = TOPIC_PAGES.filter(({ number }) => number !== 1);

interface Played {
  id: string;
  duration: number;
  isCanvas: boolean;
  /** The lab's readouts as the transition started: the values it fades in. */
  readouts: string;
}

declare global {
  interface Window {
    presetAnimations?: { animation: Animation; record: () => Played }[];
  }
}

/** Records every Web Animation the page starts, with what the lab read at that moment. */
async function recordAnimations(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const animate = Element.prototype.animate;
    window.presetAnimations = [];
    Element.prototype.animate = function (this: Element, ...args: Parameters<Element['animate']>) {
      const animation = animate.apply(this, args);
      const readouts =
        this.closest('[data-lab-shell]')?.querySelector('[data-lab-level="readouts"]')
          ?.textContent ?? '';
      const timing = animation.effect?.getTiming();
      const isCanvas = this.matches('[data-lab-canvas]');
      window.presetAnimations?.push({
        animation,
        record: () => ({
          id: animation.id,
          duration: Number(timing?.duration),
          isCanvas,
          readouts,
        }),
      });
      return animation;
    };
  });
}

const playedTransitions = (page: Page) =>
  page.evaluate(
    (id) =>
      (window.presetAnimations ?? [])
        .map(({ record }) => record())
        .filter((played) => played.id === id),
    TRANSITION_ID,
  );

async function openLab(page: Page, { path, labTestId }: TopicPage): Promise<Locator> {
  await page.goto(path);
  const lab = page.getByTestId(labTestId);
  await lab.scrollIntoViewIfNeeded();
  await waitForIsland(page, `[data-testid="${labTestId}"]`);
  return lab;
}

/** Chooses a preset other than the active one: a chip not pressed, or another option. */
async function chooseAnotherPreset(lab: Locator): Promise<void> {
  const presets = lab.locator('[data-lab-presets]');
  if ((await presets.getAttribute('data-lab-presets')) === 'chips') {
    await presets.locator('button[aria-pressed="false"]').first().click();
    return;
  }
  const select = presets.locator('select');
  const other = await select.evaluate(
    (node: HTMLSelectElement) =>
      [...node.options].find((option) => !option.selected && !option.disabled && option.value)
        ?.value,
  );
  if (!other) throw new Error('sin otro preajuste que elegir');
  await select.selectOption(other);
}

const readoutsText = (lab: Locator) =>
  lab.locator('[data-lab-level="readouts"]').evaluate((node) => node.textContent ?? '');

for (const topic of PRESET_LABS) {
  test.describe(`Tema ${topic.number}`, () => {
    test.use({ viewport: { width: 1280, height: 900 }, reducedMotion: 'no-preference' });

    test('elegir otro preajuste funde el lienzo en 200 ms con los valores nuevos ya dibujados, y no deja nada', async ({
      page,
    }) => {
      await recordAnimations(page);
      const lab = await openLab(page, topic);
      const canvas = lab.locator('[data-lab-canvas]');
      const attributes = () =>
        canvas.evaluate((node) =>
          [...node.attributes].map(({ name, value }) => `${name}=${value}`),
        );
      const before = await attributes();

      await chooseAnotherPreset(lab);

      await expect.poll(() => playedTransitions(page)).toHaveLength(1);
      const [played] = await playedTransitions(page);
      expect(played.isCanvas, 'en el lienzo del laboratorio').toBe(true);
      expect(played.duration).toBe(TRANSITION_MS);
      // It ends by itself, and with it everything it changed.
      await page.evaluate(() =>
        Promise.all((window.presetAnimations ?? []).map(({ animation }) => animation.finished)),
      );
      expect(
        await canvas.evaluate(
          (node, id) => node.getAnimations().filter((animation) => animation.id === id).length,
          TRANSITION_ID,
        ),
      ).toBe(0);
      expect(await attributes()).toEqual(before);
      // Nothing waited for it: what the lab read as it started is what it reads now.
      await expect.poll(() => readoutsText(lab)).toBe(played.readouts);
    });

    test('con movimiento reducido del sistema, los valores cambian sin transición', async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await recordAnimations(page);
      const lab = await openLab(page, topic);
      const panel = await lab.locator('[data-lab-presets]').innerText();

      await chooseAnotherPreset(lab);

      await expect.poll(() => lab.locator('[data-lab-presets]').innerText()).not.toBe(panel);
      expect(await playedTransitions(page)).toEqual([]);
    });
  });
}

test.describe('el ajuste del sitio «Movimiento: reducido»', () => {
  test.use({ viewport: { width: 1280, height: 900 }, reducedMotion: 'no-preference' });

  for (const topic of PRESET_LABS.slice(0, 3)) {
    test(`Tema ${topic.number}: quita la transición aunque el sistema no la pida`, async ({
      page,
    }) => {
      await page.addInitScript(() =>
        window.localStorage.setItem('portafolio.settings', JSON.stringify({ motion: 'reduced' })),
      );
      await recordAnimations(page);
      const lab = await openLab(page, topic);
      const panel = await lab.locator('[data-lab-presets]').innerText();

      await chooseAnotherPreset(lab);

      await expect.poll(() => lab.locator('[data-lab-presets]').innerText()).not.toBe(panel);
      expect(await playedTransitions(page)).toEqual([]);
    });
  }
});
