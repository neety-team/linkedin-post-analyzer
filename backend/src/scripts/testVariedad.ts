/**
 * Prueba de la VARIEDAD DE CONCEPTO y del FORMATO de los comentarios de apoyo
 * (Google Chat) y de las respuestas a comentarios (Iker, 2026-10-01).
 *
 * El fallo que la motiva, MEDIDO el 01/10 sobre lo publicado (Unipile):
 *   · respuestas en peloteos: 3 de 3 en "Las 10" de CLM, 4 de 5 en el despiece
 *     de Bizkaia y 7 de 12 en el mapa de Extremadura repiten LA MISMA IDEA, que
 *     es la tesis del post: "nadie lo ve", "en silencio", "debajo del radar",
 *     "antes de que nadie hablara de...".
 *   · respuestas del video de Unai: 3 de 3 repiten "no saber a quien llamar".
 *   · Google Chat de "Las 10": 4 de 5 con la misma idea, y el quinto era
 *     "Qué post más necesario." (23 caracteres, no aporta nada).
 *   · Google Chat del video: "Mucha suerte mañana" y "Que salga redondo" en un
 *     post de un evento que ya habia pasado.
 *
 * Como `testAperturas.ts`, no llama al modelo: comprueba lo DETERMINISTA, que
 * es lo que hace cumplir las reglas. La salida del modelo se mira en produccion.
 *
 *   npx tsx src/scripts/testVariedad.ts
 */
import {
  familiasDe,
  familiaRepetida,
  familiaEnTanda,
  datoRepetido,
  comentarioVacio,
  registroFormal,
  suerteFutura,
  afirmaQueEstuvo,
  apoyaEventoPasado,
  planTanda,
  aplicarCierre,
  angulosEvento,
  angulosApoyo,
  arranquesApoyo,
  esPostDeEvento,
  normalizarFase,
  detalleRepetidoEnTanda,
  nombreRepetido,
  pulirComentario,
  nombreAjeno,
  cifraNueva,
  quitarExactamente,
  inglesColado,
  conservarMayuscula,
  LARGO_MAX_CHAT,
  esNombrePropio,
} from '../services/variedadComentarios';
import { caberEnLinea } from '../services/commentGenerator';
import { buildPrompt, pulirTrasAlargada, ponerEmojiAlFinal } from '../services/replyGenerator';

let fallos = 0;
const ok = (cond: boolean, label: string, extra = '') => {
  console.log(`  ${cond ? 'ok  ' : 'FALLA'}  ${label}${extra ? ` — ${extra}` : ''}`);
  if (!cond) fallos++;
};

// 1 · LA FAMILIA "NADIE LO VE". Todas son respuestas o comentarios REALES.
console.log('\n1 · la familia "nadie lo ve" se reconoce');
const INVISIBLES = [
  'lo que más sorprende es que muchas de estas empresas llevan décadas exportando antes de que nadie hablara de internacionalización',
  'siii los polígonos de Tarancón o Campo de Criptana no salen en ningún reportaje, pero dentro hay gente soldando estadios',
  'totaaal, el queso y los molinos hacen bien su trabajo de despiste',
  'ese es el tema y lo que sorprende más es que ese músculo lleva años creciendo en silencio sin que lo cuenten...',
  'lo curioso es que esos datos llevan años ahí pero nadie los había puesto juntos hasta que alguien se para a mirar más allá de la autovía!',
  'casi siempre los ecosistemas más sólidos son los que menos portadas tienen 😅',
  'muchas veces las cifras que más impresionan son las que están debajo del radar',
  'el esfuerzo en la sombra es exactamente lo que retrata cada nombre de esa lista',
  'nadie lo visualiza porque nadie se para a contarlo y lo que no se cuenta no pesa',
  'Ciertooo, casi siempre el foco va a las grandes ciudades y nos perdemos lo que mueve el país de verdad.',
  'El tráiler que sale hacia el puerto no aparece en ningún titular y así se queda sin nombre quien más lo merece 🤝',
  'Nadie suelda un estadio de la noche a la mañana, detrás hay décadas de aperos y pedidos que nadie contaba.',
  'hay ecosistemas muy sólidos fuera del radar',
  'hay tejido comercial muy potente también lejos de los focos habituales',
  'más gente va a entender que Extremadura no es solo el paisaje que ven desde el tren!',
  'desde una región que muchos pasan de largo se está compitiendo y ganando',
];
for (const t of INVISIBLES) ok(familiasDe(t).includes('invisible'), 'invisible', t.slice(0, 70));

