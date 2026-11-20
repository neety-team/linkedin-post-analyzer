# La newsletter en contenido.neety.team · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Una pestaña `/newsletter` en el analizador, a la que se llega desde Semana con un selector LinkedIn / Newsletter. Enseña los correos que vienen tal como llegarán a la bandeja, los aprueba solo Iker y muestra las métricas reales de Brevo de los enviados.

**Architecture:** Tablas propias (`newsletter_correos`, `newsletter_feedback`, `newsletter_metricas`, `newsletter_clics`) y un servicio `newsletter.ts` copiado del patrón de `semana.ts`. Un módulo `metricasNewsletter.ts` concentra el cálculo de métricas (funciones puras + cliente de Brevo + barrido diario de clics por contacto). Los correos entran por tools del MCP (`toolsNewsletter.ts`), igual que la semana, y la página React es nueva, con componentes en `components/newsletter/`.

**Tech Stack:** Express + pg (backend TS, tests con `node:assert` corridos con `npx tsx`), React + react-router + `useApi` (frontend), MCP SDK + zod, API v3 de Brevo.

**Spec:** `docs/superpowers/specs/2026-11-20-newsletter-en-contenido-design.md`

## Global Constraints

- La lista de suscriptores se queda en Saldu: ni se lee ni se copia la base de Saldu.
- Los correos nunca van en `semana_posts`: el publicador de LinkedIn, el efecto abeja y las menciones leen esa tabla.
- Solo aprueba Iker. La identidad sale de `identidadDe(req)` (login central) y tiene que ser `iker@neety.com`. Sin identidad (contraseña compartida o `API_TOKEN` del MCP), no se aprueba.
- Estados del correo: `idea`, `borrador`, `aprobado`, `programado`, `enviado`.
- Remitentes válidos: `Iker`, `Asier`, `Unai`, `Kaixito`.
- Niveles de feedback: `estilo`, `pilar`, `correo`.
- Brevo: pedir siempre `?statistics=globalStats` (sin el parámetro la API devuelve ceros). Apertura real = `uniqueViews − appleMppOpens`. Clics del cuerpo = `linksStats`, nunca `uniqueClicks`. Personas que pulsan = emails únicos, sin `@neety.com` y sin enlaces de baja o de preferencias. Un clic en los primeros 60 s tras `sentDate` se marca como posible escáner. Las listas salen de `recipients.lists` de la campaña.
- `BREVO_API_KEY` se lee del entorno y nunca se escribe en el repo. Si falta, las métricas dicen «sin clave», no ceros.
- Si un correo tiene `brevo_campaign_id` y la campaña está programada o enviada, no se puede reescribir: la tool lo rechaza y explica por qué.
- Si cambia el texto de un correo aprobado, vuelve a `borrador`. Si se republica con el mismo texto, sigue `aprobado`.
- Al reescribir un correo se conserva su feedback.

## Review Focus

1. **Sin `BREVO_API_KEY` en Railway** (el estado de hoy): la página carga, los correos se ven y las métricas dicen «sin clave». No sale nada a 0 %. Test en la tarea 2.
2. **Campaña recién programada o con 0 entregados o 0 aperturas:** apertura, CTOR y clic salen `null` y se pintan «—», nunca `NaN` ni 0 %. Tests en la tarea 2.
3. **Aprobación desde el MCP o con la contraseña compartida:** 403, y la página no enseña el botón. Tests en la tarea 1 (`puedeAprobar`) y en la tarea 4.
4. **Republicar un correo aprobado con el mismo texto** (por ejemplo, solo cambia el porqué): sigue `aprobado`. Test en la tarea 1.
5. **Brevo responde 429 a mitad del barrido de clics:** se conservan los clics anteriores, el error queda apuntado y no se borra nada. Test en la tarea 3.

---

### Task 1: Tablas y servicio de correos

**Files:**
- Modify: `backend/src/db/migrate.ts` (justo después del bloque de `semana_feedback`)
- Create: `backend/src/services/newsletter.ts`
- Test: `backend/src/services/newsletter.test.ts`

