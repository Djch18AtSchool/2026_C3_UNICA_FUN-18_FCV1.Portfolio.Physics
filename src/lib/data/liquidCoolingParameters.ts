/**
 * Tema 13's declared parameters: every value the profile, the split and the tables are computed
 * with, by id, with its name, symbol, unit and printed decimals, and where it comes from (a sourced
 * value of liquidCooling.ts or a constant of physics). The tables 13.1 to 13.3 print them
 * (src/lib/tables/topics/enfriamiento-liquido.ts); the profile figure names the ids it uses.
 */
import { G_EARTH } from '../physics/constants';
import { M3S_PER_LPM, PA_PER_BAR } from '../physics/hydraulics';
import { formatNumber } from '../format';
import {
  EPANET_VALUES,
  FLOW_PER_KW,
  MGX_MANIFOLD,
  PG25_40C,
  RD109,
  UQD04,
  type Provenance,
} from './liquidCooling';
import { PRESETS, serverFlow } from './liquidCoolingCircuit';

const MM_PER_M = 1e3;
const MM2_PER_M2 = 1e6;
const L_PER_M3 = 1e3;
const PA_PER_KPA = 1e3;
const MPA_S_PER_PA_S = 1e3;
const REFERENCE = PRESETS.referencia24;

export type CoolingParameterId =
  | 'pg25-densidad'
  | 'pg25-viscosidad'
  | 'temperatura-impulsion'
  | 'gravedad'
  | 'presion-entrada'
  | 'caudal-cdu'
  | 'racks-por-cdu'
  | 'servidores-por-rack'
  | 'caudal-rack'
  | 'caudal-servidor'
  | 'regla-ocp'
  | 'tuberia-diametro'
  | 'tuberia-longitud'
  | 'manguera-rack-diametro'
  | 'manguera-rack-longitud'
  | 'te-k'
  | 'manifold-area'
  | 'manifold-dh'
  | 'manifold-paso'
  | 'manifold-subida'
  | 'manguera-servidor-diametro'
  | 'manguera-servidor-longitud'
  | 'rugosidad-plastico'
  | 'rugosidad-acero'
  | 'uqd-cv'
  | 'uqd-cv-rango'
  | 'uqd-caudal-nominal'
  | 'uqd-boca'
  | 'uqd-longitud'
  | 'placa-caida'
  | 'placa-exponente'
  | 'placa-caudal-diseno'
  | 'placa-longitud'
  | 'lazo-exponente';

export interface ParameterSpec {
  id: CoolingParameterId;
  /** Plain text: the row's name, read and matched as it prints. */
  parametro: string;
  simbolo?: string;
  /** In the unit of the row; a string is printed as written (a range). */
  value: number | string;
  precision?: number;
  unidad?: string;
  /** Where the value comes from: a sourced value of the data modules, or a constant of physics. */
  from: Provenance | { origin: 'constante'; source: string };
}

const derived = (source: string): Provenance => ({ origin: 'calculo', source });

