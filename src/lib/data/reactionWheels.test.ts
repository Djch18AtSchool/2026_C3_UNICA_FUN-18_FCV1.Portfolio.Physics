import { describe, expect, test } from 'vitest';
import { gravityGradientTorqueMax, rpmToOmega } from '../physics';
import {
  CUBESAT_6U,
  GRAVITY_GRADIENT_6U,
  MAGNETORQUER_6U,
  MISSIONS,
  ORBIT_500KM,
  REACTION_WHEEL_SOURCES,
  RW400,
  VRW_D_4,
  type WheelSourceId,
} from './reactionWheels';

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_DAY = 86400;

describe('RW400', () => {
  test('carries the AAC Clyde datasheet values for the 50 mN·m·s variant', () => {
    expect(RW400).toMatchObject({ Lmax: 0.05, tauMax: 0.008, rpmMax: 5000, mass: 0.375 });
    expect(RW400.sourceId).toBe('W2');
  });

  test('derives its rotor inertia 9,55·10⁻⁵ kg·m² as L_max/ω_max, marked cálculo propio', () => {
    expect(RW400.inertiaDerived).toBeCloseTo(9.55e-5, 7);
    expect(RW400.inertiaDerived).toBe(RW400.Lmax / rpmToOmega(RW400.rpmMax));
    expect(RW400.inertiaPrinted).toBeNull();
    expect(RW400.notes.join(' ')).toMatch(/cálculo propio/);
  });

  test('warns about the datasheet pitfalls: one top speed for three sizes, 8 vs 12 mN·m', () => {
    const notes = RW400.notes.join(' ');

    expect(notes).toMatch(/5\u202F000 rpm/);
    expect(notes).toMatch(/> 12 mN\.m \(braking\)/);
  });
});

describe('VRW_D_4', () => {
  test('carries the VECTRONIC datasheet values', () => {
    expect(VRW_D_4).toMatchObject({
      Lmax: 4,
      tauMax: 0.05,
      rpmMax: 6000,
      mass: 2.5,
      inertiaPrinted: 6.37e-3,
    });
    expect(VRW_D_4.sourceId).toBe('W1');
  });

  test('its printed inertia agrees with L_max/ω_max: 6,37·10⁻³ × 628,3 = 4,00 N·m·s', () => {
    expect(rpmToOmega(VRW_D_4.rpmMax)).toBeCloseTo(628.3, 1);
    expect((VRW_D_4.inertiaPrinted ?? 0) * rpmToOmega(VRW_D_4.rpmMax)).toBeCloseTo(4.0, 2);
    expect(VRW_D_4.inertiaDerived / (VRW_D_4.inertiaPrinted ?? 0)).toBeCloseTo(1, 2);
  });
});

describe('CUBESAT_6U', () => {
  test('is the CubeSat Design Specification 6U: 12 kg, 100,0 × 226,3 × 366,0 mm', () => {
    expect(CUBESAT_6U.mass).toBe(12);
    expect(CUBESAT_6U.dimensions).toEqual([0.1, 0.2263, 0.366]);
    expect(CUBESAT_6U.sourceId).toBe('C1');
  });

  test('as a homogeneous box has I_s = 0,1852 kg·m² normal to its largest face', () => {
    expect(CUBESAT_6U.Is).toBeCloseTo(0.1852, 4);
    expect(CUBESAT_6U.note).toMatch(/caja homogénea/);
  });

  test('has 0,0612 kg·m² about its long axis, so ΔI = 0,1240 kg·m²', () => {
    expect(CUBESAT_6U.Ilong).toBeCloseTo(0.0612, 4);
    expect(CUBESAT_6U.Is - CUBESAT_6U.Ilong).toBeCloseTo(0.124, 4);
  });

  test('is about 1940 times the RW400 rotor inertia', () => {
    expect(CUBESAT_6U.Is / RW400.inertiaDerived).toBeCloseTo(1940, -1);
  });
});

describe('ORBIT_500KM', () => {
  test('is a 6871 km circular orbit with a period of 94,5 min', () => {
    expect(ORBIT_500KM.r).toBe(ORBIT_500KM.earthRadius + ORBIT_500KM.altitude);
    expect(ORBIT_500KM.r).toBe(6.871e6);
    expect(ORBIT_500KM.period / SECONDS_PER_MINUTE).toBeCloseTo(94.5, 1);
  });
});

describe('GRAVITY_GRADIENT_6U', () => {
  test('is at most 2,29·10⁻⁷ N·m (θ = 45°, NASA SP-8024)', () => {
    const { mu, r } = ORBIT_500KM;

    expect(GRAVITY_GRADIENT_6U.torque).toBe(
      gravityGradientTorqueMax(mu, r, CUBESAT_6U.Is - CUBESAT_6U.Ilong),
    );
    expect(GRAVITY_GRADIENT_6U.torque).toBeCloseTo(2.29e-7, 8);
    expect(GRAVITY_GRADIENT_6U.sourceLabel).toMatch(/SP-8024/);
    expect(GRAVITY_GRADIENT_6U.sourceLabel).toMatch(/cota superior/);
  });

  test('fills the empty RW400 in 2,19·10⁵ s ≈ 61 h ≈ 2,5 days ≈ 39 orbits at most', () => {
    const toSaturate = RW400.Lmax / GRAVITY_GRADIENT_6U.torque;

    expect(toSaturate).toBeCloseTo(2.19e5, -3);
    expect(toSaturate / SECONDS_PER_HOUR).toBeCloseTo(61, 0);
    expect(toSaturate / SECONDS_PER_DAY).toBeCloseTo(2.5, 1);
    expect(toSaturate / ORBIT_500KM.period).toBeCloseTo(39, 0);
  });
});

