/**
 * Clasificador de PILAR de contenido.
 *
 * POR QUE EXISTE
 * --------------
 * `hook_type` y `post_structure` describen COMO esta escrito un post. Lo que
 * faltaba era el QUE: a que formato de nuestra parrilla pertenece. Sin eso, al
 * mirar la tabla de resultados se comparaban peras con manzanas — un meme (que
 * es corto por diseño y vive de la imagen) contra un mapa (2.000 caracteres y
 * 20 menciones) — y se sacaban conclusiones falsas del tipo "los posts cortos
 * van mal", cuando lo corto era simplemente que eran memes (Iker, 2026-07-27).
 *
 * Los cuatro pilares y su señal, tal y como los definio Iker:
 *   · peloteo_mapa   — foto de un mapa + bloque de ~20 menciones (5x4)
 *   · peloteo_los10  — foto que pone "los 10" + bloque de ~10 menciones
 *   · peloteo_objeto — el DESPIECE: un objeto partido en piezas, y cada pieza
 *                      con la empresa que la fabrica ("→ Los frenos: @X - @Y")
 *   · lead_magnet    — el cuerpo pide EXPLICITAMENTE "comenta <palabra>"
 *   · meme           — el motor es la IMAGEN y el cuerpo es corto por diseño.
 *                      Las risas disparadas (>25%) confirman, pero NO se exigen
 *   · historia       — anecdota personal en primera persona (pilar nuevo)
 *   · otro           — lo que no encaja; mejor null-ish que una etiqueta falsa
 *
 * REGLA DE ORO: ante la duda, 'otro'. Una etiqueta inventada contamina el
 * analisis mas que un hueco, porque un hueco se ve y una etiqueta mal no.
 *
 * ⛔ TOCAR ESTE FICHERO NO ARREGLA LO QUE YA ESTA CLASIFICADO. El pilar se
 * escribe al ingerir el post, asi que un post que entro con las reglas viejas
 * se queda con la etiqueta vieja para siempre. Despues de cambiar una regla y
 * desplegar hay que RELANZAR `POST /api/posts/classify-pillars`.
 * Paso por no hacerlo (Iker, 2026-08-13): la historia de Iker se publico a las
 * 10:55 y el fix de `contarPreteritos` se commiteo a las 11:04, nueve minutos
 * despues. El clasificador estaba bien; lo que faltaba era el reproceso, y el
 * post se quedo etiquetado `meme` hasta que Iker lo vio en la parrilla.
 *
 * ✅ Y DESDE EL 20/08 NO HACE FALTA ESPERAR A UN COMMIT PARA ARREGLAR UNA
 * ETIQUETA SUELTA: en Accounts se pulsa el badge del pilar y se cambia a mano
 * (`routes/pillars.ts` + `components/accounts/PilarSelector.tsx`). Eso marca
 * `pillar_manual`, asi que el reproceso respeta la correccion. Tocar las reglas
 * de aqui sigue siendo lo correcto cuando el clasificador falla EN PATRON —un
 * formato entero mal leido—, no cuando falla en un post.
 *
 * ⚠️ El catalogo de pilares vive ahora en la tabla `pillars`, no en una lista de
 * codigo. Si se añade un pilar NUEVO aqui, hay que sembrarlo tambien en la
 * migracion: si no, el clasificador escribira un slug que el desplegable no
 * conoce y el badge lo pintara en gris con el nombre crudo.
 */

/**
 * VERSION DE LAS REGLAS. Se sube A MANO cada vez que se cambia como clasifica
 * este fichero, y solo entonces.
 *
 * Para que sirve: al arrancar, el backend compara esta cadena con la ultima
 * guardada en `app_state`. Si son distintas reprocesa el historico UNA vez y
 * apunta la nueva; si son iguales no toca nada. Asi se cumplen las dos cosas
 * que pidio Iker (2026-08-13): que **cada despliegue reprocese solo** cuando
 * hay reglas nuevas, y que **NO se reclasifique cada dia** cuando no las hay.
 *
 * ⚠️ Si cambias una regla y NO subes la version, el historico se queda con las
 * etiquetas viejas — que es exactamente lo que paso el 13/08 con la historia
 * de Iker: el fix llego 9 minutos despues de publicar y nadie reproceso.
 */
