import type { JSX } from 'react';
import { CHART_COLORS, TEXT_COLOR, TICK_COLOR, TICK_FONT_FAMILY } from '../../charts/chartTheme';
import { Arrow } from '../../lab/OverlayMarks';
import HabitatPerson from './HabitatPerson';

/** The weight m g is Earth's gravity: chart 1, as everywhere a terrestrial g is drawn. */
const WEIGHT_COLOR = CHART_COLORS[0];
const NORMAL_COLOR = CHART_COLORS[2];
const VIEW = { width: 360, height: 300 } as const;
const PANEL = VIEW.width / 2;
const FLOOR_Y = 200;
const FLOOR_INSET = 22;
const PERSON = 92;
/** In orbit the person floats this far above the floor. */
const FLOAT_GAP = 26;
const FORCE = 52;
const FORCE_OFFSET = 30;
const TITLE_Y = 24;
const EQUATION_Y = 238;
const NOTE_Y = 262;
const LINE = 20;
const HATCH_STEP = 12;
const TEXT_SIZE = 14;

const textStyle = { fontFamily: TICK_FONT_FAMILY, fontSize: TEXT_SIZE } as const;

function Floor({ left }: { left: number }): JSX.Element {
  const from = left + FLOOR_INSET;
  const to = left + PANEL - FLOOR_INSET;
  const hatches = Array.from(
    { length: Math.floor((to - from) / HATCH_STEP) },
    (_, index) => `M${from + HATCH_STEP / 2 + index * HATCH_STEP} ${FLOOR_Y + 2} l-6 8`,
  ).join(' ');
  return (
    <g stroke={TEXT_COLOR}>
      <line x1={from} y1={FLOOR_Y} x2={to} y2={FLOOR_Y} strokeWidth={2} />
      <path d={hatches} stroke={TICK_COLOR} fill="none" />
    </g>
  );
}

function Force({
  kind,
  x,
  from,
  to,
  label,
  side,
}: {
  kind: 'peso' | 'normal';
  x: number;
  from: number;
  to: number;
  label: string;
  side: 'start' | 'end';
}): JSX.Element {
  const color = kind === 'peso' ? WEIGHT_COLOR : NORMAL_COLOR;
  const labelX = side === 'start' ? x + 8 : x - 8;
  return (
    <g data-force={kind} stroke={color}>
      <Arrow from={{ x, y: from }} to={{ x, y: to }} color={color} />
      <text
        x={labelX}
        y={(from + to) / 2 + 5}
        textAnchor={side}
        fill={TEXT_COLOR}
        stroke="none"
        {...textStyle}
      >
        {label}
      </text>
    </g>
  );
}

function PanelText({ centre, lines }: { centre: number; lines: string[] }): JSX.Element {
  const [equation, ...notes] = lines;
  return (
    <g textAnchor="middle" {...textStyle}>
      <text x={centre} y={EQUATION_Y} fill={TEXT_COLOR} fontWeight={600}>
        {equation}
      </text>
      {notes.map((note, index) => (
        <text key={note} x={centre} y={NOTE_Y + index * LINE} fill={TICK_COLOR}>
          {note}
        </text>
      ))}
    </g>
  );
}

/**
 * Step 1's free-body sketch: on Earth the floor pushes up with n = m g, felt as weight; in a ship
 * that does not spin, in orbit, ship and person fall together with a = g and the floor pushes
 * nothing, n = 0. A static SVG with a fixed viewBox; colors follow the theme tokens.
 */
export default function ApparentWeightDiagram(): JSX.Element {
  const earth = PANEL / 2;
  const orbit = PANEL + PANEL / 2;
  const floatFeet = FLOOR_Y - FLOAT_GAP;
  return (
    <svg
      role="img"
      aria-label="Peso aparente en la Tierra y en una nave que no gira"
      viewBox={`0 0 ${VIEW.width} ${VIEW.height + LINE}`}
      width="100%"
      className="mx-auto block h-auto max-w-[30rem]"
    >
      <g textAnchor="middle" fill={TEXT_COLOR} {...textStyle}>
        <text x={earth} y={TITLE_Y}>
          En la Tierra
        </text>
        <text x={orbit} y={TITLE_Y}>
          En órbita, sin girar
        </text>
      </g>
      <line
        x1={PANEL}
        y1={TITLE_Y + 12}
        x2={PANEL}
        y2={VIEW.height}
        stroke={TICK_COLOR}
        strokeDasharray="4 4"
      />

      <Floor left={0} />
      <HabitatPerson x={earth} feetY={FLOOR_Y - 1} height={PERSON} />
      <Force
        kind="peso"
        x={earth + FORCE_OFFSET}
        from={FLOOR_Y - PERSON / 2 - FORCE / 2}
        to={FLOOR_Y - PERSON / 2 + FORCE / 2}
        label="m g"
        side="start"
      />
      <Force
        kind="normal"
        x={earth - FORCE_OFFSET}
        from={FLOOR_Y - 2}
        to={FLOOR_Y - 2 - FORCE}
        label="n"
        side="end"
      />
      <PanelText centre={earth} lines={['n = m g', 'el piso la sostiene']} />

      <Floor left={PANEL} />
      <HabitatPerson x={orbit} feetY={floatFeet} height={PERSON} />
      <Force
        kind="peso"
        x={orbit + FORCE_OFFSET}
        from={floatFeet - PERSON / 2 - FORCE / 2}
        to={floatFeet - PERSON / 2 + FORCE / 2}
        label="m g"
        side="start"
      />
      <PanelText centre={orbit} lines={['n = 0', 'nave y persona', 'caen con a = g']} />
    </svg>
  );
}
