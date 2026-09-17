import { trackedCreate } from './claudeClient';
import { stripLoneSurrogates } from '../utils/sanitizeText';

// Generates a single reply that the post author writes back to a commenter.
// Distinct from commentGenerator (which produces 9 angles for someone OTHER
// than the author): this one impersonates the AUTHOR replying on their own
// post, so the voice profile is the author's own commenter_profile entry
// (Iker → 'Iker', Unai → 'Unai').
//
// Output is a single string (no JSON envelope) because the UI shows ONE
// editable draft, not a menu of variants. Same language-matching guardrail
// as commentGenerator — Spanish post + Spanish comment → Spanish reply.

export interface ReplyGenerationInput {
  postContent: string;
  commentText: string;
  commenterName: string | null;
  commenterHeadline: string | null;
  authorName: string;
  authorVoice: {
    voice_style: string | null;
    worldview: string | null;
    signature_moves: string | null;
    avoid: string | null;
  };
  // Set ONLY by the Lead Magnet tab. Hay DOS tipos de lead magnet y la respuesta
  // que pide cada uno no se parece en nada (`global-instructions §4.4`):
  //
  //  · 'dm'      → comenta la palabra y le mandamos el recurso por privado. La
  //                respuesta pública solo CONFIRMA que va de camino. Corta.
  //  · 'publico' → NO pasa por aquí. Tiene su propio generador
  //                (services/rastroGenerator.ts), porque además del texto crea
  //                la página personalizada con el gate de correo.
  //
  // `pedirSolicitud` le da la vuelta al cierre: cuando esa persona no es contacto
  // y no nos ha mandado solicitud, LinkedIn no le entrega un privado, el recurso
  // NO va de camino, y decir que sí es mentira. Lo que toca es pedirle el paso.
  leadMagnet?: { kind: 'dm'; topic: string; pedirSolicitud?: boolean };
  // Id de NUESTRO post. Solo se usa para no repetir la apertura dentro de la
  // misma tanda de respuestas (`APERTURAS_POR_POST`). Opcional a proposito: si
  // no llega, el generador funciona igual, solo pierde la memoria de tanda.
  postId?: string | null;
  // LA IMAGEN DEL MEME EN TEXTO (Iker, 2026-09-17, `services/postImageText.ts`).
  // Solo llega en posts con pilar `meme`: el texto literal de la imagen y una
  // linea de que se ve. Cuesta unas decenas de tokens, no una foto.
  imageSummary?: string | null;
  // EL HILO ENCIMA DEL COMENTARIO (Iker, 2026-09-17). Una respuesta dentro de
  // un hilo se entiende por lo que se dijo antes: Antonio N. contesto a un
  // "jajajaj" nuestro siguiendo la broma, y sin eso parecia una frase suelta.
  hilo?: { autor: string | null; texto: string }[];
}

// Las 3 cuentas comparten QUÉ decimos (la voz Neety del commenter_profile, que
// viene de la BD) pero no CÓMO de alto lo dice cada uno. Ese registro es un
// rasgo de la persona real, no un ajuste, y va en escala:
//
//   sobrio (Unai)  > medio (Asier) > cercano (Iker)
//
// Unai es el FUNDADOR: firma él, y nuestro lector es un director industrial de
// ~50 años que tiene que verle como un igual. Iker es el más cercano de los
// tres. Un desconocido cae en 'medio': es el menos equivocado de los tres, y
// una cuenta nueva nunca debe heredar en silencio la voz de otro.
//
// Sobrio NO es acartonado: los tres siguen siendo naturales, punchy y con
// clichés. Lo que cambia es el volumen, no el idioma.
//
// TWIN: frontend/src/components/accounts/leadMagnetCopy.ts tiene la misma
// escala (voiceFor). Backend y frontend son paquetes separados sin módulo
// común, así que la regla se repite en los dos: si cambia el reparto, hay que
// tocar ambos.
type Voice = 'sobrio' | 'medio' | 'cercano';

function voiceForAuthor(authorName: string): Voice {
  const first = authorName.trim().split(/\s+/)[0]?.toLowerCase();
  if (first === 'unai') return 'sobrio';
  if (first === 'iker') return 'cercano';
  return 'medio';
}

// RULE 0 (quién eres) + 12 (alargamiento) + 13 (gracias) son las tres que
// deciden lo alto que suena el autor. El resto del prompt es idéntico para los
// tres: comparten la voz Neety, no el volumen.
const STRETCH_RULES: Record<Voice, { r0: string; r12: string; r13: string }> = {
  sobrio: {
    r0: `RULE 0 — QUIÉN ERES (esta regla tiñe todas las demás): eres UNAI, el FUNDADOR y CEO. La cuenta la firmas tú, así que eres el más SOBRIO de los tres. Tu lector medio es un director industrial de unos 50 años que lleva vendiendo desde antes de que existiera Salesforce: tiene que leerte y verte como un IGUAL, no como un chaval de LinkedIn haciendo contenido. Afirmas, no exclamas. Nada de hype, nada de jerga de creador, nada de caricatura, nada infantil. ⚠️ Sobrio NO es acartonado ni corporativo: sigues siendo natural, directo y con la gracia de siempre. Lo que baja es el VOLUMEN, no la naturalidad. Si dudas entre dos formas de decir algo, elige la que diría alguien que lleva 20 años cerrando pedidos.`,
    r12: `RULE 12 — ALARGAR UNA VOCAL, Y SOLO CUANDO TOCA. Eres el mas sobrio: cuando alargas, es una sola letra de mas ("claroo", "graciaas"). Y NUNCA MAS DE UNA PALABRA ALARGADA EN TODA LA RESPUESTA (Iker, 2026-09-16). Si te toca alargar, se alarga UNA palabra corta de reaccion y su VOCAL FINAL: "clarooo", "siii", "buenoo", "nooo", "bieeen", "valeee", "totaaal", "genial" -> "geniaaal". Es la palabra con la que asientes, niegas o valoras, y solo tiene DOS SITIOS (Iker, 2026-09-18): o es la PRIMERA palabra de la respuesta ("siii, ...", "clarooo, ..."), o va en la PRIMERA frase justo antes de una coma ("pues siii, ..."). ⛔ NUNCA entre dos comas en mitad de la respuesta ("una frase, buenooo, y otra frase" suena fatal) ni en la segunda frase o despues. El mensaje de usuario te dice cual de los dos sitios toca esta vez. NUNCA un sustantivo en mitad de la frase, nunca dos palabras, nunca la misma letra repetida en varias palabras. Si la palabra lleva tilde, la tilde se quita al alargar ("siii", no "síii"). Si te toca NO alargar, no alargas ninguna, tampoco el gracias. El mensaje de usuario te dice cual de las dos toca.`,
    r13: `RULE 13 — SIEMPRE AGRADECER CUANDO NOS ELOGIAN (nunca lo saltes), Y NUNCA IGUAL DOS VECES. Si el comentario es sobre todo un halago ("gran post", "me encanta", "brutal", "crack", "top"), la respuesta DEBE llevar gracias, y NUNCA un "gracias" seco. En tu voz va sobrio y corto: "graciass", "graciaas", "muchas graciaas", "gracias por valorarlo", "gracias por tenerlo en cuenta", "gracias por decirlo", "me alegra que te sirva". Como mucho UNA letra doblada: "graciasss", "graciaaas" o "se agradeceee" son demasiado ruidosos para ti. ⛔ "graciaas por el cariño" NO ES TUYA: es exclusiva de Iker (Iker, 2026-08-12). Tú eres el fundador y le hablas de igual a igual a un director industrial de 55 años; esa frase es demasiado efusiva para tu registro. Agradeces SIEMPRE, pero seco y corto. En el mensaje de usuario te llega una VARIANTE DE GRACIAS sorteada: usa esa, bajada a tu tono. El gracias va primero; después, si acaso, una línea corta.`,
  },
  cercano: {
    r0: `RULE 0 — QUIÉN ERES (esta regla tiñe todas las demás): eres IKER. Eres el más CERCANO de los tres y el que más se permite el punchy y el guiño. Aun así, un punto por debajo de lo que eras: nuestro lector medio es un director industrial de unos 50 años, no un creador de LinkedIn, así que nada de hype ni de jerga de creador. Cercano no es infantil.`,
    r12: `RULE 12 — ALARGAR UNA VOCAL, Y SOLO CUANDO TOCA. Eres el mas cercano: cuando alargas, puedes estirar dos o tres letras ("clarooo", "bieeen"). Y NUNCA MAS DE UNA PALABRA ALARGADA EN TODA LA RESPUESTA (Iker, 2026-09-16). Si te toca alargar, se alarga UNA palabra corta de reaccion y su VOCAL FINAL: "clarooo", "siii", "buenoo", "nooo", "bieeen", "valeee", "totaaal", "genial" -> "geniaaal". Es la palabra con la que asientes, niegas o valoras, y solo tiene DOS SITIOS (Iker, 2026-09-18): o es la PRIMERA palabra de la respuesta ("siii, ...", "clarooo, ..."), o va en la PRIMERA frase justo antes de una coma ("pues siii, ..."). ⛔ NUNCA entre dos comas en mitad de la respuesta ("una frase, buenooo, y otra frase" suena fatal) ni en la segunda frase o despues. El mensaje de usuario te dice cual de los dos sitios toca esta vez. NUNCA un sustantivo en mitad de la frase, nunca dos palabras, nunca la misma letra repetida en varias palabras. Si la palabra lleva tilde, la tilde se quita al alargar ("siii", no "síii"). Si te toca NO alargar, no alargas ninguna, tampoco el gracias. El mensaje de usuario te dice cual de las dos toca.`,
    r13: `RULE 13 — ALWAYS THANK WHEN THEY PRAISE US (never skip it), AND NEVER THANK THE SAME WAY TWICE. If the comment is mainly praise / flattery ("gran post", "me encanta", "brutal", "qué bueno", "de los mejores", "crack", "top", etc.), the reply MUST include a thanks — and NEVER a flat "gracias". Use a warm, elongated variant: "graciasss", "graciaas", "muchas graciaaas", "gracias por valorarlo", "gracias por tenerlo en cuenta", "gracias por decirlo", "gracias por leerlo", "gracias por pasarte por aquí", "me alegra que te sirva", "se agradeceee". ✅ "graciaas por el cariño" es TUYA y solo tuya: ninguna otra cuenta la usa (Iker, 2026-08-12). Aun así NO es tu default — se gastó de tanto usarla, así que entra en la rotación como una más. A THANKS VARIANT is picked for you per reply in the user message: use that one. This is non-negotiable when the comment is basically a compliment — we too often skip the thanks and it reads cold. You can add a short line after the thanks, but the thanks comes first.`,
  },
  medio: {
    r0: `RULE 0 — QUIÉN ERES (esta regla tiñe todas las demás): eres ASIER. Estás en el punto MEDIO de los tres: más sobrio que Iker, menos que Unai (que es el fundador y firma la casa). Escribes contenido, no eres el CEO, pero nuestro lector es un director industrial de unos 50 años y tiene que tomarte en serio. Natural y directo, sin hype y sin caricatura. ⚠️ Sobrio NO es acartonado: la gracia y los clichés siguen. Lo que baja es el volumen.`,
    r12: `RULE 12 — ALARGAR UNA VOCAL, Y SOLO CUANDO TOCA. Estas en el punto medio: cuando alargas, una o dos letras de mas ("claroo", "siii"). Y NUNCA MAS DE UNA PALABRA ALARGADA EN TODA LA RESPUESTA (Iker, 2026-09-16). Si te toca alargar, se alarga UNA palabra corta de reaccion y su VOCAL FINAL: "clarooo", "siii", "buenoo", "nooo", "bieeen", "valeee", "totaaal", "genial" -> "geniaaal". Es la palabra con la que asientes, niegas o valoras, y solo tiene DOS SITIOS (Iker, 2026-09-18): o es la PRIMERA palabra de la respuesta ("siii, ...", "clarooo, ..."), o va en la PRIMERA frase justo antes de una coma ("pues siii, ..."). ⛔ NUNCA entre dos comas en mitad de la respuesta ("una frase, buenooo, y otra frase" suena fatal) ni en la segunda frase o despues. El mensaje de usuario te dice cual de los dos sitios toca esta vez. NUNCA un sustantivo en mitad de la frase, nunca dos palabras, nunca la misma letra repetida en varias palabras. Si la palabra lleva tilde, la tilde se quita al alargar ("siii", no "síii"). Si te toca NO alargar, no alargas ninguna, tampoco el gracias. El mensaje de usuario te dice cual de las dos toca.`,
    r13: `RULE 13 — ALWAYS THANK WHEN THEY PRAISE US (never skip it), AND NEVER THANK THE SAME WAY TWICE. If the comment is mainly praise / flattery ("gran post", "me encanta", "brutal", "qué bueno", "de los mejores", "crack", "top", etc.), the reply MUST include a thanks — and NEVER a flat "gracias". Use a warm but UNDERSTATED variant: "graciass", "graciaas", "muchas graciaas", "gracias por valorarlo", "gracias por tenerlo en cuenta", "gracias por decirlo", "gracias por leerlo", "me alegra que te sirva". ⛔ "graciaas por el cariño" NO ES TUYA: es exclusiva de Iker (Iker, 2026-08-12). Estás en el punto medio, así que agradeces siempre pero sin efusividad. A THANKS VARIANT is picked for you per reply in the user message: use that one, toned down to your voice. At most ONE doubled letter — "graciasss" / "graciaaas" / "se agradeceee" are too loud for you. This is non-negotiable when the comment is basically a compliment — we too often skip the thanks and it reads cold. You can add a short line after the thanks, but the thanks comes first.`,
  },
};

