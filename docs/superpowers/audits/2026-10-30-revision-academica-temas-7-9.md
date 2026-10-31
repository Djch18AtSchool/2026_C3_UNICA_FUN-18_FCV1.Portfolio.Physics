# Revisión académica · Temas 7 a 9 (30 de octubre de 2026)

Informe del revisor académico (subagente de Claude, solo lectura) que alimenta la auditoría
integral `2026-10-30-auditoria-integral.md`. Contrastó `src/content/topics/{coeficiente-restitucion,ruedas-reaccion,asistencia-gravitatoria}.mdx` con las tablas, los núcleos (`collision`, `rotation`, `gravitation`), los datos, `voyager-speed.json`, los diagramas del Tema 8, `VoyagerSpeedChart.tsx`, las notas de investigación, el traspaso y el material de clase (Módulos 3 y 4). Las líneas se refieren a `avance-2` en `92d1545`.

**Veredicto corto.** No hay errores de física. Todos los números recalculados coinciden con el texto y con el código. Ningún hallazgo CRÍTICO. Un ALTO (flechas U+20D7 en dos leyendas del Tema 9, defecto visible), seis MEDIO y una veintena de BAJO de redacción.

---

## Tema 7 · `src/content/topics/coeficiente-restitucion.mdx`

### A. Física (verificado)

- (7.1) e = −v′_y/v_y = √(h′/h), h_n = e^{2n}h₀ ✓. ITF: √(1,35/2,54) = 0,729, √(1,47/2,54) = 0,761, centro 0,745 ✓ (l. 222).
- (7.2) velocidades finales y ΔK = −½μ(1−e²)v_rel² ✓. Ejemplo de clase: e = 0 → (2; 2), e = 0,75 → (1,25; 3,5), e = 1 → (1; 4); p = 6 kg·m/s; K_cm = 6 J ✓ (l. 274, 429). Con e = 0,75 la pérdida es 1,31 J ✓.
- (7.3) T = t₀(1+e)/(1−e) ✓; N = ⌊ln(v₀/v_th)/ln(1/e)⌋+1: Unity (2 m/s): 8, h = 18,5 cm ✓ (l. 320); Box2D (1 m/s): 15 ✓ (l. 326). El impulso j = −m_ef(v_n + e v_n⁻) es la línea de v3.1.1 ✓.
- (7.4) e(v) = 0,79 − 0,009|v| da 0,754 a 4 m/s y 0,637 a 17 m/s frente a 0,76/0,64; declarado «ilustrativo», aceptable.
- Tabla 7.2: superbola 0,864 → «0,86» ✓; béisbol 0,49 ✓; FIBA 0,758–0,776, FIFA 0,822–0,880 ✓.

Hallazgos:

1. **l. 286 · MEDIO** — «Con e < 1 hay infinitos botes en un tiempo finito T». Falso para e = 0. Corregir: «Con 0 < e < 1 hay infinitos botes en un tiempo finito T».
2. **l. 311 (símbolo N) · BAJO** — El criterio de Box2D es estricto (`<`). Escribir «deje de superar el umbral».
3. **l. 378 · MEDIO** — «Con e(v), los botes lentos rebotan más: lo contrario del umbral». Ambiguo. → «Con e(v), a baja velocidad e es mayor y la serie de botes pequeños se alarga: justo lo contrario del umbral, que la corta».
4. **l. 403 · BAJO** — v3.1.1 tiene el mismo umbral que v3.2.0. → «que vale `1.0f * lengthUnits` en ambas versiones: 1 m/s según mi cálculo».
5. **Cobertura del concepto · MEDIO** — La consigna pide «colisiones elásticas e inelásticas». En la prosa nunca aparecen las palabras «elástica»/«inelástica» ni la clasificación por e (solo el `Callout` y `Connections`). Propuesta: l. 234 → «Si el impulso externo es despreciable, dos cuerpos que chocan conservan el momento lineal; e aporta la segunda ecuación: e = 1 es el choque elástico (K se conserva), e = 0 el completamente inelástico, y entre ambos, inelástico.» (+14 palabras; recortar l. 415 y 421.)

### B. Rúbrica

- **Casos de uso: 4.** Box2D fijado a tag/commit/línea, ecuación mapeada símbolo a símbolo (l. 409), alternativa no física explícita y balance con costos concretos.
- **Recursos: 4.** Simulación prescrita con control de e (paso 0,001), preajustes reales y «se siente mal», modo de dos cuerpos; figuras con ejes, unidades y fuente; tablas con fuente por fila. Única debilidad: la nota del laboratorio (D.2).
- **Cobertura: 3,5 → 4 con A.5.**
- **Calidad: 4.** Veintiuna fuentes con tag, commit y líneas. Solo la comilla inglesa de C.3.

