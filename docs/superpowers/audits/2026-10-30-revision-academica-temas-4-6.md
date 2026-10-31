# Revisión académica · Temas 4 a 6 (30 de octubre de 2026)

Informe del revisor académico (subagente de Claude, solo lectura) que alimenta la auditoría
integral `2026-10-30-auditoria-integral.md`. Contrastó `src/content/topics/{llantas-f1,control-haptico,frenado-regenerativo}.mdx` con las tablas, los núcleos (`friction`, `spring`, `energy`, `regenModelText`), los datos, `regenFigures.ts`, la nota de investigación del Tema 6, los traspasos y el material de clase (Módulos 2 y 3). Recalculó cada número a mano y ejecutando el código real con `tsx`. Las líneas se refieren a `avance-2` en `92d1545`.

**Nota sobre el conteo de palabras:** este revisor usó un contador aproximado (≈ 653, 664 y 682 palabras). El contador del sitio (`readingStats`, el que rige el tope de 650) da otra cifra; ver la auditoría integral, que la verificó. Los hallazgos de longitud quedan condicionados a esa verificación.

**Resumen ejecutivo:**

1. **Tema 4, criterio 2 (ALTO):** el recurso prescrito (visualización de datos) no dibuja ningún dato medido; las curvas 4.2, 4.3 y el laboratorio son modelos con parámetros ilustrativos. Los únicos datos reales son la banda sombreada (ventana 105–135 °C) y los seis pares de `tcurve_F3soft.lut` que viven en la tabla 4.4 pero no en ninguna gráfica. La rúbrica pide «visualizaciones con datos reales bien citados».
2. **Tema 5 (ALTO, saturación):** la leyenda y la nota del laboratorio (l. 318 y 323) suman ≈ 440 palabras y repiten tres veces el «pop» de Horizon y dos veces la lista de omisiones.
3. **Tema 6 (MEDIO con número):** el núcleo evalúa f(v) a la rapidez final del intervalo y su comentario dice «como FASTSim 2»; la nota de investigación (§5, l. 52) escribe la fórmula de FASTSim 2 con la **rapidez media**. Con la media, el UDDS da 41,2 % en vez de 40,4 % y el calor de fricción baja de 0,062 a 0,046 kWh (−26 %). Hay que elegir y declararlo.
4. **Tema 5, paso 1 (MEDIO):** la ecuación (5.1) escribe F(x) = F₀ (fuerza constante) pero la leyenda y el análisis dicen que «oscila alrededor de cero».
5. **Tema 5, paso 3 (MEDIO):** la frase atribuye a la tercera ley lo que da la primera (que el dedo empuje con kx viene del equilibrio del gatillo).

**No se encontró ningún número incorrecto** en los tres textos.

---

## Tema 4 · `src/content/topics/llantas-f1.mdx`

### A. Corrección física

Verificado correcto:
- l. 97, (4.1) forma estándar. l. 123: 0,40 · 98,1 = 39,2 N; 0,30 · 98,1 = 29,4 N ✓.
- l. 139, (4.2): μ(8 000) = 1,6 · 2^(−0,1) = 1,493 → F = 11 943 N (l. 284) ✓. Tabla 4.1: μ(250) = 2,11, declarado artefacto ✓.
- l. 215: w = 15/√(−2 ln 0,97) = 60,8 °C ✓. Tabla 4.2: μ(60 °C) = 1,105; μ(160 °C) = 1,449 ✓.
- l. 242, (4.4): pico en x ≈ 0,18 (l. 265) ✓; y(1) = 0,91 (l. 274) ✓.
- l. 331, Callout: 73,2 N frente a 78,4 N ✓.
- l. 337: √(1,6 · 9,81 · 50) = 28,01 m/s = 100,9 km/h; con μ = 1,44: 95,7 km/h; 5,1 % ✓.

Hallazgos:

