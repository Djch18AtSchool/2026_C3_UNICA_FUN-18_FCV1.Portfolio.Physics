# E4 · Propuestas para descargar las páginas (sin bajar calidad ni alcance)

Solo propuestas: no se editó ningún archivo del repo (salvo este informe y sus capturas en `.superpowers/`, fuera de git), sin commits, sin push, sin subagentes y sin tocar el 4321. 17 de noviembre de 2026, rama `fase-e-laboratorio`, HEAD `d7fec8d`.

**Medios.** Copia limpia con `git archive d7fec8d` en el scratchpad (`…/bd901b72-…/scratchpad/e4/`), `pnpm install --frozen-lockfile`, git desechable con la fecha de `d7fec8d`, `pnpm run build` (11 páginas) y `astro preview` en `127.0.0.1:4420`, detenido por su PID (534228) al terminar. Chromium headless (Playwright 1.64) a 1 280 × 900 y 360 × 800, tema claro, con toda la página recorrida para hidratar cada isla. Scripts y datos crudos: `…/scratchpad/e4-tools/` (`measure.mjs`, `m-1280.json`, `m-360.json`, `dups.js`, `proposals.cjs`, `render.cjs`, `mock.mjs`, `mock-*.json`). Las palabras ahorradas las calcula `render.cjs` sobre el texto actual y el propuesto (una fórmula `$…$` cuenta como 1), no a ojo.

**Capturas** (`shots/E4/`, las miré antes de afirmar): `t<N>-<ancho>-pagina.png` (página entera) y `t<N>-<ancho>-lab.png` (la figura del laboratorio) de los nueve temas a 1 280 y 360; maquetas en `shots/E4/mock/`. En las capturas de laboratorio a 1 280 la barra pegajosa del tema tapa una franja (no es un defecto de la página: es la captura de elemento con la barra visible); en las maquetas la oculté.

## 0. Resumen

- **Ahorro visible si se aceptan:** **A = 376** palabras (solo texto seguro de los temas); **A + B = 1 184** (de ellas 447 son la fecha de consulta repetida en las fuentes, 54 la cabecera y 68 las notas de clase agrupadas; 239 son texto de los temas); **A + B + C = 1 655**. Además, 108 palabras menos dentro de desplegables cerrados. Sobre 23 966 palabras visibles en los nueve temas, A + B + C es un 6,9 %; sin lo que toca a la lista de fuentes (E4-G-1), 1 208 de 21 498, un 5,6 %. El efecto en pantalla es mayor que en palabras: en las maquetas, el Tema 5 baja 457 px a 1 280 y 1 043 px a 360; el Tema 8, 754 y 2 106 px.
- **Los tres temas más saturados** (palabras visibles sin la lista de fuentes): **T5 Háptico 2 836**, **T8 Ruedas 2 825**, **T4 Llantas 2 546**. T6 y T9 son los que más crecieron en B–D y concentran el texto *del laboratorio* (446 y 333 palabras, más 594 y 334 cerradas).
- **Cinco propuestas de mayor valor:** E4-5-1 (análisis del video en desplegables, la de las 4:15 abierta: −266 visibles; C), E4-G-1 (fecha de consulta una vez por lista: −447 en los nueve, −131 en T8; B), E4-4-1 (pie de la figura 4.3 de 163 palabras, la comparación con MUR a un desplegable: −97; C), E4-9-1 + E4-9-3 (T9: nota de cámara rápida y tabla «modelo plano / dato» que repiten la insignia y las lecturas: −64; A y B), E4-6-1 + E4-6-2 (T6: notas del flujo de potencia, −55; A y B).
- **No se propone** quitar ninguna fuente, cifra citada, figura, tabla, paso ni control físico. Las propuestas C que quitan un control lo hacen solo cuando hay otro idéntico a la vista (T3, T4, T5). Ninguna toca la prosa salvo para *bajarla* (los recuadros de clase), así que el tope de 650 queda igual o más holgado.

## 1. Qué se midió y dónde se ve saturado

### 1.1 Palabras visibles por tipo (1 280 px)

Texto visible = nodos de texto con `checkVisibility()`, fuera de `.sr-only`, del cajón y de los `<details>` cerrados; cada fórmula KaTeX cuenta 1. «Cerrado» son las palabras dentro de «Cómo se usa» y «Qué deja fuera el modelo». La última fila es el contador del sitio (`readingStats`): la prosa está dentro de 650 en los nueve.

| Tipo | T1 | T2 | T3 | T4 | T5 | T6 | T7 | T8 | T9 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Prosa de los pasos (párrafos) | 148 | 172 | 134 | 156 | 129 | 191 | 191 | 166 | 204 |
| Títulos de paso y sección | 27 | 24 | 19 | 27 | 16 | 35 | 27 | 27 | 31 |
| «Por qué» (fenómeno + ecuación) | 176 | 204 | 241 | 244 | 239 | 231 | 229 | 264 | 189 |
| Leyendas de ecuaciones («donde…») | 73 | 47 | 81 | 175 | 95 | 99 | 166 | 140 | 125 |
| Pies de figura (sin el laboratorio) | 281 | 151 | 375 | 433 | 463 | 280 | 199 | 292 | 317 |
| Líneas «Fuente:» de figuras y tablas | 91 | 72 | 120 | 316 | 194 | 176 | 182 | 228 | 144 |
| Texto dentro de figuras (rótulos, leyendas, video) | 306 | 141 | 206 | 205 | 589 | 373 | 261 | 419 | 417 |
| Tablas (celdas y pie) | 150 | 79 | 213 | 100 | 185 | 120 | 236 | 385 | 135 |
| Laboratorio · pie + fuente | 129 | 58 | 88 | 142 | 112 | 60 | 51 | 49 | 79 |
| Laboratorio · lienzo (rótulos, insignias) | 53 | 41 | 43 | 38 | 42 | 51 | 28 | 42 | 66 |
| Laboratorio · mando (parámetros + escenario) | 26 | 15 | 62 | 25 | 25 | 23 | 27 | 30 | 22 |
| Laboratorio · nota del preajuste | 0 | 40 | 0 | 0 | 17 | 38 | 65 | 57 | 18 |
| Laboratorio · lecturas | 28 | 18 | 23 | 23 | 23 | 49 | 22 | 55 | 34 |
| Laboratorio · gráficas de apoyo | 0 | 0 | 0 | 51 | 35 | 95 | 0 | 33 | 0 |
| Laboratorio · notas del lienzo (leyendas y párrafos) | 16 | 0 | 60 | 0 | 82 | 122 | 64 | 26 | 106 |
| «Cómo se usa» (cerrado) | 114 | 105 | 153 | 19 | 38 | 359 | 83 | 154 | 160 |
| «Qué deja fuera el modelo» (cerrado) | 125 | 110 | 43 | 101 | 199 | 235 | 57 | 62 | 174 |
| Caso de uso | 255 | 270 | 192 | 175 | 222 | 205 | 194 | 235 | 237 |
| Recuadro de clase | 98 | 50 | 106 | 107 | 88 | 61 | 80 | 52 | 84 |
| Conexiones (texto + listas + notas de clase) | 165 | 149 | 182 | 238 | 189 | 144 | 227 | 244 | 207 |
| Lista de fuentes | 121 | 113 | 117 | 193 | 215 | 242 | 463 | 706 | 298 |
| **Visible total** (fórmula = 1) | **2234** | **1749** | **2334** | **2739** | **3051** | **2679** | **2843** | **3531** | **2806** |
| Visible sin la lista de fuentes | 2113 | 1636 | 2217 | 2546 | 2836 | 2437 | 2380 | 2825 | 2508 |
| De ello, en el laboratorio (pie incluido) | 260 | 180 | 284 | 287 | 344 | 446 | 265 | 300 | 333 |
| Cerrado en desplegables | 239 | 215 | 196 | 120 | 237 | 594 | 140 | 216 | 334 |
| Fórmulas visibles | 146 | 104 | 116 | 142 | 127 | 116 | 131 | 119 | 136 |
| Prosa MDX (contador del sitio, ≤ 650) | 630 | 629 | 631 | 633 | 623 | 633 | 629 | 646 | 642 |
| Texto de props del MDX (contador del sitio) | 763 | 450 | 804 | 1038 | 1546 | 726 | 752 | 998 | 704 |
| Visible a 360 px | 2146 | 1725 | 2314 | 2689 | 3021 | 2640 | 2825 | 3503 | 2784 |

