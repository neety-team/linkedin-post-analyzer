# Historial de la newsletter (ESTADO, no doctrina)

> Equivalente a `historial-publicaciones.md` para el email. Lo LEE el planificador de tandas
> (`email-marketing §6`) antes de escribir nada, y se ACTUALIZA y commitea al aprobar cada tanda.
> Si falta un dato, PREGUNTA. No lo adivines.

## 🟢 ESTADO: PRIMER ENVÍO DESDE BREVO (2026-08-20)

**Kaixito 01 reescrito y enviado.** Fin de la parada de nueve días desde la cancelación de MailerLite.

| | Tanda 1 | Tanda 2 | Tanda 3 |
|---|---|---|---|
| Destinatarios | **25** | **50** | **100** |
| Fecha | 2026-08-20, **18:40** | 2026-08-21, **09:05** | 2026-08-24, **09:05** |
| Entregados | 23 de 25 | 42 de 50 | 88 de 100 |
| **Rebotes duros** | **2 · 8,0%** | **3 · 6,0%** | **9 · 9,0%** 🔴 |
| Rebotes blandos | 0 | 4 (+1 diferido) | 3 |
| Aperturas reales | 7 · 30,4% | 10 · 23,8% | **31 · 35,2%** ⭐ |
| Clics al enlace de reserva | **0** | **0** | **0** |
| Bajas | 0 | 1 | 2 |
| Lista Brevo (id) | `Tanda 1` (5) | `Tanda 2` (6) | `Tanda 3` (7) |
| Campaña Brevo (id) | 2 | 3 | **4** |
| `utm_campaign` | `kaixito-01-tanda-1` | `kaixito-01-tanda-2` | `kaixito-01-tanda-3` |

> Leído de la API el 2026-08-21 (`GET /emailCampaigns/{id}?statistics=globalStats`). **Ojo con
> los dos sitios donde Brevo da las aperturas**: `globalStats.uniqueViews` es el número bueno,
> y `campaignStats[].uniqueViews` da menos (8 vs 2 en la tanda 1). El dashboard del CRM lee
> `globalStats`; si algún día sale un número raro, es que se leyó el otro.
>
> **La tanda 2 marca 1 clic único, pero `linksStats` del enlace de reserva está a 0.** Ese clic
> es casi seguro el enlace de baja, que también se cuenta. **Nadie ha pinchado en agendar
> todavía: 0 de 191.**

- **El texto, el preheader y los GIFs están en `corpus-correos-enviados.md`.** Lo que cambió respecto a la versión que costó la cuenta: `"los correos que nos dejaron el año pasado"` se sustituye por **`"En su día me diste permiso para escribirte. Lo que no tengo muy claro es de dónde saliste."`** La broma se queda entera; lo que la mascota ha perdido ya no es el permiso, es la puerta por la que entraste.
- **Quedan 4 tandas** creadas y APAGADAS: 100, 200, 400 y 380. La 3 no sale antes del **lunes 24**: el fin de semana el ICP no está delante del correo.
- **Pie nuevo, con las dos cosas que hay que tener:** enlace de baja (`{Date de baja aquí}`, en tú) y dirección postal. Al poner el pie personalizado, Brevo **borra el suyo**, y con él el enlace de baja: hay que volver a meterlo a mano o sale un correo comercial sin forma de darse de baja.
- **`utm_source` es `brevo` y NO se puede cambiar** (ver `email-marketing §9c`). La atribución en GA4 queda partida: hasta el 11/08 `newsletter`, desde el 20/08 `brevo`.
- **09:05 y no 09:00** a propósito: a la hora en punto salen todas las campañas programadas del país a la vez.

### 🔴 Y esto es lo que hay que mirar, no las aperturas

**Los rebotes de Brevo son PEORES que los de MailerLite, que es de lo que nos cerraron la cuenta.**

| | Tanda 1 | Tanda 2 |
|---|---|---|
| MailerLite | 3,7% | 2,92% |
| **Brevo** | **8,0%** | **6,0%** |

**Acumulado en Brevo: 5 rebotes duros de 75 envíos = 6,7%.** El umbral del sector es el **2%**.

Y no vale decir que la lista está limpia porque pasó por `audience_clean`: pasó, y aun así
rebotó el 8%. Lo que `audience_clean` detecta (formato, buzones automáticos, desechables,
erratas) no es lo que rebota. **Lo que rebota son dominios que no existen y buzones cerrados**, y
eso no se ve mirando el texto de la dirección.

⚠️ **Corregido el 2026-08-21: un rebote duro NO llega en minutos.** Aquí se dio por bueno lo
contrario y por eso la tanda 1 se apuntó como "25 de 25, cero rebotes". A las 18:45 iba 25 de 25;
dos horas después eran 23. **Mínimo 2-3 horas antes de leer el dato, y mejor al día siguiente.**

### 🔴 Lo primero de mañana, antes de las 09:05

~~**Mirar los rebotes duros de la tanda 1.** Un rebote duro es un rechazo SMTP y llega en minutos.~~ **Falso, ver arriba.** El dato tardó horas, se leyó demasiado pronto y la tanda 2 salió con la tanda 1 aparentando cero rebotes cuando llevaba 2.

Las varas del histórico de MailerLite: 3,7% de rebotes en la tanda 1 y 2,92% en la 2, las dos **por encima del 2% que el sector considera peligroso**.

## 🔵 CÓMO SE CONECTÓ (2026-08-20)

Cuenta de Brevo creada, dominio conectado desde Cloudflare y verificado, API key generada y metida en el CRM (Marketing → Integraciones). **El CRM ya habla con Brevo**: `src/brevo.js` sustituye a `src/mailerlite.js` en `sales-crm-Neety`, spec en `docs/superpowers/specs/2026-08-20-migracion-mailerlite-a-brevo-design.md` de ese repo.

- **Se usa la API a secas, NO el conector MCP** (decidido el 2026-08-20). El que llama a Brevo no es un chat: es un worker desatendido en Railway cada 60 min. MCP es un protocolo para que un agente conversacional use herramientas; un servicio Node necesita `fetch()`. **No hay conector MCP de Brevo conectado y no hace falta.** ⚠️ El conector MCP de MailerLite que sigue apareciendo en la sesión está MUERTO: la cuenta está cancelada. No lo uses para nada.
- **Los tres bloques y cuál se rompió:** recursos.neety.com capta el lead → el CRM lo lee (`resources_leads.js`, solo lectura) y es la fuente de la verdad → el proveedor envía. **Solo se rompió el tercero.** `neety-resources` no tiene ni una referencia al proveedor: es agnóstico por diseño y no se tocó.
- **Las bajas van ahora en los DOS sentidos.** Antes solo entraban (webhook del proveedor → CRM). La dirección CRM → proveedor existía escrita pero **no se llamaba desde ningún sitio**: quien se daba de baja por el enlace del correo seguía en la lista del proveedor y habría recibido la siguiente campaña. Cerrado el 2026-08-20.

### ✅ DNS y dominio: VERIFICADO EN EL DNS REAL el 2026-08-20 (no solo en el panel)

- **DKIM de Brevo: puesto y resolviendo.** `brevo1._domainkey.neety.com` y `brevo2._domainkey.neety.com` son **CNAME** a `b1/b2.neety-com.dkim.brevo.com`, cada uno con su clave RSA 2048. Lo montó la conexión automática de Brevo con Cloudflare.
- 🔴 **TRAMPA AL COMPROBARLO: la conexión AUTOMÁTICA usa CNAME en `brevo1`/`brevo2`, la MANUAL usa TXT en `mail._domainkey`.** Preguntar por TXT en `mail._domainkey` da "no existe" con el dominio perfectamente autenticado, y parece que falta el DKIM cuando está. **Se consulta por CNAME y TXT, en los dos selectores, y contra el NS autoritativo** (`bristol.ns.cloudflare.com`), no contra un resolver público que cachea negativos.
- **El SPF NO necesita a Brevo, y no es un olvido.** DMARC pasa si alinea SPF **o** DKIM; con DKIM firmando como `neety.com` ya alinea, y Brevo usa su propio return-path. Añadir `include:spf.brevo.com` no aporta nada.
- **Se envía desde `neety.com` DIRECTO, no desde un subdominio** (decisión de Iker, 2026-08-20). ⚠️ Significa que la reputación del envío masivo y la del correo comercial de los founders son la misma: una campaña marcada como spam la paga también `iker@neety.com` prospectando. Con DMARC en `p=none` no hay rechazo inmediato. **No se vuelve a proponer el subdominio salvo que haya un incidente de entregabilidad.**
- **`hola@neety.com` funciona en los dos sentidos** desde que se activó el Grupo de Google Workspace (2026-08-20): se le puede escribir y las respuestas llegan. Es la condición que sostiene el correo 0, cuya métrica son las RESPUESTAS.
- 🧹 **Queda el `include:_spf.mlsend.com`** de la cuenta cancelada. No bloquea nada, pero autoriza a cualquier cliente de MailerLite a pasar SPF como `neety.com`. Se quita dejando `v=spf1 include:_spf.google.com a mx ~all`.
- 🧹 **`news.neety.com` tiene un SPF de HubSpot** (`include:145372616.spf10.hubspotemail.net`), resto de otra herramienta. Inofensivo hoy porque es otro subdominio; hay que limpiarlo si algún día se usa `news.` para enviar.
- **DMARC:** `p=none`, con reportes a Cloudflare. **MX:** `smtp.google.com` (Workspace).

### ⚠️ LA RESTRICCIÓN DE IP DE BREVO (mordió el 2026-08-20, tardó una tarde)

Brevo trae **lista blanca de IPs por defecto** en las API keys nuevas. La primera llamada del CRM dio 401 con este texto:

> *"We have detected you are using an unrecognised IP address 152.55.177.117"*

**No era la clave.** Se rehízo tres veces sin necesidad, porque el mensaje que enseñaba el CRM decía "revísala en Integraciones" y se comía el motivo de Brevo. Corregido: ahora sale el texto literal de Brevo y un recuadro con el tipo de credencial.

- `152.55.177.117` es la **IP de salida de Railway** (AS400940, Santa Clara). Comprobado.
- 🔴 **Railway NO garantiza IP de salida fija en el plan estándar.** Si cambia en un redeploy, el sync horario muere EN SILENCIO con ese mismo 401 y nadie se entera hasta echar de menos contactos. La alternativa es quitar la restricción en `app.brevo.com/security/authorised_ips`.
- **Si algún día vuelve un 401, mira PRIMERO la IP, no la clave.** El botón "Probar conexión" ya lo dice solo.
- Las tres causas de un 401 en Brevo, que se ven idénticas sin el mensaje: clave regenerada · **restricción de IP** · clave SMTP (`xsmtpsib-`) en vez de API key v3 (`xkeysib-`).

### 🔴 Pendiente antes de enviar nada (en orden)
1. **Rearmar el espejo de cada audiencia a mano** en Marketing → Audiencias. La migración las apagó todas a propósito: los ids guardados eran de grupos de MailerLite y el worker los habría usado para empujar contactos a listas equivocadas.
2. ✅ **Conexión con Brevo verificada el 2026-08-20** (1 lista visible, clave `xkeysib-`, 89 caracteres).
3. **Registrar el webhook de bajas** (Integraciones → "Registrar webhook de bajas"). Sin esto, una baja hecha en Brevo no llega al CRM.
3. **Probar con 2-3 correos internos** antes de tocar la audiencia buena. Ningún OK de la API prueba un envío: se verifica leyendo el buzón.
4. **Plan de pago activo, idioma de la cuenta en español**, y escribir a soporte de Brevo presentando la cuenta antes del primer envío grande.
5. **Lista de supresión desde el CRM** (clientes + prospectos con conversación abierta + las 5 bajas y los 7 rebotes del rescate), ANTES de subir la lista buena.
6. El resto del runbook de `§0c`. ✅ El DNS ya NO está pendiente: ver el bloque de arriba.

## 🔴 ESTADO ANTERIOR: CUENTA MAILERLITE CANCELADA (2026-08-11)
MailerLite canceló la cuenta 2536617 por supuesta violación de la política anti-spam, tras 3 envíos y 191 correos. **La tanda 3 (337) nunca llegó a salir y la 4 no se montó.** Post-mortem completo en `email-marketing §0b`.
- **Apelaciones enviadas:** formulario de cumplimiento (x2) y mensaje de LinkedIn a un empleado de soporte desde la cuenta de Iker, el 2026-08-12.
- **Datos rescatados por API antes de perder el acceso:** `Escritorio/rescate-mailerlite-2026-08-11.md` — las 5 bajas con su motivo, los 7 rebotes, los 4 leads que clicaron y las métricas finales. **Sin ese fichero no se puede reconstruir la lista de supresión en otra plataforma.**
- ⚠️ **De los 4 que clicaron, uno (`ahernandez@fagorautomation.es`) es CLIENTE**, no un lead: recibió el correo por no existir lista de supresión. Leads reales: 3.

## Estado del sistema

> ⚰️ **TODO ESTE BLOQUE ES HISTÓRICO, de la cuenta CANCELADA.** Se conserva porque
> explica qué había montado y qué hubo que reconstruir. **El estado vivo está
> arriba, en el bloque de Brevo.** Nada de aquí abajo se puede usar hoy: la
> cuenta, los grupos, el campo `origen` y el conector MCP están muertos.

