# Stack API verification (Astro 7 spike) - 2026-10-08

Spike (throwaway, left for inspection): `/tmp/claude-1000/-home-dylan-projects-university-2026-Q3-Physics-I-portfolio/5404acdc-282a-49b2-bbac-e94eb5dc576d/scratchpad/astro-spike`
Verified there: `pnpm run check` (0 errors), `pnpm run build` (OK), `pnpm run test:cov` (3 pass, thresholds enforced), `pnpm run e2e` (1 pass).
Scaffold: `pnpm create astro@latest astro-spike -- --template minimal --no-git --install --yes --no-ai --skip-houston` (create-astro 5.2.5; `--yes` gives TS strict).

## Summary of changes vs. the brief (read first)

1. Astro 7 default Markdown processor is Sätteri, NOT remark/rehype. `remark-math` + `rehype-katex` need `@astrojs/markdown-remark` and `markdown.processor: unified({...})`. `markdown.remarkPlugins/rehypePlugins` are deprecated; `mdx({remarkPlugins})` is deprecated. Set it ONCE at top level; MDX inherits it.
2. `astro check` fails with TypeScript 7.0.2 ("does not currently support TypeScript 7.0"). Pin `typescript@^6.0.3` (6.0.3 latest 6.x).
3. `z` comes from `astro/zod` (re-export of `zod/v4`; `zod` package not needed). `z` from `astro:content` still works but is deprecated.
4. `astro preview`/`astro dev` auto-background when an AI agent is detected. For Playwright `webServer` use `astro preview --ignore-lock` (forces foreground).
5. Named slots in MDX only work with block-level children on their own lines: `<Fragment slot="x">..</Fragment>` separated by blank lines. Inline `<span slot>` is wrapped in `<p>` and lands in the default slot.
6. Recharts 3.10: `responsive` prop exists (since 3.3); `ResponsiveContainer` still exists. SSR renders an empty wrapper with no error; `client:only` is NOT required.
7. astro check also type-checks `playwright.config.ts` -> needs `@types/node`; exclude `coverage`, `test-results`, `playwright-report` in tsconfig.
8. Set `"packageManager": "pnpm@11.1.1"` in package.json (withastro/action warns and uses latest pnpm otherwise).

## 1. astro.config (site, base, trailingSlash, integrations, Tailwind, remark-math/rehype-katex)

Verdict: works with change (processor API instead of `markdown.remarkPlugins`).
Docs: https://docs.astro.build/en/reference/markdown-processors/unified/ , https://docs.astro.build/en/guides/markdown-content/ , https://docs.astro.build/en/guides/integrations-guide/mdx/ , https://docs.astro.build/en/guides/upgrade-to/v7/ , https://docs.astro.build/en/reference/configuration-reference/

Install extra: `pnpm add @astrojs/markdown-remark` (7.3.2). `remark-math`, `rehype-katex`, `katex` as usual. Verified: output HTML has `.katex`, `.katex-display`, MathML annotation.

`astro.config.mjs`

```js
// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import { unified } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://djch18atschool.github.io',
  base: '/2026_C3_UNICA_FUN-18_FCV1.Portfolio.Physics',
  trailingSlash: 'always',
  integrations: [mdx(), react()],
  markdown: {
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [rehypeKatex],
    }),
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
```

Pitfalls:
- Plugins go in `markdown.processor: unified({ remarkPlugins, rehypePlugins })` ONLY. `mdx()` inherits `markdown.processor` (`extendMarkdownConfig` defaults true). `mdx({remarkPlugins/rehypePlugins/recmaPlugins})` still typed but marked `@deprecated`.
- remark-math/rehype-katex are unified plugins; Astro 7 defaults to Sätteri (docs), so `unified()` is required for them (the Sätteri path was not tested).
- Tailwind: no `@astrojs/tailwind` integration; `vite: { plugins: [tailwindcss()] }` works (docs recommend `astro add tailwind`, which does the same).
- Astro 7 uses Vite 8; Rust compiler is stricter about HTML (unclosed tags fail; `<div>` inside `<p>` not auto-fixed); `compressHTML` default is now `'jsx'` (whitespace between inline elements may collapse; use `{" "}`).
- No `experimental` flags needed.
- Math in MDX verified: `$\frac{a}{b}$`, `$x_{i} < y$`, `\$5` (escaped dollar), `$$` block with braces all build correctly.

