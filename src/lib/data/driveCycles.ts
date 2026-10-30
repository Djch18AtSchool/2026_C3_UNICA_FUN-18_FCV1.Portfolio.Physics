import { z } from 'astro/zod';
import raw from '../../data/drive-cycles.json';
import type { CycleSample } from '../physics/energy';

/** The three EPA dynamometer schedules the site uses: city, highway and aggressive driving. */
export type CycleId = 'udds' | 'hwfet' | 'us06';

/** A drive cycle: t (s) and v (m/s) once per second, with the EPA file it was read from. */
export interface DriveCycle {
  name: string;
  samples: CycleSample[];
  source: { url: string; retrieved: string; sha256: string };
}

/** zod 4 numbers already reject NaN and ±Infinity. */
const sampleSchema = z.object({ t: z.number(), v: z.number().nonnegative() });

const cycleSchema = z.object({
  name: z.string().min(1),
  url: z.url(),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  samples: z
    .array(sampleSchema)
    .min(2)
    .refine((samples) => samples.every((s, i) => i === 0 || s.t > samples[i - 1].t), {
      message: 'cycle time must increase from one sample to the next',
    }),
});

const fileSchema = z.object({
  query: z.object({
    page: z.url(),
    urls: z.object({ udds: z.url(), hwfet: z.url(), us06: z.url() }),
  }),
  retrieved: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  cycles: z.object({ udds: cycleSchema, hwfet: cycleSchema, us06: cycleSchema }),
});

/**
 * Validates the JSON written by scripts/generate-drive-cycles.ts (`pnpm run data:cycles`) and
 * returns each cycle with its source. Throws if the shape, a speed or the time order is wrong.
 */
export function parseDriveCycles(json: unknown): Record<CycleId, DriveCycle> {
  const { retrieved, cycles } = fileSchema.parse(json);
  const toCycle = ({ name, url, sha256, samples }: z.infer<typeof cycleSchema>): DriveCycle => ({
    name,
    samples,
    source: { url, retrieved, sha256 },
  });
  return { udds: toCycle(cycles.udds), hwfet: toCycle(cycles.hwfet), us06: toCycle(cycles.us06) };
}

/**
 * EPA UDDS (1369 s, 11,99 km), HWFET (765 s) and US06 (600 s), downloaded from
 * https://www.epa.gov/vehicle-and-fuel-emissions-testing/dynamometer-drive-schedules
 * (research §4; EPA data, free for educational use).
 */
export const DRIVE_CYCLES: Readonly<Record<CycleId, DriveCycle>> = parseDriveCycles(raw);
