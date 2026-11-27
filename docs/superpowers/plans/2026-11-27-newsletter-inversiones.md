# Newsletter de inversiones · plan de montaje

> **Para agentes:** SUB-SKILL OBLIGATORIA: superpowers:subagent-driven-development (recomendada) o superpowers:executing-plans, tarea a tarea. Los pasos llevan casillas (`- [ ]`).

**Objetivo:** que la newsletter sea el sitio donde se ven antes que nadie las inversiones industriales. Para eso hay que montar tres cosas: una bienvenida automática en Brevo, un aviso semanal que prepara una rutina y que Iker revisa y programa, y una rutina que deja escritas las contestaciones a «quiero esta».

**Arquitectura:**
- Brevo envía solo la bienvenida.
- Dos tareas programadas de este Mac, con el mismo patrón que las de LinkedIn (`rutinas/<nombre>.md` + `~/.claude/scheduled-tasks/<nombre>/SKILL.md`), preparan el contenido y dejan borradores: en la página Newsletter, en Brevo, en el repo `landing` y en Gmail.
- Ninguna rutina programa, envía ni activa nada.
- Un script nuevo de `cerebro/` monta el HTML del aviso a partir de un fichero semanal con el formato de la tabla del Radar.

**Herramientas:** Python 3 (`python3`), openpyxl, el MCP de Brevo, el MCP `neety-outliers` (`neety_newsletter_publicar`, `neety_newsletter_vincular`, `neety_newsletter_ver`), el MCP de Gmail, `mcp__scheduled-tasks`, el CRM `saldu` (`src/resources_leads.js`) y el repo `landing` (`components/para-ti/recursos.ts`).

**Diseño:** `cerebro/docs/superpowers/specs/2026-11-26-newsletter-inversiones-design.md` (aprobado el 27/11/2026). Quien ejecute lee los dos.

## Restricciones globales

- **Ninguna rutina programa, envía ni activa nada.** Las campañas de Brevo se crean como borrador sin programar. La bienvenida se crea como borrador y se activa solo cuando Iker lo pida en la conversación. Las contestaciones son borradores de Gmail.
- **Una lista solo la cambia quien la llena.** Las listas 15 y 23 las llena el CRM, así que cualquier cambio en ellas se hace en el CRM y no a mano en Brevo. La lista «En bienvenida» es solo de Brevo.
- **Los de los mapas no reciben el Radar mensual.** Solo se les prometió el aviso de su mapa.
- **Las contestaciones dan el cargo y el porqué**, nunca el nombre, el correo ni el teléfono de una persona.
- **Nada inventado.** Cada fila lleva su fuente pública enlazada y su fecha dentro de la semana. Sale solo lo que Iker ha visto en la revisión del lunes.
- **Un correo por persona y semana.** La primera semana de cada mes sale el Radar (§5R) y no hay aviso semanal.
- **El cuerpo del aviso no enlaza a `/solicitar-demo`.** El puente a Neety no promete automatismo ni volumen (`global §4.4b-MUNICIÓN`).
- **Línea fija del aviso, copiada tal cual:** `¿Te interesa alguna? Respóndeme «quiero esta» y te digo a quién escribir dentro.`
- **Firma:** `Iker de Neety`. Respuestas a `iker@neety.com`, también en el Radar del 3/12.
- **Solo España** en la v1. De 5 a 8 inversiones en el correo y todas las de la semana en el Excel.
- **Hora de envío:** martes a las 09:05. El 8/12 es festivo, así que el primer aviso sale el miércoles 9/12.
- **Commits:** solo dentro de `cerebro/` y de los repos que se toquen (`landing`, `saldu`), en rama, y la subida cuando Iker la apruebe. Los correos y su estado van por el MCP, sin commit.

## Puntos a vigilar en la revisión

