import { expect, test } from '@playwright/test';
// React is imported in development mode by this very file (as another spec of the worker may do):
// the fixture build must not share that module cache.
import 'react';
import { FIXTURE_BUILD_TIMEOUT_MS, startFixtureSite } from './fixtureSite';

test('a fixture builds and serves even when React is already loaded in development mode', async ({
  page,
}) => {
  test.setTimeout(FIXTURE_BUILD_TIMEOUT_MS + 30_000);
  const site = await startFixtureSite('lab-time');
  try {
    await page.goto(site.url);
    await expect(page.locator('[data-testid="drone-lab"], [data-lab-shell]').first()).toBeAttached();
  } finally {
    await site.stop();
  }
});