- **Herramienta de envío: MailerLite, CONECTADA y VERIFICADA el 2026-07-28** (cuenta `management@neety.com`, id 2536617, token hasta jul 2027). Conector MCP probado con lecturas reales: grupos, campañas, campos y suscriptores responden. Escritura disponible (campañas, grupos, segmentos, importación, automatizaciones).
- **Contenido actual:** 1 suscriptor (Iker/`management@neety.com`) · 1 campaña borrador vacía del 27-jul ("Campaña sin título", sin contenido ni asunto: se puede borrar, pendiente del OK de Mario).
- **Estructura creada por Claude vía MCP el 2026-07-29:** campo personalizado **`origen`** (texto, id 1403523) + **7 grupos de segmentación**: `origen-desconocido` · `linkedin-recursos` · `web` · `evento` · `webinar` · `referido` · `contacto-comercial`. Todos vacíos, listos para la importación.
- **Lo que el MCP NO puede tocar (solo panel web):** idioma de la cuenta, autenticación del dominio, alta de remitentes verificados y ajustes de cuenta. Todo lo demás (contactos, grupos, segmentos, campos, campañas, automatizaciones, programación) sí.
- ⚠️ **Verificar remitente ≠ autenticar dominio** (las dos hacen falta): verificar remitente = confirmar UNA dirección con un clic en un email; autenticar dominio = meter los registros SPF/DKIM en el DNS de neety.com. Si en la llamada solo se hizo lo primero, el dominio sigue sin autenticar.
- ✅ **Dominio `neety.com`: autenticado** (verificado el 2026-07-30 creando un borrador con `hola@neety.com` de remitente: MailerLite lo dio por apto para enviar y sin avisos).
- ✅ **Remitente de la newsletter: `hola@neety.com`**, con **forwarding activado y probado**. **Corregido el 2026-08-06: el reenvío NO va a `news@`, va a `mario@neety.com` y `iker@neety.com`.** Es la condición que sostiene el correo 0, cuya métrica son las RESPUESTAS.
  - 🔴 **Riesgo operativo a resolver antes de la tanda grande:** las respuestas caen mezcladas en dos bandejas de trabajo personales. Con 49 destinatarios se lleva; con 1.300 se pierden. **Filtro de Gmail `to:hola@neety.com` → etiqueta `respuestas-newsletter`**, y decidir quién las procesa (Mario, que lleva la segmentación) para que no se dupliquen ni se queden sin hacer.
  - **Cada respuesta hay que llevarla a mano al grupo que toque** (`web`, `linkedin`, `evento`, `webinar`, `origen-desconocido`). Manual está bien para 49; para la lista entera habrá que automatizarlo desde el CRM.
- ✅ **Credenciales:** no hace falta API key. Todo va por el conector MCP, que se autentica solo. Si algún día se automatiza desde un script propio, la key iría a variable de entorno (nunca al chat ni al repo).
- 🔴 **Pendiente de configuración, antes de enviar nada:**
  1. **Idioma de la cuenta en INGLÉS** (en-US) → pasar a español, o el pie de baja y los textos del sistema salen en inglés. **Es el único bloqueante que queda.**
- **Primer correo:** el correo 0 segmentador (`email-marketing §5c-0`), aún no enviado.

## Rotación de remitentes
| Semana | Remitente principal | Notas |
|---|---|---|
| _(sin envíos todavía)_ | | |

## Emails enviados
| Fecha | Remitente | Pilar | Asunto | Segmento | CTA (tipo/palabra) | Métricas |
|---|---|---|---|---|---|---|
| 2026-08-07 09:23 | Kaixito | Correo 0 segmentador | `¿no te acuerdas de mí?` | warmup-tanda-1 (47) + testers (5) | Respuesta / web·linkedin·evento·webinar·ni idea | Ver abajo |

### Tanda 1 · resultados a 2026-08-10 (leídos por API, no de la captura)
- **54 enviados = 47 reales + 5 testers.** Entregados 52.
- **Aperturas 46,8% en la lista real** (22/47). Testers 60% (3/5).
- **Clics 3, todos de la lista real (6,4%).** CTOR 12%. De los 3, **2 fueron al enlace de agendar**.
- **Bajas 0. Quejas de spam 0.** El formato aguanta: llegó a bandeja Principal.
- 🔴 **Rebotes duros 2 = 4,3% sobre los 47 reales.** Banda de alarma (2-5%), y con n=47 el dato es impreciso. **Es la razón por la que hay que verificar la lista antes de la tanda grande:** si la tasa se mantiene, en los ~1.263 restantes son ~54 rebotes.
- ⭐ **1 reunión agendada el mismo día del envío**, de 2 clics en el enlace. Con el `origen: newsletter` y los UTM llegando bien al formulario.
- ⛔ **RESPUESTAS: 0** (comprobado por Mario el 2026-08-10, 3 días después). La lista cerrada de una palabra **no bastó**. Con 47 destinatarios el dato no concluye nada, pero **si la tanda 2 (149) también da 0, el CTA de respuesta está roto y hay que rediseñarlo**, no repetirlo en la tanda 3.
- **Composición de la lista (contada, no estimada):** de 151 candidatos, **85% no da señal de país** (gmail/hotmail/.com). Solo 9 `.es` y 13 LatAm. **Para priorizar por ICP hace falta el país del CRM.**

## Tandas del correo 0
| Tanda | Grupo | Tamaño | Estado |
|---|---|---|---|
| 1 | `warmup-tanda-1` (194973211060864772) | 47 (+5 testers) | ✅ Enviada 2026-08-07 |
| 2 | `warmup-tanda-2` (195398984128267443) | **138**, sin testers | Grupo lleno el 2026-08-10 por API, pendiente de enviar |
| 3 | martes 11 | **337** | Grupo `warmup-tanda-3` (195489391391540991) lleno por API |
| 4 | miércoles 12 | El resto, **aquí entran los 55 LatAm** | **Sin grupo:** incluir `Leads General · limpia` y excluir las 3 tandas + Recursos |

### Tanda 2 · resultados a 21 h (2026-08-11)
137 enviados · 27,7% aperturas *(a 21 h, sigue subiendo: iba por 16% el primer día)* · 1 clic · **4 rebotes duros (2,92%)** · 1 blando · **5 bajas (3,65%)** · **0 spam**.
- ⚠️ **Las aperturas de las tandas NO se comparan hasta los 4 días.** La tanda 1 marca 46,3% pero es un acumulado de 4 días; la 2 lleva 21 h. Entre el 60 y el 70% de las aperturas caen el primer día.
- ⚠️ **Las 5 bajas son nuevas** (la tanda 1 tuvo 0) y están altas frente a la norma (0,2-0,5%). **Es esperable en un re-permiso que invita a irse**, y esas personas habrían marcado spam más adelante. Pero se vigila.
- ✅ **Acumulado 191 enviados, 6 rebotes duros = 3,1% y BAJANDO. 0 denuncias de spam.** Con eso se sigue sin verificar la lista: la verificación se deja para antes de la primera newsletter de venta.

### Los 6 rebotados, y qué se hace con cada uno
`mktbeti@gmail.com` · `xavigames911@gmail.com` · `etacescueladearqueroa@gmail.com` · `emprendersjglo21@gmail.com` · `sttrategosolutions@gmail.com` → **5 de 6 son Gmail muertos** (Google borra cuentas inactivas a los 2 años). Se borran del CRM.
- ⚠️ `emprender**sj**glo21` es **errata** de `emprender**si**glo21@gmail.com`, que sí existe y no rebotó. Solo se borra la errata.
- 🔵 `pablo.rivadulla@nextbitt.com` es **corporativo: la persona se fue, la EMPRESA sigue siendo prospecto.** En un CRM B2B se invalida el correo, **no se borra la ficha ni el histórico**.
- ✅ **La comprobación gratuita de MX acertó:** marcó `bravorobot.com` como dominio sin servidor de correo y ese fue exactamente el único rebote blando. Detecta poco (1 de 71) pero lo que detecta, acierta. **Merece la pena correrla siempre antes de una tanda: es gratis.**

⛔ **A un rebotado NO se le borra, en ningún proveedor.** El estado que lo bloquea es automático; borrarlo pierde esa protección y una reimportación posterior lo devuelve limpio. En Brevo ese estado es `emailBlacklisted`, y el CRM lo respeta por los dos lados: los dados de baja **se quedan dentro de la lista a propósito** (sacarlos y reimportarlos algún día los resucitaría), y el sync nunca los vuelve a subir.

**Son 4 tandas y caben todas en la misma semana.** Con 47+138 = 185 enviados, meter los ~987 restantes de golpe sería un salto de 5x con un 4,3% de rebotes detrás; en dos pasos (2,9x y 1,5x) no.

### ⭐ CADA CUÁNTO SE PUEDE LANZAR UNA TANDA (corregido el 2026-08-10)
**Al día siguiente ya se puede.** El dato que decide es el rebote DURO, y un rebote duro es un rechazo SMTP: llega **en minutos**, no en días. Lo que tarda hasta 72 h son los rebotes blandos (reintentos), que casi no afectan a la reputación. Las quejas de spam llegan en su mayoría en 24 h.
- **Regla: 24 h entre tandas si el salto es ≤2x; 48 h si el salto es mayor**, para tener margen de reacción antes de multiplicar el volumen.
- Los calentamientos de dominio del sector escalan **a diario**. Espaciar 3 días era exceso de cautela por mi parte, no doctrina.
- ⛔ **Y el viernes no se lanza la última tanda:** si no lo abren ese día, el fin de semana se lo come y no vuelven hasta el lunes (criterio de Mario, coherente con vender a empresas).

## Palabras de CTA-respuesta ya usadas (no se repiten en los 3 correos siguientes, `global §2.0b-VENTANA`)
- `web` / `linkedin` / `evento` / `webinar` / `ni idea` (correo 0, 2026-08-07)

## Ángulos ya usados (no se repiten en los 3 correos siguientes, como los conceptos del mapa)
_(ninguno)_


---

## 📡 Detección de rebotes SIN pagar validador (2026-08-21)

Iker: *"no vamos a pagar. Eso de limpiar los correos, deberíamos ser nosotros capaces de
detectarlo antes de tiempo."*

### ❌ Lo que se probó y NO funciona: puntuar direcciones absurdas

Salió de una observación buena suya: `mongol@gmail.com` estaba en la tanda 3, y quien pone eso
en un formulario no está dejando su correo. La idea era generalizarlo puntuando la parte local
por consonantes seguidas, ratio de vocales y bigramas repetidos.

**Se calibró contra las 100 direcciones reales de la tanda 3 y no separa.** Los números:

| dirección | puntuación | ¿es real? |
|---|---|---|
| `teleservicesmultiservicios@gmail.com` | 19,4 | sí |
| `horebbusinessgroup@gmail.com` | 14 | sí |
| `fuewatclauidia@cfuwomdtradigi.com` | **13** | **no** |
| `fabio.archila@...` | 13 | sí |
| `endtoendgmks.com` (dominio) | 20,8 | sí |
| `bcncgroup.com` (dominio) | 17 | sí |
| `cfuwomdtradigi.com` (dominio) | **11** | **no** |

**No hay umbral.** Cualquier corte que cace `fuewatclauidia` se lleva por delante
`fabio.archila`, y cualquiera que cace `cfuwomdtradigi.com` mata `bcncgroup.com`. Descartado con
datos, no con opinión. Está escrito en `sales-crm-Neety/src/mx.js` para que nadie lo reintente.

### ✅ Lo que sí funciona, y ya está en el CRM

**Audiencia → 📡 Comprobar dominios.** Pregunta al DNS, no puntúa nada:

| veredicto | significa | ¿accionable? |
|---|---|---|
| `inexistente` | el dominio no está registrado | **sí, quitar** |
| `sin-buzon` | existe pero sin MX ni A | **sí, quitar** |
| `ok` | tiene MX, o tiene A | no |
| `desconocido` | el DNS no contestó | **no**, es "no lo sé" |

Tres trampas evitadas, cada una con su test:
- **Sin MX pero con A recibe correo** (RFC 5321). Mirar solo el MX es el fallo típico.
- Un timeout **nunca** cuenta como muerto.
- Se agrupa por dominio: 40 gmails son 1 consulta.

**Lo que NO puede saber:** si el BUZÓN existe. Con `@gmail.com` siempre dirá que sí, y media
lista es Gmail. Sirve para cazar dominios inventados, que es de donde sale el rebote más caro.

### La palabra de broma, que sí se quedó

`audience_clean` marca (**no quita**) las direcciones que son una palabra de broma o un relleno
de formulario. Se compara la palabra **entera**, nunca como subcadena: `serrano` lleva "ano" y
`paniculosa` lleva "culo". Hay un test con 30 direcciones reales de la tanda 3 que falla si
alguien mete en la lista una palabra que además es un apellido.


---

## 🔴 TANDA 3 (2026-08-24): el asunto es el mejor de los tres y los rebotes también

**Lo bueno, y es bueno de verdad: 35,2% de aperturas reales.** 31 personas de 88, descontadas las
3 precargas de Apple. Es el mejor dato de las tres tandas y está muy por encima de la media B2B.
El asunto `¿no te acuerdas de mí?` con el preheader `Normal, es la primera vez que te escribo.`
funciona, y ya no es casualidad: tres envíos seguidos.

**Lo malo:**

| | Tanda 1 | Tanda 2 | **Tanda 3** |
|---|---|---|---|
| Rebotes duros | 8,0% | 6,0% | **9,0%** |

**Acumulado en Brevo: 14 rebotes duros de 175 envíos = 8,0%.** Cuatro veces el umbral del 2%, y
la última tanda es la PEOR de las tres. Esta es la curva por la que MailerLite cerró la cuenta.

### ⚠️ El CTOR del dashboard está inflado: cuenta el enlace de BAJA

La tanda 3 marca 3 clics únicos y 3 *clickers*, con 2 bajas. Pero `linksStats` del enlace de
reserva está a **0**. Los clics son del pie, no del CTA.

**Total real: 0 reservas de 279 correos entregados.** El dashboard enseña un CTOR de 9,7% que
parece sano y no lo es. → **PENDIENTE: descontar los clics de baja del CTOR.**

### ⚠️ Brevo reescribió el `utm_source` a `sendinblue`

En la tanda 3 el `linksStats` devuelve `utm_source=sendinblue`, no el `brevo` que iba en el HTML.
Las tandas 1 y 2 (duplicadas desde la interfaz) sí conservan `brevo`. **La diferencia es que la 3
se creó por API.** Tercera variante de `utm_source` en GA4: `newsletter`, `brevo` y ahora
`sendinblue`.

---

## 🔬 QUÉ REBOTÓ DE VERDAD, y por qué todas mis hipótesis del viernes eran falsas

Se pudo comprobar cruzando `GET /contacts/lists/7/contacts` con la hora del envío: un contacto
que sale `emailBlacklisted: true` a las 09:05:36-43 es un rebote duro; a las 09:49 y 10:07, una
baja. Cuadra exacto con los 9 rebotes y las 2 bajas que da la campaña. **Es la forma de saber
QUIÉN rebotó, que la API de campañas no da.**

