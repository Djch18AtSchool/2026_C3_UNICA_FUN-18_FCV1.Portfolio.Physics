# Auditoría integral del portafolio · 30 de octubre de 2026

Auditoría pedida por Dylan sobre la rama `avance-2` en `92d1545` (la que se entrega el sábado 31
de octubre a las 23:59): rúbrica, contenido académico, técnica, rendimiento de las
simulaciones, diseño visual y experiencia de uso. Es un informe, no un plan: nada del código
cambió. Las decisiones que abre están al final (§11); los tres informes académicos completos,
tema por tema y con número de línea, están al lado:

- `2026-10-30-revision-academica-temas-1-3.md`
- `2026-10-30-revision-academica-temas-4-6.md`
- `2026-10-30-revision-academica-temas-7-9.md`

Método: lectura del traspaso, la consigna (PDF del docente) y el código; tres revisores
académicos independientes (uno por cada tres temas) recalcularon cada número; medición en
navegador (Playwright, Chromium) del sitio construido (`astro preview`, puerto 4323) y del
servidor de desarrollo de Dylan (4321), con y sin CPU ×4; análisis de los archivos de fuente
(cobertura de glifos de IBM Plex); capturas en 1 280 px y 390 px, claro y oscuro; puerta local
`pnpm run check` y `pnpm run test` en verde sobre `92d1545` (las e2e no se repitieron: el traspaso
las registra en verde en `4526a4e` y desde entonces solo cambió documentación).

## 0. Resumen

1. **Lo urgente no es la auditoría: es publicar.** El sitio vivo sigue sirviendo el Avance 1
   (`/temas/frenado-regenerativo/` y `/temas/asistencia-gravitatoria/` devuelven 404 en
   GitHub Pages). Todo lo de abajo vale cero si `avance-2` no llega a `main` antes del sábado.
2. **Rúbrica:** con lo que hay, la estimación honesta es **14–15 de 16**. Lo académico es sólido:
   **ningún número incorrecto** en los nueve temas y las ecuaciones correctas. Lo que resta
   puntos son huecos concretos y pequeños (§1): el caso numérico de 1 g del Tema 3 no está ni en
   la prosa ni en el diagrama; los huecos «La ecuación» de los casos de uso de los Temas 1 y 3
   no escriben ninguna ecuación; el Tema 7 nunca dice «elástica/inelástica» en la prosa; la
   figura prescrita del Tema 4 no dibuja ningún dato medido; y los defectos visibles (flechas que
   se ven como cajas, leyendas de 100 a 200 palabras) pegan en «Calidad de la página».
3. **Los tres problemas que Dylan vio son reales y están medidos.** (a) Las simulaciones van a
   tirones porque cada cuadro vuelve a renderizar el laboratorio entero (45 a 86 mutaciones
   del DOM por cuadro); en producción sin carga van a 60 fps, pero el Tema 1 cae a **41 fps**
   incluso ahí, y con CPU ×4 el servidor de desarrollo baja a **17–26 fps** (p50 = 50 ms por
   cuadro: eso son los goterones). (b) Los controles están en una segunda tarjeta, 700 px por
   debajo del lienzo en 1 280 px, detrás de notas, tabla y lecturas. (c) Las fuentes IBM Plex **no
   contienen** la flecha combinante U+20D7 ni ∞, ≈, ≤, √, →, ☉ ni los subíndices Unicode; el
   sitio depende de la fuente de reserva del sistema del lector, y en Windows no la hay para la
   flecha: caja.
4. **Sistema de medidas:** la raíz de 17 px (`font-size: 106.25%`) convierte **todo** valor de
   Tailwind en píxeles fraccionarios (text-sm = 14,875 px, gap-3 = 12,75 px, p-4 = 17 px), y
   además hay 60 valores distintos de longitud en CSS y 30 clases arbitrarias. Propuesta en §6:
   raíz 16 px y una escala cerrada en base 4/8.
5. **Plan en cuatro fases (§10):** A, lo que cabe antes de entregar sin tocar diseño (texto y
   flechas); B, rendimiento, glifos y controles; C, sistema de medidas y aire; D, zoom, barra de
   escala y realismo de las escenas.

## 1. Rúbrica

Cuatro criterios de 1 a 4 puntos, 16 en total. «Excelente» exige: casos **profundos y citados
con balance gana/cuesta**; recursos que **enriquecen notablemente** (simulaciones sólidas,
datos reales bien citados, diagramas propios); **conexiones explícitas** entre temas y con la
clase; **presentación profesional** (navegación fluida, diseño cuidado, jerarquía, fuentes con
rigor). Estimación de los revisores, tema por tema (detalle y líneas en los tres informes):