### C. Redacción

1. l. 234 · BAJO — «y e da la segunda ecuación» → «y e aporta la segunda ecuación que falta».
2. l. 286 · BAJO — «salvo si la aproximación no supera un umbral» → «solo si la aproximación supera un umbral».
3. l. 320 · BAJO — «“dormiría”» → «dormiría» con comillas angulares.
4. l. 349 · BAJO — «baja de ≈ 0,76 a unos 4 m/s a ≈ 0,64 a unos 17 m/s» → «baja de ≈ 0,76 (a unos 4 m/s) a ≈ 0,64 (a unos 17 m/s)».
5. l. 363 · BAJO — → «0,79 y 0,009 s/m: ajuste lineal ilustrativo a esas dos lecturas de Cross (cálculo propio)».
6. l. 415 · BAJO — «Un número por forma vale siempre y conserva el momento.» → «Un número por forma sirve para cualquier altura, masa y par de materiales, y el impulso conserva el momento.»
7. l. 421 · BAJO — → «A cambio, el umbral para la pelota en seco y la mezcla es arbitraria: e es del par, no del material, y cada motor la combina distinto (tabla 7.1).»
8. l. 429 · BAJO — → «la fila e = 0 es la “Captura de una pieza” del concepto 03».
9. l. 372 · BAJO — «aun con varios contactos» → «también cuando hay varios contactos a la vez».
10. Flechas U+20D7: **ninguna** en este archivo.

### D. Saturación

1. **l. 386 (leyenda del laboratorio) · MEDIO** — 75 palabras. Propuesta (≤ 45): «Laboratorio del rebote: la misma pelota con física ideal, (7.1) y (7.3), y en un motor con paso Δt, umbral, regla de mezcla y Baumgarte. Mueve e o h₀ y compara el e medido; los preajustes cargan pelotas reales y rebotes que se sienten mal; el modo “Choque de dos cuerpos” aplica la (7.2).»
2. **l. 391 (nota del laboratorio) · MEDIO** — 90 palabras. Partir en dos: (a) reproducción y g; (b) «Fuera del modelo: …» como lista.
3. l. 274 (leyenda 7.2) · BAJO — si se recorta, quitar «en las cuatro filas».

---

## Tema 8 · `src/content/topics/ruedas-reaccion.mdx`

### A. Física (verificado)

- I_s = 0,18517 kg·m² ✓; I_w = 9,55·10⁻⁵ kg·m² ✓; I_s/I_w = 1 939 ≈ 1 940 ✓ (l. 226, 262).
- (8.1) ✓; vueltas = 485 ✓.
- (8.2) |τ| = 0,32 mN·m ✓; L_w,pico = 19,4 % de L_máx ✓ (l. 380); ω_w = 970 rpm ✓; T_mín ≈ 12 s ✓. Tabla 8.2 coincide con la investigación §7.
- (8.3) τ_gg,máx = 2,285·10⁻⁷ N·m → «2,28» ✓; t = 2,188·10⁵ s = 2,53 d ✓.
- (8.4) magnetopar 1,2·10⁻⁵ N·m; 52 → «50 veces» ✓; vaciar: 71 min ✓.
- Signos coherentes con el código (`slewStateAt`) y con el diagrama ✓.

Hallazgos:

1. **l. 371 (y leyenda l. 380, nota l. 442, panel B) · MEDIO** — El máximo 2,28·10⁻⁷ N·m es el torque de cabeceo alrededor del eje de 226,3 mm (ΔI = 0,124 kg·m²), no alrededor del eje z de la rueda (allí ΔI = 0,0828 → 1,53·10⁻⁷ N·m). El texto es verdadero como cota sobre los tres ejes, pero el tema declara «un solo eje». Precisar en l. 371: «sobre el eje más desfavorable del 6U no pasa de 2,28·10⁻⁷ N·m» y en la nota l. 442 «constante en su máximo sobre el eje más desfavorable, una cota». Falta «a 500 km» en el dibujo o en la leyenda l. 426. BAJO.
2. **l. 460 · BAJO** — «un dipolo proporcional al exceso H − H_cmd por B» → «…al producto vectorial del exceso (H − H_cmd) × B».
3. l. 418 · BAJO — «en el mejor caso» → «con m ⊥ B y un campo típico, la vacía en algo más de una hora».
4. Todo lo demás (Kepler 4 ruedas, Webb 6, Hubble 90° en 15 min, K2 cada 2 días) coincide con las fuentes.

