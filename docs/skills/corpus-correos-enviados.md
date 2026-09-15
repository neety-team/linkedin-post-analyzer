# CORPUS: los correos que hemos enviado de verdad

> **name:** corpus-correos-enviados
> **description:** El texto LITERAL de cada correo que ha salido de Neety, con sus métricas reales. Es el equivalente de `swipe-file.md` para email: nuestros propios correos, no los de otros.
> **when-to-use:** Cargar SIEMPRE que haya que reescribir, versionar o continuar un correo que ya salió. Antes de tocar una línea de un correo enviado, se lee aquí el original.

---

## Por qué existe

El 2026-08-20, al ir a reescribir el correo 0 para Brevo, resultó que **el texto exacto de lo que se había enviado no estaba en ninguna parte del repo.** Estaba solo dentro de la cuenta cancelada de MailerLite, a la que se sigue pudiendo entrar por suerte.

`email-marketing §5c-0` tiene el DISEÑO del correo (asunto, remitente, el GIF, la mecánica de la respuesta) pero no el cuerpo tal y como salió. Y reescribir de memoria un correo que funcionó es la mejor forma de perder lo que lo hizo funcionar.

**Regla: cuando se apruebe y se envíe un correo, su texto literal se pega aquí el mismo día.**

---

## Kaixito 01 · el correo 0 segmentador

**Enviado:** tanda 1 el 2026-08-07 09:23 (54 destinatarios) · tanda 2 el 2026-08-10 11:51 (137)
**Remitente:** Kaixito, la mascota de Neety
**Métrica declarada:** las RESPUESTAS (el correo iba sin enlaces en el cuerpo, salvo la PPD)

### Métricas reales

| | Tanda 1 | Tanda 2 |
|---|---|---|
| Enviados | 54 *(47 + 5 testers)* | 137 |
| Entregados | 52 (96,3%) | 133 (97,08%) |
| Aperturas | 25 (46,3%) · a 4 días | 38 (27,7%) · a 21 h |
| Clics de contenido | 4 | 1 |
| Rebotes duros | 2 (3,7%) | 4 (2,92%) |
| Bajas | 0 | 5 (3,65%) |
| Denuncias de spam | 0 | 0 |
| **Respuestas** | **0** | **0** |

**Acumulado: 191 enviados · 46% y 28% de aperturas · 1 reunión agendada · 0 denuncias · 0 RESPUESTAS.**

### El asunto

```
¿no te acuerdas de mí?
```

⚠️ **No coincide con el diseñado en `§5c-0`, que decía `tú quién eres`.** El que salió lleva signos de interrogación y una palabra más. Es el que produjo el 46% de aperturas, así que manda este sobre el documentado.

### El preheader

```
Normal, es la primera vez que te escribo.
```

⚠️ **Casi se pierde.** No estaba en el cuerpo que se rescató, porque el preheader no se ve al abrir el correo: solo aparece en la bandeja, detrás del asunto. Iker lo cazó mirando una captura de Gmail.

**Es una pieza de copy, no un relleno**, y hace lo que tiene que hacer un preheader: **responder al asunto en vez de repetirlo.** `¿no te acuerdas de mí?` → `Normal, es la primera vez que te escribo.` El chiste se completa en la bandeja, antes de abrir.

📌 **Regla: el preheader se guarda SIEMPRE junto al asunto y el cuerpo.** Es el segundo texto que más se lee (lo ven todos los que abren y todos los que no) y es el que más fácil se pierde, porque no está dentro del correo.

### El cuerpo, literal

```
Tranquilo, que no me he colado en tu bandeja.

Bueno, un poco sí.

Soy Kaixito, la mascota de Neety.
Aquí buscamos las empresas que de verdad te pueden comprar.

Y a la persona exacta con la que tienes que hablar dentro.

Me toca ordenar los correos que nos dejaron el año pasado.
Llevo toda la semana con el libro abierto buscándote.

[GIF: Kaixito estresado hojeando el libro]

Y no hay manera.

Que coincidimos en algo lo sé.

Igual nos leíste por LinkedIn.
Igual te bajaste algo de nuestra web.
Igual coincidimos en un evento o en un webinar.

Pero cuál de todas, ni idea.

Así que te lo pregunto directo.
Con una palabra me vale.

Pulsa responder y dime: web, linkedin, evento, webinar o ni idea.

Y dejo de mandarte cosas que no te tocan.

Kaixito, la mascota de Neety

PD. Si respondes ni idea, tranquilo, es la más honesta de todas. Y si prefieres que no te escriba nunca más, dímelo igual y desaparezco sin dramas.

PPD. A ti no te encuentro. A tus clientes sí. Te lo enseñamos en 20 minutos: https://recursos.neety.com/agendar/
```