### Los 9 que rebotaron

| dirección | tipo |
|---|---|
| `jvieare@canariaseducacion.com` | corporativo |
| `mjosealonso@cepaim.org` | corporativo |
| `laia.roig@omc.com` | corporativo |
| `vicentebordes@provesa.com` | corporativo |
| `victoria.francia@arbentia.com` | corporativo |
| `ventas@alvarozubiaga.com` | corporativo (buzón de rol) |
| `konntacgdl@gmail.com` | libre |
| `fehaby@hotmail.com` | libre |
| `treserlerzerm@gmail.com` | libre |

**6 de 9 son direcciones impecables de empresas reales.** `laia.roig@omc.com`,
`victoria.francia@arbentia.com`: nombre, apellido, empresa que existe. **Son personas que
cambiaron de trabajo.** No hay nada en el texto de esas direcciones que las delate.

### El marcador de mis predicciones del viernes: 1 de 4

| sospechoso | ¿rebotó? |
|---|---|
| `treserlerzerm@gmail.com` | ✅ sí |
| `mongol@gmail.com` | ❌ **no** |
| `dafasasfa@gfdhe.com` | ❌ **no** |
| `fuewatclauidia@cfuwomdtradigi.com` | ❌ **no** |

**Tres falsos positivos de cuatro.** Si se hubieran quitado, se habrían borrado 3 contactos vivos
sin tocar el problema.

Y hay una consecuencia peor: `gfdhe.com` y `cfuwomdtradigi.com` **aceptaron el correo**. Existen y
tienen buzón. **La comprobación de MX que se construyó el 2026-08-21 los habría dado por buenos, y
habría cazado 0 de los 9 rebotes.** El MX sigue valiendo para lo que dice que vale (dominios que
no existen), pero en esta lista no hay ninguno: el problema es otro.

### 🔴 La conclusión, y manda sobre cualquier intuición futura

**Lo que rebota en esta lista son BUZONES muertos en dominios VIVOS.** No formato, no dominios
inventados, no direcciones raras. Nada que se pueda ver mirando el texto de la dirección, y nada
que el DNS pueda contestar.

Solo hay una comprobación gratuita que llega ahí: **sondear el servidor SMTP con `RCPT TO`** sin
llegar a enviar. Y los datos dicen que aquí encajaría: **6 de los 9 rebotes son de dominios
corporativos**, que es justo donde el sondeo funciona bien. Gmail y Hotmail lo bloquean, y son los
otros 3.

Cota superior realista: de 9% a ~3%. No baja a cero.


---

## 🔌 Sondeo SMTP: la tercera capa, y la única que llega (2026-08-24)

**Audiencia → 🔌 Comprobar buzones.** Le pregunta al servidor de correo de cada empresa si el
buzón existe (`RCPT TO`) y corta antes de enviar. Es lo que hace un validador de pago.

Las tres capas, y qué caza cada una:

| capa | mira | cazó de los 9 rebotes de la tanda 3 |
|---|---|---|
| `audience_clean` | el TEXTO de la dirección | **0** (las 9 eran correctas) |
| `mx.js` | el DOMINIO | **0** (los 9 dominios existen) |
| `smtp_probe.js` | el **BUZÓN** | **hasta 6** (los corporativos) |

### Las 4 medidas para que esto no nos perjudique

1. **`MAIL FROM:<>`, remitente nulo.** No mete `neety.com` en la transacción, y el dominio es lo
   único de reputación que se comparte con Brevo. Las IP de envío son de Brevo y no se tocan.
2. **Nunca se manda `DATA`.** No sale ningún correo → no puede generar una queja de spam.
3. **Gmail, Outlook, Yahoo, iCloud y demás ni se sondean.** Ni contestan la verdad ni conviene
   darles motivos.
4. Una conexión por dominio, con pausa.

### Las 3 que impiden un falso "está muerto"

1. **Control de catch-all.** Se pregunta primero por una dirección inventada del mismo dominio.
   Si la acepta → el servidor dice que sí a todo → **nada de ese dominio se juzga**. Si la
   rechaza → valida usuario a usuario → su "no existe" vale.
2. **Solo un 5xx cuenta.** Un 4xx es greylisting.
3. **Cualquier fallo de red es "no se sabe".** Nunca muerto.

### ⚠️ Puede no funcionar, y lo dirá

**Railway puede tener bloqueado el puerto 25 de salida**, como casi todo el cloud. Si TODAS las
conexiones fallan, la pantalla lo dice con esas palabras en vez de devolver "no se sabe" 200 veces
y dejarte creyendo que la lista está comprobada. **Es lo primero que hay que mirar al usarlo.**

### Lo que se espera, con honestidad

**De 9% a ~3%.** No baja a cero: los 3 rebotes de Gmail y Hotmail de la tanda 3 quedan fuera por
diseño, y siempre habrá buzones que aceptan y rebotan después.


---

## Tanda 4: verificada con Bouncer, programada (2026-08-25)

Primer envío con verificación de pago. Del CSV combinado de tandas 4+5+6 (981 direcciones):

| veredicto Bouncer | cuántas | acción |
|---|---|---|
| `undeliverable` | **70** | **dadas de baja en CRM y Brevo** (Iker, 2026-08-25, en un solo paso) |
| `risky` — `low_deliverability` (catch-all, 32/34 con `acceptAll=yes`) | 34 | se quedan: ningún validador puede saber más sobre un dominio catch-all |
| `risky` — `low_quality` (score 10, casi todo Gmail) | 26 | se quedan: es una señal de reputación, no de rebote |
| `unknown` | 11 | se quedan |

**Tanda 4 (200→191 tras las bajas) programada: jueves 2026-08-26, 09:05.** Campaña id 5, lista Brevo id 8,
`utm_campaign=kaixito-01-tanda-4`. Mismo cuerpo que la 3 (PPD ya en 30 minutos).

**Tandas 5 (400) y 6 (380) NO se programan todavía.** Decisión de Iker, no mía, y coincide con lo que ya
decía este mismo fichero (§ arriba): un servicio de verificación de pago baja el riesgo, no lo anula, y
la única prueba real es un envío real. Se mira el rebote de la tanda 4 mañana y con ESE dato — no con
el de Bouncer — se decide si la 5 sale el viernes.


---

## 🔴 PENDIENTE (Iker, 2026-08-25): plan de tandas 5 y 6

**Iker no está la semana del 2026-08-31 al 2026-09-04.** Por eso quiere las tandas 5 y 6 fuera antes de esa
semana, no dentro.

**⚠️ Corrección del 2026-08-25, entrada anterior de este fichero: el "choque" que se apuntó aquí era un
error mío, no un problema real.** Etiqueté el 26/08 como jueves y es MIÉRCOLES — 2026-08-25 es martes,
verificado a mano dos veces tras el aviso de Iker. Con la semana bien puesta, no hay ningún choque:

| fecha | día | qué va |
|---|---|---|
| 2026-08-26 | miércoles | **tanda 4** — ya programada, campaña Brevo id 5, sin tocar |
| 2026-08-27 | jueves | tanda 5 — pendiente de decidir el propio 27/08 |
| 2026-08-28 | viernes | tanda 6 — pendiente de decidir el propio 27/08 |

**Se decide y se programa el viernes 27/08**, una vez vistos TODOS los rebotes reales de la tanda 4
(mandada el miércoles 26). Con 24h de margen desde el envío es de sobra para ese momento.

**Lo único que sigue sin resolver, y esto NO era un error mío:** la tanda 6 en viernes 28 sería la
ÚLTIMA tanda en viernes — la regla de Mario documentada arriba en este mismo fichero dice explícitamente
que la última tanda no se manda en viernes (se la come el fin de semana). Se decide el 27/08 junto con
el resto: o se asume el riesgo a sabiendas (Iker está fuera la semana siguiente y quiere todo fuera
antes), o la 6 se deja para cuando vuelva.

## 🔴 PENDIENTE: dos correos NUEVOS, sin reutilizar el texto de Kaixito 01

Iker (2026-08-25, mismo mensaje donde pidió dejar dos semanas de posts de LinkedIn programadas):
necesita **un correo nuevo para todas las tandas de la semana que viene** (la semana en la que él no
está) **y otro correo nuevo distinto para la semana siguiente**. Palabras suyas: *"tienen que ser
nuevos, ya no puedo reutilizar el [texto actual]"*.

Nada escrito todavía. Cuando se aborde: leer `aboutme.md`, `brand-voice.md`, `working-preferences.md`,
`global-instructions.md` y este mismo fichero enteros antes de escribir una sola línea — es la regla de
CLAUDE.md para cualquier email, y aquí aplica el doble por ser contenido nuevo, no una variación de
Kaixito 01. El asunto y el preheader de Kaixito 01 (`¿no te acuerdas de mí?` / `Normal, es la primera
vez que te escribo.`) han abierto 30-43% en las 4 tandas — cualquier concepto nuevo se mide contra esa
vara, no se parte de cero.


---

## Tanda 4: resultado real, y tanda 5 programada (2026-08-26)

**Tanda 4, rebote duro: 7 de 191 = 3,66%.** El mejor de las cuatro tandas con Brevo, y la primera por
debajo del 6% — mejora real tras Bouncer, aunque sigue por encima del 2% sano.

| | Tanda 1 | Tanda 2 | Tanda 3 | Tanda 4 |
|---|---|---|---|---|
| Rebotes duros | 8,0% | 6,0% | 9,0% | **3,66%** |

Acumulado en Brevo: 21 de 366 = 5,74%.

**Tanda 5 programada: jueves 2026-08-27, 09:05.** Campaña id 6, lista Brevo id 9 (370 miembros),
`utm_campaign=kaixito-01-tanda-5`. Decisión de Iker tras ver el dato de la 4.

**Tanda 6 (viernes 28/08) sigue SIN programar**, a propósito: 3,66% mejora pero no baja del 2%, y sigue
sin resolverse la regla de Mario de no mandar la última tanda en viernes. Se decide cuando se vea el
rebote real de la tanda 5.

---

## 📊 ESTADO LEÍDO DE LA API DE BREVO EL 2026-08-26 (no de memoria)

`GET /emailCampaigns?statistics=globalStats`. **Aperturas reales = `uniqueViews` menos `appleMppOpens`**, que es lo que el dashboard no descuenta.

| | Tanda 1 | Tanda 2 | Tanda 3 | Tanda 4 | Tanda 5 |
|---|---|---|---|---|---|
| Campaña Brevo (id) | 2 | 3 | 4 | 5 | **6, en cola** |
| Lista Brevo (id) | 5 | 6 | 7 | 8 | 9 |
| Fecha | 20/08 18:40 | 21/08 09:05 | 24/08 09:05 | **26/08 09:17** | **27/08 09:05** |
| Enviados | 25 | 50 | 100 | 191 | 370 |
| Entregados | 23 | 42 | 88 | **183** | — |
| **Rebotes duros** | 8,0% | 6,0% | 9,0% | **3,66%** | — |
| `uniqueViews` | 8 | 14 | 38 | 48 | — |
| menos Apple MPP | 1 | 4 | 5 | 10 | — |
| **Aperturas reales** | 7 · 30,4% | 10 · 23,8% | **33 · 37,5%** | 38 · 20,8% *(mismo día)* | — |
| Bajas | 0 | 1 | **3** | 0 | — |
| **Clics a `/agendar/`** | **0** | **0** | **0** | **0** | — |

**Dos correcciones a lo que este mismo fichero decía:**
- **Tanda 3: 33 aperturas reales, no 31, y 3 bajas, no 2.** Sigue subiendo dos días después. **Ninguna tanda se cierra antes de los 3-4 días.**
- **Tanda 4 marca 20,8% el mismo día del envío.** Entre el 60 y el 70% de las aperturas caen el primer día, así que acabará en la banda de las otras. **No es comparable hasta el 29/08.**

### 🔴🔴 EL DATO QUE MANDA, Y NO ES EL REBOTE: **0 CLICS DE 336 ENTREGADOS**

`linksStats` del enlace de `/agendar/` está a **0 en las cuatro tandas enviadas**. Sumando: **336 personas recibieron el correo, 88 lo abrieron de verdad y ninguna pinchó.** Más **0 respuestas de 191** en MailerLite.

**El correo 0 lleva dos métricas declaradas y ha fallado las dos.** Lo único que funciona es el asunto: `¿no te acuerdas de mí?` con `Normal, es la primera vez que te escribo.` abre entre el 20% y el 43% en cuatro envíos seguidos.

**El diagnóstico, y decide el diseño del correo 2:** el correo 0 apila **dos CTA** (responder con una palabra + el enlace de la PPD), y encima el enlace va **al final del todo, detrás de una PD**. Es la regla del UNO rota (`global §4.5`). **El correo 2 lleva una sola puerta, el enlace, y va dentro del cuerpo con su frase de estado delante** (`email-marketing §5-HISTORIA`).

### ⚠️ DOS COSAS DE LA API QUE HAY QUE VERIFICAR A OJO ANTES DEL PRÓXIMO ENVÍO

1. 🔴 **El nombre del remitente cambia de forma entre tandas.** Las tandas 1 y 2 devuelven `sender.name: "Kaixito de Neety"`; **las tandas 3, 4 y 5 devuelven `sender.name: "[DEFAULT_FROM_NAME]"`**. La diferencia es que esas tres se crearon por API. El remitente id 3 se llama `Kaixito de Neety`, así que lo más probable es que resuelva al mismo nombre — **pero es una deducción, no una comprobación**. Si el valor por defecto de la cuenta fuera `Neety`, las tres últimas tandas habrían salido firmadas por la empresa en vez de por la mascota, **la broma no se entendería y el A/B de remitente quedaría contaminado**. Se comprueba en un segundo mirando el correo recibido en un buzón de prueba. Mismo principio que `feedback_avisar_verificar_envio_real`: ningún OK de la API prueba lo que ve el lector.
2. **`utm_source` es `sendinblue` en las tandas 3 y 4**, y `brevo` en la 1 y la 2. La diferencia vuelve a ser API contra interfaz. **En GA4 la atribución está partida en TRES**: `newsletter` (MailerLite, hasta el 11/08), `brevo` y `sendinblue`.