export const PILLAR_RULES_VERSION = '2026-10-15.historia-evento';

export type Pillar =
  | 'peloteo_mapa'
  | 'peloteo_los10'
  | 'peloteo_objeto'
  | 'lead_magnet'
  | 'meme'
  // Subtipos del meme (30/10): solo a mano, el clasificador emite 'meme'.
  | 'meme_desgaste'
  | 'meme_captura'
  | 'meme_grafica'
  | 'meme_traductor'
  | 'meme_personaje'
  | 'historia'
  | 'historia_evento'
  | 'evento'
  | 'otro';

export interface PillarInput {
  content_text: string | null;
  reaction_mix?: Record<string, number> | null;
  content_type?: string | null;
}

/**
 * Cuenta las FICHAS del bloque de peloteo: "→ Empresa - Persona".
 *
 * No basta con contar flechas. Usamos "→" tambien como viñeta normal (ofertas
 * de empleo, listas de ventajas), y sin filtrar, un post de "Busco un Full
 * Stack Developer" con 6 viñetas se clasificaba como peloteo. La ficha de
 * peloteo SIEMPRE empareja empresa y persona con un guion en medio, y esa es
 * la firma que se exige aqui.
 */
function contarMenciones(texto: string): number {
  return texto
    .split('\n')
    .filter((l) => {
      const s = l.trim();
      if (!s.startsWith('→')) return false;
      const cuerpo = s.slice(1).trim();
      return SEPARADOR.test(cuerpo) && cuerpo.length > 8;
    }).length;
}

/**
 * El guion que separa empresa de persona.
 *
 * Era ' - ' literal y eso tiraba fichas reales (Iker, 2026-08-10): en el
 * despiece de Navarra, "→ La direccion: Lizarte S.A.U.- Oscar Huarte Azpiroz"
 * no contaba, porque el punto de "S.A.U." se come el espacio de delante del
 * guion. Se acepta el guion precedido de espacio O de punto. Lo que sigue
 * exigiendo es el espacio de DETRAS, que es lo que impide contar como ficha un
 * nombre compuesto tipo "Mercedes-Benz".
 */
const SEPARADOR = /(?:\s|\.)[-–—]\s/;

/**
 * Fichas de peloteo SIN persona: "→ Gonvarri Industries", "→ Las llantas:
 * Mapsa S. Coop.".
 *
 * POR QUE EXISTEN (Iker, 2026-08-10): la receta permite desde el 06/08 llevar
 * empresas sin persona verificada — "eso no me parece bien" fue la respuesta a
 * quitar las 12 empresas porque 8 no tenian nombre. Pero el clasificador seguia
 * definiendo la ficha como empresa+persona, asi que el despiece de Navarra, con
 * 8 de 12 fichas sin persona, conto 5 y se quedo a UNA del umbral. Se etiqueto
 * 'otro' un despiece de manual.
 *
 * Se exige que la linea sea CORTA y sin punto final: un nombre de empresa, no
 * una frase. Es lo que separa esto de las viñetas de una oferta de empleo
 * ("→ Trabajaras codo con codo con los fundadores.").
 */
function contarFichasSinPersona(texto: string): number {
  return texto
    .split('\n')
    .filter((l) => {
      const s = l.trim();
      if (!s.startsWith('→')) return false;
      const cuerpo = s.slice(1).trim();
      if (SEPARADOR.test(cuerpo)) return false; // ya la cuenta contarMenciones
      const nombre = cuerpo.includes(':') ? cuerpo.slice(cuerpo.indexOf(':') + 1).trim() : cuerpo;
      if (nombre.length < 3 || nombre.length > 60) return false;
      // Sin punto final: una empresa no lo lleva, una frase si. Se descuenta
      // antes la forma juridica, que acaba en punto de forma legitima
      // ("Mapsa S. Coop.", "Plasticos Brello, S.A.").
      const sinForma = nombre.replace(/,?\s*(S\.\s?A\.(\s?U\.)?|S\.\s?L\.(\s?U\.)?|S\.\s?Coop\.|Coop\.)$/i, '').trim();
      return !/[.!?]$/.test(sinForma);
    }).length;
}

