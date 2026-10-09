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

| #   | Tema                                                                  | Avance        | Estado                 |
| --- | --------------------------------------------------------------------- | ------------- | ---------------------- |
| 1   | Rastreo y navegación de un dron de reparto                            | Avance 1      | Publicado (2026-10-08) |
| 2   | El salto del personaje: cómo los motores de juego falsean la gravedad | Avance 1      | Publicado (2026-10-08) |
| 3   | Gravedad artificial por rotación en hábitats espaciales               | Avance 1      | Publicado (2026-10-08) |
| 4   | Llantas de Fórmula 1: la ventana de temperatura y el agarre           | Avance 1      | Publicado (2026-10-08) |
| 5   | El resorte virtual detrás de un control háptico                       | Avance 1      | Publicado (2026-10-08) |
| 6   | Frenado regenerativo en un vehículo eléctrico                         | Avance 2      | Próximamente           |
| 7   | El coeficiente de restitución en un motor de videojuego               | Avance 2      | Próximamente           |
| 8   | Ruedas de reacción en satélites                                       | Avance 2      | Próximamente           |
| 9   | Asistencia gravitatoria de la Voyager                                 | Avance 2      | Próximamente           |
| 10  | Spring animations en interfaces                                       | Entrega Final | Próximamente           |
| 11  | Síntesis de sonido y armónicos                                        | Entrega Final | Próximamente           |
| 12  | Resonancia estructural y Tacoma Narrows                               | Entrega Final | Próximamente           |
| 13  | Enfriamiento líquido de un centro de datos                            | Entrega Final | Próximamente           |

## Estado del Avance 1

Los cinco temas del Avance 1 están publicados (2026-10-08), cada uno con su análisis escrito y su simulación interactiva. El video del Tema 5 está pendiente de la grabación del autor: la página ya incluye el análisis escrito y muestra un recurso alternativo diseñado hasta que exista `public/media/tema-05-dualsense.mp4`.

## Estructura

- `.github/workflows/`: CI y despliegue a GitHub Pages.
- `docs/`: especificaciones, planes e investigación del proyecto.
- `public/`: recursos estáticos (medios, imágenes).
- `scripts/`: `generate-drone-route.ts` (genera el conjunto de datos del dron) y `compress-video.sh` (comprime videos).
- `src/content/topics/`: un archivo MDX por tema.
- `src/data/`: conjuntos de datos generados.
- `src/lib/physics/`: núcleo de física puro, con pruebas.
- `src/lib/data/`: carga y utilidades de datos.
- `src/components/ui/`: componentes de interfaz base.
- `src/components/controls/`: controles interactivos (deslizadores, botones).
- `src/components/charts/`: gráficas.
- `src/components/nav/`: navegación.
- `src/components/hooks/`: hooks de React compartidos.
- `src/components/topics/`: simulaciones y figuras de cada tema.
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
pnpm run format
pnpm run data:drone
bash scripts/compress-video.sh media-raw/<archivo>
```