---

## 📅 PLAN DE LOS CORREOS 2 Y 3 (escrito el 2026-08-26, pendiente del OK de Iker)

Cierra el pendiente que este fichero abrió el 25/08 (*"dos correos NUEVOS, sin reutilizar el texto de Kaixito 01"*).

| | Correo 2 | Correo 3 |
|---|---|---|
| Pilar | **historia personal** (`email-marketing §5-HISTORIA`) | historia personal |
| Remitente | **Iker** | **Iker** |
| Asunto | `me traje 200 tarjetas y no llamé a ninguna` | `llamé 9 veces y nunca supe por quién preguntar` |
| Vehículo | la feria | la centralita |
| Dolor (`global §4.4b-MUNICIÓN`) | dejar de buscar para poder contactar — **15 empresas, 9 ICP** | el interlocutor, no la empresa — **2 empresas, las 2 ICP, hipótesis** |
| Semana | 31/08 – 04/09 | 07/09 – 11/09 |
| Tandas | 2 | 2 |
| Métrica | clics a `/agendar/` | clics a `/agendar/` |

- **Se pausa la rotación de remitentes a propósito.** `email-marketing §1` dice que el remitente cambia cada semana, pero con **un solo correo de Iker no se puede comparar nada** contra las 4 tandas de Kaixito. Dos seguidos dan el primer punto de serie. **Es una decisión de Iker, no mía: se puede revertir sin tocar el texto.**
- ⚠️ **Y no es un A/B de remitente, aunque se pidió así.** Cambian a la vez el remitente, el pilar, el asunto y el cuerpo. Lo único comparable de verdad es **el clic**, porque el correo 0 está a cero y cualquier cosa lo bate. Un A/B de remitente de verdad sería **el mismo correo partido en dos mitades de la misma lista**, y eso solo se puede hacer cuando haya un correo que ya funcione.
- **El correo 3 prueba un dolor de 2 empresas**, que por la regla de entrada de `§4.4b-MUNICIÓN` es hipótesis y no patrón. **Entra porque `§5-ECO` lo autoriza expresamente** (probar en un correo y anotar el resultado aquí).

### 🔴 LO QUE FALTA DECIDIR, Y ES DE IKER
1. ~~**Qué pasa con la tanda 6 de Kaixito 01** (los ~380 que quedan).~~ **RESUELTO SOLO, 2026-08-28.**
   La campaña estaba programada para hoy 28/08 a las 09:05 y **Brevo la dejó en `rejected`**: el bloqueo
   de la cuenta la tumbó. Y ya no se puede reactivar, porque **su lista (la 10) se borró en la limpieza
   de consentimiento**. O sea que esos ~380 **no recibieron el correo 0 y no lo van a recibir nunca**, y
   está bien que así sea: **no tenían el `consent_comms` marcado**, que es justo por lo que se borraron.
   **Consecuencia para la secuencia:** nadie de esos 380 recibe tampoco el correo 2 ni el 3, porque no
   están en `📥 Recursos · Todos`. La base viva son los 40 con consentimiento. Enlaza con
   [[feedback_un_clic_no_es_consentimiento]]: la tanda 6 era exactamente la gente que un clic no
   convierte en suscriptor.
2. **El reparto de las 2 tandas del correo 2.** Lo más barato es reutilizar las listas que ya existen en Brevo: **tanda A = listas 5+6+7+8** (los de las tandas 1-4, ~336 vivos) y **tanda B = lista 9** (los 370 de la tanda 5). Cero listas nuevas, cero cálculo a mano.
3. **La firma-mantra de la casa** sigue sin decidirse (`email-marketing §10`). De momento los correos cierran en plano.

## Ángulos y vehículos ya usados (no repetir)
- **Correo 0 · Kaixito:** el re-permiso disfrazado de mascota que no te encuentra en su libro.
- **Correo 2 · Iker:** la feria y el taco de tarjetas. Dolor: buscar contra contactar.
- **Correo 3 · Iker:** la centralita y el cargo equivocado. Dolor: el interlocutor, no la empresa.

## Micro-aperturas fijas por remitente
- **Iker: `Te cuento.`** (fijada el 2026-08-26, `email-marketing §5-HISTORIA`)
- Unai, Asier y Kaixito: `[PENDIENTE]`


---

## 🔁 CORRECCIÓN DEL PLAN (Iker, 2026-08-26, mismo día): EL CORREO 3 SE DESCARTA

**Iker, sobre el plan de arriba:** *"el tres lo descartaría, porque dos semanas seguidas repetiré el mismo pilar de historia, no creo que sea lo ideal, y repetiré el mismo remitente tampoco. La semana del correo tres volvería a la mascota y así utilizamos otra de las animaciones que tenemos"*.

**Y esto TUMBA lo que yo había escrito arriba**, que proponía dos historias seguidas de Iker para tener dos puntos de serie. **Manda él, y además es coherente con la ley de variedad** (`global §2.0b`): el pilar también rota, no solo la frase.

| | semana 31/08 – 04/09 | semana 07/09 – 11/09 |
|---|---|---|
| Remitente | **Iker** | **Kaixito** |
| Pilar | historia personal (`§5-HISTORIA`) | `[PENDIENTE · por decidir]`, con GIF |
| GIF | ninguno, texto puro | **sí, y uno que NO sea el de estrés** (el del correo 0) |
| Estado | **reescrito el 2026-08-27 con los aprendizajes de la tanda 6, validado 31/31** | sin escribir |

### 🔁 Correo 2 reescrito tras la tanda 6 (2026-08-27)

Iker pidió aplicar a este correo lo aprendido con Kaixito 01 · Tanda 6 antes de darlo por bueno: el bloque de dos del ninja colgando del asunto (`§5-NINJA`, ya lo tenía bien planteado el borrador viejo) y, sobre todo, **acortar el asunto pensando en el corte de móvil**, que no estaba escrito en ningún sitio (`§2`, sección nueva de hoy).

- **Asunto: `me traje 200 tarjetas y no llamé a nadie`, 40 caracteres** (original 42 con `ninguna`). ⚠️ **Primer intento corregido por Iker el mismo día:** quité el `me` (`traje 200 tarjetas…`), y es un fallo — `traje` sin el `me` es ambiguo con el sustantivo (un traje de boda) y pierde fuerza la 1ª persona. El recorte bueno sale de `ninguna` (7 car) → `nadie` (5 car): mismos 2 caracteres ganados, sin tocar el verbo. Regla nueva en `§2` de `email-marketing.md`.
- **Ninja:** `200 tarjetas te las da cualquier feria.` / `Buscarlas ya las buscamos nosotros: {link}` — 39/35 caracteres, escalera invertida, dolor de `aboutme §1b` (buscar contra contactar, 15 empresas, 9 ICP), sin prometer automatismo ni volumen.
- **Validador: 31/31.**
- **Sin comparativa de columnas:** no hay una referencia externa única que se esté calcando (el molde sale de varios corpus agregados, no de un correo concreto) y es el primer email del pilar historia que se envía (n=0), así que tampoco hay "nuestro mejor de este pilar en correo" contra el que compararlo (`working-preferences §1e-DOS`).

**Pendiente de Iker:** dar el OK al texto y decidir el remitente/pilar/GIF del correo del 07/09 (la cuenta de arriba solo cierra la semana del 31/08).

### 🔴 Bloqueo real: `Iker de Neety` no existe como remitente en Brevo (2026-08-27)

`GET /senders` solo devuelve dos: `Neety` (`management@neety.com`) y `Kaixito de Neety` (`hola@neety.com`, el único usado hasta ahora). **Ningún founder tiene remitente verificado.** Convención fijada en `email-marketing §1` (nombre corto + `de Neety`, nunca el apellido, por la misma razón que el asunto en móvil). **Pendiente de Iker antes de poder crear la campaña del correo 2:** dar de alta `Iker de Neety` en Configuración → Remitentes de Brevo, con el email desde el que va a salir (¿`hola@neety.com` también, u otro?).

- **Las dos reglas nuevas que salen de aquí, y son de planificación, no de este correo:**
  1. **No se repite pilar dos semanas seguidas.**
  2. **No se repite remitente dos semanas seguidas.**
- **⛔ Y hay una restricción de personas que hay que respetar y no es de contenido.** Iker, literal: *"ya que así, como estaré de vacaciones, si pasa algo raro el segundo jefe no me dirá nada, y no quiero usar de remitente ni al primero ni al tercero hasta que empecemos a mejorar"*. **Unai y Asier NO remiten hasta que los números mejoren.** Los remitentes disponibles hoy son **Iker y Kaixito**, y ya está.
- **El GIF del correo de Kaixito sale de la biblioteca ya subida a Brevo** (`corpus-correos-enviados`, las 5 URLs verificadas). **La emoción la decide el TEXTO, no el turno**, y el de **estrés ya se gastó** en el correo 0. Libres: alegría, enfado, curiosidad, aburrimiento.
- **`aburrimiento` es el candidato natural**: su descripción en la receta es literalmente *"el trabajo manual repetitivo (tema central nuestro)"*.

## 🗑️ Lo que se cae del apartado de ángulos usados
El **correo 3 (la centralita, dolor del interlocutor)** queda **escrito pero NO usado**. No se apunta como quemado: está disponible para cuando vuelva a tocar historia con remitente Iker. El texto validado está en el chat del 26/08.


---

## Tanda 6 programada: excepción de viernes asumida a propósito (2026-08-27)

**Kaixito 01 · Tanda 6, campaña id 7, lista Brevo id 10 (349 miembros), viernes 2026-08-28, 09:05.**
`utm_campaign=kaixito-01-tanda-6`. Cuerpo con el enlace ya en bloque de dos (`§5-NINJA`), posicionado tras
"Pero cuál de todas, ni idea." (no pegado al GIF), y la PPD reescrita sin vender. Validador 31/31.

**Tres excepciones asumidas a propósito en este correo, ninguna por descuido:**
1. **Doble CTA** (reply + `/agendar/`), contra `email-marketing §4` ("un solo CTA por email"). Iker: el
   que más interesa va primero por posición, y no se repite en los correos que vengan.
2. **Última tanda en viernes**, contra la regla de Mario de más arriba en este fichero. Asumido porque
   Iker no está la semana del 31/08 al 04/09 y quiere esta campaña de calentamiento fuera antes de irse.
3. **Sin A/B de la interrogación inicial del asunto.** Se propuso probarla en esta tanda grande (380) y se
   descartó: *"esta primera campaña, estamos haciendo muchas excepciones… es un cambio mínimo"*. El asunto
   se queda `¿no te acuerdas de mí?`, con la `¿` (medido en `email-marketing §2`: quitarla no es registro,
   es ortografía, y el 97% del corpus la lleva).

### 🔴 PENDIENTE: la regla de "tandas" puede dejar de aplicar, y hay que decidirlo cuando toque

**Iker, 2026-08-27:** *"esa regla incluso te diría de quitarla… lo suyo a partir de ahora no es mandar un
correo durante nueve días cada día a un poco de gente, sino que ya el mismo día mandaremos a todo el
mundo, y lo intentaremos mandar los lunes, a lo mejor, o los martes, no lo sé, ya veremos."*

**Esto es el fin del sistema de tandas del calentamiento, no solo una excepción de esta vez.** Con el
envío de golpe a toda la lista, el concepto de "última tanda" desaparece: ya no hay una secuencia de días
cuyo último tramo se pueda comer el fin de semana. **Pero ojo, esto NO decide solo si el viernes vale para
la ÚLTIMA tanda: decide si el viernes vale para CUALQUIER envío único.** La razón original de Mario
("si no lo abren ese día, el fin de semana se lo come") podría seguir aplicando a un envío de golpe en
viernes igual que aplicaba a la última tanda — son preguntas distintas y no se ha medido ninguna de las
dos con Brevo todavía.

**No se toca la regla canónica de arriba en este fichero mientras esto siga en "ya veremos".** Cuando Iker
decida el día fijo del envío único (¿lunes? ¿martes?), se revisa `email-marketing §5` con el dato nuevo:
si de verdad ya no hay tandas, la sección entera de cadencia de calentamiento pasa a ser histórica y hace
falta una regla de cadencia distinta para el envío semanal de régimen.


---

## 🔴 Bug corregido: preheader duplicado en Gmail, presente desde la tanda 3 (2026-08-27)

**Causa:** cada campaña se creó pasando a la vez `previewText` (mecanismo nativo de Brevo) y un `<div style="display:none">` manual con el mismo texto, heredado de la técnica de MailerLite (donde sí hacía falta). Brevo ya resuelve `previewText` solo; el div era redundante. Gmail concatenó los dos y mostró *"Normal, es la primera vez que te escribo."* dos veces en la bandeja.

**Alcance real: tandas 3, 4 y 5, ya enviadas, con el defecto.** No hay nada retroactivo que hacer con esas.

**Tanda 6 recreada limpia (id 8, `status: draft`, sin `scheduledAt`), sin el div.** Ver `email-marketing §3b` para la regla corregida.

**Y sale una regla de proceso nueva de aquí (Iker, 2026-08-27):** ninguna campaña se deja programada de primeras nunca más, ni aunque él lo pida explícitamente — se queda en borrador hasta que confirme que se ha mandado un test a sí mismo y está todo bien. Detalle completo en `email-marketing §9a-BIS`.

**Pendiente de Iker:** mandarse el test de la campaña id 8, revisar que el preheader ya no sale duplicado, y confirmar para que se programe el viernes 09:05.


---

## Dos correcciones más sobre el test (2026-08-27, mismo día)

**1. El preheader ya no sale duplicado** (confirmado por Iker con su propio test). Pero sí se colaba
la primera frase visible del cuerpo detrás del preheader en la vista de bandeja de Gmail, porque el
preheader (42 caracteres) no llenaba el hueco que Gmail reserva. Se añadió un relleno invisible
(`&zwnj;&nbsp;` repetido, sin ninguna palabra legible, para no repetir el bug de ayer) justo detrás
del preheader. **Sin verificar todavía con un test real** — pendiente de que Iker lo compruebe.

