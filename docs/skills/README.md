# Skills — el cerebro de LinkedIn de Neety

Las skills que destilan todo lo que sabe la herramienta (Post Creator +
análisis de outliers) para escribir posts **fuera de la app**, desde Claude Code.
Fuente de verdad del "cerebro": `backend/src/services/postPrompt.ts` y el
`SYSTEM_PROMPT` de `backend/src/routes/chat.ts`.

## Orden de carga
1. **aboutme** — identidad: Neety, ICP, los 3 diferenciales (§1b) y los 3 perfiles (Iker / Unai / Asier) con headlines.
2. **brand-voice** — el CÓMO suena (voz Neety literal, regla de audiencia, tabla anti-IA).
3. **working-preferences** — flujo de trabajo, entrega en bloques cercados, validación proactiva.
4. **global-instructions** — el QUÉ y el CÓMO-mecánico del post de TEXTO: hooks, cuerpos, 4 mecánicas, timing. Cubre solo el post de texto; imagen y vídeo tienen sus propias skills.
   > ⚠️ **`global-instructions.md` va como ARCHIVO en `docs/skills/`. NO se pega en el campo de "instrucciones del proyecto".** Son ~38 KB de doctrina. Lo que se pega en ese campo es el bloque corto de `BOOTSTRAP.md`. Regla mental: **el campo de instrucciones dice DÓNDE mirar; `docs/skills/` es LO que se mira.**
5. **outliers-database** — datos vivos de arquetipos, hooks y ratios (la evidencia empírica; §4 = histórico real por cuenta, §5 = evidencia externa ColdIQ).
6. **swipe-file** — los TEXTOS completos de nuestros mejores outliers reales, anotados por pilar y estructura. Cargar al escribir hooks/cuerpos para copiar la anatomía exacta.

Skills de artefacto (cargar según el post lo pida):
7. **images** — concepto de imagen: 3 registros, paleta + tipografía + palabra naranja, calcar referencia, sistema meme, infografías quemadas.
8b. **lead-magnet-web** — el TERCER artefacto del lead magnet: el gate y el recurso de `recursos.neety.com`. Ni todo ni nada en el gate (regala una muestra, pide el correo), el recurso resuelve el paso 1 y vende el resto. Output = prompt para el programador. Obligatoria en todo lead magnet.
8. **video** — el vídeo es OTRO artefacto: 3 piezas (caption / texto en pantalla / spoken hook), 6 patrones de gancho hablado y el playbook de 36 puntos. Cargar solo en modo vídeo; reemplaza las reglas de hook de texto.

Otro canal:
8c. **email-marketing** — la newsletter de Neety: asunto = hook del inbox (corpus Timepack, 353 correos analizados), cuerpo con el formateado de posts, 4 remitentes rotativos (Iker/Asier/Unai/Kaixito), sistema de tandas de 2 semanas (método Carmen/Runner Pro) y validador propio (`scripts/validar-email.py`). Cargar en cualquier tarea de email/newsletter en vez de `global-instructions` §1-2 (el resto de la stack aplica igual).
8d. **corpus-correos-enviados** — los correos que hemos enviado de verdad, con su remitente, GIF y resultado. Es la evidencia propia de `email-marketing`, igual que `swipe-file` lo es de los posts.
    > Índice de lectura del paquete de email: `_EMPIEZA-AQUI-email.md`.

Orquestación:
9. **post-workflow** — cómo montar el workflow, la RECETA cronológica por pilar, y **§8 el workflow real: planificador semanal de las 3 cuentas** (categorías peloteo/lead magnet/meme, intercalado 3×3, pregunta previa). Adapta el marco de workflows del playbook interno sin pisar las skills de datos.

Estado (no doctrina):
10. **historial-publicaciones** — registro vivo de lo que publica cada cuenta cada semana. Lo LEE el planificador (§8.3) para respetar el espaciado y lo ACTUALIZA tras aprobar la semana. Hay que **commitearlo** cada vez que cambie.
11. **historial-newsletter** — lo mismo para el email: envíos, rotación de remitentes, palabras de CTA-respuesta y ángulos usados. Lo lee y actualiza el planificador de tandas (`email-marketing §6`).
12. **menciones-usadas.json** — las personas y empresas ya mencionadas, para no repetir. Lo rellena `scripts/extraer-menciones.mjs` y lo consulta `scripts/validar-post.py`.

Validadores (se corren antes de cada entrega y se pega su resultado):
- `scripts/validar-post.py` — posts, por pilar y cuenta.
- `scripts/validar-email.py` — correos y newsletter.
- `scripts/validar-video.py` — voz y caption de vídeo.
- `scripts/validar-recurso.py` — el recurso de `recursos.neety.com` de un lead magnet.
- Los tests que los vigilan: `scripts/test-validador.py`, `scripts/test-borradores-tumbados.py` y `scripts/test-cobertura-reglas.py`.

## Dónde vive cada cosa
- **`docs/skills/`** (esta carpeta) = todo el cerebro. Doctrina + el historial.
- **`CLAUDE.md`** (raíz del repo) = el bootstrap. Se carga **solo** en cada sesión de Claude Code y dice qué cargar, en qué orden y qué no se negocia. Es el equivalente al campo de "instrucciones del proyecto" de Cowork, pero automático.
- **`historial-publicaciones.md`** = ESTADO, no doctrina: cambia cada semana. Vive aquí igual que el resto porque en git todo está versionado, pero trátalo distinto: se lee antes de planificar y se actualiza (y commitea) después.
- **Entregables** (CSV de PamPam, ZIPs de fotos, fotos de portada) → **fuera del repo**: Escritorio o scratchpad.

> **Nota histórica:** esto vivió un tiempo en `docs/cowork/` partido en `context/` + `project/` + `output/`, imitando la estructura de un proyecto de Claude Cowork. Se decidió (2026-07-14) quedarse en **Claude Code**, porque aquí las skills están en git: se corrigen y se commitean solas, cada aprendizaje queda versionado con su porqué, y las credenciales de Unipile y Railway están en el entorno para verificar datos reales. En Cowork había que resubir el historial a mano cada semana y se desincronizaba del repo. Si algún día se monta el Cowork, la estructura de 3 carpetas está en el historial de git.

## Estado / pendiente
- **`outliers-database` §3** ya está **relleno** con el snapshot cross-creator del Explorer (2026-07-09): recetas hook×estructura×tono, distribuciones, aperturas/cierres, estilo, formato, timing y banco de remix. Fuente: `docs/explorer completo.pdf`.
- **Sigue pendiente:** el split por cuenta Neety (Iker vs Unai vs Asier) — el export es cross-creator, no por cuenta propia. Y el refresco periódico del snapshot (los ratios decaen).
- **Backend Railway y Unipile: accesibles.** Las credenciales (`APP_BASIC_USER` / `APP_BASIC_PASS` y las de Unipile) están en el entorno, así que §3 y §4 se refrescan en vivo desde la API. Los endpoints y los IDs de las cuentas están en `CLAUDE.md`.
- Vía alternativa de refresco: **reexportar el Explorer** (PDF/HTML) y volver a destilarlo a §3.
