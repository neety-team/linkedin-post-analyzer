/**
 * Prueba de las tres capas que arreglan la MONOTONIA DE LA APERTURA en las
 * respuestas a comentarios (Iker, 2026-09-15).
 *
 * Es el gemelo de `scripts/test-validador.py`: no llama al modelo, comprueba
 * lo DETERMINISTA — que el detector caza lo que tiene que cazar, que no caza lo
 * que no, que el arranque se sortea SIEMPRE y que la memoria de tanda excluye
 * lo ya usado. Lo que no puede probar es la salida del modelo; eso se ve en la
 * herramienta.
 *
 *   npx tsx src/scripts/testAperturas.ts
 */
import { detectarAperturaGenerica, detectarRespuestaBorde, faltaElGracias, faltaElReconocimiento, respuestaAHostilMal, tomaEnSerioLaBroma, esEstirada, limitarEstiradas, contarEstiradas, ponerEmojiAlFinal, quitarEmojis, comillasDeArranque, problemaDeEstilo, estirarUna, desestirarTodo, buildPrompt, recordarApertura, quitarComaAntesDeY, forzarEstirada } from '../services/replyGenerator';
import { primerasDos, aperturaHueca, criticaNuestroPost } from '../services/commentGenerator';

let fallos = 0;
const ok = (cond: boolean, label: string, extra = '') => {
  console.log(`  ${cond ? 'ok  ' : 'FALLA'}  ${label}${extra ? ` — ${extra}` : ''}`);
  if (!cond) fallos++;
};

// 1. LO QUE TIENE QUE CAZAR. Las 8 primeras son las que Iker nombro el 15/09;
//    las demas son aperturas REALES de comentarios nuestros ya publicados,
//    sacadas de Unipile ese mismo dia (15 de 19 abrian con una abstraccion).
console.log('\n1 · aperturas que DEBEN saltar');
const MALAS = [
  'Lo más importante aquí es el criterio.',
  'Lo más crucial no es la herramienta.',
  'Lo más clave llega después.',
  'Lo que nadie dice es que cuesta meses.',
  'Lo que nadie sabe es lo que cuesta.',
  'La clave está en a quién llamas.',
  'El secreto no es llamar más.',
  'Exactamente eso, y encima cuesta meses.',
  'La eficiencia comercial no está en ampliar el mercado.',
  'La diferencia es que uno vende y el otro no.',
  'Lo curioso es que a casi nadie le pasa.',
  'La verdad es que cuesta más de lo que parece.',
  'Al final del día lo que cuenta es el pedido.',
];
for (const m of MALAS) ok(detectarAperturaGenerica(m) !== null, m.slice(0, 44));

// 2. LO QUE NO PUEDE SALTAR. Falsos positivos = respuestas buenas tumbadas, que
//    es peor que el problema: el detector solo mira el ARRANQUE, asi que estas
//    mismas palabras a mitad de frase tienen que pasar.
console.log('\n2 · aperturas buenas que NO pueden saltar');
const BUENAS = [
  'justo, y encima lo pagas dos veces.',
  'eso es, a mí me costó tres semanas.',
  'tal cual, el teléfono no lo coge nadie.',
  'Casi siempre acaba igual, con la lista sin tocar.',
  'Nadie descuelga a la primera.',
  '¿Y cuánto tardas en dar con el que firma?',
  'El comercial que más cierra es el que menos llama, lo más curioso es eso.',
  'Tacharlos es lo que de verdad cuesta.',
];
for (const b of BUENAS) ok(detectarAperturaGenerica(b) === null, b.slice(0, 44), detectarAperturaGenerica(b) || '');

// 3. EL NOMBRE DE QUIEN COMENTA NO CUENTA. Toda respuesta abre con el nombre
//    (RULE 5), asi que sin quitarlo el detector no veria nunca la apertura.
console.log('\n3 · el nombre del comentarista se ignora');
ok(detectarAperturaGenerica('Ana Pérez lo más importante es el criterio.', 'Ana Pérez') !== null, 'con nombre delante, salta igual');
ok(detectarAperturaGenerica('Ana Pérez justo, eso mismo.', 'Ana Pérez') === null, 'con nombre delante, la buena no salta');

