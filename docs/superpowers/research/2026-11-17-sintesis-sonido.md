# Tema 11: síntesis de sonido (armónicos, timbre y el sintetizador): por qué una flauta y un clarinete en la misma nota no suenan igual

Investigación de solo lectura. Todas las fuentes se consultaron el **2026-11-17**. Los valores están copiados de la fuente abierta (especificación con fecha y sección; código en un tag o commit fijo, con número de línea). Lo que calculé yo lleva la marca "(cálculo propio)" y lo que no pude verificar, "NO CONFIRMADO". Las citas textuales están en el idioma original. Las descargas (especificación, código, páginas, audio) están en `scratchpad/research/data/sintesis-sonido/` y son datos no confiables: no se ejecutó nada de ellas. El audio se decodificó con `ffmpeg` y se analizó con numpy mediante scripts propios guardados fuera de esa carpeta (`scratchpad/research/scripts/`: `harmonics.py`, `final_pair.py`, `robust.py`, `halfwave.py`, `envelope.py`, `vibrato.py`, `coefs.py`, `calcs.py`). Las notas se nombran con índice de octava científico (la4 = 440 Hz, temperamento igual) y en altura **real** (de concierto), salvo que se diga «escrita».

---

## 1. Recomendación

**Caso de uso: la Web Audio API del W3C (`OscillatorNode` + `PeriodicWave`) y su implementación en Chromium/Blink (`periodic_wave_handler.cc`).**

Motivos:
- Es el sintetizador que lleva dentro **cada navegador**, y su especificación escribe la ecuación del tema tal cual: la forma de onda es la suma de Fourier `x(t) = Σ_{k=1}^{L−1} [a[k] cos 2πkt + b[k] sin 2πkt]` (Recomendación W3C del 2021-06-17, §1.28.4), donde `b[1]` es el fundamental y `b[2]` «the first overtone». Con un arreglo de amplitudes por armónico se genera **cualquier timbre periódico a cualquier frecuencia** (`frequency` es un `AudioParam`), sin grabar nada. Es exactamente la superposición del paso 3 convertida en API pública.
- La especificación también da las recetas de las ondas clásicas (§1.28.6: cuadrada, diente de sierra, triangular como coeficientes `b[n]`), la normalización (§1.28.5), la advertencia de aliasing y el compromiso CPU frente a fidelidad (§1.26), y la envolvente exponencial para el «decay» y el «release» de un ADSR (§1.6.2, `setTargetAtTime`). Todo lo que necesita el paso 4 está en el mismo documento.
- El código de Chromium es abierto y fijable (tag `160.0.8168.1`, commit `22cf9aec`). Muestra el **qué cuesta** con números: la receta se convierte por FFT inversa en 36 tablas por tercio de octava (4096 muestras cada una a 44,1 o 48 kHz) y, según la nota, borra los armónicos que pasarían de Nyquist ("just in time to truncate partials before aliasing occurs"). Es decir, el navegador **cambia memoria (576 KiB por receta, cálculo propio) por CPU** y resuelve el aliasing que una suma ingenua de senos no resuelve.
- Firefox (Gecko) contiene el mismo diseño (archivo derivado de Blink, `dom/media/webaudio/blink/PeriodicWave.cpp`) con otros parámetros: es un contraste verificable entre dos motores.

**Recurso (las dos muestras): grabaciones reales de la University of Iowa (Musical Instrument Samples, MIS): flauta y clarinete en si♭, ambos en mi♭4 (≈ 310 Hz), dinámica *ff*, sin vibrato.** La página del MIS dice que las grabaciones "may be downloaded and used for any projects, without restrictions" (CONFIRMADO). Medí con nuestro propio FFT: ambas notas tienen el mismo fundamental (310,1-310,3 Hz; diferencia ≤ 0,24 Hz = 1,3 cents) y timbres opuestos. El clarinete tiene solo armónicos impares fuertes (potencia impar/par = **25,7 dB**); la flauta los tiene todos (**−0,7 dB**). En la forma de onda, la segunda mitad de cada periodo del clarinete es la primera invertida (correlación **0,992**); en la flauta no (**−0,08**). Todo esto es cálculo propio, en §4 y §6. Es la pareja de libro de texto: tubo abierto-abierto frente a tubo cerrado-abierto, "roughly the same length" (Wolfe, UNSW).

**Alternativas de caso:**
1. **Chrome Music Lab, experimento «Harmonics» (Google Creative Lab, Apache-2.0).** Es un producto educativo nombrado que lleva la ecuación f_n = n f₁ literalmente en el código (`startingFrequency * (this.ind+1)`), con 6 osciladores seno y una envolvente ADSR fija. Es la síntesis aditiva «un oscilador por armónico». Sirve como contraste de diseño: N osciladores frente a una sola tabla `PeriodicWave`.
2. **Vital (sintetizador de tabla de ondas, GPL-3.0).** Cada cuadro de su tabla de ondas se guarda también como espectro armónico (`frequency_domain`, 1 025 bins para 2 048 muestras) y se convierte con FFT. Confirma que la industria de los sintetizadores de software usa la misma representación «receta de armónicos». Como caso principal pierde porque su código no expone una ecuación física tan legible como la de la especificación.
3. **Órgano Hammond (contraste histórico, 1934).** La patente US 1 956 350 describe la síntesis aditiva electromecánica: los tonos se producen "by synthesis of the fundamental tone with various proportions of its harmonics", usando "the first eight harmonics". El folleto de Hammond Suzuki confirma «9 pitches» por juego de *drawbars*. Va como recuadro histórico, no como caso.

---

## 2. Casos de uso candidatos, ordenados

| # | Caso | Qué calcula el software | Ecuación explícita en el código o la especificación | Por qué la física supera a la muestra pregrabada o al valor fijo | Qué cuesta |
|---|---|---|---|---|---|
| 1 | **Web Audio `PeriodicWave` (W3C) + Chromium** | Una forma de onda periódica desde los coeficientes `real`/`imag`, a la frecuencia `computedOscFrequency(t) = frequency(t) * pow(2, detune(t) / 1200)` | Especificación §1.28.4: `x(t) = Σ [a[k] cos 2πkt + b[k] sin 2πkt]`. Chromium: `culling_scale = pow(2, -cents_to_cull / kCentsPerOctave)` y `number_of_partials = culling_scale * max_number_of_partials` (borra los parciales que harían aliasing); recetas `b = (n & 1) ? 2 * pi_factor : 0` (cuadrada) | Con 12 números (amplitudes de 12 armónicos) se toca **cualquier nota, de cualquier duración**, con transposición continua (`detune`, vibrato) y sin cambiar la duración ni mover las resonancias. Una muestra pregrabada sirve para una nota y una intensidad, y su transposición acelera el sonido y desplaza su espectro entero | Solo timbres **periódicos**: sin ataque, sin ruido, sin inarmonicidad (todo eso lo añade el paso 4). Memoria: 36 tablas × 4 096 × 4 B = 576 KiB por receta (cálculo propio). Normalización por el pico, que cambia la sonoridad entre recetas. Aliasing: el navegador conserva entre 50 y 64 parciales a 310 Hz y solo 4-5 a 4 186 Hz (cálculo propio) |
| 2 | **Chrome Music Lab «Harmonics»** (Google Creative Lab) | Seis osciladores seno en f₁, 2f₁, …, 6f₁ con f₁ = 174,61 Hz, cada uno con su envolvente | `this.synth.oscillator.type = "sine";` y `this.synth.triggerAttack(this.m.startingFrequency * (this.ind+1));` → f_n = n f₁ | El estudiante oye la serie armónica construida por suma de senos puros, sin muestras | Un oscilador y una envolvente por armónico: el costo crece con N (aquí N = 6). No permite fijar amplitudes por armónico ni ver el espectro de un instrumento real |
| 3 | **Firefox (Gecko) `PeriodicWave.cpp`** | Lo mismo que Chromium (archivo derivado de Blink, "Copyright (C) 2012 Google Inc.") | `MinPeriodicWaveSize = 4096`, `MaxPeriodicWaveSize = 8192`, `CentsPerRange = 1200 / 3`; límite explícito `nyquist / fundamentalFrequency` | Igual que el caso 1 | Crea las tablas de forma perezosa (solo las reconstruye si una nota más grave admite más parciales); factor 0,5 sin normalización ("See Bug 1424906") |
| 4 | **Vital** (wavetable, GPL-3.0) | Cuadros de tabla de ondas de 2 048 muestras guardados en tiempo y en frecuencia | `kWaveformBits = 11`, `kWaveformSize = 1 << kWaveformBits`, `kNumRealComplex = kWaveformSize / 2 + 1`; `toFrequencyDomain()` / `toTimeDomain()` con FFT | La receta espectral permite editar armónicos y transformar el timbre de forma continua | La conversión de cada cuadro a tablas limitadas en banda durante la reproducción no la verifiqué: NO CONFIRMADO |
| 5 | **Hammond** (1934; B-3 de 1955) | Suma eléctrica de tonos «puros» de ruedas fónicas en proporciones elegidas con *drawbars* | Patente: síntesis "of the fundamental tone with various proportions of its harmonics" | Un juego de 9 *drawbars* da "many thousands of variations" de timbre (folleto) | Armónicos tomados de la escala temperada: el 3.º queda 1,96 cents bajo y el 5.º, **13,69 cents alto** respecto del armónico exacto (cálculo propio con la frase de la patente) |