console.log('\n2 · y NO salta en respuestas con otra idea');
const OTRAS = [
  'gracias por leerlo y lo de las alianzas que mencionas es justo lo que más dice de ellos',
  'la lista podría ser el doble de larga y seguiría sin hacer justicia a todo lo que sale de allí',
  'lo de "tierruca" lo dice todo y encima con una palabra que solo entiende el que de verdad es de ahí 😉',
  'Lo del cuchillo de Albacete me ha matado, lo tengo en la cabeza cada vez que corto pan jaja',
  'Kenia con 26 veces más gente y aun así se queda por detrás, qué barbaridad',
  'Qué orgullo da leer lo de Valdepeñas, Tarancón y Albacete juntos en la misma lista!',
];
for (const t of OTRAS) ok(!familiasDe(t).includes('invisible'), 'no es invisible', t.slice(0, 70));

console.log('\n3 · la familia "a quien llamar" (las 3 respuestas del video de Unai)');
const A_QUIEN = [
  'nadie corre tan rápido como cuando no sabe a quién llamar al llegar.',
  'exacto y el paso siguiente es que ni siquiera tengas que correr porque ya sabes exactamente a quién llamar',
  'la presión del deadline es lo que no dije y que sin saber a quién llamar corres igual pero llegas tarde...',
];
for (const t of A_QUIEN) ok(familiasDe(t).includes('a_quien_llamar'), 'a quien llamar', t.slice(0, 60));

console.log('\n4 · la memoria de tanda: una idea vale UNA vez, no en cada respuesta');
ok(familiaRepetida(INVISIBLES[2], [INVISIBLES[0]]) !== null, 'la segunda "invisible" del post se tumba');
ok(familiaRepetida(INVISIBLES[2], [OTRAS[0], OTRAS[1]]) === null, 'la primera "invisible" del post pasa');
ok(familiaRepetida(OTRAS[3], [INVISIBLES[0], INVISIBLES[1]]) === null, 'otra idea pasa aunque el post ya tenga invisibles');
ok(familiaEnTanda(INVISIBLES.slice(9, 12).concat(OTRAS.slice(3, 5))) !== null, 'Google Chat: 3 de 5 con la misma idea se tumba');
ok(familiaEnTanda([INVISIBLES[9], ...OTRAS.slice(2, 6)]) === null, 'Google Chat: 1 de 5 con la tesis pasa');

console.log('\n5 · el mismo dato no se repite en dos respuestas del post');
ok(
  datoRepetido('los polígonos de Tarancón mandan silos a 150 países', ['detrás de esa llanura hay silos en 150 países y cuchillos en 94']) === '150',
  'silos en 150 paises dos veces'
);
ok(datoRepetido('esas 10 empresas son la prueba', ['lo que mueve Foronda de noche']) === null, 'sin dato repetido');
ok(
  datoRepetido('el 30% que dices es enorme', ['el 30% del PIB industrial'], 'el 30% del PIB industrial de Cantabria') === null,
  'si el dato lo trae el que comenta, se puede recoger'
);

console.log('\n6 · comentario vacio: corto o peloteo sin contenido');
ok(comentarioVacio('Qué post más necesario.') !== null, '"Qué post más necesario." se tumba');
ok(comentarioVacio('Gran post!') !== null, '"Gran post!" se tumba');
ok(comentarioVacio('Qué post más necesario, lo de Kenia con 26 veces más gente me ha dejado loco.') === null, 'con contenido detras, pasa');
ok(comentarioVacio(INVISIBLES[11]) === null, 'uno normal pasa');

console.log('\n7 · registro formal (Iker: "muy formales, que no son naturales")');
const FORMALES = [
  'Crecer en exportaciones a ese ritmo demuestra que el músculo industrial no está concentrado solo en los territorios de siempre.',
  'Este tipo de ecosistemas demuestran cuánto valor puede concentrarse en una provincia.',
  'Que una provincia de este tamaño exporte a ese nivel habla de especialización, continuidad y empresas que llevan décadas compitiendo fuera.',
  'El tejido industrial alavés es uno de los grandes motores del norte.',
  'Gracias por poner en valor la capacidad exportadora de la región.',
];
for (const t of FORMALES) ok(registroFormal(t) !== null, 'formal', t.slice(0, 60));
for (const t of OTRAS.slice(3)) ok(registroFormal(t) === null, 'natural', t.slice(0, 60));

