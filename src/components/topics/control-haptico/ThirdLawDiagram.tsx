import type { JSX } from 'react';
import { TEXT_COLOR, TICK_COLOR, TICK_FONT_FAMILY } from '../../charts/chartTheme';
import { Arrow } from '../../lab/OverlayMarks';
import { HOOKE_COLOR, PROFILE_COLOR } from './hapticPlots';

const VIEW = { width: 360, height: 280 } as const;
const PANEL = VIEW.width / 2;
const TITLE_Y = 24;
const TEXT_SIZE = 13;
/** Both forces of the pair are drawn this long: same magnitude. */
const FORCE = 52;
const LEVER = { from: 34, to: 150, y: 138, width: 12 } as const;
const PIVOT_RADIUS = 6;
const MOUNT = { width: 18, height: 40, hatch: 8 } as const;
/** The finger comes down from the top of its panel; its pad is at FINGER.pad. */
const FINGER = { x: 270, width: 32, top: 44, pad: 136 } as const;
const CONTACT_X = 138;
const EQUATION_Y = 244;
const NOTE_Y = 266;
const LEVER_FILL = 'color-mix(in srgb, var(--fg) 12%, var(--bg-elevated))';

const textStyle = { fontFamily: TICK_FONT_FAMILY, fontSize: TEXT_SIZE } as const;

function Lever(): JSX.Element {
  const top = LEVER.y - MOUNT.height / 2;
  const hatches = Array.from(
    { length: Math.floor(MOUNT.height / MOUNT.hatch) },
    (_, index) =>
      `M${LEVER.from - MOUNT.width} ${top + (index + 1) * MOUNT.hatch} l${MOUNT.hatch} ${-MOUNT.hatch}`,
  ).join(' ');
  return (
    <g>
      <line
        x1={LEVER.from}
        y1={top}
        x2={LEVER.from}
        y2={top + MOUNT.height}
        stroke={TEXT_COLOR}
        strokeWidth={2}
      />
      <path d={hatches} stroke={TICK_COLOR} fill="none" />
      <line
        x1={LEVER.from}
        y1={LEVER.y}
        x2={LEVER.to}
        y2={LEVER.y}
        stroke={TEXT_COLOR}
        strokeWidth={LEVER.width + 4}
        strokeLinecap="round"
      />
      <line
        x1={LEVER.from}
        y1={LEVER.y}
        x2={LEVER.to}
        y2={LEVER.y}
        style={{ stroke: LEVER_FILL }}
        strokeWidth={LEVER.width}
        strokeLinecap="round"
      />
      <circle
        cx={LEVER.from}
        cy={LEVER.y}
        r={PIVOT_RADIUS}
        style={{ fill: 'var(--bg-elevated)' }}
        stroke={TEXT_COLOR}
        strokeWidth={2}
      />
      <text
        x={(LEVER.from + LEVER.to) / 2}
        y={LEVER.y + 30}
        textAnchor="middle"
        fill={TICK_COLOR}
        {...textStyle}
      >
        gatillo
      </text>
    </g>
  );
}

function Finger(): JSX.Element {
  const left = FINGER.x - FINGER.width / 2;
  return (
    <g>
      <rect
        x={left}
        y={FINGER.top}
        width={FINGER.width}
        height={FINGER.pad - FINGER.top}
        rx={FINGER.width / 2}
        style={{ fill: LEVER_FILL }}
        stroke={TEXT_COLOR}
        strokeWidth={2}
      />
      <text
        x={FINGER.x + FINGER.width / 2 + 8}
        y={FINGER.top + 30}
        fill={TICK_COLOR}
        {...textStyle}
      >
        dedo
      </text>
    </g>
  );
}

/**
 * Step 3's free-body pair, not to scale: the finger pushes the trigger down and the trigger pushes
 * the finger up, with arrows of the same length, each drawn on the body it acts on. A static SVG
 * with a fixed viewBox; colors follow the theme tokens.
 */
export default function ThirdLawDiagram(): JSX.Element {
  const leverTop = LEVER.y - LEVER.width / 2 - 2;
  return (
    <svg
      data-testid="third-law-diagram"
      role="img"
      aria-label="Par de tercera ley entre el dedo y el gatillo: dos fuerzas de igual módulo y sentido opuesto, una sobre cada cuerpo"
      viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
      width="100%"
      className="mx-auto block h-auto max-w-[30rem]"
    >
      <g textAnchor="middle" fill={TEXT_COLOR} {...textStyle}>
        <text x={PANEL / 2} y={TITLE_Y}>
          Sobre el gatillo
        </text>
        <text x={PANEL + PANEL / 2} y={TITLE_Y}>
          Sobre el dedo
        </text>
      </g>
      <line
        x1={PANEL}
        y1={TITLE_Y + 12}
        x2={PANEL}
        y2={EQUATION_Y - 24}
        stroke={TICK_COLOR}
        strokeDasharray="4 4"
      />

      <Lever />
      <g data-force="dedo-gatillo">
        <Arrow
          from={{ x: CONTACT_X, y: leverTop - FORCE }}
          to={{ x: CONTACT_X, y: leverTop }}
          color={HOOKE_COLOR}
        />
        <text
          x={PANEL / 2 + 10}
          y={leverTop - FORCE - 10}
          textAnchor="middle"
          fill={TEXT_COLOR}
          {...textStyle}
        >
          F dedo→gatillo
        </text>
      </g>

      <Finger />
      <g data-force="gatillo-dedo">
        <Arrow
          from={{ x: FINGER.x, y: FINGER.pad + 2 + FORCE }}
          to={{ x: FINGER.x, y: FINGER.pad + 2 }}
          color={PROFILE_COLOR}
        />
        <text
          x={FINGER.x}
          y={FINGER.pad + FORCE + 22}
          textAnchor="middle"
          fill={TEXT_COLOR}
          {...textStyle}
        >
          F gatillo→dedo
        </text>
      </g>

      <g textAnchor="middle" {...textStyle}>
        <text x={VIEW.width / 2} y={EQUATION_Y} fill={TEXT_COLOR} fontWeight={600}>
          F gatillo→dedo = −F dedo→gatillo
        </text>
        <text x={VIEW.width / 2} y={NOTE_Y} fill={TICK_COLOR}>
          mismo módulo, cuerpos distintos
        </text>
      </g>
    </svg>
  );
}
