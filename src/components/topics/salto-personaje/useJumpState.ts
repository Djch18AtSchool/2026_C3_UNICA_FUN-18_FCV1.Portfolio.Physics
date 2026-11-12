/** The jump lab's own state: the settings with their preset and clamp note, and the zoom's framing of the jump. */
import { useCallback, useMemo, useState } from 'react';
import { DEFAULT_JUMP_PRESET_ID } from '../../../lib/data/jumpPresets';
import { clampSettings } from '../../../lib/limits';
import { snapTo } from '../../lab/dragMath';
import { JUMP_DEFAULTS, JUMP_LIMITS, type JumpResult, type JumpSettings } from './jumpModel';
import type { LaunchSpeeds } from './JumpOverlay';
import { STEPS, type JumpKey } from './JumpParams';
import { sceneDomains } from './jumpScene';
import { steadyLengthPerMs, type SceneWindow } from './jumpZoom';
import { useJumpZoom } from './useJumpZoom';

interface JumpState {
  settings: JumpSettings;
  presetId?: string;
  clamped: JumpKey[];
}

const INITIAL_STATE: JumpState = {
  settings: JUMP_DEFAULTS,
  presetId: DEFAULT_JUMP_PRESET_ID,
  clamped: [],
};

const SNAP_DECIMALS = 2;
const snap = (value: number, key: JumpKey) =>
  Number(snapTo(value, STEPS[key]).toFixed(SNAP_DECIMALS));

/** The settings, the preset that set them, which sliders clamped a value, and what changes them. */
export function useJumpState() {
  const [state, setState] = useState<JumpState>(INITIAL_STATE);
  const { settings } = state;

  const setField = (key: JumpKey, value: number) =>
    setState({ settings: { ...settings, [key]: value }, clamped: [] });

  // Presets and the designer may ask for values the sliders cannot show; clamp and say so.
  const applyValues = (values: JumpSettings, id?: string) => {
    const result = clampSettings<Record<JumpKey, number>>(values, JUMP_LIMITS);
    setState({ settings: result.values, presetId: id, clamped: result.clamped });
  };

  const onLaunchChange = ({ v0, vx }: LaunchSpeeds) =>
    setState((previous) => ({
      settings: { ...previous.settings, v0: snap(v0, 'v0'), vx: snap(vx, 'vx') },
      clamped: [],
    }));

  const reset = () => setState(INITIAL_STATE);
  return { ...state, setField, applyValues, onLaunchChange, reset };
}

/**
 * The zoom's ×1 is the framing of the live jump (held still while the launch handle is dragged, so
 * it maps stably); the plot shows the part of it the view says, and the vectors keep their length
 * on screen (`lengthPerMs`).
 */
export function useJumpFraming(live: JumpResult) {
  const [heldDomains, setHeldDomains] = useState<SceneWindow | null>(null);
  // The window frames the live jump; a much larger Earth reference may run off the plot.
  const fitted = useMemo(() => sceneDomains([live]), [live]);
  const framing = heldDomains ?? fitted;
  const jumpZoom = useJumpZoom(framing);
  const lengthPerMs = steadyLengthPerMs(framing.y, jumpZoom.zoom.view.scale, JUMP_LIMITS);
  const onLaunchDragPhase = useCallback(
    (phase: 'start' | 'end') => setHeldDomains(phase === 'start' ? fitted : null),
    [fitted],
  );
  return { jumpZoom, lengthPerMs, onLaunchDragPhase };
}
