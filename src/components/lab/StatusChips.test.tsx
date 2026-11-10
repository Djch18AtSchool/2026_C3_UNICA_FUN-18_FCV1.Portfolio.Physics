// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import { mathSourceText } from '../../test-inline-math';
import StatusChips from './StatusChips';

const ENGINE = [
  { id: 'dt', text: '$\\Delta t$ = 1/60 s' },
  { id: 'substeps', text: '4 subpasos' },
  { id: 'rule', text: 'regla máx' },
];

describe('StatusChips', () => {
  afterEach(cleanup);

  test('a list named by its label, one item per status, in order', () => {
    render(<StatusChips label="Motor" items={ENGINE} />);

    const list = screen.getByRole('list', { name: 'Motor' });
    const items = within(list).getAllByRole('listitem');
    expect(items.map((item) => mathSourceText(item))).toEqual([
      '$\\Delta t$ = 1/60 s',
      '4 subpasos',
      'regla máx',
    ]);
  });

  test('shows its label before the chips, and the chips are text, not buttons', () => {
    const { container } = render(<StatusChips label="Motor" items={ENGINE} testId="engine" />);

    const root = screen.getByTestId('engine');
    expect(root.firstElementChild).toHaveTextContent('Motor');
    expect(within(root).queryAllByRole('button')).toEqual([]);
    expect(container.querySelectorAll('.katex')).toHaveLength(1);
  });

  test('a label with notation names the list in words', () => {
    render(<StatusChips label={String.raw`Estado de $\omega$`} items={ENGINE} />);

    expect(screen.getByRole('list', { name: 'Estado de omega' })).toBeInTheDocument();
  });

  test('each chip holds one inline run, so the space after a formula is not dropped', () => {
    // A flex container makes each text run its own item and trims the space that starts one:
    // «$\Delta t$ = 1/60 s» would read «Δt= 1/60 s». One inline wrapper keeps the run whole.
    render(<StatusChips label="Motor" items={ENGINE} />);

    for (const item of screen.getAllByRole('listitem')) {
      expect(item.childNodes).toHaveLength(1);
      expect(item.firstElementChild?.tagName).toBe('SPAN');
    }
  });

  test('a chip never breaks: «$\\Delta t$ = 1/60 s» stays on one line with its formula', () => {
    render(<StatusChips label="Motor" items={ENGINE} />);

    for (const item of screen.getAllByRole('listitem')) {
      expect(item).toHaveClass('whitespace-nowrap');
    }
  });

  test('renders nothing without items', () => {
    const { container } = render(<StatusChips label="Motor" items={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
