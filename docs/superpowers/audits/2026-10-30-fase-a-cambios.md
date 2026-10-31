# Fase A · Lista de frases cambiadas para la lectura de Dylan (30 de octubre de 2026)

Todo lo que la fase A cambió en los textos, tema por tema, como «antes → después», para que
Dylan lea exactamente lo nuevo (pendientes 1 y 2 del traspaso). Cada tema pasó por un
implementador, un revisor independiente y una ronda de correcciones; los commits están en
`avance-2`. Las líneas son las del archivo al momento del cambio; `git show <commit>` da el
diff exacto. Lo que no cambió no aparece. Conteo de prosa con el contador del sitio.

| Tema | Commit | Prosa antes → después |
|---|---|---|
| 1, 2, 3 | `aac05b4` | 648 → 643 · 650 → 648 · 649 → 649 |
| 4 | `681482d` | 648 → 649 |
| 5, 6 | `ac2a6a2` | 649 → 649 · 650 → 649 |
| 7, 8 | `935d3e4` | 644 → 650 · 649 → 650 |
| 9 | `1715ec4` | 650 → 650 |
| prueba del tope | `f4dcb0e` | — |

---

## Tema 1 · Dron de reparto (`dron-reparto.mdx`)

**Prosa**

- l. 124: «Es la alternativa sin física de cualquiera con un mapa: rumbo fijo y rapidez constante. La velocidad salta de 0 a 10 m/s al despegar…» → «Es lo que haría quien solo tiene un mapa: rumbo fijo y rapidez constante, sin física. La velocidad salta de 0 a 10 m/s al arrancar…»
- l. 135: «se retrasa respecto de la consigna, se pasa del punto y oscila, sin hora de llegada honesta» → «se retrasa respecto de la referencia, se pasa del punto y oscila, sin una hora de llegada fiable»
- l. 181: «la velocidad no cambia más rápido que a_máx, y la misión, una rapidez tope, v_máx.» → «la velocidad no cambia más rápido que a_máx; la misión, además, fija una rapidez tope, v_máx.»
- l. 210: «La ruta completa toma 387,4 s.» → «La ruta completa dura 387,4 s.»
- l. 232 (fenómeno del paso 4): sin cambio final (se restauró la frase original tras la revisión).
- l. 263: comillas rectas de las dos citas en inglés → « ».
- l. 269 (hueco «La ecuación» del caso de uso): «Ese generador entrega en cada instante posición, velocidad y aceleración de referencia, vectores de dos componentes; el trapecio (1.3) lo imita sin jerk.» → «Ese generador impone |v⃗| ≤ v_máx, |a⃗| ≤ a_máx y |da⃗/dt| ≤ j_máx a los vectores de referencia; el trapecio (1.3) cumple las dos primeras y deja el jerk infinito en t = 0, tₐ, T − tₐ, T.»
- l. 275: «si el viento saca al dron 15 m del tramo» → «si el viento lo saca del tramo»
- l. 281: «ajustar las ganancias del lazo de cada dron, que mal ajustado oscila o se retrasa, y rehacer perfiles» → «ajustar las ganancias del lazo de cada dron, y rehacer perfiles»; «Dos parámetros reparten rapidez y suavidad; las curvas S suman el jerk.» → «Dos parámetros, v_máx y a_máx, negocian rapidez contra suavidad; las curvas S añaden un tercero, el jerk.»
- l. 289: «cos θ y sin θ, los cosenos directores» → «cos θ y sin θ = cos(90° − θ), los cosenos directores»

**Símbolos, leyendas y notas**

- l. 89 (símbolo θ): «rumbo del tramo, medido desde el eje x» → «ángulo del tramo con el eje x, antihorario»
- l. 112 (leyenda 1.1): «…y la velocidad sobre el primer tramo, de rumbo θ = 18,4°, van a escala 1 m/s = 15 m» → «…y la velocidad sobre el primer tramo (rumbo θ = 18,4°), dibujada a escala 1 m/s = 15 m»
- l. 150 (leyenda 1.2): «cambian de golpe al despegar» → «cambian de golpe al arrancar»
- l. 196 (leyenda 1.3): «Rapidez en el primer tramo (632,5 m): el perfil trapezoidal sube con 2,5 m/s² hasta 10 m/s en tₐ = 4 s, mantiene el crucero, empieza a frenar d_a = 20 m antes del vértice y se detiene en T = 67,2 s. A rapidez constante bastarían 63,2 s, con los saltos de la figura 1.2; la tabla 1.2 pone estos límites de ArduPilot junto a los de PX4.» → «Rapidez en el primer tramo (632,5 m): el perfil trapezoidal con los límites de ArduPilot frente a la rapidez constante, que tardaría 63,2 s a costa de los saltos de la figura 1.2. La gráfica marca tₐ y T; la tabla 1.1 da el crucero y la duración de cada tramo, y la 1.2 pone estos límites junto a los de PX4.»
- l. 246 (leyenda 1.4, de ≈ 170 palabras a tres frases): «Laboratorio del dron con las ecuaciones (1.3) y (1.4). Arrastra las paradas A, B y C, o muévelas con las flechas, y la ruta se recalcula al soltar; la línea de tiempo, o el propio dron, recorre t con v y a dibujados a escala, y al frenar la flecha de a apunta contra el movimiento. Debajo, x(t), y(t), las componentes y los módulos de v y de a, y la distancia recorrida frente a |Δr|, con las entregas sombreadas y una línea vertical en el instante elegido.»
- l. 253 (nota del laboratorio, de ≈ 130 a ≈ 90 palabras): «Lo que el modelo deja fuera: la aceleración salta de 0 a 2,5 m/s² en un instante (las curvas S limitan el jerk); el dron se detiene y gira en cada vértice, cosa que un autopiloto real no necesita en un punto de paso; y no hay viento. Datos: las ecuaciones (1.3) y (1.4) cada 0,1 s, 3 876 muestras; derivar las posiciones con diferencias centrales reproduce vₓ y v_y con un error menor que 1 mm/s salvo en los instantes en que a cambia de valor (unos 5 mm/s sobre el JSON publicado, redondeado al milímetro); la gráfica muestrea cada 0,5 s: donde x(t) sube en recta, vₓ es constante; donde se curva, vₓ va en rampa y aₓ es un escalón, que el muestreo dibuja como una rampa corta. Una ruta editada se genera en el navegador con el mismo código; la reproducción va N veces más rápida que el vuelo.»