### 1.2 Estructura, cabeceras y controles

| Tema | Bloques antes del 1.er laboratorio | Laboratorio empieza en (px, 1 280 / 360) | Alto de página (1 280 / 360) | Alto del laboratorio (1 280 / 360) | Cabecera del tema | Cabecera del laboratorio | Controles a la vista (lienzo/transporte/parámetros/escenario/gráficas) | En el cajón |
|---|---|---|---|---|---|---|---|---|
| T1 | 22 (5 p, 4 heading, 4 equation, 4 why, 3 figure, 2 table) | 6215 / 6621 | 13268 / 14595 | 1622 / 1595 | 11 | 2 | 22 (7/6/4/4/0) | 4 |
| T2 | 21 (5 p, 4 heading, 4 equation, 4 why, 3 figure, 1 table) | 5290 / 6044 | 9296 / 11931 | 1183 / 1371 | 11 | 2 | 21 (7/4/4/5/0) | 6 |
| T3 | 24 (5 p, 4 heading, 4 equation, 4 why, 4 figure, 3 table) | 7327 / 8333 | 11385 / 14422 | 1480 / 1887 | 11 | 2 | 18 (4/4/5/4/0) | 2 |
| T4 | 23 (5 p, 4 heading, 4 equation, 4 why, 4 figure, 2 table) | 7193 / 8916 | 12673 / 16828 | 1527 / 1704 | 11 | 2 | 15 (1/0/4/6/3) | 0 |
| T5 | 23 (5 p, 4 heading, 4 equation, 4 why, 4 figure, 2 table) | 7026 / 8585 | 12387 / 16777 | 1593 / 1983 | 11 | 2 | 16 (3/0/4/6/2) | 0 |
| T6 | 23 (5 p, 4 heading, 4 equation, 4 why, 4 figure, 2 table) | 7432 / 8903 | 12747 / 16778 | 2364 / 2930 | 11 | 2 | 22 (0/4/4/6/7) | 2 |
| T7 | 21 (5 p, 4 heading, 4 equation, 4 why, 3 figure, 1 table) | 5885 / 7614 | 13614 / 19301 | 1418 / 2015 | 11 | 2 | 14 (1/4/4/4/0) | 11 |
| T8 | 23 (5 p, 4 heading, 4 equation, 4 why, 4 figure, 2 table) | 7323 / 8914 | 15212 / 22485 | 2074 / 2399 | 11 | 2 | 22 (4/4/4/6/3) | 3 |
| T9 | 24 (6 p, 4 heading, 4 equation, 4 why, 4 figure, 2 table) | 7809 / 9732 | 12810 / 17707 | 1689 / 2438 | 11 | 2 | 16 (5/4/4/2/0) | 3 |

Columnas: «Bloques» = hijos visibles de `.topic-body` y de cada `Step` antes de la tarjeta del primer laboratorio (siempre en el paso 4, así que son los pasos 1–3 enteros más el arranque del 4). «Cabecera del tema» = miga (3) + título + concepto + ficha (insignia, minutos, fecha) + 3 acciones; «del laboratorio» = título + engranaje (E1 la dejó en una fila en los nueve). «Controles» = elementos interactivos del DOM (un deslizador con su caja cuenta 2; los botones de zoom, los de reproducción, cada ficha de preajuste y «Restablecer» cuentan 1). «Cajón» = la pestaña «Este simulador».

### 1.3 Lectura: dónde se ve lleno

1. **La prosa no es el problema.** Está en 623–646 palabras y es entre el 22 y el 38 % de lo visible (sin contar la lista de fuentes). Lo que llena la página son los **pies de figura** (151–463), el **texto dentro de las figuras** (141–589: rótulos, leyendas y, en T5, los cuatro análisis del video), las **líneas «Fuente:»** (72–316) y las **fuentes** (113–706).
2. **El mismo dato dicho tres veces** (`dups.js` encontró las coincidencias de 4 palabras seguidas entre tipos): la cámara lenta del T5 (insignia, nota del lienzo, pie y desplegable), la cámara rápida del T9 (insignia, nota y «Cómo se usa»), «la gravedad aparente no es una fuerza» del T3 (pie 3.4, recuadro y nota del lienzo), «lo disipado = conversión + fricción» del T6 (pie 6.4, nota del lienzo), «tiempo real» del T8 (insignia, nota, «Cómo se usa»), las notas de clase del T6, T8 y T9 frente al recuadro «clase».
3. **Instrucciones de uso en los pies de laboratorio** (T1, T2, T3, T4, T5, T6): repiten «Cómo se usa». La auditoría §7 ya lo pedía.
4. **Notas de preajuste largas** (T7 65 palabras, T8 57) que repiten el nombre de la fuente de su propia línea «Fuente:» o lo que ya muestran las lecturas.
5. **Lecturas que repiten otra lectura a la vista**: «Porcentaje de $L_\text{máx}$» (T8) frente a la barra del lienzo; «Instante en la ruta» (T1) frente a `t` del transporte; la tabla «modelo plano / dato» (T9) frente a tres lecturas; la leyenda «v antes = 9,59 km/s» (T9) frente a la lectura.
6. **Controles duplicados** (ya señalados en la verificación): compuesto C4 (T4), subamortiguado (T5), radio $r$ (T3).
7. **Lo cerrado** (T6: 594 palabras) no satura la vista, pero «Cómo se usa» del T6 es un solo párrafo de 359 palabras: cuando se abre, es un muro.

## 2. Propuestas por tema

Prioridad: **A** seguras y claras (quitan una repetición, ninguna cifra sale de la página); **B** de gusto o de forma (Dylan elige); **C** tocan la rúbrica, el recurso prescrito, un control o un dato a la vista. «Palabras» = palabras visibles que dejan la vista a 1 280 px («pasa a desplegable» = el texto se conserva cerrado). Todas cambian texto de Dylan: aunque sean A, él las lee antes de publicar. Columna «Decide Dylan»: «Sí» cuando hay una elección de criterio, no solo de redacción.

### Globales (todas las páginas)

Cambios de componente que valen para los nueve temas; el ahorro por tema está en la columna «Palabras».

