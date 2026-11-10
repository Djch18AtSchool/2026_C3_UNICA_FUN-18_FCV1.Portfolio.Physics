/**
 * The flyby laboratory's presets: one per Voyager encounter in VOYAGER.encounters (JPL Horizons
 * design trajectory), with its V⃗_p, v∞, θ_in and r_p. The side comes from the data's planarSide;
 * where the real turn leaves the plane (V2 at Neptune, V1 at Saturn) no planar side reproduces
 * the data, and the preset takes the side whose planar result lands nearest to it.
 */
import { formatNumber } from '../../../lib/format';
import { unitTex } from './flybyFormat';
import { PLANETS } from '../../../lib/data/planets';
import { VOYAGER, type Encounter } from '../../../lib/data/voyager';
import { planarFlyby, type PassSide } from '../../../lib/physics';
import type { Preset } from '../../../lib/presets';

const DEG = Math.PI / 180;
const RP_DECIMALS = 2;

/** What the laboratory runs: the arrival (from an encounter), r_p in planet radii and the side. */
export interface FlybySettings {
  encounter: Encounter;
  /** Periapsis distance, planet radii. */
  rp: number;
  side: PassSide;
}

/** Spanish name of each side, as the controls and notes write it. */
export const SIDE_NAMES: Record<PassSide, string> = { behind: 'detrás', front: 'delante' };

/** «R_J», «R_S», «R_U», «R_N»: the planet radius as a unit. */
export function radiusUnit(encounter: Encounter): string {
  return `R_${PLANETS[encounter.planet].name.charAt(0)}`;
}

/** The planar turn of an encounter at its own r_p, on one side (km/s). */
export function planarOf(encounter: Encounter, side: PassSide) {
  const { gm } = PLANETS[encounter.planet];
  return planarFlyby(
    encounter.VpKms,
    encounter.vInf,
    encounter.thetaInDeg * DEG,
    encounter.rpKm,
    gm,
    side,
  );
}

/** The side whose planar |v⃗_out| lands nearest the patched-conic value of the data. */
export function nearestSide(encounter: Encounter): PassSide {
  const miss = (side: PassSide) => Math.abs(planarOf(encounter, side).vOut - encounter.conicAfter);
  return miss('behind') <= miss('front') ? 'behind' : 'front';
}

const presetId = (e: Encounter) => `${e.probe.toLowerCase()}-${e.planet}`;

function note(e: Encounter, side: PassSide): string {
  const planet = PLANETS[e.planet];
  const rp = formatNumber(e.rpKm / planet.radiusKm, { precision: RP_DECIMALS });
  const distance = `${formatNumber(e.rpKm, { precision: 0, unit: 'km' })} del centro (${rp} ${unitTex(radiusUnit(e))})`;
  const where = `Máxima aproximación a ${distance}`;
  if (e.planarTurnReproduces) return `${where}, paso por ${SIDE_NAMES[side]}.`;
  return `${where}. El giro sale del plano de $\\vec V_p$ y $\\vec v_{\\infty,\\text{in}}$, así que ningún lado lo reproduce; el modelo plano usa el que más se le acerca, ${SIDE_NAMES[side]}.`;
}

/** One preset per encounter, V2 first, each in the order of the voyage. */
export const FLYBY_PRESETS: Preset<FlybySettings>[] = [...VOYAGER.encounters]
  .sort((a, b) => (a.probe === b.probe ? a.caJd - b.caJd : a.probe === 'V2' ? -1 : 1))
  .map((encounter) => {
    const side = encounter.planarSide ?? nearestSide(encounter);
    return {
      id: presetId(encounter),
      name: `${encounter.probe} · ${PLANETS[encounter.planet].name}`,
      values: { encounter, rp: encounter.rpKm / PLANETS[encounter.planet].radiusKm, side },
      sourceLabel: encounter.caUtc.replace('T', ' ').replace('Z', ' UT'),
      note: note(encounter, side),
    };
  });

export const DEFAULT_FLYBY_PRESET_ID = 'v2-jupiter';

export function flybyPreset(id: string): Preset<FlybySettings> {
  const preset = FLYBY_PRESETS.find((p) => p.id === id);
  if (!preset) throw new Error(`No flyby preset "${id}"`);
  return preset;
}