| # | Línea | Sev. | Texto | Problema | Propuesta |
|---|---|---|---|---|---|
| 4.1 | 311 (y 171, 291) | MEDIO | «Leo … `LS_EXPY` … como el β de la (4.2)» y «exponente inspirado en LS_EXPY» | Si LS_EXPY = 0,49 fuera β, al duplicar la carga μ caería un 30 %; el sitio usa β = 0,9. El lector ve una contradicción. | Decir en el caso: «Si LS_EXPY fuera mi β, 0,49 implicaría que al duplicar la carga μ cae un 30 %; no sé si la convención de Kunos es esa, y por eso en mis curvas uso un β = 0,9 ilustrativo»; o quitar «inspirado en LS_EXPY» de la fuente de la figura 4.2. |
| 4.2 | 259 | BAJO | «Primero la huella se deforma sin deslizar…» | En la (4.4) x ya es deslizamiento. | «Con poco deslizamiento la huella se deforma y la fuerza crece casi en recta; pasado el pico desliza casi toda…» |
| 4.3 | 331 vs 123 | BAJO | «N = 98 N (g = 9,8 m/s²)» y «n = 98,1 N (g = 9,81 m/s²)» | Dos valores de la misma normal. | «la clase redondea g a 9,8 y obtiene 98 N; con 9,81, 98,1 N: mismos 39,2 y 29,4 N». |
| 4.4 | 183 | MEDIO | «el C3 trabaja en 105–135 °C y el C4, 90–120 °C: el máximo menos un 3 %, por convención» | No se entiende que es la **definición** de la ventana. | «Pirelli define la ventana, por convención, como el intervalo donde μ no baja del máximo menos un 3 % [Isola]; en la tabla de Autosport de 2019, el C3 trabaja entre 105 y 135 °C y el C4 entre 90 y 120 °C [Autosport].» |

### B. Rúbrica

1. **Casos de uso — 3 (al borde del 4).** Producto concreto ✓; ecuación y mapeo FZ0/DY_REF/LS_EXPY → (4.2) ✓; justificación ✓; balance ✓. Tres salvedades seguidas dejan el caso como conjetura. Reencuadrar: el caso documentado **es** el `tyres.ini` del equipo MUR para Assetto Corsa (fuente abierta, leída).
2. **Recursos — 3.** Hay ambas gráficas con ejes y unidades y el laboratorio es rico. **Pero ninguna curva es un dato.** Propuesta (ALTO): dibujar en la figura 4.3 (o en el laboratorio) los seis puntos (T, multiplicador × μ_pico) del `.lut` de MUR como serie «dato del archivo», con su fuente; y en la figura 4.2 una segunda curva «MUR, según mi lectura de FZ0/DY_REF/LS_EXPY».
3. **Cobertura — 4.**
4. **Calidad — 3.** Leyenda + nota del laboratorio (l. 284 y 291, ≈ 200 palabras) y Callout (l. 331, ≈ 110 palabras); «F_z0» frente a «F_{z0}»; «μ₀» y «μ_0» alternan.

### C. Redacción

| Línea | Sev. | Texto | Problema → propuesta |
|---|---|---|---|
| 89 | BAJO | «su agarre depende de la carga y la temperatura» | → «su agarre no crece en proporción a la carga y cambia con la temperatura». |
| 135 | MEDIO | «la modelo con una ley de potencia» | «la modelo» se lee como sustantivo. → «La represento con una ley de potencia». (Igual en Tema 5, l. 98.) |
| 209 | BAJO | «De ahí calentarlas en la vuelta de salida sin recalentarlas.» | → «Por eso se calientan en la vuelta de formación, sin pasarse de temperatura.» |
| 238 | MEDIO | «la referencia de ingeniería, no atribuida a ningún simulador, es la Fórmula Mágica» | → «la referencia de la ingeniería de neumáticos es la Fórmula Mágica de Pacejka; no sé qué simulador la usa tal cual.» |
| 247 | BAJO | oración entera dentro de la tabla de símbolos | Mover «(para la lateral, la fuente solo da C = 1,3)» a la línea de fuente de la figura 4.4. |
| 265 | BAJO | «cae en x ≈ 0,18» | → «el pico queda en x ≈ 0,18». |
| 284 | MEDIO | «Ese máximo es la altura D de la ecuación (4.4), cuya curva…» | Repite la figura 4.4. Quitar. |
| 331 | MEDIO | Callout de ≈ 110 palabras | Partir en tres frases o pasar el cálculo 73,2/78,4 a una fila de la tabla 4.1. |