/**
 * Cuenta las fichas que llevan CIFRA, que es lo que separa "los 10" del mapa.
 *
 * Contar menciones ya no vale (Iker, 2026-07-31). El umbral era 13 porque el
 * mapa llevaba 16 o 20 fichas y "los 10" llevaba 10, pero §4.0c bajo el suelo
 * del mapa a 10 para no repetir empresa, y el mapa de Asturias salio con 12 y
 * se clasifico como "los 10". El numero ya no distingue nada.
 *
 * Lo que SI distingue es la forma de la ficha, y no cambia nunca:
 *   · "los 10" → "→ @Persona - @Empresa · récord de 806M€, +19%"
 *                cada empresa entra con SU cifra verificada y su fuente, que
 *                es el nucleo del pilar.
 *   · mapa     → "→ @ArcelorMittal - @José Gómez García"
 *                la ficha va desnuda; los datos viven en el cuerpo, no aqui.
 */
function contarFichasConCifra(texto: string): number {
  return texto
    .split('\n')
    .filter((l) => {
      const s = l.trim();
      if (!s.startsWith('→')) return false;
      const cuerpo = s.slice(1).trim();
      if (!/ - | – | — /.test(cuerpo)) return false;
      // El separador "·" abre la cifra, y detras tiene que haber un digito.
      return /·/.test(cuerpo) && /\d/.test(cuerpo.split('·').slice(1).join('·'));
    }).length;
}

/**
 * % de reacciones que son risa. Es la firma del meme: la gente reacciona con
 * 😂, no con 👍. Se aceptan las dos claves porque LinkedIn ha usado ambas
 * (ENTERTAINMENT es la actual, FUNNY la heredada) — mismo criterio que el
 * filtro de memes de la pagina de Inspiration.
 */
export function pctRisa(mix: Record<string, number> | null | undefined): number | null {
  if (!mix) return null;
  const total = Number(mix.total) || 0;
  if (!total) return null;
  const risa = (Number(mix.FUNNY) || 0) + (Number(mix.ENTERTAINMENT) || 0);
  return risa / total;
}

const UMBRAL_RISA = 0.25;

/**
 * Fichas del DESPIECE. Se distinguen de las del mapa y de "los 10" por llevar
 * la PIEZA delante y dos puntos: "→ Los frenos: @Empresa - @Persona". Los otros
 * dos formatos van directos a "→ @Empresa - @Persona", sin pieza y sin ":".
 */
function contarPiezas(texto: string): number {
  return texto
    .split('\n')
    .filter((l) => {
      const s = l.trim();
      if (!s.startsWith('→')) return false;
      const cuerpo = s.slice(1).trim();
      const dosPuntos = cuerpo.indexOf(':');
      if (dosPuntos < 1) return false;
      // LA PERSONA ES OPCIONAL (Iker, 2026-08-10). Antes se exigia el guion
      // empresa-persona detras de los dos puntos, y con eso el despiece de
      // Navarra conto 5 de sus 12 piezas: las otras 7 solo llevaban empresa,
      // porque no habia persona verificada. La firma del despiece es la PIEZA,
      // no la persona.
      const pieza = cuerpo.slice(0, dosPuntos).trim();
      const quien = cuerpo.slice(dosPuntos + 1).trim();
      // La pieza es un sustantivo corto ("Los frenos", "El bloque del motor"),
      // nunca una frase. Es lo que impide contar "→ Nota: ..." como despiece.
      return pieza.length >= 3 && pieza.length <= 40 && quien.length >= 3;
    }).length;
}