1. **Una semana floja (menos de 5 filas buenas).** Se espera que el script se niegue y la rutina lo diga, sin rellenar con filas dudosas. La prueba va en la tarea 3.
2. **Una fila sin fuente, o con la fecha fuera de la semana.** Se espera que esa fila no entre en el correo ni en el Excel y que salga en el resumen. La prueba va en la tarea 3.
3. **Una respuesta que no es «quiero esta»** (una baja, «sí», una pregunta, una respuesta automática de vacaciones). Se espera que se clasifique y no se escriba ningún borrador de contestación con cargo. Va en el paso de clasificación de la tarea 6.
4. **Un contacto que entra en la lista 15 por segunda vez** (se resincroniza o vuelve a darse de alta). Se espera que no reciba otra vez la bienvenida, porque entra una sola vez para siempre. Se comprueba al leer la automatización en la tarea 4.
5. **Alguien que recibe la bienvenida y el aviso la misma semana.** Se espera que no pase: el aviso excluye «En bienvenida». Se comprueba en la campaña de prueba de la tarea 5.

---

### Tarea 1 · Antes del 3/12: el Radar llega solo a quien lo pidió y las respuestas llegan a Iker

**Archivos:** ninguno de código. Se toca la configuración del CRM y de Brevo y el correo 16 por el MCP.

- [ ] **Paso 1.** Iker enciende, en el CRM (Marketing → Audiencias), la sincronización con Brevo de la audiencia «Radar mensual» (recurso `radar`). Se deja apagada la de «Avisos de mapas».
- [ ] **Paso 2.** Comprobar con `lists_get_lists` que existe la lista nueva de Brevo. Su número de contactos tiene que coincidir con las filas `radar` con `consent_comms = 1` que da el CRM, y ninguna puede ser `mapas`. Si no cuadra, se para y se le dice a Iker.
- [ ] **Paso 3.** Cuando esté la edición de noviembre revisada, montar el correo 16 con `montar-radar-correo.py`. La línea del pie para quien llega solo por el Radar dice: `Si quieres también las inversiones de cada semana, antes que en ningún sitio, respóndeme «sí».`
- [ ] **Paso 4.** Crear la campaña de Brevo como borrador, sin programar:
  - remitente `Radar de Neety`;
  - **respuesta a `iker@neety.com`**;
  - listas 15, 16, 19 y la lista nueva del Radar;
  - excluyendo la 22, porque el Radar lleva botón de reunión, y la 24 («En bienvenida», revisión final).
  - Vincularla con `neety_newsletter_vincular`.
- [ ] **Paso 5.** Mandar una prueba a `iker@neety.com`. Con `get_message`, comprobar que la cabecera `Reply-To` es `iker@neety.com`.
  - Esperado: `Reply-To: iker@neety.com`. Si sale `hola@`, no se sigue.
- [ ] **Paso 6.** Iker aprueba en la página Newsletter y programa la campaña para el jueves 3/12 a las 09:05.

### Tarea 2 · El «sí» queda en el CRM

Quien responde «sí» necesita una fila `newsletter` con `consent_comms = 1` en la base `landing`. Así la sincronización lo mete en la lista 15, y la fila `radar` sigue aparte (`SUSCRIPCIONES_APARTE`, `resources_leads.js:71`).

**Archivos:**
- Crear: el script que da de alta la fila, en el repo que ya escribe en esa base. Mirar primero dónde escribe `/api/lead` en `~/Desktop/seo/landing`.
- Probar con: la prueba de `membersForRef` que ya tenga `saldu`. Si no hay, crear `saldu/test/resources_leads.suscripciones.test.js`.

**Interfaces:**
- Produce: `alta-newsletter-por-respuesta <email> --correo <clave del correo> --fecha <AAAA-MM-DD>`. Inserta `{email, resource: "newsletter", consent_comms: 1, meta: {origen: "respuesta", correo, fecha}}`. Si ya hay una fila `newsletter` con casilla para ese correo, no hace nada.