// 4. EL ARRANQUE SE SORTEA SIEMPRE. Antes solo se decidia la palabra cuando la
//    respuesta asentia (1 de 8 movimientos): el resto lo elegia el modelo, y un
//    modelo elige siempre igual.
console.log('\n4 · el arranque va en el 100% de los prompts, y rota');
const base = {
  postContent: 'post', commentText: 'comentario', commenterName: 'Ana Pérez',
  commenterHeadline: null, authorName: 'Iker',
  authorVoice: { voice_style: null, worldview: null, signature_moves: null, avoid: null },
};
const arranques = new Set<string>();
let conArranque = 0;
for (let i = 0; i < 400; i++) {
  const { prompt, arranque } = buildPrompt(base as any, 'cercano');
  if (prompt.includes('ARRANQUE OBLIGATORIO')) conArranque++;
  arranques.add(arranque);
}
ok(conArranque === 400, 'los 400 prompts llevan arranque obligatorio', `${conArranque}/400`);
ok(arranques.size >= 8, 'el sorteo reparte entre 8 arranques o mas', `${arranques.size} distintos`);

// 5. MEMORIA DE TANDA. Es lo que evita que 20 respuestas del mismo post abran
//    parecido: cada llamada es independiente y no sabe que dijo la anterior.
console.log('\n5 · memoria de tanda por post');
const post = 'post-de-prueba';
const sinMemoria = buildPrompt({ ...base, postId: post } as any, 'cercano').prompt;
ok(!sinMemoria.includes('EN ESTE MISMO POST'), 'sin aperturas previas no se mete la lista');
recordarApertura(post, 'Casi siempre acaba igual');
const conMemoria = buildPrompt({ ...base, postId: post } as any, 'cercano').prompt;
ok(conMemoria.includes('EN ESTE MISMO POST'), 'con una apertura previa, se prohibe');
ok(conMemoria.includes('Casi siempre acaba igual'), 'y se le dice cual fue');
const otroPost = buildPrompt({ ...base, postId: 'otro' } as any, 'cercano').prompt;
ok(!otroPost.includes('EN ESTE MISMO POST'), 'la memoria es POR post, no global');

// 6. COMENTARIOS DE APOYO. La deteccion de choque es lo que impide que los
//    cinco se lean como una sola mano: los pegan cinco personas distintas.
console.log('\n6 · comentarios de apoyo: choque de aperturas');
const tanda = [
  'La eficiencia comercial no está en ampliar el mercado.',
  'La eficiencia mejora cuando quitas capas.',
  'Me ha pasado lo mismo con mi cartera.',
];
const conteo = new Map<string, number>();
for (const c of tanda) conteo.set(primerasDos(c), (conteo.get(primerasDos(c)) || 0) + 1);
const choques = [...conteo.entries()].filter(([, v]) => v > 1).map(([k]) => k);
ok(choques.length === 1 && choques[0] === 'la eficiencia', 'caza los dos que abren igual', choques.join(', '));
ok(primerasDos('¡Qué bueno! Me ha pasado.') === 'que bueno', 'normaliza tildes y signos');
ok(tanda.filter((c) => detectarAperturaGenerica(c)).length === 2, 'y marca las dos abstracciones de la tanda');

// 7. TONO. Las dos familias salen de casos reales que Iker devolvio el 15/09.
console.log('\n7 · respuestas bordes o que niegan el post');
const BORDES = [
  'Rubén Carrasco casi siempre que un post no se entiende es porque no va dirigido a ti y eso no es malo para ninguno de los dos...',
  'Ana Pérez en ningún momento hemos hablado de peso.',
  'Ana Pérez yo no he dicho eso en el post.',
  'Ana Pérez si lo pillas, lo pillas.',
  'Ana Pérez no va de eso, va de otra cosa.',
  'Ana Pérez el chiste se explica solo.',
  'Ana Pérez no sale nada de peso en la publicación.',
];
for (const b of BORDES) ok(detectarRespuestaBorde(b) !== null, b.slice(0, 48), detectarRespuestaBorde(b) || 'NO LO CAZA');

console.log('\n7b · respuestas comprensivas que NO pueden saltar');
const BUENAS_TONO = [
  'Rubén Carrasco no pasa nada, va de que el compañero ve 4.797€ fuera de la cuenta y se piensa que es un viaje, y resulta ser la renovación de las herramientas.',
  'Ana Pérez normal que chirríe, entiendo que suene así y no era la intención.',
  'Ana Pérez culpa mía que me quedó enrevesado, te lo cuento en corto.',
  'Ana Pérez tomo nota, la próxima la cuento mejor.',
];
for (const b of BUENAS_TONO) ok(detectarRespuestaBorde(b) === null, b.slice(0, 48), detectarRespuestaBorde(b) || '');