**2. El asunto pierde la interrogación inicial, como excepción consciente de este correo.** Iker,
2026-08-27: *"este correo es una excepción... como estamos atacando por estrategia de informalidad,
pues eso, no cambias la minúscula y quita la interrogación inicial ¿"*. Queda `no te acuerdas de
mí?` (sin `¿` de apertura, con la `n` en minúscula a propósito, con el `?` de cierre). Esto rompe a
sabiendas la regla medida de `§2` (97% del corpus lleva la `¿` de apertura) — no se cambia esa regla,
se anota como excepción de esta tanda.

**Campaña final: id 10, en borrador.** Las campañas id 7 (suspendida por Iker), 8 y 9 (creadas antes
de este cambio de asunto) quedan obsoletas — Iker las borra a mano en el panel, no hay endpoint de
borrado disponible por API.

**Pendiente de Iker:** mandarse un nuevo test de la campaña 10, comprobar que el relleno del preheader
funciona de verdad en Gmail, borrar las campañas 7/8/9 sobrantes, y confirmar para programar el viernes.

---

## ✅ Tanda 6 programada de verdad: campaña id 11 (2026-08-27, mismo día)

**Test confirmado por Iker: el relleno del preheader funciona.** En la bandeja solo se ve *"Normal, es
la primera vez que te escribo."* junto al asunto, sin que se cuele la primera frase del cuerpo, y el
correo se lee entero sin problema al abrirlo. Los dos bugs de esta tanda (preheader duplicado y
preheader corto) quedan cerrados y verificados con un test real, no solo con la API.

**Campañas 8 y 9 borradas por Iker a mano en el panel** (confirmado: "te acabo de borrar yo
manualmente las dos campañas borrador").

**No hay `update` ni `delete` para campañas en el conector MCP de Brevo de esta sesión** — solo
`create`, `get` y `list`, comprobado dos veces con búsquedas distintas. Los únicos `update_campaign` /
`delete_campaign` / `schedule_campaign` / `cancel_campaign` que existen pertenecen al conector de
MailerLite (muerto, prohibido). Iker confirmó que en otro ordenador su conector de Brevo sí tiene más
funciones — mismo Brevo, misma API key, pero un conector MCP distinto con más superficie montada. Aquí
no la hay: **para "editar" una campaña ya creada, el único camino es crear una nueva con el contenido
correcto (con `scheduledAt` si toca) y pedir que se borre la vieja a mano** — es el mismo patrón que ya
se usaba para corregir contenido, ahora también vale para programar.

**Campaña id 11 creada y programada: viernes 2026-08-28, 09:05**, mismo contenido exacto que la 10
(confirmado leyendo el HTML de la 10 por API antes de duplicarlo, no de memoria). `sender` pasado esta
vez como `{id:3, name:"Kaixito de Neety"}` en vez de solo el id — confirmado por API que el nombre sale
bien (`"Kaixito de Neety"`, no `[DEFAULT_FROM_NAME]`): el fix del bug de remitente también evita el
placeholder en la creación, no solo lo corrige al leer.

**Pendiente de Iker:** borrar la campaña id 10 (borrador ya redundante, superado por la 11) — sigue sin
haber forma de hacerlo por API.

### 🟡 Sigue sin resolver: ¿se puede borrar la campaña "Gifs mascota"?

Iker preguntó si la campaña borrador usada para subir las 5 GIFs de Kaixito a la biblioteca de
contenido de Brevo se puede borrar ya, dado que las 5 URLs (`.../content_library/...`) ya están
documentadas y en uso. **Sigue sin verificarse.** La ruta `content_library` en la URL sugiere que es un
almacén a nivel de cuenta, independiente de la campaña que lo usó de puerta de entrada — pero
`corpus-correos-enviados.md` avisa explícitamente de lo contrario ("si desaparece, se van las cinco
URLs"), y no hay forma segura de comprobarlo sin arriesgar las 5 GIFs de todos los correos de Kaixito,
pasados y futuros. Recomendado: no borrarla, renombrarla como "NO BORRAR" en el panel en su lugar.

---

## 🧪 Correo 2: primer A/B testing de la newsletter — A/B de REMITENTE (2026-08-27)

**Decisión de Iker:** ya que el correo 2 estrena por primera vez un remitente de persona real (Iker) en
vez de la mascota, y él mismo cree que la mascota generará más confianza pero quiere el dato, se monta
el primer A/B de la casa: no de asunto (eso ya lo hicimos con `¿no te acuerdas de mí?` sin probar
variantes), sino de **nombre del remitente** — con o sin apellido. Es la variable que más pesa en
apertura después del asunto y el preview, y hasta ahora nunca se había medido.

**⛔ NO es una tanda como las de Kaixito 01.** Iker preguntó si hacía falta volver a repartir en varias
tandas como las 6 de la primera campaña, y la respuesta es no: aquello era calentamiento de dominio +
gestión de riesgo de rebote en una cuenta nueva. Ese riesgo ya está resuelto (dominio caliente, Bouncer
pagado y verificado, 6 tandas reales sin incidentes). **Este reparto es un split aleatorio 50/50 de
la MISMA lista para aislar una sola variable (el remitente)**, no una secuencia de calentamiento — son
conceptos distintos aunque los dos "repartan" la audiencia.

### Cómo se montó (primera vez que se usa este mecanismo, documentado para la próxima)

1. **Los dos remitentes**, dados de alta por Iker en el panel de Brevo: `Iker de Neety` (id 4) y
   `Iker Galarza de Neety` (id 5), los dos con `hola@neety.com`.
2. **Acceso conseguido a la API real de Brevo** (`BREVO_API_KEY` en el entorno), en vez de depender del
   conector MCP limitado (que no tiene `create_list` ni forma de repartir contactos). También se
   consiguió sesión en el CRM propio (`salescrmuser`/`salescrmpass` → login normal de la app, no
   `DATABASE_URL`), pero al final no hizo falta: con la API key de Brevo directa bastó.
3. **Universo del test: los contactos VIVOS de las 6 tandas de Kaixito 01** (listas Brevo 5-10),
   leídos en directo de Brevo. **1.035 contactos vivos** (no bloqueados) de 1.325 originales.

   ⚠️ **CORREGIDO EL MISMO DÍA — aquí escribí que el `member_count` del CRM "está desactualizado" y es
   FALSO.** Iker se alarmó con razón y al comprobarlo con datos reales resultó que no hay ninguna
   desincronización: `/api/marketing/estado-sincronizacion` devuelve `bajasPendientesEnBrevo: 0` y
   `errores: []`, el webhook Brevo→CRM está vivo, y los workers corren solos (bajas cada 5 min,
   audiencias cada 60 min). Cruzando la tanda 6 contacto a contacto: 380 en el CRM, 349 en Brevo, **31
   solo en el CRM y CERO vivos indebidamente fuera de la lista**. Esos 31 están de baja, y el sync no
   los sube a propósito. **Son dos métricas distintas, no un número viejo:** el `member_count` del CRM
   cuenta la PERTENENCIA a la audiencia (histórico, bajas incluidas) y la lista de Brevo cuenta QUIÉN
   RECIBE. La diferencia entre las 6 tandas suma exactamente 70, que son las 70 direcciones dadas de
   baja tras Bouncer. **La lección, y vale para cualquier número futuro: dos contadores distintos no son
   una desincronización hasta que se cruzan los datos** (`working-preferences`, no llamar bug a algo sin
   comprobarlo).
4. **Partido al 50% al azar** (semilla fija `20260827` por si hay que auditar el reparto): **517 en la
   lista A, 518 en la B.** Dos listas nuevas creadas por API: `Correo 2 · A/B remitente · A (Iker de
   Neety)` (id 11) y `· B (Iker Galarza de Neety)` (id 12).
5. **Dos campañas en borrador, idénticas salvo el remitente:**

| | Campaña A | Campaña B |
|---|---|---|
| id | **13** | **14** |
| Remitente | `Iker de Neety` | `Iker Galarza de Neety` |
| Lista | 11 (517) | 12 (518) |
| `utm_campaign` | `iker-02-feria-ab-a` | `iker-02-feria-ab-b` |

Mismo asunto (`me traje 200 tarjetas y no llamé a nadie`), mismo preview, mismo cuerpo, mismo enlace.
**Las dos en `status: draft`, sin `scheduledAt`** — la norma de nunca programar de primeras sigue
intacta, doblemente aquí porque hay dos variantes que revisar, no una.

**Corregido de paso: el enlace del cuerpo va LIMPIO, sin UTM escrito a mano.** `§5-NINJA` de
`email-marketing.md` ya decía que el UTM no se escribe en la URL (Brevo lo inyecta solo desde el campo
`utmCampaign` de la campaña) y la tanda 6 se había hecho mal (UTM a mano Y en el campo, redundante). No
se corrige retroactivamente la tanda 6, pero el correo 2 ya sale bien.

**Pendiente de Iker:** mandarse un correo de prueba de las DOS campañas (13 y 14), revisar que el texto
esté bien y confirmar antes de programar. Cuando decida qué gana, la métrica es igual que en el resto:
aperturas primero (es lo que mide el A/B), pero sin perder de vista clics y respuestas.

---

## 🔁 Correo 2, versión final: ninja reescrito y día elegido (2026-08-27, tarde)

### El ninja se reescribió porque decía otra cosa de la que creíamos

Iker, leyendo su propio correo de prueba: *"en vez de buscarlas refiriéndote a buscar esas tarjetas…
no puede haber dudas de lo que nos referimos, teniendo en cuenta que nuestro público es viejo y que
tendrán poco tiempo para leer los correos"*.

```
⛔ 200 tarjetas te las da cualquier feria.
   Buscarlas ya las buscamos nosotros: {link}

✅ Una feria te da tarjetas, no clientes.
   El nombre de quien decide, nosotros: {link}
