/**
 * Tema 10's spring presets: four products' own values and one illustrative model assumption, each
 * with its source (research docs/superpowers/research/2026-11-17-animaciones-resorte.md §3.1, §3.3
 * and §4). Motion's values are those of tag v14.14.0 (commit f95ab94); m = 1 kg is Motion's
 * defaultMass (spring.ts L24) and Apple's.
 */
import { fromPerceptual, type SpringParams } from '../physics/dampedSpring';
import type { ValueOrigin } from './origin';
import { APPLE_FORWARD_EXAMPLE } from './springReferences';

const MOTION = 'Motion v14.14.0, packages/motion-dom/src/animation';

export interface SpringPreset {
  id: string;
  /** Plain text: it goes into a native <option>, which cannot hold KaTeX. */
  label: string;
  params: SpringParams;
  /** The product's own value, or an illustrative assumption of the model. */
  origin: Exclude<ValueOrigin, 'calculo'>;
  source: string;
}

export const SPRING_PRESETS: readonly SpringPreset[] = [
  {
    id: 'motion-defecto',
    label: 'Motion, por omisión',
    params: { k: 100, b: 10, m: 1 },
    origin: 'producto',
    source: `${MOTION}/generators/spring.ts L22-L24`,
  },
  {
    id: 'motion-xy',
    label: 'Motion, posición x e y',
    params: { k: 500, b: 25, m: 1 },
    origin: 'producto',
    source: `${MOTION}/utils/default-transitions.ts L4-L18`,
  },
  {
    id: 'motion-escala-cero',
    label: 'Motion, escala hacia 0',
    params: { k: 550, b: 2 * Math.sqrt(550), m: 1 },
    origin: 'producto',
    source: `${MOTION}/utils/default-transitions.ts L11-L18 (L16: damping: target === 0 ? 2 * Math.sqrt(550) : 30)`,
  },
  {
    id: 'apple-ejemplo',
    label: 'Apple, ejemplo de la documentación',
    params: fromPerceptual(APPLE_FORWARD_EXAMPLE.duration, APPLE_FORWARD_EXAMPLE.bounce),
    origin: 'producto',
    source: `${APPLE_FORWARD_EXAMPLE.source}: ${APPLE_FORWARD_EXAMPLE.call} da ${APPLE_FORWARD_EXAMPLE.printed}`,
  },
  {
    id: 'sobreamortiguado',
    label: 'Sobreamortiguado',
    params: { k: 100, b: 40, m: 1 },
    origin: 'ilustrativo',
    source:
      'supuesto del modelo: el doble del amortiguamiento crítico, con la rigidez y la masa de Motion por omisión',
  },
];
