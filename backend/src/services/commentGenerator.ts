import Anthropic from '@anthropic-ai/sdk';
import { trackedCreate } from './claudeClient';
import { stripLoneSurrogates } from '../utils/sanitizeText';
import {
  detectarAperturaGenerica,
  limitarEstiradas,
  quitarIncisosSueltos,
  eventoInventado,
  recortarEventoInventado,
  asentimientosAlPrincipio,
  incisoDeAsentir,
  alargadaFueraDeSitio,
  ponerTildesSeguras,
  quitarComaAntesDeY,
  forzarEstirada,
  tieneReaccion,
  contarEstiradas,
  ALARGADAS_SUELTAS,
  ponerEmojiAlFinal,
  quitarEmojis,
  comillasDeArranque,
  sorteaEmoji,
  estirarUna,
  esEstirada,
  desestirarTodo,
  pulirTrasAlargada,
  alargarPalabra,
  letrasAlAzar,
  alternarVocales,
  moverAlVerbo,
} from './replyGenerator';
import {
  esPostDeEvento,
  esPeloteo,
  analizarEvento,
  textoFase,
  angulosApoyo,
  arranquesApoyo,
  angulosEvento,
  planTanda,
  aplicarCierre,
  textoCierre,
  comentarioVacio,
  registroFormal,
  familiaEnTanda,
  suerteFutura,
  quitarFraseFutura,
  afirmaQueEstuvo,
  apoyaEventoPasado,
  detalleRepetidoEnTanda,
  juezDeTanda,
  pulirComentario,
  nombreAjeno,
  cifraNueva,
  quitarExactamente,
  inglesColado,
  conservarMayuscula,
  LARGO_MAX_CHAT,
  huecosAlargada,
  nombraLaCasa,
  abreConVale,
  latinismo,
  eventoRecortado,
  exageraDeBroma,
  esHistoriaDeEquipo,
  angulosHistoriaEquipo,
  sorpresaDeQuienEstuvo,
  confiesaElDolor,
  alargadaTrasNo,
  concordanciaRota,
  desvelaLaEstrategia,
} from './variedadComentarios';

// ⛔⛔ LA APERTURA ES EL SITIO DONDE ESTO SE DELATA (Iker, 2026-09-15)
//
// MEDIDO, y la muestra son estos mismos comentarios ya publicados (sacados de
// Unipile el 15/09): de 19 comentarios de apoyo, 15 (79%) abren con una
// ABSTRACCION — 11 con un sintagma nominal ("La eficiencia comercial no esta
// en...", "El contacto directo es solo un dato") y 4 con un infinitivo
// ("Eliminar falsos positivos...", "Saber la empresa..."). Y "la eficiencia" y
// "la diferencia" salen DOS veces cada una en 19, en cuentas distintas.
//
// LA CAUSA es la misma que en `replyGenerator` y este fichero ya la tenia
// escrita para OTRA cosa: un MENU no produce variedad. El bloque VARIETY lista
// cinco angulos y el modelo los colapsa, porque nadie le dice cual va en cual.
// Y encima faltaba lo mas barato: la tabla de delatores de IA de brand-voice §3
// (`AI_TELLS` en validar-post.py) nunca estuvo en este prompt, asi que la misma
// formula que jamas pasa en un post salia cada dia en los comentarios.
//
// EL ARREGLO, en las mismas tres capas: se PROHIBE la familia en el prompt, se
// ASIGNA a cada comentario su angulo y su arranque (sorteados sin reemplazo, y
// por eso rotan tambien ENTRE posts), y se COMPRUEBA la salida.
// Peloteo hueco: lo que el prompt prohibe y el 15/09 salio igualmente
// ("Buena reflexión. 12 meses de cuota no reemplazan..."). Lista APARTE de la
// del generador de respuestas a proposito: alli "buen punto" es una palabra de
// asentimiento legitima y sorteada, aqui es relleno que se borra sin perder nada.
const APERTURA_HUECA = /^(buena (reflexion|aportacion|observacion)|(muy )?buen (punto|apunte|aporte)|muy (cierto|bueno|buena)|que razon|totalmente( de acuerdo)?|gran (post|publicacion)|me encanta|brutal|genial)\b/;

// ⛔⛔ Y NUNCA SE DEJA MAL A NUESTRA PROPIA PUBLICACION (Iker, 2026-09-15)
//
// El prompt lleva desde siempre un REGISTER que dice "supportive, NEVER
// contrarian, NEVER skeptical"... y era una peticion mas. Esto salio PUBLICADO
// el 20/08 en el hilo de un post nuestro:
//
//   "El flujo parece demasiado perfecto para produccion, objecion, respuesta y
//    reunion cerrada sin errores intermedios. Bonita demo del..."
//
// O sea: un comentario nuestro, pegado por un companero con su nombre y su
// cara, poniendo en duda nuestro propio contenido delante de todo el mundo. Es
// el peor resultado posible de este flujo — peor que uno soso — porque le da
// municion al que venia a discutir.
//
// La linea es fina y por eso va enumerada: SUMAR un matiz esta bien ("y encima
// pasa que..."), poner en duda que lo que contamos sea real, no.
const CRITICA_NUESTRO_POST = /(demasiado (perfecto|bonito|facil|redondo)|bonita demo|suena (a|muy) (demo|marketing|teoria)|en la vida real|en teoria (esta|suena)|me cuesta creer|dudo que|no me cuadra|ojala fuera (asi|tan)|no es tan (facil|sencillo) como|(muy|un poco) optimista|poco (realista|creible))/;

