# Portafolio de Física I (FUN-18, CENFOTEC)

Sitio estático (Astro 7, React 19, Tailwind 4) con los temas del portafolio de evidencias de
Física I. Comandos y estructura en `README.md`.

**Antes de tocar algo, lee `docs/superpowers/handoff/2026-10-10-avance-1-handoff.md`:**
estado, pendientes, decisiones vigentes y forma de trabajo acordada con Dylan.

Reglas que no se negocian:

- Con Dylan, en español. Claude redacta; Dylan revisa los textos antes de que cuenten como publicados.
- Notación de libro de texto: g = 9,81 m/s², decimales con coma, fuerza normal `n`.
- Colores con significado real en figuras (Tierra azul, Marte naranja, Luna gris).
- No inventar lo que no se sabe: los temas futuros solo por nombre.
- Nunca recortar calidad, alcance ni diseño por falta de tiempo; ordenar el trabajo, no bajar la barra.
- Implementar con subagentes, modelo y esfuerzo según la tarea, con revisión independiente por tarea.
- Commits en inglés, formato convencional, solo con la identidad de Dylan, sin línea de coautor.
- No matar el servidor de desarrollo del puerto 4321; e2e con `E2E_PORT=4322 pnpm run e2e`.
- Puerta antes de integrar a `main`: `pnpm run check && pnpm run test:cov && pnpm run build && E2E_PORT=4322 pnpm run e2e`.
