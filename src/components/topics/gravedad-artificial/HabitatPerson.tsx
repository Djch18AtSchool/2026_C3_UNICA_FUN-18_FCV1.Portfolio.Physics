import type { JSX } from 'react';

export interface HabitatPersonProps {
  x: number;
  /** Where the feet touch the floor; the head points toward smaller y (the axis). */
  feetY: number;
  height: number;
}

/** Proportions of the stick figure, as shares of its height (the static diagram's). */
const HEAD = 0.09;
const HIPS = 0.43;
const SHOULDERS = 0.06;
const REACH = 0.15;
const ARM_DROP = 0.24;
const STRIDE = 0.1;

/** A stick figure standing on (x, feetY), drawn in the text color on the surface. */
export default function HabitatPerson({ x, feetY, height }: HabitatPersonProps): JSX.Element {
  const headR = height * HEAD;
  const headCy = feetY - height + headR;
  const neck = headCy + headR;
  const hips = feetY - height * HIPS;
  const shoulders = neck + height * SHOULDERS;
  const reach = height * REACH;
  const stride = height * STRIDE;
  const hands = shoulders + height * ARM_DROP;
  return (
    <g
      data-person=""
      fill="none"
      stroke="var(--fg)"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="pointer-events-none"
    >
      <circle cx={x} cy={headCy} r={headR} style={{ fill: 'var(--bg-elevated)' }} />
      <path d={`M${x} ${neck} L${x} ${hips}`} />
      <path d={`M${x - reach} ${hands} L${x} ${shoulders} L${x + reach} ${hands}`} />
      <path d={`M${x - stride} ${feetY} L${x} ${hips} L${x + stride} ${feetY}`} />
    </g>
  );
}
