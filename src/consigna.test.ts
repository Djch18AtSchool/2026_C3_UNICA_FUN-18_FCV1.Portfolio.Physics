import { describe, expect, test } from 'vitest';
import { COURSE, PHASE_LABELS, PHASES, TOPICS, topicByNumber, topicsByPhase } from './consigna';

const CONSIGNA_TITLES: Record<number, string> = {
  1: 'Rastreo y navegación de un dron de reparto',
  2: 'El salto del personaje: cómo los motores de juego falsean la gravedad',
  3: 'Gravedad artificial por rotación en hábitats espaciales',
  4: 'Llantas de Fórmula 1: la ventana de temperatura y el agarre',
  5: 'El resorte virtual detrás de un control háptico',
  6: 'Frenado regenerativo en un vehículo eléctrico',
  7: 'El coeficiente de restitución en un motor de videojuego: por qué la pelota rebota mal',
  8: 'Ruedas de reacción: cómo un satélite se gira sin empujarse contra nada',
  9: 'Asistencia gravitatoria: cómo la Voyager ganó velocidad sin gastar combustible',
  10: 'Spring animations: el resorte amortiguado detrás de las animaciones de iOS y de Framer Motion',
  11: 'Síntesis de sonido: armónicos, timbre y el sintetizador',
  12: 'Resonancia estructural: Tacoma Narrows y por qué las tropas rompen el paso al cruzar un puente',
  13: 'Enfriamiento líquido de un centro de datos: continuidad, caudal y Bernoulli',
};

describe('consigna', () => {
  test('los temas registrados van numerados 1..N sin huecos', () => {
    expect(TOPICS.map((t) => t.number)).toEqual(TOPICS.map((_, i) => i + 1));
  });
  test('los slugs son únicos y en kebab-case', () => {
    const slugs = TOPICS.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });
  test('cada tema registrado lleva el título exacto de la consigna', () => {
    for (const t of TOPICS) expect(t.title).toBe(CONSIGNA_TITLES[t.number]);
  });
  test('los temas 1 a 5 pertenecen al Avance 1 y los temas 6 a 9 al Avance 2', () => {
    for (const t of TOPICS.filter((t) => t.number <= 5)) expect(t.phase).toBe(1);
    for (const t of TOPICS.filter((t) => t.number >= 6 && t.number <= 9)) expect(t.phase).toBe(2);
  });
  test('los temas 10 a 13 pertenecen a la Entrega Final', () => {
    for (const t of TOPICS.filter((t) => t.number >= 10)) expect(t.phase).toBe(3);
  });
  test('topicByNumber devuelve el tema registrado con ese número', () => {
    for (const t of TOPICS) expect(topicByNumber(t.number)).toBe(t);
    expect(topicByNumber(TOPICS.length + 1)).toBeUndefined();
  });
  test('PHASES lista cada fase con etiqueta, en orden', () => {
    expect(PHASES).toEqual([1, 2, 3]);
    expect(PHASES.map((phase) => PHASE_LABELS[phase])).toEqual([
      'Avance 1',
      'Avance 2',
      'Entrega Final',
    ]);
  });
  test('COURSE guarda solo lo que el sitio muestra: sin escuela, sección ni periodo', () => {
    expect(Object.keys(COURSE).sort()).toEqual(['code', 'name', 'professor', 'university']);
    expect(COURSE.university).toBe('Universidad CENFOTEC');
    expect(COURSE.name).toBe('Física I');
  });
  test('topicsByPhase ordena por número cualquier lista de temas', () => {
    const shuffled = [
      { phase: 1, number: 3 },
      { phase: 2, number: 6 },
      { phase: 1, number: 1 },
    ] as const;
    expect(topicsByPhase(1, shuffled).map((t) => t.number)).toEqual([1, 3]);
  });
});