```

**Tres fallos en dos líneas, y ninguno lo cazó el validador** (pasaba 31/31 con la versión mala):
1. **`Buscarlas` se refiere a las TARJETAS.** Nosotros no buscamos tarjetas. El pronombre recoge el
   sustantivo más cercano y ahí decía justo lo que no queríamos decir.
2. **Repite `buscar` dos veces** en una línea de 55 caracteres.
3. **Ataca el dolor viejo.** "Dejar de buscar" es el dolor nº1 (15 empresas) pero formulado así se
   queda en la mitad barata.

**El ángulo bueno, y NO es la hipótesis de 2 empresas:** `global §4.4b-MUNICIÓN` lo dice literal —
*"la tengas o no la tengas, sigues sin **el nombre de dentro**"*— y ahí deja de ser el tema nuevo del
19/08 (2 empresas) para convertirse en **la forma concreta del dolor nº1, que sostienen 15 + 12
empresas**. Fagor Automation (ICP A) lo dice sin querer: el primer paso lo hace gratis en LinkedIn, y
lo que pide justo después es el teléfono del que decide. La fórmula exacta (`el nombre de quien
decide`) viene sancionada de `brand-voice §2c-DATOS` como recambio seguro.

**⭐ Y LA LECCIÓN QUE VALE PARA CUALQUIER NINJA FUTURO: el validador comprueba la FORMA, no a qué
apunta el pronombre.** Antes de entregar hay que leer las dos líneas solas y preguntarse *¿a qué
sustantivo se refiere cada `la`, `lo`, `las`?* Un pronombre que recoge el sustantivo equivocado pasa
los 31 checks y dice otra cosa.

### El A/B nativo de Brevo NO sirve aquí, y está verificado

Iker preguntó si no habría que usar la función de A/B testing que Brevo trae incorporada. **No, y no
es por no tener la API:** el A/B nativo de Brevo solo testa **el asunto** o **el contenido del email**
([su documentación](https://help.brevo.com/hc/en-us/articles/4523165348626-Create-an-A-B-test-campaign)),
y en la API los parámetros son `subjectA`/`subjectB`. **El nombre del remitente no es una variable
testeable**, que es justo lo que medimos. Dos campañas gemelas es la única forma.

**Lo que se pierde por no usarlo, dicho entero:** el A/B nativo declara ganador solo y manda el
ganador al resto de la lista. Aquí **ninguna de las dos aplica**: no hay "resto" (la lista entera se
parte al 50% y todos reciben) y el ganador se mira comparando las dos campañas, que además con
`utm_campaign` separado deja ver **clics**, no solo aperturas.

**Comprobado campo a campo antes de dar el A/B por válido:** asunto, preview, pie, `replyTo` y cuerpo
idénticos; lo único distinto es el remitente y el `utm_campaign`. Quitando los UTM, **el HTML es igual
carácter a carácter**.

🔴 **Y la condición que hace válido el test: las dos campañas salen a la MISMA hora y minuto.** Con
una a las 09:05 y otra a las 09:20 dejaríamos de medir el remitente para medir la hora encima del
remitente.

### El día: MIÉRCOLES 2 DE SEPTIEMBRE, 09:05

Iker lo dejó a mi criterio. Los datos propios, leídos de Brevo el 27/08:

| tanda | día | entregados | aperturas reales |
|---|---|---|---|
| 1 | jueves 20/08 18:39 | 23 | 30,4% |
| 2 | viernes 21/08 | 42 | 23,8% |
| 3 | **lunes 24/08** | 88 | **37,5%** |
| 4 | miércoles 26/08 | 183 | 21,9% |
| 5 | jueves 27/08 | 345 | 32,8% *(sin cerrar)* |

**⛔ ESTE DATO NO PUEDE ELEGIR EL DÍA, y el motivo no es el que parece.** No es solo que los tamaños
sean distintos: **las tandas NO repartieron la lista al azar.** La 1 se llevó los 25 primeros
contactos y la 6 los últimos 380, así que cada tanda tiene un trozo distinto de la base con calidad
distinta. Eso confunde el día con la audiencia y no hay forma de separarlos a posteriori. Súmale que
la 4 y la 5 no están cerradas (`§` de arriba: ninguna cierra antes de 3-4 días).

**Manda el corpus, que ya respondió esto con 353 correos y 490 días** (`email-marketing §5`): los
cinco laborables rinden igual (Timepack, 19,8-20,1%). Por eso el día se elige por **criterio
operativo**.

| día | veredicto |
|---|---|
| lunes 31/08 | ⛔ **sigue siendo agosto.** Buena parte del ICP industrial no ha vuelto |
| martes 1/09 | ⚠️ **el día de la vuelta**: bandeja llena de todo agosto |
| **miércoles 2/09** | ✅ **elegido.** Ya están dentro, la purga del primer día ha pasado, quedan 3 días de semana |

**El argumento que decide, y es de RIESGO, no de aperturas** *(deducción mía, `working-preferences
§0c`, no medida)*: nuestro peligro mayor no es abrir poco, **es la queja de spam** — por eso nos
cerraron MailerLite. El día de la vuelta de vacaciones es justo cuando la gente hace limpieza masiva
de bandeja y se da de baja en bloque. Llegar el miércoles esquiva esa purga.

**La hora, 09:05, y no se mueve.** Brevo no deja las 09:01 de Mario, y las 09:05 siguen cumpliendo el
mecanismo: se sale DESPUÉS de la oleada de los que programan a la hora en punto, así que en una
bandeja ordenada por lo más reciente quedamos encima.

🔴 **AVISO, IKER: el 2/09 cae dentro de tu semana de vacaciones (31/08 - 04/09).** El CTA es una
reserva de calendario, así que se gestiona sola, **pero las respuestas al correo caen en `hola@` que
reenvía a ti y a Mario**. Si alguien contesta esa semana, hay que saber quién lo coge.

### Estado de las campañas en Brevo

| id | qué es | estado |
|---|---|---|
| ~~13, 14~~ | primera versión del A/B, con el ninja malo | **borradas por mí** |
| **15** | A/B variante A · `Iker de Neety` · lista 11 (517) | borrador |
| **16** | A/B variante B · `Iker Galarza de Neety` · lista 12 (518) | borrador |
| **17** | `Correo 2 · prueba interna` · lista Testers (5) | enviada a mano el 27/08 |

**⭐ Y AHORA SÍ SE PUEDEN BORRAR CAMPAÑAS.** Con la `BREVO_API_KEY` en el entorno, `DELETE
/emailCampaigns/{id}` responde 204. El conector MCP no expone esa operación, pero la API sí: **ya no
hay que pedirle a Iker que limpie borradores a mano.**

**La prueba interna lleva su propio `utm_campaign`** (`iker-02-feria-prueba-interna`): con el de la
variante B, los clics internos habrían ensuciado las métricas del A/B de verdad.

---

## 🔴🔴 EL DÍA QUE BREVO BLOQUEÓ LA CUENTA (2026-08-28) — y todo lo que cambia

**La cuenta está `under validation`** (la API devuelve `402 account_under_validation` al editar) y **la tanda 6 figura como `rejected`**. La tanda 6 **sí salió** antes del bloqueo: 349 enviados, 327 entregados, 58 aperturas, 9 rebotes (2,58%, el mejor de las seis), **0 quejas de spam** y **6 bajas (1,83%, casi 4x la norma)**. Unai apela.

**⛔ Y el pendiente que probablemente lo causó lleva escrito desde el 2026-08-18 en `email-marketing §0c` punto 6:** *"Escribirle a soporte de Brevo ANTES del primer envío real, presentando la cuenta, el origen de la lista y el volumen esperado"*. **Nunca se hizo.** Era la lección nº 6 del post-mortem de MailerLite y se repitió el mismo fallo.

### ⛔⛔ A PARTIR DE AHORA SOLO SE ESCRIBE A QUIEN DIO CONSENTIMIENTO EXPLÍCITO (Iker, 2026-08-28) — CANÓNICO

**El segmento único de envío: `📥 Recursos · Todos` (audiencia CRM 3 → lista Brevo 15).** Su fuente es
`all`, que en `resources_leads.js` es literalmente `SELECT ... FROM leads WHERE consent_comms = TRUE`.
**40 contactos.** `consent_comms` es una casilla **aparte y desmarcada por defecto**: descargar un
recurso NO cuenta como permiso.

- **La sincronía es HORARIA, no en tiempo real, y hay que decirlo así.** Son dos saltos encadenados:
  leads → audiencia del CRM (worker cada 60 min) y audiencia → lista de Brevo (otro cada 60 min). **Un
  alta nueva tarda hasta 2 horas** en poder recibir. **Las bajas sí van cada 5 min**, que es lo que
  importa para no escribirle a quien dijo que no.
- La audiencia `⛔ Recursos · Sin opt-in` (17 personas) tiene el envío **bloqueado por código**
  (`assertSyncable`), no por acuerdo.

### 🔴 LO QUE SE DESCARTÓ, Y ES LA DECISIÓN MÁS IMPORTANTE DEL DÍA

Iker propuso **rescatar de las 6 tandas a los que hicieron CLIC** en el enlace, como señal de interés,
para no quedarse en 40. Se midió antes de opinar:

| tandas | entregados | clics a `/agendar/` |
|---|---|---|
| 1 a 5 | 682 | **2** |
| **6** | 327 | **6** |
| **total** | **1.009** | **8** |

**Serían 8 personas, no las ~20 que él estimaba.** Y se descarta por tres motivos, en este orden:
1. **Un clic no es consentimiento.** El RGPD pide un **acto afirmativo claro** para recibir
   comunicaciones comerciales; abrir o pulsar dentro de un correo que ya recibiste es interacción con
   un mensaje, no un alta. La excepción de la **LSSI 21.2** (cliente con relación previa) no aplica:
   no son clientes.
2. **El momento lo empeora:** sacar un segmento **de la misma lista que provocó el bloqueo** mientras
   se apela le da la razón a Brevo justo cuando le pides que te la quite.
3. **Es el fallo de MailerLite otra vez** (`§0b`, señal nº 2: contactos con `opted_in_at: null`).

**⭐ PERO ESOS 8 NO SE TIRAN, CAMBIAN DE SITIO: son LEADS COMERCIALES, no suscriptores.** Levantaron la
mano pulsando agendar. **Que Iker les escriba uno a uno desde su bandeja** — eso es prospección, no
marketing masivo, y es otra situación legal distinta.

### 🟢🟢 Y EL DATO BUENO DEL DÍA: SUBIR EL NINJA AL CUERPO MULTIPLICA LOS CLICS POR 12

| | posición del ninja | entregados | clics | CTR |
|---|---|---|---|---|
| Tandas 1-5 | al final, dentro de la PPD | 682 | 2 | 0,29‰ |
| **Tanda 6** | **subido al cuerpo** | 327 | **6** | **18,3‰** |

**Fue el único cambio entre unas y otra**, y respalda `§5-NINJA-POSICION` **antes** de que salga el
correo 2. ⚠️ n pequeño: apunta fuerte, no prueba nada todavía. Se confirma con el correo 2.

### Estado de las campañas al cerrar el 28/08

| id | qué es | remitente | destinatarios | estado |
|---|---|---|---|---|
| 11 | Kaixito 01 · Tanda 6 | Kaixito de Neety | 349 | **enviada, luego `rejected`** |
| **15** | Correo 2 · Iker · la feria | `Iker de Neety` | **45** (listas 15+4) | **programada 02/09 09:05 · test validado por Iker el 28/08** |
| **18** | Correo 3 · Unai · evento | `Unai de Neety` | **45** (listas 15+4) | **programada 09/09 09:05 · test validado por Iker el 28/08** |

**✅ ESTADO CERRADO EL 2026-08-28.** Iker revisó los dos correos de prueba en el buzón de Mario y dio
las dos por buenas: remitente, asunto y texto de preview correctos en la bandeja; dentro, el cuerpo, el
ninja y el **pie personalizado**; y el enlace del correo 2 llega a `/agendar/` con sus tres UTMs.
Verificado además por API contra un segundo endpoint: **40 en `📥 Recursos · Todos` + 5 en `Testers`,
ninguno de baja.**

**Lo único que queda es una comprobación que no depende de nosotros:** que el correo 2 **salga de verdad
el 02/09**. Es la prueba definitiva de que Brevo levantó el bloqueo — ningún `queued` la sustituye.

**⛔ El A/B del correo 3 se MATÓ, y el motivo vale para cualquier test futuro:** con 40 personas el
reparto da 20 y 20, o sea **~6 aperturas por brazo**, con un margen de error de ±20 puntos. **No es que
mida poco: es que no mide.** Se quedó la variante de **psicología emocional**
(`en euskadi nos juntamos sin ti`) y no la de afirmación, por dos razones: es la única familia con
evidencia propia (20-43% de apertura en 6 envíos) y **el dolor del evento es FOMO** (`global §4.4b`),
que es exactamente lo que esa palanca activa.

**Listas 13 y 14** (el reparto 512/513 del A/B) **quedan huérfanas** y se pueden borrar.

**PENDIENTE y es lo único que desbloquea el resto:** la apelación. Y después, hacer crecer el segmento
limpio por las dos vías que no dependen de rescatar nada — **los registros del evento** (consentimiento
fresco) y **la casilla de recursos**.

---

## 🔒 LA LISTA BLANCA DE CONSENTIMIENTO, EN CÓDIGO (2026-08-28, mismo día del bloqueo)

**Lo que se creía roto y NO lo estaba:** Iker pensó que al apagar las tandas se había pausado también
el alta automática de recursos. **Falso**, y se comprobó antes de tocar nada: la audiencia
`📥 Recursos · Todos` seguía espejando y había sincronizado esa misma mañana. Un opt-in nuevo entraba
solo.

**Lo que SÍ estaba roto, y era peor:** la protección era una **lista negra** que conocía **una sola
excepción** (`no-optin`). Las otras 23 audiencias dependían únicamente del interruptor `esp_sync`, un
booleano que cualquiera podía encender desde la interfaz. **Encender el de `Leads General` habría
subido 1.323 contactos sin consentimiento a Brevo** — exactamente lo que provocó la suspensión.

**Ahora se niega por defecto** (`resources_leads.puedeEspejarse`). Solo pasan dos casos:
1. **TODAS** las fuentes de la audiencia son de recursos con opt-in (su SQL lleva `WHERE consent_comms
   = TRUE` dentro). **Todas, no alguna**: una audiencia admite varias fuentes, y con un `.some()`
   bastaba añadirle un CSV a una audiencia buena para colar a cualquiera.
2. La audiencia es **interna** (todos `@neety.com`). Es la excepción de `Testers`, decidida por Iker, y
   no abre agujero porque nadie de fuera tiene un correo de la casa.

**Y hay un SEGUNDO cerrojo, a nivel de persona.** `upsertAudienceMembers` conserva a los miembros
añadidos a mano, así que alguien podía meter a una persona dentro de una audiencia que sí vale. Ahora
solo suben los que traen `properties.source = neety_resource`, más los internos, y **los saltados se
cuentan** (`skippedSinConsentimiento`) para que no sea un silencio.

**El interruptor tampoco se puede encender ya desde la API.** Antes el sync habría fallado igual, pero
el flag se quedaba encendido y la pantalla decía que esa audiencia se espejaba cuando no era verdad.

**Probado contra producción:** tanda 6 → bloqueada · `Leads General` → bloqueada, y el mensaje **nombra
la fuente culpable** · `Recursos · Todos` → sigue funcionando. **214/214 tests.**

### 🗑️ Y la limpieza de contactos que pedía Brevo para la apelación

| | antes | después |
|---|---|---|
| Contactos | 1.102 | **46** (40 con consentimiento + 5 testers + 1 interno) |
| Listas | 13 | **2** |

**⛔ Y lo que se hizo ANTES de borrar, porque borrar un contacto sí pierde algo irrecuperable:** de los
1.056 borrados, **68 estaban bloqueados por baja o rebote**. Ese estado es la protección que impide
volver a escribirles, y se pierde al borrar. Se comprobó que el CRM ya los tenía registrados en
`mkt_unsubscribes` (`nuevas: 0, yaEstaban: 68`), así que **el registro sobrevive a Brevo**. Copia
completa en `Escritorio/BREVO-CONTACTOS-BORRADOS` (CSV con todos + la lista de los 68).

**La regla que sale de aquí:** antes de borrar en un proveedor, comprobar que **el CRM conserva lo que
el proveedor va a olvidar**. Si no lo conserva, primero se guarda y luego se borra.

---

## 📊 RESULTADO REAL DE LOS CORREOS 2 Y 3, Y DE DÓNDE SALIÓ EL ASISTENTE DEL EVENTO (2026-09-14)

**Lo primero, porque era el pendiente que bloqueaba todo lo demás: LOS DOS SALIERON.** El bloqueo de
Brevo está levantado y la cuenta está viva (plan activo, 13.820 créditos de envío a 19/09).

| id | correo | remitente | programado | **salió de verdad** |
|---|---|---|---|---|
| 15 | Correo 2 · Iker · la feria | `Iker de Neety` | 02/09 09:05 | ✅ **02/09 09:11:57** |
| 18 | Correo 3 · Unai · evento | `Unai de Neety` | 09/09 09:05 | ✅ **09/09 09:09:50** |

### 🔴🔴 LA TRAMPA QUE CASI ME HACE DECIR QUE NO HABÍAN SALIDO

**`GET /emailCampaigns/{id}` SIN el parámetro `statistics` devuelve el bloque `globalStats` ENTERO A
CEROS**, en vez de omitirlo. No es que falte el campo: está, con `sent: 0`, `delivered: 0`,
`uniqueViews: 0`. **Reproducido en 3 campañas distintas** (15, 18 y 11), así que no es un fallo
puntual:

```
camp 15  SIN parametro: sent=0  deliv=0  opens=0  clics=0      ← MENTIRA
camp 15  CON parametro: sent=45 deliv=45 opens=16 clics=3      ← la verdad
camp 11  SIN parametro: sent=0  deliv=0  opens=0  clics=0
camp 11  CON parametro: sent=349 deliv=327 opens=65 clics=16
```

**Estuve a punto de informar de que las dos campañas habían salido a 0 personas.** Lo que lo paró fue
la regla que ya está escrita en `email-marketing §1` (*"un 0, un None o una lista vacía en la API de
Brevo no son un dato, son una pregunta"*) y el segundo contraste: **la ficha del contacto**
(`GET /contacts/{email}` → `statistics.messagesSent` / `delivered` / `opened`) traía los eventos con
su hora exacta, campaña por campaña. **Ese es el endpoint que no miente, porque es el registro por
persona.**

**LA REGLA: a los endpoints de campaña de Brevo se les pide el bloque de estadísticas
EXPLÍCITAMENTE** (`?statistics=globalStats`, y otra llamada aparte con `?statistics=linksStats`).

**⚙️ Y para no tener que acordarse, esto ya no se mira a mano: `python scripts/metricas-brevo.py`**
(con `--quien` saca además quién pulsó y marca los internos). Pide los dos bloques explícitamente,
ensena el clic inflado y el limpio en columnas separadas, y descuenta los `@neety.com`. **Reproduce
exactamente los números que estaban apuntados del 28/08**, que es lo que le da crédito para los
nuevos.

### 📈 LA SERIE COMPLETA, CON EL CLIC LIMPIO Y NO EL INFLADO

⚠️ **Las dos columnas de clics son distintas y hay que mirar la segunda.** `uniqueClicks` de
`globalStats` **cuenta también el enlace de BAJA y el de preferencias** (ya avisado en el apartado del
CTOR del panel). El clic que vale es la suma de `linksStats`, que solo cuenta los enlaces del cuerpo.

| correo | fecha | posición del ninja | entregados | aperturas | clic "global" | **clic al ENLACE** | CTR real |
|---|---|---|---|---|---|---|---|
| Kaixito 01 · tandas 1-5 | 10-25/08 | al final, dentro de la PPD | 682 | 267 | 8 | **2** | 0,29‰ |
| Kaixito 01 · tanda 6 | 28/08 | **subido al cuerpo** | 327 | 65 (19,9%) | 16 | **7** | **21,4‰** |
| **Correo 2 · Iker · la feria** | 02/09 | en el cuerpo (49% del texto) | **45** | **16 (35,6%)** | 3 | **1** | 22,2‰ |
| **Correo 3 · Unai · evento** | 09/09 | en el cuerpo | **45** | **13 (28,9%)** | 4 | **2** | 44,4‰ |

**Los números de las tandas 1-5 y de la 6 coinciden exactamente con los apuntados el 28/08** (682
entregados / 2 clics · 327 entregados / 6 clics, hoy 7 porque entró uno más después). **Que el método
reproduzca lo que ya estaba escrito es lo que le da valor a lo nuevo.**

#### ⛔ PERO ANTES DE CELEBRAR NADA: DE ESOS CLICS, LA MITAD SON DE MARIO

Se recorrieron los 46 contactos uno a uno pidiendo su historial de clics. **Quién pulsó, con nombre y
hora:**

| campaña | quién | cuándo | enlace |
|---|---|---|---|
| 15 (correo 2) | **`mario@neety.com`** | **14/09 10:30** | `/agendar/` |
| 18 (correo 3) | `anderalberdi94@gmail.com` | **09/09 14:50** | `forward` → Luma |
| 18 (correo 3) | **`mario@neety.com`** | **14/09 10:31** | `forward` → Luma |

- **`mario@neety.com` pulsó los dos hoy, con 19 segundos de diferencia.** Es él revisando los correos
  para este análisis, no un lead. **Es ruido interno y hay que descontarlo.**
- **Descontado, la foto real es:** correo 2 → **0 clics de lead en 45 entregados**. Correo 3 → **1
  clic de lead en 45 entregados**.
- **1 baja**, en el correo 3: `ojacinto@gmail.com`, el 09/09 a las 11:29.
- **0 rebotes y 0 denuncias de spam en los dos.** La lista de 45 está limpia.
- ⚠️ **De la tanda 6 solo sobrevive un nombre: `jrojo@bondaltiwater.com` (28/08 09:09, a
  `/agendar/`).** Los otros 6 que pulsaron estaban entre los **1.056 contactos borrados** en la
  limpieza que pidió Brevo, y **borrar un contacto borra también su historial de clics**. Es el mismo
  aviso que ya quedó escrito ese día: antes de borrar en un proveedor, comprobar qué se pierde.

**⛔ Y LO QUE NO SE PUEDE CONCLUIR, que es lo más importante: con 45 destinatarios, 0 y 1 son el mismo
número.** El correo 2 no "rinde peor" que el correo 3. **La única evidencia real que tenemos sobre la
posición del ninja sigue siendo la tanda 6** (327 entregados, 7 clics, contra 682 y 2), y estos dos
correos **no la confirman ni la desmienten: no tienen tamaño para hacerlo.**

**⭐ Lo que sí es información nueva:** el correo 2 es **el primero firmado por una persona real (Iker)
en vez de por la mascota**, y abrió al **35,6%**, dentro del rango de Kaixito (30,6-44,3%). **No hay
señal de que el founder abra mejor ni peor que Kaixito.** Para separarlo haría falta un A/B, y con 45
personas tampoco se puede (`§ A/B del correo 3`, que se mató por lo mismo).

---

### 🕵️ EL ASISTENTE DEL EVENTO NO VINO DE LA NEWSLETTER: VINO DE HUBSPOT

> **Lo que preguntaba Iker:** *"en la información de la web de Luma hemos conseguido un asistente
> también por el correo, pero no sé exactamente por cuál ha sido, ya que el UTM solo muestra el source
> de `hs_email`"*.

**`hs_email` es la etiqueta que pone HUBSPOT en los enlaces que rastrea. No la pone Brevo, no la pone
Luma y no la ponemos nosotros.** Así que el UTM no está roto: está diciendo exactamente la verdad, y
la verdad es que ese clic salió de un correo de HubSpot.

**Hay TRES canales de correo apuntando al mismo evento y solo uno es la newsletter:**

| canal | herramienta | quién firma | fecha | entregados | aperturas | clics a Luma | UTM que llega a Luma |
|---|---|---|---|---|---|---|---|
| **clientes** | **HubSpot** | Helena Baviera Serigó (`helena@neety.io`) | **20/08** | **100** | **40 (40,0%)** | **1** | **`hs_email`** ← **es este** |
| newsletter | Brevo, correo 3 | `Unai de Neety` | 09/09 | 45 | 13 (28,9%) | 2, uno de ellos Mario → **1 real** | `unai-03-evento-correo` |
| LinkedIn | los 3 posts semanales | las 3 cuentas | ago-sep | — | — | — | (el de cada post) |

**La prueba, en orden:**
1. **El correo de HubSpot existe y se envió:** objeto `1327961622776`, *"invitación clientes evento"*,
   asunto *"Un nuevo Neety está llegando (y queremos contártelo en persona)"*, estado `SENT`,
   publicado el **2026-08-20**, a la lista 339 excluyendo la 360.
2. **Lleva el enlace del evento**, y lo lleva **a pelo**:
   `Confirmar mi asistencia → https://luma.com/ujffj66o`. **Sin `forward.neety.com` y sin ningún UTM
   escrito a mano**, así que el rastreo de HubSpot le pone el suyo: `hs_email`.
