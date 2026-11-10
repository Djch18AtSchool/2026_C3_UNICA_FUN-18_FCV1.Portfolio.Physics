// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test } from 'vitest';
import { mathSourceText } from '../../test-inline-math';
import LabNotes, { LEFT_OUT_TITLE, USAGE_TITLE } from './LabNotes';

const USAGE = ['Arrastra el punto o muévelo con las flechas.', 'A 1× cada paso dura 12 s.'];
const LEFT_OUT = ['Es plano: no hay $\\vec v_z$.'];

const details = (title: string) =>
  screen.getByText(title, { selector: 'summary *, summary' }).closest('details') as HTMLElement;

describe('LabNotes', () => {
  afterEach(cleanup);

  test('two native disclosures, «Cómo se usa» then «Qué deja fuera el modelo», both closed', () => {
    const { container } = render(<LabNotes usage={USAGE} leftOut={LEFT_OUT} />);

    const all = [...container.querySelectorAll('details')];
    expect(all.map((element) => element.querySelector('summary')?.textContent)).toEqual([
      USAGE_TITLE,
      LEFT_OUT_TITLE,
    ]);
    expect(USAGE_TITLE).toBe('Cómo se usa');
    expect(LEFT_OUT_TITLE).toBe('Qué deja fuera el modelo');
    expect(all.every((element) => !element.open)).toBe(true);
  });

  test('each paragraph is its own <p>, with its notation typeset', () => {
    render(<LabNotes usage={USAGE} leftOut={LEFT_OUT} />);

    const usage = [...details(USAGE_TITLE).querySelectorAll('p')].map((p) => p.textContent);
    expect(usage).toEqual(USAGE);
    expect(mathSourceText(details(LEFT_OUT_TITLE).querySelector('p'))).toBe(LEFT_OUT[0]);
  });

  test('the summary opens and closes its disclosure', async () => {
    const user = userEvent.setup();
    render(<LabNotes usage={USAGE} />);

    await user.click(screen.getByText(USAGE_TITLE));
    expect(details(USAGE_TITLE)).toHaveProperty('open', true);
    await user.click(screen.getByText(USAGE_TITLE));
    expect(details(USAGE_TITLE)).toHaveProperty('open', false);
  });

  test('a disclosure with no text is left out, and with none at all nothing renders', () => {
    const { container, rerender } = render(<LabNotes usage={USAGE} leftOut={['  ']} />);
    expect(container.querySelectorAll('details')).toHaveLength(1);

    rerender(<LabNotes />);
    expect(container).toBeEmptyDOMElement();
  });
});
