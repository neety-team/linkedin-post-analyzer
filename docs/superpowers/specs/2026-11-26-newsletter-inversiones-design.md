# Newsletter de inversiones: bienvenida, aviso semanal y respuestas «quiero esta»

> Diseño del 26/11/2026. Estado: **aprobado el 27/11/2026**. Sustituye, desde el 9/12, a los correos 17 y 18 del plan de `newsletter/plan-2026-11-12.md` (ver «Calendario»).

## 1 · Para qué

La newsletter pasa a ser **el sitio premium donde la industria se entera antes que nadie de quién está invirtiendo**: las inversiones de la semana, el Radar del mes y las actualizaciones de los mapas, antes de que salgan en la web y en LinkedIn.

El fin es un embudo: cada correo demuestra valor con datos reales. El lector va viendo que eso mismo, a diario y filtrado por lo que vende, es Neety. Cuando le toque buscar clientes, pide la reunión.

**Por qué ahora (datos de la página Newsletter):**
- El correo 15 (el Radar en Excel, 24/11) tuvo un 3,1 % de clic real y 0 bajas.
- El último de historias (correo 14, 17/11) tuvo un 0,5 % de clic y 3 bajas.
- La apertura de las historias de Kaixito venía cayendo: 62 → 54 → 32,5 → 35 %.
- Las altas del formulario del Radar y de los mapas (24 desde el 20/11) son más ICP que la media de la lista: Siemens, Habasit, Rubix, Carburos Metálicos…

## 2 · Objetivos, no-objetivos y lo que lo haría fracasar

**Objetivos**
- Un correo útil cada semana, con inversiones que el suscriptor no ha visto en ningún otro sitio todavía.
- Que el lector responda «quiero esta» y reciba a quién escribir dentro de esa empresa. Esa respuesta es la señal de intención, y lo que lleva a la reunión.
- Que casi todo lo prepare la máquina. Iker solo revisa los datos y pulsa enviar (unos 10 minutos el lunes) y envía las contestaciones que le dejan escritas.
- Una bienvenida automática para quien entra, sin que nadie la toque.

**No-objetivos (v1)**
- Filtrar el correo por el sector de cada lector. Es la fase siguiente, cuando las respuestas digan qué sectores hay.
- Mover las rutinas a la nube (hoy el Radar vive en ficheros del Mac).
- Escribir en el CRM de forma automática.
- Envío automático del correo semanal (decidido: lo pulsa Iker, ver §4).

**Lo que lo haría fracasar aunque funcione**
- Mandar algo a quien no lo pidió. Los 24 del Radar y de mapas solo entran en el correo semanal si dicen «sí» por escrito. Ya nos cancelaron una cuenta (MailerLite) y Brevo la bloqueó el 28/08 (`email-marketing §0b`).
- Un dato del Radar mal (empresa, cifra o fuente) que llega a 250 personas.
- Que una contestación reparta datos personales. Se da **el cargo y por qué**, nunca el nombre, el correo ni el teléfono de una persona.
- Prometer automatismo o volumen en el puente a Neety (`global §4.4b-MUNICIÓN`).
- Que alguien reciba dos correos de la casa la misma semana (`email-marketing §5`).

## 3 · Enfoques que se valoraron

| Enfoque | Qué es | Por qué sí o no |
|---|---|---|
| **A · Una sola newsletter de inversiones** (elegido) | Todos en una lista. El Radar la primera semana del mes y el aviso de inversiones el resto | Un producto y una marca, fácil de llevar para una persona, y es el formato que los datos dicen que funciona. Los 24 entran con su «sí» |
| B · Tres productos con un embudo común | Cada base recibe solo lo que pidió (Radar, aviso de su región, newsletter) | Cumple las promesas sin pedir nada, pero son tres cosas que mantener y hay que segmentar por región. Descartado |

**El paso hacia Neety:** de las tres opciones (solo leer, responder «quiero esta», recibirlas filtradas) se eligió **responder «quiero esta»**. Demuestra valor uno a uno, mide la intención y da los sectores para filtrar más adelante.

**Cómo se automatiza:** Brevo envía la bienvenida él solo, y las rutinas del Mac (como las de LinkedIn) preparan el correo semanal y las contestaciones. Se descartó hacerlo todo dentro de Brevo, porque Brevo no escribe el contenido de cada semana. También se descartó por ahora pasar las rutinas a la nube, porque no ven los ficheros del Radar.

