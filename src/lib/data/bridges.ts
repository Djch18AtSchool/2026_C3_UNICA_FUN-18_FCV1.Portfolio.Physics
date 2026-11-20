import { z } from 'astro/zod';
import { vortexFrequency } from '../physics/resonance';
import rawTorsion from '../../data/tacoma-torsion.json';
import type { ValueOrigin } from './origin';

/*
 * Tema 12 data: the Tacoma Narrows Bridge (1940), the Millennium Bridge (2000), Sétra's resonance
 * ranges for footbridges and the army's march pace, every number from
 * docs/superpowers/research/2026-11-17-resonancia-estructural.md (§3 sources, §4 numbers), all
 * marked CONFIRMADO there and accessed 2026-11-17; plus my frame-by-frame measurement of the 1940
 * film (`pnpm run data:tacoma`, src/data/tacoma-torsion.json). Names carry the unit of the value.
 */

export interface SourcedValue {
  value: number;
  origin: ValueOrigin;
  source: string;
}

export interface SourcedRange {
  min: number;
  max: number;
  origin: ValueOrigin;
  source: string;
}

const FWA = 'Ammann, von Kármán y Woodruff, The Failure of the Tacoma Narrows Bridge (FWA, 1941)';
const BILLAH = 'Billah y Scanlan, Am. J. Phys. 59(2), 118-124 (1991)';
const DALLARD =
  'Dallard et al., The London Millennium Footbridge, The Structural Engineer 79(22) (2001)';
const NEWLAND =
  'Newland, Vibration of the London Millennium Footbridge: Part 2 — Cure (ICSV9, 2002)';
const SETRA = 'Sétra/AFGC, Footbridges: assessment of vibrational behaviour (2006)';
const PHILMAG =
  'Fall of the Broughton Suspension Bridge, near Manchester, The Philosophical Magazine 9(53), 384-389 (1831)';
const FM = 'Department of the Army, FM 3-21.5 Drill and Ceremonies (2003)';
const OWN = 'cálculo propio';

const product = (value: number, source: string): SourcedValue => ({
  value,
  origin: 'producto',
  source,
});
const calculated = (value: number, source: string): SourcedValue => ({
  value,
  origin: 'calculo',
  source,
});

/** Exact definitions: 1 mph = 0,44704 m/s and 1 ft = 0,3048 m. */
export const MPH_TO_M_PER_S = 0.44704;
export const FT_TO_M = 0.3048;
const SECONDS_PER_MINUTE = 60;

/** The Tacoma Narrows Bridge on 7 November 1940, in the units of the sources. */
export const TACOMA = {
  windMph: product(42, `${FWA}, pág. 29 y V-9`),
  torsionCyclesPerMin: product(12, `${FWA}, V-12 (Farquharson); ${BILLAH}, pág. 120`),
  torsionStartCyclesPerMin: product(14, `${FWA}, pág. 31 y V-11 (Farquharson)`),
  verticalCyclesPerMin: {
    min: 36,
    max: 38,
    origin: 'producto',
    source: `${FWA}, págs. 30-31 (8 o 9 nodos)`,
  } satisfies SourcedRange,
  quarterPointRotationDeg: product(45, `${FWA}, pág. 31: «nearly 45 degrees each way»`),
  torsionDampingRatio: product(0.005, `${BILLAH}, pág. 123: $\\delta$ ≈ 0,03, $\\zeta$ ≈ 0,005`),
  deckDepthFt: product(8, `${FWA}, pág. 11; ${BILLAH}, pág. 120`),
  strouhal: product(0.11, `${BILLAH}, pág. 120: «about 0.11»`),
  /** The vertical mode just before the torsion began (≈ 10:00). */
  verticalAtSwitchCyclesPerMin: product(
    37,
    `${FWA}, pág. 31: «The frequency suddenly changed from 37 to 14»`,
  ),
} as const;

const windMs = TACOMA.windMph.value * MPH_TO_M_PER_S;
const deckDepthM = TACOMA.deckDepthFt.value * FT_TO_M;

