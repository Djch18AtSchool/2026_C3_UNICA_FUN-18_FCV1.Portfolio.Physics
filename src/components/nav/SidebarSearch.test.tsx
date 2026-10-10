// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import type { SearchEntry } from '../../lib/searchIndex';
import { topicUrl } from '../../lib/url';
import SidebarSearch from './SidebarSearch';

const INDEX: SearchEntry[] = [
  {
    slug: 'salto-personaje',
    number: 2,
    phase: 1,
    title: 'El salto del personaje: cómo los motores de juego falsean la gravedad',
    shortTitle: 'Salto del personaje',
    status: 'publicado',
    headings: [
      { text: 'Paso 3 · Qué falta: tiempo al ápice', anchor: 'paso-3' },
      { text: 'Conexiones', anchor: 'conexiones' },
    ],
  },
  {
    slug: 'llantas-f1',
    number: 4,
    phase: 1,
    title: 'Llantas de Fórmula 1: la ventana de temperatura y el agarre',
    shortTitle: 'Llantas de Fórmula 1',
    status: 'publicado',
    headings: [{ text: 'Conexiones', anchor: 'conexiones' }],
  },
];
const LIST_ID = 'lista-de-temas';

function setup() {
  const list = document.createElement('div');
  list.id = LIST_ID;
  document.body.append(list);
  render(<SidebarSearch index={INDEX} listId={LIST_ID} />);
  return { list, input: screen.getByRole('searchbox', { name: 'Buscar en el portafolio' }) };
}

describe('SidebarSearch', () => {
  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
  });

  test('is a search landmark with no results while empty', () => {
    const { list } = setup();
    expect(screen.getByRole('search')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(list).not.toHaveAttribute('hidden');
  });

  test('filters while typing and links headings to their anchor', () => {
    const { input, list } = setup();

    fireEvent.change(input, { target: { value: 'apice' } });

    const results = screen.getByRole('list', { name: 'Resultados de la búsqueda' });
    const links = within(results).getAllByRole('link');
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      topicUrl('salto-personaje'),
      `${topicUrl('salto-personaje')}#paso-3`,
    ]);
    expect(links[1]).toHaveTextContent('Paso 3 · Qué falta: tiempo al ápice');
    expect(list).toHaveAttribute('hidden');
  });

  test('a title match links to the topic', () => {
    const { input } = setup();

    fireEvent.change(input, { target: { value: 'llantas' } });

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', topicUrl('llantas-f1'));
    expect(links[0]).toHaveTextContent('Llantas de Fórmula 1');
    expect(screen.getByRole('status')).toHaveTextContent('1 tema encontrado');
  });

  test('says "Sin resultados" when nothing matches', () => {
    const { input } = setup();

    fireEvent.change(input, { target: { value: 'tacoma' } });

    expect(screen.getByRole('status')).toHaveTextContent('Sin resultados');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  test('clearing the query shows the normal list again', () => {
    const { input, list } = setup();
    fireEvent.change(input, { target: { value: 'conexiones' } });
    expect(screen.getAllByRole('link')).toHaveLength(4);
    expect(screen.getByRole('status')).toHaveTextContent('2 temas encontrados');

    fireEvent.change(input, { target: { value: '' } });

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(list).not.toHaveAttribute('hidden');
  });
});
