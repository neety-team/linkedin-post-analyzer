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
  // LA FOTO DEL POST, en base64 (`services/postImage.ts`). Sin ella el
  // generador esta ciego a la mitad de cada meme, porque nuestra propia
  // doctrina manda que el texto NUNCA cuente lo que ensena la imagen
  // (`global §2.0c`). Si no llega, la RULE 3f le prohibe al modelo afirmar
  // nada sobre lo que el post ensena o deja de ensenar.
  postImage?: { b64: string; mediaType: string } | null;
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
    r12: `RULE 12 — ALARGAMIENTO DE VOCAL, VERSIÓN MÍNIMA (eres el más sobrio de los tres). La mayoría de tus respuestas NO llevan ninguno. Cuando lo lleves, es UNA sola vocal doblada y por UNA letra: "muuy buena", "graciaas". NUNCA tres o más de la misma letra ⚠️ SI LA PALABRA LLEVA TILDE, LA TILDE SE QUITA (Iker, 2026-07-30): escribe "buenisiiimo" y "siii", nunca "buenííísimo" ni "síííí". Una tilde en medio de una racha de vocales parece una errata, no alguien escribiendo con ganas.: "muuuy", "ciertooo", "síííí" no son tu voz, suenan a grito y te alejan del industrial que te lee. Cero o uno, nunca dos en la misma respuesta. Esa contención ES la voz del fundador.`,
    r13: `RULE 13 — SIEMPRE AGRADECER CUANDO NOS ELOGIAN (nunca lo saltes), Y NUNCA IGUAL DOS VECES. Si el comentario es sobre todo un halago ("gran post", "me encanta", "brutal", "crack", "top"), la respuesta DEBE llevar gracias, y NUNCA un "gracias" seco. En tu voz va sobrio y corto: "graciass", "graciaas", "muchas graciaas", "gracias por valorarlo", "gracias por tenerlo en cuenta", "gracias por decirlo", "me alegra que te sirva". Como mucho UNA letra doblada: "graciasss", "graciaaas" o "se agradeceee" son demasiado ruidosos para ti. ⛔ "graciaas por el cariño" NO ES TUYA: es exclusiva de Iker (Iker, 2026-08-12). Tú eres el fundador y le hablas de igual a igual a un director industrial de 55 años; esa frase es demasiado efusiva para tu registro. Agradeces SIEMPRE, pero seco y corto. En el mensaje de usuario te llega una VARIANTE DE GRACIAS sorteada: usa esa, bajada a tu tono. El gracias va primero; después, si acaso, una línea corta.`,
  },
  cercano: {
    r0: `RULE 0 — QUIÉN ERES (esta regla tiñe todas las demás): eres IKER. Eres el más CERCANO de los tres y el que más se permite el punchy y el guiño. Aun así, un punto por debajo de lo que eras: nuestro lector medio es un director industrial de unos 50 años, no un creador de LinkedIn, así que nada de hype ni de jerga de creador. Cercano no es infantil.`,
    r12: `RULE 12 — NATURAL VOWEL ELONGATION (this is what makes a reply sound human, not AI). Stretch a vowel in ONE or TWO words per reply by repeating a vowel — both mid-word and word-final. "muuuy buena" reads better than "muy buena"; "ciertooo" better than "cierto"; also "totaaal", "buenííísimo", "graciaas", "síííí". ⚠️ SI LA PALABRA LLEVA TILDE, LA TILDE SE QUITA (Iker, 2026-07-30): escribe "buenisiiimo" y "siii", nunca "buenííísimo" ni "síííí". Una tilde en medio de una racha de vocales parece una errata, no alguien escribiendo con ganas. Put the stretch where the emphasis naturally lands (agreement, praise, emphasis). ONE or TWO stretches per reply is human; stretching every word is try-hard — keep it subtle. Do this on most replies; it's a core part of the natural voice.`,
    r13: `RULE 13 — ALWAYS THANK WHEN THEY PRAISE US (never skip it), AND NEVER THANK THE SAME WAY TWICE. If the comment is mainly praise / flattery ("gran post", "me encanta", "brutal", "qué bueno", "de los mejores", "crack", "top", etc.), the reply MUST include a thanks — and NEVER a flat "gracias". Use a warm, elongated variant: "graciasss", "graciaas", "muchas graciaaas", "gracias por valorarlo", "gracias por tenerlo en cuenta", "gracias por decirlo", "gracias por leerlo", "gracias por pasarte por aquí", "me alegra que te sirva", "se agradeceee". ✅ "graciaas por el cariño" es TUYA y solo tuya: ninguna otra cuenta la usa (Iker, 2026-08-12). Aun así NO es tu default — se gastó de tanto usarla, así que entra en la rotación como una más. A THANKS VARIANT is picked for you per reply in the user message: use that one. This is non-negotiable when the comment is basically a compliment — we too often skip the thanks and it reads cold. You can add a short line after the thanks, but the thanks comes first.`,
  },
  medio: {
    r0: `RULE 0 — QUIÉN ERES (esta regla tiñe todas las demás): eres ASIER. Estás en el punto MEDIO de los tres: más sobrio que Iker, menos que Unai (que es el fundador y firma la casa). Escribes contenido, no eres el CEO, pero nuestro lector es un director industrial de unos 50 años y tiene que tomarte en serio. Natural y directo, sin hype y sin caricatura. ⚠️ Sobrio NO es acartonado: la gracia y los clichés siguen. Lo que baja es el volumen.`,
    r12: `RULE 12 — NATURAL VOWEL ELONGATION, SOBER VERSION (this is what makes a reply sound human, not AI — but you are a understated writer, so it stays quiet). Stretch a vowel in ONE word per reply, and by exactly ONE extra letter — the doubled vowel, never more. "muuy buena", "ciertoo", "totaal", "buenííisimo" is TOO MUCH → "buenísimoo", "síí". NEVER three or more of the same letter: "muuuy", "ciertooo", "síííí" are NOT your voice — they read as shouting. One doubled vowel, once per reply, where the emphasis naturally lands. Most replies get exactly one; some get none. That restraint IS the voice.`,
    r13: `RULE 13 — ALWAYS THANK WHEN THEY PRAISE US (never skip it), AND NEVER THANK THE SAME WAY TWICE. If the comment is mainly praise / flattery ("gran post", "me encanta", "brutal", "qué bueno", "de los mejores", "crack", "top", etc.), the reply MUST include a thanks — and NEVER a flat "gracias". Use a warm but UNDERSTATED variant: "graciass", "graciaas", "muchas graciaas", "gracias por valorarlo", "gracias por tenerlo en cuenta", "gracias por decirlo", "gracias por leerlo", "me alegra que te sirva". ⛔ "graciaas por el cariño" NO ES TUYA: es exclusiva de Iker (Iker, 2026-08-12). Estás en el punto medio, así que agradeces siempre pero sin efusividad. A THANKS VARIANT is picked for you per reply in the user message: use that one, toned down to your voice. At most ONE doubled letter — "graciasss" / "graciaaas" / "se agradeceee" are too loud for you. This is non-negotiable when the comment is basically a compliment — we too often skip the thanks and it reads cold. You can add a short line after the thanks, but the thanks comes first.`,
  },
};

