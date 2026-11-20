# La newsletter en contenido.neety.team

> **Fecha:** 2026-11-20 · **Pide:** Iker · **Estado:** borrador, pendiente de aprobar

## Por qué

La newsletter se escribe en Claude Code con la doctrina de `cerebro` (`email-marketing.md`, `validar-email.py`) y se envía desde Brevo. Sin embargo, no hay ningún sitio donde ver qué correos vienen y en qué estado está cada uno, ni donde aprobarlos. Las métricas están repartidas: el Dashboard de Saldu cuenta mal (no descuenta Apple, ni los clics en el enlace de baja, ni los internos) y las buenas solo salen de `metricas-brevo.py` en la terminal.

Iker quiere llevar la newsletter igual que LinkedIn, desde contenido.neety.team: ver los correos que vienen, aprobarlos y ver después cómo ha ido cada uno.

## Lo decidido con Iker (20/11)

- **La base de datos de suscriptores se queda en Saldu.** Audiencias, consentimientos, bajas, altas de neety.com y de Luma, y la sincronización con las listas de Brevo. No se toca y no se copia.
- **La planificación, los borradores, la aprobación y las métricas pasan a contenido.neety.team.**
- **Va en una pestaña propia, no mezclada con los posts.** Se llega desde Semana con un selector **LinkedIn / Newsletter** en la cabecera.
- **Solo aprueba Iker.**

## Objetivos

1. Ver los correos que vienen, con su estado: idea → borrador → aprobado → programado → enviado.
2. Cada correo se ve como llegará a la bandeja: remitente, asunto, preview, cuerpo y GIF, con el porqué delante (pilar, a qué tipo de cliente habla, a dónde lleva el enlace) y el resultado del validador.
3. Iker lo aprueba desde la tarjeta. Si no está de acuerdo, deja un comentario y se cierra igual que el feedback de los posts.
4. Al enviarse, la tarjeta enseña sus métricas reales, y una vista de enviados las compara correo a correo.

## Fuera de alcance

- Mover o duplicar la lista de suscriptores, las bajas o las secuencias de Saldu.
- Tocar Saldu. Su Dashboard sigue como está. Decidir si se retira es para más adelante.
- Enviar o programar desde la página. El interruptor de seguimiento UTM de Brevo no existe en la API (`email-marketing.md`), así que de todas formas habría que pasar por el panel de Brevo. La campaña la sigue creando Claude con `montar-correo-brevo.py` después de la aprobación.
- Escribir correos desde la página. Se escriben en Claude Code, como ahora.

## Lo que haría que fallara aunque funcione

- Que un correo acabe en el circuito de LinkedIn (publicador, efecto abeja, menciones).
- Que las métricas del panel no coincidan con las de `metricas-brevo.py`. Si no coinciden, no se fía nadie y se vuelve a la terminal.
- Que el panel diga «aprobado» sin que lo haya aprobado Iker.

## Restricciones

- **Tabla propia.** Los correos no van en `semana_posts`, porque el publicador de LinkedIn, el efecto abeja y la validación de menciones leen esa tabla.
- **La aprobación se identifica con el login central** (`identidadDe(req)`, como el feedback). Lo que mande el navegador no vale. Si no hay identidad o no es Iker, no hay botón.
- **Las métricas se leen de Brevo con `BREVO_API_KEY`.** No está en este Mac ni en el Railway del analizador. Una persona la pone en Railway, y Saldu ya la tiene en el suyo.
- **Las métricas siguen las trampas ya medidas** (`metricas-brevo.py` y `email-marketing.md`):
  - Pedir siempre `?statistics=globalStats`, porque sin el parámetro la API devuelve ceros.
  - Apertura real = `uniqueViews` − `appleMppOpens`.
  - Clic = suma de `linksStats`, porque `uniqueClicks` cuenta también los enlaces de baja y de preferencias.
  - Quitar los clics de `@neety.com`.
  - Señalar los clics del primer minuto como posible escáner.
- **Las conversiones** son las reuniones y leads con el UTM del correo. El analizador ya cuenta «newsletter» como canal (`conversionesWeb.ts`).
- **Llegar a la página no es lo mismo que poder aprobar.** Mientras siga la contraseña compartida (PR 44 sin fusionar), la página es accesible pero no hay identidad, así que el botón de aprobar no sale.

## Formas de montarlo que se consideraron

