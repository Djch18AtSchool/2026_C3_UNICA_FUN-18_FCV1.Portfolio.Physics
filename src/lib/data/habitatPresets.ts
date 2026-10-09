import type { Preset } from '../../components/controls/Presets';

/** A rotating habitat described by its rim radius r (m) and its spin rate (rpm). */
export interface HabitatSettings {
  r: number;
  rpm: number;
}

/** Slider ranges; the radius slider moves in 5 m steps and the spin slider in 0,1 rpm steps. */
export const HABITAT_LIMITS = { r: [5, 4000], rpm: [0.1, 10] } as const;

/**
 * Reference habitats (docs/superpowers/research/2026-10-08-sources.md, section 7).
 * Checks are mine, with g = 9,81 m/s² and ω = 2π·rpm/60:
 *   Stanford torus:  ω = 0,1047 rad/s; a_c = ω² · 830 = 9,10 m/s² = 0,93 g (SP-413: 0,95 ± 0,05 g).
 *   O'Neill cylinder: ω = √(9,81 / 4000) = 0,0495 rad/s = 0,473 rpm ≈ 0,47 rpm → 0,99 g.
 *   Small centrifuge: ω = √(9,81 / 10) = 0,990 rad/s = 9,46 rpm → 1,00 g, gradient 1,8 / 10 = 18 %.
 */
export const HABITAT_PRESETS: Preset<HabitatSettings>[] = [
  {
    id: 'toro-stanford',
    name: 'Toro de Stanford',
    values: { r: 830, rpm: 1 },
    sourceLabel: 'NASA SP-413 (1977)',
    note: 'Radio mayor de 830 m girando a 1 RPM, el límite de rotación que fija el estudio para las zonas habitadas. Con g = 9,81 m/s² resulta 0,93 g; SP-413 reporta 0,95 ± 0,05 g y pide vivir entre 0,9 y 1 g.',
  },
  {
    id: 'cilindro-oneill',
    name: "Cilindro de O'Neill",
    values: { r: 4000, rpm: 0.47 },
    sourceLabel: 'Isla Tres, cifras de diseño',
    note: 'Cifras de diseño, no de una estructura construida: un cilindro de 4 000 m de radio da 1 g girando a unas 0,47 RPM (0,99 g con el valor redondeado). El gradiente cabeza–pies baja a 0,05 %.',
  },
  {
    id: 'centrifuga-pequena',
    name: 'Centrífuga pequeña',
    values: { r: 10, rpm: 9.46 },
    sourceLabel: 'Caso ilustrativo del autor',
    note: 'Un radio de 10 m necesita 9,46 RPM para 1 g: la cabeza de una persona de 1,80 m siente un 18 % menos de aceleración que los pies, y la rotación supera los 6 RPM máximos de todos los criterios de confort que recopila Hall.',
  },
];