> ⚠️ **`20 minutos` es un ERROR, y este bloque lo conserva a propósito.** Las tandas 1 y 2 salieron
> así y el archivo tiene que decir lo que se envió, no lo que habría que haber enviado. **Las
> reuniones duran 30 minutos**, que es lo que dice `recursos.neety.com/agendar/`: el correo prometía
> una cosa y la página de reserva pedía otra. Corregido por Iker el 2026-08-21.
>
> **De la tanda 3 en adelante la PPD es esta, y se copia de aquí:**
>
> ```
> PPD. A ti no te encuentro. A tus clientes sí. Te lo enseñamos en 30 minutos: https://recursos.neety.com/agendar/
> ```
>
> Es el único cambio respecto a lo enviado. Nada más del cuerpo se toca: el asunto abre al 48 %
> y lo que falla es la conversión, no el gancho.

Pie (lo pone la plataforma, no se puede quitar):

```
Darme de baja
Cambiar mis preferencias
Neety · Miramon Pasealekua 170, Donostia, España
```

---

## Iker 02 · la feria y el taco de tarjetas (pilar HISTORIA, el primero de un founder)

**Enviado:** 2026-09-02 09:11 · campaña Brevo 15 · lista `📥 Recursos · Todos` + `Testers` (45)
**Remitente:** `Iker de Neety` (`hola@neety.com`) · firma `Iker Galarza, cofundador de Neety`
**`utm_campaign`:** `iker-02-feria` · **Métrica declarada:** clics a `/agendar/`

| | Correo 2 |
|---|---|
| Enviados / entregados | 45 / 45 |
| Aperturas reales | **16 · 35,6%** |
| Clic "global" (infla, cuenta la baja) | 3 |
| **Clic al ENLACE** (`linksStats`) | **1**, y es `mario@neety.com` el 14/09 → **0 de lead** |
| Rebotes · bajas · spam | 0 · 0 · 0 |

### El asunto y el preheader

```
me traje 200 tarjetas y no llamé a nadie
```
```
Siguen ahí, en un cajón.
```

### El cuerpo, literal

```
Te cuento.

Fue en una feria industrial, hace 3 años.

Volví con 200 tarjetas en una bolsa de tela.
Las conté esa misma noche en el hotel.

Doscientas oportunidades, pensé.

El lunes las puse todas encima de la mesa.
Y me quedé mirándolas sin marcar un solo número.

No sabía por cuál empezar.
No sabía cuál de esas 200 empresas de verdad podía comprarnos.
No sabía, dentro de cada una, a quién preguntar.

Las metí en un cajón.
Ahí siguen.

Una feria te da tarjetas, no clientes.
El nombre de quien decide, nosotros: https://recursos.neety.com/agendar/

Antes pensaba que el problema era conseguir contactos.
Ahora sé que el problema era no saber cuáles de esos contactos importaban.

En ventas a esto se le llama prospección a ciegas.

Iker Galarza, cofundador de Neety

PD. Si tienes un cajón parecido en tu mesa, reenvíaselo a quien lleve ventas en tu equipo. Seguro que tiene el suyo.

PPD. Las 200 siguen en el cajón. Alguna, seguro, era la buena.
```

---

## Unai 03 · el comercial al que le guardaban sitio (pilar HISTORIA-TESTIGO, puerta del EVENTO)

**Enviado:** 2026-09-09 09:09 · campaña Brevo 18 · misma lista (45)
**Remitente:** `Unai de Neety` (`hola@neety.com`) · firma `Unai Arambarri, CEO de Neety`
**`utm_source` escrito a mano:** `unai-03-evento-correo` · **Métrica declarada:** clics a Luma

| | Correo 3 |
|---|---|
| Enviados / entregados | 45 / 45 |
| Aperturas reales | **13 · 28,9%** |
| Clic "global" | 4 |
| **Clic al ENLACE** | **2**, uno es Mario → **1 de lead** (`anderalberdi94@gmail.com`, 09/09 14:50) |
| Bajas | 1 (`ojacinto@gmail.com`) |

⚠️ **El asistente del evento NO vino de aquí, vino de HubSpot** (`historial-newsletter`, 14/09). Con 45 destinatarios, 0 y 1 clic son el mismo número: ni el correo 2 ni el 3 confirman ni desmienten nada sobre la posición del ninja.

### El asunto y el preheader

```
en euskadi nos juntamos sin ti
```
```
No es nada personal, es cómo se entra.
```

⭐ **Es la variante de PSICOLOGÍA EMOCIONAL** (orgullo/pertenencia regional, `Euskadi` dentro del asunto). Se eligió sobre la de afirmación **matando el A/B**: con 40 personas el reparto daba ~6 aperturas por brazo.