| Tema | Casos de uso | Recursos | Cobertura | Calidad | Qué falta para 4/4/4/4 |
|---|---|---|---|---|---|
| 1 Dron | 3,5 | 4 | 4 | 3,5 | Escribir la ecuación en el hueco «La ecuación» (hoy solo remite a la (1.3)); leyenda 1.4 de 170 palabras + nota de 130. |
| 2 Salto | 4 | 4 | 4 | 3,5 | «Cumple la (2.1)» frente a «no evalúa la (2.1)» (l. 244 vs 256); balance de 110 palabras; voz de fuentes mixta. |
| 3 Hábitat | 3,5 | 3,5 | 4 | 3,5 | **El caso de 1 g (radio y rpm) que exige la consigna no está en la prosa ni en el diagrama**, solo en la leyenda 3.2 y la tabla 3.1; hueco «La ecuación» sin ecuación; «gravedad aparente hacia afuera» en el dibujo frente a «no tira hacia afuera» en el recuadro. |
| 4 Llantas | 3 | 3 | 4 | 3 | **La visualización prescrita no dibuja ningún dato medido** (curvas con parámetros ilustrativos; los pares reales del `tcurve_F3soft.lut` solo están en la tabla 4.4); tres salvedades seguidas dejan el caso como conjetura; leyenda + nota + callout largos. |
| 5 Háptico | 4 | 4 | 4 | 3 | La (5.1) escribe F = F₀ constante y la prosa describe una oscilación de media cero; la tercera ley atribuida a lo que da la primera (l. 215); ≈ 440 palabras bajo el laboratorio; tres estilos de comillas. |
| 6 Regen | 4 | 4 | 4 | 3,5 | Declarar que f(v) se evalúa a la rapidez final del segundo (FASTSim 2 usa la media; con ella 41,2 % en vez de 40,4 % y la fricción baja un 26 %); el 239 kW es del Model 3 RWD **2022** de FASTSim, no del 2025 de la EPA; decimales de más; «la mayor frenada» ambigua. |
| 7 Restitución | 4 | 4 | 3,5 | 4 | La prosa nunca dice «elástica/inelástica» (concepto de la consigna); «con e < 1 hay infinitos botes» falla en e = 0. |
| 8 Ruedas | 4 | 4 | 4 | 4 | Precisar que 2,28·10⁻⁷ N·m es la cota sobre el eje más desfavorable, no el eje z de la rueda (allí 1,53·10⁻⁷); leyendas/notas largas. |
| 9 Voyager | 4 | 4 | 4 | 3,5 | **Flechas U+20D7 en dos leyendas** (l. 247 y 305) y en tres etiquetas de la figura 9.3 y del laboratorio; tres cifras del mismo encuentro (10,2 / 9,91 / 11,45) sin puente; leyendas de 85–95 palabras. |

Lecturas transversales:

- **Criterio 1 (casos):** sólido en 6 de 9; los tres restantes son el mismo defecto formal (el
  hueco «La ecuación» no escribe la ecuación) más el reencuadre del Tema 4.
- **Criterio 2 (recursos):** el riesgo serio es el Tema 4 (datos reales dibujados) y el Tema 3
  (caso de 1 g en el diagrama). «Simulaciones sólidas» también depende de que no vayan a
  tirones en la máquina del evaluador (§3).
- **Criterio 3 (cobertura):** completo; una palabra que falta en el Tema 7.
- **Criterio 4 (calidad):** es donde pegan los defectos visuales de §5 y §6 y las leyendas
  largas de §7. La consigna además exige el título del tema «tal como aparece en esta
  consigna»: `src/consigna.ts` coincide letra por letra (verificado).
- **Prosa ≤ 650 (contador del sitio, `readingStats`, ejecutado hoy):** 648, 650, 649, 648, 649,
  650, 644, 649, 650 palabras (Temas 1 a 9). El revisor de los Temas 4–6 estimó 653/664/682 con
  un contador aproximado; **el del sitio manda** y los nueve están dentro. Lo que sí pesa es el
  texto de *props* (leyendas, notas, análisis): 437 a 1 658 palabras por tema, con el Tema 5
  (1 658), el 4 (1 076) y el 8 (1 054) a la cabeza; ahí vive la saturación de §7.

## 2. Hallazgos académicos (prioridad)

Ningún hallazgo CRÍTICO. ALTO y MEDIO, en orden de impacto en la nota; cada uno trae su
redacción propuesta en el informe del tema.

| # | Tema | Sev. | Hallazgo | Dónde |
|---|---|---|---|---|
| A1 | 9 | ALTO | Flechas U+20D7 (11 en dos leyendas; además 3 etiquetas en código) se ven como cajas en Windows. | `asistencia-gravitatoria.mdx` l. 247, 305; `FlybyFigure.tsx` l. 457–466, 482–488; `FlybyLab.tsx` l. 134 |
| A2 | 3 | ALTO | Caso numérico de 1 g (radio **y** rpm) ausente en prosa y diagrama. | `gravedad-artificial.mdx` l. 143; `HabitatDiagram.astro` |
| A3 | 4 | ALTO | Figura prescrita sin dato medido: dibujar los seis pares del `.lut` de MUR en la figura 4.3 y una curva «MUR según mi lectura» en la 4.2. | `TyreFigure.tsx`, `llantas-f1.mdx` |
| A4 | 1 | ALTO | Leyenda 1.4 (170 palabras) + nota (130). | `dron-reparto.mdx` l. 246, 253 |
| A5 | 5 | ALTO | Leyenda + nota del laboratorio ≈ 440 palabras, repiten tres veces el «pop». | `control-haptico.mdx` l. 318, 323 |
| M1 | 1, 3 | MEDIO | Hueco «La ecuación» del caso de uso sin ecuación (ítem ii de la consigna). | l. 269 y l. 267 |
| M2 | 7 | MEDIO | «Colisiones elásticas e inelásticas» nunca nombradas en la prosa; «e < 1» → «0 < e < 1». | l. 234, 286 |
| M3 | 6 | MEDIO | f(v) a rapidez final vs media de FASTSim 2 (decidir y declarar; corregir el comentario de `energy.ts` l. 158); origen del 239 kW; frenada de la figura 6.3; decimales y unidades. | l. 196, 205, 232, 234, 244 |
| M4 | 5 | MEDIO | (5.1) como amplitud, no fuerza constante; tercera ley bien atribuida. | l. 102, 134, 215, 289 |
| M5 | 9 | MEDIO | Puente entre 10,2 / 9,91 / 11,45 km/s del encuentro con Júpiter. | l. 114, 238, 259 |
| M6 | 2 | MEDIO | «Cumple la (2.1)» vs «no evalúa la (2.1)»; 3,5 m y 0,36 s sin marca de cálculo propio. | l. 130, 244, 256 |
| M7 | 3 | MEDIO | Leyenda 3.4 «hacia afuera» vs recuadro «no tira hacia afuera»; paso a⃗ − g⃗ = a⃗_c saltado. | l. 143, 235, 289 |
| M8 | 8 | MEDIO | Eje del torque máximo de gradiente de gravedad; «a 500 km» en el dibujo. | l. 371, 426, 442 |
| M9 | 4 | MEDIO | LS_EXPY «inspirador» frente a β = 0,9; definición de la ventana; «la modelo». | l. 135, 183, 311 |
| M10 | 7, 8, 9 | MEDIO | Leyendas de laboratorio de 75–95 palabras y notas de 90–110 con instrucciones de uso. | l. 386/391, 437/442, 292/305 |

