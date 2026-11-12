// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import { createFrameStore } from '../../lab/frameStore';
import type { BalanceAt } from './regenScene';
import RoadStrip, { CAR_HALF_LENGTH, type RoadRange } from './RoadStrip';

const X0 = 16;
const X1 = 416;
const ROAD_Y = 30;
const RANGE: RoadRange = { from: 1000, to: 1300, tickEvery: 50, note: '', line: 1240 };

/** A car standing at `distance` (m of the cycle). */
const standing = (distance: number): BalanceAt => ({
  t: 0,
  v: 0,
  distance,
  pWheel: 0,
  pBrake: 0,
  pRegen: 0,
  pFriction: 0,
  pBattery: 0,
  eTraction: 0,
  eRoadLoad: 0,
  eBrake: 0,
  eBattery: 0,
  eFriction: 0,
  eConversionLoss: 0,
  recoveredShare: 0,
});

function renderRoad(own: number, ghost: number) {
  const frame = createFrameStore(0);
  render(
    <svg>
      <RoadStrip
        range={RANGE}
        x0={X0}
        x1={X1}
        y={ROAD_Y}
        live={{ frame, atTime: () => standing(own) }}
        ghost={{ frame, atTime: () => standing(ghost) }}
      />
    </svg>,
  );
}

const lineX = () => Number(screen.getByTestId('regen-stop-line').getAttribute('x1'));
const carX = () => Number(screen.getByTestId('regen-car').getAttribute('data-x'));
const ghostX = () =>
  Number(
    /translate\(([-\d.]+)/.exec(
      screen.getByTestId('regen-ghost').getAttribute('transform') ?? '',
    )?.[1],
  );

describe('RoadStrip in «Conducir»: the stop line and the cars on one scale', () => {
  afterEach(cleanup);

  test('a car standing on the line is drawn centred on it (review D3, M5)', () => {
    renderRoad(RANGE.line ?? 0, RANGE.line ?? 0);

    expect(carX()).toBeCloseTo(lineX(), 6);
    expect(ghostX()).toBeCloseTo(lineX(), 1);
  });

  test('the line keeps the cars’ inset: the road’s ends map to the car’s first and last centre', () => {
    renderRoad(RANGE.from, RANGE.to);

    expect(carX()).toBeCloseTo(X0 + CAR_HALF_LENGTH, 6);
    expect(ghostX()).toBeCloseTo(X1 - CAR_HALF_LENGTH, 1);
  });
});
