/**
 * The formulas in the labels the drone lab mounts once its route data has loaded (parameters,
 * map key, profile titles and legends). The lab's skeleton carries them typeset by the server
 * (TexSeed), so opening Tema 1 does not download KaTeX; DroneLab.test.tsx fails when a label
 * gains a formula that is missing here. The formulas of «Cómo se usa» and «Qué deja fuera el
 * modelo» are added from their text.
 */
export const DRONE_LAB_FORMULAS: readonly string[] = [
  String.raw`v_\text{máx}`,
  String.raw`a_\text{máx}`,
  String.raw`\vec v`,
  String.raw`\vec a`,
  String.raw`\vec a = 0`,
  'v_x',
  'v_y',
  'a_x',
  'a_y',
  'v_x(t)',
  'v_y(t)',
  'a_x(t)',
  'a_y(t)',
];