Las dos tensiones internas que un lector atento nota (M6, M7) y la palabra que falta (M2) son
las más baratas de corregir. Todas las propuestas de adición de texto llevan su recorte
compensatorio en los informes, porque los nueve temas están en el tope de 650.

## 3. Rendimiento de las simulaciones («a goterones»)

### 3.1 Medición

Reproducción de 2,5 s por laboratorio, 1 280 × 900, Chromium sin GPU. «fps» cuenta
`requestAnimationFrame`; «p95» es el cuadro más lento de cada veinte; «mut/cuadro» son
mutaciones del DOM por cuadro (MutationObserver), proxy del trabajo de React por tick.

| Laboratorio | Prod 1× | Prod CPU ×4 | Dev 1× | Dev CPU ×4 | mut/cuadro |
|---|---|---|---|---|---|
| Tema 1 · DroneLab | **41 fps** (20,7 ms script/cuadro) | — | no hidrata (ver 3.3) | — | — |
| Tema 2 · JumpLab | 60 | 60 | — | — | 1 |
| Tema 3 · HabitatLab | 60 | 60 | — | — | 46 |
| Tema 6 · RegenLab | 60 (p95 17) | 49 (p95 33) | 60 | 21,5 (p50 50) | 48 |
| Tema 7 · BounceLab | 60 | **43** (p95 33) | 60 | **17** (p50 50, máx 133) | 86 |
| Tema 8 · WheelLab | 60 | 45 (p95 33) | 60 | 22 (p50 50, máx 150) | 80 |
| Tema 9 · FlybyLab | 60 | 53 (p95 33) | 59 (máx 67) | 26 (p50 33) | 48 |

Coste por cuadro en producción (CDP `Performance.getMetrics`): script 1,3–2,2 ms y tarea total
5–6,6 ms en los Temas 7–9; **20,7 ms de script y 24,4 ms de tarea en el Tema 1**. En dev, ×3 a ×4.
Los Temas 4 y 5 no tienen reloj.

### 3.2 Diagnóstico

- **Causa raíz (arquitectura):** `useSimClock` despacha un `tick` a un `useReducer` en cada
  cuadro; el estado del reloj vive en React y cambia 60 veces por segundo, así que **todo el
  laboratorio** (escena SVG, gráficas, lecturas, transporte, panel de parámetros, anunciador)
  se reconcilia en cada cuadro. De ahí las 45–86 mutaciones por cuadro.
- **Tema 1:** las cuatro gráficas Recharts de `DroneProfiles` redibujan el marcador vertical en
  cada tick (aunque esté cuantizado a 400 pasos); Recharts es caro por render. Resultado: 41 fps
  en una máquina sin carga, el único laboratorio que no llega a 60 en producción. `DroneLab`
  pesa además 376 KB de JS (Recharts incluido) más 280 KB de datos.
- **Agravantes:** (1) el **servidor de desarrollo** (React de desarrollo y módulos sin
  empaquetar) multiplica el coste por 3–4: con la máquina ocupada (VS Code, dev server, WSL) se
  cae a 17–26 fps, que es lo que Dylan ve; (2) `MAX_FRAME_DT_S = 0,05` hace que un cuadro lento
  no solo salte sino que **frene la simulación** (cámara lenta involuntaria); (3) el modo
  **movimiento reducido** (ajuste global «Movimiento: Reducido», guardado en `localStorage`, o
  `prefers-reduced-motion` del sistema: en Windows, «Efectos de animación» apagados) hace por
  diseño 60 pasos de 250 ms: exactamente goterones. Conviene que Dylan compruebe las dos cosas
  en su navegador antes de atribuirlo todo al código.

### 3.3 Otros hallazgos técnicos de la medición

- **Servidor de desarrollo de Dylan (4321):** `recharts.js` responde 504 «Outdated Optimize
  Dep» y el laboratorio del Tema 1 **no hidrata** («Error hydrating DroneLab»). Es la caché de
  dependencias de Vite desactualizada tras los `pnpm install` de los worktrees; se arregla
  reiniciando `pnpm run dev` (o borrando `node_modules/.vite`). No afecta a producción.
- **Avisos de hidratación (solo dev):** React avisa de atributos SVG que difieren en el último
  decimal entre servidor y cliente (`cy="230.11998998839093"` vs `230.11998998839096`) en la
  figura «umbral» del Tema 7 y en la hipérbola del Tema 9. Inofensivo en producción (React de
  producción no compara), pero ensucia la consola de desarrollo; se evita redondeando las
  coordenadas a dos decimales antes de escribirlas, como ya hacen `PlanetFrame` y otros.