No se tocó: la voz de las líneas de fuente (pendiente 7) ni el año de la fuente 2 (no verificable).

## Tema 2 · El salto del personaje (`salto-personaje.mdx`)

- l. 119: «Con g = 9,81 m/s² y el impulso de Madeline, protagonista de Celeste, el salto flota: sube 8,75 m. Subir g lo acorta, pero también lo baja.» → «Con g = 9,81 m/s² y los 13,1 m/s de impulso de Madeline, de Celeste, el salto flota: sube 8,75 m. Subir g acorta el tiempo, pero también reduce la altura.»
- l. 130: «Su salto sostenido de 3,5 m tardaría 0,84 s en llegar al ápice, más del doble de los 0,36 s del juego.» → «El salto sostenido de Madeline, 3,5 m y 0,36 s según mi cálculo (figura 2.3), tardaría 0,84 s con g terrestre, más del doble.»
- l. 136: «en (v₀, g) no se separan.» → «con (v₀, g) como mandos no se ajustan por separado.»
- l. 165: «pedir h = 4 m y t_h = 32 cuadros = 0,533 s devuelve g = 28,1 m/s² y v₀ = 15 m/s, el salto parado de Mario.» → «pedir h = 4 m (cuatro bloques) y t_h = 32 cuadros = 0,533 s devuelve g = 28,1 m/s² y v₀ = 15 m/s: el salto parado de Mario (tabla 2.1).»
- l. 194: «En el laboratorio se arrastra v⃗₀ y se recorre t.» → «En el laboratorio arrastro v⃗₀ y recorro t.»
- l. 209: «El salto variable cambia un parámetro, no la curva: Celeste mantiene la velocidad 0,2 s y divide g entre dos cerca del ápice.» → «El salto variable no cambia la ecuación, solo un parámetro: Celeste mantiene v_y 0,2 s con el botón pulsado y divide g entre dos cerca del ápice.»
- l. 228 (nota del laboratorio), añadido: «Con el integrador del motor (Euler semi-implícito), el ápice de Mario baja de 4,00 m a 3,75, 3,88 y ≈ 3,95 m a 30, 60 y 144 cuadros/s.»
- l. 238: «(8 × 11 px, 1,4 m de alto)» → «(8 × 11 px: 1,4 m de estatura)»
- l. 244: «Entre cuadros Madeline cumple la ecuación (2.1) con v₀ = 105/8 y g = 900/8. Unity trae por defecto una gravedad 2D de (0; −9,8), la terrestre si cada unidad es un metro: el motor parte de la Tierra y cada juego puede cambiarla.» → «El modelo continuo de Madeline es la (2.1) con v₀ = 105/8 y g = 900/8; el motor la aproxima cuadro a cuadro. Unity trae por defecto una gravedad 2D de `(0, -9.8)`, la terrestre si cada unidad es un metro, y cada juego puede cambiarla.»
- l. 250: «una tabla (x, y) precalculada también, y fija vₓ.» → «una tabla (x, y) precalculada falla igual y además fija vₓ.»
- l. 256 (balance): «Cuesta el error de integración: el motor no evalúa la ecuación (2.1), suma cuadro a cuadro primero la velocidad y luego la posición, y con ese Euler semi-implícito el ápice baja v₀Δt/2 (Mario: 3,75, 3,88 y 3,95 m a 30, 60 y 144 cuadros/s, frente a 4,00 m).» → «Cuesta el error de integración: el motor suma cuadro a cuadro primero la velocidad y luego la posición, y con ese Euler semi-implícito el ápice baja v₀Δt/2 (Mario, en la nota del laboratorio).»; «exigen documentar la escala; la nota del laboratorio enumera lo que el modelo omite.» → «exigen documentar la escala.»

## Tema 3 · Gravedad artificial (`gravedad-artificial.mdx`, `HabitatDiagram.astro`)

**Prosa**

