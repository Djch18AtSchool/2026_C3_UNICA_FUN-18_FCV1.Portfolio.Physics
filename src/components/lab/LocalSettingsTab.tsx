import type { JSX } from 'react';
import Slider from '../controls/Slider';
import ParamField from './ParamField';
import type { SettingOption } from './SettingsDrawer';
import { SelectField, SwitchField } from './SettingsFields';

function LocalOption({ option, id }: { option: SettingOption; id: string }): JSX.Element {
  switch (option.kind) {
    case 'toggle':
      return (
        <SwitchField
          id={id}
          label={option.label}
          checked={option.value}
          onChange={option.onChange}
        />
      );
    case 'select':
      return (
        <SelectField
          id={id}
          label={option.label}
          value={option.value}
          options={option.options}
          onChange={option.onChange}
        />
      );
    case 'range': {
      const { label, value, min, max, step, unit, onChange } = option;
      const shared = { id, value, min, max, step, onChange };
      // Slider prints "label (unit)", so a unitless range uses the field without a unit mark.
      return unit ? (
        <Slider {...shared} label={label} unit={unit} />
      ) : (
        <ParamField {...shared} label={label} unit="" />
      );
    }
  }
}

/** The laboratory's own options, each drawn by its kind. */
export default function LocalSettingsTab({
  idPrefix,
  options,
}: {
  idPrefix: string;
  options: readonly SettingOption[];
}): JSX.Element {
  if (options.length === 0) {
    return <p className="m-0 text-sm text-fg-muted">Este simulador no tiene ajustes propios.</p>;
  }
  return (
    <div className="flex flex-col gap-4">
      {options.map((option) => (
        <LocalOption key={option.key} option={option} id={`${idPrefix}-${option.key}`} />
      ))}
    </div>
  );
}