export function criticaNuestroPost(c: string): boolean {
  return CRITICA_NUESTRO_POST.test(
    c.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  );
}

export function aperturaHueca(c: string): boolean {
  return APERTURA_HUECA.test(
    c.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
  );
}

// LOS BANCOS DE ANGULOS Y ARRANQUES viven en `variedadComentarios` desde el
// 2026-10-01, junto con el plan de emoji/vocales/cierre y los detectores de
// variedad, porque las respuestas a comentarios usan los mismos. El cambio de
// fondo: antes los siete angulos colgaban de "la idea principal del post", y en
// un peloteo eso dio cinco versiones de "a esta region no la ve nadie".
//
// MODO EVENTO (Iker, 2026-09-24). El post de Unai de las sillas, a 40 minutos
// de Neety Forward, salio con cinco comentarios de apoyo genericos ("Casi
// siempre el resultado que parece espontaneo...") que no mencionaban el evento.
// Los pegan compañeros de la misma empresa, y vayan o no, lo minimo es desearle
// suerte o decir las ganas que tienen. El clasificador solo etiqueta `evento`
// por el enlace de Luma, y el de las sillas no lo llevaba: por eso tambien se
// mira el texto.
// ⛔ Y DESDE EL 2026-10-01, SEGUN CUANDO ES. El banco era todo futuro (suerte,
// ganas de que llegue, que salga redondo) y se le aplico al video del 30/09,
// que contaba en pasado la mañana de antes del evento: salieron "Mucha suerte
// mañana" y "Que salga redondo". Ahora `analizarEvento` lee si ya paso y si
// fuimos todos, y el banco sale de ahi.
export { esPostDeEvento };

/**
 * ULTIMO RECURSO PARA LA LINEA (ronda 6 del 01/10: 1 de 60 con 101 caracteres
 * tras reintentar y reparar). "Siempre una línea" pesa mas que la alargada:
 * si no cabe y abre con ella (o con "Pues" + ella), se quita la alargada.
 */
export function caberEnLinea(c: string): string {
  if (c.length <= LARGO_MAX_CHAT) return c;
  const m = c.match(/^(pues\s+)?(\p{L}+)\s*,?\s+/iu);
  if (!m || !esEstirada(m[2])) return c;
  const resto = c.slice(m[0].length);
  return resto.charAt(0).toUpperCase() + resto.slice(1);
}

/** Lo minimo de cada comentario en modo evento: suerte, ganas u orgullo. */
export function apoyaElEvento(c: string): boolean {
  const t = c.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return /\b(suerte|ganas|redond[oa]|orgullo|a por ello|a por todas|a tope|disfrut\w*|enhorabuena|que salga|sale (genial|bien|redondo)|exito)/.test(t);
}

/** Habla del evento como alguien de fuera (regla del 27/08). */
export function eventoDesdeFuera(c: string): boolean {
  const t = c.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return /\b(vuestr[oa]s?|habeis|contais|preparais|organizais|os deseo|al equipo|todo el equipo|el equipo)\b/.test(t);
}

// Sorteo SIN REEMPLAZO: dos comentarios de la misma tanda no pueden compartir
// arranque, que es justo lo que hace que los cinco se lean como una sola mano.
function reparte(banco: string[], n: number): string[] {
  const copia = [...banco];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia.slice(0, n);
}

// Las dos primeras palabras, normalizadas. Es con lo que se detecta que dos de
// los cinco abren igual: el lector que baja por los comentarios ve eso, no el
// angulo interno que tenia cada uno asignado.
export function primerasDos(c: string): string {
  return c
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .join(' ');
}

export interface CommentGenerationInput {
  postContent: string;
  creatorName: string | null;
  creatorHeadline: string | null;
  /** Pilar ya etiquetado del post. Solo lo usa el generador de apoyo: modo evento y banco de peloteo. */
  pillar?: string | null;
  /** Para leer la fase del evento una vez por post y dia (`analizarEvento`). */
  postId?: string | null;
  publishedAt?: string | Date | null;
  profile: {
    headline: string | null;
    voice_style: string | null;
    worldview: string | null;
    signature_moves: string | null;
    avoid: string | null;
    // legacy fallbacks
    tone?: string;
    expertise?: string | null;
  };
}

export interface GeneratedComments {
  reinforce: string;
  contrarian_data: string;
  contrarian_premise: string;
  contrarian_survivorship: string;
  reframe: string;
  add_missing: string;
  steal_phrase: string;
  warm_supportive: string;
  better_question: string;
}

const COMMENT_KEYS = [
  'reinforce', 'contrarian_data', 'contrarian_premise', 'contrarian_survivorship',
  'reframe', 'add_missing', 'steal_phrase', 'warm_supportive', 'better_question',
] as const;