| Opción | Qué es | Por qué sí o por qué no |
|---|---|---|
| **Pestaña propia, accesible desde Semana** | `/newsletter` con selector LinkedIn / Newsletter en la cabecera de Semana | **Elegida por Iker.** Separa canales sin perder el punto de entrada de siempre |
| Dentro de Semana | El correo como una tarjeta más de la semana | Descartada por Iker: lo quiere aparte |
| En `semana_posts` con un campo de canal | Lo más barato | Descartada: el circuito de LinkedIn lee esa tabla |

## Cómo se ve

```
[ LinkedIn | Newsletter ]                      ← selector en la cabecera, también en /semana

Próximos
┌──────────────────────────────────────────────┐
│ Correo 15 · mar 24/11 09:05 · Kaixito          │  borrador
│ Por qué: objeción · tipo 2 · enlace a /...     │
│ ── como en la bandeja ──                       │
│ Kaixito de Neety                               │
│ asunto en minúsculas                           │
│ preview…                                       │
│ cuerpo + GIF                                   │
│ Validador 22/22 ✓                              │
│ [Aprobar]  [Comentar]          ← Aprobar solo Iker │
└──────────────────────────────────────────────┘

Enviados
correo · fecha · entregados · apertura real · personas que pulsan · CTOR · bajas · rebotes · reuniones/leads
```

## Datos

- **Tabla `newsletter_correos`:** número, clave, fecha prevista, remitente, asunto, preview, cuerpo, URL del GIF y alt, enlace, pilar, tipo de cliente, porqué, resultado del validador, estado, `aprobado_por` y `aprobado_at`, e id de campaña de Brevo.
- **Tabla `newsletter_feedback`:** el mismo patrón que `semana_feedback`, con nivel (estilo, pilar o correo) y resolución.
- **Cómo entra un correo:** el `.txt` validado más un fichero de datos (por ejemplo `newsletter/AAAA-MM-DD-correo-NN.json` en la carpeta de contenido) se sube con una tool del MCP, como `neety_semana_publicar`. Al reescribir un correo se conserva su feedback. **Si el texto cambia después de aprobado, vuelve a borrador.**
- **Cómo pasa a enviado:** al crear la campaña en Brevo se apunta su id. El estado y las métricas se leen de Brevo, y el estado no se marca a mano.

## Decisiones tomadas al revisar el diseño (decide Claude, Iker puede corregirlas)

- **Métricas: mandan las definiciones de este documento, no el script tal como está.** `metricas-brevo.py` hoy no descuenta `appleMppOpens`, no marca el primer minuto y suma clics con repeticiones. El cálculo va a un solo sitio (módulo del backend) y el script pasa a usar las mismas definiciones, para que panel y terminal digan lo mismo. «Personas que pulsan» son **personas únicas**, sin `@neety.com`, y se calculan una vez por correo y se guardan en una tabla de métricas (por el límite de ritmo de Brevo). Las listas salen de la propia campaña (`recipients.lists`), no de un valor por defecto.
- **A/B de asunto:** el registro de A/B de `historial-newsletter.md` sigue abierto, así que el correo admite un **asunto B y una preview B opcionales**. La tarjeta enseña los dos, y la vista de enviados da apertura y clic por brazo cuando Brevo los devuelve (`abTestCampaignResult`), además del total.
- **Conversiones:** cada correo guarda su clave UTM (`utm_campaign`, y `utm_source` cuando el enlace va a Luma). Cuentan las demos y leads de `conversionesWeb.ts` por esa clave y las inscripciones a eventos de `conversionesEventos.ts`. El histórico medido con `utm_source=brevo` se muestra como está, sin reatribuir.
- **Reescribir un correo con campaña ya creada:** la tool de publicar **lo rechaza** mientras tenga `brevo_campaign_id` y la campaña esté programada o enviada, y dice por qué. Para cambiarlo, primero se cancela la campaña en Brevo y se desvincula. Así el panel nunca enseña «programado» o «aprobado» sobre un texto que Iker no ha visto.

## Lo que queda para quien lo construya

- Cachear las métricas en una tabla o pedirlas a Brevo al abrir la página. Brevo tiene límite de ritmo (`exportRecipients` dio 429), y los clics persona a persona (`--quien`) son caros: mejor calcularlos una vez y guardarlos.
- Las tools del MCP: publicar, leer feedback y resolver feedback, siguiendo el modelo de las de Semana.
- Partir los componentes para no engordar `Semana.tsx`.
- Cargar los 14 correos ya enviados como histórico (campañas de Brevo ya conocidas en `historial-newsletter.md`).