console.log('\n8 · evento que YA PASO: nada de desear suerte');
ok(suerteFutura('Ningún día como hoy para darlo todo, Unai. Mucha suerte mañana 💪') !== null, '"Mucha suerte mañana"');
ok(suerteFutura('Once personas, una casa rural y alguien haciendo la comida. Que salga redondo.') !== null, '"Que salga redondo"');
ok(suerteFutura('El reloj corriendo y sin saber a quién llamar... ganas de que llegue el día y ver esto en marcha.') !== null, '"ganas de que llegue el dia"');
ok(suerteFutura('Qué mañana más loca aquella, y mira cómo salió todo!') === null, 'en pasado pasa');
ok(apoyaEventoPasado('Qué mañana más loca aquella, y mira cómo salió todo!'), 'recordar en pasado cuenta como apoyo');
ok(apoyaEventoPasado('Orgullo de lo que salió de esa casa rural 💪'), 'orgullo cuenta como apoyo');
ok(!apoyaEventoPasado('Correr no vende, llegar a tiempo sí.'), 'una reflexion suelta no apoya el evento');
ok(afirmaQueEstuvo('Qué bien lo pasamos esa mañana') !== null, '"lo pasamos" afirma que estuvo');
ok(afirmaQueEstuvo('Se nota el curro que hubo detrás') === null, 'sin afirmar que estuvo');

console.log('\n9 · el banco del evento depende de CUANDO es');
const despuesJuntos = angulosEvento(normalizarFase({ momento: 'despues', juntos: true }));
const despuesSolo = angulosEvento(normalizarFase({ momento: 'despues', juntos: false }));
const antes = angulosEvento(normalizarFase({ momento: 'antes', juntos: false }));
const futuro = /suerte|redond|ganas de que|que llegue|que empiece|salga bien/i;
ok(despuesJuntos.every((a) => !futuro.test(a)), 'despues (juntos): ningun angulo desea suerte', despuesJuntos.find((a) => futuro.test(a)) || '');
ok(despuesSolo.every((a) => !futuro.test(a)), 'despues (no consta): ningun angulo desea suerte');
ok(despuesJuntos.some((a) => /primera persona del plural|lo pasamos|estuvimos/i.test(a)), 'despues (juntos): se puede hablar en plural');
ok(despuesSolo.every((a) => !/lo pasamos|estuvimos/i.test(a) || /nunca|sin /i.test(a)), 'despues (no consta): no da por hecho que estuvo');
ok(antes.some((a) => /suerte/i.test(a)), 'antes: si desea suerte');
ok(normalizarFase({ momento: 'pasado' as any, juntos: 'si' as any }).momento === 'desconocido', 'una fase rara cae en desconocido');
ok(esPostDeEvento('evento', 'Una mañana de ventas a contrarreloj'), 'el pilar evento manda');
ok(esPostDeEvento(null, 'Mañana en Neety Forward'), 'el texto tambien');

console.log('\n10 · los angulos del peloteo no empujan a la tesis');
const pel = angulosApoyo('peloteo_los10');
ok(pel.length >= 7, 'banco de peloteo con margen para rotar', String(pel.length));
ok(pel.every((a) => !/idea principal|nadie|no se ve|desapercib/i.test(a)), 'ningun angulo pide la idea principal del post');
ok(arranquesApoyo('peloteo_mapa').every((a) => !/negacion/i.test(a)), 'en peloteo no se arranca con "nadie/no/ni"');
ok(arranquesApoyo('meme').some((a) => /negacion/i.test(a)), 'en el resto si');
ok(angulosApoyo('meme').every((a) => !/corta y seca/i.test(a)), 'sin el angulo "corta y seca" que dio "Qué post más necesario."');

