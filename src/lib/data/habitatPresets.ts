import type { Preset } from '../presets';

/** NASA SP-413, the study of the Stanford torus: the same page as the topic's source 1. */
export const SP413_URL = 'https://ntrs.nasa.gov/citations/19770014162';

/** A rotating habitat described by its rim radius r (m) and its spin rate (rpm). */
export interface HabitatSettings {
  r: number;
  rpm: number;
}

/** NASA SP-413's Stanford torus: its major radius R and the radius of its tube (m). */
export const STANFORD_TORUS_SP413 = { R: 830, tubeRadius: 65 } as const;
/** The outermost point of the tube, R + r: SP-413's limit for 1 g below 1 rpm. */
const SP413_LIMIT_RADIUS = STANFORD_TORUS_SP413.R + STANFORD_TORUS_SP413.tubeRadius;

/** Slider ranges; the radius slider moves in 5 m steps and the spin slider in 0,1 rpm steps. */
export const HABITAT_LIMITS = { r: [5, 4000], rpm: [0.1, 10] } as const;

/**
 * Reference habitats (docs/superpowers/research/2026-10-08-sources.md, section 7).
 * Checks are mine, with g = 9,81 m/s² and ω = 2π·rpm/60:
 *   Stanford torus:  ω = 0,1047 rad/s; a_c = ω² · 830 = 9,10 m/s² = 0,93 g (SP-413: 0,95 ± 0,05 g).
 *   SP-413 limit:    ω = 0,1047 rad/s; a_c = ω² · 895 = 9,81 m/s² = 1,00 g; v = ω · 895 = 93,7 m/s.
 *   Small centrifuge: ω = √(9,81 / 10) = 0,990 rad/s = 9,46 rpm → 1,00 g, gradient 1,8 / 10 = 18 %.
 */
export const HABITAT_PRESETS: Preset<HabitatSettings>[] = [
  {
    id: 'toro-stanford',
    name: 'Toro de Stanford',
    values: { r: STANFORD_TORUS_SP413.R, rpm: 1 },
    sourceLabel: 'NASA SP-413 (1977)',
    sourceUrl: SP413_URL,
    note: 'Radio mayor de 830 m girando a 1 RPM, el límite de rotación que fija el estudio para las zonas habitadas: con g = 9,81 m/s² resulta 0,93 g, y SP-413 reporta 0,95 ± 0,05 g.',
  },
  {
    id: 'limite-sp413',
    name: 'Límite SP-413: 1 g a 1 RPM',
    values: { r: SP413_LIMIT_RADIUS, rpm: 1 },
    sourceLabel: 'NASA SP-413 (1977)',
    sourceUrl: SP413_URL,
    note: 'Solo los radios mayores de 895 m dan 1 g por debajo de 1 RPM; es el punto más exterior del tubo del Toro de Stanford (830 + 65 m), con 1,00 g y un piso a 93,7 m/s.',
  },
  {
    id: 'centrifuga-pequena',
    name: 'Centrífuga pequeña',
    values: { r: 10, rpm: 9.46 },
    sourceLabel: 'caso ilustrativo del autor',
    note: 'Un radio de 10 m necesita 9,46 RPM para 1 g: la cabeza de una persona de 1,80 m siente un 18 % menos de aceleración que los pies, y la rotación supera los 6 RPM máximos de todos los criterios de confort que recopila Hall.',
  },
];
