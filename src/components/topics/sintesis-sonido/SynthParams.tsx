/**
 * The synthesiser's level 1: the ten amplitudes, two to a row, then f₁ beside f_s and the note
 * of equation (11.9). An amplitude above f_s/2 is disabled (its fieldset) and its label says why.
 * A component returns its fields without a wrapper, so each one is a cell of the shell's grid.
 */
import type { JSX } from 'react';
import InlineMath from '../../lab/InlineMath';
import ParamField from '../../lab/ParamField';
import { SelectField } from '../../lab/SettingsFields';
import { formatNumber } from '../../../lib/format';
import { AMPLITUDE_RANGE, F1_RANGE, SAMPLE_RATES, type SynthState } from './synthScene';
import { amplitudeLabel, nyquistNote } from './synthTexts';

const SAMPLE_RATE_OPTIONS = SAMPLE_RATES.map((rate) => ({
  value: String(rate),
  label: formatNumber(rate, { precision: 0, unit: 'Hz' }),
}));

interface AmplitudeFieldProps {
  n: number;
  value: number;
  isAudible: boolean;
  onChange(n: number, value: number): void;
}

/** A_n; above f_s/2 the fieldset disables its slider and number, and the label says why. */
function AmplitudeField({ n, value, isAudible, onChange }: AmplitudeFieldProps): JSX.Element {
  return (
    <fieldset
      disabled={!isAudible}
      data-harmonic-field={n}
      className="m-0 min-w-0 border-0 p-0 disabled:opacity-60"
    >
      <ParamField
        id={`synth-a${n}`}
        label={amplitudeLabel(n, isAudible)}
        unit=""
        min={AMPLITUDE_RANGE.min}
        max={AMPLITUDE_RANGE.max}
        step={AMPLITUDE_RANGE.step}
        value={value}
        onChange={(next) => onChange(n, next)}
      />
    </fieldset>
  );
}

export interface SynthParamsProps {
  state: SynthState;
  /** How many harmonics fit under f_s/2 (audibleCount). */
  audible: number;
  onAmplitude(n: number, value: number): void;
  onF1(f1: number): void;
  /** The select's value, a rate in Hz as text. */
  onSampleRate(value: string): void;
}

export default function SynthParams({
  state,
  audible,
  onAmplitude,
  onF1,
  onSampleRate,
}: SynthParamsProps): JSX.Element {
  return (
    <>
      {state.amplitudes.map((value, i) => (
        <AmplitudeField
          key={i}
          n={i + 1}
          value={value}
          isAudible={i < audible}
          onChange={onAmplitude}
        />
      ))}
      <ParamField
        id="synth-f1"
        label="Fundamental $f_1$"
        unit="Hz"
        min={F1_RANGE.min}
        max={F1_RANGE.max}
        step={F1_RANGE.step}
        value={state.f1}
        onChange={onF1}
      />
      <SelectField
        id="synth-fs"
        stacked
        label="Frecuencia de muestreo $f_s$"
        value={String(state.sampleRate)}
        options={SAMPLE_RATE_OPTIONS}
        onChange={onSampleRate}
      />
      <p data-testid="synth-nyquist" className="m-0 text-sm text-fg-muted">
        <InlineMath text={nyquistNote(state.f1, state.sampleRate)} />
      </p>
    </>
  );
}
