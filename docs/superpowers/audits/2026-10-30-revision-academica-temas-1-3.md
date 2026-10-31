# Revisión académica · Temas 1 a 3 (30 de octubre de 2026)

Informe del revisor académico (subagente de Claude, solo lectura) que alimenta la auditoría
integral `2026-10-30-auditoria-integral.md`. Contrastó `src/content/topics/{dron-reparto,salto-personaje,gravedad-artificial}.mdx` con las tablas (`src/lib/tables/topics/*.ts`), el núcleo de física, los datos, las figuras, el material de clase (Módulos 1 y 2), la investigación de fuentes y los dos traspasos. Las líneas se refieren al estado de la rama `avance-2` en `92d1545`.

**Presupuesto de prosa (contador del sitio, reimplementado):** Tema 1 = 648, Tema 2 = 650, Tema 3 = 649 palabras. Los tres están en el tope: toda adición exige un recorte equivalente. Los `meaning` de los símbolos, las leyendas y las notas cuentan como *props*, no como prosa, así que mover texto de la prosa a esos lugares libera presupuesto.

---

## Tema 1 · Dron de reparto (`src/content/topics/dron-reparto.mdx`)

### A. Corrección física

Recálculo (ruta `(0;0)→(600;200)→(900;800)→(300;1100)→(0;0)`, v_máx = 10 m/s, a_máx = 2,5 m/s², entregas 3 × 20 s):

- Tramo 1: d = √(600² + 200²) = 632,46 m; θ = atan2(200, 600) = 18,43°; T = d/v + v/a = 63,25 + 4 = 67,25 s → «632,5 m», «18,4°», «T = 67,2 s», «63,2 s» ✓. tₐ = 10/2,5 = 4 s; d_a = 10²/(2·2,5) = 20 m ✓.
- Tramos 2–4: 670,82 m (63,4°), 670,82 m (153,4°), 1 140,18 m (−105,3°); T = 71,08, 71,08, 118,02 s. Suma d = 3 114,3 m ✓. Suma T = 327,43 + 60 = 387,43 s → «387,4 s» ✓. Muestras a 0,1 s: ⌈387,43/0,1⌉ + 1 = 3 876 ✓.
- Ecuación (1.3): continuidad en t = T − tₐ comprobada ✓. (1.1), (1.2), (1.4) correctas; el criterio de signos coincide con el Tema 1.1 de clase ✓.
- Límites ArduPilot (10 m/s, 2,5 m/s², 1 m/s³) y PX4 (12, 5, 3, 4) coinciden con la investigación ✓. Error de 5 mm/s por redondeo al mm con diferencias centrales a 0,1 s ✓.

Hallazgos:

| Línea | Sev. | Texto | Problema | Propuesta |
|---|---|---|---|---|
| 135 | MEDIO | «el dron se retrasa respecto de la **consigna**» | «Consigna» aquí es el *setpoint* de control, pero en todo el sitio «consigna» es la asignación del profesor. | «se retrasa respecto de la referencia, se pasa del punto y oscila» |
| 275 | BAJO | «si el viento saca al dron 15 m del tramo» | 15 m no sale de ninguna fuente ni del código. | «si el viento lo saca del tramo» o marcarlo como ejemplo |
| 89 | BAJO | `'rumbo del tramo, medido desde el eje x'` | El rumbo náutico se mide desde el norte y en sentido horario; aquí θ es el ángulo matemático con +x. | «ángulo θ del tramo con el eje x (antihorario)» |
| 289 | BAJO | «cos θ y sin θ, los cosenos directores» | Correcto en 2D solo porque cos β = sin θ; conviene decirlo. | «cos θ y sin θ (= cos β), los cosenos directores» |
| 124 | BAJO | «La velocidad salta de 0 a 10 m/s al **despegar**» | El modelo es plano. | «al arrancar» |
| 112 | BAJO | «El vector de posición de B … y la velocidad … van a escala 1 m/s = 15 m» | Solo v va a escala. | «…y la velocidad sobre el primer tramo (rumbo 18,4°), dibujada a escala 1 m/s = 15 m» |

### B. Rúbrica

