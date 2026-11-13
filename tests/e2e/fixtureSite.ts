/**
 * A test page outside the site (tests/e2e/fixtures/<name>/, an Astro root of its own), built and
 * served on a free port for one spec file: shared lab pieces are tried there without touching a
 * real topic. Built once per file (run its tests in serial mode, with a beforeAll timeout of
 * FIXTURE_BUILD_TIMEOUT_MS) and removed when it stops: the build folder and the .astro folder
 * Astro's build writes into the fixture's root (both ignored by git).
 */
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroInlineConfig } from 'astro';

/** A cold Astro build of a fixture takes ~2 s; under a loaded e2e run, far more. */
export const FIXTURE_BUILD_TIMEOUT_MS = 120_000;

export interface FixtureSite {
  url: string;
  stop(): Promise<void>;
}

/**
 * Astro writes a build outside the working directory into the project's .astro, so the build
 * lives under node_modules/.cache (ignored by git), one folder per run.
 */
const WORK_ROOT = join(process.cwd(), 'node_modules', '.cache', 'e2e-fixtures');

/** A port the system says is free now (never the developer's 4321, which is taken). */
async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}

/** The build script run in a process of its own (it reads the work and the root from argv). */
const BUILD_SCRIPT = fileURLToPath(new URL('./fixtureBuild.mjs', import.meta.url));

/**
 * `astro build` in a child process with NODE_ENV=production: React picks its development or its
 * production build when first imported, and its server renderer and its elements must agree. In a
 * Playwright worker another spec may already have imported React in development mode (a module
 * cache the build would then share), so the build never runs in the worker's own process.
 */
function buildFixture(root: string, work: string): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      [BUILD_SCRIPT, root, work],
      { env: { ...process.env, NODE_ENV: 'production' }, timeout: FIXTURE_BUILD_TIMEOUT_MS },
      (error, _stdout, stderr) => {
        if (error) reject(new Error(`the fixture build failed: ${stderr || error.message}`));
        else resolve();
      },
    );
  });
}

export async function startFixtureSite(name: string): Promise<FixtureSite> {
  const root = fileURLToPath(new URL(`./fixtures/${name}/`, import.meta.url));
  await mkdir(WORK_ROOT, { recursive: true });
  const work = await mkdtemp(join(WORK_ROOT, `${name}-`));
  const port = await freePort();
  const config: AstroInlineConfig = {
    root,
    configFile: false,
    mode: 'production',
    logLevel: 'error',
    outDir: join(work, 'dist'),
    cacheDir: join(work, 'cache'),
    devToolbar: { enabled: false },
    server: { host: '127.0.0.1', port },
  };
  const cleanUp = () =>
    Promise.all([
      rm(work, { recursive: true, force: true }),
      rm(join(root, '.astro'), { recursive: true, force: true }),
    ]);
  try {
    await buildFixture(root, work);
    const { preview } = await import('astro');
    const server = await preview(config);
    return {
      url: `http://127.0.0.1:${port}/`,
      async stop() {
        await server.stop();
        await cleanUp();
      },
    };
  } catch (error) {
    await cleanUp();
    throw error;
  }
}
