import { expect, test } from '@playwright/test';
import {
  CLOCKED_LABS,
  enableLoop,
  hydratePage,
  labRoot,
  measureFrames,
  pressPause,
  pressPlay,
} from './labMetrics';

/**
 * DOM mutations per animation frame under a playing laboratory's root (B1a's budget). Only the
 * moving layer may change per frame; readouts and the transport text follow the clock at 10 Hz.
 * Frame rates depend on the machine and are measured with `pnpm run measure:labs`, not here.
 */
const MAX_MUTATIONS_PER_FRAME = 12;
const PLAY_MS = 1000;
/**
 * A paused lab must not keep mutating: the loop is gone. A few records may still land right after
 * the click (the settled render, the readout announcer), never a per-frame stream.
 */
const MAX_MUTATIONS_PER_FRAME_PAUSED = 0.5;

test.use({ viewport: { width: 1280, height: 900 }, reducedMotion: 'no-preference' });

for (const lab of CLOCKED_LABS) {
  test(`Tema ${lab.number}: el laboratorio reproduce con ≤ ${MAX_MUTATIONS_PER_FRAME} mutaciones del DOM por cuadro`, async ({
    page,
  }) => {
    await page.goto(`./temas/${lab.slug}/`);
    await hydratePage(page);
    const root = await labRoot(page, lab);
    await enableLoop(page, root);
    const selector = `[data-testid="${lab.testId}"]`;

    await pressPlay(root);
    const playing = await measureFrames(page, selector, PLAY_MS);
    await pressPause(root);
    const paused = await measureFrames(page, selector, PLAY_MS / 2);

    expect(playing.frames, 'frames measured').toBeGreaterThan(10);
    expect(playing.mutationsPerFrame, 'mutations per frame while playing').toBeLessThanOrEqual(
      MAX_MUTATIONS_PER_FRAME,
    );
    expect(paused.mutationsPerFrame, 'mutations per frame while paused').toBeLessThanOrEqual(
      MAX_MUTATIONS_PER_FRAME_PAUSED,
    );
  });
}