/**
 * ¿El cuerpo tiene forma de meme? Señal ESTRUCTURAL, disponible el dia que se
 * publica, al contrario que las risas.
 *
 * POR QUE HIZO FALTA (Iker, 2026-07-29): el clasificador solo miraba el % de
 * risa, que es un RESULTADO, asi que **solo reconocia los memes que ya habian
 * funcionado**. El meme del tatuaje del 29/07 se estaba haciendo viral y estaba
 * etiquetado como 'otro' porque LinkedIn aun no habia acumulado reacciones. Un
 * clasificador que necesita que el post triunfe para saber lo que es no sirve
 * para comparar dentro del pilar, que es justo para lo que se creo.
 *
 * En un meme el motor es la imagen: el texto es corto por diseño (la receta
 * pide 3-6 lineas de cuerpo). Se exige ademas que NO abra como lead magnet,
 * que esos tambien llevan imagen y a veces son cortos.
 */
function pareceMeme(texto: string): boolean {
  const lineas = texto.split('\n').filter((l) => l.trim()).length;
  // 850/18 medido contra los memes REALES de las 3 cuentas (Iker, 2026-07-29),
  // no elegido a ojo. Con 700 se quedaba fuera el meme del tiburon (750 car,
  // 13 lineas, 1.63x), que es el mas largo que hemos publicado. El siguiente
  // post por encima de ese umbral ya NO es meme: el "pais inventado" de Unai
  // (885 car), que es su propio formato con dibujo. La linea cae en ese hueco.
  if (texto.length > 850 || lineas > 18) return false;
  const arranque = texto.slice(0, 60).toUpperCase();
  if (arranque.includes('🚨') || arranque.includes('ÚLTIMA HORA') || arranque.includes('ULTIMA HORA')) return false;
  // ⛔ Y SI NARRA EN PASADO, NO ES UN MEME: ES UNA HISTORIA (Iker, 2026-08-12).
  //
  // Esta funcion no reconoce un meme, solo dice "esto es corto y lleva imagen",
  // asi que se traga cualquier post de prosa breve con foto. Las 14 historias de
  // la base pasaban de 850 caracteres y por eso colaban por debajo; la del 13/08
  // mide 708 y salio etiquetada `meme` en Accounts.
  //
  // El corte esta MEDIDO: de los 62 memes de menos de 850 caracteres que tenemos
  // publicados, ninguno llega a 4 verbos en preterito (el maximo son 3), y la
  // historia del 13/08 tiene 4. Se sale por aqui y la recoge `pareceHistoria`.
  //
  // Y NO se usa la foto como señal. Iker afino la pista el 13/08 —una historia
  // lleva selfie SUJETANDO EL MOVIL CON LA MANO, y a ojo se ve en medio segundo—
  // pero eso sigue siendo invisible aqui: el meme tambien lleva imagen y en la
  // base las dos son `text_image`, asi que lo unico que sabemos del fichero es
  // que existe. Distinguir un selfie de un wojak pide vision por ordenador, que
  // el backend no tiene. La pista vale para el HUMANO que mira la parrilla y
  // esta escrita en `post-workflow §4.6-FOTO`; al script hay que seguir
  // diciendoselo por el TEXTO, y ahi el tiempo verbal si separa una escena de
  // un chiste.
  if (contarPreteritos(texto) >= 4) return false;
  return true;
}

/**
 * ¿El cuerpo pide comentar una palabra? Es el gate del lead magnet, y va
 * siempre en las ultimas lineas ("Comenta \"subvencion\" y te la envio").
 * Se exige que la peticion este en el ULTIMO TERCIO para no confundirla con un
 * "comenta que te parece" suelto a mitad de un post cualquiera.
 */
