import { useState, type JSX } from 'react';
import { formatNumber } from '../../../lib/format';
import { mathAriaLabel } from '../../../lib/inlineMath';
import { mathTextToString } from '../../../lib/mathNotation';
import InlineMath from '../../lab/InlineMath';
import { unitTex } from './flybyFormat';
import { withStableCallbacks } from '../../lab/withStableCallbacks';
import { RP_RANGE, rpToSlider, sliderToRp } from './flybyScene';

export interface RpFieldProps {
  /** r_p in planet radii. */
  rp: number;
  /** «R_J», «R_N»…: the planet radius as a unit. */
  unit: string;
  radiusKm: number;
  /** A requested r_p (planet radii), possibly out of range: the laboratory clamps and warns. */
  onChange(rp: number): void;
}

const ID = 'flyby-rp';
/** The range runs over the log bar in this many steps (0,2 % of the bar each). */
const RANGE_STEPS = 1000;
const RP_DECIMALS = 2;
const LABEL = 'Máxima aproximación $r_p$';
/** Both inputs are named in words: «Máxima aproximación r sub p». */
const SPOKEN_LABEL = mathAriaLabel(LABEL);

/** "10,09" as typed back: decimal comma, no grouping, no trailing zeros. */
const toFieldText = (rp: number) => String(Number(rp.toFixed(RP_DECIMALS))).replace('.', ',');

/** Accepts a decimal comma or point and spaces; undefined when it is not a number. */
function parseFieldText(text: string): number | undefined {
  const normalized = text.replace(/\s/g, '').replace(',', '.');
  if (normalized === '') return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** "10,09 R_J (721 375 km)": r_p in planet radii and in km from the centre. */
export function rpText(rp: number, unit: string, radiusKm: number): string {
  const km = formatNumber(rp * radiusKm, { precision: 0, unit: 'km' });
  return `${formatNumber(rp, { precision: RP_DECIMALS, unit })} (${km})`;
}

/**
 * r_p as a range over the logarithmic bar (1 to 100 planet radii; its middle is 10) and a number
 * field in planet radii that commits on blur or Enter. Out-of-range values go to the laboratory,
 * which clamps them and says why.
 */
function RpField({ rp, unit, radiusKm, onChange }: RpFieldProps): JSX.Element {
  const [draft, setDraft] = useState<string | null>(null);
  const labelId = `${ID}-label`;
  const unitId = `${ID}-unit`;

  const commitDraft = () => {
    if (draft === null) return;
    setDraft(null);
    const parsed = parseFieldText(draft);
    if (parsed !== undefined) onChange(parsed);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <label id={labelId} htmlFor={ID} className="text-sm font-medium">
          <InlineMath text={LABEL} />
        </label>
        <span className="flex items-center gap-1.5">
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            aria-label={SPOKEN_LABEL}
            aria-describedby={unitId}
            value={draft ?? toFieldText(rp)}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commitDraft}
            onKeyDown={(event) => {
              if (event.key === 'Enter') commitDraft();
            }}
            className="h-9 w-24 rounded-base border border-border bg-bg px-2 text-right font-mono text-sm tabular-nums text-fg"
          />
          <span id={unitId} className="font-mono text-sm text-fg-muted">
            <InlineMath text={unitTex(unit)} />
          </span>
        </span>
      </div>
      <input
        id={ID}
        type="range"
        min={0}
        max={RANGE_STEPS}
        step={1}
        value={Math.round(rpToSlider(rp) * RANGE_STEPS)}
        aria-label={SPOKEN_LABEL}
        aria-valuetext={mathTextToString(rpText(rp, unit, radiusKm))}
        onChange={(event) => onChange(sliderToRp(Number(event.target.value) / RANGE_STEPS))}
        className="h-6 w-full cursor-pointer accent-accent"
      />
      <span className="font-mono text-xs tabular-nums text-fg-muted">
        <InlineMath text={`${RP_RANGE.min}–${RP_RANGE.max} ${unitTex(unit)}, escala logarítmica`} />
      </span>
    </div>
  );
}

/** Memoized with stable callbacks: a playing lab's 10 Hz renders never reach its inputs. */
export default withStableCallbacks(RpField);