console.log('\n11 · el plan de la tanda: emojis, vocales y cierres');
let minEmoji = 9, adyacentes = 0, conTres = 0, sinExcl = 0, minAlarg = 9, todosIguales = 0;
for (let i = 0; i < 3000; i++) {
  const p = planTanda(5);
  const e = [...p.conEmoji].sort();
  minEmoji = Math.min(minEmoji, e.length);
  if (e.length === 3) conTres++;
  for (let k = 1; k < e.length; k++) if (e[k] - e[k - 1] === 1) adyacentes++;
  if (!p.cierres.some((c, j) => c === '!' && !p.conEmoji.has(j))) sinExcl++;
  minAlarg = Math.min(minAlarg, p.conAlargada.size);
  if (p.conAlargada.size === 5) todosIguales++;
}
ok(minEmoji >= 2, 'siempre 2 o mas con emoji', `minimo ${minEmoji}`);
ok(adyacentes === 0, 'nunca dos con emoji seguidos', `${adyacentes} casos`);
ok(conTres > 0, 'a veces 3 (posiciones 1, 3 y 5)');
ok(sinExcl === 0, 'siempre al menos uno sin emoji que acaba en exclamacion', `${sinExcl} tandas sin`);
ok(minAlarg >= 2, 'siempre 2 o mas con vocales alargadas', `minimo ${minAlarg}`);
ok(todosIguales === 0, 'nunca los 5 con vocales');

console.log('\n12 · el cierre se aplica en codigo');
ok(aplicarCierre('Qué pasada lo de Albacete.', '!') === 'Qué pasada lo de Albacete!', '. -> !');
ok(aplicarCierre('Qué pasada lo de Albacete', '...') === 'Qué pasada lo de Albacete...', 'sin punto -> ...');
ok(aplicarCierre('Qué pasada lo de Albacete!', '.') === 'Qué pasada lo de Albacete.', '! -> .');
ok(aplicarCierre('Me lo apunto jaja', '.') === 'Me lo apunto jaja', 'tras un jaja no se pone punto');
ok(aplicarCierre('Me lo apunto jaja', '!') === 'Me lo apunto jaja!', 'pero exclamacion si');
ok(aplicarCierre('Qué ganas…', '!') === 'Qué ganas!', 'los suspensivos de un caracter tambien se cambian');

console.log('\n13 · la respuesta lleva lo ya contestado en el post');
const { prompt } = buildPrompt(
  {
    postContent: 'Al descansillo de la Península se lo ventilan con queso, molinos y a repostar.',
    commentText: 'Siendo valenciano, Castilla-La Mancha siempre me pillaba más por el paisaje que por la industria.',
    commenterName: 'Mario Carrillo',
    commenterHeadline: null,
    authorName: 'Iker Galarza Rodríguez',
    authorVoice: { voice_style: null, worldview: null, signature_moves: null, avoid: null },
    postId: 'test-post',
    pillar: 'peloteo_los10',
    respuestasPrevias: [INVISIBLES[0], INVISIBLES[1]],
  },
  'cercano'
);
ok(prompt.includes(INVISIBLES[0].slice(0, 40)), 'el prompt trae las respuestas previas');
ok(/ya (la )?has (dicho|usado)|no repitas/i.test(prompt), 'y le prohibe repetir su idea');
ok(/nadie (lo|la) ve|tesis/i.test(prompt), 'y en peloteo nombra la tesis quemada');