**Interfaces:**
- Produces:
  - `ESTADOS_CORREO`, `REMITENTES`, `NIVELES_CORREO` (const arrays de Global Constraints)
  - `APROBADOR = 'iker@neety.com'`
  - `interface CorreoEntrada { clave: string; numero?: number; fecha?: string /*YYYY-MM-DD*/; hora?: string /*HH:MM, Madrid*/; remitente?: Remitente; asunto?: string; asunto_b?: string|null; preview?: string; preview_b?: string|null; cuerpo?: string; gif_url?: string|null; gif_alt?: string|null; enlace?: string|null; utm_campaign?: string|null; utm_source?: string|null; pilar?: string|null; tipo_cliente?: string|null; por_que?: string|null; validador?: string|null; validador_ok?: boolean; estado?: 'idea'|'borrador' }`
  - `huellaTexto(c): string` (sha256 de remitente, asunto, asunto_b, preview, preview_b, cuerpo, gif_url, enlace)
  - `estadoTrasReescribir(actual: {estado, huella}, nueva: string, pedido?: string): string`
  - `motivoNoReescribible(actual: {brevo_campaign_id: number|null; estado: string}): string | null`
  - `puedeAprobar(id: Identidad | null): boolean`
  - `motivoNoAprobable(c: {estado: string; validador_ok: boolean}): string | null`
  - `async guardarCorreos(entradas: CorreoEntrada[]): Promise<{guardados: string[]; rechazados: {clave: string; motivo: string}[]}>`
  - `async listarCorreos(): Promise<{proximos: Correo[]; enviados: Correo[]}>` (cada `Correo` con `feedback[]` y `metricas | null`)
  - `async aprobarCorreo(id: string, quien: Identidad): Promise<'ok'|'no_existe'|string /*motivo*/>`
  - `async vincularCampana(clave: string, campaignId: number | null, opts?: {historico?: boolean}): Promise<'ok'|'no_existe'|'no_aprobado'>` (con id: pasa a `programado` y exige `aprobado`; con `historico: true` pasa a `enviado` sin exigirlo, solo para la carga de la tarea 9; con `null`: desvincula y vuelve a `borrador`). La regla va en una función pura `estadoAlVincular(estado, campaignId, historico): string | 'no_aprobado'` con su test en este mismo fichero.
  - `async crearFeedback(correoId, autor, texto)`, `async listarFeedbackCorreos({pendiente?})`, `async resolverFeedbackCorreo(id, {nivel, respuesta})`

- [ ] **Step 1: Write the failing test** `newsletter.test.ts`
```ts
const h = huellaTexto({ remitente: 'Kaixito', asunto: 'a', cuerpo: 'x' } as any);
assert.equal(estadoTrasReescribir({ estado: 'aprobado', huella: h }, h), 'aprobado');
assert.equal(estadoTrasReescribir({ estado: 'aprobado', huella: h }, 'otra'), 'borrador');
assert.equal(estadoTrasReescribir({ estado: 'idea', huella: null as any }, 'otra', 'borrador'), 'borrador');
assert.match(motivoNoReescribible({ brevo_campaign_id: 38, estado: 'programado' })!, /cancela/i);
assert.match(motivoNoReescribible({ brevo_campaign_id: 36, estado: 'enviado' })!, /cancela|enviado/i);
assert.equal(motivoNoReescribible({ brevo_campaign_id: null, estado: 'aprobado' }), null);
assert.equal(puedeAprobar({ email: 'iker@neety.com', nombre: 'Iker', rol: null }), true);
assert.equal(puedeAprobar({ email: 'IKER@neety.com', nombre: 'Iker', rol: null }), true);
assert.equal(puedeAprobar({ email: 'unai@neety.com', nombre: 'Unai', rol: null }), false);
assert.equal(puedeAprobar(null), false);
assert.equal(motivoNoAprobable({ estado: 'borrador', validador_ok: true }), null);
assert.ok(motivoNoAprobable({ estado: 'borrador', validador_ok: false }));
assert.ok(motivoNoAprobable({ estado: 'idea', validador_ok: true }));
```
- [ ] **Step 2: Run** `cd backend && npx tsx src/services/newsletter.test.ts` → FAIL (módulo no existe)
- [ ] **Step 3: Migración.** `newsletter_correos` (id uuid, clave text UNIQUE, numero int, fecha date, hora text, todos los campos de `CorreoEntrada`, `huella text`, `estado text default 'idea'`, `aprobado_por text`, `aprobado_at timestamptz`, `brevo_campaign_id int`, `created_at`, `updated_at`). `newsletter_feedback` igual que `semana_feedback`, con `correo_id uuid REFERENCES newsletter_correos ON DELETE CASCADE`.
- [ ] **Step 4: Implementar `newsletter.ts`.** `guardarCorreos` hace upsert por `clave`, aplica `motivoNoReescribible` (va a `rechazados`) y `estadoTrasReescribir`, y nunca toca `newsletter_feedback`. Al volver a `borrador`, limpia `aprobado_por` y `aprobado_at`. `listarCorreos` separa los `enviado` (orden por fecha desc) del resto (orden por fecha asc).
- [ ] **Step 5: Run** el test → PASS. `npx tsc --noEmit` sin errores.
- [ ] **Step 6: Commit** `feat(newsletter): tablas y servicio de correos`