**Cuánto toca Iker:** **A, revisa y pulsa enviar cada semana.** Si las 4 primeras semanas salen limpias, se replantea que salga solo salvo que Iker lo pare.

## 4 · Cómo funciona

### 4.1 · La lista

- **La newsletter son las listas 15, 16 y 19 de Brevo** (unas 250 personas).
- **No hace falta excluir la lista 23 del correo semanal.** Desde el PR 249 de `saldu` (fusionado el 23/11), el CRM ya no mete en la 15 a quien solo se apuntó al Radar o a los mapas. Quien se apuntó también a la newsletter sigue en la 15 y lo recibe. Lo que se les prometió a los demás es solo el Radar del mes o el aviso del mapa.
- **Las listas 15 y 23 las llena el CRM, así que los cambios se hacen en el CRM y no a mano en Brevo.** Si no, la próxima sincronización los deshace. Quien diga «sí» se marca en el CRM con el permiso de la newsletter, y así la sincronización lo pasa a la 15. *Llamada del constructor:* comprobar en `saldu/src/resources_leads.js` cómo se marca ese permiso y si la sincronización saca de la 23 al que pasa a la 15. La lista «En bienvenida» (§4.2) es solo de Brevo y el CRM no la toca: comprobarlo también.
- **Radar y mapas no son la misma promesa.** A los de los mapas solo se les prometió el aviso cuando se actualice su mapa, así que **no reciben el Radar mensual**. Antes del 3/12 se separan los 24 con la ficha del CRM, donde consta el recurso de cada uno. A quien no se pueda saber de dónde vino, no se le manda el Radar.
- **El «sí» se pide en el correo que sí pidieron:**
  - a los del Radar, en el Radar del 3/12 (§5R): *«si quieres también las inversiones de cada semana, respóndeme "sí"»*;
  - a los de los mapas, en el próximo aviso de su mapa, con la misma frase.
  - El cambio en el CRM lo hace Iker, o Claude cuando él lo pida, nunca la rutina sola.
- **Los clientes (lista 22) sí lo reciben.** El correo semanal no pide reunión en el cuerpo, solo «quiero esta». El Radar mensual, que sí lleva botón de reunión, los sigue excluyendo como hasta hoy.

### 4.2 · La bienvenida (automatización de Brevo)

- **Empieza** cuando un contacto entra en la lista 15. Una sola vez por contacto, para siempre. Los que ya están no la reciben al activarla.
- **Tres correos.** Los firma Iker (`Iker de Neety`), Kaixito sale como GIF y siguen `email-marketing.md` con `validar-email.py`:

| Día | Qué lleva | Enlace |
|---|---|---|
| 0 | Qué va a recibir y cuándo («los martes, quién está invirtiendo esta semana, antes de que salga en ningún sitio»). De regalo, el último Excel del Radar | El Excel en `neety.com/para-ti/…` |
| 3 | Cómo se lee una inversión, con un ejemplo real del Radar: qué va a comprar esa empresa y a quién le interesa. Y el mecanismo: «si una te interesa, respóndeme *quiero esta* y te digo a quién escribir dentro» | Ninguno. Se invita a responder |
| 7 | Una inversión fresca de la semana como muestra y «desde el martes que viene, te llegan todas». Una línea, sin vender, de que esto es lo que Neety hace a diario | La edición del Radar en la web |

- **Sin doble flujo** (`email-marketing §5b`): durante los 7 días de la bienvenida no recibe el correo semanal. Propuesta: el primer paso de la automatización lo mete en una lista «En bienvenida» y el último lo saca, y el correo semanal excluye esa lista. *Llamada del constructor:* si el catálogo de Brevo no tiene pasos de lista, se busca la forma equivalente (por ejemplo, un segmento por fecha de alta). Si no hay ninguna, se avisa antes de montar nada.
- **Se crea como borrador y no se activa** hasta que Iker vea los tres correos y lo pida. Los correos se prueban con un envío de prueba a `iker@neety.com`.

### 4.3 · El aviso semanal (rutina `contenido-newsletter-auto`, lunes)