export const FLUID_PARAMETERS: readonly ParameterSpec[] = [
  {
    id: 'pg25-densidad',
    parametro: 'Densidad del PG25 a 40 °C',
    simbolo: '$\\rho$',
    value: PG25_40C.rho,
    precision: 1,
    unidad: 'kg/m³',
    from: PG25_40C,
  },
  {
    id: 'pg25-viscosidad',
    parametro: 'Viscosidad del PG25 a 40 °C',
    simbolo: '$\\mu$',
    value: PG25_40C.mu * MPA_S_PER_PA_S,
    precision: 3,
    unidad: 'mPa·s',
    from: PG25_40C,
  },
  {
    id: 'temperatura-impulsion',
    parametro: 'Temperatura de impulsión',
    value: RD109.supplyTemperature.value,
    unidad: '°C',
    from: RD109.supplyTemperature,
  },
  {
    id: 'gravedad',
    parametro: 'Aceleración de la gravedad',
    simbolo: '$g$',
    value: G_EARTH,
    precision: 2,
    unidad: 'm/s²',
    from: { origin: 'constante', source: 'Valor del curso (Módulo 6) y de Serway y Jewett' },
  },
  {
    id: 'presion-entrada',
    parametro: 'Presión absoluta a la salida del CDU',
    simbolo: '$p_0$',
    value: RD109.inletPressure.value / PA_PER_KPA,
    precision: 1,
    unidad: 'kPa',
    from: RD109.inletPressure,
  },
  {
    id: 'caudal-cdu',
    parametro: 'Caudal del CDU',
    simbolo: '$Q_\\text{CDU}$',
    value: RD109.cduFlow.value * L_PER_M3,
    unidad: 'L/s',
    from: RD109.cduFlow,
  },
  {
    id: 'racks-por-cdu',
    parametro: 'Racks por CDU',
    value: RD109.racks.value,
    from: RD109.racks,
  },
  {
    id: 'servidores-por-rack',
    parametro: 'Servidores por rack',
    simbolo: '$N$',
    value: RD109.servers.value,
    from: RD109.servers,
  },
  {
    id: 'caudal-rack',
    parametro: 'Caudal por rack',
    simbolo: '$Q_\\text{rack}$',
    value: REFERENCE.rackFlow / M3S_PER_LPM,
    precision: 1,
    unidad: 'L/min',
    from: REFERENCE.provenance.rackFlow,
  },
  {
    id: 'caudal-servidor',
    parametro: 'Caudal medio por servidor',
    simbolo: '$q$',
    value: serverFlow(REFERENCE) / M3S_PER_LPM,
    precision: 2,
    unidad: 'L/min',
    from: derived('Cálculo propio: $q = Q_\\text{rack}/N$'),
  },
  {
    id: 'regla-ocp',
    parametro: 'Caudal por potencia, regla de diseño',
    value: FLOW_PER_KW.value,
    precision: 1,
    unidad: 'L/min por kW',
    from: FLOW_PER_KW,
  },
];

const pipeSpecs = (
  prefix: 'tuberia' | 'manguera-rack' | 'manguera-servidor',
  name: string,
  diameter: Provenance & { value: number },
  length: Provenance & { value: number },
  lengthPrecision: number,
): ParameterSpec[] => [
  {
    id: `${prefix}-diametro`,
    parametro: `${name}: diámetro interior`,
    simbolo: '$D$',
    value: diameter.value * MM_PER_M,
    precision: 1,
    unidad: 'mm',
    from: diameter,
  },
  {
    id: `${prefix}-longitud`,
    parametro: `${name}: longitud por sentido`,
    simbolo: '$L$',
    value: length.value,
    precision: lengthPrecision,
    unidad: 'm',
    from: length,
  },
];

export const GEOMETRY_PARAMETERS: readonly ParameterSpec[] = [
  ...pipeSpecs('tuberia', 'Tubería principal', RD109.mainPipeDiameter, RD109.mainPipeLength, 0),
  ...pipeSpecs(
    'manguera-rack',
    'Manguera de rack',
    RD109.rackHoseDiameter,
    RD109.rackHoseLength,
    0,
  ),
  {
    id: 'manifold-area',
    parametro: 'Manifold: área interior',
    simbolo: '$A$',
    value: MGX_MANIFOLD.innerArea.value * MM2_PER_M2,
    unidad: 'mm²',
    from: MGX_MANIFOLD.innerArea,
  },
  {
    id: 'manifold-dh',
    parametro: 'Manifold: diámetro hidráulico',
    simbolo: '$D_h$',
    value: MGX_MANIFOLD.hydraulicDiameter.value * MM_PER_M,
    precision: 1,
    unidad: 'mm',
    from: MGX_MANIFOLD.hydraulicDiameter,
  },
  {
    id: 'manifold-paso',
    parametro: 'Manifold: paso entre puertos',
    value: MGX_MANIFOLD.portPitch.value * MM_PER_M,
    precision: 2,
    unidad: 'mm',
    from: MGX_MANIFOLD.portPitch,
  },
  {
    id: 'manifold-subida',
    parametro: 'Manifold: subida hasta el servidor 24',
    simbolo: '$\\Delta y$',
    value: REFERENCE.servers * MGX_MANIFOLD.portPitch.value,
    precision: 3,
    unidad: 'm',
    from: derived('Cálculo propio: 24 puertos por el paso de 44,45 mm'),
  },
  ...pipeSpecs(
    'manguera-servidor',
    'Manguera del servidor',
    RD109.serverHoseDiameter,
    RD109.serverHoseLength,
    1,
  ),
  {
    id: 'rugosidad-plastico',
    parametro: 'Rugosidad de tuberías y mangueras',
    simbolo: '$\\varepsilon$',
    value: EPANET_VALUES.roughnessPlastic.value * MM_PER_M,
    precision: 4,
    unidad: 'mm',
    from: EPANET_VALUES.roughnessPlastic,
  },
  {
    id: 'rugosidad-acero',
    parametro: 'Rugosidad del manifold de acero',
    simbolo: '$\\varepsilon$',
    value: EPANET_VALUES.roughnessSteel.value * MM_PER_M,
    precision: 3,
    unidad: 'mm',
    from: EPANET_VALUES.roughnessSteel,
  },
  {
    id: 'te-k',
    parametro: 'Te de derivación, a la entrada de cada manguera',
    simbolo: '$K$',
    value: EPANET_VALUES.teeK.value,
    precision: 1,
    from: EPANET_VALUES.teeK,
  },
];