| # | Prio. | Ubicación | Texto actual | Propuesta | Palabras | Riesgo y pruebas | Decide Dylan |
|---|---|---|---|---|---|---|---|
| E4-G-4 | A | Constante de zoom en `DroneLab.tsx:49`, `JumpLab.tsx:33`, `HabitatLab.tsx:49`, `WheelLab.tsx:73`, `FlybyLab.tsx:56` · «Cómo se usa» (cerrado) | Cinco redacciones distintas de ~45 palabras de la misma ayuda de zoom («…se acerca con los botones, Ctrl y la rueda, o pellizcando, y se desplaza arrastrando el fondo; con el lienzo enfocado desde el teclado, + y − acercan y alejan, 0 ajusta y las flechas desplazan…»). | Una sola frase compartida en `src/components/lab/` (p. ej. `ZOOM_USAGE`): «Zoom: botones, Ctrl + rueda o pellizco; arrastra el fondo para desplazar. Con el foco en el dibujo: + − acercan, 0 ajusta, flechas desplazan.» y cada laboratorio añade solo lo suyo (la barra de escala del T8). | T1 18, T2 22, T3 24, T8 22, T9 22 (cerrado) | Texto cerrado: no cambia lo visible. Lo fijan las pruebas de ayuda de cada laboratorio (`*Lab.zoom.test.tsx`) y `RegenLab.notes.test.tsx`-tipo «ninguna frase repetida». | No |
| E4-G-1 | B | src/components/ui/Sources.astro:40-41 · «Fuentes» (todas las páginas) | Cada fuente termina con «Consultado el 30 de octubre de 2026.» (o la fecha que toque). | Una línea bajo el título «Fuentes»: «Consultadas el {fecha más común} salvo indicación.» y la fecha solo en las fuentes con otra fecha. Ninguna fuente ni fecha se pierde. | T1 29, T2 23, T3 17, T4 35, T5 17, T6 35, T7 113, T8 131, T9 47 | No toca cifras ni fuentes; cambia el formato de referencia (APA admite la fecha común). Lo fijan `src/lib/sources.test.ts` y el «Copiar Markdown» si exporta fuentes. Pesa más en T7 (21 fuentes) y T8 (24). | Sí |
| E4-G-2 | B | src/components/ui/Sources.astro · «Fuentes» | La URL completa impresa como texto del enlace (p. ej. `https://web.archive.org/web/20120723172623/http://www.nasa.gov:80/mission_pages/kepler/…`, dos líneas). | El enlace con el dominio como texto («web.archive.org», «ntrs.nasa.gov»…) y la URL entera en `href` y `title`. Ahorra 1–2 líneas por fuente, no palabras. | — (líneas) | Una referencia impresa pierde la URL legible (en pantalla sigue a un clic). Prueba de fuentes si fija el texto del enlace. | Sí |
| E4-G-3 | B | src/components/ui/Connections.astro · «Con lo visto en clase» | Cada referencia repite «Módulo 3 · Tema 03 · Torque y equilibrio · Concepto 0N · …». | Agrupar por tema: un rótulo «Módulo 3 · Tema 03 · Torque y equilibrio» y debajo «Concepto 02 · Momento de inercia», «Concepto 03 · …». Mismo contenido. | T4 14, T7 28, T8 26 | Ninguno de contenido; e2e de conexiones si cuenta elementos. | No |
| E4-G-5 | B | src/components/lab/LabNotes.tsx:55-58 · «Cómo se usa» y «Qué deja fuera el modelo» | Párrafos de 100–360 palabras (T6: 359 y 235). | Una viñeta por idea (`<ul>`), como propuso la auditoría §7; el texto no cambia. En T6, un subtítulo por vista («Tramo», «Ciclo», «Conducir»). | — (líneas) | Solo forma. Pruebas que leen los párrafos por `p`. | No |
| E4-G-6 | B | src/components/nav/TopicMeta.astro · cabecera del tema | Fila «Copiar URL · Copiar Markdown · GitHub» bajo la fila «insignia · min de lectura · Actualizado»: 11 elementos visibles en 5 filas (miga de 3, título, concepto, 3 de la ficha y 3 acciones). | Las tres acciones en la misma fila que la fecha, como iconos con nombre accesible y `title` («Copiar URL», «Copiar Markdown», «Ver en GitHub»). La cabecera queda en 4 filas en vez de 5. | T1 6, T2 6, T3 6, T4 6, T5 6, T6 6, T7 6, T8 6, T9 6 | Las acciones se descubren peor sin rótulo; e2e de `TopicTools`/cabecera. | Sí |

### Tema 1 · Dron de reparto

2 234 visibles; el laboratorio es el más alto en escritorio (1 622 px, cuatro gráficas de perfil). Satura el pie del laboratorio (90 palabras que enumeran lo que las gráficas ya titulan e instruyen lo que dice «Cómo se usa») y la fuente de la figura 1.4, que repite el muestreo dicho en «Qué deja fuera». Las cuatro gráficas imprimen cada una su fila «t · valores», que duplica las lecturas del laboratorio (no propongo tocarlas: son la lectura del cursor de cada gráfica).

| # | Prio. | Ubicación | Texto actual | Propuesta | Palabras | Riesgo y pruebas | Decide Dylan |
|---|---|---|---|---|---|---|---|
| E4-1-1 | A | src/content/topics/dron-reparto.mdx:248 · pie de la figura 1.4 (laboratorio) | «Laboratorio del dron con las ecuaciones (1.3) y (1.4). Arrastra las paradas A, B y C, o muévelas con las flechas, y la ruta se recalcula al soltar; la línea de tiempo, o el propio dron, recorre $t$ con $v$ y $a$ dibujados a escala, y al frenar la flecha de $a$ apunta contra el movimiento. Debajo, $x(t)$, $y(t)$, las componentes y los módulos de $v$ y de $a$, y la distancia recorrida frente a $\|\Delta r\|$, con las entregas sombreadas y una línea vertical en el instante elegido.» | «Laboratorio del dron con las ecuaciones (1.3) y (1.4): la ruta se recalcula al mover una parada, $v$ y $a$ van dibujados a escala y, al frenar, la flecha de $a$ apunta contra el movimiento. Las cuatro gráficas de debajo siguen el mismo instante, con las entregas sombreadas.» | 40 | Las instrucciones ya están en «Cómo se usa» (cerrado) y los títulos de las cuatro gráficas dicen qué dibujan. Sin prueba que fije el pie; cuenta en el tiempo de lectura (no en las 650). | No |
| E4-1-2 | A | src/content/topics/dron-reparto.mdx:250 · fuente de la figura 1.4 | «Curvas muestreadas cada 0,5 s para la gráfica; datos completos a 0,1 s en el repositorio.» | Quitar. | 16 | Lo mismo dice «Qué deja fuera» (l. 256: «cada 0,1 s, 3 876 muestras… la gráfica muestrea cada 0,5 s»). No toca cifras: siguen en el desplegable. | No |
| E4-1-3 | B | src/components/topics/dron-reparto/DroneLab.tsx:69 · lectura «Instante en la ruta» | «Instante en la ruta 30,00 s» | Quitar. | 6 | Repite la lectura `t = 30,00 s` de la reproducción: el comentario de `DroneLab.tsx:151` dice que con `timeOrigin` la lectura, las gráficas y el dron «lo dicen igual». Las cuatro gráficas también la imprimen. `DroneLab.test.tsx`, `dron-reparto.spec.ts`. | Sí |

### Tema 2 · Salto

El menos saturado (1 749). Solo el pie del laboratorio con instrucciones y «Diseñar el salto» fuera del mando, tras los desplegables.

| # | Prio. | Ubicación | Texto actual | Propuesta | Palabras | Riesgo y pruebas | Decide Dylan |
|---|---|---|---|---|---|---|---|
| E4-2-1 | A | src/content/topics/salto-personaje.mdx:223 · pie de la figura 2.4 (laboratorio) | «arrastra la punta de $\vec v_0$ para fijar $v_0$ y $v_x$, o el punto de la curva para recorrer $t$;» | Quitar. | 19 | «Cómo se usa» ya lo dice con más detalle («Arrastra la punta del vector de lanzamiento…», «El punto sobre la curva recorre el salto…»). El resto del pie se queda. | No |
| E4-2-2 | B | src/lib/data/jumpPresets.ts:54 · nota del preajuste «Celeste» | «Escala supuesta 8 px = 1 m (el ancho de la caja de colisión, o hitbox, de Madeline):» | «Escala supuesta 8 px = 1 m (el ancho de la hitbox de Madeline):» | 4 | «Caja de colisión» se define en el caso de uso (mismo tema). Sin cifras tocadas. `presetNotes`/`JumpLab.test.tsx` si fijan la cadena. | Sí |
| E4-2-3 | B | src/components/topics/salto-personaje/JumpLab.tsx · «Diseñar el salto» | «Diseñar el salto» va en una tarjeta propia debajo de «Qué deja fuera el modelo», fuera del mando. | Llevarlo al nivel 2 (escenario), bajo los preajustes: es un control, y hoy queda tras los desplegables. 0 palabras; un bloque menos tras el laboratorio. | 0 | Cambio de disposición; `lab-shell.spec.ts` (orden de partes) y `JumpLab.test.tsx`. | Sí |

