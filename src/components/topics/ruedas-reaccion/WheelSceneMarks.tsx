/** Marks drawn over the wheel scene: rate arcs and, in the disturbance mode, τ_ext and the dump. */
import type { JSX } from 'react';
import { TEXT_COLOR, TICK_COLOR } from '../../charts/chartTheme';
import MathText from '../../lab/MathText';
import { Arrow, Label } from '../../lab/OverlayMarks';
import type { DumpActuator } from './wheelLabModel';
import { arcPath, BODY_FOOTPRINT, polar, type Point } from './wheelScene';

/** The Earth's field B wears the Earth blue (spec §4.3), as in Tema 2. */
const FIELD_COLOR = 'var(--chart-1)';
const ARROW_TIP = 12;
const ARC_WIDTH = 2.5;
const ARC_LABEL_GAP = 13;
const FIELD_LINE_SHARE = 0.6;
const FIELD_PAD = 10;
const ROD = { at: -0.62, length: 0.8, width: 6 } as const;
const JET = { gap: 9, length: 28, plume: 14 } as const;
const DISTURBANCE_ARC = { centre: 135, sweep: 32 } as const;
const FORMULA_SIZE = 13;
const FORMULA_INSET = 8;

export interface SceneGeometry {
  c: Point;
  dial: number;
  scale: number;
  wheel: number;
}

/** Decimals of the arcs' angle attributes: a stable string per frame, a hundredth of a degree. */
const ANGLE_DECIMALS = 2;
/** SVG's rotate turns clockwise on screen; the laboratory counts counterclockwise, like polar(). */
const rotateAttr = (degrees: number, about: Point) =>
  `rotate(${(-degrees).toFixed(ANGLE_DECIMALS)} ${about.x} ${about.y})`;

/**
 * A curved rate arrow on the circle (c, radius), centred at `centreDeg` and sweeping `sweep`
 * degrees (positive: counterclockwise on screen), with its head at the leading end and its label
 * outside the middle. Nothing is drawn for a zero sweep.
 *
 * Drawn about angle 0 inside a group rotated to the centre, so a frame in which only the sweep
 * grows rewrites the arc's path and the head's rotation, and one in which the centre turns rewrites
 * the group's rotation and the label's counter-rotation: two attributes each, not one per element.
 */
export function RateArc({
  c,
  radius,
  centreDeg,
  sweep,
  color,
  label,
}: {
  c: Point;
  radius: number;
  centreDeg: number;
  sweep: number;
  color: string;
  label: string;
}): JSX.Element | null {
  if (sweep === 0) return null;
  const half = sweep / 2;
  const direction = Math.sign(sweep);
  // In the head's own frame (rotated to the leading end) the end sits at angle 0 and the
  // counterclockwise tangent there points up the screen (−y).
  const end = polar(c, radius, 0);
  const tip = { x: end.x, y: end.y - direction * ARROW_TIP };
  const labelAt = polar(c, radius + ARC_LABEL_GAP, 0);
  return (
    <g data-rate={label} className="pointer-events-none" transform={rotateAttr(centreDeg, c)}>
      <path
        d={arcPath(c, radius, -half, half)}
        fill="none"
        stroke={color}
        strokeWidth={ARC_WIDTH}
        strokeLinecap="round"
      />
      <g transform={rotateAttr(half, c)}>
        <Arrow from={end} to={tip} color={color} />
      </g>
      <g transform={rotateAttr(-centreDeg, labelAt)}>
        <Label at={labelAt} dx={0} dy={4} anchor="middle">
          {label}
        </Label>
      </g>
    </g>
  );
}