### Task 2: Cálculo de métricas (funciones puras)

**Files:**
- Create: `backend/src/services/metricasNewsletter.ts`
- Create: `backend/src/services/fixtures/brevo-campana.json` (campaña 36 anonimizada: globalStats, linksStats, sentDate y cuatro clics, uno interno, uno a los 30 s, uno a la baja y otro bueno)
- Test: `backend/src/services/metricasNewsletter.test.ts`

**Interfaces:**
- Produces:
  - `interface Clic { email: string; url: string; t: string /*ISO*/ }`
  - `interface Metricas { enviados: number; entregados: number; rebotes: number; bajas: number; aperturas_reales: number|null; apertura_real: number|null /*0-1*/; personas: number; personas_primer_minuto: number; clic: number|null /*personas/entregados*/; ctor: number|null /*personas/aperturas_reales*/; ab?: {a: Brazo; b: Brazo} }`
  - `calcularMetricas(g: GlobalStats, sentDate: string, clics: Clic[]): Metricas`
  - `esEnlaceDeBaja(url: string): boolean`
  - `estadoMetricas(): {configurado: boolean}` (lee `BREVO_API_KEY`)

- [ ] **Step 1: Write the failing test**
```ts
const f = require('./fixtures/brevo-campana.json');
const m = calcularMetricas(f.globalStats, f.sentDate, f.clics);
assert.equal(m.aperturas_reales, f.globalStats.uniqueViews - f.globalStats.appleMppOpens);
assert.equal(m.personas, 1);              // interno y baja fuera; el de 30 s cuenta, pero marcado
assert.equal(m.personas_primer_minuto, 1);
// La campaña recién programada no da NaN ni 0 %
const v = calcularMetricas({ sent: 0, delivered: 0, uniqueViews: 0, appleMppOpens: 0 } as any, '2026-11-24T08:05:00Z', []);
assert.equal(v.apertura_real, null); assert.equal(v.ctor, null); assert.equal(v.clic, null);
assert.equal(esEnlaceDeBaja('https://x.r.sp1-brevo.net/unsubscribe/abc'), true);
// Sin clave
delete process.env.BREVO_API_KEY; assert.equal(estadoMetricas().configurado, false);
```
  Ajusta `personas` a los cuatro clics del fixture: los cuenta el test, no el código.
- [ ] **Step 2: Run** `npx tsx src/services/metricasNewsletter.test.ts` → FAIL
- [ ] **Step 3: Implementar** las funciones. `personas` cuenta emails distintos (sin `@neety.com` y sin `esEnlaceDeBaja`). `personas_primer_minuto` cuenta, entre esos, los que tienen su primer clic a ≤ 60 s de `sentDate`. Las divisiones con denominador 0 dan `null`.
- [ ] **Step 4: Run** → PASS
- [ ] **Step 5: Commit** `feat(newsletter): cálculo de métricas con las definiciones del diseño`

### Task 3: Brevo: lectura de campañas, barrido de clics y caché

