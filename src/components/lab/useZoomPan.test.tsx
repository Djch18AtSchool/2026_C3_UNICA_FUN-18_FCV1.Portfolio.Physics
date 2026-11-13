// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { resetSettingsForTests, setSettings } from '../../lib/settingsStore';
import {
  useZoomPan,
  ZOOM_PAN_STEP_PX,
  ZOOM_TRANSITION_MS,
  type ZoomPan,
  type ZoomPanOptions,
} from './useZoomPan';
import { DEFAULT_ZOOM_LIMITS, IDENTITY_VIEW, ZOOM_STEP } from './zoomMath';

const WIDTH = 400;
const HEIGHT = 300;
/** Past the drag threshold, so a background drag pans. */
const DRAG_PX = 40;

let latest: ZoomPan;

function Canvas({ options = {} }: { options?: Partial<ZoomPanOptions> }) {
  const zoom = useZoomPan({ label: 'Mapa de prueba', ...options });
  latest = zoom;
  return (
    <div data-testid="viewport" {...zoom.viewportProps}>
      <svg>
        <circle data-testid="handle" tabIndex={0} r={4} />
        <rect data-testid="background" width={WIDTH} height={HEIGHT} />
      </svg>
      <button type="button" data-testid="inner-button">
        botón
      </button>
      <p id={zoom.instructionsId}>instrucciones</p>
    </div>
  );
}

/** A ResizeObserver that reports the viewport at WIDTH × HEIGHT as soon as it observes. */
class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  disconnected = false;
  constructor(private readonly callback: ResizeObserverCallback) {
    FakeResizeObserver.instances.push(this);
  }
  observe() {
    this.report(WIDTH, HEIGHT);
  }
  report(width: number, height: number) {
    this.callback(
      [{ contentRect: { width, height } } as ResizeObserverEntry],
      this as unknown as ResizeObserver,
    );
  }
  disconnect() {
    this.disconnected = true;
  }
  unobserve() {}
}

function renderCanvas(options: Partial<ZoomPanOptions> = {}) {
  const result = render(<Canvas options={options} />);
  const viewport = result.getByTestId('viewport');
  viewport.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: WIDTH, height: HEIGHT, right: WIDTH, bottom: HEIGHT }) as DOMRect;
  return { ...result, viewport };
}

const key = (target: Element, name: string, init: KeyboardEventInit = {}) =>
  fireEvent.keyDown(target, { key: name, ...init });

/** A wheel event the hook sees through its native, non-passive listener. */
function wheel(target: Element, init: WheelEventInit): WheelEvent {
  const event = new WheelEvent('wheel', { bubbles: true, cancelable: true, ...init });
  act(() => {
    target.dispatchEvent(event);
  });
  return event;
}

function drag(target: Element, from: { x: number; y: number }, by: { x: number; y: number }) {
  fireEvent.pointerDown(target, { pointerId: 1, button: 0, clientX: from.x, clientY: from.y });
  fireEvent.pointerMove(target, { pointerId: 1, clientX: from.x + by.x, clientY: from.y + by.y });
  fireEvent.pointerUp(target, { pointerId: 1, clientX: from.x + by.x, clientY: from.y + by.y });
}

