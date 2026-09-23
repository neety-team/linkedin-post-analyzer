/**
 * Prueba de la RESPUESTA DE APOYO (comentario de solo emojis, GIF o imagen).
 *
 * El fallo que la motiva (Iker, 2026-09-23, captura del panel): a un comentario
 * de Erica Fernandez Higueras que era solo emojis, la herramienta genero "🙌"
 * a secas y el panel marcaba "@Erica Fernandez Higueras ✗", o sea que la
 * respuesta salia SIN mencionarla. La mencion no se quita nunca, ni aunque la
 * respuesta sea un emoji, ni aunque quien comente sea una empresa.
 *
 *   npx tsx src/scripts/probarRespuestaEmoji.ts
 */
import { respuestaDeApoyo, EMOJIS_DE_APOYO } from '../services/replyGenerator';

let fallos = 0;
function comprueba(que: string, cond: boolean, detalle = '') {
  console.log(`${cond ? '  OK  ' : '  ✗   '} ${que}${detalle ? ` → ${detalle}` : ''}`);
  if (!cond) fallos++;
}

// 1 · Con nombre: la respuesta ABRE con el nombre verbatim + espacio + emoji.
const nombre = 'Erica Fernandez Higueras';
for (let i = 0; i < 40; i++) {
  const r = respuestaDeApoyo(nombre);
  if (r.slice(0, nombre.length) !== nombre || r[nombre.length] !== ' ') {
    comprueba('la respuesta abre con el nombre verbatim y un espacio', false, r);
    break;
  }
  if (i === 39) comprueba('la respuesta abre con el nombre verbatim y un espacio', true, r);
}

// 2 · Lo que va detras del nombre es UN solo emoji de la lista, sin palabras.
const r1 = respuestaDeApoyo(nombre);
const resto = r1.slice(nombre.length).trim();
comprueba('detras del nombre va un emoji de apoyo y nada mas', EMOJIS_DE_APOYO.includes(resto), resto);
comprueba('sin palabras detras del emoji', !/\p{L}/u.test(resto), resto);

// 3 · El prefijo es EXACTO, que es lo que buildMentionedReply exige para
//     convertirlo en la @-mencion ({{0}}): si no casa, no hay chip.
comprueba(
  'el prefijo casa con el nombre (lo que pide buildMentionedReply)',
  r1.slice(0, nombre.length).toLowerCase() === nombre.toLowerCase()
);

// 4 · Una PAGINA DE EMPRESA tampoco pierde el nombre. Unipile no la deja
//     etiquetar (422 en la plantilla de mencion, verificado en jun 2026), asi
//     que el chip no existe, pero el nombre sigue abriendo la respuesta.
const empresa = 'Neety';
const r2 = respuestaDeApoyo(empresa);
comprueba('una empresa tambien abre la respuesta con su nombre', r2.startsWith(`${empresa} `), r2);

// 5 · Sin nombre (autor anonimizado) se responde solo con el emoji.
const r3 = respuestaDeApoyo(null);
comprueba('sin nombre, solo el emoji', EMOJIS_DE_APOYO.includes(r3.trim()), r3);

// 6 · El emoji ROTA, no sale siempre el mismo.
const vistos = new Set(Array.from({ length: 60 }, () => respuestaDeApoyo(null).trim()));
comprueba('el emoji rota entre varios', vistos.size > 1, [...vistos].join(' '));

console.log(fallos === 0 ? '\n✅ la mencion nunca se pierde' : `\n❌ ${fallos} fallo(s)`);
process.exit(fallos === 0 ? 0 : 1);
