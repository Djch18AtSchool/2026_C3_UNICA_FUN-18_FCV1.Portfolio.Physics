# Portafolio de Física I — Diseño v2 (rediseño estructural sobre la v1)

Fecha: 2026-10-09
Estado: borrador para revisión de Dylan
Base: `docs/superpowers/specs/2026-10-08-physics-portfolio-design.md` (v1). Este documento describe solo lo que cambia. Todo lo que no se menciona sigue como en la v1.

## 1. Objetivo

Convertir el portafolio v1, ya publicado y revisado, en la versión que Dylan quiere entregar: misma identidad visual, pero con una portada más simple y sin información inventada, una barra lateral de documentación con buscador, una cabecera de tema con insignias y herramientas, contenido explicado en pasos incrementales justificados por el fenómeno y por la matemática, y simuladores con manipulación directa, transporte mínimo y ajustes en un panel.

Fecha de entrega del Avance 1: sábado 17 de octubre de 2026, 23:59 (el docente concedió una semana más). El tiempo no decide el alcance; solo ordena el trabajo.

## 2. Principios acordados

- **El formato visual no cambia.** Tokens, tipografía, retícula, componentes de contenido, insignias y gráficas siguen como en la v1. No se importa ningún estilo del preview descartado.
- **Nada inventado.** De los avances 2 y 3 solo se muestran los nombres de tema que publica la consigna; ni concepto, ni tipo de recurso, ni secciones futuras.
- **Contenido, no formato.** Cada tema se explica en pasos incrementales (modelo simple → por qué no basta → qué falta → modelo mejorado), corto y al grano, con cada afirmación justificada dos veces: por el fenómeno físico y por la ecuación.
- **Figuras en vertical.** Toda figura, plano, gráfica o lienzo va a lo ancho de la columna, encima o debajo de la fórmula que ilustra. Nunca a los lados.
- **Manipulación directa primero.** Arrastrar y mover es la interacción principal de cada simulador; los botones de transporte son mínimos y la animación termina al final.
- **Ajustes fuera del lienzo.** Las opciones viven en un panel que se abre con un engranaje, con una pestaña local y una global.

## 3. Portada (`src/pages/index.astro`)

- Debajo del título y del resumen, una lista de definición en este orden exacto, una línea por fila: Autor (Dylan Chaves), Universidad (Universidad CENFOTEC · Escuela de Fundamentos), Curso (FUN-18 Física I · Sección FCV1 · 2026-C3), Docente (Andrés Castro Núñez), Última actualización (fecha del build en español).
- Debajo de la lista, el botón "Ver repositorio" con el icono de GitHub. Se conserva el icono del repositorio en la cabecera del sitio.
- Se elimina el bloque "N de 13 temas publicados" y su indicador.
- Tabla de contenidos: se eliminan el rótulo "Temas X a Y" de cada grupo y la insignia "Publicado". Las filas muestran número, título y, en los temas publicados, el tipo de recurso. Las filas de los avances 2 y 3 muestran número, título y "Próximamente"; no muestran "Recurso por definir" ni el producto del caso.
- El pie del sitio deja de repetir curso, sección, periodo, universidad y docente; conserva solo el enlace al repositorio y la fecha de generación del sitio.

## 4. Temas futuros (6 a 13)

- Esquema (`src/content/topicSchema.ts`): `concept` pasa a ser obligatorio solo cuando `status` es `publicado`. Los ocho MDX futuros quedan sin `concept`.
- `TopicLayout` para `proximamente`: título, "Tema N · Avance X" y la frase "Se publica en el Avance 2" o "en la Entrega Final". Se retiran el concepto y la lista de secciones futuras. La prueba de contenido verifica que ningún tema `proximamente` declare `concept`.

## 5. Barra lateral (`src/components/nav/SideNav.astro` + `SidebarSearch.tsx`)