// 8. Los dos fallos que destapo la prueba real contra produccion del 15/09.
console.log('\n8 · el "pero va de lo contrario" y el elogio sin gracias');
ok(detectarRespuestaBorde('Javier Mena entiendo la lectura, pero el post va justo de lo contrario, de que 4.797€ es la peor inversión...') !== null,
   'caza el reconocimiento con "pero" que le da la vuelta');
ok(detectarRespuestaBorde('Javier Mena entiendo que suene así, la idea era reírse del gasto y no de quien lo paga.') === null,
   'y NO caza el reconocimiento honesto');
ok(faltaElGracias('Brutal, de los mejores posts que he visto este mes', 'Luis Peña ¿has visto la cara de alguien cuando llega el cobro...') === true,
   'caza el elogio sin gracias');
ok(faltaElGracias('Brutal, de los mejores posts que he visto este mes', 'Luis Peña graciaas, y encima el mes que viene toca otra vez.') === false,
   'y NO salta si agradece');
ok(faltaElGracias('Y luego la herramienta no la usa nadie', 'Sara Ortiz exactoo y encima te toca defender el gasto.') === false,
   'ni cuando el comentario no es un elogio');

console.log('\n9 · peloteo hueco en los comentarios de apoyo');
for (const [c, esp] of [
  ['Buena reflexión. 12 meses de cuota no reemplazan una conversación real.', true],
  ['Muy buen punto, y encima cuesta el doble.', true],
  ['Totalmente de acuerdo con esto.', true],
  ['Yo también he caído en renovar sin pensar.', false],
  ['Ninguna herramienta te da lo que da estar en la sala.', false],
  ['¿Cuántas renovaciones automáticas nadie ha revisado?', false],
] as [string, boolean][]) {
  ok(aperturaHueca(c) === esp, `${esp ? 'hueca' : 'buena'}: ${c.slice(0, 40)}`);
}

console.log('\n10 · un comentario de apoyo no deja mal nuestra propia publicacion');
for (const [c, esp] of [
  ['El flujo parece demasiado perfecto para producción, objeción, respuesta y reunión cerrada. Bonita demo.', true],
  ['En la vida real esto no pasa casi nunca.', true],
  ['Me cuesta creer que salga tan redondo.', true],
  ['Suena a demo, pero se entiende la idea.', true],
  ['Y encima pasa que luego nadie revisa la renovación.', false],
  ['Yo también he caído en renovar sin pensar.', false],
  ['Ninguna herramienta te da lo que da estar en la sala.', false],
] as [string, boolean][]) {
  ok(criticaNuestroPost(c) === esp, `${esp ? 'critica' : 'apoya '}: ${c.slice(0, 44)}`);
}

console.log('\n11 · el que no entiende: primero se le quita hierro');
ok(faltaElReconocimiento('No entiendo este post',
   'Rubén Carrasco la factura de 4.797€ llega al chat del equipo, que piensa que es un viaje...') === true,
   'caza la que explica bien pero entra a saco');
ok(faltaElReconocimiento('No entiendo este post',
   'Rubén Carrasco no pasa nada, la broma es que la factura parecía un viaje y era la renovación.') === false,
   'y NO salta con "no pasa nada"');
ok(faltaElReconocimiento('no lo pillo la verdad',
   'Marta Ruiz culpa mía, te lo cuento en corto.') === false, 'ni con "culpa mía"');
ok(faltaElReconocimiento('Y luego la herramienta no la usa nadie',
   'Sara Ortiz exactoo y encima toca defender el gasto.') === false,
   'ni cuando el comentario no dice que no entienda');

console.log('\n12 · describir la foto sin verla');
for (const [c, esp] of [
  ['Rubén Carrasco normal, en la imagen se ven dos mensajes de alguien que cree que...', true],
  ['Rubén Carrasco la foto muestra una factura de renovación.', true],
  ['Rubén Carrasco culpa mía, en el meme sale el jefe preguntando.', true],
  ['Rubén Carrasco no pasa nada, la broma es que esos 4.797€ parecían un viaje y eran la renovación anual.', false],
  ['Marta Ruiz normal, te lo cuento, va de que la sorpresa no era Bali sino la cuota.', false],
] as [string, boolean][]) {
  ok((detectarRespuestaBorde(c) !== null) === esp, `${esp ? 'describe' : 'correcta'}: ${c.slice(0, 46)}`);
}

