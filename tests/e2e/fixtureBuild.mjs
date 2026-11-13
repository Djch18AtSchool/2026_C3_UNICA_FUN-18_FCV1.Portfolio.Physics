/**
 * Builds one e2e fixture (see fixtureSite.ts) in this process: `node fixtureBuild.mjs <root> <work>`
 * with NODE_ENV=production. The options are the ones `startFixtureSite` previews with.
 */
import { join } from 'node:path';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { build } from 'astro';

const [root, work] = process.argv.slice(2);
if (!root || !work) throw new Error('usage: fixtureBuild.mjs <root> <work>');

await build({
  root,
  configFile: false,
  mode: 'production',
  logLevel: 'error',
  outDir: join(work, 'dist'),
  cacheDir: join(work, 'cache'),
  devToolbar: { enabled: false },
  integrations: [react()],
  vite: { plugins: [tailwindcss()], cacheDir: join(work, 'vite') },
});