## 2. Content collection `topics`

Verdict: works. Docs: https://docs.astro.build/en/guides/content-collections/ , https://docs.astro.build/en/guides/upgrade-to/v6/

- Config file: `src/content.config.ts` (legacy `src/content/config.ts` removed in v6).
- `z`: `import { z } from 'astro/zod'` (Zod 4, re-export of `zod/v4`; astro depends on zod ^4.6.5 itself, no direct `zod` dependency needed). `z` from `astro:content` works but TS flags it `@deprecated`.
- `glob` from `astro/loaders`. Entry `id` = filename without extension (`cinematica`). `entry.slug` no longer exists (accessing it warns). Render with `render(entry)` from `astro:content`, not `entry.render()`.
- `getCollection('topics', filterFn)`; result order is non-deterministic -> sort yourself.
- `superRefine` verified: a bad entry fails the build with `finishedOn: finishedOn must not be before startedOn` (location: file path). Zod 4 `ctx.addIssue({ code: 'custom', path, message })`. Zod 4 notes: `.default()` must match output type; `{ message }` -> `{ error }`; `z.email()`.

`src/content.config.ts`

```ts
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const topics = defineCollection({
  loader: glob({ base: './src/content/topics', pattern: '*.mdx' }),
  schema: z
    .object({
      title: z.string().min(1),
      order: z.number().int().positive(),
      summary: z.string(),
      minutes: z.number().int().positive().default(10),
      draft: z.boolean().default(false),
      tags: z.array(z.string()).default([]),
      startedOn: z.coerce.date(),
      finishedOn: z.coerce.date().optional(),
    })
    .superRefine((data, ctx) => {
      if (data.finishedOn && data.finishedOn < data.startedOn) {
        ctx.addIssue({
          code: 'custom',
          path: ['finishedOn'],
          message: 'finishedOn must not be before startedOn',
        });
      }
    }),
});

export const collections = { topics };
```

`src/pages/temas/[slug].astro`

```astro
---
import { getCollection, render } from 'astro:content';
import type { GetStaticPaths } from 'astro';
import Base from '../../layouts/Base.astro';

export const getStaticPaths = (async () => {
  const topics = await getCollection('topics');
  return topics.map((topic) => ({
    params: { slug: topic.id },
    props: { topic },
  }));
}) satisfies GetStaticPaths;

const { topic } = Astro.props;
const { Content } = await render(topic);
---

<Base title={topic.data.title}>
  <h1 class="text-3xl font-semibold">{topic.data.title}</h1>
  <Content />
</Base>
```

Pitfalls: if ids contain `/` (subfolders) use `[...slug].astro`. `satisfies GetStaticPaths` type-checks under `astro check`.

## 3. MDX entry: Astro component with named slots + React island + KaTeX

Verdict: works with change (slot syntax). Docs: https://docs.astro.build/en/guides/integrations-guide/mdx/ (React integration page not separately read; `client:visible` verified by build + browser).

`src/content/topics/cinematica.mdx`

```mdx
---
title: Cinemática
order: 1
summary: Movimiento rectilíneo uniformemente acelerado.
tags: [mru, mruv]
startedOn: 2026-09-01
---
import Callout from '../../components/Callout.astro';
import VelocityChart from '../../components/VelocityChart.tsx';

## Ecuación

Inline $v = v_0 + at$ y bloque:

$$
x(t) = x_0 + v_0 t + \tfrac{1}{2} a t^2
$$

<Callout tone="warn">

<Fragment slot="title">Cuidado</Fragment>

Contenido **por defecto** del slot, con $a = 9.8$.

<Fragment slot="footer">Fuente: guía 1</Fragment>

</Callout>

<VelocityChart client:visible />
```

