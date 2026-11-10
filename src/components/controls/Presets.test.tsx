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

describe('Presets note with KaTeX', () => {
  afterEach(cleanup);

  test('typesets the $…$ of the active preset’s note', () => {
    const presets: Preset<{ g: number }>[] = [
      { id: 'a', name: 'A', values: { g: 1 }, note: 'Fuera del plano de $\\vec V_p$.' },
    ];
    const { container } = render(<Presets presets={presets} activeId="a" onSelect={vi.fn()} />);

    expect(container.querySelector('p .inline-math')).not.toBeNull();
  });
});

describe('Presets name and source with KaTeX', () => {
  afterEach(cleanup);

  const PRESETS_WITH_MATH: Preset<{ k: number }>[] = [
    {
      id: 'late',
      name: 'Batería ($P_\\text{máx}$ 10 kW)',
      values: { k: 1 },
      sourceLabel: 'k = 400 N/m · $x_0$ = 3 mm',
    },
    { id: 'plain', name: 'Plano', values: { k: 2 } },
  ];

  test('typesets the $…$ of the name and the source label', () => {
    const { container } = render(
      <Presets presets={PRESETS_WITH_MATH} activeId="plain" onSelect={vi.fn()} />,
    );

    const formulas = container.querySelectorAll('button .inline-math');
    expect(formulas).toHaveLength(2);
    expect(container.textContent).not.toContain('$');
  });

  test('names the button in words, not by the markup of KaTeX', () => {
    render(<Presets presets={PRESETS_WITH_MATH} onSelect={vi.fn()} />);

    expect(
      screen.getByRole('button', {
        name: 'Batería (P sub máx 10 kW) k = 400 N/m · x sub 0 = 3 mm',
      }),
    ).toBeInTheDocument();
  });

  test('a preset without notation keeps its text as its name', () => {
    render(<Presets presets={PRESETS_WITH_MATH} onSelect={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Plano' })).not.toHaveAttribute('aria-label');
  });
});