- **Buscador** arriba. Índice generado en el build con título y título corto de cada tema y los encabezados de sección de los temas publicados (obtenidos con `render(entry).headings` en `[slug].astro`). Isla React `client:idle` con un campo de búsqueda; al escribir, filtra en el cliente y muestra coincidencias de tema y de sección con enlace al ancla; vacío muestra la lista normal.
- **Avances plegables**: cada avance es un `<details>` con su estado `open` recordado en `localStorage` (`portafolio.nav.avance-N`), aplicado antes del primer pintado por un script inline en `BaseLayout`. Por defecto, el avance del tema actual abierto y los demás cerrados.
- **Subtemas por tema**: debajo de cada tema publicado, sus secciones (los pasos, "Caso en software", "Conexiones", "Fuentes") como enlaces a anclas. El tema actual las muestra abiertas con indicador de posición por `IntersectionObserver`; los otros temas las muestran al desplegar el tema.
- **Botón de la cabecera** (en `SiteHeader`, icono de panel) abre o cierra la barra lateral en pantallas anchas y recuerda la elección (`portafolio.nav.sidebar`); en móvil sigue el cajón `<details>` actual. Desaparece el "modo foco" si existiera.
- La prueba de accesibilidad y la de respuesta en móvil cubren ambos estados.

## 6. Página de tema (`src/layouts/TopicLayout.astro`)

- Bajo el resumen: tres insignias en una fila. Tipo de recurso (componente actual), duración aproximada de lectura ("≈ N min", con N = palabras del cuerpo / 200 + 0,5 por figura o laboratorio, mínimo 1), y "Contenido actualizado el <updated del tema>". La fecha de generación del sitio solo aparece en el pie general, para que se distingan ambas.
- Bajo las insignias: botones de herramientas (isla React `TopicTools.tsx`, `client:idle`): "Copiar URL", "Copiar Markdown" (copia el cuerpo MDX del tema sin las líneas `import`, embebido en la página como `<script type="text/plain">`), "Abrir en GitHub" (enlace al MDX en el repositorio). Cada botón confirma con el texto "Copiado" durante un segundo.
- Se elimina la línea final del tema con "Actualizado el" y "Ver fuente de esta página en GitHub". Se conserva la navegación anterior y siguiente.
- `Connections`: las dos listas se apilan en vertical, "Con otros temas" y debajo "Con lo visto en clase".
- Figuras y laboratorios ocupan el ancho de la columna de lectura; no existe variante a dos columnas.

## 7. Modelo de contenido: pasos

### 7.1 Componentes nuevos (`src/components/ui/`)

- `Step.astro`: props `n` (entero) y `title`. Renderiza `<section class="step" id="paso-N">` con `<h2>` "Paso N · título" (el encabezado entra en el índice del buscador y en los subtemas de la barra lateral). Contenido: el slot.
- `Why.astro`: bloque "Por qué" con dos slots obligatorios, `fenomeno` y `ecuacion`, renderizados como dos párrafos cortos con los rótulos "En el fenómeno" y "En la ecuación". Si falta uno, falla el build con `Why: falta el slot "<nombre>"`. Este componente encarna la regla de justificación doble.
- Se conservan `UseCase`, `Equation`, `Figure`, `Cite`, `Sources`, `Connections`, `Callout`.

### 7.2 Estructura de un tema publicado

1. Frontmatter (sin cambios de campos, salvo `concept` obligatorio solo si publicado).
2. Resumen de dos frases (la introducción del MDX).
3. Pasos 1 a 4 con `Step`. Cada paso: dos o tres frases, una `Equation` numerada, un `Why` y una `Figure` vertical (figura estática o laboratorio). El paso 4 contiene siempre el laboratorio del tema o, en los temas de visualización o diagrama, el recurso prescrito acompañado del laboratorio complementario.
4. `UseCase` con sus cuatro huecos, en el formato corto: cada hueco de dos a cuatro frases.
5. `Callout variant="clase"` con la conexión al módulo del curso.
6. `Connections` (vertical) con la prosa en su hueco.
7. `Sources`.

La prueba de contenido exige al menos tres `Step`, un `Why` por `Step` y la ausencia de `## Conexiones`/`## Fuentes` manuales.

### 7.3 Recorrido por tema (contenido a reescribir)

