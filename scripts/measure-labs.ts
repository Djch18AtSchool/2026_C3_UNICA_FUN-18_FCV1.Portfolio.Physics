/**
 * Measures the playback cost of the seven clocked laboratories against a running `astro preview`:
 *
 *   pnpm run build && pnpm run preview --port 4324
 *   pnpm run measure:labs http://localhost:4324/2026_C3_UNICA_FUN-18_FCV1.Portfolio.Physics/
 *   pnpm run measure:labs <url> drone-lab,wheel-lab   # only these labs (their data-testid)
 *   npx astro preview stop                            # Astro 7 keeps the preview as a daemon
 *
 * For each lab (or the ones listed by test id), with the CPU at full speed and throttled 4×, it visits the topic, hydrates the
 * page, turns "Repetir" on, plays for 2,5 s and prints fps, the p95 frame time, the DOM mutations
 * per frame under the lab root (MutationObserver) and the script and task milliseconds per frame
 * (CDP Performance.getMetrics). Uses the Chromium that @playwright/test installs. The numbers are
 * machine-dependent: compare before and after on the same machine, never across machines.
 */
import { chromium, type Browser, type CDPSession, type Page } from '@playwright/test';
import {
  CLOCKED_LABS,
  enableLoop,
  hydratePage,
  labRoot,
  measureFrames,
  pressPause,
  pressPlay,
  type ClockedLab,
  type FrameSample,
} from '../tests/e2e/labMetrics';

const VIEWPORT = { width: 1280, height: 900 };
const PLAY_MS = 2500;
const CPU_RATES = [1, 4];
const MS_PER_S = 1000;
const KEEP_NAMES_SHIM = 'globalThis.__name = (fn) => fn;';

interface LabMeasurement extends FrameSample {
  lab: ClockedLab;
  cpuRate: number;
  scriptMsPerFrame: number;
  taskMsPerFrame: number;
}

interface CdpDurations {
  script: number;
  task: number;
}

/** ScriptDuration and TaskDuration (s) accumulated by the renderer so far. */
async function durations(cdp: CDPSession): Promise<CdpDurations> {
  const { metrics } = await cdp.send('Performance.getMetrics');
  const value = (name: string) => metrics.find((metric) => metric.name === name)?.value ?? 0;
  return { script: value('ScriptDuration'), task: value('TaskDuration') };
}

async function measureLab(page: Page, baseUrl: string, lab: ClockedLab, cpuRate: number) {
  // tsx (esbuild keepNames) wraps the functions that `measureFrames` evaluates in the page in a
  // `__name` helper that only exists in Node; the Playwright test runner does not. Shim it.
  await page.addInitScript(KEEP_NAMES_SHIM);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  await page.goto(new URL(`temas/${lab.slug}/`, baseUrl).href);
  await hydratePage(page);
  const root = await labRoot(page, lab);
  await enableLoop(page, root);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpuRate });

  const before = await durations(cdp);
  await pressPlay(root);
  const sample = await measureFrames(page, `[data-testid="${lab.testId}"]`, PLAY_MS);
  const after = await durations(cdp);
  await pressPause(root);

  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  await cdp.detach();
  return {
    ...sample,
    lab,
    cpuRate,
    scriptMsPerFrame: ((after.script - before.script) * MS_PER_S) / sample.frames,
    taskMsPerFrame: ((after.task - before.task) * MS_PER_S) / sample.frames,
  } satisfies LabMeasurement;
}

async function measureAll(
  browser: Browser,
  baseUrl: string,
  labs: readonly ClockedLab[],
): Promise<LabMeasurement[]> {
  const results: LabMeasurement[] = [];
  for (const cpuRate of CPU_RATES) {
    for (const lab of labs) {
      const context = await browser.newContext({
        viewport: VIEWPORT,
        reducedMotion: 'no-preference',
      });
      const page = await context.newPage();
      results.push(await measureLab(page, baseUrl, lab, cpuRate));
      await context.close();
    }
  }
  return results;
}

const fixed = (value: number, decimals: number) => value.toFixed(decimals).replace('.', ',');

function table(results: LabMeasurement[]): string {
  const header = [
    '| Tema | Laboratorio | CPU | fps | p95 (ms) | mut/cuadro | script (ms/cuadro) | tarea (ms/cuadro) |',
    '|---|---|---|---|---|---|---|---|',
  ];
  const rows = results.map((r) =>
    [
      `| ${r.lab.number}`,
      r.lab.testId,
      `${r.cpuRate}×`,
      fixed(r.fps, 1),
      fixed(r.p95Ms, 1),
      fixed(r.mutationsPerFrame, 1),
      fixed(r.scriptMsPerFrame, 2),
      `${fixed(r.taskMsPerFrame, 2)} |`,
    ].join(' | '),
  );
  return [...header, ...rows].join('\n');
}

async function main(): Promise<void> {
  const [, , baseUrl, only] = process.argv;
  if (!baseUrl) {
    throw new Error(
      'Falta la URL del preview: pnpm run measure:labs http://localhost:4324/<base>/ [labs]',
    );
  }
  const wanted = only ? only.split(',') : undefined;
  const labs = wanted ? CLOCKED_LABS.filter((lab) => wanted.includes(lab.testId)) : CLOCKED_LABS;
  const unknown = wanted?.filter((id) => !CLOCKED_LABS.some((lab) => lab.testId === id)) ?? [];
  if (unknown.length > 0) {
    throw new Error(`Laboratorios desconocidos: ${unknown.join(', ')}`);
  }
  const browser = await chromium.launch();
  try {
    const results = await measureAll(browser, baseUrl, labs);
    process.stdout.write(`${table(results)}\n`);
  } finally {
    await browser.close();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
  );
  process.exitCode = 1;
});