const SYSTEM_PROMPT = `You are writing LinkedIn comments AS a specific person, in their voice. You are NOT a generic AI assistant generating "good comments" — you are impersonating a real commenter whose voice profile is provided.

═══ TWO NON-NEGOTIABLE RULES ═══

RULE 1 — LANGUAGE MATCHING (CRITICAL):
Write every comment in the EXACT SAME LANGUAGE as the post content.
- Spanish post → Spanish comment (NO English words mixed in)
- English post → English comment
- French post → French comment
- If the post is in Spanish, do NOT translate to English. Do NOT write "Hey, great insight" in a Spanish thread.
- Match the register too: if the post is informal Spanish ("tío", "vale"), your comment should feel natural in that register.

RULE 2 — VOICE PROFILE IS LAW:
The commenter voice profile below is not a suggestion. It is HARD CONSTRAINTS.
- If the profile says the voice is "direct, no filler, skeptical" → every comment must feel direct, skeptical, zero filler.
- If the profile lists signature moves (e.g., "cite a specific number", "end with a sharp question") → use those moves.
- If the profile lists things to avoid (e.g., "never use corporate jargon", "no emojis") → NEVER violate those.
- If the worldview is "growth comes from friction, not frameworks" → your comments must reflect that lens.
- Before writing each comment, silently check: would this specific person actually write this sentence? If not, rewrite.

═══ THE 9 COMMENT TYPES ═══

"reinforce" — Reinforce the key point
  - Validate the post's main idea with your own experience or a nuance that makes it stronger
  - You don't contradict — you amplify. Add a layer the author didn't mention.
  - Tone: confident agreement, personal, concrete
  - End with a sharp insight that extends the original point

"contrarian_data" — Challenge the data
  - Question a specific metric or number from the post: correlation vs. causation, small sample, missing context
  - Cite a real-feeling counter-figure or benchmark (e.g. "In 120+ outbound campaigns I've run, this tactic converted under 2%")
  - Tone: analytical, skeptical, numbers-first
  - End by asking the creator for THEIR data, not their opinion

"contrarian_premise" — Challenge the premise
  - Go to the root. Question whether the category, model, or mental framework the author proposes is real or well-constructed
  - Don't argue the conclusion — argue the foundation it sits on
  - Tone: intellectual, sharp, no filler
  - End with a question that makes the reader reconsider the whole frame

"contrarian_survivorship" — Survivorship bias
  - The case in the post is the exception, not the rule
  - Works especially well on "inspirational story" posts — point out all the people who did the same thing and failed
  - Tone: respectful but firm, grounded in probability
  - End with "how many tried X and didn't get that outcome?"

"reframe" — Reframe the debate
  - Accept the point but move the conversation to a different angle (from product to distribution, from technique to ICP, from conditions to hiring)
  - You're not disagreeing — you're saying "the interesting question is actually over here"
  - Tone: intellectually playful, slightly provocative
  - End with an open question that redirects the debate

"add_missing" — Add a missing point
  - "I agree, but I'd add a 5th." Respect the post's structure and extend it.
  - Works great on posts with lists, frameworks, or numbered points
  - Tone: collaborative, additive, like a co-author
  - Your addition should feel like it obviously belongs in the original post

"steal_phrase" — Steal a phrase
  - Pick a specific phrase from the post and use it as the anchor for your comment
  - Works because the author feels heard — you're engaging with their exact words
  - Tone: conversational, specific, grounded in the text
  - Build your whole comment around that one stolen phrase

"warm_supportive" — Warm & supportive
  - For posts where contrarian doesn't fit (good news, events, culture initiatives, milestones)
  - Short, genuine, no hollow praise. Never "Great post!" or "Totalmente de acuerdo"
  - Tone: warm but not sycophantic — like a friend who's genuinely happy for you
  - 2-3 lines max. Say something specific about WHY it matters, not just that it's great.

"better_question" — Ask a better question
  - Instead of stating an opinion, ask something uncomfortable but legitimate
  - The question should generate a thread without direct confrontation
  - Tone: curious, slightly provocative, genuinely interested in the answer
  - One killer question > three mediocre observations

═══ GENERAL RULES ═══
- HARD LENGTH LIMIT: each comment MUST be ≤ 280 characters (downstream system constraint — anything longer gets truncated).
- 3–4 lines maximum per comment. No essays. Tight beats verbose.
- NEVER hollow openers: "Great post!", "Love this", "So true!", "Thanks for sharing", "Totalmente de acuerdo", "Muy buen punto"
- NEVER self-promote ("follow me", "check my profile")
- Reference something SPECIFIC from the post — a number, a phrase, a claim — to prove you read it
- Each comment must feel like a DIFFERENT angle. If two comments sound similar, you failed.
- The contrarian types MUST sound noticeably different in tone. "contrarian_data" is numbers-driven, "contrarian_premise" is philosophical, "contrarian_survivorship" is statistical/probabilistic.

★ PUNCTUATION OF A REAL PERSON (brand-voice §3, applies to comments too — this block was MISSING here and only lived in the supportive generator):
- NEVER an em dash or en dash. No "—", no "–". Use a full stop or a comma. It is the single clearest tell of AI writing.
- NEVER a colon. No ":" anywhere in the comment (Iker, 2026-08-12). Nobody typing a quick comment on their phone sets up a clause and then announces it with a colon. Use a comma, or two short sentences.
- NEVER a comma directly before "y" or "e". A comma before "pero" is fine and natural.
- No markdown of any kind.

Return ONLY a JSON object with keys: ${COMMENT_KEYS.map(k => `"${k}"`).join(', ')}. No markdown fences, no explanation.`;