- **Tema 2 con CPU ×4:** el salto dura menos de un segundo y termina antes de medir; sin datos.

### 3.4 Propuesta (fase B, tarea compartida sobre `src/components/lab/**`)

1. **Sacar el tiempo del camino caliente de React.** El reloj guarda `t` en un almacén externo
   (`useSyncExternalStore` con selector, o un ref con `useFrameValue`); solo la **capa móvil** de
   la escena se suscribe por cuadro. Lecturas, transporte y el anunciador se actualizan a
   ~10 Hz (la línea de tiempo tiene 1 000 pasos; no gana nada con 60 Hz).
2. **Memoizar lo estático** de cada escena y gráfica (ejes, rejilla, series completas, etiquetas,
   leyendas) con `memo`/`useMemo`; solo sonda, pelota, cursor y flechas dependen de `t`.
3. **Tema 1:** cursor de las cuatro gráficas como capa propia (una línea SVG superpuesta que se
   mueve fuera del render de Recharts) o, mejor, migrar `DroneProfiles` a `SvgPlot`, que ya tiene
   cursor y es el componente de todas las demás gráficas: unifica la tipografía de las gráficas
   y quita Recharts del sitio (es su único uso).
4. **Objetivo medible:** ≤ 4 ms de script por cuadro en producción sin throttle en los nueve
   laboratorios; ≥ 55 fps con CPU ×4 en los Temas 1, 6, 7, 8 y 9. Y una **prueba e2e de
   rendimiento** (presupuesto de mutaciones por cuadro o fps con throttle) para que no regrese.
5. Revisar `MAX_FRAME_DT_S`: con el reloj fuera de React, un cuadro lento puede saltar sin
   frenar la simulación (interpolar en lugar de recortar), o al menos indicar en pantalla que
   la reproducción va lenta.

## 4. Controles lejos del lienzo

Hoy `LabShell` apila en una tarjeta: título y engranaje → lienzo → notas de la escena (cámara
rápida, tabla «modelo vs dato», lista de leyenda) → barra de reproducción → lecturas; y
**debajo, en otra tarjeta**, «Parámetros»: campos y deslizadores → selector de lado/modo → texto
de llegada → preajustes (6 botones) → texto del valor → ayuda de arrastre y teclado → nota del
modelo. En el Tema 9 a 1 280 px el primer deslizador queda ~700 px bajo el lienzo; en el Tema 7
hay una fila «Motor: Δt = 1/60 s × 4 subpasos · umbral…», cuatro filas de estado, cinco lecturas,
un cambio de modo, un selector de preajuste con su nota de tres líneas y fuente, dos campos, una
barra de umbral y dos párrafos de ayuda antes de acabar. En 390 px el laboratorio del Tema 9 mide
más de 2 800 px de alto.

Propuesta (fase B, `LabShell` y labs):

- **Dos columnas desde `lg`:** izquierda, lienzo + barra de reproducción, **pegajosos** al
  desplazarse; derecha (≈ 20 rem), «Parámetros» primero (los mandos principales arriba), luego
  preajustes compactos, luego lecturas en dos columnas estrechas. Así ningún control queda
  lejos del dibujo que gobierna. En móvil: lienzo → reproducción → mandos → lecturas → resto.
- **Un solo nivel de texto auxiliar:** la ayuda de arrastre/teclado y la nota del modelo pasan a
  dos desplegables cerrados («Cómo se usa», «Qué deja fuera el modelo») o a un «?» junto al
  título; el texto de llegada y la nota del preajuste se acortan a una línea con la fuente como
  enlace.
- **Preajustes** como fichas compactas (nombre + fecha en una línea) o un selector cuando pasan
  de cuatro; las notas de preajuste, de tres líneas a una.
- **Estado del motor (Tema 7)** como una fila de chips o dentro de las lecturas, no como un
  párrafo monoespaciado.

## 5. Tipografía de símbolos (los caracteres en caja)

### 5.1 Causa

Las fuentes del sitio (IBM Plex Sans 400/500/600 y Plex Mono 400/500 vía `@fontsource`, todos los
subconjuntos) **no contienen** estos caracteres, comprobado leyendo la tabla `cmap` de los
archivos: U+20D7 (flecha combinante de vector), → ∞ ≈ ≠ ≤ ≥ √ ∫ ⊥ ☉ ⊙, los subíndices ₀ ₐ ₓ ₕ ₘ ₙ ₚ,
los superíndices ⁻ ⁵ ⁷, el espacio fino U+202F y ẋ/ẍ. Plex Mono tampoco tiene griego (ω δ Δ μ θ τ
α π), que Plex Sans sí. Cuando un carácter falta, el navegador lo pide a la fuente de reserva del
sistema: en este Linux lo encontró (por eso las capturas no muestran cajas), en el Windows de
Dylan no hay fuente que dibuje la marca combinante sobre una base de otra fuente: **caja**. Los
demás caracteres salen de Segoe UI/Cambria en Windows y de otras en Android y macOS: no son
cajas, pero sí **glifos de otra familia**, con peso y altura distintos, mezclados en la misma
etiqueta («v∞», «ω_máx», «≈», «10⁻⁷»).

