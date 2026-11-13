/** Every published topic page, derived from TOPICS, for the suites that check all of them. */
import { TOPICS } from '../../src/consigna';

/**
 * What each topic's laboratory has, by slug: its LabShell test id and the three features that pull
 * a lab into a suite (a clock with a transport bar, events in that transport, a zoom). It is the
 * one registry the suites derive from (CLOCKED_LABS, the event and zoom specs), and
 * `lab-registry.spec.ts` compares every flag with the DOM the page builds, so a lab that gains a
 * clock, events or a zoom (Tema 10) without its flag here fails that spec instead of slipping
 * out of the suites that would measure it.
 */
const LABS: Readonly<
  Record<string, { labTestId: string; hasClock: boolean; hasEvents: boolean; hasZoom: boolean }>
> = {
  'dron-reparto': { labTestId: 'drone-lab', hasClock: true, hasEvents: true, hasZoom: true },
  'salto-personaje': { labTestId: 'jump-lab', hasClock: true, hasEvents: false, hasZoom: true },
  'gravedad-artificial': {
    labTestId: 'habitat-lab',
    hasClock: true,
    hasEvents: false,
    hasZoom: true,
  },
  'llantas-f1': { labTestId: 'tyre-lab', hasClock: false, hasEvents: false, hasZoom: false },
  'control-haptico': {
    labTestId: 'trigger-lab',
    hasClock: false,
    hasEvents: false,
    hasZoom: false,
  },
  'frenado-regenerativo': {
    labTestId: 'regen-lab',
    hasClock: true,
    hasEvents: true,
    hasZoom: false,
  },
  'coeficiente-restitucion': {
    labTestId: 'bounce-lab',
    hasClock: true,
    hasEvents: false,
    hasZoom: false,
  },
  'ruedas-reaccion': { labTestId: 'wheel-lab', hasClock: true, hasEvents: false, hasZoom: true },
  'asistencia-gravitatoria': {
    labTestId: 'flyby-lab',
    hasClock: true,
    hasEvents: true,
    hasZoom: true,
  },
};

export interface TopicPage {
  number: number;
  slug: string;
  /** Relative to the base URL: "./temas/<slug>/". */
  path: string;
  /** data-testid of the page's laboratory (LabShell). */
  labTestId: string;
  /** The lab has a clock, so a transport bar. */
  hasClock: boolean;
  /** The transport has events (marks, «Evento anterior / siguiente»). */
  hasEvents: boolean;
  /** Some drawing of the lab zooms (`data-zoom-viewport`). */
  hasZoom: boolean;
}

/** One entry per topic in TOPICS; a topic added without its lab test id fails every suite early. */
export const TOPIC_PAGES: readonly TopicPage[] = TOPICS.map(({ number, slug }) => {
  const lab = LABS[slug];
  if (!lab) {
    throw new Error(`tests/e2e/topicPages.ts: falta el test id del laboratorio de "${slug}"`);
  }
  return { number, slug, path: `./temas/${slug}/`, ...lab };
});
