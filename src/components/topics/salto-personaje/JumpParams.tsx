/** «Parámetros» of the jump lab: the impulse and gravity fields, and the note when a value was clamped. */
import type { JSX } from 'react';
import InlineMath from '../../lab/InlineMath';
import ParamField from '../../lab/ParamField';
import { JUMP_LIMITS, type JumpSettings } from './jumpModel';

export type JumpKey = keyof JumpSettings;

/** Slider steps; a dragged handle snaps to them too, so the fields never show float noise. */
export const STEPS: Record<JumpKey, number> = { v0: 0.1, g: 0.01, vx: 0.05, fallMultiplier: 0.1 };

const FIELD_NAMES: Record<JumpKey, string> = {
  v0: 'impulso $v_0$',
  g: 'gravedad g',
  vx: 'velocidad horizontal $v_x$',
  fallMultiplier: 'multiplicador de caída',
};

export interface JumpParamsProps {
  settings: JumpSettings;
  clamped: JumpKey[];
  onField(key: JumpKey, value: number): void;
}

export default function JumpParams({ settings, clamped, onField }: JumpParamsProps): JSX.Element {
  return (
    <>
      <ParamField
        id="jump-v0"
        label="Impulso de salto $v_0$"
        unit="m/s"
        min={JUMP_LIMITS.v0[0]}
        max={JUMP_LIMITS.v0[1]}
        step={STEPS.v0}
        value={settings.v0}
        onChange={(value) => onField('v0', value)}
      />
      <ParamField
        id="jump-g"
        label="Gravedad g"
        unit="m/s²"
        min={JUMP_LIMITS.g[0]}
        max={JUMP_LIMITS.g[1]}
        step={STEPS.g}
        value={settings.g}
        onChange={(value) => onField('g', value)}
      />
      {clamped.length > 0 ? (
        <p data-testid="clamp-note" role="status" className="m-0 text-sm">
          <InlineMath
            text={`Valores ajustados al rango de los controles: ${clamped.map((key) => FIELD_NAMES[key]).join(', ')}.`}
          />
        </p>
      ) : null}
    </>
  );
}