**Tema 1 · Dron.** Paso 1, punto a punto: la posición como vector y sus componentes, `r(t) = r0 + v t` con rapidez constante; figura del mapa con la ruta declarada. Paso 2, por qué no basta: con rapidez constante la velocidad cambia de golpe en cada vértice, `a = dv/dt` sería infinita; figura de v y a con saltos. Paso 3, qué falta: límites de aceleración y de velocidad, el perfil trapezoidal y su duración; figura del perfil. Paso 4, modelo mejorado: la ruta completa con el perfil, el laboratorio del dron. Caso ArduPilot y PX4, con los parámetros reales ya citados.

**Tema 2 · Salto.** Paso 1, caída libre: `y(t)`, altura y tiempo en el aire; figura. Paso 2, por qué no basta: con 9,81 el salto es flotante, altura y tiempo se encogen juntos al subir g; figura con tres gravedades. Paso 3, qué falta: diseñar en altura y tiempo al ápice, inversa de Pittman, constantes de Celeste y Super Mario Bros convertidas; figura. Paso 4, modelo mejorado: gravedad asimétrica y el laboratorio del salto. Caso Celeste.

**Tema 3 · Hábitat.** Paso 1, sin gravedad: peso aparente nulo y por qué hace falta fabricarlo; figura. Paso 2, rotar: `a_c = ω² r`, qué radio da 1 g a unas RPM; figura. Paso 3, por qué no basta un radio pequeño: gradiente cabeza-pies `h/r` y Coriolis, límites de confort; figura. Paso 4, diseño: el diagrama anotado (recurso prescrito) y el laboratorio del hábitat. Caso SpinCalc y SP-413.

**Tema 4 · Llantas.** Paso 1, el modelo de clase `f ≤ μ N` con el ejemplo de la caja; figura. Paso 2, por qué no basta: la fuerza lateral no crece en proporción a la carga; gráfica B. Paso 3, qué falta: la temperatura y su ventana; gráfica A. Paso 4, el modelo de un simulador: `tyres.ini` y la Fórmula Mágica, con el laboratorio de la llanta. Caso Assetto Corsa y Pacejka, con las salvedades ya acordadas.

**Tema 5 · Háptico.** Paso 1, vibración fija: una fuerza constante no informa de x; figura. Paso 2, resorte real: Hooke y energía; figura. Paso 3, tercera ley: lo que siente el dedo; diagrama de fuerzas. Paso 4, resorte virtual: el perfil por tramos del gatillo, el laboratorio del gatillo y el video con análisis (recurso prescrito). Caso DualSense.

Las fuentes, los números y las salvedades ya verificados en la v1 se conservan; la reescritura cambia la forma y la extensión, no los hechos.

## 8. Cascarón de laboratorio v2 (`src/components/lab/`)

### 8.1 Piezas

- `LabShell.tsx`: marco del laboratorio con el estilo de figura actual. Zonas: lienzo (arriba, a lo ancho), barra de transporte (reproducir o pausar, reiniciar, línea de tiempo con lectura de t), fila de lecturas, parámetros principales (dos o tres, deslizador con campo numérico), engranaje que abre el panel de ajustes. Props: `title`, `type`, `clock`, `readouts`, `params`, `settings` (esquema local), `onReset`, y el lienzo como hijo.
- `useSimClock.ts`: reloj de paso fijo sobre `requestAnimationFrame` con `play`, `pause`, `toggle`, `reset`, `seek(t)`, `step(dt)`, `speed`, `loop`. Lógica pura en `clockReducer` (probada): avanza, se detiene exactamente en `duration` salvo `loop`, y nunca supera `duration`.
- `useDrag.ts`: eventos de puntero con captura para arrastrar un manejador dentro de un SVG; entrega coordenadas en unidades del plano. Todo manejador arrastrable tiene su alternativa de teclado (el deslizador correspondiente) y `tabindex` con desplazamiento por flechas.
- `SvgPlot.tsx`: graficadora propia en SVG para los laboratorios: escalas, ejes con unidades, cuadrícula, series, marcador y cursor arrastrable. Recharts se conserva solo para las figuras de datos (perfiles del dron).
- `SettingsDrawer.tsx`: panel lateral con `<dialog>` nativo (foco atrapado, Esc cierra), dos pestañas: "Este simulador" (opciones locales del laboratorio) y "Global". Botón de cierre, `aria-labelledby`.
- `settingsStore.ts`: ajustes globales en `localStorage` (`portafolio.settings`) con suscripción (`useSyncExternalStore`). Claves: `decimals` (1, 2, 3; por defecto 2), `grid` (sí/no), `motion` (`auto` o `reduced`). Lecturas y escrituras protegidas; sin almacenamiento, valores por defecto. `Readout`, `Slider`, las gráficas y los laboratorios leen `decimals` del store.