`src/components/Callout.astro`

```astro
---
interface Props {
  tone?: 'info' | 'warn';
}
const { tone = 'info' } = Astro.props;
---

<aside data-testid="callout" class:list={['border-l-4 p-4 my-4 bg-white', tone === 'warn' ? 'border-red-600' : 'border-accent']}>
  <header class="font-semibold text-accent"><slot name="title">Nota</slot></header>
  <div><slot /></div>
  <footer class="font-mono text-sm"><slot name="footer" /></footer>
</aside>
```

- KaTeX CSS import path (verified, fonts emitted to `_astro/`): `import 'katex/dist/katex.min.css';` (in the layout, see item 5).
- Named slots: the first attempt `<span slot="title">..</span>` inline inside `<Callout>` produced `<p><span slot=...>` in the DEFAULT slot. Fix = each slot child as its own block (blank lines around), using `<Fragment slot="name">`.
- `client:visible` island: SSR HTML has `<astro-island ... client="visible">`; the chart hydrates on scroll into view. In Playwright, `toBeVisible()` on `.recharts-surface` auto-waits (passes without manual scroll).
- Import extension in MDX: `../../components/VelocityChart.tsx` (with extension) works.

## 4. Internal links under `base`, and what `astro preview` serves

Verdict: works. Docs: https://docs.astro.build/en/reference/configuration-reference/ (base, trailingSlash), https://docs.astro.build/en/guides/deploy/github/

- With `trailingSlash: 'always'`, `import.meta.env.BASE_URL` = `/2026_C3_UNICA_FUN-18_FCV1.Portfolio.Physics/` (WITH trailing slash; docs: BASE_URL follows `trailingSlash`). Build the href as `` `${base}temas/${id}/` `` (no extra slash after base, trailing slash at end).
- Home link: `href={import.meta.env.BASE_URL}`. Also usable inside `.tsx` islands (Vite static replacement; not separately exercised).
- Verified output hrefs: `/2026_C3_UNICA_FUN-18_FCV1.Portfolio.Physics/`, `/2026_C3_UNICA_FUN-18_FCV1.Portfolio.Physics/temas/cinematica/`; assets `/…Physics/_astro/…`.
- Served URLs (curl, `astro preview --port 4399` and `astro dev`):

| URL | status |
|---|---|
| `/` | 404 |
| `/2026_C3_UNICA_FUN-18_FCV1.Portfolio.Physics` (no slash) | 404 |
| `/2026_C3_UNICA_FUN-18_FCV1.Portfolio.Physics/` | 200 |
| `/…Physics/temas/cinematica` (no slash) | 404 |
| `/…Physics/temas/cinematica/` | 200 |

- Playwright pitfall: `baseURL` must end with `/` and `goto` paths must be RELATIVE (`page.goto('./')`, `page.goto('./temas/cinematica/')`). `page.goto('/')` resolves to the host root and 404s.
- Also in Astro 7 `astro dev`/`astro preview` auto-run as background daemons when an agent is detected (`astro preview status|stop|logs`); see item 7.

## 5. Tailwind 4 (`@import "tailwindcss"` + `@theme`) in .astro and .tsx

Verdict: works. Docs: https://docs.astro.build/en/guides/styling/ (Tailwind section; step: import the CSS file in the layout).

Utilities generated from theme tokens (`bg-paper`, `text-accent`, `border-accent`) appear in built CSS; `rounded-lg border border-accent p-2 font-mono` used in `VelocityChart.tsx` also present. No `tailwind.config` file, no content globs (automatic source detection).

`src/styles/global.css`

```css
@import "tailwindcss";

@theme {
  --color-ink: #0f172a;
  --color-paper: #fafaf7;
  --color-accent: #0e7490;
  --font-sans: "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, monospace;
}

body {
  background: var(--color-paper);
  color: var(--color-ink);
  font-family: var(--font-sans);
}
```

