# Portafolio de evidencias de Física I

- **Autor:** Dylan Chaves
- **Universidad:** Universidad CENFOTEC, Escuela de Fundamentos
- **Curso:** FUN-18 Física I
- **Sección:** FCV1
- **Periodo:** 2026-C3
- **Docente:** Andrés Castro Núñez

## Enlaces

- Sitio: https://djch18atschool.github.io/2026_C3_UNICA_FUN-18_FCV1.Portfolio.Physics/
- Repositorio: https://github.com/Djch18AtSchool/2026_C3_UNICA_FUN-18_FCV1.Portfolio.Physics

## Temas

| #   | Tema                                                                  | Avance        | Estado       |
| --- | --------------------------------------------------------------------- | ------------- | ------------ |
| 1   | Rastreo y navegación de un dron de reparto                            | Avance 1      | Publicado    |
| 2   | El salto del personaje: cómo los motores de juego falsean la gravedad | Avance 1      | Publicado    |
| 3   | Gravedad artificial por rotación en hábitats espaciales               | Avance 1      | Publicado    |
| 4   | Llantas de Fórmula 1: la ventana de temperatura y el agarre           | Avance 1      | Publicado    |
| 5   | El resorte virtual detrás de un control háptico                       | Avance 1      | Publicado    |
| 6   | Frenado regenerativo en un vehículo eléctrico                         | Avance 2      | Próximamente |
| 7   | El coeficiente de restitución en un motor de videojuego               | Avance 2      | Próximamente |
| 8   | Ruedas de reacción en satélites                                       | Avance 2      | Próximamente |
| 9   | Asistencia gravitatoria de la Voyager                                 | Avance 2      | Próximamente |
| 10  | Spring animations en interfaces                                       | Entrega Final | Próximamente |
| 11  | Síntesis de sonido y armónicos                                        | Entrega Final | Próximamente |
| 12  | Resonancia estructural y Tacoma Narrows                               | Entrega Final | Próximamente |
| 13  | Enfriamiento líquido de un centro de datos                            | Entrega Final | Próximamente |

## Estado del Avance 1

Los cinco temas del Avance 1 están publicados en el formato de pasos de la versión 2: cada tema se lee en pasos (`Step`), cada paso con su explicación de apoyo (`Why`) y un laboratorio interactivo propio (dron, salto, hábitat, llantas y gatillo). Cada uno conserva su análisis escrito y el tipo de recurso de apoyo prescrito, sin sustituciones: visualización de datos (Tema 1), simulación interactiva (Tema 2), diagrama (Tema 3), visualización de datos (Tema 4) y multimedia con análisis (Tema 5). El video del Tema 5 está pendiente de la grabación del autor: la página ya incluye el análisis escrito y muestra un recurso alternativo diseñado hasta que exista `public/media/tema-05-dualsense.mp4`. Los temas 6 a 13 figuran solo por su nombre y estarán próximamente.

## Estructura

- `.github/workflows/`: CI y despliegue a GitHub Pages.
- `docs/`: especificaciones, planes e investigación del proyecto.
- `public/`: recursos estáticos: el favicon y, cuando exista, `media/` con el video del Tema 5 y su póster.
- `scripts/`: `generate-drone-route.ts` (genera el conjunto de datos del dron) y `compress-video.sh` (comprime videos).
- `src/content/topics/`: un archivo MDX por tema. Todo tema publicado tiene al menos 3 `Step` y un `Why` por cada `Step`; `src/content/topics.test.ts` lo verifica.
- `src/data/`: conjuntos de datos generados.
- `src/lib/settingsStore.ts`: ajustes globales (decimales, cuadrícula, movimiento) guardados en `localStorage` bajo la clave `portafolio.settings`.
- `src/lib/`: también el índice de búsqueda (`searchIndex.ts`, `sectionHeadings.ts`), el estado persistido de la navegación (`navState.ts`, claves `portafolio.nav.avance-N` y `portafolio.nav.sidebar`), `readingTime.ts` y `buildDate.ts`.
- `src/lib/physics/`: núcleo de física puro, con pruebas.
- `src/lib/data/`: modelos y preajustes con sus fuentes.
- `src/components/ui/`: componentes de interfaz base, incluidos `Step.astro` y `Why.astro` (el modelo de contenido por pasos).
- `src/components/lab/`: el armazón de los laboratorios (`LabShell`, `SettingsDrawer`, `ParamField`, `TransportBar`, `useSimClock`), las gráficas SVG (`SvgPlot` con su cursor, ejes y marcas), los ajustes de reproducción comunes (`clockSettings`), `useDrag`, `OverlayMarks`, `PlotPoints`, `scrollLock` y `useSettledText`.
- `src/components/controls/`: controles interactivos (deslizadores, botones).
- `src/components/charts/`: gráficas.
- `src/components/nav/`: navegación: barra lateral con búsqueda (`SidebarSearch`), `SidebarToggle` y `TopicTools`.
- `src/components/hooks/`: hooks de React compartidos.
- `src/components/topics/`: laboratorios y figuras de cada tema (`JumpLab`, `DroneLab`, `HabitatLab`, `TyreLab`, `TriggerLab`).
- `src/layouts/`: plantillas de página.
- `src/pages/`: páginas del sitio (`temas/` para cada tema).
- `src/styles/`: estilos globales.
- `tests/e2e/`: pruebas de extremo a extremo (Playwright).

## Comandos

```bash
pnpm install
pnpm run dev
pnpm run build
pnpm run preview --ignore-lock
pnpm run check
pnpm run test
pnpm run test:cov
pnpm run e2e
E2E_PORT=4322 pnpm run e2e
pnpm run format
pnpm run data:drone
bash scripts/compress-video.sh media-raw/<archivo>
```

`E2E_PORT=4322 pnpm run e2e` ejecuta las pruebas de extremo a extremo en otro puerto; úsalo en local cuando un servidor de desarrollo ocupa el 4321.