console.log('\n14 · el mismo DETALLE en dos de la tanda (prueba en produccion del 01/10)');
const tandaKenia = [
  'Me flipa que con 26 veces menos gente le vendan al mundo un 40% más que Kenia!',
  'Valdepeñas en la cena de cualquier mesa de España y encima exportando a medio mundo.',
  'Menudo dato lo de Kenia con 26 veces más habitantes y aun así por debajo en exportaciones...',
];
ok(detalleRepetidoEnTanda(tandaKenia) !== null, 'Kenia dos veces se tumba', String(detalleRepetidoEnTanda(tandaKenia)));
ok(detalleRepetidoEnTanda([tandaKenia[0], tandaKenia[1]]) === null, 'detalles distintos pasan');
ok(
  detalleRepetidoEnTanda(['Mucha suerte hoy Unai con todo', 'Qué orgullo esto Unai, de verdad'], ['Unai Arambarri Yeregui']) === null,
  'el nombre del autor no cuenta como detalle'
);
console.log('\n15 · el mismo nombre propio en respuestas seguidas del post');
const previasAlbacete = ['exactooo, te esperas algo así en el Norte y luego en Albacete hay cuchillos en 94 países.'];
ok(nombreRepetido('ahí está y el cuchillo con el que cortas el embutido sale de Albacete.', previasAlbacete) !== null, 'Albacete otra vez se tumba');
ok(nombreRepetido('el vino de Valdepeñas en la cena', previasAlbacete) === null, 'otro sitio pasa');
ok(nombreRepetido('Albacete es mi tierra y lo sabes', previasAlbacete, 'Soy de Albacete y me ha encantado') === null, 'si lo trae el que comenta, se recoge');
console.log('\n16 · "exactamente" en mitad de frase es tic de IA: se cambia en codigo (21), no se reintenta');
ok(registroFormal('repartirnos bien es exactamente lo que falla') === null, 'no gasta un intento');
console.log('\n17 · el colon se cambia por coma y la primera letra va en mayuscula');
ok(pulirComentario('juuusto, me quedé parado con lo de Moldavia: un millón de personas') === 'Juuusto, me quedé parado con lo de Moldavia, un millón de personas', pulirComentario('juuusto, me quedé parado con lo de Moldavia: un millón de personas'));
ok(pulirComentario('a las 10:30 en punto') === 'A las 10:30 en punto', 'una hora no se toca');

console.log('\n18 · formas de "nadie lo ve" que se colaron en la segunda ronda');
ok(familiasDe('Ajusa lleva décadas exportando y tampoco sale en los titulares').includes('invisible'), '"tampoco sale en los titulares"');
ok(familiasDe('el paisaje siempre lleva todas las miradas y mientras tanto Incarlopsa factura').includes('invisible'), '"lleva todas las miradas"');
ok(registroFormal('lo que demuestran empresas como Siderúrgica Balboa') !== null, '"demuestran" suelto');

console.log('\n19 · nombre que no esta ni en el post ni en el comentario (Ajusa "desde Yecla")');
const postClm = 'Estas son las 10 que lo levantan. Ajusa exporta más del 85% a más de 80 países. El cuchillo con el que lo cortas, desde Albacete. Las de España.';
ok(nombreAjeno('"los territorios de siempre" es justo el punto, porque Ajusa exporta desde Yecla', postClm) === 'yecla', 'Yecla se tumba', String(nombreAjeno('porque Ajusa exporta desde Yecla', postClm)));
ok(nombreAjeno('el cuchillo de Albacete en mi cocina', postClm) === null, 'Albacete esta en el post');
ok(nombreAjeno('desde Euskadi lo vemos', postClm, 'Desde Euskadi estos datos llaman la atención') === null, 'si lo dice el comentario, vale');
ok(nombreAjeno('Señorío de Montanera vende el mejor ibérico a media Europa', 'Señorío de Montanera - Ana Espárrago') === 'europa', '"media Europa" se tumba');
ok(nombreAjeno('qué bien Unai', postClm, '', ['Unai Arambarri Yeregui']) === null, 'el nombre del autor no cuenta');

console.log('\n20 · cifra que no esta en el post (Moldavia "cuatro millones")');
const postExt = '1 millón de personas venden fuera más que Moldavia entera, que tiene más del doble de gente: 4.074M€ contra 3.354M€. Crecen un 22%.';
ok(cifraNueva('un millón de personas vendiendo más que cuatro millones...', postExt) !== null, '"cuatro millones" se tumba');
ok(cifraNueva('Moldavia, 4 millones de personas', postExt) !== null, '"4 millones" se tumba aunque el post tenga 4.074');
ok(cifraNueva('un millón de personas y crecen un 22%, qué barbaridad', postExt) === null, 'las del post pasan');

console.log('\n21 · "exactamente" se cambia en codigo');
ok(quitarExactamente('repartirnos bien es exactamente lo que falla') === 'repartirnos bien es justo lo que falla', 'exactamente lo que -> justo lo que');
ok(quitarExactamente('pasa exactamente igual cuando') === 'pasa igual cuando', 'exactamente igual -> igual');

console.log('\n22 · ingles colado en un comentario en castellano (ronda 3: "mientras others cocinaban")');
ok(inglesColado('lo del photocall montándose mientras others cocinaban', 'Unos con el portátil. Otros montando el photocall.') === 'others', '"others" se tumba');
ok(inglesColado('TRANSA and co, qué pasada', 'TRANSA S.A. Tomato Paste and Tomato Powder') === null, 'si esta en el post, no');
ok(inglesColado('qué pasada lo del photocall', 'photocall') === null, 'castellano normal pasa');