- [ ] **Paso 1.** Escribir la prueba que falla. Con las filas `[{email:a, resource:"radar", consent_comms:1}, {email:a, resource:"newsletter", consent_comms:1}]`, `membersForRef(rows, <ref all>)` contiene a `a`. Con solo la fila `radar`, no lo contiene.
- [ ] **Paso 2.** Ejecutarla. Esperado: la primera pasa, porque la lógica ya existe, y esto la fija. Si falla, se para y se mira `membersForRef`.
- [ ] **Paso 3.** Escribir el script del alta. Si escribir en la base pide un secreto que no está en este Mac (en la base del 23/11 faltaba `CLOUDFLARE_API_TOKEN`), se para y se pide a Iker que lo ponga. El secreto no se escribe en el chat.
- [ ] **Paso 4.** Probarlo con un correo de prueba externo que tenga solo la fila `radar`. Tras la siguiente sincronización tiene que estar en la lista 15 de Brevo, y la fila nueva lleva el `meta` con el correo.
- [ ] **Paso 5.** Commit en rama del repo que se toque y PR en borrador. Lo fusiona Iker.

### Tarea 3 · El aviso semanal se monta desde un fichero de la semana

**Archivos:**
- Crear: `cerebro/scripts/montar-aviso-semanal.py`
- Modificar: `cerebro/scripts/radar-excel.py`, en `main()` a partir de la línea 129, para aceptar el campo `semana`.
- Crear: `cerebro/scripts/test-aviso-semanal.py`, con el estilo de `test-montar-llanta.py` (carga el módulo con `importlib`, `assert`s y salida distinta de cero si falla).
- Crear: `cerebro/scripts/fixtures/semana-ejemplo.md`: 7 filas válidas, 1 sin fuente y 1 con fecha fuera de la semana, con empresas reales sacadas de `espana-2026-11.md`.

**Interfaces:**
- **El fichero semanal `newsletter/semanas/AAAA-Wnn.md`:**
  - frontmatter `region: espana`, `mes: AAAA-MM` (el del lunes), `semana: AAAA-Wnn`, `desde: AAAA-MM-DD`, `hasta: AAAA-MM-DD`;
  - y la tabla `## Las inversiones` con las mismas 7 columnas que la edición.
  - Se lee con `rc.leer()` de `montar-radar-correo.py`.
- **`filas_validas(fm, filas) -> (validas, descartadas)`.** Una fila es válida si tiene un enlace en «Fuente» y su «Fecha» está entre `desde` y `hasta`. Cada descartada lleva su motivo.
- **`elegir(validas, n_min=5, n_max=8) -> list`.** Ordena por importe (`rc.importe`) de mayor a menor y, si empatan, por fecha más reciente. Lanza `SystemExit` con el texto `menos de 5 inversiones válidas` si no llega a 5.
- **El comando:** `montar-aviso-semanal.py <semana.md> --excel <url> --gif <url> --alt "<texto>" [--pie]`.
  - El HTML va a stdout.
  - El asunto A/B y la preview van a stderr.
  - Las descartadas, con su motivo, también a stderr.
- **Todos los enlaces** llevan `utm_source=brevo&utm_medium=email&utm_campaign=inversiones-<semana>` y su `utm_content`.

- [ ] **Paso 1.** Escribir `test-aviso-semanal.py` con estas pruebas:
  - `test_descarta_sin_fuente_y_fuera_de_semana`: de las 9 filas del fixture quedan 7 válidas y 2 descartadas, con los motivos `sin fuente` y `fecha fuera de la semana`.
  - `test_elige_entre_5_y_8`: con las 7 válidas devuelve 7. Con 10 devuelve 8, las de más importe. Con 4 lanza `SystemExit` con `menos de 5 inversiones válidas`.
  - `test_html`:
    - el HTML contiene la línea fija literal;
    - contiene cada empresa elegida;
    - cada fuente enlazada lleva `utm_campaign=inversiones-2026-W49`;
    - contiene el botón con la URL del Excel;
    - contiene la `img` del GIF con su `alt`;
    - y **no** contiene `solicitar-demo`.
  - `test_excel_semana`: `radar-excel.py` con el fixture crea un `.xlsx`. La pestaña de las inversiones tiene 7 filas de datos y «Cómo usarlo» dice `semana del 30/11 al 06/12`.
