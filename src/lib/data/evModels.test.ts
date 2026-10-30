import { describe, expect, test } from 'vitest';
import { roadLoadFromEpa } from '../physics/energy';
import { LEAF_2025, MODEL3_LR_RWD_2025 } from './evModels';

describe('MODEL3_LR_RWD_2025', () => {
  test('keeps the EPA 2025 Test Car List target values as printed (research §5)', () => {
    expect(MODEL3_LR_RWD_2025.epa).toEqual({
      etwLb: 4250,
      aLbf: 27.02,
      bLbfPerMph: 0.2873,
      cLbfPerMph2: 0.0122,
    });
  });

  test('uses the equivalent test weight as mass: 4250 lb = 1927,77 kg', () => {
    expect(MODEL3_LR_RWD_2025.m).toBeCloseTo(1927.77, 2);
  });

  test('converts A, B and C to SI by code: 120,19 N, 2,8587 N·s/m, 0,27155 N·s²/m²', () => {
    expect(MODEL3_LR_RWD_2025.roadLoad).toEqual(roadLoadFromEpa(27.02, 0.2873, 0.0122));
    expect(MODEL3_LR_RWD_2025.roadLoad.A).toBeCloseTo(120.19, 2);
    expect(MODEL3_LR_RWD_2025.roadLoad.B).toBeCloseTo(2.8587, 4);
    expect(MODEL3_LR_RWD_2025.roadLoad.C).toBeCloseTo(0.27155, 5);
  });

  test('cites the test vehicle and the charge-depleting UDDS test', () => {
    expect(MODEL3_LR_RWD_2025.name).toBe('Tesla Model 3 Long Range RWD 2025');
    expect(MODEL3_LR_RWD_2025.source).toEqual({
      list: 'EPA, 2025 Test Car List Data (25-testcar-2026-01-21.xlsx)',
      testVehicleId: '3R124-782214',
      testId: 'RTSL10086702',
      url: 'https://www.epa.gov/system/files/documents/2026-01/25-testcar-2026-01-21.xlsx',
      accessed: '2026-10-30',
    });
  });
});

describe('LEAF_2025', () => {
  test('keeps the EPA values: ETW 3875 lb, A 25,89 lbf, B 0,3449 lbf/mph, C 0,019 45 lbf/mph²', () => {
    expect(LEAF_2025.epa).toEqual({
      etwLb: 3875,
      aLbf: 25.89,
      bLbfPerMph: 0.3449,
      cLbfPerMph2: 0.01945,
    });
  });

  test('weighs 3875 × 0,453 592 37 = 1757,7 kg', () => {
    expect(LEAF_2025.m).toBeCloseTo(1757.7, 1);
    expect(LEAF_2025.m).toBeCloseTo(3875 * 0.45359237, 9);
  });

  test('converts A, B and C to SI by code', () => {
    expect(LEAF_2025.roadLoad).toEqual(roadLoadFromEpa(25.89, 0.3449, 0.01945));
    expect(LEAF_2025.roadLoad.A).toBeCloseTo(115.16, 2);
    expect(LEAF_2025.roadLoad.C).toBeCloseTo(0.43293, 5);
  });

  test('cites the test vehicle KWB115 and its charge-depleting UDDS test', () => {
    expect(LEAF_2025.name).toBe('Nissan LEAF 2025');
    expect(LEAF_2025.source.testVehicleId).toBe('KWB115');
    expect(LEAF_2025.source.testId).toBe('JNSX10050525');
    expect(LEAF_2025.source.accessed).toBe('2026-10-30');
  });
});

describe('the two cars', () => {
  test('the LEAF is lighter but has the larger aerodynamic C (research §7)', () => {
    expect(LEAF_2025.m).toBeLessThan(MODEL3_LR_RWD_2025.m);
    expect(LEAF_2025.roadLoad.C).toBeGreaterThan(MODEL3_LR_RWD_2025.roadLoad.C);
  });
});
