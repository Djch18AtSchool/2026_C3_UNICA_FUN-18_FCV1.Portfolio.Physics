# Portafolio de Física I — Entrega Final (Temas 10 a 13 y «Qué aprendí»)

Diseño aprobado por Dylan en la conversación del 17 de noviembre de 2026, sección por sección (A a D, §2).
Entrega: **sábado 21 de noviembre de 2026, 23:59**, en Moodle, con la URL del sitio y la del repositorio
público; se revisa el estado de ambos a esa hora. El tiempo ordena el trabajo; no recorta alcance, calidad ni
diseño.

Consigna: `C:\Users\dylan\Downloads\Portafolio - Entrega Final (1).docx` (fuera de git; en WSL,
`/mnt/c/Users/dylan/Downloads/`). Investigación verificada (fuentes, números, código fijado a tag o commit,
trampas): `docs/superpowers/research/2026-11-17-{animaciones-resorte,sintesis-sonido,resonancia-estructural,enfriamiento-liquido,deteccion-caidas}.md`.
Material de clase (local, no se publica): `.reference/class-material/`, con el **Módulo 5, Oscilaciones**
(`05-oscilaciones.md`, en `https://fun-18-modulo5.netlify.app/`) y el **Módulo 6, Mecánica de fluidos**
(`06-mecanica-de-fluidos.md`) extraídos el 17 de noviembre; cobertura en `00-indice.md`.

## 1. Objetivo

Al terminar, el sitio tiene las **trece entradas** del curso y la sección de cierre **«Qué aprendí»**:

- Los Temas 10 a 13, con el formato y la calidad de los anteriores. Cada uno cumple los dos elementos
  obligatorios: el caso de uso (caso concreto que nombra producto, sistema o industria; el concepto como
  ecuación explícita; la justificación frente a alternativas no físicas) y el recurso del tipo prescrito, sin
  sustituciones. Apuntan a la banda Excelente: casos profundos y citados, un balance de qué se gana y qué cuesta
  modelar la física, recursos con datos reales bien citados y conexiones explícitas entre temas y con la clase.
- Los Temas 1 a 9 se vuelven a evaluar «con la exigencia de un trabajo terminado»: las observaciones del
  profesor sobre los Avances 1 y 2 quedan corregidas (§7).
- La portada deja de anunciar la Entrega Final como futura y termina con «Qué aprendí» (§5).

## 2. Decisiones de Dylan (17 de noviembre)

1. **Rama base:** la Entrega Final se construye **sobre la fase E** (`fase-e-laboratorio`, cascarón de una
   columna y tipografía), en la rama `entrega-final`. La fase E y la Entrega Final se integran juntas, cuando
   Dylan lo autorice (§10).
2. **Observaciones del profesor:** 16/16 en ambos avances; una corrección puntual en el Tema 7 y una
   recomendación general; se convierten en la tarea F (§7) y en una regla (§3).
3. **«Qué aprendí»:** al final de la **portada**, enlazada desde el menú, con un diagrama propio de los 13
   temas.
4. **Pares del mapa de conexiones:** Tema 7 + Tema 9 (momento lineal: un sobrevuelo es un choque elástico en
   el marco del planeta), Tema 6 + Tema 13 (energía con disipación: Bernoulli con pérdidas es el balance de
   energía por volumen, y la pérdida es calor, como el freno de fricción) y Tema 11 + Tema 12 (frecuencia
   natural: los armónicos son los modos naturales; resonar es excitar uno). Se evitó el ejemplo de la
   consigna (Tema 3 + Tema 8).
5. **Aplicación propia:** **detección de caídas en un reloj inteligente** (caída libre e impulso).
6. **Casos de uso** (recomendación de la investigación, aceptada): Tema 10, Motion (antes Framer Motion) con
   Apple como voz de diseño; Tema 11, la Web Audio API (`PeriodicWave`) y Chromium; Tema 12, **Klipper**
   (barrido de resonancia y filtro ZV), con Rhythm Nation como recuadro; Tema 13, el circuito de un rack de
   clase NVIDIA GB200 NVL72 con el CDU Google Project Deschutes (OCP) y la Modelica Buildings Library.
7. **Muestras del Tema 11:** flauta y clarinete **reales** de la University of Iowa (MIS), mi♭4.
8. **Valores fijados por Claude y aceptados en la aprobación** (⚙︎ en la conversación): símbolo **b** del
   amortiguamiento en los temas nuevos (el Tema 5 conserva *c*); «Interrumpir» en el Tema 10; «fases
   aleatorias» en el laboratorio del Tema 11 y el aliasing en «Qué deja fuera»; botón «velocidad real (×2/3)»
   y un segundo video corto del Millennium Bridge en el Tema 12; altura **y** en el Tema 13, con los
   preajustes de 24 servidores y de 44 puertos, y el punto de operación con la curva de bomba de Deschutes en
   su laboratorio.
