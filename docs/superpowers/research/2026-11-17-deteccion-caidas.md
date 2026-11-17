# Qué aprendí — La aplicación propia: detección de caídas en un reloj inteligente. Investigación de fuentes

Fecha de consulta de todas las fuentes: **2026-11-17**. Las citas textuales van en el idioma original, con su punto decimal. Lo marcado «(cálculo propio)» lo calculé con `research/scripts-caidas/calculos.py` (scratchpad de la sesión) usando g = 9,81 m/s². Lo marcado **NO CONFIRMADO** no se pudo abrir o verificar. Las descargas, guardadas en `research/data/caidas/` (scratchpad), se trataron como datos no confiables: no se ejecutó nada de ellas, solo se extrajo su texto.

Consigna (sección de cierre «Qué aprendí»): «La aplicación propia. Identifique un problema de software que a usted le interese y que no aparezca en la lista de trece temas, y explique en media página qué concepto físico del curso lo resolvería y cómo. No hay que implementarlo: hay que argumentarlo.» La detección de caídas no está entre los trece temas del portafolio (dron, salto, hábitat, llantas, háptico, frenado regenerativo, restitución, ruedas de reacción, asistencia gravitatoria, animaciones con resorte, resonancia, síntesis de sonido y enfriamiento líquido).

---

## 1. Resumen

- **El problema de software.** El reloj tiene que decidir, solo con su acelerómetro y su giroscopio, si quien lo lleva sufrió una caída fuerte y no responde, para llamar a emergencias. Si se equivoca hacia un lado, llama por un aplauso o un salto (falso positivo). Si se equivoca hacia el otro, calla ante una caída real (falso negativo). Apple lo ofrece desde el Apple Watch Series 4 (2018), Google en el Pixel Watch (2023) y Samsung en los Galaxy Watch. Los tres advierten en sus fuentes oficiales que no detectan todas las caídas y que una actividad intensa puede dispararlo.
- **La física que lo resuelve, en tres conceptos del curso:**
  1. **Qué mide el sensor** (Módulo 2, Tema 01, Concepto 07 «Fuerza normal y tensión», y el Ejemplo 2 del folleto, «Lo que mide una báscula»). Un acelerómetro es una báscula diminuta y lee $n/m = g + a_y$. En reposo marca 1 g (9,81 m/s²); en caída libre, $a_y = -g$ y marca **0**.
  2. **La fase de caída** (Módulo 1, Tema 1.2, «Caída libre y lanzamiento vertical»). La duración del valle cercano a 0 g es $t = \sqrt{2h/g}$, y la rapidez al llegar al suelo, $v = \sqrt{2gh}$.
  3. **El impacto** (Módulo 3, Tema 01, Concepto 03 «Impulso y cambio de momento»). $\bar F\,\Delta t = \Delta p$: el suelo anula $mv$ en un $\Delta t$ breve, y eso produce un pico de varios g.
  4. Y, para la fase posterior, las **componentes de un vector** (Módulo 1, Tema 1.3, cosenos directores). En reposo la lectura vuelve a 1 g, pero proyectada sobre otro eje: el reloj «ve» el brazo horizontal y la quietud.
- **El argumento central.** Un umbral fijo de aceleración («más de 3 g es caída») confunde la caída con un golpe en la mesa o con el aterrizaje de un salto. La física de la caída dicta una **secuencia**: valle cercano a 0 g, pico de impacto y reposo en otra orientación. Esa secuencia separa los casos. La patente de Apple describe exactamente esa división: antes del impacto, el impacto y después del impacto.
- **Riesgos para el texto.** (a) La página de soporte de Apple no se pudo abrir (HTTP 304 sin contenido): el «≈ 1 min» y la llamada automática se citan del comunicado de Apple de 2018 y de la patente, no de la página de soporte. (b) La patente de Apple **no** usa las palabras *free fall*: habla de la duración de la caída medida con la aceleración vertical antes del impacto. (c) Los umbrales medidos (2,5–3,5 g) vienen de sensores en el tronco, la cintura o la muñeca en caídas **simuladas**; en caídas reales la sensibilidad cae mucho (Bagalà et al., 2012). (d) El Δt del impacto del borrador (0,2 s) es un supuesto declarado, no una medición en la muñeca.

---

## 2. Fuentes

### 2.1 Productos reales (fuentes primarias de los fabricantes)

**[F1] Apple Newsroom, «Apple Watch Series 4: Beautifully redesigned with breakthrough communication, fitness and health capabilities», 12 de septiembre de 2018. CONFIRMADO** (HTML descargado y leído).
URL: https://www.apple.com/newsroom/2018/09/redesigned-apple-watch-series-4-revolutionizes-communication-fitness-and-health/
- «Fall detection utilizes a next-generation accelerometer and gyroscope, which measures up to 32 g-forces, along with custom algorithms to identify when hard falls occur.»
- «By analyzing wrist trajectory and impact acceleration, Apple Watch sends the user an alert after a fall, which can be dismissed or used to initiate a call to emergency services.»
- «If Apple Watch senses immobility for 60 seconds after the notification, it will automatically call emergency services and send a message along with location to emergency contacts.»
- Desde qué modelo: el comunicado presenta la función con el Series 4 («Apple Watch Series 4 can detect hard falls and if required, initiate a call to emergency services.»).