describe('useZoomPan', () => {
  beforeEach(() => {
    FakeResizeObserver.instances = [];
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    setSettings({ motion: 'reduced' });
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    localStorage.clear();
    resetSettingsForTests();
  });

  describe('on the server and at mount', () => {
    test('starts at the identity view: what the server paints, untransformed', () => {
      renderCanvas();

      expect(latest.view).toEqual(IDENTITY_VIEW);
      expect(latest.transform).toBe('translate(0 0) scale(1)');
    });

    test('the server sends a focusable, named region whose zoom-out, fit and 1:1 do nothing yet', () => {
      const html = renderToString(<Canvas />);

      expect(html).toContain('tabindex="0"');
      expect(html).toContain('role="group"');
      expect(html).toContain('aria-roledescription="lienzo con zoom"');
      expect(html).toContain('aria-label="Mapa de prueba"');
      expect(html).toContain('touch-action:pan-y');
      expect(latest.canZoomIn).toBe(true);
      expect(latest.canZoomOut).toBe(false);
      expect(latest.canFit).toBe(false);
      expect(latest.canActualSize).toBe(false);
    });

    test('names its instructions and keys for assistive technology', () => {
      const { viewport } = renderCanvas();

      expect(viewport).toHaveAttribute('aria-describedby', latest.instructionsId);
      // ARIA spells the plus key «Plus»: a bare «+» is its separator of modifiers.
      expect(viewport).toHaveAttribute(
        'aria-keyshortcuts',
        'Plus - 0 ArrowUp ArrowDown ArrowLeft ArrowRight',
      );
    });

    test('rejects limits out of order, with the fix', () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined);

      expect(() => renderCanvas({ minScale: 4, maxScale: 2 })).toThrow(/useZoomPan/u);
    });
  });

  describe('buttons (actions)', () => {
    test('zoomIn multiplies the scale by one step about the centre', () => {
      renderCanvas();

      act(() => latest.zoomIn());

      expect(latest.view.scale).toBeCloseTo(ZOOM_STEP, 12);
      expect(latest.toScreen(latest.toWorld({ x: 200, y: 150 }))).toEqual({ x: 200, y: 150 });
      expect(latest.toWorld({ x: 200, y: 150 }).x).toBeCloseTo(200, 9);
      expect(latest.canZoomOut).toBe(true);
      expect(latest.canFit).toBe(true);
      expect(latest.canActualSize).toBe(true);
    });

    test('with an anchor (R33), the buttons and the keys zoom about it, not about the centre', () => {
      const anchor = { x: 60, y: 240 };
      const { viewport } = renderCanvas({ anchor: () => anchor });

      act(() => latest.zoomIn());
      expect(latest.toScreen(anchor).x).toBeCloseTo(60, 9);
      expect(latest.toScreen(anchor).y).toBeCloseTo(240, 9);
      act(() => latest.zoomIn());
      key(viewport, '+');
      expect(latest.view.scale).toBeCloseTo(ZOOM_STEP ** 3, 9);
      expect(latest.toScreen(anchor).x).toBeCloseTo(60, 9);
      key(viewport, '-');
      act(() => latest.zoomOut());
      expect(latest.toScreen(anchor).y).toBeCloseTo(240, 9);
    });

    test('an anchor the reader panned out of view gives the centre back to the buttons', () => {
      const anchor = { x: 20, y: 20 };
      renderCanvas({ anchor: () => anchor });
      act(() => {
        for (let i = 0; i < 4; i += 1) latest.zoomIn();
      });
      act(() => latest.panBy({ x: -600, y: -400 }));
      expect(latest.toScreen(anchor).x).toBeLessThan(0);
      const centre = latest.toWorld({ x: 200, y: 150 });

      act(() => latest.zoomOut());

      expect(latest.toScreen(centre).x).toBeCloseTo(200, 9);
      expect(latest.toScreen(centre).y).toBeCloseTo(150, 9);
    });

    test('the anchor is read when the button is pressed: a lab whose point moves gives the new one', () => {
      let anchor = { x: 100, y: 100 };
      renderCanvas({ anchor: () => anchor });
      anchor = { x: 300, y: 200 };

      act(() => latest.zoomIn());

      expect(latest.toScreen(anchor).x).toBeCloseTo(300, 9);
      expect(latest.toScreen(anchor).y).toBeCloseTo(200, 9);
    });

    test('zoomIn stops at the maximum and says so', () => {
      renderCanvas();

      act(() => {
        for (let i = 0; i < 12; i += 1) latest.zoomIn();
      });

      expect(latest.view.scale).toBe(DEFAULT_ZOOM_LIMITS.maxScale);
      expect(latest.canZoomIn).toBe(false);
    });

    test('zoomOut at the minimum leaves the view alone', () => {
      renderCanvas();

      act(() => latest.zoomOut());

      expect(latest.view).toEqual(IDENTITY_VIEW);
    });

    test('without a fit or bounds of its own, «1:1» would repeat «Ajustar»: the hook says so', () => {
      renderCanvas();
      act(() => latest.zoomIn());
      expect(latest.hasActualSize).toBe(false);

      act(() => latest.fit());
      expect(latest.view).toEqual(IDENTITY_VIEW);
    });

    test('with a drawing larger than the canvas, «Ajustar» frames it and «1:1» keeps the centre', () => {
      const whole = { x: 0, y: 0, width: 800, height: 600 };
      renderCanvas({ bounds: whole, fit: whole, minScale: 0.5 });
      expect(latest.hasActualSize).toBe(true);
      act(() => latest.zoomIn());
      act(() => latest.zoomIn());
      act(() => latest.panBy({ x: -100, y: -40 }));
      const centre = latest.toWorld({ x: 200, y: 150 });

      act(() => latest.actualSize());
      expect(latest.view.scale).toBe(1);
      expect(latest.toScreen(centre).x).toBeCloseTo(200, 9);
      expect(latest.toScreen(centre).y).toBeCloseTo(150, 9);

      act(() => latest.fit());
      expect(latest.view).toEqual({ scale: 0.5, x: 0, y: 0 });
    });

    test('fit frames the box the lab gives', () => {
      renderCanvas({ fit: { x: 100, y: 75, width: 200, height: 150 } });

      act(() => latest.fit());

      expect(latest.view).toEqual({ scale: 2, x: -200, y: -150 });
    });
  });

  describe('keyboard on the focused canvas', () => {
    test('+ and − zoom, 0 fits, and the arrows pan', () => {
      const { viewport } = renderCanvas();

      key(viewport, '+');
      expect(latest.view.scale).toBeCloseTo(ZOOM_STEP, 12);
      key(viewport, '+');
      key(viewport, '-');
      expect(latest.view.scale).toBeCloseTo(ZOOM_STEP, 12);
      key(viewport, 'ArrowLeft');
      key(viewport, 'ArrowUp');
      const panned = latest.view;
      key(viewport, 'ArrowRight');
      key(viewport, 'ArrowDown');
      expect(panned.x - latest.view.x).toBeCloseTo(ZOOM_PAN_STEP_PX, 9);
      expect(panned.y - latest.view.y).toBeCloseTo(ZOOM_PAN_STEP_PX, 9);
      key(viewport, '0');
      expect(latest.view).toEqual(IDENTITY_VIEW);
    });

    test('also takes «=», the numeric pad and the typographic minus', () => {
      const { viewport } = renderCanvas();

      key(viewport, '=');
      key(viewport, '−');
      expect(latest.view).toEqual(IDENTITY_VIEW);
      key(viewport, 'Add');
      expect(latest.view.scale).toBeCloseTo(ZOOM_STEP, 12);
      key(viewport, 'Subtract');
      expect(latest.view.scale).toBeCloseTo(1, 12);
    });

    test('takes the key from the browser only when it does something', () => {
      const { viewport } = renderCanvas();

      // At ×1 there is nothing to pan: the arrow scrolls the page as usual.
      expect(key(viewport, 'ArrowDown')).toBe(true);
      expect(key(viewport, '+')).toBe(false);
      expect(key(viewport, 'ArrowDown')).toBe(false);
    });

    test('leaves keys alone on a handle inside the canvas and with Ctrl, Alt or Meta', () => {
      const { viewport, getByTestId } = renderCanvas();

      key(getByTestId('handle'), '+');
      key(viewport, '+', { ctrlKey: true });
      key(viewport, '+', { altKey: true });
      key(viewport, '+', { metaKey: true });

      expect(latest.view).toEqual(IDENTITY_VIEW);
    });
  });

  describe('wheel', () => {
    test('with Ctrl it zooms about the pointer and keeps the page from zooming', () => {
      const { viewport } = renderCanvas();

      const event = wheel(viewport, { deltaY: -100, ctrlKey: true, clientX: 100, clientY: 50 });

      expect(event.defaultPrevented).toBe(true);
      expect(latest.view.scale).toBeGreaterThan(1);
      const under = latest.toScreen({ x: 100, y: 50 });
      expect(under.x).toBeCloseTo(100, 9);
      expect(under.y).toBeCloseTo(50, 9);
    });

    test('without Ctrl on an unfocused canvas the page scrolls', () => {
      const { viewport } = renderCanvas();

      const event = wheel(viewport, { deltaY: -100, clientX: 100, clientY: 50 });

      expect(event.defaultPrevented).toBe(false);
      expect(latest.view).toEqual(IDENTITY_VIEW);
    });

    /** Focus as the browser shows it: from the keyboard (:focus-visible) or from a click (not). */
    const focusFrom = (viewport: HTMLElement, from: 'keyboard' | 'click') => {
      viewport.focus();
      const matches = viewport.matches.bind(viewport);
      vi.spyOn(viewport, 'matches').mockImplementation((selector) =>
        selector === ':focus-visible' ? from === 'keyboard' : matches(selector),
      );
    };

    test('alone on the canvas focused from the keyboard it zooms', () => {
      const { viewport } = renderCanvas();
      focusFrom(viewport, 'keyboard');

      const event = wheel(viewport, { deltaY: -100, clientX: 200, clientY: 150 });

      expect(event.defaultPrevented).toBe(true);
      expect(latest.view.scale).toBeGreaterThan(1);
    });

    test('alone on a canvas a click focused (focus not shown) the page scrolls', () => {
      const { viewport } = renderCanvas();
      focusFrom(viewport, 'click');

      const event = wheel(viewport, { deltaY: -100, clientX: 200, clientY: 150 });

      expect(event.defaultPrevented).toBe(false);
      expect(latest.view).toEqual(IDENTITY_VIEW);
    });

    test('alone at a limit it lets the page scroll; with Ctrl it still keeps the page from zooming', () => {
      const { viewport } = renderCanvas();
      focusFrom(viewport, 'keyboard');

      expect(wheel(viewport, { deltaY: 100 }).defaultPrevented).toBe(false);
      expect(wheel(viewport, { deltaY: 100, ctrlKey: true }).defaultPrevented).toBe(true);
      expect(latest.view).toEqual(IDENTITY_VIEW);
    });

    test('reads lines as 16 px', () => {
      const { viewport } = renderCanvas();

      wheel(viewport, { deltaY: -6.25, deltaMode: 1, ctrlKey: true });

      expect(latest.view.scale).toBeCloseTo(ZOOM_STEP, 9);
    });

    test('its listener goes away with the canvas', () => {
      const { viewport, unmount } = renderCanvas();
      const remove = vi.spyOn(viewport, 'removeEventListener');

      unmount();

      expect(remove).toHaveBeenCalledWith('wheel', expect.any(Function));
      expect(FakeResizeObserver.instances.every((observer) => observer.disconnected)).toBe(true);
    });
  });

  describe('dragging the background', () => {
    test('pans the zoomed drawing once past the threshold', () => {
      const { viewport, getByTestId } = renderCanvas();
      act(() => latest.zoomIn());
      act(() => latest.zoomIn());
      const before = latest.view;

      drag(getByTestId('background'), { x: 200, y: 150 }, { x: -DRAG_PX, y: -DRAG_PX });

      expect(latest.view.x).toBeCloseTo(before.x - DRAG_PX, 9);
      expect(latest.view.y).toBeCloseTo(before.y - DRAG_PX, 9);
      expect(viewport.dataset.zoomPanning).toBeUndefined();
    });

    test('a short move is a click, not a pan, and the click goes through', () => {
      const { getByTestId } = renderCanvas();
      act(() => latest.zoomIn());
      const before = latest.view;
      const onClick = vi.fn();
      getByTestId('background').addEventListener('click', onClick);

      drag(getByTestId('background'), { x: 200, y: 150 }, { x: 2, y: 2 });
      fireEvent.click(getByTestId('background'));

      expect(latest.view).toEqual(before);
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    test('the click that ends a pan does not reach the drawing', () => {
      const { getByTestId } = renderCanvas();
      act(() => latest.zoomIn());
      const onClick = vi.fn();
      getByTestId('background').addEventListener('click', onClick);

      drag(getByTestId('background'), { x: 200, y: 150 }, { x: DRAG_PX, y: 0 });
      fireEvent.click(getByTestId('background'));
      fireEvent.pointerDown(getByTestId('background'), { pointerId: 2, button: 0 });
      fireEvent.click(getByTestId('background'));

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    test('marks the canvas while it pans, for the grabbing cursor', () => {
      const { viewport, getByTestId } = renderCanvas();
      act(() => latest.zoomIn());
      expect(viewport.style.cursor).toBe('grab');
      expect(viewport.style.touchAction).toBe('none');

      fireEvent.pointerDown(getByTestId('background'), { pointerId: 1, button: 0, clientX: 9 });
      fireEvent.pointerMove(getByTestId('background'), { pointerId: 1, clientX: 9 + DRAG_PX });

      expect(viewport).toHaveAttribute('data-zoom-panning');
      expect(viewport.style.cursor).toBe('grabbing');
      fireEvent.pointerCancel(getByTestId('background'), { pointerId: 1 });
      expect(viewport).not.toHaveAttribute('data-zoom-panning');
    });

    test('never steals a handle’s drag, a button’s press or a drag already taken', () => {
      const { getByTestId } = renderCanvas();
      act(() => latest.zoomIn());
      const before = latest.view;
      getByTestId('background').addEventListener('pointerdown', (event) => event.preventDefault());

      drag(getByTestId('handle'), { x: 200, y: 150 }, { x: DRAG_PX, y: 0 });
      drag(getByTestId('inner-button'), { x: 200, y: 150 }, { x: DRAG_PX, y: 0 });
      drag(getByTestId('background'), { x: 200, y: 150 }, { x: DRAG_PX, y: 0 });

      expect(latest.view).toEqual(before);
    });

    test('ignores the right mouse button', () => {
      const { getByTestId } = renderCanvas();
      act(() => latest.zoomIn());
      const before = latest.view;

      fireEvent.pointerDown(getByTestId('background'), {
        pointerId: 1,
        button: 2,
        pointerType: 'mouse',
      });
      fireEvent.pointerMove(getByTestId('background'), { pointerId: 1, clientX: DRAG_PX });

      expect(latest.view).toEqual(before);
    });

    test('a mouse that comes back with no button pressed (released outside) ends the drag', () => {
      const { viewport, getByTestId } = renderCanvas();
      act(() => latest.zoomIn());
      const before = latest.view;
      const target = getByTestId('background');
      const mouse = { pointerId: 1, pointerType: 'mouse' };

      fireEvent.pointerDown(target, { ...mouse, button: 0, buttons: 1, clientX: 200, clientY: 5 });
      fireEvent.pointerMove(target, { ...mouse, buttons: 1, clientX: 200, clientY: 3 });
      // The button went up outside the canvas, before any capture: no pointerup here.
      fireEvent.pointerMove(target, { ...mouse, buttons: 0, clientX: 200, clientY: 100 });
      fireEvent.pointerMove(target, { ...mouse, buttons: 0, clientX: 260, clientY: 140 });

      expect(latest.view).toEqual(before);
      expect(viewport).not.toHaveAttribute('data-zoom-panning');
    });

    test('a pan whose button is found up stops where it was', () => {
      const { viewport, getByTestId } = renderCanvas();
      act(() => latest.zoomIn());
      const target = getByTestId('background');
      const mouse = { pointerId: 1, pointerType: 'mouse' };
      fireEvent.pointerDown(target, {
        ...mouse,
        button: 0,
        buttons: 1,
        clientX: 200,
        clientY: 150,
      });
      fireEvent.pointerMove(target, { ...mouse, buttons: 1, clientX: 200 + DRAG_PX, clientY: 150 });
      const panned = latest.view;

      fireEvent.pointerMove(target, { ...mouse, buttons: 0, clientX: 300, clientY: 200 });

      expect(latest.view).toEqual(panned);
      expect(viewport).not.toHaveAttribute('data-zoom-panning');
    });

    test('a lost capture with no pointerup ends the pan, and later moves do nothing', () => {
      const { viewport, getByTestId } = renderCanvas();
      act(() => latest.zoomIn());
      const target = getByTestId('background');
      fireEvent.pointerDown(target, { pointerId: 1, button: 0, clientX: 200, clientY: 150 });
      fireEvent.pointerMove(target, { pointerId: 1, clientX: 200 + DRAG_PX, clientY: 150 });
      const panned = latest.view;

      fireEvent.lostPointerCapture(viewport, { pointerId: 1 });
      fireEvent.pointerMove(target, { pointerId: 1, clientX: 300, clientY: 150 });

      expect(latest.view).toEqual(panned);
      expect(viewport).not.toHaveAttribute('data-zoom-panning');
    });
  });

  describe('reveal', () => {
    test('zoom.reveal brings a box of the drawing into view', () => {
      renderCanvas();
      act(() => latest.zoomIn());
      act(() => latest.zoomIn());

      act(() => latest.reveal({ x: 20, y: 140, width: 10, height: 10 }));

      expect(latest.toScreen({ x: 20, y: 140 }).x).toBeCloseTo(16, 9);
    });

    test('a handle focused outside the view is brought in; the canvas itself is not moved', () => {
      const { viewport, getByTestId } = renderCanvas();
      act(() => latest.zoomIn());
      act(() => latest.zoomIn());
      const zoomed = latest.view;
      const handle = getByTestId('handle');
      handle.getBoundingClientRect = () =>
        ({ left: -100, top: 50, width: 20, height: 20, right: -80, bottom: 70 }) as DOMRect;
      // Reached with the keyboard: the browser shows the focus.
      const matches = handle.matches.bind(handle);
      vi.spyOn(handle, 'matches').mockImplementation((selector) =>
        selector === ':focus-visible' ? true : matches(selector),
      );

      act(() => viewport.focus());
      expect(latest.view).toEqual(zoomed);
      act(() => handle.focus());

      expect(latest.view.x).toBeCloseTo(zoomed.x + 116, 9);
      expect(latest.view.y).toBe(zoomed.y);
    });

    /** The handle sits outside the view at ×2, and the browser may show its focus or not. */
    function zoomedWithHandleOut(isFocusShown: boolean) {
      const rendered = renderCanvas();
      act(() => latest.zoomIn());
      act(() => latest.zoomIn());
      for (const id of ['handle', 'inner-button']) {
        const element = rendered.getByTestId(id);
        element.getBoundingClientRect = () =>
          ({ left: -100, top: 50, width: 20, height: 20, right: -80, bottom: 70 }) as DOMRect;
        const matches = element.matches.bind(element);
        vi.spyOn(element, 'matches').mockImplementation((selector) =>
          selector === ':focus-visible' ? isFocusShown : matches(selector),
        );
      }
      return { ...rendered, zoomed: latest.view };
    }

    test('a press on a handle never moves the view, even when the browser shows its focus', () => {
      // Chromium shows a script focus after any key: useDrag's focus on pointerdown looks like Tab's.
      const { getByTestId, zoomed } = zoomedWithHandleOut(true);
      const handle = getByTestId('handle');

      fireEvent.pointerDown(handle, { pointerId: 1, button: 0 });
      act(() => handle.focus());

      expect(latest.view).toEqual(zoomed);
      expect(latest.isPointerPressing()).toBe(true);
    });

    test('a tap on a button inside the canvas does not move the view (its focus comes with the mousedown after the pointerup)', () => {
      const { getByTestId, zoomed } = zoomedWithHandleOut(true);
      const button = getByTestId('inner-button');

      fireEvent.pointerDown(button, { pointerId: 1, pointerType: 'touch' });
      fireEvent.pointerUp(button, { pointerId: 1, pointerType: 'touch' });
      fireEvent.mouseDown(button);
      act(() => button.focus());
      fireEvent.mouseUp(button);

      expect(latest.view).toEqual(zoomed);
      expect(latest.isPointerPressing()).toBe(false);
    });

    test('once the press ends, even outside the canvas, a focus from the keyboard reveals again', () => {
      const { getByTestId, viewport, zoomed } = zoomedWithHandleOut(true);
      fireEvent.pointerDown(getByTestId('background'), { pointerId: 1, button: 0 });
      fireEvent.pointerUp(window, { pointerId: 1 });
      expect(latest.isPointerPressing()).toBe(false);

      act(() => viewport.focus());
      act(() => getByTestId('handle').focus());

      expect(latest.view.x).toBeCloseTo(zoomed.x + 116, 9);
    });

    test('a key ends a press whose release the page never saw', () => {
      const { getByTestId, zoomed } = zoomedWithHandleOut(true);
      fireEvent.pointerDown(getByTestId('background'), { pointerId: 1, button: 0 });

      fireEvent.keyDown(window, { key: 'Tab' });
      act(() => getByTestId('handle').focus());

      expect(latest.view.x).toBeCloseTo(zoomed.x + 116, 9);
    });

    test('a focus a script gives with no press reveals even when the browser does not show it', () => {
      // `:focus-visible` is not the test: false after a mouse click, a script's focus must still be seen.
      const { getByTestId, zoomed } = zoomedWithHandleOut(false);

      act(() => getByTestId('handle').focus());

      expect(latest.view.x).toBeCloseTo(zoomed.x + 116, 9);
    });

    test('the window listeners go away with the canvas', () => {
      const remove = vi.spyOn(window, 'removeEventListener');
      const { unmount } = renderCanvas();

      unmount();

      const removed = remove.mock.calls.map(([type]) => type);
      expect(removed).toEqual(
        expect.arrayContaining(['pointerup', 'mouseup', 'touchend', 'keydown']),
      );
    });
  });

  describe('pinch', () => {
    test('a finger cancelled mid-pinch hands over to the other, and cancelling both ends it', () => {
      const { viewport, getByTestId } = renderCanvas();
      const target = getByTestId('background');
      const touch = { pointerType: 'touch' };
      fireEvent.pointerDown(target, { ...touch, pointerId: 1, clientX: 150, clientY: 150 });
      fireEvent.pointerDown(target, { ...touch, pointerId: 2, clientX: 250, clientY: 150 });
      fireEvent.pointerMove(target, { ...touch, pointerId: 2, clientX: 350, clientY: 150 });
      fireEvent.pointerCancel(target, { ...touch, pointerId: 2 });
      const afterPinch = latest.view;

      fireEvent.pointerMove(target, { ...touch, pointerId: 1, clientX: 140, clientY: 150 });
      expect(latest.view.scale).toBe(afterPinch.scale);
      expect(latest.view.x).toBeCloseTo(afterPinch.x - 10, 9);

      fireEvent.pointerCancel(target, { ...touch, pointerId: 1 });
      const ended = latest.view;
      fireEvent.pointerMove(target, { ...touch, pointerId: 1, clientX: 100, clientY: 150 });
      expect(latest.view).toEqual(ended);
      expect(viewport).not.toHaveAttribute('data-zoom-panning');
    });

    test('two fingers spread to twice their distance double the scale about their midpoint', () => {
      const { getByTestId } = renderCanvas();
      const target = getByTestId('background');
      const touch = { pointerType: 'touch' };

      fireEvent.pointerDown(target, { ...touch, pointerId: 1, clientX: 150, clientY: 150 });
      fireEvent.pointerDown(target, { ...touch, pointerId: 2, clientX: 250, clientY: 150 });
      fireEvent.pointerMove(target, { ...touch, pointerId: 1, clientX: 100, clientY: 150 });
      fireEvent.pointerMove(target, { ...touch, pointerId: 2, clientX: 300, clientY: 150 });

      expect(latest.view.scale).toBeCloseTo(2, 9);
      expect(latest.toScreen({ x: 200, y: 150 }).x).toBeCloseTo(200, 9);
    });

    test('lifting one finger goes on panning with the other, without a jump', () => {
      const { getByTestId } = renderCanvas();
      const target = getByTestId('background');
      const touch = { pointerType: 'touch' };
      fireEvent.pointerDown(target, { ...touch, pointerId: 1, clientX: 150, clientY: 150 });
      fireEvent.pointerDown(target, { ...touch, pointerId: 2, clientX: 250, clientY: 150 });
      fireEvent.pointerMove(target, { ...touch, pointerId: 2, clientX: 350, clientY: 150 });
      fireEvent.pointerUp(target, { ...touch, pointerId: 2, clientX: 350, clientY: 150 });
      const afterPinch = latest.view;

      fireEvent.pointerMove(target, { ...touch, pointerId: 1, clientX: 140, clientY: 150 });

      expect(latest.view.scale).toBe(afterPinch.scale);
      expect(latest.view.x).toBeCloseTo(afterPinch.x - 10, 9);
    });
  });

  describe('transitions', () => {
    let frames: FrameRequestCallback[];
    let now: number;
    const runFrame = (at: number) => {
      now = at;
      const queued = frames;
      frames = [];
      act(() => queued.forEach((callback) => callback(at)));
    };

    beforeEach(() => {
      setSettings({ motion: 'auto' });
      frames = [];
      now = 0;
      vi.spyOn(performance, 'now').mockImplementation(() => now);
      vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
        frames.push(callback);
        return frames.length;
      });
      vi.stubGlobal('cancelAnimationFrame', () => {
        frames = [];
      });
    });

    test('a button zoom glides there in ZOOM_TRANSITION_MS', () => {
      renderCanvas();

      act(() => latest.zoomIn());
      runFrame(ZOOM_TRANSITION_MS / 2);
      const halfway = latest.view.scale;
      runFrame(ZOOM_TRANSITION_MS);

      expect(halfway).toBeGreaterThan(1);
      expect(halfway).toBeLessThan(ZOOM_STEP);
      expect(latest.view.scale).toBeCloseTo(ZOOM_STEP, 12);
      expect(frames).toHaveLength(0);
    });

    test('two quick presses add up: ×2 at the end', () => {
      renderCanvas();

      act(() => latest.zoomIn());
      runFrame(ZOOM_TRANSITION_MS / 4);
      act(() => latest.zoomIn());
      runFrame(ZOOM_TRANSITION_MS / 2);
      runFrame(ZOOM_TRANSITION_MS * 2);

      expect(latest.view.scale).toBeCloseTo(2, 12);
    });

    test('a drag stops a glide where it is', () => {
      const { getByTestId } = renderCanvas({ minScale: 1 });
      act(() => latest.zoomIn());
      runFrame(ZOOM_TRANSITION_MS);
      act(() => latest.zoomIn());
      runFrame(ZOOM_TRANSITION_MS * 1.5);

      fireEvent.pointerDown(getByTestId('background'), { pointerId: 1, button: 0, clientX: 0 });
      fireEvent.pointerMove(getByTestId('background'), { pointerId: 1, clientX: DRAG_PX });
      const stopped = latest.view.scale;
      runFrame(ZOOM_TRANSITION_MS * 3);

      expect(latest.view.scale).toBe(stopped);
    });

    test('with reduced motion it jumps, with no frame', () => {
      setSettings({ motion: 'reduced' });
      renderCanvas();

      act(() => latest.zoomIn());

      expect(latest.view.scale).toBeCloseTo(ZOOM_STEP, 12);
      expect(frames).toHaveLength(0);
    });
  });

  test('a wider viewport pulls the pan back inside the drawing', () => {
    renderCanvas({ bounds: { x: 0, y: 0, width: 800, height: 300 } });
    act(() => latest.zoomIn());
    for (let i = 0; i < 20; i += 1) act(() => latest.panBy({ x: -ZOOM_PAN_STEP_PX, y: 0 }));
    const leftmost = latest.view.x;

    act(() => FakeResizeObserver.instances[0].report(WIDTH * 2, HEIGHT));

    expect(latest.view.x).toBeGreaterThan(leftmost);
  });
});
