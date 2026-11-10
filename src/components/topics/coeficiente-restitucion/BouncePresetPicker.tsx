/**
 * Tema 7's presets, in its scenario level: thirteen of them in two groups («Rebotes realistas»,
 * «Rebotes que se sienten mal»), so a native select with <optgroup> (LabPresets has no groups).
 * It looks and reads like LabPresets' select: the label «Valores de referencia», one line with the
 * note and «Fuente:» its source, and «Personalizado» once an edit leaves the preset; here the note
 * of the last preset stays after an edit, marked «Partí de…».
 */
import type { JSX } from 'react';
import InlineMath from '../../lab/InlineMath';
import { PRESETS_LABEL } from '../../lab/LabPresets';
import { BOUNCE_PRESETS, PRESET_GROUPS, presetById } from './bouncePresets';

/** The look of SelectField (SettingsFields.tsx): same height, border, room for the chevron. */
const SELECT =
  'min-h-11 max-w-full min-w-0 appearance-none rounded-base border border-border bg-bg-elevated pr-9 pl-3 text-sm text-fg';
const CHEVRON =
  'pointer-events-none absolute top-1/2 right-[13px] size-4 -translate-y-1/2 text-fg-muted';
const SELECT_ID = 'bounce-preset';

export interface BouncePresetPickerProps {
  /** The preset whose values are shown untouched; undefined once anything was edited. */
  presetId?: string;
  /** The last preset chosen, whose note stays visible (marked as modified) after edits. */
  basedOn: string;
  onSelect(id: string): void;
}

export default function BouncePresetPicker({
  presetId,
  basedOn,
  onSelect,
}: BouncePresetPickerProps): JSX.Element {
  const based = presetById(basedOn);
  const isModified = presetId === undefined;
  return (
    <div data-lab-presets="select" className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <label htmlFor={SELECT_ID} className="text-sm font-medium">
          {PRESETS_LABEL}
        </label>
        <div className="relative max-w-full min-w-0">
          <select
            id={SELECT_ID}
            value={presetId ?? ''}
            onChange={(event) => onSelect(event.target.value)}
            className={SELECT}
          >
            <option value="" disabled>
              Personalizado
            </option>
            {PRESET_GROUPS.map(({ group, label }) => (
              <optgroup key={group} label={label}>
                {BOUNCE_PRESETS.filter((preset) => preset.group === group).map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={CHEVRON}
          >
            <path d="m4 6 4 4 4-4" />
          </svg>
        </div>
      </div>
      <p data-testid="preset-note" className="m-0 text-sm text-fg-muted">
        <InlineMath
          text={`${isModified ? `Partí de «${based.name}» y cambié algún valor. ` : ''}${based.note ?? ''}`}
        />
        {based.sourceLabel ? (
          <>
            {' Fuente: '}
            <InlineMath text={based.sourceLabel} />
          </>
        ) : null}
      </p>
    </div>
  );
}