**Files:**
- Modify: `backend/src/services/metricasNewsletter.ts`
- Modify: `backend/src/db/migrate.ts` (`newsletter_metricas`: `campaign_id int PK, datos jsonb, estado_brevo text, leido_at`; `newsletter_clics`: `campaign_id, email, url, t, PRIMARY KEY (campaign_id, email, url, t)`; `newsletter_barrido`: una fila con `ultimo_at`, `error`)
- Modify: `backend/src/index.ts` (el job diario, junto a los demás temporizadores)
- Test: `backend/src/services/metricasNewsletter.test.ts` (añadir)

**Interfaces:**
- Consumes: `calcularMetricas`, `vincularCampana` no (solo lee `brevo_campaign_id` de `newsletter_correos`)
- Produces:
  - `async refrescarMetricas(opts?: {fetcher?: typeof fetch}): Promise<{campanas: number; error: string|null}>`: para cada correo con `brevo_campaign_id` lee `GET /emailCampaigns/{id}?statistics=globalStats` y `linksStats` (y `abTestCampaignResult` si la campaña es A/B), guarda en `newsletter_metricas`, y si `status` es `sent` pasa el correo a `enviado`.
  - `async barrerClics(opts?: {fetcher?: typeof fetch}): Promise<{contactos: number; error: string|null}>`: une los contactos de `recipients.lists` de todas las campañas vinculadas, lee `GET /contacts/{email}` y guarda `statistics.clicked` en `newsletter_clics`. Es el mismo recorrido que `metricas-brevo.py --quien`.
  - `async metricasDeCorreo(campaignId): Promise<Metricas | null>`

- [ ] **Step 1: Write the failing test** con un `fetcher` falso: la tercera llamada a `/contacts/` devuelve 429 → `barrerClics` devuelve `error` que contiene `429`, y una función pura `fusionarClics(previos, nuevos, completado:false)` conserva los previos.
```ts
assert.deepEqual(fusionarClics([c1], [], false), [c1]);
assert.deepEqual(fusionarClics([c1], [c2], true), [c2]);
```
- [ ] **Step 2: Run** → FAIL
- [ ] **Step 3: Implementar.** Pausa de 250 ms entre contactos. Si el barrido no termina, no se borra nada: solo se insertan los nuevos (`ON CONFLICT DO NOTHING`) y se apunta el error en `newsletter_barrido`. Job: `refrescarMetricas` cada 6 h y `barrerClics` una vez al día a las 07:00 de Madrid. Si no hay clave, los dos salen sin llamar.
- [ ] **Step 4: Run** → PASS. `npx tsc --noEmit` limpio.
- [ ] **Step 5: Commit** `feat(newsletter): lectura de Brevo, barrido de clics y caché`

### Task 4: Rutas HTTP

**Files:**
- Create: `backend/src/routes/newsletter.ts`
- Modify: `backend/src/index.ts` (`app.use('/api/newsletter', newsletterRouter)`)
- Test: `backend/src/routes/newsletter.test.ts`

**Interfaces:**
- Consumes: tarea 1 y tarea 3
- Produces:
  - `GET /api/newsletter` → `{proximos, enviados, metricas: {configurado, ultimo_barrido, error}, puedo_aprobar: boolean}`
  - `POST /api/newsletter/correos/:id/aprobar` → 200 con el correo · 403 si `!puedeAprobar(identidadDe(req))` · 409 con el motivo de `motivoNoAprobable`
  - `POST /api/newsletter/correos/:id/feedback {texto, autor?}` (el autor sale de la identidad si la hay, como en Semana)
  - `POST /api/newsletter/refrescar` → lanza `refrescarMetricas`

- [ ] **Step 1: Write the failing test.** Monta el router en un `express()` con un middleware que fija `req.identidad`, y llama con `fetch` sobre un puerto efímero. Con `unai@neety.com` → 403. Sin identidad → 403. Con Iker sobre un correo `idea` → 409. Usa un `aprobarCorreo` inyectado (el router exporta `crearRouter(deps)`), sin base de datos.
- [ ] **Step 2: Run** `npx tsx src/routes/newsletter.test.ts` → FAIL
- [ ] **Step 3: Implementar** `crearRouter(deps = serviciosReales)` y `export default crearRouter()`.
- [ ] **Step 4: Run** → PASS
- [ ] **Step 5: Commit** `feat(newsletter): rutas, la aprobación solo con la identidad de Iker`

