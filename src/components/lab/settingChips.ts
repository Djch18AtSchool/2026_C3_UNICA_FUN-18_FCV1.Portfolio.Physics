/**
 * The chip row next to a tiered laboratory's gear: the active state of its display settings
 * («1× · vectores · estela»), read from the drawer's own options so it can never disagree with
 * them. Only the options that declare a `chip` take part (SettingOption in SettingsDrawer.tsx).
 */
import { formatNumber } from '../../lib/format';
import { inlineMathToSpeech } from '../../lib/inlineMath';
import { decimalsOf } from './ParamField';
import type { SettingOption } from './SettingsDrawer';

export interface SettingChip {
  /** The option's key: a stable React key. */
  key: string;
  /** What the chip shows, with KaTeX inline between `$…$`. */
  text: string;
  /** Its accessible name, in words. */
  name: string;
}

/** The chip of one option, or undefined when it shows none. */
function chipOf(option: SettingOption): SettingChip | undefined {
  const { key, chip } = option;
  if (chip === undefined) return undefined;
  const named = (text: string, name: string) => ({ key, text, name: inlineMathToSpeech(name) });
  switch (option.kind) {
    case 'toggle':
      return option.value ? named(chip, chip) : undefined;
    case 'select': {
      const choice = option.options.find(({ value }) => value === option.value);
      const text = choice?.chip ?? choice?.label ?? option.value;
      return named(text, `${chip} ${text}`);
    }
    case 'range': {
      const value = formatNumber(option.value, {
        precision: decimalsOf(option.step),
        unit: option.unit,
      });
      return named(`${chip} ${value}`, `${chip} ${value}`);
    }
  }
}

/** One chip per option that declares one and, for a toggle, is on; in the drawer's order. */
export function settingChips(options: readonly SettingOption[]): SettingChip[] {
  return options.flatMap((option) => {
    const chip = chipOf(option);
    return chip ? [chip] : [];
  });
}