### Tema 3 · Hábitat

2 334. Pies largos (figura 3.2: 85 palabras; 3.4: 89; laboratorio: 84) y la idea «la gravedad aparente no es una fuerza» en tres sitios. En el mando, la nota de «Fijar 1 g» mezcla física y límites de los controles. El radio tiene dos controles a la vista.

| # | Prio. | Ubicación | Texto actual | Propuesta | Palabras | Riesgo y pruebas | Decide Dylan |
|---|---|---|---|---|---|---|---|
| E4-3-1 | A | src/content/topics/gravedad-artificial.mdx:245 · pie de la figura 3.5 (laboratorio) | «Laboratorio del hábitat con las ecuaciones (3.2) a (3.4): el anillo da una vuelta en un período $T$; arrastra el radio sobre la barra logarítmica, o muévelo con las flechas, y «Fijar 1 g» despeja el otro parámetro. Los preajustes cargan el par ($r$, RPM) de su fuente: el Toro de Stanford da 0,93 g;» | «Laboratorio del hábitat con las ecuaciones (3.2) a (3.4): el anillo da una vuelta en un período $T$. El Toro de Stanford da 0,93 g;» | 30 | Las dos instrucciones están en «Cómo se usa» (cerrado: «Arrastra el manejador…», «Un preajuste muestra el par ($r$, RPM) de su fuente…»). Las cifras de los preajustes se quedan. | No |
| E4-3-2 | A | src/components/topics/gravedad-artificial/HabitatLab.tsx:40 · nota bajo «Fijar 1 g» | «Para que ambos quepan en sus controles, el giro no baja de 0,48 RPM ni el radio de 9 m.» | Quitar de aquí; pasa a desplegable/«Cómo se usa». | 20 (pasa a desplegable) | Es un límite de los controles, no física: pasa a «Cómo se usa». La primera frase ($r = g/\omega^2$…) se queda. `HabitatLab.test.tsx` fija «Con 1 g fijo» (no cambia). | No |
| E4-3-4 | A | src/content/topics/gravedad-artificial.mdx:151 · pie de la figura 3.2 | «la tabla 3.1 da $\omega$, la rapidez tangencial del piso y el período de cada caso, y la tabla 3.2, los datos del toro.» | «(tablas 3.1 y 3.2).» | 20 | Las tablas están justo debajo con sus propios pies. Ninguna cifra. | No |
| E4-3-3 | B | src/components/topics/gravedad-artificial/HabitatNotes.tsx:37 · nota bajo la leyenda | «$g_\text{ap}$ es lo que la persona siente en el marco del anillo, que gira: ninguna fuerza tira de ella hacia afuera; es el piso el que la empuja hacia el eje. Flechas a escala hasta 1,5 g; con doble trazo, más largas que lo dibujado.» | «Percepción, no fuerza: el piso empuja a la persona hacia el eje. Flechas a escala hasta 1,5 g; con doble trazo, más largas que lo dibujado.» | 19 | La idea se dice tres veces (pie 3.4 l. 234, recuadro l. 289 y aquí); se conserva en las tres, más corta aquí. Toca la tensión M7 de la auditoría (que se resolvió repitiéndola): que Dylan confirme. | Sí |
| E4-3-5 | B | src/content/topics/gravedad-artificial.mdx:234 · pie de la figura 3.4 (diagrama) | «con los elementos de las ecuaciones (3.2) a (3.4): eje, radio $r$, sentido de giro $\omega$ y, sobre la persona, la aceleración centrípeta hacia el eje, la gravedad aparente, $-a_c$, hacia afuera (percepción, no fuerza: el piso la empuja hacia el eje), y la velocidad tangencial.» | «con las ecuaciones (3.2) a (3.4); la gravedad aparente, $-a_c$, es percepción, no fuerza.» | 32 | El dibujo rotula cada elemento. El caso de 1 g del pie (A2 de la auditoría) se queda intacto. | Sí |
| E4-3-6 | C | src/components/topics/gravedad-artificial/HabitatScene.tsx (barra logarítmica) y `HabitatLab` (parámetro «Radio del piso $r$») | El radio tiene dos controles a la vista: la barra logarítmica sobre el lienzo y el deslizador «Radio del piso $r$» del mando. | Dejar uno: la barra (arrastrable sobre el dibujo, con teclado) o el deslizador. 1 control y ~4 palabras menos. | 4 | Cambia la interacción; la consigna pide al menos un control a la vista (se cumple). `HabitatLab.zoom.test.tsx`, `gravedad-artificial*.spec.ts`. | Sí |

### Tema 4 · Llantas F1 (tercero más saturado)

2 739 (2 546 sin fuentes). El pie de la figura 4.3 tiene 163 palabras y su fuente 82: 245 palabras bajo una sola gráfica, el bloque más denso del sitio fuera del video del T5. El pie del laboratorio (107) explica cómo se usa porque «Cómo se usa» solo tiene 19 palabras. Las líneas «Fuente:» suman 316 palabras, el máximo de los nueve.

| # | Prio. | Ubicación | Texto actual | Propuesta | Palabras | Riesgo y pruebas | Decide Dylan |
|---|---|---|---|---|---|---|---|
| E4-4-2 | A | src/content/topics/llantas-f1.mdx:284 · pie de la figura 4.5 (laboratorio) | «arrastra el cursor de temperatura para leer $\mu(T)$ sobre la ventana del compuesto elegido (C3 o C4, bajo los parámetros) y el de carga para leer la fuerza lateral máxima de los dos modelos y el $\mu$ efectivo; también se mueven con las flechas.» | «$\mu(T)$ sobre la ventana del compuesto elegido y, por carga, la fuerza lateral máxima de los dos modelos y el $\mu$ efectivo.» | 22 (pasa a desplegable) | Las instrucciones pasan a «Cómo se usa», que hoy tiene 19 palabras. Cambia un texto que E1 tocó («bajo los parámetros»). | No |
| E4-4-3 | B | src/content/topics/llantas-f1.mdx:123 · pie de la figura 4.1 | «La fricción estática iguala el empuje hasta $f_{s,\text{máx}}$ = 0,40 · 98,1 N = 39,2 N; entonces la caja arranca y la fricción baja a $f_k$ = 0,30 · 98,1 N = 29,4 N.» | «La fricción estática iguala el empuje hasta $f_{s,\text{máx}}$ = 39,2 N; entonces la caja arranca y baja a $f_k$ = 29,4 N.» | 8 | Los productos ya están en el recuadro de clase (l. 331) y en «Con lo visto en clase»; 39,2 y 29,4 N se quedan. | Sí |
| E4-4-1 | C | src/content/topics/llantas-f1.mdx:224 · pie de la figura 4.3 (163 palabras) | «con el óptimo en el centro, los dos anchos quedan iguales, y un lado caliente más estrecho pondría 135 °C fuera de la ventana. Los puntos son seis de los pares de tcurve_F3soft.lut, la tabla de temperatura del tyres.ini del equipo MUR (los mismos de la tabla 4.4), multiplicados por $\mu_\text{pico}$ para compartir el eje; la línea discontinua solo une esos seis. Ese es otro compuesto, con otra ventana: da todo su agarre entre 75 y 100 (sin unidad impresa; supongo °C), no en 105–135 °C, y a 0 y a 240 conserva el 80 %; sube, se mantiene y baja como la campana, pero cae mucho más despacio. Los rangos son de 2019 y no encontré los de los compuestos actuales.» | «Los puntos son seis pares de tcurve_F3soft.lut del equipo MUR (tabla 4.4), multiplicados por $\mu_\text{pico}$; otro compuesto, con otra ventana (desplegable «Comparación con MUR»).» | 97 (pasa a desplegable) | Toca A3 de la auditoría (datos medidos en la figura prescrita): los puntos siguen dibujados y todo el texto se conserva palabra por palabra en un `<details>` bajo el pie, con sus cifras (75–100, 80 %, 2019). «Con el óptimo en el centro…» ya lo dice el `Why` del paso. Que Dylan decida si la comparación debe quedar a la vista. | Sí |
| E4-4-4 | C | src/components/topics/llantas-f1/tyreLabModel.ts (preajustes) · escenario del laboratorio | El compuesto se elige dos veces: el selector «Compuesto (Pirelli, 2019)» y el preajuste «Compuesto C4». | Quitar el preajuste «Compuesto C4» (el selector lo hace) o fundirlo con «C3 en ventana» en un preajuste por compuesto. 1 control menos. | 2 | La verificación ya señaló el control duplicado. `TyreLab.test.tsx`, `llantas-f1.spec.ts`. | Sí |

