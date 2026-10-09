import { defineConfig, devices } from '@playwright/test';

const BASE_PATH = '/2026_C3_UNICA_FUN-18_FCV1.Portfolio.Physics/';
const PORT = 4321;
const IS_CI = !!process.env.CI;
const PREVIEW_COMMAND = `pnpm run preview --ignore-lock --port ${PORT}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: IS_CI,
  retries: IS_CI ? 1 : 0,
  // On CI the html report feeds the playwright-report artifact uploaded on failure.
  reporter: IS_CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}${BASE_PATH}`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // The CI job builds before e2e; locally, build first so the preview is never stale.
    command: IS_CI ? PREVIEW_COMMAND : `pnpm run build && ${PREVIEW_COMMAND}`,
    url: `http://localhost:${PORT}${BASE_PATH}`,
    reuseExistingServer: !IS_CI,
    timeout: 120_000,
  },
});