3. **Sus métricas cuadran con un asistente:** 100 entregados, 40 aperturas únicas y **exactamente 1
   clic único**. Un clic, un registro.
4. **Y el nuestro no puede ser**, porque el nuestro llega con otra etiqueta. Comprobada la cadena
   entera hoy:
   ```
   forward.neety.com/?utm_source=unai-03-evento-correo
     -> 302 Location: https://luma.com/ujffj66o?utm_source=unai-03-evento-correo
   ```
   **El redirect conserva el UTM.** Si el asistente hubiera venido del correo 3, en Luma pondría
   `unai-03-evento-correo`, no `hs_email`.

**⛔ LO QUE FALTA PARA CERRARLO DEL TODO, y solo lo puede mirar quien entra en Luma:** si
`anderalberdi94@gmail.com` (el único lead que pulsó nuestro enlace, el 09/09 a las 14:50) **aparece o
no en la lista de invitados**. Si aparece, la newsletter también ha traído uno y en Luma saldrá con
`utm_source=unai-03-evento-correo`. Si no aparece, pulsó y no se registró.

#### 🔴 EL AGUJERO QUE ESTO DESTAPA, Y ES DE ATRIBUCIÓN, NO DE ESTE CORREO

**`hs_email` no identifica NADA.** Hoy hay un solo correo de HubSpot apuntando al evento, así que la
etiqueta es legible por eliminación. **En cuanto salga el segundo, los dos serán `hs_email` y ya no se
podrán separar** — que es exactamente el problema que `email-marketing §1` describe para `sendinblue`
y que resolvimos en Brevo escribiendo el UTM a mano dentro del `href`.

**Y ya hay un segundo en camino:** el objeto `1353655820482`, *"Clientes new versión extensión"*,
mismo asunto, creado el **08/09**, **en BORRADOR**, con la misma promesa del evento en la preview
(*"una cita en Donostia el 24 de septiembre"*).

**Lo que hay que hacer antes de que salga ese borrador** (y va en este orden):
1. **Escribir el UTM a mano en el `href` del enlace de Luma**, con el mismo esquema que usamos en
   Brevo: `https://luma.com/ujffj66o?utm_source=helena-clientes-evento-2`.
2. **⚠️ Y MEDIRLO, NO SUPONERLO.** No sabemos si HubSpot respeta un `utm_source` escrito a mano o si
   lo pisa con `hs_email`, como hacía Brevo con `sendinblue` cuando tenía la integración de Analytics
   encendida. **Es el mismo tipo de pregunta que costó media tarde el 28/08, y se resolvió midiendo,
   no razonando.** La prueba es barata: mandarse el correo de test, pulsar el enlace y mirar a dónde
   llega.
3. **Si HubSpot lo pisa, la salida es la misma que ya tenemos montada: pasar por
   `forward.neety.com`**, que es nuestro y ya está verificado que conserva el UTM.

#### ⚠️ Y dos cosas más del correo de HubSpot que se ven de pasada y no son de este análisis
- **El remitente es `Helena Baviera Serigó`**, nombre completo y **sin la marca**. `email-marketing §1`
  midió en nuestra propia bandeja que a partir de ~20 caracteres Gmail corta (`Iker Galarza de Nee.`).
  Ese remitente tiene 21 y encima no lleva `de Neety`, así que lo que se pierde no es la marca: es que
  nunca estuvo. **La convención de la casa no se está aplicando en el canal de HubSpot.**
- **El `reply-to` es `helena@neety.io`**, dominio distinto del `neety.com` cuya reputación cuidamos en
  Brevo. **No es un problema hoy y no lo he investigado**, pero conviene saber que estamos mandando
  correo de marketing desde dos herramientas y con dos identidades a la vez.

---

## 🔍 ESTADO DE BREVO AL 2026-09-15, Y POR QUÉ LA LISTA VIEJA NO SE PUEDE RESCATAR

> **Iker, y es una pregunta legítima que merecía medirse, no responderse de memoria:** *"hemos pasado de casi 2.000 destinatarios posibles a 45. Tirar la lista por completo a la basura es un error. Crea un segmento de la gente que no solo abrió esos correos, sino que pulsó el enlace y aun así no se dio de baja y a día de hoy sigue suscrita"*.

**LA RESPUESTA ES QUE ESE SEGMENTO YA NO SE PUEDE CONSTRUIR, y no es por política: es que el dato no existe.** Medido el 15/09 contra la API, no deducido:

| lo que hay | dato |
|---|---|
| Contactos en Brevo | **47** (lista `📥 Recursos · Todos` 40, con 1 de baja, + `Testers` 5) |
| Los 1.056 borrados el 28/08 | **anonimizados en el histórico de campañas** |
| Export de los que PULSARON en la tanda 6 | 6 filas, y **5 dicen `Deleted / Anonymized contact`** |
| Únicos clics recuperables con nombre | `jrojo@bondaltiwater.com` (tanda 6) y `anderalberdi94@gmail.com` (correo 3), **los dos ya dentro de los 40** |
| CSV de respaldo (`Escritorio/BREVO-CONTACTOS-BORRADOS`) | 1.056 correos, pero **solo 4 columnas**: email, bloqueado, listas, fecha de alta. **No guarda aperturas ni clics** |
| De esos 1.056 | **68 bloqueados** (bajas + rebotes), un 6,4% |

**Y el CRM tampoco lo tiene:** `email_snapshots.js` fotografía los ACUMULADOS de la campaña cada N minutos, nunca el evento por persona. O sea que **quién pulsó en las tandas 1-6 no está en Brevo, ni en el respaldo, ni en el CRM.** Es información perdida el día del borrado, exactamente como avisaba la entrada del 28/08 de este mismo fichero.

- ✅ **Confirmado por Iker el mismo día montando el segmento a mano en el panel:** *"ya no aparece esa gente, solo me aparecen tres personas que ya tenemos"*.
- 🔧 **Y los segmentos NO se pueden crear por API:** `POST /contacts/segments` devuelve `404 Invalid route/method`. Solo lectura (`GET /contacts/segments`) y panel. **Las LISTAS sí** se crean y se rellenan por API, que es como se montó el A/B del correo 2.
- ⛔ **El límite de ritmo de los exports es real y muerde:** 24 `POST /emailCampaigns/{id}/exportRecipients` seguidos dejaron la cuenta en `429` durante toda la sesión, y con él se quedó sin comprobar **el motivo de las bajas de las tandas 5 y 6**. Se reintenta con pausas largas. ⚠️ Lo más probable es que salgan anonimizadas también.
- ✅ **CERRADO EL 16/09: el MOTIVO de las bajas de las tandas 5 y 6 no se puede leer, y por dos razones independientes.** (1) **El export de campaña de Brevo no trae columna de motivo de baja**: solo `Unsubscribe_Date` y los motivos de REBOTE (`Hard_Bounce_Reason`, `Soft_Bounce_Reason`). (2) Y aunque la trajera, esos contactos están borrados y anonimizados: pedir `unsubscribed` de la tanda 6 devuelve `200 {}` sin `processId`. **La idea de que "la mayoría dijeron que nunca se habían suscrito" viene de MailerLite** (`Escritorio/rescate-mailerlite-2026-08-11.md`, donde el motivo sí se guardaba), **no está verificada en Brevo y ya no se puede verificar.**
- 🔧 **Cómo se exporta, para no volver a buscarlo:** `POST /emailCampaigns/{id}/exportRecipients` con `{"recipientsType":"clickers"|"openers"|"unsubscribed"}` → devuelve `processId` → `GET /processes` trae el `export_url` cuando está `completed`. **El CSV se baja con `curl`, NUNCA con urllib**: Cloudflare da 403 según la firma del cliente, igual que ya pasaba con `/senders`.