### B. Rúbrica

- **Casos de uso: 4.** 42 con commit y líneas, cinco líneas de C mapeadas a (8.2)–(8.4), aviso «L se escribe H», alternativa no física y evidencia de misión.
- **Recursos: 4.** El diagrama prescrito cumple ítem por ítem, con la saturación explícita en el dibujo («En saturación el motor ya no puede acelerar la rueda: la nave deriva»); figuras con ejes y unidades; laboratorio rico.
- **Cobertura: 4.**
- **Calidad: 4.** 24 fuentes; «1 940», «−970 rpm», subíndices con tilde.

### C. Redacción

1. l. 226 · BAJO — «Sistema: nave y rueda, de eje z común.» → «El sistema es la nave y su rueda, que comparten el eje z.»
2. l. 371 · BAJO — «Vacía, con τ_ext constante, se llena en…» → «Si parte vacía y τ_ext es constante, se llena en t = L_máx/τ_ext.»
3. l. 412 · BAJO — → «El campo terrestre orienta un dipolo como orienta la aguja de una brújula».
4. l. 365 · BAJO — opcional, usar la palabra de la consigna: «Saturada, la rueda ya no absorbe el torque externo: va a la nave, que deriva».
5. l. 454 · BAJO — «se vio en Kepler» → «lo sufrió Kepler».
6. Flechas U+20D7: **ninguna** (vectores en KaTeX con `\vec`).

### D. Saturación

1. **l. 437 (leyenda del laboratorio) · MEDIO** — 80 palabras con instrucciones de uso. Propuesta (≤ 45): «Laboratorio de la rueda con las ecuaciones (8.1) a (8.4). En “Maniobra”, fija el ángulo objetivo en el dial y elige T; si T < T_mín, la rueda no alcanza. En “Perturbación y descarga”, el gradiente de gravedad llena la rueda hasta el 80 % de L_máx (umbral que elegí yo) y un magnetopar o un propulsor la vacía.»
2. **l. 442 (nota del laboratorio) · MEDIO** — ≈ 110 palabras. Partir: (a) reproducción; (b) «Fuera del modelo: …» como lista de cinco ítems.
3. l. 426 (leyenda del diagrama) · BAJO — 70 palabras que describen lo que el dibujo ya rotula.

---

## Tema 9 · `src/content/topics/asistencia-gravitatoria.mdx`

### A. Física (verificado)

- (9.2) e = 1 + 721 375·7,62²/126 686 531,9 = 1,3306; δ = 2 asin(1/e) = 97,45° (con v∞ = 7,6161 del dataset: 97,48° → «97,5°») ✓; 10,09 R_J ✓.
- (9.3) |Δv⃗| = 11,45 km/s ✓; |v_in| = 9,59, |v_out| = 19,50 ✓; +9,91 ✓; cota 20,37 ✓ (l. 305). Retroceso 4,35·10⁻²¹ m/s → «4,4» ✓.
- (9.1) a = 3,645 UA ✓; afelio 6,29 UA ✓; v en el afelio 6,20–6,21 km/s ✓. Tras Neptuno: 14,86 km/s = 3,13 UA/año ✓.
- Ganancia máxima en Júpiter: r_p = 2,96 R_J → «cerca de 3 radios» ✓.
- (9.4) con el término indirecto ✓.
- Gráfica prescrita: rapidez vs fecha, marca por encuentro con Δ|v| y hora UT, zona hiperbólica, contrafactual «solo el Sol», fuente Horizons ✓. Cumple la consigna.

Hallazgos:

1. **l. 114, 238, 247, 259 · MEDIO (claridad)** — El encuentro con Júpiter aparece con tres cifras: 10,2 km/s (intro, datos), 9,91 km/s (cónicas) y 11,45 km/s (|Δv⃗|). El puente llega tarde (l. 259, «salvo en Júpiter») y sin decir por qué. Propuesta: l. 238 → «En Júpiter el vector velocidad cambia 11,45 km/s y su módulo pasa de 9,59 a 19,50 km/s (+9,91 por cónicas; los datos dan +10,2, tabla 9.2)»; l. 259 → «Los saltos de la gráfica coinciden con las cónicas de la tabla 9.2 salvo en Júpiter: la sonda tarda unos dos meses en salir de su esfera de influencia y Júpiter sigue tirando. El modelo mejorado suma todas las atracciones a la vez.»
2. **l. 145 · BAJO** — a = 3,64 UA es cálculo propio → «a = 3,64 UA (cálculo propio con el GM☉ de DE440)».
3. **l. 298 · BAJO** — «Tras Neptuno le quedan √(2ε) = 14,86 km/s»: ε no se da. → «Tras Neptuno, con ε ≈ 110 km²/s², …».
4. l. 189 · BAJO — tres valores de v∞ para Júpiter en la página. → «v∞ ≈ 7,62 km/s en la máxima aproximación».