**La alternativa no física: el muestreo (*sampling*).** El nodo de Web Audio para muestras, `AudioBufferSourceNode`, transpone leyendo el búfer más rápido: `computedPlaybackRate(t) = playbackRate(t) * pow(2, detune(t) / 1200)` y `bufferTime += dt * computedPlaybackRate` (§1.9). La propia especificación da el efecto sobre la duración: "a duration of 5 seconds with a playback rate of 0.5 will output 5 seconds of buffer content at half speed, producing 10 seconds of audible output". Con nuestros datos (cálculo propio): transponer la trompeta de la3 a re4 (factor 2^(5/12) = 1,335) acortaría la nota de 4,19 s a 3,14 s y llevaría su armónico más fuerte de 1 310 Hz a 1 748 Hz. La trompeta real en re4 tiene su máximo en 1 180 Hz (§4.3). Su región fuerte se queda **fija** en frecuencia, y la muestra transpuesta la mueve.

---

## 3. Fuentes

### 3.1 Especificación y código

**[webaudio-2021] Web Audio API, W3C Recommendation, 17 June 2021.** Editores Paul Adenot (Mozilla) y Hongchan Choi (Google). https://www.w3.org/TR/2021/REC-webaudio-20210617/ **CONFIRMADO.**
- §1.26 (OscillatorNode): "Oscillators are common foundational building blocks in audio synthesis." · "When this waveform is sampled as a discrete-time digital audio signal at a particular sample-rate, then care MUST be taken to discard (filter out) the high-frequency information higher than the Nyquist frequency before converting the waveform to a digital form. If this is not done, then aliasing of higher frequencies (than the Nyquist frequency) will fold back as mirror images into frequencies lower than the Nyquist frequency." · "The trade-off for the implementation is a matter of implementation cost (in terms of CPU usage) versus fidelity to achieving this ideal." · `computedOscFrequency(t) = frequency(t) * pow(2, detune(t) / 1200)` · "The OscillatorNode’s instantaneous phase at each time is the definite time integral of computedOscFrequency".
- §1.28: "A conforming implementation MUST support PeriodicWave up to at least 8192 elements."
- §1.28.3.1 (miembros de `PeriodicWaveOptions`): `imag` "represents an array of sine terms. The first element (index 0) does not exist in the Fourier series. The second element (index 1) represents the fundamental frequency. The third represents the first overtone and so on." `real` "represents an array of cosine terms. The first element (index 0) is the DC-offset".
- §1.28.4 (Waveform Generation): `x(t) = \sum_{k=1}^{L-1}\left[a[k]\cos 2\pi k t + b[k]\sin 2\pi k t\right]`, "This is the basic (unnormalized) waveform." El tiempo t está medido **en periodos** (un ciclo es t ∈ [0, 1)); la frecuencia real la pone `OscillatorNode.frequency`.
- §1.28.5 (Waveform Normalization): "normalized so that the maximum value is 1", con `\tilde{x}(n)` evaluado en N puntos (potencia de dos), `f = \max_n |\tilde{x}(n)|`, `\hat{x}(n) = \tilde{x}(n)/f`; "This fixed normalization factor MUST be applied to all generated waveforms." Se desactiva con `disableNormalization` (§1.28.2).
- §1.28.6 (Oscillator Coefficients), con a[n] = 0 en todos los casos ("because the waveforms are odd functions"): seno `b[1] = 1`; cuadrada `b[n] = \frac{2}{n\pi}\left[1-(-1)^n\right]`; diente de sierra `b[n] = (-1)^{n+1}\frac{2}{n\pi}`; triangular `b[n] = \frac{8\sin(n\pi/2)}{(\pi n)^2}`.
- §1.6.2 (`setTargetAtTime`): "Start exponentially approaching the target value at the given time with a rate having the given time constant. Among other uses, this is useful for implementing the "decay" and "release" portions of an ADSR envelope." `v(t) = V_1 + (V_0 - V_1)\, e^{-\left(\frac{t - T_0}{\tau}\right)}`.
- §1.9 (AudioBufferSourceNode): `computedPlaybackRate(t) = playbackRate(t) * pow(2, detune(t) / 1200)`; la cita de los «5 seconds … 10 seconds of audible output» (argumento `duration` de `start()`).
- §1.2 (AudioContext): "An AudioContext is said to be allowed to start if the user agent allows the context state to transition from "suspended" to "running". A user agent may disallow this initial transition, and to allow it only when the AudioContext’s relevant global object has sticky activation."

**[webaudio-1.1] Web Audio API 1.1, W3C Working Draft, 22 September 2026.** https://www.w3.org/TR/2026/WD-webaudio-1.1-20260922/ (es lo que sirve hoy https://www.w3.org/TR/webaudio/). **CONFIRMADO** que §1.26, §1.28.4, §1.28.5, §1.28.6, §1.6.2 y la definición de «allowed to start» tienen el mismo texto y las mismas ecuaciones. Recomiendo citar la Recomendación de 2021 (estable) y mencionar la 1.1 como borrador vigente.

**[chromium] Chromium (Blink), módulo `webaudio`.** Tag `160.0.8168.1`, commit `22cf9aec2946bf4f81bee0c567ae28ff1a73381b` (2026-11-17), licencia BSD. URL base: https://chromium.googlesource.com/chromium/src/+/refs/tags/160.0.8168.1/third_party/blink/renderer/modules/webaudio/ (espejo: https://github.com/chromium/chromium/blob/22cf9aec2946bf4f81bee0c567ae28ff1a73381b/third_party/blink/renderer/modules/webaudio/). **CONFIRMADO.**
- `periodic_wave_handler.cc` L31-L33: "The number of bands per octave. Each octave will have this many entries in the wave tables." `constexpr unsigned kNumberOfOctaveBands = 3;` · L37 `kMaxPeriodicWaveSize = 16384;` · L39-L40 `kCentsPerOctave = 1200;` `kCentsPerRange = kCentsPerOctave / kNumberOfOctaveBands;`
- L42-L54, `GetPeriodicWaveSize`: 2 048 si f_s ≤ 24 000; **4 096 si f_s ≤ 88 200**; 16 384 en otro caso ("we want sample rates around 44.1 kHz or so to have a size of 4096 to preserve backward compatibility").
- L80-L87 (constructor): `number_of_ranges_ = lround(kNumberOfOctaveBands * log2f(periodic_wave_size_))`; `lowest_fundamental_frequency_(sample_rate / periodic_wave_size_)`; `rate_scale_(periodic_wave_size_ / sample_rate)`. Con 4 096: 36 rangos; f_bajo = 10,77 Hz (44,1 kHz) u 11,72 Hz (48 kHz) (cálculo propio).
- L105-L109: "Add one to round-up to the next range just in time to truncate partials before aliasing occurs." `pitch_range = clamp(1 + cents_above_lowest_frequency / kCentsPerRange, 0, number_of_ranges_ - 1)`.
- L276-L278: "Convert into time-domain wave buffers. One table is created for each range for non-aliasing playback at different playback rates. Thus, higher ranges have more high-frequency partials culled out."
- L284: `float normalization_scale = 0.5f;` ("The default scale factor for when normalization is disabled").
- L320-L326: `cents_to_cull = range_index * kCentsPerRange;` `culling_scale = pow(2, -cents_to_cull / kCentsPerOctave);` `number_of_partials = culling_scale * max_number_of_partials;` · L331-L335: pone a cero los bins por encima de ese número · L350 `frame.DoInverseFFT(data_span);`
- L352-L362: la normalización usa el pico de la **primera** tabla (la que tiene más parciales) y aplica el mismo factor a todas, como pide §1.28.5.
- L378-L430 (`GenerateBasicWaveform`): `pi_factor = 2 / (n * pi)`; cuadrada L408 `b = (n & 1) ? 2 * pi_factor : 0;`; diente de sierra L416 `b = pi_factor * ((n & 1) ? 1 : -1);`; triangular L428 `b = 2 * (pi_factor * pi_factor) * ((((n - 1) >> 1) & 1) ? -1 : 1);`.
- `oscillator_handler.cc` L442 `const float incr = frequency * rate_scale;` (avance de fase por muestra = f·N/f_s) · L67-L74, comentario: con 44,1 kHz y 4 096, "`incr` = freq * 4096/44100"; interpolación lineal para f ≥ 3,2 Hz y Lagrange de 3 o 5 puntos por debajo · L153-L154: mezcla de las dos tablas vecinas `(1 - table_interpolation_factor) * sample_higher + table_interpolation_factor * sample_lower`.
- `periodic_wave.cc` L47-L83 (`PeriodicWave::Create`): lanza `IndexSizeError` si `real.size() != imag.size()` (L54) o si alguna longitud es < 2 (L63).
- Por qué hay 0,5 sin normalización: interpretación propia (compensa el factor 2 de la convención del FFT inverso), **NO CONFIRMADO**. Conviene verificarlo con `OfflineAudioContext` (§7).