### 🌱 POR DÓNDE SÍ PUEDE CRECER LA LISTA (y por dónde no)

| vía | estado |
|---|---|
| **Los 60 inscritos del evento** | ⛔ **Cerrada.** El formulario de Luma lleva una casilla de términos obligatoria que dice *"Uso de datos para la operativa del evento y con objetivos comerciales"*, pero **no tenemos acceso a la cuenta de Luma**: ni se puede exportar la lista ni añadir una casilla nueva (Iker, 15/09: *"ya es demasiado tarde"*) |
| **⭐ Los WEBINARS de Iker** | 🟢 **La vía nueva, y es suya (15/09).** Hace bastantes, y en el registro **se añade una casilla de consentimiento de newsletter**. Es consentimiento limpio, separado y con registro, igual que el de `recursos.neety.com`. Es la única fuente recurrente que hoy no estamos aprovechando |
| La casilla de recursos | 🟢 sigue viva y entra sola (worker horario) |
| `recursos.neety.com/correo/` | 🟢 alimentada por el segundo ninja de los posts |
| Rescatar a los que pulsaron | ⛔ **imposible**, no por política sino por falta de dato (arriba) |

---

## ✅ CORREO 4 · Kaixito · el evento, última semana (programado 2026-09-16 09:05)

**Campaña Brevo 21**, listas 15 + 4 (**45**: 40 de `📥 Recursos · Todos` + 5 `Testers`), remitente `Kaixito de Neety` (id 3), estado `queued` releído de la API, no del `204`.

| | |
|---|---|
| Asunto | `te guardo la silla o no?` (24 car, **sin la `¿` de apertura**, excepción consciente de Iker como en la tanda 6) |
| Preview | `Que luego me dicen que por qué no avisé a nadie.` |
| Pilar | **novedades / entre bastidores de la mascota** (rota el de historia del correo 3) |
| Ángulo | la lista de invitados que lleva Kaixito en su libro · **FOMO: enterarte el viernes de quién estaba** |
| Dolor del cuerpo | identificación (`empresas que pueden comprarte` + `la persona que decide dentro`) |
| GIF | **`curiosidad`** (el de `estrés` se gastó en el correo 0) |
| Enlace | `forward.neety.com` con **`utm_source=kaixito-04-evento-correo`**, cadena verificada: 302 → `luma.com/ujffj66o?utm_source=kaixito-04-evento-correo` |
| Ritmo | `1-2-1-3-1-1-2-1-2-1-1-1` · Validador **35/36** (el único fallo es la `¿` pedida) |
| Cifras | 60 inscritos / 20 libres, leídas de la API de Luma el mismo 15/09 |

### 🔴 LO QUE VOLVIÓ A MORDER: BREVO INYECTA EL UTM AL CREAR LA CAMPAÑA

Al crear la campaña por API, el `href` escrito a mano salió reescrito así:

```
https://forward.neety.com/?utm_source=sendinblue&utm_campaign=Correo_4  Kaixito · evento&utm_medium=email
```

- **Y el `utm_campaign` que inyecta es el NOMBRE de la campaña**, con sus espacios y su `·`. O sea que no solo pierde la atribución de Luma: la ensucia con un valor impresentable.
- **⭐ El interruptor, con el nombre EXACTO que Iker encontró en el panel (15/09): Configuración adicional → seguimiento UTM.** `email-marketing §1` lo llamaba *"integración de Google Analytics"*, que es como se llama en otra pantalla. **Anotado para no volver a buscarlo a ciegas.**
- **Con el seguimiento apagado, Brevo respeta el `href` escrito a mano**, confirmado releyendo la campaña y siguiendo el 302 de verdad. Esto reconfirma lo del 28/08.
- **El orden bueno es: crear → apagar el interruptor → reescribir el enlace → test.** Aquí se hizo test antes de apagarlo, así que el correo de prueba llevaba `sendinblue`; el enlace definitivo se verificó por API y por redirect, no por vista.

### ⚙️ `scripts/montar-correo-brevo.py` (nuevo, 2026-09-15)

Genera el HTML **desde el `.txt` validado**, que es lo que la receta pedía desde el 28/08 y se hacía a mano: relleno invisible del preheader, fondo Alabastro, un `<p>` por bloque con `<br>` dentro, el GIF centrado a 280 px con su alt, y **el enlace pintado con texto corto y el UTM solo en el `href`**. Se comprueba renderizando a texto plano y buscando `style=`, `margin:` o `</a>`.

**Pendiente al publicar (mañana):** meter el ninja de este correo en `QUEMADAS` de `validar-email.py` — el disparador es la publicación, nunca la entrega (`working-preferences §0f`).

### 📈 RESULTADO DEL CORREO 4, EL MISMO DÍA (leído el 2026-09-16 con `metricas-brevo.py --quien`)

**Salió de verdad: 16/09 a las 09:08:** `queued` → `sent`, 45 enviados, 45 entregados.

| correo | remitente | aperturas | clics de LEAD (internos fuera) | bajas | inscritos en Luma |
|---|---|---|---|---|---|
| 2 · la feria | Iker | 16 · 35,6% | **0** | 0 | — (iba a `/agendar/`) |
| 3 · evento | Unai | 13 · 28,9% | **1** | 1 | 0 (el `hs_email` era de HubSpot) |
| **4 · evento** | **Kaixito** | **16 · 35,6%** → 🔄 **20 · 44,4% al 22/09** | **3** (66,7‰) | **0** | **1** (dato de Iker, visto en Luma; confirmado por UTM el 22/09) |

> 🔄 **Releído el 22/09 con `metricas-brevo.py`:** 45 entregados, **20 aperturas (44,4%)**, 4 clics de cuerpo (uno es de Mario: **3 de lead**), 0 bajas. Es el mejor de los correos 2-4 en aperturas y en clics, **pero con 45 destinatarios y seis variables cambiadas a la vez no separa nada** (ver abajo). La lectura del mismo día infravaloraba las aperturas en un 20%: **un correo se cierra a los 5-6 días, no el día del envío.**

- **Los 3 que pulsaron:** `hablemos@garazizuniga.studio` (09:36), `louisedesiree.ldf@gmail.com` (10:53) y `anderalberdi94@gmail.com` (11:36, **segunda vez**: ya pulsó el correo 3). El 4º clic es `mario@neety.com` a las 09:14, revisando.
- ⭐ **ES EL PRIMER INSCRITO AL EVENTO ATRIBUIDO A LA NEWSLETTER POR UTM.** El del correo 3 resultó ser de HubSpot (14/09). Este llega con `utm_source=kaixito-04-evento-correo`, que es justo lo que se protegió apagando el seguimiento UTM de Brevo antes del test.
- **Luma pasó de 60 a 65 inscritos** entre el 15/09 por la tarde y el 16/09 a mediodía (**15 plazas libres**). Iker atribuye **al menos 5** al "Los 10" de Gipuzkoa de Unai (`historial-publicaciones`), así que las cuentas no casan exactas y **no se fuerzan**: Luma no deja ver la lista (`email-marketing §7b`).
- ⚠️ **LO QUE NO SE PUEDE CONCLUIR, y va delante de cualquier celebración:** entre el correo 3 y el 4 cambiaron **seis cosas a la vez** (remitente, pilar, familia de asunto, GIF, que ya es la ÚLTIMA semana y que el ninja dice las sillas que QUEDAN en vez del aforo total). Con 45 destinatarios, **3 contra 1 clic no separa ninguna de ellas**. Lo único que es dato sin discusión: **cero bajas** en un correo de mascota a una lista industrial, y **un inscrito atribuido**.
- 📏 **Y la cifra de dentro caducó el mismo día:** el cuerpo decía `60 nombres` y `20 sillas`, verdad al programar; al salir ya eran 65 y 15 o casi. **Una cifra de aforo en un correo programado se reverifica a la hora del envío, no la víspera.**

**⭐ QUÉ SE LLEVA EL SIGUIENTE CORREO:** Kaixito **no ha bajado ni aperturas ni bajas** frente a los founders (35,6% igual que Iker, 0 bajas contra 1 de Unai). `email-marketing §1` decía *"se mide, no se discute: si abre más, gana papel"*. **Todavía no abre más, pero tampoco cuesta nada, y es el único que ha traído un inscrito.**


---

## 📝 CORREO 5 · Iker · OBJECIÓN, con la puerta en /agendar/ (BORRADOR 2026-09-22, para el mié 23/09 09:05)

**Campaña Brevo 22**, listas 15 + 4 (**46**: 41 de `📥 Recursos · Todos`, 1 de ellos de baja, + 5 `Testers`), remitente **`Iker de Neety`** (`hola@neety.com`), estado **`draft`** releído de la API. **Sin `scheduledAt`** (`§9a-BIS`).

| | |
|---|---|
| Asunto | **`tú lo abrirías?`** (15 car, **sin la `¿` a petición de Iker**, tercera vez tras la tanda 6 y el correo 4: la minúscula del `tú` le gusta más sin ella) · antes `se nota que lo ha escrito una máquina` (37) |
| Preview | `Yo tampoco. Y eso que me dedico a esto.` |
| Pilar | **OBJECIÓN (6), primera vez que sale** (`email-marketing §8g`, era el 1º del orden recomendado) |
| Objeción | la IA que escribe mensajes que ya nadie abre (**5 empresas, 4 ICP**, `global §4.4b-MUNICIÓN`). Contenido de la objeción, **sin cita atribuida ni empresa** |
| Giro | no se nota por cómo está escrito, se nota porque llega igual a medio sector: **el problema es a QUIÉN se lo mandas** (identificación) |
| Micro-apertura | `Una frase.` (familia del anuncio del formato; la base de Iker sigue siendo `Te cuento.`, que anuncia historia y esto no lo es) |
| Enlace | `forward.neety.com/?utm_source=correo-05-iker-objecion`, 302 → `luma.com/ujffj66o?utm_source=correo-05-iker-objecion` (seguimiento UTM apagado por Iker, auditor ✅) verificado el 22/09 |
| Validador | **36/36** · ritmo `1-1-1-1-3-1-2-1-1-2-1-1` |

**Por qué NO fue el "última llamada / menos de 24 horas" que se pidió:**
1. **Era falso:** sale el miércoles a las 09:05 y el evento arranca el jueves a las 18:00 (Luma `start_at` 16:00Z). Son **33 horas**. Se escribe **`Mañana jueves 24`** (Iker, 22/09): el 80% de las aperturas del correo 4 fueron el mismo día (16 de 20), y el `jueves 24` cubre al que lo abra el jueves.
2. **Sería el 3.er correo seguido del evento** (3, 4 y este): `§7` pide avisar del tercer correo de venta seguido.
3. **Los inscritos ya reciben de Luma el recordatorio de 24 h y el de 1 h** (`§8h`): un tercero nuestro es ruido para ellos.
4. **El post que va DEL evento trae clics y 0 inscritos** (`global §4.4b-EVENTO-EXPLICITO`); el evento se vende dentro de otra cosa.

**⚠️ PENDIENTE ANTES DEL TEST (lo hace Iker en el panel):** Brevo ha inyectado `utm_source=sendinblue` al crear la campaña, como en el correo 4. **Configuración adicional → seguimiento UTM → apagar**, y después se reescribe el `href` a mano y se pasa `auditar-campanas-brevo.py`.

**🔁 Cambio de asunto (22/09, a propuesta de Iker):** el primero decía de qué iba el correo, y los asuntos buenos de las referencias nunca dicen el tema (`email-marketing §8g`). **Hipótesis con nuestro dato, n=2 contra n=2:** los dos asuntos que más abrieron son **preguntas cortas en 2ª persona, de tú a tú y sin tema** (`¿no te acuerdas de mí?` 46,8% · `te guardo la silla o no?` 44,4%) y los dos que menos, **afirmaciones** (`me traje 200 tarjetas…` 35,6% · `en euskadi nos juntamos sin ti` 28,9%). Con 45 destinatarios no es prueba, pero la dirección coincide en los 4. **Si este abre en la franja alta, se propone como regla.** Ninja cambiado para que cuelgue de `abrir`: `Una máquina te escribe el mensaje. Abrirlo, no.` Validador 37/37.

**🔁 PUERTA CAMBIADA A `/agendar/` (Iker, 22/09 tarde), y es la única.** Iker: *"como la ubicación del evento ya restringe mucho"*. **No se sabe dónde vive la lista** (ni Brevo ni el CRM guardan ubicación: 37 de 42 son `.com`), así que Donostia no le sirve a la mayoría. Se descartó añadir un segundo enlace (regla de un solo enlace, `email-marketing §3`) y **se cambió la única puerta**. De paso, el enlace a `/agendar/` resuelve justo lo que dice el cuerpo (*a quién mandárselo*) y hace de este correo la **prueba limpia de OBJECIÓN**, sin el ruido del evento. Se quitó la línea del evento; ninja `Una máquina te escribe el mensaje. Abrirlo, no.` / `A quién mandárselo, con su nombre, nosotros:` (Iker: explícito, quién lo hace, como el `en el evento sí` del post de la mañana). **UTM escrito a mano** (`utm_source=brevo&utm_medium=email&utm_campaign=correo-05-iker-objecion`), porque el seguimiento de Brevo está apagado. Validador 36/37 (solo la `¿`, aceptada). Auditor ✅.

**Al enviarlo:** meter el ninja en `QUEMADAS` de `validar-email.py`, el cuerpo literal en `corpus-correos-enviados.md`, y leer las métricas a los 5-6 días.
**Después del evento (25/09 en adelante):** el ninja vuelve a `/agendar/`. **Remitente cambiado de Unai a Iker (22/09):** Iker llevaba 3 semanas sin escribir (Unai 2), el pilar objeción es suyo porque es quien hace las demos, y así Unai queda libre para el correo de después del evento. **Asier se descartó para este:** estrenar remitente y pilar a la vez no deja atribuir nada. ✅ **Su remitente ya existe: `Asier de Neety` (id 7, `hola@neety.com`, activo), dado de alta por Iker el 22/09.** Candidato para su estreno: pilar 9 · receta regalada.