console.log('\n13 · la respuesta nunca es una pregunta');
ok(detectarRespuestaBorde('Mario Carrillo ¿y cuántas veces crees que el mejor discurso ni siquiera llega a sonar?') !== null, 'caza la del caso real');
ok(detectarRespuestaBorde('Tomás Vidal ¿caro comparado con qué, con 12 meses sin ver una cara?') !== null, 'caza la retórica');
ok(detectarRespuestaBorde('Mario Carrillo tal cual, el mejor discurso no llega a sonar si en recepción solo tienes un cargo.') === null, 'deja pasar la de apoyo');

ok(detectarRespuestaBorde('Pablo Sanz no era una herramienta, era la renovación del evento presencial de Donostia...') !== null, 'caza "no era X, era Y" sobre el post');
ok(detectarRespuestaBorde('Pablo Sanz eso es lo de menos, lo que duele son los 12 meses pagados sin ver a nadie.') === null, 'y deja pasar la que no corrige');

// 14. Las 4 que salieron mal en la prueba de estres del 16/09.
ok(respuestaAHostilMal('Otro post vendiendo humo', 'Sergio Vela el humo no tacha nombres de una lista, los acumula.'), 'caza el zasca al comentario hostil');
ok(respuestaAHostilMal('Vaya tontería de post', 'Raúl Gómez puede ser, pero a quien le duele es a quien paga 12 meses.'), 'caza el "puede ser, pero"');
ok(!respuestaAHostilMal('Otro post vendiendo humo', 'Sergio Vela respeto la opinión, entiendo que no te encaje.'), 'deja pasar la respetuosa');
ok(detectarRespuestaBorde('Álvaro Ruiz no, está en el post con nombres, fechas y el número de llamadas exacto.') !== null, 'caza "está en el post"');
ok(detectarRespuestaBorde('Álvaro Ruiz es todo real, me pasó tal cual.') !== null, 'caza afirmar que la historia es real');
ok(detectarRespuestaBorde('Lucía Martín normal, y si no sabes que en ese evento están los que firman...') !== null, 'caza "si no sabes"');
ok(faltaElReconocimiento('Qué post más largo, no he llegado al final', 'Nuria Sanz el final es donde está el golpe...'), 'caza el "pues léetelo"');
ok(!faltaElReconocimiento('Qué post más largo, no he llegado al final', 'Nuria Sanz me he enrollado, te lo resumo, lo que no vale no se llama.'), 'deja pasar la que da la razón');

ok(detectarRespuestaBorde('Mario Carrillo tal cual, el problema es real y encima lo pagas dos veces.') === null, 'no confunde "el problema es real" con afirmar la historia');

// 15. Una sola palabra alargada, emojis y comillas (Iker, 2026-09-16).
console.log('\n15 · alargar vocales: solo una palabra, y sin romper las normales');
for (const w of ['clarooo', 'siii', 'buenoo', 'nooo', 'bieeen', 'graciass', 'muuy', 'totaaal', 'geniaaal'])
  ok(esEstirada(w), `detecta ${w}`);
for (const w of ['Neety', 'feedback', 'Google', 'lee', 'cree', 'desee', 'coordinar', 'leer', 'zoo', 'clientes', 'business', 'Aaron'])
  ok(!esEstirada(w), `no toca ${w}`);