### 8.2 Reglas de transporte

- La reproducción termina en `duration` y el botón vuelve a "Reproducir". `loop` está apagado por defecto y se activa en ajustes locales.
- `speed` (0,25× a 2×) vive en ajustes locales, no en la barra.
- Arrastrar la línea de tiempo pausa; arrastrar el marcador sobre la trayectoria también.
- Con `motion: reduced` o `prefers-reduced-motion`, reproducir avanza por pasos discretos sin animación continua.

### 8.3 Laboratorios por tema

- **Salto (`JumpLab`)**: manejador del vector de lanzamiento arrastrable (fija v0 vertical y vx horizontal), marcador arrastrable sobre la curva para recorrer t, referencia terrestre fantasma, lecturas (altura máxima, tiempo al ápice, tiempo en el aire, alcance). Parámetros principales: v0 y g. Preajustes Tierra, Luna, Celeste, Super Mario Bros. "Diseñar el salto" debajo del laboratorio, compacto. Ajustes locales: fantasma, vector velocidad, rastro, multiplicador de caída, integrador (analítico o Euler semi-implícito), velocidad, repetir.
- **Dron (`DroneLab`)**: mapa con las paradas A, B y C arrastrables; al soltar, `generateRoute` recalcula la ruta en el navegador y las gráficas se actualizan; "Restablecer" vuelve a la ruta declarada y una nota indica "ruta modificada" mientras no coincida. Reproducción del dron a lo largo de la ruta con vectores v y a. Parámetros principales: vMax y aMax. Las tres gráficas de perfiles (Recharts) debajo con marcador sincronizado. Ajustes locales: vectores, escala de vectores, rastro, velocidad, repetir.
- **Hábitat (`HabitatLab`)**: anillo animado girando a ω (escalada para verse), persona y vectores en vivo, manejador del radio arrastrable sobre el dibujo, deslizador de RPM, modo "fijar 1 g" que resuelve r o RPM. Lecturas: ω, v, a_c/g, T, gradiente. Preajustes como en la v1. El diagrama anotado estático sigue siendo el recurso prescrito, en el paso 4 antes del laboratorio.
- **Llanta (`TyreLab`)**: dos `SvgPlot` con cursor arrastrable: temperatura (lee μ y marca la ventana del compuesto, con selector C3 o C4 según las ventanas confirmadas de 2019) y carga (lee F_y lineal y real y μ efectivo). Sin reproducción; el transporte se oculta cuando `duration` es 0.
- **Gatillo (`TriggerLab`)**: gatillo en SVG arrastrable de 0 a 8 mm; al soltar, vuelve con el oscilador amortiguado del kernel y la animación se detiene al reposo; curva F–x en `SvgPlot` con el punto en vivo; parámetros principales k y x₀. Lecturas: x, F, energía. El video con análisis (recurso prescrito) sigue encima, sin cambios.

### 8.4 Kernel (`src/lib/physics/`)

- `spring.ts`: `dampedSpringStep(state, { k, m, c }, dt)` con Euler semi-implícito, y `isAtRest(state, tol)`.
- `projectile.ts`: `eulerStep(state, g, dt)` para el integrador alternativo del salto.
- `clock.ts`: `clockReducer` y `advance(state, dt)` puros.
- Pruebas unitarias para cada función nueva y para `generateRoute` con paradas arrastradas (ruta válida, duración recalculada).

## 9. Índice de búsqueda (`src/lib/searchIndex.ts`)