- l. 69: «girar es la única manera factible de fabricarla» → «…de fabricar gravedad»; «la (3.1) es una extensión (ver recuadro de clase)» → «la (3.1) es una extensión (recuadro)»
- l. 136 (fenómeno del paso 2): «…el piso gira su velocidad sin cambiar su rapidez, y ella siente ese empuje como peso.» → «…el piso gira su velocidad sin cambiar su rapidez, y ese empuje es su peso.»
- l. 142 (ecuación del paso 2, el caso de 1 g): «Respecto de la nave, que cae entera con g⃗, la (3.1) queda n = m ω² r; con ω², doblar el giro divide el radio entre cuatro.» → «La nave cae con g⃗ y la persona, además, acelera ω²r hacia el eje: a⃗ − g⃗ = a⃗_c y la (3.1) da n = m ω² r. A N = 2 RPM, ω = 2π·2/60 = 0,2094 rad/s y r = g/ω² = 223,6 m; a la inversa, r = 100 m pide N = 2,99 RPM (ω = √(g/r) = 0,3132 rad/s); doblar el giro divide r entre cuatro.»
- l. 167: «La cabeza, h más cerca del eje, siente ω²(r − h).» → «La cabeza está h más cerca del eje y siente ω²(r − h), menos que los pies.»
- l. 179 (fenómeno del paso 3): «Como a_c crece con la distancia al eje, la cabeza siente menos. Un radio pequeño exige un ω = √(g/r) alto, sobre las ≈ 3 RPM de adaptación tras una exposición prolongada (SP-413): Coriolis desvía a quien salta y girar la cabeza marea.» → «Un radio pequeño exige un ω = √(g/r) alto, por encima de las 3 RPM a las que, según SP-413, la gente se adapta tras una exposición prolongada; Coriolis desvía a quien salta y girar la cabeza marea.»
- l. 208: «El par (r, ω) fija la rapidez del piso, el período y el gradiente. El diagrama reúne el modelo, y el laboratorio lo recorre en una vuelta.» → «El par (r, ω) fija la rapidez del piso, el período y el gradiente.»
- l. 220: «a R = 830 m el piso va a 86,9 m/s» → «en el toro (r = 830 m) el piso va a 86,9 m/s»
- l. 266 (hueco «La ecuación» del caso de uso): «SpinCalc resuelve las (3.2) a (3.4) con dos datos.» → «SpinCalc resuelve a_c = ω² r = v²/r = ω v, las (3.2) y (3.4) encadenadas.»
- l. 272: «Decide ese par, no g.» → «El diseño decide ese par, no g.»
- l. 278: «Cuestan la escala (esos 895 m y, según el informe, unas 150 000 t solo de cáscara), el acoplamiento en el eje y el mareo: 10 m, más baratos, piden 9,46 RPM.» → «Cuestan la escala (895 m y, según el informe, 150 000 t solo de cáscara), el acoplamiento en el eje y el mareo, porque un radio barato de 10 m pide 9,46 RPM.»; «sin tecnología que no existe» → «sin tecnología inexistente»
- l. 288 (recuadro de clase): «Es la fuerza centrípeta: la «gravedad aparente» no tira hacia afuera; es el piso que empuja hacia adentro.» → «Es la fuerza centrípeta; la «gravedad aparente» hacia afuera, −a⃗_c, es percepción, no fuerza: el piso empuja a la persona hacia el eje.»

**Símbolos, leyendas, notas y diagrama**

- l. 121 (símbolo N): «velocidad de giro» → «velocidad de giro (esta N es el giro, no el newton)»
- l. 124 (símbolo ω): «velocidad angular, como en clase; la consigna la llama «frecuencia angular», y es la misma magnitud, no la f en Hz» → «velocidad angular, como en clase (la «frecuencia angular» de la consigna)»
- l. 128 (símbolo v): «velocidad tangencial del piso» → «rapidez tangencial del piso»
- l. 151 (leyenda 3.2): «…frente a r: a giro fijo, una recta que corta la línea de 1 g en r = g/ω²: a 2 RPM, ω = 0,2094 rad/s y r = 9,81/0,2094² ≈ 223,6 m; a 1 RPM, 894,6 m. El Toro de Stanford de SP-413, a R = 830 m y 1 RPM, queda en 0,93 g; la tabla 3.1 da ω, la rapidez del piso…» → «…frente a r. A giro fijo es una recta que corta la línea de 1 g en r = g/ω²; a 2 RPM, ω = 0,2094 rad/s y r = 223,6 m; a 1 RPM, 894,6 m. El Toro de Stanford de SP-413, con radio mayor de 830 m y 1 RPM, queda en 0,93 g; la tabla 3.1 da ω, la rapidez tangencial del piso…»
- l. 194 (leyenda 3.3): se quitó «: giro máximo de 3 a 6 RPM y radio mínimo, cuando lo dan, de 4 a 12 m» (está en la tabla 3.3) y la frase de Coriolis, que pasó a la nota del laboratorio.
- l. 234 (leyenda 3.4): «…la gravedad aparente de igual magnitud hacia afuera y la velocidad tangencial. El detalle A…» → «…la gravedad aparente, −a_c, hacia afuera (percepción, no fuerza: el piso la empuja hacia el eje), y la velocidad tangencial. La nota da el caso de 1 g: 2 RPM piden r = 223,6 m y 1 RPM, 894,6 m. El detalle A…»
- l. 250 (nota del laboratorio): «no calcula el efecto Coriolis ni los distintos niveles…» → «no calcula el efecto Coriolis (en el toro, según SP-413, quien salta 0,55 m cae unos 5,3 cm a un lado) ni los distintos niveles…»
- `HabitatDiagram.astro`: nota nueva de tres líneas bajo «v = ω r»: «a_c = g / 2 RPM → r = 223,6 m / 1 RPM → r = 894,6 m» (visible también en móvil, 17 px); el `<desc>` la menciona.

## Tema 4 · Llantas de Fórmula 1 (`llantas-f1.mdx`, figura 4.3)

**Figura 4.3 (recurso prescrito):** se dibujan seis pares reales del archivo `tcurve_F3soft.lut` del equipo MUR (los de la tabla 4.4) como serie discontinua naranja con puntos, «tcurve_F3soft.lut de MUR, multiplicador × μ_pico», sobre la campana del modelo (azul); el dominio pasa a 0–240 °C; la línea de fuente cita el archivo y el equipo (fuente 3). Los datos viven ahora en `src/lib/data/tyreModels.ts` y la tabla 4.4 los importa.

**Prosa**