**[F2] Apple Newsroom, «Apple reveals Apple Watch Series 8 and the new Apple Watch SE», 7 de septiembre de 2022. CONFIRMADO** (descargado). Sirve solo como contexto:
URL: https://www.apple.com/newsroom/2022/09/apple-reveals-apple-watch-series-8-and-the-new-apple-watch-se/
- «Apple developed an advanced sensor-fusion algorithm that leverages a new, more powerful gyroscope and accelerometer on Apple Watch, which now has the highest dynamic range accelerometer in any smartwatch.» (es para la detección de choques de auto, no de caídas).
- **NO CONFIRMADO:** una cifra oficial del rango del acelerómetro del Series 8 o del Ultra. El comunicado de 2022 no da número; no se encontró otra fuente oficial abierta. **El único rango oficial confirmado es «up to 32 g-forces» del Series 4 [F1].**

**[F3] Apple Support, «Use Fall Detection with Apple Watch» (support.apple.com/en-us/108896; antes HT208944). NO CONFIRMADO.** El servidor devolvió HTTP 304 sin cuerpo a curl y a WebFetch, también en las variantes es-es, en-gb, en-au y en-lamr/HT208944. La guía de usuario («Manage Fall Detection on Apple Watch», apd34c409704) devolvió 404. El resumen del buscador mencionaba «about a minute» de inmovilidad, una cuenta regresiva de 30 segundos, la activación automática a partir de 55 años, la edad mínima de 18 años y que «Apple Watch cannot detect all falls» y que «high-impact activity» puede dispararla. **No lo leí en la página: no citar textual.** Para el texto basta [F1] y [F4].