**[gecko] Firefox, `dom/media/webaudio/blink/PeriodicWave.cpp`.** GitHub `mozilla-firefox/firefox`, commit `ed7b5f6fc2448e100bc038e5cc01abadc641dac3` (rama `main`, 2026-11-17). https://github.com/mozilla-firefox/firefox/blob/ed7b5f6fc2448e100bc038e5cc01abadc641dac3/dom/media/webaudio/blink/PeriodicWave.cpp **CONFIRMADO.** L37-L39: `MinPeriodicWaveSize = 4096`, `MaxPeriodicWaveSize = 8192`, `CentsPerRange = 1200 / 3; // 1/3 Octave.` · L121-L124: número de rangos `3 · log2(size)` y `m_lowestFundamentalFrequency = nyquist / maxNumberOfPartials();` · L150-L168: "We only need to rebuild to the tables if the new fundamental frequency is low enough to allow for more partials below the Nyquist frequency"; L157 y L248: `std::min(numberOfPartials, (unsigned)(nyquist / fundamentalFrequency))` · L276-L278: "See Bug 1424906, results need to be scaled by 0.5 even when normalization is disabled." `m_normalizationScale = 0.5;`. Cabecera: "Copyright (C) 2012 Google Inc.", es decir, el código viene de Blink.

**[cml] Chrome Music Lab, «Harmonics & Strings».** Google Creative Lab. GitHub `googlecreativelab/chrome-music-lab`, commit `e54bb414908da2b6286a6ad6431a5fcf8b68dc3f` (2022-12-16), Apache-2.0; descripción del repositorio: "A collection of experiments for exploring how music works, all built with the Web Audio API." **CONFIRMADO.** Carpeta `harmonics & strings/js/`:
- `Harmonic.js` L11 `this.series = this.ind + 1;` · L66-L71: `this.synth = new Tone.SimpleSynth().toMaster();` `this.synth.oscillator.type = "sine";` `envelope.attack = 0.9;` `decay = 1.5;` `sustain = 0.4;` `release = 1.8;` · L257 `this.synth.triggerAttack(this.m.startingFrequency * (this.ind+1));`
- `HarmonicController.js` L13-L14: "Frequency of the bass lowest note (starting on F)" `this.startingFrequency = 174.61;` · `index.js` L36-L37 `var HARMONICS = 6;` · L455-L468: en iOS crea un elemento a pantalla completa y desbloquea el audio con `StartAudioContext` al primer toque.
- Tone.js se carga desde `https://gweb-musiclab-site.appspot.com/static/js/Tone.min.js` (`index.html` L8), sin versión: **NO CONFIRMADA** la versión de Tone.js.

**[vital] Vital.** Matt Tytel. GitHub `mtytel/vital`, commit `636ca0ef517a4db087a6a08a6a8a5e704e21f836` (2022-04-20), GPL-3.0. **CONFIRMADO.** `src/synthesis/lookups/wave_frame.h` L27-L30: `kWaveformBits = 11;` `kWaveformSize = 1 << kWaveformBits;` `kNumRealComplex = kWaveformSize / 2 + 1;` · L54-L55: `time_domain[2 * kWaveformSize]` y `std::complex<float> frequency_domain[kWaveformSize]` · `wave_frame.cpp` L80-L92: `toFrequencyDomain()` y `toTimeDomain()` con `FFT<kWaveformBits>`. https://github.com/mtytel/vital/blob/636ca0ef517a4db087a6a08a6a8a5e704e21f836/src/synthesis/lookups/wave_frame.h#L27-L30

### 3.2 Muestras de audio

