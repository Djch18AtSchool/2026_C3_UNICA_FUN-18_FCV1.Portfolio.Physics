import type { JSX } from 'react';
import InlineMath from '../../lab/InlineMath';
import ParamField from '../../lab/ParamField';
import { ETA_RANGE, P_MAX_RANGE, type RegenLabState } from './regenPresets';

/** Why nothing reaches the battery, when a parameter switches regeneration off. */
export function zeroRegenNote({ eta, pMaxKw }: RegenLabState): string | null {
  if (pMaxKw === 0) {
    return 'Con $P_\\text{máx}$ = 0 el motor no regenera: toda la energía de frenado se va en calor en los frenos de fricción.';
  }
  if (eta === 0) {
    return 'Con $\\eta$ = 0 el motor frena, pero nada llega a la batería: todo lo que recoge se pierde en el motor y la transmisión.';
  }
  return null;
}

/** The lab's «Parámetros»: η and P_máx, and why nothing is recovered when one of them is 0. */
export default function RegenParams({
  state,
  onChange,
}: {
  state: RegenLabState;
  onChange(next: RegenLabState): void;
}): JSX.Element {
  const note = zeroRegenNote(state);
  return (
    <>
      <ParamField
        id="regen-eta"
        label="Rendimiento rueda $\to$ batería $\eta$"
        unit=""
        {...ETA_RANGE}
        value={state.eta}
        onChange={(eta) => onChange({ ...state, eta })}
      />
      <ParamField
        id="regen-pmax"
        label="Potencia máxima de regeneración $P_\text{máx}$"
        unit="kW"
        {...P_MAX_RANGE}
        value={state.pMaxKw}
        onChange={(pMaxKw) => onChange({ ...state, pMaxKw })}
      />
      {note ? (
        <p role="note" className="m-0 border-l-2 border-accent pl-3 text-sm">
          <InlineMath text={note} />
        </p>
      ) : null}
    </>
  );
}