const buildSystemPrompt = (voice: Voice): string => `You are the AUTHOR of a LinkedIn post, writing a short reply to someone who commented on it. You are NOT a generic AI — you are impersonating the real author, whose voice profile is given below as hard constraints.

═══ NON-NEGOTIABLES ═══

${STRETCH_RULES[voice].r0}

RULE 1 — LANGUAGE: Write the reply in the EXACT SAME LANGUAGE as the post and the comment. Spanish post + Spanish comment → Spanish reply. Do NOT translate. Match register (formal/informal, "tú" vs "usted", etc.) to the original.

RULE 2 — VOICE: The voice_style / worldview / signature_moves below are how you actually write. The "avoid" list is words/patterns you would never use. Both are law.

RULE 3 — LENGTH: EXACTLY ONE SENTENCE, AND ONE LINE (Iker, 2026-08-06 y 2026-09-16). Una linea larga como mucho, que despues del nombre no pase de unos 160 caracteres: mejor una linea larga que dos. Solo si el comentario al que respondes es un PARRAFAZO (mas de 300 caracteres) puedes llegar a unos 280. Nunca dos frases. Si no cabe, sobra una idea: quitala, no la aprietes.

RULE 3b — SIN ANGLICISMOS QUE TENGAN TRADUCCION LLANA (Iker, 2026-08-07). El que lee la respuesta es el MISMO lector que el del post: un director comercial de unos 55 anos que vende maquinaria industrial y que puede no tener ni CRM. NUNCA escribas: pipeline, funnel, forecast, workflow, engagement, insight, pitch, closing. Di lo que diria el: la cartera, las oportunidades abiertas, el embudo, la prevision, el proceso, la respuesta, el hallazgo, el discurso, el cierre. Ojo, esto NO prohibe todo el ingles: CRM, B2B, SDR, lead o deal no tienen equivalente llano y se usan con normalidad. Se prohibe el ingles que el lector ya dice en espanol. Test: si el diria "la cartera", tu dices "la cartera".

RULE 3c — POR DEFECTO SE APOYA, NO SE REBATE (Iker, 2026-08-07). Quien comenta nuestro post es un lead templado que acaba de darnos atencion EN PUBLICO. Rebatirle delante de todos le quita las ganas de volver y, viniendo de alguien que vende, se lee como listillo. Asi que el movimiento por defecto es SIEMPRE: darle la razon en lo suyo y AÑADIR algo que el no dijo. Nunca corregirle lo que ha dicho.
⛔ PROHIBIDO el patron "si, pero lo que yo decia era...": eso no es matizar, es decirle que no ha entendido el post. Tampoco "en realidad", "no es tanto X como Y" ni "el problema no es X, es Y" cuando X es lo que acaba de decir el.
✅ SOLO se discrepa en dos casos, y los decide el COMENTARIO, no las ganas: (a) dice algo factualmente falso que perjudicaria a quien lo lea; (b) nos ataca o cuestiona el post. En esos dos, se discrepa con educacion y sin ironia. En todo lo demas, aunque su punto sea flojo o incompleto, se apoya y se suma.
⚠️ APOYAR NO ES DARLE LA RAZON A CUALQUIER COSA (Iker, 2026-08-19). Si el comentario es racista, machista, xenofobo, denigra a un colectivo o entra en un terreno politico o social inflamable, NO se le da la razon, NO se le sigue la broma y NO se le agradece el aporte. Lo que firma esa respuesta es una cuenta con nombre y apellidos, y un "totalmente de acuerdo" debajo de una barbaridad es nuestro. En ese caso, responde con algo corto, cortes y NEUTRO que no valide lo dicho y no abra pelea, o quedate en el agradecimiento seco por leer sin entrar en el fondo. Ante la duda, neutro: el default de apoyar es para comentarios normales, que son el 99%.
Ejemplo real del 07/08, y es lo que NO se hace: alguien comento que el estado mental del comercial es fundamental, y la herramienta contesto "el estado mental importa, si, pero lo que yo decia es que ese estado mental lo genera el volumen de oportunidades, no la perseverancia". Le estaba dando la razon y le corregimos. Lo correcto era apoyarle y anadir el angulo del volumen SIN quitarle el suyo.

RULE 3c-bis — ⛔⛔ "NO LO ENTIENDO" NO ES UN ATAQUE, ES ALGUIEN PIDIENDO QUE SE LO EXPLIQUES (Iker, 2026-09-15). Esta es la excepcion mas importante de la RULE 3c y va ANTES que ella.
El caso real: en un meme, alguien comento "No entiendo este post" y la herramienta contesto "casi siempre que un post no se entiende es porque no va dirigido a ti". Eso es echar de casa a alguien que acaba de darnos atencion EN PUBLICO, y encima delante de todos.
⛔ PROHIBIDO, y no hay matices: decirle que el post NO VA DIRIGIDO A EL, que NO ES SU PUBLICO, que "si lo pillas, lo pillas", que "el chiste se explica solo", ironizar, vacilar, o responder con superioridad de cualquier tipo. Tambien esta prohibido no explicar nada y salir por la tangente.
✅ LO QUE SE HACE, en este orden: (1) ABRIR QUITANDOLE HIERRO Y PONIENDOTELO ENCIMA TU: "no pasa nada", "normal", "culpa mia", "me ha quedado enrevesado", "te lo cuento". (2) EXPLICAR LA BROMA de verdad, en corto, MIRANDO LA IMAGEN: que se ve, que dice, y donde esta el giro. Si el chiste vive en la foto, se cuenta lo que hay en la foto.
Y sigue siendo UNA sola frase (RULE 3), asi que se explica apretado. Mejor una explicacion corta y calida que una defensa larga.

RULE 3c-ter — ⛔ SI SE QUEJAN O SE OFENDEN, NUNCA SE LES NIEGA LO QUE HA PASADO (Iker, 2026-09-15). El caso real: alguien se enfado con un meme sobre el peso de los comerciales y la herramienta contesto que "en ningun momento hemos hablado de peso". Era MENTIRA: estaba en la IMAGEN, y el modelo solo habia leido el texto. Negarle a alguien enfadado algo que SI hicimos, en publico, es el peor error que se puede cometer aqui.
⛔ PROHIBIDO abrir con una negacion de lo que dice el post ("en ningun momento", "yo no he dicho", "no hemos hablado de", "no va de eso") SALVO que estes absolutamente seguro mirando el POST ENTERO, TEXTO E IMAGEN.
✅ Ante una queja: se le reconoce ("entiendo que suene asi", "tomo nota", "no era la intencion"), se aclara la intencion sin negar el hecho, y no se discute. Nadie gana una discusion en sus propios comentarios.
⛔ Y CUIDADO CON EL RECONOCIMIENTO DE MENTIRA, que es el fallo mas fino de todos: reconocer y acto seguido darle la vuelta con un "pero" ES DISCUTIR. "Entiendo la lectura, PERO el post va justo de lo contrario" le esta diciendo que no ha entendido nada, solo que con buenos modales. PROHIBIDAS las formas "pero va de lo contrario", "pero justo va de", "en realidad va de", "lo que quiere decir es". Si reconoces, reconoces y punto: se aclara la intencion en POSITIVO, sin corregirle a el ("la idea era reirse del gasto, no de quien lo paga").

RULE 3f — ⛔⛔ EL POST ES TEXTO **Y** FOTO, Y LA FOTO SUELE LLEVAR EL CHISTE (Iker, 2026-09-15). Nuestros memes se escriben a proposito para que el TEXTO NO CUENTE lo que ensena la imagen, asi que leer solo el texto es leer medio post.
· SI TE LLEGA LA IMAGEN: miralas las dos antes de contestar. Lo que se ve en la foto cuenta igual que lo que esta escrito, y para explicar una broma normalmente cuenta MAS.
· SI NO TE LLEGA LA IMAGEN (te lo dira el mensaje de usuario): NO PUEDES AFIRMAR NADA SOBRE LO QUE EL POST ENSENA NI SOBRE LO QUE NO ENSENA. Prohibido decir que algo "no sale", "no aparece", "no lo hemos dicho" o "no va de eso". Contesta solo desde lo que SI tienes delante, y si el comentario va de lo que se ve en la foto, se reconoce y se responde en general, sin negar nada.

RULE 3c-quater — ⛔⛔ NUNCA SE VACILA, NUNCA SE LE TOMA POR TONTO A NADIE (Iker, 2026-09-16). Probado con comentarios dificiles, salieron estas, y las cuatro estan PROHIBIDAS en su forma:
· A "Otro post vendiendo humo" -> "el humo no tacha nombres de una lista, los acumula". Es un ZASCA. Aunque el comentario sea despectivo, no se contesta con una replica ingeniosa: eso es vacilar en publico.
· A "¿Esto es verdad o te lo has inventado?" -> "no, esta en el post con nombres y fechas". Le manda a leer, y AFIRMA que es real. NUNCA afirmes que una historia es real ni niegues que sea inventada: muchas escenas de nuestros posts se construyen a partir de un dolor real. Lo que se dice es que lo que cuenta le pasa a muchos comerciales.
· A "Que post mas largo, no he llegado al final" -> "el final es donde esta el golpe". Es decirle "pues leetelo". Se le da la razon ("me he enrollado") y se le resume en una linea.
· A "No se que tiene que ver con el evento" -> "...si no sabes que en ese evento...". NUNCA "si no sabes", "si lo lees", "esta en el post", "como dice el post": todo eso le trata de despistado.
✅ ANTE UN COMENTARIO DESPECTIVO O HOSTIL ("tonteria", "humo", "chorrada", "postureo", "no tiene gracia"): corto, respetuoso y SIN "pero" que le rebata. "Respeto la opinion", "entiendo que no te encaje", "tomo nota", "cada uno lo vive distinto". Nada de zascas, nada de ironia, nada de dejar caer que no lo ha entendido.

RULE 3g — ⛔⛔ SI EL COMENTARIO ES UNA BROMA, SE LE SIGUE LA BROMA (Iker, 2026-09-17). Nuestros memes invitan a jugar, y mucha gente comenta SIGUIENDO EL CHISTE: una exageracion, un disparate, una ocurrencia, un "jajaja", un "solo para valientes". Eso NO es una opinion para analizar ni una tactica para valorar.
El caso real: en un meme, Antonio N. contesto dentro de un hilo "una que funciona muy bien es, tu madre se ha tropezado en la ducha. Solo para valientes", y la herramienta respondio "funciona porque mezcla urgencia con un nombre real y de ahi a preguntar por el responsable hay solo un paso". Se lo tomo AL PIE DE LA LETRA y le explico su propio chiste como si fuera un consejo de ventas. Lo que contesto Iker a mano, y es el tono: "me la apuntare por si la necesito en el futuro jajaja".
⛔ PROHIBIDO ante una broma: explicar por que "funciona", analizarla, valorarla como tecnica, sacar la leccion de ventas, o contestar en serio.
✅ LO QUE SE HACE: seguirle el rollo en su mismo registro, corto y con complicidad. Reirse con el ("jajaja"), hacer como que te la quedas, subir un pelin la exageracion o rematarla. Lee el TONO antes que las palabras: si la frase es absurda, exagerada o viene con risas o emojis de risa, es una broma aunque suene a consejo.
⚠️ Lo de la RULE 3c-bis y 3c-quater sigue mandando: seguir la broma nunca es reirse DE el, y una broma racista, machista u ofensiva no se sigue (RULE 3c).

RULE 3d — CERO CIFRAS INVENTADAS (Iker, 2026-08-12). NUNCA metas un porcentaje ni una cifra en una respuesta: ni "el 80% de las veces", ni "el 80% de los tratos", ni "9 de cada 10", ni "3 veces mas". Suenan a dato y NO ESTAN COMPROBADOS, asi que es exactamente lo que la casa tiene prohibido en los posts: inventar un numero. Y en un comentario es peor, porque el que lo lee puede pedirte la fuente delante de todos.
Di la MAGNITUD con palabras: "la mayoria de los tratos", "casi siempre", "en la mayoria de los casos", "muy pocas veces", "la mayor parte del tiempo", "rara vez". Dicen lo mismo, se leen igual de fuerte y no se pueden desmentir.
UNICA excepcion: una cifra que este ESCRITA en el post o que la haya dicho el propio comentarista. Esa se puede recoger, porque ya esta publicada y verificada. Lo prohibido es que la cifra nazca aqui.

RULE 3e — CERO ANECDOTAS INVENTADAS (Iker, 2026-08-19). Es la MISMA regla que la 3d, pero para los hechos en vez de para los numeros, y es igual de innegociable. NUNCA te inventes una escena, un encuentro ni una conversacion que no consta en ningun sitio.
⛔ PROHIBIDO abrir o rellenar con cosas como: "el otro dia", "la otra vez", "hace poco", "ayer", "la semana pasada", "el mes pasado", "en una reunion", "en una llamada", "en una demo", "en una visita", "un cliente me dijo", "un cliente me conto", "me lo dijo un comercial", "tengo un cliente que", "conozco un caso", "justo esta semana me paso".
Suenan a experiencia real y NO LO SON. Es exactamente lo que la casa tiene prohibido en los posts —inventar una empresa, una persona o un dato— y en una respuesta publica es peor: cualquiera puede preguntarte quien era ese cliente delante de todo el hilo, y no hay respuesta.
✅ QUE SE HACE EN SU LUGAR. La respuesta se alimenta de lo que YA EXISTE: lo que dice el comentario, lo que dice el post, o una idea general sin escena. "A los comerciales les pasa constantemente" es valido porque es una observacion general y nadie te va a pedir la factura. "El otro dia un cliente me conto que le pasaba" NO lo es, porque afirma un hecho concreto que no ha ocurrido.
✅ SI de verdad hace falta un angulo personal, que sea INCOMPROBABLE y sin escena: "me ha pasado algo parecido", "lo vemos mucho", "es de las cosas que mas repetimos". Nada de fecha, nada de sitio, nada de personaje.
UNICA excepcion: un hecho que este ESCRITO en el post o que lo haya contado el propio comentarista. Eso se puede recoger y comentar, porque ya lo ha publicado el. Lo prohibido es que el hecho NAZCA en esta respuesta.

RULE 4 — TONE: You're the host, not a salesman. Acknowledge the commenter, engage with their actual point (agree or build on it, NOT push back, ver RULE 3c). NO generic "Thanks for sharing!" / "Great point!" filler. Los emojis los decide la regla EMOJIS del mensaje de usuario, que va por cuenta: no los saques de signature_moves.

RULE 5 — START WITH THE NAME, THEN A SPACE, THEN A LOWERCASE FIRST WORD (but normal capitalization after that): Begin the reply with the commenter's full display name VERBATIM (exact casing, exact spelling) at position 0, followed by a SINGLE SPACE — NO comma, no colon, no punctuation after the name. The FIRST word after the name is lowercase (close/casual). Example: "Basilio García y lo peor es que…" / "Joan Bisquert totalmente de acuerdo…" — NOT "Basilio García, ..." and NOT "Basilio García. Lo peor…". From there ON, write with NORMAL capitalization: a new sentence after a period / ! / ? starts with a CAPITAL letter, as in any text. ONLY the very first word after the name is lowercase — do NOT carry lowercase across a period. Wrong: "exacto eso es. y lo que más caro…". Right: "exacto eso es. Y lo que más caro…". The name becomes a blue @-mention chip on LinkedIn and flows straight into the sentence; the backend turns this leading name into a real @-mention tag, so it must be verbatim at position 0. If a name was not provided, skip this rule and open naturally — still lowercase first word, normal capitalization after.

RULE 6 — NO META: Don't reference that this is LinkedIn. Don't talk about "the algorithm".

RULE 7 — OUTPUT: ONE reply. Plain text. No markdown, no quotes wrapping the whole thing, no preamble like "Here's the reply:". Just the reply.

RULE 8 — NEVER USE THE LONG DASH: do NOT use "—" (em dash) or "–" (en dash) anywhere. It's a top tell that a reply was written by AI. Use a comma, a period, or a connector ("y", "pero", "así que") instead. Plain everyday punctuation only.

RULE 8b — NEVER USE A COLON (Iker, 2026-08-12). Do not write ":" anywhere in the reply. It belongs to the same family of tell as the em dash. Nobody answering a comment from their phone builds a clause and then announces the rest with a colon, but a model does it constantly, because RULE 3 forces ONE sentence and the colon is the cheapest way to glue two ideas into one. Use a COMMA instead, or drop the second idea altogether, since one sentence means one idea and not two ideas stapled together. Wrong "Lo caro no es eso: es dar con el que decide". Right "Lo caro no es eso, es dar con el que decide".

RULE 9 — NO COMMA BEFORE "Y" / "E": never write a comma directly before the connector "y" (or "e"). "recursos limitados, y la demanda sube" → "recursos limitados y la demanda sube". The comma-before-"y" reads formal/AI; real people drop it. (Comma before "pero" is fine and natural — this rule is only about "y"/"e".)

RULE 10-PREGUNTA — ⛔ LA RESPUESTA NUNCA ES UNA PREGUNTA (Iker, 2026-09-16). A quien nos comenta se le APOYA, no se le examina. Devolverle una pregunta ("¿y cuántas veces crees que...?", "¿caro comparado con qué?") le pasa el trabajo a él, y a alguien que acaba de darnos la razón se le lee como un examen o como que le corriges. Prohibido el signo de interrogación en la respuesta, tambien la pregunta retórica. Si el comentario PREGUNTA algo, se le CONTESTA, no se le devuelve otra pregunta.

RULE 10 — CÓMO EMPIEZA LA RESPUESTA (Iker, 2026-09-15). El arranque de ESTA respuesta te llega DECIDIDO en el mensaje de usuario, junto con el movimiento. Úsalo. No elijas tú cómo abrir.

RULE 10b — ⛔ PROHIBIDO ABRIR CON UNA ABSTRACCIÓN. Estas aperturas están VETADAS, y no es cuestión de gusto: son la tabla de delatores de IA de la casa (brand-voice §3), las mismas que el validador de posts tumba desde hace meses. NUNCA empieces una respuesta con: "lo más importante", "lo más curioso", "lo más crucial", "lo más clave", "lo más difícil", "lo fundamental", "lo esencial", "lo cierto es que", "la clave está en", "la clave es", "el secreto es", "la verdad es que", "la realidad es que", "al final del día", "lo que nadie dice", "lo que nadie sabe", "lo que casi nadie cuenta", "lo interesante es que", "es fundamental", "es crucial", "es clave".
⚠️ Y NO ES SOLO LA LISTA: es la FORMA. Abrir con un sustantivo abstracto y un verbo copulativo ("La eficiencia comercial no está en...", "El contacto directo es solo un dato...", "La diferencia entre X e Y...") se lee igual de canned aunque la palabra no esté en la lista. Se abre por lo CONCRETO: un verbo, una persona, un objeto, una palabra que haya dicho ÉL, o la palabra de asentimiento que te llega sorteada. Si al leer tu primera frase no se ve a nadie haciendo nada, reescríbela.
⛔ Y NUNCA "exactamente". Si asientes, usas la palabra de asentimiento que te llega sorteada, tal cual, sin alargarla a un adverbio.

RULE 11 — NAME-ONLY OR EMOJI-ONLY COMMENTS → REPLY WITH A SINGLE SUPPORT EMOJI. If the comment is ONLY a person's name (someone tagging a colleague, e.g. "@Fulano" or just "Fulano Menganez"), or ONLY emoji(s) / a reaction with no real words, do NOT write sentences. Reply with a SINGLE supportive emoji that fits the tone (🙌 · 🔥 · 💪 · 👏 · ❤️ · 😄). No name lead, no words at all — just the emoji. This OVERRIDES rules 3, 4, 5 and 10 for these cases.

${STRETCH_RULES[voice].r12}

${STRETCH_RULES[voice].r13}`;

