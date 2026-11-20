/**
 * The bridge's layers: the fixed one (abutments, rest lines, the decks' titles, the troop's 25 cm
 * bar) and the moving one, redrawn every frame of the live clock (the decks in their first mode,
 * sin(π s), the envelope's band, and the shaker's force, the soldiers or the ZV pushes).
 */
import type { JSX } from 'react';
import { formatNumber } from '../../../lib/format';
import { TEXT_COLOR, TICK_COLOR, TICK_FONT_FAMILY, TICK_FONT_SIZE } from '../../charts/chartTheme';
import type { FrameStore } from '../../lab/frameStore';
import MathText from '../../lab/MathText';
import { Arrow, ARROW_HEAD, LABEL_SIZE } from '../../lab/OverlayMarks';
import { useFrameDerived } from '../../lab/useFrameTime';
import {
  bridgeFrame,
  TROOP_DRAWING_FULL_M,
  type ActiveModel,
  type BridgeFrame,
  type DeckFrame,
  type DeckId,
} from './bridgeFrames';
import { BUILDS_UP_COLOR, DIES_OUT_COLOR, REFERENCE_COLOR } from './resonancePlots';

const ABUTMENT_WIDTH = 16;
const DECK_WIDTH = 4;
const DECK_POINTS = 32;
const TITLE_X = 8;
const SOLDIER_HEIGHT = 12;
const SOLDIER_BOB = 2;
const SPAN_START = 0.1;
const SPAN_END = 0.9;
const SHAKER = { width: 24, height: 12, gap: 12 } as const;
const FORCE_ARROW = 28;
const PUSH_ARROW = 36;
const CLAMP_LABEL_RISE = 8;
const ENVELOPE_OPACITY = 0.16;
const SCALE_BAR_X = 16;
const SCALE_BAR_M = 0.25;
const CM_PER_M = 100;

interface DeckGeometry {
  y: number;
  room: number;
  title?: string;
}

/** One deck in the middle, or two stacked in «Filtro ZV». */
const DECKS: Readonly<Record<ActiveModel['mode'], readonly DeckGeometry[]>> = {
  barrido: [{ y: 120, room: 56 }],
  tropa: [{ y: 128, room: 56 }],
  'filtro-zv': [
    { y: 72, room: 32, title: 'Un empujón' },
    { y: 164, room: 32, title: 'Dos empujones (filtro ZV)' },
  ],
};

const DECK_COLOR: Readonly<Record<DeckId, string>> = {
  puente: TICK_COLOR,
  'un-empujon': BUILDS_UP_COLOR,
  'dos-empujones': DIES_OUT_COLOR,
};

export interface Span {
  left: number;
  right: number;
}

const modeShape = (s: number) => Math.sin(Math.PI * s);
const px = (value: number) => value.toFixed(2);

/** The deck's line at a deflection d (px, upward) at mid-span. */
function deckPath({ left, right }: Span, y: number, d: number): string {
  return Array.from({ length: DECK_POINTS + 1 }, (_, i) => {
    const s = i / DECK_POINTS;
    return `${i === 0 ? 'M' : 'L'}${px(left + s * (right - left))} ${px(y - d * modeShape(s))}`;
  }).join(' ');
}

/** The band the deck sweeps, ± its envelope e (px): the upper edge, then the lower one back. */
function bandPath({ left, right }: Span, y: number, e: number): string {
  const edge = (sign: number) =>
    Array.from({ length: DECK_POINTS + 1 }, (_, i) => {
      const s = i / DECK_POINTS;
      return `${px(left + s * (right - left))} ${px(y - sign * e * modeShape(s))}`;
    });
  const points = [...edge(1), ...edge(-1).reverse()];
  return `M${points.join(' L')} Z`;
}

function Deck({
  deck,
  geometry,
  span,
  showEnvelope,
}: {
  deck: DeckFrame;
  geometry: DeckGeometry;
  span: Span;
  showEnvelope: boolean;
}) {
  const { y, room } = geometry;
  const color = DECK_COLOR[deck.id];
  return (
    <g data-testid={`deck-${deck.id}`} data-clamped={deck.isClamped}>
      {showEnvelope ? (
        <path
          data-envelope=""
          d={bandPath(span, y, deck.envelope * room)}
          fill={color}
          opacity={ENVELOPE_OPACITY}
        />
      ) : null}
      <path
        data-deck=""
        d={deckPath(span, y, deck.fraction * room)}
        fill="none"
        stroke={TEXT_COLOR}
        strokeWidth={DECK_WIDTH}
        strokeLinecap="round"
      />
      {deck.isClamped ? (
        <text
          x={(span.left + span.right) / 2}
          y={y - room - CLAMP_LABEL_RISE}
          textAnchor="middle"
          fontFamily={TICK_FONT_FAMILY}
          fontSize={TICK_FONT_SIZE}
          fill={TEXT_COLOR}
        >
          fuera de escala
        </text>
      ) : null}
    </g>
  );
}

/** The soldiers on the deck, each bobbing with its own phase: one path for all of them. */
function soldiersPath(span: Span, geometry: DeckGeometry, frame: BridgeFrame, phases: number[]) {
  const deflection = frame.decks[0].fraction * geometry.room;
  const count = phases.length;
  return phases
    .map((phase, i) => {
      const s = count === 1 ? 0.5 : SPAN_START + ((SPAN_END - SPAN_START) * i) / (count - 1);
      const x = span.left + s * (span.right - span.left);
      const foot = geometry.y - deflection * modeShape(s) - DECK_WIDTH / 2;
      const head = foot - SOLDIER_HEIGHT - SOLDIER_BOB * Math.cos((frame.marchPhase ?? 0) + phase);
      return `M${px(x)} ${px(foot)} V${px(head)}`;
    })
    .join(' ');
}