1. **Casos de uso.** Caso concreto (ArduPilot Copter 4.6.3, PX4) ✓, citado ✓, justificación ✓, balance ✓. **Falta el ítem (ii):** el hueco `ecuacion` (l. 269) solo remite a «(1.3)» sin escribir ninguna ecuación. Propuesta: «Ese generador impone |v⃗| ≤ v_máx, |a⃗| ≤ a_máx y |da⃗/dt| ≤ j_máx a los vectores de referencia; el trapecio (1.3) cumple las dos primeras y deja el jerk infinito en t = 0, tₐ, T − tₐ y T.»
2. **Recursos.** Visualización con ejes, unidades, fuente y datos reproducibles ✓. Excelente.
3. **Cobertura.** Conexiones con Temas 2, 3 y 6 y con Temas 1.1/1.3 de clase ✓. Excelente.
4. **Calidad.** Fuentes con rigor ✓. Resta la saturación de la figura 1.4 y dos estilos de comillas (l. 263 usa "…"; el sitio usa «…»).

### C. Redacción

| Línea | Sev. | Texto | Problema | Propuesta |
|---|---|---|---|---|
| 124 | MEDIO | «Es la alternativa sin física de cualquiera con un mapa: rumbo fijo y rapidez constante.» | Sintaxis forzada. | «Es lo que haría quien solo tiene un mapa: rumbo fijo y rapidez constante, sin física.» |
| 181 | MEDIO | «la velocidad no cambia más rápido que a_máx, y la misión, una rapidez tope, v_máx.» | Verbo elidido que no se recupera. | «…la velocidad no cambia más rápido que a_máx; la misión, además, fija una rapidez tope, v_máx.» |
| 281 | MEDIO | «Dos parámetros reparten rapidez y suavidad; las curvas S suman el jerk.» | Críptico. | «Con dos parámetros, v_máx y a_máx, se negocia rapidez contra suavidad; las curvas S añaden un tercero, el jerk.» |
| 135 | BAJO | «sin hora de llegada honesta» | Coloquial. | «sin una hora de llegada fiable» |
| 210 | BAJO | «La ruta completa toma 387,4 s.» | Calco del inglés. | «La ruta completa dura 387,4 s.» |
| 263 | BAJO | `"follows a smooth curving path…"` | Comillas rectas. | «follows a smooth curving path…» |
| 20 | BAJO | fuente 2 sin `year` | Única fuente del sitio sin año. | Añadir el año de la etiqueta o «s. f.» |

### D. Saturación

- **l. 246, leyenda de la figura 1.4 (≈ 170 palabras) + l. 253, nota (≈ 130 palabras).** ALTO. Contradice «cada leyenda, dos o tres frases». Propuesta: leyenda de tres frases (qué hay, cómo se manipula, qué se lee en la línea vertical); la lección «donde x(t) sube en recta, vₓ es constante…» pasa al `Why` del paso 4; los datos de validación (3 876 muestras, 1 mm/s, 5 mm/s, muestreo 0,5 s) a una fila/nota de la tabla 1.1 o a la nota del laboratorio; «lo que el modelo deja fuera» como lista de tres ítems.
- **l. 196, leyenda de la figura 1.3.** MEDIO. Repite tₐ, d_a, T y 63,2 s de la tabla 1.1 → «Perfil trapezoidal del primer tramo frente a la rapidez constante; tₐ, d_a y T, en la tabla 1.1».

---

## Tema 2 · El salto del personaje (`src/content/topics/salto-personaje.mdx`)

### A. Corrección física

- Celeste con g terrestre y v₀ = 13,1 m/s: h = 13,1²/(2·9,81) = 8,75 m ✓; tₐ = 1,34 s.
- Salto sostenido: 0,2 s a 105 px/s (21 px) + (105² − 40²)/(2·900) = 5,24 px + 40²/(2·450) = 1,78 px → 28,0 px = 3,50 m ✓; t = 0,361 s ✓. Con 9,81: 0,845 s ✓.
- Mario: h = 4 m, t_h = 32/60 s → g = 28,1 m/s²; v₀ = 15,0 m/s ✓.
- Toque en Celeste: 0,766 m / 0,763 m, t = 0,117 s ✓. 112,5/9,81 = 11,47 ✓. 11 px/8 = 1,375 m ✓.
- Euler semi-implícito: el ápice baja v₀Δt/2 ✓ (exacto si t_h es múltiplo de Δt; a 144 fps es «≈»). 3,750, 3,875, 3,948 ✓.
- Topes de caída: 20 m/s; 15 m/s ✓. g de caída de Mario 98,4 m/s² ✓; 0,343 s ✓.
- Tabla 2.1: todas las conversiones correctas ✓. (2.1)–(2.4) y el recuadro de clase correctos ✓.

