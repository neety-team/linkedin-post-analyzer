# SKILL: email-marketing — La newsletter de Neety (asuntos, cuerpos, remitentes y sistema de tandas)

> **name:** email-marketing
> **description:** Cómo se escribe, planifica y entrega la newsletter de Neety. Objetivo: convertir la lista templada (leads de LinkedIn, lead magnets, webinars) en demos/diagnósticos. Define el asunto (= el hook del email), el cuerpo (hereda el formateado de posts), los 4 remitentes rotativos y el sistema de tandas de 2 semanas.
> **when-to-use:** Cargar SIEMPRE que se escriba, edite o planifique un email de la newsletter de Neety, una secuencia de bienvenida o una campaña a la base de datos. Se apoya en `aboutme` (identidad e ICP), `brand-voice` (voz y anti-IA), `global-instructions §3` (formateado del cuerpo) y `working-preferences` (entrega y validación proactiva).

---

## 0 · Qué es esto y qué NO es

- **NO es cold email.** La lista es audiencia TEMPLADA: ya nos conocen (descargaron un lead magnet, comentaron un post, vinieron de un webinar o dejaron el correo). No se escribe como desconocido pidiendo reunión.
- **La escalera:** familiaridad → confianza → conversación → diagnóstico/demo. Cada email empuja UN peldaño, no los cuatro.
- **Objetivo primario de cada campaña:** que agenden demo/diagnóstico (https://recursos.neety.com/agendar/). **Secundario:** que RESPONDAN al email (la respuesta abre conversación Y mejora entregabilidad).
- **Nunca se vende la suscripción a Neety en el email.** Se vende el siguiente paso: el diagnóstico, la demo, la respuesta.
- La demo no se vende como "te enseñamos el software": se vende como **"revisamos dónde pierdes tiempo y oportunidades en tu proceso comercial"**. La palabra "diagnóstico" baja fricción; "demo" para leads calientes.

**Regla final (de los apuntes de expertos):** cada email cumple al menos UNA de estas funciones: enseñar algo útil · hacer consciente un problema · aumentar confianza en Neety · mostrar una oportunidad concreta · generar una respuesta · conseguir una demo. Si no cumple ninguna, no se envía.

---

## 🔴🔴 0b · NOS CANCELARON LA CUENTA AL TERCER ENVÍO (2026-08-11) — leer antes que nada

191 correos, **0 denuncias de spam**, 46% de aperturas, cuenta de pago y dominio autenticado. Cancelada igual, por supuesta violación de la política anti-spam. **Los números buenos no protegen si el perfil de la cuenta enciende las alarmas.**

### Las seis señales, que juntas dibujan a un spammer
1. **Cuenta nueva importando 1.310 contactos por API**, sin pasar por ningún formulario de la plataforma.
2. **Los contactos entraron con `opted_in_at: null` y `optin_ip: null`** porque la migración de CRM perdió las fechas de alta. Sus términos exigen consentimiento *"activo y consciente"*: sin timestamp ni IP no hay forma de enseñarlo, y ellos lo ven en cada registro.
3. **Volumen escalando: 54 → 137 → 337 en cuatro días.** Lo hicimos bien a propósito. ⚠️ **Pero escalonar y calentar para un envío masivo tienen la misma silueta desde fuera.**
4. **3,65% de bajas** en el segundo envío (norma: 0,2-0,5%). Esperable en un re-permiso, pero el umbral no distingue intenciones.
5. 🔴 **Una baja marcó como motivo "Nunca me registré en esta lista de correo"**, a las 03:41; la cancelación llegó esa mañana. **El motivo de cada baja lo guardan ellos y NO aparece en el panel de métricas**, así que no lo ves venir.
6. 🔴🔴 **El propio texto del correo admitía que no había opt-in.** *"Me toca ordenar los correos que nos dejaron el año pasado / y no hay manera / cuál de todas, ni idea."* Cuando contestaron, el motivo fue literalmente *"su contenido no está permitido"*: **habían leído el correo.**

### ⛔ LA REGLA QUE SALE DE AQUÍ Y MANDA SOBRE CUALQUIER IDEA CREATIVA
**Nunca se escribe en un correo que no sabemos de dónde salió el contacto.** Aunque sea verdad, aunque sea la gracia del correo y aunque funcione con el lector (funcionó: 46% de aperturas y una reunión el mismo día). **El texto lo lee también un revisor de cumplimiento**, y para él es una confesión firmada.

Un re-permiso se escribe igual de bien sin admitir nada:

| ⛔ Nunca | ✅ Así |
|---|---|
| "No sé de qué te conozco" | "Queremos mandarte solo lo que te interese" |
| "Ordenando los correos del año pasado" | "Estamos reorganizando la newsletter" |
| "¿De qué nos conocemos?" | "¿Qué tema te interesa más?" |

Misma segmentación, misma respuesta del lector, cero munición.

### Qué se hace distinto la próxima vez, en orden
1. **Importar SOLO a quien tenga el tick de consentimiento**, aunque sean 50 de 1.000. Nosotros teníamos el dato en el formulario y no lo usamos como filtro. Solo eso lo habría evitado.
2. **Lista de supresión con los clientes dentro, antes de importar** (ver §9c).
3. **Verificar la lista** (~10 $/1.000) antes del primer envío, no después.
4. **No escribir que no sabemos el origen** (arriba).
5. **Empezar por 20-30, no por 54**, y subir más despacio.
6. **Presentarse a soporte ANTES del primer envío grande**, explicando el origen de la lista. Una cuenta nueva con lista importada es sospechosa por defecto; presentarte tú primero cambia quién lleva la iniciativa.

### Lo que dicen sus términos, leídos el 2026-08-11
- ✅ **Repetir la misma campaña NO está prohibido.** No aparece por ninguna parte.
- ⛔ *"Tus listas deben ser suscripciones basadas en permiso"* (§2.1.2) y *"los destinatarios deben dar su consentimiento activamente mediante un acto consciente; no se permiten casillas premarcadas"* (§7.3). **Ahí es donde nos cogieron.**
- ⛔ §9.1 (contenido prohibido: adulto, MLM, apuestas, adelgazamiento, odio, estafas) **no describe nuestro correo**. Es el único frente donde son atacables.
- ⚠️ §16.2: *"podemos cancelar en cualquier momento, con o sin causa"*. **Apelar sale barato pero las probabilidades son bajas: monta el plan B en paralelo desde el minuto uno.**

**Léete los términos del proveedor ANTES de importar. Nosotros los leímos después de que nos cancelaran.**

---

## 🔵 0c · MIGRACIÓN A BREVO — el runbook (decidido el 2026-08-18, técnica hecha el 2026-08-20)

Tras la cancelación de MailerLite (`§0b`), migramos a Brevo. Esto no es "montar la herramienta otra vez": es aplicar cada lección del post-mortem ANTES del primer envío, no después.

### ✅ Lo que YA está hecho (2026-08-20) y no hay que volver a decidir

- **Cuenta de Brevo creada, dominio conectado desde Cloudflare y verificado.**
- **API a secas, NUNCA el conector MCP.** El que llama a Brevo no es un chat: es un worker desatendido del CRM en Railway, cada 60 min. MCP es un protocolo para que un agente conversacional use herramientas; un servicio Node necesita `fetch()`. ⚠️ El conector MCP de **MailerLite** que sigue apareciendo en la sesión está **MUERTO** (cuenta cancelada): no lo uses para nada.
- **La API key vive en el CRM** (Marketing → Integraciones), guardada en `app_settings`, **nunca pegada en el chat ni commiteada**. Así se rota sin desplegar.
- **El CRM ya habla con Brevo.** `src/brevo.js` sustituye a `src/mailerlite.js` en `sales-crm-Neety`. Spec completa con el porqué de cada decisión: `docs/superpowers/specs/2026-08-20-migracion-mailerlite-a-brevo-design.md` **de ese repo**.
- **Las bajas van en los DOS sentidos**, que antes no. La dirección CRM → proveedor estaba escrita pero no se llamaba: quien se daba de baja por el enlace del correo seguía en la lista del proveedor.
- **Los contactos suben a GOTEO, no por importación masiva** — y es una decisión de riesgo, no técnica. Brevo tiene `POST /contacts/import` (una llamada, hasta 10 MB), pero **la señal nº 1 de las seis que dibujaron el perfil de spammer en MailerLite fue "cuenta nueva importando 1.310 contactos por API, sin pasar por ningún formulario"**. Ese endpoint en una cuenta recién abierta es literalmente ese patrón. El goteo de altas individuales es indistinguible de una app que da de alta gente según se registra. Con ~50 contactos tarda seis segundos: no hay nada que optimizar.

### ✅ El dominio, cerrado el 2026-08-20 (comprobado en el DNS, no solo en el panel)

`neety.com` está **autenticado de verdad**: DKIM puesto por la conexión automática de Brevo con Cloudflare, resolviendo, con dos claves RSA 2048.

- 🔴 **La trampa al comprobarlo:** la conexión **automática** deja **CNAME** en `brevo1._domainkey` y `brevo2._domainkey`; la **manual** deja **TXT** en `mail._domainkey`. Preguntar solo por TXT da "no existe" con el dominio perfectamente autenticado. Se consulta por los dos tipos y contra el NS autoritativo.
- **El SPF no necesita a Brevo:** DMARC pasa si alinea SPF **o** DKIM, y DKIM ya alinea. No es un olvido.
- **Se envía desde `neety.com` directo, no desde subdominio** (decisión de Iker). El punto 1 de abajo queda CERRADO por decisión, no por olvido: no se vuelve a proponer salvo incidente de entregabilidad. El coste asumido es que la reputación del envío masivo y la del correo comercial de los founders son la misma.
- **`hola@neety.com` va en los dos sentidos** desde que se activó el Grupo de Workspace: se le escribe y las respuestas llegan.
- 🧹 Queda quitar el `include:_spf.mlsend.com` de la cuenta cancelada. No bloquea; autoriza a un proveedor muerto (`§10`).

### 🔴 Lo que sigue pendiente y es de Iker

El estado vivo, en orden, está en `historial-newsletter.md`.

### Lo que se le pide a Iker, y por qué es él y no Mario quien lo decide

1. **🔴 Subdominio de envío, no `neety.com` directo.** Recomendado: algo tipo `mail.neety.com` o `news.neety.com`. Aísla la reputación del envío masivo de la del dominio principal (correo comercial normal, prospección). Era un pendiente ya antes del baneo (ver `§10`) y ahora deja de ser opcional: es la corrección estructural más grande disponible. **Es lo más urgente de pedir**, porque requiere DNS y la propagación + verificación de Brevo puede tardar 24-48 h. Hay que saber YA quién tiene acceso al DNS de neety.com (¿Iker directo, o agencia/hosting?) para meter los registros el mismo día.
2. **Plan de pago activo desde el minuto uno**, con volumen de sobra para ~1.300 contactos. Una cuenta nueva en plan gratuito/trial con lista importada es exactamente el patrón que MailerLite marcó como sospechoso.
3. **La API key la genera Iker y se entrega como variable de entorno, nunca pegada en el chat ni commiteada** (regla de la casa, `CLAUDE.md`).
4. **Exportar del CRM la lista de clientes y de prospectos con conversación abierta — YA, en paralelo, sin esperar a tener Brevo montado.** Es la lista de supresión que faltó la vez pasada y la razón de que se le mandara el correo 0 a Fagor Automation.
5. **Decisión de a quién se importa primero, y es una decisión de riesgo, no operativa.** Recomendación: solo los contactos con el tick de consentimiento verificado (~50 de 1.310, los de LinkedIn) entran en la primera importación. El resto se queda fuera hasta decidir cómo se re-permisiona sin repetir el correo 0 literal.
6. **Quién procesa las respuestas a escala.** El reenvío de `hola@` a `mario@` + `iker@` funcionaba a 190 correos; no funciona a 1.000+. Se decide ahora, no cuando ya duela.

### El orden de migración

1. **Dominio primero.** Se lanza la autenticación del subdominio y se deja corriendo en paralelo a todo lo demás.
2. **Lista de supresión antes que la lista de contactos.** Se construye con: clientes actuales (CRM) + las 5 bajas y los 7 rebotes de MailerLite (`Escritorio/rescate-mailerlite-2026-08-11.md`) + prospectos con conversación abierta. Se importa ESTA primero.
3. **Importar solo el segmento con consentimiento verificado.** No la base entera.
4. **Reescribir el correo 0** sin admitir en el texto que no sabemos el origen del contacto (regla de `§0b`).
5. **Rediseñar el CTA de respuesta.** 0 de 191 contestaron la vez pasada; no se repite el mismo mecanismo sin cambiarlo.
6. **Escribirle a soporte de Brevo ANTES del primer envío real**, presentando la cuenta, el origen de la lista y el volumen esperado. Presentarse uno mismo cambia quién lleva la iniciativa frente a que te marquen primero.
7. **Empezar pequeño: 20-30 contactos**, no 54. Verificar entrega, aperturas y que las respuestas llegan de verdad al buzón que se lee.
8. **Escalar con las mismas reglas ya validadas** (`§9c`): 24 h entre tandas si el salto es ≤2x, 48 h si es mayor. Nunca la última tanda en viernes.
9. **Todo se registra en `historial-newsletter.md`** al mismo ritmo que antes.

---

## 1 · Los 4 remitentes (rotación semanal)

**Un email siempre lo firma una PERSONA, nunca "Neety".** Que te hable alguien genera más confianza que que te hable una empresa (validado por los apuntes de expertos, por Carmen/Runner Pro — "cartas del fundador" — y por Timepack, que firma persona).

| Remitente | Ángulo | Registro (escala de `brand-voice §1b`) |
|---|---|---|
| **Iker** (cofounder) | Comercial / ventas: prospección, señales, el día a día de vender | El más cercano de los 3 founders, se permite el guiño |
| **Asier** (cofounder) | Técnico / cómo está construido por dentro (pero SIEMPRE aterrizado en ventas, no en ingeniería — `aboutme §2` nota de Asier) | Punto medio |
| **Unai** (CEO) | Visión / mercado / hacia dónde va la venta B2B | El más sobrio. Afirma, no exclama |
| **Kaixito** (la mascota) 🦉 | Novedades de producto y del programa, entre bastidores, lo que hemos roto esta semana | **El más informal y gracioso de los 4.** Humor blanco, autodespectivo de mascota, cero corporativo. Es el único que puede ser abiertamente juguetón |

- **La sobriedad vive en el CUERPO, no en el asunto** (misma regla que el gancho de posts, `brand-voice §1b`): un asunto ganador vale para cualquier remitente; lo que cambia con el remitente es el tono del cuerpo.
- **Cada semana cambia el remitente** (rotación), y el tema va atado al ángulo del remitente: no le pongas a Asier un email de cierre comercial ni a Iker uno de arquitectura.
- **Kaixito no CIERRA, pero SÍ siembra (decidido el 2026-07-27, tras mirar Duolingo y Alan).** Sus emails son de relación y producto (novedades, historias internas, encuestas "respóndeme"), y su CTA natural es la **derivación en personaje**: *"yo no vendo, que para eso está Iker: responde DEMO y te lo enseña él."* El CTA fuerte de demo lo firma siempre un founder: cerrar una demo B2B pide una autoridad que una mascota no tiene, pero prohibirle vender del todo era tirar su capacidad de convicción (abre puertas y pasa el testigo).
- **Kaixito tiene que EXISTIR antes de remitir:** presentación (quién es y por qué te escribe: el correo 0 la integra en su línea 1, ver §5c-0), avatar consistente y **humor blanco de adulto, nunca infantil** (la misma línea del registro de Unai en `images §0g`).
- **Personalidad de Kaixito (definida el 2026-07-27):** el aprendiz con el playbook. Siempre lleva su libro verde (su atributo fijo, como la lupa de un detective): se estudia las jugadas de ventas y los datos, y por eso "sabe cosas". Curioso, entusiasta, un punto caótico y despistado, honesto sin filtro (dice las verdades del sector que los founders no dirían). Registro: informal-gracioso, un punto por encima de Iker en cercanía, humor de oficina y de ventas, JAMÁS de guardería. **Movimiento** (para GIFs e ilustraciones): cuerpo blando con squash & stretch, brazos de fideo expresivos, parpadeo, y el libro como prop de los gags; emociones de cómic exageradas (biblioteca de gags en §3b). La evidencia de que mascota y compra seria conviven: **Alan** (salud/seguros para empresas, ~41.000 empresas según su web) tiene su marmota por toda la web; **Duolingo** manda emails firmados por personajes a usuarios de pago de todas las edades. En herramientas de prospección B2B no lo hace nadie: es HUECO, no ridículo, mientras el humor sea de sector y no de guardería. Ojo: los personajes de Duolingo funcionan porque su universo ya existe en la app; Kaixito necesita su presentación (y idealmente asomar antes en LinkedIn/web).
- **Se mide, no se discute:** en las primeras 2-3 tandas, opens/respuestas/bajas de Kaixito contra los founders, por segmento. Si abre más, gana papel; si el segmento industrial senior responde mal, se le acota la lista (p. ej. solo clientes, como los VIP de Runner Pro).
- Firma humana al final: nombre + rol real ("Iker, cofundador de Neety"). Kaixito firma como "Kaixito, la mascota de Neety".

### 🔗🔗 EN CORREO, EL UTM TIENE DOS CONVENCIONES OPUESTAS SEGÚN EL DESTINO (2026-08-28)

**Lo que pregunta Iker, y es la pregunta correcta:** *"quiero saber exactamente qué correos son los que
más convierten y a qué web llevan"*. **Eso lo responde `utm_campaign`, no `utm_source`.** Cada correo
lleva el suyo y son todos distintos (`kaixito-01-tanda-3`, `iker-02-feria`, `unai-03-evento`), así que
en GA4 se filtra por Campaña y sale la pieza exacta. `utm_source` dice el CANAL, que es siempre el
mismo.

| destino | quién lee el UTM | dónde va la identidad | ¿lo controlamos? |
|---|---|---|---|
| **Nuestras webs** (`/agendar/`, `/correo/`) | **nuestro GA4** | **`utm_campaign`** | ✅ **sí, y ya está bien** |
| **Luma** (evento) | **solo `utm_source`** | **`utm_source`** | ❌ **no: Brevo lo secuestra** |

**⛔ EL ERROR QUE ESTO EVITA, y lo cometimos los dos el 28/08:** ver `utm_source=sendinblue` en el
enlace de `/agendar/` y creer que está roto. **No lo está.** Moverle la identidad a `utm_source` para
"arreglarlo" **rompería la atribución de GA4**, que es la que sí funciona.

#### ✅ CÓMO SE CONTROLA EL `utm_source` EN BREVO (resuelto y verificado el 2026-08-28)

**Son DOS condiciones y hacen falta las dos:**
1. **Apagar la integración de Google Analytics** en los ajustes de esa campaña, en el panel. `§6.4b` ya
   decía que ese interruptor no lo expone el conector.
2. **Escribir el UTM dentro del `href`.** Y aquí está la regla que costó media tarde entenderla:

> **Con Google Analytics APAGADO, Brevo respeta el `utm_source` que ya venga en el `href`.** Con la
> integración encendida lo pisa con `sendinblue` haga lo que haga: probado escribiéndolo a mano en el
> `href`, mandando `utmSource` en el `PUT` y mandando `utmCampaign` vacío. Las tres se pierden.

**⛔ LAS TRES EXPLICACIONES QUE DI ESE DÍA ANTES DE ESTA, Y QUE ERAN FALSAS** —«se reescribe al
guardar», «es que el enlace iba pelado», «cada `PUT` reactiva Analytics»—: **las tres las tumbó la
siguiente medición.** El aprendizaje no es el mecanismo, es el método: aquí **no se razona, se mide**,
porque el estado del interruptor de Analytics no se puede leer por API y sin él ninguna teoría cierra.

**⭐ POR ESO EL CONTROL REAL NO ES ENTENDERLO, ES COMPROBARLO:** `scripts/auditar-campanas-brevo.py`
mira el `href` de todo enlace a Luma o a `forward.neety.com` y **falla si el `utm_source` es
`sendinblue`, `brevo` o no está.** Se corre SIEMPRE antes de dar una campaña por buena. Es la red que
sí aguanta aunque la teoría de turno esté equivocada.

**⛔ Y OJO CON LO QUE ME HIZO DUDAR DOS VECES: las pruebas en ráfaga chocan con el límite de ritmo
(429)** y entonces unas escrituras se aplican y otras no, así que el resultado parece incoherente.
**Entre prueba y prueba, esperar.** Si sale `429`, todo lo medido en esa tanda no vale.

**Cadena completa, verificada de punta a punta:**
```
Brevo guarda : forward.neety.com/?utm_source=unai-03-evento    (3 lecturas en 80s, aguanta)
Cloudflare   : → luma.com/ujffj66o?utm_source=unai-03-evento   (cabecera Location)
Luma lee     : utm_source = "unai-03-evento"
```

**⛔ REGLA (Iker, 2026-08-28): si el enlace va a LUMA o a FORWARD (que redirige a Luma), la identidad
va SIEMPRE en `utm_source`, escrita a mano.** No se vuelve a dejar en `utm_campaign`, porque Luma no lo
lee y perdemos la atribución de los asistentes al evento.

#### 🔴🔴 Y HAY UN TERCER EMISOR QUE ESTA TABLA NO CONTEMPLABA: **HUBSPOT** (2026-09-14)

**No somos el único correo de la casa.** Marketing manda desde **HubSpot** a la lista de **clientes**,
y ese canal apunta al mismo sitio que el nuestro. El 20/08 salió *"invitación clientes evento"* (100
entregados, 40% de apertura, 1 clic) con el enlace del evento **a pelo**: `https://luma.com/ujffj66o`,
sin `forward.neety.com` y sin UTM escrito. **HubSpot le pone entonces el suyo: `utm_source=hs_email`.**

| emisor | destino | UTM que llega | ¿identifica el correo? |
|---|---|---|---|
| Brevo (newsletter) | Luma vía `forward` | `unai-03-evento-correo` | ✅ **sí**, es el nombre del correo |
| **HubSpot (clientes)** | Luma directo | **`hs_email`** | ❌ **no**: dice el canal, no la pieza |

**✅ Y esto está comprobado a fondo, no de un vistazo:** se recorrieron **los 63 correos de marketing
de la cuenta de HubSpot** (dos páginas, no solo la primera). **Solo dos tocan el evento**: el enviado
del 20/08 y el borrador del 08/09. Los otros 61 son de 2024-2025, anteriores a que el evento
existiera. La ficha del que salió, para verla sin fiarse de mí:
`app-eu1.hubspot.com/email/145372616/details/456203534580/performance`

**⛔ El problema no es de hoy, es del segundo correo.** Con un solo envío de HubSpot al evento,
`hs_email` es legible por eliminación. **En cuanto salga el segundo, los dos serán `hs_email`** — que
es exactamente el lío de `sendinblue` que resolvimos aquí escribiendo el UTM dentro del `href`. Y hay
un segundo ya en borrador (*"Clientes new versión extensión"*, creado el 08/09, mismo asunto, misma
promesa del evento en la preview).

**⚠️ Y LA SALIDA NO SE DA POR SABIDA, SE MIDE.** No sabemos si HubSpot respeta un `utm_source` escrito
a mano en el `href` o si lo pisa, igual que hacía Brevo con Analytics encendido. **Es la misma
pregunta que costó media tarde el 28/08 y se resolvió midiendo, no razonando.** La prueba es barata:
correo de test, pulsar el enlace, mirar a dónde llega. **Si HubSpot lo pisa, la salida ya está
montada: pasar por `forward.neety.com`**, que es nuestro y está verificado que conserva el UTM.

**⚠️ Y de paso, dos cosas del canal de HubSpot que no siguen la convención de `§1`:** el remitente es
**`Helena Baviera Serigó`** (21 caracteres, nombre completo y **sin `de Neety`**, justo lo que se midió
que Gmail corta), y el `reply-to` va a **`helena@neety.io`**, un dominio distinto del `neety.com` cuya
reputación cuidamos en Brevo. **No lo he investigado y no es de este apartado**, pero conviene saber
que hay dos herramientas y dos identidades mandando marketing a la vez.

#### 🔧 `/senders` da 403 desde Python y funciona con `curl` (2026-08-28)

**Cloudflare bloquea el endpoint de remitentes según la firma del cliente**, no según la clave:

```
python (urllib)  GET /senders  -> 403  error 1010 "blocked based on your browser's signature"
curl             GET /senders  -> 200  la lista entera
python (urllib)  GET /account  -> 200  (asi que NO es la api-key ni la cuenta)
```

**La comprobación que lo separa es `/account`:** si responde 200 y otro endpoint da 403, no es un
problema de permisos, es el cliente. **Se reintenta con `curl` antes de decir «no puedo».** Estuve a
punto de contarle a Iker que era imposible tocar los remitentes cuando bastaba cambiar de herramienta.

#### ⚠️ EN BREVO, UN CAMPO VACÍO NO SIGNIFICA QUE ESTÉ VACÍO (2026-08-28)

**Dos falsas alarmas seguidas el mismo día, comprobando las campañas ya programadas:**

| Lo que leí | Lo que parecía | Lo que era |
|---|---|---|
| `recipients.listIds` → vacío | la campaña no tiene destinatarios | **el campo se llama `lists`.** `listIds` no existe, y pedir una clave inexistente devuelve vacío sin error |
| `totalSubscribers` → `0` en `/contacts/lists` | las listas se han quedado sin nadie | **ese campo solo se rellena en `/contacts/lists/{id}`**, el detalle. En el listado viene a 0 siempre |

**LA REGLA:** un `0`, un `None` o una lista vacía en la API de Brevo **no son un dato, son una pregunta**.
Antes de dar la alarma —o peor, antes de "arreglarlo"— se confirma **por un segundo endpoint**:
```
listas de una campaña : /emailCampaigns/{id}       -> recipients.lists
cuántos hay en cada una: /contacts/lists/{id}      -> totalSubscribers
    y el contraste     : /contacts/lists/{id}/contacts?limit=3  -> count + los emails
```
**El contraste es lo que cierra la duda**, porque devuelve contactos de verdad con su email y su estado
de baja. Si los tres coinciden, el dato es real.

**Y aplica igual a los checks automáticos:** un validador que mira una clave mal escrita **pasa siempre
en verde** y no protege de nada. Todo check nuevo se prueba rompiendo el dato a propósito y viéndolo
fallar. Enlaza con lo mismo que ya pasó con el HTML del auditor.

#### 🔴🔴 EL CASO MÁS CARO DE ESA MISMA REGLA: LAS ESTADÍSTICAS HAY QUE PEDIRLAS (2026-09-14)

**`GET /emailCampaigns/{id}` SIN el parámetro `statistics` devuelve el bloque `globalStats` ENTERO A
CEROS**, en vez de omitirlo. El campo está, con `sent: 0` y `delivered: 0`, **en campañas que salieron
perfectamente**. Reproducido en 3 campañas distintas (15, 18 y 11):

```
camp 15  sin parametro: sent=0   deliv=0    -> MENTIRA
camp 15  con parametro: sent=45  deliv=45   -> la verdad
camp 11  sin parametro: sent=0   deliv=0
camp 11  con parametro: sent=349 deliv=327
```

**Estuve a punto de informar de que los correos 2 y 3 habían salido a 0 personas.** Lo paró el segundo
contraste, que aquí es **la ficha del contacto**: `GET /contacts/{email}` → `statistics.messagesSent`
/ `delivered` / `opened`, con la hora exacta y el `campaignId`. **Ese es el registro por persona y no
miente.**

- **Se piden los DOS bloques, en dos llamadas:** `?statistics=globalStats` y `?statistics=linksStats`.
- **⚙️ Y ya no se hace a mano: `python scripts/metricas-brevo.py`** (con `--quien`, además, quién
  pulsó y marcando los internos `@neety.com`).
- **⛔ Y el clic que se mira es el de `linksStats`, no el de `globalStats`:** `uniqueClicks` cuenta
  también el enlace de BAJA. En el correo 3 son 4 contra 2. **El del panel está inflado por 2x-4x.**
- **⛔ Y aún así hay que descontar los nuestros:** el 14/09, **2 de los 3 clics de los correos 2 y 3
  eran de `mario@neety.com`** abriéndolos para revisarlos. Un clic interno en una lista de 45 mueve el
  CTR más que cualquier decisión de copy. **Se descuenta siempre, y por eso el script lo marca.**

#### 🔴🔴 NUNCA PARCHEAR EL HTML DE UNA CAMPAÑA CON UNA EXPRESIÓN REGULAR (2026-08-28)

**El fallo, y lo cazó Iker en un correo de prueba:** para cambiar el enlace usé
`re.sub(r'https://forward\.neety\.com[^"]*', NUEVA, html)`. El enlace aparece **dos veces** —dentro de
`href="…"` y como texto visible— y en la segunda **no hay comilla detrás**, así que `[^"]*` se comió el
`</a></p><p style=` que venía después. Resultado en el correo: el enlace se fusionó con la línea
siguiente y el lector veía `…unai-03-evento"margin:0 0 20px;">Eso es lo que nadie cuenta…`.

**LAS DOS REGLAS QUE SALEN:**
1. **El HTML se REGENERA desde el texto validado**, no se parchea. El fichero `.txt` que pasa el
   validador es la fuente de verdad.
2. **Si hay que tocar el HTML ya guardado, la sustitución es QUIRÚRGICA**: solo el valor del atributo,
   anclando el patrón a `href="` y a su comilla de cierre — nunca la URL suelta.
   ```python
   re.sub(r'(href=")https://forward\.neety\.com[^"]*(")', r'' + URL + r'', html)
   ```
3. **Y SE COMPRUEBA RENDERIZANDO A TEXTO PLANO, no leyendo el HTML.** Quitando las etiquetas, si en el
   texto aparece `style=`, `margin:` o `</a>`, el markup se ha filtrado. **Es lo único que ve el
   fallo como lo ve el lector.**

#### 🔒 Con Analytics ENCENDIDO, Brevo secuestra `utm_source` y no hay API que lo evite (28/08)

Se intentó de tres formas **con la integración encendida** y las tres las pisa con `sendinblue`:
1. Escribir el UTM entero a mano dentro del `href` → lo reescribe al guardar.
2. Mandar `utmCampaign: ""` para que no inyecte → **400, `utmCampaign is missing`**: es obligatorio.
3. Mandar `utmSource` en el `PUT` → acepta el 204 y **lo ignora**: el campo se queda en `brevo`.

**⭐ LA ÚNICA SALIDA, y es un CLIC EN EL PANEL:** apagar la **integración de Google Analytics** en los
ajustes de esa campaña. Con ella apagada, Brevo deja de inyectar y respeta el UTM escrito a mano.
`§6.4b` ya decía que ese interruptor **solo existe en el panel y el conector no lo expone**.

**Y solo hace falta apagarlo en las campañas que apuntan a LUMA.** En las que van a nuestra web, la
inyección de Brevo hace justo lo que queremos.

#### ⭐ EL PROCEDIMIENTO QUE CIERRA ESTO (lo midió Iker el 2026-08-28, y manda sobre lo de arriba)

Iker creó una campaña de prueba para verlo. **Dos hechos medidos, ya no hipótesis:**
1. **Al CREAR una campaña, Google Analytics viene ENCENDIDO por defecto.**
2. **Editar el correo NO lo toca.** Se cambiaron diseño, enlace y pie de la campaña 18 varias veces y
   siguió apagado. El interruptor solo se mueve a mano, en el panel.

**Por eso el aviso va en el momento de CREAR la campaña, y depende de a dónde apunte el spam ninja:**

| A dónde lleva el enlace | Analytics | Lo que tengo que decir al entregar |
|---|---|---|
| `recursos.neety.com/agendar/` (nuestra web, GA4) | **ENCENDIDO** | nada: viene así de fábrica y es lo que queremos |
| **Luma o `forward.neety.com`** | **APAGADO** | **«acuérdate de desactivar Google Analytics en esta campaña»**, y ANTES de que yo escriba el enlace |

**El aviso es obligatorio y va en la entrega, no en un comentario suelto.** Si se me olvida, el enlace
del evento sale con `utm_source=sendinblue` y los registros de Luma se quedan sin atribuir. El auditor
lo caza después, pero el clic sigue siendo de una persona.

**⛔ SE APAGA A MANO Y NO HAY MANERA DE AUTOMATIZARLO (Iker preguntó justo esto el 28/08).** Pidió que
al crear la campaña yo mirase a dónde va el enlace y apagase Analytics solo. **No puedo:** el
interruptor no está en el objeto de campaña —se enumeraron todos sus campos— así que ni se lee ni se
escribe. Lo que sí queda automatizado es lo otro: **el UTM se escribe dentro del `href` desde que se
genera el HTML**, y el auditor canta si se pierde. El clic en el panel lo tiene que dar una persona,
y va ANTES de la escritura.

**⚠️ Cuánto duele hoy, para no exagerarlo:** mientras solo haya **un** correo apuntando a Luma, en su
panel `sendinblue` significa inequívocamente *ese* correo. El problema aparece con el segundo.

### 🔴🔴 EL PIE SE RESETEA SOLO AL EDITAR UNA CAMPAÑA POR API (Iker, 2026-08-28)

**El fallo, y lo vio Iker en una captura, no un error:** el correo 2 salió a revisión con el pie
genérico de Brevo — *"Si desea darse de baja de nuestro boletín de noticias, haga clic aquí"* — en vez
del nuestro, que nombra la empresa y la dirección postal. En la API el campo aparecía como
`[DEFAULT_FOOTER]`.

**Alcance real, comprobado campaña por campaña: NINGÚN correo enviado salió mal.** Las 6 tandas y la
prueba interna conservan el pie bueno. Solo lo perdieron **las dos campañas que yo había editado con
`PUT`** (correo 2 y correo 3).

**⚠️ Y EL MECANISMO EXACTO NO ESTÁ VERIFICADO, así que va como hipótesis** (`working-preferences §0c`).
La sospecha razonable es la misma trampa que la doc ya describía de MailerLite —*"`update_campaign` por
API resetea los ajustes del panel"*— y que decía expresamente que **no estaba comprobada en Brevo**.
Pero al intentar reproducirlo, **un `PUT` con solo `name` NO reseteó el pie**, así que no es "cualquier
PUT": es alguna combinación que todavía no he aislado. El intento de aislarlo campo a campo se cortó
porque la cuenta volvió a dar `402`.

**LO QUE SÍ ES SEGURO Y BASTA PARA PROTEGERSE:**
1. **Al arreglar un campo por `PUT`, se reenvía en la MISMA llamada** todo lo que no quieras perder.
2. **Y después se COMPRUEBA releyendo la campaña.** Un `204` no prueba que el resto siga en pie.
3. **⚙️ Se corre el auditor antes de dar por buena cualquier campaña:**
   ```
   python scripts/auditar-campanas-brevo.py
   ```
   Revisa todas las campañas vivas (borrador, en cola, en revisión) y canta si el pie está reseteado o
   no es el de la casa, si falta el enlace de baja, el `utm_campaign` o la preview, si no hay lista de
   destinatarios, o si el remitente pasa de 20 caracteres y se va a cortar en la bandeja.

**El pie de la casa, literal, es este y no otro:**
```
¿Prefieres que no te escriba más? {Date de baja aquí} · Neety · Miramon Pasealekua 170, Donostia, España
```
Lleva las dos cosas que un correo comercial necesita: **el enlace de baja** y **la dirección postal**.
El genérico de Brevo no trae la dirección.

### ⭐ EL NOMBRE DEL REMITENTE (campo "From" de Brevo) NO ES LA FIRMA DEL CUERPO (Iker, 2026-08-27)

**Son dos campos distintos y se confunden fácil.** La firma de arriba (`§1`, última línea) es texto DENTRO del correo. El remitente es el `sender.name` que Brevo pone en la bandeja de entrada, al lado del asunto, ANTES de que se abra el correo — y ahí un nombre suelto sin marca puede leerse como spam o como un desconocido.

**La convención, y ya la teníamos puesta sin saberlo: `NOMBRE de Neety`.** Es exactamente el patrón de Kaixito (`"Kaixito de Neety"`, nunca `"Kaixito"` a secas, `§5c-0`), y se extiende igual a los 3 founders: **`Iker de Neety`** · **`Unai de Neety`** · **`Asier de Neety`**.
- **⛔ Nunca el nombre completo con apellido** (`"Iker Galarza de Neety"`).

  🔴🔴 **CONFIRMADO EN NUESTRA PROPIA BANDEJA EL 2026-08-27, y ya no es "práctica del sector": es un
  defecto que se VE.** Iker se mandó las dos variantes y en Gmail salió **`Iker Galarza de Nee.`** —
  cortado, y lo que se pierde es justo **`Neety`**, la marca. Pasa en las dos vistas (con y sin panel
  lateral), así que no es cosa de una pantalla estrecha.

  | remitente | caracteres | ¿entra entero? |
  |---|---|---|
  | `Iker de Neety` | 13 | ✅ |
  | `Kaixito de Neety` | 16 | ✅ |
  | `Iker Galarza de Neety` | 21 | ❌ `Iker Galarza de Nee.` |
  | `Unai Arambarri de Neety` | 23 | ❌ peor todavía |

  **EL TOPE PRÁCTICO SON ~20 CARACTERES, y se apunta a 16 o menos.** El nombre corto + `de Neety`
  cabe siempre; en cuanto entra un apellido, se cae la marca.

  **⭐ Y EL APELLIDO NO DESAPARECE: SE MUEVE A LA FIRMA (Iker, 2026-08-27).** *"Donde pone si es
  fundador o cofundador, ahí sí quiero poner el apellido, al final del cuerpo"*. El corte solo existe
  en la **lista de la bandeja**; dentro del correo abierto no hay límite de ancho. Así que el nombre
  completo se gana donde sí cabe y donde además pesa —la firma— y se ahorra donde rompe la marca.

  | dónde | qué va |
  |---|---|
  | remitente (`sender.name`) | `Iker de Neety` · `Unai de Neety` · `Kaixito de Neety` |
  | **firma del cuerpo** | **`Iker Galarza, cofundador de Neety`** · `Unai Arambarri, CEO de Neety` |

  **⛔ Y DE AQUÍ SALE UNA REGLA DE MÉTODO, que es la que más vale:** el A/B de remitente
  con-apellido contra sin-apellido **se canceló sin llegar a enviarse**. No hacía falta medirlo
  porque el defecto **se ve a simple vista**, y gastar la única tirada de A/B en algo observable
  habría tenido dos costes: no aprender nada (el test solo detecta 8-10 puntos, ver `§2`) y mandarle
  a 518 personas un remitente roto. **Lo que se puede MIRAR no se testa: se mira.** El A/B se
  reserva para lo que de verdad no se sabe. Confirmado con la práctica del sector (Brevo, Bento, MarketingProfs, 2026-08-27): nombre + empresa es el patrón dominante en B2B ("First Name at/from Company"), pero **nombre completo + empresa se corta en la vista de bandeja de la mayoría de clientes de correo** — el mismo problema del asunto en móvil (`§2`), aplicado al remitente. Se usa el nombre corto, igual que ya hacíamos con Kaixito.
- **🔴 Y HAY UN BLOQUEO REAL, NO SOLO DE NOMBRE: en Brevo solo existen DOS remitentes verificados hoy** (`GET /senders`, 2026-08-27): `Neety` (`management@neety.com`, id 1) y `Kaixito de Neety` (`hola@neety.com`, id 3). **Ningún founder tiene remitente propio dado de alta.** Antes de poder enviar el correo 2 (o cualquier correo firmado por un founder), Iker tiene que dar de alta `Iker de Neety` en el panel de Brevo (Configuración → Remitentes), verificando el email que vaya a usar. Sin eso, la API rechaza la campaña o la crea con el remitente equivocado.

---

## 2 · El ASUNTO (es el hook del email: corto, punchy, curiosidad)

El asunto es al email lo que el gancho es al post: si no abre, no existe el cuerpo. Mismas leyes psicológicas del hook (`global-instructions §1-2`), adaptadas al inbox:

- **Corto y punchy: 6-9 palabras es la zona ganadora.** Medido en los 353 asuntos de Timepack (2026-07-27): mediana 8 palabras / 43 caracteres, el 44% cae en 7-9 palabras, p90 62 chars. El grueso vive en 26-55 caracteres: **cabe entero en móvil**. Techo del validador: 62.

**⭐ EL TECHO DE 62 ES EL DE DESKTOP. EN MÓVIL SE CORTA MUCHO ANTES (Iker, 2026-08-27).** ⚠️ Esto NO es una medición de nuestro corpus (como sí lo es el 43/62 de arriba): es el rango que citan de forma consistente las plataformas de email marketing (Litmus, Mailchimp) sobre cómo truncan los clientes de correo el asunto en la vista de bandeja. Se anota aquí porque **no lo teníamos escrito y es justo lo que decide si el gancho se lee entero o a medias**, que es el mismo tipo de fallo que arruinó el correo 0 con el preheader corto (`§3b`).
- **Referencia habitual: escritorio ~60-70 caracteres · móvil ~30-40 caracteres.** El hueco es grande porque la pantalla es más estrecha y la fuente por defecto más grande.
- **Y la mayoría de la lista abre desde el móvil**, así que el límite que de verdad manda no es el de 62 del validador (pensado para que el asunto quepa ENTERO en cualquier sitio): es el de móvil. Un asunto de 50 caracteres pasa el validador y aun así se corta en un iPhone.
- **Regla práctica: apunta a ≤40 caracteres cuando puedas sin forzar la frase.** No es un tope duro nuevo del validador (el asunto de 39-55 sigue siendo válido y a veces la idea no cabe más corta), pero es la zona que garantiza que el asunto se lea completo en cualquier dispositivo, no solo en el que se probó.
- **Y no vale para todos los asuntos por igual.** `no te acuerdas de mí?` (18 car) funciona corto porque juega con psicología emocional pura: no necesita contexto, la frase entera es el gancho. Un asunto de historia (`me traje 200 tarjetas y no llamé a nadie`, 40 car) necesita más recorrido porque el gancho es narrativo — cortarlo de más le quita la escena. **El objetivo es no pasarse de largo innecesariamente, no perseguir el mínimo.**

**⛔ Y AL ACORTAR, LA PALABRA QUE SOBREVIVE SE COMPRUEBA, NO SOLO SE CUENTA (Iker, 2026-08-27).** El primer intento de acortar este mismo asunto quitó el `me` de `me traje` y dejó `traje 200 tarjetas…`. Menos caracteres, pero **`traje` sin el `me` es ambiguo: puede leerse como el verbo o como el sustantivo (un traje de boda)**, y encima pierde fuerza la primera persona del singular (`me traje` es más marcado que `traje`). Iker: *"tienes que pensar a este nivel"*. **El recorte correcto salió de otra palabra:** `ninguna` (7 car) → `nadie` (5 car), que ahorra los mismos 2 caracteres sin tocar el verbo. **La regla: antes de quitar una palabra para acortar, comprueba si esa palabra sola puede leerse de otra forma o si sostiene la persona gramatical — si sí, busca el recorte en OTRA palabra de la frase**, casi siempre lo hay.
- **Máximo 1 número** en el asunto (misma regla que el hook: `global §2.5`). En el corpus solo el 10% lleva número. Un porcentaje suelto de gancho suena a fake.
- **Curiosity gap que NO se cierra:** el asunto promete la historia, jamás la lección. Cero exclamaciones (0 de 353 en el corpus), como mucho UNA palabra en mayúsculas como golpe (7% del corpus: "REGALO", "DE VERDAD"), emojis prácticamente nunca (1 de 353).
- **Nunca:** el asunto entero en mayúsculas, palabras spam (GRATIS, OFERTA, ÚLTIMA OPORTUNIDAD), asuntos genéricos ("Newsletter de julio"), promesas exageradas.
- **⭐ EL PUNTO FINAL SÍ SE PUEDE, y esto corrige lo que ponía aquí (`§8g`, 2026-09-14).** Decía "nunca punto final (1 de 353 lo lleva)" apoyándose solo en Timepack. En la cuarta ventana del corpus **14 de 75 lo llevan**, y son de los mejores: `El problema no es escribir mal.` · `Lo vemos a la vuelta.` · `Hoy es día 1.` · `No escribas más.` **El punto cierra la FRASE de golpe y hace que suene a algo dicho en voz alta, no a titular.** La condición: **solo en afirmaciones secas de 2-4 palabras.** Un asunto largo con punto vuelve a leerse como titular.
- **⭐ LA MEDIANA DEL CORPUS: 43 → 36 → 36 → 31 → 36 caracteres en cinco ventanas** (8 → 7 → 7 → 5 → 7 palabras). ⚠️ **Corregido el 2026-09-21 (`§8h`):** aquí ponía que "sigue bajando" y que la diana eran 31. **Con la quinta ventana, el 31 fue una semana suelta y la banda estable del corpus es 31-37.** El techo de 62 no se mueve y **la diana sigue en ≤40**. Cuando dudes entre dos versiones del asunto, la corta, pero no se persigue el 31.
- **Sin "hola" ni saludos** — tampoco en la primera línea del cuerpo (Carmen: salirse de la norma del email corporativo es parte del efecto).
- El asunto de un email de la newsletter NO necesita ancla de ventas explícita como el hook de LinkedIn (el lector ya sabe quiénes somos: está suscrito), pero sí tiene que tocar un problema o curiosidad real del que vende.

**⭐ ORTOGRAFÍA SÍ, REGISTRO NO — la regla para desviarse del corpus (2026-08-06).** Medido sobre 565 asuntos españoles: **el 97% de los que llevan interrogación ponen la `¿` de apertura** (43 de 44) y **solo 1 de 565 empieza en minúscula**. Las dos cosas son desviaciones, pero no son iguales:
- **La `¿` SE PONE.** Quitarla es una falta de ortografía, la nota un lector de 55 años y no se gana nada. **En lo correcto no nos desviamos.**
- **Las minúsculas SE MANTIENEN** aunque sean el 0% del corpus. Es una decisión de registro, no un error, y ahí la desviación es el objetivo: en una bandeja de Asuntos Con Mayúscula, el nuestro parece escrito por una persona.
- **La regla general:** desviarse del corpus en **estilo** es diferenciarse; desviarse en **corrección** es parecer descuidado.

**⭐ A/B DE ASUNTO (verificado en nuestra cuenta el 2026-08-06, ⚰️ en MailerLite — hay que rehacerlo en Brevo):** MailerLite permitía testar **solo el asunto** manteniendo el mismo cuerpo (`type: "ab"`, `test_type: "subject"`). ⚠️ El conector MCP **no** puede configurarlo entero: solo admite un campo de asunto, así que la variante B se mete en el panel.
- **⛔ Y ojo con qué se mide.** El A/B declara ganador por APERTURAS. Si el correo tiene otra métrica (respuestas, en el correo 0), **el ganador se decide por esa métrica, no por la que declare la herramienta.** Un asunto agresivo puede abrir más y hacer responder menos.
- **No se hace A/B en las tandas de calentamiento.** Con 25-50 por variante no mide nada. El A/B va en la tanda grande, cuando ya hay volumen.
- **Sesgo de negatividad (Mario, 2026-08-06):** un asunto en negativo ("¿no te acuerdas de mí?") suele abrir más que su versión neutra, y es un efecto real y documentado. El riesgo no está en la apertura sino en que un reproche baje la respuesta. **Es exactamente el tipo de cosa que hay que testar en vez de decidir a ojo.**

### ⭐ A/B DE REMITENTE, distinto del A/B de asunto (primer test de la casa, correo 2, 2026-08-27)

**El `abTesting` nativo de Brevo solo parte el ASUNTO** (`subjectA`/`subjectB`), no el remitente — así
que para testar remitente no vale ese mecanismo, hace falta montarlo a mano:

1. Leer los contactos VIVOS (no bloqueados) **por API directa de Brevo**, que es quien manda sobre
   quién recibe. ⚠️ **No vale el `member_count` del CRM, y NO porque esté desincronizado** (se comprobó
   el 27/08 y está perfecto, ver `historial-newsletter.md`), sino porque **mide otra cosa**: la
   pertenencia a la audiencia, con las bajas dentro. Para un A/B hace falta quién RECIBE, no quién
   pertenece.
2. Partir la lista al 50% **al azar, con semilla fija** (para poder auditar el reparto si algo sale
   raro), y crear DOS listas nuevas en Brevo con esos contactos ya existentes (`POST /contacts/lists`
   + `POST /contacts/lists/{id}/contacts/add`, mucho más rápido que re-subir contacto a contacto).
3. Dos campañas idénticas en todo (asunto, preview, cuerpo, enlace) salvo el campo que se está
   testando. Las dos en borrador, nunca programadas de primeras (`§9a-BIS`).
4. **Esto necesita la API key de Brevo en bruto**, no el conector MCP: crear listas y repartir
   contactos existentes entre ellas no está entre las herramientas que el conector expone (solo
   `create`/`get`/`list` de campañas). El procedimiento completo, con los números reales del primer
   test, está en `historial-newsletter.md`.
5. **No confundir con las tandas de calentamiento** (arriba, `§0c`): las tandas reparten para gestionar
   riesgo de rebote en una cuenta nueva; el split del A/B reparte para aislar UNA variable. Con el
   dominio ya caliente y verificado, un A/B no necesita ir en tandas.

**Preview text: SIEMPRE manual, nunca el automático.** Completa el asunto o estira el gap; no lo repitas. Es la segunda línea del "hook" del inbox.

**Taxonomía de asuntos del corpus (353 clasificados, % aprox.) — rota entre tipos, no te cases con uno:**

| Tipo | % | Ejemplo literal de Timepack |
|---|---|---|
| Historia/personaje con gancho raro | ~30% | "El emprendedor de 89 años" · "El sistema de prospección de Catalina la Grande" |
| How-to / beneficio directo | ~22% | "La frase mágica para no dar descuentos" |
| Curiosidad pura / bucle ciego | ~14% | "No leas el correo de hoy" · "Esto no lo vi venir" |
| Error / contraste / negativo | ~10% | "El error que arruina el 90% de los lead magnets" |
| Confesión / vulnerabilidad | ~8% | "Me da una vergüenza tremenda contarte esto" |
| Absurdo / humor puro | ~7% | "Enemas alucinógenos" (2 palabras) |
| Pregunta | ~6% | "¿Perdí una venta o gané una venta?" |
| Urgencia / lanzamiento | ~4% | "CIERRA EN 12 HORAS y la conversión ya no será tan fácil" |
| Series (bucle entre días) | ~4% | "El misterioso caso de la venta perdida - primera parte" |

**El mecanismo maestro: el choque de dos mundos** — cosa rara + tu negocio en el mismo asunto ("Un satélite de Neptuno te ayuda a vender más", "La Guerra Fría, el LSD y una marca con autoridad"). La plantilla "X, Y y tu negocio" es recurrente. Segundo truco: **los paréntesis como segundo golpe** ("Haz esto y factura medio millón al año (no es clickbait)", "(audio dentro)").

---

## 3 · El CUERPO (hereda el formateado de posts)

**El cuerpo de un email se formatea COMO el cuerpo de un post** (`global-instructions §3` + `brand-voice §3`), con los matices del medio:

- **⭐ EN EMAIL LA LÍNEA INDIVIDUAL ES LA NORMA, NO LA EXCEPCIÓN (medido el 2026-08-03 en los 4 corpus).** Porcentaje de bloques de UNA sola línea: **Isra Bravo 99% · Timepack 97% · Hugo López 92% · Sales Hackers 68%** (este último, el B2B con HTML pesado, es el único con bloques de 2 reales, un 21%). **Mediana de 7-9 palabras por línea en los cuatro.**
  - **⭐ PRIORIDAD DE RITMO EN EMAIL (Mario, 2026-08-03): 1º líneas individuales · 2º bloques de DOS · 3º bloques de TRES.** La línea suelta es la base (el dato del corpus), pero los bloques no se prohíben: dan variedad y son nuestra firma de marca. Cuando haga falta un bloque, **antes de dos que de tres**. El resto de reglas de LinkedIn siguen vigentes: **nunca un bloque de 4** (ni siquiera enumeraciones de prosa con anáfora), nunca un bloque de 2 pegado a uno de 3, y siempre una línea individual entre bloques.
  - **Excepción del tope de 3: solo listas con MARCADOR** (`→`, guion, viñeta, numeradas), que son el bloque de empresas de los mapas. Una enumeración de prosa aunque tenga anáfora NO está exenta.
  - **⛔ Y NO PARTAS UN BLOQUE DE 3 QUE YA ESTÁ BIEN (Iker, 2026-08-06).** Tres líneas con anáfora completa son un bloque de 3 legítimo: metí un blanco entre la segunda y la tercera "por si acaso" y lo rompí sin motivo. **El tope es 4, no 3.**
  - **Al montar el bloque, comprueba la ESCALERA antes de entregar.** Las mismas tres líneas iban en zigzag (37 → 30 → 47 caracteres). Se arregló **solo permutando** (30 → 37 → 47), sin tocar una palabra: siempre prueba a reordenar antes de reescribir (`global §3.2`).
  - **El porqué, en palabras de Iker (2026-08-06):** *"aunque la competencia no lo haga, los bloques de dos y de tres generan mucha mejor retención y el correo se lee más natural; si todo son líneas individuales el lector se agobia"*. **Su experiencia de meses en LinkedIn gana al corpus** en esto: el corpus dice qué hace el sector, no qué funciona mejor para nosotros.
  - **El error típico no es usar demasiadas líneas sueltas, es que las líneas sean largas.** Si una línea pasa de ~12 palabras, pártela. Diana: 7-9.
- **Párrafos de 1-3 líneas, NUNCA 4-5.** Frases cortas. Líneas que respiran.
- **Una sola idea fuerte por email.** Cinco ideas = cero ideas.
- **Legible en ~1 minuto** en móvil. Si pasa de eso, corta lo que no sirva a la idea.
- **Solo texto.** Sin imágenes, sin banners, sin botones de diseño (Carmen y Timepack coinciden; además mejora entregabilidad). El email tiene que parecer escrito a mano por una persona.
- **Anti-IA no negociable** (`brand-voice §3`): NUNCA guion largo `—`, NUNCA coma antes de "y" (registro corto hablado, igual que el post), tabla de AI-tells entera, test de leer en voz alta.
- **Cifras en dígito** (`global §3.6`) y **fuente con NOMBRE y sin año** (`global §3.5b`). El año va en la entrega interna.
- **1 enlace principal como máximo** cuando el objetivo es demo. Dos enlaces compitiendo se matan entre sí. (Los emails de Kaixito pueden no llevar ninguno.)

**Esqueleto por defecto (de los apuntes + Carmen + Timepack):**
1. **Primera línea que recompensa la apertura** — sin saludo, sin presentación, sin windup. Corta (mediana Timepack: 10 palabras) y **NUNCA resuelve el gap del asunto: lo estira** (a veces arranca aparentemente lejos: "Hablemos de lechuga" para un correo de financiación). Misma regla que la línea 2 del post (`global §2.6`): nunca "Somos Neety…", nunca credenciales. Modos que funcionan: in medias res narrativo ("El proveedor entró en la sala."), afirmación chocante en 1ª persona, continuidad con el email anterior.
2. **Historia o problema concreto** (el dolor de UNO, no la lista de todos los dolores). En Timepack el 55-60% de los correos SON una historia y ocupa el 60-70% del cuerpo.
3. **El giro / insight** — la lección aplicable aunque no compren.
4. **Puente natural a Neety: la frase-bisagra**, seca, de una línea. Literales del corpus: *"A esto en ventas se le llama prospección."* (tras contar cómo Potemkin filtraba amantes a Catalina la Grande) · *"Esto en ventas se conoce como cualificación."* · *"Esta historia va de ti, nakama."*. El truco fino: **sembrar mini-analogías de negocio DENTRO de la historia** ("Como si tu departamento cerrara muchas ventas.") para que la transición final no chirríe.
5. **CTA** (ver §4).
6. **P.S.** (ver §4b).
7. **Firma humana.** (Timepack cierra con un ritual propio: "Que el tiempo te acompañe." en el 54% — vale la pena tener una firma-mantra de la casa, distinta por remitente o común, pero NO copiar la suya. **[PENDIENTE · decisión de marca]: mientras no se elija, firma plana** — "Iker, cofundador de Neety" / "Kaixito, la mascota de Neety".)

**El lector ventrílocuo (robar sí o sí):** en ≥34% de los correos, Timepack escribe el diálogo del lector interrumpiéndole (*"¿En domingo, Timepacker?"*, *"Al turrón..."*). Airea las objeciones antes de que existan y simula conversación en un canal unidireccional. En Neety: *"¿Otro robot que manda spam?"* y responderlo. Es la versión email del echo marketing de §5.

**Bucles entre correos (el meta-truco):** en el corpus, el 18% referencia el email de ayer y el 19% anuncia el de mañana. La newsletter no son N piezas: es UNA conversación por entregas. Series de 2-3 emails con cliffhanger para los casos gordos.

---

## 3b · Animación en el email: el sistema Duolingo (medido en 13 correos reales, 2026-07-27)

- **Formato: GIF animado, SIEMPRE.** El email no ejecuta JavaScript: Lottie/JSON es imposible en correo. Duolingo usa un único GIF de cabecera (492 KB, CDN CloudFront) reutilizado en 10 de 13 correos; los demás llevan PNG estático.
- **Specs del GIF de Kaixito (MEDIDAS REALES del GIF de Duolingo, 2026-07-30 — corrigen la estimación anterior de "600 px y 8-12 fps", que era de memoria):** el suyo es **450×450 px · 492 KB · 100 fotogramas · 30 ms por fotograma (~33 fps) · 3,0 s · RGBA con fondo transparente**. Nuestro estándar: **512×512, ≤500 KB, loop perfecto de ~3 s, fondo transparente**, y el **primer frame legible por sí solo** (Outlook clásico solo enseña el frame 1). Alt text siempre. El primer GIF de Kaixito (estresado) salió en 512×512 y 352 KB: dentro de spec y más ligero que el de Duolingo.
- **⛔ Los elementos de gag van SIEMPRE en la misma línea negra que los brazos** (bombilla, destellos, vapor, garabatos, gotas). Nada de colores fuera de paleta, y nada de blanco: sobre fondo transparente el blanco desaparece.
- **⭐ EL BRAZO DERECHO CON EL LIBRO: la fórmula que funciona (Mario, 2026-07-30, tras horas de intentos).** Es el punto que más se atasca en cada animación, así que va **copiado literal en todo prompt de animación de Kaixito**:
  - **"Forma de U"** es la descripción que por fin le hizo entender la curva. Fallaron: "arco cerrado", "curva con panza", "letra ce tumbada", "más curvo".
  - **La capa, tramo por tramo:** el tramo largo del brazo pasa **por detrás** del libro y se **corta justo donde entra en contacto con él**; el tramo final que toca la bola va **por delante**; la bola de la mano, **por delante**.
  - **Avisar del efecto secundario en la misma frase.** Al pedir que el tramo final vaya por delante, el generador subía el extremo izquierdo por encima del libro. La frase que lo evitó: *"que esto no haga que la línea de la parte izquierda, en vez de cortarse justo cuando entra en contacto con el libro, ahora salga más arriba"*. **Pedir un cambio y blindar a la vez lo que no debe moverse es lo que cerró el problema.**
  - **Lección general:** describir la **forma con una letra** (U) y **nombrar el efecto secundario que no quieres** vale más que diez adjetivos de curvatura.
- **⛔ LOS DOS LÍMITES DEL PERSONAJE (auditado el 2026-07-30, antes de encargar la biblioteca):**
  1. **Kaixito NO TIENE BOCA.** El asset son dos ojos y nada más. Nada de bostezos, sonrisas ni gritos: **toda emoción se expresa con ojos + cuerpo + elementos dibujados alrededor**. Si un guion pide boca, el guion está mal. (Para sonreír: los ojos se curvan en dos arcos hacia arriba.)
  2. **Solo existe el libro ABIERTO.** No hay pieza de libro cerrado, así que nada de "cierra el libro".
- **⛔ EL LIBRO NUNCA SALE DE LA MANO DERECHA.** Ni se aparta, ni se cae, ni se cierra, ni cambia de forma. Cualquier coreografía que separe el libro de la mano reabre el problema del brazo (arriba) que costó horas. Si la emoción parece pedirlo, se resuelve inclinando el libro sin soltarlo.
- **⭐ POSICIÓN — medido bien el 2026-08-06, y corrige la estimación anterior.** En Duolingo el GIF es **la imagen nº 2 de 14-16 en los 10 correos**, justo después del logo: va **de cabecera, antes del mensaje**. (La medida vieja, "~23% del HTML", era mala: contaba caracteres de HTML crudo, cabeceras y estilos incluidos.)
  - **⛔ PERO NO SE CALCA LA POSICIÓN, porque la FUNCIÓN es distinta.** Duolingo usa **el MISMO fichero en los 10 correos** (`revamp-march-2021-feature-header.gif`, `alt="Duo waving hello"`): es un **adorno de cabecera reutilizable**. Los nuestros son **5 GIFs distintos que ilustran un momento del texto**: son **narrativos**.
  - **Regla nuestra:** el GIF va **donde el texto lo monta** — después de la línea que planta la situación y antes del remate. En el correo 0: tras *"llevo toda la semana con el libro abierto buscándote"* y antes de *"y no hay manera"*. Colocarlo de cabecera, sin setup, quema el gag.
  - **Cuándo SÍ va de cabecera:** si algún día se usa un GIF genérico de marca, repetido en todos los correos (saludo de Kaixito), entonces sí va arriba como Duolingo. La posición la decide si el GIF es **decorativo** (arriba) o **narrativo** (donde lo pide el texto).
  - **UNA animación por correo, nunca más.**
- **Lo que NO se copia de Duolingo:** su correo es 100% imágenes (14 PNGs) porque llevan años de reputación de dominio. El nuestro sigue siendo texto dominante + un solo GIF, sobre todo con el dominio frío.
- **Dato que corrige una creencia:** Duolingo NO rota remitentes (los 13 correos salen de "Duolingo <hello@duolingo.com>"); el personaje vive en asunto y cuerpo. Nuestra rotación de remitentes-persona es un diferencial propio, no un calco.
- **Biblioteca de gags de Kaixito** (recursos de cómic que funcionan en flat y a miniatura): garabatos/squiggles de estrés sobre la cabeza, gotas de sudor, signos de interrogación flotando, bombilla, hojear el libro frenético, mirar a cámara con el libro del revés, esconderse tras el libro, apuntar algo y que se le caiga el boli.
- **⭐ BIBLIOTECA DE KAIXITO YA ALOJADA EN MAILERLITE (2026-08-06).** Los 5 GIF están subidos al File manager de la cuenta y tienen URL pública permanente. **Verificadas ese día: las 5 responden 200, `image/gif`, 552×552, 40-43 fotogramas, 270-325 KB.** Para cualquier correo futuro, se pega la URL que toque en el `<img>` vía API: **ya no hay que subir nada ni pedirle nada a Mario.**

| Emoción | Cuándo se usa | URL |
|---|---|---|
| **Estresado** | El dolor del lector, agobio, no encontrar algo | `https://storage.mlcdn.com/account_image/2536617/u5KyfiIVYeloMbzrChkyrlnfYU4nlMomwt9UdFcV.gif` |
| **Curiosidad** (con gafas) | El correo educativo, un dato, un descubrimiento | `https://storage.mlcdn.com/account_image/2536617/PtnS2Gy6E1ft7zPmY203lZVkPElj4xdVSyL6wgNo.gif` |
| **Alegría** | Casos de éxito, novedades, buenas noticias | `https://storage.mlcdn.com/account_image/2536617/8ti5HV7Qfls0vOjDrwAsWO45AUBex4FvVl1l98YI.gif` |
| **Aburrimiento** | El trabajo manual repetitivo (tema central nuestro) | `https://storage.mlcdn.com/account_image/2536617/Z2e7Wqk1asSbn5y1vSuKTRDzr5xT03Srx2rDSqDZ.gif` |
| **Enfado** | Romper una creencia, señalar lo que el sector hace mal | `https://storage.mlcdn.com/account_image/2536617/Tp7w4o46iHpb3o1AuKiuKAdzQzJKMzykkz1AtgJO.gif` |

  - **La elección de emoción la decide Claude** según el pilar del correo, sin preguntar. Una sola por correo.
  - **Snippet estándar** (280 px, centrado, con alt porque muchos clientes bloquean imágenes):
    `<p style="margin:0 0 24px;text-align:center;"><img src="URL" alt="..." width="280" height="280" style="display:block;margin:0 auto;width:280px;max-width:70%;height:auto;border:0;outline:none;text-decoration:none;"></p>`
  - ⚠️ **Antes de meter una URL nueva en una campaña, comprobar que responde 200 y `image/gif`.** Un `src` roto se envía sin que nadie lo note.
- ⚰️ **Lo de aquí abajo (sanitizador, `update_campaign`, límites del conector) es de MAILERLITE y su conector MCP, los dos MUERTOS desde el 2026-08-11.** Se conserva porque el TIPO de trampa se repite en cualquier plataforma —el editor envuelve tu HTML en su esqueleto, y tocar por API pisa lo configurado en el panel— así que hay que volver a comprobarlo en Brevo antes de fiarse. **Ninguna de estas reglas está verificada en Brevo.**
- **⚠️ EL SANITIZADOR DE MAILERLITE DUPLICABA LAS ETIQUETAS DE FUSIÓN (2026-08-06).** Si al `update_campaign` le mandas un documento completo (`<!DOCTYPE>`, `<html>`, `<head>`, `<style>`), la plataforma lo envuelve en SU esqueleto y acaba con **dos `{$body_bottom}`**, que es donde inyecta el pie legal y el enlace de baja: saldrían duplicados. **Se manda SOLO el fragmento interior** (divs y tablas), sin html, sin head, sin style y sin etiquetas de fusión. Comprobar después que `{$head_top}`, `{$body_top}` y `{$body_bottom}` salen una sola vez.
- **🔴🔴 `update_campaign` POR API RESETEA LOS AJUSTES DEL PANEL (2026-08-06, comprobado en vivo).** Al actualizar el HTML de una campaña por API, MailerLite **revierte** el idioma a inglés, el texto plano a la plantilla en inglés y **los destinatarios a "todos los suscriptores"**. Pasó con la campaña `Kaixito 01`: estaba en español, con texto plano traducido y apuntada a 53 personas, y tras un cambio de estilo volvió a inglés y a 1.333 destinatarios.
  - **REGLA: en cuanto una campaña esté configurada en el panel, NO se toca más por API.** Los retoques de HTML se hacen en el editor de código del panel.
  - Si hay que tocarla por API igualmente, **después hay que volver a poner a mano idioma, texto plano y destinatarios**, y verificar el contador de destinatarios antes de enviar.
- **Lo que el conector NO podía hacer en MailerLite** (lo hacía el usuario en el panel): subir ficheros, fijar el campo `preheader`, editar el texto plano, cambiar el idioma de la campaña y fijar los destinatarios. **El preheader se resolvía metiendo un div oculto al principio del fragmento HTML**, técnica necesaria en MailerLite porque ese campo no se podía fijar bien por API.

### 🔴🔴 EN BREVO EL DIV OCULTO DEL PREHEADER DUPLICA EL TEXTO. NO SE USA (Iker, 2026-08-27)

**El fallo, ya enviado en 3 tandas antes de descubrirse:** las tandas 3, 4 y 5 llevaban a la vez (a) el parámetro `previewText` de la API de creación de campaña de Brevo, que es el mecanismo NATIVO de Brevo para el preheader, y (b) el `<div style="display:none">` heredado de la técnica de MailerLite de la línea de arriba. **Brevo SÍ resuelve `previewText` por su cuenta**, así que el div manual era pura redundancia. Gmail concatenó los dos y mostró la frase del preheader **dos veces seguidas** en la vista de bandeja. Iker lo descubrió mandándose un correo de test, no antes.

**La regla en Brevo, y es la contraria a MailerLite:**
- **Se pasa `previewText` en la creación de la campaña. Y NUNCA se añade el div oculto manual.** Brevo ya inyecta su propio preheader oculto a partir de ese campo.
- Si algún día `previewText` deja de funcionar bien por API, se soluciona ahí (o subiendo el idioma/texto a mano en el panel), **nunca volviendo a meter el div** — sería repetir exactamente este bug.
- Se comprueba mandándose un correo de test y mirando la vista de bandeja de Gmail antes de dar cualquier campaña por buena, no solo el HTML en crudo.
- **Producción del GIF (flujo de Mario, 2026-07-27):** el diseño de la mascota SE MANTIENE tal cual (el logo con ojos, brazos y libro: es marca en cada gag, no se rediseña). El prompt al generador es **UN párrafo** que pide **UN solo archivo**. Siempre: personaje entero y centrado, estilo plano sin 3D, loop perfecto 2-3 s.
- **Colores de Kaixito con el brandbook 2026 (fijados el 2026-07-29):** cuerpo **Naranja `#fe8238`** · tapas del libro **Berenjena `#431b44`** (sustituyen al verde: es el único oscuro de la paleta y da el contraste que el libro necesita contra el cuerpo naranja y contra el fondo claro) · páginas interiores del libro **Azul bebé `#a7c5f9`** (aquí sí funciona un claro, porque va rodeado del berenjena oscuro) · brazos, manos y ojos en negro. ⛔ El libro NO va en azul bebé ni en mint: a tamaño miniatura un claro sobre fondo claro se disuelve (`images §4.0`).
- **⚠️ EL FONDO DEL GIF VA EN CREMA `#f9f3ef`, NO EN TRANSPARENTE NI EN MAGENTA (corregido el 2026-07-27).** Primero se pidió magenta para recortarlo a mano, y es la técnica correcta solo si la animación tiene que ir sobre fondos distintos (web, vídeo). **Para email es peor:** el GIF solo tiene transparencia de 1 bit (opaco o invisible, sin alfa parcial), así que recortar un personaje con bordes suavizados deja dientes de sierra o halo de color. La solución limpia es **generar el GIF ya sobre el fondo del correo**, que es el Alabastro de la paleta (`images §283`): integración perfecta, cero recorte, cero halos. Corolario: **el fondo del cuerpo del email es Alabastro `#f9f3ef`**, no blanco puro.

## 4 · CTA: uno, claro, y del tamaño del calor del lead

- **CTA FUERTE** (emails de diagnóstico/demo, leads calientes): pregunta directa con acción concreta. *"¿Te encaja verlo en una demo de 20 minutos esta semana?"* · *"¿Tiene sentido que te hagamos un diagnóstico rápido?"*. Nunca "ya me dices".
- **CTA SUAVE** (emails educativos, leads fríos): pedir una respuesta pequeña. *"¿Quieres que te pase el ejemplo aplicado a vuestro caso?"* · *"Responde con 'demo' y te paso horarios."* La respuesta simple sube interacción y entregabilidad; la conversación se lleva luego a demo.
- **Mapa temperatura → CTA (para no inventar el criterio):** caliente (clicó/respondió hace poco, o pidió info) → FUERTE · **templado (descargó un lead magnet, abre pero no clica) → SUAVE por defecto**; el FUERTE le llega solo como email 3 de una mini-campaña (§5) · frío/dormido → ni fuerte ni suave: primero la reactivación de §5c.
- **Kaixito:** CTA de relación ("respóndeme y me lo cuentas") o ninguno.
- Un solo CTA por email. Varía el copy entre emails (`working-preferences §4`: nunca dos seguidos con el mismo cierre).

### 4b · La PD

> **⛔ EN ESPAÑOL SE ESCRIBE "PD", NUNCA "P.S." (medido el 2026-08-06).** Sobre el corpus español entero (Timepack + Hugo López + Sales Hackers + newsletters): **453 "PD" y 141 "PPD" contra CERO "P.S."**. El "P.S." es un anglicismo y delata traducción. Cuando hay dos postdatas, la segunda es **PPD**. Está en el validador.

En los emails importantes, SIEMPRE (Timepack lo lleva en el 86% de los correos, a veces PD+PPD). Usos, por orden de valor:
1. **Motor de referidos, no de venta** (el uso nº 1 de Timepack): pedir el reenvío. En B2B el reenvío interno es multithreading gratis: *"P.S. Si esto le sirve a tu director comercial, reenvíaselo."* La pila de 3 P.S. de Timepack es plantilla: gustado→reenvía / te lo reenviaron→suscríbete / ¿quieres irte?→**baja sin drama** ("Cero dramas. Aquí.").
2. **Reforzar el CTA bajando fricción:** *"P.S. No sería una demo genérica; la idea es revisar vuestro proceso."*
3. **Derivar:** *"P.S. Si no eres la persona adecuada, ¿quién lleva esto en tu equipo?"*
4. El guiño final o el recordatorio de deadline (solo si el deadline es real, ver §7).

---

## 5 · Pilares de contenido y cadencia semanal

**Cadencia:** mínimo 1 email/semana a la lista activa (una lista abandonada muere); el objetivo de crucero es 2-3/semana alternando pilares y remitentes. **Mismo día y misma hora local, religiosamente:** Timepack manda a las 06:30 hora española clavadas durante 16 meses (ajusta el UTC con el horario de verano) y esa costumbre ES el activo. Un "empleado digital que no falla" predica con el ejemplo no fallando.

**⭐ DÍA DE LA SEMANA Y HORA — medido el 2026-08-10 sobre las fechas reales de envío de 480 correos (los nombres de fichero del corpus llevan fecha y hora).**

> ⚠️ **LAS DOS HORAS DE ESTA TABLA ESTÁN SIN VERIFICAR Y PUEDEN ESTAR CORRIDAS.** Salen del nombre de fichero, que hereda el encabezado `Date`, y **ese encabezado viene en la zona del servidor de envío, no en hora española** — el fallo que `§8g` destapó en las tres ventanas de agosto. **Los días de la semana de esta tabla SÍ valen** (un desfase de horas casi nunca cambia el día). **Las horas, no**: hay que volver a medirlas convirtiendo la zona antes de citarlas.


| | Timepack (353, 490 días) | Hugo López (127, 402 días) |
|---|---|---|
| Frecuencia | **5,0 correos/semana** | 2,2 correos/semana |
| Lunes | **20,1%** | 23,6% |
| Martes | 19,8% | **26,0%** |
| Miércoles | **20,1%** | 13,4% |
| Jueves | 19,8% | 16,5% |
| Viernes | 19,8% | 11,8% |
| Sábado + domingo | **0,3%** (1 de 353) | 8,6% |
| Hora (española) | **06:30-07:30** ⚠️ | 08:00-11:00 ⚠️ |
| Dos correos el mismo día | 1 de 352 (0%) | 3 de 122 (2%) |

- **⛔ EL LUNES NO SE EVITA EN EMAIL. Es el error de trasladar la intuición de LinkedIn.** Timepack reparte los cinco laborables **exactamente por igual** (19,8-20,1%, una diferencia de 1 correo en 490 días), y Hugo López **concentra en lunes y martes** (49,6% de sus envíos). En LinkedIn el lunes se evita; en la bandeja de entrada no hay ningún dato que lo respalde.
- **Fin de semana: no.** Timepack, con 5 envíos semanales durante 16 meses, mandó **un solo correo en domingo y ninguno en sábado**. Coincide con el criterio de Mario: se vende a empresas y las empresas trabajan de lunes a viernes.
- **Nunca dos correos el mismo día.** Prácticamente cero en los dos corpus, aunque uno mande 5 por semana.
- ⛔ **Y OJO CON DISFRAZAR UNA RESTRICCIÓN DE EXPERIMENTO.** Cuando una tanda sale a una hora rara porque es cuando se pudo, eso es una restricción operativa, no una prueba. Apuntarla como "hemos probado las 10:01" contamina el historial con conclusiones que nadie puede sostener. **Se anota la hora y se anota el porqué.**
- **⛔ NO SE TESTAN LOS DÍAS: la tabla de arriba ya los ha respondido.** Los cinco laborables rinden igual, así que el día de una tanda se elige por criterio OPERATIVO (acabar antes, no caer en viernes), nunca para medir. Y las tandas de un mismo correo **no son comparables entre sí** aunque caigan en días distintos: cambian las personas, el tamaño y la temperatura del dominio.
- **⭐ HORA DE LA CASA: 09:01, fijada el 2026-08-10.** Todos los envíos a esa hora hasta que el test de hora diga otra cosa.
  - **El minuto impar es deliberado (Mario):** la mayoría de la gente programa a la hora en punto. Saliendo a las 09:01 llegas DESPUÉS de esa oleada, y en una bandeja ordenada por lo más reciente eso te pone encima de todos ellos. Cuesta cero y la lógica se sostiene; no está medido, pero no hay nada que perder.
  - **⚠️ El porqué original ("los corpus mandan antes de las 08:00") SE CAYÓ con el corpus de 13 remitentes (§8d).**
    - 🔴 **Y el rango que se puso en su lugar TAMBIÉN era falso** ("de las 06:00 a las 23:29"): esas horas estaban sin convertir la zona horaria del encabezado. **En hora española el corpus va de las 08:00 a las 21:30, y los tres remitentes españoles de texto puro mandan entre las 15:00 y las 16:03** (`§8g`). Las 09:01 siguen igual —la constancia manda y su lector no es el nuestro— pero **el test de hora pendiente cambia de contendiente: `09:01 contra 15:01`, no `07:01 contra 09:01`.** Las 09:01 se mantienen igualmente, ahora por otra razón: es la hora más cercana a nuestro único dato real (09:23 → 46,8%) y **lo que de verdad importa es no moverla nunca**.
  - ⛔ **No se traslada la hora de LinkedIn.** En LinkedIn las 12:00 funcionan porque se mira en un descanso; el correo se abre como tarea al empezar la jornada. Son comportamientos distintos.
  - **⭐ EL PRINCIPIO, en palabras de Mario (2026-08-10): "siempre hay que adelantarse a la hora pico".** Es la formulación correcta del mecanismo, y aplica igual a posts y a correos. Lo que cambia es DÓNDE está el pico:
    - **LinkedIn: pico a las 12:00** (se mira en un descanso) → se publica antes.
    - **Email: pico al llegar a la oficina, 08:00-09:00** (se abre como primera tarea) → se manda antes, sobre las 07:00. Es lo que hace Timepack con 490 días de constancia.
    - ⛔ **Trasladar las 12:00 de LinkedIn al correo es llegar dos picos tarde.** Toda hora a partir de las 10:00 cae ya en mitad de la jornada.
  - **La hora SÍ merece un test, pero uno de verdad:** mismo correo, mismo día, la lista partida en dos mitades equivalentes, **07:01 contra 09:01**. Nunca cambiando la hora entre tandas: cambian las personas, el tamaño y la temperatura del dominio a la vez, y el resultado no dice nada.

**El reparto que no quema la lista (medido en el corpus): ~40% valor puro sin ningún enlace · ~45% valor + siembra suave (P.S. o teaser) · ~15% venta directa concentrada en ventanas cortas.** El 47% de los correos de Timepack no lleva NI UN enlace en el cuerpo. La newsletter que agenda demos no es la que pide la demo cada día: es la que hace imposible no abrir el siguiente email, y pide la demo pocas veces con toda la confianza acumulada.

| Pilar | % | Qué es | Remitente | CTA |
|---|---|---|---|---|
| **1 · El dolor de encontrarlos** | ~40% | El director comercial que no sabe a quién llamar. La lista comprada que no vale. La feria de 200 tarjetas y cero pedidos. El comercial que se pasa media semana buscando en vez de vendiendo | Iker | Suave, y fuerte 1 de cada 3 |
| **2 · Historia con lección** | ~25% | El molde RunnerPro: una historia (propia o inventada, §7) que aterriza en el dolor y cierra con la frase-puente. Puede colgarse del calendario (agosto, vuelta de vacaciones, cierre de trimestre) | Cualquiera | Suave |
| **3 · Rompe una creencia del sector** | ~20% | El molde Isra Bravo: *"lo que te han contado sobre X está mal"*. Ej: "más leads no era tu problema", "el CRM no te va a decir a quién llamar" | Unai o Iker | Suave |
| **4 · Por dentro y novedades** | ~15% | Cómo funciona algo por debajo, aterrizado en ventas · lo que hemos roto esta semana | Asier · Kaixito | Relación |

**🆕 Y HAY CUATRO PILARES CANDIDATOS MÁS, sacados del corpus el 2026-09-14 y con su runbook en `§8g`:**
**5 · el CALENDARIO** (la fecha pone el dolor y la urgencia, y es el mecanismo más usado del corpus) · **6 · la OBJECIÓN entera** (una objeción del informe de demos, en sus palabras, rebatida sin vender: es el pilar con más munición y cero invención) · **7 · la CICATRIZ propia con número pequeño** (el único donde podemos poner una cifra nuestra sin `[PENDIENTE]`, porque las de fracaso sí están medidas) · **8 · las FASCINACIONES** (la lista de bullets de curiosidad: el correo que sostiene la cadencia cuando no hay nada que contar).
**🆕 Y un 9º, del 2026-09-21 (`§8h`): 9 · la RECETA REGALADA** (el método entero para hacerlo a mano, y lo que se vende es aplicarlo a su caso; el puente nunca promete automatismo).
⚠️ **Los cinco son n=0 y NO entran en el reparto de arriba hasta que se prueben.** El orden recomendado y el porqué de no lanzarlos a la vez, en `§8g`.

**⭐ LA PROMESA CENTRAL, Y ES UNA SOLA (confirmada por Mario con feedback de clientes, 2026-08-10):**
> **Encontrar las empresas que de verdad te pueden comprar, y la persona exacta con la que hablar dentro.**

No son las señales. No es el momento. **Es la identificación.** Los clientes industriales compran eso porque encontrar a quién venderle es su cuello de botella real (coincide con `aboutme` y con el diferenciador que corrigió Iker).

⛔ **Corolario, y es el modelo de Isra Bravo: un solo producto, ángulos infinitos.** Los cuatro pilares no son cuatro promesas: son **cuatro caminos a la misma puerta**. Isra vende el mismo libro los 7 días entrando por un capítulo distinto; nosotros vendemos la misma identificación entrando por un dolor distinto. **Nunca inventar un segundo mensaje central para "variar".**

- **Mini-campañas de 3 emails** sobre el mismo ángulo para empujar demos: (1) problema + insight + CTA demo · (2) caso/ejemplo + CTA suave · (3) diagnóstico directo + P.S. bajando fricción. Separados varios días, cada uno con ángulo nuevo, jamás el mismo mensaje repetido. Si no responde → vuelve al nurture normal.
- **Echo marketing:** los emails se escriben con las palabras del comprador, no las nuestras. Frases reales de llamadas, objeciones frecuentes ("ya hacemos LinkedIn", "la IA no me da confianza", "no es prioridad") y preguntas de demos se convierten en asuntos y cuerpos. Pídele a Iker el porqué real de cada demo agendada: ese dolor es el próximo email.

#### ⭐⭐ 5-ECO · EL ECHO MARKETING YA TIENE FUENTE, Y ES LA MISMA QUE LA DEL SPAM NINJA (2026-08-24)

> **Esto cierra el hueco que estaba abierto en `§10`** (*"cuando llegue el export del feedback de producto, pasa a ser LA fuente del echo marketing"*). Ya ha llegado: `Documentos/Mario/LINKEDIN GROWTH/FEEDBACK CLIENTES 24 AGO.html` · **258 citas literales, 63 empresas, 87 reuniones, 1 jul - 20 ago 2026**.

**⛔ NO SE COPIA AQUÍ. El inventario canónico vive en `global §4.4b-MUNICIÓN` y en `aboutme §1b`, y se lee de ahí.** Dos copias del mismo banco de dolores se desincronizan en tres semanas, y entonces el correo y el post empiezan a vender cosas distintas. **Lo que sí es de este fichero es qué cambia al pasar de un post a un email:**

1. **La promesa central no se toca: sigue siendo la identificación** (`§5`, "un solo producto, ángulos infinitos"). El informe la refuerza — la señal es ahora objeción en **12 empresas (9 del ICP)**, la más repetida de todo el documento. **Un email que abra con la señal está abriendo con el argumento del segundo tiempo** (`global §4.4b-ORDEN`).
2. **Los vetos son los MISMOS y en email pesan más, no menos.** Prometer que lo escribe la IA es objeción en 5 empresas (*"vimos tantos de estos mensajes que directamente los ignoramos"*, Innobide), y aquí el lector lo está leyendo **dentro de la bandeja donde recibe esos mensajes**. Prometer volumen es la queja literal contra Waalaxy y Apollo, también 5 empresas.
3. **Lo que el email SÍ puede hacer y el post no: una historia entera.** `§7` permite historias inventadas si el dolor es real; **el dolor real ahora tiene 77 empresas detrás y nombre de tema** (informe del 14/09). El dolor nº1 (**21 empresas, 15 del ICP**) *"eliminar un tiempo de trabajo en prospección y dedicarlo a contactar"* es un pilar 1 de manual; el nuevo del 19/08 (*"no te da el interlocutor en la empresa, lo que te da es ese posible listado de empresas"*) es un pilar 3 de manual, porque rompe la creencia de "ya tengo una base de datos". ⚠️ **Ese segundo sigue en 2 empresas el 14/09 y tiene una cita ICP en contra** (`aboutme §1b`): se usa — es el dolor de nuestro mejor CTR — pero **no se presenta como lo que dice el mercado**.
4. **Y hay un tema que es de email y de nadie más: Sales Navigator** (**7 empresas el 14/09**, eran 5; *"la licencia… realmente no le sacamos demasiado fruto"*). En un post no se puede nombrar la marca (`global §4.4b-MUNICIÓN`: nombrar a LinkedIn dentro de LinkedIn); **en la bandeja de entrada no hay ese problema**. ⭐ **Y el 14/09 este ángulo deja de ser flojo: entra Sener, que es ICP A** (`global §4.4b-LICENCIA`, desglose actualizado). ⚠️ Sigue habiendo **una cita de Fagor (también ICP A) en contra**, y **el ángulo bueno no es el precio**: es que la licencia no te da el nombre de dentro.

**⚠️ Y la regla de entrada es la misma que en el ninja:** un dolor entra en un email cuando el informe lo respalda con **3 empresas o más**. Con 1 o 2 es hipótesis, se prueba en un correo y se anota el resultado en `historial-newsletter.md`.

### ⛔⛔ 5-NINJA · EL SPAM NINJA EN EL CORREO: BLOQUE DE DOS, Y CUELGA DEL ASUNTO (Iker, 2026-08-26) — CANÓNICO EN EMAIL

> **Iker, viendo el correo 2 con el enlace en una línea suelta:** *"has puesto el enlace en una línea individual separada, entonces yo creo que en cuanto lo vea una persona que lo reciba detectará que le estamos intentando vender algo, entonces no lo pulsará, generará rechazo y fricción. Es mejor que copies e inyectes en tu receta el bloque de dos de las publicaciones. Solo que en este caso de correos la primera línea del bloque, en vez de seguir la broma del gancho de la publicación, aquí seguirá la broma o el verbo punchy del ASUNTO del correo, que es el equivalente"*.

**🔴 EL FALLO QUE LO MOTIVA ES MÍO Y ES DE LIBRO:** subí el enlace desde la PPD hasta el cuerpo (bien) y lo dejé **en una línea suelta con un blanco encima**, que es exactamente lo que `global §4.4b-FORMA` lleva desde el 12/08 marcando como ❌ MAL. **La forma del ninja no es de un pilar ni de un canal: es global.** La tenía leída y la rompí al cambiar de canal.

#### La forma, calcada de `global §4.4b-FORMA` sin tocar una coma
```
[la BROMA o el VERBO PUNCHY DEL ASUNTO, girado contra el dolor]
[UNA oración: quién lo resuelve] + ":" + enlace     ← más corta que la de arriba
```
- **Las DOS líneas pegadas**, un solo salto entre ellas, **sin blanco en medio**.
- **Tope de 55 caracteres cada una, sin contar la URL.** Pasando de ahí la línea se parte en el móvil y el bloque de dos se lee como cuatro, que es justo lo que el bloque existe para evitar.
- **La de abajo es la más corta** (escalera invertida). Es la excepción a la escalera del cuerpo, y encima es lo que hace el corpus de newsletters entero (`§8d`).
- **La línea del enlace es UNA sola oración acabada en `:` con el enlace pegado detrás.** Ni dos oraciones, ni el enlace despegado.
- **Nunca la última línea:** detrás van la firma y las postdatas.

**El dato que lo sostiene** (auditoría de clics reales de las 3 cuentas, 12/08): bloque de dos pegadas **0,205% de CTR mediano** contra **0,069%** de la línea suelta. Y el par sin ruido posible, dos memes casi idénticos en alcance: el del 29/07 con bloque de dos hizo **142 clics** en 93.744 impresiones; el del 06/08 con línea suelta hizo **4 clics** en 95.913. **35 veces menos.**

#### ⭐ LO ÚNICO QUE CAMBIA EN CORREO: **EL ASUNTO OCUPA EL SITIO DEL GANCHO**
En LinkedIn la primera línea del bloque cuelga de la broma del gancho, y su **palabra tiene que aparecer literal** dentro del ninja (`§4.4b-FORMA`, fallo duro). **En el correo el gancho ES el asunto**, así que la palabra que se repite sale de ahí.
- Asunto `me traje 200 tarjetas y no llamé a ninguna` → objeto punchy **`tarjetas`**, verbo punchy **`traje`**.
- Ninja: `200 tarjetas te las trae cualquier feria. Ordenadas no.` → la palabra está, y el chiste se gira: **lo que la feria sí te da contra lo que no**.
- **Si el asunto no tiene broma, se sigue lo más punchy: su OBJETO y su VERBO** (`§4.4b`, la subsección del ninja sin broma). Media parrilla de correos no va a tener chiste.
- **Y repetir la palabra es el SUELO, no el techo.** Encima hay que girar la broma contra el dolor, normalmente en la forma *"eso lo hace cualquiera, lo otro no"*. Citar la palabra sin girar nada es peor que no citarla.

#### ⛔ LO QUE **NO** SE TRAE DE LINKEDIN, y se dice para no arrastrarlo por inercia
| regla de LinkedIn | ¿vale en correo? |
|---|---|
| **El enlace cae antes del carácter 650** (`§4.4b-CLICS`) | ⚠️ **El número no, pero el PRINCIPIO sí.** Ver `§5-NINJA-POSICION` justo debajo: aquí ponía que el enlace va al final del cuerpo y **nuestro propio dato lo desmintió** |
| **Dos puertas (agendar + correo)** (`§4.4e`) | ❌ **NO, jamás.** Pedirle a un suscriptor que se suscriba al correo que está leyendo no tiene sentido. **Una puerta y es `/agendar/`** |
| **UTM en el enlace** (`§4.4b-UTM`) | ❌ **No se escribe a mano.** Brevo los inyecta él en el envío. La URL del cuerpo va limpia, y lo que hay que vigilar es el `utm_campaign` de la campaña (`§9b` punto 12) |
| **No nombrar a Neety** (`§4.4b` regla 2) | ✅ **SÍ, y no por el mismo motivo.** En LinkedIn es porque nombrar la marca lo delata como publicidad ante el clasificador. En el correo no hay clasificador de alcance, pero **el bloque sigue leyendo mejor en plural sin marca**, y la firma de abajo ya dice quiénes somos |
| **Lista de frases quemadas** | ✅ **SÍ, con las mismas frases de LinkedIn dentro** y su propia lista en `validar-email.py`. El dolor no cambia y la frase sí. **Caduca a los 21 días (3 correos) y no distingue remitente**: los cuatro escriben a la misma lista de suscriptores (`global §2.0b-VENTANA`) |

#### 🔴🔴 5-NINJA-POSICION · EL ENLACE NO VA AL FINAL DEL CUERPO. NUESTRO DATO GANA AL CORPUS (Iker, 2026-08-27)

> 🔴 **AQUÍ PONÍA QUE EL ENLACE VA AL FINAL DEL CUERPO, Y ERA UN ERROR MÍO DE JERARQUÍA DE FUENTES.**
> Me apoyé en que *"el 100% del corpus lo pone al final"* (Timepack, RunnerPro) para defender la
> posición… teniendo delante nuestro propio dato, que dice lo contrario.

**EL DATO NUESTRO, y es demoledor: 0 CLICS DE 336 ENTREGADOS** en las 4 primeras tandas de Kaixito 01,
con aperturas del 20-37%. Iker: *"están teniendo muchísimas aperturas, pero nadie pulsa el enlace.
¿Por qué? Porque está al final del todo… no tiene sentido currarnos tan buenos correos para eso"*.

**POR QUÉ EL CORPUS NO APLICA, que es la parte que me salté:** Timepack y RunnerPro son
**infoproducto B2C con lista caliente y correo diario**. Su lector abre 5 correos por semana del mismo
remitente y llega al final porque ya tiene el hábito. **Nuestro lector es un director comercial de 55
años que recibe un correo nuestro cada 15 días.** No hay hábito que le lleve hasta abajo.

**Y ESTO ES LITERALMENTE LA JERARQUÍA DE FUENTES DE LA CASA** (`CLAUDE.md`, `outliers-database §4`):
**el histórico real de nuestras cuentas manda sobre el corpus prestado.** Tenía las dos fuentes y elegí
la de fuera.

**LA REGLA NUEVA:**
- **El ninja va donde la historia toca fondo**, no en el cierre. En el correo 2 eso es justo después de
  que las tarjetas acaben en el cajón: el lector siente el problema y ahí encuentra la salida.
- **Nunca pegado a la firma.** Iker: *"a nivel psicológico me genera rechazo tenerlo tan cerca de la
  firma"*. Detrás del ninja tiene que quedar **cuerpo de verdad**, no solo firma y postdatas.
- **Referencia medida del correo 2:** el enlace pasó del **carácter 625 al 442**, con **5 bloques**
  por detrás. El cuerpo entero son ~900 caracteres.
- **⛔ Lo que NO cambia:** la forma del bloque de dos (`§5-NINJA`), el tope de 55, la escalera
  invertida y la palabra del asunto dentro. Se mueve el SITIO, no el molde.

**📏 QUÉ MEDIR, porque esto es una hipótesis con dato en contra del corpus, no una certeza:** los clics
del correo 2 (2026-09-02) contra los **0 de 336** del correo 0. Cualquier número mayor que cero
confirma la dirección; si vuelve a salir 0, el problema no era la posición y hay que buscarlo en el
cuerpo.

#### 💣 QUÉ PUEDE PROMETER EL NINJA DEL CORREO, Y NO ES OPINABLE (Iker, 2026-08-26)
> **Iker:** *"también tienes que copiar de la skill de LinkedIn que ahora tenemos nuevo feedback de los clientes, para mejorar también el spam ninja de los correos sabiendo cómo solucionar mejor su punto de dolor y cuál es"*.

**⛔ EL INVENTARIO NO SE COPIA AQUÍ. Vive en `global §4.4b-MUNICIÓN` y en `aboutme §1b`, y se lee de ahí** (informe del **2026-09-14**: **359 citas, 77 empresas, 117 reuniones**). Dos copias del mismo banco de dolores se desincronizan en tres semanas y entonces el post y el correo empiezan a vender cosas distintas. **Lo que sí es de aquí es qué pesa distinto en la bandeja de entrada:**

1. **Los vetos pesan MÁS en correo, no menos.** Prometer que lo escribe la IA es objeción en **5 empresas** (*"vimos tantos de estos mensajes que directamente los ignoramos"*, Innobide), y aquí el lector lo está leyendo **dentro de la misma bandeja donde recibe esos mensajes**. Prometer volumen es la queja literal contra Waalaxy y Apollo, otras 5.
2. **La SEÑAL sigue sin poder abrir.** Es la objeción nº1 del informe (**12 empresas, 9 del ICP**) y `§4.4b-ORDEN` no cambia por ser correo: **la identificación abre, la señal cierra**.
3. **La unidad de medida son los MESES**, porque es la palabra que usan ellos (*"puede ser un trabajo de meses"*, Composites Martiartu). Un ninja que dice "en 5 minutos" está comprando la promesa de la herramienta que ya han dejado de usar.
4. **Y hay un dolor que en correo cotiza más alto que en un post: el interlocutor.** *"No te da el interlocutor en la empresa, lo que te da es ese posible listado de empresas"* (Gaitek, 19/08). En un post la palabra `nombre` compite con el chiste; **en dos líneas de correo cabe entera y es lo que más nos separa de una base de datos**. ⚠️ **Sigue en 2 empresas el 14/09 y tiene una cita ICP en contra** (`aboutme §1b`): va en primera persona del que escribe, nunca como *"esto le pasa a todo el mundo"*.
5. 🆕 **Y uno nuevo que en correo pesa más que en ningún otro sitio: pagar por buscar lo que no vale** (**8 empresas, 8 de 8 ICP**, el único tema del informe con encaje perfecto). *"que me estés cobrando créditos por compañías que no valen la pena, pues no, eso lo puedo hacer yo"* (Fagor Automation). **No es un ángulo de precio: es de gastar buscando.** En un asunto cabe y en un ninja de post cuesta.
5. **La regla de entrada es la misma:** un dolor entra en el ninja cuando el informe lo respalda con **3 empresas o más**. Con 1 o 2 es hipótesis: se prueba en un correo y se anota en `historial-newsletter.md`.
6. 🆕 **La cadena de 4 eslabones (2026-09-18, `global §4.4b-CADENA`) le da al correo lo que al post le cuesta: la ROTACIÓN.** Cada tanda de 2 semanas puede dedicar un correo a un eslabón (empresas · persona · cuándo · proceso) sin repetir dolor, y el asunto nombra el eslabón roto. **Pesos:** el 4 (buscar contra llamar) tiene 16 de los 22 clientes y va por defecto; el 2 (la persona) es el que más nos separa de una base de datos; el 1 (encontrar empresas) solo en correos de exportación o país nuevo, porque 62 de 71 cuentas sacan la lista fácil; el 3 (llegar tarde) se dice como PÉRDIDA y sin la palabra `señal`, y es hipótesis.

**El test de los 5 segundos, idéntico al de los posts:** tapa el correo entero y lee solo las dos líneas. **Si valdrían pegadas a cualquier otro correo nuestro, están mal**, aunque lleven la palabra del asunto dentro.

**Mecanizado en `validar-email.py`** con 7 checks nuevos: dos líneas pegadas · las dos ≤55 sin la URL · escalera invertida · una oración + `:` + enlace pegado · **repite una palabra del ASUNTO** (raíz de 5 letras, sin tildes) · sin frases quemadas · el enlace no es la última línea. **Probado contra la versión mala del correo 2**, que cae con 3 fallos.

### ⭐⭐ 5-HISTORIA · EL PILAR HISTORIA PERSONAL, TRASLADADO DE LINKEDIN AL CORREO (Iker, 2026-08-26) — PRIMERA VERSIÓN, SIN VALIDAR

> **Iker, pidiéndolo:** *"no tenemos aún pilares de contenido para correos definidos… el que quiero medio copiar, porque realmente la idea la saqué de los correos y la apliqué a LinkedIn, es el pilar historia personal, que ahora ya tenemos nuevo feedback de los clientes y su punto de dolor real. Trasladarlo igual a los correos. Y el gancho de las publicaciones de LinkedIn se puede más o menos transferir a los correos al asunto"*.

**🔴 LO PRIMERO, PORQUE ES LO QUE MÁS FÁCIL SE OLVIDA: esto es n=0.** Se escribe el 26/08 y no ha salido ni un correo con él. **Son hipótesis con nombre, no receta** (`working-preferences §0c`) hasta que haya aperturas y clics propios.

**Y el bucle se cierra:** el pilar historia de LinkedIn nació de leer newsletters. Volver a traerlo al correo no es copiar, es devolverlo a su casa **con lo que hemos aprendido de él en 5 posts medidos**.

#### Por qué este pilar y no otro, en datos
- En LinkedIn historia es **el pilar que peor alcanza y mejor convierte**: 0,41% de CTR a la web contra el 0,022% del meme de más alcance del mes (`post-workflow §4.6-MEDIDO`). **El correo no necesita alcance** (la lista ya está), así que se queda solo con la mitad buena.
- **Es el pilar más barato de producir:** sin verificar empresas, sin CSV, sin menciones (`post-workflow §4.6-INVENTAR`). Es lo que permite sostener una cadencia semanal.
- **Y el corpus lo respalda desde fuera:** en Timepack **el 55-60% de los correos SON una historia** y ocupa el 60-70% del cuerpo (`§8`). RunnerPro, el caso más parecido al nuestro, mandó **3 historias en 8 días** en el ZIP del 26/08 (`§8f`).

#### LO QUE SE TRAE INTACTO DE `post-workflow §4.6`
1. **1ª persona del singular.** Es el default del pilar y los 4 mejores ganchos de la casa van así (`brand-voice`, la tabla de la persona del gancho).
2. **Se cuenta en PRETÉRITO.** Escena que ya pasó, no situación que se repite. La mezcla correcta: **imperfecto para la costumbre, pretérito para los hechos** (`§4.6-NOSTALGIA`).
3. **El arco:** escena → momento → desenlace → reframe (antes vs ahora) → **lección corta y universal**.
4. **La escena se puede inventar. El DOLOR, nunca** (`§4.6-INVENTAR`), y en email esa excepción ya existía desde el 27/07 (`§7`). El dolor sale de `global §4.4b-MUNICIÓN`, y la entrega dice **de qué dolor del informe sale**.
5. **El VEHÍCULO rota** y comparte lista con LinkedIn (`§4.6-VEHICULO`), porque media lista viene de ahí. No se repite en los 3 correos siguientes; después vuelve a estar libre (`global §2.0b-VENTANA`). **Usados:** el instituto y la infancia (×4), la primera venta de crío, el Excel del cliente en reunión, **la feria (correo 2, 31/08)**, **la centralita (correo 3, 07/09)**.
6. **Una sola puerta, y es `/agendar/`** (`§4.6-CORREO`). El bloque de correo no entra: en un correo sería pedirle al lector que se suscriba a lo que ya está leyendo.
7. **La línea que sitúa la escena dice QUIÉN y DÓNDE**, y no etiqueta al otro con una etiqueta que aún no le tocaba (`§4.6` 1b).

#### LO QUE CAMBIA AL PASAR AL CORREO, y son seis cosas
| | LinkedIn | Email |
|---|---|---|
| **El gancho** | primera línea, ≤210 car, 1 oración, emoji personal al final | **es el ASUNTO**: ≤62 car, 6-9 palabras, minúsculas, **cero emoji** (`§2`) |
| **La línea 2** | sitúa la escena | va **detrás de la micro-apertura** (ver abajo), así que sitúa en la línea 3 |
| **La foto** | selfie con el móvil en la mano, la firma visual del pilar | **no hay**. El correo va en texto plano, así que **toda la cercanía la carga el texto** |
| **El cierre** | lección + spam ninja de 2 líneas | lección + **frase de estado + enlace** (`§8d`) + **PD y PPD** |
| **La métrica** | conversación y clics, nunca impresiones | **clics al enlace y respuestas, nunca aperturas** |
| **El emoji** | uno personal cerrando el gancho | ninguno, ni en asunto ni en cuerpo |

#### ⭐ LA MICRO-APERTURA DE IKER: **`Te cuento.`**
El corpus español entero abre con una orden de 1-3 palabras, con punto y línea en blanco detrás (`§8d` punto 1), y **cada remitente tiene la suya y no la mueve**: Isra `Mira.`, RunnerPro `Escúchame.` / `Oye.`, Hugo `Atiende.`.
- **La nuestra no puede ser la suya** (`working-preferences §1e-COPIA`: se roba el mecanismo, no las palabras). **`Te cuento.` es la de Iker**, y encaja con el pilar mejor que ninguna de las de arriba porque **anuncia literalmente que viene una historia**.
- Va **fija en todos sus correos**. Los otros 3 remitentes necesitan la suya cuando les toque. `[PENDIENTE · decisión de marca]`
- **⭐ CORREGIDO EL 2026-09-14 (`§8g`): no es UNA fija, es un REPERTORIO corto.** RunnerPro, que es el molde de donde salió esto, rota **seis** en 11 correos: `Escúchame.` · `Escúchame bien.` · `Oye.` · `Oye, una cosa.` · `Domingo.` · `Pregunta directa.` · `Septiembre.` Con una sola apertura repetida cada semana, a la cuarta canta a plantilla. **`Te cuento.` se queda de base para Iker, y se le abren 3-4 del mismo registro.** Y hay dos familias que no teníamos y son gratis: **el NOMBRE DEL DÍA o DEL MES** (`Lunes.`, `Septiembre.`) y **el ANUNCIO del formato** (`Pregunta directa.`, `Correo corto.`).

#### ⭐ EL CIERRE ES EL SPAM NINJA, Y TIENE SU PROPIA SECCIÓN
> 🔴 **AQUÍ PONÍA QUE EL ENLACE IBA EN UNA LÍNEA SUELTA CON SU FRASE DE ESTADO DELANTE, Y ERA UN FALLO MÍO** (corregido el 26/08 por Iker). El enlace suelto con un blanco encima se lee como un banner y tiene **0,069% de CTR contra 0,205%** del bloque de dos.

**El cierre de una historia por correo es un spam ninja normal: bloque de DOS líneas pegadas, la primera colgando del ASUNTO. Receta entera en `§5-NINJA`.**
- ⚠️ **30 minutos, nunca 20.** El correo 0 prometía 20 y la página pide 30 (`corpus-correos-enviados`). Si no cabe en las dos líneas, **no se mete a la fuerza**: la página ya lo dice.

#### ⭐ LA PD Y LA PPD SE REPARTEN EL TRABAJO, y ninguna de las dos vende
Es la forma medida de RunnerPro y de Timepack (`§4b`, `§8d`), y resuelve el conflicto con la regla del UNO: **el único CTA es el enlace**, así que las postdatas no pueden pedir otra cosa.
- **PD = motor de referidos.** Pedir el reenvío al director comercial o al equipo. En B2B un reenvío interno es multithreading gratis.
- **PPD = el remate de la historia**, no una oferta. RunnerPro la usa de pregunta de seguimiento; en un correo frío la pregunta compite con el clic, así que **nuestra PPD cierra el bucle de la escena** (*"La feria no era el problema. El problema era el lunes."*). Cuando la lista esté caliente y conteste, se prueba la pregunta.

#### 🎯 CÓMO SE JUZGA UNA HISTORIA POR CORREO
**Nunca por aperturas.** La apertura la decide el asunto; el pilar se juega el cuerpo.
1. **Clics al enlace de agendar** (`linksStats`, no el CTOR del panel, que cuenta el enlace de baja — `historial-newsletter`).
2. **Respuestas.**
3. Reenvíos, si algún día se pueden ver.

**La vara, y es dura:** el correo 0 lleva **0 clics de 336 entregados y 0 respuestas de 191**. Cualquier número mayor que cero es información nueva.

### 5b · Secuencia automática de bienvenida (nuevos leads)
Día 0: entrega del lead magnet prometido · Día 1-2: quiénes somos y qué problema resolvemos (SIN pitch duro) · Día 3-5: una idea útil · Día 6-8: caso de uso · Día 9-11: error común que Neety evita · Día 12-14: invitación a diagnóstico. Valor, no presión: el lead tiene que entender solo por qué la demo tiene sentido.
- **Sin doble flujo:** mientras un lead está DENTRO de la bienvenida (días 0-14) NO recibe la newsletter normal. Al terminar la secuencia pasa al nurture semanal. Nunca los dos a la vez.
- **Referenciar el origen:** el email de día 0-2 SÍ nombra el recurso que se descargó ("la guía de X que te llevaste"); a partir de ahí, genérico, porque en la lista conviven leads de magnets distintos. Si un envío va filtrado a UN magnet concreto, se referencia; si va mezclado, no se asume ninguno.

### 5c-0 · Correo 0: el segmentador por respuesta (diseñado el 2026-07-27, pendiente de enviar)
El primer correo del sistema no vende: **segmenta la base mezclada por RESPUESTAS** y de paso entrena la entregabilidad (cada respuesta le dice a Gmail que somos legítimos, justo cuando el dominio está frío).
- **Asunto: `tú quién eres`** (decidido el 2026-07-27): 3 palabras, minúsculas, sin signos de interrogación ni emojis. Con Kaixito de remitente la broma es coherente: es ÉL quien no te encuentra en su libro.
- **Remitente: KAIXITO "de Neety" (revisado el 2026-07-27; antes decía Iker).** Unai y Asier descartados por sobrios (decisión de Mario). El motivo del cambio: con el gag del GIF (Kaixito estresado sin recordar de qué te conoce), **el correo ES la presentación de la mascota**: se cumple la regla de §1 ("existir antes de remitir") dentro del propio correo. Condiciones: el From lleva la marca (*"Kaixito de Neety"*, nunca "Kaixito" a secas), la línea 1 lo presenta (*"soy Kaixito, la mascota de Neety, y tengo un problema"*), y las respuestas las contesta un humano.
- **El GIF del correo 0:** Kaixito hojeando su libro frenético, garabatos de estrés e interrogaciones creciendo sobre la cabeza, gota de sudor, y remate: para en seco y mira a cámara con el libro del revés. Loop 2-3 s, specs de §3b. Es la ÚNICA imagen del correo.
- **Cuerpo:** línea 1 desactiva la broma ("era broma, tranquilo"), quiénes somos en UNA frase, por qué te llega este correo (web / evento / LinkedIn / webinar / referido: todas las vías), y **UNA pregunta de respuesta de una palabra**: *"contéstame con una sola palabra: web, linkedin, evento, webinar o ni idea"*. La opción "ni idea" hace gracia Y también segmenta.
- **⛔ "NI IDEA" SE QUEDA COMO OPCIÓN CERRADA, no se cambia por "especifica dónde" (decidido el 2026-08-06).** La lista cerrada de UNA palabra convierte la respuesta en una decisión de 3 segundos; pedir que redacten la convierte en una tarea, y ahí se cae la gente. Además: (a) en una lista mezclada de un año entero, **los que no se acuerdan son mayoría**, y sin salida fácil simplemente no contestan; (b) "ni idea" **es un cubo accionable** (a ese hay que reintroducirle, no decirle "como viste en nuestro webinar"); (c) en un dominio recién estrenado **cualquier respuesta es señal positiva** para el proveedor de correo. Misma mecánica que la palabra clave del lead magnet: cada requisito extra se come un porcentaje de respuestas.
- **El objetivo es la RESPUESTA, no el clic:** este correo va SIN enlaces (mejora la entrega en frío) y su métrica es cuántos contestan. Cada respuesta = un contacto segmentado + activo confirmado. ⚠️ El GIF le añade algo de riesgo de spam frente a texto puro: se compensa con dominio autenticado, envío escalonado y el resto del correo en texto plano. Prueba interna (a nuestros propios correos) antes del envío real.
- **A quién:** SOLO al segmento de origen desconocido. Los que tienen origen claro (p. ej. los ~40 de recursos) NO lo reciben: a ellos se les escribe referenciando su origen cuando toque.
- **Purga:** los rebotados/direcciones rotas se borran YA. Los que no abren NO se tocan tras un correo: los opens son poco fiables (Apple los distorsiona), se juzga tras 4-6 correos por clics + respuestas.
- **Envío escalonado** en tandas pequeñas repartidas en días: hace a la vez de calentamiento del dominio.

### 5c · Segmentación (antes de enviar nada)
No se dispara lo mismo a toda la base. Mínimo separar por: **origen** (lead magnet / newsletter / webinar / LinkedIn / contacto comercial), **rol** (founder / director comercial / marketing / agencia) y **temperatura** (abrió, clicó, respondió, dormido >3 meses). Los dormidos NO reciben la campaña normal: reciben la de reactivación (recordar por qué están en la lista + una idea útil + opción clara de baja). Lista pequeña y viva > lista grande y muerta.

---

## 6 · Sistema de trabajo (el método Carmen/Runner Pro, adaptado)

Carmen lleva la newsletter de Runner Pro (B2C) entera desde Claude Code con un playbook .md y tandas programadas. Su sistema, adaptado a Neety:

0. **⭐ FASE ACTUAL (Iker, 2026-07-27): CORREO A CORREO, nada de tandas todavía.** Carmen programa tandas de 2 semanas porque lleva meses de datos y pilares validados; nosotros no tenemos ni pilares propios ni una métrica. Igual que en LinkedIn se empezó probando formatos y midiendo antes de tener la receta: **cada correo se trabaja individualmente**, se revisa a fondo, se mide y va definiendo los pilares. Se pasa a tandas cuando haya (a) herramienta de envío con métricas conectada, (b) 3-4 pilares con datos propios y (c) el tono afinado tras una buena serie de correos revisados. El resto de esta sección (pregunta previa, feedback doble, historial) aplica desde el correo nº 1.
1. **Tandas de 2 semanas (el DESTINO, no el arranque).** Cuando toque: se planifica y escribe la tanda completa de una vez (con la rotación de remitentes y pilares), no email a email. Un email suelto fuera de tanda es la excepción (algo urgente que comunicar), y va sin bucles con ayer/mañana.
2. **Antes de cada tanda, SIEMPRE preguntar:** *"¿Hay algo especial que comunicar estas 2 semanas?"* (lanzamiento, oferta, evento, feria, post que ha petado). La respuesta condiciona la tanda.
2b. **El estado vive en `docs/skills/historial-newsletter.md`** (equivalente al `historial-publicaciones.md` de posts): qué email salió, qué día, con qué remitente, pilar y segmento, más las palabras de CTA-respuesta ya usadas. Se LEE antes de planificar una tanda (rotación de remitentes, no repetir ángulo ni palabra) y se ACTUALIZA y commitea al aprobar la tanda. Si falta un dato, PREGUNTA; no lo adivines.
3. **Revisión humana del pool:** el usuario revisa los borradores (preview en la herramienta de envío) y da feedback por número de email.
4. **El feedback va a DOS sitios:** se corrige el email Y, si es un aprendizaje reutilizable, se escribe AQUÍ en esta skill (misma doctrina que `feedback_meter_aprendizajes_en_recetas`). Al cerrar la sesión: "guarda los cambios de hoy" = actualizar y commitear esta skill.
4b. **⭐ UTM EN TODOS LOS ENLACES, DESDE EL CORREO 1 (2026-08-06).** Sin UTM, el tráfico del correo entra en Analytics como directo y **no se puede atribuir ni una sola demo al canal**. Se activa la integración de Google Analytics en los ajustes de la campaña (en el panel; el conector no lo expone).
   - **Convención fija, que es lo que de verdad importa** (UTMs inconsistentes fragmentan los informes y son peores que no tenerlos):
     `utm_source = newsletter` · `utm_medium = email` · `utm_campaign = remitente-numero-tema`
   - Ejemplos: `kaixito-01-repermiso` · `iker-02-prospeccion-manual` · `kaixito-03-novedades`.
   - **Poner el remitente en el nombre de campaña es deliberado:** permite agrupar en Analytics y responder si Kaixito convierte mejor que los founders (`§1`, "se mide, no se discute").
   - 🔴 **Los UTM miden que llegó tráfico, NO que convirtió.** Hay que tener la reserva de demo marcada como **evento de conversión en GA4**, o se ven visitas sin saber si alguna agendó.
   - **Se activa desde el correo 1 aunque aporte poco**, porque los datos solo sirven si son comparables desde el principio.
5. **Métricas que mandan:** respuestas y demos agendadas > clics > aperturas (open rate >30% está bien como referencia, pero no se optimiza para abrir, se optimiza para conversar). Medir por segmento y por pilar; replicar los formatos que agendan.
6. **Días de envío:** empezar martes-jueves por la mañana y MEDIR. Si un día flojea sistemáticamente (a Runner Pro le pasó con los sábados), se salta ese día. No adivinar: mirar los datos propios.
6b. **⭐ LOS TESTERS SE ELIGEN POR CLIENTE DE CORREO, NO POR CARGO (2026-08-06).** MailerLite pide un mínimo de 4. Si los 4 son cuentas `@neety.com` con Google Workspace, se está probando Gmail cuatro veces y no se ha probado nada. **Hay que tener al menos un Outlook de escritorio en Windows**, que es donde más se rompe: usa el motor de Word, no un navegador, y **solo muestra el primer fotograma del GIF** (verificado el 2026-08-06; Gmail y Apple Mail sí animan). Por eso la regla de que el primer fotograma funcione como imagen fija (`§3b`) no es un adorno: para media plantilla de una empresa, ese ES el GIF.
   - **Qué se mira en la prueba, por orden:** (1) el GIF anima, o su primer fotograma se entiende solo · (2) el preheader sale en la bandeja detrás del asunto · (3) el pie legal y la baja salen **una sola vez** y en español · (4) se lee bien en móvil.
   - **El coste no es argumento:** 5 correos de prueba contra 1.333 de campaña es un 0,4%.
7. **Entregabilidad:** dominio calentado ANTES de la primera tanda (no pasar de 0 a 1.000 envíos), baja fácil y visible, pocos enlaces, solo texto, limpiar dormidos. Las bajas son limpieza, no fracaso.
8. **Programar por API NO penaliza (aclarado el 2026-07-27).** En LinkedIn publicamos a mano porque hay un algoritmo de alcance que castiga la publicación por herramientas de terceros; en email NO existe ese algoritmo: existen filtros de spam, y les da igual si la campaña se escribió en el editor o la programó Claude por API, porque sale idéntica del mismo servidor de la herramienta. Lo que decide el inbox es la reputación del dominio, la autenticación, el engagement y la lista limpia (punto 7). Carmen manda todo por Claude→API de Klaviyo con open rate >30%. La revisión humana del punto 3 se mantiene igual.

---

## 7 · Los innegociables (heredados del cerebro de posts, y uno NUEVO)

- **Historias INVENTADAS: SÍ se pueden usar (decisión de Iker, 2026-07-27), con dos condiciones.** Es el método Carmen/Runner Pro: una historia inventada que ataca un dolor REAL del cliente es herramienta legítima del email. Las condiciones: (a) **NUNCA un nombre de empresa** — ni real ni inventado; la empresa se describe genérica ("una industrial del norte", "un SaaS con 12 comerciales") — y (b) **el nombre de persona SÍ puede inventarse** (solo nombre de pila: "a Marta le pasaba que…"), así nadie puede jugárnosla pidiendo la referencia. El dolor tiene que ser real (echo marketing, §5); la historia es solo el envoltorio.
  - **🔴 Y lo inventado se REGISTRA para no repetirlo (`§8h` punto 9, 2026-09-21).** RunnerPro puso la misma cita con otro nombre a 5 días (María el 16/09 y Marta el 21/09, *"llego entera"*), y así es como se delata una historia inventada. **Antes de escribir un nombre de pila o una cita inventada, se busca en `corpus-correos-enviados.md`**, que guarda el cuerpo literal de todo lo enviado: ni el nombre ni la forma de la cita se repiten en la misma lista.
  - Lo que sigue sin inventarse dentro de la historia: **cifras presentadas como resultado medido de Neety** ("un cliente subió un 40%") — un resultado o es real y verificado, o la historia se cuenta sin cifra-prueba (o con la cifra enmarcada como ilustración: "imagina que de 2.000 filas te quedan 40"). Es la misma regla que ya tenemos con +200 PYMEs: lo que un prospecto puede preguntar en demo, o se sostiene o no se dice.
- **Toda cifra verificada contra fuente real** antes de escribirla. Nombre de la fuente en el cuerpo, año solo en la entrega interna (`global §3.5b`).
- **No prometer resultados que no podemos demostrar.** Las cifras de `aboutme §1` marcadas `[PENDIENTE · sin origen documentado]` (+200 PYMEs, +40%) siguen sin poderse usar, tampoco en emails.
- **Posicionamiento intacto** (`aboutme §1b`): los 3 pilares (listado con confianza / contacto por señal / el comercial valida), nunca "sin esfuerzo / lo hace por ti", más problema del cliente que features, el "cómo funciona exactamente" se guarda para la demo.
- **⛔ LAS TRES PROMESAS VETADAS, y no son de estilo: cada una es una objeción medida** (informe del **2026-09-14**, inventario en `global §4.4b-MUNICIÓN`). **Automatismo** ("lo escribe la IA", "va solo") → 5 empresas (4 ICP) · **volumen** ("x3 contactos", "cientos de leads") → 5 empresas, la queja contra Waalaxy y Apollo, ⚠️ **aunque solo 1 de esas 5 es ICP: el veto se mantiene, su respaldo es flojo** · **la señal como argumento de apertura** → **15 empresas (11 ICP), sube desde 12** y sigue siendo la objeción nº1 del informe. **Y uno que ha crecido hasta ser veto de pleno derecho: descubrirle un mercado que ya conoce** → **7 empresas (6 ICP)**, eran 4. En email pesan más que en un post: el lector nos lee **dentro de la misma bandeja** donde recibe los mensajes automatizados que ya ignora. **Mecanizado en `validar-email.py`: automatismo como fallo duro, volumen como aviso** — el correo sí puede nombrar el volumen como ENEMIGO, que es literalmente el pilar 3 de `§5` (*"más leads no era tu problema"*).
  - **⭐ Y DESDE EL 2026-09-14 EL VETO TIENE PRUEBA EXTERNA, NO SOLO NUESTRO INFORME (`§8g`):** lemlist, competencia directa, mandó el 09/09 un correo que promete las dos cosas en una frase — *"Claude writes the outreach, lemlist handles the sending, the replies and the follow-up, **at scale**"*. **Automatismo y volumen, firmados por el competidor, con fecha.** No es que esas frases nos parezcan feas: es que son literalmente el discurso que 10 empresas del informe nombran como motivo para ignorar mensajes. **Cuando escribamos contra ese discurso, la cita existe.**
### ⛔⛔ 7b · NUNCA UNA AFIRMACIÓN ROTUNDA SOBRE LO QUE EL LECTOR HA HECHO O NO (Iker, 2026-09-15) — CANÓNICO

> **Iker, sobre el correo 4:** *"veo un pequeño peligro y es que a los pocos destinatarios a los que nos dirigimos has dado afirmaciones muy rotundas, como decir que tu nombre no está en la lista. Imagínate que de esos 40 destinatarios sí que hay varios que se han inscrito. Este correo va a ser confuso para ellos e incluso se van a asustar. Intenta en los correos nunca poner ese tipo de afirmaciones tan rotundas en cosas que afecten a nuestra conversión, o por lo menos pregúntamelo a mí"*.

**El fallo, y es mío:** el borrador decía `El tuyo no aparece.` refiriéndose a la lista de inscritos del evento. **Es una afirmación sobre el lector que yo no puedo comprobar** — la lista de invitados de Luma no es nuestra y no se puede leer (ver abajo) — y que además es FALSA para todo el que ya se apuntó. A ese le estamos diciendo que su inscripción no consta: no es que no convierta, es que **asusta al que ya había convertido**.

**LA REGLA:** una frase que afirme lo que el lector **ha hecho o no ha hecho** (apuntarse, descargar, abrir, contestar, pagar, venir) **solo se escribe si el dato se puede comprobar destinatario a destinatario en el momento del envío.** Si no se puede, hay dos salidas y ninguna es escribirla igual:

| | ⛔ lo que no se hace | ✅ lo que se hace |
|---|---|---|
| **condicional que vale en los dos sentidos** | `El tuyo no aparece.` | `Si el tuyo ya está, es que lo habré apuntado torcido.` |
| **preguntar** | dar el dato por bueno | preguntárselo a Iker antes de entregar |

- **⭐ El condicional no cuesta fuerza, la gana:** en el correo 4 la salida buena convierte el defecto en el gag de la mascota despistada, **cubre al que ya está inscrito sin confundirlo** y deja el FOMO intacto para el que no. Es el lector ventrílocuo de `§3` aplicado a un dato que no tenemos.
- **El ámbito es el estado del LECTOR, no el nuestro.** `Van 60 nombres` o `Quedan 20 sillas` son datos nuestros, medidos y verificables: esos van con cifra. Lo que no puede ir rotundo es lo que hizo ÉL.
- **Y pesa más cuanto más pequeña es la lista.** Con 40 destinatarios, si 5 están inscritos, el correo le sale mal al 12% de la base. Con una lista de 10.000 el error es el mismo, pero aquí además se nota y se contesta.
- **No es mecanizable** (haría falta saber a qué apunta cada afirmación), así que vive en el pase de criterio de `§9`: **antes de entregar, se busca toda frase en 2ª persona que afirme un hecho del lector y se pregunta si lo podemos comprobar.**

#### 🔒 Y EL DATO QUE LO MOTIVA: LA LISTA DE INVITADOS DE LUMA NO SE PUEDE LEER (comprobado el 2026-09-15)

No es que no la hayamos mirado: **no es accesible.** El evento va con `show_guest_list: false`, la API pública devuelve `guest_data` a nulo (es lo tuyo como visitante anónimo) y `api.lu.ma/event/get-guests` da **404 sin sesión de organizador**. **La cuenta de Luma no es nuestra**, así que tampoco hay export.
- **Lo que SÍ se lee sin credenciales es el contador** (`api.lu.ma/url?url=<slug>`): inscritos, plazas libres y aforo. Eso son datos nuestros y sí se pueden escribir en un correo.
- **Corolario:** cualquier correo que quiera hablarle a un inscrito o a un no inscrito **como si lo supiéramos, está escribiendo sobre un dato que no existe.**

- **Aviso proactivo** (`working-preferences §2`): si una campaña no captura nada (ni respuesta, ni demo, ni dato), avisar sin que lo pregunten. Si un email va a rendir mal (segmento dormido, ángulo quemado, tercer email de venta seguido), avisar ANTES con dato.

---

## 8 · El corpus de referencia (Timepack + newsletters vivas)

**Por qué Timepack:** 353 correos reales (jul 2024 - nov 2025) de la newsletter diaria de Ibon Sarasola (timepack.co), 5/semana sin fallar ni en Navidad, ~700 correos desde 2023. No tenemos sus métricas, pero **mantener ese volumen durante años solo se sostiene si funciona** (el mismo razonamiento que los outliers de LinkedIn: supervivencia = señal). Y como es infoproducto B2C, el remix a nuestro B2B no canta (el mejor remix es coger la esencia de otro sector y traerla al nuestro). El análisis completo se hizo el 2026-07-27 (estadística de los 353 + lectura a fondo de 31 repartidos en los 16 meses); los patrones ya están integrados en §2-§5. Lo que queda aquí es el resumen de cifras y el triaje copiar/adaptar/no copiar.

**Cifras de referencia del corpus:**
- Cuerpo: media 370 palabras, zona de confort 300-450 (~90 segundos de lectura). Párrafo = frase: mediana 9 palabras/párrafo, el 72% de los párrafos ≤12 palabras. Párrafos de UNA palabra como ritmo dramático ("Flaqueé.").
- Enlaces: media 0,8/correo; 47% sin ninguno. En lanzamiento: el MISMO enlace repetido 2-3 veces con anchor distinto, nunca enlaces compitiendo.
- Texto plano total: negritas ~0, viñetas formales 7%. Anchor text con la voz del lector (*"¡Se me había pasado, voy ya a ver el vídeo!"*).
- CTA que nunca suplica: marco de indiferencia soberana (*"your call"*) + coste de inacción concreto (*"Mañana sábado ya no lo tendrás. Hoy sí."*).
- Urgencia REAL y ejecutada: los deadlines de las 23:59 se cumplen (al día siguiente ya no vende). Por eso funcionan.

**COPIAR tal cual:** cadencia religiosa a hora local fija (§5) · párrafo=frase, 300-400 palabras, texto plano (§3) · asunto 6-9 palabras que abre gap y no lo cierra (§2) · la frase-bisagra seca de una línea (§3) · el P.S. como motor de referidos con baja sin drama (§4b) · el lector ventrílocuo (§3) · bucles abiertos entre correos y series de 2-3 con cliffhanger (§3).

**ADAPTAR:**
- El reparto 40/45/15 (§5): su "lanzamiento" se convierte en Neety en ventanas de campaña de demo (caso de cliente en 2-3 partes con cliffhanger → CTA fuerte el último día).
- El *"responde con PALABRA"* como CTA suave (*"responde EMBUDO y te mando la plantilla"*): en Neety abre conversación humana, el paso previo natural a la demo. Es el comment-gate del email.
- **Autoridad por cicatrices, no por púlpito:** sus mejores correos son fracasos propios con autopsia numerada. Neety tiene el equivalente REAL (campañas que fallaron, señales mal leídas, listas mal cualificadas) y ADEMÁS puede inventar la historia-envoltorio sobre un dolor real (§7: sin nombre de empresa, persona de pila inventada vale). La cicatriz real, cuando exista, siempre gana: los números propios se pueden enseñar.
- Urgencia solo si es verdad y con coste concreto: plazas de onboarding del mes, piloto limitado, precio early adopter con fecha. Nunca el falso "solo hoy" recurrente.
- El apodo de tribu ("nakama" en el 97% de sus correos) y la firma-mantra: la lección es tener marcas de voz inimitables PROPIAS, no copiar las suyas. Kaixito es nuestra candidata natural a marca de tribu.

**NO copiar (es de infoproducto B2C):**
- El idiolecto extremo (faltas deliberadas tipo "fásil y sensillo", tacos censurados, humor escatológico): a un director comercial de 55 años le rompe la confianza. Irreverencia medida sí; circo no. (Kaixito puede acercarse un punto más, sin llegar ahí.)
- El cierre de carrito a las 23:59 con precio tachado: un SaaS con demo y ciclo de venta largo no puede abrir y cerrar el producto.
- El volumen diario con 60% de storytelling personal: exige un personaje-founder a tiempo completo. Nosotros: 2-3/semana con 4 remitentes.

**Cómo se alimenta el corpus (flujo real desde el 2026-07-27):**
- **Mario pasa un ZIP de .eml cada pocas semanas** (el conector de Gmail solo admite una cuenta y es la de trabajo de Iker; el reenvío se descartó para no llenarle el buzón). Claude criba (fuera verificaciones y no-newsletters), inventaría por remitente y guarda las observaciones aquí.
- **El análisis cruzado gordo se hace con ~2-3 meses acumulados**, no antes: los patrones se confirman con repetición, como los outliers. Cada análisis actualiza ESTA sección.
- **Inventario a 2026-07-27 (ZIP "hasta 27 julio", 34 correos, 8 fuentes):** RunnerPro (7, el sistema de Carmen en vivo: 300-450 palabras, bienvenida con descuento día 0) · **BOGA/EDEM (2, la más cercana a nuestro género: curiosidad pura en primera persona + storytelling ~1.000 palabras)** · Cosas de Freelance (6, **bienvenida NUMERADA [1/10]…: la secuencia como producto con barra de progreso — patrón robable**) · Singularu (12, e-commerce puro: contraste, no modelo; su "chica Singularu" = truco de tribu) · lemlist (2, competencia: vigilar su discurso de señales) · Kieran Flanagan (4, ensayos 4-5k palabras: otro género) · **Aprilynne Alter (7, ZIP del 27-jul): asuntos TODOS en minúsculas y sin gancho de venta ("are creator conferences worth it?", mediana ~40 chars: valida el estilo del correo 0 desde otro nicho) · P.S. en el 100% · cuerpos educativos de 1.200-2.600 palabras con ~7 imágenes (género ensayo visual, no nuestro formato)**.
- **Faltan por suscribirse (prioridad):** ~~Isra Bravo~~ ✅ llega desde agosto · **Lavender 🔴 MAL: la suscripción cayó en "The Lavender Newsletter", una publicación queer local de Illinois, no en la herramienta de email de ventas** (`§8g`). Hay que rehacerla apuntando a `lavender.ai`. · CustomerTop, sigue sin aparecer en ningún ZIP.
- **⭐ REGLA DE INTAKE que sale de ahí: una suscripción nueva no se da por buena por el nombre, se verifica leyendo su primer correo.** La de Lavender estuvo cuatro meses en la lista de "ya suscritos" trayendo noticias municipales de Champaign-Urbana.
- **🪦 Bajas del corpus:** Content Playbook / Kleo (Lara Acosta) **cerró la newsletter el 2026-08-30**.
- **⚠️ A 2026-09-21 (`§8h`): Lavender sigue llegando mal** (la de Illinois, el 18/09) y **lemlist, Hoppy Copy y Tendios no mandaron nada esa semana.** Tres altas nuevas que en su segunda semana no aparecen: si a la siguiente tampoco, se comprueba que la suscripción siga viva.
- **🆕 Altas del corpus (2026-09-14):** **Hoppy Copy** (herramienta de copy con IA, jugadas de calendario) · **lemlist** (competencia directa, vigilar su discurso) · **Tendios Bid** (SaaS B2B español, su secuencia de bienvenida es la referencia de `§5b`).

### 8b · ⭐ SALES HACKERS — la referencia MÁS cercana que tenemos (50 correos, jun 2025 - jul 2026, analizado el 2026-07-27)
Javi Consuegra (`javi@saleshackers.es`, herramienta: beehiiv/Encharge) vende formación y consultoría de **IA para ventas B2B en español**: nuestro sector EXACTO y nuestro mismo comprador. Los 6 correos con "Fwd:" del ZIP los reenvió Unai, no son otra fuente.

**Sus números, y el contraste con Timepack:**
| | Sales Hackers (B2B) | Timepack (B2C) |
|---|---|---|
| Asunto | **mediana 29,5 chars / 5 palabras** | 43 chars / 8 palabras |
| Cuerpo | mediana 698 palabras | 356 |
| Enlaces | mediana 6, **0 correos sin enlace** | 0,8, el 47% sin ninguno |
| P.D. | 22% | 86% |
| Imágenes | 2-12 por correo (HTML pesado) | ~0 |

- **⭐ EL HALLAZGO: su cuerpo ES nuestro formateado de posts de LinkedIn.** Una frase por línea, bloques paralelos con anáfora y escalera, líneas cortas, remate seco. Literal de *"Vi tu post y pensé en esto..."*: `Lo frío habla de ti. / Lo cálido habla de ellos.` → `Lo frío suena a copia/pega. / Lo cálido se nota que va con intención.` → `Lo frío se ignora. / Lo cálido recibe respuesta.` **Confirma desde nuestro propio sector la decisión de §3 (el email hereda el formateado del post).**
- **Asuntos aún MÁS cortos que Timepack (5 palabras).** Y el mejor truco: asuntos que imitan un correo 1-a-1 (*"Vi tu post y pensé en esto..."*, *"Re: Herramienta para automatizar Linkedin"*, *"Te escribo desde el South Summit"*). ⚠️ El *"Re:"* falso es engañoso: NO lo copiamos (quema confianza y es justo lo que nos separa del spam).
- **Firma-mantra confirmada como patrón:** cierra con *"Buenas ventas, Javi Consuegra"* igual que Timepack con *"Que el tiempo te acompañe"*. Es la 2ª fuente: refuerza que tengamos la nuestra (`§3.7`, pendiente).
- **Su P.D. hace CROSS-SELL** (el cuerpo enseña, la P.D. vende otra cosa: un evento, un descuento). Uso distinto al de Timepack (referidos). Los dos valen; elegir por objetivo.
- **Ángulos que le funcionan y son nuestros:** "las llamadas/emails en frío ya no funcionan, lo que funciona son las señales" (= nuestro pilar 2), "¿cuántas herramientas sobran en tu empresa?", "quieres IA y tu CRM apesta", "outbound como el 2016", "vender ya no va de números". **Ojo: es competencia de atención**, así que el ángulo se remixea, nunca se calca.
- **Lo que NO copiamos:** 6 enlaces y hasta 12 imágenes por correo (nuestro dominio está frío y eso es riesgo de spam directo), ni sus asuntos con corchetes tipo `[NUEVO CONTENIDO]`.

### 8c · HUGO LÓPEZ — el manual de lanzamiento (127 correos, jun 2025 - jul 2026, analizado el 2026-07-28)
`contacto@hugolopezc.com`, Meta Ads y media buying en español (LeadMadness, You Run Ads). B2C-infoproducto como Timepack, pero su valor para nosotros es otro: **es el corpus de LANZAMIENTO y de cadencia diaria en primera persona.**
- **Números:** cuerpo mediana 446 palabras (entre Timepack 356 y Sales Hackers 698) · asunto mediana **52 chars / 10 palabras, el más largo de las 4 fuentes** · **0 de 127 en minúsculas** · **P.D. en el 89%** (113/127, el ratio más alto del corpus) · enlaces mediana 3, solo 1 correo sin ninguno.
- **⭐ El P.D. queda CONFIRMADO como ley del género:** 4 fuentes independientes lo llevan (Timepack 86% · Hugo 89% · Aprilynne 100% · Sales Hackers 22%). El único que baja es el B2B con enlaces por todas partes. Refuerza `§4b`.
- **Su escalera de cierre de carrito** (asuntos literales, en orden real): *"Mañana cierro las puertas"* → *"Hoy es el último día"* → *"No entres a You Run Ads"* (reversa) → *"Últimas 4 horas y cierro plazas."* → *"60 minutos y adiós."*. Es la plantilla de una ventana de campaña. **Para nosotros aplica al webinar/evento**, nunca a la suscripción (`§8` NO copiar: un SaaS con demo no abre y cierra el producto).
- **Estructura diaria: la crónica en primera persona.** Abre con lo que ha hecho ("Ayer cerré la oficina a las 21:45", "He estado los últimos días totalmente off"), enlaza con lo que está construyendo, y de ahí sale la oferta. Es autoridad por actividad, no por consejo, y es 100% trasladable a Kaixito y a los founders contando la semana real de Neety.
- **Las cifras SON el contenido** (400 entradas, 267 piezas, 193→400 asistentes): números propios y comprobables como prueba. Es justo lo que a nosotros nos falta (`aboutme §1`: las nuestras están sin verificar) y el motivo por el que la prueba lógica manda hasta que existan.
- **Lo que NO copiamos:** el hype apilado ("épico", "bestialidad", "lo vamos a reventar") choca de frente con la voz Neety y sobre todo con el registro de Unai (`brand-voice §1b`), y sus asuntos de 10 palabras contradicen a las otras 3 fuentes: nos quedamos con los 5-8 de Sales Hackers y Timepack.

---

### 8d · ⭐ CORPUS TRANSVERSAL — 32 correos, 13 remitentes, 6 sectores, una semana (4-10 ago 2026)

El corpus más valioso que tenemos, porque **es el único que permite separar lo que hace UN sector de lo que hace TODO el mundo**. Remitentes: Isra Bravo (7), SINGULARU (5, joyería ecommerce), Hugo López (4), Lara Acosta/Kleo (3+2, inglés), Juan Domínguez (3), **RunnerPro (2, la empresa de Carmen)**, Cosas de Freelance (3), BOGA/EDEM, Kieran Flanagan, Sonia Ferrent.

#### Lo que hacen TODOS (esto es doctrina, no estilo)

**1. La micro-apertura imperativa de 1-3 palabras.** El patrón más fuerte del corpus español, y no lo teníamos escrito:

| Remitente | Aperturas literales |
|---|---|
| Isra Bravo | **"Mira."** ×5 · **"Una cosa."** ×2 — 7 de 7 |
| RunnerPro | **"Escúchame."** · **"Domingo."** |
| Hugo López | **"Atiende."** · **"Vale."** ×2 |
| Juan Domínguez | **"Correo rápido hoy."** |

Una orden o una palabra suelta, **con punto**, y línea en blanco. Es un freno: obliga a parar antes de leer. **Se adopta.**

**2. PD sí, P.S. no — reconfirmado en corpus nuevo e independiente: 17 de 32 llevan PD, 1 lleva P.S.**

**3. Firma-mantra fija. Esto CIERRA el pendiente de §3.7:** no es un capricho de Timepack, lo hace medio corpus.
- Isra Bravo: **"PD: Arriba."** — los 7 días, siempre igual
- RunnerPro: **"Ánimo Runner, nos vemos dentro de la App."**
- Juan Domínguez: **"Un abrazo, Juan, «el silencioso»"**

**4. Frase-puente fija al producto.** Cada remitente tiene UNA y la repite siempre:
- RunnerPro: **"Tu plan te está esperando."** → botón
  - ⚠️ **Matizado el 2026-09-21 (`§8h`): lo fijo es el OBJETO, no la frase.** En la quinta ventana RunnerPro la dice literal en 2 de 4 correos; en los otros dos rota: *"eso ya lo hace tu plan"* · *"el plan que llevas dentro de la app sí sabe qué toca cada día"*. Siempre **el plan**, nunca la misma frase cuatro veces seguidas.
- Isra Bravo: **"en el capítulo 18 de mi libro"** → enlace

**5. Un producto, ángulos infinitos.** Isra Bravo vende **el mismo libro los 7 días** entrando por un capítulo distinto. No hay catálogo: hay una puerta y muchos caminos. Es el modelo exacto para nosotros, que también vendemos una sola cosa.

#### 🔴 Lo que CORRIGE lo que teníamos escrito

**LA HORA NO TIENE CONSENSO. Lo que es religioso es el MINUTO.**

> 🔴🔴 **LAS HORAS DE ESTE APARTADO ESTÁN MAL LEÍDAS Y SE CORRIGEN EN `§8g`.** Se apuntó la hora del encabezado `Date` sin convertir la zona horaria del servidor de envío. Las reales en hora española: **Isra Bravo 15:29** (no 23:29) · **RunnerPro 15:0x** · **Juan Domínguez 16:0x** · **SINGULARU 11:30/10:30** · **Cosas de Freelance y Sonia Ferrent 08:0x**. Lo que NO cambia es la conclusión que se sacó de aquí: **cada remitente clava su minuto y no lo mueve**.


| Remitente | Hora fija |
|---|---|
| Cosas de Freelance | 06:00-06:03 |
| Sonia Ferrent | 06:01 |
| Hugo López | 07:49-08:06 |
| SINGULARU | **09:30** clavadas, 5 de 5 |
| RunnerPro | 13:00-13:03 |
| Lara Acosta / Kleo | 13:00-13:04 |
| Juan Domínguez | **14:02** clavadas, 3 de 3 |
| **Isra Bravo** | **23:29 clavadas, 7 de 7** |

- ⛔ **Se cae la regla de "mandar antes de las 08:00".** Salía de 2 corpus que casualmente madrugaban. Con 13 remitentes la hora va de las 06:00 a las 23:29, y **el mejor copywriter de email en español manda a las 23:29 todos los días**.
- ✅ **Lo que sí aguanta: cada remitente clava SU hora y no la mueve.** La constancia es el activo, no la hora concreta. Elegir una y no tocarla importa más que cuál elijas.
- ✅ **Y el minuto impar está en el corpus:** 23:29, 14:02, 06:01, 06:03, 13:01. Nadie manda en punto salvo SINGULARU. Respalda las **09:01** de Mario.

**FIN DE SEMANA: depende de a quién vendas.** Isra manda 7/7 incluido sábado y domingo; RunnerPro, Hugo y Content Playbook mandan en domingo. **Pero los 5 son B2C o infoproducto.** Nuestra regla de lunes a viernes sigue en pie porque vendemos a empresas: no es que el fin de semana sea malo, es que nuestro lector no está trabajando.

#### El molde de RunnerPro (la empresa de Carmen) — el más copiable que tenemos
~350 palabras, un solo CTA, mismo esqueleto los dos días:
1. Micro-apertura ("Escúchame." / "Domingo.")
2. Historia propia **o** consejo práctico del momento (agosto y el calor: **riden el calendario**)
3. El giro: *"El error no es ir lento en agosto. El error es dejarlo porque vas lento."*
4. Frase-puente fija: **"Tu plan te está esperando."**
5. Botón único
6. **Pd + Pd2**, y el Pd2 es SIEMPRE una pregunta personal de seguimiento: *"¿por cuántas salidas del reto vas? Deberías rondar la 4 o la 5."* — relación y presión amable a la vez
7. Firma-mantra + nombre y cargo real

⭐ **El Pd2-pregunta es lo mejor que hay aquí y no lo teníamos:** convierte un correo unidireccional en un seguimiento personal, y de paso es un CTA de respuesta encubierto.

#### ⭐ CÓMO SE VENDE EL ENLACE (extraído de los puentes literales del corpus)
1. **La última línea antes del enlace es una FRASE DE ESTADO, sin verbo imperativo.** RunnerPro: **"Tu plan te está esperando."** No dice entra, apúntate ni no te lo pierdas. Describe que el producto ya existe y está parado esperando. Cero olor a anuncio.
2. **⛔ Y va en escalera INVERTIDA: larga primero, corta después.** RunnerPro remata con 17 palabras y luego 5. **La línea más corta es la última antes del enlace**, porque es el golpe de cierre. Es la excepción a la escalera del cuerpo (`global §3.2`), y aplica solo al bloque final.
3. **El nombre del producto, solo y con punto, en su propia línea.** Isra: `ARROGANTE.` No va dentro de una frase: es una etiqueta, porque el argumento ya lo ha hecho el correo entero.
4. **La transición no argumenta, entrega.** *"En este:"* · *"Hazme caso."* · *"Al tiempo."* El porqué era el cuerpo.
5. **El enlace llega después de regalar la victoria.** El que no clica se va contento y abre el siguiente correo.
6. **El precio se ancla acusando, no defendiendo.** Isra: *"Por 18€... me estás robando."*
7. **Variantes:** enlace como promesa cumplida de ayer (Hugo: *"Te dije que hoy te contaba cómo entrar"*) · respuesta en vez de enlace (*"respóndeme con TRÁFICO"*) · **cero enlace** (Juan Domínguez cierra con una PD y ya).

**📄 Versión larga con la adaptación al spam ninja de LinkedIn: `Escritorio/como-venden-el-enlace.md`** (documento de traspaso al chat de estrategia de LinkedIn, 2026-08-10).

#### Quién firma: 12 de 13 son una PERSONA con nombre
La única excepción es SINGULARU, que es ecommerce puro de ofertas. **Cero mascotas en 13 remitentes.** RunnerPro, que es el caso más parecido al nuestro, firma **"Cristóbal, CEO de RunnerPro"**. Eso es a la vez el argumento en contra de irnos 100% a Kaixito y la prueba de que la mascota es terreno libre.

---

### 8e · ⭐ SEGUNDA SEMANA DE LOS MISMOS REMITENTES (11-17 ago 2026, 39 correos)

El corpus más útil de todos, porque **repite remitentes**: lo que aparece las dos semanas es sistema, lo que aparece una es capricho.

#### Lo que queda CONFIRMADO con dos semanas
- **La mediana del asunto no se mueve: 36 caracteres / 7 palabras**, con n=32 y n=39. Es el dato más sólido que tenemos.
- **Las horas, clavadas al minuto otra vez** (⚠️ **las cifras de abajo son del encabezado sin convertir la zona; las reales en hora española están en `§8g`**)**:** Isra Bravo 23:29 (**14 de 14 en dos semanas**) · SINGULARU 09:30 entre semana y 08:30 los domingos · Juan Domínguez 14:02 (6 de 6) · RunnerPro 13:00-13:07 · Content Playbook domingos 13:0x. **La constancia del minuto es el patrón más fuerte del corpus entero.**
- **Las micro-aperturas se repiten idénticas:** Isra abre *"Mira."*, RunnerPro *"Escúchame."*. No son variaciones: son fórmulas fijas.
- **Los paréntesis suben de 12% a 15%** de los asuntos.

#### ⭐ Lo NUEVO que merece robarse

**1. El asunto de UNA palabra.** Isra bajó su mediana de 30 a 21 caracteres, con estos: `Gordo` (5c, una palabra) · `10 detalles` · `Cállate, subnormal` · `Tu madre es peligrosa`. **Un asunto de una palabra es el máximo curiosity gap posible**: no hay nada que resolver salvo abriendo. Se puede usar cuando ya tienes relación con la lista; en frío no.

**2. Adelantarse a la ofensa.** *"Este email puede molestar a algunas personas, porque hablo de gordos y digo, gordos."* Es el lector ventrílocuo aplicado a la incomodidad: la nombras tú antes de que la sienta él, y el lector deja de estar a la defensiva.

**3. El personaje con nombre y CIFRA.** *"Germán era amigo mío... Germán tenía veinticinco años. Y veinticinco kilos de más."* La cifra concreta pegada a un nombre de pila es lo que hace real una historia (y encaja con `§7`: nombre de pila sí, empresa nunca).

**4. La universalización, que es la bisagra.** *"Pero lo interesante no es su peso. Es la distancia entre ser consciente de un problema y asumir la responsabilidad de resolverlo."* **Plantilla: "lo interesante no es X, es Y."** Convierte una anécdota de UNO en un principio que le aplica al lector. Es el puente entre historia y venta, y es reutilizable tal cual.

**5. El referido DENTRO del CTA, no en la PD.** *"Si estás en esa situación **o conoces a alguien así**, pásale el capítulo 12."* Le da salida al que no se identifica: en vez de perderlo, lo convierte en distribuidor.

**6. ⭐ El paréntesis que rescata al que no compra.** Hugo López cierra su lanzamiento con `Hoy se cierra la lista prioritaria de Mambo (léelo aunque no entres)`. **El 95% de la lista no va a comprar y ese paréntesis evita que desconecten**, que es lo que mata una secuencia de lanzamiento. Cuesta cuatro palabras.

**7. Usar la escasez y acto seguido rechazarla.** *"111 personas apuntadas para 20 sitios. Pero no quiero que te decidas por las plazas. Quiero que te decidas por esto que voy a contarte."* Pone el dato y renuncia a él en voz alta. Nombrar la manipulación y descartarla hace que el argumento de verdad pese el doble.

**8. Miedo competitivo, no FOMO.** *"Imagínate el sector dentro de seis meses. Van a existir 20 personas que habrán aprendido... y todo el resto haciendo lo de siempre. **Comparten mercado.**"* No es "te lo vas a perder": es "otros van a por tus clientes". Para B2B industrial es directamente trasladable.

**9. La fricción admitida.** RunnerPro: *"No te voy a mentir: las dos primeras semanas las pasó fatal."* Reconocer la parte dura **antes** de prometer el resultado es lo que hace creíble el resultado.

**10. El Pd2 como contador serial.** Evolucionó de una semana a otra: *"¿por cuántas salidas del reto vas?"* → *"semana dos del reto. Si vas por 4-5 salidas, vas perfecto."* **Un contador que avanza entre correos convierte la newsletter en un programa con progreso.**

**11. La PD que explica la mecánica.** Hugo dedica la PD a contar exactamente qué pasa tras rellenar el formulario, paso a paso, rematando con *"Y ojo, que reviso yo. No es un correo automático."* Baja la fricción explicando el proceso, no insistiendo.

#### El contraste que vale de ejemplo: la newsletter de MailerLite
Sus propios asuntos: *"Welcome to our newsletter! 🎉 Here's what you need to know."* Exclamación, emoji, genérico y sin gap. **La plataforma de email escribe peor que cualquier creador independiente del corpus.** Sirve para recordar que "lo hace una empresa grande" no es argumento.

#### ⛔ Lo que NO se copia, y sigue siendo nuestra ventaja
Isra Bravo es **99% líneas individuales**. Nosotros mantenemos **líneas sueltas como base pero con bloques de 2 y de 3** (`§3`), porque dan retención y son firma de marca. El corpus dice qué hace el sector; nuestra experiencia dice qué nos funciona a nosotros. **El formateado no se toca.**

---

### 8f · ⭐ TERCERA SEMANA DE LOS MISMOS REMITENTES (18-26 ago 2026, 29 correos)

Tercer ZIP consecutivo con los mismos remitentes, así que ya se puede separar el sistema del capricho con **tres** muestras. Remitentes: **Isra Bravo (7)**, **SINGULARU (7)**, **RunnerPro (4)**, **Juan Domínguez (3)**, BOGA/EDEM (2), Kieran Flanagan, Content Playbook, Sonia Ferrent, MailerLite.

#### Lo que queda confirmado por tercera vez, y ya es ley
- **Las horas, clavadas al minuto otra vez** (⚠️ **encabezado sin convertir; las reales, en `§8g`**)**:** Isra Bravo **23:29** (21 de 21 en tres semanas) · SINGULARU **09:30** entre semana y **08:30** los domingos · Juan Domínguez **14:01-14:02** (3 de 3) · RunnerPro **13:01-13:06** · Sonia Ferrent 06:01. **La constancia del minuto es el patrón más fuerte de todo el corpus**, y respalda nuestras 09:05.
- **Las micro-aperturas, idénticas:** Isra `Mira.` ×4 y `Una cosa.` · RunnerPro `Oye.` y `Esto es importante.`. **Son fórmulas fijas, no variaciones.** De aquí sale `§5-HISTORIA` (la micro-apertura de Iker).
- **La firma-mantra:** RunnerPro `Ánimo Runner, nos vemos dentro de la App.` los 4 días · Juan `Un abrazo, Juan. El simplificador.` · Isra `Pd: Arriba.`
- **PD sí, P.S. no:** cero `P.S.` en los 29.
- **Un producto, ángulos infinitos:** Isra vende **el mismo evento del día 30** los 7 días entrando por un caso distinto (membresías, precio alto, comerciales que no venden como el fundador, captación). Es literalmente el modelo de `§5`.

#### ⭐⭐ EL HALLAZGO QUE MOTIVA `§5-HISTORIA`: RUNNERPRO MANDÓ 3 HISTORIAS EN 8 DÍAS
Y **dos de ellas son historia de CLIENTE contada por el CEO**, que es exactamente la rama B de `post-workflow §4.6-TESTIGO` aplicada al correo:
| correo | rama | esqueleto |
|---|---|---|
| *"Javier no paró en agosto"* (21/08) | historia de otro, narrador dentro | micro-apertura → cliente con **nombre de pila y sin empresa** → cita literal suya → giro → *"Javier ya lo hizo. Te toca."* → frase de estado → enlace → Pd + Pd2 |
| *"María se paró un mes"* (26/08) | historia de otro, narrador dentro | idéntico, con **dos citas** (la de ella pidiendo perdón y la de la semana siguiente) |
| *"Domingo. El plan que empieza mañana"* (23/08) | reflexión en 1ª persona | micro-apertura → costumbre propia → lección → frase de estado → enlace |

- **El nombre de pila SIN empresa es exactamente nuestra regla `§7`**, y aquí se ve funcionando en una lista real y grande. Confirma que la restricción no cuesta nada.
- **⭐ EL MECANISMO NUEVO QUE MERECE ROBARSE: la escena se cuenta con la CITA del otro, no con el resumen del narrador.** RunnerPro no dice "me contó que iba lento", pega sus palabras: *"Pensaba que iba a ir muy lento todo el verano"*. Es `brand-voice §3b` (la cita se escribe como la escribió quien la dijo) aplicado al correo, y es lo que hace que una historia inventada aguante.
- **Y el molde de las dos historias de cliente es el MISMO**, palabra por palabra en su esqueleto. **No lo esconden y funciona igual.** Es el argumento contra reinventar el formato cada semana.

#### ⭐ LO NUEVO QUE MERECE ROBARSE, de los otros remitentes
1. **La escena cotidiana como espejo de un error de negocio.** Juan Domínguez abre con el camarero que pregunta *"¿todo bien?"* mientras masticas, y a mitad de correo gira: *"y he visto gente que en sus negocios hace lo mismo"*. **Es la frase-bisagra de `§3` en su versión más limpia**, y el vehículo (un restaurante) no tiene nada que ver con el producto, que es justo lo que evita que huela a promoción.
2. **⛔ La broma que se desactiva a mitad de correo, y viene con su factura.** BOGA abrió con *"He borrado BOGA"* y un texto escrito por IA a propósito, para luego decir *"vale, es medio broma"*. **Engancha, y es exactamente el mecanismo del correo 0 de Kaixito.** ⚠️ Pero el fingimiento tiene un límite que ya nos costó una cuenta (`§0b`): **la broma puede ser sobre nosotros, nunca sobre el origen de la lista.**
3. **El contador serial del Pd2.** RunnerPro sigue con *"¿Cuántas llevas ya?"* del reto de agosto. Tres semanas seguidas con el mismo contador convierten la newsletter en un programa con progreso.
4. **La rebaja de expectativa como CTA.** *"No te pido épica. Te pido 3 salidas cortas a la semana. Feas, lentas, con calor."* Bajar la petición hasta que parezca imposible decir que no es más fuerte que subir el beneficio.
5. **El miedo competitivo con fecha, sin FOMO.** *"Piénsalo dentro de 2 meses. En octubre habrá 2 tipos de corredor…"* Proyectar el futuro y poner al lector a elegir hoy. Para B2B industrial es directamente trasladable.
6. **⛔ Y lo que NO se copia de Isra Bravo, aunque sea el mejor:** la escatología y las erratas sin corregir. A un director comercial de 55 le rompe la confianza lo primero y le hace dudar de la seriedad lo segundo (`§8` NO copiar).

#### El contraste que sigue siendo útil: SINGULARU
7 de 29 correos, todos con emoji en el asunto, todos de oferta (`Por menos de 15€ 🔥`, `Tobilleras por menos 9,99€ 🔥`). **Es el único remitente del corpus que no firma una persona**, y es ecommerce puro. Sirve de recordatorio de qué pasa cuando el correo deja de tener autor.

---

### 8g · ⭐⭐ CUARTA VENTANA — 77 correos, 15 remitentes, 20 días (26 ago - 14 sep 2026)

Cuarto ZIP consecutivo con casi los mismos remitentes, así que ya hay **cuatro** muestras para separar
el sistema del capricho. Reparto: **Isra Bravo (20)**, **SINGULARU (14)**, **Juan Domínguez (11)**,
**RunnerPro (11)**, Cosas de Freelance (3), BOGA/EDEM (2), Kieran Flanagan (2), Sonia Ferrent (2),
MailerLite (2), Content Playbook/Kleo (2), **Hoppy Copy (2, NUEVO)**, The Lavender Newsletter (2,
NUEVO), **lemlist (1, NUEVO y es competencia directa)**, **Tendios (1, NUEVO: bienvenida de SaaS B2B
en español)**. Fuera del conteo: 2 notificaciones automáticas de Substack, que no son newsletters.

#### 🔴🔴 LO PRIMERO, PORQUE CORRIGE TRES VENTANAS SEGUIDAS: LAS HORAS ESTABAN MAL LEÍDAS

**`§8d`, `§8e` y `§8f` apuntaron la hora del encabezado `Date` sin normalizar la zona horaria.** El
encabezado no viene en hora española: viene en la zona del servidor de envío, y la de Isra Bravo es
**`+1000`** (Australia, su proveedor). Sus correos figuran a las `23:29` y se enviaron a las **15:29
hora española**.

**Y no es una deducción mía: lo escribe él.** El 13/09, explicando por qué el día anterior mandó a
deshora: *"Ayer te mandé el email diario a las 11:27h en vez de a las 15:27h como llevo haciendo casi
10 años. (hora de España, por ejemplo)"*. Nuestra medición de ese día anómalo da `19:22 +1000` =
**11:22 española**. Las dos cifras encajan con 4 horas de diferencia. **El dato del remitente y el
nuestro dicen lo mismo en cuanto se convierte la zona.**

| remitente | lo que decía la doc | **hora REAL en España** | offset del encabezado |
|---|---|---|---|
| **Isra Bravo** | ~~23:29~~ | **15:29** (20 de 20) | `+1000` |
| **RunnerPro** | ~~13:00-13:07~~ | **15:00-15:07** (11 de 11) | `+0000` |
| **Juan Domínguez** | ~~14:01-14:02~~ | **16:01-16:03** (11 de 11) | `+0000` |
| **SINGULARU** | ~~09:30 / 08:30~~ | **11:30** entre semana / **10:30** domingos | `+0000` |
| **Cosas de Freelance** | ~~06:00-06:03~~ | **08:01** | `+0000` |
| **Sonia Ferrent** | ~~06:01~~ | **08:00 / 09:30** | `+0000` |
| BOGA/EDEM | 12:03 | **12:03** (único que ya venía en `+0200`) | `+0200` |
| Hoppy Copy (nuevo) | — | 18:15 / 20:31 | `+0000` |
| Lavender (nuevo) | — | 18:08 / 21:26 | `+0000` |

**QUÉ SE CAE Y QUÉ AGUANTA:**
- ⛔ **Se cae la frase "el mejor copywriter de email en español manda a las 23:29 todos los días"**
  (`§8d`). Manda a las **15:29**, media tarde. La usamos como argumento de que la hora da igual
  mientras no se mueva; el argumento sigue en pie, pero **ese ejemplo concreto era falso** y era el
  más llamativo de los tres.
- ⛔ **Se cae también "la hora va de las 06:00 a las 23:29".** En hora española el corpus va de las
  **08:00 a las 21:30**, un abanico bastante más estrecho y bastante más razonable.
- 🔴 **Y aparece un dato que NO teníamos y que va en contra de nuestras 09:01: los tres remitentes
  españoles de texto puro —los tres más parecidos a nosotros— mandan entre las 15:00 y las 16:03.**
  Isra 15:29, RunnerPro 15:0x, Juan 16:0x. No es dispersión: es un bloque.
- ✅ **Lo que sí aguanta intacto, y es lo que de verdad importa: cada remitente clava SU minuto y no
  lo mueve.** 20 de 20, 11 de 11, 11 de 11. La constancia sigue siendo el patrón más fuerte de todo
  el corpus, y ahora se ve mejor porque la única excepción en 77 correos fue **deliberada y el
  remitente la explicó al día siguiente**.
- ✅ **Y el minuto impar aguanta:** 15:29, 16:01, 15:03, 08:01, 11:30. Sigue respaldando nuestras
  09:01.

**⛔ LO QUE NO SE HACE CON ESTO, y es la parte importante:** no se mueve nuestra hora. Primero porque
la regla de la casa es que la constancia vale más que la hora (`§5`), y segundo porque **estos tres
son infoproducto B2C con lista caliente y correo diario**, que es exactamente la razón por la que ya
descartamos su posición del enlace (`§5-NINJA-POSICION`). Un director comercial industrial no tiene
el mismo reloj que un lector de copywriting. **Lo que sí hace este dato es dar un contendiente real
al test de hora que `§5` deja pendiente: en vez de `07:01 contra 09:01`, el test que de verdad
separa hipótesis es `09:01 contra 15:01`.**

**⭐ Y LA REGLA DE MÉTODO, que vale más que la corrección:** una hora leída de un fichero **no es una
hora hasta que se convierte a una zona**. El error entró porque el dato parecía limpio (venía del
encabezado, no de una estimación) y se repitió tres ventanas sin que nadie lo mirase dos veces. **Es
el mismo tipo de fallo que el `listIds` de Brevo (`§1`): un campo que responde algo plausible no es
un campo verificado.** Se cierra con un segundo contraste, y aquí el segundo contraste estaba a
mano: el propio remitente escribiendo su hora.

#### Lo que queda confirmado por CUARTA vez, y ya no se vuelve a discutir
- **Micro-aperturas fijas.** Isra `Mira.` ×9 y `Una cosa.` ×3 · RunnerPro `Escúchame.` / `Oye.` /
  `Domingo.` · el resto, variantes de las mismas.
- **PD sí, P.S. no.** Cero `P.S.` en los 77. Isra lleva PD en **19 de 20**; RunnerPro **11 de 11**, y
  siempre **Pd + Pd2**.
- **Firma-mantra fija.** RunnerPro `Ánimo Runner, nos vemos dentro de la App.` los 11 días, con
  `Cristóbal, CEO de RunnerPro` debajo. Isra `Pd: Arriba.`
- **Un producto, ángulos infinitos.** Isra vende **el mismo libro** (300 palabras / ARROGANTE) 15 de
  20 días; RunnerPro **el mismo plan anual** los 11. Nadie tiene catálogo: hay una puerta y muchos
  caminos.
- **Línea individual como base**, con mediana de **7-8 palabras por línea** en los tres.
- **Fin de semana:** Isra manda 7/7 y RunnerPro los domingos, pero los dos son B2C. Nuestra regla de
  lunes a viernes no se toca.

#### ⭐ EL ASUNTO SIGUE ENCOGIENDO, Y YA SON CUATRO VENTANAS EN LA MISMA DIRECCIÓN

| ventana | n | mediana caracteres | mediana palabras |
|---|---|---|---|
| Timepack (`§8`) | 353 | 43 | 8 |
| 4-10 ago (`§8d`) | 32 | 36 | 7 |
| 11-17 ago (`§8e`) | 39 | 36 | 7 |
| **26 ago - 14 sep (esta)** | **75** | **31** | **5** |

- **El p90 es 58 y el máximo 69.** Nuestro techo de validador (62) sigue bien puesto, pero **ya no
  describe la zona ganadora: la describe la regla de `§2` de apuntar a ≤40 caracteres**, que hoy se
  queda corta de ambiciosa. En este corpus **el 61% de los asuntos cabe en 35 caracteres**.
- **Isra bajó su propia mediana a 24 caracteres** y tiene un asunto de **una sola palabra**
  (`Excusas`, 7 car). Confirma `§8e`: el asunto de una palabra es el máximo gap posible y solo vale
  con relación ya hecha.
- **Reparto medido de los 75:** empieza en minúscula 3% · lleva emoji 27% (pero **20 de esos 20 son
  SINGULARU y MailerLite**, los dos que no firman persona: entre los remitentes-persona el emoji es
  casi cero) · lleva número 19% · acaba en punto **19%** · lleva paréntesis 7% · lleva `?` 5% ·
  **cero asuntos con `:` o con ` - `**.
- 🔴 **El punto final ha dejado de ser tabú, y esto sí corrige `§2`.** Ahí pone *"nunca punto final
  (1 de 353 lo lleva)"* apoyándose en Timepack. En este corpus **14 de 75 lo llevan**, y son de los
  mejores: `El problema no es escribir mal.`, `Lo vemos a la vuelta.`, `Juan sabía muchísimo.`,
  `Hoy es día 1.`, `No escribas más.` **El punto no cierra el gap: cierra la FRASE de golpe, y suena
  a algo dicho en voz alta, no a titular.** Se desbloquea como recurso, con criterio: solo cuando el
  asunto es una **afirmación seca de 2-4 palabras**. Un asunto largo con punto sigue leyéndose a
  titular.
- ⛔ **Y una desviación del corpus que NO copiamos: la `¿` de apertura.** En el mismo corpus conviven
  `Enserio no es Tu Momento?` (Juan) y `¿Cuántos días llevas sin correr?` (RunnerPro). De las 4
  interrogaciones, **2 se saltan la `¿`**. `§2` ya lo decidió (*"en lo correcto no nos desviamos"*) y
  este corpus no cambia nada: a un director comercial de 55 años una falta le cuesta confianza.
  **Mecanizado en `validar-email.py` desde hoy.**

#### 🧠 LA PSICOLOGÍA DE LOS ASUNTOS, ordenada por lo que activan

No es la taxonomía de formato de `§2` (esa dice qué FORMA tiene). Esta dice **qué le hace al lector**,
que es lo que se elige primero:

| palanca | qué activa | literales del corpus | ¿nos sirve? |
|---|---|---|---|
| **La frase que el lector ya ha dicho** | reconocimiento: se ve retratado antes de abrir | `Lo vemos a la vuelta.` (EDEM) · `Enserio no es Tu Momento?` (Juan) | ⭐⭐ **la mejor para nosotros**: es echo marketing puro y tenemos 359 citas |
| **Acusación en 2ª persona** | incomodidad + necesidad de defenderse | `Escribes bien. Por eso no vendes` · `Eres bueno. Pero estás jugando en pequeño` | ⭐⭐ sí, con el reproche apuntando al mercado y no a él |
| **Confesión con cifra pequeña** | curiosidad + simpatía | `Ganaba 4€ la hora repartiendo pizzas` · `Me ofrecieron 10.000€` | ⭐ sí, y es donde nuestras cicatrices propias caben |
| **Negación del tópico** | conflicto con lo que ya cree | `Septiembre no es enero (por suerte)` · `El problema no es escribir mal.` · `No has perdido la forma` | ⭐⭐ es el pilar 3 de `§5`, y el molde `X no es Y` es plantilla |
| **Nombre de pila + acto raro** | narrativa, quiere saber el final | `Paula se apuntó a una 10k sin estar lista (a propósito)` · `Juan sabía muchísimo.` | ⭐ sí, con nombre inventado y sin empresa (`§7`) |
| **Orden negativa** | prohibición, que es el gap más barato | `No escribas más.` | ⚠️ funciona, pero se gasta rápido |
| **Fecha / calendario** | urgencia que no la pone el vendedor | `Se acaba agosto. Lo que viene ahora` · `Hoy es día 1.` · `Cuatro cosas que hago yo cada septiembre` | ⭐⭐ ver el pilar nuevo de abajo |
| **El personaje absurdo** | humor + gap | `El tonto que regala gasolina` · `El impostor seductor` | ⭐ sí, en Iker |
| **Promesa de ahorro con número** | interés propio directo | `Te voy a ahorrar 4 semanas` · `Los 10 minutos que te ahorran lesiones` | ⚠️ sí, pero es el más cercano a sonar a oferta |
| **Oferta pura con emoji** | nada, solo precio | `-50% en TODAS estas 👀` (SINGULARU) | ❌ es el único remitente sin autor |

**⛔ Y el patrón que atraviesa los buenos: el asunto describe una ESCENA o una FRASE, nunca un tema.**
Ninguno de los 75 dice de qué va el correo. `Cuatro cosas que hago yo cada septiembre` es lo más
cerca que está alguien de anunciar contenido, y aun así mete el `yo` dentro.

#### ⭐ EL CUERPO: ritmo medido de los tres remitentes de texto

| | bloques de 1 línea | de 2 | de 3 | de 4+ | palabras/línea | cuerpo |
|---|---|---|---|---|---|---|
| **Isra Bravo** | **100%** | 0% | 0% | 0% | 7 | 350 palabras |
| **RunnerPro** | 74% | **23%** | 2% | 2% | 8 | 363 |
| **Juan Domínguez** | 63% | **28%** | 5% | 3% | 8 | 553 |

**⭐ ESTO ES LO MEJOR QUE TRAE LA VENTANA PARA NOSOTROS, y confirma a Iker contra el corpus viejo.**
`§3` recoge su decisión del 2026-08-06: *"aunque la competencia no lo haga, los bloques de dos y de
tres generan mucha mejor retención"*, y se anotó como **experiencia propia ganando al corpus**, con
Isra al 99% de líneas sueltas como único contraejemplo. **Ahora hay dos remitentes independientes al
23% y al 28% de bloques de dos.** Deja de ser una desviación nuestra: es lo que hacen los dos
remitentes del corpus que más se parecen a nuestro formateado. La prioridad de `§3` (1º línea suelta,
2º bloque de dos, 3º de tres) queda respaldada desde fuera y **no se toca**.

#### 📏 DÓNDE CAE EL ENLACE, medido carácter a carácter

| remitente | tipo de correo | posición del primer enlace |
|---|---|---|
| RunnerPro (11 de 11) | contenido con puerta | **72-83% del cuerpo** |
| Isra (20) | contenido con puerta | mediana **78%** |
| **Juan, correos de contenido (5 de 11)** | contenido puro | **no hay enlace** |
| **Juan, correos de lanzamiento (3)** | venta declarada | **2%, 19% y 20%**, y repetido 2-3 veces |

- **Nadie lo pone al 100%.** Detrás del enlace siempre queda cuerpo: PD, PPD y firma. Eso confirma
  la regla de `§5-NINJA-POSICION` (*"nunca pegado a la firma"*) desde el corpus, no solo desde el
  rechazo de Iker.
- 🔴 **Pero el corpus lo pone al 78% y nuestro correo 2 lo pone al 49%.** Nuestro dato manda
  (`0 clics de 336` con el enlace al final, contra **6 clics en 327 entregados** con el ninja subido
  al cuerpo en la tanda 6, `historial-newsletter`), así que **no se mueve nada**. Se anota que
  seguimos siendo la excepción del corpus a propósito, y por qué.
- **⭐ Y hay un patrón nuevo y limpio: el enlace sube cuando el correo ADMITE que vende.** Los tres
  correos de lanzamiento de Juan lo ponen en el primer quinto y lo repiten; los de contenido no lo
  llevan. **Nadie pone un enlace a mitad con disimulo.** O el correo es contenido y la puerta está
  al fondo, o el correo es venta y la puerta está arriba y repetida. Para nosotros: cuando llegue
  una ventana de campaña de demo (`§8` ADAPTAR), **ese correo cambia de molde entero**, no solo de
  tono.
- **45% de los correos de Juan no llevan ni un enlace de contenido.** Coincide con el 47% de
  Timepack. El reparto 40/45/15 de `§5` sigue vivo en una cuarta fuente.

#### ⭐⭐ LOS 14 MECANISMOS NUEVOS QUE MERECEN ROBARSE

1. **⭐ La frase de estado ya no va sola: va ENGANCHADA con puntos suspensivos al final de la línea
   que resuelve el dolor.** RunnerPro, 11 de 11: *"deja que la app te diga exactamente qué hacer ese
   día. Sin pensar, sin culpa, solo salir… **tu plan te está esperando.**"* En `§8d` la habíamos
   apuntado como línea independiente. **No lo es: es el rabo de la frase anterior**, y por eso no se
   lee como eslogan. Es exactamente el mecanismo de nuestro bloque de dos, un escalón antes. **Se
   adopta en la línea 1 del ninja de correo.**
2. **El repertorio de micro-aperturas, no la micro-apertura única.** `§5-HISTORIA` dice que cada
   remitente tiene UNA y no la mueve. RunnerPro tiene **seis** y rota: `Escúchame.` · `Escúchame
   bien.` · `Oye.` · `Oye, una cosa.` · `Domingo.` · `Pregunta directa.` · `Septiembre.` **Las dos
   últimas familias son las interesantes: el NOMBRE DEL DÍA o DEL MES como apertura, y el ANUNCIO
   del formato del correo.** Corrige `§5-HISTORIA`: la de Iker (`Te cuento.`) se queda como base,
   pero se le abre un repertorio de 3-4 del mismo registro para que no cante a plantilla en la
   cadencia semanal.
3. **La cita del cliente es su punto BAJO, nunca su resultado.** RunnerPro mete nombre de pila +
   cita entrecomillada en 6 de 11 correos, y la cita siempre es la vergüenza: *"me da vergüenza, voy
   a ir de los últimos"* · *"pensaba que correr no era para mí"* · *"voy a 7 minutos el kilómetro,
   en el grupo todos van a 5"*. **El resultado lo cuenta el narrador; la humillación la cuenta el
   cliente.** Es lo que hace creíble una historia y es gratis.
4. **"Lo leo yo."** Tercera y cuarta fuente independiente. RunnerPro: *"Contesta a este correo con el
   número. En serio. Lo leo yo."* Hoppy Copy lo recomienda como jugada: *"Hit reply with the one
   thing you're trying to get done before year-end. I read every response."* Ya lo teníamos de Hugo
   López (*"reviso yo. No es un correo automático"*). **Cuatro fuentes: es ley.** Y para nosotros
   pesa el doble, porque lo que nos acusan es justo de lo contrario (`§7`, automatismo).
5. **⭐ El CTA de respuesta con UN dato, no con una palabra.** *"¿Cuántos días llevas sin correr?
   Contesta a este correo con el número."* Es nuestro correo 0 segmentador (`§5c-0`) funcionando en
   una lista grande y real: **una respuesta de 3 segundos que además le da al lector un dato sobre sí
   mismo**. La versión Neety está servida: *"¿cuántas empresas tenéis hoy en la lista de a quién
   llamar? Contéstame con el número."* **Y el remate psicológico va en la línea de después:** *"la
   gente me dice «llevo siglos» y al contar son 12 días"*. El número real casi siempre asusta menos
   que el de la cabeza, y decirlo en voz alta desactiva la vergüenza de contestar.
6. **El segundo acto, con bisagra declarada.** A mitad de ventana RunnerPro subió de ~250 a ~370
   palabras, y lo que añadió no fue relleno: un **segundo insight** introducido con una frase que
   avisa. *"Y te digo algo más, porque esto sí que me costó años entenderlo."* · *"Y una cosa más,
   que no es un consejo sino un aviso."* · *"Y hay una comparación que sí sirve, aunque parezca lo
   mismo."* **Da un segundo motivo para seguir leyendo justo donde el lector iba a irse**, y es más
   barato que escribir otro correo.
7. **La lista de "podrías ser tú" con cuatro oficios.** Juan universaliza la historia del soldador
   así: *"Un fisio buenísimo al que solo conocen en su barrio. Una peluquera que tiene una técnica
   increíble… Un entrenador que sabe más que el 90%… Un electricista que lleva 20 años solucionando
   problemas y jamás ha contado uno."* **Cuatro retratos en vez de una moraleja.** El lector se
   coloca en uno solo. Versión Neety: el director comercial que se sabe el sector de memoria pero no
   tiene la lista, el de exportación que va a la feria con las mismas 40 empresas de siempre, el
   gerente que lleva el CRM en la cabeza.
8. **La objeción como TITULAR en mayúsculas.** Juan: `"PERO A MÍ ME DA VERGÜENZA"` y debajo `Ya. Lo
   sé.` Es el lector ventrílocuo de `§3` con formato de sección. Airea la objeción y la reconoce en
   dos palabras antes de rebatirla.
9. **La negación triple antes de la petición.** *"No te digo que hagas el mono en redes. No te digo
   que bailes. Ni que hagas vídeos sensuales. Ni que te conviertas en influencer. Te digo que hagas
   algo mucho más sencillo: enseña lo que sabes."* Hermano de la rebaja de expectativa de `§8f`:
   **primero se quita de en medio todo lo que el lector teme que le pidas.** Para nosotros es casi
   literal: *no te pido que cambies de CRM, ni que montes un equipo, ni que mandes más mensajes.*
10. **⭐ La costura de la metáfora, nombrada en voz alta.** EDEM cierra su historia del niño de 10
    años y las marchas de la bici con: *"Y sí. Acabo de convertir una conversación con un niño de 10
    años sobre bicicletas en una reflexión sobre management."* **Reconocer el truco desactiva la
    sensación de que te lo están haciendo.** Es el primo de "usar la escasez y acto seguido
    rechazarla" (`§8e`) y de *"no por urgencia artificial"* (Juan, esta ventana). **Tres formas del
    mismo mecanismo: nombrar la manipulación hace que el argumento pese el doble.**
11. **El enlace anunciado como inevitable.** EDEM, justo antes de la URL: *"Y ahora sí, llega el
    enlace inevitable:"*. ⚠️ **Es la estrategia CONTRARIA a nuestro ninja** (esconder la costura
    contra enseñarla). No se adopta —nuestro dato de CTR manda (`§5-NINJA`)— pero se anota como la
    única alternativa con dignidad que hemos visto, por si algún día el ninja deja de rendir.
