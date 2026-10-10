/** Data of Tema 3's static figures (steps 2 and 3), from the habitat kinematics. */
import { G_EARTH, rpmForGravity, rpmToOmega, solveHabitat } from '../../../lib/physics';
import { solveForRadius } from './habitatModel';

type XY = { x: number; y: number };

/** A labelled point of a figure; `anchor` says on which side of the point the label sits. */
export interface FigurePoint extends XY {
  id: string;
  label: string;
  anchor: 'start' | 'end';
  /** Label above (−1) or below (+1) the point. */
  side: -1 | 1;
}

/**
 * Comfort limits SpinCalc collects from its five authors (v1 use case): the maximum spin goes
 * from 3 to 6 rpm, the minimum radius, when given, from 4 to 12 m, and the minimum tangential
 * speed from 6 to 10 m/s.
 */
export const COMFORT = { rpmMax: [3, 6], rMin: [4, 12], vMin: [6, 10] } as const;

const SPIN_SAMPLES = 80;

/** a_c/g = ω² r / g from r = 0 to rMax at a fixed spin: a straight line through the origin. */
export function accelerationLine(rpm: number, rMax: number): XY[] {
  const omega = rpmToOmega(rpm);
  return [
    { x: 0, y: 0 },
    { x: rMax, y: (omega * omega * rMax) / G_EARTH },
  ];
}

/** The spin (rpm) that gives 1 g at each radius, (60/2π)·√(g/r), sampled from rFrom to rTo. */
export function spinForOneG(rFrom: number, rTo: number): XY[] {
  return Array.from({ length: SPIN_SAMPLES + 1 }, (_, index) => {
    const r = rFrom + ((rTo - rFrom) * index) / SPIN_SAMPLES;
    return { x: r, y: rpmForGravity(G_EARTH, r) };
  });
}

const STANFORD = { r: 830, rpm: 1 } as const;
const comma = (value: number, decimals: number) => value.toFixed(decimals).replace('.', ',');

/** Step 2: where each spin reaches 1 g, and the Stanford torus short of it. */
export const RADIUS_POINTS: readonly FigurePoint[] = [
  {
    id: 'dos-rpm',
    x: solveForRadius(2).r,
    y: 1,
    label: `2 RPM: ${comma(solveForRadius(2).r, 1)} m`,
    anchor: 'start',
    side: -1,
  },
  {
    id: 'una-rpm',
    x: solveForRadius(1).r,
    y: 1,
    label: `1 RPM: ${comma(solveForRadius(1).r, 1)} m`,
    anchor: 'end',
    side: -1,
  },
  {
    id: 'toro',
    x: STANFORD.r,
    y: solveHabitat(STANFORD).gRatio,
    label: `Toro de Stanford: ${comma(solveHabitat(STANFORD).gRatio, 2)} g`,
    anchor: 'end',
    side: 1,
  },
];

/** Step 3: three habitats at 1 g, with their spin and head-to-feet gradient (as v1 rounds them). */
export const CONFORT_POINTS: readonly FigurePoint[] = [
  {
    id: 'centrifuga',
    x: 10,
    y: rpmForGravity(G_EARTH, 10),
    label: '10 m: 9,46 RPM, 18 %',
    anchor: 'start',
    side: -1,
  },
  {
    id: 'cien',
    x: 100,
    y: rpmForGravity(G_EARTH, 100),
    label: '100 m: 2,99 RPM, 1,8 %',
    anchor: 'start',
    side: -1,
  },
  {
    id: 'dos-rpm',
    x: solveForRadius(2).r,
    y: 2,
    label: '223,6 m: 2 RPM, 0,8 %',
    anchor: 'end',
    side: 1,
  },
];