ok(limitarEstiradas('clarooo, y siii genial') === 'clarooo, y si genial', 'deja solo la primera', limitarEstiradas('clarooo, y siii genial'));
ok(limitarEstiradas('buenoo, con feedback de Neety') === 'buenoo, con feedback de Neety', 'no toca lo que no es estirado');
ok(contarEstiradas('nooo, y encima muuy caro') === 2, 'cuenta dos');
ok(ponerEmojiAlFinal('tal cual').endsWith('🙌') || /\p{Extended_Pictographic}/u.test(ponerEmojiAlFinal('tal cual')), 'pone emoji si falta');
ok(ponerEmojiAlFinal('tal cual 🔥') === 'tal cual 🔥', 'no duplica el emoji');
ok(quitarEmojis('respeto la opinión 🙌') === 'respeto la opinión', 'quita emojis para Unai');
console.log('\n15b · comillas y longitud');
ok(comillasDeArranque('"Sin nombre no paso." Tres palabras que explican más.') === 'Sin nombre no paso.', 'detecta el arranque con comillas');
ok(comillasDeArranque('Recepción filtra antes de oírte.') === null, 'no salta sin comillas');
ok(problemaDeEstilo('Qué bueno', 'Ana Pérez "Sin nombre no paso." lo resume todo', 'Ana Pérez') !== null, 'caza comillas que no citan al que comenta');
ok(problemaDeEstilo('sin nombre no paso, así de claro', 'Ana Pérez "sin nombre no paso" lo resume todo', 'Ana Pérez') === null, 'deja pasar si cita al que comenta');
ok(problemaDeEstilo('Qué bueno', 'Ana Pérez ' + 'x'.repeat(200), 'Ana Pérez') !== null, 'caza la respuesta demasiado larga');
ok(problemaDeEstilo('x'.repeat(400), 'Ana Pérez ' + 'x'.repeat(200), 'Ana Pérez') === null, 'con un parrafazo se permite más');

ok(limitarEstiradas('la lista al final encogeee más') === 'la lista al final encoge más', 'un verbo en mitad de la frase no se queda alargado', limitarEstiradas('la lista al final encogeee más'));
ok(limitarEstiradas('encogeee y clarooo') === 'encoge y claro', 'detras de un verbo no se queda ninguna (18/09)', limitarEstiradas('encogeee y clarooo'));
ok(faltaElGracias('Muy buena historia', 'Rosa Marín la lista al final encoge más de lo que uno espera.'), 'caza "Muy buena historia" sin gracias');

ok(estirarUna('claro, y la lista encoge') === 'clarooo, y la lista encoge', 'alarga la palabra de reaccion', estirarUna('claro, y la lista encoge'));
// LOS DOS SITIOS (Iker, 2026-09-18): primera palabra, o en la primera frase
// antes de una coma. "una frase, buenooo, y otra frase" suena fatal.
console.log('\n15c · la alargada solo va en sus dos sitios');
ok(limitarEstiradas('la lista encoge sola, buenooo, y luego otra cosa') === 'la lista encoge sola, bueno, y luego otra cosa', 'quita la que va entre dos comas en mitad', limitarEstiradas('la lista encoge sola, buenooo, y luego otra cosa'));
ok(limitarEstiradas('la lista encoge. Clarooo, luego otra') === 'la lista encoge. Claro, luego otra', 'quita la de la segunda frase');
ok(limitarEstiradas('siii, la lista encoge') === 'siii, la lista encoge', 'deja la primera palabra');
ok(limitarEstiradas('pues siii, la lista encoge') === 'pues siii, la lista encoge', 'deja la de antes de la primera coma');
ok(limitarEstiradas(' clarooo que encoge') === ' clarooo que encoge', 'primera palabra aunque no lleve coma (cuerpo tras el nombre)');
ok(limitarEstiradas('perfectooo y la excusa tapa algo') === 'perfecto y la excusa tapa algo', 'primera palabra sin pausa detras no vale');
ok(limitarEstiradas('clarooo que tapa algo') === 'clarooo que tapa algo', 'pero "claro que" si');
ok(limitarEstiradas('apúntate ciertooo, que el evento') === 'apúntate cierto, que el evento', 'segunda posicion detras de un verbo no vale');
ok(limitarEstiradas('uff siii, que el evento') === 'uff siii, que el evento', 'detras de una muletilla si');
ok(estirarUna('la lista encoge, y queda muy bien, claro') === 'la lista encoge, y queda muy bien, claro', 'no alarga una de reaccion lejos del arranque');
ok(estirarUna('pues claro, la lista encoge') === 'pues clarooo, la lista encoge', 'alarga la de antes de la primera coma');
{
  const r = forzarEstirada('la lista encoge, bien dicho', 2, 'vale', false);
  ok(r === 'valeee, la lista encoge, bien dicho', 'si no hay sitio, abre con la sorteada ya alargada', r);
  ok(forzarEstirada('la lista encoge', 2, 'tal cual', false) === 'tal cuaaal, la lista encoge', 'alarga "tal cual" en la ultima', forzarEstirada('la lista encoge', 2, 'tal cual', false));
}
{
  const r = forzarEstirada('ese es el tema claro y el precio es la excusa', 2, 'claro', false);
  ok(!/^claro/.test(r) && contarEstiradas(r) === 1, 'si la frase ya dice la palabra, abre con otra', r);
  ok(forzarEstirada('la lista encoge', 2, 'vale', true) === 'pues valeee, la lista encoge', 'a veces detras de un pues', forzarEstirada('la lista encoge', 2, 'vale', true));
  ok(/^Pues /.test(forzarEstirada('La lista encoge', 2, 'Clarooo', true)), 'en Google Chat, con mayuscula');
  ok(limitarEstiradas(forzarEstirada('la lista encoge', 2, 'vale', true)) === 'pues valeee, la lista encoge', 'y el limpiado la respeta');
}
{
  let mal = 0;
  const frases = ['Mira, la lista encoge sola, buenooo, y luego otra', 'totalmente. Y bieeen dicho, siii', 'la clave, clarooo, es el contexto'];
  for (const f of frases) for (let k = 0; k < 30; k++) {
    const r = forzarEstirada(limitarEstiradas(f), 2, 'justo');
    const w = (r.match(/\p{L}+/gu) || []).find(esEstirada) || '';
    const i = r.indexOf(w);
    const previas = (r.slice(0, i).match(/\p{L}+/gu) || []).length;
    if (contarEstiradas(r) !== 1 || /[.!?]/.test(r.slice(0, i)) || previas > 2) mal++;
  }
  ok(mal === 0, 'tras el limpiado, siempre una y siempre en su sitio', String(mal));
}
ok(estirarUna('claro', 1) === 'claroo', 'en Unai, una sola letra de mas');
ok(estirarUna('gracias por decirlo') === 'graciaas por decirlo', 'alarga el gracias', estirarUna('gracias por decirlo'));
ok(estirarUna('la lista encoge sola') === 'la lista encoge sola', 'no fuerza si no hay palabra de reaccion');
ok(estirarUna('sí, y encima clarooo') === 'sí, y encima clarooo', 'no alarga si ya hay una');
ok(ponerEmojiAlFinal('tal cual 🔥', '🙌') === 'tal cual 🙌', 'cambia el emoji por el sorteado');

