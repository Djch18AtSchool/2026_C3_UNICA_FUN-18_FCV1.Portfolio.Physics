// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import { resolveCssLength } from '../../../test-css-length';
import { createFrameStore } from '../../lab/frameStore';
import HabitatScene, { RESERVED_HEIGHT, sceneHeight } from './HabitatScene';
import { STRIP_STACK_BELOW } from './HabitatZoomStrip';

const NARROW_PHONE_WIDTH = 336;
const COLUMN_WIDTH = 720;
const WIDEST_COMPACT = 439;
const WIDEST_STACKED = 407;
const NARROWEST_ONE_ROW = 408;
const NARROWEST_ROOMY = 440;

describe('sceneHeight', () => {
  test('is the ring square, the bar under it, the room for the caption and the zoom strip', () => {
    // 440 (the square's side at most) + 34 (to the track) + 50 (tick labels and captions) + 48
    // (the strip: the scale bar and the buttons in one row).
    expect(sceneHeight(COLUMN_WIDTH)).toBe(572);
    expect(sceneHeight(NARROWEST_ROOMY)).toBe(572);
  });

  test('on a phone the square follows the width, the caption takes a second line and the strip two', () => {
    // The strip stacks its scale bar over the buttons (2 × 48) below 408 px.
    expect(sceneHeight(NARROW_PHONE_WIDTH)).toBe(NARROW_PHONE_WIDTH + 34 + 50 + 16 + 96);
    expect(sceneHeight(WIDEST_STACKED)).toBe(WIDEST_STACKED + 34 + 50 + 16 + 96);
  });

  test('between 408 and 440 px the caption still takes two lines but the strip is one row', () => {
    expect(sceneHeight(NARROWEST_ONE_ROW)).toBe(NARROWEST_ONE_ROW + 34 + 50 + 16 + 48);
    expect(sceneHeight(WIDEST_COMPACT)).toBe(WIDEST_COMPACT + 34 + 50 + 16 + 48);
  });
});

describe('RESERVED_HEIGHT', () => {
  test.each([
    NARROW_PHONE_WIDTH,
    360,
    WIDEST_STACKED,
    NARROWEST_ONE_ROW,
    WIDEST_COMPACT,
    NARROWEST_ROOMY,
    600,
    COLUMN_WIDTH,
  ])('is sceneHeight in CSS: a %i px container reserves the drawing’s height', (width) => {
    expect(resolveCssLength(RESERVED_HEIGHT, { container: width })).toBeCloseTo(
      sceneHeight(width),
      2,
    );
  });
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
        refit={0}
        onRadiusChange={() => undefined}
      />,
    );

    const outer = container.firstElementChild as HTMLElement;
    const wrapper = outer.firstElementChild as HTMLElement;
    expect(outer.className).toContain('@container');
    expect(wrapper.getAttribute('style') ?? '').toContain('height');
    expect(screen.getByTestId('habitat-scene').getAttribute('class')).toContain('h-full');
  });

  test('its zoom strip goes to one row exactly where the reserved height says so', () => {
    const { container } = render(
      <HabitatScene
        r={894.6}
        rpm={1}
        omega={0.1047}
        frame={createFrameStore()}
        gRatio={1}
        showVectors
        decimals={2}
        refit={0}
        onRadiusChange={() => undefined}
      />,
    );

    // Tailwind reads the breakpoint as a literal class: it must be the width the CSS reserve uses.
    const strip = container.querySelector('[data-zoom-strip]');
    expect(strip?.className).toContain(`@min-[${STRIP_STACK_BELOW}px]:flex-row`);
    expect(RESERVED_HEIGHT).toContain(`${STRIP_STACK_BELOW}px`);
  });
});