### El cuerpo, literal

```
Al grano.

Trabajé con un comercial de Euskadi.
Nunca le vi pedir una reunión a nadie.

Yo solo iba de copiloto.

En los bares le pagaban el café.
En las ferias le guardaban un sitio.
En los talleres lo conocían por el nombre.

No era simpatía.

Era que alguien decía su nombre antes.
Y la puerta ya estaba abierta cuando él llegaba.

El 24 de septiembre montamos un evento presencial en Donostia.

Nos juntamos sin ti solo si no te apuntas.
Tan solo hay 80 sillas: forward.neety.com

Eso es lo que nadie cuenta de la prospección.

No es dar con la empresa.
Es que alguien de dentro te coja el teléfono.

Unai Arambarri, CEO de Neety

PD. Si conoces a quien lleva ventas en otra empresa y le pilla cerca, reenvíaselo. Va exactamente de esto.

PPD. Aquel comercial se jubiló y su agenda no la heredó nadie.
```

> 🔴 **Los dos se rescataron de la API de Brevo el 2026-09-15, 13 y 6 días después de enviarse.** La regla de arriba (*"su texto literal se pega aquí el mismo día"*) se incumplió en los dos, y se notó: para escribir el correo 4 hubo que ir a buscar el cuerpo del 3 a la campaña. **El disparador es el ENVÍO, no que alguien lo pida.**

---

## 🔴 Las tres líneas que costaron la cuenta

MailerLite canceló la cuenta el 2026-08-11 y, al preguntar, el motivo fue *"su contenido no está permitido"*. **Habían leído el correo.** Estas son las líneas que un revisor de cumplimiento lee como una confesión de lista no consentida:

1. `Me toca ordenar los correos que nos dejaron el año pasado.`
2. `Llevo toda la semana con el libro abierto buscándote. / Y no hay manera.`
3. `Pero cuál de todas, ni idea.`

Juntas dicen: *no sabemos quién es esta gente ni de dónde salió.* Da igual que sea la gracia del correo y da igual que funcione con el lector — funcionó, 46% de aperturas y una reunión el mismo día. **El texto lo lee también un revisor.**

Post-mortem completo en `email-marketing §0b`.

---

## Lo que hay que arreglar al reescribirlo, y no es solo eso

- **El consentimiento se da por hecho, no se pone en duda** (Iker, 2026-08-20). La broma se mantiene entera; lo que cambia es que Kaixito no recuerda **de cuál de las vías** vino, no si dio permiso. Con la tanda 1 de Brevo elegida por tener el tick, esa afirmación además es verdad y se puede demostrar.
- 🔴 **El CTA de respuesta hay que rediseñarlo, no repetirlo.** Sacó **0 respuestas de 191** con un 46% de aperturas. La gente abrió, leyó y no contestó. Si la métrica declarada del correo son las respuestas, ese correo **falló en lo único que medía**. Repetir el mecanismo tal cual es repetir un cero.
- **La PPD sí funcionó:** los 4 clics de contenido de la tanda 1 salieron de ahí, y de ahí salió la reunión agendada. El enlace de agendar en la PPD se queda.

---

# 🎬 LA BIBLIOTECA DE GIFS DE KAIXITO

**Verificadas el 2026-08-20**: las cinco responden `200 image/gif` y su tamaño coincide **byte a byte** con los ficheros de `Documents/Mario/LINKEDIN GROWTH/EMAIL MARKETING/`. Las etiquetas están confirmadas, no solo que cargan.

Viven en la biblioteca de contenido de Brevo. ⚠️ **Brevo no tiene gestor de archivos suelto**, así que Iker las subió metiéndolas en una campaña de prueba llamada `Gifs mascota`: la campaña era la PUERTA para llegar a la biblioteca, no el sitio donde se guardan.

> 🔴 **AQUÍ PONÍA "esa campaña no se borra: si desaparece, se van las cinco URLs", Y ERA FALSO.** Lo escribí yo por precaución, sin comprobarlo, y luego lo defendí dos días seguidos cuando Iker preguntó si podía borrarla. **Comprobado el 2026-08-28 borrándola de verdad: las 5 URLs siguen devolviendo `200 image/gif`.** La campaña ya no existe y los GIFs siguen ahí.
>
> **La evidencia estaba en la propia URL y no la miré:** `img.mailinblue.com/11927007/images/content_library/original/…` — el `11927007` es el **ID de la cuenta** (el mismo que devuelve `GET /account`) y la ruta dice `content_library`. **No hay ninguna referencia a la campaña en ningún sitio.** Los archivos son de la CUENTA.
>
> **La lección, y vale para cualquier aviso que escriba:** una precaución inventada se lee igual que un hecho medido, y bloquea decisiones durante meses. **Un aviso sin comprobar se marca como hipótesis, o no se escribe.** Aquí la comprobación costaba una llamada HTTP.
>
> 💾 **Y antes de borrar se hizo una copia de los 5 GIFs** en `Escritorio/GIFS-KAIXITO-BACKUP` (332-369 KB cada uno). Eso es lo que convirtió una decisión arriesgada en una segura: con la copia, el peor caso era volver a subirlos.

