/**
 * Writes src/data/drone-route.json ({ definition, samples }) from the declared route in
 * src/lib/data/droneRoute.ts. Run with `pnpm run data:drone`; the JSON is committed and imported
 * by the Tema 1 island, so nothing is generated at build time.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DRONE_ROUTE, generateRoute, routeDuration } from '../src/lib/data/droneRoute';

const OUTPUT = resolve(dirname(fileURLToPath(import.meta.url)), '../src/data/drone-route.json');
const DECIMALS = 3;
const SCALE = 10 ** DECIMALS;

/** Rounds to DECIMALS places and turns −0 into 0, so the JSON stays small and stable. */
function round(value: number): number {
  const rounded = Math.round(value * SCALE) / SCALE;
  return rounded === 0 ? 0 : rounded;
}

function main(): void {
  const samples = generateRoute(DRONE_ROUTE).map((sample) =>
    Object.fromEntries(Object.entries(sample).map(([key, value]) => [key, round(value)])),
  );
  const json = `${JSON.stringify({ definition: DRONE_ROUTE, samples })}\n`;
  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, json);
  console.log(
    `drone-route.json: ${samples.length} muestras, duración ${routeDuration(DRONE_ROUTE).toFixed(3)} s`,
  );
}

try {
  main();
} catch (error) {
  console.error('No se pudo generar drone-route.json:', error);
  process.exitCode = 1;
}