/** Earth's field lines across the canvas, drawn under the body, with their B label. */
export function FieldLines({ c, dial }: SceneGeometry): JSX.Element {
  const width = 2 * c.x;
  const rows = [-FIELD_LINE_SHARE, 0, FIELD_LINE_SHARE].map((share) => c.y + share * dial);
  return (
    <g data-field="B" className="pointer-events-none" opacity={0.85}>
      {rows.map((y) => (
        <Arrow
          key={y}
          from={{ x: FIELD_PAD, y }}
          to={{ x: width - FIELD_PAD, y }}
          color={FIELD_COLOR}
        />
      ))}
      <Label at={{ x: width - FIELD_PAD, y: rows[0] }} dx={-4} dy={-8} anchor="end">
        B
      </Label>
    </g>
  );
}

/** The magnetorquer rod m across the field (m ⊥ B, its best case), filled while it dumps. */
function Magnetorquer({ c, scale, dumping }: SceneGeometry & { dumping: boolean }): JSX.Element {
  const x = c.x + ROD.at * (BODY_FOOTPRINT.long / 2) * scale;
  const half = (ROD.length * BODY_FOOTPRINT.short * scale) / 2;
  return (
    <g data-actuator="magnetopar" className="pointer-events-none">
      <rect
        x={x - ROD.width / 2}
        y={c.y - half}
        width={ROD.width}
        height={2 * half}
        rx={2}
        fill={dumping ? TEXT_COLOR : 'none'}
        stroke={TEXT_COLOR}
        strokeWidth={1.25}
      />
      <Label at={{ x, y: c.y - half }} dx={8} dy={4}>
        m
      </Label>
    </g>
  );
}

/** The thruster on the front corner: while it fires, F pushes the body clockwise and the plume leaves. */
function Thruster({ c, scale, dumping }: SceneGeometry & { dumping: boolean }): JSX.Element | null {
  if (!dumping) return null;
  const corner = {
    x: c.x + (BODY_FOOTPRINT.long / 2) * scale + JET.gap,
    y: c.y - (BODY_FOOTPRINT.short / 2) * scale,
  };
  return (
    <g data-actuator="propulsor" className="pointer-events-none">
      <line
        x1={corner.x}
        y1={corner.y}
        x2={corner.x}
        y2={corner.y - JET.plume}
        stroke={TICK_COLOR}
        strokeWidth={2}
        strokeDasharray="3 3"
      />
      <Arrow from={corner} to={{ x: corner.x, y: corner.y + JET.length }} color={TEXT_COLOR} />
      <Label at={{ x: corner.x, y: corner.y + JET.length }} dx={6} dy={0}>
        F
      </Label>
    </g>
  );
}

/**
 * The disturbance mode's marks over the body: τ_ext turning it counterclockwise (the wheel takes
 * it so the body stays still), the magnetorquer rod or the thruster's jet, and the dump's own law
 * while it acts. The field lines go under the body (FieldLines).
 */
export function DisturbanceMarks({
  geometry,
  actuator,
  dumping,
}: {
  geometry: SceneGeometry;
  actuator: DumpActuator;
  dumping: boolean;
}): JSX.Element {
  const { c, dial } = geometry;
  const formula = actuator === 'magnetopar' ? 'τ = m × B' : 'τ = r × F';
  return (
    <g>
      <RateArc
        c={c}
        radius={dial - FORMULA_INSET}
        centreDeg={DISTURBANCE_ARC.centre}
        sweep={DISTURBANCE_ARC.sweep}
        color={TICK_COLOR}
        label="τ_ext"
      />
      {dumping ? (
        <MathText
          source={formula}
          x={FORMULA_INSET}
          y={2 * c.y - FORMULA_INSET}
          fontSize={FORMULA_SIZE}
          fill={TEXT_COLOR}
        />
      ) : null}
      <DumpActuatorMark geometry={geometry} actuator={actuator} dumping={dumping} />
    </g>
  );
}

function DumpActuatorMark({
  geometry,
  actuator,
  dumping,
}: {
  geometry: SceneGeometry;
  actuator: DumpActuator;
  dumping: boolean;
}): JSX.Element | null {
  return actuator === 'magnetopar' ? (
    <Magnetorquer {...geometry} dumping={dumping} />
  ) : (
    <Thruster {...geometry} dumping={dumping} />
  );
}