`src/layouts/Base.astro`

```astro
---
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import 'katex/dist/katex.min.css';
import '../styles/global.css';

interface Props {
  title: string;
}
const { title } = Astro.props;
const base = import.meta.env.BASE_URL;
---

<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <title>{title}</title>
  </head>
  <body class="bg-paper text-ink">
    <nav class="flex gap-4 p-4">
      <a data-testid="home-link" href={base}>Inicio</a>
    </nav>
    <main class="mx-auto max-w-3xl p-4">
      <slot />
    </main>
  </body>
</html>
```

Pitfall: the `@theme` token `--font-sans` must list the family name exactly as fontsource defines it (see item 10).

## 6. Vitest

Verdict: works. Docs: https://docs.astro.build/en/guides/testing/ (recommends `getViteConfig` from `astro/config`).

- `getViteConfig` is NOT needed for tests that import plain TS under `src/lib`. Simplest config below works (vitest 5.0.3). `getViteConfig({test:{...}})` also works (tried) - only needed if tests import `.astro`/`astro:*` modules (Container API).
- Coverage provider package: `@vitest/coverage-v8` (5.0.3, must match vitest version). Command: `vitest run --coverage`.
- Threshold enforcement verified: adding an uncovered file in `src/lib/` made the run fail with `ERROR: Coverage for lines (75%) does not meet global threshold (80%)` (and exit code non-zero). `coverage.include` reports uncovered files even if never imported by a test.
- `.astro` type check: `src/lib/*.test.ts` are picked up by `astro check` (passes).

`vitest.config.ts`

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/lib/**'],
      exclude: ['src/**/*.test.ts'],
      reporter: ['text', 'html'],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
```

`src/lib/kinematics.test.ts` (sample)

```ts
import { describe, expect, test } from 'vitest';
import { position } from './kinematics';

describe('position', () => {
  test('returns x0 at t = 0', () => {
    expect(position({ x0: 3, v0: 2, a: 1 }, 0)).toBe(3);
  });

  test('applies x0 + v0 t + a t^2 / 2', () => {
    expect(position({ x0: 0, v0: 2, a: 4 }, 3)).toBe(24);
  });

  test('throws when t is negative', () => {
    expect(() => position({ x0: 0, v0: 0, a: 0 }, -1)).toThrow(RangeError);
  });
});
```

## 7. Playwright

Verdict: works with change (`--ignore-lock`). Docs: https://docs.astro.build/en/guides/testing/ (Playwright section: `webServer` runs `npm run preview`, `baseURL`).

- `webServer.command` builds then previews. In Astro 7, `astro preview` auto-backgrounds when an agent is detected (source: `supportsAgentAutoBackgrounding`/`isRunByAgent` in `astro/dist/cli/preview/index.js`) and exits immediately; `--ignore-lock` yields a one-off foreground server (cannot be combined with `--background`/`--force`). Keep the flag always: harmless on CI and avoids lock-file collisions.
- Use `pnpm run build`/`pnpm run preview` (explicit `run`), args after the script name are forwarded to astro.
- Browser install: `pnpm exec playwright install chromium` (CI: add `--with-deps`).
- Recharts DOM for assertions: `.recharts-surface` (svg), axis labels render as `.recharts-label` (NOT inside `.recharts-xAxis`). Rendered chart size with the style below: 640x400.

`playwright.config.ts`

```ts
import { defineConfig, devices } from '@playwright/test';

const BASE_PATH = '/2026_C3_UNICA_FUN-18_FCV1.Portfolio.Physics/';
const PORT = 4321;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}${BASE_PATH}`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `pnpm run build && pnpm run preview --ignore-lock --port ${PORT}`,
    url: `http://localhost:${PORT}${BASE_PATH}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

`e2e/smoke.spec.ts`

