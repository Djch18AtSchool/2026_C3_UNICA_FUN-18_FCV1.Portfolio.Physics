import { describe, expect, test } from 'vitest';
import { HABITAT_PRESETS } from '../../lib/data/habitatPresets';
import { JUMP_PRESETS } from '../../lib/data/jumpPresets';
import { TRIGGER_PRESETS } from '../../lib/data/triggerPresets';
import type { Preset } from '../../lib/presets';
import { FLYBY_PRESETS } from './asistencia-gravitatoria/flybyPresets';
import { BOUNCE_PRESETS } from './coeficiente-restitucion/bouncePresets';
import { REGEN_PRESETS } from './frenado-regenerativo/regenPresets';
import { TYRE_PRESETS } from './llantas-f1/tyreLabModel';
import { WHEEL_PRESETS } from './ruedas-reaccion/wheelPresets';

/** Every lab's presets (Tema 1 has none), by topic. */
const PRESETS: Record<string, readonly Preset<unknown>[]> = {
  'Tema 2': JUMP_PRESETS,
  'Tema 3': HABITAT_PRESETS,
  'Tema 4': TYRE_PRESETS,
  'Tema 5': TRIGGER_PRESETS,
  'Tema 6': REGEN_PRESETS,
  'Tema 7': BOUNCE_PRESETS,
  'Tema 8': WHEEL_PRESETS,
  'Tema 9': FLYBY_PRESETS,
};

/** A sentence ends at . ! or ? before a space or the end; a decimal comma or «1/60» does not. */
const SENTENCE_END = /[.!?](\s|$)/g;
/** Formulas may hold a dot ($\dot x$) or an ellipsis; they are not prose. */
const withoutMath = (text: string) => text.replace(/\$[^$]*\$/g, 'F');

describe('preset notes, in every lab', () => {
  for (const [topic, presets] of Object.entries(PRESETS)) {
    test(`${topic}: each note is one sentence, the line under the choice (auditoría §4)`, () => {
      for (const { id, note } of presets) {
        if (!note) continue;
        expect(withoutMath(note).match(SENTENCE_END), `${topic} · ${id}: ${note}`).toHaveLength(1);
      }
    });
  }
});