function pideComentarPalabra(texto: string): boolean {
  const cola = texto.slice(Math.floor(texto.length * 0.6));
  return /\bcomenta\w*\b[^.\n]{0,40}["“«'']?[A-Za-zÁÉÍÓÚÑáéíóúñ]{3,}["”»'']?/i.test(cola)
    || /\bcomenta\w*\s+(la\s+palabra|["“«''])/i.test(cola);
}

/**
 * El CTA NUEVO del lead magnet, el que sustituyo al gate (Iker, 2026-08-11).
 *
 * POR QUE HACIA FALTA: `pideComentarPalabra` era la UNICA senal de este pilar, y
 * el "comenta la palabra X" esta muerto desde el 05/08/2026 — LinkedIn dejo de
 * repartirlo (`post-workflow §4.5.0-CTA`). Asi que el lead magnet de Iker del
 * 11/08, que es el que confirmo el diagnostico, entro en la base como 'otro'.
 * Cambiamos la receta y no revisamos el clasificador que codificaba la vieja.
 *
 * La firma del CTA nuevo son tres cosas juntas, y se exigen las tres porque por
 * separado cada una aparece en cualquier post: una PREGUNTA ofreciendo el
 * recurso, decir que se comparte GRATIS, y cerrar con CONECTA CONMIGO (que hace
 * falta para poder mandarlo por privado). Las tres viven en el ultimo tercio.
 */
const ENLACE_RE = /https?:\/\/|\b\w+\.(com|es|app|io|ai)\b/i;

const ENTREGABLE_RE =
  /\b(gu[ií]a|sistema|plantillas?|checklist|playbook|framework|prompts?|hoja|dossier|manual|recurso|biblioteca|instrucciones)\b/i;

function pideConectar(texto: string): boolean {
  const cola = texto.slice(Math.floor(texto.length * 0.6));
  const pregunta = /¿[^?]{5,90}\?/.test(cola);
  const gratis = /\b(gratis|gratuit\w+|acceso libre|sin coste)\b/i.test(cola);
  const conecta = /\bconecta\s+conmigo\b/i.test(cola);
  // ⛔ LA TERCERA PATA YA NO PUEDE SER "CONECTA CONMIGO" (Iker, 2026-08-18).
  //
  // Esa frase salio del pilar el 18/08 (`post-workflow §4.5.0-CTA-CERO`): con
  // ella el post de Unai se quedo en 40 impresiones en 20 minutos y sin aparecer
  // en ningun feed; sin ella, en el feed Principal de las 3 cuentas en 4 minutos.
  // Y este clasificador la EXIGIA, asi que ese mismo post entro en la base como
  // 'meme' por llevar foto. Es la SEGUNDA vez que pasa lo mismo: la primera fue
  // con "comenta" el 05/08. Cambiamos la receta y el clasificador se queda
  // codificando la regla muerta.
  //
  // Asi que la tercera pata pasa a ser el ENTREGABLE, y no por comodidad: es el
  // unico invariante del pilar que LinkedIn no puede prohibir. Su lista negra va
  // contra PETICIONES DE ACCION —comenta, conecta, comparte, guarda— y nombrar
  // la cosa que regalas no es pedir nada. Un lead magnet sin entregable nombrado
  // no existe: el entregable ES lo que se ofrece.
  //
  // `conecta conmigo` se queda como ALTERNATIVA, no como requisito, para que los
  // posts viejos que siguen en la base no se caigan del pilar al reclasificar.
  const entregable = ENTREGABLE_RE.test(cola);
  // CUARTA PATA, y es la que mata los falsos positivos: un lead magnet NUNCA
  // lleva enlace en el cuerpo (`post-workflow §4.5.0-CTA`, calcado de los
  // referentes) y un mapa SIEMPRE lo lleva, porque su cierre es el enlace al
  // mapa. Medido sobre los 258 posts de las 3 cuentas: sin esta condicion el
  // mapa de Cataluna del 30/04 entraba como lead magnet; con ella, los falsos
  // positivos bajan de 4 a 1, y el que queda es un post de 2025 archivado como
  // 'otro'.
  const sinEnlace = !ENLACE_RE.test(cola);
  return pregunta && gratis && (entregable || conecta) && sinEnlace;
}

/**
 * Post de EVENTO: el que anuncia una jornada nuestra y lleva el enlace de
 * inscripcion de Luma.
 *
 * POR QUE VA POR EL ENLACE Y NO POR EL TEXTO (Iker, 2026-08-11): el anuncio del
 * evento del 11/08 lleva 8 fichas "→ Marca" con las empresas colaboradoras, asi
 * que el clasificador lo dio por `peloteo_mapa` — la forma es identica. Lo unico
 * que NINGUN otro pilar tiene es el enlace de Luma: en el evento hace de spam
 * ninja (`global §4.4b`) y en el resto el enlace es siempre recursos.neety.com.
 * Por eso se comprueba ANTES que el peloteo, que si no gana el bloque de fichas.
 */
/**
 * La ESCENA es nuestro evento, no solo el ninja (Iker, 2026-10-15). Es lo que
 * separa 'historia_evento' de 'historia': las historias de septiembre llevan
 * "El 24 montamos un evento presencial en Donostia" como contexto del ninja y
 * son historias puras, asi que `evento` a secas no vale. Lo que si delata la
 * escena: el nombre del evento, "nuestro evento", el photocall o la
 * acreditacion colgada.
 */
export function hablaDeNuestroEvento(texto: string): boolean {
  return /neety forward|forward\.neety\.com|nuestro evento|photocall|acreditaci[oó]n/i.test(texto);
}

function esEvento(texto: string): boolean {
  return /\b(luma\.com|lu\.ma)\b/i.test(texto);
}

/**
 * Verbos en PRETERITO: la firma de que un texto NARRA.
 *
 * POR QUE ESTA ES LA SEÑAL BUENA DE LA HISTORIA (Iker, 2026-08-12): una historia
 * es una ESCENA QUE YA PASO, asi que va en preterito — pregunté, plantó, soltó,
 * llevé. Un meme esta casi siempre en PRESENTE, porque describe una situacion
 * general que se repite: "Nadie te avisa", "Empiezas llamando a puerta fria",
 * "Un comercial cambia de humor mas veces en un dia que tu en un mes".
 *
 * MEDIDO, no elegido a ojo, sobre los 65 memes y las 14 historias de la base:
 *   · de los 62 memes de menos de 850 caracteres (los unicos que llegan a la
 *     rama del meme), el que mas tiene son 3 preteritos. NINGUNO llega a 4.
 *   · la historia del 13/08 tiene 4, y las de la base van de 4 a 7.
 * Por eso el umbral es 4: es el hueco real entre las dos poblaciones.
 *
 * ⚠️ SOLO PRETERITO, y el imperfecto (-aba, -ia) se queda FUERA a proposito:
 * arrastra sustantivos ("sangria", "tecnologia", "dia") y condicionales
 * ("firmaria"), que no narran nada. Con el imperfecto dentro, el meme del
 * tiburon empataba con la historia y el umbral dejaba de separar.
 *
 * ⚠️ Y EL LIMITE DE PALABRA ES A MANO. En JavaScript `\b` es solo ASCII, asi
 * que las tildes cuentan como separador: `\b\w+ó\b` casa con "reunió" DENTRO de
 * "reunión", y con eso salian 6 preteritos en textos que no tenian ninguno.
 * La primera version de este contador estaba mal por esto y la medicion entera
 * que saque de ella era basura.
 */
const LETRA = 'a-záéíóúñü';
const PRETERITO = new RegExp(`(?<![${LETRA}])[${LETRA}]{2,}(?:é|ó|aron|ieron|yeron)(?![${LETRA}])`, 'g');
/** Acaban en tilde y no son verbos. */
const FALSO_PRETERITO = new Set([
  'que', 'porque', 'asi', 'aqui', 'ahi', 'alli', 'cafe', 'jose', 'ole', 'ademas',
  'quizas', 'jamas', 'despues', 'tambien', 'segun', 'bebe', 'puree',
]);
function contarPreteritos(texto: string): number {
  return (texto.toLowerCase().match(PRETERITO) || []).filter(
    (w) => !FALSO_PRETERITO.has(w.normalize('NFD').replace(/[̀-ͯ]/g, ''))
  ).length;
}

/**
 * Anecdota personal: abre con una ESCENA propia y esta CONTADA EN PASADO, sin
 * lista de menciones ni gate de comentario.
 *
 * ⛔ POR QUE YA NO BASTA CON CONTAR "yo/me/mi" (Iker, 2026-08-12): la version
 * anterior exigia 4 pronombres de primera persona y la historia del 13/08 solo
 * tiene 3, asi que se caia a 'otro' — o peor, a 'meme'. Y no era un descuido de
 * redaccion: el propio pilar recomienda **contar lo que le paso a un tercero**
 * ("hablar de un tercero rinde mas que hablar de uno mismo", `global §4.4b`),
 * y en cuanto el protagonista es otro los pronombres desaparecen aunque el post
 * sea una historia de manual. Contar pronombres medía quien es el protagonista,
 * no si hay historia.
 *
 * Lo que sí distingue una historia de todo lo demas es que **narra**: abre con
 * una escena en primera persona y sigue en pasado. Se aceptan las dos señales
 * (pronombres O pasado) para no tumbar las 14 historias viejas, que van llenas
 * de "yo".
 *
 * ⚠️ La FOTO no sirve de señal AQUI, y no por falta de señal sino de ojos: la
 * pista de Iker del 13/08 (selfie sujetando el movil con la mano) es buenisima
 * para el humano y esta en `post-workflow §4.6-FOTO`, pero en la base tanto el
 * meme como la historia son `text_image` y el backend no ve la imagen.
 */
function pareceHistoria(texto: string): boolean {
  const primeras = texto.split('\n').slice(0, 3).join(' ').toLowerCase();
  const abrePersonal =
    // "nunca he/hemos" (16/10): en español de España la experiencia hasta hoy va en
    // preterito perfecto ("Nunca he visto…"), y el gancho tambien abre escena propia.
    /(^|\s)(mi |mis |me |nunca (me|habia|he|hemos)|cuando (yo|tenia|empece)|hace \w+ (años|meses|semanas)|la primera vez|acab[eé]|empec[eé]|recuerdo)/.test(
      primeras
    ) ||
    // Un preterito en el arranque tambien abre escena: "Le pregunté…", "Salí…",
    // "Aquel dia se plantó…". Es como abre media vara del pilar (Josh Braun: "I
    // [algo que me paso]") y la version anterior no lo veia.
    contarPreteritos(primeras) >= 1;
  const yoes = (texto.match(/\b(yo|me|mi|mis|conmigo|acab[eé]|sal[ií]|llegu[eé]|ten[ií]a|hab[ií]a|estaba|sent[ií])\b/gi) || [])
    .length;
  return abrePersonal && (yoes >= 4 || contarPreteritos(texto) >= 4);
}

/**
 * Clasifica un post en su pilar.
 *
 * ORDEN DELIBERADO (de la señal mas inequivoca a la mas interpretable):
 *  1. fichas con pieza   → peloteo_objeto (despiece); van antes porque tambien
 *                          cuentan como mencion y si no caerian en "los 10"
 *  2. bloque de menciones → peloteo (y el numero de fichas separa mapa de "los 10")
 *  3. gate de comentario  → lead magnet
 *  4. imagen + risas O imagen + cuerpo corto → meme
 *  5. escena personal     → historia
 *  6. lo demas            → otro
 */
export function classifyPillar(post: PillarInput): Pillar {
  const t = (post.content_text || '').trim();
  if (!t) return 'otro';

  // 1. Peloteo regional. El bloque de "→" solo existe en estos tres formatos y
  // se separan por la FORMA de la ficha, de la mas marcada a la mas sobria:
  //
  //   objeto → "→ La forja: @Alcorta - @Pedro Alvarez"      (pieza + dos puntos)
  //   los 10 → "→ @Silvia - @UNICA · récord de 806M€"       (cifra tras el "·")
  //   mapa   → "→ @ArcelorMittal - @José Gómez García"      (desnuda)
  //
  // El despiece va PRIMERO porque sus fichas tambien cuentan como mencion.
  // 0. EVENTO, antes que nada: su bloque de colaboradores es indistinguible del
  // de un peloteo, asi que si se comprueba despues siempre pierde.
  //
  // ⛔ DESDE EL 15/10 EL ENLACE DE LUMA YA NO BASTA (Iker): el ninja de cada
  // historia lleva al webinar por Luma, y todas salian 'evento'. Ahora:
  //   narra + la escena es nuestro evento → historia_evento
  //   no narra + Luma                     → evento (el anuncio)
  //   narra + Luma solo en el ninja       → sigue bajando y acaba en historia
  const narra = pareceHistoria(t);
  if (narra && hablaDeNuestroEvento(t)) return 'historia_evento';
  if (esEvento(t) && !narra) return 'evento';

  const piezas = contarPiezas(t);
  if (piezas >= 6) return 'peloteo_objeto';

  // Las fichas sin persona SUMAN, pero no mandan solas: se exigen al menos 3
  // con persona. Sin ese suelo volveria el fallo que motivo `contarMenciones`
  // — la oferta de "Busco 2 SDRs Junior", con 6 viñetas "→", se clasificaba
  // como peloteo. Un peloteo real siempre nombra a alguien; lo que ya no se
  // exige es que los nombre a TODOS.
  const conPersona = contarMenciones(t);
  const menciones = conPersona + contarFichasSinPersona(t);
  if (menciones >= 6 && conPersona >= 3) {
    // "Los 10" mete la cifra de cada empresa DENTRO de la ficha; el mapa no.
    // Se pide mayoria (>=60%) y no todas, porque alguna ficha puede quedarse
    // sin dato si no se pudo verificar. Se exige ademas <=12 fichas: "los 10"
    // son 10 por definicion, asi que una lista mas larga es mapa aunque lleve
    // cifras. Antes esto se decidia SOLO por numero (>=13 = mapa) y el mapa de
    // Asturias, con 12 fichas, se clasifico mal (Iker, 2026-07-31).
    const conCifra = contarFichasConCifra(t);
    if (menciones <= 12 && conCifra >= Math.ceil(menciones * 0.6)) return 'peloteo_los10';
    return 'peloteo_mapa';
  }

  // 2. Lead magnet, por sus DOS CTAs: el gate viejo (posts anteriores al
  // 05/08/2026, que siguen en la base) y el nuevo de pregunta + gratis +
  // conecta conmigo. Con solo el viejo, los lead magnets de ahora caian en
  // 'otro' — que es lo que le paso al del 11/08.
  if (pideComentarPalabra(t) || pideConectar(t)) return 'lead_magnet';

  // 3. Meme. Solo con imagen: un texto pelado no es un meme aunque haga gracia.
  // Dos señales, y basta con UNA:
  //   a) las risas disparadas — inequivoca, pero solo existe si el post ya
  //      acumulo reacciones, asi que no sirve el dia 1 ni con un meme flojo;
  //   b) la forma del cuerpo — corto y sin apertura de lead magnet, disponible
  //      desde el minuto cero y sin depender de como haya ido.
  const conImagen = !!post.content_type && post.content_type !== 'text';
  if (conImagen) {
    const risa = pctRisa(post.reaction_mix);
    if (risa !== null && risa > UMBRAL_RISA) return 'meme';
    if (pareceMeme(t)) return 'meme';
  }

  // 4. Historia personal. Llega aqui todo lo que no es meme, incluido el post
  // corto con foto que NARRA en pasado, que `pareceMeme` deja pasar a proposito.
  if (pareceHistoria(t)) return 'historia';

  return 'otro';
}