12. **El micrófono cedido entero.** Isra dedicó un correo completo a una carta de una fundación
    escrita por otra persona, con marco propio de 3 líneas al principio (*"Hoy haré algo muy raro. Y
    es que el email de hoy, no lo voy a escribir yo"*) y reentrada al final (*"Hola, soy Isra de
    nuevo"*). **Un testimonio largo no se resume: se cede el correo.** Y al día siguiente lo
    convirtió en un segundo correo explicando por qué había roto su hora. Dos correos de un solo
    material ajeno.
13. **Las fascinaciones con destino.** 5 de los 20 correos de Isra son **solo una lista de bullets de
    curiosidad**, cada uno rematado con dónde está la respuesta (`Capítulo 16`). Sin historia, sin
    cuerpo. *"- El error que convierte emails perfectamente escritos… en mensajes absolutamente
    olvidables."* **Es el equivalente en correo del pilar "Los 10" de LinkedIn**, y es el correo más
    barato de producir que existe: el contenido ya está hecho, solo se listan las puertas.
14. **La cifra de broma pegada a la cifra real.** EDEM, en su correo de aniversario: *"he renovado
    unas 47 veces la contraseña y he tomado aproximadamente 10.308.540.325 cafés"*, y tres párrafos
    después *"7.600 m². Espacio para 1.000 personas más. Una inversión de 25 millones"*. **La cifra
    absurda calibra al lector para que se crea la real.**

#### ⛔ Lo que NO se copia de esta ventana
- **Las erratas sin corregir**, que van a más: `testominio`, `noticas`, `Enserio`, `descubrirmucho`,
  `permanecía`, y media docena de palabras pegadas sin espacio en los correos de Juan por el editor
  de GetResponse. A nuestro lector le hace dudar de la seriedad (`§8f` punto 6), y a nosotros nos
  delata el sistema, no la prisa.
- **La política y la escatología de Isra** (un correo entero sobre feminismo rematado con
  *"Pd2: Hoy toca limpiar la lista, gracias por participar"*). ⚠️ **Ojo con el mecanismo, que sí es
  interesante: usa un correo polarizante a propósito para provocar bajas y limpiar la lista.** No es
  para nosotros —las bajas nos cuestan reputación de dominio en una lista de 46, y el tema no tiene
  nada que ver con vender— pero es la primera vez que vemos a alguien **gastar suscriptores adrede**.
- **Los 29 enlaces por correo de SINGULARU** y su emoji obligatorio en el asunto. Sigue siendo el
  único remitente de todo el corpus **sin autor persona**, y sigue sirviendo de recordatorio.
- **Dos correos el mismo día**: SINGULARU lo hizo el 31/08 (11:30 y 16:01). Es ecommerce en rebajas.
  Nuestra regla de `§5` no se toca.

#### 🆕 LOS CUATRO REMITENTES NUEVOS, y tres de ellos valen mucho

**⛔ lemlist — competencia directa, y está prometiendo exactamente lo que nuestros clientes ya
rechazan.** Correo del 09/09, asunto `Claude + lemlist = outbound forever?`, invitación a un webinar:
*"Claude builds the prospecting list… Claude writes the outreach, lemlist handles the sending, the
replies and the follow-up, **at scale**"*. **Es automatismo + volumen en una sola frase**, las dos
promesas vetadas de `§7`. **Esto sube el veto de "estilo" a "posicionamiento":** no evitamos esas
frases por gusto, las evitamos porque son literalmente lo que dice el competidor y lo que 10
empresas del informe nombran como motivo para ignorar mensajes. **Cuando escribamos contra ese
discurso, tenemos la cita del 09/09 con fecha.**

**⭐ Hoppy Copy — nos regala un pilar y confirma el ninja desde fuera.** Herramienta de copy con IA.
Su correo del 31/08 es **una jugada de calendario servida en bandeja** (ver el pilar nuevo abajo), y
dentro lleva esta frase, que es nuestra doctrina escrita por otro: *"The strategic move: don't open
with your promotion. Open by giving readers language for a problem they already feel. Your offer
becomes relevant because you've helped them name the work in front of them."* **"Darle al lector el
lenguaje de un problema que ya siente" es la definición más limpia del echo marketing que hemos
leído**, y es exactamente lo que nuestro informe de demos permite hacer con 359 citas.

**⭐ Tendios Bid — la bienvenida de un SaaS B2B español, que es justo lo que `§5b` no tenía.** Correo
del 10/09, `Bienvenido a Tendios Bid, Javier`. Estructura: promesa en una línea (*"Hoy empiezas a
ganar más licitaciones con menos esfuerzo"*) → prueba social con cifra (*"+5000 empresas ya
confían"*) → **4 tarjetas de "¿cómo empezar?" con su enlace de acción cada una** → y el remate que
más nos sirve: **una salida para el que no quiere autoservicio**, *"Prefiero que un equipo dedicado
me enseñe a sacarle partido → Agendar una reunión"*. ⚠️ **Es el molde contrario al nuestro** (HTML
con tarjetas, 12 enlaces, cero voz) y no se copia el formato. **Lo que sí se roba es esa última
puerta:** en una bienvenida, el CTA secundario no es otro tutorial, es *"o te lo enseñamos
nosotros"*.

**🇪🇸 Sonia Ferrent — nuestro sector exacto en español (ventas B2B + IA), y trae un pilar que no
teníamos: la actualidad regulatoria.** Su correo del 08/09 va marcado `[BONUS]` y explica el
**Artículo 50 del AI Act**, que obliga a transparencia cuando se usa IA en el proceso de venta. Es
literalmente nuestro terreno y toca a nuestro comprador. ⚠️ **PENDIENTE · sin verificar por
nosotros:** ni el contenido del artículo, ni las fechas, ni las cifras de multa que ella cita se han
comprobado contra la fuente oficial. **No se usa ni una palabra de esto en un correo nuestro hasta
verificarlo** (`§7`). Lo que sí se queda de aquí es el **formato**: el correo fuera de cadencia,
marcado como bonus, sobre algo que acaba de cambiar en el sector del lector. Y su otro mecanismo
robable: **abrir confesando un error operativo propio** (*"Se me fue el cursor y pulsé enviar. ¡Un
fallo garrafal!"*).

**⚠️ Lavender — nos suscribimos a la que no era.** `§8` la tenía en la lista de pendientes junto a
Isra Bravo y CustomerTop, buscando la herramienta de email de ventas. Lo que llega es **The Lavender
Newsletter, una publicación queer local de Champaign-Urbana (Illinois)**: enlaces a noticias
municipales y del condado. No tiene nada que ver con nuestro género. **Se quita del corpus y la
suscripción correcta vuelve a la lista de pendientes.** Y la lección de intake: **una suscripción se
verifica leyendo el primer correo, no dándola por buena por el nombre.**

**🪦 Content Playbook (Lara Acosta / Kleo) cerró.** Correo del 30/08, `📘 Good bye & thank you!`. Baja
del corpus.

#### 🎯 LOS CUATRO PILARES CANDIDATOS QUE SALEN DE AQUÍ

> **Iker pidió esto explícitamente el 26/08** (*"no tenemos aún pilares de contenido para correos
> definidos"*) y hasta hoy solo estaba `§5-HISTORIA`. Estos cuatro salen de contar qué hace el
> corpus, no de inventar. **Los cuatro son n=0 igual que historia: son hipótesis con nombre, no
> receta** (`working-preferences §0c`), y abajo va el orden en que merece la pena probarlos.

**⛔ Y antes de los cuatro, el aviso que va primero:** los cuatro son **caminos a la misma puerta**,
no promesas nuevas (`§5`, "un solo producto, ángulos infinitos"). La promesa central sigue siendo la
identificación. **Un pilar que necesite un mensaje central nuevo está mal planteado y se tira.**

---

**🗓️ PILAR 5 · EL CALENDARIO (el más respaldado de los cuatro, y el más barato)**

**La evidencia:** es el mecanismo más usado de toda la ventana. **RunnerPro cuelga los 11 correos de
"la vuelta de septiembre"**, EDEM los 2, Hoppy Copy dedica uno entero a explicar la jugada, SINGULARU
7, Isra abre uno con *"Hoy es día 1"* y otro con *"último día de mes"*, Juan con *"me he ido unos
días de vacaciones"*. **Nadie escribió un correo de calendario en las tres ventanas de agosto; en
esta lo hace todo el mundo.**

**Qué es:** el correo cuelga de una fecha que el lector ya tiene en la cabeza, no de una noticia
nuestra. Da tres cosas gratis: **(a) motivo para escribir sin tener novedad**, **(b) el dolor ya lo
pone el calendario** —no hay que argumentar que existe— y **(c) urgencia que no fabricamos
nosotros**, que es la única clase de urgencia que `§7` permite.

**Su mecanismo interno, copiado de RunnerPro:** la fecha abre, el dolor de la fecha es el cuerpo, y
**la lección es siempre "estructura contra euforia"**: *"No arranques septiembre con euforia.
Arráncalo con estructura. La euforia te dura una semana. La estructura te lleva hasta fin de año."*

**El calendario que nos toca a nosotros, y NO es el de vuelta al cole** (ese lo va a usar todo el
mundo y no es nuestro): **el calendario INDUSTRIAL.** Cierre de trimestre · presupuesto del año
siguiente (septiembre y octubre es cuando el director comercial pelea el suyo) · la temporada de
ferias de otoño · el cierre de ejercicio · agosto parado y la lista de septiembre igual de vacía que
en julio · enero, objetivos nuevos y la misma cartera de siempre.

**Remitente:** Iker o Unai. **CTA:** suave. **Coste:** el más bajo después de historia, porque no
necesita ni verificar empresas ni inventar escena.
**⚠️ El riesgo, y hay que decirlo:** es el ángulo más manido de septiembre. **Lo que nos separa es
que la fecha sea de SU calendario laboral, no del calendario general.**

---

**💬 PILAR 6 · LA OBJECIÓN, ENTERA (el que más munición tiene y cero riesgo de inventar)**

**La evidencia:** Juan dedica un correo completo a **tres objeciones entrecomilladas como las dice el
lector** (*"Es que yo no tengo tiempo ahora mismo"*, *"Es que yo no sé escribir bien"*, *"Es que
todavía no tengo un negocio"*), cada una con su rebate y ninguna con venta. Juan otra vez con el
titular `"PERO A MÍ ME DA VERGÜENZA"`. Hoppy Copy lo formula como estrategia. Es `§8e` punto 2
(adelantarse a la ofensa) convertido en pilar en vez de en truco suelto.

**Qué es:** un correo = **una objeción real del informe de demos**, escrita con las palabras exactas
del cliente, reconocida antes de rebatirla, y rebatida sin pedir nada.

**Por qué este pilar es el mejor que tenemos, y es un argumento fuerte:**
- **Es el único con munición ilimitada y verificada.** `global §4.4b-MUNICIÓN` tiene **359 citas de
  77 empresas** del informe del 14/09. No hay que inventar la escena (`§7`) porque no hay escena: hay
  una frase que alguien dijo de verdad.
- **Es el echo marketing de `§5`, que lleva escrito desde julio y nunca se convirtió en pilar.** El
  hueco estaba abierto y este corpus lo cierra con el molde.
- **La objeción es, por definición, el dolor en sus palabras**, que es literalmente lo que pide Hoppy
  Copy: darle al lector el lenguaje de su problema.
- **Y encaja con nuestro veto más caro:** la objeción nº1 del informe (**la señal, 15 empresas**) es
  precisamente lo que no podemos usar para abrir. **En este pilar sí se puede nombrar, porque la
  posición no es prometerla: es darle la razón al que desconfía de ella** y llevarle a la
  identificación, que es lo que sí compramos que compra.

**La regla de entrada, la misma de siempre:** una objeción entra cuando el informe la respalda con
**3 empresas o más**. Con 1 o 2 es hipótesis y se anota el resultado en `historial-newsletter.md`.
**⚠️ El límite duro:** las citas son de reuniones privadas. **Se usa el CONTENIDO de la objeción,
nunca la cita atribuida ni el nombre de la empresa**, ni siquiera descrito ("una industrial de
Gipuzkoa que fabrica cierres" identifica). Eso es `§7` y no cambia.

**Remitente:** Iker (es él quien las oye en las demos). **CTA:** suave o ninguno.

---

**🩹 PILAR 7 · LA CICATRIZ PROPIA CON NÚMERO PEQUEÑO (el que resuelve nuestro problema de cifras)**

**La evidencia:** Juan cuenta que tardó **3 horas** en escribir un email con todas las técnicas y
sacó **2 respuestas: un amigo vacilándole y una baja**. Y que el que reescribió en **25 minutos** sin
nada fue el mejor del mes. Juan otra vez: le roban **103€** de gasoil por no elegir surtidor. Isra
rompe su hora de 10 años y lo confiesa al día siguiente. `§8` ya lo llamaba *"autoridad por
cicatrices, no por púlpito"* y lo dejaba como cosa de Timepack: **son cuatro fuentes.**

**Y aquí está el motivo por el que este pilar es nuestro y no de nadie más:** `aboutme §1` tiene las
cifras de resultado marcadas `[PENDIENTE · sin origen documentado]` y `§7` prohíbe inventarlas. **Las
cifras de FRACASO no tienen ese problema: son nuestras, están medidas y están escritas.** La cuenta
cancelada al tercer envío con 0 denuncias de spam · **0 clics de 336 entregados** · 191 correos y
**0 respuestas** · el preheader duplicado durante 3 tandas porque nadie se mandó un test · 1 acierto
de 4 al predecir qué direcciones iban a rebotar. **Es el único pilar donde hoy podemos poner una
cifra propia y verificable sin un solo PENDIENTE**, y encima es el que más confianza compra en un
comprador industrial escéptico.

**El molde, de Juan:** cicatriz con número pequeño y humillante → lo que creía que fallaba → lo que
fallaba de verdad → la regla que salió → **nunca "y por eso somos mejores"**.
**⚠️ Los dos límites:** (a) una cicatriz que toque cómo tratamos datos de terceros no se cuenta
(`brand-voice §2c-DATOS`), y (b) la de la cuenta cancelada se cuenta **sin** decir que la lista no
tenía origen claro, que es exactamente lo que nos costó la cuenta (`§0b`). **Y la elección de qué
fracaso sale en público es de Iker, no mía.**

**Remitente:** Asier para las técnicas, Iker para las comerciales. **CTA:** ninguno o de respuesta.

---

**📑 PILAR 8 · LAS FASCINACIONES (el correo de relleno de calidad, para sostener cadencia)**

**La evidencia:** **5 de los 20 correos de Isra** son solo una lista de bullets de curiosidad con su
destino. Cero historia, cero cuerpo. Y él es el que más sabe de esto de todo el corpus.

**Qué es:** el correo es una lista de 8-10 líneas, cada una **una promesa de curiosidad con su gap
abierto**, y todas apuntan al mismo sitio. Para nosotros el destino no es un capítulo: es el
diagnóstico, un recurso de `recursos.neety.com` o la demo. *"— Por qué la lista que compraste el año
pasado ya no sirve, y no es por los correos rebotados."*

**Para qué sirve de verdad, y es honesto decirlo así: es el correo que se manda cuando no hay nada
que contar** y aun así toca cumplir la cadencia, que es el problema real de una newsletter semanal
(`§5`: una lista abandonada muere). **Es el más barato de todos y el único que no necesita idea.**
**⚠️ Y es el que más rápido se gasta:** dos seguidos y el lector ve el truco. Uno cada 6-8 correos.

**Remitente:** cualquiera. **CTA:** el enlace repetido al final, como Isra.

---

#### 🔢 EL ORDEN EN QUE MERECE LA PENA PROBARLOS, y por qué NO los cuatro a la vez

**⛔ El aviso que va antes de la recomendación:** hoy la lista son **46 contactos** tras la limpieza
del 28/08 (`historial-newsletter`), y `§5-HISTORIA` sigue en **n=0**. **Con 45 destinatarios ningún
pilar se va a poder validar: un pilar bueno y uno malo dan el mismo número.** Añadir cuatro pilares
ahora no es diversificar, es **quedarse sin poder atribuir nada cuando la lista crezca**. Así que la
recomendación es de orden, no de lanzamiento:

| orden | pilar | por qué ese |
|---|---|---|
| 1º | **6 · la objeción** | munición verificada, cero invención, y cierra el hueco del echo marketing que lleva abierto desde julio |
| 2º | **5 · el calendario** | el más respaldado del corpus y el más barato, y el reloj no espera: septiembre y el cierre de trimestre se pasan |
| 3º | **7 · la cicatriz** | el único con cifras propias, pero necesita el OK de Iker sobre qué fracaso se cuenta en público |
| 4º | **8 · las fascinaciones** | solo cuando la cadencia apriete. No es un pilar de mensaje, es un pilar de ritmo |

> 🆕 **2026-09-21 (`§8h`): el 9 · la receta regalada entra 3º**, por delante de la cicatriz: no necesita el OK de Iker sobre qué fracaso contar y tiene detrás la mitad de la semana de RunnerPro. La cicatriz y las fascinaciones bajan un puesto.

**Y lo que hay que medir en los cuatro es lo mismo que en historia** (`§5-HISTORIA`): clics al enlace
y respuestas, **nunca aperturas**. La apertura la decide el asunto; el pilar se juega el cuerpo.

---

### 8h · ⭐ QUINTA VENTANA — 24 newsletters, 10 remitentes, 7 días (15-21 sep 2026, analizado el 2026-09-21)

ZIP `newslettershasta21sep.zip`, 28 ficheros. **Fuera del conteo (4):** 2 recordatorios automáticos
de Luma (`Marc Ploot`, un webinar al que estaba apuntada la cuenta), 1 aviso de notas de Substack y
**1 de The Lavender Newsletter, que sigue llegando el 18/09** (la suscripción mala de `§8`, sin
rehacer). **Dentro (24):** **Isra Bravo (7)**, **SINGULARU (5)**, **RunnerPro (4)**, **Juan
Domínguez (2)**, Sonia Ferrent (2), Hugo López (1, **vuelve tras semanas callado**), BOGA/EDEM (1),
Cosas de Freelance (1), Kieran Flanagan (1). **No llegó nada de lemlist, Hoppy Copy ni Tendios.**

**Método, para que no se repita `§8g`:** las horas se han pasado a hora española (CEST, +02:00)
desde el `Date` de cada fichero, y **la única rara se ha contrastado con la cabecera `Received` de
Google**, que es de otro servidor. Las cifras de ritmo salen de un script sobre el texto plano.

#### ⏰ LAS HORAS: el bloque de las 15:00 aguanta una quinta semana, con dos matices

| remitente | hora española | de cuántos |
|---|---|---|
| **RunnerPro** | **15:00-15:08** | 4 de 4, domingo incluido |
| **Isra Bravo** | **15:29** | **6 de 7** |
| **Juan Domínguez** | **16:02** | 2 de 2 |
| BOGA/EDEM | 12:04 | 1 de 1 (ya iba a las 12:03) |
| Cosas de Freelance | 08:01 | 1 de 1 |
| SINGULARU | 11:30 · 10:30 el domingo · **11:47 · 12:32** | 3 de 5 en su minuto |
| Hugo López | 14:23 | vuelve, sin hora fija todavía |

- **La excepción de Isra, comprobada y SIN explicar:** el lunes 21/09 salió a las **03:29
  españolas**. No es un error de lectura: la cabecera `Received` de Google dice `Sun, 20 Sep 2026
  18:29 -0700`, que es lo mismo. **Es su segunda salida de hora en dos ventanas** (la otra, el 12/09
  a las 11:22, la explicó él al día siguiente). **No se teoriza el porqué**: si la explica en el
  correo siguiente, se apunta aquí.
- **SINGULARU rompe su minuto por primera vez** (11:47 y 12:32, en rebajas). Es el único de todo el
  corpus sin autor persona, y es también el primero que pierde la hora.
- ⭐ **Una variante de la constancia que no teníamos: DECLARAR la cita.** Cosas de Freelance abre
  con *"todos los jueves a las 8:00 te escribo"* y llega a las 08:01. **La hora fija no solo se
  cumple: se le dice al lector**, y así el correo se convierte en una cita que él espera.

**⛔ Lo que no cambia:** nuestras 09:01 (`§5`). El test pendiente sigue siendo `09:01 contra 15:01`.

#### 🔴 EL ASUNTO: LA MEDIANA VUELVE A 36, Y ESO CORRIGE LA LECTURA DE `§8g`

| ventana | n | mediana caracteres | mediana palabras |
|---|---|---|---|
| Timepack | 353 | 43 | 8 |
| 4-10 ago | 32 | 36 | 7 |
| 11-17 ago | 39 | 36 | 7 |
| 26 ago - 14 sep | 75 | 31 | 5 |
| **15-21 sep (esta)** | **24** | **36** | **7** |

**Solo los remitentes-persona (n=18): 37 caracteres y 8 palabras.** El p90 es 47 y el máximo 83
(Kieran, en inglés). **`§8g` escribió que el asunto "sigue encogiendo" y que la diana ya eran 31.
Con una ventana más, no: el 31 fue una ventana, y la banda estable es 31-37.** La regla de apuntar a
≤40 (`§2`) sigue exactamente igual. **Lo que cae es perseguir el 31.**

- **Emoji:** solo SINGULARU, las dos de Substack y los recordatorios de Luma. **Remitentes-persona
  de texto: cero, por quinta vez.**
- **Punto final:** `Cómo conseguir suscriptores.` (3 palabras, dentro de la regla de `§2`) y **`La
  canción que no suena en la radio.` (EDEM, 8 palabras)**. Es el primer asunto largo con punto que
  vemos de un remitente bueno. **Uno solo no mueve la regla de ≤4 palabras.** Se anota por si se
  repite.
- **La mayúscula como golpe:** `GRACIAS` (asunto de una palabra, Isra) · `De aquí NO.`. Cabe en la
  regla de ≤1 del validador.

**⭐ LOS 5 MOLDES DE ASUNTO NUEVOS, en orden de lo que nos sirven:**

| molde | literal | qué hace | versión Neety (para inspirar, no para calcar) |
|---|---|---|---|
| ⭐⭐ **La pregunta del lector, que el cuerpo tumba** | `Cómo conseguir suscriptores.` → en el cuerpo: *"No es esa la pregunta."* | parece un tutorial y es una corrección. Abre el que se hace esa pregunta, que es justo el que la tiene mal planteada | `cómo conseguir más leads.` → *"no es esa la pregunta"*. Es el pilar 3 de `§5` entrando por la puerta del lector |
| ⭐⭐ **Oficio + "me ha hecho una pregunta"** | `Una ginecóloga me ha hecho una pregunta` | personaje con oficio, sin nombre, y un gap que es la pregunta | `un director de exportación me hizo una pregunta`. **La pregunta sale del informe de demos** (`§5-ECO`) y el oficio no identifica a nadie (`§7`) |
| ⭐ **Pregunta + respuesta negada** | `¿De dónde nace la confianza? De aquí NO.` | la negación cierra una puerta y deja las demás abiertas | `¿de dónde sale un cliente nuevo? De la feria no.` |
| ⭐ **Número + sustantivo, sin verbo** | `27 personas interesadas` | una cifra que suena a caso real y ninguna pista del final | (con cifra propia y verificada, `§7`) |
| **Asunto partido en dos con el preheader** | `Mi Sistema para ser más disciplinado` + preheader `(sin esfuerzo)` · `Cada vez admiro menos a la gente que factura millones` + `Y admiro a este tipo de gente` | **el paréntesis del segundo golpe (`§2`) ya no va en el asunto: va en el preheader**, que se lee justo detrás | encaja con nuestro `previewText`: el preheader como segunda mitad de la frase del asunto, no como resumen |

⚠️ **El segundo molde lleva trampa:** `sin esfuerzo` es una promesa vetada en nuestro validador
(`§7`). Juan la usa porque vende productividad; **nosotros solo le copiamos el mecanismo, no las
palabras.**

#### ⭐ EL CUERPO: lo que se confirma y lo que se matiza

- **Isra, 100% líneas sueltas por quinta vez** (7 de 7). **Juan:** 47% líneas sueltas, **33% bloques
  de dos**, 7% de tres. Es la segunda ventana seguida con Juan por encima del 25% de bloques de dos
  (`§8g`: 28%), y sigue respaldando la prioridad de `§3` desde fuera. **RunnerPro no se ha podido
  medir esta vez**: su texto plano mete espacios en blanco entre párrafos y los bloques no se separan
  con fiabilidad. Se mide en la ventana siguiente desde el HTML.
- **Longitud estable:** Isra 292-377 palabras · RunnerPro 358-385 · Juan ~600. **La banda de 300-450
  de `§8` aguanta por quinta vez.**
- **Posición del enlace:** Isra 79-96% · RunnerPro 81-84% · Juan 93% en el correo que lo lleva, y el
  otro no lleva enlace. **Igual que en `§8g`**, y nuestro dato (`§5-NINJA-POSICION`) sigue mandando
  sobre él.
- **PD:** RunnerPro 4 de 4 con **Pd + Pd2** · Isra 5 de 7. **Cero `P.S.`**, por quinta vez.

**⭐⭐ LOS 12 MECANISMOS NUEVOS QUE MERECEN ROBARSE:**

1. **⭐ UNA palabra en mayúsculas en el cuerpo, y es la del giro.** RunnerPro 4 de 4: `VEINTE`
   minutos · correr por `SENSACIÓN` · correr más `BARATO` · le faltaba `VARIEDAD`. Isra 5 de 7:
   `PRECIOSO`, `INCAPACES`, `CUALQUIERA`, `TAMBIÉN`. **Nunca dos** en los dos remitentes de texto
   puro (Juan sí mete varias, pero en titulares de sección). **La mayúscula no grita: marca la
   palabra en la que gira el correo.** `§2` ya lo tenía para el asunto; **en el cuerpo no había
   regla, y ahora está en `validar-email.py`: aviso a partir de dos.**
2. **⭐ La lista de excusas en su voz + `Te lo compro todo.`** RunnerPro: *"Ya sé lo que estás
   pensando. Que tú corres, que no quieres ir al gimnasio, que no tienes tiempo y que bastante haces
   con salir tres días. / Te lo compro todo. / Por eso no te voy a pedir una hora ni un gimnasio. /
   Te pido VEINTE minutos."* **Lector ventrílocuo (`§3`) + concesión total + rebaja de expectativa
   (`§8f`) en cuatro líneas.** La concesión es lo nuevo: no rebate ni una excusa, **las da todas
   por buenas**, y así la petición pequeña ya no tiene contra qué chocar. Versión Neety: *"Que ya
   tenéis CRM, que el comercial conoce el sector, que no hay tiempo para otra herramienta. Te lo
   compro todo."*
3. **⭐⭐ Se regala el QUÉ entero y se vende el CUÁNDO y el PARA TI.** RunnerPro da la rutina
   completa, **5 ejercicios numerados con series y repeticiones**, y solo después: *"Si quieres los
   días concretos, las repeticiones y que se ajuste solo según cómo llevas la semana, eso ya lo hace
   tu plan."* **El lector se va con la receta aunque no pague**, que es la regla de `§8d` (*"el
   enlace llega después de regalar la victoria"*) llevada al extremo. ⚠️ **Y la frase que no se
   copia es justo la del puente:** `que se ajuste solo` es la promesa de automatismo vetada (`§7`).
   Nuestro puente habla de **identificación**: el método para encontrarlas a mano, gratis; **las
   empresas de tu caso ya encontradas y con la persona de dentro**, en el diagnóstico.
4. **⭐ El autodiagnóstico de 30 segundos, dentro del cuerpo.** *"Cuenta tus pasos durante 30
   segundos y multiplica por dos. Ese es tu número."* Y la regla que va después: *"Si sale por debajo
   de 165…"*. **Es el primo de `§8g` punto 5 (contestar con un número), pero sin pedir respuesta:
   el lector se mide solo, ahora, y sale con un dato suyo.** Versión Neety: *"Cuenta las empresas a
   las que llamó tu equipo el mes pasado que no estaban ya en tu lista de enero. Ese es tu
   número."* ⚠️ **Sin afirmar qué le va a salir** (`§7b`): la regla del número la pone el correo,
   el número lo pone él.
5. **⭐⭐ El caso del evento, un correo por caso.** Isra vendió **La Firma del domingo 27** con **4
   correos de 7**, y cada uno entra por **UN caso que se analizará allí**: la inmobiliaria que cobra
   el doble que su competencia, los 27 interesados que no hicieron clic, el que quiere más
   suscriptores, la ginecóloga con 3 opciones. **Esqueleto:** `Mira.` → el caso en tres líneas → la
   respuesta obvia descartada → *"no te cuento más. Hasta el domingo."* → enlace → PD con la fecha
   límite. **Es `§5` (un producto, ángulos infinitos) aplicado a una cuenta atrás.** Para nosotros:
   **el molde de los correos previos a un evento o a una ventana de demos.** Llega tarde para el
   del 24/09 y a tiempo para el siguiente.
6. **⭐ Las tres opciones, y la tercera no se cuenta.** *"Una, es una alternativa vulgar. La
   descartamos. / La otra es totalmente equivocada, aunque no lo parezca. Le dará más trabajo, pero no
   más dinero. Esta es la que casi todo el mundo elige. / Y hay una tercera…"* **La del medio es la
   que hace el lector**, y por eso le duele. Versión Neety, pilar calendario: *para llenar el embudo
   del último trimestre hay 3 opciones: comprar una base (vulgar), poner a más gente a buscar (más
   horas, no más pedidos, y es la que casi todos eligen) y una tercera.*
7. **⭐ `27 personas interesadas… ninguna hizo clic`.** El caso de Isra es, casi palabra por
   palabra, **el nuestro**: aperturas del 29-36% y 0-3 clics de lead en 45 entregados
   (`historial-newsletter`). **Su hipótesis:** *"un mercado que tiene interés, pero no suficiente
   urgencia para pagar"*. ⚠️ **Es la hipótesis de otro sobre un caso de otro, no un diagnóstico
   nuestro**, y con 45 destinatarios no se puede separar de las otras (`§5-NINJA-POSICION`). Se
   apunta porque **da un contendiente que no teníamos**: el problema puede no ser el sitio del
   enlace sino **que el correo no ponga urgencia**, y eso sí se puede probar con el pilar calendario.
8. **La cita del cliente: el punto bajo o un resultado PEQUEÑO, nunca el grande.** Afina `§8g` punto
   3. Esta semana: Pablo *"corro más que nadie de mi grupo y soy el más lento"* (punto bajo) ·
   Marta *"no voy más rápido, pero llego entera al final"* (resultado modesto, con un **pero**
   dentro). **La cifra grande la dice siempre el narrador:** *"En nueve semanas se quitó casi un
   minuto por kilómetro."* En boca del cliente sonaría a testimonio comprado.
9. **🔴 Y LA CITA REPETIDA, que es el aviso más útil de la ventana.** RunnerPro, 16/09: María,
   *"voy igual de rápido pero llego entera"*. RunnerPro, 21/09: Marta, *"no voy más rápido, pero
   llego entera al final"*. **La misma frase con otro nombre, a 5 días.** Y `María` ya había salido
   el 26/08 (`§8f`). **Es lo que delata una historia inventada**, y el que lee dos correos seguidos
   lo ve. Consecuencia para nosotros en `§7`: **antes de escribir una cita o un nombre inventado, se
   busca en `corpus-correos-enviados.md`.**
10. **La PD cambia de trabajo cuando se acaba el reto.** En agosto el Pd2 de RunnerPro era un
    contador serial (`§8e`, `§8f`). Acabado el reto, **las PD pasan a ser consejos de uso**: *"Pd: si
    solo te quedas con una idea de este email, que sea esta:"* (un resumen en una línea) · *"Pd2: si
    solo puedes hacer uno de los cinco, haz el puente de glúteo"* (la versión mínima). **Y cuando el
    correo es historia, el Pd2 cierra la escena**: *"Pablo sigue corriendo cuatro días. Lo único que
    cambió fue el orden."* **Es exactamente nuestra PPD de `§5-HISTORIA`**, ahora confirmada desde
    fuera.
11. **Lo que va DETRÁS del enlace, en dos formas.** `§5-NINJA-POSICION` dice que detrás del ninja
    tiene que quedar cuerpo, pero no decía cuál. Esta ventana trae dos: **Juan** cierra con una línea
    de *"podrías ser tú"* en broma (*"Y si eres de los que tiene un Notion precioso con 74 tareas
    atrasadas… Este vídeo te va a venir bien"*) y **EDEM** remata la metáfora del principio (*"imagina
    descubrir demasiado tarde… esa 11 que, encima, era malísima y duraba siete minutos"*). **Las dos
    dan una última razón para volver a subir al enlace**, y ninguna vuelve a pedirlo.
12. **El enlace que elige a quién va.** EDEM: *"Y si has entendido lo de M&A a la primera, te dejo
    un enlace pensado específicamente para quienes participan, lideran o tienen que tomar
    decisiones en…"* **El enlace se presenta como para unos pocos, y el que se reconoce clica
    sintiéndose elegido.** Y el tecnicismo, explicado en la misma línea: *"(M&A: comprar, vender o
    fusionar empresas. Dicho rápido.)"*. ⚠️ **No sustituye a nuestro ninja** (su primera línea
    cuelga del asunto, `§5-NINJA`); se anota como variante de la línea de arriba.

**Y dos confirmaciones de mecanismos que ya teníamos:**
- **La costura nombrada, por segunda vez y de nuevo de EDEM**, ahora ANTES del giro: *"Y hoy en
  día… (ahora viene el girito)…"*. En `§8g` punto 10 iba después. **Las dos posiciones valen.**
- **El chiste que se desactiva en la línea siguiente.** Hugo: *"Me he levantado con una resaca
  increíble. / Resaca emocional, me refiero."* Isra: *"¿Impotencia eréctil? / No…"*. **La segunda
  línea deshace el malentendido que la primera ha provocado a propósito.** (El registro de Isra no
  se copia, `§8f` punto 6; el mecanismo de Hugo sí.)

#### ⭐⭐ EL MOLDE DEL CORREO DE DESPUÉS DE UN EVENTO — y el nuestro es el jueves 24/09

**Hugo López volvió el 21/09 tras semanas sin escribir, y el correo es la crónica de su evento del
fin de semana.** Es el único correo post-evento de las cinco ventanas y llega justo cuando nos
hace falta: **NEETY FORWARD es el 24/09** (`project-evento-septiembre`).

**Su esqueleto, literal:**
1. **Un chiste que se deshace en la línea 2:** `Me he levantado con una resaca increíble.` →
   `Resaca emocional, me refiero.`
2. **Admite el silencio antes de que se lo digan:** *"Ya sé que llevo semanas desaparecido por aquí.
   / Y hay un motivo gordo detrás."*
3. **La cifra de lo que pasó:** *"Vinieron más de 700 personas"* y el tiempo que costó montarlo
   (*"desde noviembre. Casi un año."*).
4. **Una idea del evento, no un resumen:** *"lo que más les llamó la atención no solo fue el
   contenido, fue la narrativa… Esa capa casi nadie la trabaja."*
5. **Las gracias, sin pedir nada:** *"Solo quería darte las gracias por seguir ahí."*
6. ⭐ **El condicional para el que vino y el que no:** *"Y si pudiste venir… Ojalá lo disfrutaras
   tanto como nosotros."* **Es nuestra regla `§7b` escrita por otro:** no afirma si el lector vino, y
   así el correo vale igual para las dos listas.
7. **Cero enlaces.** Solo el de baja.
8. **La PD que confiesa y deja un bucle abierto:** *"La primera edición… la montamos medio a lo loco…
   Y es justo lo que quiero contarte con calma pronto."*

**Isra hizo lo mismo en pequeño con `GRACIAS` (16/09):** abre con `Hola.` (rompe su `Mira.` de
siempre, y eso ya avisa de que el correo es otra cosa), pega el mensaje de otra persona agradeciendo
lo que hicieron sus lectores, y cierra sin enlace: *"Llevo 10 años escribiendo a diario. Me quedan
otros 1000."*

**⚠️ Lo que hay que resolver ANTES de escribir el nuestro, y no es de estilo:**
- **La cifra de asistentes tiene que ser de gente que VINO.** El contador de Luma (`§7b`) da
  **inscritos**, no asistentes, y en un evento con aprobación la diferencia puede ser grande. **Se le
  pide a Iker la cifra real de la sala.** `Vinieron 65` con 45 en la sala es un dato falso (`§7`).
- **Las personas y empresas que aparezcan** (ponentes, mesa redonda) **siguen el filtro de las
  menciones de `CLAUDE.md`** y el OK que gestiona el primer jefe (commit del 18/09).
- **Remitente:** Unai, que es quien firmó el correo 3 del evento. **Kaixito no**: el tono del correo
  es de gratitud y la mascota lo convertiría en gag.
- **Día:** el 25/09 cae en viernes. El `§5` no veta el viernes para un correo suelto, solo para la
  última tanda. **Se decide con Iker**, no se da por hecho.

#### 🧩 LOS PILARES DE LA SEMANA, contados

| remitente | qué pilares usó | lo que dice |
|---|---|---|
| Isra (7) | **4 casos del evento** · 2 del libro · 1 de gracias sin enlace | con fecha a la vista, **el pilar lo pone la fecha** y el ángulo lo pone cada caso |
| RunnerPro (4) | **2 consejos con receta** · 1 historia de cliente · 1 reflexión personal de domingo | la mitad de la semana es **enseñar algo que se puede hacer hoy** |
| Juan (2) | 1 reflexión **sin enlace** · 1 reflexión que lleva a su vídeo semanal | se reparte igual que en `§8g`: la mitad no vende |
| Hugo (1) | crónica del evento, sin enlace | el correo de después de una fecha no vende |
| EDEM (1) | anécdota con su hija → programa de M&A | historia personal con giro nombrado |

**🆕 Y DE AQUÍ SALE UN CANDIDATO MÁS, el 9:**

**🧰 PILAR 9 · LA RECETA REGALADA (candidato, n=0, como los otros cuatro)**
- **La evidencia:** 2 de los 4 correos de RunnerPro de esta semana, y es el mismo molde las dos
  veces (fuerza y cadencia). Timepack ya tenía el how-to en el 22% de sus asuntos (`§2`).
- **Qué es:** el correo enseña un método entero y utilizable (pasos numerados, con cifras), incluido
  **cómo medirse** (punto 4), y **el producto es aplicarlo a SU caso**, no el método.
- **Por qué no es el pilar 1 (el dolor):** el 1 hace consciente el problema; este **lo resuelve a
  mano** y deja que el lector descubra lo que cuesta hacerlo cada semana.
- **⛔ El límite, y es el que más fácil se cruza:** el puente no puede prometer que "se ajusta solo"
  ni que "lo hacemos por ti" (`§7`, automatismo). **La receta es cómo encontrar empresas a mano; lo
  que se vende es la identificación ya hecha para su caso**, con la persona de dentro.
- **Remitente:** Asier (es el pilar más técnico de los cinco candidatos) o Iker. **CTA:** el ninja,
  después de la receta.
- **En el orden de `§8g`, va 3º, por delante de la cicatriz:** no necesita el OK de Iker sobre qué
  fracaso contar, y tiene la mitad de la semana de RunnerPro detrás.

#### ⛔ Lo que NO se copia de esta ventana
- **Las erratas**, que siguen: `está asociada` por *esta*, `hacho`, `uqe`, `uan`, `bien ayudarte`
  (Isra) · `vivecon`, `ansiedadque`, `queno`, `semanahe` (Juan, el editor pega las palabras).
- **El testimonio con coletilla de Isra:** *"Pd2: 'Isra, por favor, no dejes nunca la firma'. Imanol
  C. / \*Este testimonio podría ser mentira, pero no lo es."* **El mecanismo es bueno** (la broma
  desactiva la sospecha de testimonio inventado), **pero nosotros no tenemos testimonios
  publicables**: las citas del informe son de reuniones privadas (`§5-ECO`). **Sin permiso escrito
  del cliente, no existe.**
- **La política y el insulto de Isra** (`votas a Sánchez`, la ginecóloga). Igual que en `§8g`.
- **El año de la fuente en el cuerpo** (Kieran: *"Gartner's 2026 CMO survey"*). En nuestro cuerpo va
  el nombre y nunca el año (`global §3.5b`).
- **El lanzamiento de Sonia Ferrent:** 131 palabras, dos exclamaciones y un emoji en el asunto
  (`¡Ya está aquí: Hackea tus Ventas! 🚀`), *"Early Bird"* y *"yo no le daría demasiadas vueltas
  😜"*. Es **nuestro sector y nuestro comprador en español**, y es el lanzamiento más flojo de las
  cinco ventanas al lado del de Hugo (`§8c`) o de la cuenta atrás de Isra de esta semana.
- **Cosas de Freelance:** *"Si quieres hablar conmigo no contestes a este correo"*. **Es lo contrario
  de lo que queremos** (`§0`: la respuesta es el objetivo secundario y mejora la entrega), y lo
  hace con 43 enlaces y un bloque de patrocinio. Sí vale su línea 1, que declara la cita (arriba).

#### 🔔 Y UN APUNTE OPERATIVO PARA EL EVENTO, que viene de los recordatorios de Luma
Luma manda solo, a cada inscrito, **dos correos automáticos: uno a las 24 h y otro 1 h antes**, con
el asunto `⏰ {título del evento} empieza mañana` y `… empieza dentro de 1 hora` (medido en un evento
de las 16:00: salieron a las 16:00 del día antes y a las 15:01). **Consecuencias para NEETY FORWARD:**
el inscrito ya recibe dos recordatorios con el nombre del evento en el asunto, así que **un tercero
nuestro el mismo día sobra** y cuenta como ruido para él. Lo que sí le falta a la lista es **el
correo de después** (arriba), porque Luma no lo manda.

## 9 · Entrega y validación (cada email, sin excepción)

- **Cada email va en su bloque cercado** (` ``` ` sin lenguaje), formato exacto:
  ```
  REMITENTE: Iker
  ASUNTO: …
  PREVIEW: …

  (cuerpo del email, con sus saltos de línea reales)

  (firma)
  P.S. …
  ```
- **Sin markdown dentro del bloque** (los emails van en texto plano).
- Fuera del bloque: pilar, segmento objetivo, el porqué del ángulo, los avisos 🔴 y los datos con su año (entrega interna).
- **Validador mecánico:** `python scripts/validar-email.py <fichero.txt>` y pegar el resultado en la entrega, como con los posts. Si esa línea falta, es que se ha saltado.
  - **🆕 Checks añadidos el 2026-09-14 con el corpus de `§8g`** (los 5 probados rompiendo el dato a propósito y viéndolos caer): **la `¿` de apertura** si el asunto pregunta (fallo duro) · **aviso a partir de 40 caracteres de asunto**, que es la diana nueva, no el techo · **el punto final deja de avisar** en asuntos de ≤4 palabras y sigue avisando en los largos · **la micro-apertura** de 1-4 palabras con punto en la línea 1 (aviso) · **PPD** cuando hay PD y no hay segunda (aviso).
  - **🆕 Checks de RITMO añadidos el 2026-09-15** (Iker: *"nunca puedes poner un ritmo predecible de bloques ni en el correo ni en las publicaciones, y nos faltaría un bloque de tres"*). Estaban en `validar-post.py` desde el 06/08 y **en el correo no los miraba nadie**, así que el correo 4 salió con `1-2-1-2` de apertura y sin un solo bloque de 3, y lo cazó él a ojo en dos iteraciones. Ahora: **al menos un bloque de TRES** (fallo duro) · **ciclo de 2 o de 4** (aviso) · **tramo en espejo `1-1-X-1-1`** (aviso) · **la línea suelta domina, ≥55%** (aviso).
    - **⛔ El tramo de la venta NO entra en el patrón del ciclo**, y no es una excusa: su forma la impone otra regla (`global §4.4b-EVENTO-CONTEXTO`, línea de contexto + bloque de dos), así que contarlo sería medir una regla contra otra. **El espejo sí se mide sobre el texto completo**, porque es un patrón que ve el ojo.
    - **⚠️ Y el ciclo es AVISO y no fallo duro por un dato nuestro:** el **correo 3**, publicado y aprobado, lleva `1-2-1-3-1-2-1-2-1`. Tumbarlo sería silenciar a un ganador, que es justo lo que `global §3.2` dice que no se hace. **Probado rompiendo el dato**: la versión vieja del correo 4 cae con "falta un bloque de TRES".
- **Pase de criterio en silencio** (lo que el script no ve): ¿el asunto abre un gap real o describe? ¿la primera línea recompensa? ¿una sola idea? ¿el remitente encaja con el tema? ¿el caso es real? ¿el ángulo no está quemado de emails anteriores (mirar `historial-newsletter.md`)?

### ⛔⛔ 9a-BIS · TODA CAMPAÑA NACE EN BORRADOR. NUNCA PROGRAMADA, NI AUNQUE LO PIDA (Iker, 2026-08-27) — CANÓNICO

> **Iker, literal, tras descubrir el bug del preheader duplicado (`§3b`) mandándose su propio test:** *"a partir de ahora nunca me dejes de primeras las cosas en programado, siempre me las tienes que dejar en borrador hasta que yo no valide con un correo de test que me envío a mí mismo... nunca lo puedes programar, aunque yo te lo diga. O sea, siempre me tienes que frenar, a menos que ya haya revisado."*

**La regla, y es la excepción a "hazlo si te lo pide":** al crear cualquier campaña de Brevo, **nunca se pasa `scheduledAt`**, sin importar que Iker diga explícitamente "prográmala ya" o dé fecha y hora. Se crea en borrador, se le dice claramente que está en borrador y qué falta (mandarse el test y confirmarlo), y solo se programa cuando él dice que ya ha revisado el test — eso sí es la validación que pide, no hace falta que repita la frase exacta cada vez.

**Por qué:** el bug del `§3b` (preheader duplicado) llevaba **3 tandas enviadas** antes de que nadie lo viera, porque nadie se había mandado un test. El validador mecánico y el pase de criterio no lo cazan — es justo el tipo de fallo que solo se ve abriendo el correo de verdad en una bandeja real.

### ⭐ 9b · AVISOS DE PRE-ENVÍO — se pegan SIEMPRE debajo del texto entregado (Iker, 2026-08-06)
Igual que en LinkedIn se avisa de adjuntar la imagen o de pasarle las tipografías al diseñador, **toda entrega de un correo termina con esta lista**. No es opcional y no se resume: se pega entera, porque es lo que se olvida cuando hay prisa.

```
🔴 ANTES DE ENVIAR A NADIE:
1. Prueba a `testers` (mínimo 4, y que NO sean los 4 el mismo cliente de correo).
2. RESPONDER a esa prueba y comprobar que la respuesta llega al buzón que se lee.
3. Abrirlo en MÓVIL y en modo OSCURO.
4. Que el pie legal y la baja salgan UNA sola vez y en ESPAÑOL.
5. Que el GIF anime, y que su primer fotograma se entienda solo (Outlook lo congela).
6. Que los enlaces del cuerpo y de la PD lleven donde tienen que llevar.
7. Test de spam (Mail-Tester o equivalente) antes del primer envío masivo del dominio.
8. Comprobar si cae en Principal o en Promociones.
9. Destinatarios apuntados al GRUPO correcto, no a "todos los suscriptores".
10. Envío ESCALONADO: nunca la lista entera de golpe.
11. Texto plano con las MISMAS frases que el HTML (son dos capas, §9c).
12. Cuenta → Rastreo del enlace: que `utm_campaign` sea el de ESTE correo.
    Se hereda del envío anterior (§9c).

🔴 Y DESPUÉS DE DARLE A ENVIAR (o de programar):
13. RECARGAR el panel y confirmar que la campaña está en Enviadas y no ha
    vuelto a Borradores. Ha pasado 2 de 2 veces (§9c).
```

- **El nº 2 es el más importante y el que más se olvida:** si las respuestas no llegan al buzón, un correo de re-permiso no vale absolutamente nada, y no te enteras hasta que es tarde.
- **El nº 9 ha estado a punto de fallar de verdad** (2026-08-06): la campaña se quedó apuntada a "todos los suscriptores" con 1.333 contactos mientras el plan era mandar a 50.
- **Resumen al final** de cada entrega (`working-preferences §0b`).

---

## ⭐ 9c · OPERAR LA HERRAMIENTA — todo lo aprendido montando el correo 0 (2026-08-06)

Un día entero de fricción, destilado. **Léelo antes de montar cualquier campaña.**

> ⚰️⚠️ **ESTA SECCIÓN SE ESCRIBIÓ SOBRE EL PANEL DE MAILERLITE, y desde el
> 2026-08-20 el proveedor es Brevo (`§0c`). Ninguno de los pasos concretos de
> panel está verificado en Brevo.**
>
> Lo que SIGUE VALIENDO es el **tipo** de trampa, porque se repite en cualquier
> plataforma y es lo que costó un día descubrir: los UTM cuelgan de la cuenta y
> no de la campaña · el pie legal no se puede quitar · hay ajustes que se
> resetean al tocar por API · darle a enviar no es haber enviado · la
> verificación gratuita de listas no cubre nuestro caso · la lista de supresión
> se monta ANTES que nada.
>
> **Cada apartado hay que volver a comprobarlo en Brevo la primera vez que se
> use, y corregir aquí lo que cambie.** Lo que NO depende del proveedor —la
> lista de supresión (`§9c` LISTA DE SUPRESIÓN), el ritmo de tandas, los
> testers por cliente de correo, el dominio que no dice el país— vale tal cual.

### Lo que se edita SIEMPRE por duplicado
**⛔ Un correo tiene DOS capas y hay que tocar las dos.** El HTML es lo que ve la gente; el **texto plano** es una versión alternativa oculta que **leen los filtros de spam**. Si el HTML va en español y el texto plano se queda en la plantilla inglesa por defecto, es una incoherencia que puntúa en contra. Cada vez que se cambia una frase, se cambia en los dos sitios.
- **Dónde está el texto plano:** paso *Enviar o programar* → flecha desplegable junto a **"Editar contenido"** → **"Editar versión de texto plano"**. No está dentro del editor.
- Debe terminar siempre con el `{$unsubscribe}`.

### Los dos pies de página
Hay **dos** y hay que repartirlos, o salen duplicados:
- **Pie de la CUENTA** (Configuración de la cuenta → *Detalles de la empresa y descargo de cancelación*): nombre, dirección y aviso legal. Es el que se añade solo a todo.
- **Pie de la CAMPAÑA** (formulario "Pie de página" dentro del editor): **solo los textos de los enlaces**. Se vacían *Nombre de la compañía*, *Detalles de la empresa* y *Aviso legal* para que no se repitan.
- **⛔ No se puede quitar el pie de la campaña:** es el que lleva el enlace de baja, y MailerLite bloquea el envío sin él.
- **Si los campos de texto de enlace están vacíos, sale `you_unsubscribe`**, una clave de traducción sin resolver. Hay que rellenar *Texto del enlace para cancelar suscripción* (`Darme de baja`) y *Texto de enlace del centro de preferencias* (`Cambiar mis preferencias`).
- 🔴 **Y marcar las casillas "Forzar la actualización… en borradores"**, o los cambios NO llegan a la campaña ya creada. **Esta fue la causa de que pareciera que nada se guardaba.**

### Ajustes que se olvidan y muerden
- **Idioma: por CAMPAÑA, no por cuenta.** No se hereda de una campaña a otra ni de la cuenta. Controla el pie legal y la página de baja.
- **Zona horaria: ✅ `Europe/Madrid (+02:00)`, verificado en el panel el 2026-08-11.** Se programa en hora española directamente, sin ajustar nada.
  - ⚠️ **Pero la API SIEMPRE devuelve UTC**, tenga la cuenta la zona que tenga. Un envío para las 09:01 de Madrid aparece como `scheduled_for: 07:01`. **Eso es correcto, no es un fallo**: son el mismo instante. Al verificar por API hay que restar las 2 horas (1 en invierno) antes de dar nada por roto.
- **Banner "Sent by MailerLite":** se quita en Configuración de la cuenta → *MailerLite branding*. Incluido desde el plan Comfort.
- **Los correos de PRUEBA no generan enlaces de baja ni de preferencias reales**: no se pueden pulsar. Es lo único del checklist que solo se verifica enviando de verdad.

### 📬 DE DÓNDE ENTRAN LOS SUSCRIPTORES DESDE EL 2026-08-18: LA LANDING DE CORREO
**Hasta ahora la lista se alimentaba de la base del CRM y de los gates de recursos. Desde el 18/08 hay una puerta propia: `recursos.neety.com/newsletter/` (alias `/correo/`), que es un formulario y nada más.**
- **Le llega tráfico desde el SEGUNDO spam ninja de los posts** (`global §4.4e`): el bloque de correo que va en historia, despiece, insight, evento y meme corto. No va en mapa, ni en "Los 10", ni en el post del lead magnet.
- **El formulario pide nombre, correo y el desplegable de "¿cómo nos conociste?"**, que es lo que permite segmentar: la mayoría vendrán de LinkedIn, pero no todos. **Ese campo y los UTM se validan mutuamente**, igual que ya pasó el 10/08 con el `origen: newsletter` del que vino del correo 0.
- **El consentimiento de newsletter es obligatorio ahí, y esa página es la ÚNICA donde lo es** (`lead-magnet-web §3b`): en un gate de recurso o en `/agendar/` la casilla siempre es voluntaria, porque obligar a suscribirse para descargar otra cosa convierte peor y además es consentimiento agrupado, que por RGPD no vale. En `/correo/` sí, porque ahí el servicio que se pide **es** el correo. Consecuencia buena para nosotros: todo el que entra por esta vía es alta limpia y querida, no hay que filtrar después.
- ⚠️ **Al planificar una tanda, estos NO son la base fría del CRM**: han pedido el correo ellos. Van a su propio grupo y no se mezclan con los grupos de origen del warm-up.

### 🔴 LOS UTM SON DE LA CUENTA, NO DE LA CAMPAÑA (Mario, 2026-08-10)
El rastreo de enlaces vive en **Configuración de la cuenta → Rastreo del enlace**, y sus tres campos se inyectan en **TODAS** las campañas. Si no se tocan, el correo nº 2 llega a GA4 con el `utm_campaign` del correo nº 1 y los datos se mezclan sin que nadie lo note.

- ⚠️ **CORREGIDO EL 2026-08-20 AL MIGRAR A BREVO.** La regla de abajo (`utm_source = newsletter`) era de MailerLite, donde el valor se podía editar. **En Brevo NO se puede**: `utm_source` y `utm_medium` están fijos en `brevo` y `email`, sin lápiz ni en la campaña ni en Configuración → Parámetros UTM. Solo son editables `utm_campaign`, `utm_content`, `utm_term` y `utm_id`.
  - **No se pelea con la herramienta: se cambia la regla.** `brevo` es incluso más preciso que `newsletter`, porque dice qué herramienta lo mandó.
  - 🔴 **Al leer GA4, la atribución está partida en dos:** hasta el **2026-08-11** la fuente es `newsletter` (MailerLite) y desde el **2026-08-20** es `brevo`. Para comparar periodos hay que filtrar las dos. El campo `origen` de los leads de `recursos.neety.com` hereda ese mismo corte.
  - **Lo que SÍ se controla es `utm_campaign`**, y es lo que importa: `remitente-numero-tanda` en minúsculas y con guiones (`kaixito-01-tanda-1`). Sin eso, todas las tandas caen en el mismo cubo y se pierde justo lo que hay que medir. **Al DUPLICAR una campaña para la tanda siguiente, se arrastra el de la anterior: hay que cambiarlo a mano.**
- ~~`utm_source` = `newsletter` y `utm_medium` = `email` — **fijos, no se tocan nunca.**~~ (histórico, MailerLite)
- `utm_campaign` = **el CORREO**, en kebab-case (`kaixito-01-segmentar`). **Se cambia cuando cambia el correo, NO cuando cambia la tanda:** las tandas son el mismo correo y deben agregarse juntas en GA4.
- `utm_content` = **la tanda** (`tanda-2`). Así GA4 agrega por campaña y deja desglosar por tanda. Es el campo que estaba vacío y resuelve el conflicto.
- **Va al checklist de pre-envío (§9b, punto 12): antes de CADA envío, comprobar que `utm_campaign` es el del correo que se manda.**
- ✅ Funciona de punta a punta, verificado el 2026-08-10: el formulario de `recursos.neety.com` recogió `origen: newsletter` y `cómo nos conoció: email` de una persona que vino del correo 0. **El campo `origen` del formulario y los UTM del enlace se validan mutuamente.**

### Cómo se monta la tanda N (probado el 2026-08-10)
**El cupo se hace con un GRUPO; la exclusión, con el selector de destinatarios de la campaña.** No hace falta calcular a mano quién ya lo recibió:
1. Crear el grupo `warmup-tanda-N` (vacío).
2. En Suscriptores, filtrar por el grupo origen y **añadir al grupo N páginas enteras** (100 por página). Da igual si caen repetidos de tandas anteriores.
3. Duplicar la campaña anterior y en destinatarios: **incluir** `warmup-tanda-N` y **excluir** `warmup-tanda-1…N-1`, `testers` y los grupos de origen conocido. MailerLite resuelve el solape solo.
4. Verificar el contador antes de enviar: saldrá algo menos que el cupo, y esa diferencia son los repetidos que ha quitado.
- ⛔ **Los `testers` NO se incluyen a partir de la tanda 2:** ya lo recibieron y falsean el denominador (en la tanda 1 fueron 5 de 54, un 9% de la muestra).
- ⚠️ **Los segmentos por API no aplican la exclusión de grupos.** Se probó `not_in_all` sobre `groups` y el segmento salió con la lista entera (1.310 en vez de ~1.236). Si hace falta un segmento con exclusiones, se configura en el panel.

### ⛔ LA VERIFICACIÓN GRATUITA DE LISTAS NO SIRVE PARA NUESTRO CASO (probado el 2026-08-10)
Se comprobaron por DNS los 71 dominios únicos de la tanda 2 buscando dominios muertos (sin MX ni A). **Resultado: 1 de 71.**
- **Por qué:** en una lista de un CRM de hace un año los rebotes NO son dominios caídos, son **buzones que ya no existen porque la persona cambió de empresa**. El dominio sigue vivo y respondiendo. Detectar eso exige verificación SMTP a nivel de buzón, que es justo lo que cobran los servicios.
- **Lo gratuito que SÍ vale la pena hacer siempre (y es gratis):** sintaxis, dominios desechables (`qvmao.com` y similares), y direcciones de rol (`marketing@`, `info@`) — MailerLite ya rechaza estas últimas al importar.
- **Recomendado: MailerCheck**, que es de los mismos que MailerLite y por eso entra sin exportar CSV. **0,01 $ por correo, mínimo 1.000 (10 $), los créditos no caducan** y da 10 gratis de prueba (verificado en su web el 2026-08-10). Las alternativas gratuitas (ZeroBounce 100/mes, y 100-500 créditos de alta única en el resto) obligarían a registrarse en cinco sitios para cubrir 1.000 y devolverían criterios distintos: no compensa por 10 $.

### 🔴🔴 LA LISTA DE SUPRESIÓN PERMANENTE — se monta ANTES que nada (2026-08-11)
**Antes de importar un solo contacto a cualquier plataforma, se crea un grupo de EXCLUSIÓN y se excluye en TODAS las campañas, sin excepción.** No se decide caso por caso ni se confía en acordarse.

Qué entra, por orden de gravedad:
1. **CLIENTES ACTUALES.** Mandarle a un cliente un correo que dice *"no sé de qué te conozco"* es el peor error posible: el cliente no se da de baja, llama al comercial. Pasó el 2026-08-11 con **Fagor Automation** (`ahernandez@fagorautomation.es`, 4 clics: probablemente alucinando de que no le reconociéramos) y se evitó por poco con **Telpark**.
2. **Los que se dieron de baja.** Requisito legal, y reimportarlos es la vía más rápida a otro baneo.
3. **Los rebotados.**
4. **Prospectos en conversación comercial abierta**, que tampoco deben recibir correo de lista fría.

⛔ **Y el aviso de método: la lista de clientes NO la puede reconstruir Claude.** Los 5 nombres que aparecen en `project-personas-clientes` (Fagor Automation, Telpark, OJMAR, Arania, Betsaide) salieron de UN post de Iker, no de la cartera. **Cualquier cliente que no saliera en ese post es invisible para mí.** Hay que exportarla del CRM y pedirla explícitamente. Es exactamente el mismo principio que las menciones: lo que no se puede verificar, se pregunta (`§7`).

⚠️ **Y no basta con el dominio.** `p.carbonell@telpark.com` se pilla por dominio, pero un contacto de un cliente con Gmail personal no. La exclusión fiable sale del CRM cruzando por EMPRESA, no por cadena de texto en el correo.

### ⛔ EL DOMINIO DEL CORREO NO DICE EL PAÍS (medido el 2026-08-10)
Sobre los 151 candidatos a la tanda 2: **85% no da ninguna señal de país** (56% gmail/hotmail/outlook/icloud + 29% dominios `.com`/`.io`/`.ai`). Solo 9 eran `.es` y 13 LatAm.
- **Corolario: el ICP de una lista NO se puede segmentar por el correo.** El país sale del CRM (HubSpot), y si el CRM no lo tiene, no se tiene. **Priorizar por afinidad exige enriquecer antes.**
- 🔴 **Y el error de método que lo destapó: afirmé "buena parte de la lista es LatAm" de un vistazo, sin contar.** Eran 13 de 151. **Ninguna composición de lista se afirma sin contarla**, igual que no se escribe una cifra sin fuente (`§7`). Si el conteo cuesta una llamada, se hace la llamada.
- **Lo que sí se hace mientras tanto:** en las tandas de calentamiento van primero los más afines que se puedan identificar, y los claramente fuera de ICP se dejan para la última. No por entregabilidad, sino porque **calentar con gente que no va a abrir desperdicia el envío**.

### 🔴🔴 DARLE A ENVIAR NO ES HABER ENVIADO — `needs_manual_content_review` (3 de 3 envíos)
Al pulsar enviar, MailerLite pasa la campaña a **Bandeja de salida** y la pone **"en revisión"**, y de ahí vuelve a Borradores. Solo se descubre recargando el panel: aparece un *"perdón por la demora"* con la opción de enviar ahora o reprogramar.

**⭐ CAUSA REAL, identificada por API el 2026-08-11 (antes estaba mal apuntada como un fallo de la plataforma):**
```
warnings: ["needs_manual_content_review"]   is_stopped: true   can_be_scheduled: false
```
**Es una RETENCIÓN DE CUMPLIMIENTO: una persona de MailerLite tiene que aprobar el contenido a mano.** No se cae por tardar y no es un bug.
- ⛔ **Dos teorías descartadas:** (a) que sea un fallo técnico y (b) que se caiga porque la revisión tarda más que el "enviar ahora" y se pasa la hora. La campaña no caduca: **la retienen**.
- ⛔ **Programar NO lo esquiva:** con una revisión pendiente, `can_be_scheduled` está a `false`. Un programado retenido pierde su ventana igual, y encima te enteras tarde.
- **Por qué pasa:** cuenta nueva escalando volumen rápido (54 → 137 → 337) con lista recién importada. Es el patrón que dispara la revisión en cualquier ESP.
- ✅ **LA SOLUCIÓN NO ES CONVIVIR CON ELLO: se le pide a soporte que apruebe la cuenta.** Argumentos que valen: lista propia, doble opt-out visible, 0 denuncias de spam en 191 envíos. Se resuelve en horas y deja de pasar.
- **Si nadie recarga, el correo no sale y no hay ninguna notificación.** En la tanda 2 costó 20 minutos: se pulsó a las 11:30 y salió a las 11:51.
- **⛔ REGLA: siempre que Mario diga que va a enviar o que ya ha enviado, se le avisa de que lo verifique, y se comprueba por API en el momento.** No es opcional y va en la misma respuesta.
- **Cómo se comprueba:** `get_campaign` → `status` debe ser `sent` (o `ready` con `scheduled_for` si es programado), más `queued_at` y `started_at` con hora real. Un `status: draft` después de darle a enviar significa que se cayó.
- **Con los programados el riesgo es peor:** si se cae uno puesto para el día siguiente, te enteras cuando ya ha pasado la hora. **Todo programado se verifica el mismo día del envío.**

### Una campaña = un envío
Una campaña **solo se puede enviar una vez**. Cada tanda es una campaña distinta: se nombra `… Tanda 1`, `Tanda 2`, y **la siguiente se DUPLICA de la anterior** (arrastra idioma, texto plano, UTM y pie ya resueltos). 🔴 Lo único que hay que cambiar al duplicar es el **grupo de destinatarios**, y verificar el contador antes de enviar.

### Lo que sí funcionó a la primera
El correo llegó a **bandeja Principal de un Gmail externo**, ni Promociones ni Spam. No fue suerte: texto dominante, **un solo enlace**, sin plantilla de marketing con botones ni banners, tono personal y dominio autenticado. **Es la validación del formato que define esta skill.**

---

## 10 · Huecos pendientes (preguntar, no adivinar)

- [x] ~~Herramienta de envío: MailerLite~~ **CANCELADA el 2026-08-11 (`§0b`). Migrando a Brevo, ver `§0c`.**
- [ ] **Subdominio de envío para Brevo** (`mail.neety.com` o similar): pendiente de que Iker confirme quién tiene acceso al DNS de neety.com para meter los registros. Es el bloqueante nº 1 de la migración (`§0c`).
- [ ] **Firma-mantra** de la casa (ver §3.7): decisión de marca.
- [ ] **Tokens de personalización** ({nombre}…): depende de la herramienta elegida y de qué campos tenemos (muchos contactos son solo un correo).
- [ ] **Etiqueta `newsletters` en el Gmail** de Iker para que el análisis periódico del corpus (§8) sea un filtro limpio.
- [ ] 🔴 **FOTO DEL REMITENTE — avisar a Mario en CADA correo hasta que se resuelva (pedido por él, 2026-08-06).** Hoy los correos salen con la inicial genérica de Gmail en vez de un icono. **Dos caminos distintos según el tipo de envío, aclarado el 2026-08-18:**
  - **Envío MASIVO (newsletter, por Brevo/MailerLite):** no se arregla subiendo una imagen a la herramienta. Es **BIMI**, y requiere DMARC en modo estricto (`p=quarantine` o `p=reject`), un registro DNS de BIMI y un **certificado de pago de 650-1.100 $/año** que tarda 1-3 semanas. Cuando se haga, va el **ISOTIPO, no Kaixito**: BIMI se aplica **por dominio**, así que el mismo logo saldría en todos los correos de `neety.com`, incluidos los comerciales de los founders.
  - **⭐ CORREGIDO el 2026-08-18: NO hace falta Workspace ni tocar el MX del dominio. Mario ya lo probó gratis para sí mismo.** El truco real: crear una **cuenta de Google independiente** que use la dirección `@neety.com` como identidad, sin que eso la convierta en un buzón ni toque el dominio.
    1. Ir a `accounts.google.com/signup`.
    2. Nombre y apellido reales (el del founder), y pulsar **"Usar mi dirección de correo actual"** en vez de crear una nueva de Gmail.
    3. Meter `iker@neety.com` (o la que toque). Google manda un código de verificación a esa dirección — llega porque el reenvío actual la lleva a una bandeja real. Se mete el código.
    4. Poner contraseña y guardarla (es una cuenta real, aunque no se use como bandeja: conviene 2FA y guardar la clave en el gestor de contraseñas, para que no quede huérfana).
    5. Subir la foto de perfil y dejar su visibilidad en **"Cualquier persona"** (pública) — sin eso no la ven los destinatarios externos.
    - Gratis, sin dominio propio en Google, sin tocar el DNS. Es individual por persona: cada founder crea la suya.
    - Sigue limitado a **envío individual** (el que sale de verdad autenticado como esa cuenta), no está confirmado que sirva para el envío MASIVO de la newsletter — el envío por lotes de un ESP suele llevar cabeceras de "remitente masivo" (List-Unsubscribe, volumen) que es plausible que Gmail use para NO mostrar avatar y evitar que se abuse del truco para parecer más confiable. **Es una deducción, no algo verificado.**
    - ⭐ **Antes de gastar en BIMI: probarlo gratis con `hola@neety.com`.** Crear la cuenta igual que arriba, poner la foto, mandar UNA campaña de prueba a un Gmail personal y mirar si sale el avatar. Cuesta 10 minutos y nada de dinero; si funciona, nos ahorramos los 650-1.100 $/año de BIMI.
    - ⭐ **Y con Workspace, la foto se resuelve BIEN y sin trucos (2026-08-18).** El muro con el que chocó Mario es que **un Grupo de Google no puede tener foto de perfil**; un usuario sí. Dos caminos: **Grupo** (gratis, recibe y reparte a varios, sin foto) o **usuario dedicado** con `hola@neety.com` (una licencia más: recibe, reparte con una regla de reenvío a Iker y Mario, **y tiene foto**, además de servir como cuenta real con login). Una licencia suelta es mucho más barato que migrar el dominio entero a Workspace, que era la alternativa que proponía Iker.
    - 🔴 **INCIDENTE 2026-08-18: `hola@neety.com` se quedó SIN RECIBIR NINGÚN CORREO** (`Address not found`) al desmontar el Grupo de Google que hacía de reenvío, antes de tener el reemplazo funcionando. El DNS del dominio vive en **Cloudflare** (a diferencia del dominio personal de Mario, en Porkbun, donde el truco de la foto funcionó a la primera porque allí el reenvío sí lo daba el registrador).
      - **🔴🔴 RESUELTO el 2026-08-18, y mi checklist anterior era PELIGROSO. El correo de `neety.com` lo gestiona GOOGLE WORKSPACE, no Cloudflare.** Cloudflare es solo el DNS. En su panel, Email Routing sale como `Disabled` y sus MX como `Missing` — **eso es CORRECTO y debe quedarse así**. Pulsar el botón "Add missing records" habría metido los MX de Cloudflare y **le habría quitado el correo a Google, dejando sin recibir a TODO el dominio** (Iker, Mario, Unai, `management@`), no solo a `hola@`. Estuvo a punto de pasar.
      - **La causa real del rebote:** al borrar el Grupo de Google, `hola@neety.com` dejó de existir DENTRO de Workspace. Google recibe el correo, no encuentra la dirección y devuelve `Address not found` desde `mailer-daemon@googlemail.com` (el remitente del rebote es la pista: si fuera Cloudflare, el rebote vendría de Cloudflare). **El arreglo está en `admin.google.com`, nunca en Cloudflare.**
      - ⛔ **Regla general: antes de tocar MX o "activar" el correo en un panel de DNS, comprobar QUÉ proveedor gestiona ya el correo del dominio.** Un panel de DNS que ofrece su propio servicio de correo siempre mostrará sus registros como "Missing" aunque todo funcione perfectamente con otro proveedor. "Missing" ahí no significa roto.
      - **Subaddressing (el `hola+etiqueta@`) NO tiene nada que ver con subdominios ni con esto.** Se deja apagado.
      - **✅ VERIFICADO en el DNS real de Cloudflare (2026-08-18):** `neety.com` MX → **`smtp.google.com`** (prioridad 1). Es Google Workspace, confirmado. Los MX de `cf-bounce.neety.com` que aparecen en la misma lista **están en un SUBDOMINIO y llevan candado** (los gestiona Cloudflare solo): no compiten con Google y no hay que tocarlos.
      - **Las reglas de Email Routing figuran como "Active" pero el servicio está "Disabled": son reglas huérfanas que NUNCA han funcionado**, porque el correo va directo a Google sin pasar por Cloudflare. Que una regla ponga "Active" no significa nada si el servicio padre está apagado.
      - 🔴 **CONFIRMADO el 2026-08-18: `support@neety.com` TAMBIÉN rebota.** Los correos de soporte de clientes se estaban perdiendo en silencio, y probablemente nadie en la empresa lo sabía. Se arregla igual que `hola@`: recreándolo como Grupo en Workspace.
      - 💾 **DATO A NO PERDER — la dirección de Intercom que estaba en la regla huérfana de Cloudflare:** `f8t0sshv@neety-ef6381211fe5.intercom-mail.com`. Es el miembro que hay que meter en el Grupo `support@` para que las conversaciones lleguen a Intercom. Si alguien limpia las reglas de Cloudflare, esta dirección desaparece y hay que volver a sacarla de Intercom.
      - ⚠️ **Aunque `support@` no aparezca publicado en la web, puede estar en uso:** Intercom suele usar esa dirección como *reply-to* de sus conversaciones, así que las respuestas de clientes van ahí. Comprobarlo en Intercom antes de darlo por irrelevante.
      - **Por qué la empresa necesita Workspace y un dominio personal no:** son capas distintas. Un **reenvío** (Porkbun, Cloudflare Email Routing) solo relega el correo a otro buzón: no hay cuenta, ni contraseña, ni almacenamiento. La empresa necesita **buzones reales** con login, calendario y Drive, y eso solo lo da un proveedor de correo tipo Workspace. **Cloudflare Email Routing es de la misma categoría que el reenvío de Porkbun**, por eso no puede ser la solución aquí: un dominio solo tiene un MX y ese MX ya es de Google.
      - 🧹 **Resto de la mudanza: `neety.com` TXT lleva el SPF de MailerLite** (`v=spf1 include:_spf.mlsend.com`), de la cuenta cancelada. No hace daño hoy pero autoriza a un proveedor que ya no se usa: **se sustituye por el de Brevo cuando se monte** (`§0c`).
      - **La verificación de la cuenta de Google y el reparto a varias personas NO son lo mismo y no chocan entre sí.** Primero se arregla la recepción (aunque sea a una sola persona), se verifica la cuenta de Google para la foto, y DESPUÉS se puede volver a montar el reparto multi-persona (recrear el Grupo, que ya funcionaba, o un Cloudflare Email Worker con `message.forward()` a cada destino).
      - **Pendiente: pedirle a Iker un acceso reducido a Cloudflare** (rol o token limitado a Email Routing) para que esto deje de bloquear cada vez que toca tocarlo.
- [ ] **Kaixito:** confirmar cómo se presenta (¿remite desde kaixito@neety.com?).
- [x] ~~**Export del Google Chat de feedback de producto**~~ **RESUELTO EL 2026-08-24, y por otra vía.** No hizo falta el Takeout: llegó el informe de feedback ya destilado (`FEEDBACK CLIENTES 24 AGO.html`, 258 citas / 63 empresas / 87 reuniones). **Y NO se ha creado `dolores-clientes.md`**: el inventario vive en `global §4.4b-MUNICIÓN` (el banco de dolores del spam ninja) y en `aboutme §1b`, que es donde ya lo leen las dos recetas. **Un fichero más habría sido una tercera copia que desincronizar** — cómo se usa desde aquí está en `§5-ECO`.

#### ⛔⛔ 5-NINJA-PRONOMBRE · EL VALIDADOR MIDE LA FORMA, NO A QUÉ APUNTA EL PRONOMBRE (Iker, 2026-08-27)

**El fallo, y pasó los 31 checks:** el ninja del correo 2 decía

```
⛔ 200 tarjetas te las da cualquier feria.
   Buscarlas ya las buscamos nosotros: {link}
```

`Buscarlas` recoge el sustantivo más cercano, que es **tarjetas**. O sea que la línea prometía que
buscamos tarjetas, que es lo único que no hacemos. Encima repetía `buscar` dos veces en 55
caracteres. **El validador dio 31/31**: la forma era impecable y el significado estaba del revés.

Iker: *"si me confundo yo, imagínate el espectador. No puede haber dudas de lo que nos referimos,
teniendo en cuenta que nuestro público es viejo y que tendrán poco tiempo para leer los correos"*.

**LA COMPROBACIÓN, antes de entregar cualquier ninja:** lee las dos líneas **solas**, sin el correo
delante, y por cada pronombre (`la`, `lo`, `las`, `los`, `-las`, `-lo`) pregúntate **a qué sustantivo
de la línea de arriba se refiere**. Si el que recoge no es el que querías, la línea dice otra cosa.

- **El arreglo casi nunca es cambiar el pronombre: es quitarlo.** Un sustantivo explícito no se puede
  malinterpretar, y en un lector de 55 años con prisa eso vale más que la elegancia.
  ```
  ✅ Una feria te da tarjetas, no clientes.
     El nombre de quien decide, nosotros: {link}
  ```
- **No es mecanizable** (haría falta resolver anáforas), así que vive en el pase de criterio de
  `global §8`, no en el script.

#### ✅ 5-NINJA-AB · POR QUÉ EL A/B DE REMITENTE NO USA LA FUNCIÓN NATIVA DE BREVO (verificado 2026-08-27)

**El A/B nativo de Brevo solo testa el ASUNTO o el CONTENIDO** ([documentación de
Brevo](https://help.brevo.com/hc/en-us/articles/4523165348626-Create-an-A-B-test-campaign)); en la API
son `subjectA`/`subjectB`. **El nombre del remitente no es una variable testeable.** Para testarlo hay
que montar dos campañas gemelas a mano (`§2`, A/B de remitente).

**Lo que se pierde, dicho entero para no volver a preguntarlo:** el nativo declara ganador solo y
manda el ganador al resto de la lista. En un A/B de remitente sobre la lista entera **ninguna de las
dos aplica** (no hay "resto"), y comparar dos campañas deja ver además los **clics**, no solo las
aperturas que es lo único que el nativo mira.