ok(desestirarTodo('clarooo, y juuusto eso, graciaas') === 'claro, y justo eso, gracias', 'sin sorteo de alargar no queda ninguna', desestirarTodo('clarooo, y juuusto eso, graciaas'));
ok(detectarRespuestaBorde('Unai Sanz gracias por decirlo, nos vemos el jueves en Donostia.') !== null, 'caza "nos vemos el jueves"');
ok(detectarRespuestaBorde('Carlos Vidal te esperamos el jueves en Donostia 😄') !== null, 'caza "te esperamos el jueves" (17/09)');
ok(detectarRespuestaBorde('Unai Sanz gracias por decirlo, el jueves en Donostia hablamos justo de esto.') === null, 'deja pasar mencionar el evento sin dar por hecho que va');

ok(estirarUna('muy bien dicho') === 'muuuy bien dicho' || estirarUna('muy bien dicho') === 'muy bieeen dicho', 'estira la ultima vocal aunque acabe en consonante', estirarUna('muy bien dicho'));

// Maximo UNA alargada en cualquier caso (Iker, 2026-09-16)
ok(esEstirada('bieen') && esEstirada('vaale') && esEstirada('buueno'), 'la doble e/a/u interior de una palabra de reaccion cuenta como alargada');
ok(!esEstirada('leer') && !esEstirada('llevar') && !esEstirada('creer'), 'las dobles legitimas no cuentan');
ok(contarEstiradas(limitarEstiradas('claroo y bieen dicho')) <= 1, 'claroo y bieen se queda en una como mucho', limitarEstiradas('claroo y bieen dicho'));
{
  const colapsa = (t: string) => t.replace(/(\p{Ll})\1{2,}/gu, '$1$1');
  const frases = ['clarooo y bieeen, siii', 'nooo, buenooo, graciaas', 'claro, bien, sí, vale, genial y muy justo', 'vaaale, total, suuuper bieen', 'síííí y clarooo 🙌'];
  let peor = 0;
  for (const f of frases) for (let k = 0; k < 40; k++) for (const letras of [1, 2]) {
    const r = colapsa(estirarUna(limitarEstiradas(f), letras));
    peor = Math.max(peor, contarEstiradas(r));
    const r2 = estirarUna(limitarEstiradas(f), letras);
    peor = Math.max(peor, contarEstiradas(r2));
  }
  ok(peor <= 1, 'ninguna combinacion de frase, voz y sorteo deja dos alargadas', String(peor));
}