/** The same numbers in SI units, and the vortex-shedding frequency (12.9) they give. */
export const TACOMA_SI = {
  windMs: calculated(windMs, `${OWN}: 42 mph × 0,44704`),
  deckDepthM: calculated(deckDepthM, `${OWN}: 8 ft × 0,3048`),
  torsionHz: calculated(TACOMA.torsionCyclesPerMin.value / SECONDS_PER_MINUTE, `${OWN}: 12/60`),
  torsionStartHz: calculated(
    TACOMA.torsionStartCyclesPerMin.value / SECONDS_PER_MINUTE,
    `${OWN}: 14/60`,
  ),
  verticalHz: {
    min: TACOMA.verticalCyclesPerMin.min / SECONDS_PER_MINUTE,
    max: TACOMA.verticalCyclesPerMin.max / SECONDS_PER_MINUTE,
    origin: 'calculo',
    source: `${OWN}: 36/60 y 38/60`,
  } satisfies SourcedRange,
  vortexHz: calculated(
    vortexFrequency(TACOMA.strouhal.value, windMs, deckDepthM),
    `${OWN}, (12.9) f_s = S U / D con S, U y D de la tabla`,
  ),
} as const;

/** The Millennium Bridge, London: the lateral sway of June 2000 and its cure. */
export const MILLENNIUM = {
  lateralForceCoefficient: product(
    300,
    `${DALLARD}, págs. 26-27 ($k_p$ en N·s/m, de 0,5 a 1,0 Hz)`,
  ),
  northSpanCriticalPedestrians: product(166, `${NEWLAND} (vano norte, sin amortiguadores)`),
  viscousDampers: product(37, `${DALLARD}; ${NEWLAND}`),
  dampingBefore: {
    min: 0.006,
    max: 0.01,
    origin: 'producto',
    source: `${DALLARD} (0,6-0,8 % medido); ${NEWLAND} («typically 1% or less»)`,
  } satisfies SourcedRange,
  dampingAfter: {
    min: 0.15,
    max: 0.2,
    origin: 'producto',
    source: `${NEWLAND} (modos laterales por debajo de 1,5 Hz)`,
  } satisfies SourcedRange,
  /** First central lateral mode as measured (Dallard et al., tables 1-3). */
  cl1Measured: {
    frequencyHz: product(0.48, `${DALLARD}, tablas 1-3`),
    modalMassKg: product(130_000, `${DALLARD}, tablas 1-3 (medida: de 128 a 130 toneladas)`),
    dampingRatio: calculated(0.007, `${OWN}: centro del 0,6-0,8 % medido por ${DALLARD}`),
  },
  /** The same mode in Arup's design analysis. */
  cl1Analysed: {
    frequencyHz: product(0.49, `${DALLARD}, tablas 1-3 (análisis)`),
    modalMassKg: product(144_000, `${DALLARD}, tablas 1-3 (análisis)`),
  },
} as const;

/** Sétra's range 1, «maximum risk of resonance», for footbridges (Hz). */
export const SETRA_RANGES = {
  vertical: {
    min: 1.7,
    max: 2.1,
    origin: 'producto',
    source: `${SETRA}, tabla 2.3 (pág. 80)`,
  } satisfies SourcedRange,
  lateral: {
    min: 0.5,
    max: 1.1,
    origin: 'producto',
    source: `${SETRA}, tabla 2.4 (pág. 80)`,
  } satisfies SourcedRange,
} as const;

/** Sétra's design pedestrian (§1.2.1 and tabla 1.1): weight, force factors and walking pace. */
export const PEDESTRIAN = {
  weightN: product(700, `${SETRA}, §1.2.1 (G₀)`),
  /** Vertical force amplitude 0,4 G₀, at the walking frequency f_m. */
  verticalFactor: product(0.4, `${SETRA}, §1.2.1: F_v = G₀ + 0,4 G₀ sen(2π f_m t)`),
  /** Lateral force amplitude 0,05 G₀, at half the walking frequency. */
  lateralFactor: product(0.05, `${SETRA}, §1.2.1: F_ht = 0,05 G₀ sen(2π (f_m/2) t)`),
  walkingHz: {
    min: 1.6,
    max: 2.4,
    origin: 'producto',
    source: `${SETRA}, tabla 1.1 (marcha)`,
  } satisfies SourcedRange,
  walkingMeanHz: product(2, `${SETRA}, §1.2.1: «a mean of 2 Hz»`),
  walkingSigmaHz: product(0.2, `${SETRA}, §1.2.1: «a standard deviation of around 0.20 Hz»`),
} as const;

/** The force amplitudes of one pedestrian, 0,4 × 700 = 280 N and 0,05 × 700 = 35 N. */
export const PEDESTRIAN_FORCES = {
  verticalN: calculated(
    PEDESTRIAN.verticalFactor.value * PEDESTRIAN.weightN.value,
    `${OWN}: 0,4 × 700 N`,
  ),
  lateralN: calculated(
    PEDESTRIAN.lateralFactor.value * PEDESTRIAN.weightN.value,
    `${OWN}: 0,05 × 700 N`,
  ),
} as const;