- l. 89: «su agarre depende de la carga y la temperatura» → «su agarre crece menos que la carga y cambia con la temperatura»
- l. 135: «…cada vez menos; la modelo con una ley de potencia.» → «…cada vez menos. La represento con una ley de potencia.»
- l. 183: «…el C3 trabaja en 105–135 °C y el C4, 90–120 °C [Autosport]: el máximo menos un 3 %, por convención [Isola].» → «…: la ventana donde, por convención de Pirelli, μ no baja del máximo menos un 3 % [Isola].»
- l. 209: «De ahí calentarlas en la vuelta de salida sin recalentarlas.» → «Por eso se calientan en la vuelta de formación, sin pasarse de temperatura.»
- l. 238: «la referencia de ingeniería, no atribuida a ningún simulador, es la Fórmula Mágica de Pacejka» → «la referencia de la ingeniería de neumáticos es la Fórmula Mágica de Pacejka»
- l. 259: «Primero la huella se deforma sin deslizar y la fuerza crece casi en recta; pasado el pico desliza, y más deslizamiento da menos fuerza» → «Con poco deslizamiento la huella se deforma y la fuerza crece casi en recta; pasado el pico, más deslizamiento da menos fuerza»
- l. 265: «hay un pico, de altura D; B fija la pendiente inicial y E, la curvatura. Con los valores de Edy, cae en x ≈ 0,18.» → «hay un pico, de altura D, que con los valores de Edy queda en x ≈ 0,18; B fija la pendiente inicial y E, la curvatura.»
- l. 317: «…igual de rápido, una llanta fría agarraría como en ventana y la vuelta 30 sería como la 1.» → «…igual de rápido y una llanta fría agarraría como en ventana.»
- l. 331 (recuadro de clase): «En la caja de 10 kg del Tema 02, con μ_s = 0,40, μ_k = 0,30 y N = 98 N (g = 9,8 m/s²), la (4.1), con n = N, da 39,2 N y 29,4 N; las (4.2) a (4.4) son extensiones. El concepto 01 toma μ «constante…»: con la (4.2) y β = 0,9, F_z0 = 98 N, duplicar N…» → «En la caja de 10 kg del Tema 02, con μ_s = 0,40 y μ_k = 0,30, la clase usa g = 9,8 m/s² y N = 98 N; con 9,81 m/s², 98,1 N: la (4.1), con n = N, da los mismos 39,2 N y 29,4 N. Las (4.2) a (4.4) son extensiones. El concepto 01 toma μ «constante…»; con la (4.2), β = 0,9 y F_z0 = 98 N, duplicar N…»
- l. 337 (conexiones): «≈ 101 km/h (igual con g = 9,8); si μ cae…» → «≈ 101 km/h; si μ cae…»; «Con el Tema 6: freno con el motor eléctrico (regenerativo) o con las pastillas, y en ambos casos el agarre limita la desaceleración.» → «Con el Tema 6: frene el motor eléctrico (regenerativo) o las pastillas, el agarre limita la desaceleración.»

**Leyendas, símbolos y fuentes**

- l. 171 (fuente de la figura 4.2): se quitó «; exponente inspirado en LS_EXPY del tyres.ini del equipo MUR, fuente 3» (β = 0,9 queda como ilustrativo; el caso de uso sigue diciendo que la lectura de LS_EXPY es de Dylan).
- l. 224 (leyenda 4.3), cuatro frases: «Coeficiente de agarre frente a la temperatura de la banda: la campana de la ecuación (4.3), entre 0 y 240 °C, con la ventana de trabajo del compuesto C3 de 2019 sombreada entre 105 y 135 °C (tabla 4.2); con el óptimo en el centro, los dos anchos quedan iguales, y un lado caliente más estrecho pondría 135 °C fuera de la ventana. Los puntos son seis de los pares de tcurve_F3soft.lut, la tabla de temperatura del tyres.ini del equipo MUR (los mismos de la tabla 4.4), multiplicados por μ_pico para compartir el eje; la línea discontinua solo une esos seis. Ese es otro compuesto, con otra ventana: da todo su agarre entre 75 y 100 (sin unidad impresa; supongo °C), no en 105–135 °C, y a 0 y a 240 conserva el 80 %; sube, se mantiene y baja como la campana, pero cae mucho más despacio. Los rangos son de 2019 y no encontré los de los compuestos actuales.»
- l. 226 (fuente de la figura 4.3): sin la cita bilingüe de Isola; «…criterio del agarre máximo menos 3 % de Isola, fuente 2; pares de tcurve_F3soft.lut, tabla de temperatura del tyres.ini del equipo MUR (Universidad de Melbourne), fuente 3.»
- l. 247 (símbolos de la 4.4): «(para la lateral, la fuente solo da C = 1,3)» pasa a la fuente de la figura 4.4.
- l. 284 (leyenda 4.5): se elimina «Ese máximo es la altura D de la ecuación (4.4), cuya curva, con los valores de ejemplo, vale 0,91 en x = 1.»
- l. 291 (nota del laboratorio): «…y aquí solo se acoplan con f(T) = μ(T)/μ_pico, que multiplica las dos curvas de carga.» → «…y aquí solo los acopla el factor f(T) que multiplica las dos curvas de carga.»; «Lo que deja fuera: el ángulo de deriva (la ecuación (4.2) da solo el pico de la (4.4)), el desgaste, la presión y la caída.» → «Deja fuera: el ángulo de deriva (la (4.2) da solo el pico de la (4.4)); el desgaste; la presión; la caída.»

Decisión de Dylan pendiente: si quiere que el caso de uso explique qué implicaría LS_EXPY = 0,49 como β (−30 % de μ al duplicar la carga), cuesta unas 20 palabras a recortar.

## Tema 7 · Coeficiente de restitución (`coeficiente-restitucion.mdx`)

