/** The regenerative-braking lab's state, its cars and its presets (spec §6, Paso 4). */
import type { CycleId } from '../../../lib/data/driveCycles';
import { LEAF_2025, MODEL3_LR_RWD_2025, type EvModel } from '../../../lib/data/evModels';
import { DEFAULT_REGEN, type RegenParams } from '../../../lib/physics/energy';
import type { Preset } from '../../../lib/presets';
import { W_PER_KW } from './regenScene';

export type VehicleId = 'model3' | 'leaf';

export const VEHICLES: Readonly<Record<VehicleId, EvModel>> = {
  model3: MODEL3_LR_RWD_2025,
  leaf: LEAF_2025,
};

/** Everything the lab computes from: the car, the cycle and the regeneration model (P_máx in kW). */
export interface RegenLabState {
  vehicle: VehicleId;
  cycle: CycleId;
  eta: number;
  pMaxKw: number;
  lowSpeedFade: boolean;
}

/** Slider ranges: η 0–1 by 0,01 and P_máx 0–250 kW by 1 kW (the FASTSim motor's 239 kW fits). */
export const ETA_RANGE = { min: 0, max: 1, step: 0.01 } as const;
export const P_MAX_RANGE = { min: 0, max: 250, step: 1 } as const;

/** The site's P_máx in kW (239, the FASTSim motor's), also named in the lab's hint. */
export const DEFAULT_P_MAX_KW = DEFAULT_REGEN.pMax / W_PER_KW;
/** "Batería fría o llena": the charging limit drops (LEAF 2025 manual); 10 kW is a scenario (research §8, 7). */
const COLD_P_MAX_KW = 10;

/** The site's model: η 0,80, P_máx 239 kW, f(v) on (spec §6, Paso 4; ruling R19). */
const SITE_MODEL = {
  eta: DEFAULT_REGEN.eta,
  pMaxKw: DEFAULT_P_MAX_KW,
  lowSpeedFade: DEFAULT_REGEN.lowSpeedFade,
} as const;

const MODEL3_SOURCE = 'EPA, vehículo 3R124-782214';

export const REGEN_PRESETS: Preset<RegenLabState>[] = [
  {
    id: 'model3-udds',
    name: 'Model 3 · ciudad (UDDS)',
    values: { vehicle: 'model3', cycle: 'udds', ...SITE_MODEL },
    sourceLabel: MODEL3_SOURCE,
    note: 'Modelo del sitio: $\\eta$ = 0,80 constante, $P_\\text{máx}$ = 239 kW (el motor de FASTSim) y $f(v)$ activo. En el UDDS la potencia de frenado no pasa de 33,2 kW, así que el límite no actúa.',
  },
  {
    id: 'model3-hwfet',
    name: 'Model 3 · carretera (HWFET)',
    values: { vehicle: 'model3', cycle: 'hwfet', ...SITE_MODEL },
    sourceLabel: MODEL3_SOURCE,
    note: 'En carretera frena sobre todo el aire: menos de la mitad del $\\Delta K$ quitado pasa por los frenos.',
  },
  {
    id: 'model3-us06',
    name: 'Model 3 · agresivo (US06)',
    values: { vehicle: 'model3', cycle: 'us06', ...SITE_MODEL },
    sourceLabel: MODEL3_SOURCE,
    note: 'Frenadas de hasta 70,8 kW y 0,31 g. Prueba bajar $P_\\text{máx}$ a 30 kW: ahí el límite sí importa.',
  },
  {
    id: 'cold-battery',
    name: `Batería fría o llena ($P_\\text{máx}$ ${COLD_P_MAX_KW} kW)`,
    values: { vehicle: 'model3', cycle: 'udds', ...SITE_MODEL, pMaxKw: COLD_P_MAX_KW },
    sourceLabel: 'Model 3 · escenario',
    note: 'Con la batería fría o casi llena admite menos corriente de carga. 10 kW es un escenario ilustrativo, no una medición: lo que pasa del límite lo disipan los frenos de fricción.',
  },
  {
    id: 'leaf-udds',
    name: 'Nissan LEAF 2025 · ciudad',
    values: { vehicle: 'leaf', cycle: 'udds', ...SITE_MODEL },
    sourceLabel: 'EPA, vehículo KWB115',
    note: 'Mismos $\\eta$ y $P_\\text{máx}$ que el Model 3 (en el UDDS el límite no actúa). Es más liviano, pero su C es mayor: pierde más en el aire y le queda menos para frenar.',
  },
];

export const INITIAL_REGEN_STATE: RegenLabState = REGEN_PRESETS[0].values;

/** The preset whose values the state matches exactly, if any (a moved slider deselects it). */
export function presetIdFor(state: RegenLabState): string | undefined {
  return REGEN_PRESETS.find(({ values }) =>
    (Object.keys(values) as (keyof RegenLabState)[]).every((key) => values[key] === state[key]),
  )?.id;
}

/** The kernel's regeneration parameters for a state (P_máx back in W). */
export function regenParams({ eta, pMaxKw, lowSpeedFade }: RegenLabState): RegenParams {
  return { eta, pMax: pMaxKw * W_PER_KW, lowSpeedFade };
}