function detectLanguageHint(text: string): string {
  if (!text || text.trim().length < 10) return 'the same language as the post (detect from content)';
  const sample = text.toLowerCase().slice(0, 600);

  const scores: Record<string, number> = { Spanish: 0, English: 0, French: 0, Portuguese: 0, Italian: 0, German: 0 };

  const es = /\b(que|para|pero|con|una|los|las|más|está|esto|cómo|porque|cuando|también|hacer|tiene|muy|año|años|hola|gracias|aquí|así)\b/g;
  const en = /\b(the|and|that|this|with|from|have|your|what|when|which|about|would|there|their|these|through|because|people|still)\b/g;
  const fr = /\b(que|pour|avec|dans|cette|nous|vous|être|sont|mais|leur|tout|plus|comme|parce|sans|aussi|faire)\b/g;
  const pt = /\b(que|para|não|com|uma|dos|mais|está|isso|como|porque|quando|também|fazer|muito|ano|anos|olá|obrigado|aqui)\b/g;
  const it = /\b(che|per|con|una|del|più|però|sono|come|quando|anche|fare|molto|anno|anni|ciao|grazie|così)\b/g;
  const de = /\b(und|der|die|das|ist|nicht|ein|eine|mit|auch|sind|aber|noch|sich|wird|haben|werden)\b/g;

  scores.Spanish = (sample.match(es) || []).length;
  scores.English = (sample.match(en) || []).length;
  scores.French = (sample.match(fr) || []).length;
  scores.Portuguese = (sample.match(pt) || []).length;
  scores.Italian = (sample.match(it) || []).length;
  scores.German = (sample.match(de) || []).length;

  if (/[ñ¿¡]/.test(sample)) scores.Spanish += 3;
  if (/ç/.test(sample) && !/ñ/.test(sample)) scores.French += 2;
  if (/ã|õ/.test(sample)) scores.Portuguese += 3;
  if (/ß|ü|ö|ä/.test(sample)) scores.German += 2;

  let best: string = 'the same language as the post';
  let bestScore = 2;
  for (const [lang, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      best = lang;
    }
  }
  return best;
}