### D. Saturación
- Figura 4.5 (l. 284 + 291): leyenda de 6 frases + nota de 5. «Lo que deja fuera» como lista de cuatro ítems; f(T) = μ(T)/μ_pico se dice dos veces.
- Fuente de la figura 4.3 (l. 226): cita bilingüe completa de Isola dentro de la línea de fuente. Dejar la traducción en el paso 3 y en la fuente solo «criterio de agarre máximo menos 3 % de Isola, fuente 2».

---

## Tema 5 · `src/content/topics/control-haptico.mdx`

### A. Corrección física

Verificado correcto: F₀ = 1,6 N; 3,2 N; U = 12,8 mJ ✓; l. 261: 2,0 N y 5,0 mJ ✓; l. 307: 0,8 mm y 0,32 N por zona ✓; l. 323: ω₀ = 141 rad/s, retorno ≈ 30–40 ms ✓; l. 361: 0,48 J y 37,5 ✓; peso y normal no son par de tercera ley ✓; l. 175: W = ½kx² ✓.

Hallazgos:

| # | Línea | Sev. | Texto | Problema | Propuesta |
|---|---|---|---|---|---|
| 5.1 | 102, 134, 289 | MEDIO | (5.1) «F(x) = F₀»; leyenda: «oscila alrededor de cero…»; análisis 2:18: «la fuerza oscila alrededor de cero con una amplitud F₀» | La ecuación escribe una fuerza constante; la prosa, una oscilación de media cero. | Escribir (5.1) como amplitud: `|F|_{\text{máx}} = F_0` o `F(x,t) = F_0 \sin(\omega t)`, y en símbolos «F₀: amplitud, independiente de x». |
| 5.2 | 215 | MEDIO | «Para sostener el gatillo en x, el dedo lo empuja con kx; por la (5.3), el gatillo empuja al dedo con el mismo módulo» | Que el dedo empuje con kx sale del equilibrio del gatillo; la (5.3) solo da la reacción. | «Con el gatillo quieto, el actuador lo empuja hacia afuera con kx y el dedo hacia adentro con kx (fuerza neta cero); por la (5.3), el gatillo devuelve al dedo esos mismos kx, en sentido contrario y sobre otro cuerpo: por eso no se anulan.» |
| 5.3 | 269 | BAJO | «Cada marca de tiempo abre el reproductor en ese instante…» | Instrucciones de interfaz dentro de la leyenda. | Moverlas a `HapticVideo` y dejar en la leyenda qué se analiza y el instante clave. |
| 5.4 | 318 | BAJO | «un evento al final del recorrido, no una tensión que crece; un resorte ideal no hace pop» | Repetido en l. 347 y 353. | Dejarlo una sola vez (l. 347). |

### B. Rúbrica

1. **Casos de uso — 4.** Para blindarlo: en l. 341 una frase de ventaja de diseño («el diseñador ajusta un número, k, no una tabla por objeto»).
2. **Recursos — 4.** Debilidad menor: en el video la fuerza restauradora se **describe**, no se ve medir. Opcional (MEDIO): un quinto marcador o segundo video con el desmontaje de Restore Technique (0:41–1:46 y 2:16).
3. **Cobertura — 4.**
4. **Calidad — 3.** Saturación de l. 318 + 323 (≈ 440 palabras bajo el laboratorio) y l. 184; comillas inconsistentes: rectas `"…"` en l. 184 y 335, tipográficas “…” en l. 318 y angulares «…» en el resto.

### C. Redacción