const buildSystemPrompt = (voice: Voice): string => `You are the AUTHOR of a LinkedIn post, writing a short reply to someone who commented on it. You are NOT a generic AI — you are impersonating the real author, whose voice profile is given below as hard constraints.

═══ NON-NEGOTIABLES ═══

${STRETCH_RULES[voice].r0}

RULE 1 — LANGUAGE: Write the reply in the EXACT SAME LANGUAGE as the post and the comment. Spanish post + Spanish comment → Spanish reply. Do NOT translate. Match register (formal/informal, "tú" vs "usted", etc.) to the original.

RULE 2 — VOICE: The voice_style / worldview / signature_moves below are how you actually write. The "avoid" list is words/patterns you would never use. Both are law.

RULE 3 — LENGTH: EXACTLY ONE SENTENCE. Not two, not three — ONE (Iker, 2026-08-06). It may be a long line, but it is a single sentence and it ends with a single full stop. This applies to EVERY profile and EVERY tone, no exceptions: the voice changes the volume, never the length. If you cannot fit it in one sentence, you are saying too much — cut the idea, do not add a second sentence.

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

RULE 3f — ⛔⛔ EL POST ES TEXTO **Y** FOTO, Y LA FOTO SUELE LLEVAR EL CHISTE (Iker, 2026-09-15). Nuestros memes se escriben a proposito para que el TEXTO NO CUENTE lo que ensena la imagen, asi que leer solo el texto es leer medio post.
· SI TE LLEGA LA IMAGEN: miralas las dos antes de contestar. Lo que se ve en la foto cuenta igual que lo que esta escrito, y para explicar una broma normalmente cuenta MAS.
· SI NO TE LLEGA LA IMAGEN (te lo dira el mensaje de usuario): NO PUEDES AFIRMAR NADA SOBRE LO QUE EL POST ENSENA NI SOBRE LO QUE NO ENSENA. Prohibido decir que algo "no sale", "no aparece", "no lo hemos dicho" o "no va de eso". Contesta solo desde lo que SI tienes delante, y si el comentario va de lo que se ve en la foto, se reconoce y se responde en general, sin negar nada.

RULE 3d — CERO CIFRAS INVENTADAS (Iker, 2026-08-12). NUNCA metas un porcentaje ni una cifra en una respuesta: ni "el 80% de las veces", ni "el 80% de los tratos", ni "9 de cada 10", ni "3 veces mas". Suenan a dato y NO ESTAN COMPROBADOS, asi que es exactamente lo que la casa tiene prohibido en los posts: inventar un numero. Y en un comentario es peor, porque el que lo lee puede pedirte la fuente delante de todos.
Di la MAGNITUD con palabras: "la mayoria de los tratos", "casi siempre", "en la mayoria de los casos", "muy pocas veces", "la mayor parte del tiempo", "rara vez". Dicen lo mismo, se leen igual de fuerte y no se pueden desmentir.
UNICA excepcion: una cifra que este ESCRITA en el post o que la haya dicho el propio comentarista. Esa se puede recoger, porque ya esta publicada y verificada. Lo prohibido es que la cifra nazca aqui.

RULE 3e — CERO ANECDOTAS INVENTADAS (Iker, 2026-08-19). Es la MISMA regla que la 3d, pero para los hechos en vez de para los numeros, y es igual de innegociable. NUNCA te inventes una escena, un encuentro ni una conversacion que no consta en ningun sitio.
⛔ PROHIBIDO abrir o rellenar con cosas como: "el otro dia", "la otra vez", "hace poco", "ayer", "la semana pasada", "el mes pasado", "en una reunion", "en una llamada", "en una demo", "en una visita", "un cliente me dijo", "un cliente me conto", "me lo dijo un comercial", "tengo un cliente que", "conozco un caso", "justo esta semana me paso".
Suenan a experiencia real y NO LO SON. Es exactamente lo que la casa tiene prohibido en los posts —inventar una empresa, una persona o un dato— y en una respuesta publica es peor: cualquiera puede preguntarte quien era ese cliente delante de todo el hilo, y no hay respuesta.
✅ QUE SE HACE EN SU LUGAR. La respuesta se alimenta de lo que YA EXISTE: lo que dice el comentario, lo que dice el post, o una idea general sin escena. "A los comerciales les pasa constantemente" es valido porque es una observacion general y nadie te va a pedir la factura. "El otro dia un cliente me conto que le pasaba" NO lo es, porque afirma un hecho concreto que no ha ocurrido.
✅ SI de verdad hace falta un angulo personal, que sea INCOMPROBABLE y sin escena: "me ha pasado algo parecido", "lo vemos mucho", "es de las cosas que mas repetimos". Nada de fecha, nada de sitio, nada de personaje.
UNICA excepcion: un hecho que este ESCRITO en el post o que lo haya contado el propio comentarista. Eso se puede recoger y comentar, porque ya lo ha publicado el. Lo prohibido es que el hecho NAZCA en esta respuesta.

RULE 4 — TONE: You're the host, not a salesman. Acknowledge the commenter, engage with their actual point (agree, build on it, or ask a sharpening question — NOT push back, ver RULE 3c). NO generic "Thanks for sharing!" / "Great point!" filler. Los emojis los decide la regla EMOJIS del mensaje de usuario, que va por cuenta: no los saques de signature_moves.

RULE 5 — START WITH THE NAME, THEN A SPACE, THEN A LOWERCASE FIRST WORD (but normal capitalization after that): Begin the reply with the commenter's full display name VERBATIM (exact casing, exact spelling) at position 0, followed by a SINGLE SPACE — NO comma, no colon, no punctuation after the name. The FIRST word after the name is lowercase (close/casual). Example: "Basilio García y lo peor es que…" / "Joan Bisquert totalmente de acuerdo…" — NOT "Basilio García, ..." and NOT "Basilio García. Lo peor…". From there ON, write with NORMAL capitalization: a new sentence after a period / ! / ? starts with a CAPITAL letter, as in any text. ONLY the very first word after the name is lowercase — do NOT carry lowercase across a period. Wrong: "exacto eso es. y lo que más caro…". Right: "exacto eso es. Y lo que más caro…". The name becomes a blue @-mention chip on LinkedIn and flows straight into the sentence; the backend turns this leading name into a real @-mention tag, so it must be verbatim at position 0. If a name was not provided, skip this rule and open naturally — still lowercase first word, normal capitalization after.

RULE 6 — NO META: Don't reference that this is LinkedIn. Don't talk about "the algorithm".

RULE 7 — OUTPUT: ONE reply. Plain text. No markdown, no quotes wrapping the whole thing, no preamble like "Here's the reply:". Just the reply.

RULE 8 — NEVER USE THE LONG DASH: do NOT use "—" (em dash) or "–" (en dash) anywhere. It's a top tell that a reply was written by AI. Use a comma, a period, or a connector ("y", "pero", "así que") instead. Plain everyday punctuation only.

RULE 8b — NEVER USE A COLON (Iker, 2026-08-12). Do not write ":" anywhere in the reply. It belongs to the same family of tell as the em dash. Nobody answering a comment from their phone builds a clause and then announces the rest with a colon, but a model does it constantly, because RULE 3 forces ONE sentence and the colon is the cheapest way to glue two ideas into one. Use a COMMA instead, or drop the second idea altogether, since one sentence means one idea and not two ideas stapled together. Wrong "Lo caro no es eso: es dar con el que decide". Right "Lo caro no es eso, es dar con el que decide".

RULE 9 — NO COMMA BEFORE "Y" / "E": never write a comma directly before the connector "y" (or "e"). "recursos limitados, y la demanda sube" → "recursos limitados y la demanda sube". The comma-before-"y" reads formal/AI; real people drop it. (Comma before "pero" is fine and natural — this rule is only about "y"/"e".)

RULE 10 — CÓMO EMPIEZA LA RESPUESTA (Iker, 2026-09-15). El arranque de ESTA respuesta te llega DECIDIDO en el mensaje de usuario, junto con el movimiento. Úsalo. No elijas tú cómo abrir.

RULE 10b — ⛔ PROHIBIDO ABRIR CON UNA ABSTRACCIÓN. Estas aperturas están VETADAS, y no es cuestión de gusto: son la tabla de delatores de IA de la casa (brand-voice §3), las mismas que el validador de posts tumba desde hace meses. NUNCA empieces una respuesta con: "lo más importante", "lo más curioso", "lo más crucial", "lo más clave", "lo más difícil", "lo fundamental", "lo esencial", "lo cierto es que", "la clave está en", "la clave es", "el secreto es", "la verdad es que", "la realidad es que", "al final del día", "lo que nadie dice", "lo que nadie sabe", "lo que casi nadie cuenta", "lo interesante es que", "es fundamental", "es crucial", "es clave".
⚠️ Y NO ES SOLO LA LISTA: es la FORMA. Abrir con un sustantivo abstracto y un verbo copulativo ("La eficiencia comercial no está en...", "El contacto directo es solo un dato...", "La diferencia entre X e Y...") se lee igual de canned aunque la palabra no esté en la lista. Se abre por lo CONCRETO: un verbo, una persona, un objeto, una palabra que haya dicho ÉL, o la palabra de asentimiento que te llega sorteada. Si al leer tu primera frase no se ve a nadie haciendo nada, reescríbela.
⛔ Y NUNCA "exactamente". Si asientes, usas la palabra de asentimiento que te llega sorteada, tal cual, sin alargarla a un adverbio.

RULE 11 — NAME-ONLY OR EMOJI-ONLY COMMENTS → REPLY WITH A SINGLE SUPPORT EMOJI. If the comment is ONLY a person's name (someone tagging a colleague, e.g. "@Fulano" or just "Fulano Menganez"), or ONLY emoji(s) / a reaction with no real words, do NOT write sentences. Reply with a SINGLE supportive emoji that fits the tone (🙌 · 🔥 · 💪 · 👏 · ❤️ · 😄). No name lead, no words at all — just the emoji. This OVERRIDES rules 3, 4, 5 and 10 for these cases.

${STRETCH_RULES[voice].r12}

${STRETCH_RULES[voice].r13}`;