| Emoción | URL | Bytes |
|---|---|---|
| **estresado** | `https://img.mailinblue.com/11927007/images/content_library/original/6a8722b7e5f747179059068f.gif` | 377.723 |
| **alegría** | `https://img.mailinblue.com/11927007/images/content_library/original/6a8722b7e5f747179059068e.gif` | 346.643 |
| **enfado** | `https://img.mailinblue.com/11927007/images/content_library/original/6a8722b7d90d741e712f9a11.gif` | 342.707 |
| **curiosidad** | `https://img.mailinblue.com/11927007/images/content_library/original/6a8722b7d90d741e712f9a10.gif` | 378.015 |
| **aburrimiento** | `https://img.mailinblue.com/11927007/images/content_library/original/6a8722afd90d741e712f9a0a.gif` | 340.664 |

## ⛔ La regla: el GIF lo elige el TEXTO, no el turno

**En cada correo que firme Kaixito se elige la animación cuya emoción encaje con lo que dice el cuerpo** (Iker, 2026-08-20). No se rota por orden ni se repite la del correo anterior por comodidad.

En el correo 0 va **estresado** porque el cuerpo entero es la mascota agobiada sin recordar de qué te conoce. Si el GIF fuera alegría, el chiste no existiría: la imagen contradiría al texto y el lector notaría el pegote sin saber por qué.

**UNA animación por correo, nunca más** (`email-marketing §3b`).

## Cómo se mete

Snippet estándar de `§9c`, 280 px, centrado y con `alt` porque muchos clientes bloquean imágenes:

```html
<p style="margin:0 0 24px;text-align:center;"><img src="URL" alt="Kaixito hojeando su libro sin encontrarte" width="280" height="280" style="display:block;margin:0 auto;width:280px;max-width:70%;height:auto;border:0;outline:none;text-decoration:none;"></p>
```

⚠️ **Outlook de escritorio solo enseña el PRIMER FOTOGRAMA.** Por eso el primer fotograma tiene que funcionar como imagen fija: para media plantilla de una empresa, ese ES el GIF.


---

# 🔁 DUPLICAR UNA CAMPAÑA EN BREVO PARA LA TANDA SIGUIENTE

Las tandas de un mismo correo se montan duplicando la anterior. Brevo pregunta qué conservar y **viene todo marcado**:

Remitente · **Destinatarios** · Asunto · Diseño · **Configuración adicional**

## ⛔ Desmarca "Destinatarios". Siempre.

Marcado, la campaña nueva nace apuntando a **la lista de la tanda anterior** y hay que acordarse de cambiarla. Desmarcado, nace sin destinatarios y **Brevo no deja programar** hasta elegir una.

La diferencia es entre un examen de memoria y un error imposible. Y el fallo que evita es gordo: mandar la tanda N a la lista de la tanda N-1 significa que **unos reciben el mismo correo dos veces y otros no reciben nada**. En un correo que dice *"no me acuerdo de dónde saliste"*, recibirlo dos veces parece un sistema roto y se lleva por delante la broma.

## ⚠️ "Configuración adicional" arrastra los UTM

Se deja marcada (ahí van los ajustes de seguimiento), pero eso significa que **`utm_campaign` viene con el valor de la tanda anterior**. Hay que cambiarlo a mano: `kaixito-01-tanda-1` → `kaixito-01-tanda-2`.

Si no, todas las tandas caen en el mismo cubo de GA4 y se pierde lo único que el UTM podía medir de verdad, que es **qué tanda trajo la reunión**.

## El orden completo, sin saltos

1. **CRM** → Audiencias → 📤 Brevo · Tandas → encender la tanda N → **↑ Subir a Brevo**
2. Comprobar en Brevo → Listas que la lista existe y tiene los contactos que toca
3. Brevo → campaña anterior → **⋮ Duplicar**, con **Destinatarios DESMARCADO**
4. Renombrar a `Kaixito 01 · Tanda N`
5. Elegir la lista de la tanda N
6. **Cambiar `utm_campaign`**
7. Programar

El paso 1 es el que se olvida: sin él, en el paso 5 no hay lista que elegir.