| Línea | Sev. | Texto | Problema → propuesta |
|---|---|---|---|
| 98 | MEDIO | «La modelo con una amplitud constante.» | → «La represento con una amplitud constante.» |
| 236 | BAJO | «la resistencia sube en recta entre dos posiciones» | → «la resistencia crece linealmente entre dos posiciones». |
| 255 | BAJO | «resiste como un resorte tardío» | → «resiste como un resorte que empieza a actuar en x₀ (“resorte tardío” en el laboratorio)». |
| 307 | MEDIO | análisis de 4:15, ≈ 150 palabras en un párrafo | Partirlo en dos: (1) cita + Hooke + 1,6/3,2 N; (2) escalera del firmware + 12,8 mJ + retorno. |
| 347 | BAJO | «sin garantía de que sea físico» | → «sin garantía de que la curva sea coherente con una fuerza real». |
| 353 | BAJO | «Cuesta la saturación del actuador, la latencia y la batería» | → «Cuesta lidiar con la saturación del actuador, la latencia y el consumo de batería». |

### D. Saturación (ALTO)
- l. 318 (fuente del laboratorio, ≈ 210 palabras): una **tabla «Modos del gatillo adaptativo en la API de Apple»** (modo | parámetros | forma de F(x) | ecuación del sitio) con fuentes 2 y 6, y la línea de fuente reducida.
- l. 323 (nota, ≈ 230 palabras): «Lo que deja fuera» como lista de cuatro ítems; quitar la repetición con l. 353.
- l. 184: la cita de McKeand ya está en l. 335.

---

## Tema 6 · `src/content/topics/frenado-regenerativo.mdx`

### A. Corrección física

Recomputado con el código del sitio: m = 1 927,77 kg ✓; UDDS 1 369 s y 11,990 km ✓; l. 125: 185,9 kJ y 1,124 kWh ✓; l. 134 ✓; l. 173: 77,3 % y 45,6 % ✓; l. 182: 21,0 m/s ✓; l. 196 ✓; l. 223: 33,20 kW y 43,50 % ✓; l. 244: 0,8686 = 0,6452 + 0,1613 + 0,0621; 40,39 % ✓; l. 255: 12,47 y 30,749 ✓; l. 280: 0,4484 kWh ✓; l. 301 identidad exacta ✓; l. 232 coherente con el código (frenada 381→397 s).

Hallazgos:

| # | Línea | Sev. | Texto | Problema | Propuesta |
|---|---|---|---|---|---|
| 6.1 | 196, 205 (código `energy.ts` l. 156–159, 173) | MEDIO | «f(v) [FASTSim 2]» | El núcleo evalúa f en la rapidez **final** del intervalo y su comentario afirma «as FASTSim 2»; la nota de investigación (§5, l. 52) escribe la fórmula de FASTSim 2 con la **rapidez media**. Con la media: UDDS 41,2 % (no 40,4), fricción 0,046 kWh (no 0,062); US06 31,1. | Elegir: (a) pasar el núcleo a v̄ y actualizar 40,4/0,062 en texto, tabla y traspaso; o (b) dejar v_final y declararlo en la nota del laboratorio. Corregir el comentario de `energy.ts` l. 158 en cualquier caso. |
| 6.2 | 232 | MEDIO | «Potencia en la mayor frenada del UDDS.» | «Mayor» es ambiguo (mayor ΔK: 299→333 s; mayor potencia: 116 s; la figura dibuja la de mayor energía de freno en ruedas: 381→397 s). | «Potencia en la frenada del UDDS que más energía quita en las ruedas (381 a 397 s, desde 59 km/h: 224 kJ)…». |
| 6.3 | 234 | MEDIO | «tope de 239 kW del motor del Model 3 en FASTSim (fuente 3)» | El 239 kW es del archivo **Model 3 RWD 2022** de FASTSim 3.1.0; el auto del balance es el **Long Range RWD 2025** de la EPA. | «tope de 239 kW del motor del Model 3 RWD 2022 de FASTSim (fuente 3), que tomo para el 2025». Idem en la nota del laboratorio. |
| 6.4 | 108, 244 | MEDIO | «1 927,77 kg»; «0,8686 … 0,6452 … 0,1613 … 0,0621» | Exceso de cifras significativas frente a η = 0,80 y a la tabla 6.2 (tres decimales). | Masa «1 928 kg»; en l. 244 tres decimales. |
| 6.5 | 173, 244 | MEDIO | «de 1,124 kWh la carga en carretera absorbe 0,255 y 0,869 exigen freno (77,3 %)» | Números sin unidad; «(77,3 %)» sin referente. | «de 1,124 kWh, la carga en carretera absorbe 0,255 kWh y 0,869 kWh (el 77,3 %) exigen freno». |
| 6.6 | 321 | BAJO | «la energía interna queda en aire, llantas, motor, pastillas y, como energía química, en la batería» | Llamar «interna» a la energía química es un estiramiento. | «…y como energía química almacenada en la batería, que el curso no separa de la interna.» |
| 6.7 | 125 | BAJO | «y el modelo simple los devolvería todos» | «El modelo simple» no se ha definido. | «y si todo el ΔK volviera a la batería, el modelo simple recuperaría 1,124 kWh». |

