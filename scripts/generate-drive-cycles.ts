/**
 * Writes src/data/drive-cycles.json ({ query, retrieved, cycles }) from the EPA dynamometer drive
 * schedules (UDDS, HWFET, US06), listed on the page in `query.page`. Each file is tab-delimited
 * ASCII with a two-line header and one row per second: test time (s) and target speed (mph).
 * Speeds are converted to m/s here. Run with `pnpm run data:cycles`; the JSON is committed, so
 * nothing is downloaded at build time. Source and pitfalls:
 * docs/superpowers/research/2026-10-30-frenado-regenerativo.md, §4.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MS_PER_MPH } from '../src/lib/physics/energy';

const OUTPUT = resolve(dirname(fileURLToPath(import.meta.url)), '../src/data/drive-cycles.json');
const PAGE = 'https://www.epa.gov/vehicle-and-fuel-emissions-testing/dynamometer-drive-schedules';
const CYCLES = {
  udds: { name: 'UDDS', url: 'https://www.epa.gov/sites/default/files/2015-10/uddscol.txt' },
  hwfet: { name: 'HWFET', url: 'https://www.epa.gov/sites/default/files/2015-10/hwycol.txt' },
  us06: {
    name: 'US06',
    url: 'https://www.epa.gov/system/files/other-files/2025-03/us06col.txt',
  },
} as const;
/** mph in the files has one decimal; × 0,44704 is exact with 6 decimals. */
const SPEED_DECIMALS = 6;

type CycleId = keyof typeof CYCLES;
interface Sample {
  t: number;
  v: number;
}

/** The file's bytes, so the hash is the one of the file as served (research §4 lists them). */
async function download(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} respondió ${response.status} ${response.statusText}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

/** Data rows are exactly two numbers; the header lines (some quoted) are skipped. */
function parseSchedule(text: string, url: string): Sample[] {
  const samples = text
    .split(/\r?\n/)
    .map((line) => line.replaceAll('"', '').trim().split(/\s+/))
    .filter((fields) => fields.length === 2 && fields.every((f) => /^\d+(\.\d+)?$/.test(f)))
    .map(([t, mph]) => ({
      t: Number(t),
      v: Number((Number(mph) * MS_PER_MPH).toFixed(SPEED_DECIMALS)),
    }));
  if (samples.length < 2) {
    throw new Error(`${url}: se esperaban filas "tiempo velocidad", se leyeron ${samples.length}`);
  }
  samples.forEach((sample, i) => {
    if (i > 0 && !(sample.t > samples[i - 1].t)) {
      throw new Error(`${url}: el tiempo no aumenta en la fila ${i} (t = ${sample.t})`);
    }
  });
  return samples;
}

async function fetchCycle(id: CycleId) {
  const { name, url } = CYCLES[id];
  const bytes = await download(url);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  return [id, { name, url, sha256, samples: parseSchedule(bytes.toString('ascii'), url) }] as const;
}

async function main(): Promise<void> {
  const ids = Object.keys(CYCLES) as CycleId[];
  const cycles = Object.fromEntries(await Promise.all(ids.map(fetchCycle)));
  const urls = Object.fromEntries(ids.map((id) => [id, CYCLES[id].url]));
  const retrieved = new Date().toISOString().slice(0, 10);
  const json = `${JSON.stringify({ query: { page: PAGE, urls }, retrieved, cycles })}\n`;
  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, json);
  ids.forEach((id) => {
    const { samples, sha256 } = cycles[id];
    console.log(
      `${CYCLES[id].name}: ${samples.length} muestras, 0…${samples[samples.length - 1].t} s, sha256 ${sha256.slice(0, 8)}`,
    );
  });
}

main().catch((error: unknown) => {
  console.error('No se pudo generar drive-cycles.json:', error);
  process.exitCode = 1;
});
