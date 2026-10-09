import { useSyncExternalStore } from 'react';
import {
  DEFAULT_SETTINGS,
  getSettings,
  subscribe,
  type GlobalSettings,
} from '../../lib/settingsStore';

/** Subscribes a component to the global settings store; DEFAULT_SETTINGS during SSR. */
export function useGlobalSettings(): GlobalSettings {
  return useSyncExternalStore(subscribe, getSettings, () => DEFAULT_SETTINGS);
}