- `buildSearchIndex(topics, headingsBySlug)` devuelve `{ slug, number, phase, title, shortTitle, status, headings: [{ text, anchor }] }[]`.
- Solo los temas publicados aportan encabezados. Los futuros aportan solo el título.
- `filterIndex(index, query)` es pura y probada: normaliza acentos y mayúsculas, busca por subcadena en títulos y encabezados, devuelve temas y secciones ordenados por número.

## 10. Pruebas

- Unitarias: `clockReducer` (avanza, se detiene en `duration`, `loop`, `seek` acotado), `settingsStore` (valores por defecto sin almacenamiento, persistencia, suscriptores), `filterIndex`, `readingMinutes`, `dampedSpringStep` (converge al reposo), `eulerStep`, `useDrag` (conversión de coordenadas), componentes `Step`/`Why` (no hay Container API: verificación por build y e2e), `SvgPlot` (escalas), `DroneLab` (regeneración al arrastrar), `JumpLab` (arrastre del vector cambia v0 y vx).
- Contenido: temas `proximamente` sin `concept`; publicados con ≥ 3 `Step`, un `Why` por paso, `UseCase`, `Connections`, `Sources`; ninguna figura a dos columnas (no existe el componente).
- E2E: portada (orden de la lista, sin conteo, sin "Publicado", sin rótulo de rango); barra lateral (buscador filtra y enlaza, avances se pliegan y recuerdan, subtemas del tema actual, botón de cabecera cierra y recuerda); cabecera de tema (tres insignias, tres herramientas, copiar URL escribe en el portapapeles); conexiones verticales; cada laboratorio: reproducir termina al final sin repetir, arrastrar cambia una lectura, el panel de ajustes abre y cierra con teclado, cambiar decimales globales afecta a dos laboratorios distintos; accesibilidad (axe) y respuesta en móvil en todas las páginas publicadas con la barra abierta y cerrada; errores de consola.
- CI y Lighthouse como en la v1.

## 11. Orden de trabajo

1. Spec v2 aprobada y plan.
2. Kernel: oscilador amortiguado, Euler, reloj puro; `settingsStore`; `SvgPlot`; `useSimClock`; `useDrag`; `SettingsDrawer`; `LabShell`. Todo con pruebas primero.
3. Portada, temas futuros, esquema, pie del sitio.
4. Barra lateral con buscador, avances plegables, subtemas y botón de cabecera.
5. Cabecera de tema con insignias y herramientas; conexiones verticales; componentes `Step` y `Why`.
6. Tema 2 reescrito con `JumpLab` (implementación de referencia).
7. Temas 1, 3, 4 y 5 reescritos con sus laboratorios, en ese orden.
8. Pase de accesibilidad, respuesta en móvil y rendimiento.
9. Revisión final de la rama.
10. Lectura de Dylan, video del Tema 5, verificación y entrega.

Cada paso termina revisado y en verde antes del siguiente. Nada se publica a medias: el trabajo avanza en una rama `v2` y se integra a `main` por bloques completos (pasos 3, 4 y 5 juntos; luego cada tema), para que el sitio publicado siempre sea coherente.

## 12. Fuera de alcance

Buscador de texto completo sobre el cuerpo de los temas; ajustes globales de tema de color más allá del alternador actual; exportación de imágenes; cuentas o estado compartido.

## 13. Riesgos

| Riesgo | Mitigación |
|---|---|
| Arrastre en SVG con eventos de puntero en móvil | `useDrag` con `setPointerCapture` y `touch-action: none` en los manejadores; prueba manual en 375 px en cada laboratorio |
| Regenerar la ruta del dron al arrastrar es lento | `generateRoute` es puro y rápido (≈ 4 000 muestras); se recalcula al soltar, no durante el arrastre |
| `<dialog>` y foco en navegadores viejos | `<dialog>` tiene soporte amplio desde 2022; se verifica el cierre con Esc y el retorno del foco |
| Reescritura de contenido cambia hechos sin querer | Cada tema reescrito pasa la misma revisión de física y fuentes que en la v1 |