- l. 16 (fuente 1): «…src/contact_solver.c, L150-L153 y L383-L470» → «…L383-L470; src/types.c L15 y src/core.c L33»
- l. 234: «…conservan el momento lineal, y e da la segunda ecuación.» → «…conservan el momento lineal; e aporta la segunda ecuación: e = 1 es el choque elástico (K se conserva), e = 0 el completamente inelástico, y entre ambos, inelástico.»
- l. 286: «Con e < 1 hay infinitos botes…» → «Con 0 < e < 1 hay infinitos botes…»; «tras el solver, salvo si la aproximación no supera un umbral» → «tras el solver solo si la aproximación supera un umbral»
- l. 311 (símbolo N): «…baje del umbral» → «…deje de superar el umbral»
- l. 320: «nunca se “dormiría”» → «nunca se «dormiría»»; «con el umbral de Unity (tabla 7.1)» → «con el de Unity (tabla 7.1)»
- l. 349: «baja de ≈ 0,76 a unos 4 m/s a ≈ 0,64 a unos 17 m/s (lectura aproximada)» → «baja, en lectura aproximada, de ≈ 0,76 (a unos 4 m/s) a ≈ 0,64 (a unos 17 m/s)»
- l. 363 (símbolo): «ajuste lineal ilustrativo, cálculo propio, a esas dos lecturas de Cross» → «ajuste lineal ilustrativo a esas dos lecturas de Cross (cálculo propio)»
- l. 372: «aun con varios contactos.» → «incluso con varios contactos a la vez.»
- l. 378: «Con e(v), los botes lentos rebotan más: lo contrario del umbral.» → «Con e(v), a baja velocidad e crece y la serie de botes pequeños se alarga: lo contrario del umbral, que la corta.»
- l. 386 (leyenda del laboratorio, 75 → 45 palabras): «Laboratorio del rebote: la misma pelota con física ideal, (7.1) y (7.3), y en un motor con paso Δt, umbral, mezcla y Baumgarte; compara el e medido. Los preajustes cargan pelotas reales y rebotes que se sienten mal; «Choque de dos cuerpos» aplica la (7.2).»
- l. 391 (nota del laboratorio): «…es cámara lenta. Con g = 9,81 m/s². Lo que el modelo deja fuera: …; los contactos múltiples, que Box2D resuelve de forma aproximada, y el movimiento en 2D, porque todo es vertical. e(v) es un ajuste ilustrativo.» → «…es cámara lenta. Todo con g = 9,81 m/s². Fuera del modelo: el giro y la fricción del contacto (…); el arrastre del aire, por el que √(h′/h) subestima un poco el e de una pelota ligera; los contactos múltiples, que Box2D aproxima; el movimiento en 2D, porque todo es vertical; la e(v) real, que aquí es un ajuste ilustrativo.»
- l. 403: «que en v3.2.0 vale `1.0f * lengthUnits`: 1 m/s según mi cálculo» → «que vale 1 m/s en ambas versiones (tabla 7.1, cálculo propio)»
- l. 415: «Una animación guionizada solo vale para la altura con que se animó; una tabla precalculada no alcanza a barrer altura, masa y par de materiales, ni resuelve una pila de cuerpos. Un número por forma vale siempre y conserva el momento.» → «Una animación guionizada solo vale para una altura; una tabla precalculada no barre altura, masa y par de materiales ni resuelve una pila de cuerpos. Un número por forma cubre todo eso y el impulso conserva el momento.»
- l. 421: «Cuestan el umbral, que para en seco, y la mezcla: e es del par…» → «A cambio, el umbral para en seco y la mezcla es arbitraria: e es del par…»
- l. 429 (recuadro): «del concepto 02 (2 kg a +3 m/s contra 1 kg en reposo: 1 y 4 m/s) es la fila e = 1 de la figura 7.2, y la fila e = 0 es la captura del concepto 03. Sumado al impulso del solver, el de la (7.3) da el del concepto 05. En clase…» → «del concepto 02 (salen a 1 y 4 m/s) es la fila e = 1 de la figura 7.2, y la fila e = 0 es la captura del concepto 03. En clase…»
- l. 435 (conexiones): «sigue la (2.1), integrada con el mismo Euler semi-implícito» → «sigue la (2.1) con el mismo Euler semi-implícito»

## Tema 8 · Ruedas de reacción (`ruedas-reaccion.mdx`)

- l. 226: «Sistema: nave y rueda, de eje z común.» → «El sistema es la nave y su rueda, que comparten el eje z.»
- l. 365: «En su tope, el torque externo ya no va a la rueda sino a la nave, que deriva: según Dougherty, …» → «Saturada, la rueda ya no absorbe el torque externo: va a la nave, que deriva; según Dougherty, …»
- l. 371: «Vacía, con τ_ext constante, se llena en t = L_máx/τ_ext. A 500 km, el gradiente de gravedad sobre el 6U no pasa de 2,28·10⁻⁷ N·m (…): t = 2,19·10⁵ s, unos 2,5 días en el peor caso.» → «Si parte vacía y τ_ext es constante, se llena en t = L_máx/τ_ext. A 500 km, el gradiente de gravedad sobre el eje más desfavorable del 6U no pasa de 2,28·10⁻⁷ N·m (…): t = 2,19·10⁵ s, unos 2,5 días.»
- l. 392: «el de un magnetopar o un propulsor» → «el de un magnetopar o propulsor»
- l. 412: «orienta un dipolo como a la aguja de una brújula» → «orienta un dipolo como orienta la aguja de una brújula»
- l. 418: «espera a que, a lo largo de la órbita, B cambie de dirección» → «espera a que B gire con la órbita»; «50 veces la perturbación: en el mejor caso, la vacía en algo más de una hora.» → «50 veces la perturbación: con m ⊥ B y un campo típico, la vacía en algo más de una hora.»
- l. 426 (leyenda del diagrama, 70 → 59 palabras): «El satélite y su rueda con las ecuaciones (8.1) a (8.4). Panel A: el intercambio, L_w y L_s iguales y opuestos, y el motor con τ y −τ. Panel B: la rueda llena hasta L_máx por el gradiente de gravedad a 500 km, la nave que deriva y las dos descargas, con el campo terrestre y con un propulsor.»
- l. 437 (leyenda del laboratorio, 80 → 44 palabras): «Laboratorio de la rueda, ecuaciones (8.1) a (8.4). En «Maniobra», la nave gira el ángulo del dial en T ≥ T_mín. En «Perturbación y descarga», el gradiente de gravedad llena la rueda al 80 % de L_máx (mi umbral) y un magnetopar o propulsor la vacía.»
- l. 442 (nota del laboratorio): «…Lo que deja fuera: resuelve un solo eje; …; el gradiente de gravedad es constante en su máximo, una cota; el magnetopar tiene m perpendicular a B, su mejor caso, y el torque del propulsor es un supuesto mío: el τ_máx de la rueda.» → «…Fuera del modelo: resuelve un solo eje; la rueda parte de 0 rpm y no tiene fricción, aunque las ruedas reales evitan pasar por 0 rpm; el gradiente de gravedad es constante en su máximo sobre el eje más desfavorable, una cota; el magnetopar tiene m perpendicular a B, su mejor caso; el torque del propulsor es un supuesto mío, el τ_máx de la rueda.»
- l. 454: «Lo que 42 modela se vio en Kepler» → «Lo que 42 modela lo sufrió Kepler»
- l. 460: «un dipolo proporcional al exceso H − H_cmd por B: la (8.4)» → «un dipolo proporcional al producto vectorial del exceso (H − H_cmd) × B: la (8.4)»

