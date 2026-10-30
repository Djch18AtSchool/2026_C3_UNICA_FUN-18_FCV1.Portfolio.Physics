import { describe, expect, test } from 'vitest';
import { AU_KM, GM_SUN, PLANETS } from '../../../lib/data/planets';
import { SUN_ONLY_ORBIT, VOYAGER, VOYAGER_MASS_KG } from '../../../lib/data/voyager';
import {
  deltaVMagnitude,
  escapeSpeed,
  recoilSpeed,
  visVivaSpeed,
} from '../../../lib/physics/gravitation';
import {
  formatScientific,
  hyperbolaFigure,
  jupiterRecoil,
  velocityTriangle,
  visVivaFigure,
} from './flybyFigures';

const DEG = Math.PI / 180;
const angleBetween = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.acos((a.x * b.x + a.y * b.y) / (Math.hypot(a.x, a.y) * Math.hypot(b.x, b.y))) / DEG;

describe('visVivaFigure (Paso 1)', () => {
  const figure = visVivaFigure();
  const speedAt = (r: number, energy: number) => visVivaSpeed(r * AU_KM, GM_SUN, energy);

  test('before Jupiter the data follow the Sun-only orbit of 1979-01-01 (ε < 0)', () => {
    expect(figure.boundEnergy).toBe(SUN_ONLY_ORBIT.energy);
    expect(figure.before.length).toBeGreaterThan(20);
    for (const point of figure.before) {
      expect(
        Math.abs(point.y - speedAt(point.x, figure.boundEnergy)),
        String(point.x),
      ).toBeLessThan(0.05);
    }
  });

  test('between Jupiter and Saturn the data follow one vis-viva curve with ε > 0', () => {
    expect(figure.afterEnergy).toBeGreaterThan(25);
    expect(figure.afterEnergy).toBeLessThan(27);
    expect(figure.after.length).toBeGreaterThan(20);
    for (const point of figure.after) {
      expect(
        Math.abs(point.y - speedAt(point.x, figure.afterEnergy)),
        String(point.x),
      ).toBeLessThan(0.15);
    }
  });

  test('the bound curve ends at aphelion, 6,21 km/s at 6,29 UA; the escape curve sits between', () => {
    expect(figure.aphelion.x).toBeCloseTo(6.29, 2);
    expect(figure.aphelion.y).toBeCloseTo(6.21, 2);
    expect(figure.boundCurve.at(-1)).toEqual(figure.aphelion);
    for (const point of figure.afterCurve) {
      expect(point.y).toBeGreaterThan(escapeSpeed(point.x * AU_KM, GM_SUN));
    }
    expect(figure.jupiterR).toBeCloseTo(5.33, 2);
  });
});

describe('hyperbolaFigure (Paso 2)', () => {
  const figure = hyperbolaFigure();
  const jupiter = VOYAGER.encounters.find((e) => e.probe === 'V2' && e.planet === 'jupiter');

  test('V2 at Jupiter: v∞ 7,6 km/s, r_p 721 375 km = 10,09 R_J, e = 1,330, δ = 97,5°', () => {
    expect(figure.vInf).toBe(jupiter?.vInf);
    expect(figure.rpKm).toBe(721375);
    expect(figure.rpRadii).toBeCloseTo(10.09, 2);
    expect(figure.e).toBeCloseTo(1.33, 3);
    expect(figure.deltaDeg).toBeCloseTo(97.5, 1);
  });

  test('the path passes r_p from the centre and its asymptotes turn by δ', () => {
    const closest = Math.min(...figure.path.map((p) => Math.hypot(p.x, p.y)));
    expect(closest).toBeCloseTo(figure.rpRadii, 3);
    expect(angleBetween(figure.inDir, figure.outDir)).toBeCloseTo(figure.deltaDeg, 6);
    const first = figure.path[0];
    expect(Math.hypot(first.x, first.y)).toBeGreaterThan(3 * figure.rpRadii);
  });

  test('v∞ in and out are drawn the same length, each along its asymptote', () => {
    const length = (a: { from: { x: number; y: number }; to: { x: number; y: number } }) =>
      Math.hypot(a.to.x - a.from.x, a.to.y - a.from.y);
    const along = (a: typeof figure.inArrow) => ({ x: a.to.x - a.from.x, y: a.to.y - a.from.y });

    expect(length(figure.inArrow)).toBeCloseTo(length(figure.outArrow), 9);
    expect(angleBetween(along(figure.inArrow), figure.inDir)).toBeCloseTo(0, 4);
    expect(angleBetween(along(figure.outArrow), figure.outDir)).toBeCloseTo(0, 4);
  });
});

