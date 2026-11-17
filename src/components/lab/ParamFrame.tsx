/**
 * The compact control of one parameter (Dylan 2026-11-16, pattern P3 of mocks2): its full label
 * small and alone on top, then the slider and the number with its unit on one line. The limits
 * are not printed: the slider and the number say them (`aria-describedby`) and the number shows
 * them as a tooltip. ParamField and Tema 9's RpField share it, so every lab's fields line up.
 */
import type { JSX, ReactNode } from 'react';

/** The slider takes what the number and its unit leave. */
export const PARAM_RANGE = 'h-6 min-w-0 flex-1 cursor-pointer accent-accent';
/**
 * The number box: 40 × 64 px, its longest text («100,01», six characters) fits with px-1;
 * lab-controls.spec.ts measures it in every lab.
 */
export const PARAM_NUMBER =
  'h-10 w-16 rounded-base border border-border bg-bg px-1 text-right text-sm tabular-nums text-fg';

export interface ParamFrameProps {
  /** The range's id: the label names it. */
  id: string;
  labelId: string;
  /** The label as shown (KaTeX already typeset). */
  label: ReactNode;
  /** The <input type="range">, with PARAM_RANGE. */
  range: ReactNode;
  /** The number <input>, with PARAM_NUMBER. */
  number: ReactNode;
  /** The unit box after the number (UNIT_BOX). */
  unit: ReactNode;
  hintId: string;
  /** The limits in words («de 1,00 a 30,00»): what both inputs are described by. */
  hint: ReactNode;
}

export default function ParamFrame({
  id,
  labelId,
  label,
  range,
  number,
  unit,
  hintId,
  hint,
}: ParamFrameProps): JSX.Element {
  return (
    <div data-param-field="" className="flex min-w-0 flex-col gap-(--lab-flow-tight)">
      <label id={labelId} htmlFor={id} className="text-sm font-medium text-balance">
        {label}
      </label>
      <div className="flex items-center gap-3">
        {range}
        <span className="flex shrink-0 items-center gap-2">
          {number}
          {unit}
        </span>
      </div>
      <span id={hintId} className="sr-only">
        {hint}
      </span>
    </div>
  );
}
