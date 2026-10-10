/** The drone laboratory's local settings ("Este simulador" in the drawer), built from its state. */
import { clockSettings } from '../../lab/clockSettings';
import type { SettingOption } from '../../lab/SettingsDrawer';
import type { SimClock } from '../../lab/useSimClock';

/** What the map draws. `vectorScale` is the map length of 1 m/s of velocity (m). */
export interface DroneDisplay {
  showVectors: boolean;
  showTrail: boolean;
  vectorScale: number;
}

/** 1 m/s → 15 m and 1 m/s² → 60 m by default (v1): 10 m/s and 2,5 m/s² both draw 150 m long. */
export const DEFAULT_DISPLAY: DroneDisplay = {
  showVectors: true,
  showTrail: true,
  vectorScale: 15,
};

/** The acceleration is drawn this many times longer per unit than the velocity. */
export const ACCEL_SCALE_FACTOR = 4;
const VECTOR_SCALE_RANGE = { min: 5, max: 40, step: 5 } as const;

export interface DroneLocalSettingsInput {
  display: DroneDisplay;
  onDisplayChange(next: DroneDisplay): void;
  clock: SimClock;
}

/** Vectores, escala de vectores, rastro, velocidad and repetir, in that order. */
export function droneLocalSettings({
  display,
  onDisplayChange,
  clock,
}: DroneLocalSettingsInput): SettingOption[] {
  const toggle = (key: 'showVectors' | 'showTrail', label: string): SettingOption => ({
    key,
    label,
    kind: 'toggle',
    value: display[key],
    onChange: (value) => onDisplayChange({ ...display, [key]: value }),
  });
  return [
    toggle('showVectors', 'Vectores v y a'),
    {
      key: 'vectorScale',
      label: 'Escala de vectores',
      kind: 'range',
      value: display.vectorScale,
      ...VECTOR_SCALE_RANGE,
      unit: 'm por m/s',
      onChange: (vectorScale) => onDisplayChange({ ...display, vectorScale }),
    },
    toggle('showTrail', 'Rastro'),
    ...clockSettings(clock),
  ];
}
