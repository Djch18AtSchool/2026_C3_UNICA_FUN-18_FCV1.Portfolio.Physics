/**
 * The color and name a jump wears, chosen by its gravity, never by series order. Real bodies
 * follow convention (Tierra blue, Luna grey; orange stays reserved for Marte); the games take
 * other palette colors. The lab and the topic's static figures share this mapping.
 */
import { JUMP_PRESETS } from '../../../lib/data/jumpPresets';

export interface JumpWorld {
  name: string;
  color: string;
}

/** Color per preset id; the name comes from the preset itself. */
const PRESET_COLORS: Readonly<Record<string, string>> = {
  tierra: 'var(--chart-1)',
  luna: 'var(--fg-muted)',
  celeste: 'var(--chart-4)',
  'super-mario-bros': 'var(--chart-3)',
};

/** Any other gravity: a jump of the reader's own design. */
export const CUSTOM_WORLD: JumpWorld = { name: 'Salto simulado', color: 'var(--chart-5)' };

/** The world of the preset with this id (its name and conventional color). */
export function worldForPreset(id: string): JumpWorld {
  const preset = JUMP_PRESETS.find((candidate) => candidate.id === id);
  const color = PRESET_COLORS[id];
  if (!preset || !color) throw new Error(`jumpWorlds: no hay preajuste "${id}"`);
  return { name: preset.name, color };
}

/** The world whose preset gravity is exactly g (m/s²), or the custom jump. */
export function worldForGravity(g: number): JumpWorld {
  const preset = JUMP_PRESETS.find((candidate) => candidate.values.g === g);
  return preset ? worldForPreset(preset.id) : CUSTOM_WORLD;
}
