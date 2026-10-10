import type { JSX } from 'react';
import { setSettings, type GlobalSettings } from '../../lib/settingsStore';
import { SegmentedField, SelectField, SwitchField } from './SettingsFields';
import { useGlobalSettings } from './useGlobalSettings';

const DECIMAL_OPTIONS: readonly GlobalSettings['decimals'][] = [1, 2, 3];

const MOTION_OPTIONS: readonly { value: GlobalSettings['motion']; label: string }[] = [
  { value: 'auto', label: 'Automático' },
  { value: 'reduced', label: 'Reducido' },
];

function isMotion(value: string): value is GlobalSettings['motion'] {
  return MOTION_OPTIONS.some((option) => option.value === value);
}

/** Site-wide settings, read from and written straight to the global store. */
export default function GlobalSettingsTab({ idPrefix }: { idPrefix: string }): JSX.Element {
  const settings = useGlobalSettings();

  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 text-sm text-fg-muted">
        Valen para todos los simuladores del sitio y se guardan en este navegador.
      </p>
      <SegmentedField
        id={`${idPrefix}-decimals`}
        label="Decimales"
        value={settings.decimals}
        options={DECIMAL_OPTIONS}
        onChange={(decimals) => setSettings({ decimals })}
      />
      <SwitchField
        id={`${idPrefix}-grid`}
        label="Cuadrícula"
        checked={settings.grid}
        onChange={(grid) => setSettings({ grid })}
      />
      <SelectField
        id={`${idPrefix}-motion`}
        label="Movimiento"
        value={settings.motion}
        options={MOTION_OPTIONS}
        onChange={(motion) => {
          if (isMotion(motion)) setSettings({ motion });
        }}
      />
    </div>
  );
}
