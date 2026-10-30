/** The flyby laboratory's local settings ("Este simulador" in the drawer), built from its state. */
import { clockSettings } from '../../lab/clockSettings';
import type { SettingOption } from '../../lab/SettingsDrawer';
import type { SimClock } from '../../lab/useSimClock';

/** What the two frames draw. */
export interface FlybyDisplay {
  /** v∞ in and out at the ends of the track and v_rel on the probe (planet frame). */
  showVectors: boolean;
  /** The circle |v⃗∞| = v∞ the turn moves along (Sun frame). */
  showCircle: boolean;
}

export const DEFAULT_DISPLAY: FlybyDisplay = { showVectors: true, showCircle: true };

/** Playback speeds offered; at 1× every pass lasts FLYBY_LAPSE seconds. */
const SPEEDS = [0.25, 0.5, 1, 2, 4] as const;

export interface FlybyLocalSettingsInput {
  display: FlybyDisplay;
  onDisplayChange(next: FlybyDisplay): void;
  clock: SimClock;
}

/** Vectores, círculo, velocidad and repetir, in that order. */
export function flybyLocalSettings({
  display,
  onDisplayChange,
  clock,
}: FlybyLocalSettingsInput): SettingOption[] {
  const toggle = (key: keyof FlybyDisplay, label: string): SettingOption => ({
    key,
    label,
    kind: 'toggle',
    value: display[key],
    onChange: (value) => onDisplayChange({ ...display, [key]: value }),
  });
  return [
    toggle('showVectors', 'Vectores v∞ y v_rel en el marco del planeta'),
    toggle('showCircle', 'Círculo |v∞| en el triángulo'),
    ...clockSettings(clock, SPEEDS),
  ];
}