```ts
import { expect, test } from '@playwright/test';

test('index lists topics and navigates to a topic page with math and chart', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Portafolio de Física I');

  await page.getByTestId('topic-link').first().click();
  await expect(page).toHaveURL(/\/temas\/cinematica\/$/);
  await expect(page.locator('.katex-display')).toBeVisible();
  await expect(page.getByTestId('callout')).toContainText('Cuidado');
  await expect(page.locator('.recharts-surface')).toBeVisible();
  await expect(page.locator('.recharts-label', { hasText: 't (s)' })).toBeVisible();
});
```

Pitfalls: `astro check` type-checks `playwright.config.ts`, so install `@types/node@24`; exclude `coverage`, `test-results`, `playwright-report` from tsconfig (otherwise generated `coverage/*.js` produce errors/hints):

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist", "coverage", "test-results", "playwright-report", "node_modules"]
}
```

## 8. GitHub Pages deploy workflow

Verdict: works (copied verbatim from the docs source `withastro/docs/src/content/docs/en/guides/deploy/github.mdx`; not run on GitHub). Docs: https://docs.astro.build/en/guides/deploy/github/
Tags confirmed via `gh api`: `actions/checkout` v7, `withastro/action` v6, `actions/deploy-pages` v5 all exist.

`.github/workflows/deploy.yml`

```yaml
name: Deploy to GitHub Pages

on:
  # Trigger the workflow every time you push to the `main` branch
  # Using a different branch name? Replace `main` with your branch’s name
  push:
    branches: [ main ]
  # Allows you to run this workflow manually from the Actions tab on GitHub.
  workflow_dispatch:
  
# Allow this job to clone the repo and create a page deployment
permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout your repository using git
        uses: actions/checkout@v7
      - name: Install, build, and upload your site
        uses: withastro/action@v6
        # with:
          # path: . # The root location of your Astro project inside the repository. (optional)
          # node-version: 24 # The specific version of Node that should be used to build your site. Defaults to 24. (optional)
          # package-manager: pnpm@latest # The Node package manager that should be used to install dependencies and build your site. Automatically detected based on your lockfile. (optional)
          # build-cmd: pnpm run build # The command to run to build your site. Runs the package build script/task by default. (optional)
        # env:
          # PUBLIC_POKEAPI: 'https://pokeapi.co/api/v2' # Use single quotation marks for the variable value. (optional)

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v5
```

- Inputs of `withastro/action@v6`: `path` (.), `node-version` (default 24), `package-manager` (auto-detect from lockfile), `build-cmd`, `cache` (true), `cache-dir`, `out-dir` (dist). It sets up pnpm via `pnpm/action-setup` reading the `packageManager` field of package.json; if missing it warns and uses latest -> keep `"packageManager": "pnpm@11.1.1"` and commit `pnpm-lock.yaml` and `pnpm-workspace.yaml` (contains `allowBuilds: esbuild, sharp`, needed by pnpm 11 to run install scripts).
- The action uploads the artifact itself (no separate `upload-pages-artifact` step needed).
- The default branch must be `main` (or edit `branches`). `site`/`base` must match item 1.
- Enable Pages with the workflow source (GitHub REST docs https://docs.github.com/en/rest/pages/pages - `build_type`: `legacy|workflow`; requires admin; NOT executed in this spike):

```bash
# first time (creates the site)
gh api -X POST repos/OWNER/REPO/pages -f build_type=workflow
# if the site already exists (returns 409 on POST), switch it:
gh api -X PUT repos/OWNER/REPO/pages -f build_type=workflow
```

Note: repository SSH alias rules in `~/projects/CLAUDE.md` apply to git remotes; `gh` uses its own auth, so check `gh auth status` shows the account that owns `djch18atschool/2026_C3_UNICA_FUN-18_FCV1.Portfolio.Physics`.

## 9. Recharts 3

Verdict: works. Docs: https://recharts.github.io/en-US/guide/sizes/ (the `/guide/sizeAndResponsive/` URL 404s)

- `ResponsiveContainer` still exported in 3.10.1 (docs: "not quite as flexible", needs parent with defined size). Charts accept a `responsive` prop (since 3.3) and size via `style` (`width: '100%'`, `maxWidth`, `aspectRatio`). Chart needs width/height or style sizing, else renders nothing.
- SSR: no error and no `client:only="react"` needed. With `client:visible` the server HTML contains only an empty `<div class="recharts-wrapper">` and the SVG appears after hydration (so no SSR content for crawlers/print; fine for a portfolio).
- pnpm installed `react-is` as an auto peer of recharts 3 (`recharts@3.10.1_..._react-is@19.3.0`); if peer auto-install is disabled add `react-is` explicitly.

`src/components/VelocityChart.tsx`

```tsx
import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis, Label } from 'recharts';