- [ ] **Paso 2.** Ejecutar `python3 cerebro/scripts/test-aviso-semanal.py`. Esperado: falla porque falta `montar-aviso-semanal.py`.
- [ ] **Paso 3.** Escribir `montar-aviso-semanal.py`.
  - Reutiliza `leer`, `importe`, `utm` y `boton` de `montar-radar-correo.py` y los colores de su cabecera, cargándolo con `importlib`, igual que `radar-excel.py`.
  - Cuerpo: dos líneas de entrada; las elegidas, cada una con empresa, ubicación, señal, qué puede necesitar y fuente; el botón `Descargar el Excel`; la línea fija; una línea de Neety sin automatismo ni volumen; la firma `Iker` y el GIF a 200 px.
  - En `radar-excel.py`: si el frontmatter tiene `semana`, «Cómo usarlo» pone `semana del <desde> al <hasta>` en lugar del mes.
- [ ] **Paso 4.** Ejecutar las pruebas. Esperado: todas pasan. Ejecutar también `python3 cerebro/scripts/test-validador.py` para comprobar que nada de lo anterior se ha roto.
- [ ] **Paso 5.** Commit en `cerebro`: `feat: aviso semanal de inversiones (montar-aviso-semanal.py y semana en radar-excel)`.

### Tarea 4 · La doctrina del aviso y de la bienvenida

**Archivos:**
- Modificar: `cerebro/docs/skills/email-marketing.md`:
  - una sección nueva `§5S` después de `§5R`: qué es el aviso, cuándo sale, a quién, la forma, la línea fija, lo que no lleva, cómo se mide y que `validar-email.py` se le pasa a las dos líneas de entrada;
  - `§5b`, con la bienvenida real de tres correos (días 0, 3 y 7) y el «sin doble flujo» con la lista «En bienvenida».
- Modificar: `cerebro/scripts/cobertura-reglas.txt`, con una línea por cada regla dura nueva que tenga dueño (`global §8-DUEÑO`).
- Por el MCP: las `notas` de los correos 17 y 18 en la página Newsletter dicen `Retirado el 27/11: lo sustituye el aviso semanal (diseño 2026-11-26)`.
- Modificar: `newsletter/plan-2026-11-12.md`, con un aviso arriba que apunte al diseño.

- [ ] **Paso 1.** Escribir `§5S` y `§5b` sin citas del chat ni nombres de quien pidió el cambio (`cerebro/CLAUDE.md`).
- [ ] **Paso 2.** Ejecutar `python3 cerebro/scripts/test-cobertura-reglas.py`. Esperado: verde.
- [ ] **Paso 3.** Retirar los correos 17 y 18 con `neety_newsletter_publicar`, cambiando solo `notas` y `estado`, y comprobarlo con `neety_newsletter_ver`.
- [ ] **Paso 4.** Redactar el mensaje para la sesión que publica el Radar: desde diciembre, la edición mensual se monta partiendo de `newsletter/semanas/`. Iker lo aprueba antes de mandarlo.
- [ ] **Paso 5.** Commit en `cerebro`: `docs: email-marketing §5S aviso semanal y §5b bienvenida`.

### Tarea 5 · La bienvenida en Brevo, como borrador

**Archivos:**
- Crear: `newsletter/bienvenida/dia-0.txt`, `dia-3.txt` y `dia-7.txt`, cada uno con su `.validador.txt` al lado, como los de `newsletter/`.