### B. Rúbrica

- **Casos de uso: 4.**
- **Recursos: 4.**
- **Cobertura: 4** (se refuerza con A.1).
- **Calidad: 3,5 → 4 con el ALTO de C.1.**

### C. Redacción

1. **Flechas U+20D7 · ALTO (defecto visible).** Solo en este archivo, 11 apariciones: **l. 247** (leyenda figura 9.3, 7) y **l. 305** (leyenda del laboratorio, 4). Reemplazo propuesto:
   - l. 247 → «Triángulos de velocidades en el marco del Sol, a la misma escala: la suma vectorial v = Vₚ + v∞ antes y después del giro. En Júpiter v∞ sale mucho más alineada con Vₚ y la sonda gana 9,91 km/s (por cónicas); en Neptuno, que la V2 sobrevoló por encima del polo norte, v∞ se aparta de Vₚ y pierde 2,13 km/s.»
   - l. 305 → «…donde δ iguala a θ_in, el ángulo de llegada entre Vₚ y v∞; entonces v∞ sale paralela a Vₚ…».
2. l. 326 · BAJO — «c, su distancia» → «c, la distancia del planeta al Sol».
3. l. 310 · BAJO (pendiente 8 del traspaso) — «la lectura t marca el tiempo real» → «la lectura t da el tiempo real transcurrido, en horas o días, aunque en pantalla pasen segundos».
4. l. 320 · BAJO — «firmado “Minovich”» puede quedar por rigor.
5. Tipografía: correcta.

### D. Saturación

1. **l. 292 (leyenda de la gráfica prescrita) · MEDIO** — 85 palabras, dos de instrucciones. Propuesta (≤ 50): «Rapidez de la Voyager 2 respecto al Sol, y la de la Voyager 1 hasta 1981: cada marca da el salto del encuentro y la zona sombreada, donde supera la rapidez de escape √(2GM☉/r), empieza en Júpiter. La línea punteada es la órbita sin Júpiter, que habría vuelto. Los botones abren cada encuentro hora a hora.»
2. **l. 305 (leyenda del laboratorio) · MEDIO** — 95 palabras con resultados numéricos que deberían vivir en una Tabla 9.3 «r_p → e, δ, |Δv⃗|, v_out detrás/delante» (la investigación §8 ya la tiene, 7 filas). Leyenda propuesta (≤ 40): «Laboratorio del sobrevuelo con las ecuaciones (9.2) y (9.3): la hipérbola en el marco del planeta y el triángulo de velocidades en el del Sol. Arrastra la máxima aproximación y cambia el lado de paso: acercarse más no siempre da más, y el lado decide ganar o perder (tabla 9.3).»
3. Tabla 9.2 (leyenda) · BAJO — podría pasar la nota de Saturno a una nota al pie.

---

## Tablas de rúbrica (estimación 1–4)

| Tema | Casos de uso | Recursos | Cobertura | Calidad |
|---|---|---|---|---|
| **7 · Coeficiente de restitución** | 4 | 4 | 3,5 (falta «elástica/inelástica» en la prosa) | 4 |
| **8 · Ruedas de reacción** | 4 | 4 | 4 (precisar el eje del torque máximo) | 4 |
| **9 · Asistencia gravitatoria** | 4 | 4 | 4 (aclarar 10,2 / 9,91 / 11,45) | 3,5 (flechas U+20D7; dos leyendas saturadas) |

## Orden sugerido de corrección

1. Tema 9 C.1 (flechas, ALTO) y A.1 (tres cifras de Júpiter).
2. Tema 7 A.5 (elástica/inelástica) + A.1 (0 < e < 1) + A.3 (l. 378).
3. Tema 8 A.1 (eje del torque máximo, una frase).
4. Leyendas y notas largas: T7 l. 386/391, T8 l. 437/442, T9 l. 292/305 (con Tabla 9.3 opcional).
5. BAJO de redacción en bloque, vigilando el tope de 650 con «Copiar Markdown».