Hallazgos:

| Línea | Sev. | Texto | Problema | Propuesta |
|---|---|---|---|---|
| 244 | MEDIO | «Entre cuadros Madeline cumple la ecuación (2.1) con v₀ = 105/8 y g = 900/8.» | Contradice la l. 256 («el motor no evalúa la ecuación (2.1), suma cuadro a cuadro»). | «El modelo continuo de Madeline es la (2.1) con v₀ = 105/8 y g = 900/8; el motor la aproxima cuadro a cuadro (balance).» |
| 130 | MEDIO | «Su salto sostenido de 3,5 m tardaría 0,84 s…» | 3,5 m y 0,36 s son cálculo propio sin marca; «Su» con antecedente lejano. | «El salto sostenido de Madeline, 3,5 m según mi cálculo (figura 2.3), tardaría 0,84 s…»; mejor, una fila en la tabla 2.1. |
| 244 | BAJO | «(0; −9,8)» | Los literales de código se citan tal cual, con punto. | «`(0, -9.8)`» en fuente de código |
| 165 | BAJO | «pedir h = 4 m y t_h = 32 cuadros…» | No se dice de dónde salen. | «h = 4 m (cuatro bloques) y t_h = 32 cuadros = 0,533 s, los del desensamblado» |
| 256 | BAJO | «3,75, 3,88 y 3,95 m a 30, 60 y 144 cuadros/s» | A 144 fps es aproximado. | «≈ 3,95 m» |
| 119 | BAJO | «sube 8,75 m» | Decir que usa 13,1. | «con 13,1 m/s sube 8,75 m» |

### B. Rúbrica

1. **Casos de uso.** Excelente (único de los tres que cumple (ii) por completo).
2. **Recursos.** Excelente.
3. **Cobertura.** Excelente.
4. **Calidad.** Voz de las líneas de fuente mezclada (l. 110 «calculada por el autor»; l. 147 y 182 «que calculé»). Balance saturado.

### C. Redacción

| Línea | Sev. | Texto | Problema | Propuesta |
|---|---|---|---|---|
| 209 | MEDIO | «El salto variable cambia un parámetro, no la curva: …» | No se entiende sin contexto. | «El salto variable no cambia la ecuación, solo un parámetro: Celeste mantiene v_y 0,2 s mientras se sostiene el botón y divide g entre dos cerca del ápice.» |
| 119 | BAJO | «Subir g lo acorta, pero también lo baja.» | Ambiguo. | «Subir g acorta el tiempo, pero también reduce la altura: no se ajustan por separado.» |
| 136 | BAJO | «en (v₀, g) no se separan.» | Elíptico. | «con (v₀, g) como mandos, altura y tiempo no se ajustan por separado.» |
| 250 | BAJO | «una tabla (x, y) precalculada también, y fija vₓ.» | Elipsis doble. | «una tabla (x, y) precalculada falla igual y además fija vₓ.» |
| 194 | BAJO | «En el laboratorio se arrastra v⃗₀ y se recorre t.» | Impersonal. | «En el laboratorio arrastro v⃗₀ y recorro t.» |
| 238 | BAJO | «(8 × 11 px, 1,4 m de alto)» | Parece la altura de la caja. | «(8 × 11 px; a esa escala Madeline mide 1,4 m)» |

### D. Saturación

- **l. 256, hueco `balance` (≈ 110 palabras, cinco ideas).** MEDIO. Dejar ganancia, Euler semi-implícito con v₀Δt/2, paso fijo y escala; los tres valores (3,75/3,88/3,95 m) a la tabla 2.1 o a la nota del laboratorio.
- **l. 228, nota del laboratorio.** BAJO. Mejor con viñetas.

---

## Tema 3 · Gravedad artificial (`src/content/topics/gravedad-artificial.mdx`)

### A. Corrección física