export async function generateComments(input: CommentGenerationInput): Promise<GeneratedComments> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const voiceLines: string[] = [];
  if (input.profile.headline) voiceLines.push(`IDENTITY: ${input.profile.headline}`);
  if (input.profile.voice_style) voiceLines.push(`WRITING STYLE (must match exactly): ${input.profile.voice_style}`);
  else if (input.profile.tone) voiceLines.push(`TONE: ${input.profile.tone}`);
  if (input.profile.worldview) voiceLines.push(`WORLDVIEW / LENS (filter every take through this): ${input.profile.worldview}`);
  else if (input.profile.expertise) voiceLines.push(`EXPERTISE: ${input.profile.expertise}`);
  if (input.profile.signature_moves) voiceLines.push(`SIGNATURE MOVES (use these): ${input.profile.signature_moves}`);
  if (input.profile.avoid) voiceLines.push(`FORBIDDEN — NEVER DO THIS: ${input.profile.avoid}`);

  const profileContext = voiceLines.length > 0
    ? `═══ COMMENTER VOICE PROFILE — THESE ARE HARD CONSTRAINTS ═══\n${voiceLines.join('\n')}\n═══════════════════════════════════════════════════════════`
    : '═══ COMMENTER VOICE PROFILE ═══\nNo profile configured — use a neutral, intellectually bold voice.';

  // Sanitise the post content before forwarding it to Claude. LinkedIn
  // scrapes can contain orphan UTF-16 surrogates which produce invalid JSON
  // bodies and the Anthropic API rejects them with a 400. Real emojis stay
  // intact — only orphan halves are stripped.
  const safePostContent = stripLoneSurrogates(input.postContent || '');
  const detectedLang = detectLanguageHint(safePostContent);

  const userMessage = `${profileContext}

═══ POST TO COMMENT ON ═══
AUTHOR: ${input.creatorName || 'Unknown'}${input.creatorHeadline ? ` — ${input.creatorHeadline}` : ''}
DETECTED POST LANGUAGE: ${detectedLang}

POST CONTENT:
${safePostContent}
═════════════════════════

TASK:
Write 9 comments AS the person described in the voice profile above, reacting to this post.

CRITICAL REMINDERS:
1. Write all 9 comments in ${detectedLang}. Do NOT switch languages mid-comment. Do NOT use English if the post is not in English.
2. Every sentence must sound like it came from the person in the voice profile — not a generic commentator.
3. If you can't tell the voice profile apart from a generic "smart LinkedIn commenter", you're doing it wrong. Re-read the profile and try again.

Return ONLY the JSON object with keys: ${COMMENT_KEYS.map(k => `"${k}"`).join(', ')}. No markdown fences.`;

  const response = await trackedCreate('comment_generator_9angles', {
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');

  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = JSON.parse(cleaned) as GeneratedComments;

  for (const key of COMMENT_KEYS) {
    if (!parsed[key]) throw new Error(`Missing comment type: ${key}`);
    // Maximo UNA palabra alargada tambien aqui (Iker, 2026-09-16): la regla vale
    // en todas las superficies, no solo en respuestas y Google Chat.
    parsed[key] = quitarComaAntesDeY(limitarEstiradas(parsed[key]));
  }

  return parsed;
}

// ⛔⛔ LOS COMENTARIOS DEL GOOGLE CHAT LOS PEGAN COMPAÑEROS, Y SE NOTA (2026-11-12)
//
// Hasta el 12/11 este generador partia de una premisa equivocada: "cada uno es un
// contacto normal que reacciona al post, que no se note que sois de la casa". De
// ahi salia todo lo demas: anclar cada comentario a un detalle del post, resumir
// lo que el post explica, no nombrar a Neety, alargadas y exclamaciones forzadas
// para "sonar humano". El resultado, en la historia/evento del Demo Day:
//
//   "Tal cuaal me quedo con lo de que la herramienta aprende con cada sí y cada no!"
//   "ICEX y Red.es eligiendo proyectos así es justo lo que necesita la industria."
//   "El comercial que va a ciegas pierde tiempo en empresas que nunca iban a comprar 👌"
//
// Suena a alguien de fuera que repite la ficha del producto o suelta una leccion,
// con tics metidos con calzador. Lo que si encaja (los 5 que se escribieron a mano
// ese dia, abajo en ASI_SUENAN): todo el mundo sabe que somos del mismo equipo y no
// se esconde; se dice lo que se SIENTE (orgullo, ilusion, ganas, alegria), no lo que
// cuenta el post; frases simples y enteras; sin alargadas ni muletillas.
//
// Lo que sigue en pie de antes, porque eran errores de verdad: nada de preguntas,
// guiones largos, dos puntos ni coma antes de "y"; nada inventado; nunca dudar del
// post; español de España; nunca registro de informe; y en evento, segun cuando es.

/** Los 5 que se escribieron a mano el 12/11 para el post del Demo Day. Son el tono, no plantillas. */
export const ASI_SUENAN = [
  'Orgulloso de ver todo lo que estamos construyendo juntos 🙌',
  'Muchísima ilusión por esta nueva etapa de Neety.',
  'Da gusto ver cómo tantos meses de trabajo empiezan a salir fuera.',
  'Con muchas ganas de todo lo que viene ahora 🚀',
  'Feliz de ver cómo cada vez Neety se parece más a lo que queríamos construir.',
];

/** Los que salieron el mismo dia y se tumbaron, con el porque. */
const ASI_NO = [
  ['Tal cuaal me quedo con lo de que la herramienta aprende con cada sí y cada no!', 'muletilla con alargada, y resume el producto como quien lee la ficha'],
  ['Nada entra sin que él lo apruebe y eso lo cambia todo.', 'repite una funcion del producto y habla del autor en tercera persona'],
  ['Perfectooo no es la IA que actúa sola sino la que afina con quien decide 🔥', 'parafrasea la tesis del post, con una alargada que no pega'],
  ['ICEX y Red.es eligiendo proyectos así es justo lo que necesita la industria.', 'opina de instituciones como un analista de fuera'],
  ['El comercial que va a ciegas pierde tiempo en empresas que nunca iban a comprar 👌', 'suelta una leccion de ventas, como un anuncio'],
];

// Lo que delata el registro de "los de fuera": resumir el producto, sentar
// catedra o arrancar con una muletilla de quien recoge la frase del post.
const FICHA_O_LECCION = /(la herramienta|la plataforma|el producto|el software|la ia que|aprende con|actua sola|lo apruebe|el comercial que|los comerciales que|las empresas que|empresas que nunca|quien no |el que no |es justo lo que necesita|lo que necesita (la|el) (industria|sector|mercado)|eso lo cambia todo|lo cambia todo)/;
const ARRANQUE_DE_RESUMEN = /^(tal cual|me quedo con|perfecto|justo|exacto|efectivamente|totalmente|claro que si|eso es)\b/;

/** Explica el producto, resume la tesis o suelta una leccion: registro de alguien de fuera (12/11). */
export function fichaOLeccion(c: string): string | null {
  const t = c.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  const a = t.match(ARRANQUE_DE_RESUMEN);
  if (a) return a[0];
  const m = t.match(FICHA_O_LECCION);
  return m ? m[0].trim() : null;
}

// Prueba del 12/11 en los posts que no van de Neety: "No sabía lo de Jordania y
// no me lo puedo quitar de la cabeza", "Me ha cambiado cómo miro el mapa", "Con
// todo el respeto del mundo para quien carga con todo él solo". Exagera o suena
// a frase de efecto, y un compañero no habla asi.
const EXAGERA_CHAT = /(no me (lo|la) puedo quitar|me ha cambiado (como|la forma|mi forma)|me ha dejado (pensando|con ganas de pensar)|todo el respeto del mundo|no sabia lo de|no tenia ni idea|una imagen que se (te|me) queda|se (te|me) queda grabad|es solo el principio|me ha volado la cabeza|piel de gallina|trimestres sin|nunca habia visto|abre los ojos)/;
export function exageraEnChat(c: string): string | null {
  const m = c.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').match(EXAGERA_CHAT);
  return m ? m[0] : null;
}

/** Elogia COMO esta contado el post. Uno por tanda vale; mas, se leen en fila. */
export function elogiaLaForma(c: string): boolean {
  return /(forma de contar|bien contad|como lo cuentas|lo has contado|bien traid|bien escrit|da gusto leer|que bien lo cuentas|bien explicad)/.test(
    c.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  );
}

/** Copia un ejemplo de ASI_SUENAN (mismas cuatro primeras palabras): tienen que ser nuevos cada vez. */
export function copiaElEjemplo(c: string): boolean {
  // Mas de la mitad de sus palabras de contenido salen en un mismo ejemplo
  // ("Orgulloso de lo que estamos construyendo juntos", prueba del 12/11).
  const palabras = (t: string) =>
    new Set(t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z\s]/g, ' ').split(/\s+/).filter((w) => w.length > 3));
  const mias = palabras(c);
  if (mias.size > 0 && ASI_SUENAN.some((e) => {
    const suyas = palabras(e);
    return [...mias].filter((w) => suyas.has(w)).length / mias.size > 0.5;
  })) return true;
  const cuatro = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z\s]/g, ' ').trim().split(/\s+/).slice(0, 4).join(' ');
  const mia = cuatro(c);
  return ASI_SUENAN.some((e) => cuatro(e) === mia);
}

const EMOJIS_CHAT = ['🙌', '🚀', '💪', '👏', '🔥', '✨', '🤝', '🙂'];

/** Dos (a veces uno o tres) con emoji y nunca dos seguidos: como en ASI_SUENAN. */
function conQueEmoji(n: number): Set<number> {
  const r = Math.random();
  if (n >= 5 && r < 0.2) return new Set([0, 2, 4]);
  if (r > 0.85) return new Set([Math.floor(Math.random() * n)]);
  const pares: number[][] = [];
  for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) pares.push([i, j]);
  return new Set(pares[Math.floor(Math.random() * pares.length)] || [0]);
}

