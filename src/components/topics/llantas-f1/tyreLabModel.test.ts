import { describe, expect, test } from 'vitest';
import {
  BOX,
  INITIAL_TYRE_STATE,
  LOAD_DOMAIN,
  TEMPERATURE_DOMAIN,
  boxFriction,
  setCompound,
  setLoad,
  setTemperature,
  tyreReadings,
  windowLabel,
} from './tyreLabModel';

describe('tyre lab state', () => {
  test('opens at the C3 optimum, 120 °C, and the reference load, 4 000 N', () => {
    expect(INITIAL_TYRE_STATE).toEqual({ t: 120, fz: 4000, compound: 'C3' });
  });

  test('the domains follow the v1 charts: 40–160 °C and 0–10 000 N', () => {
    expect(TEMPERATURE_DOMAIN).toEqual({ min: 40, max: 160 });
    expect(LOAD_DOMAIN).toEqual({ min: 0, max: 10000 });
  });

  test('setTemperature snaps to 1 °C and clamps to the plot domain', () => {
    expect(setTemperature(INITIAL_TYRE_STATE, 87.6).t).toBe(88);
    expect(setTemperature(INITIAL_TYRE_STATE, 400).t).toBe(160);
    expect(setTemperature(INITIAL_TYRE_STATE, -5).t).toBe(40);
  });

  test('setLoad snaps to 50 N and clamps to the plot domain', () => {
    expect(setLoad(INITIAL_TYRE_STATE, 8012).fz).toBe(8000);
    expect(setLoad(INITIAL_TYRE_STATE, 12000).fz).toBe(10000);
    expect(setLoad(INITIAL_TYRE_STATE, -100).fz).toBe(0);
  });

  test('setCompound keeps the temperature and load, and returns a new state', () => {
    const next = setCompound(INITIAL_TYRE_STATE, 'C4');

    expect(next).toEqual({ t: 120, fz: 4000, compound: 'C4' });
    expect(INITIAL_TYRE_STATE.compound).toBe('C3');
  });

  test('windowLabel names the compound and the year', () => {
    expect(windowLabel('C3')).toBe('Ventana de trabajo C3 (2019)');
    expect(windowLabel('C4')).toBe('Ventana de trabajo C4 (2019)');
  });
});

describe('tyreReadings', () => {
  test('at the optimum and the reference load both models give 6 400 N', () => {
    const readings = tyreReadings(INITIAL_TYRE_STATE);

    expect(readings.mu).toBeCloseTo(1.8, 10);
    expect(readings.factor).toBeCloseTo(1, 10);
    expect(readings.linear).toBeCloseTo(6400, 6);
    expect(readings.real).toBeCloseTo(6400, 6);
    expect(readings.muEff).toBeCloseTo(1.6, 10);
  });

  test('at 8 000 N the real force is 11 943 N against 12 800 N linear', () => {
    const readings = tyreReadings({ ...INITIAL_TYRE_STATE, fz: 8000 });

    expect(Math.round(readings.real)).toBe(11943);
    expect(readings.linear).toBeCloseTo(12800, 6);
  });

  test('a cold tyre scales both forces by μ(T)/μ_pico: 60 °C gives μ = 1,11', () => {
    const readings = tyreReadings({ ...INITIAL_TYRE_STATE, t: 60 });

    expect(readings.mu).toBeCloseTo(1.11, 2);
    expect(readings.linear).toBeCloseTo(6400 * readings.factor, 6);
  });

  test('the same 120 °C sits on the C4 window edge: 97 % of the peak', () => {
    const readings = tyreReadings({ ...INITIAL_TYRE_STATE, compound: 'C4' });

    expect(readings.factor).toBeCloseTo(0.97, 6);
  });
});

describe('boxFriction', () => {
  test('the 10 kg box with g = 9,81: n = 98,1 N, 39,2 N static limit, 29,4 N kinetic', () => {
    expect(BOX.normal).toBeCloseTo(98.1, 6);
    expect(BOX.staticLimit).toBeCloseTo(39.24, 6);
    expect(BOX.kinetic).toBeCloseTo(29.43, 6);
  });

  test('friction follows the push up to the static limit, then drops to f_k', () => {
    const points = boxFriction(60);

    expect(points[0]).toEqual({ x: 0, y: 0 });
    expect(points[1]).toEqual({ x: BOX.staticLimit, y: BOX.staticLimit });
    expect(points[2]).toEqual({ x: BOX.staticLimit, y: BOX.kinetic });
    expect(points.at(-1)).toEqual({ x: 60, y: BOX.kinetic });
  });
});