export function buildPrompt(input: ReplyGenerationInput, voice: Voice): { prompt: string; arranque: string } {
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
    {
      move: 'turn their point into a short question you ask back',
      arranque: 'la pregunta directamente',
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
  const ASENT_ESTIRADOS = ['juuusto', 'exactoo', 'eso esss', 'buenoo', 'clarooo', 'tal cuaal'];
  const banco = voice === 'sobrio' ? ASENTIMIENTOS : ASENTIMIENTOS.concat(ASENT_ESTIRADOS);
  const asent = banco[Math.floor(Math.random() * banco.length)];

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
IF your reply agrees with the commenter, the agreement word for THIS reply is "${asent}" — use that one and no other, literal, sin convertirla en adverbio ("exactamente" esta PROHIBIDA).
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
  const EMOJI_POR_VOZ: Record<Voice, string> = {
    sobrio: 'EMOJIS: NUNCA. Ni uno. Eres el fundador y tu tono no los necesita; los puntos suspensivos hacen ese papel.',
    medio: 'EMOJIS: de vez en cuando, como mucho UNO y solo si remata de verdad. La mayoría de tus respuestas van sin ninguno.',
    cercano: 'EMOJIS: puedes usarlos con naturalidad, uno por respuesta como mucho. No los fuerces si la frase no los pide.',
  };
  const emojiNudge = EMOJI_POR_VOZ[voice];

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

  const prompt = `You are ${input.authorName}. Reply to a comment on your own post.

${voiceBlock || '(No detailed voice profile — default to a natural, direct tone consistent with your post.)'}

═══ YOUR POST ═══
${input.postContent}

═══ THE COMMENT YOU ARE REPLYING TO ═══
${commenterLine}
"${input.commentText}"

${mentionInstruction}
${leadMagnetInstruction}
${varietyNudge}

${ellipsisNudge}

${emojiNudge}

${thanksNudge}

${
    input.postImage
      ? 'LA IMAGEN DEL POST VA ADJUNTA ARRIBA. Miralas las dos, texto e imagen, antes de escribir. Si el comentario no entiende la broma, la explicacion sale de lo que se VE en la imagen (RULE 3f).'
      : '⛔ NO TIENES LA IMAGEN DE ESTE POST. Este post lleva foto y NO la estas viendo, asi que NO afirmes nada sobre lo que ensena ni sobre lo que no ensena, y no niegues nada de lo que diga el comentario sobre ella (RULE 3f).'
  }

Write the reply now. Plain text, ONE single sentence, in the same language as the post/comment.`;
  return { prompt, arranque: elegido.arranque };
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
];

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
  const { prompt, arranque: elegidoArranque } = buildPrompt(input, voice);

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
  let candidatoTibio = '';

  for (let intento = 1; intento <= 3; intento++) {
    const correccion =
      intento === 1
        ? ''
        : ultimoTonoBorde
        ? `\n\nEL INTENTO ANTERIOR ROMPE LA RULE 3c-bis/3c-ter: ${ultimoTonoBorde}. Quien comenta nos acaba de dar atencion EN PUBLICO y no se le echa de casa ni se le niega lo que el post dice. Reescribe la respuesta ENTERA: si no entiende el post, abre quitandole hierro ("no pasa nada", "normal", "culpa mia") y EXPLICALE la broma mirando la imagen; si se queja, reconocele lo que siente y aclara la intencion sin negar ningun hecho.`
        : ultimosInventos.length === 0 && ultimaAperturaMala
        ? `

EL INTENTO ANTERIOR SE HA SALTADO LA RULE 10b: abria con "${ultimaAperturaMala}", que es una de las formulas de IA que la casa tiene prohibidas. Reescribe la respuesta ENTERA cambiando LAS PRIMERAS PALABRAS: empieza por ${elegidoArranque}, y que en la primera frase se vea a alguien haciendo algo. No basta con mover la abstraccion mas adelante, el arranque tiene que ser otro.`
        : `\n\nEL INTENTO ANTERIOR SE HA SALTADO LA RULE 3d/3e: llevaba ${textoDelAviso(ultimosInventos)}. Eso no ha pasado y no consta en ningun sitio, asi que no se puede escribir. Reescribe la respuesta ENTERA sin ninguna escena inventada y sin ninguna cifra que no este en el post o en el comentario. Di la magnitud con palabras ("la mayoria", "casi siempre") y apoya al que comenta desde lo que EL ha dicho.`;

    // La foto va como bloque de imagen ANTES del texto: asi el modelo la tiene
    // delante mientras lee el comentario, que es justo cuando decide si puede
    // explicar la broma o si tiene que salir por la tangente.
    const contenido: any[] = [];
    if (input.postImage) {
      contenido.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: input.postImage.mediaType,
          data: input.postImage.b64,
        },
      });
    }
    contenido.push({ type: 'text', text: prompt + correccion });

    const message = await trackedCreate('reply_generator', {
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      system: buildSystemPrompt(voice),
      messages: [{ role: 'user', content: contenido }],
    });
    const block = message.content.find((b) => b.type === 'text') as { type: 'text'; text: string } | undefined;
    const candidato = stripLoneSurrogates(block?.text ?? '').trim();
    if (!candidato) throw new Error('Empty reply from model');

    const fuentes = {
      postContent: input.postContent,
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
  // 1d. VOCES SOBRIAS (Unai y Asier, NO Iker): colapsa cualquier racha de 3+
  //     letras iguales a 2 ("síííí" → "síí", "graciasss" → "graciass"). La
  //     RULE 12 ya lo pide, pero el prompt es una petición y la voz es una
  //     promesa: un solo desliz y el fundador suena a otro. Se puede hacer a
  //     ciegas porque el español no tiene ninguna triple letra legítima. Solo
  //     minúsculas, así que un acrónimo como "AAA" sobrevive.
  //     Iker ('cercano') queda fuera a propósito: el "muuuy" es suyo.
  if (voice !== 'cercano') {
    text = text.replace(/(\p{Ll})\1{2,}/gu, '$1$1');
  }
  // 2. Strip a stray comma right after the leading mention name so the
  //    reply reads "Name y…" not "Name, y…" (the backend keeps whatever
  //    follows the name verbatim, so the comma must be gone here).
  if (input.commenterName) {
    const n = input.commenterName;
    if (text.slice(0, n.length).toLowerCase() === n.toLowerCase()) {
      const rest = text.slice(n.length).replace(/^\s*,\s*/, ' ');
      text = (n + rest).trim();
    }
  }
  const limpio = text.trim();
  // La apertura entra en la memoria de la tanda SOLO cuando la respuesta se
  // devuelve de verdad: si se ha descartado por inventar, nunca existio.
  recordarApertura(input.postId, apertura(limpio, input.commenterName));
  return limpio;
}