export const CONNECTOR_PARAMETERS: readonly ParameterSpec[] = [
  {
    id: 'uqd-cv',
    parametro: 'UQD04: coeficiente de flujo',
    simbolo: '$C_v$',
    value: UQD04.cv.value,
    precision: 2,
    from: UQD04.cv,
  },
  {
    id: 'uqd-cv-rango',
    parametro: 'UQD04: rango de la especificación',
    simbolo: '$C_v$',
    value: `${formatNumber(UQD04.cvMin.value, { precision: 1 })}–${formatNumber(UQD04.cvMax.value, { precision: 1 })}`,
    from: UQD04.cvMin,
  },
  {
    id: 'uqd-caudal-nominal',
    parametro: 'UQD04: caudal nominal',
    value: UQD04.nominalFlow.value / M3S_PER_LPM,
    precision: 2,
    unidad: 'L/min',
    from: UQD04.nominalFlow,
  },
  {
    id: 'uqd-boca',
    parametro: 'UQD04: boca del tapón',
    simbolo: '$D$',
    value: UQD04.bore.value * MM_PER_M,
    precision: 2,
    unidad: 'mm',
    from: UQD04.bore,
  },
  {
    id: 'uqd-longitud',
    parametro: 'UQD04: longitud dibujada',
    simbolo: '$L$',
    value: UQD04.drawnLength.value * MM_PER_M,
    unidad: 'mm',
    from: UQD04.drawnLength,
  },
  {
    id: 'placa-caida',
    parametro: 'Placa fría: caída de diseño',
    simbolo: '$\\Delta p$',
    value: RD109.plateDrop.value / PA_PER_BAR,
    precision: 1,
    unidad: 'bar',
    from: RD109.plateDrop,
  },
  {
    id: 'placa-exponente',
    parametro: 'Placa fría: exponente de su ley',
    simbolo: '$n$',
    value: RD109.plateExponent.value,
    precision: 2,
    from: RD109.plateExponent,
  },
  {
    id: 'placa-caudal-diseno',
    parametro: 'Placa fría: caudal al que pierde esa caída',
    value: REFERENCE.plateDesignFlow / M3S_PER_LPM,
    precision: 2,
    unidad: 'L/min',
    from: REFERENCE.provenance.plateDesignFlow,
  },
  {
    id: 'placa-longitud',
    parametro: 'Placa fría: longitud dibujada',
    simbolo: '$L$',
    value: RD109.plateLength.value,
    precision: 2,
    unidad: 'm',
    from: RD109.plateLength,
  },
  {
    // The page's Δp ∝ Q^1,9 (paso 4, the lab's caption) cites this row.
    id: 'lazo-exponente',
    parametro: 'Lazo completo: exponente de su ley',
    simbolo: '$n$',
    value: RD109.systemExponent.value,
    precision: 1,
    from: RD109.systemExponent,
  },
];