**[F4] Patente de Apple US 10,629,048 B2, «Detecting falls using a mobile device». CONFIRMADO** (texto completo en Google Patents, párrafos numerados).
URL: https://patents.google.com/patent/US10629048B2/en
Asignada a Apple Inc. Solicitud del 11-09-2018 con prioridad del 29-09-2017; concedida el 21-04-2020. Inventores: Xing Tan, Huayu Ding, Parisa Deleh Hossein Zadeh y otros. Una patente describe lo que se *puede* hacer, no lo que hace el producto en cada versión.
- [0114] Muestreo: «the acceleration system 300 can obtain acceleration samples at a sample frequency of 800 Hz using the motion sensors 2510, with a sampling bandwidth of 200 Hz.»
- [0116] Impacto: «if the user has fallen, the mobile device 102 may experience a relatively strong impact (e.g., when the user's body strikes the ground). Such an impact can be identified based on a magnitude of the acceleration experienced by the mobile device 102 (e.g., the rate of change in the velocity of the mobile device), a magnitude of the jerk experienced by the mobile device (e.g., the rate of change in the acceleration of the mobile device), and an oscillatory behavior of the acceleration experienced by the mobile device 102.»
- [0117] Ventana: «nwindow can correspond to the number of samples spanning an interval of time of 0.2 seconds or approximately 0.2 second.»
- [0125] Sensor como sistema amortiguado: «the impact response of the components of the motion sensor (e.g., microelectromechanical systems [MEMS] components) can be similar to that of a second-order underdamped system.»
- [0141] Fase de caída (antes del impacto): «By measuring the acceleration in the internal z-direction, the mobile device 102 can determine a duration of the fall. For example, the duration of the fall can be estimated as the period of time in which the acceleration signal along the inertial z-direction is above a particular threshold value.»
- [0156] Reposo = 1 g: «when the mobile device 102 is static (e.g., not moving), the vector magnitude signal 704 will be 1 (or approximately 1). When the mobile device 102 is moving, the vector magnitude signal 704 will deviate from 1. Therefore, the relationship |VM−1| can be used as a metric of quiescence.»
- [0157] Umbral de quietud: «In some cases, the threshold value can be 0.025 g.»
- [0160] Postura después: «If the forearm of the wearer is pointing toward the horizon for a longer period of time (e.g., greater than a threshold amount of time), with no motions below or above the horizon, the user may be more likely to be injured. For example, this may indicate that the user is lying on the floor, and is not moving their arm up and down.»
- [0199] Secuencia de estados: «Upon detection of a period of quiescence TQ after the fall, the mobile device transitions to the “alert” state … If no user movement is detected during a “timeout” period of time after the transmission of the fall alert elapses (e.g., 30 seconds) and a continuous period of quiescence (e.g., T LL =10 seconds) is detected during this time, the mobile device transitions to the “SOS” state 1212 and transmits the distress call.»
- [0239] Falsos positivos: «This gradual escalation can be beneficial, for example, in reducing the number of false positives regarding a fall, and decreasing the likelihood that a third party will be called unnecessarily.»
- **Ojo:** ni esta patente ni la US 11,276,290 B2 (continuación, también descargada) contienen «free fall», «free-fall» ni «weightless». La fase previa al impacto se describe como duración de la caída, gestos de protección (*bracing*) y cambio del ángulo de la muñeca.

**[F5] Google, «How Google Pixel Watch knows when you fall», blog oficial (Alicia Cormie), 13 de junio de 2023. CONFIRMADO** (descargado).
URL: https://blog.google/products/pixel/google-pixel-watch-fall-detection-ai/
- «If your watch detects you’ve taken a hard fall and haven’t moved for around 30 seconds, it will vibrate, sound an alarm and send a notification asking if you’re okay. After about a minute, if you still haven’t moved or responded, the watch will automatically call emergency services and share your location.»
- «For the fall detection feature, the watch uses motion sensors to look for your body’s instinctive reactions to a fall, like how you might move your arms on the way down, and the impact force of a fall.»
- «But there’s a catch: Lots of the movements people make every day have similar motion patterns to a serious fall. You might take a small stumble during a pick-up soccer game, for instance, or do jumping jacks during a workout — neither of which constitute an emergency.»
- «they tested it on several hundred people for over a year to make sure it didn’t inundate emergency services with false alarms. This group of testers wore the watch while doing high-energy activities — like jumping, swimming and doing burpees — to make sure those movements didn’t trigger alerts.»
- «if someone takes a fall on a crash pad, it doesn't look just like a real-life fall because the impact is less intense.»
- Nota al pie: «Fall detection may not detect all falls.»

**[F6] Samsung US, «Use the Detect fall feature on your Samsung smart watch» (ANS00087244). CONFIRMADO** (descargado).
URL: https://www.samsung.com/us/support/answer/ANS00087244/
- «The Galaxy Watch Active2, Galaxy Watch3, and all Wear OS models include a hard fall detection feature that will send out an SOS if it ever detects a hard fall.»
- «Keep an eye on your watch during high impact activities like sports, since this can sometimes register as a fall.»
- «The fall detection feature is not turned on by default on the watch»; «You can set it to Always, During physical activity, or Only during workouts.»

**[F7] Samsung Australia, «Activate Hard Fall Detection on my Samsung Watch». CONFIRMADO** (descargado).
URL: https://www.samsung.com/au/support/mobile-devices/activate-hard-fall-detection/
- «Your Galaxy Watch* is designed to automatically detects hard falls with its enhanced accelerometer» (sic).
- «After a fall, your watch will alert you for 60 seconds with a popup, sound and vibration. You can cancel the alert or swipe to send SOSes right away. If you don't respond for 60 seconds, an SOS message will be sent to your Emergency contacts.»
- «*Fall Detection feature available on Galaxy Watch models released after 2020. Galaxy Watch cannot detect all falls. Intense physical activity can trigger Fall Detection feature».

### 2.2 El sensor

**[F8] Analog Devices, hoja de datos ADXL345, «3-Axis, ±2 g/±4 g/±8 g/±16 g Digital Accelerometer», Rev. A. CONFIRMADO** (PDF del fabricante leído desde una copia en un curso de la Universidad de Wisconsin; no se pudo bajar de analog.com por tiempo de espera).
URL usada: https://www.physics.wisc.edu/courses/home/spring2023/623/Altera-DEO_reference/DEO-Nano_Datasheets/ADXL345.pdf
- «It measures the static acceleration of gravity in tilt-sensing applications, as well as dynamic acceleration resulting from motion or shock.»
- «Free-fall sensing detects if the device is falling.»
- FREE_FALL: «The FREE_FALL bit is set when acceleration of less than the value stored in the THRESH_FF register (Address 0x28) is experienced for more time than is specified in the TIME_FF register (Address 0x29) on all axes (logical AND).»
- THRESH_FF: «Values between 300 mg and 600 mg (0x05 to 0x09) are recommended.»
- TIME_FF: «Values between 100 ms and 350 ms (0x14 to 0x46) are recommended.»
- Primera página: «10,000 g shock survival».

**[F9] Analog Devices, AN-1023 / Analog Dialogue 43-07 (Ning Jia, 2009), «Detecting Human Falls with a 3-Axis Digital Accelerometer». NO CONFIRMADO:** analog.com no respondió (tiempo de espera en curl y WebFetch). No se citan sus umbrales.

### 2.3 Artículos revisados por pares

**[F10] Bourke, O'Brien y Lyons (2007). «Evaluation of a threshold-based tri-axial accelerometer fall detection algorithm». *Gait & Posture* 26(2):194–199. doi:10.1016/j.gaitpost.2006.09.012.** Resumen **CONFIRMADO** (PubMed 17101272); texto completo **no abierto**.
- «Falls could be distinguished from ADL for a total data set from 480 movements. This was accomplished using a single threshold determined by the fall-event data-set, applied to the resultant-magnitude acceleration signal from a tri-axial accelerometer located at the trunk.»
- Los valores UFT = 3,52 g y LFT = 0,41 g no están en el resumen: se toman de [F12], que los transcribe.

**[F11] Kangas, Konttila, Lindgren, Winblad y Jämsä (2008). «Comparison of low-complexity fall detection algorithms for body attached accelerometers». *Gait & Posture* 28(2):285–291. doi:10.1016/j.gaitpost.2008.01.003.** Resumen **CONFIRMADO** (PubMed 18294851); texto completo **no abierto**.
- «Three different detection algorithms with increasing complexity were investigated using two or more of the following phases of a fall event: beginning of the fall, falling velocity, fall impact, and posture after the fall.»
- «fall detection using a triaxial accelerometer worn at the waist or head is efficient, even with quite simple threshold-based algorithms, with a sensitivity of 97-98% and specificity of 100%.»
- «In this study, the wrist did not appear to be an applicable site for fall detection.»

**[F12] Bagalà, Becker, Cappello, Chiari, Aminian, Hausdorff, Zijlstra y Klenk (2012). «Evaluation of accelerometer-based fall detection algorithms on real-world falls». *PLoS ONE* 7(5):e37062. doi:10.1371/journal.pone.0037062. CONFIRMADO** (texto completo, PMC3353905). Es la fuente abierta clave: prueba trece algoritmos publicados con **29 caídas reales**.
- Sobre [F10]: «a fall was detected when the SV is over the upper (UFT) threshold (3.52 g) or under than the lower (LFT) threshold (0.41 g). Declared specificity is 100% for the upper threshold and 91.25% for the lower threshold, related to the trunk sensor.»
- Sobre [F11]: «These algorithms detected the start of the fall by monitoring lower than a threshold of 0.6 g»; «a signal value of 0.5 g or lower considered to be a lying posture.»
- Sobre Bourke, Van de Ven, Gamble, O'Connor, Murphy et al. (2010; su referencia 32), el algoritmo «Bourke3»: «when the SV exceeds the LFT (0.65 g) and the UFT (2.8 g) thresholds»; «The vertical velocity is further considered as an indicator of a fall when it overcomes the threshold (−0.7 m/s).»
- Valle de caída libre y falsos positivos: «The majority of real-world falls we collected provide a trough before the impact related to the free-fall phase. However some ADL (e.g., sitting on a chair or on a bed) show values of the sum vector lower than the LFT = 0.73 g, due to the phenomenon of weightlessness.»
- Falsas alarmas: «the high number of false alarms during 24 h recordings, from 22 to 85 for the three fallers for Bourke1a, and from 27 to 84 for Bourke1b, is unacceptable (more than 2 false alarms per hour).»
- Caídas reales: «The SE is low (SE = 57.0%±27.3%, maximum value = 82.8%).»
- Caídas lentas: «The algorithm fails to detect falls with low impact magnitude (mainly forward falls, falling on bed/sofa, against the wall)».
- Postura: «In our falls database, subjects who fell on their buttocks, knees, or against a table or the walker, did not lie on the floor.»
- Umbral fijo: «a fixed threshold may not be the optimal strategy compared to a subject-specific threshold.»
- Limitación: los trece algoritmos son de sensores en el tronco o la cintura, no en la muñeca.

**[F13] Khojasteh, Villar, Chira, González y de la Cal (2018). «Improving Fall Detection Using an On-Wrist Wearable Accelerometer». *Sensors* 18(5):1350. doi:10.3390/s18051350. CONFIRMADO** (texto completo, PMC5982860). Muñeca, conjunto de datos UMAFall. En el XML el símbolo g va en MathML; se transcribe como «3×g».
- «A peak is detected whenever the acceleration magnitude is higher than 3×g as defined in [33] when the sensor is located on the waist. However, is this a valid value when the sensor is located on a wrist?»
- «the smallest peak threshold found for all the TS from the UMA Fall dataset for the sensor on the wrist: this value has been found to be 2.5×g».
- «The best fitness value generated by the GA is 0.870 for the peak threshold values 3.09629, 3.09632 and 3.0971.»
- Caídas lentas: «Participants 1, 2 and 15 seem to have been falling with fear: their movements were clearly slower.»
- Esquema de fases que adoptan (de Abbate et al.): impacto si el pico supera 3 g; «Free Fall Index, FFI, the average magnitude in the interval [tFFI,pt]», con el primer valor por debajo de 0,8 g hasta 200 ms antes del pico.

**[F14] Casilari y Oviedo-Jiménez (2015). «Automatic Fall Detection System Based on the Combined Use of a Smartphone and a Smartwatch». *PLoS ONE* 10:e0140929. doi:10.1371/journal.pone.0140929. CONFIRMADO** (PMC4641636).
- «Conversely, the motion of the wrists (where the smartwatch is fastened) is not always representative of the body stability. So, sudden or abrupt movements of the arms that are not necessarily caused by falls may easily induce false positives (that is to say, activities that are misidentified as falls).»

**[F15] Fleps, Vuille, Melnyk, Ferguson, Guy y Helgason (2018). «A novel sideways fall simulator to study hip fractures ex vivo». *PLoS ONE* 13:e0201096. doi:10.1371/journal.pone.0201096. CONFIRMADO** (PMC6057661). Es una medición directa del impacto de la cadera; no hay reloj.
- «A target impact energy based on an impact velocity of 3 m/s [38, 43] and an effective mass (mass contributing to the impact) of 38% of body mass [24, 37, 40] was chosen for this protocol.»
- Tabla 1: «Measured impact velocity [m/s] 3.1 3.1»; «Rotational impact velocity [1/s] 4.13 4.15»; altura del trocánter mayor, 0,760 m.
- «Peak impact loads were 5641 N and 7132 N for specimen H1391 and H1406, respectively. The measured time to peak load was 16.3 ms for specimen H1391 and 11.4 ms for specimen H1406. After peak load was reached, specimen H1391 exhibited gradual unloading over 35 ms.»

**[F16] Marques y Moreno (2023). «Online Fall Detection Using Wrist Devices». *Sensors* 23:1146. doi:10.3390/s23031146. CONFIRMADO** (PMC9920426). Conjunto WEDA-FALL: muñeca, con adultos mayores, a 50 Hz.
- «As mentioned in [11], falls have four phases: prefall, impact, adjustment and postfall.»
- «Each “Actual Fall” takes on average 3.1037 ± 0.2731 s.»
- «the false positive rate issue and achieving a good trade-off between accuracy/power consumption/performance are still issues far from solved.»

**[F17] Fula y Moreno (2024). «Wrist-Based Fall Detection: Towards Generalization across Datasets». *Sensors* 24:1679. doi:10.3390/s24051679. CONFIRMADO** (PMC10935140).
- UMAFall: «The sampling rate was fixed at 200 Hz for smartphones and 20 Hz for wearable devices».
- Al combinar conjuntos de muñeca: «We observe that maximum F1-Score is around 70%, which is significantly lower than the values reported for UMA fall and WEDA fall.»

### 2.4 Material de clase (repo, `.reference/class-material/`)

- **Módulo 1. Cinemática**, Tema 1.2 «Movimiento Rectilíneo (MRU, MRUA y Caída Libre)», sección «Caída libre y lanzamiento vertical»: $v_y = v_{0y} - g\,t$, $y = y_0 + v_{0y}t - \tfrac12 g t^2$, $v_y^2 = v_{0y}^2 - 2g(y-y_0)$ (`01-cinematica.md`, l. 134–160; la clase usa g ≈ 9,8).
- **Módulo 1**, Tema 1.3 «Movimiento en Dos y Tres Dimensiones»: componentes y cosenos directores (`01-cinematica.md`, l. 210–222).
- **Módulo 2. Dinámica**, Tema 01, Concepto 07 «Fuerza normal y tensión», apartado «Contacto con aceleración vertical»: «Una báscula mide esta fuerza de contacto: la dirección de la velocidad por sí sola no determina su lectura.» $N = m(g + a_y)$ (`02-dinamica.md`, l. 382–386). Folleto PDF, «Ejemplo 2 · Lo que mide una báscula» (`02-dinamica-folleto-pdf.md`, l. 251–266). El portafolio escribe la normal como *n*.
- **Módulo 2**, Tema 02, Concepto 04 «Fuerza elástica y ley de Hooke»: la masa de prueba del acelerómetro cuelga de resortes. Tema 04, Concepto 04 «Conservación de la energía mecánica»: da el mismo $v = \sqrt{2gh}$.
- **Módulo 3. Leyes de conservación**, Tema 01 «Momento e impulso», Concepto 03 «Impulso y cambio de momento»: «Para fuerza constante se utiliza J = F Δt; si la fuerza cambia, esa expresión requiere la fuerza media del intervalo. […] Aumentar la duración de una detención para el mismo cambio de momento reduce la fuerza media, fundamento de amortiguadores y protecciones. Esto no asegura por sí solo una fuerza máxima determinada» (`03-leyes-de-conservacion.md`, l. 153–157).
- **Módulo 4. Gravitación** (apoyo): «Los astronautas "flotan" no por ausencia de gravedad, sino por encontrarse en caída libre continua con la nave.» (`04-gravitacion.md`, l. 127).
- **Módulo 5. Oscilaciones** (extensión opcional): Tema 1, «Aplicaciones de ingeniería: Acelerómetros MEMS en dispositivos móviles» (`05-oscilaciones.md`, l. 49), y Tema 3, amortiguamiento. Esto conecta con [F4] [0125].

---

## 3. Números clave

| Magnitud | Valor | Fuente |
|---|---|---|
| Lectura del acelerómetro en reposo | 1 g = 9,81 m/s² («will be 1 (or approximately 1)») | [F4] [0156]; valor de g de la casa |
| Lectura en caída libre ideal | 0 (todas las componentes) | M2 C07 con $a_y = -g$; [F8] (FREE_FALL con todos los ejes bajo umbral) |
| Umbral de caída libre recomendado (ADXL345) | 300–600 mg durante 100–350 ms | [F8] |
| Alturas de caída libre equivalentes a 100 ms y 350 ms | 0,049 m y 0,601 m ($h = \tfrac12 g t^2$) | (cálculo propio) |
| Caída libre desde h = 1,0 m | t = 0,452 s; v = 4,43 m/s | (cálculo propio) |
| Caída libre desde h = 0,8 m | t = 0,404 s; v = 3,96 m/s | (cálculo propio) |
| Salto de 0,30 m de altura (supuesto) | 0,495 s en el aire a 0 g (más que la caída de 0,8 m) | (cálculo propio) |
| Valle medido en caídas (tronco y cintura) | LFT 0,41 g (Bourke 2007), 0,6 g (Kangas), 0,65 g (Bourke3), 0,73 g (caídas reales) | [F12] |
| Pico de impacto: umbrales en tronco y cintura | UFT 3,52 g (Bourke 2007, caídas simuladas); 2,8 g (Bourke3); 1,79 g = el pico más bajo entre las 29 caídas reales (UFT reajustado por Bagalà) | [F12] |
| Pico de impacto en la muñeca (UMAFall) | Pico mínimo 2,5 g; umbral óptimo ≈ 3,09 g; 3 g en la cintura (Abbate) | [F13] |
| Rango del acelerómetro del Apple Watch Series 4 | hasta 32 g | [F1] |
| Rango del ADXL345 (ejemplo de MEMS comercial) | ±2 g a ±16 g; resiste 10 000 g | [F8] |
| Muestreo descrito por Apple | 800 Hz (acelerómetro), ventana de 0,2 s | [F4] [0114], [0117] |
| Muestreo en conjuntos de muñeca | UMAFall 20 Hz (wearables); WEDA-FALL 50 Hz | [F17], [F16] |
| Impacto de cadera (simulador cadavérico) | v = 3,1 m/s; pico 5641 N y 7132 N; tiempo al pico 16,3 ms y 11,4 ms; descarga en 35 ms | [F15] |
| Comprobación v = ωr en [F15] | 4,13 rad/s × 0,760 m = 3,14 m/s ≈ 3,1 m/s | (cálculo propio) |
| Energía de impacto de [F15], H1391 | m_ef = 0,38 × 59,0 = 22,4 kg; K = ½ m_ef v² = 108 J (la figura dice 107 J) | (cálculo propio) |
| Lectura media en el impacto para h = 0,8 m | Δt = 0,05 s → 9,1 g; 0,10 s → 5,0 g; 0,20 s → 3,0 g | (cálculo propio) |
| Lectura media en el impacto para h = 1,0 m | Δt = 0,05 s → 10,0 g; 0,10 s → 5,5 g; 0,20 s → 3,3 g | (cálculo propio) |
| Golpe de mano (supuesto: Δv = 1 m/s en 0,02 s) | ā = 50 m/s² ≈ 5,1 g, por encima de un umbral de 3 g | (cálculo propio, valores supuestos) |
| Postura acostada (cintura) | componente vertical ≤ 0,5 g ⇔ inclinación ≥ 60° ($\cos 60° = 0{,}5$) | [F12] + (cálculo propio) |
| Umbral de quietud de Apple | $\lvert VM - 1\rvert$ < 0,025 g = 0,245 m/s² | [F4] [0157] + (cálculo propio) |
| Tiempos de espera tras detectar | Apple: 60 s de inmovilidad tras la alerta [F1]; patente: 30 s y 10 s de quietud (ejemplo) [F4]; Google: ≈ 30 s y luego ≈ 1 min [F5]; Samsung: 60 s [F7] | ver fuentes |
| Desempeño en caídas reales | sensibilidad 57,0 % ± 27,3 % (máx. 82,8 %); 22–85 falsas alarmas al día (Bourke1a) | [F12] |

---

## 4. El argumento físico en cuatro pasos

Ejes: +y hacia arriba. Un acelerómetro de tres ejes da la «fuerza específica» $\vec f = \vec a - \vec g$ (lo que hace el resorte sobre la masa de prueba, dividido entre la masa) en el marco del reloj. En lenguaje del curso: es una báscula.

### Paso 1. Qué mide el sensor: una báscula, no un velocímetro (M2, C07; M2, Hooke)

La masa de prueba $m$ del sensor cuelga de resortes microscópicos. La fuerza que estos le hacen es la «normal» de una báscula. Con la segunda ley, como en el ascensor del Módulo 2:

$$ n - mg = m a_y \quad\Rightarrow\quad \frac{n}{m} = g + a_y $$

- En reposo o a velocidad constante, $a_y = 0$: lee $g = 9{,}81\ \mathrm{m/s^2}$ («1 g»). Por eso la patente de Apple dice que el módulo vale 1 en reposo [F4] [0156].
- En caída libre, $a_y = -g$: lee **0**. Es lo mismo que el astronauta del Módulo 4, que «flota» por estar en caída libre. El ADXL345 lo aprovecha: su interrupción FREE_FALL se activa cuando los tres ejes quedan por debajo de 300–600 mg durante 100–350 ms [F8].
- Al chocar, el cuerpo frena mientras baja: $a_y > 0$ y la lectura **supera** 1 g.

La lectura no dice hacia dónde va el reloj: dice cuánto lo empujan. La clase lo dice así: «la dirección de la velocidad por sí sola no determina su lectura».

### Paso 2. La fase de caída: un valle cuya duración fija la cinemática (M1, Tema 1.2)

Si la muñeca (o el centro de masa) cae libremente desde el reposo una altura $h$:

$$ t = \sqrt{\frac{2h}{g}}, \qquad v = \sqrt{2gh} $$

Con g = 9,81 m/s²: para $h = 1{,}0$ m, $t = 0{,}45$ s y $v = 4{,}43$ m/s; para $h = 0{,}8$ m, $t = 0{,}40$ s y $v = 3{,}96$ m/s (cálculo propio). La conservación de la energía del Módulo 2 da el mismo $v$ ($mgh = \tfrac12 mv^2$).

- Los tiempos recomendados del ADXL345, de 100 a 350 ms, equivalen a caídas libres de 4,9 a 60 cm (cálculo propio): el fabricante dimensiona el registro con $h = \tfrac12 g t^2$.
- **Matiz real:** una persona no cae como una piedra. Gira como un péndulo invertido, se apoya y mueve los brazos, así que el valle medido no llega a 0. Los umbrales publicados para el «inicio de la caída» están entre 0,41 g y 0,73 g [F12]. El giroscopio ve ese giro. Como control, en el simulador de cadera de [F15], $v = \omega r = 4{,}13 \times 0{,}760 = 3{,}14$ m/s, igual a los 3,1 m/s medidos (cálculo propio).

### Paso 3. El impacto: el impulso lo vuelve un pico (M3, Tema 01, C03)

El suelo anula el momento que trajo la caída. Con el teorema impulso-momento:

$$ J = \Delta p = \bar F\,\Delta t \quad\Rightarrow\quad \bar a = \frac{\Delta v}{\Delta t} = \frac{v}{\Delta t}, \qquad \text{lectura media} \approx 1\ \mathrm{g} + \frac{v}{g\,\Delta t}\ \mathrm{g} $$

| h | v | Δt = 0,05 s | Δt = 0,10 s | Δt = 0,20 s |
|---|---|---|---|---|
| 0,8 m | 3,96 m/s | 9,1 g | 5,0 g | 3,0 g |
| 1,0 m | 4,43 m/s | 10,0 g | 5,5 g | 3,3 g |

(cálculo propio; Δt es un supuesto declarado)

- El Módulo 3 lo anticipa: para el mismo Δp, cuanto más breve el frenado, mayor la fuerza media. La fuerza **máxima** depende del perfil, como advierte la clase. En [F15] la cadera llega al pico en 11–16 ms, con picos de 5,6–7,1 kN.
- Los umbrales medidos en el tronco y la muñeca (2,5–3,5 g [F12], [F13]) corresponden en la tabla a frenados efectivos de unos 0,2 s, o a rapideces menores que las de caída libre. Eso es coherente con caídas que se amortiguan con rodillas, manos y tejidos blandos.
- Apple detecta el impacto por el módulo, el *jerk* (la rapidez de cambio de la aceleración) y la oscilación del sensor tras el golpe [F4] [0116], [0125]. Su acelerómetro mide hasta 32 g [F1]. A 800 Hz, un impacto que sube en 16 ms deja unas 13 muestras; a 20 Hz (UMAFall), menos de una (cálculo propio): **el muestreo bajo subestima el pico**.

### Paso 4. Después: la gravedad como plomada (M1, Tema 1.3; M2, equilibrio)

Si la persona queda tendida e inmóvil, $\vec a = 0$ y el módulo vuelve a 1 g, pero **la gravedad se proyecta sobre otros ejes**. Si el eje $z$ del sensor forma un ángulo θ con la vertical:

$$ f_z = g\cos\theta $$

- Kangas toma «acostado» cuando la componente vertical de la cintura es ≤ 0,5 g, es decir, θ ≥ 60° [F12] (cálculo propio: $\cos 60° = 0{,}5$). Bourke3 usa también 60° [F12]. Apple mira si el antebrazo apunta al horizonte sin subir ni bajar [F4] [0160].
- La quietud se mide como $\lvert\,\lvert\vec f\rvert - 1\ \mathrm{g}\rvert$ < 0,025 g = 0,245 m/s² acumulado en el tiempo [F4] [0156]–[0157]. Solo tras esa quietud el reloj alerta y luego llama: 60 s según [F1], ≈ 1 min según [F5], 60 s según [F7].

### Por qué un umbral fijo falla y la secuencia no

| Actividad | Valle ≈ 0 g antes | Pico de impacto | Reposo en otra orientación después | ¿Umbral «> 3 g»? | ¿Secuencia completa? |
|---|---|---|---|---|---|
| Caída fuerte | sí (≈ $\sqrt{2h/g}$) | sí | sí | detecta | detecta |
| Aplaudir o golpear la mesa | no | sí (Δv pequeño, Δt muy corto) | no | **falso positivo** | rechaza |
| Saltar (0,30 m) | **sí, 0,49 s** (más largo que una caída de 0,8 m) | sí, al aterrizar | no: de pie y en movimiento | **falso positivo** | rechaza |
| Sentarse de golpe | parcial (< 0,73 g [F12]) | moderado | tronco erguido | depende | rechaza si mira la postura |
| Acostarse a propósito | no | no | sí | no | rechaza (sin valle ni pico) |
| Caída lenta o deslizada | **no** | débil | a veces | **falso negativo** | puede fallar |

El salto es el caso más instructivo: tiene una fase de caída libre auténtica (todo el vuelo lee 0 g) y un impacto. Solo la fase posterior lo separa de una caída. Google probó la función con saltos, *burpees* y *jumping jacks* por esa razón [F5].

---

## 5. Qué cuesta / límites

1. **Caídas sin fase libre.** Las caídas lentas, deslizadas, sobre la cama o el sofá, contra la pared o de rodillas tienen un valle débil y un impacto bajo. Son las que fallan los algoritmos [F12]. Los participantes que «caían con miedo» dieron picos menores [F13].
2. **La muñeca no es el cuerpo.** El brazo se mueve solo, se apoya y amortigua. Kangas concluyó que la muñeca «did not appear to be an applicable site» con umbrales simples [F11], y los gestos bruscos del brazo dan falsos positivos [F14]. Por eso Apple y Google modelan el movimiento del brazo (trayectoria de la muñeca, gestos de protección) además del impacto [F1], [F4], [F5].
3. **Caídas simuladas frente a reales.** En colchonetas el impacto es menor [F5]. Con 29 caídas reales, la sensibilidad media de trece algoritmos fue 57 % [F12]. Al cruzar conjuntos de datos de muñeca, el F1 cae a ≈ 70 % [F17].
4. **Falsas alarmas.** Una especificidad del 96 % puede significar ≈ 2 falsas alarmas por hora en un registro continuo [F12]. Los fabricantes responden con escalamiento: alerta, espera de quietud y luego llamada [F1], [F4] [0239], [F7].
5. **Rango y muestreo.** Si el pico supera el rango, el sensor satura: [F12] excluyó de la evaluación de especificidad las grabaciones hechas con sensores de ±2 g. Con muestreo bajo, el pico se pierde (paso 3). Además, en caídas reales el pico del tronco puede ser tan bajo como 1,79 g [F12], y un umbral pensado para caídas simuladas (3,52 g) no lo ve.
6. **Umbrales fijos frente a modelos.** Los productos usan modelos estadísticos o de aprendizaje automático entrenados con datos [F4], [F5]. El argumento físico dice **qué rasgos** mirar (valle, pico, *jerk*, postura, quietud), no reemplaza ese ajuste. Bagalà recomienda umbrales por persona [F12].
7. **Lo que no se pudo verificar.** La página de soporte de Apple [F3], la nota AN-1023 [F9] y los textos completos de Bourke 2007 y Kangas 2008 [F10], [F11].

---

## 6. Conexiones con el portafolio (opcional)

- **Tema 3 (hábitat, 1 g):** lo que sentimos como peso es la normal; el acelerómetro mide esa misma normal por unidad de masa.
- **Tema 2 (salto):** el vuelo de un personaje es caída libre; un reloj en su muñeca leería 0 g todo el vuelo. Es el falso positivo del salto.
- **Tema 7 (restitución):** el impacto es «un resorte breve»; la oscilación que Apple mide después del golpe es la respuesta del MEMS como sistema subamortiguado [F4] [0125] (Módulo 5, Tema 3).

---

## 7. Borrador de media página (≈ 300 palabras; para que Dylan lo revise)

**La aplicación propia: detectar una caída con un reloj inteligente**

Apple, Google y Samsung venden relojes que llaman a emergencias si quien los lleva se cae. El software debe decidirlo solo con un acelerómetro y un giroscopio: si se equivoca, llama por un aplauso o calla ante una caída real. Creo que lo resolverían tres ideas del curso, en el orden en que ocurre una caída.

Primero, qué mide el sensor. Un acelerómetro es una báscula diminuta: una masa de prueba sostenida por resortes. Como la báscula del ascensor del Módulo 2, lee la normal por unidad de masa, $n/m = g + a_y$. En reposo marca $9{,}81\ \mathrm{m/s^2}$, es decir, 1 g; en caída libre, $a_y = -g$ y marca cero. La caída empieza, entonces, con un valle cercano a 0 g, y la caída libre del Módulo 1 da su escala: desde $h = 0{,}8\ \mathrm{m}$ dura $t = \sqrt{2h/g} \approx 0{,}40\ \mathrm{s}$ y termina con $v = \sqrt{2gh} \approx 3{,}96\ \mathrm{m/s}$.

Segundo, el golpe. El suelo anula ese momento en poco tiempo, y el teorema impulso-momento del Módulo 3 lo cuantifica: $\bar F\,\Delta t = \Delta p$. Si la muñeca se detiene en $\Delta t = 0{,}2\ \mathrm{s}$, su aceleración media es $v/\Delta t \approx 20\ \mathrm{m/s^2}$ y el sensor marca en promedio unos 3 g. Cuanto más breve el choque, más alto el pico.

Tercero, lo que sigue. Si la persona queda tendida e inmóvil, la lectura vuelve a 1 g, pero la gravedad se proyecta ahora sobre otro eje del reloj: sus componentes cambian y delatan el brazo horizontal.

Por eso no bastaría un umbral fijo del tipo «más de 3 g es una caída». Aplaudir o golpear la mesa da un pico sin valle previo, y un salto tiene valle y pico, pero la persona sigue de pie. La física pide la secuencia completa (valle, pico y reposo en otra orientación), no un número aislado. Lo difícil queda en las caídas lentas, sin fase libre, y en que la muñeca no siempre cae como el cuerpo.

*Notas para la revisión:*
- **Supuestos que el texto no declara:** $h = 0{,}8$ m (altura aproximada de la muñeca con el brazo colgando; no la verifiqué con una tabla antropométrica) y $\Delta t = 0{,}2$ s. Este último se eligió porque da ≈ 3 g, el orden de los umbrales medidos en la muñeca [F13]. Si Dylan prefiere $h = 1{,}0$ m: $t = 0{,}45$ s, $v = 4{,}43$ m/s y ≈ 3,3 g.
- **Fuerza normal:** el borrador escribe $n$ (notación de la casa); la clase escribe $N$.
- **Fuentes:** el borrador no cita fuentes. Si se quiere una, la más segura es [F1] (Apple, 2018: hasta 32 g, trayectoria de la muñeca, aceleración de impacto, 60 s de inmovilidad).
- **«1 g»:** se usa como unidad de lectura, igual que los fabricantes; el texto lo define al usarlo.

---

## 8. Decisiones para Dylan

1. **Altura.** ¿$h = 0{,}8$ m (muñeca) o $h = 1{,}0$ m (centro de masa aproximado)? Ninguna de las dos está tomada de una fuente: son supuestos declarados.
2. **¿Nombrar productos?** El borrador abre con Apple, Google y Samsung; se puede quitar si la media página debe ser solo física.
3. **¿Mencionar el giroscopio y $v = \omega r$?** Daría pie a un cuarto concepto (MCU, Módulo 1, Tema 1.4) pero alarga el texto.
4. **¿Extensión al Módulo 5?** Apple modela la vibración del MEMS tras el golpe como un sistema subamortiguado [F4] [0125]. Es fiel a la fuente, pero sale de «media página».