/**
 * The shaker's force on the deck as one path, its shaft and its head (a single attribute changes
 * per frame): from (x, y), `length` px up (negative: down); the head shrinks with a short arrow.
 */
function forcePath(x: number, y: number, length: number): string {
  const tip = y - length;
  const head = Math.sign(length) * Math.min(ARROW_HEAD, Math.abs(length));
  const half = head / 2;
  return `M${px(x)} ${px(y)} V${px(tip)} M${px(x)} ${px(tip)} L${px(x - Math.abs(half))} ${px(tip + head)} L${px(x + Math.abs(half))} ${px(tip + head)} Z`;
}

/** What drives the deck: the shaker's force, the soldiers or the ZV pushes. */
function Drivers({
  active,
  frame,
  span,
}: {
  active: ActiveModel;
  frame: BridgeFrame;
  span: Span;
}): JSX.Element | null {
  const mid = (span.left + span.right) / 2;
  const geometries = DECKS[active.mode];
  if (active.mode === 'barrido') {
    const [{ y, room }] = geometries;
    const deckY = y - frame.decks[0].fraction * room;
    const groundY = y + room + SHAKER.gap;
    return (
      <g data-testid="shaker" className="pointer-events-none">
        {/* The shaker's rod to the deck: one attribute per frame. */}
        <line x1={mid} x2={mid} y1={groundY} y2={deckY} stroke={TICK_COLOR} strokeWidth={2} />
        <rect
          x={mid - SHAKER.width / 2}
          y={groundY}
          width={SHAKER.width}
          height={SHAKER.height}
          fill={TICK_COLOR}
        />
        <path
          data-force=""
          d={forcePath(mid, deckY, (frame.force ?? 0) * FORCE_ARROW)}
          stroke={REFERENCE_COLOR}
          strokeWidth={2}
          fill={REFERENCE_COLOR}
        />
      </g>
    );
  }
  if (active.mode === 'tropa') {
    const color = active.step === 'al-paso' ? BUILDS_UP_COLOR : DIES_OUT_COLOR;
    const phases =
      active.step === 'al-paso' ? active.troop.phases.map(() => 0) : active.troop.phases;
    return (
      <path
        data-testid="soldiers"
        data-count={phases.length}
        d={soldiersPath(span, geometries[0], frame, phases)}
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        className="pointer-events-none"
      />
    );
  }
  return (
    <g data-testid="pushes" className="pointer-events-none">
      {(frame.pushes ?? []).map((push, i) => {
        if (!push.isActive) return null;
        const index = push.deck === 'un-empujon' ? 0 : 1;
        const { y, room } = geometries[index];
        const deckY = y - frame.decks[index].fraction * room;
        const base = deckY + PUSH_ARROW * push.share;
        return (
          <Arrow
            key={`${push.deck}-${i}`}
            from={{ x: mid, y: base }}
            to={{ x: mid, y: deckY }}
            color={DECK_COLOR[push.deck]}
          />
        );
      })}
    </g>
  );
}

/** The moving layer: the decks, their bands and what drives them, at the live time. */
export function MovingLayer({
  active,
  frame,
  span,
  showEnvelope,
}: {
  active: ActiveModel;
  frame: FrameStore;
  showEnvelope: boolean;
  span: Span;
}) {
  const now = useFrameDerived(frame, (t) => bridgeFrame(active, t));
  const geometries = DECKS[active.mode];
  return (
    <>
      {now.decks.map((deck, i) => (
        <Deck
          key={deck.id}
          deck={deck}
          geometry={geometries[i]}
          span={span}
          showEnvelope={showEnvelope}
        />
      ))}
      <Drivers active={active} frame={now} span={span} />
    </>
  );
}

/** The fixed parts: the abutments, the rest lines, the decks' titles and the troop's scale. */
export function StaticLayer({ active, span }: { active: ActiveModel; span: Span }) {
  const geometries = DECKS[active.mode];
  return (
    <g className="pointer-events-none">
      {geometries.map(({ y, room, title }) => (
        <g key={y}>
          {[span.left - ABUTMENT_WIDTH, span.right].map((x) => (
            <rect key={x} x={x} y={y} width={ABUTMENT_WIDTH} height={room + 8} fill={TICK_COLOR} />
          ))}
          <line
            x1={span.left}
            x2={span.right}
            y1={y}
            y2={y}
            stroke={TICK_COLOR}
            strokeDasharray="4 4"
          />
          {title ? (
            <MathText
              source={title}
              x={TITLE_X}
              y={y - room - 4}
              fontSize={LABEL_SIZE}
              fill={TEXT_COLOR}
            />
          ) : null}
        </g>
      ))}
      {active.mode === 'tropa' ? <TroopScaleBar geometry={geometries[0]} /> : null}
    </g>
  );
}

/** A vertical bar of 25 cm on the troop's ± 0,5 m scale. */
function TroopScaleBar({ geometry }: { geometry: DeckGeometry }) {
  const length = (SCALE_BAR_M / TROOP_DRAWING_FULL_M) * geometry.room;
  return (
    <g data-testid="scale-bar">
      <line
        x1={SCALE_BAR_X}
        x2={SCALE_BAR_X}
        y1={geometry.y}
        y2={geometry.y - length}
        stroke={TEXT_COLOR}
        strokeWidth={2}
      />
      <text
        x={SCALE_BAR_X + 4}
        y={geometry.y - length - 4}
        fontFamily={TICK_FONT_FAMILY}
        fontSize={TICK_FONT_SIZE}
        fill={TEXT_COLOR}
      >
        {formatNumber(SCALE_BAR_M * CM_PER_M, { precision: 0, unit: 'cm' })}
      </text>
    </g>
  );
}
