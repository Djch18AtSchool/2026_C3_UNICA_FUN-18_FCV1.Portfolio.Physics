// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import { resolveCssLength } from '../../../test-css-length';
import { createFrameStore } from '../../lab/frameStore';
import HabitatScene, { RESERVED_HEIGHT, sceneHeight } from './HabitatScene';

const NARROW_PHONE_WIDTH = 336;
const COLUMN_WIDTH = 720;
const WIDEST_COMPACT = 439;
const NARROWEST_ROOMY = 440;

describe('sceneHeight', () => {
  test('is the ring square, the bar under it and the room for the caption', () => {
    // 440 (the square's side at most) + 34 (to the track) + 50 (tick labels and captions).
    expect(sceneHeight(COLUMN_WIDTH)).toBe(524);
    expect(sceneHeight(NARROWEST_ROOMY)).toBe(524);
  });

  test('on a phone the square follows the width and the caption takes a second line', () => {
    expect(sceneHeight(NARROW_PHONE_WIDTH)).toBe(NARROW_PHONE_WIDTH + 34 + 50 + 16);
    expect(sceneHeight(WIDEST_COMPACT)).toBe(WIDEST_COMPACT + 34 + 50 + 16);
  });
});

describe('RESERVED_HEIGHT', () => {
  test.each([NARROW_PHONE_WIDTH, 360, WIDEST_COMPACT, NARROWEST_ROOMY, 600, COLUMN_WIDTH])(
    'is sceneHeight in CSS: a %i px container reserves the drawing’s height',
    (width) => {
      expect(resolveCssLength(RESERVED_HEIGHT, { container: width })).toBeCloseTo(
        sceneHeight(width),
        2,
      );
    },
  );
});

describe('HabitatScene', () => {
  afterEach(cleanup);

  test('reserves its height in a container of its own and fills it with the drawing', () => {
    const { container } = render(
      <HabitatScene
        r={894.6}
        rpm={1}
        omega={0.1047}
        frame={createFrameStore()}
        gRatio={1}
        showVectors
        decimals={2}
        onRadiusChange={() => undefined}
      />,
    );

    const outer = container.firstElementChild as HTMLElement;
    const wrapper = outer.firstElementChild as HTMLElement;
    expect(outer.className).toContain('@container');
    expect(wrapper.getAttribute('style') ?? '').toContain('height');
    expect(wrapper.querySelector('svg')?.getAttribute('class')).toContain('h-full');
  });
});