describe('MAGNETORQUER_6U', () => {
  test('a 0,40 A·m² GST-600 in 3·10⁻⁵ T gives 1,2·10⁻⁵ N·m, about 50 times τ_gg', () => {
    expect(MAGNETORQUER_6U.dipole).toBe(0.4);
    expect(MAGNETORQUER_6U.field).toBe(3e-5);
    expect(MAGNETORQUER_6U.torque).toBeCloseTo(1.2e-5, 12);
    expect(MAGNETORQUER_6U.torque / GRAVITY_GRADIENT_6U.torque).toBeCloseTo(50, -1);
  });

  test('B at 500 km is 16 000–48 000 nT, scaling the surface field as a dipole', () => {
    const [weak, strong] = MAGNETORQUER_6U.fieldRange;

    expect((ORBIT_500KM.earthRadius / ORBIT_500KM.r) ** 3).toBeCloseTo(0.797, 3);
    expect(Math.round(weak * 1e6)).toBe(16);
    expect(Math.round(strong * 1e6)).toBe(48);
    expect(MAGNETORQUER_6U.field).toBeGreaterThan(weak);
    expect(MAGNETORQUER_6U.field).toBeLessThan(strong);
  });

  test('empties 0,050 N·m·s in about 70 min, from 44 min (strong B) to 131 min (weak B)', () => {
    const [weak, strong] = MAGNETORQUER_6U.fieldRange;
    const minutes = (field: number) =>
      RW400.Lmax / (MAGNETORQUER_6U.dipole * field) / SECONDS_PER_MINUTE;

    expect(RW400.Lmax / MAGNETORQUER_6U.torque / SECONDS_PER_MINUTE).toBeCloseTo(70, -1);
    expect(minutes(strong)).toBeCloseTo(44, 0);
    expect(minutes(weak)).toBeCloseTo(131, 0);
  });
});

describe('MISSIONS', () => {
  const text = (mission: string) =>
    MISSIONS.filter((row) => row.mission === mission)
      .map((row) => row.fact)
      .join(' ');

  test('has the ten confirmed rows of research §4.2 for Kepler, K2, Hubble and JWST', () => {
    expect(MISSIONS).toHaveLength(10);
    expect(new Set(MISSIONS.map((row) => row.mission))).toEqual(
      new Set(['Kepler', 'K2', 'Hubble', 'JWST']),
    );
  });

  test('never states the Hubble wheel capacity, which is NO CONFIRMADO', () => {
    const hubble = text('Hubble');

    expect(hubble).not.toMatch(/N·m·s|Nms|capacidad/i);
    for (const row of MISSIONS) expect(row.fact).not.toMatch(/NO CONFIRMADO/);
  });

  test('keeps the confirmed facts and dates', () => {
    expect(text('Kepler')).toMatch(/14 de julio de 2012/);
    expect(text('Kepler')).toMatch(/14 de mayo de 2013/);
    expect(text('Kepler')).not.toMatch(/11 de mayo/);
    expect(text('K2')).toMatch(/descarga cada 2 días/);
    expect(text('Hubble')).toMatch(/3\u202F000 rpm/);
    expect(text('Hubble')).toMatch(/45 kg/);
    expect(text('JWST')).toMatch(/6 ruedas, 2 de ellas redundantes/);
    expect(text('JWST')).toMatch(/unas 6 semanas/);
  });

  test('every row cites at least one source of the registry', () => {
    for (const row of MISSIONS) {
      expect(row.sourceIds.length).toBeGreaterThan(0);
      for (const id of row.sourceIds) expect(REACTION_WHEEL_SOURCES[id]).toBeDefined();
    }
  });
});

describe('REACTION_WHEEL_SOURCES', () => {
  test('every source has its id, a label and an https URL', () => {
    for (const [id, source] of Object.entries(REACTION_WHEEL_SOURCES)) {
      expect(source.id).toBe(id);
      expect(source.label.trim()).not.toBe('');
      expect(source.url).toMatch(/^https:\/\//);
    }
  });

  test('every source is cited by some datum, and every cited id exists', () => {
    const cited = new Set<WheelSourceId>([
      RW400.sourceId,
      VRW_D_4.sourceId,
      CUBESAT_6U.sourceId,
      ...GRAVITY_GRADIENT_6U.sourceIds,
      ...MAGNETORQUER_6U.sourceIds,
      ...MISSIONS.flatMap((row) => row.sourceIds),
    ]);

    expect(cited).toEqual(new Set(Object.keys(REACTION_WHEEL_SOURCES)));
  });
});