**Qué es el correo.** Es un tipo nuevo, entre la newsletter y el Radar:
- Lo firma Iker y lleva el GIF de Kaixito, pequeño.
- Dos líneas de entrada.
- **Las 5 a 8 mejores inversiones de la semana**, cada una con empresa, dónde, qué hace, qué puede necesitar y su fuente enlazada.
- Un botón al Excel con todas las de la semana.
- La línea fija: *«¿Te interesa alguna? Respóndeme "quiero esta" y te digo a quién escribir dentro.»*
- Y una línea de que esto, a diario y filtrado por lo que vende cada uno, es Neety, sin automatismo ni volumen.
- Asunto con A/B, como desde el 3/12 (`§5`).

**Hace falta doctrina nueva:** una sección `§5S` en `email-marketing.md` con la forma de este correo, en el mismo commit que el resto de la estructura. *Llamada del constructor:* si lo monta una variante de `montar-radar-correo.py` o un script nuevo, y qué reglas de `validar-email.py` le aplican.

**Lo que hace la rutina cada lunes:**
1. **Busca las inversiones en España de la semana anterior** (lunes a domingo), igual que el Radar de hoy; Europa y EE. UU. quedan fuera de la v1. Usa el brief del Radar (`~/Desktop/seo/brief-radar-inversiones-industriales.md`): mismas fuentes, mismo filtro y las mismas columnas de la tabla de la edición.
   - Hoy nadie alimenta el Radar cada semana: la edición de noviembre no se toca desde el 17/11. Así que esta búsqueda la hace la rutina.
   - La rutina de señales de mercado del lunes (`~/Desktop/senales-mercado/`) puede servir de pista. Sus empresas se eligen para Neety, no para el lector, así que no se copian sin pasar el filtro del Radar.
2. **Las guarda en `newsletter/semanas/AAAA-Wnn.md`**, con el formato de la tabla del Radar y una fila por inversión.
   - Al cerrar el mes, esos ficheros son la base de la edición mensual. Así el Radar del mes deja de hacerse de cero y no hay dos tablas que se contradigan.
   - La rutina no escribe en el fichero de la edición: ese es de la sesión que publica el Radar («Neety programa y despliegue»). A esa sesión se le dice que, desde diciembre, monte la edición partiendo de `newsletter/semanas/` y añada lo que falte.
   - **Quien da por buena una fila es Iker**, en la revisión del lunes. Una fila que él no ha visto no va en el correo ni en el Radar.
3. **Elige las 5 a 8 mejores**, genera el Excel de la semana (`scripts/radar-excel.py`) y lo deja listo para colgar en `neety.com/para-ti/inversiones-AAAA-Wnn`, sin indexar.
   - *Llamada del constructor:* cómo se sube el archivo al repo `landing` (PR o publicación directa).
4. **Escribe el correo**, lo monta con su HTML y lo sube a la página Newsletter como `borrador` con `neety_newsletter_publicar`. En el porqué dice qué filas son nuevas y de qué fuente sale cada una.
5. **Crea la campaña en Brevo como borrador, sin programar**: listas 15, 16 y 19, excluyendo «En bienvenida». La vincula con `neety_newsletter_vincular`. No la programa ni la envía: si quedara programada, saldría sola salvo que alguien la parase, y eso es la opción que se descartó.
6. **Le deja a Iker un resumen corto**: cuántas inversiones, cuáles van en el correo, qué dudas hay en los datos y el enlace a la página Newsletter.

**Lo que hace Iker el lunes:** revisa las filas y el correo en la página Newsletter, lo aprueba y programa la campaña en Brevo para el martes a las 09:05. Si se lo pide a Claude en la conversación, la programa Claude. Si algo está mal, lo dice y se corrige antes.

**La primera semana de cada mes no hay aviso semanal:** sale el Radar del mes (§5R) a la newsletter y a la audiencia del Radar en una sola campaña. Un correo por persona y semana.

**Si una semana no hay material** (menos de 5 inversiones que pasen el filtro), la rutina lo dice y no inventa ni rellena. Iker decide si sale con menos o se salta la semana.

### 4.4 · Las respuestas (rutina `contenido-respuestas-auto`, lunes a viernes)