## Tema 9 · Asistencia gravitatoria (`asistencia-gravitatoria.mdx`, figura 9.3, laboratorio)

**Flechas:** ninguna etiqueta, leyenda, nota ni lectura visible lleva ya la flecha combinante U+20D7 (se veía como caja en Windows): «V_p de Júpiter», «v∞ antes (discontinua) y después», «v = V_p + v∞ respecto al Sol, antes (discontinua) y después», «|v| respecto al Sol: …», «El momento se conserva (m Δv = −M ΔV_p)», lectura «Cambio de velocidad |Δv|».

**Prosa**

- l. 114: «ganó 10,2 km/s respecto al Sol, según los datos de Horizons, sin gastar combustible» → «ganó 10,2 km/s respecto al Sol (datos de Horizons) sin gastar combustible»
- l. 145: «con a = 3,64 UA [3]; en el afelio» → «con a = 3,64 UA (cálculo propio con GM☉ de DE440 [3]); en el afelio» (GM☉ en KaTeX)
- l. 238: «… lleva |v| de 9,59 a 19,50 km/s; con m = 721,9 kg …» → «… lleva |v| de 9,59 a 19,50 km/s (+9,91 por cónicas; los datos dan +10,2, tabla 9.2); con m = 721,9 kg …»
- l. 259: «Los saltos de la gráfica coinciden con las cónicas empalmadas de la tabla 9.2 salvo en Júpiter; el modelo mejorado suma todas las atracciones.» → «Los saltos de la gráfica coinciden con las cónicas de la tabla 9.2 salvo en Júpiter: abandonar su esfera de influencia lleva unos dos meses y Júpiter sigue tirando; el modelo mejorado suma todas las atracciones.»
- l. 278 (fenómeno del paso 4): «Todos los cuerpos tiran a la vez: las cónicas apagan a Júpiter, que sigue tirando.» → «Todos los cuerpos tiran a la vez; las cónicas, uno por uno.»
- l. 284: «porque el marco centrado en el Sol no es inercial» → «porque el marco del Sol no es inercial»
- l. 298: «Tras Neptuno le quedan √(2ε) = 14,86 km/s lejos del Sol» → «Tras Neptuno, con ε ≈ 110 km²/s², le quedan √(2ε) = 14,86 km/s lejos del Sol»
- l. 320: «(23 de agosto de 1961, firmado «Minovich»)» → «(1961, firmado «Minovich»)»; «Hoy JPL Horizons publica» → «Hoy Horizons publica»
- l. 326: «c, su distancia)» → «c, la distancia planeta-Sol)»
- l. 332: «Las alternativas no físicas, una animación guionizada o una regla «cada planeta suma tanto», no responden qué pasa si la sonda llega una hora tarde o 1 000 km más cerca,» → «Una animación guionizada o una regla «cada planeta suma tanto» no responden qué ocurre si la sonda pasa 1 000 km más cerca,»; «no es un guion: sale del modelo, cónicas empalmadas hasta 1989» → «no es un guion: cónicas empalmadas hasta 1989»
- l. 338: «afinar la llegada (r_p fija δ y el destino siguiente), esperar» → «afinar la llegada, esperar»

**Leyendas y notas**

- l. 247 (leyenda 9.3): «Triángulos de velocidades en el marco del Sol, a la misma escala: v⃗ = V⃗ₚ + v⃗∞ antes y después del giro. En Júpiter v⃗∞ sale mucho más alineada con V⃗ₚ y la sonda gana 9,91 km/s; en Neptuno, que la V2 sobrevoló por encima del polo norte, v⃗∞ se aparta de V⃗ₚ y la sonda pierde 2,13 km/s.» → «Triángulos de velocidades en el marco del Sol, a la misma escala: la suma vectorial v = Vₚ + v∞ antes y después del giro. En Júpiter v∞ sale mucho más alineada con Vₚ y la sonda gana 9,91 km/s (por cónicas); en Neptuno, que la V2 sobrevoló por encima del polo norte, v∞ se aparta de Vₚ y la sonda pierde 2,13 km/s.»
- l. 292 (leyenda de la gráfica prescrita, 85 → 51 palabras): se quitaron las dos frases de uso («los botones abren cada encuentro…», «El cursor, arrastrable o con las flechas…»).
- l. 305 (leyenda del laboratorio, 95 → 59 palabras): «Laboratorio del sobrevuelo con las ecuaciones (9.2) y (9.3): hipérbola en el marco del planeta, triángulo de velocidades en el del Sol. Para la V2 en Júpiter la ganancia es máxima cerca de 3 radios, con v∞ paralela a Vₚ y |v| = 20,37 km/s; más cerca se gana menos. Por delante, a 20 radios, saldría frenada, a 6,76 km/s.»
- l. 310 (nota del laboratorio): «y la lectura t marca el tiempo real.» → «y la lectura t da el tiempo real transcurrido, en horas o días, aunque en pantalla pasen segundos.»

## Tema 5 · El resorte virtual detrás de un control háptico (`control-haptico.mdx`)

**Prosa**