export function buildPrompt(
  input: ReplyGenerationInput,
  voice: Voice
): { prompt: string; arranque: string; conEmoji: boolean; estirar: boolean; emojiElegido: string; palabraAlargar: string } {
  const v = input.authorVoice;
  const voiceBlock = [
    v.voice_style ? `VOICE STYLE: ${v.voice_style}` : null,
    v.worldview ? `WORLDVIEW: ${v.worldview}` : null,
    v.signature_moves ? `SIGNATURE MOVES: ${v.signature_moves}` : null,
    v.avoid ? `AVOID: ${v.avoid}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const commenterLine = input.commenterName
    ? `Commenter: ${input.commenterName}${input.commenterHeadline ? ` (${input.commenterHeadline})` : ''}`
    : 'Commenter: unknown';

  // Surfaced as a separate, hard instruction so it doesn't get diluted by
  // the post/voice context above. Keeps RULE 5 (mention prefix) front and
  // centre right before the model writes.
  const mentionInstruction = input.commenterName
    ? `MENTION PREFIX (required): Begin your reply with exactly "${input.commenterName} " — the name verbatim (same casing and spelling) followed by a SINGLE SPACE and NO comma, then continue in lowercase. The backend converts that leading name into a LinkedIn @-mention tag, so any deviation breaks the tag. And never use a "—"/"–" dash anywhere in the reply.`
    : `MENTION PREFIX: Skip — no commenter name available, open naturally (lowercase first word, no "—" dash).`;

  // Per-call variety nudge: pick the opening MOVE here, in code, so replies don't
  // converge on the same shape across comments (RULE 10).
  //
  // ⚠️ ESTO YA EXISTÍA Y NO FUNCIONABA, y el motivo importa. Estaba redactado como
  // preferencia — "lean toward this move IF it fits the comment naturally (don't
  // force it)" — y esa puerta de salida se la toma el modelo EN CADA LLAMADA: cada
  // una es independiente, no sabe con qué abrió la anterior, así que "no lo fuerces"
  // se traduce en volver a su favorito siempre. El usuario acabó viendo respuesta
  // tras respuesta abierta con "y lo más curioso" (2026-07-17). El THANKS VARIANT de
  // abajo lleva el mismo mecanismo y sí funciona, porque MANDA en vez de sugerir.
  // Lección: un sorteo por llamada solo sirve si es obligatorio. Si le das un "si te
  // encaja", no has sorteado nada.
  // ⛔ AQUI ESTABA LA FABRICA DE ANECDOTAS INVENTADAS (Iker, 2026-08-19).
  //
  // Este sorteo es OBLIGATORIO ("Use THAT one"), y dos de las ocho opciones le
  // mandaban inventar:
  //   · 'build on their point with a concrete example or number'
  //   · 'drop a tiny relevant anecdote or behind-the-scenes detail'
  // O sea que UNA DE CADA CUATRO respuestas tenia la ORDEN de sacarse una
  // anecdota o una cifra de la manga. De ahi salian "el otro dia en una reunion
  // un cliente me dijo…" y compañia. No era el modelo desviandose: era el prompt
  // pidiendoselo, y encima chocando de frente con la RULE 3d, que prohibe las
  // cifras inventadas desde el 12/08.
  //
  // La variedad se mantiene, pero ahora TODAS las opciones se alimentan de algo
  // que ya existe: el comentario, el post, o una idea general sin escena. Nada
  // que obligue a inventarse un hecho.
  // ⛔⛔ EL MOVIMIENTO Y EL ARRANQUE VAN JUNTOS (Iker, 2026-09-15).
  //
  // EL FALLO, con su fecha y su causa: el 19/08, arreglando la fabrica de
  // anecdotas inventadas, se cambiaron los dos movimientos CONCRETOS
  // ('...with a concrete example or number', 'drop a tiny relevant anecdote')
  // por otros ABSTRACTOS ('in general terms', 'state the general rule',
  // 'name the thing they left implicit'). Sumados a la RULE 3d ("di la magnitud
  // con palabras") y a la RULE 3e ("una idea general sin escena"), el prompt
  // entero quedo empujando hacia lo abstracto. Y una abstraccion en español
  // tiene UNA sola forma natural de empezar: "Lo mas importante...", "Lo que
  // nadie dice...", "La clave esta en...". O sea, la tabla de delatores de IA
  // de brand-voice §3 al completo.
  //
  // MEDIDO el 2026-09-15 sobre los comentarios que de verdad publicamos:
  // 15 de 19 (79%) abren con una abstraccion, y "la eficiencia" y "la
  // diferencia" salen DOS veces cada una en 19, en cuentas distintas. Por eso
  // pasa en los tres perfiles pese a tener tonos distintos: la apertura es lo
  // unico del prompt que NO va por voz.
  //
  // EL ARREGLO: cada movimiento lleva pegado su ARRANQUE, asi que el sorteo ya
  // no decide solo DE QUE se habla sino CON QUE PALABRA se empieza. Sin esto,
  // 7 de los 8 movimientos no tenian nada que decidiera las primeras palabras
  // (el sorteo de asentimiento solo entra "IF your reply agrees"), y lo que no
  // se decide lo decide el modelo, que siempre elige igual.
  const OPENING_MOVES: Array<{ move: string; arranque: string }> = [
    {
      move: 'agree, then add a specific angle they did NOT mention',
      arranque: 'la palabra de asentimiento sorteada, tal cual',
    },
    {
      move: 'build on their point by taking it one step further, in general terms',
      arranque: 'un VERBO conjugado (no un sustantivo abstracto)',
    },
    {
      move: 'answer their question / curiosity directly and plainly',
      arranque: 'la respuesta seca a lo que pregunta, sin preambulo',
    },
    {
      move: 'open with a short punchy reaction line, then one line that expands it',
      arranque: 'una reaccion de 2 o 3 palabras',
    },
    {
      move: 'pick up a specific word or phrase THEY used and run with it',
      arranque: 'esa misma palabra suya, literal',
    },
    {
      move: 'connect their point back to something the POST already says',
      arranque: 'una persona o un objeto del post (el comercial, el cliente, la lista, el telefono)',
    },
    {
      move: 'name the thing they left implicit, the part they did not say out loud',
      arranque: 'el SUSTANTIVO CONCRETO de eso que no dijo, nunca "lo que nadie..."',
    },
    {
      move: 'state the general rule their comment is an instance of',
      arranque: 'un adverbio de frecuencia (casi siempre, rara vez, al final, normalmente)',
    },
    {
      move: 'point at the cost of NOT doing what they describe',
      arranque: 'una negacion (no, nadie, ninguno, ni)',
    },
  ];
  const elegido = OPENING_MOVES[Math.floor(Math.random() * OPENING_MOVES.length)];
  const move = elegido.move;

  // La palabra de asentimiento tambien se SORTEA (Iker, 2026-08-06). El sorteo de
  // OPENING_MOVES ya estaba y aun asi el usuario seguia viendo "exacto" en todos
  // los perfiles: el movimiento "agree, then add…" no dice CON QUE PALABRA se
  // asiente, asi que el modelo volvia a su favorita. Misma leccion de siempre:
  // "da variedad" no produce variedad, produce la misma palabra. Se manda una.
  //
  // Las variantes con vocal estirada solo se ofrecen a las voces que ya estiran
  // (RULE 12): en la de Unai quedarian fuera de registro.
  const ASENTIMIENTOS = ['exacto', 'justo', 'eso es', 'tal cual', 'cierto',
    'totalmente', 'claro', 'sin duda', 'ahí está', 'ese es el tema',
    'y tanto', 'buen punto', 'lo has clavado', 'te compro eso'];
  // ALARGAR O NO, SORTEADO AQUI (Iker, 2026-09-16). "Casi todas" no es
  // variedad y "a veces" no produce "a veces": lo decide el dado, por voz.
  const PROB_ESTIRAR: Record<Voice, number> = { sobrio: 0.15, medio: 0.35, cercano: 0.55 };
  // Ni alargada ni palabra de asentir a una PREGUNTA, a quien DISCREPA o a quien
  // viene delicado (Iker, 2026-09-18). Salio "tal cuaaal" a "¿el evento es
  // gratis?", "claroo, tramposa, pero…" a una critica y "justooo, normal,
  // culpa mia" a alguien que no entendia el post.
  const comentarioLlano = llano(input.commentText);
  const sinAsentir =
    /[¿?]/.test(input.commentText) ||
    DISCREPA.test(comentarioLlano) ||
    ES_HOSTIL.test(comentarioLlano) ||
    NO_ENTIENDE.test(comentarioLlano);
  const estirar = !sinAsentir && Math.random() < PROB_ESTIRAR[voice];
  // Las variantes estiradas ("juuusto", "clarooo") ya no entran aqui (Iker,
  // 2026-09-18): el asentimiento puede caer en cualquier sitio y la alargada
  // solo tiene dos. La palabra alargada la decide el sorteo de ALARGAR.
  const asent = ASENTIMIENTOS[Math.floor(Math.random() * ASENTIMIENTOS.length)];
  // Palabra y sitio sorteados (Iker, 2026-09-18: "repites mucho claro con
  // varias oes" y "las colocas en posiciones que no tienen sentido"). La palabra
  // no repite ninguna de las ultimas del mismo post, y el sitio es uno de los
  // DOS que valen; el codigo quita la que caiga en otro (sitioAlargable).
  // Si el asentimiento sorteado es de los alargables, ES la palabra: el 17/09
  // salio "tal cuaaal, te compro eso, tal cual" por sortear las dos por separado.
  const recientes = input.postId ? (ALARGADAS_POR_POST.get(input.postId) || []) : [];
  const libres = PALABRAS_ALARGAR.filter((p) => !recientes.includes(p) && p !== asent);
  // En un ELOGIO la alargada es el gracias (tanda del 18/09: "siii, me alegra
  // que te sirva" a "Gran post Iker"). Se alarga el que escriba el modelo.
  const esElogio = ES_ELOGIO.test(llano(input.commentText));
  const palabraAlargar = esElogio
    ? 'gracias'
    : PALABRAS_ALARGAR.includes(asent) && !recientes.includes(asent)
    ? asent
    : (libres.length ? libres : PALABRAS_ALARGAR)[Math.floor(Math.random() * (libres.length || PALABRAS_ALARGAR.length))];

  // Las aperturas que ya se han usado en ESTE post, para que el sorteo no las
  // repita dentro de la misma tanda (ver `APERTURAS_POR_POST` mas abajo).
  const yaUsadas = input.postId ? (APERTURAS_POR_POST.get(input.postId) || []) : [];
  const evitaLista = yaUsadas.length
    ? ` ⛔ EN ESTE MISMO POST ya has abierto respuestas asi: ${yaUsadas
        .map((a) => `"${a}"`)
        .join(', ')}. NINGUNA de las tuyas puede empezar parecido: cambia las primeras palabras de verdad, no el orden.`
    : '';

  const varietyNudge = `OPENING MOVE for THIS reply (RULE 10), decided for you: ${move}. Use THAT one. Only if the comment makes it genuinely impossible, pick a DIFFERENT move from the list — never fall back to whatever you'd have written anyway.
ARRANQUE OBLIGATORIO de esta respuesta: justo despues del nombre, empieza por ${elegido.arranque}. Esto no es una sugerencia y no se negocia con el contenido: si no te encaja, cambia el contenido, no el arranque.
⛔ DOS EXCEPCIONES, y las dos mandan sobre el arranque sorteado: (a) SI EL COMENTARIO ES UN ELOGIO, lo primero es el GRACIAS (RULE 13); (b) SI EL COMENTARIO DICE QUE NO ENTIENDE EL POST, lo primero es quitarle hierro (RULE 3c-bis): "no pasa nada", "normal", "culpa mia". En los dos casos el arranque sorteado se aplica DESPUES o no se aplica. Son los dos unicos sitios donde la variedad pierde, y pierde a proposito.
${sinAsentir
  ? `Esta respuesta NO lleva palabra de asentir ("claro", "exacto", "tal cual", "totalmente"...): el comentario es una pregunta, una discrepancia o alguien que no lo ha entendido, y asentir ahi no tiene sentido. Contesta directamente.`
  : elegido.arranque.startsWith('una negacion')
  ? `Esta respuesta NO lleva palabra de asentir. La negacion del arranque va sobre el PROBLEMA del post ("nadie descuelga", "ningun comercial..."), NUNCA sobre lo que dice el que comenta: "no te compro eso", "no es asi" o "no es eso" estan PROHIBIDAS.`
  : estirar
  ? `UNA SOLA PALABRA DE ASENTIR EN TODA LA RESPUESTA (Iker, 2026-09-18): si asientes, la palabra es la ALARGADA de esta respuesta ("${alargarPalabra(palabraAlargar, 2)}") y NO se le suma ninguna otra ("claro", "exacto", "y tanto", "tal cual", "totalmente"...). Nada de "exactooo, claro y tanto".`
  : `IF your reply agrees with the commenter, the agreement word for THIS reply is "${asent}": use that one and no other, literal, UNA sola vez y al principio, sin convertirla en adverbio ("exactamente" esta PROHIBIDA).`}
⛔ Una palabra de asentir NUNCA va como inciso en mitad de la frase ("el filtro, tal cual, siempre lo pone", "el comercial busca justo, antes de...") ni pegada a otra ("claro y tanto"). Si no asientes, no la metas.
⛔ Y recuerda la RULE 10b: no se abre con una abstraccion ni con un sustantivo abstracto mas verbo copulativo. Se abre por lo concreto.${evitaLista}`;

  // PUNTOS SUSPENSIVOS AL CIERRE (usuario 2026-07-17). Ahora que el 1er jefe (Unai,
  // sobrio) y el 3º (Asier, medio) bajaron el volumen, les falta el gesto que en el
  // 2º (Iker) hace el alargamiento de vocal: algo que diga "esto lo digo con media
  // sonrisa" sin subir el tono. Los puntos suspensivos son eso — el equivalente
  // contenido del emoji, y por eso van justo en las dos voces sobrias y NO en Iker,
  // que ya tiene sus recursos.
  //
  // ⚠️ Se sortea AQUÍ, y no se le pide al modelo "hazlo a veces", por lo mismo que
  // OPENING_MOVES: "a veces" no produce "a veces", produce "siempre" o "nunca". Cada
  // llamada es independiente y no sabe qué hizo la anterior. La frecuencia la decide
  // el dado, no el modelo.
  // CIERRE DE LA RESPUESTA, sorteado por voz (Iker, 2026-08-07).
  //
  // Antes esto era BINARIO —puntos suspensivos o punto— y tenia dos problemas:
  //   · Unai y Asier acababan casi siempre en punto o en suspensivos, y nunca en
  //     exclamacion, aunque una exclamacion de vez en cuando no rompe la sobriedad.
  //   · Iker, con 0 de probabilidad de suspensivos, caia SIEMPRE en la rama del
  //     "acaba con punto normal", asi que el mas cercano de los tres era el unico
  //     obligado a terminar igual siempre. Justo al reves de lo que se buscaba.
  //
  // Ahora son tres salidas y cada voz tiene su reparto. Iker no lleva instruccion:
  // es el unico que puede cerrar como le pida el comentario.
  const CIERRES: Record<Voice, Array<[string, number]>> = {
    // Sobrio: el punto manda. Los suspensivos son su equivalente del emoji y la
    // exclamacion entra poco, para que cuando salga signifique algo.
    sobrio: [['punto', 0.60], ['suspensivos', 0.25], ['exclamacion', 0.15]],
    // Medio: mismo esqueleto con la exclamacion algo mas suelta.
    medio: [['punto', 0.55], ['suspensivos', 0.20], ['exclamacion', 0.25]],
    cercano: [],
  };
  let cierre = '';
  const _tabla = CIERRES[voice];
  if (_tabla.length) {
    let _r = Math.random();
    for (const [nombre, prob] of _tabla) {
      if (_r < prob) { cierre = nombre; break; }
      _r -= prob;
    }
    if (!cierre) cierre = _tabla[0][0];
  }
  const ellipsisNudge =
    cierre === 'suspensivos'
      ? `CIERRE DE ESTA RESPUESTA: termínala con puntos suspensivos ("...") en vez de un punto final. Es tu equivalente sobrio del emoji: deja la frase en el aire, con media sonrisa. UNA vez, al final, nunca en medio. Si la frase no admite quedarse abierta, reescríbela para que sí.`
      : cierre === 'exclamacion'
        ? `CIERRE DE ESTA RESPUESTA: termínala con UNA exclamación ("!"), no con punto. Una sola y al final: en tu tono la exclamación es afecto contenido, no euforia. Nada de "!!" ni de mayúsculas gritadas.`
        : cierre === 'punto'
          ? `CIERRE DE ESTA RESPUESTA: acaba con punto normal. NO uses puntos suspensivos ni exclamación en esta.`
          : `CIERRE DE ESTA RESPUESTA: ciérrala como te pida el comentario — punto, exclamación o puntos suspensivos. Eres el más cercano de los tres y el único sin regla fija aquí.`;

  // EMOJIS, por voz y no por lo que ponga el perfil en la BD (Iker, 2026-08-07).
  // RULE 4 los dejaba a merced de `signature_moves`, que es texto libre de la
  // base de datos: si ahi no se mencionan, no salen nunca, y si se mencionan
  // salen siempre. Demasiado frágil para un rasgo que Iker tiene decidido.
  // EMOJIS SORTEADOS POR VOZ (Iker, 2026-09-16). La tabla decia que Iker "va
  // por libre" y en la practica casi no salia ninguno: "puedes usarlos con
  // naturalidad" es un permiso, y un permiso el modelo casi nunca lo ejerce. Lo
  // decide el dado. Unai sigue sin ninguno. Y nunca en una respuesta DELICADA
  // (alguien que no entiende, que se queja o que viene de malas), donde un
  // emoji al final puede leerse como burla.
  const delicado =
    ES_HOSTIL.test(llano(input.commentText)) ||
    NO_ENTIENDE.test(llano(input.commentText)) ||
    /(no me gusta|no mola|me molesta|ofensiv|falta de respeto|no me ha hecho gracia)/.test(llano(input.commentText));
  const PROB_EMOJI: Record<Voice, number> = { sobrio: 0, medio: 0.25, cercano: 0.5 };
  const conEmoji = !delicado && Math.random() < PROB_EMOJI[voice];
  const emojiElegido = sorteaEmoji();
  const SITIOS = [
    `como PRIMERA palabra de la respuesta, justo despues del nombre y delante del arranque ("${alargarPalabra(palabraAlargar, 2)}, ...")`,
    'dentro de la PRIMERA frase, justo antes de su primera coma, en las tres primeras palabras',
  ];
  const sitioAlargar = SITIOS[Math.floor(Math.random() * SITIOS.length)];
  // ⛔ EL EVENTO: SOLO LO QUE DICE EL POST (tandas del 18/09). Sin esto el
  // modelo contestaba "gratis, esta el enlace en el post" a "¿el evento es
  // gratis?" y "es justo lo que queremos resolver el jueves".
  const eventoNudge = /(evento|donostia)/i.test(input.postContent)
    ? `EVENTO: del evento solo sabes lo que pone el post (dia, sitio, plazas). NO sabes el precio, si es gratis, el programa ni los ponentes: no lo afirmes ni digas que alli se trabaja o se resuelve algo concreto. Si te preguntan algo que no sabes, la respuesta es que se lo pasas por privado. No mandes a buscar el enlace al post y no des por hecho que viene salvo que lo diga.\n`
    : '';
  // ⛔ A QUIEN DISCREPA (tanda del 18/09): "no es una trampa, es que…" le
  // corrige. Se le reconoce lo que dice y se aporta, sin enmendarle.
  const discrepaNudge = DISCREPA.test(comentarioLlano)
    ? `DISCREPA: el comentario lleva la contraria. Reconocele lo que tiene de razon ("en tu sector pesa mas", "es verdad que...") y aporta el matiz sin decirle que se equivoca: nada de "no es X, es Y", nada de "pero", nada de corregirle.\n`
    : '';
  const emojiNudge =
    (conEmoji
      ? `EMOJI: esta respuesta TERMINA con este emoji y ningun otro: ${emojiElegido}`
      : voice === 'sobrio'
        ? 'EMOJI: NUNCA. Ni uno. Eres el fundador y tu tono no los necesita.'
        : 'EMOJI: esta respuesta va SIN emoji.') +
    ' ' +
    (estirar
      ? `ALARGAR: esta respuesta lleva EXACTAMENTE UNA palabra alargada, una palabra corta de reaccion con la vocal final estirada (RULE 12). Si encaja, que sea "${palabraAlargar}"; si no, otra de reaccion. Esta vez va ${sitioAlargar}. En ningun otro sitio: entre dos comas en mitad de la respuesta suena fatal. Una, no dos.`
      : 'ALARGAR: esta respuesta NO lleva ninguna palabra alargada, tampoco el gracias (RULE 12).');

  // Same per-call trick as OPENING_MOVES, for the same reason. RULE 13 lists the
  // thanks variants but a menu doesn't produce variety: every call is independent,
  // so the model can't know what it said last time and just picks its favourite.
  // In practice that was ALWAYS "graciaas por el cariño". Picking one HERE is the
  // only thing that actually spreads them out across replies.
  //
  // ⛔ Y LA LISTA VA POR VOZ (Iker, 2026-08-12). Era UNA sola compartida, así
  // que a Unai —el CEO, el más sobrio— le podía tocar "graciaas por el cariño",
  // que es demasiado efusivo para alguien que le habla de igual a igual a un
  // director industrial de 55 años. Las tres cuentas AGRADECEN siempre; lo que
  // cambia es la temperatura. El cariño es de Iker y solo de Iker: *"ya ves que
  // el segundo jefe no tiene prácticamente ninguna restricción, pero los otros
  // son más sobrios"*.
  const THANKS_COMUNES = [
    'gracias por valorarlo',
    'gracias por tenerlo en cuenta',
    'gracias por decirlo',
    'gracias por leerlo',
    'gracias por pasarte por aquí',
    'gracias por el apunte',
    'me alegra que te sirva',
    'plain elongated thanks with nothing after it ("graciaas", "muchas graciaaas")',
  ];
  const THANKS_POR_VOZ: Record<string, string[]> = {
    // Unai: nada efusivo. Solo el agradecimiento que firmaría un fundador.
    sobrio: THANKS_COMUNES,
    // Asier: igual que Unai, más una de calidez media.
    medio: [...THANKS_COMUNES, 'qué bien que te haya servido'],
    // Iker: todas, incluidas las cálidas que son suyas en exclusiva.
    cercano: [
      ...THANKS_COMUNES,
      'qué bien que te haya servido',
      'graciaas por el cariño',
      'se agradece un montón',
    ],
  };
  const THANKS_VARIANTS = THANKS_POR_VOZ[voice] ?? THANKS_COMUNES;
  const thanks = THANKS_VARIANTS[Math.floor(Math.random() * THANKS_VARIANTS.length)];
  const thanksNudge = `THANKS VARIANT for THIS reply (only relevant IF the comment is praise, see RULE 13): use this specific flavour of thanks rather than your usual one: "${thanks}". Adapt the vowel stretch to your voice per RULE 12. If the comment is NOT praise, ignore this line entirely — do not bolt a thanks onto a comment that wasn't complimenting you.`;


  // Lead magnet: this person didn't just comment, they asked for something. Lo
  // que cambia es si ya se lo estamos mandando o si primero tiene que darnos el
  // paso, y confundir las dos cosas es prometer un envío que no ha salido.
  const leadMagnetInstruction = !input.leadMagnet
    ? ''
    : input.leadMagnet.pedirSolicitud
    ? `\n═══ LEAD MAGNET (applies to THIS reply) ═══
This person commented on a post that offered a resource about "${input.leadMagnet.topic}". You CANNOT send it to them: they are not a connection of yours and LinkedIn does not deliver private messages to non-connections.

So this reply has TWO jobs and needs both:
1. ENGAGE with what they actually said. They wrote something real (an opinion, their own experience, a question). React to THAT, specifically, the way you would to any good comment. This is the part that matters.
2. ASK THEM to send YOU the connection request, in a SHORT closing beat, and say WHY: LinkedIn won't let you message someone who isn't a contact. Something in the shape of "mandame solicitud y te lo paso, que LinkedIn no me deja escribirte si no somos contacto".

Order matters: engage FIRST, ask LAST. NEVER claim the resource is sent, on its way, or waiting in their DMs — nothing has been sent and nothing will be until they act; that lie is the whole reason this instruction exists. Ask for the CONNECTION REQUEST ("solicitud"), never for a follow: a follower still cannot be messaged, so asking for a follow would waste the lead. Keep the whole thing to ONE sentence even with both jobs.\n`
    : `\n═══ LEAD MAGNET (applies to THIS reply) ═══
This person commented on a post that offered a resource about "${input.leadMagnet.topic}" in exchange for a keyword. You are sending them that resource by private message RIGHT NOW.

So this reply has TWO jobs and needs both:
1. ENGAGE with what they actually said. They didn't only drop the keyword — they wrote something real (an opinion, their own experience, a question). React to THAT, specifically, the way you would to any good comment. This is the part that matters; a reply that skips it is worthless.
2. CONFIRM the resource is sent, in a SHORT closing beat — "te lo acabo de mandar", "lo tienes en privado", "te lo he pasado por DM". Casual, tacked on at the end, NOT the headline of the reply.

Order matters: engage FIRST, confirm LAST. Never open with "enviado" — that turns a real comment into a receipt, which is exactly what we're trying to avoid. Keep the whole thing to ONE sentence even with both jobs: engage and confirm in the same breath.\n`;

  // La imagen del meme llega como TEXTO resumido una vez por post
  // (`postImageText`), no como foto: es lo que la hace barata.
  const imagenBloque = input.imageSummary
    ? `═══ LO QUE HAY EN LA IMAGEN DEL POST (es un MEME: el chiste vive aqui) ═══
${input.imageSummary}

`
    : '';
  const avisoImagen = input.imageSummary
    ? `LA IMAGEN DEL POST TE LLEGA RESUMIDA ARRIBA. Usala para entender la broma y el tono del comentario (RULE 3f y 3g), pero no la describas ("en la imagen se ve...") ni cites nada que no este en ese resumen.`
    : `⛔ NO VES LA IMAGEN DE ESTE POST y casi todos nuestros posts llevan una. Solo tienes el texto, asi que NO afirmes nada sobre lo que el post ensena ni sobre lo que NO ensena, y no le niegues a nadie nada de lo que diga sobre la foto (RULE 3f).`;
  // Lo que se dijo antes en el hilo. Solo contexto: se responde al comentario de abajo.
  const hilo = (input.hilo || []).filter((m) => m.texto && m.texto.trim()).slice(-4);
  const hiloBloque = hilo.length
    ? `═══ EL HILO HASTA AHORA (contexto, de viejo a nuevo; tu respuesta va al comentario de abajo) ═══
${hilo.map((m) => `${m.autor || '(alguien)'}: "${m.texto.trim().slice(0, 300)}"`).join('\n')}

`
    : '';

  const prompt = `You are ${input.authorName}. Reply to a comment on your own post.

${voiceBlock || '(No detailed voice profile — default to a natural, direct tone consistent with your post.)'}

═══ YOUR POST ═══
${input.postContent}

${imagenBloque}${hiloBloque}═══ THE COMMENT YOU ARE REPLYING TO ═══
${commenterLine}
"${input.commentText}"

${mentionInstruction}
${leadMagnetInstruction}
${varietyNudge}
${eventoNudge}${discrepaNudge}
${ellipsisNudge}

${emojiNudge}

${thanksNudge}

${avisoImagen}

Write the reply now. Plain text, ONE single sentence, in the same language as the post/comment.`;
  return { prompt, arranque: elegido.arranque, conEmoji, estirar, emojiElegido, palabraAlargar };
}

// EL GUARDARRAIL, PORQUE UN PROMPT ES UNA PETICION Y NO UNA GARANTIA
//
// Las RULE 3d (cifras) y 3e (anecdotas) le PIDEN al modelo que no invente. Esto
// lo COMPRUEBA. La diferencia importa: la 3d lleva desde el 12/08 en el prompt y
// aun asi el 19/08 seguian saliendo respuestas con "el otro dia un cliente me
// dijo". Lo que no se mide, no se cumple.
//
// Es la misma leccion que este fichero ya tiene escrita para OPENING_MOVES:
// pedirle algo al modelo "si te encaja" no produce el comportamiento. Aqui se
// comprueba la salida y, si inventa, se vuelve a pedir con el fallo delante.

// ⛔⛔ UNA SOLA PALABRA ALARGADA POR RESPUESTA, EN CUALQUIER CUENTA (Iker, 2026-09-16)
//
// Iker: "sea el jefe que sea o sea lo de Google Chat, nunca pongas varias
// palabras con varias vocales. Siempre maximo una palabra, y solo la que mejor
// vaya a quedar". Y dio sus ejemplos: "clarooo", "siii", "buenoo", "nooo",
// "bieeen". Lo que tienen en comun, y es lo que se le pide al modelo: son
// palabras CORTAS de reaccion (asentir, negar, valorar), que abren o cierran la
// frase, y lo que se alarga es la VOCAL FINAL. Nunca un sustantivo en mitad de
// la frase.
//
// El prompt lo pide; esto lo GARANTIZA: si salen dos o mas, se deja la primera
// y las demas se devuelven a su forma normal. Es determinista y no gasta una
// llamada. La deteccion es conservadora a proposito, porque el castellano tiene
// dobles vocales legitimas ("lee", "cree", "desee", "coordinar") y en el texto
// se cuelan palabras inglesas ("Neety", "feedback", "Google"):
//   · una racha de 3 o mas letras iguales, en cualquier sitio
//   · una doble a/i/u/o AL FINAL de palabra ("buenoo", "siii", "totaal"),
//     menos la "ee" final, que es subjuntivo ("desee", "emplee")
//   · una doble a/i/u EN MEDIO ("muuy", "juusto"), que casi no existe en ingles
//   · una "ss" final ("graciass"), que ninguna palabra castellana tiene
const DOBLE_OK = new Set(['zoo', 'hawaii', 'boss', 'stress', 'business', 'fitness', 'less', 'express', 'class', 'press', 'success', 'kiss', 'cross']);

function llanoLetra(w: string): string {
  return w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function esEstirada(palabra: string): boolean {
  const w = llanoLetra(palabra);
  if (w.length < 2 || DOBLE_OK.has(w)) return false;
  if (/([a-z])\1\1/.test(w)) return true;
  if (/(aa|ii|uu|oo)$/.test(w)) return true;
  if (/[a-z](aa|ii|uu)[a-z]/.test(w)) return true;
  if (/[aeiou]ss$/.test(w)) return true;
  // Una palabra de reaccion con CUALQUIER letra doblada tambien cuenta ("bieen",
  // "vaale", "buueno"): las reglas de arriba no ven la doble e/o interior, y el
  // colapso de las voces sobrias convierte "bieeen" en "bieen". Sin esto,
  // "claroo y bieen" pasaba como UNA alargada (Iker, 2026-09-16: maximo una).
  const base = w.replace(/([a-z])\1+/g, '$1');
  if (base !== w && REACCION.has(base)) return true;
  return false;
}

function desestirar(palabra: string): string {
  // Colapsa cualquier racha de letras iguales y la "ss" final. Solo se llama
  // sobre palabras que esEstirada() ya ha marcado.
  return palabra.replace(/(\p{L})\1+/gu, '$1');
}

/** Devuelve TODAS las palabras alargadas a su forma normal. */
export function desestirarTodo(texto: string): string {
  return texto.replace(/\p{L}+/gu, (w) => (esEstirada(w) ? desestirar(w) : w));
}

/** Cuantas palabras alargadas lleva el texto. */
export function contarEstiradas(texto: string): number {
  return (texto.match(/\p{L}+/gu) || []).filter(esEstirada).length;
}

// Las palabras que SI se pueden alargar: cortas y de reaccion, que son las que
// le gustan a Iker. En la prueba del 16/09 salio "la lista al final encogeee",
// un verbo en mitad de la frase, y eso no suena a alguien tecleando con ganas,
// suena a errata. Lo que no esta aqui vuelve a su forma normal.
const REACCION = new Set([
  'claro', 'si', 'bueno', 'buena', 'no', 'bien', 'vale', 'total', 'genial', 'justo', 'eso',
  'gracias', 'exacto', 'cierto', 'muy', 'buenisimo', 'buenisima', 'cual', 'super', 'top',
  'nada', 'ya', 'venga', 'guay', 'perfecto', 'brutal', 'tremendo', 'enorme', 'toma', 'hombre',
]);

// ⛔ LOS DOS SITIOS DE LA ALARGADA (Iker, 2026-09-18). "No tiene sentido que
// me pongas una frase, buenooo, y luego otra frase. Suena fatal". Solo vale:
//   · como PRIMERA palabra ("siii, ...", "clarooo que ...")
//   · en la PRIMERA frase, entre las tres primeras palabras y justo antes de
//     una coma o del final de esa frase ("pues siii, ...", "tal cuaal, ...")
// Cualquier otra posicion vuelve a su forma normal.
// Prueba contra produccion del 17/09: "perfectooo y la excusa…" (primera, pero
// sin pausa detras) y "apuntate ciertooo, que…" (segunda, detras de un verbo)
// sonaban raro. Detras tiene que ir una pausa, salvo "claro que" / "si que", y
// en segunda posicion solo vale detras de una muletilla.
const MULETILLAS = new Set(['pues', 'y', 'uy', 'uf', 'uff', 'ah', 'oh', 'eh', 'ay', 'hombre', 'vamos', 'jo', 'buah', 'bua', 'ya', 'si', 'no', 'jaja', 'jajaja', 'mira', 'bueno', 'vaya', 'tal']);
export function sitioAlargable(texto: string, off: number, palabra: string): boolean {
  const antes = texto.slice(0, off);
  if (/[.!?…]/.test(antes)) return false;
  const previas = (antes.match(/\p{L}+/gu) || []).map(llanoLetra);
  if (previas.length > 2) return false;
  if (previas.some((w) => !MULETILLAS.has(w))) return false;
  const despues = texto.slice(off + palabra.length);
  if (/^\s*([,.!?…]|$)/.test(despues)) return true;
  if (previas.length) return false;
  // Primera palabra sin pausa: solo "claro que" / "si que", "gracias por…" y
  // "muy…" ("muuuy bien dicho"), que se leen de corrido.
  const base = llanoLetra(desestirar(palabra));
  if (/^(claro|si)$/.test(base)) return /^\s+que(?![\p{L}])/iu.test(despues);
  return base === 'gracias' || base === 'muy';
}

/**
 * Deja como mucho UNA palabra alargada: de reaccion y en uno de sus dos sitios.
 * Todas las demas vuelven a su forma normal.
 */
export function limitarEstiradas(texto: string): string {
  let vistas = 0;
  return texto.replace(/\p{L}+/gu, (w: string, off: number) => {
    if (!esEstirada(w)) return w;
    const base = llanoLetra(desestirar(w));
    if (!REACCION.has(base) || vistas > 0 || !sitioAlargable(texto, off, w)) return desestirar(w);
    vistas++;
    return w;
  });
}

export const EMOJI_RE = /\p{Extended_Pictographic}/u;
export const EMOJI_RE_G = /\p{Extended_Pictographic}️?/gu;

// Emojis que no pueden quedar mal al final de casi nada. Se usan SOLO cuando el
// sorteo dijo "con emoji" y el modelo no lo puso: nada de risas ni corazones,
// que al final de una frase seria pueden sonar a burla.
const EMOJI_SEGUROS = ['🙌', '💪', '👏', '🙂', '🤝'];

// El emoji tambien se SORTEA (Iker, 2026-09-16): dejado al modelo, salio 🔥 en
// 4 de 5 respuestas seguidas, que es otra forma de plantilla.
export const EMOJIS_RESPUESTA = ['🙌', '💪', '👏', '🔥', '🤝', '👌', '😄', '🎯'];
export function sorteaEmoji(): string {
  return EMOJIS_RESPUESTA[Math.floor(Math.random() * EMOJIS_RESPUESTA.length)];
}

/**
 * Deja UN emoji al final: el sorteado. Si el modelo puso otro, se sustituye;
 * si no puso ninguno, se anade.
 */
export function ponerEmojiAlFinal(texto: string, emoji?: string): string {
  const e = emoji || EMOJI_SEGUROS[Math.floor(Math.random() * EMOJI_SEGUROS.length)];
  if (!emoji && EMOJI_RE.test(texto)) return texto.replace(/(?<!\.)\.\s*(\p{Extended_Pictographic})/gu, ' $1');
  // ⛔ Nunca un punto justo antes del emoji (Iker, 2026-09-16: "queda mal").
  // Los puntos suspensivos si se quedan.
  const sinPunto = quitarEmojis(texto).replace(/(?<!\.)\.\s*$/, '');
  return `${sinPunto} ${e}`;
}

/**
 * Si toco alargar y el modelo no lo hizo, se alarga la primera palabra de
 * reaccion que haya ("claro" -> "clarooo", "gracias" -> "graciaas"). Si no hay
 * ninguna, no se fuerza: alargar un sustantivo cualquiera es peor que no
 * alargar nada.
 */
// Estas solo son reaccion cuando van SUELTAS (seguidas de coma, punto o fin):
// "no, la lista…" si, pero "la empresa que nooo sale" es una negacion alargada
// y suena a errata (prueba del 16/09). Igual "si" condicional, "ya" temporal,
// "la cual", "una buena idea".
const SOLO_SUELTAS = new Set([
  'no', 'si', 'ya', 'nada', 'toma', 'hombre', 'vale', 'total', 'venga', 'cual', 'super', 'top',
  'bueno', 'buena', 'eso',
]);

function alargable(w: string, despues: string, antes: string): boolean {
  const b = llanoLetra(w);
  if (!REACCION.has(b) || b.length < 2) return false;
  // "eso" se deja alargar si lo escribe el modelo ("esooo" suelto), pero el
  // codigo no lo elige: en mitad de la frase es un pronombre.
  if (b === 'eso') return false;
  if (b === 'cual' && /\btal\s*$/i.test(antes)) return true;
  if (SOLO_SUELTAS.has(b)) return /^\s*([,.!…]|$)/.test(despues);
  return true;
}

export function estirarUna(texto: string, letras = 2): string {
  if (contarEstiradas(texto) > 0) return texto;
  // Se elige una AL AZAR entre las que haya, no la primera (Iker, 2026-09-16:
  // "la palabra alargada no puede tener una posicion predecible").
  const candidatas: number[] = [];
  for (const m of texto.matchAll(/\p{L}+/gu)) {
    const i = m.index ?? 0;
    if (alargable(m[0], texto.slice(i + m[0].length), texto.slice(0, i)) && sitioAlargable(texto, i, m[0])) candidatas.push(i);
  }
  if (!candidatas.length) return texto;
  const donde = candidatas[Math.floor(Math.random() * candidatas.length)];
  return texto.replace(/\p{L}+/gu, (w: string, off: number) => (off === donde ? alargarPalabra(w, letras) : w));
}

/** "claro" -> "clarooo", "bien" -> "bieeen", "gracias" -> "graciaas", "tal cual" -> "tal cuaal". */
export function alargarPalabra(w: string, letras = 2): string {
  if (/\s/.test(w)) {
    const partes = w.split(/\s+/);
    partes[partes.length - 1] = alargarPalabra(partes[partes.length - 1], letras);
    return partes.join(' ');
  }
  const base = llanoLetra(w);
  const plano = w.normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (base === 'gracias') return plano.replace(/as$/i, 'a'.repeat(letras) + 's');
  // Se estira la ULTIMA VOCAL, no la ultima letra: "bien" -> "bieeen",
  // "muy" -> "muuuy", "claro" -> "clarooo", como los ejemplos de Iker.
  const m = plano.match(/^(.*)([aeiou])([^aeiou]*)$/i);
  return m ? m[1] + m[2] + m[2].repeat(letras) + m[3] : w;
}

// ⛔ COMA ANTES DE "Y" (Iker, 2026-09-16): "Sirimiri, y mientras tanto…" suena a
// IA. Se quita en todas las superficies, no solo en las respuestas.
export function quitarComaAntesDeY(texto: string): string {
  return texto.replace(/,\s*(?<![\p{L}])([ye])(?![\p{L}])/giu, ' $1');
}

/** Hay alguna palabra de reaccion que se pueda alargar. */
export function tieneReaccion(texto: string): boolean {
  for (const m of texto.matchAll(/\p{L}+/gu)) {
    const i = m.index ?? 0;
    if (alargable(m[0], texto.slice(i + m[0].length), texto.slice(0, i))) return true;
  }
  return false;
}

// Las que le gustan a Iker (2026-09-16), ya alargadas, para cuando toca alargar
// y la frase no trae ninguna palabra de reaccion. Mas banco el 18/09: con cinco,
// "clarooo" salia una de cada pocas.
export const ALARGADAS_SUELTAS = ['Clarooo', 'Siii', 'Buenooo', 'Bieeen', 'Totaaal', 'Valeee', 'Exactooo', 'Juuusto', 'Geniaaal', 'Ciertooo', 'Perfectooo', 'Tal cuaal'];

// Las bases que sortea la respuesta publica (Iker, 2026-09-18). Sin "no" (abrir
// con una negacion alargada se lee como que le llevas la contraria) ni "eso"
// (en la primera frase suele ser pronombre).
export const PALABRAS_ALARGAR = ['claro', 'si', 'bueno', 'bien', 'vale', 'genial', 'total', 'justo', 'exacto', 'cierto', 'perfecto', 'brutal', 'tal cual'];

// Las ultimas palabras alargadas de cada post, para que en la misma tanda no
// salga "clarooo" tres veces. Mismo patron que APERTURAS_POR_POST.
const ALARGADAS_POR_POST = new Map<string, string[]>();
export function recordarAlargada(postId: string | null | undefined, texto: string): void {
  if (!postId) return;
  const w = (texto.match(/\p{L}+/gu) || []).find(esEstirada);
  if (!w) return;
  let base = llanoLetra(desestirar(w));
  if (base === 'cual') base = 'tal cual';
  const previas = ALARGADAS_POR_POST.get(postId) || [];
  ALARGADAS_POR_POST.set(postId, [...previas, base].slice(-4));
  if (ALARGADAS_POR_POST.size > 200) ALARGADAS_POR_POST.delete(ALARGADAS_POR_POST.keys().next().value as string);
}

/**
 * Como estirarUna, pero GARANTIZA una alargada: si la frase no tiene ninguna
 * palabra de reaccion, abre con una suelta. En la tanda de Google Chat del
 * 16/09 salieron 0 de 5 alargadas porque ninguna frase traia "claro", "muy" o
 * "bien", y estirarUna no fuerza.
 */
export function forzarEstirada(texto: string, letras = 2, palabra?: string, muletilla = Math.random() < 0.3): string {
  const r = estirarUna(texto, letras);
  if (contarEstiradas(r) > 0) return r;
  // Si la frase ya dice esa palabra ("ese es el tema claro y…"), se abre con
  // otra: el 17/09 salio "clarooo, ese es el tema claro" y "exactooo, nadie lo
  // enseña, exacto y…".
  const enTexto = new Set((r.match(/\p{L}+/gu) || []).map(llanoLetra));
  const dice = (w: string) => enTexto.has(llanoLetra(desestirar(w.split(/\s+/).pop() || '')));
  let elegida = palabra;
  if (!elegida || dice(elegida)) {
    const libres = PALABRAS_ALARGAR.filter((w) => !dice(w));
    if (libres.length) elegida = libres[Math.floor(Math.random() * libres.length)];
  }
  const mayus = palabra ? /^\p{Lu}/u.test(palabra) : true;
  let p = elegida
    ? (esEstirada(elegida.split(/\s+/).pop() || '') ? elegida : alargarPalabra(elegida, letras))
    : ALARGADAS_SUELTAS[Math.floor(Math.random() * ALARGADAS_SUELTAS.length)];
  p = mayus ? p[0].toUpperCase() + p.slice(1) : p[0].toLowerCase() + p.slice(1);
  // Y no siempre de primera (Iker, 2026-09-18: "que no sea predecible"): a
  // veces detras de un "pues", que es el otro sitio que vale.
  if (muletilla) p = (mayus ? 'Pues ' : 'pues ') + p[0].toLowerCase() + p.slice(1);
  // Si la frase ya abre asintiendo con una que no se alarga ("totalmente, …"),
  // la alargada la SUSTITUYE: sumarla daba "clarooo, totalmente, …" (18/09).
  let resto = r.replace(/^\s+/, '');
  // Y tambien si abre con "claro y…" / "justo y…" sin pausa: la tanda del 18/09
  // dio "tal cuaaal, claro y lo peor…" y "totaaal, justo y mientras…".
  const arranqueAsiente =
    resto.match(/^(totalmente|efectivamente|sin duda|desde luego|por supuesto|y tanto|eso es|tal cual|claro|exacto|justo|cierto|genial|brutal|perfecto|s[ií])\s*(,|y(?![\p{L}]))\s*/iu) ||
    resto.match(/^(vale|total)\s*,\s*/iu);
  if (arranqueAsiente) resto = resto.slice(arranqueAsiente[0].length);
  // "Casi siempre…" -> "Buenooo, casi siempre…" (sin tocar siglas ni nombres
  // propios que empiecen la frase: solo se baja si la segunda letra es minuscula)
  const bajada = /^\p{Lu}\p{Ll}/u.test(resto) ? resto[0].toLowerCase() + resto.slice(1) : resto;
  return `${p}, ${bajada}`;
}

export function quitarEmojis(texto: string): string {
  return texto.replace(EMOJI_RE_G, '').replace(/\s{2,}/g, ' ').trim();
}

// ⛔ ABRIR CON COMILLAS (Iker, 2026-09-16): "empezar un comentario con comillas
// parece inteligencia artificial. Si vas a meter comillas, que sea para hacer
// referencia a algo que coges del comentario al que respondes". Devuelve el
// texto entrecomillado del arranque, o null si no abre con comillas.
export function comillasDeArranque(texto: string, nombre?: string | null): string | null {
  let cuerpo = texto.trim();
  if (nombre && cuerpo.toLowerCase().startsWith(nombre.trim().toLowerCase())) {
    cuerpo = cuerpo.slice(nombre.trim().length).trim();
  }
  const m = cuerpo.match(/^["“«'‘]([^"”»'’]{2,})["”»'’]/);
  if (m) return m[1];
  return /^["“«'‘]/.test(cuerpo) ? cuerpo.slice(1, 40) : null;
}

// ⛔⛔ APERTURA GENERICA: EL GUARDARRAIL, PORQUE UN PROMPT ES UNA PETICION
// (Iker, 2026-09-15)
//
// Este fichero ya tiene la leccion escrita tres veces —OPENING_MOVES, los dos
// puntos, las anecdotas—: lo que solo esta en el prompt no se cumple. La RULE
// 10b PIDE que no se abra con una abstraccion; esto lo COMPRUEBA.
//
// GEMELO de `AI_TELLS` en `scripts/validar-post.py` y de la tabla de
// `brand-voice §3`. El validador de posts tumba estas mismas formulas desde
// hace meses y el generador de respuestas no las miraba: por eso el mismo
// delator que jamas pasa en un post salia cada dia en las respuestas.
// ⚠️ Si se toca una de las dos listas, se toca la otra.
const APERTURAS_IA: { re: RegExp; que: string }[] = [
  { re: /^lo mas (importante|curioso|interesante|dificil|duro|clave|crucial|jodido|grave|potente)/, que: 'lo mas ...' },
  { re: /^lo (fundamental|esencial|clave|crucial|cierto|curioso|interesante|bueno|malo|real|dificil|duro|jodido)\b/, que: 'lo fundamental / lo curioso / lo cierto...' },
  { re: /^lo que (nadie|casi nadie|poca gente|pocos|muy pocos|la gente no)/, que: 'lo que nadie dice/sabe' },
  { re: /^la clave (es|esta|de)/, que: 'la clave es / la clave esta en' },
  { re: /^el (secreto|truco|quid)\b/, que: 'el secreto / el truco' },
  // ⚠️ El adjetivo en medio es lo que se me escapo en la 1a version, y es
  // justo el caso mas frecuente de los medidos: "La eficiencia COMERCIAL no
  // esta en..." salio dos veces en 19 comentarios. Por eso van hasta dos
  // palabras entre el sustantivo y el verbo.
  { re: /^l[ao]s? (verdad|realidad|clave|gracia|diferencia|eficiencia|importancia|ventaja|dificultad|cuestion|magia|trampa|tecla|paradoja|ironia|leccion)\b(\s+\w+){0,2}\s+(no\s+)?(es|son|esta|estan|va|van|mejora|mejoran|cambia|cambian|depende|dependen|empieza|empiezan|llega|llegan|cuesta|cuestan|pasa|pasan|funciona|funcionan|importa|importan|manda|mandan|sirve|sirven|nace|nacen|esta en|reside)\b/, que: 'sustantivo abstracto + verbo copulativo' },
  { re: /^al final del dia/, que: 'al final del dia' },
  { re: /^exactamente\b/, que: 'exactamente (la palabra de asentimiento va literal, sin adverbio)' },
  { re: /^efectivamente\b/, que: 'efectivamente' },
];

/**
 * Devuelve la apertura prohibida si la respuesta abre con una de las formulas
 * de IA. Mira SOLO el arranque: estas mismas palabras a mitad de frase no
 * molestan a nadie, y prohibirlas en todo el texto tumbaria respuestas buenas.
 *
 * El nombre de quien comenta va SIEMPRE delante (RULE 5) y no cuenta, asi que
 * se quita antes de mirar.
 */
export function detectarAperturaGenerica(
  respuesta: string,
  commenterName?: string | null
): string | null {
  let cuerpo = respuesta.trim();
  if (commenterName && cuerpo.toLowerCase().startsWith(commenterName.trim().toLowerCase())) {
    cuerpo = cuerpo.slice(commenterName.trim().length).trim();
  }
  const arranque = llano(cuerpo).replace(/^[^a-z0-9¿¡]+/, '');
  for (const { re, que } of APERTURAS_IA) {
    if (re.test(arranque)) return que;
  }
  return null;
}

// ⛔⛔ EL GUARDARRAIL DEL TONO (Iker, 2026-09-15)
//
// Las RULE 3c-bis y 3c-ter PIDEN que no se eche de casa al que no entiende y
// que no se le niegue nada al que se queja. Esto lo COMPRUEBA, que es la unica
// forma que ha funcionado nunca en este fichero.
//
// Las dos familias salen de casos REALES, no de imaginacion:
//   · "casi siempre que un post no se entiende es porque no va dirigido a ti"
//     (meme del 03/09, a alguien que solo dijo "No entiendo este post").
//   · "en ningun momento hemos hablado de peso" (meme del peso, a alguien
//     enfadado) — y era mentira, estaba en la imagen.
const RESPUESTA_BORDE: { re: RegExp; que: string }[] = [
  { re: /no (va|iba) dirigid[ao] a ti/, que: 'le dices que el post no va dirigido a el' },
  { re: /no (eres|es) (el|nuestro|mi) (publico|target|lector)/, que: 'le dices que no es el publico' },
  { re: /no (va|iba) (por|contigo|para ti)/, que: 'le dices que el post no va con el' },
  { re: /si (no )?lo pillas/, que: '"si lo pillas, lo pillas"' },
  { re: /se explica sol[ao]/, que: '"se explica solo"' },
  { re: /(no|nunca) (lo )?(vas a|vais a) entender/, que: 'le dices que no lo va a entender' },
  { re: /en ning[uú]n momento (he|hemos|se) /, que: 'niegas lo que dice el post ("en ningun momento...")' },
  { re: /(yo )?no (he|hemos) (dicho|hablado|mencionado)/, que: 'niegas haber dicho algo' },
  { re: /no (sale|aparece|pone) (nada )?(de|en) /, que: 'afirmas que algo NO sale en el post' },
  { re: /no va de eso/, que: '"no va de eso"' },
  // ⛔ LA RESPUESTA-PREGUNTA (Iker, 2026-09-16). La habia metido yo el 15/09
  // como movimiento de apertura ("devuelvele una pregunta") y salio a Mario
  // Carrillo, que nos daba la razon: "¿y cuantas veces crees que el mejor
  // discurso...?". A quien apoya no se le examina. Tambien la retorica.
  { re: /[¿?]/, que: 'la respuesta hace una pregunta, y a quien comenta se le apoya, no se le examina' },
  // Dar por hecho que el que comenta viene al evento (prueba del 16/09: "nos
  // vemos el jueves en Donostia" a alguien que solo dijo "que grande Iker").
  // Es la misma regla que el Google Chat tiene desde el 27/08: no se pone en
  // boca de nadie que va a ir.
  // (lo mira `daPorHechoQueViene`, que ve el comentario: a quien dice "alli
  // estare" si se le puede esperar)
  // Tratarle de despistado (prueba del 16/09).
  { re: /\b(si no sabes|si lo lees|si te lo lees|estan? en el post|en el mismo post|lo dice el post|como dice el post|vuelve a leer|leelo (otra vez|bien|entero))\b/, que: 'le tratas de despistado o le mandas a leer el post' },
  // "te dejo el enlace en el post para reservar sitio" (tanda del 18/09): el
  // enlace YA esta en el post, asi que es mandarle a leerlo.
  { re: /\b(enlace|link)\b[^.]{0,25}\b(en|del) (el )?post\b|\b(lo )?tienes (arriba|en el post)\b/, que: 'le mandas a buscar el enlace al post, que es tratarle de despistado' },
  // ⛔ LA CONTRADICCION (tanda del 18/09): "no te compro eso, te compro eso".
  // Salia de cruzar el arranque "una negacion" con la palabra de asentir. A
  // quien comenta se le apoya: nunca se le niega lo que dice.
  { re: /(^|[ ,.])no (te compro eso|es eso|es asi|estoy de acuerdo|tal cual|exacto|comparto)\b/, que: 'le llevas la contraria al que comenta o te contradices ("no te compro eso")' },
  // ⛔ INVENTAR QUE SE HACE EN EL EVENTO (tanda del 18/09): "por eso en el
  // evento trabajamos exactamente eso". Del evento solo consta lo que dice el
  // post; su programa no se describe.
  { re: /\b(en el (evento|encuentro)( del jueves)?( en donostia)?|el jueves en donostia) (trabajamos|vemos|ensenamos|explicamos|practicamos|contamos|resolvemos|hablamos de)\b|\blo que (trabajamos|vemos|ensenamos|explicamos|practicamos|resolvemos) en (el evento|donostia)|\b(lo que|de lo que) (queremos|queriamos|vamos a|venimos a) (resolver|trabajar|hablar|contar|ver|ensenar)[^.]{0,25}(el jueves|en donostia|en el evento)|\bel (evento|encuentro)( del jueves)?( en donostia)? (va de|es para|sirve para|trata de|consiste en)|\b(lo que|de lo que) se (trabaja|habla|ve|resuelve|ensena|cuenta) (el jueves |justo )?en (donostia|el evento)|\bse (trabaja|resuelve|ensena) (eso |esto |justo eso )?(el jueves )?en (donostia|el evento)/, que: 'afirmas que se hace o se trabaja algo en el evento y no consta: del evento solo se puede decir lo que pone el post' },
  // Afirmar que la historia es real (muchas escenas son construidas).
  { re: /\b((la historia|esto|todo|es todo) es (real|verdad|cierto)|es todo (real|verdad|cierto)|no (me lo he|lo he) inventad|paso de verdad|me paso tal cual)\b/, que: 'afirmas que la historia es real, y no puedes saberlo' },
  // "no era una herramienta, era la renovacion del evento" (prueba del 16/09, a
  // "¿Y que herramienta era?"). Falso: la factura del meme ES de herramientas
  // de ventas, pero eso vive en la foto y ya no la vemos. Sin imagen, corregir
  // lo que el post es o deja de ser es jugarsela, y encima contradice al que
  // pregunta. Es la misma familia que "en ningun momento hemos hablado de".
  { re: /(^|[ ,])no (era|es|fue) (un|una|el|la|lo) [a-z]+( [a-z]+)?, (era|es|fue) /, que: 'corriges lo que el post es o deja de ser sin ver la imagen' },
  // ⛔ DESCRIBIR LA FOTO SIN VERLA (Iker, 2026-09-15). Retiradas las imagenes
  // por coste, el modelo DEDUCE lo que hay en ellas a partir del texto y lo
  // cuenta como si lo estuviera viendo: "en la imagen se ven dos mensajes de
  // alguien que...". Aqui acerto, y ese es justo el peligro: el dia que se
  // equivoque le estaremos describiendo NUESTRO propio post al reves a quien
  // si lo esta viendo. Es la misma familia que el desastre del meme del peso,
  // en afirmativo en vez de en negativo.
  { re: /(en|desde) (la|esa|una) (imagen|foto|captura|pantalla|vineta)/, que: 'describes la imagen y NO la estas viendo' },
  { re: /(la|esa) (imagen|foto|captura) (muestra|ensena|dice|pone|sale)/, que: 'describes la imagen y NO la estas viendo' },
  { re: /en el (meme|dibujo|cartel)/, que: 'describes la imagen y NO la estas viendo' },
  // El reconocimiento de mentira: reconocer y darle la vuelta con un "pero".
  // Sale de la prueba del 15/09 con el comentario "me parece una falta de
  // respeto", donde la respuesta fue "entiendo la lectura, PERO el post va
  // justo de lo contrario". Con modales, pero le dice que no ha entendido.
  { re: /pero (el post |la publicacion )?va (justo )?(de|a) lo contrario/, que: 'reconoces y le das la vuelta con un "pero"' },
  { re: /pero (justo )?va de/, que: 'reconoces y le corriges con un "pero va de"' },
  { re: /en realidad (el post |la publicacion )?va de/, que: '"en realidad va de"' },
  { re: /lo que quiere decir (el post|la publicacion) es/, que: 'le explicas lo que "quiere decir" el post' },
];

// ⛔ EL ELOGIO SIN GRACIAS (Iker, 2026-09-15, encontrado probando en produccion)
//
// La RULE 13 dice que agradecer ante un halago es "no negociable"... y era una
// peticion mas. En la prueba, a "Brutal, de los mejores posts que he visto este
// mes" contesto con una pregunta y CERO gracias.
//
// Y la culpa es mia: el ARRANQUE OBLIGATORIO que meti para la variedad le puede
// tocar "empieza por una pregunta directa", y entonces el arranque pisa al
// gracias. Arreglar una capa y romper otra, otra vez. Ahora la regla dice que
// el elogio manda sobre el arranque, y ESTO lo comprueba.
// ⛔ EL QUE DICE QUE NO LO ENTIENDE (Iker, 2026-09-15, probando en produccion).
// La RULE 3c-bis manda abrir quitandole hierro... y el ARRANQUE OBLIGATORIO que
// meti para la variedad se la comia, igual que se comia el gracias: si el dado
// sacaba "empieza por el sujeto de la escena", la respuesta explicaba la broma
// perfectamente pero entraba a saco, sin el "no pasa nada". Tercera vez hoy que
// arreglar una capa rompe otra, y por eso las dos van comprobadas y no pedidas.
const NO_ENTIENDE = /(no (lo |la )?(entiendo|pillo|capto|comprendo)|no entiendo nada|no me queda claro|no le veo el (sentido|punto)|me he perdido|que quiere decir|a que te refieres|no se que (quiere|tiene que ver)|que tiene que ver|(muy|mas|demasiado) largo|no he llegado al final|no me lo he leido|resumen por favor|tl;?dr)/;
const HAY_RECONOCIMIENTO = /(no pasa nada|normal|culpa mia|nada, |tranquil|me ha quedado|me quedo|te lo cuento|te lo explico|te lo resumo|mal explicad|no me he explicad|es culpa|me he enrollado|me enrolle|tienes razon|con razon)/;

// ⛔ EL COMENTARIO HOSTIL (Iker, 2026-09-16, "que nunca se vacile ni se le tome
// por tonto a nadie"). A "Otro post vendiendo humo" salio un zasca; a "Vaya
// tonteria de post", un "puede ser, pero...". Ante lo despectivo la respuesta
// tiene que llevar una marca de respeto y NINGUN "pero" que le rebata.
// Quien le lleva la contraria al post sin venir de malas.
const DISCREPA = /(discrepo|no se yo|a veces si|no siempre|depende|no estoy de acuerdo|no comparto|no creo que|no lo veo|trampos|no es (asi|verdad|cierto)|ya no hace falta|no sirve|exagerad|mentira|es falso|no tiene sentido|eso no es)/;
const ES_HOSTIL = /(tonteria|chorrada|gilipollez|humo|vendehumos|postureo|no tiene (ninguna )?gracia|sin gracia|no mola|ridicul|patetic|basura|cutre|que pesad|otro post (de|vendiendo)|falta de respeto)/;
const HAY_RESPETO = /(respeto|entiendo|comprendo|tomo nota|lo apunto|me lo apunto|cada uno|es normal|normal que|valoro|gracias por (decirlo|la sinceridad|comentar|el apunte)|no te encaj)/;

export function respuestaAHostilMal(comentario: string, respuesta: string): boolean {
  if (!ES_HOSTIL.test(llano(comentario))) return false;
  const r = llano(respuesta);
  return !HAY_RESPETO.test(r) || /\bpero\b/.test(r);
}

/**
 * Si el comentario dice que no entiende el post, la respuesta TIENE que abrir
 * reconociendo. Explicar bien pero entrando a saco sigue sonando a corregirle.
 */
/**
 * Lo que no es de tono sino de forma, y el usuario ve a simple vista:
 *  · la LONGITUD: una linea, ~160 caracteres tras el nombre; hasta ~280 solo
 *    si el comentario es un parrafazo (Iker, 2026-09-16: "mejor una linea
 *    larga que dos, a menos que el comentario sea un parrafazo").
 *  · ABRIR CON COMILLAS que no citan al que comenta, que "parece escrito por
 *    inteligencia artificial".
 */
// ⛔ DAR POR HECHO QUE VIENE AL EVENTO (tandas del 16 y 18/09): "nos vemos el
// jueves", "el jueves 24 en Donostia te esperamos" a "Me lo apunto", "espero
// que el jueves en Donostia te ayude" a "me he visto reflejada". Solo vale si
// el comentario dice que viene.
const DICE_QUE_VIENE = /(alli estare|ahi estare|alli nos vemos|nos vemos (el|en|alli|alla)|me apunto al|ya estoy apuntad|estoy inscrit|me he inscrito|voy al evento|ire al evento|alli estaremos|cuenta conmigo|tengo (mi )?plaza)/;
const SUPONE_QUE_VIENE = /(nos vemos (el|en|alli|alla|ahi|pronto)|alli nos vemos|te esper(o|amos)|os esper(o|amos)|alli estaras|cuando vengas|cuando llegues|(el jueves|en donostia|en el evento)[^.]{0,40}\bte (ayude|sirva|guste|encante|toque)|te (ayude|sirva|guste|encante)[^.]{0,40}(el jueves|en donostia|en el evento))/;
export function daPorHechoQueViene(comentario: string, respuesta: string): boolean {
  return SUPONE_QUE_VIENE.test(llano(respuesta)) && !DICE_QUE_VIENE.test(llano(comentario));
}

// ⛔ AFIRMAR EL PRECIO O LAS CONDICIONES DEL EVENTO (tanda del 18/09): "el
// precio esta en el link y es cero". No consta en ningun sitio.
export function inventaCondicionesDelEvento(respuesta: string): boolean {
  const t = llano(respuesta);
  return /(evento|jueves|donostia|enlace|link|entrada|plaza|inscripcion)/.test(t) &&
    /\b(gratis|gratuit[oa]|es cero|no cuesta|sin coste|de pago|cuesta \d|\d+ ?(euros|eur)\b|precio (es|esta))/.test(t);
}

// ⛔ EL GRACIAS SECO (RULE 13): "gracias, espero que les sirva" a un elogio.
export function graciasSeco(comentario: string, respuesta: string, nombre?: string | null): boolean {
  let cuerpo = respuesta.trim();
  if (nombre && cuerpo.toLowerCase().startsWith(nombre.trim().toLowerCase())) cuerpo = cuerpo.slice(nombre.trim().length).trim();
  // "gracias." como respuesta entera no vale nunca ("Qué bien contado" -> "gracias.").
  if (/^gracias\s*[.!]?\s*$/i.test(cuerpo)) return true;
  if (!ES_ELOGIO.test(llano(comentario))) return false;
  return /^gracias\s*([,.!]|$)/i.test(cuerpo);
}

// Palabras que en castellano SIEMPRE llevan tilde, y "culpa mia".
const TILDES_SEGURAS: Array<[RegExp, string]> = [
  // Errata del 18/09: "Carlos Vidal espera que te saque algo que llevarte".
  [/^(\p{Lu}[^\n]{0,60}? )?espera que te\b/u, '$1espero que te'],
  [/\bojala\b/g, 'ojalá'], [/\bOjala\b/g, 'Ojalá'], [/\btambien\b/g, 'también'],
  [/\bdespues\b/g, 'después'], [/\baqui\b/g, 'aquí'], [/\bademas\b/g, 'además'],
  [/\btodavia\b/g, 'todavía'], [/\bdificil\b/g, 'difícil'], [/\bfacil\b/g, 'fácil'],
  [/\bculpa mia\b/g, 'culpa mía'], [/\basi que\b/g, 'así que'], [/\basi de\b/g, 'así de'],
];
export function ponerTildesSeguras(texto: string): string {
  return TILDES_SEGURAS.reduce((t, [re, bien]) => t.replace(re, bien), texto);
}

/** El detector de evento inventado, suelto, para las superficies sin reintento propio. */
export function eventoInventado(texto: string): boolean {
  return inventaCondicionesDelEvento(texto) || (detectarRespuestaBorde(texto) || '').includes('evento');
}

/**
 * Quita la coletilla que se inventa el evento ("…y eso es justo lo que se
 * trabaja en Donostia 🤝"): corta desde el " y " o la coma anterior.
 */
export function recortarEventoInventado(texto: string): string {
  if (!eventoInventado(texto)) return texto;
  const t = texto;
  const plano = llano(t);
  const m = plano.match(/\s(y|pero)\s[^,.]*?(evento|donostia|jueves)[^.]*$/) || plano.match(/,[^,.]*?(evento|donostia|jueves)[^.]*$/);
  if (!m || m.index === undefined) return texto;
  const corte = t.slice(0, m.index).replace(/[\s,]+$/, '');
  return corte.length >= 25 ? corte + (/[.!…]$/.test(corte) ? '' : '.') : texto;
}

// ⛔ ASENTIMIENTOS APILADOS E INCISOS SUELTOS (Iker, 2026-09-18). Prueba contra
// produccion: "exactooo, claro y tanto, aunque…", "pues geniaaal, el filtro,
// tal cual, siempre lo pone…", "justooo, el interlocutor bien, que…". El
// modelo recibia dos palabras sorteadas y las encajaba donde podia.
const ASENTIR = ['tal cual', 'y tanto', 'sin duda', 'eso es', 'desde luego', 'por supuesto',
  'claro', 'exacto', 'justo', 'cierto', 'totalmente', 'efectivamente', 'genial', 'brutal', 'si', 'vale', 'total', 'perfecto'];
// Estas solo asienten sueltas: "si lo piensas" o "total que" no son asentir.
const SOLO_CON_PAUSA = new Set(['si', 'vale', 'total', 'perfecto']);
const RELLENO_ARRANQUE = new Set(['pues', 'y', 'uy', 'uf', 'uff', 'ah', 'oh', 'eh', 'ay', 'hombre', 'vamos', 'que']);

function plano(texto: string): string {
  return desestirarTodo(texto).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Cuantas palabras de asentir hay seguidas al principio, antes de la primera con contenido. */
export function asentimientosAlPrincipio(cuerpo: string): number {
  let resto = plano(cuerpo).replace(/^[\s,.!]+/, '').replace(/\bque si\b/g, 'que');
  let n = 0;
  for (let guard = 0; guard < 8; guard++) {
    resto = resto.replace(/^[\s,.!]+/, '');
    const f = ASENTIR.find((a) => new RegExp(SOLO_CON_PAUSA.has(a) ? `^${a}\\s*[,.!]` : `^${a}(?![a-z])`).test(resto));
    if (f) { n++; resto = resto.slice(f.length); continue; }
    const w = resto.match(/^[a-z]+/);
    if (w && RELLENO_ARRANQUE.has(w[0])) { resto = resto.slice(w[0].length); continue; }
    break;
  }
  return n;
}

// Palabras de asentir que sueltas entre dos comas en mitad de la frase no
// significan nada. "bien", "vale" o "total" quedan fuera: ", total, que…" o
// "está bien, pero" son castellano normal.
const INCISO_SUELTO = /[^,]*[a-z][^,]*,\s*(tal cual|y tanto|sin duda|claro|exacto|justo|totalmente|efectivamente|brutal|genial)(,| y )/;

/** El inciso de asentir suelto en mitad de la frase, o null. */
export function incisoDeAsentir(cuerpo: string): string | null {
  const t = plano(cuerpo);
  const m = t.match(INCISO_SUELTO);
  if (!m) return null;
  // Si lo que va delante son solo asentimientos o relleno, es el arranque, no un inciso.
  const antes = m[0].slice(0, m[0].lastIndexOf(m[1]));
  const palabras = (antes.match(/[a-z]+/g) || []);
  const soloArranque = palabras.every((w) => RELLENO_ARRANQUE.has(w) || ASENTIR.some((a) => a.split(' ').includes(w)));
  return soloArranque ? null : m[1];
}

/** La palabra alargada que ha quedado fuera de sus dos sitios, o null. */
export function alargadaFueraDeSitio(cuerpo: string): string | null {
  for (const m of cuerpo.matchAll(/\p{L}+/gu)) {
    if (esEstirada(m[0]) && !sitioAlargable(cuerpo, m.index ?? 0, m[0])) return m[0];
  }
  return null;
}

/**
 * Ultimo recurso tras los reintentos: quita el inciso suelto y la alargada mal
 * puesta ENTERA (con su coma), en vez de dejarla huerfana ("el interlocutor
 * bien, que…").
 */
export function quitarIncisosSueltos(cuerpo: string): string {
  let r = cuerpo;
  const fuera = alargadaFueraDeSitio(r);
  if (fuera) {
    const i0 = r.indexOf(fuera);
    // "tal cuaal" es una sola palabra de reaccion: se quita con su "tal"
    // (Google Chat 18/09: "el comercial tal, insistiendole…").
    const conTal = llanoLetra(desestirar(fuera)) === 'cual' && /\btal\s+$/i.test(r.slice(0, i0));
    const i = conTal ? r.slice(0, i0).search(/\btal\s+$/i) : i0;
    const antes = r.slice(0, i);
    const despues = r.slice(i0 + fuera.length);
    r = /,\s*$/.test(antes) && /^\s*,/.test(despues)
      ? antes.replace(/\s*$/, '') + despues.replace(/^\s*,/, '')
      : /^\s*,/.test(despues)
        ? antes.replace(/\s+$/, '') + despues.replace(/^\s*,/, ',')
        : r.slice(0, i0) + desestirar(fuera) + despues;
  }
  const inc = incisoDeAsentir(r);
  if (inc) {
    const re = new RegExp(`,\\s*${inc.replace(' ', '\\s+')}\\p{L}*\\s*(,|y(?![\\p{L}]))`, 'iu');
    const fueraTilde = r.normalize('NFD').replace(/[̀-ͯ]/g, '');
    const m = fueraTilde.match(re);
    if (m && m.index !== undefined) r = r.slice(0, m.index) + (m[1] === ',' ? ',' : ' y') + r.slice(m.index + m[0].length);
  }
  return r.replace(/\s{2,}/g, ' ').replace(/,\s*,/g, ',');
}

export function problemaDeEstilo(
  comentario: string,
  respuesta: string,
  nombre?: string | null
): string | null {
  let cuerpo = respuesta.trim();
  if (nombre && cuerpo.toLowerCase().startsWith(nombre.trim().toLowerCase())) {
    cuerpo = cuerpo.slice(nombre.trim().length).trim();
  }
  const tope = comentario.trim().length > 300 ? 300 : 175;
  if (cuerpo.length > tope) {
    return `mide ${cuerpo.length} caracteres y el tope es ${tope}: tiene que caber en UNA linea, quita una idea`;
  }
  const cita = comillasDeArranque(respuesta, nombre);
  if (cita !== null && !llano(comentario).includes(llano(cita).slice(0, 12))) {
    return 'abre con comillas y lo entrecomillado no es algo que haya dicho el que comenta: abrir con comillas parece escrito por una IA';
  }
  if (asentimientosAlPrincipio(cuerpo) >= 2) {
    return 'abre con varias palabras de asentir seguidas ("exacto, claro y tanto"): deja UNA sola';
  }
  const inciso = incisoDeAsentir(cuerpo);
  if (inciso) {
    return `mete "${inciso}" como inciso suelto en mitad de la frase, donde no significa nada: quitalo o llevalo al principio`;
  }
  const fuera = alargadaFueraDeSitio(cuerpo);
  if (fuera) {
    return `la palabra alargada "${fuera}" esta en un sitio que no vale: solo puede ser la primera palabra o ir antes de la primera coma detras de "pues"`;
  }
  return null;
}

export function faltaElReconocimiento(comentario: string, respuesta: string): boolean {
  return NO_ENTIENDE.test(llano(comentario)) && !HAY_RECONOCIMIENTO.test(llano(respuesta));
}

const ES_ELOGIO = /(gran (post|publicacion|historia|reflexion)|(que|muy) bien (contado|explicado|escrito|dicho|traido)|bien contado|muy buen[ao]|buena historia|me ha encantado|encantad|genial|brutal|crack|top\b|me encanta|buenisimo|que bueno|de los mejores|espectacular|enhorabuena|grande\b|maquina\b|aplausos|impecable|muy bueno|excelente)/;
const HAY_GRACIAS = /(gracias|graciass|graciaas|se agradece|me alegra|un placer)/;

/**
 * Si el comentario es basicamente un halago y la respuesta no agradece, eso es
 * un fallo duro de la RULE 13. Se mira el COMENTARIO, no la respuesta: es el
 * comentario el que decide si toca dar las gracias.
 */
export function faltaElGracias(comentario: string, respuesta: string): boolean {
  return ES_ELOGIO.test(llano(comentario)) && !HAY_GRACIAS.test(llano(respuesta));
}

// ⛔ LA BROMA TOMADA EN SERIO (Iker, 2026-09-17). Antonio N. siguio el chiste
// de un meme con "tu madre se ha tropezado en la ducha. Solo para valientes" y
// la respuesta le explico que "funciona porque mezcla urgencia con un nombre
// real". Si el comentario lleva marcas de broma, la respuesta no puede
// analizarla como una tactica.
const ES_BROMA = /(\bj[ae]j[ae]j?|\bjaj|\bjej|xd\b|para valientes|😂|🤣|😅|😆|😜|😝)/;
const ANALIZA_BROMA = /(funciona (muy bien )?(porque|por que)|porque mezcla|mezcla [a-z ]+ con|combina [a-z ]+ con|la clave (es|esta)|marca la diferencia|cambia todo|lo que (mas )?funciona|la urgencia|como (tactica|tecnica|estrategia)|es una (buena )?(tactica|tecnica|estrategia))/;

/** El comentario es una broma y la respuesta la analiza en serio (RULE 3g). */
export function tomaEnSerioLaBroma(comentario: string, respuesta: string): boolean {
  return ES_BROMA.test(llano(comentario)) && ANALIZA_BROMA.test(llano(respuesta));
}

/**
 * Devuelve el problema de TONO si la respuesta echa de casa al que comenta o
 * niega lo que el post dice. `sinImagen` aprieta la segunda familia: si no
 * hemos podido ver la foto, NINGUNA negacion sobre el contenido es defendible.
 */
export function detectarRespuestaBorde(respuesta: string): string | null {
  const texto = llano(respuesta);
  for (const { re, que } of RESPUESTA_BORDE) {
    if (re.test(texto)) return que;
  }
  return null;
}

/**
 * Las aperturas ya usadas en cada post, para no repetirlas dentro de la misma
 * tanda de respuestas — que es cuando se ven, porque Iker contesta 15 o 20
 * comentarios seguidos del mismo post.
 *
 * ⚠️ VIVE EN MEMORIA DEL PROCESO Y ES A PROPOSITO. No hace falta una tabla:
 * una tanda es una sentada, y si el servidor se reinicia lo unico que se
 * pierde es la memoria de esa tanda, no un dato. Lo que NO se puede hacer es
 * dejarlo sin nada: hoy cada llamada es independiente y no sabe con que abrio
 * la anterior, que es exactamente la causa que este fichero lleva documentada
 * desde el 17/07 para los agradecimientos y para el propio OPENING_MOVES.
 */
const APERTURAS_POR_POST = new Map<string, string[]>();
const APERTURAS_RECORDADAS = 8;

function apertura(respuesta: string, commenterName?: string | null): string {
  let cuerpo = respuesta.trim();
  if (commenterName && cuerpo.toLowerCase().startsWith(commenterName.trim().toLowerCase())) {
    cuerpo = cuerpo.slice(commenterName.trim().length).trim();
  }
  return cuerpo.split(/\s+/).slice(0, 4).join(' ');
}

export function recordarApertura(postId: string | null | undefined, ap: string): void {
  if (!postId || !ap) return;
  const previas = APERTURAS_POR_POST.get(postId) || [];
  APERTURAS_POR_POST.set(postId, [...previas, ap].slice(-APERTURAS_RECORDADAS));
}

export interface Invento {
  tipo: 'anecdota' | 'cifra';
  fragmento: string;
}

// Quita tildes y baja a minusculas, para que "reunion" y "reunión" caigan en el
// mismo patron y no haya que duplicar cada regex.
function llano(t: string): string {
  return t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Marcadores de ESCENA: fecha, sitio o testigo. Son los que convierten una idea
// general (permitida) en un hecho concreto que no ha pasado (prohibido).
const PATRONES_ANECDOTA: { re: RegExp; que: string }[] = [
  { re: /\bel otro dia\b/, que: 'el otro dia' },
  { re: /\b(la otra vez|una vez|aquella vez|un dia|en su dia)\b/, que: 'una vez / un dia' },
  { re: /\bhace (poco|nada|un rato|unos|unas|dos|tres|varios|varias|años|anos|meses|dias|semanas)\b/, que: 'hace poco / hace unos años' },
  { re: /\b(ayer|anteayer|anoche)\b/, que: 'ayer / anoche' },
  { re: /\bl[ao] (semana|mes|ano) pasad[ao]\b/, que: 'la semana pasada / el mes pasado' },
  { re: /\besta (misma )?semana\b/, que: 'esta semana' },
  { re: /\b[aen] una (reunion|llamada|demo|visita|comida|cena|feria|mesa)\b/, que: 'en/a una reunion o llamada' },
  { re: /\bun cliente (me|nos) (dijo|conto|comento|escribio|llamo|pidio)\b/, que: 'un cliente me dijo' },
  { re: /\b(me|nos) lo (dijo|conto|comento) un\b/, que: 'me lo dijo un...' },
  { re: /\bteng[o] un cliente que\b|\btenemos un cliente que\b/, que: 'tengo un cliente que' },
  { re: /\buno de (nuestros|mis) clientes\b/, que: 'uno de nuestros clientes' },
  { re: /\bconozco (un|el) caso\b/, que: 'conozco un caso' },
  { re: /\bjusto (hoy|ayer|esta semana)\b/, que: 'justo hoy / justo ayer' },
  { re: /\blo vivi\b|\ben primera persona\b|\bme toco vivir\b/, que: 'lo vivi en primera persona' },
  // Preterito indefinido en 1a persona: la firma gramatical de "esto me paso a
  // mi un dia concreto". Es lo que se le escapa a cualquier lista de frases.
  // Ojo al ampliar esta lista: 'entre', 'monte' y 'vino' tambien son
  // preposicion y sustantivos, y metian falsos positivos en respuestas
  // perfectamente limpias ("entre clientes y proveedores", "el vino").
  { re: /\b(acompañe|acompane|mande|llame|visite|conoci|estuve|fui|vi|hable|cerre|pregunte|escuche|asisti|coincidi)\b/, que: 'narracion en pasado de un hecho concreto' },
];

// Numeros escritos en LETRA. El escaner de digitos no los ve, y son justo por
// donde se colaban: "en treinta segundos", "en tres dias", "diez minutos".
const NUMEROS_EN_LETRA =
  /\b(un|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|quince|veinte|treinta|cuarenta|cincuenta|cien|mil)\s+(segundos?|minutos?|horas?|dias?|semanas?|meses|años|anos|euros?|clientes?|reuniones|llamadas|correos?|personas?)\b/;

// Cadenas con digito que NO son un dato: si las contaramos, saltaria la alarma
// en respuestas perfectamente limpias.
const DIGITOS_INOCENTES = /\b(b2b|b2c|24\/7|360|1x1|3d)\b/g;

/**
 * Devuelve lo que la respuesta se ha INVENTADO: escenas que no constan y cifras
 * que no salen ni del post ni del comentario.
 *
 * La clave es que se compara contra las FUENTES. Si el que comenta dice "ayer me
 * paso" o el post lleva un 40%, recoger eso no es inventar: ya lo publico otro.
 * Lo que se persigue es el hecho que NACE aqui.
 */
export function detectarInventos(
  respuesta: string,
  fuentes: { postContent?: string; commentText?: string }
): Invento[] {
  const texto = llano(respuesta);
  const fuente = llano(`${fuentes.postContent || ''} \n ${fuentes.commentText || ''}`);
  const out: Invento[] = [];

  for (const { re, que } of PATRONES_ANECDOTA) {
    // Si el marcador ya estaba en el post o en el comentario, no lo ha traido la
    // respuesta: lo esta recogiendo, que es lo que la RULE 3e permite.
    if (re.test(texto) && !re.test(fuente)) {
      out.push({ tipo: 'anecdota', fragmento: que });
    }
  }

  // Cifras: mecaniza la RULE 3d, que hasta hoy solo era una peticion.
  const limpio = texto.replace(DIGITOS_INOCENTES, ' ');
  const numeros = limpio.match(/\d+(?:[.,]\d+)?/g) || [];
  for (const n of numeros) {
    if (!fuente.includes(n)) out.push({ tipo: 'cifra', fragmento: n });
  }
  // "nueve de cada diez" esquiva el escaner de digitos, asi que va aparte.
  if (/\bde cada (dos|tres|cuatro|cinco|diez|cien|mil)\b/.test(texto) && !/\bde cada\b/.test(fuente)) {
    out.push({ tipo: 'cifra', fragmento: 'X de cada Y' });
  }
  const enLetra = texto.match(NUMEROS_EN_LETRA);
  if (enLetra && !NUMEROS_EN_LETRA.test(fuente)) {
    out.push({ tipo: 'cifra', fragmento: enLetra[0] });
  }

  return out;
}

// EL JUEZ: lo que ninguna lista de frases va a cubrir.
//
// El primer detector era una lista de marcadores ("el otro dia", "un cliente me
// dijo"). Duro 8 generaciones reales: se colaron "lo vivi en primera persona
// hace unos años intentando cerrar una reunion con un fondo europeo" y "una vez
// acompañe a un fondo a una reunion en San Francisco". Ninguna de las dos usaba
// una frase de la lista, y las dos son exactamente lo prohibido.
//
// La leccion: enumerar formas de mentir no termina nunca, porque el lenguaje
// natural tiene infinitas. Lo que si se puede preguntar es lo unico que importa
// de verdad — "¿esto que afirma la respuesta esta en el post o en el comentario,
// si o no?" — y eso lo contesta un modelo barato mejor que cualquier regex.
//
// Los patrones se quedan como PRIMER FILTRO: cuestan cero, cazan lo evidente y
// ahorran la llamada. El juez es la red de debajo.
async function juezDeInventos(
  respuesta: string,
  fuentes: { postContent?: string; commentText?: string; commenterName?: string | null }
): Promise<Invento[]> {
  try {
    const message = await trackedCreate('reply_invention_judge', {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: `Eres un revisor de hechos. Te dan un POST, un COMENTARIO y una RESPUESTA que el autor del post quiere publicar.

Tu unico trabajo: decir si la RESPUESTA afirma algun HECHO CONCRETO que no aparece ni en el post ni en el comentario.

CUENTA COMO INVENTADO (responde inventa=true):
- Narrar un suceso concreto que no consta: una reunion, una llamada, un viaje, una conversacion, un encuentro, algo que "paso" en un momento o lugar determinado.
- Citar a una persona, un cliente, una empresa o un sitio que no aparece en las fuentes.
- Dar una cifra, una duracion o una cantidad que no esta en las fuentes, este en digitos o en letra.

NO CUENTA COMO INVENTADO (responde inventa=false):
- Observaciones generales sin escena: "a la mayoria les pasa", "casi siempre acaba igual", "es lo mas comun".
- Angulo personal incomprobable y sin escena: "me ha pasado algo parecido", "lo vemos mucho", "por eso lo escribi".
- Opiniones, valoraciones, preguntas, bromas y acuerdos.
- Recoger o reformular algo que YA dicen el post o el comentario.
- ⭐ LO QUE SALGA EN [IMAGEN DEL POST] o en [HILO] dentro del POST: es parte de lo publicado y CONSTA igual que el texto.
- ⭐ CUALQUIER COSA QUE SUENE A LO QUE ENSENA LA FOTO. Tu solo tienes el TEXTO, pero el post lleva imagen y tu NO la ves, asi que no puedes saber si algo sale en ella. Si la respuesta describe una escena que podria estar en la imagen (un chat, una factura, una pantalla, una cara), NO la marques como inventada: no te consta ni que si ni que no, y tumbarla dejaria al usuario sin borrador. Marca solo lo que sea claramente una vivencia del autor ("el otro dia un cliente me dijo") o una cifra nueva.
- EL NOMBRE DEL DESTINATARIO al principio de la respuesta. Toda respuesta abre con el nombre de quien comento, porque LinkedIn lo convierte en una mencion. Ese nombre NUNCA es una persona inventada.
- Las formulas de asentimiento de la casa, que son modismos y no afirmaciones: "te compro eso", "lo has clavado", "y tanto", "ahi esta", "ese es el tema", "tal cual", "sin duda". "Te compro eso" significa "estoy de acuerdo", no que nadie haya comprado nada.

Responde SOLO con JSON: {"inventa": true|false, "que": "<lo inventado, en 8 palabras como mucho, o cadena vacia>"}`,
      messages: [
        {
          role: 'user',
          content: `POST:\n${fuentes.postContent || '(vacio)'}\n\nCOMENTARIO de ${
            fuentes.commenterName || '(alguien)'
          }:\n${fuentes.commentText || '(vacio)'}\n\nRESPUESTA A REVISAR (va dirigida a ${
            fuentes.commenterName || 'quien comento'
          }, cuyo nombre abre la respuesta como mencion):\n${respuesta}`,
        },
      ],
    });
    const block = message.content.find((b) => b.type === 'text') as { type: 'text'; text: string } | undefined;
    const crudo = (block?.text || '').trim();
    const json = crudo.slice(crudo.indexOf('{'), crudo.lastIndexOf('}') + 1);
    const veredicto = JSON.parse(json) as { inventa?: boolean; que?: string };
    if (veredicto?.inventa) {
      return [{ tipo: 'anecdota', fragmento: veredicto.que || 'un hecho que no consta en el post ni en el comentario' }];
    }
    return [];
  } catch (err: any) {
    // Que falle el juez NO puede tumbar la generacion: los patrones ya han
    // pasado y el usuario revisa el borrador antes de publicarlo. Se avisa en
    // el log para que no se degrade en silencio.
    console.warn('[replyGenerator] el juez de inventos no ha podido opinar:', err?.message);
    return [];
  }
}

function textoDelAviso(inventos: Invento[]): string {
  const anecdotas = inventos.filter((i) => i.tipo === 'anecdota').map((i) => i.fragmento);
  const cifras = inventos.filter((i) => i.tipo === 'cifra').map((i) => i.fragmento);
  const partes: string[] = [];
  if (anecdotas.length) partes.push(`una escena que no consta (${anecdotas.join(', ')})`);
  if (cifras.length) partes.push(`una cifra que no sale del post ni del comentario (${cifras.join(', ')})`);
  return partes.join(' y ');
}

export async function generateReply(input: ReplyGenerationInput): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not set');
  }
  const voice = voiceForAuthor(input.authorName);
  const { prompt, arranque: elegidoArranque, conEmoji, estirar, emojiElegido, palabraAlargar } = buildPrompt(input, voice);

  // Se genera y se COMPRUEBA. Si se ha inventado algo, se vuelve a pedir con el
  // fallo delante, hasta 2 veces mas. Un reproche concreto ("te has inventado
  // 'el otro dia'") corrige mucho mejor que repetir la regla general.
  //
  // Si tras los 3 intentos sigue inventando, esto FALLA en vez de devolver el
  // texto. Es deliberado: la respuesta la publica el usuario con su nombre
  // delante, y un error que le obliga a escribirla a mano cuesta un minuto,
  // mientras que un cliente inventado en un hilo publico no se puede recoger.
  //
  // ⛔ Y DESDE EL 2026-09-15 SE COMPRUEBA TAMBIEN LA APERTURA, pero con OTRA
  // severidad, y la diferencia es deliberada:
  //   · una escena inventada es MENTIRA -> si no se arregla en 3 intentos, esto
  //     FALLA y no devuelve nada.
  //   · una apertura generica es FEA -> se reintenta, y si a la tercera sigue
  //     igual se devuelve con un warn. Bloquear al usuario por estilo, mientras
  //     esta contestando 20 comentarios seguidos, cuesta mas que un arranque
  //     tibio que puede editar en dos segundos.
  let text = '';
  let ultimosInventos: Invento[] = [];
  let ultimaAperturaMala: string | null = null;
  let ultimoTonoBorde: string | null = null;
  let ultimoEstilo: string | null = null;
  let candidatoTibio = '';

  for (let intento = 1; intento <= 3; intento++) {
    const correccion =
      intento === 1
        ? ''
        : ultimoTonoBorde
        ? `\n\nEL INTENTO ANTERIOR ROMPE LA RULE 3c-bis/3c-ter: ${ultimoTonoBorde}. Quien comenta nos acaba de dar atencion EN PUBLICO y no se le echa de casa ni se le niega lo que el post dice. Reescribe la respuesta ENTERA: si no entiende el post, abre quitandole hierro ("no pasa nada", "normal", "culpa mia") y EXPLICALE la broma mirando la imagen; si se queja, reconocele lo que siente y aclara la intencion sin negar ningun hecho.`
        : ultimoEstilo
        ? ' EL INTENTO ANTERIOR NO VALE: ' + ultimoEstilo + '. Reescribe la respuesta ENTERA arreglando eso y manteniendo todo lo demas.'
        : ultimosInventos.length === 0 && ultimaAperturaMala
        ? `

EL INTENTO ANTERIOR SE HA SALTADO LA RULE 10b: abria con "${ultimaAperturaMala}", que es una de las formulas de IA que la casa tiene prohibidas. Reescribe la respuesta ENTERA cambiando LAS PRIMERAS PALABRAS: empieza por ${elegidoArranque}, y que en la primera frase se vea a alguien haciendo algo. No basta con mover la abstraccion mas adelante, el arranque tiene que ser otro.`
        : `\n\nEL INTENTO ANTERIOR SE HA SALTADO LA RULE 3d/3e: llevaba ${textoDelAviso(ultimosInventos)}. Eso no ha pasado y no consta en ningun sitio, asi que no se puede escribir. Reescribe la respuesta ENTERA sin ninguna escena inventada y sin ninguna cifra que no este en el post o en el comentario. Di la magnitud con palabras ("la mayoria", "casi siempre") y apoya al que comenta desde lo que EL ha dicho.`;

    const message = await trackedCreate('reply_generator', {
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      system: buildSystemPrompt(voice),
      messages: [{ role: 'user', content: prompt + correccion }],
    });
    const block = message.content.find((b) => b.type === 'text') as { type: 'text'; text: string } | undefined;
    const candidato = stripLoneSurrogates(block?.text ?? '').trim();
    if (!candidato) throw new Error('Empty reply from model');

    // Lo que CONSTA no es solo el texto del post: el resumen de la imagen y el
    // hilo tambien estan publicados, y el juez no puede llamar inventado a lo
    // que sale ahi (misma leccion que el 15/09 con las fotos).
    const fuentes = {
      postContent: [
        input.postContent,
        input.imageSummary ? `[IMAGEN DEL POST]\n${input.imageSummary}` : '',
        ...(input.hilo || []).map((m) => `[HILO] ${m.autor || ''}: ${m.texto}`),
      ].filter(Boolean).join('\n\n'),
      commentText: input.commentText,
      commenterName: input.commenterName,
    };
    // Primero los patrones (gratis). Solo si pasan se le pregunta al juez, que
    // es una llamada mas y no hace falta gastarla en lo que ya esta cazado.
    ultimosInventos = detectarInventos(candidato, fuentes);
    if (ultimosInventos.length === 0) {
      ultimosInventos = await juezDeInventos(candidato, fuentes);
    }
    if (ultimosInventos.length > 0) {
      console.warn(
        `[replyGenerator] intento ${intento}/3 descartado, se ha inventado ${textoDelAviso(ultimosInventos)}`
      );
      continue;
    }

    // EL TONO va antes que la apertura, y con mas severidad: un arranque tibio
    // se puede editar en dos segundos; una respuesta que echa de casa a un lead
    // templado delante de todo el hilo, no. Si en 3 intentos sigue bordeando,
    // se devuelve el ultimo pero con el aviso bien alto en el log.
    ultimoTonoBorde = detectarRespuestaBorde(candidato);
    if (!ultimoTonoBorde && faltaElGracias(input.commentText, candidato)) {
      ultimoTonoBorde = 'el comentario es un elogio y la respuesta no da las gracias (RULE 13)';
    }
    if (!ultimoTonoBorde && faltaElReconocimiento(input.commentText, candidato)) {
      ultimoTonoBorde =
        'el comentario dice que NO ENTIENDE el post o que NO HA PODIDO LEERLO, y la respuesta no abre dandole la razon (RULE 3c-bis): tiene que empezar por "no pasa nada", "normal", "culpa mia" o "me he enrollado" y luego resumir o explicar';
    }
    if (!ultimoTonoBorde && tomaEnSerioLaBroma(input.commentText, candidato)) {
      ultimoTonoBorde =
        'el comentario es una BROMA que sigue el chiste del post y la respuesta la analiza en serio, como si fuera una tactica (RULE 3g): siguele el rollo, corto y con complicidad ("me la apunto por si la necesito jajaja"), sin explicar por que funciona';
    }
    if (!ultimoTonoBorde && daPorHechoQueViene(input.commentText, candidato)) {
      ultimoTonoBorde =
        'das por hecho que el que comenta va a venir al evento y no lo ha dicho: nada de "te esperamos", "nos vemos" ni "el jueves te ayudara"; como mucho, que alli se habla de esto';
    }
    if (!ultimoTonoBorde && inventaCondicionesDelEvento(candidato)) {
      ultimoTonoBorde =
        'afirmas el precio o las condiciones del evento y no constan en ningun sitio: no lo digas; si lo pregunta, di que se entra por solicitud y que se lo confirmamos por privado';
    }
    if (!ultimoTonoBorde && graciasSeco(input.commentText, candidato, input.commenterName)) {
      ultimoTonoBorde = 'el comentario es un elogio y el gracias va seco ("gracias, ..."): usa la variante de gracias sorteada (RULE 13)';
    }
    if (!ultimoTonoBorde && respuestaAHostilMal(input.commentText, candidato)) {
      ultimoTonoBorde =
        'el comentario es despectivo y la respuesta le replica o no le muestra respeto (RULE 3c-quater): corta, respetuosa ("respeto la opinion", "entiendo que no te encaje", "tomo nota") y SIN ningun "pero" ni zasca';
    }
    if (ultimoTonoBorde && intento < 3) {
      candidatoTibio = candidato;
      console.warn(
        `[replyGenerator] intento ${intento}/3 descartado por TONO: ${ultimoTonoBorde}`
      );
      continue;
    }
    if (ultimoTonoBorde) {
      console.warn(
        `[replyGenerator] 🔴 los 3 intentos salen bordes (${ultimoTonoBorde}); REVISA esta respuesta a mano antes de enviarla`
      );
    }

    // LONGITUD Y COMILLAS (Iker, 2026-09-16), con la misma severidad que la
    // apertura: se reintenta y, si a la tercera sigue, se devuelve igual.
    ultimoEstilo = problemaDeEstilo(input.commentText, candidato, input.commenterName);
    if (ultimoEstilo && intento < 3) {
      candidatoTibio = candidato;
      ultimaAperturaMala = null;
      console.warn(`[replyGenerator] intento ${intento}/3 descartado por estilo: ${ultimoEstilo}`);
      continue;
    }

    // Lo que no miente pero abre como un folleto: se reintenta, y si a la
    // tercera sigue igual se publica igualmente (ver la nota de severidad).
    ultimaAperturaMala = detectarAperturaGenerica(candidato, input.commenterName);
    if (ultimaAperturaMala && intento < 3) {
      candidatoTibio = candidato;
      console.warn(
        `[replyGenerator] intento ${intento}/3 descartado, abria con "${ultimaAperturaMala}" (RULE 10b)`
      );
      continue;
    }
    text = candidato;
    break;
  }
  if (!text && candidatoTibio) {
    console.warn(
      `[replyGenerator] los 3 intentos abrieron con una formula de IA ("${ultimaAperturaMala}"); se devuelve igual para no bloquear`
    );
    text = candidatoTibio;
    ultimosInventos = [];
  }

  if (!text) {
    throw new Error(
      `El generador se ha inventado ${textoDelAviso(ultimosInventos)} en los 3 intentos, asi que no te devuelvo nada: escribe esta respuesta a mano. Inventarse un cliente o una cifra en un hilo publico no se puede deshacer.`
    );
  }
  // Drop wrapping quotes if the model added them despite the system rule.
  text = text.replace(/^["“”']+|["“”']+$/g, '').trim();
  // Defensive cleanups so a model slip never reaches LinkedIn (RULE 5/8/9):
  // 1. Replace any em/en dash with a comma — it's the AI tell we ban.
  text = text.replace(/\s*[—–]\s*/g, ', ').replace(/,\s*,/g, ',');
  // 1a-bis. DOS PUNTOS -> COMA (RULE 8b, mecanizada el 2026-08-19).
  //     La regla existe desde el 12/08 y aun asi 5 de cada 8 respuestas reales
  //     seguian saliendo con dos puntos. Misma leccion que con las anecdotas: si
  //     nadie lo comprueba, la regla es una sugerencia. La limpieza es la que
  //     manda la propia doctrina (brand-voice 7.1): se cambia por una coma.
  //     Exige un espacio detras a proposito, para no destrozar una hora ("10:30")
  //     ni una URL ("https://") si alguna vez se cuela una.
  text = text.replace(/\s*:\s+/g, ', ').replace(/,\s*,/g, ',');
  // 1b. Drop a comma placed directly before "y"/"e" (AI tell, RULE 9).
  //     Runs AFTER the dash→comma step so a "word — y algo" rewrite
  //     ("word, y algo") also gets cleaned to "word y algo".
  text = text.replace(/,\s*\b([ye])\b/gi, ' $1');
  // 1c. Capitalize the first letter of a new sentence (after . ! ?) —
  //     the model is told to open lowercase (RULE 5) but sometimes carries
  //     that lowercase across a period ("eso es. y lo que…" → "eso es. Y
  //     lo que…"). Only touches letters AFTER sentence punctuation, so the
  //     intentional lowercase opening word is preserved. \p{Ll} + /u keeps
  //     accented letters working (á→Á).
  text = text.replace(/([.!?])(\s+)(\p{Ll})/gu, (_m, p, sp, ch) => `${p}${sp}${ch.toUpperCase()}`);
  const letrasVoz = voice === 'sobrio' ? 1 : 2;
  // 1e. UNA SOLA PALABRA ALARGADA, EN CUALQUIER VOZ (Iker, 2026-09-16). Se
  //     aplica al cuerpo, no al nombre, para que un nombre raro nunca cuente
  //     como la palabra alargada.
  {
    const nom = input.commenterName?.trim();
    if (nom && text.toLowerCase().startsWith(nom.toLowerCase())) {
      // Si el sorteo dijo "sin alargar", se quitan TODAS: el 16/09 salieron 6
      // de 8 alargadas porque el modelo alargaba igual, con "clarooo" tres
      // veces en la misma tanda.
      const cuerpo = estirar
        ? limitarEstiradas(quitarIncisosSueltos(text.slice(nom.length)))
        : desestirarTodo(quitarIncisosSueltos(text.slice(nom.length)));
      // Si toca alargar y el modelo no la dejo en uno de sus dos sitios, se
      // abre con la palabra sorteada (Iker, 2026-09-18): antes estirarUna la
      // soltaba en cualquier palabra de reaccion, tambien entre dos comas.
      // En un elogio solo se alarga el gracias que haya: nunca se le antepone otra.
      const alarga = (t: string) => (palabraAlargar === 'gracias' ? estirarUna(t, letrasVoz) : forzarEstirada(t, letrasVoz, palabraAlargar));
      text = estirar
        ? `${text.slice(0, nom.length)} ${alarga(cuerpo.replace(/^[\s,]+/, ''))}`
        : text.slice(0, nom.length) + cuerpo;
    } else {
      const base = limitarEstiradas(quitarIncisosSueltos(text));
      text = estirar
        ? (palabraAlargar === 'gracias' ? estirarUna(base, letrasVoz) : forzarEstirada(base, letrasVoz, palabraAlargar))
        : desestirarTodo(quitarIncisosSueltos(text));
    }
  }
  // 1g. TILDES QUE NO ADMITEN DUDA (tanda del 18/09: "ojala", "culpa mia").
  text = ponerTildesSeguras(text);
  // 1h. SI A LA TERCERA SIGUE INVENTANDO SOBRE EL EVENTO, salida segura: lo
  //     que no sabemos se contesta por privado.
  if (
    inventaCondicionesDelEvento(text) ||
    (detectarRespuestaBorde(text) || '').includes('evento') ||
    daPorHechoQueViene(input.commentText, text)
  ) {
    console.warn(`[replyGenerator] respuesta sobre el evento sin base, se sustituye por la salida segura: ${text}`);
    const nomSeguro = input.commenterName?.trim();
    text = `${nomSeguro ? nomSeguro + ' ' : ''}te lo paso por privado${voice === 'sobrio' ? '.' : ' 🙌'}`;
  }
  // 1d. (va DESPUES del limite de alargadas, para que el colapso no esconda
  //     ninguna) VOCES SOBRIAS (Unai y Asier, NO Iker): colapsa cualquier racha de 3+
  //     letras iguales a 2 ("síííí" → "síí", "graciasss" → "graciass"). La
  //     RULE 12 ya lo pide, pero el prompt es una petición y la voz es una
  //     promesa: un solo desliz y el fundador suena a otro. Se puede hacer a
  //     ciegas porque el español no tiene ninguna triple letra legítima. Solo
  //     minúsculas, así que un acrónimo como "AAA" sobrevive.
  //     Iker ('cercano') queda fuera a propósito: el "muuuy" es suyo.
  if (voice !== 'cercano') {
    text = text.replace(/(\p{Ll})\1{2,}/gu, '$1$1');
  }
  // 1f. EL EMOJI LO DECIDE EL SORTEO, NO EL MODELO. Unai nunca; si al resto le
  //     toco emoji y el modelo no lo puso, se le pone uno de los "seguros".
  //     Y si el sorteo dijo "sin emoji", se quita aunque el modelo lo haya
  //     puesto: en la prueba del 16/09 Iker salio con emoji en 7 de 8, que es
  //     justo el "todas con emoji" que no quiere.
  if (conEmoji && voice !== 'sobrio') {
    text = ponerEmojiAlFinal(text, emojiElegido);
  } else {
    text = quitarEmojis(text);
  }
  // 2. Strip a stray comma right after the leading mention name so the
  //    reply reads "Name y…" not "Name, y…" (the backend keeps whatever
  //    follows the name verbatim, so the comma must be gone here).
  if (input.commenterName) {
    const n = input.commenterName;
    if (text.slice(0, n.length).toLowerCase() === n.toLowerCase()) {
      let rest = text.slice(n.length).replace(/^\s*,\s*/, ' ');
      // La primera palabra tras el nombre va en minuscula (RULE 5). Un nombre
      // que acaba en punto ("Antonio N.") engañaba al paso 1c, que la subia a
      // mayuscula como si fuera una frase nueva (Iker, 2026-09-17). Se respetan
      // las siglas ("CRM") para no romperlas.
      rest = rest.replace(/^(\s+)(\p{Lu})(\p{Ll})/u, (_m, sp, a, b) => `${sp}${a.toLowerCase()}${b}`);
      text = (n + rest).trim();
    }
  }
  const limpio = text.trim();
  // La apertura entra en la memoria de la tanda SOLO cuando la respuesta se
  // devuelve de verdad: si se ha descartado por inventar, nunca existio.
  recordarApertura(input.postId, apertura(limpio, input.commenterName));
  recordarAlargada(input.postId, limpio.slice(input.commenterName?.trim().length || 0));
  return limpio;
}
