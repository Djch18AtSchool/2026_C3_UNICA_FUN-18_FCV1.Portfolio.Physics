import { describe, expect, test } from 'vitest';
import { SPRING_PRESETS } from '../../../lib/data/springPresets';
import { dampingRegime } from '../../../lib/physics/dampedSpring';
import {
  DEFAULT_PRESET_ID,
  labValues,
  PARAM_STEP,
  SPRING_LAB_PRESETS,
  SPRING_LIMITS,
} from './springLabPresets';

const byId = (id: string) => {
  const preset = SPRING_LAB_PRESETS.find((candidate) => candidate.id === id);
  if (!preset) throw new Error(`no preset ${id}`);
  return preset;
};

describe('the lab’s presets', () => {
  test('are the five of src/lib/data, in their order, opening on Motion’s default', () => {
    expect(SPRING_LAB_PRESETS.map(({ id }) => id)).toEqual(SPRING_PRESETS.map(({ id }) => id));
    expect(DEFAULT_PRESET_ID).toBe('motion-defecto');
    expect(byId(DEFAULT_PRESET_ID).values).toEqual({ k: 100, b: 10, m: 1 });
  });

  test('each option says whether it is the product’s value or an illustrative one', () => {
    expect(SPRING_LAB_PRESETS.map(({ optionLabel }) => optionLabel)).toEqual([
      'Motion, por omisión (producto)',
      'Motion, posición x e y (producto)',
      'Motion, escala hacia 0 (producto)',
      'Apple, ejemplo (producto)',
      'Sobreamortiguado (ilustrativo)',
    ]);
    // The name, which the note line typesets, writes the magnitudes as formulas.
    expect(byId('motion-xy').name).toBe('Motion, posición $x$ e $y$ (producto)');
  });

  test('Apple’s example lands on the 0,1 grid at the values Apple prints, 157,9 and 17,6', () => {
    expect(byId('apple-ejemplo').values).toEqual({ k: 157.9, b: 17.6, m: 1 });
  });

  test('the critical scale keeps b = 2√550 exactly: on the grid it would stop being critical', () => {
    const scale = byId('motion-escala-cero').values;

    expect(scale).toEqual({ k: 550, b: 2 * Math.sqrt(550), m: 1 });
    expect(dampingRegime(scale)).toBe('critico');
    const exact = SPRING_PRESETS[2].params;
    expect(labValues(exact)).toBe(exact);
  });

  test('the notes are one sentence each, with the core’s own numbers', () => {
    expect(byId('motion-defecto').note).toBe(
      'El generador de Motion sin opciones: $\\zeta$ = 0,50, y la tarjeta se pasa un 16,30 % del recorrido antes de volver.',
    );
    expect(byId('apple-ejemplo').note).toContain('157,9 N/m y 17,6 N·s/m');
    expect(byId('sobreamortiguado').note).toContain('$\\zeta$ = 2');
    for (const { id, note } of SPRING_LAB_PRESETS) {
      expect(note?.replace(/\$[^$]*\$/g, 'F').match(/[.!?](\s|$)/g), id).toHaveLength(1);
    }
  });

  test('the sources are the data module’s, linked for the products only', () => {
    SPRING_LAB_PRESETS.forEach((preset, i) => {
      expect(preset.sourceLabel).toBe(SPRING_PRESETS[i].source);
      expect(Boolean(preset.sourceUrl)).toBe(SPRING_PRESETS[i].origin === 'producto');
    });
    expect(byId('motion-xy').sourceUrl).toMatch(
      /^https:\/\/github\.com\/motiondivision\/motion\/blob\/v14\.14\.0\/.*default-transitions\.ts#L4-L18$/,
    );
  });

  test('every preset fits the sliders’ limits', () => {
    for (const { values } of SPRING_LAB_PRESETS) {
      for (const key of ['k', 'b', 'm'] as const) {
        const [low, high] = SPRING_LIMITS[key];
        expect(values[key]).toBeGreaterThanOrEqual(low);
        expect(values[key]).toBeLessThanOrEqual(high);
      }
    }
    expect(PARAM_STEP).toBe(0.1);
  });
});