- l. 98: «La modelo con una amplitud constante.» → «La represento con una amplitud constante.»
- l. 216 (tercera ley): «Para sostener el gatillo en x, el dedo lo empuja con kx; por la (5.3), el gatillo empuja al dedo con el mismo módulo, en sentido contrario y sobre otro cuerpo: por eso no se anulan.» → «Con el gatillo quieto, el actuador lo empuja hacia afuera con kx y el dedo hacia adentro con kx (fuerza neta cero); por la (5.3), el gatillo devuelve al dedo esos mismos kx, en sentido contrario y sobre otro cuerpo: por eso no se anulan.»
- l. 237: «la resistencia sube en recta entre dos posiciones» → «la resistencia crece linealmente entre dos posiciones (tabla 5.4)»
- l. 256: «luego el gatillo resiste como un resorte tardío.» → «luego el gatillo resiste como un resorte que empieza en x₀ (el «resorte tardío» del laboratorio).»
- l. 338 (caso): «Sony: "Dynamic resistance mimics the tension of interactions with in-game gear and objects in select PS5 games" («…en algunos juegos de PS5»). En Cooling Springs, McKeand los sintió endurecerse "to mimic a taut spring"» → «Sony dice que su resistencia dinámica «mimics the tension of interactions with in-game gear and objects» («imita la tensión de las interacciones con el equipo y los objetos del juego»). En Cooling Springs, McKeand los sintió endurecerse «to mimic a taut spring»»
- l. 350: «Una tabla guionizada, escrita a mano por posición, … sin garantía de que sea físico;» → «Una tabla guionizada, a mano y por posición, … sin garantía de que la curva sea coherente con una fuerza real;»
- l. 356: «Cuesta la saturación del actuador, la latencia y la batería; el modelo omite la histéresis, la dinámica del actuador, la escalera del firmware y el resorte de retorno, que suma su fuerza.» → «Cuesta lidiar con la saturación del actuador, la latencia y el consumo de batería; el modelo omite la histéresis, la dinámica del actuador, la escalera del firmware y el resorte de retorno.»
- l. 364 (recuadro): «Dedo y gatillo sí: las dos fuerzas pertenecen a la misma interacción de contacto.» → «Dedo y gatillo sí: una sola interacción de contacto.»
- l. 370 (conexiones): «aquí, el contacto del gatillo, venga de un motor o de un resorte.» → «aquí, el contacto del gatillo.»

**Ecuación, símbolos, leyendas, análisis y tablas**

- l. 102–112, ecuación (5.1): `F(x) = F₀` → `F(x,t) = F₀ sin(ωt)`; símbolo F₀: «amplitud fija de la fuerza con que vibra el control; uso 1,6 N, supuesto del modelo» → «amplitud de la vibración, independiente de x; uso 1,6 N, supuesto del modelo»; símbolos nuevos ω («frecuencia angular de la vibración», rad/s) y t («tiempo», s). l. 126: `dF/dx = 0` → `∂F/∂x = 0`.
- l. 135 (leyenda 5.1): «La vibración tiene la misma amplitud en todo el recorrido y oscila alrededor de cero» → «La vibración tiene la misma amplitud F₀ en todo el recorrido y oscila alrededor de cero». Figura 5.1: serie «Vibración fija, F = F₀» → «Vibración fija, amplitud F₀».
- l. 185 (leyenda 5.2): «…y Kirk McKeand cuenta que ahí probó por primera vez “the adaptive triggers, which suddenly go tight to mimic a taut spring” («…»).» → «…en la zona Cooling Springs de Astro's Playroom, el salto se carga con el gatillo y McKeand los sintió endurecerse como un resorte tenso (caso de uso).»
- l. 270 (leyenda del video): «Analizo cuatro instantes. Cada marca de tiempo abre el reproductor en ese instante, o salta a él; el análisis está escrito debajo y se lee aunque el video no cargue. El instante clave es el de las 4:15: ahí se describe la fuerza restauradora que crece con el recorrido.» → «Analizo cuatro instantes, con el análisis escrito bajo cada marca; el clave es el de las 4:15, donde se describe la fuerza restauradora que crece con el recorrido.»
- l. 308 (análisis 4:15): «…1,6 N a mitad y 3,2 N al fondo. Aoki añade que dividieron el recorrido en «multiple levels», cada uno más fuerte; lo leo como las 10 zonas del firmware, con intensidades enteras de 0 a 8, fuente 6: la curva real es una escalera que, en mis 8 mm, subiría en promedio 0,32 N por cada zona de 0,8 mm. En un arco real ese trabajo queda como energía elástica, U = ½ k x² = 12,8 mJ al fondo;…» → «…1,6 N a mitad y 3,2 N al fondo (tabla 5.2). Aoki añade que dividieron el recorrido en «multiple levels», cada uno más fuerte: las 10 zonas de intensidad entera del firmware (tabla 5.4), que en mis 8 mm subirían en promedio 0,32 N por zona de 0,8 mm. En un arco real ese trabajo queda como energía elástica, 12,8 mJ al fondo;…»
- l. 319 (fuente del laboratorio, ≈ 210 → 25 palabras): «Simulación del autor sobre src/lib/physics/spring.ts; recorrido del gatillo supuesto de 8 mm; k y x₀ ilustrativos. Modos de la API y escalera del firmware: tabla 5.4».
- l. 324 (nota del laboratorio, ≈ 230 → ≈ 170 palabras): «Lo que deja fuera: (1) la escalera del firmware (tabla 5.4); (2) la histéresis, pues al soltar un mecanismo real no devuelve la misma fuerza que al apretar; (3) la dinámica del actuador, con su inercia, su latencia y su saturación, que con un k alto aplanaría la recta antes del fondo; (4) la batería que gasta sostener la fuerza con el gatillo quieto.» (y dos frases acortadas sobre la API y el resorte de retorno).
- **Tabla 5.4 nueva** («control-haptico-modos», tras la 5.3): los cuatro modos de la API de Apple (Resistencia, Arma, Vibración, Pendiente) con sus parámetros, la forma de F(x) y la ecuación del sitio ((5.1) con posición de inicio nula; (5.4) con intensidad inicial nula; «ninguna» para los escalones); leyenda con los rangos 0–1 y la escalera de 10 zonas e intensidades 0–8 de Klein; fuentes Apple (2) y Klein (6); «lectura como F(x): del autor».