console.log('\n23 · la mayuscula del nombre propio vuelve tras la alargada (ronda 3: "Tal cuaal, kenia con 26 veces")');
ok(conservarMayuscula('Tal cuaal, kenia con 26 veces', 'Kenia con 26 veces', 'Y exporta más que Kenia entera') === 'Tal cuaal, Kenia con 26 veces', 'Kenia');
ok(conservarMayuscula('Clarooo, casi siempre', 'Casi siempre', 'casi siempre pasa. Casi nunca') === 'Clarooo, casi siempre', 'una palabra normal se queda en minuscula');
// ⛔ Google Chat del 01/10, captura de Iker: "Tal cuaal, Nadie mete en tres
// líneas...". En el meme "Nadie" solo salia a principio de linea, y eso no la
// hace nombre propio.
ok(
  conservarMayuscula('Tal cuaal, nadie mete en tres líneas', 'Nadie mete en tres líneas', 'Vender es un caos.\nNadie te lo dice.\nCada rol pesa') === 'Tal cuaal, nadie mete en tres líneas',
  '"Nadie" a principio de linea NO es nombre propio'
);

console.log('\n25 · nunca coma ni mayuscula detras de la alargada (Iker, captura del 01/10)');
ok(pulirTrasAlargada('Tal cuaal, Nadie mete en tres líneas', 'Vender es un caos.\nNadie te lo dice.') === 'Tal cuaal nadie mete en tres líneas', 'sin coma y en minuscula', pulirTrasAlargada('Tal cuaal, Nadie mete en tres líneas', 'Vender es un caos.\nNadie te lo dice.'));
ok(pulirTrasAlargada('Clarooo, el giro de la cuota') === 'Clarooo el giro de la cuota', 'sin coma');
ok(pulirTrasAlargada('Pues valeee, la lista encoge') === 'Pues valeee la lista encoge', 'detras de una muletilla igual');
ok(pulirTrasAlargada('Tal cuaal, Kenia con 26 veces', 'exporta más que Kenia entera') === 'Tal cuaal Kenia con 26 veces', 'el nombre propio conserva la mayuscula');
ok(pulirTrasAlargada('Bieeen, SYMAGA con silos en 150 países') === 'Bieeen SYMAGA con silos en 150 países', 'las siglas tambien');
ok(pulirTrasAlargada('Juuusto, Unai lo clava', '', ['Unai Arambarri Yeregui']) === 'Juuusto Unai lo clava', 'el nombre del autor tambien');
ok(pulirTrasAlargada('el comercial llega sin saber nada') === 'el comercial llega sin saber nada', 'sin alargada no toca nada');

// Ronda 5 contra produccion: la coma delante de un NUMERO y la mayuscula de
// UNA letra se escapaban.
ok(pulirTrasAlargada('Tal cuaal, 26 veces menos gente') === 'Tal cuaal 26 veces menos gente', 'coma delante de un numero', pulirTrasAlargada('Tal cuaal, 26 veces menos gente'));
ok(pulirTrasAlargada('Pues buenooo, A mí me quedo con las ganas') === 'Pues buenooo a mí me quedo con las ganas', 'mayuscula de una sola letra', pulirTrasAlargada('Pues buenooo, A mí me quedo con las ganas'));
ok(suerteFutura('si no sabes a quién llamar antes de que empiece la cuenta atrás, se te va el tiempo') === null, '"cuenta atrás" descriptiva no es desear suerte');
// Ronda 6: "Perfectooo kenia tiene 26 veces más gente" (otra ruta forzaba la
// alargada sin conservar la mayuscula). El pase final la devuelve.
ok(pulirTrasAlargada('Perfectooo, kenia tiene 26 veces más gente', 'exporta más que Kenia entera') === 'Perfectooo Kenia tiene 26 veces más gente', 'el nombre propio recupera la mayuscula', pulirTrasAlargada('Perfectooo, kenia tiene 26 veces más gente', 'exporta más que Kenia entera'));
ok(pulirTrasAlargada('Clarooo, nadie lo cuenta', 'Vender es un caos.\nNadie te lo dice.') === 'Clarooo nadie lo cuenta', 'una palabra normal no se sube');

