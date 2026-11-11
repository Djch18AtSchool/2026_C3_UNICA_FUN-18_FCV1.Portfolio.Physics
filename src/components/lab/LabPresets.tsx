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
 * `groups` splits the select into <optgroup>s by each preset's `group` (Tema 7's thirteen).
 * After an edit the last active preset's note stays, led by «Partí de «…» y cambié algún valor.»,
 * and the note line never shrinks when that happens.
 */
import { useState, type JSX } from 'react';
import { hasInlineMath, inlineMathToSpeech } from '../../lib/inlineMath';
import type { Preset, PresetGroup } from '../../lib/presets';
import InlineMath from './InlineMath';
import { SelectField, type SelectOption, type SelectOptionGroup } from './SettingsFields';
import { withStableCallbacks } from './withStableCallbacks';

/** Up to this many presets are chips; past it, a select (auditoría §4). */
export const MAX_PRESET_CHIPS = 4;
export const PRESETS_LABEL = 'Valores de referencia';
/** The select's option while the values match no preset (an edit left the preset). */
const MODIFIED_LABEL = 'Personalizado';
const SOURCE_LEAD = 'Fuente: ';
const NOTE = 'm-0 text-sm text-fg-muted';
const modifiedLead = (name: string) => `Partí de «${name}» y cambié algún valor. `;

export interface LabPresetsProps<T> {
  /** Id of the select (and prefix of nothing else): unique in the page. */
  id: string;
  presets: readonly Preset<T>[];
  /** The preset whose values are shown untouched; undefined after an edit. */
  activeId?: string;
  onSelect(preset: Preset<T>): void;
  /** Names the chips' group or the select; «Valores de referencia» by default. */
  label?: string;
  /** The select's <optgroup>s, in order; every preset's `group` must name one. */
  groups?: readonly PresetGroup[];
  /**
   * The preset an edit left, when the lab tracks it itself; by default the last one active here.
   */
  basedOnId?: string;
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
            {/* One inline run: as flex items, text and formula would sit a gap apart. */}
            <span>
              <InlineMath text={preset.name} />
            </span>
          </button>
        );
      })}
    </div>
  );
}

const toOption = <T,>(preset: Preset<T>): SelectOption => ({
  value: preset.id,
  label: optionText(preset),
});

/** The presets as options, or under their groups' headings; a preset in no group throws. */
function presetOptions<T>(
  presets: readonly Preset<T>[],
  groups?: readonly PresetGroup[],
): (SelectOption | SelectOptionGroup)[] {
  if (!groups) return presets.map(toOption);
  const stray = presets.find((preset) => !groups.some((group) => group.id === preset.group));
  if (stray) {
    throw new Error(`LabPresets: «${stray.name}» no está en ninguno de los grupos (groups)`);
  }
  return groups.map((group) => ({
    label: group.label,
    options: presets.filter((preset) => preset.group === group.id).map(toOption),
  }));
}

/** The select's value is the active preset's id; any other activeId (or none) is «Personalizado». */
function PresetSelect<T>({ id, presets, groups, activeId, onSelect, label }: LabPresetsProps<T>) {
  const value = presets.find((preset) => preset.id === activeId)?.id ?? '';
  const options = [
    ...(value === '' ? [{ value: '', label: MODIFIED_LABEL, disabled: true }] : []),
    ...presetOptions(presets, groups),
  ];
  return (
    <SelectField
      id={id}
      stacked
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

/** The note's text: «Partí de…» when edited, the note, then «Fuente:» and its source. */
function NoteText<T>({ preset, isModified }: { preset: Preset<T>; isModified: boolean }) {
  const { note, sourceLabel, sourceUrl } = preset;
  return (
    <>
      {isModified ? <InlineMath text={modifiedLead(preset.name)} /> : null}
      {note ? <InlineMath text={note} /> : null}
      {note && sourceLabel ? ' ' : null}
      {sourceLabel ? <Source label={sourceLabel} url={sourceUrl} /> : null}
    </>
  );
}

/**
 * «note Fuente: source», led by «Partí de…» once an edit leaves the preset; nothing without note
 * and source. The line never shrinks on an edit, so nothing below it (the readouts, or a stage
 * riding its cell's foot) moves under the reader: while the preset is active, its edited version
 * sits in the same grid cell, invisible and hidden from assistive tech, and holds its room.
 */
function NoteLine<T>({ preset, isModified }: { preset?: Preset<T>; isModified: boolean }) {
  if (!preset || (!preset.note && !preset.sourceLabel)) return null;
  return (
    <div className="grid">
      <p data-testid="preset-note" className={`${NOTE} [grid-area:1/1]`}>
        <NoteText preset={preset} isModified={isModified} />
      </p>
      {isModified ? null : (
        <p
          data-preset-note-reserve=""
          aria-hidden="true"
          className={`${NOTE} invisible [grid-area:1/1]`}
        >
          <NoteText preset={preset} isModified />
        </p>
      )}
    </div>
  );
}

/**
 * The preset an edit left: the one named by `basedOnId`, else the last one this component saw
 * active (so every lab keeps its note, led by «Partí de…», without tracking it itself).
 */
function useBasedOn<T>(presets: readonly Preset<T>[], activeId?: string, basedOnId?: string) {
  const known = (id?: string) => presets.find((preset) => preset.id === id);
  const [lastActive, setLastActive] = useState(() => known(activeId)?.id);
  const active = known(activeId);
  // Derived state, updated while rendering: the next render already sees it.
  if (active && active.id !== lastActive) setLastActive(active.id);
  return active ? undefined : known(basedOnId ?? lastActive);
}

function LabPresetsBase<T>(props: LabPresetsProps<T>): JSX.Element {
  const { presets, activeId, basedOnId, label = PRESETS_LABEL } = props;
  const isSelect = presets.length > MAX_PRESET_CHIPS;
  const active = presets.find((preset) => preset.id === activeId);
  const basedOn = useBasedOn(presets, activeId, basedOnId);
  return (
    <div data-lab-presets={isSelect ? 'select' : 'chips'} className="flex flex-col gap-2">
      {isSelect ? (
        <PresetSelect {...props} label={label} />
      ) : (
        <PresetChips {...props} label={label} />
      )}
      <NoteLine preset={active ?? basedOn} isModified={basedOn !== undefined} />
    </div>
  );
}

/** Memoized with stable callbacks (the cast keeps the generic): a playing lab never reaches it. */
export default withStableCallbacks(LabPresetsBase) as typeof LabPresetsBase;
