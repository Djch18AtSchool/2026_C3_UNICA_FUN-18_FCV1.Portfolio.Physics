// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import type { Preset } from '../../lib/presets';
import LabPresets from './LabPresets';
import { LabResetContext, scenarioHolds } from './labReset';

type G = { g: number };
const preset = (id: string): Preset<G> => ({
  id,
  name: `Planeta ${id}`,
  values: { g: id.length },
  note: `Nota de ${id}.`,
  sourceLabel: 'Fuente propia',
});
const FEW: Preset<G>[] = [preset('tierra'), preset('luna')];
const MANY: Preset<G>[] = ['a', 'b', 'c', 'd', 'e'].map(preset);

/** Every focusable thing, in the order of the DOM (of Tab). */
const tabOrder = (container: HTMLElement) =>
  [...container.querySelectorAll<HTMLElement>('button, select, a')].map(
    (node) =>
      node.getAttribute('aria-label') ??
      (node instanceof HTMLSelectElement ? node.labels?.[0]?.textContent : node.textContent),
  );

describe('LabPresets carries «Restablecer» inside a LabShell', () => {
  afterEach(cleanup);

  test('outside a shell there is no «Restablecer»', () => {
    render(<LabPresets id="p" presets={FEW} activeId="tierra" onSelect={vi.fn()} />);

    expect(screen.queryByRole('button', { name: 'Restablecer' })).toBeNull();
  });

  test('with chips: at the end of their row, after the last chip and before the note', () => {
    const onReset = vi.fn();
    const { container } = render(
      <LabResetContext value={onReset}>
        <LabPresets id="p" presets={FEW} activeId="tierra" onSelect={vi.fn()} />
      </LabResetContext>,
    );

    const reset = screen.getByRole('button', { name: 'Restablecer' });
    const group = screen.getByRole('group', { name: 'Valores de referencia' });
    // Not one of the presets: outside their group, in the same row.
    expect(within(group).queryByRole('button', { name: 'Restablecer' })).toBeNull();
    expect(reset.parentElement).toBe(group.parentElement);
    expect(reset).toHaveClass('min-h-10');
    expect(tabOrder(container)).toEqual([
      'Planeta tierra Fuente propia',
      'Planeta luna Fuente propia',
      'Restablecer',
    ]);
    expect(
      reset.compareDocumentPosition(screen.getByTestId('preset-note')) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    fireEvent.click(reset);
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  test('with a select: at the end of its row, after the select and before the note', () => {
    const { container } = render(
      <LabResetContext value={vi.fn()}>
        <LabPresets id="p" presets={MANY} activeId="a" onSelect={vi.fn()} />
      </LabResetContext>,
    );

    expect(tabOrder(container)).toEqual(['Valores de referencia', 'Restablecer']);
    const reset = screen.getByRole('button', { name: 'Restablecer' });
    expect(reset.parentElement).toBe(
      screen.getByRole('combobox', { name: 'Valores de referencia' }).closest('[data-preset-row]'),
    );
  });
});

describe('scenarioHolds', () => {
  const Other = () => null;

  test('finds LabPresets at the top of a scenario, alone or inside fragments', () => {
    const presets = <LabPresets id="p" presets={FEW} onSelect={vi.fn()} />;

    expect(scenarioHolds(presets, LabPresets)).toBe(true);
    expect(
      scenarioHolds(
        <>
          <Other />
          {presets}
        </>,
        LabPresets,
      ),
    ).toBe(true);
    expect(
      scenarioHolds(
        <>
          <>{presets}</>
        </>,
        LabPresets,
      ),
    ).toBe(true);
  });

  test('not inside an element of the lab’s own, nor when it is absent or null', () => {
    const presets = <LabPresets id="p" presets={FEW} onSelect={vi.fn()} />;

    expect(scenarioHolds(<div>{presets}</div>, LabPresets)).toBe(false);
    expect(scenarioHolds(<Other />, LabPresets)).toBe(false);
    expect(scenarioHolds(null, LabPresets)).toBe(false);
    expect(
      scenarioHolds(
        <>
          <Other />
          {null}
        </>,
        LabPresets,
      ),
    ).toBe(false);
  });
});