### B. Rúbrica

1. **Casos de uso — 4.** El más sólido de los tres. Solo pide el hallazgo 6.3.
2. **Recursos — 4.** Figura 6.5 con ejes, unidades y línea de fuente que separa dato real (EPA) de reparto modelado ✓.
3. **Cobertura — 4.** Conexiones algo breves; una frase más sobre el Tema 4 («el agarre de 0,15 g del UDDS está lejos del límite μ») las haría explícitas.
4. **Calidad — 3 → 4.** Cifras con exceso de decimales y sin unidad; la elección de f(v) no declarada; longitud a verificar con el contador del sitio.

### C. Redacción

| Línea | Sev. | Texto | Problema → propuesta |
|---|---|---|---|
| 100 | BAJO | Teorema + auto + ciclo en dos frases densas | → «El trabajo neto sobre el auto es su cambio de energía cinética (6.1). Para los números uso el Tesla Model 3 Long Range RWD 2025 del Test Car List de la EPA (tabla 6.1) y el ciclo urbano UDDS, de 1 369 s y 11,99 km.» |
| 196 | MEDIO | frase de 50 palabras con tres citas y cierre «…se desvanece: f(v)» | → «…Cerca de detenerse el motor frena cada vez menos; FASTSim 2 lo modela con una fracción f(v) que cae a cero a baja velocidad.» |
| 223 | BAJO | «…no dejaría nada a la fricción: volvería el 43,5 %…» | → «…no dejaría nada a la fricción y la batería recibiría el 43,5 % de la tracción.» |
| 255 | MEDIO | «En carretera, aire y rodadura frenan…; con manejo agresivo, el 30,7 %.» | Los ciclos no se nombran. → «En el HWFET (carretera) …: la batería recibe el 12,5 % de ella; en el US06 (manejo agresivo), el 30,7 % (tabla 6.2).» |
| 313 | BAJO | «sin esos límites no ve frío ni carga de la batería» | → «sin esos topes el modelo no distingue una batería fría o llena». |

### D. Saturación
- Moderada. Los Why de los pasos 2 y 4 (l. 173, 244) repiten cifras de la tabla 6.2; basta un número por frase y «(tabla 6.2)».

---

## Tabla final por tema (estimación 1–4)

| Tema | Casos de uso | Recursos | Cobertura | Calidad |
|---|---|---|---|---|
| **4 · Llantas de F1** | **3** — tres salvedades seguidas y un LS_EXPY «inspirador» que no cuadra con β = 0,9. | **3** — las gráficas prescritas son modelos ilustrativos; los datos reales (ventana y `.lut`) no están dibujados. | **4** | **3** — leyenda + nota del laboratorio y Callout largos; F_z0; g = 9,8/9,81. |
| **5 · Control háptico** | **4** | **4** — opcionalmente un marcador del desmontaje. | **4** | **3** — ≈ 440 palabras bajo el laboratorio; comillas de tres tipos; (5.1) no describe la oscilación. |
| **6 · Frenado regenerativo** | **4** | **4** | **4** | **3** — decimales de más y sin unidad; f(v) a rapidez final no declarada. |

Prioridad: (1) Tema 4, puntos reales del `.lut` en la figura 4.3 y reencuadre del caso; (2) Tema 5, (5.1) como amplitud, tercera ley bien atribuida y tabla de modos en vez de la leyenda larga; (3) Tema 6, decidir y declarar la rapidez de f(v), nombrar la frenada de la figura 6.3 y el origen del 239 kW, unificar decimales con la tabla 6.2.
