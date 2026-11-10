/**
 * The presets of a tiered laboratory, in its level 2 (scenario): up to MAX_PRESET_CHIPS as chips
 * of one line, more as a native select. Under the choice, one line with the active preset's note
 * and «Fuente:» its source, a link when the preset has a `sourceUrl`. Usage:
 *
 *   <LabPresets id="flyby-preset" presets={FLYBY_PRESETS} activeId={presetId} onSelect={apply} />
 *
 * Both forms are named «Valores de referencia» (the glyph guard finds them by `data-lab-presets`).
 * A native <option> cannot hold KaTeX, so a preset named with `$…$` needs a plain `optionLabel`
 * once its list passes four (a missing one throws, so the build fails rather than print TeX).
 */
import type { JSX } from 'react';
import { hasInlineMath, inlineMathToSpeech } from '../../lib/inlineMath';
import type { Preset } from '../../lib/presets';
import InlineMath from './InlineMath';
import { SelectField } from './SettingsFields';
import { withStableCallbacks } from './withStableCallbacks';

/** Up to this many presets are chips; past it, a select (auditoría §4). */
export const MAX_PRESET_CHIPS = 4;
export const PRESETS_LABEL = 'Valores de referencia';
/** The select's option while the values match no preset (an edit left the preset). */
const MODIFIED_LABEL = 'Personalizado';
const SOURCE_LEAD = 'Fuente: ';

export interface LabPresetsProps<T> {
  /** Id of the select (and prefix of nothing else): unique in the page. */
  id: string;
  presets: readonly Preset<T>[];
  /** The preset whose values are shown untouched; undefined after an edit. */
  activeId?: string;
  onSelect(preset: Preset<T>): void;
  /** Names the chips' group or the select; «Valores de referencia» by default. */
  label?: string;
}

const CHIP_BASE =
  'inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-base border px-3 text-sm font-medium transition-colors';
const CHIP_ACTIVE = 'border-accent bg-accent/10';
const CHIP_IDLE = 'border-border bg-bg-elevated hover:border-fg-muted';
/** A square mark, filled while its preset is active. */
const MARKER = 'size-2 border';

/** The chip's name as the two-line button had it: its name and source, in words. */
const chipName = <T,>({ name, sourceLabel }: Preset<T>) =>
  inlineMathToSpeech(sourceLabel ? `${name} ${sourceLabel}` : name);

function optionText<T>(preset: Preset<T>): string {
  const text = preset.optionLabel ?? preset.name;
  if (hasInlineMath(text)) {
    throw new Error(
      `LabPresets: «${preset.name}» va en un <option>, que no admite KaTeX; dale un optionLabel en texto plano`,
    );
  }
  return text;
}

function PresetChips<T>({ presets, activeId, onSelect, label }: Omit<LabPresetsProps<T>, 'id'>) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {presets.map((preset) => {
        const isActive = preset.id === activeId;
        return (
          <button
            key={preset.id}
            type="button"
            aria-pressed={isActive}
            aria-label={chipName(preset)}
            onClick={() => onSelect(preset)}
            className={`${CHIP_BASE} ${isActive ? CHIP_ACTIVE : CHIP_IDLE}`}
          >
            <span
              aria-hidden="true"
              className={`${MARKER} ${isActive ? 'border-accent bg-accent' : 'border-fg-muted'}`}
            />
            <InlineMath text={preset.name} />
          </button>
        );
      })}
    </div>
  );
}

/** The select's value is the active preset's id; any other activeId (or none) is «Personalizado». */
function PresetSelect<T>({ id, presets, activeId, onSelect, label }: LabPresetsProps<T>) {
  const value = presets.find((preset) => preset.id === activeId)?.id ?? '';
  const options = [
    ...(value === '' ? [{ value: '', label: MODIFIED_LABEL, disabled: true }] : []),
    ...presets.map((preset) => ({ value: preset.id, label: optionText(preset) })),
  ];
  return (
    <SelectField
      id={id}
      label={label ?? PRESETS_LABEL}
      value={value}
      options={options}
      onChange={(value) => {
        const chosen = presets.find((preset) => preset.id === value);
        if (chosen) onSelect(chosen);
      }}
    />
  );
}

/** The preset's source after «Fuente:», a link when it has a URL. */
function Source({ label, url }: { label: string; url?: string }): JSX.Element {
  const text = <InlineMath text={label} />;
  return (
    <>
      {SOURCE_LEAD}
      {url ? <a href={url}>{text}</a> : text}
    </>
  );
}

/** «note Fuente: source» on one line; nothing without note and source. */
function NoteLine<T>({ preset }: { preset?: Preset<T> }): JSX.Element | null {
  if (!preset || (!preset.note && !preset.sourceLabel)) return null;
  const { note, sourceLabel, sourceUrl } = preset;
  return (
    <p data-testid="preset-note" className="m-0 text-sm text-fg-muted">
      {note ? <InlineMath text={note} /> : null}
      {note && sourceLabel ? ' ' : null}
      {sourceLabel ? <Source label={sourceLabel} url={sourceUrl} /> : null}
    </p>
  );
}

function LabPresetsBase<T>(props: LabPresetsProps<T>): JSX.Element {
  const { presets, activeId, label = PRESETS_LABEL } = props;
  const isSelect = presets.length > MAX_PRESET_CHIPS;
  const active = presets.find((preset) => preset.id === activeId);
  return (
    <div data-lab-presets={isSelect ? 'select' : 'chips'} className="flex flex-col gap-2">
      {isSelect ? (
        <PresetSelect {...props} label={label} />
      ) : (
        <PresetChips {...props} label={label} />
      )}
      <NoteLine preset={active} />
    </div>
  );
}

/** Memoized with stable callbacks (the cast keeps the generic): a playing lab never reaches it. */
export default withStableCallbacks(LabPresetsBase) as typeof LabPresetsBase;