### Tema 5 · Háptico (el más saturado)

3 051 visibles (2 836 sin fuentes) y 1 546 palabras de props según el contador del sitio, el doble que la mayoría. El bloque «Análisis por instante» pone 420 palabras seguidas bajo el video; los pies 5.1–5.3 repiten el `Why` y el caso de uso; la cámara lenta del laboratorio se dice cuatro veces; dos líneas de ayuda bajo botones desactivados son lo primero que se lee bajo el dibujo; el amortiguamiento se elige dos veces.

| # | Prio. | Ubicación | Texto actual | Propuesta | Palabras | Riesgo y pruebas | Decide Dylan |
|---|---|---|---|---|---|---|---|
| E4-5-2 | A | src/components/topics/control-haptico/TriggerLab.tsx:272 · nota del lienzo | «Al soltarla, la palanca vuelve 10 veces más lenta que el retorno calculado, para que se vea, y se detiene en el tope del reposo.» | Quitar. | 25 | Dicho tres veces más: insignia «×0,1 cámara lenta» sobre el dibujo, pie 5.5 y «Qué deja fuera» («la animación va 10 veces más lenta… un tope en el reposo que la detiene sin rebote»). `TriggerLab.test.tsx:152` exige «10 veces más lenta» en las notas del lienzo: la prueba cambia (la idea sigue en la insignia y el desplegable). | No |
| E4-5-3 | A | src/content/topics/control-haptico.mdx:317 · pie de la figura 5.5 (laboratorio) | «arrastra la palanca, o muévela con las flechas, y la curva marca $F$ en el $x$ actual; al soltarla vuelve al reposo con un oscilador amortiguado, mostrado 10 veces más lento.» | «al soltar, la palanca vuelve al reposo con un oscilador amortiguado.» | 20 | Instrucción a «Cómo se usa» (38 palabras hoy); la cámara lenta la dice la insignia. Sin cifras perdidas (el 10 sigue en la insignia y en el desplegable). | No |
| E4-5-6 | A | src/content/topics/control-haptico.mdx:225 · pie de la figura 5.3 | «cada fuerza se dibuja sobre el cuerpo en que actúa, por eso no se anulan.» | Quitar. | 15 | Lo dicen el `Why` del paso 3 (l. 216, «sobre otro cuerpo: por eso no se anulan») y el rótulo del dibujo «mismo módulo, cuerpos distintos». | No |
| E4-5-4 | B | src/components/topics/control-haptico/TriggerLab.tsx:64-65 · ayuda bajo «Soltar el gatillo» y «Repetir retorno» | «Con el gatillo suelto no hay nada que soltar: apriétalo primero. «Repetir retorno» se activa tras el primer retorno.» | Mostrarla solo como `title` y `aria-describedby` de los botones desactivados (o solo tras pulsar uno desactivado). Es lo primero que se lee bajo el dibujo al abrir. | 19 (pasa a desplegable) | `TriggerLab.test.tsx` y `control-haptico.spec.ts` fijan «apriétalo primero» y «Repetir retorno»; accesibilidad: el motivo sigue anunciado. | Sí |
| E4-5-5 | B | src/content/topics/control-haptico.mdx:185 · pie de la figura 5.2 | «Es la sensación que imitan los gatillos: en la zona Cooling Springs de Astro's Playroom, el salto se carga con el gatillo y McKeand los sintió endurecerse como un resorte tenso (caso de uso).» | Quitar. | 34 | Repite el caso de uso (l. 338, misma cita de McKeand). Si se quita, la fuente de la figura pierde «McKeand (2020), TheGamer, fuente 3» (la cita sigue en el caso de uso): no se pierde ninguna fuente del tema. | Sí |
| E4-5-7 | B | src/content/topics/control-haptico.mdx:135 · pie de la figura 5.1 | «La vibración tiene la misma amplitud $F_0$ en todo el recorrido y oscila alrededor de cero, así que su lectura no distingue posiciones y en promedio no empuja el gatillo de vuelta;» | «La vibración oscila alrededor de cero con la misma amplitud $F_0$ en todo el recorrido;» | 17 | La fase A escribió esta frase para M4 (5.1 como amplitud): se conserva lo que M4 pedía. «No distingue posiciones» ya está en el `Why` (l. 120, 126) y en el análisis de las 2:18. | Sí |
| E4-5-9 | B | src/content/topics/control-haptico.mdx:69 (frontmatter `classRefs`, nota del concepto 04) | «$F_{\text{el},x} = -kx$ y el ejemplo $k = 150$ N/m, $x = -0{,}08$ m $\to$ +12 N: la ecuación (5.2) del gatillo.» | «$F_{\text{el},x} = -kx$: la ecuación (5.2) del gatillo.» | 10 | El ejemplo con sus cifras está completo en el recuadro de clase (l. 364), justo encima. Ninguna cifra sale de la página. | No |
| E4-5-1 | C | src/components/topics/control-haptico/HapticVideo.tsx:209-230 · «Análisis por instante» (figura 5.4) | Las cuatro marcas con su análisis abierto: 420 palabras de análisis seguidas bajo el video (76, 103, 87 y 154). | Cada marca como desplegable (título y minuto a la vista), con la de las 4:15, «la clave» según el pie, abierta; pulsar una marca del video abre su análisis. El texto no cambia ni sale del DOM ni del «Copiar Markdown». | 266 (pasa a desplegable) | Es el recurso prescrito («multimedia con análisis»): el evaluador debe abrir tres desplegables para leerlo todo. Lo fijan `HapticVideo.test.tsx`, `control-haptico.spec.ts` y `readingTime.test.ts` (que cuenta `analysis`). | Sí |
| E4-5-8 | C | src/lib/data/triggerPresets.ts · preajuste «Subamortiguado» y control «Amortiguación al soltar» | El amortiguamiento se elige dos veces: segmentos «Crítica / Subamortiguada» y preajuste «Subamortiguado». | Quitar el preajuste (los segmentos lo hacen) o los segmentos. 1 control y su nota menos. | 8 | La verificación lo señaló. `TriggerLab.test.tsx`, `control-haptico.spec.ts`, guardia de glifos (estados por preajuste). | Sí |

### Tema 6 · Frenado regenerativo

2 679 visibles, pero el laboratorio es el más cargado del sitio: 446 palabras visibles y 594 cerradas, 2 364 px de alto. Satura la zona bajo las gráficas: tres entradas de leyenda, un párrafo de 70 palabras sobre el grosor y los aros y otro que repite el pie 6.4; las lecturas repiten «en el tramo» cuatro veces; la nota del preajuste repite los dos deslizadores que tiene justo encima.

