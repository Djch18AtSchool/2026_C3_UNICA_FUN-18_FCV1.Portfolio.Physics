export type Phase = 1 | 2 | 3;
export type ResourceType = 'simulacion' | 'visualizacion' | 'diagrama' | 'multimedia';

export interface ConsignaTopic {
  readonly number: number;
  readonly slug: string;
  readonly title: string;
  readonly phase: Phase;
}

/**
 * The topics that exist on the site, by number. A phase is future iff `topicsByPhase(phase, TOPICS)`
 * is empty: the registry tests and the e2e suites derive from this list, so each topic of the final
 * delivery joins it on its own, with its page, without touching the others.
 */
export const TOPICS: readonly ConsignaTopic[] = Object.freeze(
  [
    {
      number: 1,
      slug: 'dron-reparto',
      phase: 1,
      title: 'Rastreo y navegación de un dron de reparto',
    },
    {
      number: 2,
      slug: 'salto-personaje',
      phase: 1,
      title: 'El salto del personaje: cómo los motores de juego falsean la gravedad',
    },
    {
      number: 3,
      slug: 'gravedad-artificial',
      phase: 1,
      title: 'Gravedad artificial por rotación en hábitats espaciales',
    },
    {
      number: 4,
      slug: 'llantas-f1',
      phase: 1,
      title: 'Llantas de Fórmula 1: la ventana de temperatura y el agarre',
    },
    {
      number: 5,
      slug: 'control-haptico',
      phase: 1,
      title: 'El resorte virtual detrás de un control háptico',
    },
    {
      number: 6,
      slug: 'frenado-regenerativo',
      phase: 2,
      title: 'Frenado regenerativo en un vehículo eléctrico',
    },
    {
      number: 7,
      slug: 'coeficiente-restitucion',
      phase: 2,
      title:
        'El coeficiente de restitución en un motor de videojuego: por qué la pelota rebota mal',
    },
    {
      number: 8,
      slug: 'ruedas-reaccion',
      phase: 2,
      title: 'Ruedas de reacción: cómo un satélite se gira sin empujarse contra nada',
    },
    {
      number: 9,
      slug: 'asistencia-gravitatoria',
      phase: 2,
      title: 'Asistencia gravitatoria: cómo la Voyager ganó velocidad sin gastar combustible',
    },
    {
      number: 10,
      slug: 'animaciones-resorte',
      phase: 3,
      title:
        'Spring animations: el resorte amortiguado detrás de las animaciones de iOS y de Framer Motion',
    },
    {
      number: 11,
      slug: 'sintesis-sonido',
      phase: 3,
      title: 'Síntesis de sonido: armónicos, timbre y el sintetizador',
    },
    {
      number: 12,
      slug: 'resonancia-estructural',
      phase: 3,
      title:
        'Resonancia estructural: Tacoma Narrows y por qué las tropas rompen el paso al cruzar un puente',
    },
  ].map((topic) => Object.freeze(topic) as ConsignaTopic),
);

/** The three deliveries, in order; navigation groups topics by them. */
export const PHASES: readonly Phase[] = [1, 2, 3];

export const PHASE_LABELS: Record<Phase, string> = {
  1: 'Avance 1',
  2: 'Avance 2',
  3: 'Entrega Final',
};

export const RESOURCE_LABELS: Record<ResourceType, string> = {
  simulacion: 'Simulación interactiva',
  visualizacion: 'Visualización de datos',
  diagrama: 'Diagrama',
  multimedia: 'Multimedia con análisis',
};

/** What the site states about the course; `code` only reaches the page description. */
export const COURSE = {
  code: 'FUN-18',
  name: 'Física I',
  university: 'Universidad CENFOTEC',
  professor: 'Andrés Castro Núñez',
} as const;

export const AUTHOR = 'Dylan Chaves';
export const REPO_URL =
  'https://github.com/Djch18AtSchool/2026_C3_UNICA_FUN-18_FCV1.Portfolio.Physics';
export const SITE_URL =
  'https://djch18atschool.github.io/2026_C3_UNICA_FUN-18_FCV1.Portfolio.Physics/';

export function topicBySlug(slug: string): ConsignaTopic | undefined {
  return TOPICS.find((topic) => topic.slug === slug);
}

export function topicByNumber(n: number): ConsignaTopic | undefined {
  return TOPICS.find((topic) => topic.number === n);
}

/** Topics of one phase sorted by number: the consigna list, or any list of topic summaries. */
export function topicsByPhase<T extends { phase: Phase; number: number }>(
  phase: Phase,
  topics: readonly T[],
): T[] {
  return topics.filter((topic) => topic.phase === phase).sort((a, b) => a.number - b.number);
}