9. **Organización:** tarea compartida primero; luego los cuatro temas en paralelo, cada uno en su worktree;
   dentro de cada tema, núcleo y recurso prescrito antes que el laboratorio (§9).

## 3. Reglas que siguen vigentes

Las del traspaso (`docs/superpowers/handoff/2026-10-31-avance-2-handoff.md`, «Decisiones vigentes» y
«Fase E»; la fase E manda donde se contradigan), en particular:

- Notación de libro de texto (Serway, Sears–Zemansky): g = 9,81 m/s², coma decimal en la prosa, fuerza normal
  `n`. Los literales de código se citan tal cual, con punto. **Todo símbolo entre `$…$`**, también en SVG
  (`MathText`); nombres accesibles con `mathTextToString` o `mathAriaLabel`; nunca la mininotación para una
  variable.
- Estructura por pasos: cuatro `Step`, cada uno con ecuación numerada (10.n…13.n), un `Why` con `fenomeno` y
  `ecuacion` y su figura a lo ancho de la columna; `UseCase`, `Callout` de clase, `Connections`, `Sources`.
- **Prosa ≤ 650 palabras por tema** (`MAX_PROSE_WORDS`); leyendas de dos o tres frases; los parámetros viven
  en tablas (`<DataTable id="…" />`, registro en `src/lib/tables/topics/<slug>.ts`, `precision` obligatoria).
- **Una fuente por número:** fuente abierta CONFIRMADA en la investigación o «(cálculo propio)» reproducible
  por código con pruebas. Lo NO CONFIRMADO no se afirma. `src/lib` no importa de `src/components`.
- Una sola insignia de recurso por tema (la figura del recurso prescrito); el resto, `showBadge={false}`.
- Colores con significado real, nunca por orden de serie; tokens con variante oscura y contraste comprobado.
- Simuladores ricos (reloj, línea de tiempo, lecturas, preajustes, ajustes, atajos, alternativa de teclado,
  movimiento reducido, velocidad de reproducción indicada) sobre `LabShell` de una columna (README,
  «Laboratorios por niveles», «Escala de tiempo y eventos», «Zoom y desplazamiento»).
- Medidas en la escala 4/8 (`scale.test.ts`; `pnpm run scale:report` en 0).
- **Modelo didáctico frente a producto real** (recomendación del profesor, Avance 1): cada parámetro de una
  tabla, un preajuste o un laboratorio dice si es el valor del producto (con su fuente) o un supuesto
  ilustrativo del modelo; nunca se presenta uno como el otro.
- Voz en primera persona. Claude redacta; Dylan revisa antes de que cuente como publicado: cada frase nueva va
  a una lista para él (§11).
- Commits en inglés, convencionales, solo con la identidad de Dylan y **sin línea de coautor ni de
  atribución**. No se toca el servidor del puerto 4321. **Ningún push a `main` sin el permiso explícito de
  Dylan para ese push.**

## 4. Tarea compartida (antes de los temas)

### 4.1 Registro de los temas

`src/consigna.ts` suma, en la fase 3, con los títulos exactos de la consigna:

| # | slug | título | shortTitle | recurso |
|---|---|---|---|---|
| 10 | `animaciones-resorte` | Spring animations: el resorte amortiguado detrás de las animaciones de iOS y de Framer Motion | Animaciones con resorte | simulación |
| 11 | `sintesis-sonido` | Síntesis de sonido: armónicos, timbre y el sintetizador | Síntesis de sonido | multimedia |
| 12 | `resonancia-estructural` | Resonancia estructural: Tacoma Narrows y por qué las tropas rompen el paso al cruzar un puente | Resonancia estructural | multimedia |
| 13 | `enfriamiento-liquido` | Enfriamiento líquido de un centro de datos: continuidad, caudal y Bernoulli | Enfriamiento líquido | visualización |

Con temas, la fase 3 deja de ser futura: la portada y la barra lateral muestran la Entrega Final con sus
cuatro temas y **ninguna sección conserva la insignia «Se publica con su consigna»**. Cambian
`tests/e2e/site-pages.spec.ts` (`FUTURE_PHASE_LABELS` vacío, «la portada muestra…», `RETIRED_SLUGS` y
`RETIRED_NAMES`), `navigation.spec.ts` (la insignia discontinua ya no aparece) y la tabla «Temas» del README.
Anterior y siguiente enlazan del Tema 9 al 10; el «siguiente» del Tema 13 lleva a «Qué aprendí» (`/#que-aprendi`). Mientras un tema no tenga su MDX, la
rama no se integra (la guardia «todo tema con archivo está publicado» sigue rigiendo).

### 4.2 Medios con análisis: `AnalyzedMedia`

`HapticVideo` y `useYouTubePlayer` del Tema 5 se generalizan en un componente compartido
`src/components/media/AnalyzedMedia.tsx`:

- **Fuente**, una de tres: `{ kind: 'youtube', id }` (lo de hoy, con `youtubeStub.ts` en las e2e),
  `{ kind: 'video', sources: [{ src, type }], poster, width, height }` (alojado en el sitio) o
  `{ kind: 'audio', sources: [{ src, type }] }`. `<video>`/`<audio>` con `controls`, `preload="metadata"`,
  sin reproducción automática.
- **Marcas**: `{ time, title, analysis }` como hoy (el análisis escrito bajo cada marca, con `$…$`); saltar a
  una marca mueve el medio y anuncia el título. Opcional por marca: `rate` (velocidad sugerida, para la toma
  filmada a 16 fps del Tema 12).
- **Velocidad**: en `kind: 'video'` y `'audio'`, un control de velocidad propio (`playbackRate`); el Tema 12
  lo usa como «velocidad real (×2/3)» (§6.3).
- **Accesibilidad**: nombre accesible del medio, marcas como lista de botones con su tiempo, foco visible,
  sin trampas de foco; los medios sin voz (Tacoma, las notas) declaran en texto qué se ve o se oye.
- **El Tema 5 migra** a `AnalyzedMedia` sin cambiar lo que se ve ni lo que dicen sus e2e (`control-haptico`,
  `glyphs`, `a11y`).

### 4.3 Medios alojados y datos reproducibles

- `public/media/<slug>/` con codificaciones que reproducen todos los navegadores: video en **WebM (VP9) y MP4
  (H.264)**, audio en **WebM (Opus) y M4A (AAC)**. Los originales grandes no entran en git (`media-raw/`,
  ya ignorado); el script los descarga y los regenera. Cada archivo publicado se cita con su fuente y su
  licencia en la página.
- `pnpm run data:harmonics` (Tema 11): descarga las dos muestras del MIS de Iowa, recorta, normaliza a
  −20 LUFS, codifica y calcula con **un FFT propio en TypeScript** (ventana de Hann, promedio de Welch,
  interpolación parabólica del pico; método de la investigación §4.1) las amplitudes de los armónicos, la
  forma de onda de tres periodos, el ataque y la simetría de media onda → `src/data/instrument-harmonics.json`.
  Las pruebas fijan los hechos que la página afirma (f₁, potencia impar/par, correlación de media onda,
  ataques).
- `pnpm run data:tacoma` (Tema 12): descarga el archivo de Commons, codifica WebM y MP4, y **mide el periodo
  de torsión cuadro a cuadro** (luminancia de una región que cruza el tablero en las tomas de cámara fija;
  método de la investigación §6.2) → `src/data/tacoma-torsion.json` con la serie, el periodo en el video y el
  corregido por 16/24 fps. Las pruebas fijan 0,19–0,20 Hz corregidos.
- Los scripts usan `ffmpeg` (disponible localmente; CI no los corre, como `data:cycles` y `data:voyager`).

### 4.4 Registros de las e2e y guardias

Lo de «Fase E», apartado 7, puntos 6 a 8, para cada laboratorio nuevo: `topicPages.ts` (`LABS`),
`lab-shell.spec.ts` (`MIGRATED_LABS` y primera pantalla a 1 280 × 800), `zoom-anchor.spec.ts` si hay zoom,
`lab-microinteractions.spec.ts`, `lab-preset-transition.spec.ts`, `glyphs.spec.ts` (`EXTRA_STATES`) y
`looseSymbols.test.ts` (exige `src/components/topics/<slug>/` y `src/lib/tables/topics/<slug>.ts`). Las
guardias que fallan abiertas se repasan a mano en la revisión de cada tema.

## 5. «Qué aprendí» (al final de la portada)

Sección `<section id="que-aprendi">` tras las de las tres entregas, con el título exacto **«Qué aprendí»**,
enlazada desde la barra lateral y desde el índice de la portada. El texto vive en un MDX
(`src/content/closing/que-aprendi.mdx`) para reutilizar `Equation`, `Cite` y `Sources` y contar palabras en
una prueba.

- **(a) El mapa de conexiones.** Un diagrama SVG propio con los 13 temas (número y título corto, agrupados
  por entrega), las conexiones `related` del sitio en trazo tenue y **los tres pares resaltados**, cada uno con
  el nombre de su principio sobre el enlace. Accesible: cada par como texto, el diagrama con su descripción.
  Debajo, un párrafo por par (≤ 150 palabras), con su ecuación, el enlace a los dos temas y el módulo de clase:
  - **Tema 7 + Tema 9 — momento lineal:** en el marco del planeta, el sobrevuelo es un choque elástico
    (e = 1): la rapidez relativa de entrada y de salida es la misma; vista desde el Sol, la sonda gana lo que
    el planeta pierde (Módulo 3, colisiones).
  - **Tema 6 + Tema 13 — energía con disipación:** Bernoulli es el teorema trabajo-energía por unidad de
    volumen (así lo presenta el Módulo 6); el término de pérdidas $h_L$ es el mismo papel que el calor de
    fricción del frenado: energía que no vuelve (Módulos 2 y 6).
  - **Tema 11 + Tema 12 — frecuencia natural:** los armónicos de un tubo son sus modos naturales; la
    resonancia y la autoexcitación son energía que entra a la frecuencia de un modo (Módulo 5).