// Ronda 7: "Tal cuaal Lo de almorzar migas". En el mapa, "Lo que no cabe..."
// abre linea detras de "...Óscar García Vega" (sin punto): un salto de linea
// no es mitad de frase.
const postLista = '→ Siderúrgica Balboa, S.A. - Óscar García Vega\n\nLo que no cabe en la lista.\n→ Incarlopsa - Jesús Loriente\nY exporta más que Kenia entera';
ok(!esNombrePropio('Lo', postLista), '"Lo" tras un salto de linea NO es nombre propio');
ok(esNombrePropio('Incarlopsa', postLista), 'lo que va detras de "→ " en la lista SI');
ok(esNombrePropio('Kenia', postLista), 'Kenia sigue siendolo');
ok(pulirTrasAlargada('Tal cuaal, Lo de almorzar migas', postLista) === 'Tal cuaal lo de almorzar migas', '"Tal cuaal lo de..."');
ok(pulirTrasAlargada('Bieeen, incarlopsa con el mejor año', postLista) === 'Bieeen Incarlopsa con el mejor año', '"incarlopsa" recupera la mayuscula');
// Ronda 8: "Jorge A. Osuna Pons ciertoo La feria..." (en el post va "→ La Chinata").
ok(!esNombrePropio('La', '→ La Chinata - Carlos Oliva'), 'un articulo solo nunca es nombre propio');
ok(pulirTrasAlargada(' ciertoo, La feria es donde', '→ La Chinata - Carlos Oliva') === ' ciertoo la feria es donde', '"ciertoo la feria"');
ok(familiasDe('en medio del caos cada uno ya sabía a quién tenía que llamar').includes('a_quien_llamar'), '"a quién tenía que llamar"');
ok(nombreAjeno('el que viene de ver el tejido vasco', 'post', 'Acostumbrado al peso de la industria vasca') === null, '"vasco" con "vasca" en el comentario no es inventado');

console.log('\n28 · ultimo recurso para la linea: si no cabe, se quita la alargada del principio (ronda 6: 1 de 60 con 101)');
ok(
  caberEnLinea('Buenooo menudo dato Extremadura con la mitad de gente vendiéndole al mundo más que Moldavia entera') === 'Menudo dato Extremadura con la mitad de gente vendiéndole al mundo más que Moldavia entera',
  'quita "Buenooo"',
  caberEnLinea('Buenooo menudo dato Extremadura con la mitad de gente vendiéndole al mundo más que Moldavia entera')
);
ok(caberEnLinea('Totaaal el vino de Valdepeñas lo tengo en casa cada semana.') === 'Totaaal el vino de Valdepeñas lo tengo en casa cada semana.', 'si cabe, no se toca');

console.log('\n26 · o exclamacion o emoji, nunca los dos ("...del equipo de ventas! 🔥")');
ok(ponerEmojiAlFinal('Nadie mete en tres líneas lo que pesa cada rol!', '🔥') === 'Nadie mete en tres líneas lo que pesa cada rol 🔥', '"! 🔥" -> " 🔥"');
ok(ponerEmojiAlFinal('se te queda grabado', '🙌') === 'se te queda grabado 🙌', 'espacio y emoji, como "grabado 🙌"');
let exclConEmoji = 0;
for (let i = 0; i < 2000; i++) {
  const p = planTanda(5);
  if ([...p.conEmoji].some((j) => p.cierres[j] === '!')) exclConEmoji++;
}
ok(exclConEmoji === 0, 'el plan nunca le pone "!" a uno con emoji', `${exclConEmoji} tandas`);

console.log('\n27 · Google Chat en UNA linea (la tercera de la captura caia a dos: 107 caracteres)');
ok(LARGO_MAX_CHAT <= 90, `tope del Chat en ${LARGO_MAX_CHAT}`);

console.log('\n24 · el arranque "Yo..." fuera (ronda 3: "Yo me alegra", "Yo la próxima lo volvemos")');
ok(arranquesApoyo('meme').every((a) => !/\(Yo,/.test(a)), 'sin "Yo" como arranque');

console.log(fallos === 0 ? '\n✅ variedad y formato en orden' : `\n❌ ${fallos} fallo(s)`);
process.exit(fallos === 0 ? 0 : 1);