- 2 RPM: ω = 0,2094 rad/s; r = 9,81/ω² = 223,64 m ✓. 1 RPM: 894,56 m ✓. Toro 830 m a 1 RPM: 0,928 g → «0,93 g» ✓; v = 86,92 m/s ✓. 895 m: 1,00 g ✓. Pared interior 765 m: 0,86 g ✓.
- 10 m: 9,458 RPM ✓; 100 m: 2,991 RPM ✓. Gradientes 0,80 %, 18 %, 1,8 % ✓. Con g = 9,8: 223,41 m ✓. Simulador de clase ✓.
- Coriolis «0,55 m → 5,3 cm» es cifra de SP-413 ✓ (estimación propia 5,1 cm). 150 000 t ✓. Tubo de 130 m ✓. Nota del laboratorio 60/6 = 10 s ✓.
- (3.1)–(3.4) correctas. Tabla 3.3 coincide con SpinCalc ✓.

Hallazgos:

| Línea | Sev. | Texto | Problema | Propuesta |
|---|---|---|---|---|
| 235 vs 289 | MEDIO | Leyenda 3.4: «la gravedad aparente de igual magnitud **hacia afuera**»; recuadro: «la “gravedad aparente” **no tira hacia afuera**» | Un evaluador lo leerá como contradicción. | «la gravedad aparente que **percibe** la persona, −a⃗_c, hacia afuera (no es una fuerza: es el efecto de que el piso la empuje hacia el eje)». |
| 143 | MEDIO | «Respecto de la nave, que cae entera con g⃗, la (3.1) queda n = m ω² r» | Se salta el paso a⃗ − g⃗ = a⃗_c. | «La nave cae con g⃗ y la persona, además, acelera ω²r hacia el eje: a⃗ − g⃗ = a⃗_c, y la (3.1) da n = m ω² r; con ω², doblar el giro divide el radio entre cuatro.» |
| 121 / 78 | BAJO | Símbolo N = «velocidad de giro, RPM» dos ecuaciones después de la unidad N (newton) | Misma letra con dos sentidos. | En el `meaning`: «velocidad de giro (N aquí es el giro, no el newton)» |
| 129 vs 221, 246 | BAJO | «velocidad tangencial del piso» / «rapidez del piso» | Dos nombres. | «rapidez tangencial del piso» |
| 221 | BAJO | «a R = 830 m el piso va a 86,9 m/s» | R donde el tema usa r. | «con el radio mayor del toro, 830 m» |

### B. Rúbrica

1. **Casos de uso.** SpinCalc + SP-413 ✓; justificación ✓; balance ✓. **Falta (ii):** el hueco `ecuacion` (l. 267) no escribe la ecuación. Propuesta: «SpinCalc resuelve a_c = ω² r = v²/r = ω v: con dos de (r, ω, v, a_c) obtiene los otros dos. Según el informe, solo radios mayores de 895 m dan 1 g bajo 1 RPM (figura 3.2).»
2. **Recursos.** Diagrama propio completo ✓. **Falta en el recurso prescrito el caso numérico de 1 g (ALTO):** `HabitatDiagram.astro` anota «r = 223,6 m → 0,8 %» y «r = 10 m → 18 %» pero nunca «a_c = g» con su N; el caso vive solo en la leyenda 3.2 y en la tabla 3.1. Propuesta doble: (a) en el `Why` del paso 2 (l. 143) escribir el caso resuelto: «A N = 2 RPM, ω = 2π·2/60 = 0,209 rad/s y r = g/ω² = 9,81/0,209² = 223,6 m; a la inversa, r = 100 m pide ω = √(9,81/100) = 0,313 rad/s = 2,99 RPM»; (b) en el diagrama añadir «a_c = g: 2 RPM → r = 223,6 m · 1 RPM → 894,6 m». Compensar palabras recortando l. 180 y moviendo la aclaración de ω (l. 125) al recuadro.
3. **Cobertura.** Excelente.
4. **Calidad.** Dos colones encadenados en la leyenda 3.2, términos duplicados (v), R/r.

### C. Redacción