- **(b) La aplicación propia: detección de caídas** (≈ 300 palabras, media página): en caída libre el
  acelerómetro de un reloj lee $|a| \approx 0$; desde la altura $h$ de la muñeca la caída dura
  $t = \sqrt{2h/g}$ y llega a $v = \sqrt{2gh}$; el impacto cambia el momento en un $\Delta t$ muy corto,
  $J = \Delta p = \bar F \Delta t$, y deja un pico de varios $g$; luego, quietud. La secuencia física
  distingue una caída de aplaudir o golpear la mesa, que un umbral fijo confundiría; qué cuesta (caídas
  lentas sin fase de caída libre, la muñeca no cae como el cuerpo). Fuentes de Apple/Google y artículos
  abiertos de la investigación `2026-11-17-deteccion-caidas.md`. No se implementa: se argumenta.
- Pruebas: los títulos exactos, el enlace desde el menú, los seis enlaces a temas, los límites de palabras,
  axe en móvil y escritorio, y que el diagrama dibuje 13 nodos y 3 pares resaltados.

## 6. Los cuatro temas

Para cada tema: MDX `src/content/topics/<slug>.mdx` (frontmatter con `resourceType`, `useCase`, `sources`,
`related` con al menos dos temas del sitio, `classRefs` con al menos una referencia a clase, `updated`),
núcleo puro en `src/lib/physics/`, datos con fuente en `src/lib/data/`, tablas, figuras de los pasos y
laboratorio en `src/components/topics/<slug>/`, e2e propia. El detalle (fuentes con línea, números,
ecuaciones, trampas) está en la nota de investigación de cada tema; este spec fija las decisiones.

### 6.1 Tema 10 — Spring animations (simulación)

