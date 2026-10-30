import { KG_PER_LB, roadLoadFromEpa, type Vehicle } from '../physics/energy';

/** A Test Car List row as printed by the EPA: ETW in lb, target A in lbf, B in lbf/mph, C in lbf/mph². */
export interface EpaTestCarValues {
  etwLb: number;
  aLbf: number;
  bLbfPerMph: number;
  cLbfPerMph2: number;
}

/** Where a car's values come from: the list, the test vehicle, one of its tests and the file. */
export interface TestCarSource {
  list: string;
  testVehicleId: string;
  testId: string;
  url: string;
  accessed: string;
}

/** A car for the balance with its EPA values (imperial, as printed) and their source. */
export interface EvModel extends Vehicle {
  epa: EpaTestCarValues;
  source: TestCarSource;
}

const TEST_CAR_LIST = 'EPA, 2025 Test Car List Data (25-testcar-2026-01-21.xlsx)';
const TEST_CAR_LIST_URL =
  'https://www.epa.gov/system/files/documents/2026-01/25-testcar-2026-01-21.xlsx';
const ACCESSED = '2026-10-30';

/**
 * Builds the SI vehicle by code from the printed EPA values: the equivalent test weight is the
 * mass (pitfall 1: ETW, not curb weight, is the one consistent with A, B and C of the same test),
 * and the "Target" coefficients are the road load (pitfall 2: never the "Set" ones).
 */
function fromTestCarList(
  name: string,
  epa: EpaTestCarValues,
  ids: Pick<TestCarSource, 'testVehicleId' | 'testId'>,
): EvModel {
  return {
    name,
    m: epa.etwLb * KG_PER_LB,
    roadLoad: roadLoadFromEpa(epa.aLbf, epa.bLbfPerMph, epa.cLbfPerMph2),
    epa,
    source: { list: TEST_CAR_LIST, ...ids, url: TEST_CAR_LIST_URL, accessed: ACCESSED },
  };
}

/**
 * Tesla Model 3 Long Range RWD 2025, test vehicle 3R124-782214, charge-depleting UDDS test
 * RTSL10086702 (research §5): ETW 4250 lb, A 27,02 lbf, B 0,2873 lbf/mph, C 0,012 20 lbf/mph².
 */
export const MODEL3_LR_RWD_2025: EvModel = fromTestCarList(
  'Tesla Model 3 Long Range RWD 2025',
  { etwLb: 4250, aLbf: 27.02, bLbfPerMph: 0.2873, cLbfPerMph2: 0.0122 },
  { testVehicleId: '3R124-782214', testId: 'RTSL10086702' },
);

/**
 * Nissan LEAF 2025, test vehicle KWB115 (research §5): ETW 3875 lb, A 25,89 lbf,
 * B 0,3449 lbf/mph, C 0,019 45 lbf/mph². The test id is the charge-depleting UDDS test of
 * configuration 0 (RND_ADJ_FE 174) in the same 2025 Test Car List file.
 */
export const LEAF_2025: EvModel = fromTestCarList(
  'Nissan LEAF 2025',
  { etwLb: 3875, aLbf: 25.89, bLbfPerMph: 0.3449, cLbfPerMph2: 0.01945 },
  { testVehicleId: 'KWB115', testId: 'JNSX10050525' },
);