**Interfaces:**
- Consume: la `§5b` de la tarea 4 y el Excel del Radar más reciente en `neety.com/para-ti/…`.

- [ ] **Paso 1.** Escribir los tres correos con `email-marketing.md`.
  - El contenido de cada día es el de la tabla del diseño, §4.2.
  - En el día 3, el ejemplo es una fila real de la última edición revisada.
  - En el día 7, una inversión de la última semana guardada.
- [ ] **Paso 2.** `python3 cerebro/scripts/validar-email.py newsletter/bienvenida/dia-N.txt` para cada uno. Esperado: `ENTREGABLE: SÍ`. Se pega la línea en su `.validador.txt`.
- [ ] **Paso 3.** Montar el HTML con `montar-correo-brevo.py` y guardar cada uno como plantilla de automatización (`email_editor_create_template`), con el remitente activo `Iker de Neety` y la respuesta a `iker@neety.com`.
- [ ] **Paso 4.** `accounts_get_account`: decirle a Iker qué cuenta es y que la confirme. Después, `automation_get_catalog` para ver si hay pasos de añadir y quitar de una lista.
  - Si no los hay, se para y se le propone a Iker la alternativa (un segmento por fecha de alta) antes de montar nada.
- [ ] **Paso 5.** Con su sí, crear la lista «En bienvenida» y validar (`automation_validate_workflow`) esta automatización:
  - disparador: `added_to_lists` lista 15;
  - una sola vez por contacto, sin `reentry`;
  - pasos: añadir a «En bienvenida» → correo día 0 → esperar `P3D` → correo día 3 → esperar `P4D` → correo día 7 → quitar de «En bienvenida».
  - Esperado: `valid: true`, y se le cuentan a Iker todos los avisos.
- [ ] **Paso 6.** Con su sí al plan del paso 5, crear el borrador (`automation_create_workflow`) y leerlo (`automation_get_workflow`).
  - Esperado: estado `inactive`, la lista 15 como disparador, sin `reentry` y los seis pasos en orden.
- [ ] **Paso 7.** Mandar una prueba de cada correo a `iker@neety.com` (`email-test-preview`) y darle el enlace al editor.
  - **No se activa.** Se activa solo cuando Iker lo pida.

### Tarea 6 · La rutina de las respuestas

**Archivos:**
- Crear: `rutinas/respuestas.md` y `newsletter/respuestas.md`. Este último es el registro, con estas columnas: `fecha | correo (enmascarado) | qué pidió | empresa | sector | estado | borrador`.
- Crear: `~/.claude/scheduled-tasks/contenido-respuestas-auto/SKILL.md`, con el patrón de `contenido-medicion-auto`.
- Modificar: `rutinas/_comun.md`, con la excepción a las reglas 1 y 8 para las dos rutinas de newsletter (lo que dejan fuera son borradores, nunca envíos), `rutinas.md` (la tabla de rutinas) y `rutinas/permisos-propuestos.json`.

- [ ] **Paso 1.** Escribir `rutinas/respuestas.md`, que se ejecuta de lunes a viernes a las 12:00:
  1. Respuestas nuevas en el Gmail de Iker a los asuntos de los correos enviados que da `neety_newsletter_ver`.
  2. Clasificarlas en `quiero esta`, `sí`, `baja`, `automática` u `otra`.
  3. Para cada «quiero esta», un borrador de contestación en el mismo hilo: el cargo y por qué, sacados de «Qué puede necesitar» y de la guía de quién decide la compra; si no dijo qué vende, se le pregunta en una línea; y una línea de Neety.
  4. Para cada «sí», una línea en el resumen para la tarea 2.
  5. Avisar con `PushNotification` cuando alguien pide su segunda empresa o pregunta por Neety.
  6. Apuntarlo todo en `newsletter/respuestas.md`.