Dónde están hoy (recuento en el DOM de las nueve páginas): ∞ y U+20D7 solo en el Tema 9; ω/τ/θ/α
en las escenas SVG de los Temas 3 y 8 (73 apariciones); subíndices Unicode en los Temas 1, 2 y 7;
⁻⁷/⁵ en el Tema 8; el espacio fino U+202F en todas las páginas (lo imprime `formatNumber`).
Además, en SVG las etiquetas usan seudonotación ASCII: «V_p», «r_p», «v_y (km/s)», «v∞,out».

### 5.2 Propuesta

- **Fase A (antes de entregar):** quitar la flecha U+20D7 de las dos leyendas del Tema 9 y de
  las tres etiquetas de `FlybyFigure`/`FlybyLab` (y sus pruebas), escribiendo «v = Vₚ + v∞» y
  «|Δv|» como ya hacen las etiquetas vecinas. Es un cambio de cadenas.
- **Fase B, componente compartido de notación** para SVG y HTML, con una regla: ningún texto
  plano usa caracteres fuera de la cobertura de Plex. Dos piezas:
  1. `MathLabel` para SVG: toma una mini‑notación («v_∞,in», «V_p», «ω_máx», «10^-7», «vec v») y
     emite `<tspan>` con sub/superíndices reales (`dy`, 75 %), griego en Plex Sans y los símbolos
     que Plex no tiene (∞ ≈ ≤ → ☉ y la flecha de vector) en **KaTeX_Main**, que ya está cargada en
     todas las páginas (`katex.min.css`) y los contiene todos; los vectores, con el glifo U+20D7
     de KaTeX_Main o con una flecha dibujada (`<path>`) sobre la base.
  2. En HTML (leyendas de figura, títulos de gráfica, etiquetas de lecturas, leyendas de
     `SvgPlot`), permitir KaTeX en línea: `Figure.astro` y `ChartFrame` aceptan `$…$` en la
     leyenda y lo renderizan en el servidor con `katex.renderToString`. Así las leyendas pueden
     decir $\vec v = \vec V_p + \vec v_\infty$ con la misma tipografía que las ecuaciones.
  3. Sustituir «V_p», «r_p», «v_y» por subíndices reales en todas las etiquetas SVG; el espacio
     fino de `formatNumber` puede quedarse (todas las plataformas actuales lo tienen) o pasar a
     U+00A0 con `font-size` reducido en un `<span>`; decidir.
  4. Una prueba unitaria que recorra las cadenas de etiquetas y las leyendas y falle con
     cualquier carácter fuera de la lista permitida, como hoy `tokens.test.ts` vigila los colores.

## 6. Sistema de medidas y aire

### 6.1 Estado

- **Raíz 17 px** (`html { font-size: 106.25% }`): todo rem de Tailwind sale fraccionario. Medido
  en el Tema 9: text-sm 14,875 px, text-xs 12,75 px, h2 26,5625 px, `gap-3` 12,75 px, `p-4` 17 px,
  botón de icono 46,75 px, botón de preajuste con relleno 6,375 × 12,75 px, `.why` 25,5 / 21,25 /
  17 / 4,25 px, `.use-case-part` 34 / 21,25 px, `.equation` 12,75 × 17 px.
- **Inventario** (`grep` sobre `src`): 60 valores distintos de longitud en CSS/Astro (1rem,
  0,75rem, 0,9375rem, 0,8125rem, 1,5625rem, 1,45rem, 2,125rem, 2,25rem, 2,75rem, 3,5rem, 0,35em,
  0,15rem, 0,06em, 0,04em, 12/13/15/16,5/18/19/22/23 px…), 30 clases arbitrarias de Tailwind
  (`size-[18px]`, `text-[12px]`, `rounded-[1px]`, `rounded-[2px]`, `ml-[2.125rem]`,
  `grid-cols-[17rem_…]`, `w-[22rem]`, `max-w-[30rem]`, `right-[13px]`, `top-[3px]`…), `gap-1.5` ×13,
  `py-1.5` ×6, `px-3.5`, radios de 1, 2 y 3 px, bordes de 3 px y la rejilla de 0,75 rem.
- **Jerarquía de separadores:** `.why-part` tiene borde superior discontinuo con 17 px de
  relleno y 21,25 px de margen, y la etiqueta «En el fenómeno» lleva 4,25 px debajo: la distancia
  entre bloques (38 px) es casi la misma que entre el borde y el título (17 px) y la jerarquía no
  se lee, que es lo que Dylan señaló. El mismo borde discontinuo se usa en `.use-case-part`,
  `.equation-legend` y el eje de las tablas: cuatro cosas distintas con el mismo trazo.
- **Densidad:** el cuerpo mide 17 px con interlineado 27,2 px; leyendas y fuentes 14,875 px;
  tablas 15 px; en una pantalla de 1 280 px la columna de lectura mide 833 px y el texto se
  limita a 70 ch, bien. Lo que satura no es el tamaño sino la cantidad de bloques por paso
  (ecuación con leyenda, `Why` con dos partes, figura con leyenda y fuente, tabla con leyenda) y
  la longitud de leyendas y notas (§7).

### 6.2 Propuesta de escala (decisión de Dylan en §11)