/**
 * Los 5 comentarios de apoyo que se mandan al Google Chat del equipo con cada
 * post de los jefes. Los pegan compañeros de Neety con su nombre.
 */
export async function generateSupportiveComments(
  input: CommentGenerationInput,
  count: number
): Promise<string[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');
  const n = Math.max(3, Math.min(5, Math.round(count)));

  const safePostContent = stripLoneSurrogates(input.postContent || '');
  const detectedLang = detectLanguageHint(safePostContent);
  const llanoPost = safePostContent.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  const modoEvento = esPostDeEvento(input.pillar, safePostContent);
  const fase = modoEvento
    ? await analizarEvento({ postId: input.postId, texto: safePostContent, publicadoEl: input.publishedAt })
    : null;
  const equipo = !fase && esHistoriaDeEquipo(input.pillar, safePostContent);
  const hablaDeLaCasa = /\bneety\b/.test(llanoPost);

  const queToca = fase
    ? `ESTE POST ES DE NUESTRO EVENTO. ${textoFase(fase)} Los ${n} van del evento: ${
        fase.momento === 'despues' ? 'orgullo, enhorabuena o lo bien que salio' : 'suerte, ganas, que salga bien'
      }, en primera persona del plural o hablandole a la persona. Nunca "vuestro", "habeis" ni "el equipo", que es hablar desde fuera. No digas que vas a ir ni que estuviste si el post no dice que fuimos todos.`
    : equipo
    ? `ESTA HISTORIA LA VIVIO EL EQUIPO ENTERO y los que comentan estaban. Complicidad de quien estuvo, como por WhatsApp: "Lo de las avispas en el baño fue surrealista", "Aún no me puedo creer que nos pasase eso jajaja", "Qué buen recuerdo aquella noche". Nada de reaccionar como quien se entera ahora, y nada de ventas: se comenta lo que paso.`
    : hablaDeLaCasa
    ? `ESTE POST HABLA DE NEETY, nuestra empresa. Los ${n} son de compañeros que se alegran por lo que ha conseguido la casa: orgullo, ilusion, ganas de lo que viene, el trabajo de todos que empieza a verse. Se puede decir "Neety" y "estamos", "juntos", "lo que queriamos construir". NO se repite lo que el post cuenta ni se explica el producto.`
    : `${
        esPeloteo(input.pillar)
          ? `ESTE POST RECONOCE A UNA REGION Y A SUS EMPRESAS. Los ${n} son de compañeros que se alegran de verla reconocida y lo dicen sencillo: cariño por esa tierra o por lo que se hace alli, ganas de que se conozca mas, o un detalle del post (un producto, una empresa de la lista) dicho en corto. Como mucho DOS nombran un detalle, y nunca el mismo.`
          : `ESTE POST CUENTA UNA HISTORIA O UNA IDEA DE VENTAS. Los ${n} son de compañeros que apoyan al que la ha escrito con lo que les ha tocado: que se ponen en el lugar del comercial o del cliente de la historia (nunca como un problema suyo de hoy), que les recuerda por que trabajan en esto, o gracias por compartirla. Como mucho UNO nombra un detalle del post.`
      } Nunca se repite la tesis del post ni se convierte en una leccion.`;
  const medida = hablaDeLaCasa || fase || equipo
    ? ''
    : `\n★ LA MEDIDA: lo que le dirias en voz alta a un compañero despues de leerlo, sin exagerar. Nada de "no me lo puedo quitar de la cabeza", "me ha cambiado como miro", "me ha dejado pensando", "con todo el respeto del mundo", "no sabia lo de". Sin metaforas ni frases de efecto ("es solo el principio", "una imagen que se te queda"). Elogiar COMO esta contado ("vaya forma de contar", "qué bien contado", "da gusto leer") como mucho UNO de los ${n}.`;

  const system = `Escribes los ${n} comentarios de apoyo que el equipo de Neety pega debajo del post de LinkedIn de uno de sus jefes. Se los mandamos por el Google Chat interno a compañeros de ventas, finanzas, producto, programacion, atencion al cliente y marketing, y cada uno pega uno con su nombre.

★ LA PREMISA: todo el mundo sabe que son del mismo equipo, y no se esconde. Es un compañero que se alegra por el de al lado y lo dice con naturalidad, como lo diria en voz alta en la oficina. No es un analista que comenta el post desde fuera.

ASI SUENAN (escritos a mano por el equipo, para un post sobre Neety; son el TONO, no frases para copiar):
${ASI_SUENAN.map((e) => `· ${e}`).join('\n')}

Que tienen:
- Dicen lo que SIENTEN (orgullo, ilusion, ganas, alegria, gusto), no lo que cuenta el post.
- Hablan desde dentro: "estamos construyendo", "juntos", "lo que queriamos construir", "esta nueva etapa".
- Frases simples, enteras y cortas, de una sola idea. Ninguna muletilla, ninguna palabra estirada, ningun truco.
- Cero datos, cero nombres de terceros, cero explicacion de como funciona nada.
- Acaban en punto o en un emoji calido. Ninguno con exclamacion forzada.

ASI NO (salieron el mismo dia y se tumbaron):
${ASI_NO.map(([c, por]) => `· "${c}" → ${por}`).join('\n')}

Lo que delata a esos: hablan desde lejos, como si quien comenta no supiera de que va su propia empresa; resumen el producto o la tesis del post; sueltan una leccion; meten "Tal cual", "Perfectooo", "me quedo con lo de" para parecer espontaneos. El resultado es un apoyo falso y raro, que hace quedar mal a quien lo pega.

REGLAS FIJAS:
- En ${detectedLang}, español de España. Nada de "ahorita", "platicar", "ustedes", "qué lindo", "olvidaba". Nadie abre con "Vale".
- Entre 35 y 80 caracteres, UNA linea, UNA frase. Varia un poco el largo entre los ${n}.
- Ninguno es una pregunta. Ninguno empieza con comillas.
- Nunca guion largo ni medio, nunca dos puntos, nunca coma justo antes de "y". Sin markdown.
- Ninguna palabra estirada ("clarooo", "perfectooo", "cuaal").
- Nunca se pone en duda lo que cuenta el post.
- No inventes nada: ni cifras, ni nombres, ni vivencias concretas.
- No nombres al autor ni hables de el en tercera persona ("él", "Unai lo ha clavado"). Se habla de lo que ha pasado, o se le habla de tu.
- Nada de registro de informe ("demuestra que", "pone en valor", "ecosistema", "cabe destacar").
- Nada de superlativos de broma ("épico", "leyenda", "me muero") ni sarcasmo.
- Los ${n} empiezan con palabras distintas: los pegan personas distintas en el mismo hilo.

Devuelve SOLO un JSON: { "comments": ["...", ...] } con exactamente ${n}.`;

  let conEmoji = conQueEmoji(n);
  const userMessage = `AUTOR DEL POST: ${input.creatorName || 'uno de los jefes'}
PILAR: ${input.pillar || 'sin etiquetar'}

POST:
${safePostContent}

═══ QUE TOCA ═══
${queToca}${medida}

EMOJI: lo llevan SOLO los comentarios ${[...conEmoji].map((i) => i + 1).join(' y ')}, uno al final y sin punto delante (de estos: ${EMOJIS_CHAT.join(' ')}). Los demas acaban en punto.

Escribe los ${n}. JSON solo.`;

  const fallos = (c: string, i: number): string | null =>
    detectarAperturaGenerica(c) ||
    (criticaNuestroPost(c) ? 'pone en duda nuestro propio post' : null) ||
    (aperturaHueca(c) ? 'abre con peloteo hueco' : null) ||
    (c.replace(/\p{Extended_Pictographic}️?/gu, '').trim().length < 30 ? 'demasiado corto, no dice nada' : null) ||
    (c.length > LARGO_MAX_CHAT ? `mide ${c.length} caracteres y no cabe en una linea (maximo 80)` : null) ||
    (exageraEnChat(c) ? `"${exageraEnChat(c)}" exagera o es una frase de efecto: dilo como se lo dirias a un compañero` : null) ||
    (fichaOLeccion(c) ? `"${fichaOLeccion(c)}" es resumir el post, explicar el producto o soltar una leccion: di lo que sientes como compañero` : null) ||
    (copiaElEjemplo(c) ? 'copia uno de los ejemplos: el tono si, la frase no' : null) ||
    (contarEstiradas(c) > 0 ? 'lleva una palabra estirada, y no pega' : null) ||
    (cifraNueva(c, safePostContent) ? `da una cifra que no esta en el post ("${cifraNueva(c, safePostContent)}")` : null) ||
    (nombreAjeno(c, safePostContent, '', [input.creatorName]) ? `nombra "${nombreAjeno(c, safePostContent, '', [input.creatorName])}", que no sale en el post` : null) ||
    (registroFormal(c) ? `suena a informe ("${registroFormal(c)}")` : null) ||
    (inglesColado(c, safePostContent) ? `se cuela una palabra en ingles ("${inglesColado(c, safePostContent)}")` : null) ||
    (abreConVale(c) ? 'abre con "vale"' : null) ||
    (latinismo(c) ? `suena a español de America ("${latinismo(c)}")` : null) ||
    (eventoRecortado(c) ? 'recorta el nombre del evento: "Neety Forward" entero' : null) ||
    (exageraDeBroma(c) ? `exagera como en una parodia ("${exageraDeBroma(c)}")` : null) ||
    (desvelaLaEstrategia(c) ? `comenta como esta escrito el post ("${desvelaLaEstrategia(c)}")` : null) ||
    (confiesaElDolor(c) ? `confiesa como suyo el problema que vende la casa ("${confiesaElDolor(c)}")` : null) ||
    (concordanciaRota(c) ? `concordancia rota ("${concordanciaRota(c)}")` : null) ||
    (!fase && autorPorSuNombre(c, input.creatorName) ? `nombra al autor ("${autorPorSuNombre(c, input.creatorName)}")` : null) ||
    (equipo && sorpresaDeQuienEstuvo(c) ? `reacciona como si se enterara ahora ("${sorpresaDeQuienEstuvo(c)}")` : null) ||
    (/[¿?]/.test(c) ? 'es una pregunta' : null) ||
    (/[—–:]/.test(c) ? 'lleva guion largo o dos puntos' : null) ||
    (comillasDeArranque(c) !== null ? 'empieza con comillas' : null) ||
    (eventoInventado(c) ? 'se inventa como es el evento' : null) ||
    (fase?.momento === 'despues' && suerteFutura(c) ? `el evento ya paso y habla en futuro ("${suerteFutura(c)}")` : null) ||
    (fase?.momento === 'despues' && !fase.juntos && afirmaQueEstuvo(c) ? `dice que estuvo ("${afirmaQueEstuvo(c)}") y no consta` : null) ||
    (fase && eventoDesdeFuera(c) ? 'habla del evento como alguien de fuera (vuestro, habeis, el equipo)' : null) ||
    (fase && !(fase.momento === 'despues' ? apoyaEventoPasado(c) : apoyaElEvento(c) || apoyaEventoPasado(c))
      ? 'el post es del evento y el comentario no lo apoya'
      : null) ||
    null;

  let out: string[] = [];
  let reproche = '';
  let inventados: { i: number; que: string }[] = [];
  for (let intento = 1; intento <= 3; intento++) {
    const response = await trackedCreate('comment_generator_supportive', {
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      system,
      messages: [{ role: 'user', content: userMessage + reproche }],
    });
    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    let parsed: { comments?: unknown } | null = null;
    try {
      parsed = JSON.parse(cleaned.slice(cleaned.indexOf('{'), cleaned.lastIndexOf('}') + 1));
    } catch {
      parsed = null;
    }
    const leidos = Array.isArray(parsed?.comments)
      ? (parsed!.comments as unknown[]).filter((c): c is string => typeof c === 'string').map((c) => c.trim()).filter(Boolean).slice(0, n)
      : [];
    if (leidos.length === 0) {
      console.warn(`[commentGenerator] intento ${intento}/3 sin JSON legible: ${cleaned.slice(0, 80)}`);
      if (intento === 3 && out.length === 0) throw new Error('Supportive generator returned no readable comments');
      if (intento < 3) {
        reproche = `\n\nDEVUELVE SOLO EL JSON { "comments": [...] }, sin ninguna palabra antes ni despues.`;
        continue;
      }
      break;
    }
    out = leidos;

    const malos = out.map((c, i) => ({ c, que: fallos(c, i) })).filter((x) => x.que) as { c: string; que: string }[];
    const vistas = new Map<string, number>();
    for (const c of out) vistas.set(primerasDos(c), (vistas.get(primerasDos(c)) || 0) + 1);
    const repetidas = [...vistas.entries()].filter(([, v]) => v > 1).map(([k]) => k);
    const sobreLaForma = out.filter((c) => elogiaLaForma(c)).length;
    if (sobreLaForma > 1) malos.push({ c: `${sobreLaForma} de ${n}`, que: 'varios elogian como esta contado el post: como mucho uno, los demas dicen lo que sienten' });
    const familia = familiaEnTanda(out);
    if (familia) malos.push({ c: `${familia.veces} de ${n}`, que: `repiten la misma idea (${familia.nombre})` });

    inventados = [];
    if ((malos.length === 0 && repetidas.length === 0) || intento === 3) {
      inventados = await juezDeTanda(out, safePostContent);
      for (const x of inventados) malos.push({ c: out[x.i] || '', que: `afirma algo que el post no dice (${x.que})` });
    }
    if ((malos.length === 0 && repetidas.length === 0) || intento === 3) {
      if (malos.length || repetidas.length) {
        console.warn(`[commentGenerator] la tanda de apoyo sale con ${malos.length} fallo(s) tras 3 intentos: ${malos.map((x) => x.que).join(' | ')}`);
      }
      break;
    }
    const partes: string[] = [];
    if (malos.length) partes.push(`fallan estos: ${malos.map((x) => `"${x.c.slice(0, 50)}" (${x.que})`).join(', ')}`);
    if (repetidas.length) partes.push(`empiezan igual: ${repetidas.map((r) => `"${r}"`).join(', ')}`);
    reproche = `\n\nEL INTENTO ANTERIOR NO VALE porque ${partes.join(' y ')}. Reescribe los ${n}, con el tono de los ejemplos que si encajan.`;
    console.warn(`[commentGenerator] intento ${intento}/3 descartado: ${partes.join(' y ')}`);
  }

  // Lo que a la tercera sigue inventando no se entrega, si quedan al menos tres:
  // un dato falso firmado por un compañero es peor que una linea menos.
  if (inventados.length && out.length - inventados.length >= 3) {
    const fuera = new Set(inventados.map((x) => x.i));
    out = out.filter((_, i) => !fuera.has(i));
    conEmoji = conQueEmoji(out.length);
  }

  // En codigo, sin otra llamada: sin estiradas, sin coma antes de "y", tildes,
  // y el emoji solo en los que tocan, al final y sin punto delante.
  return out.map((c, i) => {
    let t = pulirComentario(quitarExactamente(ponerTildesSeguras(quitarComaAntesDeY(desestirarTodo(recortarEventoInventado(c))))));
    if (fase?.momento === 'despues') t = quitarFraseFutura(t);
    const suEmoji = (t.match(/\p{Extended_Pictographic}/u) || [])[0];
    t = quitarEmojis(t).replace(/\s+/g, ' ').trim();
    if (conEmoji.has(i)) {
      const e = suEmoji && EMOJIS_CHAT.includes(suEmoji) ? suEmoji : EMOJIS_CHAT[Math.floor(Math.random() * EMOJIS_CHAT.length)];
      return `${t.replace(/[.…]+$/u, '').trimEnd()} ${e}`;
    }
    return /[.!…]$/u.test(t) ? t : `${t}.`;
  });
}

/** El nombre de pila del autor dentro de un comentario de apoyo a su propio post (Mario, 20/10). */
export function autorPorSuNombre(c: string, autor: string | null | undefined): string | null {
  const pila = (autor || '').trim().split(/\s+/)[0];
  if (!pila || pila.length < 3) return null;
  const llanoS = (t: string) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  // "\\b" y no "\b": dentro de una plantilla "\b" es un retroceso y esto no casaba nunca (12/11).
  return new RegExp(`\\b${llanoS(pila)}\\b`).test(llanoS(c)) ? pila : null;
}
