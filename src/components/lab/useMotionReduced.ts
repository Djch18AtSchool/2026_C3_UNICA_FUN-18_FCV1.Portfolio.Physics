/**
 * Whether motion is reduced: the site's setting («Movimiento: reducido») or, on «auto», the
 * system's `prefers-reduced-motion`, followed live. False on the server and until mount.
 */
import { motionReduced } from '../../lib/settingsStore';
import { useGlobalSettings } from './useGlobalSettings';
import { usePrefersReducedMotion } from './useSimClock';

export function useMotionReduced(): boolean {
  return motionReduced(useGlobalSettings(), usePrefersReducedMotion());
}