| Qué | Hoy | Propuesta |
|---|---|---|
| Raíz | 17 px | **16 px** (quitar el 106,25 %); el cuerpo de lectura se fija aparte |
| Cuerpo de lectura | 17 px / 1,6 | 17 px (`1.0625rem`) solo en `.topic-body`, o 18 px (`text-lg`); interlineado 1,6 |
| Títulos | 34 / 26,56 / 21,25 / 17 (tercera mayor) | Tailwind: h1 36 (`text-4xl`), h2 24 (`text-2xl`), h3 20 (`text-xl`), h4 18 (`text-lg`); interlineado 1,2 |
| Texto auxiliar | 15, 14,875, 13, 12,75, 12 | **14** (`text-sm`) y **12** (`text-xs`), nada más |
| Espaciado | 4,25 … 59,5 px (fraccionarios) y em sueltos | solo **4 · 8 · 12 · 16 · 24 · 32 · 48 · 64** (`1 2 3 4 6 8 12 16`); nada de `1.5`, `3.5`, `0.35em` |
| Radios | 1, 2, 3 px | **4 px** (`--radius: 4px`) y 8 px en tarjetas |
| Bordes | 1, 2, 3 px | 1 px y 2 px |
| Iconos y botones de icono | 18 px; 46,75 px | 20 px (`size-5`); 40 o 44 px (`size-10`/`size-11`) |
| Rejilla de papel | 12 px (mayor 60) | 16 px (mayor 80) o 8 (mayor 40) |
| Anchos | 17rem, 22rem, 28/30/38rem, 9,5rem | 16/18rem, 20/24rem, 32/40rem (múltiplos de 4 rem) |
| Separadores | discontinuo en 4 lugares | un solo trazo (1 px sólido `--border`) para secciones; `Why` sin borde: etiqueta en mono pequeña + 24 px de margen entre partes y 8 px entre etiqueta y texto (relación 3:1 que sí se lee) |
| Ritmo vertical | márgenes por componente | `--flow` de 24 px entre bloques del paso, 48 px entre pasos, 64 px antes del caso de uso |

Con una prueba (`src/styles/scale.test.ts`) que recorra `src` y falle con cualquier longitud
fuera de la escala, como hoy `tokens.test.ts` hace con los colores, la escala se mantiene.

## 7. Saturación de contenido

- **Texto de props por tema** (leyendas, notas, análisis): Tema 5 1 658 palabras, Tema 4 1 076,
  Tema 8 1 054, Tema 1 839, Tema 3 836, Tema 7 799, Tema 9 786, Tema 6 644, Tema 2 437. La regla
  del traspaso es «cada leyenda, dos o tres frases»; las que la rompen están listadas en los
  informes (A4, A5, M10 y las de los Temas 2, 3 y 4).
- **Qué mover a dónde:** resultados numéricos → tablas (p. ej. una Tabla 9.3 «r_p → e, δ, |Δv|,
  v_out detrás/delante»; una Tabla 5.4 «Modos del gatillo adaptativo»; una fila más en la 2.1 y
  en la 4.1); «Lo que el modelo deja fuera» → lista de viñetas dentro de un desplegable; las
  instrucciones de uso → fuera de las leyendas (al «Cómo se usa» de §4); la velocidad de
  reproducción → una sola frase junto a la barra de reproducción.
- **En la interfaz:** el texto de llegada y las notas de preajuste del Tema 9, las cuatro filas
  de estado y el párrafo de ayuda del Tema 7, la nota del Tema 6 (90 palabras) y la del Tema 8
  (110) siguen el mismo patrón: párrafo donde cabe una línea o una tabla.

## 8. Interacción, zoom, escala y realismo

- **Zoom y desplazamiento:** no hay zoom ni paneo en ninguna figura SVG; solo la gráfica de la
  Voyager abre cada encuentro con botones. Propuesta (fase D): un gancho compartido `useZoomPan`
  (rueda con Ctrl, pellizco, arrastre del fondo para desplazar, teclas + − 0, botón «Ajustar»,
  `aria-roledescription` y alternativa de teclado) y un componente `ScaleBar` que, como en los
  mapas, dibuja una barra de longitud redonda (1 R_J, 1 000 km, 10 m…) que se recalcula con el
  zoom y muestra cuánto cambió. `PlanetFrame` ya tiene una barra de escala estática («20 R_J»):
  es el punto de partida. Candidatos por orden: mapa de ruta del Tema 1, marco del planeta del
  Tema 9, hábitat del Tema 3, escena de la rueda del Tema 8, trayectoria del Tema 2.
- **Realismo de los cuerpos:** los planetas son círculos lisos del color del token. Saturno sin
  anillos es lo más visible: sus anillos principales van de 1,24 R_S (borde interior del anillo
  C, 74 490 km) a 2,27 R_S (borde exterior del A, 136 775 km), con la división de Cassini en
  1,95–2,03 R_S (datos de la hoja planetaria de la NASA, por confirmar y citar en la
  investigación). Dibujados **a escala radial**, la V2 (r_p = 2,67 R_S) y la V1 (3,09 R_S) pasan
  justo por fuera del anillo A: el detalle enseña física, no solo adorna. Hay que declarar que
  el plano de los anillos no es el del sobrevuelo (el dibujo es la proyección) y rotular
  «ilustrativo» lo que no sea dato: bandas de Júpiter y Gran Mancha Roja, anillo ε de Urano y
  su eje casi tumbado (98°), tono de Neptuno. Jupiter con bandas y Saturno con anillos siguen la
  regla de «colores con significado real».
- **Microinteracciones (fase D):** transición suave al cambiar de preajuste (200 ms en la
  escena, respetando movimiento reducido), realce de la serie al pasar sobre su entrada de
  leyenda, foco visible en los asideros, feedback táctil del asidero (crece al arrastrar), y la
  barra de reproducción con marcas de evento (rebotes, encuentros, paradas del dron).

## 9. Hallazgos técnicos y de repositorio

- **Publicación:** `origin/main` = Avance 1; `avance-2` es avance rápido (`git push origin
  avance-2:main`). Después, comprobar las nueve páginas vivas.