### Task 5: Tools del MCP

**Files:**
- Create: `backend/src/mcp/toolsNewsletter.ts`
- Modify: `backend/src/mcp/http.ts` (`registrarToolsNewsletter(servidor)`)

**Interfaces:**
- Consumes: tarea 1 y `refrescarMetricas`
- Produces (tools):
  - `neety_newsletter_publicar {correos: CorreoEntrada[]}` → guardados y rechazados con su motivo. No acepta `estado` por encima de `borrador` ni `aprobado_por`.
  - `neety_newsletter_ver {}` → lo mismo que `GET /api/newsletter`, en texto
  - `neety_newsletter_vincular {clave, campaign_id: number | null}`
  - `neety_newsletter_feedback {pendiente?: boolean}` y `neety_newsletter_feedback_resolver {id, nivel: 'estilo'|'pilar'|'correo', respuesta}`
  - `neety_newsletter_refrescar {}`

- [ ] **Step 1:** Escribe las tools con el mismo patrón de `texto()` y `error()` que `toolsSemana.ts`. El schema zod de `publicar` hace `estado: z.enum(['idea','borrador']).optional()`.
- [ ] **Step 2: Verificar.** `npx tsc --noEmit` limpio. Con el backend en local (`npm run dev`, sin variables de auth), llamar a `neety_newsletter_publicar` con un correo de prueba y comprobar con `neety_newsletter_ver` que sale en `borrador`. Luego republicarlo con `vincular` puesto a 1 y estado `programado` en la base → la respuesta lo trae en `rechazados`.
- [ ] **Step 3: Commit** `feat(newsletter): tools del MCP para publicar, vincular y feedback`

### Task 6: La página `/newsletter` y el selector en Semana

**Files:**
- Create: `frontend/src/components/CanalSelector.tsx` (`<CanalSelector actual="linkedin"|"newsletter" />`: dos `Link`, `/semana` y `/newsletter`)
- Create: `frontend/src/components/newsletter/CorreoTarjeta.tsx` (cómo en la bandeja: «{remitente} de Neety», asunto, preview, cuerpo con sus saltos, GIF a 280 px; el porqué y el validador encima; asunto B y preview B si los hay; feedback; botón Aprobar solo si `puedo_aprobar` y estado `borrador`)
- Create: `frontend/src/components/newsletter/TablaEnviados.tsx` (columnas: correo, fecha, entregados, apertura real, personas que pulsan con «n posible escáner», CTOR, bajas, rebotes, reuniones/leads; `null` → «—»; con A/B, una fila por brazo debajo)
- Create: `frontend/src/pages/Newsletter.tsx`
- Create: `frontend/src/utils/formatoMetricas.ts` + `formatoMetricas.test.ts`
- Modify: `frontend/src/App.tsx` (ruta `/newsletter`)
- Modify: `frontend/src/pages/Semana.tsx` (el selector en `cabecera`, encima del `<p>` de «en LinkedIn»)

**Interfaces:**
- Consumes: `GET /api/newsletter`, `POST …/aprobar`, `POST …/feedback`
- Produces: `porcentaje(v: number|null): string` ('—' si null, «44,3 %» con coma decimal)

- [ ] **Step 1: Write the failing test** `formatoMetricas.test.ts`
```ts
assert.equal(porcentaje(null), '—');
assert.equal(porcentaje(0.443), '44,3 %');
assert.equal(porcentaje(0), '0,0 %');
```
- [ ] **Step 2: Run** `cd backend && npx tsx ../frontend/src/utils/formatoMetricas.test.ts` → FAIL, implementar, → PASS
- [ ] **Step 3: Construir** la página y los componentes con `useApi` y las clases que ya usa `Semana.tsx`. Si `metricas.configurado` es false, se muestra un aviso arriba: «Falta BREVO_API_KEY en Railway: las métricas no se pueden leer». Sin enlace en la barra de navegación: se llega por el selector.
- [ ] **Step 4: Verificar en el navegador** (`preview_start` del frontend con el backend local): `/semana` enseña el selector y lleva a `/newsletter`. Ahí sale el correo de prueba de la tarea 5, el aviso de «sin clave» y ningún botón de Aprobar (en local no hay identidad). A 360 px, sin scroll horizontal. Captura.
- [ ] **Step 5: Commit** `feat(newsletter): página /newsletter y selector LinkedIn / Newsletter`