| # | Prio. | Ubicación | Texto actual | Propuesta | Palabras | Riesgo y pruebas | Decide Dylan |
|---|---|---|---|---|---|---|---|
| E4-6-1 | A | src/components/topics/frenado-regenerativo/RegenNotes.tsx:17 · segunda nota del lienzo | «La barra del frenado en las ruedas se reparte en lo que llega a la batería, las pérdidas de conversión y el calor de fricción: lo disipado es la suma de las dos últimas.» | «Lo disipado = pérdidas de conversión + calor de fricción.» | 26 | Repite el pie de la figura 6.4 (l. 267) y la ecuación (6.4). `RegenLab.notes.test.tsx` fija la frase. | No |
| E4-6-3 | A | src/components/topics/frenado-regenerativo/regenPresets.ts:52 · nota del preajuste por omisión | «Modelo del sitio: $\eta$ = 0,80 constante, $P_\text{máx}$ = 239 kW (el motor de FASTSim) y $f(v)$ activo; en el UDDS la potencia de frenado no pasa de 33,2 kW, así que el límite no actúa.» | «Modelo del sitio, con $f(v)$ activo; en el UDDS el frenado no pasa de 33,2 kW, así que el tope de 239 kW no actúa.» | 9 | 0,80 se lee en el deslizador de $\eta$, 50 px encima; el origen del 239 kW está en «Qué deja fuera» y en la fuente de la figura 6.3. 33,2 y 239 kW se quedan. Una oración (`presetNotes`). | No |
| E4-6-4 | A | src/content/topics/frenado-regenerativo.mdx:278 · pie de la figura 6.5 (laboratorio) | «el auto recorre el ciclo y el flujo de potencia une batería, motor, ruedas y frenos, con grosor proporcional a $\|P\|$. Cambia $\eta$ y $P_\text{máx}$ o elige un preajuste: con la batería fría o llena,» | «el auto recorre el ciclo y el flujo de potencia une batería, motor, ruedas y frenos. Con la batería fría o llena,» | 13 | El grosor lo explica la nota del lienzo; «cambia… o elige» es instrucción. 0,448 kWh se queda. | No |
| E4-6-2 | B | src/components/topics/frenado-regenerativo/RegenNotes.tsx:15 · nota de escala del flujo | El grosor es proporcional a $\|P\|$: 20 kW = 5 px. Al regenerar, la diferencia de grosor entre el enlace del motor y el de la batería son las pérdidas de conversión $(1 - \eta)$. El aro verde en las ruedas indica que frena el motor y el naranja, que frenan las pastillas. Al traccionar, el modelo solo calcula la potencia en las ruedas: la batería entrega al menos eso $(\ge)$. | «Grosor proporcional a $\|P\|$ (20 kW = 5 px); entre motor y batería, la diferencia son las pérdidas $(1 - \eta)$. Aro verde: frena el motor; naranja: las pastillas. «$\ge$»: al traccionar, la batería entrega al menos la potencia en las ruedas.» | 29 | Mismo contenido. Alternativa: los aros como dos entradas más de la leyenda (`LegendItem`). `RegenLab.notes.test.tsx` fija «El grosor es proporcional». | Sí |
| E4-6-5 | B | src/components/topics/frenado-regenerativo/RegenLab.tsx (lecturas de «Tramo») | «Energía a la batería en el tramo», «Pérdidas de conversión en el tramo», «Calor de fricción en el tramo», «Recuperado en el tramo, % del frenado en las ruedas». | «Energía a la batería», «Pérdidas de conversión», «Calor de fricción», «Recuperado, % del frenado en las ruedas» bajo un rótulo visible «En el tramo».» | 5 | «En el tramo» distingue estas lecturas de las de «Ciclo»: el rótulo lo conserva. `driveViews.test.ts`, `RegenDrive.test.tsx`, `frenado-regenerativo-conducir.spec.ts` fijan «Recuperado en el tramo». | Sí |
| E4-6-7 | B | src/components/topics/frenado-regenerativo/RegenLab.tsx:51 (`VIEW_HINT`) y `usage` del MDX l. 283 · «Cómo se usa» (359 palabras, cerrado) | Un párrafo que mezcla las tres vistas, el cursor, $f(v)$ y la mecánica de los pedales. | Tres viñetas por vista (G-5) y la mecánica de los pedales («un pedal mantenido se hunde hasta el fondo en 2 s…») como `title`/ayuda junto a los pedales de «Conducir», donde se usa. | 0 (cerrado) | Texto cerrado; `RegenLab.notes.test.tsx` («ninguna frase repetida» entre ayuda y `usage`). | Sí |
| E4-6-6 | C | src/content/topics/frenado-regenerativo.mdx:320 · recuadro de clase | «La (6.1) es el teorema trabajo–energía del Tema 03 (ejemplo «Distancia de frenado»).» | Quitar. | 13 | Lo dice con las mismas palabras la primera nota de «Con lo visto en clase» (frontmatter l. 72). El resto del recuadro (energía química, extensión) se queda. Criterio 3 de la rúbrica: la conexión sigue explícita. | Sí |

### Tema 7 · Restitución

2 843 visibles, de ellas 463 de fuentes (21). En el laboratorio, la nota del preajuste (65 palabras) empieza con el nombre de la norma que repite su «Fuente:»; bajo las lecturas, fichas del motor + cuatro filas de estado + cinco lecturas; las dos gráficas quedan fuera del cascarón, tras los desplegables. El cajón tiene 11 controles (el motor), el máximo: está bien que sean avanzados.