## Tema 6 · Frenado regenerativo (`frenado-regenerativo.mdx`)

**Prosa**

- l. 100: «Uso el Tesla Model 3 Long Range RWD 2025 del Test Car List de la EPA (tabla 6.1) en el ciclo UDDS: 1 369 s y 11,99 km» → «Uso el Tesla Model 3 Long Range RWD 2025 de la EPA (tabla 6.1) en el ciclo urbano UDDS: 1 369 s y 11,99 km»
- l. 118: «la energía cinética pasa a otra forma, y si la toma el motor puede volver a la batería.» → «la energía cinética pasa a otra forma y, si la toma el motor, a la batería.»
- l. 125: «En el UDDS se quitan 1,124 kWh al desacelerar, y el modelo simple los devolvería todos.» → «En el UDDS se quitan 1,124 kWh al desacelerar; un modelo simple devolvería todo a la batería.»
- l. 173: «En el UDDS, de 1,124 kWh la carga en carretera absorbe 0,255 y 0,869 exigen freno (77,3 %); en el HWFET, solo el 45,6 % del ΔK quitado.» → «En el UDDS, de 1,124 kWh, la carga en carretera absorbe 0,255 kWh y 0,869 kWh (el 77,3 %) exigen freno; en el HWFET, solo el 45,6 %.»
- l. 196: «La regeneración se reduce con la batería llena, fría o caliente; en el modelo, eso baja P_máx. Cerca de detenerse, la regeneración se desvanece: f(v)» → «La batería llena, fría o caliente reduce la regeneración; en el modelo, baja P_máx. Cerca de detenerse, el motor frena cada vez menos: f(v), de FASTSim 2»
- l. 223: «no dejaría nada a la fricción: volvería el 43,5 % de la tracción.» → «no dejaría nada a la fricción: la batería recibiría el 43,5 % de la tracción.»
- l. 244: «De los 0,8686 kWh que frenan las ruedas en el UDDS, 0,6452 vuelven a la batería (40,4 % de la tracción) y se disipan 0,2234: 0,1613 al convertir y 0,0621 en las pastillas (tabla 6.2).» → «De los 0,869 kWh que frenan las ruedas en el UDDS, 0,645 kWh vuelven a la batería (40,4 % de la tracción) y el resto se disipa al convertir y en las pastillas (tabla 6.2).»
- l. 255: «En carretera, aire y rodadura … vuelve el 12,5 % de ella; con manejo agresivo, el 30,7 %.» → «En carretera (HWFET), aire y rodadura … vuelve el 12,5 % de ella; con manejo agresivo (US06), el 30,7 %.»
- l. 261: «no entre el frenado, que se reparte sin resto entre batería, pérdidas y fricción.» → «no entre el frenado, repartido sin resto entre batería, pérdidas y fricción.»
- l. 295 (caso): «FASTSim, el simulador abierto del NLR (antes NREL), estima el consumo en un ciclo de velocidad. Su versión 3.1.0 suma en cada paso las potencias de aceleración, rodadura y aire, y reparte el frenado entre motor y fricción.» → «FASTSim 3.1.0, el simulador abierto del NLR, estima el consumo en un ciclo de velocidad. En cada paso suma las potencias de aceleración, rodadura y aire y reparte el frenado entre motor y fricción.»
- l. 307 (justificación): «…«recupera X %»: con el mismo auto, X va del 12,5 al 40,4 % de la tracción según el ciclo, y una tabla por ciclo no sirve a otro auto … la calcula al instante, según la rapidez real, con A, B, C y una masa efectiva» → «…«recupera X %»: X va del 12,5 al 40,4 % de la tracción según el ciclo; una tabla por ciclo no sirve a otro auto … la calcula al instante con A, B, C, la rapidez real y una masa efectiva»
- l. 313: «y sin esos límites no ve frío ni carga de la batería.» → «y sin esos topes el modelo no distingue una batería fría o llena.»
- l. 321 (recuadro de clase): «la energía interna queda en aire, llantas, motor, pastillas y, como energía química, en la batería.» → «la energía interna queda en aire, llantas, motor y pastillas, y como energía química en la batería, que el curso no separa de la interna.»
- l. 329 (conexiones): «lo que un choque con e < 1 no devuelve se vuelve energía interna.» → «lo que un choque con e < 1 no devuelve es energía interna.»

**Símbolos, leyendas y notas**

- l. 108 (símbolo m): «masa de prueba equivalente (ETW) del auto, 1 927,77 kg» → «…, 1 928 kg (tabla 6.1)»
- l. 232 (leyenda 6.3): «Potencia en la mayor frenada del UDDS.» → «Potencia en la frenada del UDDS que más energía quita en las ruedas (de 381 a 397 s, desde 59 km/h: 224 kJ).» (y el título del SVG de la figura dice lo mismo).
- l. 234 (fuente 6.3): «tope de 239 kW del motor del Model 3 en FASTSim (fuente 3) y f(v)…» → «tope de 239 kW del motor del Model 3 RWD 2022 de FASTSim (fuente 3), que tomo para el 2025, y f(v)…»
- l. 285 (nota del laboratorio), añadido: «f(v) se evalúa a la rapidez al final de cada segundo; FASTSim 2 usa la rapidez media (con ella el UDDS daría 41,2 %). El tope por omisión, 239 kW, es el del motor del Model 3 RWD 2022 de FASTSim, que tomo para el 2025.»

Decisión de Dylan pendiente (fase B): pasar f(v) a la rapidez media como FASTSim 2 (40,4 % → 41,2 %; fricción 0,062 → 0,046 kWh en texto, tabla 6.2, pruebas y traspaso) o dejarla a la rapidez final, ya declarada.