describe('velocityTriangle (Paso 3)', () => {
  test('Jupiter: |V_p + v∞| goes from 9,59 to 19,50 km/s, +9,91 km/s, a turn in the plane', () => {
    const triangle = velocityTriangle('jupiter');

    expect(triangle.vIn).toBeCloseTo(9.59, 2);
    expect(triangle.vOut).toBeCloseTo(19.5, 2);
    expect(triangle.jump).toBeCloseTo(9.91, 2);
    expect(triangle.isPlanar).toBe(true);
    expect(Math.hypot(triangle.inTip.x, triangle.inTip.y)).toBeCloseTo(triangle.vIn, 9);
    expect(Math.hypot(triangle.outTip.x, triangle.outTip.y)).toBeCloseTo(triangle.vOut, 9);
  });

  test('Neptune: the law of cosines with θ_in and θ_out reproduces −2,13 km/s', () => {
    const triangle = velocityTriangle('neptune');
    const neptune = VOYAGER.encounters.find((e) => e.probe === 'V2' && e.planet === 'neptune');

    expect(triangle.jump).toBeCloseTo(-2.13, 2);
    expect(triangle.vIn).toBeCloseTo(neptune?.conicBefore ?? NaN, 2);
    expect(triangle.vOut).toBeCloseTo(neptune?.conicAfter ?? NaN, 2);
    expect(triangle.isPlanar).toBe(false);
    expect(triangle.thetaInDeg).toBeCloseTo(75.4, 1);
    expect(triangle.thetaOutDeg).toBeCloseTo(99.65, 1);
  });

  test('the triangle closes: v = V_p + v∞ before and after', () => {
    const triangle = velocityTriangle('jupiter');
    const vInfIn = { x: triangle.inTip.x - triangle.Vp, y: triangle.inTip.y };
    const vInfOut = { x: triangle.outTip.x - triangle.Vp, y: triangle.outTip.y };

    expect(Math.hypot(vInfIn.x, vInfIn.y)).toBeCloseTo(triangle.vInf, 9);
    expect(Math.hypot(vInfOut.x, vInfOut.y)).toBeCloseTo(triangle.vInf, 9);
    expect(angleBetween({ x: 1, y: 0 }, vInfIn)).toBeCloseTo(triangle.thetaInDeg, 9);
  });
});

describe('jupiterRecoil', () => {
  test('chains the probe mass, Jupiter mass and |Δv⃗| of V2: Jupiter slows by 4,4·10⁻²¹ m/s', () => {
    const encounter = VOYAGER.encounters.find((e) => e.probe === 'V2' && e.planet === 'jupiter');
    if (!encounter) throw new Error('falta V2 en Júpiter');
    const deltaV = deltaVMagnitude(encounter.vInf, encounter.deltaDeg * DEG);

    expect(deltaV).toBeCloseTo(11.45, 2);
    expect(jupiterRecoil()).toBe(
      Math.abs(recoilSpeed(VOYAGER_MASS_KG, PLANETS.jupiter.massKg, deltaV)) * 1000,
    );
    expect(jupiterRecoil()).toBeCloseTo(4.35e-21, 23);
    expect(formatScientific(jupiterRecoil(), 1)).toBe('4,4·10⁻²¹');
  });

  test('formatScientific writes positive and negative exponents with superscripts', () => {
    expect(formatScientific(1.89819e27, 2)).toBe('1,90·10²⁷');
    expect(formatScientific(-0.00123, 1)).toBe('−1,2·10⁻³');
    expect(formatScientific(0, 1)).toBe('0');
  });
});