- **Puerta local hoy:** `pnpm run check` sin errores; 157 archivos de pruebas en verde (26 s).
  Las e2e no se repitieron (verdes en `4526a4e` según el traspaso).
- **Worktrees fantasma:** `git worktree list` registra 16 worktrees en un directorio temporal de
  una sesión anterior que ya no existe; `git worktree prune` los limpia, y las ramas
  `avance-2-*` (base-1…3, docs, old-a/b, tema-6…9, tema-N-fig) ya están integradas: borrarlas
  tras entregar, como dice la limpieza del traspaso. Queda también `stash@{0}` antiguo.
- **Recharts** solo lo usa el Tema 1 (`LineChart.tsx`); si `DroneProfiles` migra a `SvgPlot`,
  sale del sitio (§3.4).
- **Fuentes:** solo se cargan Plex Sans 400/500/600 y Plex Mono 400/500; los subconjuntos
  griego/cirílico/vietnamita se piden solo si hace falta (bien). KaTeX_Main ya está en todas las
  páginas y puede cubrir los símbolos que Plex no tiene (§5.2).
- **Hidratación (dev):** redondear coordenadas SVG a dos decimales donde no se hace (§3.3).

## 10. Plan propuesto

Las fechas ordenan el trabajo, no bajan la barra: lo que no quepa antes del sábado se hace
después y se dice. Los Temas 1 a 9 se vuelven a evaluar en la Entrega Final, así que todo lo
que mejore después del sábado también cuenta.

**Fase A · antes de entregar (viernes 30 y sábado 31).** Solo texto y cadenas, sin tocar diseño
ni laboratorios:
1. A1 flechas del Tema 9 (leyendas, tres etiquetas y pruebas).
2. A2 caso de 1 g del Tema 3 en el `Why` del paso 2 y en el diagrama; M1 huecos «La ecuación» de
   los Temas 1 y 3; M2 Tema 7 («elástica/inelástica», «0 < e < 1»); M6, M7 tensiones internas de
   los Temas 2 y 3; M5 puente del Tema 9; M8 eje del torque del Tema 8; M4 Tema 5 ((5.1) y tercera
   ley); M3 Tema 6 (declarar f(v) a rapidez final, origen del 239 kW, frenada de la 6.3,
   decimales). Cada adición con su recorte, vigilando el 650 con «Copiar Markdown».
3. A4, A5 y M10: leyendas y notas largas (recortes puros).
4. **A3 (Tema 4, datos reales en la figura 4.3)** es un cambio de figura: cabe el sábado si Dylan
   lo aprueba temprano; si no, abre la fase B.
5. Dylan lee los textos (pendientes 1 y 2 del traspaso) → puerta completa (`check`, `test:cov`,
   `build`, e2e en 4322) → `git push origin avance-2:main` → páginas vivas → Moodle.

**Fase B · primera semana de noviembre.** Rendimiento (§3.4), notación de símbolos (§5.2),
controles junto al lienzo (§4) y saturación de interfaz (§7). Son tareas compartidas
(`src/components/lab/**`, `charts/**`, `ui/**`) y van en serie, cada una con brief, revisión
independiente y re-medición (fps y mutaciones por cuadro, antes y después).

**Fase C · sistema de medidas (§6.2).** Raíz 16 px, escala cerrada, radios, separadores, `Why`,
ritmo vertical, y la prueba de escala; pasada visual en 360 y 1 280 px, claro y oscuro, con
capturas para Dylan.

**Fase D · zoom, barra de escala, anillos y microinteracciones (§8).** Empezar por `useZoomPan` +
`ScaleBar` en el Tema 1 y el Tema 9; anillos de Saturno con su fuente en la investigación.

## 11. Decisiones que necesita Dylan

1. **Alcance de la fase A.** ¿Se hacen las correcciones de texto 1–3 antes de entregar y se deja
   lo demás para después? ¿Entra A3 (figura 4.3 con los puntos del `.lut`)?
2. **Tema 6, f(v):** ¿rapidez media (como FASTSim 2; cambian 40,4 % → 41,2 % y la fricción
   0,062 → 0,046 kWh en texto, tabla y traspaso) o rapidez final declarada en la nota?
3. **Raíz 16 px y cuerpo de lectura:** ¿17 px (como hoy) o 18 px (`text-lg`)? ¿Títulos en la
   escala de Tailwind (36/24/20/18)?
4. **Notación de vectores en texto plano:** flecha (vía KaTeX_Main o dibujada) o solo módulos y
   la flecha únicamente en las ecuaciones KaTeX. Y «V_p» → «Vₚ» con subíndice real en SVG.
5. **Laboratorio en dos columnas desde `lg`** con lienzo pegajoso, y los textos de ayuda y de
   supuestos en desplegables: ¿sí?
6. **Anillos de Saturno a escala radial** y detalles «ilustrativos» (bandas de Júpiter, eje de
   Urano): ¿cuánto realismo y con qué rótulo?
7. **Voz de las líneas de fuente** (pendiente 7 del traspaso): «del autor» o «que calculé».
8. **Espacio fino U+202F** en los números: dejarlo (depende de la fuente del sistema) o
   reemplazarlo por un `<span>` con NBSP estrecho.

## 12. Ajustes tras la lectura de Dylan (30 de octubre, tarde)

Dylan aprobó el plan y propuso dos cosas. Qué se ratifica, qué se matiza y por qué.

### 12.1 «Mover la personalización a Ajustes y dejar visibles solo los controles pertinentes»

