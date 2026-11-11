/**
 * A test page outside the site (tests/e2e/fixtures/<name>/, an Astro root of its own), built and
 * served on a free port for one spec file: shared lab pieces are tried there without touching a
 * real topic. Built once per file (run its tests in serial mode) and removed when it stops.
 */
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroInlineConfig } from 'astro';

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

/**
 * Astro, its React renderer and React itself, loaded in production mode as `astro build` loads
 * them: React picks its build when first imported, and its server renderer and its elements must
 * agree. The mode is restored once they are loaded.
 */
async function loadAstro() {
  const mode = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    const [astro, react, tailwind] = await Promise.all([
      import('astro'),
      import('@astrojs/react'),
      import('@tailwindcss/vite'),
    ]);
    return { astro, react: react.default, tailwindcss: tailwind.default };
  } finally {
    if (mode === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = mode;
  }
}

export async function startFixtureSite(name: string): Promise<FixtureSite> {
  const root = fileURLToPath(new URL(`./fixtures/${name}/`, import.meta.url));
  await mkdir(WORK_ROOT, { recursive: true });
  const work = await mkdtemp(join(WORK_ROOT, `${name}-`));
  const port = await freePort();
  const { astro, react, tailwindcss } = await loadAstro();
  const config: AstroInlineConfig = {
    root,
    configFile: false,
    mode: 'production',
    logLevel: 'error',
    outDir: join(work, 'dist'),
    cacheDir: join(work, 'cache'),
    devToolbar: { enabled: false },
    integrations: [react()],
    vite: { plugins: [tailwindcss()], cacheDir: join(work, 'vite') },
    server: { host: '127.0.0.1', port },
  };
  await astro.build(config);
  const server = await astro.preview(config);
  return {
    url: `http://127.0.0.1:${port}/`,
    async stop() {
      await server.stop();
      await rm(work, { recursive: true, force: true });
    },
  };
}