**[iowa-mis] University of Iowa Electronic Music Studios, Musical Instrument Samples.** Lawrence Fritts (director). https://theremin.music.uiowa.edu/MIS.html **CONFIRMADO.**
- Permiso de uso: "Since 1997, these recordings have been freely available on this website and may be downloaded and used for any projects, without restrictions. These are used by musicians, application developers, teachers, students, and researchers." No es una licencia formal (no es CC0) sino un permiso amplio del autor. La redistribución dentro de un proyecto queda cubierta por "used for any projects, without restrictions" (lectura propia). La página pide además: "Please let me know if these have been helpful in your research and music projects."
- Recinto: "With the exception of the piano, all of the instruments were recorded in an anechoic chamber in the Wendell Johnson Speech and Hearing Center … The 36" baffles … contribute to sound absorption properties that extend down to 60 Hz."
- Formatos según la página principal: hasta 2011, "single Neumann KM 84 cardioid condenser microphone at 16/44.1 … chromatic scales played note-by-note at pp, mf, and ff"; desde 2011, "24/96 with three Earthworks QTC-40". **Inconsistencia:** los archivos de nota única que descargué (carpeta "MIS Pitches - 2014") son AIFF **24-bit, 44,1 kHz, 2 canales**, y en flauta, clarinete y trompeta los dos canales son **idénticos** (|L−R| máx. = 0, cálculo propio). La ficha de las páginas de esos instrumentos describe la grabación original antigua:
  - Clarinete (https://theremin.music.uiowa.edu/MIS-Pitches-2012/MISBbClarinet2012.html): "Bb Clarinet | Buffet R13, Morre 23/4 reed | Glenn Bowen B4 mouthpiece | Christine Bellomy | August 3, 1998 | Anechoic Chamber | … | 5 feet | Neumann KM 84 Cardioid | … | Panasonic SV-3800 DAT | 16-bit, 44.1 kHz, mono". Solo hay dinámica *ff* (46 enlaces de nota).
  - Flauta (https://theremin.music.uiowa.edu/MIS-Pitches-2012/MISFlute2012.html): "Flute | NA | Sonja Feig | April, 2000 | Anechoic Chamber | … | Neumann KM 84 Cardioid | … | 16-bit, 44.1 kHZ, mono". Variantes "vib" y "nonvib", *ff*.
  - Violín: "24-bit, 44.1 kHz, stereo files" (2011); estéreo real (|L−R| máx. = 0,28).
- Archivos elegidos (cabeceras HTTP del 2026-11-17):
  - `BbClarinet.ff.Eb4.stereo.aif`: 768 556 B, Last-Modified 2014-06-17, SHA-256 `302660ea9d9cded110dcf26fbfc5b14e988d2006f4f59dc7c276e2ccfeed9a4f`. https://theremin.music.uiowa.edu/sound%20files/MIS%20Pitches%20-%202014/Woodwinds/Bb%20Clarinet/BbClarinet.ff.Eb4.stereo.aif
  - `Flute.nonvib.ff.Eb4.stereo.aif`: 784 468 B, Last-Modified 2014-06-16, SHA-256 `9ebd45c80c1a0600b9195d45a368949ea98f826ab621b527ab4eff9941839449`. https://theremin.music.uiowa.edu/sound%20files/MIS%20Pitches%20-%202014/Woodwinds/Flute/Flute.nonvib.ff.Eb4.stereo.aif
- Los nombres de archivo usan la altura **real**: el f₀ medido del clarinete «Eb4» es 310 Hz, no el de la nota escrita (fa4 escrito suena mi♭4 en un clarinete en si♭).

**[philharmonia] Philharmonia, «Sound samples».** https://philharmonia.co.uk/audio-sound-samples/ **CONFIRMADO** el texto: "You are free to use these samples as you wish, including releasing them as part of a commercial work. The only restriction is that they must not be sold or made available ‘as is’ (i.e. as samples or as a sampler instrument)." Incrustar la nota sin procesar como archivo reproducible en el sitio es, justamente, ponerla a disposición «as is»: **la descarto**. (Un espejo en GitHub la declara CC BY-SA 3.0, pero no es la fuente oficial: NO CONFIRMADO.)

**Freesound (CC0).** No lo investigué a fondo: la licencia va por archivo y habría que verificar autor, nota, afinación y condiciones de grabación de cada uno. Iowa ofrece notas homogéneas (misma sala anecoica, mismo micrófono y mismo método).

### 3.3 Física de instrumentos y del oído

**[wolfe-spectrum] What is a Sound Spectrum?** Joe Wolfe, UNSW Music Acoustics. https://newt.phys.unsw.edu.au/jw/sound.spectrum.html (Last-Modified 2022-01-24). **CONFIRMADO.**
- Definición de timbre: "If you change a sound without changing its loudness or its pitch then you are, by definition, changing its timbre. (Timbre has a negative definition - it is the sum of all the qualities that are different in two different sounds which have the same pitch and the same loudness.) One of the things that determines the timbre is the relative size of the different spectral components."
- Fourier: "a repeated vibration with fundamental frequency f can always be made up of a combination of vibrations with the harmonic frequencies f, 2f, 3f, 4f, .... nf)". Sobre la fase: "in general, the phase constant at each frequency would make up a part of the spectrum, too."
- Órgano: "If you were to couple 16', 8', 5.33', 4',3.2' and 2.67' flutes, then play a melody, you would get much the same effect."
- Salvedad importante: "Introductory physics text books sometimes give the impression that the spectrum is the dominant contribution to the timbre of an instrument … With the exception of the closed pipes mentioned above, this is very misleading." · "if one were to take a note played by a violin and filter it so that its spectrum were identical to a given spectrum for a trumpet playing the same note, the filtered violin note would still sound like a violin, not like a trumpet."
- Lista: "the low register of the clarinet has mainly odd harmonics" · "brass instruments often have spectra whose harmonics have amplitudes that increase with frequency and then decrease."

**[wolfe-clarinet] Clarinet acoustics: an introduction.** Joe Wolfe, UNSW. https://newt.phys.unsw.edu.au/jw/clarinetacoustics.html **CONFIRMADO.**
- "The reed vibration tends to have both odd and even harmonics. However, in the low registers at least, only the odd harmonics set up, and are in turn reinforced by, standing waves. Consequently, the sound spectrum in the low register has strong first and third harmonics, but weak second and fourth."
- "The predominant presence of odd harmonics in the lowest or chalumeau register gives this register its characteristic 'hollow' timbre." · "From about E4 up to A#4, the even harmonics become more important." **Ojo:** la página usa altura **escrita** ("Hereafter we refer only to the written pitch."). Nuestro mi♭4 real es fa4 escrito, dentro de ese tramo; aun así medimos los pares ≥ 21 dB por debajo del fundamental (§4.2).
- "This is one of the big advantages of a closed pipe: you get low notes with a shorter pipe."

**[wolfe-fvc] Open vs Closed pipes (Flutes vs Clarinets).** Joe Wolfe, UNSW. https://newt.phys.unsw.edu.au/jw/flutes.v.clarinets.html **CONFIRMADO.** "The two instruments have roughly the same length." Para la flauta (abierta-abierta): λ₁ = 2L, "c/2L = 280 Hz" con c ≈ 340 m/s y L ≈ 0,6 m; "fn = c/λn = nc/2L = nf1". Para el clarinete (cerrado-abierto): "c/4L = 140 Hz – one octave lower than the flute"; "Fn = c/λn = nc/4L = nf1, but only for odd n." Sobre la frontera: "the clarinet is not completely closed by the reed … the reflection of the acoustic wave is almost complete".

**[wolfe-pipes] Pipes and harmonics: cylindrical and conical bores.** Joe Wolfe, UNSW. https://newt.phys.unsw.edu.au/jw/pipes.html **CONFIRMADO.** "Why do closed conical bores have nearly the same set of resonances as open cylindrical bores of the same length, whereas closed cylindrical bores of the same length have only odd harmonics starting one octave lower?" · "a flutist … or oboist … plays C4 using (almost) the whole length of the instrument, whereas a clarinetist … can play approximately C4 (written D4) using only half the instrument." · Corrección de extremo: "the effective length is longer than L by a small amount, usually about 0.6 times the radius." En [wolfe-fvc]: el oboe "is closed like the clarinet, but it plays roughly the same range as the flute and has all harmonics present."

**[wolfe-harmonics] How harmonic are harmonics?** Joe Wolfe, UNSW. https://newt.phys.unsw.edu.au/jw/harmonics.html **CONFIRMADO.** "This bending stiffness affects the higher modes more than the lower, so the 'harmonics' are stretched, compared with harmonics." · "The inharmonicity can be made to disappear when the strings are bowed, but is present and often noticeable when they are plucked or struck." · "Because the bow's stick-slip action is periodic, it drives all of the resonances of the string at exactly harmonic ratios".

**[smith-pasp] Physical Audio Signal Processing, «Dispersion Filter-Design».** Julius O. Smith III, CCRMA, Stanford (W3K, 2010; página en línea con fecha 2026-08-21). https://ccrma.stanford.edu/~jos/pasp/Dispersion_Filter_Design_I.html **CONFIRMADO.** "the coefficient of inharmonicity--affects the nth partial overtone tuning via" `f_n = n f_0 \sqrt{1 + B n^2}`; umbral perceptivo `B_{thresh} = \exp[2.54\log(f_0) - 24.6]`; teoría: `B = \frac{\pi^3 E a^4}{4 K L^2}`. No encontré valores típicos de B para piano en una fuente abierta: **NO CONFIRMADO** cualquier valor concreto.

**[helmholtz] On the Sensations of Tone.** Hermann L. F. Helmholtz, trad. Alexander J. Ellis, 2.ª ed. inglesa (1885), reimpresión de 1895. Dominio público. https://archive.org/details/onsensationsofto00helmrich **CONFIRMADO** (texto OCR; corregí letras mal reconocidas). Parte I, cap. VI, pág. 126: "the quality of the musical portion of a compound tone depends solely on the number and relative strength of its partial simple tones, and in no respect on their differences of phase." Pág. 127: "differences in musical quality of tone depend solely on the presence and strength of partial tones, and in no respect on the differences in phase under which these partial tones enter into composition." Nota del traductor (pág. 126): "The experiments of Koenig with the wave-siren … show that this law requires a slight modification." Por tanto, «el oído ignora la fase» es una **buena aproximación, no una ley exacta**.

**[openstax] University Physics, Volume 1.** Ling, Sanny y Moebs, OpenStax. Consultado con un lector web (las ecuaciones las devolvió el lector, no copiadas a mano): **CONFIRMADO**, con esa salvedad.
- §15.3 "Comparing Simple Harmonic Motion and Circular Motion": la proyección del MCU "undergoes SHM"; ec. (15.14) `x(t) = A\cos(\omega t)`. https://openstax.org/books/university-physics-volume-1/pages/15-3-comparing-simple-harmonic-motion-and-circular-motion
- §16.6 "Standing Waves and Resonance": ecs. (16.15) `λ_n = 2L/n` y (16.16) `f_n = nv/2L = n f_1`, n = 1, 2, 3, …; "the first frequency to produce a normal mode is called the fundamental frequency (or first harmonic)". https://openstax.org/books/university-physics-volume-1/pages/16-6-standing-waves-and-resonance
- §17.4 "Normal Modes of a Standing Sound Wave": tubo cerrado-abierto (17.13) `λ_n = 4L/n` y (17.14) `f_n = nv/4L`, n = 1, 3, 5, …; abierto-abierto (17.15) `λ_n = 2L/n` y (17.16) `f_n = nv/2L`, n = 1, 2, 3, … https://openstax.org/books/university-physics-volume-1/pages/17-4-normal-modes-of-a-standing-sound-wave
- §17.5 "Sources of Musical Sound": "A closed tube has only odd multiples." · "middle C on a trumpet sounds distinctively different from middle C on a clarinet".

**[serway] Serway y Jewett, *Física para ciencias e ingeniería*, Vol. 1, 10.ª ed., Cengage 2018** (libro de la casa, ya citado en otros temas). Es la fuente de libro de texto para el MAS, las ondas estacionarias en cuerdas y columnas de aire y los «patrones de onda no sinusoidales». **NO CONFIRMADOS** los números de capítulo y sección: no tengo el ejemplar. Hay que verificarlos antes de citarlos. Sears-Zemansky, igual: NO CONFIRMADO.

### 3.4 Hammond

**[hammond-1934] US Patent 1 956 350, «Electrical musical instrument».** Laurens Hammond. Presentada el 1934-01-19 y concedida el 1934-04-24. https://patents.google.com/patent/US1956350A/en **CONFIRMADO** (texto OCR de Google Patents, con errores como "harmonies" por "harmonics"): "It is a well known fact that any sustained musical sound can be analyzed into sine wave[s] … and various amplitudes of different harmonics of the fundamental." · "harmonics above the eighth have very little effect in characterizing the tone" · "most musical tones may be produced by definite combinations of the fundamental tone with various proportions of the first eight harmonics" · "employs the tempered musical scale not only in the production of the fundamentals but in the production of the various harmonics."

**[hammond-b3] Folleto «New B-3», Hammond Suzuki.** PDF de 2006 (CreationDate 2006-02-23). https://www.hammond.eu/download/br-b3-and-ult.pdf **CONFIRMADO.** "generates pure tones that is tones which have no harmonic content of their own" · "The positions of the drawbars … determine the intensities of the individual electrical currents corresponding to the fundamental and its harmonics" · "Flute-like tones, for instance, may be produced by a certain combination of these drawbars; string-like effects by another combination" · tabla: drawbars "9 pitches 2 sets"; B-3 original "91-Tone Wheels"; "Since its introduction in 1955". La tabla de pies (16′, 5⅓′, 8′, 4′, 2⅔′, 2′, 1⅗′, 1⅓′, 1′) no la encontré en una fuente de Hammond que pudiera abrir: **NO CONFIRMADO**.

### 3.5 Navegador y accesibilidad

**[chrome-autoplay] Autoplay policy in Chrome.** François Beaufort, Chrome for Developers. https://developer.chrome.com/blog/autoplay (sin fecha en la página; la política cambió "in April of 2018"). **CONFIRMADO:** "If an `AudioContext` is created before the document receives a user gesture, it will be created in the "suspended" state, and you will need to call `resume()` after the user gesture."

**[wcag22] WCAG 2.2, W3C Recommendation, 12 December 2024.** https://www.w3.org/TR/WCAG22/ **CONFIRMADO.** SC 1.4.2 Audio Control (A): "If any audio on a web page plays automatically for more than 3 seconds, either a mechanism is available to pause or stop the audio, or a mechanism is available to control audio volume independently from the overall system volume level." SC 2.3.3 Animation from Interactions (AAA): "Motion animation triggered by interaction can be disabled, unless the animation is essential".

### 3.6 Material de clase

- **No hay módulo de oscilaciones ni de ondas** en M1-M4 (índice `.reference/class-material/00-indice.md`). El folleto del M2 lo dice explícitamente: "aquí los resortes se estudian como fuerzas y depósitos de energía, sin desarrollar oscilaciones" (`02-dinamica-folleto-pdf.md` L66-L69) y "no desarrollamos la evolución oscilatoria completa" (L490). Por tanto, el tema entero es **extensión** sobre lo visto en clase.
- Lo que sí hay y sirve de puente: M1 · Tema 1.4 (MCU), con `T = 2\pi/\omega` y `f = 1/T = \omega/2\pi` en Hz (`01-cinematica.md`, «Periodo y frecuencia»). El curso llama «velocidad angular» a ω. El paso 1 lo usa como proyección del MCU.

---

## 4. Números clave

### 4.1 La pareja recomendada (cálculo propio; FFT con ventana de Hann, promedio de Welch de ventanas de 0,25 s con 50 % de solapamiento sobre todo el sostenido; amplitudes por interpolación parabólica del pico)

| Dato | Clarinete en si♭, mi♭4 *ff* | Flauta, mi♭4 *ff* sin vibrato |
|---|---|---|
| Archivo | `BbClarinet.ff.Eb4.stereo.aif` | `Flute.nonvib.ff.Eb4.stereo.aif` |
| Formato | AIFF PCM 24-bit, 44 100 Hz, 2 canales idénticos | igual |
| Duración del archivo | 2,90 s | 2,96 s |
| Silencio inicial / ataque 10 %→90 % (envolvente RMS de 10 ms) | 0,43 s / **0,40 s** | 0,15 s / **0,12 s** |
| Sostenido usado / caída 90 %→10 % | 0,60-2,24 s / 0,11 s | 0,34-2,42 s / 0,29 s |
| f₁ medido (FFT; autocorrelación) | **310,10 Hz**; 310,33 Hz | **310,34 Hz**; 310,33 Hz |
| Desviación respecto a mi♭4 = 311,13 Hz | −5,8 cents | −4,4 cents |
| Diferencia entre ambos | ≤ 0,24 Hz = **≤ 1,3 cents** (según el método) | |
| Estabilidad de f₁ (desv. típica, 10 ms) | 2,5 cents | 3,0 cents |
| Periodo T = 1/f₁ | 3,225 ms (4 periodos = 12,9 ms) | 3,222 ms |
| Potencia impar (1, 3, 5, 7, 9) / par (2, 4, 6, 8, 10) | **368,7 = 25,7 dB** | **0,8 = −0,7 dB** |
| corr[y(t), −y(t+T/2)] en el sostenido (ec. 11.6) | **0,992** (bloques de 50 ms: 0,989-0,994) | **−0,084** (bloques: −0,50 a +0,41) |
| Potencia en los 10 primeros armónicos | 92,5 % (el resto es ruido y fuga) | 89,6 % |
| Centroide armónico (n ≤ 20) | 785 Hz = 2,53 f₁ | 920 Hz = 2,97 f₁ |
| Resíntesis con 20 armónicos y fases medidas: corr. con el original (4 periodos) | 0,974 | 0,976 |
| Resíntesis con las mismas amplitudes y fases «todas seno» | −0,764 (otra forma de onda) | 0,253 |
| Sonoridad integrada (EBU R128, canal 1) | −22,9 LUFS | −24,4 LUFS |

**Receta medida, A_n/A₁ en dB** (promedio de Welch; entre corchetes, mínimo y máximo de las ventanas de 0,25 s, de `robust.py`):

| n | f (Hz) | Clarinete | Flauta |
|---|---|---|---|
| 1 | 310 | 0,0 | 0,0 |
| 2 | 620 | **−34,1** [−35,9; −29,0] | **+3,7** [+0,9; +5,1] |
| 3 | 930 | **+3,3** [+1,9; +4,2] | +0,8 [−4,2; +4,2] |
| 4 | 1 241 | **−21,2** [−21,9; −19,1] | **0,0** [−2,7; +2,3] |
| 5 | 1 551 | **−7,8** [−9,7; −5,7] | −0,3 [−18,5; +5,6] |
| 6 | 1 861 | **−31,5** [−36,2; −29,7] | **−4,9** [−11,5; +1,1] |
| 7 | 2 171 | −18,0 | −18,4 |
| 8 | 2 481 | −37,3 | −15,6 |
| 9 | 2 791 | −27,8 | −26,7 |
| 10 | 3 101 | −37,6 | −25,7 |
| 11 | 3 411 | −40,1 | −23,0 |
| 12 | 3 721 | −28,8 | −30,6 |

Lectura: en el clarinete, cada armónico par está entre 21 y 38 dB por debajo de sus vecinos impares, y el más fuerte es el **3.º**. En la flauta, los seis primeros están todos dentro de ±5 dB y el más fuerte es el **2.º**; por encima del 6.º caen de golpe (−18 dB en el 7.º). Los rangos muestran que el espectro de la flauta **fluctúa** más en el tiempo (el 5.º armónico va de −18,5 a +5,6 dB); el del clarinete es estable.

### 4.2 Barrido de notas (cálculo propio, ventana única de 1 s en el sostenido; «imp/par» como arriba)

| Nota real (escrita, clarinete) | Clarinete: f₁ (cents) · imp/par · A₂, A₄ (dB) | Flauta: f₁ (cents) · imp/par |
|---|---|---|
| sol3 (la3) | 196,23 (+2,0) · 23,8 dB · −38,7, −28,6 | (no existe en flauta) |
| la3 (si3) | 219,86 (−1,1) · 20,4 dB · −35,0, −32,7 | — |
| si♭3 (do4) | 232,39 (−5,2) · 26,7 dB · −41,0, −34,8 | — |
| do4 (re4) | 261,20 (−2,9) · 16,2 dB · −32,2, −17,3 | 260,98 (−4,3) · −0,9 dB |
| re4 (mi4) | 292,07 (−9,4) · 22,7 dB · −34,1, −23,4 | 292,63 (−6,1) · +4,6 dB |
| **mi♭4 (fa4)** | 310,18 (−5,3) · **27,3 dB** · −36,1, −23,3 | 310,31 (−4,5) · **−1,2 dB** |
| mi4 (fa♯4) | 329,18 (−2,4) · 30,4 dB · −42,8, −26,3 | 329,82 (+1,0) · −0,2 dB |
| fa4 (sol4) | 348,70 (−2,6) · 20,5 dB · −36,4, −22,6 | 350,60 (+6,8) · +1,8 dB |
| sol4 (la4) | 391,95 (−0,2) · 18,3 dB · −46,9, −12,4 | 394,00 (+8,8) · +2,1 dB |

Elegí **mi♭4** porque reúne tres cosas: el contraste impar/par de los más altos (27,3 dB en ventana única; 25,7 dB con Welch), la afinación casi idéntica de las dos notas (1,3 cents) y la ausencia de vibrato. La alternativa más cercana es **mi4**: 29,4 dB frente a −0,7 dB con Welch, corr. 0,996 frente a −0,11, pero 3,4 cents de diferencia y solo un 78,8 % de la potencia del clarinete en n ≤ 10.

### 4.3 Otros instrumentos medidos (para justificar el descarte y los contrastes; cálculo propio)

| Archivo | f₁ (cents) | Rasgo medido | Por qué no como pareja principal |
|---|---|---|---|
| `Trumpet.novib.ff.C4` | 262,90 Hz (+8,4) | imp/par −0,1 dB; máximo en **n = 5** (+21,1 dB sobre A₁); centroide 5,03 f₁; corr. media onda −0,001 | 10,8 cents de diferencia con el clarinete en do4; su forma espectral (los armónicos "increase with frequency and then decrease", Wolfe) pide hablar de la campana, fuera del tema. Sirve como contraste de «brillo» |
| `Trumpet.novib.ff.A3`, `C4`, `D4` | — | armónico más fuerte en 1 310 Hz (n = 6), 1 314 Hz (n = 5) y 1 180 Hz (n = 4) | Prueba que la región fuerte queda **fija en frecuencia** al cambiar de nota: es el argumento contra transponer muestras (§2) |
| `Violin.arco.ff.sulG.A3`, `Bb3`, `C4`, `Db4` | −0,5; −22,3; −15,4; +10,3 cents | A₂/A₁ = +11,2; +10,4; −1,3; −6,4 dB: cambia mucho de una nota a la siguiente (resonancias del cuerpo); vibrato (desv. típica de 0,4-0,6 Hz) | Desafinado en varias notas y con espectro irregular: el «qué diferencia produce qué» no se explica solo con la cuerda ideal |
| `Oboe.ff.C4`, `D4` | −6,6; +0,9 cents | máximo en n = 5 (+11,1 dB) y n = 4 (+9,1 dB) | Cono cerrado = todos los armónicos (Wolfe, `pipes.html`), lo que pide más física de la que hay en el tema |
| `Flute.vib.ff.Eb4` | 311,28 Hz | vibrato de **4,24 Hz**, p5-p95 de −14,1 a +8,0 cents | Sirve para el preajuste de vibrato del laboratorio (paso 4) |

### 4.4 Navegador, memoria y aliasing (cálculo propio con las constantes de Chromium, `calcs.py`)

| Dato | Valor |
|---|---|
| Tamaño de tabla en Chromium a 44,1 o 48 kHz | 4 096 muestras; 36 rangos de 1/3 de octava |
| Memoria de una `PeriodicWave` en Chromium | 36 × 4 096 × 4 B = **576 KiB** (independiente de N, de la nota y de la duración) |
| Parciales conservados a 310,1 Hz (48 kHz) | tablas 15 y 16: **64 y 50** parciales (64 × 310,1 = 19 846 Hz < 24 000), interpoladas |
| A 440 Hz (48 kHz) / 1 760 Hz / 4 186 Hz | 50-40 / 12-10 / 5-4 parciales |
| Armónicos bajo Nyquist, ⌊f_s/(2f₁)⌋, a 310,1 Hz | 71 (44,1 kHz); 77 (48 kHz) |
| Ejemplo de aliasing sin limitar la banda (f_s = 48 kHz) | f₁ = 1 760 Hz, n = 20 → 35 200 Hz se pliega a **12 800 Hz = 7,27 f₁** (inarmónico); n = 14 → 23 360 Hz |
| Suma ingenua de senos | 20 armónicos × 48 000 = 960 000 senos/s por voz; con 16 voces, 15,4 M/s |
| Receta frente a muestra | 20 armónicos × 2 floats × 4 B = 160 B; una nota de 3 s mono 16-bit a 44,1 kHz = 264 600 B (≈ 1 650 veces más). 88 notas × 3 dinámicas × 3 s = 69,9 MB |
| Hammond: armónicos temperados | 3.º y 6.º: −1,96 cents; 5.º: **+13,69 cents**; 2.º, 4.º, 8.º: exactos |
| Rigidez ilustrativa (ec. 11.8) | con B = 1 × 10⁻⁴: 10.º parcial +8,6 cents, 20.º +34,0 cents. Umbral perceptivo de Smith a 261,63 Hz: B ≈ 2,9 × 10⁻⁵ |
| Longitud acústica para 310,1 Hz con c ≈ 340 m/s (Wolfe) | abierto-abierto: λ/2 = **0,548 m**; cerrado-abierto: λ/4 = **0,274 m**. Son longitudes **efectivas**: el tubo real es algo más corto por la corrección de extremo (≈ 0,6 radios por extremo abierto, [wolfe-pipes]) y por los agujeros abiertos |

---

## 5. La física en 4 pasos (formato de la casa)

Convención: y es la presión acústica (o el desplazamiento del cono del altavoz) en función del tiempo; f₁ es el fundamental; T = 1/f₁. Las fases φ_n se miden respecto del fundamental.

### Paso 1. Modelo simple: un tono puro
- `y(t) = A \sin(2\pi f t)` **(11.1)**, con `f = 1/T`. Es la proyección de un MCU de radio A y velocidad angular ω = 2πf (OpenStax §15.3, ec. 15.14; M1 · Tema 1.4 da T = 2π/ω y f = 1/T en Hz). El **tono** (lo grave o agudo) lo fija f; la sonoridad, A.
- Es lo que hace `OscillatorNode` con `type = "sine"` (§1.28.6: b[1] = 1). También es la vibración del Tema 5, `F_0 \sin(\omega t)`.
- **Por qué no basta:** con (11.1), dos fuentes con la misma f y la misma A suenan idénticas. Pero la flauta y el clarinete a 310 Hz no suenan igual. Falta algo que no es ni f ni A: el **timbre**, "the sum of all the qualities that are different in two different sounds which have the same pitch and the same loudness" (Wolfe).

### Paso 2. De dónde salen los armónicos: los modos normales
- Cuerda fija en ambos extremos (y tubo abierto en ambos extremos): `f_n = \dfrac{n v}{2L} = n f_1,\ n = 1, 2, 3, \dots` **(11.2)** (OpenStax ecs. 16.16 y 17.16).
- Tubo cerrado en un extremo y abierto en el otro: `f_n = \dfrac{n v}{4L} = n f_1,\ n = 1, 3, 5, \dots` **(11.3)** (OpenStax ec. 17.14). Solo caben ondas con un nodo de desplazamiento en el extremo cerrado y un vientre en el abierto: L = λ/4, 3λ/4, 5λ/4, …
- La flauta es casi un tubo abierto-abierto y el clarinete, casi un cerrado-abierto (la caña "almost" cierra; Wolfe). Con la misma longitud, el clarinete suena una octava más grave: "c/4L = 140 Hz – one octave lower than the flute" (Wolfe). Para nuestra nota de 310 Hz, la columna de aire que vibra mide ≈ 0,55 m en la flauta y ≈ 0,27 m en el clarinete (cálculo propio, c ≈ 340 m/s).
- **Por qué no basta:** (11.2) y (11.3) dicen **qué frecuencias** pueden sonar, no **cuánto** suena cada una ni qué forma tiene la onda. Hace falta sumar los modos.

### Paso 3. Lo que hace el sintetizador: superposición de armónicos (series de Fourier)
- Toda vibración periódica de periodo T es una suma de armónicos: `y(t) = \sum_{n=1}^{N} A_n \sin(2\pi n f_1 t + \varphi_n)` **(11.4)** (Fourier, en palabras de Wolfe: "a repeated vibration with fundamental frequency f can always be made up of a combination of vibrations with the harmonic frequencies f, 2f, 3f…"). Todas las componentes repiten cada T, así que **la suma tiene el mismo periodo y el mismo tono, pero otra forma de onda, es decir, otro timbre.**
- La Web Audio API escribe (11.4) como `x(t) = \sum_{k=1}^{L-1} [a_k \cos 2\pi k t + b_k \sin 2\pi k t]` **(11.5)** (§1.28.4), con t medido en periodos. Como sen(α + φ) = sen α cos φ + cos α sen φ, la receta (A_n, φ_n) pasa a la API con `a_n = A_n \sin\varphi_n` y `b_n = A_n \cos\varphi_n` (cálculo propio). Con φ_n = 0, `real` es todo ceros e `imag[n] = A_n`.
- Recetas clásicas (amplitud de pico 1; §1.28.6 y Chromium L408-L428):
  - cuadrada: `A_n = \dfrac{4}{n\pi}`, solo n impar → 1, 0, 1/3, 0, 1/5, …
  - diente de sierra: `A_n = (-1)^{n+1}\dfrac{2}{n\pi}`, todos los n → 1, −1/2, 1/3, −1/4, …
  - triangular: `A_n = \dfrac{8}{\pi^2 n^2}(-1)^{(n-1)/2}`, solo n impar → 1, 0, −1/9, 0, 1/25, …
- **Simetría de media onda** (el «aspecto concreto» que se ve en la forma de onda): si solo hay armónicos impares, `y(t + T/2) = -y(t)` **(11.6)**, porque sen(2πn f₁(t + T/2) + φ) = (−1)ⁿ sen(2πn f₁ t + φ). Si se separa y = y_impar + y_par, la correlación entre y(t) y −y(t+T/2) vale `(P_{impar} - P_{par})/(P_{impar} + P_{par})` (cálculo propio, por ortogonalidad en periodos completos). Con los datos: el clarinete, con P_imp/P_par = 368,7, predice 0,995 y medimos **0,992**; la flauta, con 0,8, predice −0,11 y medimos **−0,08**. La forma de onda del clarinete es «cuadrada» en esta simetría, no en las amplitudes: su 3.º armónico vale 1,47 A₁, no 1/3.
- Por qué el clarinete cumple (11.6) y la flauta no: la caña produce pares e impares, "However, in the low registers at least, only the odd harmonics set up, and are in turn reinforced by, standing waves" (Wolfe). Es (11.3) actuando como filtro.
- **Qué cuesta en el software:** en una señal muestreada, los armónicos con n f₁ > f_s/2 se pliegan: `f_{alias} = |n f_1 - m f_s|` y solo se puede usar `n \le \lfloor f_s/(2 f_1) \rfloor` **(11.9)**. La especificación exige filtrar (§1.26) y Chromium lo resuelve con tablas por tercio de octava (L105-L109, L320-L335).
- **Por qué no basta todavía:** (11.4) describe un sonido **eterno y estrictamente periódico**. Las grabaciones tienen ataque (0,40 s el clarinete, 0,12 s la flauta), ruido de soplido (≈ 10 % de la potencia de la flauta fuera de los 20 armónicos) y pequeñas fluctuaciones. Además, Wolfe advierte que el espectro no basta para identificar un instrumento, salvo en los tubos cerrados.

### Paso 4. Modelo mejorado (dentro del tema)
De menor a mayor riqueza, todo con fuente:
1. **Envolvente (ADSR) y transitorio de ataque:** `y(t) = E(t)\sum_n A_n \sin(2\pi n f_1 t + \varphi_n)` **(11.7)**. La caída y la liberación siguen `E(t) = V_1 + (V_0 - V_1)\,e^{-(t - T_0)/\tau}`, la misma ecuación de `setTargetAtTime`, que la especificación recomienda para "the "decay" and "release" portions of an ADSR envelope" (§1.6.2). Es la envolvente exponencial del oscilador amortiguado (Tema 10). Valores medidos para los preajustes: ataque 10-90 % de 0,40 s (clarinete) y 0,12 s (flauta); caída 90-10 % de 0,11 s y 0,29 s. Chrome Music Lab fija una envolvente ADSR (0,9 / 1,5 / 0,4 / 1,8) para todos sus armónicos.
2. **Inarmonicidad (cuerda rígida, piano):** `f_n = n f_1\sqrt{1 + B n^2}` **(11.8)** (Smith, PASP). Los «armónicos» se estiran hacia arriba ("stretched", Wolfe). En una cuerda frotada desaparece (el arco "drives all of the resonances of the string at exactly harmonic ratios"), pero en una pulsada o golpeada no. Con B = 10⁻⁴ (valor ilustrativo, NO CONFIRMADO como típico) el 20.º parcial sube 34 cents (cálculo propio). Una `PeriodicWave` no puede representarla, porque es periódica por definición: haría falta un oscilador por parcial (como Chrome Music Lab) con su frecuencia propia. Ese es el costo de la generalidad.
3. **El oído y la fase:** Helmholtz concluye que el timbre depende "solely on the number and relative strength of its partial simple tones, and in no respect on their differences of phase", con la nota de Ellis sobre Koenig ("requires a slight modification"). Con los datos: si se resintetiza el clarinete con las mismas amplitudes y las fases cambiadas a «todo seno», la forma de onda cambia por completo (correlación −0,76 con la original), pero según Helmholtz debería sonar casi igual. Por eso el espectro de amplitudes es lo que se publica, y la fase se muestra como experimento en el laboratorio.
4. **Vibrato y ruido** (medidos): la flauta con vibrato oscila a 4,24 Hz con ±≈ 11 cents (`f_1(t) = f_1[1 + δ\sin(2\pi f_v t)]`, cálculo propio). El ruido de soplido no es armónico y solo se modela con ruido filtrado. Queda como mención, fuera del modelo aditivo.

---

## 6. Diseño del recurso (MULTIMEDIA CON ANÁLISIS: dos audios con el mismo tono y distinto timbre)

### 6.1 Decisión sobre las muestras

| Opción | Ventaja | Problema | Veredicto |
|---|---|---|---|
| (a) Dos grabaciones reales | Datos reales bien citados (banda «Excelente»); el timbre incluye ataque y ruido reales | Hay que medir el espectro, igualar la sonoridad y documentar la licencia | Necesaria |
| (b) Dos síntesis desde una receta declarada | Espectro exacto, sin licencia | Es un experimento de pizarra: no muestra un instrumento real, y la consigna pide «distinto timbre» con análisis de un fenómeno | Insuficiente sola |
| **(c) Ambas: las dos reales como audios incrustados + su resíntesis aditiva en el laboratorio** | Une dato real y modelo: el lector oye la flauta y el clarinete reales, ve su receta medida y la vuelve a tocar desde (11.4). Lo que falta en la resíntesis (ataque, soplido) es justo el paso 4 | Más trabajo | **Recomendada** |

### 6.2 Preparación de los archivos (probada en `scratchpad/research/out/sintesis-sonido/`)
- Canal 1 (los dos son idénticos), recorte desde el inicio de la nota (clarinete desde 0,38 s, flauta desde 0,10 s), fundido de entrada de 10 ms y de salida de 50 ms, y ganancia para igualar la sonoridad: +2,9 dB (clarinete) y +4,4 dB (flauta). Resultado: −19,5 y −19,9 LUFS, picos de −12,5 y −10,7 dBFS. Recomiendo un ajuste fino a **−20 LUFS ±0,5** en las dos, para que lo único distinto sea el timbre (la definición de Wolfe exige «same loudness»).
- Tamaños: MP3 128 kb/s, 41 kB y 47 kB; Opus 96 kb/s, 36 kB y 40 kB; AAC 128 kb/s, 41 kB y 46 kB; WAV 16-bit, 222 kB y 252 kB. Propuesta: MP3 como fuente única, verificando en los navegadores de las pruebas e2e. NO CONFIRMADO el soporte de cada formato por navegador.
- La forma de onda y el espectro se calculan **una vez**, a partir del AIFF original (no del MP3), con un script reproducible del repositorio. El resultado va a un JSON con procedencia: SHA-256 del archivo, ventana usada, método y versión.
- Texto de atribución propuesto: «Muestras: University of Iowa Electronic Music Studios, *Musical Instrument Samples* (dir. Lawrence Fritts), theremin.music.uiowa.edu/MIS.html. Clarinete en si♭ Buffet R13, intérprete Christine Bellomy (1998); flauta, intérprete Sonja Feig (2000); cámara anecoica, micrófono Neumann KM 84. Archivos `BbClarinet.ff.Eb4.stereo.aif` y `Flute.nonvib.ff.Eb4.stereo.aif`. Recortados, convertidos a mono e igualados en sonoridad por el autor. Uso permitido por el MIS: "may be downloaded and used for any projects, without restrictions".»

### 6.3 Visualizaciones (por muestra, las dos con los mismos ejes)
1. **Vista general:** envolvente RMS de toda la nota (0-2,9 s), con tres franjas marcadas: ataque, ventana de análisis (sostenido) y caída. Ahí se señala el **instante** del transitorio (paso 4).
2. **Zoom de forma de onda:** 4 periodos (≈ 12,9 ms) tomados en el sostenido, con el eje de tiempo en ms y **la curva −y(t + T/2) superpuesta en trazo discontinuo**. En el clarinete coinciden (correlación 0,992, ec. 11.6); en la flauta no (−0,08). Es el «aspecto concreto» visible a simple vista.
3. **Espectro de armónicos:** barras para n = 1…12 en dB respecto de A₁ (suelo en −45 dB), con los impares y los pares distinguidos por relleno y patrón (no solo por color). Encima, el valor de imp/par en dB. El color tiene significado: impar frente a par. A los instrumentos no se les asigna un color «real».
4. Lecturas: f₁, T, imp/par, centroide armónico y armónico más fuerte.

### 6.4 Borrador del análisis escrito (para que Dylan lo revise)
- **Lo común (tono):** las dos notas repiten su forma cada T = 3,22 ms, es decir, f₁ ≈ 310 Hz (mi♭4); las dos barras n = 1 están en la misma frecuencia. Por (11.4), el tono lo pone f₁ y no la forma.
- **Clarinete:** en el zoom, entre dos picos de un periodo, la segunda mitad es la primera invertida (11.6). En el espectro, las barras pares (n = 2, 4, 6, 8) quedan entre 21 y 37 dB por debajo de las impares; el 3.º armónico es incluso más fuerte que el fundamental (+3,3 dB). Causa: tubo cerrado-abierto, (11.3), "only the odd harmonics set up, and are in turn reinforced by, standing waves" (Wolfe). Efecto: el timbre «hueco» ("hollow") del registro grave.
- **Flauta:** no hay simetría de media onda; el 2.º armónico es el más fuerte (+3,7 dB) y los seis primeros están a ±5 dB. Causa: tubo abierto-abierto, (11.2), todos los modos. Por encima del 6.º armónico, la caída brusca (−18 dB en el 7.º) deja un sonido más «suave» que el de un diente de sierra con la misma f₁.
- **Lo que el espectro no cuenta** (honestidad del modelo): el ataque del clarinete dura 0,40 s y el de la flauta, 0,12 s; la flauta lleva un ≈ 10 % de potencia de soplido fuera de los armónicos. Wolfe advierte que, salvo en los tubos cerrados, el espectro solo no identifica al instrumento.

---

## 7. Diseño del laboratorio de síntesis aditiva (Web Audio)

Requisitos de la casa ("simulations must be rich"): transporte, línea de tiempo, panel de ajustes y preajustes, no solo deslizadores; controles cerca del lienzo.

**Vista:**
- Lienzo principal: la forma de onda calculada **en JS a partir de la misma receta** (3 periodos, eje en ms) y recalculada en vivo al mover cualquier control; debajo, el espectro de barras de la receta actual. Opcional: un osciloscopio real con `AnalyserNode.getFloatTimeDomainData` para mostrar lo que suena.
- Línea de tiempo de la envolvente ADSR (11.7), con un cursor durante la reproducción y las fases A/D/S/R rotuladas.

**Controles:**
- Amplitud por armónico, n = 1…12 (en dB de −45 a +6, o lineal de 0 a 1,5). Fase por armónico en modo avanzado, con el conmutador **«fases medidas / todas cero»** (experimento de Helmholtz, paso 4).
- f₁: la nota (mi♭4 por defecto; selector cromático de do3 a do6) y un `detune` fino en cents.
- ADSR: ataque, decaimiento (τ), sostenido y liberación (τ), aplicados con `setTargetAtTime`.
- Vibrato: frecuencia de 0 a 7 Hz y profundidad de 0 a 30 cents (preajuste medido: 4,24 Hz, ±11 cents).
- Volumen maestro con un tope seguro (ganancia ≤ 0,25 y pico de la suma ≤ −12 dBFS) y rampa de 20 ms en cada cambio.
- Lecturas: imp/par en dB, centroide armónico, armónicos bajo Nyquist ⌊f_s/(2f₁)⌋ (11.9) y número de armónicos con A_n > 0.

**Preajustes** (amplitudes A_n/A₁, n = 1…12):

| Preajuste | Receta | Fuente |
|---|---|---|
| Seno | 1, 0, 0, … | (11.1); §1.28.6 |
| Cuadrada | 4/(nπ) en impares → 1, 0, 1/3, 0, 1/5, … | §1.28.6; Chromium L408 |
| Diente de sierra | 2/(nπ) con signo alterno → 1, −1/2, 1/3, −1/4, … | §1.28.6; Chromium L416 |
| Triangular | 8/(π²n²), impares, signo alterno → 1, 0, −1/9, 0, 1/25, … | §1.28.6; Chromium L428 |
| **Clarinete mi♭4 (medido)** | `[1, 0.020, 1.470, 0.087, 0.405, 0.026, 0.126, 0.014, 0.041, 0.013, 0.010, 0.036]`; con fases medidas: `real = [0, 1.0, -0.019, -0.189, 0.045, -0.157, -0.011, 0.09, 0.014, 0.012, -0.001, 0.004, -0.034]`, `imag = [0, 0, -0.005, 1.458, 0.075, -0.373, -0.024, 0.088, 0.003, 0.039, 0.013, 0.009, 0.011]`; ADSR con ataque de 0,40 s | §4.1 (cálculo propio) |
| **Flauta mi♭4 (medida)** | `[1, 1.539, 1.093, 0.997, 0.967, 0.571, 0.121, 0.166, 0.046, 0.052, 0.071, 0.030]`; con fases: `real = [0, 1.0, 0.844, 1.002, 0.997, 0.296, 0.169, 0.066, 0.111, -0.045, -0.023, -0.068, 0.023]`, `imag = [0, 0, -1.287, 0.436, 0.0, 0.921, 0.545, -0.101, -0.124, -0.007, 0.047, -0.021, 0.019]`; ataque de 0,12 s | §4.1 (cálculo propio) |
| Solo impares / solo pares (sobre la receta actual) | anula los pares o los impares | (11.6). Con «solo pares», el periodo se reduce a T/2 y la nota **sube una octava**: el paso 2 hecho audible |
| Hammond (ilustrativo) | 9 *drawbars* con armónicos temperados (5.º a +13,69 cents) | patente y folleto; tabla de pies NO CONFIRMADA |

Las fases se midieron en una ventana de 40 periodos en el centro del sostenido, con la convención y ≈ Σ A_n cos(nωt + θ_n); por eso `real = A cos θ` e `imag = −A sin θ` (`coefs.py`). La fase de la flauta varía en el tiempo (§4.1): hay que presentarla como «medida en esa ventana».

**A/B con la grabación:** un botón alterna entre la grabación real y la resíntesis de su receta, con la misma f₁ y la misma sonoridad. Lo que se pierde (ataque, soplido, microfluctuaciones) se nombra en la página. Es el «qué cuesta» del modelo.

**Restricciones del navegador:**
- **Gesto del usuario:** el `AudioContext` se crea o se reanuda con `resume()` solo dentro del clic de «Reproducir» (Chrome: "created in the "suspended" state"; especificación §1.2, «allowed to start»). Nunca hay reproducción automática (WCAG 1.4.2). Los `<audio>` de las muestras van con `controls`, sin `autoplay`, y con `preload="metadata"`.
- **Clics y volumen:** las ganancias se cambian con `setTargetAtTime` (τ ≈ 5-10 ms), nunca con saltos. El audio arranca con un volumen bajo y el control de volumen es propio (WCAG 1.4.2, «independently from the overall system volume»).
- **Normalización:** por defecto, `PeriodicWave` normaliza al pico (§1.28.5). Al cambiar de preajuste, eso cambia la sonoridad y oculta el efecto de las amplitudes. Propuesta: `disableNormalization: true` y normalización propia por RMS, `\sqrt{\sum A_n^2/2}` (cálculo propio), para que todos los preajustes suenen igual de fuerte. Hay que verificar el factor 0,5 de Chromium (L284) y de Firefox (Bug 1424906) renderizando con `OfflineAudioContext`.
- **Aliasing:** en notas agudas el navegador corta los parciales por encima de Nyquist (Chromium L320-L335). El laboratorio debe mostrar «armónicos audibles ahora: k de 12» para no prometer lo que no suena.
- **`prefers-reduced-motion`:** no afecta al audio, pero sí al osciloscopio en vivo y al cursor de la línea de tiempo. Con esa preferencia, la forma de onda queda estática (se recalcula solo al cambiar un control) y el cursor no se anima (WCAG 2.3.3).
- **Accesibilidad:** cada deslizador lleva un nombre accesible («Armónico 3, amplitud −7,8 dB»). Las barras impares y pares se distinguen por patrón además de color. Hay un texto alternativo para cada figura de las muestras.

**Pruebas sugeridas:** la matemática (recetas, (11.4), (11.6), la normalización RMS, ⌊f_s/2f₁⌋ y el plegado) en un módulo TS puro con Vitest. En Playwright (con `E2E_PORT=4322`), un `page.evaluate` que renderice una `PeriodicWave` con `OfflineAudioContext` y compare las muestras con (11.5): así se comprueba que **la ecuación está en el código**.

---

## 8. Conexiones con otros temas del sitio (solo las genuinas)

- **Tema 5 (control háptico, `control-haptico.mdx`):** el actuador del DualSense funciona «like a small speaker», con una fuerza `F_0 \sin(\omega t)` (ec. 5.1 del sitio). Es el paso 1 (un solo armónico). Un altavoz movido por (11.4) es el paso 3: el mismo actuador, con una receta de varios armónicos.
- **Tema 10 (oscilador amortiguado en animaciones de resorte):** la envolvente de caída y liberación (11.7), `e^{-t/\tau}`, es la envolvente del oscilador subamortiguado. En una nota pulsada, cada modo es un oscilador amortiguado con su propio τ. La API la implementa con `setTargetAtTime` (§1.6.2).
- **Tema 12 (resonancia estructural):** el tubo del clarinete actúa como resonador. Sus resonancias, en razón impar, refuerzan los impares de la caña ("reinforced by, standing waves"). La región fija de la trompeta (≈ 1,2-1,3 kHz, §4.3) es otra resonancia que filtra el espectro.
- **M1 · Tema 1.4 (clase):** T y f del MCU son las mismas que las del tono puro, que es su proyección.

---

## 9. Riesgos y advertencias

- **Altura escrita frente a real:** Wolfe nombra las notas del clarinete en altura escrita; el MIS, en altura real (el f₀ medido lo confirma). Nuestro mi♭4 real es fa4 escrito, dentro del tramo "From about E4 up to A#4" (escrito) donde, según Wolfe, "the even harmonics become more important". No hay que atribuirle a Wolfe que esta nota en particular tenga pares débiles: eso lo dicen nuestras medidas (−34, −21, −32 y −37 dB en n = 2, 4, 6, 8).
- **El espectro no lo es todo:** la salvedad de Wolfe ("very misleading" salvo en los tubos cerrados) debe aparecer en la página. Nuestra pareja funciona justamente porque uno de los dos **es** un tubo cerrado.
- **La fase «no importa» solo aproximadamente** (nota de Ellis sobre Koenig). Hay que decirlo así.
- **Inconsistencias del MIS:** la página principal habla de 24/96 desde 2011, pero estos archivos son de 44,1 kHz, con dos canales idénticos, y su ficha describe grabaciones de 1998 y 2000 en DAT de 16 bits. Hay que documentar el formato real, no el anunciado.
- **Permiso, no licencia:** el MIS da un permiso amplio ("without restrictions"), pero no es CC0. Conviene citar la frase y, por cortesía, avisar a Fritts como pide la página (decisión de Dylan). Philharmonia queda descartada por la cláusula «as is».
- **Medidas propias:** el método (Hann, Welch, pico interpolado) da ±1-2 dB en los armónicos estables y más en la flauta, que fluctúa. Hay que publicar los rangos, no solo la mediana, y el script con su procedencia.
- **Sonoridad:** si no se igualan los LUFS, la diferencia de 1,5 LU original se oye como «más fuerte», no como timbre.
- **Altavoces pequeños:** en un altavoz de teléfono, el fundamental de 310 Hz puede salir atenuado y la comparación cambia. Recomendar auriculares (sugerencia sin fuente).
- **Numeración del libro:** los capítulos y secciones de Serway y Sears-Zemansky para ondas estacionarias y series de Fourier están **NO CONFIRMADOS**. OpenStax (§15.3, 16.6, 17.4, 17.5) sí está verificado.
- **Hammond:** la tabla de pies de los *drawbars* no está confirmada en una fuente de Hammond. La desafinación de los armónicos temperados es cálculo propio a partir de la frase de la patente.
- **No invento valores típicos de B para piano:** cualquier cifra de inarmonicidad va como «ilustrativa».
- **Factor 0,5 con `disableNormalization`:** su causa es una interpretación propia (NO CONFIRMADO); hay que medirlo con `OfflineAudioContext` antes de fijar la normalización del laboratorio.
- **Notación:** coma decimal en la prosa; los literales de código, tal cual (con punto). Hay que nombrar f₁ como «fundamental» y no confundir la ω de la onda (frecuencia angular) con la «velocidad angular» de clase sin decirlo.

## 10. Decisiones para Dylan

1. **Pareja:** flauta frente a clarinete en mi♭4 (recomendada), mi4 (contraste algo mayor, 3,4 cents de diferencia) o clarinete frente a trompeta en do4 (contraste de brillo, 10,8 cents).
2. **Nota completa o solo sostenido** en los audios. Recomiendo la nota completa con las franjas marcadas, porque el ataque es parte del timbre (paso 4).
3. **Nombre de la nota en la página:** «mi♭4 (311 Hz)» o «E♭4».
4. **Experimento de fase en el laboratorio** (Helmholtz): recomendado; cuesta un conmutador.
5. **Demostración de aliasing** con una suma ingenua en un `AudioWorklet`: es más rica, pero añade complejidad. El mínimo honesto es el contador de armónicos audibles.
6. **Aviso a Lawrence Fritts** sobre el uso de las muestras (lo pide la página, aunque no es obligatorio).
7. **Objetivo de sonoridad:** −20 LUFS para las dos muestras y para la salida del laboratorio.