- **Caso de uso:** Motion, generador `spring` (`packages/motion-dom/src/animation/generators/spring.ts`, tag
  `v14.14.0`, commit `f95ab94`, MIT): las tres soluciones analíticas por régimen, los valores por omisión
  (k = 100, b = 10, m = 1; `x`/`y` 500/25; `scale` hacia 0 crítico con `2 * Math.sqrt(550)`), los umbrales de
  reposo y la redirección con velocidad heredada. Apple (WWDC23 «Animate with springs», documentación de
  `Spring`) da el porqué con citas: la velocidad se conserva al interrumpir y la duración se vuelve
  «perceptual». Contraste: Android Jetpack y Material 3 (de duraciones con Bézier a tokens con k y ζ). Qué
  cuesta: no hay una duración, umbrales empíricos, parámetros ficticios, trampas numéricas (#1207).
  **Evidencia propia:** con las fórmulas del libro se reproducen las tres pruebas de Motion (cálculo propio,
  con prueba unitaria).
- **Pasos y ecuaciones** (investigación §5): (1) Hooke sin amortiguar, $m\ddot u = -k u$,
  $\omega_0 = \sqrt{k/m}$, nunca se detiene; (2) amortiguamiento viscoso $m\ddot u + b\dot u + k u = 0$,
  $\zeta = b/(2\sqrt{km})$, $b_c = 2\sqrt{km}$ (la del Módulo 5), $dE/dt = -b v^2$; (3) los tres regímenes con
  condiciones iniciales generales (lo que está en el código), sobrepaso $M_p$ y asentamiento (no hay una
  duración); (4) lo que hace una biblioteca real: redirección con $u_0, v_0$ heredados, parametrización
  perceptual $k = m(2\pi/d)^2$, $b = 4\pi m(1-\beta)/d$, criterio de reposo.
- **Recurso (simulación prescrita):** una **tarjeta de interfaz** que se anima entre dos posiciones, con
  controles de **rigidez $k$**, **amortiguamiento $b$** y masa $m$; lecturas de $\zeta$ y del régimen
  (subamortiguado, crítico, sobreamortiguado), $x$, $v$, sobrepaso y asentamiento; gráfica $x(t)$ con la banda
  de reposo; reloj, línea de tiempo arrastrable (la solución analítica se muestrea en cualquier $t$). Botón
  **«Interrumpir»**: cambia el destino a mitad de camino; una segunda tarjeta animada con una curva de
  duración fija (Bézier) recorre lo mismo y su velocidad salta, la del resorte no. Preajustes **solo con
  valores CONFIRMADOS**: Motion por omisión (100/10/1, $\zeta = 0{,}5$), Motion `x`/`y` (500/25), crítico
  (550 y $2\sqrt{550}$), el ejemplo documentado de Apple (0,5 s y rebote 0,3 → 157,9 y 17,6) y un
  sobreamortiguado ilustrativo. Los presets `.smooth`/`.snappy` de SwiftUI entran solo si su duración queda
  CONFIRMADA (hoy es una inferencia). «Qué deja fuera»: la integración numérica de react-spring y el Tema 5.
- **Tablas:** preajustes (k, b, m, ζ, $M_p$, $t_s$, fuente); conversión de Apple.
- **Conexiones:** Tema 5 (el mismo oscilador, `criticalDamping`, en el laboratorio del gatillo), Tema 7
  (`bounce` de react-spring como restitución contra el destino), Tema 12 (el mismo oscilador, forzado).
  Reciprocidad: el Tema 7 suma el 10 en `related`.

### 6.2 Tema 11 — Síntesis de sonido (multimedia con análisis)

- **Caso de uso:** la Web Audio API del W3C (Recomendación del 2021-06-17): `OscillatorNode` y
  `createPeriodicWave`, cuya §1.28.4 escribe la suma de armónicos tal cual y §1.28.6 las recetas de cuadrada,
  diente de sierra y triangular; la implementación de Chromium (`periodic_wave_handler.cc`, tag
  `160.0.8168.1`, commit `22cf9aec`): 36 tablas por tercio de octava que quitan los armónicos sobre Nyquist
  (576 KiB por receta, cálculo propio). Justificación: cualquier timbre a cualquier nota con unas pocas
  amplitudes, frente a guardar una muestra por nota e intensidad. Qué cuesta: el sonido real tiene ataque,
  ruido e inarmonicidad; memoria frente a CPU; aliasing. Recuadros: Chrome Music Lab «Harmonics» (un oscilador
  por armónico) y el órgano Hammond (patente de 1934).
- **Pasos y ecuaciones** (investigación §5): (1) tono puro $y = A\sin(2\pi f t)$: tono y sonoridad, pero no
  timbre; (2) modos normales: tubo abierto $f_n = n f_1$ (todos) y cerrado-abierto (solo impares); (3)
  superposición $y(t) = \sum A_n \sin(2\pi n f_1 t + \varphi_n)$, la ecuación de la API, y la simetría de media
  onda $y(t + T/2) = -y(t)$ con solo impares; (4) envolvente y ataque (`setTargetAtTime`), inarmonicidad y el
  oído frente a la fase (Helmholtz, con su salvedad).
- **Recurso (multimedia prescrito):** dos `AnalyzedMedia` de **audio**, flauta y clarinete del MIS de Iowa,
  ambos mi♭4 *ff* sin vibrato (altura real; f₁ ≈ 310 Hz, diferencia ≤ 1,3 cents), cada uno con: su **forma de
  onda** (tres periodos, eje en ms), su **contenido armónico** (barras por $n$ = 1…10, en dB relativos al
  fundamental) y marcas en el **ataque** y en la **parte sostenida** con el análisis escrito. Un análisis
  conjunto dice qué diferencia produce qué: impares 25,7 dB sobre pares en el clarinete (−0,7 dB en la
  flauta) → simetría de media onda (correlación 0,992 frente a −0,08); ataques de 0,40 s y 0,12 s. Ejes
  rotulados, unidades y la fuente con el texto de permiso del MIS («may be downloaded and used for any
  projects, without restrictions»). Se publica la salvedad de Wolfe: el espectro no basta para identificar un
  instrumento, salvo en tubos cerrados.
- **Laboratorio:** síntesis aditiva con Web Audio: 10 amplitudes, $f_1$ variable (el timbre se conserva al
  cambiar de nota), preajustes (seno, cuadrada, diente de sierra, triangular y las **recetas medidas** de la
  flauta y del clarinete), forma de onda y espectro recalculados en vivo, interruptor **«fases aleatorias»**
  (la forma cambia, el sonido casi no). Reproducción solo tras un gesto, volumen inicial seguro y botón de
  silencio. «Qué deja fuera»: aliasing, ruido de soplido, vibrato.
- **Tablas:** armónicos medidos de ambas muestras; recetas clásicas; datos de las muestras (archivo, f₁,
  frecuencia de muestreo, duración, licencia).
- **Conexiones:** Tema 5 (el actuador «like a small speaker», $F_0\sin\omega t$), Tema 10 (la envolvente
  exponencial es la del oscilador amortiguado), Tema 12 (par de «Qué aprendí»). Reciprocidad: el Tema 5 suma el
  11 en `related`.

### 6.3 Tema 12 — Resonancia estructural (multimedia con análisis)

- **Caso de uso:** Klipper (firmware de impresoras 3D, GPLv3, tag `v0.13.0`, commit `61c0c8d`): mide la curva
  de resonancia con un barrido de 5 a 135 Hz (`resonance_tester.py` L49-L78) y aplica el filtro **ZV**, dos
  impulsos separados medio periodo amortiguado (`shaper_defs.py` L17-L23), que es «romper el paso» hecho a
  propósito. Qué cuesta: solo cancela cerca de la frecuencia medida (±5 %), supone ζ = 0,1, redondea esquinas,
  y la frecuencia cambia si las correas se aflojan. **Recuadro:** «Rhythm Nation» y CVE-2022-38392 (resonancia
  forzada arreglada con un filtro de audio; «much less expensive to fix the problem in software»).
- **Enfoque de Tacoma (decisión central, aprobada):** el paso 2 muestra la resonancia forzada (tropas, Rhythm
  Nation, Klipper); el paso 3, la sincronización de peatones (Millennium Bridge); el paso 4 explica Tacoma
  como **autoexcitación a la frecuencia natural** (amortiguamiento aerodinámico negativo), no como resonancia
  con los vórtices (0,85 Hz frente a 0,20 Hz). La frase puente es de Billah y Scanlan (1991): con impulsos que
  provienen del propio movimiento, «It would appear not to contradict the qualitative definition of
  resonance».
- **Pasos y ecuaciones** (investigación §5): (1) $f_0 = \frac{1}{2\pi}\sqrt{k/m}$, medir es contar ciclos;
  (2) $m\ddot x + b\dot x + kx = F_0\cos\omega t$, $A(\omega)$, $A_{\max} = (F_0/k)/(2\zeta)$, energía por
  ciclo; (3) $N$ pies con fases: al paso $N F_1$, rompiendo el paso $\sim\sqrt N F_1$; el paso militar de
  2,0 Hz en el rango de riesgo de Sétra (1,7–2,1 Hz); el filtro ZV; el Millennium Bridge ($F = k_p N V$,
  $N_L = 8\pi\zeta f M/k_p$, amortiguamiento de < 1 % a 15–20 %); (4) autoexcitación: $\zeta_\text{neto}(U)$
  y $\Delta E/E \approx -4\pi\zeta_\text{neto}$ por ciclo.
- **Recurso (multimedia prescrito):** `AnalyzedMedia` de **video alojado**: `File:Tacoma Narrows Bridge
  destruction.ogv` (Wikimedia Commons, dominio público por dedicación de los Prelinger Archives; Barney Elliott
  y Harbine Monroe, 7 de noviembre de 1940), en WebM y MP4. Marcas con su análisis escrito que identifican
  (consigna): la **frecuencia natural** (0,20 Hz, 12 ciclos/min de Farquharson; en el video se ve a 0,29 Hz
  porque las tomas de Elliott, filmadas a 16 fps, corren a 24), la **fuente de la excitación** (viento casi
  constante de 42 mph; no los vórtices) y **por qué crece la amplitud** (cada ciclo entra más energía de la que
  sale); además la línea central del tablero como nodo de la torsión. Botón **«velocidad real (×2/3)»** en las
  tomas de 16 fps. Figura propia: **la serie medida cuadro a cuadro** (`data:tacoma`) con el periodo corregido
  (≈ 5,2 s) frente a los 5 s cronometrados en 1940. Segundo medio, después del principal: un video corto del
  Millennium Bridge (YouTube, con dos marcas: el balanceo lateral y el paso sincronizado), con su fuente.
- **Laboratorio:** oscilador forzado con tres modos: **«Barrido»** (la curva $A(\omega)$ se traza en vivo, con
  el control de $\zeta$), **«Tropa»** ($N$ soldados al paso o rompiendo el paso, fases al azar; la amplitud del
  puente) y **«Filtro ZV»** (un empujón solo frente a dos en contrafase). Números con fuente o cálculo propio.
- **Tablas:** frecuencias y datos del Tacoma (informe federal de 1941, Billah y Scanlan); Millennium Bridge
  (Dallard et al. 2001); rangos de Sétra; medición propia del video.
- **Conexiones:** Tema 10 (el mismo oscilador, libre), Tema 11 (par de «Qué aprendí»), Tema 5 (la vibración
  $F_0\sin\omega t$ del paso 1 es una fuerza periódica sobre el dedo). Reciprocidad: el Tema 5 suma el 12 en
  `related`.

### 6.4 Tema 13 — Enfriamiento líquido (visualización de datos)

- **Caso de uso:** el dimensionado hidráulico del circuito de un rack de clase NVIDIA GB200 NVL72 alimentado
  por el CDU **Google Project Deschutes** (especificación abierta de OCP), con un modelo de red de flujo; el
  código abierto citable es la **Modelica Buildings Library v14.0.0** (LBNL, `Buildings.Fluid.DataCenters`:
  caída de cada pieza con $\Delta p \propto \dot m^n$, fricción de tuberías, bomba a $\Delta p$ fija).
  Contrastes: NVIDIA y la Universidad de Texas en Arlington (Shahi et al., 2023) midieron el caudal en cada
  puerto de un manifold y el Cv de catálogo del conector falló; EPANET (continuidad en nodos, Darcy–Weisbach
  en tramos). Qué se gana: el caudal mínimo del servidor más lejano sin sobredimensionar la bomba (con
  $\Delta p \propto Q^{1,9}$, la potencia crece como $Q^{2,9}$). Qué cuesta: propiedades del fluido, pérdidas
  locales difíciles de estimar, hay que medir.
- **Pasos y ecuaciones** (investigación §6): (1) continuidad $Q = A_1 v_1 = A_2 v_2$ y en los nodos (Módulo 6);
  (2) Bernoulli con $\rho g y$ (Módulo 6; altura **y**): el conector acelera y la presión baja; sin pérdidas,
  la presión vuelve al cerrar el lazo; (3) pérdidas: la ecuación generalizada de la clase con $h_L$, y
  Darcy–Weisbach y $K$ como **extensión declarada** (la clase solo los nombra), Re con 2300/4000; (4) ramas en
  paralelo, $\Delta p_i = R_i Q_i^n$, retorno directo frente a invertido, cómo se garantiza el caudal mínimo.
  El caudal que necesita un servidor sale de la regla de **1,5 L/min por kW** como dato de OCP, sin
  termodinámica.
- **Recurso (visualización prescrita):** (a) **$v(x)$ y $p(x)$ a lo largo del circuito** (CDU → tubería
  principal → manguera de rack → manifold → manguera 3/8″ → UQD → placa fría → retorno), con la franja de
  secciones dibujada debajo y la $p$ ideal de Bernoulli superpuesta a la real con pérdidas; ejes con unidades
  (m, m/s, kPa) y una tabla con **todos los parámetros declarados** y su fuente (PG25 a 40 °C de Melinder vía
  LBNL; geometría del manifold MGX; UQD04 de OCP v2.0.0; Deschutes; RD109 de Schneider con el desglose de GF).
  Validación propia: 1,83 bar calculados frente a 1,98 bar publicados (7,5 %). (b) $v$ frente a $A$ con las
  hipérbolas $Q = Av$. (c) El caudal por servidor con retorno directo y con retorno invertido, contrastado con
  los caudales medidos de Shahi et al. (2023).
- **Laboratorio:** caudal de la bomba, diámetro de la manguera, número de servidores y tipo de retorno →
  $v(x)$, $p(x)$ y el caudal por servidor recalculados; el punto de operación sobre la curva de bomba de
  Deschutes. Preajustes: **24 servidores** (valida contra GF; el UQD04 va a 7,19 L/min, sobre sus 6,44
  nominales, y se dice) y **44 puertos** (MGX, UQD04 dentro de su caudal nominal).
- **Tablas:** fluido; geometría; conectores y placa fría; desglose de pérdidas calculado frente al publicado.
- **Conexiones:** Tema 6 (par de «Qué aprendí»), Tema 4 (fricción; aquí, viscosa). Reciprocidad: el Tema 6 suma
  el 13 en `related`.

## 7. Tarea F — observaciones del profesor sobre los Avances 1 y 2

Retroalimentación recibida el 17 de noviembre: **16/16 en ambos avances**.

- **Avance 1:** sin correcciones. Recomendación general: «Mantén esa precisión al distinguir los parámetros
  de un modelo didáctico de los valores del producto real». Pasa a regla para los temas nuevos (§3).
- **Avance 2, una corrección en el Tema 7:** «la fórmula de N debe excluir el impacto que cae exactamente en
  el umbral. Con v0=4 m/s, vth=1 m/s y e=0,5 hay dos rebotes; la expresión con piso más uno daría tres. Tu
  modelo ya contempla esa igualdad: explicítala también en la explicación».
  - El código ya cumple: `bouncesAboveThreshold` (`src/lib/physics/collision.ts:121`) cuenta los impactos
    $e^n v_0$ **estrictamente** sobre $v_\text{th}$ y su prueba fija `bouncesAboveThreshold(4, 0.5, 1) = 2`.
  - Lo que cambia: la ecuación (7.3) de `src/content/topics/coeficiente-restitucion.mdx:290` pasa de
    $N = \lfloor \ln(v_0/v_\text{th})/\ln(1/e) \rfloor + 1$ a
    $N = \lceil \ln(v_0/v_\text{th})/\ln(1/e) \rceil$ (para $v_0 > v_\text{th}$ y $0 < e < 1$): coincide
    con la anterior cuando el cociente no es entero y no cuenta el impacto que cae justo en el umbral cuando
    lo es. El significado de $N$ en `symbols` dice «estrictamente por encima del umbral; un impacto
    exactamente en $v_\text{th}$ no rebota», y el `Why` del paso lo explicita con el ejemplo del profesor
    (impactos de 4, 2 y 1 m/s: el tercero cae en el umbral, $N = 2$), dentro de las 650 palabras.
  - Los comentarios de `collision.ts:116` y `bounceScene.ts:303` se alinean con la forma del techo; una prueba
    une la fórmula publicada con el código (techo = `bouncesAboveThreshold` en una rejilla de casos, más el
    caso exacto).
  - La frase nueva va a la lista de textos de Dylan (§11).

Va en su propio worktree (`entrega-final-f`), en paralelo con los temas: toca archivos disjuntos.

## 8. Pruebas y puerta

- **Unitarias** (≥ 98 % de sentencias en total; archivos nuevos ≥ 80 %): núcleos de física (regímenes y
  reproducción de las pruebas de Motion; armónicos, recetas y simetría; respuesta forzada, suma de fases y ZV;
  continuidad, Bernoulli, Darcy–Weisbach, reparto en paralelo y validación contra GF), datos generados (hechos
  que la página afirma), tablas, `AnalyzedMedia`, «Qué aprendí» (palabras, enlaces), `topics.test.ts` (prosa
  ≤ 650, pasos, `related`, `classRefs`), `looseSymbols.test.ts`.
- **E2E** por tema y en las suites compartidas (navegación, `site-pages`, `a11y` con axe en móvil y escritorio,
  `responsive`, `glyphs`, `lab-shell`, `lab-controls`, `measures`, microinteracciones y transición de
  preajustes), con `youtubeStub.ts` para YouTube y sin reproducir audio real.
- **Puerta antes de integrar:** `pnpm run check && pnpm run test:cov && pnpm run build && E2E_PORT=4322 pnpm run
  e2e` (la e2e por tandas con `--workers=1` o `2`; en worktrees, puertos 4336–4339).
- **Revisión:** cada tarea con revisión independiente y ronda de correcciones; al final, una revisión de toda la
  rama y una pasada visual a 360 y 1 280 px, claro y oscuro.

## 9. Orden de trabajo y calendario

| Cuándo | Qué |
|---|---|
| Martes 17 | Spec y plan aprobados; arranca la tarea compartida (§4) y los núcleos de física de los cuatro temas (archivos disjuntos). |
| Miércoles 18 | Tarea compartida integrada; los cuatro temas en paralelo (núcleo → recurso prescrito → MDX y tablas); tarea F en paralelo si llegó la retroalimentación. |
| Jueves 19 | Laboratorios y figuras de los pasos; «Qué aprendí»; revisiones por tarea. |
| Viernes 20 | Integración en `entrega-final`, revisión final, pasada visual, puerta completa; lista de textos para Dylan. |
| Sábado 21 | Lectura de Dylan y últimos arreglos; push a `main` **solo con su permiso**; CI y Pages en verde; páginas vivas verificadas; entrega en Moodle antes de las 23:59. |

Worktrees: `entrega-final-base`, `entrega-final-tema-10` … `-13`, `entrega-final-f`; rebase con avance rápido
sobre `entrega-final` (historia lineal). Los archivos compartidos (`src/components/lab/**`, `ui/**`,
`charts/**`, `media/**`, `src/styles/**`, `src/consigna.ts`, suites e2e compartidas) solo los toca la tarea
compartida.

## 10. Integración y publicación

La rama `entrega-final` lleva la fase E más la Entrega Final. Se integra con avance rápido
(`git push origin entrega-final:main`) **solo cuando Dylan lo autorice para ese push**, después de la puerta y
de su lectura. Tras el push: CI y despliegue de Pages en verde y las 13 páginas de tema y la portada responden
200. Luego, si Dylan quiere, las etiquetas pendientes (`avance-1`, `avance-2`, `entrega-final`).

## 11. Textos para Dylan

Todo texto nuevo o cambiado (prosa de los cuatro temas, leyendas, notas de laboratorio, análisis escritos de
los medios, «Qué aprendí», correcciones de la tarea F) va a `docs/superpowers/review/2026-11-20-textos-entrega-final.md`
con archivo y línea, antes → después. «Qué aprendí» (b) cuenta como su autoría: el borrador es de Claude y
Dylan lo hace suyo.

## 12. Riesgos y decisiones abiertas

- **Peso de los medios:** video ≈ 2,5 min a 640 × 480 y dos audios cortos; se mide el tamaño final y se usa
  `preload="metadata"`; ningún medio se descarga entero al cargar la página.
- **Tema 10:** la documentación de Motion contradice su código (se cita el código); la diapositiva de
  conversión de WWDC23 tiene una errata conocida (se usa el ejemplo de la documentación).
- **Tema 11:** el MIS anuncia 24/96, pero los archivos son de 44,1 kHz con canales idénticos (se dice tal cual);
  nombres de nota en altura real (Wolfe usa altura escrita).
- **Tema 12:** la historia de la licencia del metraje (vendido a Paramount; el ítem de Internet Archive ya no
  es público): se cita la dedicación de Prelinger tal como la registra Commons. Broughton (11 o 12 de abril
  de 1831) y Angers (al paso o no) se citan con la discrepancia o no se afirman. No hay fuente primaria de una
  orden del ejército británico de romper el paso: no se afirma.
- **Tema 13:** NVIDIA no publica el caudal por bandeja; la caída de 1,2 bar de la placa fría es un valor de
  diseño de GF, no una curva medida (se dice).
- **Abiertas para Dylan** (con valor por omisión, no bloquean): alinear el Tema 5 a *b* (hoy *c*); la frase de
  conexión recíproca en prosa de los temas anteriores (solo si cabe en 650 palabras recortando frases de
  Claude, como R32); integrar las decisiones abiertas 70 a 78 de la fase E antes de publicar.
