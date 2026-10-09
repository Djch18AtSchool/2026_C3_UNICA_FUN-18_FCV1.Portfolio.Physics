import { elasticEnergy, forceCurve, hookeForce, piecewiseResistance } from '../physics';

/**
 * Settings of the virtual spring behind an adaptive trigger: stiffness k (N/m) and the
 * displacement x₀ where the resistance engages (mm, like the trigger travel).
 */
export interface TriggerSettings {
  k: number;
  start: number;
}

/**
 * Slider ranges of Tema 5. k and x₀ are illustrative: Sony publishes no mapping from the API's
 * 0–255 `startPosition`/`force` to metres and newtons (sources document, section 15).
 */
export const TRIGGER_LIMITS = { k: [50, 600], start: [0, 6] } as const;

/** Assumed travel of the R2 trigger ("recorrido supuesto"); no source gives the real figure. */
export const TRIGGER_TRAVEL_MM = 8;

/** 32 intervals of 0,25 mm: 33 points, exact in binary floating point. */
const CURVE_STEPS = 32;
const MM_PER_M = 1000;
const MILLIJOULES_PER_JOULE = 1000;

/** A type alias, not an interface, so rows pass straight to LineChart's Record<string, number>[]. */
export type TriggerPoint = {
  /** Displacement of the trigger, mm. */
  x: number;
  /** Magnitude k·x of the ideal spring's restoring force −k·x, N. */
  hooke: number;
  /** Resistance of the piecewise trigger profile k·(x − x₀) for x ≥ x₀, else 0, N. */
  trigger: number;
};

function toMetres(millimetres: number): number {
  return millimetres / MM_PER_M;
}

/** Force–displacement curves of the ideal spring and of the trigger profile, x from 0 to 8 mm. */
export function triggerCurves({ k, start }: TriggerSettings): TriggerPoint[] {
  const startM = toMetres(start);
  const hooke = forceCurve((x) => -hookeForce(k, toMetres(x)), TRIGGER_TRAVEL_MM, CURVE_STEPS);
  const trigger = forceCurve(
    (x) => piecewiseResistance(toMetres(x), startM, k),
    TRIGGER_TRAVEL_MM,
    CURVE_STEPS,
  );
  return hooke.map((point, index) => ({ x: point.x, hooke: point.f, trigger: trigger[index].f }));
}

/** Energy ½·k·x_max² stored by the ideal spring at the bottom of the travel, mJ. */
export function storedEnergyMilliJoules({ k }: TriggerSettings): number {
  return elasticEnergy(k, toMetres(TRIGGER_TRAVEL_MM)) * MILLIJOULES_PER_JOULE;
}

/**
 * Work the finger does against the trigger profile over the whole travel, mJ: the area
 * ½·k·(x_max − x₀)² under k·(x − x₀). The finger does this work and the actuator absorbs it;
 * nothing stores it like a spring.
 */
export function triggerWorkMilliJoules({ k, start }: TriggerSettings): number {
  const engaged = Math.max(TRIGGER_TRAVEL_MM - start, 0);
  return elasticEnergy(k, toMetres(engaged)) * MILLIJOULES_PER_JOULE;
}

/** One timestamp of the Tema 5 video: the instant (s), its title and the written analysis. */
export interface VideoMarker {
  time: number;
  title: string;
  analysis: string;
}

/** Props of HapticVideo; `src` and `poster` are site paths, prefixed with the base inside. */
export interface HapticVideoProps {
  src: string;
  poster?: string;
  markers: VideoMarker[];
  transcript: string;
}
