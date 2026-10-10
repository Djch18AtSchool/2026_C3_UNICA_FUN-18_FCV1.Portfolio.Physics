import { requirePositive } from './validate';

/** Maximum static friction force: f_s,max = μ_s N. */
export function maxStaticFriction(muS: number, N: number): number {
  return muS * N;
}

/** Kinetic friction force: f_k = μ_k N. */
export function kineticFriction(muK: number, N: number): number {
  return muK * N;
}

/** Normal force on an incline of angle θ: N = m g cos θ. */
export function normalOnIncline(m: number, g: number, thetaRad: number): number {
  return m * g * Math.cos(thetaRad);
}

/** Load-sensitive friction coefficient: μ(F_z) = μ₀ (F_z/F_z0)^(β − 1), β = `exponent`. */
export function loadSensitiveMu(mu0: number, fz: number, fz0: number, exponent: number): number {
  requirePositive('fz', fz);
  requirePositive('fz0', fz0);
  return mu0 * Math.pow(fz / fz0, exponent - 1);
}

/** Maximum lateral tyre force: F_y,max = μ(F_z) F_z. */
export function maxLateralForce(mu0: number, fz: number, fz0: number, exponent: number): number {
  return loadSensitiveMu(mu0, fz, fz0, exponent) * fz;
}

/** Asymmetric Gaussian grip window around the optimum tyre temperature (°C). */
export interface TemperatureModel {
  muPeak: number;
  tOpt: number;
  widthBelow: number;
  widthAbove: number;
}

/** Grip vs temperature: μ(T) = μ_peak exp(−(T − T_opt)²/(2w²)), w = w_below if T < T_opt, else w_above. */
export function gripVsTemperature(m: TemperatureModel, t: number): number {
  requirePositive('widthBelow', m.widthBelow);
  requirePositive('widthAbove', m.widthAbove);
  const w = t < m.tOpt ? m.widthBelow : m.widthAbove;
  const deltaT = t - m.tOpt;
  return m.muPeak * Math.exp(-(deltaT * deltaT) / (2 * w * w));
}

/** Pacejka magic formula coefficients: stiffness B, shape C, peak D, curvature E. */
export interface MagicFormulaCoefficients {
  B: number;
  C: number;
  D: number;
  E: number;
}

/** Pacejka magic formula: y = D sin(C arctan(Bx − E(Bx − arctan(Bx)))). */
export function magicFormula(x: number, c: MagicFormulaCoefficients): number {
  const bx = c.B * x;
  return c.D * Math.sin(c.C * Math.atan(bx - c.E * (bx - Math.atan(bx))));
}
