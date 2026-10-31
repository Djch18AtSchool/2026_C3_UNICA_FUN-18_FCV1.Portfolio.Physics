/**
 * Playback measurements shared by `scripts/measure-labs.ts` and `lab-performance.spec.ts`: which
 * laboratories have a clock, how to get one playing on its page, and what one playing stretch
 * costs in frames and DOM mutations.
 */
import type { Locator, Page } from '@playwright/test';

export interface ClockedLab {
  number: number;
  slug: string;
  /** `data-testid` of the LabShell root, where the MutationObserver listens. */
  testId: string;
}

/** The seven laboratories with a transport bar (Temas 4 and 5 have none). */
export const CLOCKED_LABS: readonly ClockedLab[] = [
  { number: 1, slug: 'dron-reparto', testId: 'drone-lab' },
  { number: 2, slug: 'salto-personaje', testId: 'jump-lab' },
  { number: 3, slug: 'gravedad-artificial', testId: 'habitat-lab' },
  { number: 6, slug: 'frenado-regenerativo', testId: 'regen-lab' },
  { number: 7, slug: 'coeficiente-restitucion', testId: 'bounce-lab' },
  { number: 8, slug: 'ruedas-reaccion', testId: 'wheel-lab' },
  { number: 9, slug: 'asistencia-gravitatoria', testId: 'flyby-lab' },
];

export interface FrameSample {
  frames: number;
  /** Measured stretch (s). */
  seconds: number;
  fps: number;
  /** The slowest frame of every twenty (ms). */
  p95Ms: number;
  /** MutationObserver records under the lab root, per animation frame. */
  mutationsPerFrame: number;
}

const SCROLL_STEP_PX = 600;
const P95 = 0.95;
const MS_PER_S = 1000;

/** Walks the page so every client:visible island hydrates, then waits until none is left. */
export async function hydratePage(page: Page): Promise<void> {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y <= height; y += SCROLL_STEP_PX) {
    await page.mouse.wheel(0, SCROLL_STEP_PX);
  }
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(() => document.querySelectorAll('astro-island[ssr]').length === 0);
}

/** The lab root, scrolled into view and hydrated (Tema 1 loads its route first). */
export async function labRoot(page: Page, lab: ClockedLab): Promise<Locator> {
  const root = page.getByTestId(lab.testId);
  await root.waitFor({ state: 'attached' });
  await root.scrollIntoViewIfNeeded();
  return root;
}

/** Turns "Repetir" on in the settings drawer, so a short run (the jump) keeps playing. */
export async function enableLoop(page: Page, root: Locator): Promise<void> {
  await root.getByRole('button', { name: 'Ajustes del simulador' }).click();
  const dialog = page.getByRole('dialog');
  // The switch is a visually hidden checkbox: its label takes the click.
  await dialog.getByText('Repetir', { exact: true }).click();
  await dialog.getByRole('switch', { name: 'Repetir' }).waitFor({ state: 'attached' });
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'hidden' });
}

export async function pressPlay(root: Locator): Promise<void> {
  await root.getByRole('button', { name: 'Reproducir', exact: true }).click();
}

export async function pressPause(root: Locator): Promise<void> {
  await root.getByRole('button', { name: 'Pausar', exact: true }).click();
}

/**
 * Counts animation frames, their durations and the DOM mutations under `rootSelector` for `ms`
 * of wall time. Runs in the page; the lab should already be playing.
 */
export function measureFrames(page: Page, rootSelector: string, ms: number): Promise<FrameSample> {
  return page.evaluate(
    ({ selector, duration, p95, msPerS }) =>
      new Promise<FrameSample>((resolve, reject) => {
        const root = document.querySelector(selector);
        if (!root) {
          reject(new Error(`No element matches ${selector}`));
          return;
        }
        let mutations = 0;
        const observer = new MutationObserver((records) => {
          mutations += records.length;
        });
        observer.observe(root, {
          subtree: true,
          childList: true,
          attributes: true,
          characterData: true,
        });
        const frameMs: number[] = [];
        let frames = 0;
        let last = performance.now();
        const start = last;
        const onFrame = (now: number) => {
          frameMs.push(now - last);
          last = now;
          frames += 1;
          if (now - start < duration) {
            requestAnimationFrame(onFrame);
            return;
          }
          observer.disconnect();
          const sorted = [...frameMs].sort((a, b) => a - b);
          const seconds = (now - start) / msPerS;
          resolve({
            frames,
            seconds,
            fps: frames / seconds,
            p95Ms: sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p95))],
            mutationsPerFrame: mutations / frames,
          });
        };
        requestAnimationFrame(onFrame);
      }),
    { selector: rootSelector, duration: ms, p95: P95, msPerS: MS_PER_S },
  );
}
