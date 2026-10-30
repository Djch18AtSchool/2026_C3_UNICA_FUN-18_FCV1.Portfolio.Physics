/**
 * Tables of Tema 6. Every number comes from code at module load: the EPA values as printed and
 * their SI conversion (src/lib/data/evModels.ts), and the cycle balances of the site's model
 * (cycleBalance with DEFAULT_REGEN over the EPA cycles).
 */
import { DRIVE_CYCLES, type CycleId } from '../../data/driveCycles';
import { LEAF_2025, MODEL3_LR_RWD_2025, type EvModel } from '../../data/evModels';
import { cycleBalance, DEFAULT_REGEN } from '../../physics/energy';
import { regenModelText } from '../../physics/regenModelText';
import type { DataTableSpec } from '../types';

const J_PER_KWH = 3_600_000;
const W_PER_KW = 1000;
const PERCENT = 100;
const CYCLE_IDS: readonly CycleId[] = ['udds', 'hwfet', 'us06'];

const vehicleRow = ({ name, m, roadLoad, epa }: EvModel) => ({
  vehiculo: name,
  etw: epa.etwLb,
  m,
  aEpa: epa.aLbf,
  aSi: roadLoad.A,
  bEpa: epa.bLbfPerMph,
  bSi: roadLoad.B,
  cEpa: epa.cLbfPerMph2,
  cSi: roadLoad.C,
});

const VEHICLES: DataTableSpec = {
  id: 'frenado-regenerativo-vehiculo',
  caption:
    'Los dos autos del balance: masa de prueba equivalente (ETW) y coeficientes objetivo A, B y C de la carga en carretera, como los publica la EPA y en SI',
  columns: [
    { key: 'vehiculo', label: 'Vehículo', align: 'text' },
    { key: 'etw', label: 'Masa de prueba, ETW', unit: 'lb', align: 'num', precision: 0 },
    { key: 'm', label: 'Masa m', unit: 'kg', align: 'num', precision: 2 },
    { key: 'aEpa', label: 'A', unit: 'lbf', align: 'num', precision: 2 },
    { key: 'aSi', label: 'A', unit: 'N', align: 'num', precision: 2 },
    { key: 'bEpa', label: 'B', unit: 'lbf/mph', align: 'num', precision: 4 },
    { key: 'bSi', label: 'B', unit: 'N·s/m', align: 'num', precision: 4 },
    { key: 'cEpa', label: 'C', unit: 'lbf/mph²', align: 'num', precision: 5 },
    { key: 'cSi', label: 'C', unit: 'N·s²/m²', align: 'num', precision: 5 },
  ],
  rows: [MODEL3_LR_RWD_2025, LEAF_2025].map(vehicleRow),
  source: {
    text: `${MODEL3_LR_RWD_2025.source.list}, vehículos de prueba ${MODEL3_LR_RWD_2025.source.testVehicleId} y ${LEAF_2025.source.testVehicleId} (Equivalent Test Weight y Target Coef A, B, C); conversión a SI: cálculo propio`,
    url: MODEL3_LR_RWD_2025.source.url,
  },
};

function cycleRow(id: CycleId) {
  const { totals } = cycleBalance(DRIVE_CYCLES[id].samples, MODEL3_LR_RWD_2025, DEFAULT_REGEN);
  return {
    ciclo: DRIVE_CYCLES[id].name,
    traccion: totals.traction / J_PER_KWH,
    deltaK: totals.kineticRemoved / J_PER_KWH,
    frenado: totals.brake / J_PER_KWH,
    bateria: totals.battery / J_PER_KWH,
    perdidas: totals.conversionLoss / J_PER_KWH,
    friccion: totals.friction / J_PER_KWH,
    fraccion: totals.recoveredShare * PERCENT,
    potencia: totals.peakBrakePower / W_PER_KW,
    desaceleracion: totals.peakDecelG,
  };
}

const CYCLES: DataTableSpec = {
  id: 'frenado-regenerativo-ciclos',
  caption: `Balance de energía del ${MODEL3_LR_RWD_2025.name} en tres ciclos de la EPA con el modelo del sitio (${regenModelText(DEFAULT_REGEN)}). El frenado en las ruedas se reparte en batería, pérdidas de conversión (1 − η) y calor de fricción; la fracción recuperada es la energía devuelta a la batería dividida entre la energía de tracción en las ruedas, no entre la de frenado`,
  columns: [
    { key: 'ciclo', label: 'Ciclo', align: 'text' },
    { key: 'traccion', label: 'Tracción en las ruedas', unit: 'kWh', align: 'num', precision: 3 },
    { key: 'deltaK', label: 'ΔK quitado al desacelerar', unit: 'kWh', align: 'num', precision: 3 },
    { key: 'frenado', label: 'Frenado en las ruedas', unit: 'kWh', align: 'num', precision: 3 },
    { key: 'bateria', label: 'A la batería', unit: 'kWh', align: 'num', precision: 3 },
    {
      key: 'perdidas',
      label: 'Pérdidas de conversión (1 − η)',
      unit: 'kWh',
      align: 'num',
      precision: 3,
    },
    { key: 'friccion', label: 'Calor de fricción', unit: 'kWh', align: 'num', precision: 3 },
    { key: 'fraccion', label: 'Batería / tracción', unit: '%', align: 'num', precision: 1 },
    {
      key: 'potencia',
      label: 'Potencia de frenado máx.',
      unit: 'kW',
      align: 'num',
      precision: 1,
    },
    { key: 'desaceleracion', label: 'Desaceleración máx.', unit: 'g', align: 'num', precision: 3 },
  ],
  rows: CYCLE_IDS.map(cycleRow),
  source: {
    text: 'Ciclos UDDS, HWFET y US06 y coeficientes de carga: EPA (datos reales); balance y reparto regenerativo/fricción: cálculo propio con el modelo y los parámetros de FASTSim',
    url: 'https://www.epa.gov/vehicle-and-fuel-emissions-testing/dynamometer-drive-schedules',
  },
};

export const TABLES: readonly DataTableSpec[] = [VEHICLES, CYCLES];