| # | Prio. | Ubicación | Texto actual | Propuesta | Palabras | Riesgo y pruebas | Decide Dylan |
|---|---|---|---|---|---|---|---|
| E4-7-1 | A | src/lib/data/ballStandards.ts:127 (y el resto de `standard`) + `bouncePresets.ts:118` · nota del preajuste | «ITF Rules of Tennis 2026, Appendix I: rebote de 135–147 cm; caída de 254 cm (100 in) sobre granito, ITF Technical Centre; de ahí $e$ entre 0,729 y 0,761 (cálculo propio, $e = \sqrt{h'/h}$ o $v'/v$), y uso 0,745 con $h_0$ = 2,54 m en el motor con los valores por defecto de Box2D.» | «Rebote de 135–147 cm al caer 254 cm (100 in) sobre granito: $e$ entre 0,729 y 0,761 (cálculo propio, ecuación (7.1)); uso 0,745 con $h_0$ = 2,54 m y los valores por defecto de Box2D.» | 17 | El nombre de la norma se repite en «Fuente:» de la misma línea; la fórmula es la (7.1) del paso 1. Ninguna cifra cambia. Afecta a las notas de todas las pelotas (plantilla). `bouncePresets`/`BounceLab.test.tsx` si fijan la cadena. | No |
| E4-7-2 | A | src/components/topics/coeficiente-restitucion/BouncePlots.tsx:144-145 · nota de la gráfica de energía | Cada escalón de la física ideal deja una fracción e² de la energía: pierde 1 − e² por bote. Con Baumgarte, la penetración cuenta como energía potencial negativa. | «Cada bote ideal multiplica la energía por $e^2$; con Baumgarte, la penetración cuenta como energía potencial negativa.» | 10 | De paso arregla una letra suelta («e²» en texto plano de JSX, que `looseSymbols` no ve). Sin pruebas que la fijen. | No |
| E4-7-3 | B | src/components/topics/coeficiente-restitucion/BounceNotes.tsx:105-108 · cuatro filas de estado | «Motor de juego: en reposo a los 4,32 s, tras 7 rebotes» · «Umbral con eventos exactos: $N$ = 7 rebotes; el último sube 4,1 cm y el siguiente contacto la deja quieta» · «e del par en el motor: máx(0,745; 0,000) = 0,745». | «Motor de juego: en reposo a los 4,32 s, tras 7 rebotes; con eventos exactos, $N$ = 7 y el último sube 4,1 cm» · «$e$ del par: máx(0,745; 0,000) = 0,745».» | 11 | Dos filas en una; la regla y el suelo ya están en las fichas «Motor» de encima. Cifras iguales. `BounceLab.test.tsx`, `BounceLab.tiered.test.tsx`, `coeficiente-restitucion.spec.ts` leen las filas por rótulo. | Sí |
| E4-7-4 | B | src/components/topics/coeficiente-restitucion/BounceLab.tsx · gráficas $y(t)$ y $E/E_0$ | Las dos gráficas van fuera de la tarjeta, después de «Qué deja fuera el modelo» (no en el hueco `charts`). | Pasarlas al hueco `charts` (tras las lecturas), como T4, T5, T6 y T8: los desplegables quedan al final, como en los otros ocho. 0 palabras. | 0 | Disposición; `lab-shell.spec.ts` (orden), e2e del tema. | No |
| E4-7-5 | B | src/content/topics/coeficiente-restitucion.mdx:154 (frontmatter, nota del concepto 02) | «Momento más restitución: la (7.2) y el ejemplo de 2 kg a +3 m/s contra 1 kg en reposo de la figura 7.2.» | «Momento más restitución: la (7.2) y la figura 7.2.» | 14 | El ejemplo (con cifras) está en el pie 7.2 y en el recuadro de clase. | No |

### Tema 8 · Ruedas de reacción (segundo más saturado)

3 531 visibles, el máximo bruto: 706 son las 24 fuentes, 385 las tablas (3) y 419 el texto de las figuras (el diagrama 8.4 rotula mucho). Repeticiones claras: la nota del preajuste (57 palabras) frente a las lecturas y al paso 2; «la maniobra corre en tiempo real» tres veces; «Porcentaje de $L_\text{máx}$» frente a la barra del lienzo; el recuadro de clase frente a sus seis notas de «Con lo visto en clase».

| # | Prio. | Ubicación | Texto actual | Propuesta | Palabras | Riesgo y pruebas | Decide Dylan |
|---|---|---|---|---|---|---|---|
| E4-8-1 | A | src/components/topics/ruedas-reaccion/wheelPresets.ts:53 · nota del preajuste «90° en 60 s» | «Giro de reposo a reposo del 6U ($I_s$ = 0,1852 kg·m²) con la RW400: $\tau$ = 0,32 mN·m, el 4 % de $\tau_\text{máx}$; a los 30 s la nave gira a 3,0 °/s y la rueda va a −970 rpm, el 19 % de $L_\text{máx}$, y al final vuelve a 0 rpm tras 485 vueltas.» | «Giro de reposo a reposo del 6U con la RW400: $\tau$ = 0,32 mN·m, el 4 % de $\tau_\text{máx}$; a los 30 s la nave gira a 3,0 °/s y la rueda va a −970 rpm, el 19 % de $L_\text{máx}$.» | 13 | $I_s$ está en el paso 1 y la tabla 8.1; «485 vueltas» en el `Why` del paso 1 y la lectura «Vueltas de la rueda»; «vuelve a 0 rpm» en el pie 8.2. `WheelLab.test.tsx` fija el comienzo «Giro de reposo a reposo». | No |
| E4-8-2 | A | src/components/topics/ruedas-reaccion/WheelStatus.tsx:65 · nota del lienzo | «La maniobra corre en tiempo real.» | Quitar. | 6 | Lo dicen la insignia «×1 velocidad real» y «Cómo se usa». `WheelLab.test.tsx` y `ruedas-reaccion.spec.ts` buscan «tiempo real»: ajustar. | No |
| E4-8-3 | A | src/components/topics/ruedas-reaccion/WheelLab.tsx · lectura «Porcentaje de $L_\text{máx}$» | «Porcentaje de $L_\text{máx}$ 0,0 %» | Quitar. | 4 | La barra «Momento de la rueda $\|L_w\|/L_\text{máx}$ 0,0 %» del lienzo da el mismo número a la vista. `WheelLab.test.tsx` fija «Porcentaje de». | No |
| E4-8-4 | C | src/content/topics/ruedas-reaccion.mdx:481 · recuadro de clase | «La (8.2) es la $\sum \tau_{\text{ext},z} = I\alpha$ del Tema 03; la (8.1) y la (8.3), la conservación y el $\Delta \vec L = \int \sum \vec\tau_\text{ext}\,dt$ del Tema 04. En «Acercar dos masas al eje» cambia la $I$ de un solo cuerpo; dos cuerpos acoplados por un motor interno son extensión.» | «En «Acercar dos masas al eje» cambia la $I$ de un solo cuerpo; dos cuerpos acoplados por un motor interno son extensión.» | 21 | La primera frase repite las notas 3, 5 y 6 de «Con lo visto en clase» (frontmatter l. 189–199), 40 líneas más abajo. Criterio 3: la conexión sigue explícita en la lista. | Sí |
| E4-8-5 | C | src/content/topics/ruedas-reaccion.mdx:268-277 · figura 8.1 frente al panel A de la 8.4 | El panel A del diagrama prescrito (8.4) vuelve a dibujar el intercambio de la figura 8.1 ($L_s + L_w = 0$, la (8.1), las 485 vueltas). | Señalado, no recomendado: quitar la 8.1 ahorraría ~70 palabras y una figura, pero el paso 1 perdería su dibujo. Alternativa: que el panel A remita a la 8.1 y se centre en el motor (detalle M). Decide Dylan. | 0 | Toca el recurso prescrito y el alcance. | Sí |

### Tema 9 · Asistencia gravitatoria

2 806. El laboratorio creció en B–D (333 visibles, 334 cerradas): bajo las lecturas, una leyenda con valores, un párrafo de cámara rápida que repite la insignia y una tabla «modelo plano / dato» cuya columna «modelo» repite tres lecturas; «Llegada» y la nota del preajuste son dos bloques separados por 48 px. El recuadro de clase repite nota por nota las cuatro referencias de clase.

| # | Prio. | Ubicación | Texto actual | Propuesta | Palabras | Riesgo y pruebas | Decide Dylan |
|---|---|---|---|---|---|---|---|
| E4-9-1 | A | src/components/topics/asistencia-gravitatoria/FlybyNotes.tsx:58 · nota de cámara rápida | «Cámara rápida: el paso dibujado dura 2,688 d y a 1× y sin movimiento reducido se ve en 12 s, unas 19 000 veces más rápido; el factor en curso está sobre el dibujo.» | Quitar de aquí; pasa a desplegable/«Cómo se usa». | 34 (pasa a desplegable) | La insignia «×19 000 cámara rápida» está sobre el dibujo y «Cómo se usa» dice «Cada sobrevuelo se ve en 12 s a 1×…»; la duración del paso (2,688 d) pasa a «Cómo se usa». README, «Escala de tiempo»: la insignia es el lugar obligatorio. `FlybyLab.test.tsx`, `FlybyTimeScale.test.tsx` y `asistencia-gravitatoria.spec.ts` usan `flyby-lapse`. | No |
| E4-9-2 | A | src/components/topics/asistencia-gravitatoria/FlybyNotes.tsx:54-55 · leyenda | «v antes = 9,59 km/s · v después = 19,53 km/s» | «$\vec v$ antes · $\vec v$ después» | 4 | Los valores están en las lecturas «$\|\vec v\|$ antes / después, marco del Sol» y en la tabla del dato. De paso, la «v» deja de ser letra suelta. `FlybyLab*.test.tsx`, `flybyLabels.test.ts` fijan «v antes». | No |
| E4-9-4 | A | src/content/topics/asistencia-gravitatoria.mdx:312 · pie de la figura 9.5 (laboratorio) | «Laboratorio del sobrevuelo con las ecuaciones (9.2) y (9.3): hipérbola en el marco del planeta, triángulo de velocidades en el del Sol.» | «Laboratorio del sobrevuelo con las ecuaciones (9.2) y (9.3).» | 13 | Los dos marcos llevan su título sobre el dibujo («Marco de Júpiter», «Marco del Sol»). 20,37 y 6,76 km/s se quedan. | No |
| E4-9-3 | B | src/components/topics/asistencia-gravitatoria/FlybyComparison.tsx:14-18 · tabla «El modelo plano reproduce el dato» | Tabla de 3 filas «Modelo plano \| Dato (Horizons)» con su título y su nota; la columna «Modelo plano» repite las lecturas $\|\vec v\|$ antes, después y la ganancia. | «Dato de Horizons (cónicas empalmadas de la misión): 9,59 → 19,50 km/s, +9,91 km/s.» | 30 | El dato y su fuente se quedan; desaparece la columna repetida. Con $r_p$ editado sigue la nota `EDITED`. El «Giro fuera del plano» (Neptuno, Saturno) necesita su frase: conservarla. | Sí |
| E4-9-5 | B | src/components/topics/asistencia-gravitatoria/FlybyLab.tsx:242 + `flybyPresets.ts:58` · «Llegada» y nota del preajuste | Dos bloques: la nota del preajuste («Máxima aproximación a 721 375 km del centro (10,09 R_J), por detrás. Fuente: …») y, 48 px más abajo, «Llegada: $V_p$ = 12,75 km/s, $v_\infty$ = 7,62 km/s, $\theta_\text{in}$ = 131,5°.» | «Un bloque: «Máxima aproximación a 721 375 km del centro (10,09 $R_J$), por detrás; llegada con $V_p$ = 12,75 km/s, $v_\infty$ = 7,62 km/s y $\theta_\text{in}$ = 131,5°. Fuente: …» | 1 | Un bloque menos; mismas cifras. `FlybyLab.test.tsx` fija «Llegada»; regla de una oración por nota (`presetNotes`): sigue siendo una. | Sí |
| E4-9-6 | C | src/content/topics/asistencia-gravitatoria.mdx:356 · recuadro de clase | «La (9.1) es la gravitación del Tema 01 y la energía potencial del Tema 03; la (9.4), su superposición. El Tema 03 da la Voyager 1 como ejemplo de trayectoria hiperbólica, $E > 0$; la ligada del paso 1 es una elipse de Kepler (Tema 04). Desde el planeta, el sobrevuelo es un choque elástico (Módulo 3) con coeficiente de restitución 1.» | Quitar. | 60 | Las cuatro notas de «Con lo visto en clase» (frontmatter l. 90–101) dicen lo mismo, nota por nota. Queda la última frase: «Vis-viva, el cambio de marco y la hipérbola son extensión.» Criterio 3: la conexión sigue explícita. | Sí |

## 3. Resumen global

Palabras visibles que dejan la vista a 1 280 px, por tema (las globales G-1, G-3, G-4 y G-6 repartidas en su tema):

| Tema | A | A+B | A+B+C | Cerrado (A+B) |
|---|---|---|---|---|
| T1 | 56 | 97 | 97 | 18 |
| T2 | 19 | 52 | 52 | 22 |
| T3 | 70 | 144 | 148 | 24 |
| T4 | 22 | 85 | 184 | 0 |
| T5 | 60 | 163 | 437 | 0 |
| T6 | 48 | 123 | 136 | 0 |
| T7 | 27 | 199 | 199 | 0 |
| T8 | 23 | 186 | 207 | 22 |
| T9 | 51 | 135 | 195 | 22 |
| **Total** | **376** | **1184** | **1655** | 108 |

- **A (376)**: repeticiones exactas e instrucciones en pies; ninguna cifra sale de la página. Se pueden hacer en una tanda, con las pruebas que cada fila nombra ajustadas al texto nuevo.
- **B (+808)**: 447 son la fecha de consulta (G-1), 54 la cabecera (G-6), 68 las notas de clase agrupadas (G-3); el resto, recortes de gusto en pies y notas (239). Más los cambios sin palabras: URL por dominio en las fuentes (G-2, el mayor ahorro de altura en el teléfono), viñetas en los desplegables (G-5), «Diseñar el salto» al mando (T2), gráficas del T7 al hueco `charts`.
- **C (+471)**: el video del T5 (266), la comparación con MUR del T4 (97), los recuadros de clase del T6, T8 y T9 (94) y los controles duplicados de T3, T4 y T5 (14). Cada una necesita el sí de Dylan por la razón escrita en su fila.
- **Lo que no baja**: la prosa (salvo los recuadros), las tablas, las fuentes, las ecuaciones y sus leyendas, los análisis (se pliegan, no se acortan), los parámetros físicos. La cabecera del laboratorio ya está en 2 elementos en los nueve.

## 4. Maquetas (CSS y JS inyectados en la página viva, sin tocar el repo)

`mock.mjs` carga la página de `d7fec8d` en el 4420, aplica las propuestas con `Range.deleteContents()` sobre el DOM hidratado (sin reescribir KaTeX) y toma la misma región antes y después. Archivos en `shots/E4/mock/` (`t<N>-<ancho>-<región>-{antes,despues}.png`), a 1 280 y 360 px; miré las de 1 280 y las fuentes del T8 a 360.

| Tema | Propuestas aplicadas | Alto de página 1 280 (antes → después) | 360 | Palabras visibles* |
|---|---|---|---|---|
| T5 | 5-1 (C), 5-2, 5-3, 5-4, 5-5, 5-6, 5-7, 5-9 | 12 387 → 11 930 (−457 px) | 16 777 → 15 734 (−1 043) | 3 141 → 2 728 (−413) |
| T8 | 8-1, 8-2, 8-3, 8-4 (C), G-1, G-2, G-3 | 15 212 → 14 458 (−754 px) | 22 485 → 20 379 (−2 106) | 3 790 → 3 554 (−236) |

\* Este contador cuenta cada glifo de KaTeX como palabra, así que sus totales no son los de §1; la diferencia sí es comparable.

Regiones: T5 `video` (los cuatro análisis plegados, el de las 4:15 abierto), `lab` (sin la ayuda bajo los botones, sin la frase de cámara lenta, pie corto), `fig51`; T8 `lab` (nota del preajuste de una línea menos, sin «Porcentaje de $L_\text{máx}$» ni «corre en tiempo real»), `clase` (recuadro de una frase), `conexiones` (dos grupos «Módulo 3 · Tema 03 / Tema 04»), `fuentes` (fecha una vez y dominio como enlace). La maqueta del pie 5.1 pierde la $F_0$ en KaTeX porque inyecté texto plano: en el cambio real se conserva.

## 5. Notas al margen (no son propuestas de recorte)

- `BouncePlots.tsx:144` escribe «e²» y «1 − e²» en texto plano de JSX: es una letra suelta que la guardia de E5 no ve (no lee JSX sin clave). E4-7-2 lo arregla de paso.
- La leyenda del T9 «v antes = …» también es una «v» suelta en texto plano (E4-9-2 lo arregla de paso).
- `TriggerLab.test.tsx:152` exige «10 veces más lenta» dentro de las notas del lienzo: E4-5-2 obliga a cambiar esa prueba (la idea queda en la insignia y en el desplegable).
- No medí fps ni toqué el cajón; el cajón tiene 0–11 controles y no lo considero saturado (está cerrado).
- El 4321 no se usó; el preview del 4420 se detuvo por PID y el puerto quedó libre.

## 6. Rutas

- Este informe: `.superpowers/sdd/2026-10-31-fases-b-c-d/E4-proposals.md`.
- Capturas: `.superpowers/sdd/2026-10-31-fases-b-c-d/shots/E4/` (36 de página y laboratorio) y `shots/E4/mock/` (28 antes/después).
- Scripts y datos: `/tmp/claude-1000/-home-dylan-projects-university-2026-Q3-Physics-I-portfolio/bd901b72-3231-4573-8658-e9e55254817b/scratchpad/e4-tools/` (medición, duplicados, propuestas con su cálculo, maquetas); copia limpia en `…/scratchpad/e4/`.
