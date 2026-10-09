import { expect, test, type Page } from '@playwright/test';
import { TOPICS } from '../../src/consigna';
import { PENDING_MEDIA } from './helpers';

const HTTP_ERROR_MIN = 400;
const HTTP_NOT_FOUND = 404;
/** Scroll step as a fraction of the viewport, so every client:visible island hydrates. */
const SCROLL_STEP = 0.8;
const SCROLL_PAUSE_MS = 50;

interface PageCase {
  name: string;
  path: string;
  status: number;
}

const PAGES: PageCase[] = [
  { name: 'la portada', path: './', status: 200 },
  ...TOPICS.map((topic) => ({
    name: `el tema ${topic.number}`,
    path: `./temas/${topic.slug}/`,
    status: 200,
  })),
  { name: 'la página 404', path: './no-existe/', status: HTTP_NOT_FOUND },
];

const FAILED_LOAD_PREFIX = 'Failed to load resource';

function isPendingMedia(url: string): boolean {
  return url.includes(PENDING_MEDIA);
}

/**
 * Collect console errors, uncaught exceptions and failed same-origin responses of a page. Only two
 * failures are expected: the pending Tema 5 media, and the document itself on the 404 page (its
 * status is asserted by the test). Chromium reports each failed load as a console error too.
 */
function watchProblems(page: Page, documentUrl: string, isDocumentError: boolean): string[] {
  const { origin } = new URL(documentUrl);
  const isExpectedFailure = (url: string) =>
    isPendingMedia(url) || (isDocumentError && url === documentUrl);
  const problems: string[] = [];
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const source = message.location().url;
    if (message.text().startsWith(FAILED_LOAD_PREFIX) && isExpectedFailure(source)) return;
    problems.push(`console: ${message.text()} (${source})`);
  });
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  page.on('response', (response) => {
    const url = response.url();
    if (new URL(url).origin !== origin || response.status() < HTTP_ERROR_MIN) return;
    if (isExpectedFailure(url)) return;
    problems.push(`HTTP ${response.status()}: ${url}`);
  });
  return problems;
}

/** Scroll top to bottom so client:visible islands hydrate and run their effects. */
async function scrollThroughPage(page: Page): Promise<void> {
  await page.evaluate(
    async ({ step, pause }) => {
      const wait = () => new Promise((resolve) => setTimeout(resolve, pause));
      for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight * step) {
        window.scrollTo(0, y);
        await wait();
      }
      window.scrollTo(0, document.body.scrollHeight);
      await wait();
    },
    { step: SCROLL_STEP, pause: SCROLL_PAUSE_MS },
  );
}

for (const { name, path, status } of PAGES) {
  test(`${name} carga sin errores de consola ni respuestas fallidas`, async ({ page, baseURL }) => {
    const documentUrl = new URL(path, baseURL).href;
    const problems = watchProblems(page, documentUrl, status >= HTTP_ERROR_MIN);

    const response = await page.goto(path);
    // The document's own status is checked here, so its expected 404 is not a problem below.
    expect(response?.status(), path).toBe(status);
    await scrollThroughPage(page);
    await page.waitForLoadState('networkidle');

    expect(problems, path).toEqual([]);
  });
}
