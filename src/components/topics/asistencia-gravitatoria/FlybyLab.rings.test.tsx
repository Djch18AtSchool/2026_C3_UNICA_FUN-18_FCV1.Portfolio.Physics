// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { resetSettingsForTests } from '../../../lib/settingsStore';
import { installDialogPolyfill } from '../../../test-dialog';
import { mathSourceText } from '../../../test-inline-math';
import FlybyLab from './FlybyLab';

const presetSelect = () => screen.getByRole('combobox', { name: 'Valores de referencia' });
const rings = () => [...document.querySelectorAll('[data-testid="flyby-rings"] circle')];
const planetRadius = () => Number(screen.getByTestId('flyby-planet').getAttribute('r'));
const frameName = () =>
  screen.getByRole('img', { name: /^Sobrevuelo en el marco/ }).getAttribute('aria-label') ?? '';

/** Each ring's edges in planet radii, from its stroke: the circle at the middle, as wide as the ring. */
function ringEdges(): [string, number, number][] {
  const radius = planetRadius();
  return rings().map((ring) => {
    const r = Number(ring.getAttribute('r'));
    const half = Number(ring.getAttribute('stroke-width')) / 2;
    return [
      ring.getAttribute('data-ring') ?? '',
      Number(((r - half) / radius).toFixed(3)),
      Number(((r + half) / radius).toFixed(3)),
    ];
  });
}

describe('Saturn’s rings in the planet frame', () => {
  let uninstall: () => void;
  beforeEach(() => {
    uninstall = installDialogPolyfill();
  });
  afterEach(() => {
    cleanup();
    uninstall();
    localStorage.clear();
    resetSettingsForTests();
  });

  test('only Saturn has rings: none at Jupiter, Uranus or Neptune', async () => {
    const user = userEvent.setup();
    render(<FlybyLab />);

    expect(rings()).toHaveLength(0);
    for (const name of ['V2 · Urano', 'V2 · Neptuno', 'V1 · Júpiter']) {
      await user.selectOptions(presetSelect(), name);
      expect(rings(), name).toHaveLength(0);
    }
    await user.selectOptions(presetSelect(), 'V2 · Saturno');
    expect(rings()).toHaveLength(3);
  });

  test('C, B and A at their radii in R_S, under the planet and the track, colored by the token', async () => {
    const user = userEvent.setup();
    render(<FlybyLab />);
    await user.selectOptions(presetSelect(), 'V2 · Saturno');

    expect(ringEdges()).toEqual([
      ['C', 1.239, 1.526],
      ['B', 1.526, 1.95],
      ['A', 2.03, 2.27],
    ]);
    const group = screen.getByTestId('flyby-rings');
    // Drawn first: the planet, the periapsis line, the track and the probe go over them.
    expect(group.compareDocumentPosition(screen.getByTestId('flyby-planet'))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(rings().map((ring) => ring.getAttribute('fill'))).toEqual(['none', 'none', 'none']);
    expect(rings().map((ring) => (ring as SVGElement).style.stroke)).toEqual([
      'color-mix(in srgb, var(--saturn) 70%, black)',
      'var(--saturn)',
      'var(--saturn)',
    ]);
  });

  test('the corner texts go over the rings, legible on them: a backdrop for the key, halos for the texts', async () => {
    const user = userEvent.setup();
    render(<FlybyLab />);
    await user.selectOptions(presetSelect(), 'V2 · Saturno');
    const after = (a: Element, b: Element) =>
      a.compareDocumentPosition(b) === Node.DOCUMENT_POSITION_FOLLOWING;
    const rpValue = screen.getByTestId('flyby-rp-value');

    expect(after(screen.getByTestId('flyby-rings'), rpValue)).toBe(true);
    expect(after(screen.getByTestId('flyby-probe'), rpValue)).toBe(true);
    expect(document.querySelector('[data-hud-backdrop]')).toHaveAttribute(
      'fill',
      'var(--bg-elevated)',
    );
    expect(rpValue.querySelector('[paint-order="stroke"]')).not.toBeNull();
  });

  test('the frame’s description names the rings, their plane and where r_p falls', async () => {
    const user = userEvent.setup();
    render(<FlybyLab />);
    expect(frameName()).not.toMatch(/anillos/);

    await user.selectOptions(presetSelect(), 'V1 · Saturno');

    expect(frameName()).toMatch(
      /Los anillos principales, de 1,24 a 2,27 R sub S, van a escala de distancia al centro, dibujados en el plano del sobrevuelo; su plano real está inclinado\. La máxima aproximación queda por fuera del anillo A\.$/,
    );
  });

  test('«Qué deja fuera» says the rings are drawn in the flyby’s plane and the colors are illustrative', () => {
    const { container } = render(<FlybyLab />);
    const leftOut = container.querySelector('details[data-lab-note="left-out"]');

    expect(mathSourceText(leftOut as HTMLElement)).toMatch(
      /de 1,24 a 2,27 \$R_\\mathrm\{S\}\$ según la NASA, pero dibujados como si estuvieran en el plano del sobrevuelo/,
    );
    expect(leftOut).toHaveTextContent(/se verían como elipses/);
    expect(leftOut).toHaveTextContent(/Los colores de los planetas son ilustrativos/);
  });
});
