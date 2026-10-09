// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import Presets, { type Preset } from './Presets';

const PRESETS: Preset<{ g: number }>[] = [
  { id: 'earth', name: 'Tierra', values: { g: 9.81 }, sourceLabel: 'Valor estándar' },
  { id: 'moon', name: 'Luna', values: { g: 1.62 } },
];

describe('Presets', () => {
  afterEach(cleanup);

  test('calls onSelect with the clicked preset', () => {
    const onSelect = vi.fn();
    render(<Presets presets={PRESETS} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole('button', { name: /Luna/ }));

    expect(onSelect).toHaveBeenCalledExactlyOnceWith(PRESETS[1]);
  });

  test('marks only the active preset as pressed', () => {
    render(<Presets presets={PRESETS} activeId="earth" onSelect={() => {}} />);

    expect(screen.getByRole('button', { name: /Tierra/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Luna/ })).toHaveAttribute('aria-pressed', 'false');
  });

  test('shows the source label as a caption when present', () => {
    render(<Presets presets={PRESETS} onSelect={() => {}} />);

    expect(screen.getByText('Valor estándar')).toBeInTheDocument();
  });

  test('shows the note of the active preset only', () => {
    const withNotes: Preset<{ g: number }>[] = [
      { id: 'mars', name: 'Marte', values: { g: 3.71 }, note: 'Superficie, ecuador' },
      { id: 'moon', name: 'Luna', values: { g: 1.62 }, note: 'Valor medio' },
    ];
    render(<Presets presets={withNotes} activeId="mars" onSelect={() => {}} />);

    expect(screen.getByText('Superficie, ecuador')).toBeInTheDocument();
    expect(screen.queryByText('Valor medio')).not.toBeInTheDocument();
  });
});