// Google Chat 16/09: punto antes del emoji, coma antes de "y" y 0 de 5 alargadas
ok(ponerEmojiAlFinal('Eso también hay que contarlo.', '👏') === 'Eso también hay que contarlo 👏', 'nunca un punto antes del emoji', ponerEmojiAlFinal('Eso también hay que contarlo.', '👏'));
ok(ponerEmojiAlFinal('Eso también hay que contarlo. 👏') === 'Eso también hay que contarlo 👏', 'quita el punto aunque el emoji lo pusiera el modelo');
ok(ponerEmojiAlFinal('lo dejo ahí...', '👏') === 'lo dejo ahí... 👏', 'los suspensivos se quedan');
ok(quitarComaAntesDeY('Sirimiri, y mientras tanto exportando') === 'Sirimiri y mientras tanto exportando', 'quita la coma antes de y');
ok(quitarComaAntesDeY('Bilbao, Ermua, yo qué sé') === 'Bilbao, Ermua, yo qué sé', 'no toca "yo"');
{
  const r = forzarEstirada('Casi siempre la empresa que no sale en el anuncio es la que más trabajo tiene detrás.', 2, undefined, false);
  ok(contarEstiradas(r) === 1 && /^\p{Lu}\p{Ll}+, casi siempre/u.test(r), 'sin palabra de reaccion, abre con una alargada', r);
  ok(contarEstiradas(forzarEstirada('pues claro que sí, muy bien dicho')) === 1, 'si hay de reaccion, alarga una de ellas');
}
{
  let mal = 0;
  for (let k = 0; k < 50; k++) {
    const r = estirarUna('la empresa que no sale si ya la cual es una buena idea');
    if (r !== 'la empresa que no sale si ya la cual es una buena idea') mal++;
  }
  ok(mal === 0, 'no alarga una negacion, un si condicional, un ya ni "la cual" en mitad de la frase');
  ok(estirarUna('no, y encima encoge') === 'nooo, y encima encoge', 'el "no" suelto si se alarga', estirarUna('no, y encima encoge'));
}

// RULE 3g (Iker, 2026-09-17): el comentario de Antonio N. en el meme, y lo que salio.
const antonio = 'Iker Galarza Rodríguez una que funciona muy bien es: tu madre se ha tropezado en la ducha.\n\nSólo para valientes.';
ok(tomaEnSerioLaBroma(antonio, 'Antonio N. Funciona porque mezcla urgencia con un nombre real y de ahí a preguntar directamente por el responsable hay solo un paso 🔥'), 'caza la broma tomada en serio');
ok(!tomaEnSerioLaBroma(antonio, 'Antonio N. me la apuntaré por si la necesito en el futuro jajaja'), 'deja pasar la que sigue la broma');
ok(tomaEnSerioLaBroma('jajaja la mejor excusa del mundo', 'Pedro Gil es una buena táctica para llegar al que decide'), 'con jajaja tambien caza el analisis');
// Las dos que salieron en la prueba real contra produccion, con la regla ya puesta.
ok(tomaEnSerioLaBroma(antonio, 'Antonio N. clarooo que la urgencia del mensaje cambia todo lo que sigue'), 'caza "la urgencia cambia todo"');
ok(tomaEnSerioLaBroma(antonio, 'Antonio N. el teléfono ya lo tienes, la excusa es lo que marca la diferencia jajaja'), 'caza "marca la diferencia" aunque lleve jajaja');
ok(!tomaEnSerioLaBroma('Muy buen post, la llamada en frío funciona', 'Pedro Gil funciona porque llegas antes que nadie'), 'un comentario serio puede recibir un "funciona porque"');

console.log(fallos === 0 ? '\n✅ las tres capas hacen lo que dicen\n' : `\n❌ ${fallos} fallo(s)\n`);
process.exit(fallos === 0 ? 0 : 1);