interface Point {
  t: number;
  v: number;
}

const DATA: Point[] = Array.from({ length: 11 }, (_, i) => ({ t: i, v: 2 + 3 * i }));

export default function VelocityChart() {
  return (
    <div data-testid="velocity-chart" className="rounded-lg border border-accent p-2 font-mono">
    <LineChart
      responsive
      style={{ width: '100%', maxWidth: 640, aspectRatio: 1.6 }}
      data={DATA}
      margin={{ top: 8, right: 16, bottom: 24, left: 16 }}
    >
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="t">
        <Label value="t (s)" position="insideBottom" offset={-12} />
      </XAxis>
      <YAxis>
        <Label value="v (m/s)" angle={-90} position="insideLeft" />
      </YAxis>
      <Tooltip />
      <Line type="monotone" dataKey="v" stroke="#0e7490" dot />
    </LineChart>
    </div>
  );
}
```

## 10. @fontsource (IBM Plex)

Verdict: works. Docs: fontsource.org page for the family did not list import paths; verified directly from installed package files (`@fontsource/ibm-plex-sans@5.3.0`, `@fontsource/ibm-plex-mono@5.3.0`) and by build output.

```ts
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
```

- font-family names: `"IBM Plex Sans"`, `"IBM Plex Mono"` (confirmed in generated `@font-face`).
- Per-weight files also ship `latin-ext`, `cyrillic`, `greek`, `vietnamese` subsets via `unicode-range`; the browser only downloads used ones, but all woff/woff2 are copied into `dist/_astro/` (bigger dist, no runtime cost). For Spanish, `latin` suffices; to trim use `@fontsource/ibm-plex-sans/latin-400.css` (not tested).

## 11. Deprecated / renamed (Astro 5 -> 7) relevant here

Docs: https://docs.astro.build/en/guides/upgrade-to/v6/ , https://docs.astro.build/en/guides/upgrade-to/v7/

| Item | Status |
|---|---|
| `src/content/config.ts` | removed; use `src/content.config.ts` + `loader` (v6) |
| `entry.slug`, `entry.render()`, `getEntryBySlug` | removed; use `entry.id`, `render(entry)`, `getEntry` |
| `z` from `astro:content` / `astro:schema` | deprecated; use `astro/zod` (Zod 4) |
| `<ViewTransitions />` | removed; use `<ClientRouter />` from `astro:transitions` (not used by this project) |
| `Astro.glob()` | removed; use `import.meta.glob()` |
| `markdown.remarkPlugins/rehypePlugins`, `mdx({remarkPlugins,...})` | deprecated; use `markdown.processor: unified({...})` (v7: Sätteri default) |
| `astro check` + TypeScript 7 | unsupported; use TS 6.x (`@astrojs/check@0.9.10` peer is `^5 \|\| ^6`). TS 7.1+ path: `@astrojs/ts-content-mapper` + `tsc --noEmit --runExternalCode` (experimental, not tried) |
| Vite | 8 (v7) |
| Node | >=22.12 (v6); action uses 24 |
| `compressHTML` | default `'jsx'` in v7 |
| Rust compiler | strict HTML in v7 |
| Images | default service crops, never upscales (v6); not used in the spike |
| `import.meta.env` | inlined, never coerced (compare strings) |
| Heading ids | trailing hyphens kept (anchor links) |
| `astro dev`/`preview` | auto-background under agents (`astro dev stop`, `astro preview stop`) |
| `Astro.props` typing | `interface Props` in frontmatter works under `astro check` |

## Pinned versions (spike package.json, resolved by pnpm 11.1.1)

```
astro                    7.3.8
@astrojs/mdx             8.0.3
@astrojs/react           7.0.1
@astrojs/markdown-remark 7.3.2   (NEW: needed for remark/rehype)
@astrojs/check           0.9.10
react / react-dom        19.3.0
@types/react(-dom)       19.3.0
recharts                 3.10.1
katex                    0.19.0
@types/katex             0.16.8
rehype-katex             7.0.1
remark-math              6.0.0
tailwindcss              4.3.3
@tailwindcss/vite        4.3.3
@fontsource/ibm-plex-sans 5.3.0
@fontsource/ibm-plex-mono 5.3.0
vitest                   5.0.3
@vitest/coverage-v8      5.0.3
@playwright/test         1.64.0   (chromium headless shell v1248)
typescript               6.0.3    (NOT 7.0.2; see summary)
@types/node              24.19.1
zod                      4.6.5    (transitive via astro; import from astro/zod)
node 24.14.1, pnpm 11.1.1 ("packageManager": "pnpm@11.1.1")
```

Full `package.json` of the spike:

```json
{
  "name": "astro-spike",
  "type": "module",
  "version": "0.0.1",
  "engines": {
    "node": ">=22.12.0"
  },
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "astro": "astro",
    "check": "astro check",
    "test": "vitest run",
    "test:cov": "vitest run --coverage",
    "e2e": "playwright test"
  },
  "dependencies": {
    "@astrojs/markdown-remark": "^7.3.2",
    "@astrojs/mdx": "^8.0.3",
    "@astrojs/react": "^7.0.1",
    "@fontsource/ibm-plex-mono": "^5.3.0",
    "@fontsource/ibm-plex-sans": "^5.3.0",
    "@tailwindcss/vite": "^4.3.3",
    "astro": "^7.3.8",
    "katex": "^0.19.0",
    "react": "^19.3.0",
    "react-dom": "^19.3.0",
    "recharts": "^3.10.1",
    "rehype-katex": "^7.0.1",
    "remark-math": "^6.0.0",
    "tailwindcss": "^4.3.3"
  },
  "devDependencies": {
    "@astrojs/check": "^0.9.10",
    "@playwright/test": "^1.64.0",
    "@types/katex": "^0.16.8",
    "@types/node": "^24.19.1",
    "@types/react": "^19.3.0",
    "@types/react-dom": "^19.3.0",
    "@vitest/coverage-v8": "^5.0.3",
    "typescript": "^6.0.3",
    "vitest": "^5.0.3"
  },
  "packageManager": "pnpm@11.1.1"
}
```

`pnpm-workspace.yaml` (generated by create-astro; keep):

```yaml
allowBuilds:
  esbuild: true
  sharp: true
```

## Commands

```bash
pnpm install                          # install
pnpm run dev                          # astro dev (served at http://localhost:4321/<base>/)
pnpm run build                        # astro build -> dist/
pnpm run preview                      # astro preview (http://localhost:4321/<base>/); add --ignore-lock for foreground under agents
pnpm run check                        # astro check (needs TypeScript 6)
pnpm run test                         # vitest run
pnpm run test:cov                     # vitest run --coverage (threshold on src/lib/**)
pnpm exec playwright install chromium # once
pnpm run e2e                          # playwright test (builds + previews itself)
```

package.json scripts added to the scaffold: `"check": "astro check"`, `"test": "vitest run"`, `"test:cov": "vitest run --coverage"`, `"e2e": "playwright test"`.

.gitignore additions: `coverage/`, `test-results/`, `playwright-report/`.