- **Dónde llegan.** Hoy los correos salen desde `hola@neety.com`. En el Gmail de Iker no aparece ninguna respuesta a `hola@` en los últimos 60 días, así que no está claro que le lleguen. Propuesta: la respuesta del correo semanal, de la bienvenida **y del Radar del 3/12** (el que pide el «sí») va a `iker@neety.com`, que es quien firma. Lo del Radar tiene que estar cambiado antes del 3/12, o los «sí» se pierden. *Llamada del constructor:* comprobarlo con un envío de prueba antes de activar nada.
- **Qué hace la rutina cada día:**
  1. **Lee las respuestas nuevas** a los correos de la newsletter y las clasifica: «quiero esta», «sí» (de la lista 23), baja, otra cosa.
  2. **Para cada «quiero esta» deja un borrador en Gmail** (no lo envía). Lleva el cargo al que conviene escribir dentro de esa empresa y por qué, sacado de la columna «qué puede necesitar» y del brief, en 3 a 5 líneas, y una línea de que eso es lo que Neety hace a diario. Sin nombres de personas ni datos de contacto.
  3. **Si el lector no dice qué vende**, el borrador se lo pregunta en una línea. Esa respuesta es el sector que servirá para filtrar en la fase siguiente.
  4. **Apunta cada respuesta en `newsletter/respuestas.md`**: quién (correo enmascarado en el resumen), qué empresa pidió, su sector si lo dijo, la fecha y si ya se le contestó.
  5. **Avisa a Iker** cuando alguien pide su segunda empresa o pregunta por Neety: *«este está para la reunión»*. La reunión la propone Iker en persona, no la rutina.
  6. **Los «sí» de la lista 23** los deja en una lista para que Iker los pase a la lista 15.
- No escribe en el CRM en la v1. Si Iker quiere, el paso 5 puede crear la ficha más adelante.

### 4.5 · La medición

- Entra en la rutina de medición de los jueves: cada correo semanal a los 3 y 7 días, en sus `notas` por el MCP.
- **Por correo:**
  - apertura real;
  - clic único sobre entregados (mínimo 5 %, éxito 8 %, `§5`);
  - respuestas «quiero esta»;
  - bajas por entregado. Se para y se revisa si un correo pasa del 3 %.
- **Del embudo, cada mes:**
  - cuántos responden «quiero esta»;
  - cuántos repiten;
  - cuántos acaban en reunión con su `utm_campaign`. Es la cifra que importa.
- **La bienvenida:** apertura y clic de cada uno de sus tres correos y cuántos responden en el día 3.

## 5 · Calendario

| Fecha | Qué sale |
|---|---|
| jue 3/12 | Radar de noviembre (§5R), a las dos audiencias, con la pregunta del «sí» |
| mié 9/12 (el 8 es festivo) | **Primer aviso semanal** (semana del 30/11 al 6/12). Sustituye al correo 17 |
| mar 15/12 | Aviso semanal. Sustituye al correo 18 (inversiones por sector, que puede ser su ángulo) |
| mar 22/12 | Se mantiene el correo 19 (la plantilla del plan de cuentas 2027, con 5 ejemplos del Radar), porque ya va de inversiones |
| 29/12 | Sin correo (Navidad) |
| ene, 1.ª semana | Radar de diciembre |

**La bienvenida** se activa cuando Iker apruebe sus tres correos, idealmente antes del 3/12, para que la reciban los que digan «sí».

## 6 · Lo que hace falta antes de arrancar

1. Que Iker apruebe este diseño.
2. Comprobar a qué buzón llegan las respuestas, y que el Radar del 3/12 responda a `iker@` (§4.4). **Antes del 3/12.**
3. Separar en el CRM a los 24 entre Radar y mapas, para que el Radar del 3/12 no les llegue a los de los mapas (§4.1). **Antes del 3/12.**
4. Ver en el catálogo de automatizaciones de Brevo qué pasos y disparadores tiene esta cuenta (§4.2).
5. Cómo se cuelga cada semana el Excel en `neety.com/para-ti/` (§4.3, paso 3).

## 7 · Lo que se deja al constructor

- El texto de los tres correos de la bienvenida y del primer aviso semanal, con la doctrina de `email-marketing.md`.
- El script que monta el HTML del aviso semanal y qué reglas del validador le aplican.
- La hora exacta de las dos rutinas dentro del lunes y de los días laborables, escalonadas con las que ya hay (`rutinas.md`), y sus ficheros en `rutinas/newsletter.md` y `rutinas/respuestas.md`.
- La forma de hacer el «sin doble flujo» en Brevo, si no hay pasos de lista.
- Los permisos de las rutinas nuevas en `rutinas/permisos-propuestos.json`: lo seguro lo hacen solas, y enviar, activar o escribir a contactos nunca.