- [ ] **Paso 2.** Permisos: lectura de Gmail y `create_draft` sí. `send_message`, `reply` y `forward` nunca.
- [ ] **Paso 3.** Crear la tarea programada con `create_scheduled_task`, de lunes a viernes a las 12:00.
- [ ] **Paso 4.** Ejecutarla a mano una vez (`run_scheduled_task`) y comprobar con `list_task_runs` que acaba con sus cuatro líneas.
  - Esperado: con cero respuestas lo dice y no crea borradores.
  - Para probar la clasificación, se le pasan tres textos de ejemplo («quiero esta, la de Pilatus», «sí» y una respuesta automática de vacaciones). Tiene que salir un solo borrador, el de Pilatus, y en él no puede ir ningún nombre de persona.

### Tarea 7 · La rutina del aviso semanal

**Archivos:**
- Crear: `rutinas/newsletter.md` y `~/.claude/scheduled-tasks/contenido-newsletter-auto/SKILL.md`.
- Modificar: `rutinas/medicion.md` (el paso de la newsletter: cada aviso a los 3 y 7 días en sus `notas`, y la bienvenida por correo), `rutinas.md`, `CLAUDE.md` (son diez tareas programadas y no ocho) y `rutinas/permisos-propuestos.json`.

**Interfaces:**
- Consume: `montar-aviso-semanal.py` y `radar-excel.py` (tarea 3), la lista «En bienvenida» (tarea 5) y el brief `~/Desktop/seo/brief-radar-inversiones-industriales.md`.

- [ ] **Paso 1.** Escribir `rutinas/newsletter.md`, que se ejecuta los lunes a las 11:00. Los pasos son los de §4.3 del diseño:
  1. Si es la primera semana del mes, no hay aviso: lo dice y para.
  2. Buscar las inversiones de la semana anterior, en España, con el brief. Las señales de mercado del lunes sirven solo de pista.
  3. Escribir `newsletter/semanas/AAAA-Wnn.md`.
  4. Pasar `montar-aviso-semanal.py`. Si sale `menos de 5 inversiones válidas`, lo dice y para.
  5. Generar el Excel y abrir un PR en borrador en `landing`, con la entrada `inversiones-AAAA-Wnn` en `recursos.ts` y el archivo en `public/para-ti/archivos/`.
  6. Subir el correo como `borrador` con `neety_newsletter_publicar`, con el porqué (filas nuevas, fuentes y descartadas).
  7. Crear la campaña de Brevo como borrador sin programar: listas 15, 16 y 19, excluyendo «En bienvenida», con respuesta a `iker@neety.com` y A/B de asunto. Vincularla.
  8. Resumen y `PushNotification`.
  - Tiene un modo `ensayo` que hace los pasos 1 a 4 sin subir nada.
- [ ] **Paso 2.** Ejecutar el ensayo con la semana del 23 al 29/11 (2026-W48).
  - Esperado: `newsletter/semanas/2026-W48.md` con al menos 5 filas válidas, cada una con su fuente, el HTML y el Excel en el scratchpad, y nada subido.
  - Iker revisa las filas.
- [ ] **Paso 3.** Crear la tarea programada con `create_scheduled_task`, los lunes a las 11:00. La primera ejecución de verdad es el lunes 7/12, con la semana 2026-W49 y el envío del miércoles 9/12.
- [ ] **Paso 4.** El 7/12, comprobar en la campaña de Brevo que las listas son la 15, la 16 y la 19, que excluye «En bienvenida», que no está programada y que responde a `iker@`. Iker la aprueba y la programa para el 9/12 a las 09:05.

## Orden y dependencias

- **Tarea 1:** antes del 3/12. No depende de ninguna.
- **Tarea 2:** antes de que lleguen los primeros «sí», es decir, la semana del 3/12.
- **Tarea 3**, y después **tarea 4**.
- **Tarea 5:** después de la 4.
- **Tarea 6:** puede ir en paralelo con la 5.
- **Tarea 7:** después de la 3 y de la 5. Tiene que estar antes del lunes 7/12.
