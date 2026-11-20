/**
 * The resonance laboratory's canvas: a footbridge span (two decks in «Filtro ZV») drawn in its
 * first mode, sin(π s), its deflection as a share of the drawing's room (bridgeFrames.ts), the
 * envelope's band, and what drives it: the shaker of the sweep, the soldiers, the ZV pushes
 * (BridgeLayers.tsx). Under it, the frequency ruler with the f0 knob. Vertical deflections are
 * exaggerated; only the troop's are on a stated scale (± 0,5 m).
 */
import type { JSX } from 'react';
import { mathTextToString } from '../../../lib/mathNotation';
import { TEXT_COLOR } from '../../charts/chartTheme';
import { useElementWidth } from '../../hooks/useElementWidth';
import { CANVAS_INSET } from '../../lab/canvasInset';
import type { FrameStore } from '../../lab/frameStore';
import MathText from '../../lab/MathText';
import { LABEL_SIZE } from '../../lab/OverlayMarks';
import { MovingLayer, StaticLayer } from './BridgeLayers';
import type { ActiveModel } from './bridgeFrames';
import { rulerOf } from './bridgeRuler';
import FrequencyRuler from './FrequencyRuler';
import type { Limit } from './resonancePresets';
import { REFERENCE_COLOR } from './resonancePlots';
import { describeScene } from './sceneText';

export interface BridgeSceneProps {
  active: ActiveModel;
  /** The live clock: the moving layer follows it every frame. */
  frame: FrameStore;
  /** The settled time (s), for the description. */
  t: number;
  showEnvelope: boolean;
  f0: number;
  f0Limits: Limit;
  decimals: number;
  onF0Change(f0: number): void;
}

/** The server's width before the canvas is measured; the height does not follow the width. */
const FALLBACK_WIDTH = 720;
export const SCENE_HEIGHT = 296;
const SPAN_MARGIN = 48;
const RULER_MARGIN = 32;
const AXIS_Y = 240;
const TITLE_Y = 20;
const TITLE_X = 8;
const HALO = { color: 'var(--bg-elevated)', width: 4 } as const;

/** «$N$ = 60, al paso» over the troop's bridge. */
function TroopTitle({ active }: { active: ActiveModel }): JSX.Element | null {
  if (active.mode !== 'tropa') return null;
  const how = active.step === 'al-paso' ? 'al paso' : 'rompiendo el paso';
  return (
    <MathText
      source={`$N$ = ${active.troop.settings.n}, ${how}`}
      x={TITLE_X}
      y={TITLE_Y}
      fontSize={LABEL_SIZE}
      fill={TEXT_COLOR}
      halo={HALO}
    />
  );
}

export default function BridgeScene(props: BridgeSceneProps): JSX.Element {
  const { active, frame, showEnvelope } = props;
  const [wrapperRef, width] = useElementWidth<HTMLDivElement>(FALLBACK_WIDTH);
  const span = { left: SPAN_MARGIN, right: width - SPAN_MARGIN };
  const ruler = rulerOf(active);
  const live =
    active.mode === 'barrido'
      ? {
          frame,
          at: active.sweep.driveHzAt,
          label: '$f_d$',
          color: REFERENCE_COLOR,
        }
      : undefined;
  return (
    <div ref={wrapperRef} className={`w-full ${CANVAS_INSET}`}>
      <svg
        data-testid="bridge-scene"
        data-mode={active.mode}
        viewBox={`0 0 ${width} ${SCENE_HEIGHT}`}
        width="100%"
        height={SCENE_HEIGHT}
        className="block"
      >
        <g role="img" aria-label={mathTextToString(describeScene(props))}>
          <TroopTitle active={active} />
          <StaticLayer active={active} span={span} />
          <MovingLayer active={active} frame={frame} span={span} showEnvelope={showEnvelope} />
        </g>
        <FrequencyRuler
          left={RULER_MARGIN}
          right={width - RULER_MARGIN}
          axisY={AXIS_Y}
          domain={ruler.domain}
          bands={ruler.bands}
          marks={ruler.marks}
          live={live}
          f0={props.f0}
          limits={props.f0Limits}
          decimals={props.decimals}
          onF0Change={props.onF0Change}
        />
      </svg>
    </div>
  );
}