| Línea | Sev. | Texto | Problema | Propuesta |
|---|---|---|---|---|
| 180 | MEDIO | «Un radio pequeño exige un ω = √(g/r) alto, sobre las ≈ 3 RPM de adaptación…» | Densa; «≈» en prosa. | «Un radio pequeño exige un ω = √(g/r) alto, por encima de las 3 RPM a las que, según SP-413, la gente se adapta tras una exposición prolongada; entonces Coriolis desvía a quien salta y girar la cabeza marea.» |
| 152 | BAJO | «frente a r: a giro fijo, una recta que corta la línea de 1 g en r = g/ω²: a 2 RPM…» | Dos dos puntos encadenados. | «…frente a r. A giro fijo es una recta que corta la línea de 1 g en r = g/ω²; a 2 RPM, …» |
| 168 | BAJO | «La cabeza, h más cerca del eje, siente ω²(r − h).» | Telegráfico. | «La cabeza está h más cerca del eje y siente ω²(r − h), menos que los pies.» |
| 69 | BAJO | «girar es la única manera factible de fabricarla» | Antecedente poco claro. | «…de fabricar gravedad» |
| 273 | BAJO | «Decide ese par, no g.» | Sujeto elidido. | «El diseño decide ese par, no g.» |
| 279 | BAJO | «…y el mareo: 10 m, más baratos, piden 9,46 RPM.» | Dos puntos que no explican. | «…y el mareo: un radio barato de 10 m pide 9,46 RPM, por encima de todo límite de confort.» |
| 125 | BAJO | `meaning` de ω (20 palabras) | Demasiado para la tabla de símbolos. | «velocidad angular (la “frecuencia angular” de la consigna)»; el resto, al recuadro |

### D. Saturación

- **l. 195, leyenda de la figura 3.3 (≈ 75 palabras).** MEDIO. La frase de Coriolis no está en la gráfica; pertenece al paso 3. Las bandas ya están en la tabla 3.3.
- **l. 246, leyenda del laboratorio.** BAJO. Repite los tres preajustes con sus números.

---

## Observaciones transversales

- **Exactitud numérica:** ningún número incorrecto en los tres temas.
- **Tipografía:** coma decimal, espacio fino antes de unidades, «°» pegado, signo menos U+2212 ✓. Único literal con guion ASCII: l. 244 del Tema 2, dentro de LaTeX.
- **Voz:** primera persona ✓; líneas de fuente mezclan «del autor» y «que calculé» (Tema 2); dos frases impersonales (Tema 2, l. 194 y conexión al Tema 7).
- **Presupuesto:** los tres temas están en 648–650 palabras.

## Puntuación estimada

| Tema | Criterio | Est. | Razón |
|---|---|---|---|
| 1 Dron | 1 Casos de uso | 3,5 | El hueco «ecuación» no escribe ninguna ecuación (ítem ii). |
| 1 Dron | 2 Recursos | 4 | Visualización con ejes, unidades, fuente y datos reproducibles. |
| 1 Dron | 3 Cobertura | 4 | Conexiones explícitas con Temas 2, 3, 6 y clase. |
| 1 Dron | 4 Calidad | 3,5 | Leyenda 1.4 de 170 palabras + nota de 130; comillas mixtas. |
| 2 Salto | 1 Casos de uso | 4 | Ecuación explícita en el hueco; justificación y balance cuantificados. |
| 2 Salto | 2 Recursos | 4 | Simulación con v₀ y g, k, preajustes, diseñador (h, t_h) e integrador alternativo. |
| 2 Salto | 3 Cobertura | 4 | Consigna cubierta ítem por ítem. |
| 2 Salto | 4 Calidad | 3,5 | Contradicción «cumple (2.1)» / «no evalúa (2.1)»; balance saturado; voz mixta. |
| 3 Hábitat | 1 Casos de uso | 3,5 | El hueco «ecuación» tampoco escribe la ecuación. |
| 3 Hábitat | 2 Recursos | 3,5 | El caso numérico de 1 g (radio y rpm) no está en el diagrama ni en la prosa. |
| 3 Hábitat | 3 Cobertura | 4 | MCU, a_c, T, f, gradiente, Coriolis; cuatro conexiones. |
| 3 Hábitat | 4 Calidad | 3,5 | «Gravedad aparente hacia afuera» en el dibujo frente a «no tira hacia afuera» en el recuadro; R/r. |

**Prioridad:** (1) Tema 3: caso numérico de 1 g en prosa y en el diagrama (ALTO); (2) Tema 1: leyenda/nota de la figura 1.4 (ALTO); (3) ecuación explícita en los huecos `ecuacion` de Temas 1 y 3 (MEDIO); (4) Tema 2 l. 244 y Tema 3 l. 235/289 (MEDIO); (5) reescrituras MEDIO; (6) BAJO.