Ratificado en parte. La objeción que él mismo anota (los parámetros quedan escondidos) es
real, y la consigna exige que la simulación tenga «al menos un control que el visitante pueda
manipular» a la vista. Regla de tres niveles para todo laboratorio:

1. **Parámetros físicos** (los del tema: e y h₀; v₀ y g; r_p y lado; v_máx y a_máx; N y r…):
   siempre visibles junto al lienzo, nunca en el cajón.
2. **Escenario y preajustes** (qué pelota, qué encuentro, qué ciclo, qué modo): visibles pero
   compactos (fichas de una línea o un selector cuando pasan de cuatro).
3. **Personalización** (vectores, estela, rejilla, decimales, velocidad, repetir, unidades):
   en el cajón de Ajustes, que ya existe. Para que lo oculto no se pierda, una **fila de chips
   con el estado activo** junto al engranaje («1× · vectores · estela»), que abre el cajón al
   pulsarla.

La ayuda de uso y los supuestos del modelo salen del flujo principal a dos desplegables
cerrados («Cómo se usa», «Qué deja fuera el modelo»). El diseño en dos columnas desde `lg`
(§4) se mantiene: con los niveles 1 y 2 a la derecha del lienzo, nada queda lejos.

### 12.2 «Ponerse en la piel del usuario»: el Tema 6 a 20× es una ráfaga de luces

Ratificado del todo. Es un defecto de diseño, no de física: la cámara rápida convierte 1 369 s
en 68 s y la escena cambia de fase cada pocos cuadros; el lector no sabe qué ve ni por qué, y
el factor 20× solo aparece en la nota al pie. Regla nueva, para todos los laboratorios:

> **Legibilidad a velocidad real.** Cada laboratorio declara su escala de tiempo **en el
> lienzo**, junto a lo que se mueve, y ofrece al menos una vista a 1× en la que el fenómeno se
> entiende.

Aplicación:

- **Tema 6 (fase B):** vista por **tramo**: por omisión se muestra una frenada (la de la figura
  6.3, 381–397 s) a 1×, con la velocidad, la fase y los flujos legibles; la línea de tiempo
  lleva **marcas de evento** (las 17 detenciones del UDDS) y botones «frenada anterior /
  siguiente»; un **minimapa** del ciclo entero (v frente a t) sitúa el tramo; el ciclo completo
  sigue disponible como vista «Ciclo» a 4× o 20×, con el factor sobre el lienzo. **Fase D: modo
  «Conducir»**: el lector gobierna acelerador y freno (teclas ↑/↓ o pedales en pantalla); el
  mismo núcleo (`intervalFlow`) integra v(t) a partir del pedal con la carga en carretera, f(v)
  y P_máx, y muestra en vivo qué parte va a la batería y qué parte a las pastillas. El dato
  real (UDDS) queda como referencia comparable con la conducción propia.
- **Tema 1:** mismo patrón: el tramo a 1× (una parada del dron) y la ruta completa a 4×; las
  paradas como marcas de evento.
- **Tema 9:** la cámara rápida es legítima (el paso dura horas o días), pero el factor va sobre
  el lienzo junto a la sonda, no en la nota, y hay un botón «ir a la máxima aproximación».
- **Tema 8:** la perturbación en cámara rápida es legítima (días); el factor, sobre el lienzo.
- **Tema 7 y Tema 2:** ya van a 1×; nada que cambiar.

### 12.3 Zoom: botones en el lienzo, ratón y teclado, no solo una barra

Ratificado; había un malentendido de nombre: la «barra de escala tipo mapa» de §8 es un
**indicador** (una línea rotulada «1 000 km» que se recalcula con el zoom), no un control. El
control será el de una graficadora o un motor de simulación:

- **Grupo de botones en una esquina del lienzo:** `+`, `−`, «Ajustar» (vuelve a encuadrar) y
  «1:1»; el mismo grupo en todas las escenas.
- **Ratón y táctil:** rueda con Ctrl (o rueda sola si el lienzo tiene el foco), pellizco,
  arrastre del fondo para desplazar (los asideros siguen siendo arrastrables).
- **Teclado:** `+`, `−`, `0` (ajustar), flechas para desplazar con el lienzo enfocado;
  anunciado con `aria-roledescription` y en el «Cómo se usa».
- **Indicadores:** la barra de escala con su longitud redonda y el factor de zoom («×2,5»).
- Opcional: minimapa cuando el dibujo excede el lienzo (lo comparte con el Tema 6).

### 12.4 Efecto en el plan

- **Fase B** suma «legibilidad a 1×» (Temas 6 y 1), el modelo de tres niveles y los
  desplegables; **Fase D** suma el modo «Conducir» del Tema 6 y el zoom con botones.
- **Fase A** se hizo el 30 de octubre por la tarde: cinco tareas en paralelo (Tema 9 y flechas;
  Temas 1–3; Temas 5–6; Temas 7–8; Tema 4 con la figura 4.3), cada una con revisión
  independiente y ronda de correcciones, más la prueba del tope de 650 palabras; seis commits en
  `avance-2` (`f4dcb0e`, `935d3e4`, `681482d`, `1715ec4`, `aac05b4`, `ac2a6a2`). La lista de frases
  cambiadas está en `2026-10-30-fase-a-cambios.md`. La rúbrica estimada sube a 15,5–16 de 16 si
  los textos pasan la lectura de Dylan.
- **Decisión pendiente de Dylan:** Tema 6, f(v) a rapidez media (como FASTSim 2) o final
  (declarada): en la fase A se declara; el cambio de modelo, si lo quiere, va en la B.