/** Design damping ratio of a steel footbridge (Sétra, tabla 2.6: 0,4 %). */
export const STEEL_FOOTBRIDGE_DAMPING: SourcedValue = product(0.004, `${SETRA}, tabla 2.6`);

/** The company of the 60th Rifles on the Broughton bridge in 1831 (the date is not asserted). */
export const BROUGHTON = {
  soldiersOnBridge: product(60, `${PHILMAG}: «about sixty … were upon the bridge»`),
} as const;

/** Quick time, in steps per minute. */
export const MARCH_PACE: SourcedValue = product(120, `${FM}, párr. 4-5e («Quick Time»)`);
/** Quick time in Hz (cálculo propio: 120/60 = 2,0 Hz), inside Sétra's vertical range. */
export const MARCH_PACE_HZ = MARCH_PACE.value / SECONDS_PER_MINUTE;

// ---------------------------------------------------------------------------------------------
// The frame-by-frame measurement of the 1940 film (scripts/generate-tacoma-torsion.ts)

const sha256 = z.string().regex(/^[0-9a-f]{64}$/);

const bandSchema = z.object({ x0: z.int(), x1: z.int(), y0: z.int(), y1: z.int() });

const shotSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  /** «inclinacion»: left minus right horizon row; «borde»: height of the deck edge. */
  signal: z.enum(['inclinacion', 'borde']),
  /** The shot in the Commons file (research §6.2), video seconds. */
  startS: z.number().nonnegative(),
  endS: z.number().positive(),
  bands: z.array(bandSchema).min(1).max(2),
  smoothingFrames: z.int().positive(),
  periodVideoS: z.number().positive(),
});

const seriesSchema = z.object({
  shotId: z.string().min(1),
  /** Video time of the first value (the measured frames start 0,1 s inside the cut). */
  startS: z.number().nonnegative(),
  fps: z.number().positive(),
  quantity: z.string().min(1),
  unit: z.literal('px'),
  values: z.array(z.number()).min(2),
});

const datasetSchema = z.object({
  retrieved: z.iso.date(),
  source: z.object({
    page: z.url(),
    license: z.string().min(1),
    credit: z.string().min(1),
    files: z
      .array(
        z.object({
          id: z.string().min(1),
          url: z.url(),
          bytes: z.int().positive(),
          sha256,
          sha1: z
            .string()
            .regex(/^[0-9a-f]{40}$/)
            .optional(),
        }),
      )
      .min(1),
  }),
  method: z.object({
    tool: z.string().min(1),
    frame: z.object({ width: z.int().positive(), height: z.int().positive() }),
    fileFps: z.number().positive(),
    cutInsetS: z.number().nonnegative(),
    lagRangeS: z.tuple([z.number().positive(), z.number().positive()]),
    note: z.string().min(1),
  }),
  shots: z.array(shotSchema).min(1),
  meanPeriodVideoS: z.number().positive(),
  /** Elliott's camera ran at 16 fps and the film is shown at 24 (Olson et al. 2015). */
  cameraFps: z.literal(16),
  videoFps: z.literal(24),
  fpsSource: z.string().min(1),
  periodRealS: z.number().positive(),
  frequencyRealHz: z.number().positive(),
  series: z.array(seriesSchema).min(1),
  crossCheck: z.object({
    fileId: z.string().min(1),
    periodsVideoS: z.array(z.number().positive()),
  }),
  published: z.array(
    z.object({
      path: z.string().startsWith('/media/'),
      bytes: z.int().positive(),
      sha256,
      codec: z.string(),
    }),
  ),
});

export type TacomaTorsion = z.infer<typeof datasetSchema>;
export type TorsionShot = TacomaTorsion['shots'][number];
export type TorsionSeries = TacomaTorsion['series'][number];

/** Validates the JSON written by `pnpm run data:tacoma`. */
export function parseTacomaTorsion(raw: unknown): TacomaTorsion {
  return datasetSchema.parse(raw);
}

/**
 * The torsion period measured in three shots of the Commons file (series[i] belongs to shots[i]),
 * its mean in the video, and the real period and frequency after the 16 → 24 fps correction:
 * 3,58 / 3,45 / 3,43 s, mean 3,49 s → 5,23 s, 0,191 Hz (≈ 11,5 cycles/min against Farquharson's
 * 12). Shot 1 reads 3,58 s, not the research's 3,49 s: its horizon tilts only ±2 px, and the
 * 3,49 s came from the zero-padded smoothing of the prototype, which turned that tilt into a square
 * wave (see frameSignals.ts and the errata at the end of research §6.2).
 */
export const TACOMA_TORSION: TacomaTorsion = parseTacomaTorsion(rawTorsion);