### Task 7: Conversiones por correo

**Files:**
- Modify: `backend/src/services/metricasNewsletter.ts` (`conversionesDeCorreo`)
- Modify: `backend/src/routes/newsletter.ts` (añade `conversiones` a cada enviado)
- Test: `backend/src/services/metricasNewsletter.test.ts` (añadir)

**Interfaces:**
- Consumes: `leerDemos(desde, hasta)` y `leerLeads` de `conversionesWeb.ts`, `leerEventos` de `conversionesEventos.ts`
- Produces: `conversionesDeCorreo(c: {utm_campaign, utm_source}, demos: ResumenDemos, eventos: EventoResumen[]): {demos: number|null; inscritos: number|null}`

- [ ] **Step 1: Write the failing test** con un `ResumenDemos` de ejemplo: `por_campana['correo-13-kaixito-objecion'].solicitudes = 0` → `demos: 0`. Un correo sin `utm_campaign` → `demos: null`. Inscritos: se buscan en `csv.origenes[*].detalle` con la clave `utm_source` del correo. Antes de escribir el test, mira en un evento real cómo se llaman las claves de `detalle`, y fíjalo en el test.
- [ ] **Step 2: Run** → FAIL. **Step 3:** implementar. **Step 4:** → PASS
- [ ] **Step 5: Commit** `feat(newsletter): reuniones e inscritos por correo`

### Task 8: El script cuenta igual y la operación queda escrita

**Files:**
- Modify: `scripts/metricas-brevo.py` (apertura real, personas únicas sin internos ni bajas, marca de primer minuto, listas de `recipients.lists` si no se pasa `--listas`)
- Create: `scripts/test-metricas-brevo.py` (lee `backend/src/services/fixtures/brevo-campana.json` y comprueba los mismos números que la tarea 2)
- Modify: `CLAUDE.md` (sección de email: los correos se suben con `neety_newsletter_publicar`, se aprueban en `/newsletter` y se vinculan con `neety_newsletter_vincular` al crear la campaña)
- Modify: `docs/skills/email-marketing.md` (una línea en el flujo de envío con lo mismo, con fecha)

- [ ] **Step 1:** `python3 scripts/test-metricas-brevo.py` → FAIL
- [ ] **Step 2:** Adaptar el script → PASS. Mismo resultado que `metricasNewsletter.test.ts` sobre el mismo fixture.
- [ ] **Step 3: Commit** `feat(newsletter): el script de métricas cuenta como el panel; doc de la operación`

### Task 9: Histórico de los 14 correos enviados

**Files:**
- Create: `scripts/cargar-historico-newsletter.py` (lee `docs/skills/corpus-correos-enviados.md` y una tabla clave → `brevo_campaign_id` sacada de `historial-newsletter.md`, y genera `newsletter-historico.json`)

- [ ] **Step 1:** Generar el JSON y revisar a mano que cada uno de los 14 tiene asunto, cuerpo y campaña. El que no cuadre se deja fuera y se apunta.
- [ ] **Step 2:** Con el backend desplegado, publicarlos con `neety_newsletter_publicar` (estado `borrador`) y vincular cada uno con `neety_newsletter_vincular {clave, campaign_id, historico: true}`, que pasa a `enviado` sin aprobación (tarea 1). Añade el parámetro `historico` a la tool de la tarea 5.
- [ ] **Step 3: Verificar:** `neety_newsletter_refrescar` y, en `/newsletter`, la tabla de enviados muestra los 14 (o los que se cargaron). Las cifras del correo 13 coinciden con `python3 scripts/metricas-brevo.py --quien`.
- [ ] **Step 4: Commit** `chore(newsletter): carga del histórico`

**Requisito de despliegue (no es una tarea de código):** una persona pone `BREVO_API_KEY` en el Railway del analizador. Hasta entonces, las tareas 3, 7 y 9 se prueban con el `fetcher` falso y la página muestra «sin clave».
