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

/**
 * Generates N short supportive comments (warm or reinforce-style) in the
 * post's language. Used by the Accounts → Google Chat flow, where the
 * goal is to give teammates copy-pasteable cheerleader lines that won't
 * damage their professional image. Short by design: real teammates won't
 * read paragraphs and won't post anything risky.
 *
 * Compared to generateComments (9 angles for the Network feature):
 * - Only "reinforce" + "warm_supportive" registers — never contrarian.
 * - 2 lines max per comment (≤180 chars enforced downstream).
 * - N is FIXED at 5 (Iker, 2026-07-29): the team grew, so there are enough
 *   people to place five, and rotating 3-5 just left teammates without a line.
 *
 * The prompt below carries the rules from docs/skills/brand-voice.md §3 and
 * §7 (the comment/reply voice). The old one produced generic filler AND broke
 * our own punctuation rules — the 2026-07-29 batch shipped an em dash, which
 * §3 forbids outright. The single biggest fix: each of these five is posted by
 * a DIFFERENT human, so they must not read like five outputs of one template.
 */
export async function generateSupportiveComments(
  input: CommentGenerationInput,
  count: number
): Promise<string[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');
  const n = Math.max(3, Math.min(5, Math.round(count)));

  const voiceLines: string[] = [];
  if (input.profile.headline) voiceLines.push(`IDENTITY: ${input.profile.headline}`);
  if (input.profile.voice_style) voiceLines.push(`WRITING STYLE: ${input.profile.voice_style}`);
  if (input.profile.worldview) voiceLines.push(`WORLDVIEW: ${input.profile.worldview}`);
  if (input.profile.signature_moves) voiceLines.push(`SIGNATURE MOVES: ${input.profile.signature_moves}`);
  if (input.profile.avoid) voiceLines.push(`AVOID: ${input.profile.avoid}`);

  const profileContext = voiceLines.length > 0
    ? `COMMENTER VOICE PROFILE:\n${voiceLines.join('\n')}`
    // Decia "neutral, warm, professional" y es justo el registro que Iker no
    // quiere (01/10): "muy formales, que no son naturales".
    : 'COMMENTER VOICE PROFILE: cercano y natural, alguien de 25 a 35 años que comenta desde el movil el post de un conocido. Nada de tono de informe.';

  const safePostContent = stripLoneSurrogates(input.postContent || '');
  const detectedLang = detectLanguageHint(safePostContent);

  const system = `You write short, warm LinkedIn comments AS the person described in the voice profile.

═══ NON-NEGOTIABLE RULES ═══

LANGUAGE: every comment in ${detectedLang}. Never switch languages. Never mix English into a Spanish thread.

★ ⛔ NINGUNO ES UNA PREGUNTA, NI RETORICA (Iker, 2026-09-16). El primero de una tanda abrio con "¿Cuantas ventas se pierden antes de llegar al que decide?" y no se quiere: se afirma, se apoya. Ningun signo de interrogacion.
★ ⛔ NINGUNO EMPIEZA CON COMILLAS (Iker, 2026-09-16): "empezar un comentario con comillas parece escrito por una inteligencia artificial". Si citas una frase del post, va DENTRO de la frase, nunca abriendola.
★ UNA LINEA MEJOR QUE DOS. Preferible UNA frase por comentario; como mucho uno o dos de los ${n} pueden llevar dos frases cortas. Si los ${n} tienen la forma "frase. frase.", se leen como una plantilla.

★ ⛔ NUNCA SE DEJA MAL A LA PUBLICACION NI A SU AUTOR, Y ESTO YA HA PASADO. El 20/08 se publico esto en el hilo de un post nuestro: "El flujo parece demasiado perfecto para produccion... Bonita demo". Lo pego un companero con su nombre y su cara, poniendo en duda nuestro propio contenido delante de todos y dandole municion a cualquiera que viniera a discutir. PROHIBIDO: poner en duda que lo que cuenta el post sea real o realista, decir que "en la vida real no pasa", que "suena a demo", que es "demasiado perfecto", que "es muy optimista" o que "no es tan facil". Sumar un matiz SI ("y encima pasa que..."); dudar del post, NO.

REGISTER: every comment is SUPPORTIVE and hangs on the CONCRETE part of the post its ANGULO assigns (a company, a product, a town, a phrase, a number, the author's work). NEVER contrarian, NEVER skeptical, NEVER provocative. These are colleagues backing each other up — they will not risk their professional image with edgy takes.

★ ⛔⛔ CADA UNO, UNA IDEA DISTINTA, Y NINGUNO REPITE LA TESIS DEL POST (Iker, 2026-10-01): "siempre hablan de lo mismo, necesito conceptos más originales". En "Las 10" de Castilla-La Mancha, 4 de 5 dijeron con otras palabras la idea central del post ("el foco va a las grandes ciudades", "no aparece en ningún titular", "pedidos que nadie contaba", "los números siempre me pillan por sorpresa"). La idea central YA LA DICE EL POST: repetirla cinco veces es lo que hace que los cinco suenen a la misma mano. Cada comentario va de SU angulo asignado y de nada mas. Como mucho UNO de los ${n} puede rozar la idea central, y con un detalle propio.

LENGTH: entre 40 y 80 caracteres (tope duro ${LARGO_MAX_CHAT}), en UNA sola linea y UNA frase (Iker, 2026-10-01: uno de 107 caracteres caia a una segunda linea en el Chat, y "siempre queremos comentarios cortos en una línea, una línea larga, pero una línea"). ⛔ NUNCA por debajo de 8 palabras: "Qué post más necesario." salio en una tanda y Iker lo tumbo, "demasiado corto, no aporta absolutamente nada". Corto vale, vacio no: hasta el mas breve nombra algo concreto del post. And vary the length across the ${n}: if they are all the same size they read as one template.

★ FIVE DIFFERENT PEOPLE WILL POST THESE. This is the rule everything else hangs off. Each comment is pasted by a DIFFERENT human being into the same thread, under their own name and face. If a reader scrolls the comments and feels they were all written by the same hand, the whole thing backfires and looks coordinated. So vary the length, the opening move, the punctuation and the energy between them, ALWAYS inside a casual register: one more excited, one more dry, one with a small personal aside. ⚠️ This used to say "vary the level of formality", and that is how formal ones crept in.

★ PUNCTUATION OF A REAL PERSON (this is non-negotiable, our brand voice forbids it):
- NEVER an em dash or en dash. No "—", no "–". Use a full stop or a comma. This rule has been broken before and it is the single clearest tell of AI writing.
- NEVER a colon. No ":" anywhere in the comment (Iker, 2026-08-12). It reads as AI. Nobody writing a quick comment on their phone sets up a clause and then announces it with a colon. Use a comma, or split it into two short sentences. ⚠️ This line used to say "use a full stop, a comma or a colon" — the prompt itself was teaching the tell.
- NEVER a comma directly before "y" or "e". A comma before "pero" is fine.
- No markdown of any kind. No bold, no bullets, no numbered lists.
- Do not open with an emoji. EMOJIS: los lleva SOLO el comentario al que la ASIGNACION se lo pide, UNO y al final. Los demas, sin ninguno.

★ ⛔ HABLAS, NO REDACTAS (Iker, 2026-10-01): "sigo viendo respuestas muy formales, que no son naturales". Comentarios REALES pegados de aqui: "Crecer en exportaciones a ese ritmo demuestra que el músculo industrial...", "hay ecosistemas muy sólidos fuera del radar", "habla de especialización, continuidad...". Eso es un informe, no alguien comentando desde el movil. PROHIBIDO: "demuestra que", "pone de manifiesto", "cabe destacar", "ecosistema", "tejido industrial/comercial/productivo", "músculo industrial", "motor económico", "fuera del radar", "lejos de los focos", "poner en valor", "capacidad exportadora", "visibilidad", "a nivel de", "en definitiva", "asimismo". Se dice como se habla: "qué pasada", "no tenía ni idea", "me flipa", "menudo dato", "lo de X me ha matado", "jaja" si el angulo es de humor.
★ EL CIERRE DE CADA UNO TE LLEGA ASIGNADO: exclamacion, puntos suspensivos o punto. Iker: "nunca veo respuestas con exclamación al final, estaría guay". Respetalo, y escribe la frase para que ese cierre le pegue.

★ SOUND HUMAN, NOT POLISHED (Iker, 2026-09-16). Los que los pegan son gente joven y cercana. La ASIGNACION te dice que comentarios llevan UNA palabra alargada: esos llevan EXACTAMENTE UNA, y los demas NINGUNA. La palabra alargada es una palabra corta de reaccion con la VOCAL FINAL estirada, y su sitio en la frase lo dice la ASIGNACION y cambia cada vez: "clarooo", "siii", "buenoo", "nooo", "bieeen", "totaaal", "geniaaal". Nunca un sustantivo en mitad de la frase y NUNCA dos palabras alargadas en el mismo comentario.

ACCENTS WHEN STRETCHING A VOWEL: if the word you stretch carries a written accent, DROP the accent and write every repeated vowel plain. Write "buenisiiimo", never "buenííísimo"; "graciaas", never "gráciaas". An accent in the middle of a stretched run looks like a typo, not like someone typing with enthusiasm.

⛔ NO VES LA IMAGEN DEL POST y casi todos llevan una. Solo tienes el texto, asi que NO afirmes nada sobre lo que el post ensena ni sobre lo que NO ensena: nada de "la foto", "la imagen", "el dibujo", "la captura". Comenta solo lo que esta ESCRITO.

NO HOLLOW OPENERS: never "Great post!", "Love this", "Totalmente de acuerdo", "Qué bueno", "Muy buen punto", "Gran post", "Me encanta", "Brutal", "Buena reflexión", "Buen apunte", "Muy cierto", "Qué razón", "Totalmente", "Qué post más necesario".
⛔ Y OJO CON EL ELOGIO DISFRAZADO DE APERTURA: "Buena reflexión." seguido de la frase de verdad es exactamente el mismo peloteo hueco, solo que con punto en medio. Si la primera frase se puede borrar entera sin perder nada, es relleno. Reference something SPECIFIC from the post (a number, a phrase, a claim) so it's clear you actually read it.

★ NEVER OUT YOURSELVES. These people work at the same company as the author. Do not write anything only an insider would know, do not say "el equipo", "en casa", "nosotros" or anything that reveals coordination, and never speak on the company's behalf. Each one is a normal contact reacting to a post.

★ THE EVENT IS OURS, SO NEVER TALK ABOUT IT LIKE AN OUTSIDER (Iker, 2026-08-27). If the post mentions our September event, the people pasting these comments WORK AT THE SAME COMPANY and their profile says so, so wishing the author luck with "vuestro evento" or "suerte con lo que habéis montado" reads as if a colleague did not know their own company was organising it. BEFORE the event, wishing luck to the PERSON or for the DAY is fine and wanted ("Mucha suerte hoy Unai", "que salga redondo"). ⛔ AFTER it, never: the user message tells you WHEN the event is, and a past event gets pride, congratulations or memories, not luck (Iker, 2026-10-01: "Mucha suerte mañana" salio en el video de un evento que ya habia pasado). Iker has had to rewrite these by hand. Use the FIRST PERSON PLURAL for the event and only for the event ("lo que vamos a montar", "ganas de que llegue", "orgullo de estar en esto"). This does NOT override the rule above: still no "el equipo", no speaking on the company's behalf and nothing that reveals coordination on the POST itself. The event is public, the coordination is not.

★ AND NEVER ASSUME THE COMMENTER IS GOING. Not everyone pasting a comment will attend, and a comment that says "nos vemos allí" or "estaré" puts words in the mouth of someone who may not go. Express interest or pride WITHOUT asserting attendance: "ganas de ver cómo sale" works, "allí estaré" does not.

★ NO NUMBERS OR FACTS THAT ARE NOT IN THE POST. Never invent a figure, a client, a company or a personal story with specifics that could be checked. If a comment needs a personal angle, keep it unfalsifiable ("me ha pasado algo parecido") rather than inventing a case.

★ EL ANGULO Y EL ARRANQUE DE CADA COMENTARIO TE LLEGAN ASIGNADOS en el mensaje de usuario, numerados. NO son un menu del que elegir: el 1 es el 1 y el 3 es el 3. Antes esto era una lista de cinco angulos y el modelo los colapsaba en el mismo, porque nadie decia cual iba en cual.
Never repeat the same angle, and do not let two comments latch onto the same word of the post.

★ ⛔ NINGUNO PUEDE ABRIR CON UNA ABSTRACCION. Es la tabla de delatores de IA de la casa (brand-voice §3), la misma que el validador de posts tumba desde hace meses y que aqui no miraba nadie. PROHIBIDO empezar un comentario con: "lo más importante", "lo más curioso", "lo más crucial", "lo más clave", "lo fundamental", "lo esencial", "lo cierto es que", "la clave está en", "la clave es", "el secreto es", "la verdad es que", "la realidad es que", "al final del día", "lo que nadie dice", "lo que nadie sabe", "lo interesante es que", "exactamente", "efectivamente".
Y NO ES SOLO LA LISTA, ES LA FORMA: abrir con un sustantivo abstracto y un verbo copulativo ("La eficiencia comercial no está en...", "El contacto directo es solo un dato", "La diferencia entre X e Y...") se lee igual de robotico aunque la palabra no este en la lista. MEDIDO en los comentarios que de verdad publicamos: 15 de 19 abrian asi. Se abre por lo CONCRETO: un verbo, una persona, un objeto, o una palabra literal del post.
⛔ Y NINGUNO DE LOS ${n} PUEDE EMPEZAR CON LAS MISMAS DOS PALABRAS QUE OTRO. Los publican personas distintas en el mismo hilo: dos aperturas iguales delatan la coordinacion entera.

Return ONLY a JSON object: { "comments": ["...", "...", ...] } with exactly ${n} strings. No markdown fences, no explanation.`;

  // Sorteados SIN REEMPLAZO y asignados uno a uno. Que el banco tenga mas
  // entradas que huecos es lo que hace que roten tambien ENTRE posts: sin eso,
  // dos tandas distintas vuelven a los mismos cinco angulos de siempre.
  const modoEvento = esPostDeEvento(input.pillar, safePostContent);
  const fase = modoEvento
    ? await analizarEvento({ postId: input.postId, texto: safePostContent, publicadoEl: input.publishedAt })
    : null;
  const peloteo = esPeloteo(input.pillar);
  const angulos = reparte(fase ? angulosEvento(fase) : angulosApoyo(input.pillar), n);
  const arranques = reparte(arranquesApoyo(input.pillar), n);
  // EMOJI, VOCALES Y CIERRE, DECIDIDOS EN CODIGO (`planTanda`, Iker 2026-10-01):
  // dos o tres con emoji y nunca dos seguidos, dos o tres con vocales, y
  // siempre alguno acabado en exclamacion. Detalle y por que en el plan.
  // La palabra alargada se ASIGNA, no se deja al modelo: con "lleva una palabra
  // alargada" a secas, el 16/09 salieron 0 de 5.
  const repartir = (k: number) => {
    const plan = planTanda(k);
    const emojiDe = new Map<number, string>();
    for (const i of plan.conEmoji) {
      let e = sorteaEmoji();
      while ([...emojiDe.values()].includes(e)) e = sorteaEmoji();
      emojiDe.set(i, e);
    }
    const palabraDe = new Map<number, string>();
    for (const i of plan.conAlargada) {
      let p = ALARGADAS_SUELTAS[Math.floor(Math.random() * ALARGADAS_SUELTAS.length)];
      while ([...palabraDe.values()].includes(p)) p = ALARGADAS_SUELTAS[Math.floor(Math.random() * ALARGADAS_SUELTAS.length)];
      palabraDe.set(i, p);
    }
    return { plan, conEmoji: plan.conEmoji, conEstirar: plan.conAlargada, emojiDe, palabraDe };
  };
  let { plan, conEmoji, conEstirar, emojiDe, palabraDe } = repartir(n);
  const asignacion = angulos
    .map(
      (a, i) =>
        `${i + 1}. ANGULO: ${a}. ARRANQUE OBLIGATORIO: empieza por ${arranques[i]}. ${
          conEstirar.has(i)
            ? `LLEVA ESTA palabra alargada, tal cual y SOLO esta: "${palabraDe.get(i)!.toLowerCase()}", ${['como PRIMERA palabra del comentario, seguida de coma', 'dentro de la PRIMERA frase, en sus tres primeras palabras y justo antes de una coma'][Math.floor(Math.random() * 2)]} (Iker, 2026-09-18: nunca entre dos comas en mitad del texto ni en la segunda frase). Tiene que sonar a alguien que asiente, no a una palabra metida con calzador.`
            : 'SIN palabras alargadas.'
        } CIERRE: ${textoCierre(plan.cierres[i])}${conEmoji.has(i) ? `, y DESPUES este emoji: ${emojiDe.get(i)}` : ', SIN emoji'}.`
    )
    .join('\n');

  const userMessage = `${profileContext}

POST AUTHOR: ${input.creatorName || 'Unknown'}${input.creatorHeadline ? ` — ${input.creatorHeadline}` : ''}
POST LANGUAGE: ${detectedLang}

POST CONTENT:
${safePostContent}

═══ ASIGNACION DE ESTA TANDA (no es un menu, es el reparto) ═══
${asignacion}
═══════════════════════════════════════════════════════════════
⛔ Si el angulo pide algo que este post no trae, usa OTRO detalle concreto del post, nunca su idea central.
${peloteo ? `
★ ESTE POST ES UN PELOTEO REGIONAL, y su tesis YA LA DICE EL POST: que a esa region no la ve nadie, que trabaja en silencio, que pasa desapercibida, que no sale en titulares ni folletos, que se ve desde la autovia o la ventanilla, que esta fuera del radar o lejos de los focos. COMO MUCHO UNO de los ${n} puede rozar esa idea. Los demas van a lo concreto de su angulo: una empresa de la lista, un producto de casa con su pueblo, una costumbre, la gente, el dato.
` : ''}${fase ? `
★ ESTE POST ES DE NUESTRO EVENTO (Iker, 2026-09-24). Los ${n} comentarios van del evento. ${textoFase(fase)} Un comentario que solo reflexiona sobre la idea del post y no nombra ni el evento, ni el orgullo, ni las ganas NO VALE. Los pegan compañeros de la misma empresa: nunca "vuestro", "habéis", "contáis" ni "el equipo"; el evento en primera persona del plural o hablandole a la persona.
` : ''}
TASK: Write exactly ${n} supportive comments, each between 40 and 80 chars (hard cap ${LARGO_MAX_CHAT}), ONE line and ONE sentence each, all in ${detectedLang}. No risky takes — these go to colleagues who don't want to dent their professional image. Cada comentario respeta EL ANGULO, EL ARRANQUE Y EL CIERRE de su numero.

Return JSON only: { "comments": ["...", "..."] }`;

  // EL GUARDARRAIL, porque un prompt es una peticion y no una garantia. Es la
  // leccion que `replyGenerator` lleva escrita cuatro veces (las anecdotas, los
  // dos puntos, las letras triples, el sorteo de aperturas): lo que no se
  // comprueba, no se cumple.
  //
  // Se miran las APERTURAS (formula de IA, dos que empiezan igual), y desde el
  // 2026-10-01 tambien el CONTENIDO y el REGISTRO: la misma idea en varios
  // (`familiaEnTanda`), el comentario vacio, el tono de informe y, si el
  // evento ya paso, la suerte en futuro.
  //
  // Tres intentos y no dos desde el 01/10: con los chequeos de contenido el
  // segundo se quedaba corto, y esto se genera una o dos veces al dia. Si el
  // tercero sigue flojo se devuelve igual, porque los pega una persona que
  // puede editarlos antes de publicar.
  let out: string[] = [];
  let reproche = '';
  let inventados: { i: number; que: string }[] = [];
  // Lo que medira en el Chat: si le toca alargada y no la trae, el codigo le
  // antepondra una (~9 caracteres), y eso tambien cuenta para la linea.
  const largoChat = (c: string, i: number) => c.length + (conEstirar.has(i) && contarEstiradas(c) === 0 ? 9 : 0);

  for (let intento = 1; intento <= 3; intento++) {
    const response = await trackedCreate('comment_generator_supportive', {
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system,
      messages: [{ role: 'user', content: userMessage + reproche }],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    // ⛔ EL JSON SE BUSCA, NO SE SUPONE (prueba del 01/10): 2 de 6 tandas de
    // "Las 10" salieron VACIAS con "Unexpected token 'I', "I need to"...": en
    // el reintento el modelo explica antes de devolver el JSON, el JSON.parse
    // lanzaba y el aviso de Google Chat salia sin comentarios. Se coge del
    // primer "{" al ultimo "}", y si aun asi no se lee, se gasta otro intento
    // en vez de tirar la tanda.
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
        reproche += `\n\nDEVUELVE SOLO EL JSON { "comments": [...] }, sin ninguna palabra antes ni despues.`;
        continue;
      }
      break;
    }
    out = leidos;

    const apoyaSegunFase = (c: string): boolean =>
      !fase ||
      (fase.momento === 'despues'
        ? apoyaEventoPasado(c)
        : fase.momento === 'desconocido'
        ? apoyaElEvento(c) || apoyaEventoPasado(c)
        : apoyaElEvento(c));
    const genericas = out
      .map((c, i) => ({
        c,
        que:
          detectarAperturaGenerica(c) ||
          (criticaNuestroPost(c) ? 'deja mal a nuestra propia publicacion' : null) ||
          (aperturaHueca(c) ? 'peloteo hueco de apertura' : null) ||
          comentarioVacio(c) ||
          (largoChat(c, i) > LARGO_MAX_CHAT ? `mide ${c.length} caracteres y el tope es ${LARGO_MAX_CHAT}: tiene que caber en UNA linea del Chat, quita una idea` : null) ||
          (cifraNueva(c, safePostContent) ? `da una cifra que no esta en el post ("${cifraNueva(c, safePostContent)}")` : null) ||
          (nombreAjeno(c, safePostContent, '', [input.creatorName])
            ? `nombra "${nombreAjeno(c, safePostContent, '', [input.creatorName])}", que no sale en el post: del post, solo lo que pone`
            : null) ||
          (registroFormal(c) ? `suena a informe ("${registroFormal(c)}"): dilo como se habla` : null) ||
          (inglesColado(c, safePostContent) ? `se cuela una palabra en ingles ("${inglesColado(c, safePostContent)}")` : null) ||
          (nombraLaCasa(c) ? 'nombra a Neety, y quien lo pega trabaja alli: nunca se nombra la casa' : null) ||
          (/[¿?]/.test(c) ? 'es una pregunta, y ninguno puede serlo' : null) ||
          (comillasDeArranque(c) !== null ? 'empieza con comillas, que parece escrito por una IA' : null) ||
          (eventoInventado(c) ? 'se inventa lo que se hace en el evento o sus condiciones: del evento solo se dice lo que pone el post' : null) ||
          (fase?.momento === 'despues' && suerteFutura(c) ? `el evento YA HA PASADO y habla en futuro ("${suerteFutura(c)}")` : null) ||
          (fase?.momento === 'despues' && !fase.juntos && afirmaQueEstuvo(c) ? `dice que estuvo ("${afirmaQueEstuvo(c)}") y no consta que fueran todos` : null) ||
          (!apoyaSegunFase(c)
            ? fase?.momento === 'despues'
              ? 'el post es del evento, que ya paso, y no dice el orgullo, la enhorabuena ni lo recuerda'
              : 'el post es del evento y no le desea suerte ni dice las ganas que tiene'
            : null) ||
          (fase && eventoDesdeFuera(c) ? 'habla del evento como alguien de fuera (vuestro, habeis, el equipo)' : null) ||
          (asentimientosAlPrincipio(c) >= 2 ? 'abre con varias palabras de asentir seguidas: deja una' : null) ||
          (incisoDeAsentir(c) ? `mete "${incisoDeAsentir(c)}" como inciso suelto en mitad` : null) ||
          (alargadaFueraDeSitio(c) ? `la palabra alargada "${alargadaFueraDeSitio(c)}" va en un sitio que no vale: primera palabra o antes de la primera coma tras "pues"` : null) ||
          (conEstirar.has(i) && contarEstiradas(c) === 0 && !tieneReaccion(c)
            ? `le tocaba la palabra alargada "${palabraDe.get(i)}" y no la lleva`
            : null),
      }))
      .filter((x) => x.que);
    // UNA LINEA MEJOR QUE DOS (Iker, 2026-09-16): en la prueba, 3 de 5 salieron
    // con la forma "frase. frase.", que leida en fila es una plantilla.
    const conDosFrases = out.filter((c) => (c.match(/[.!?…](\s|$)/g) || []).length >= 2).length;
    const vistas = new Map<string, number>();
    for (const c of out) {
      const dos = primerasDos(c);
      vistas.set(dos, (vistas.get(dos) || 0) + 1);
    }
    const repetidas = [...vistas.entries()].filter(([, veces]) => veces > 1).map(([k]) => k);

    if (conDosFrases > 2) {
      genericas.push({ c: `${conDosFrases} de ${n}`, que: 'demasiados con dos frases: como mucho dos, los demas en UNA linea' } as any);
    }
    // LA MISMA IDEA EN VARIOS (Iker, 2026-10-01): uno puede rozar la tesis, dos no.
    const familia = familiaEnTanda(out);
    if (familia) {
      genericas.push({ c: `${familia.veces} de ${n}`, que: `repiten la misma idea (${familia.nombre}): como mucho UNO, los demas van a lo concreto de su angulo` } as any);
    }
    // EL MISMO DETALLE EN DOS (prueba del 01/10: "Kenia, 26 veces" en dos de cinco).
    const detalle = detalleRepetidoEnTanda(out, [input.creatorName]);
    if (detalle) {
      genericas.push({ c: detalle, que: `dos comentarios se agarran al mismo detalle ("${detalle}"): cada uno a una parte DISTINTA del post` } as any);
    }
    // EL JUEZ DE INVENTOS, solo cuando lo demas ya pasa (o en el ultimo
    // intento): es una llamada mas y no se gasta en una tanda que se va a
    // rehacer igualmente.
    inventados = [];
    if ((genericas.length === 0 && repetidas.length === 0) || intento === 3) {
      inventados = await juezDeTanda(out, safePostContent);
      for (const x of inventados) {
        genericas.push({ c: out[x.i] || '', que: `afirma algo que el post no dice (${x.que}): del post, solo lo que pone; de quien comenta, nada que no se pueda decir de cualquiera` } as any);
      }
    }
    if ((genericas.length === 0 && repetidas.length === 0) || intento === 3) {
      if (genericas.length || repetidas.length) {
        console.warn(
          `[commentGenerator] la tanda de apoyo sale con ${genericas.length} fallo(s) y ${repetidas.length} apertura(s) repetida(s) tras 3 intentos, se devuelve igual: ${genericas.map((x) => x.que).join(' | ')}`
        );
      }
      break;
    }

    const partes: string[] = [];
    if (genericas.length) {
      partes.push(
        `fallan estos: ${genericas
          .map((x) => `"${x.c.slice(0, 40)}" (${x.que})`)
          .join(', ')}`
      );
    }
    if (repetidas.length) {
      partes.push(`empiezan con las mismas dos palabras: ${repetidas.map((r) => `"${r}"`).join(', ')}`);
    }
    reproche = `\n\nEL INTENTO ANTERIOR NO VALE porque ${partes.join(' y ')}. Reescribe LOS ${n} arreglando los que fallan y respetando el angulo, el arranque y el cierre asignados a cada numero. Los publican personas distintas en el mismo hilo, asi que dos parecidos los delatan a todos.`;
    console.warn(`[commentGenerator] intento ${intento}/3 descartado: ${partes.join(' y ')}`);
  }

  // Lo que se garantiza en codigo, sin gastar otra llamada: una sola palabra
  // alargada por comentario, el emoji y el cierre que le tocaron.
  // Antes de limitar: si no, la alargada mal puesta se queda huerfana (18/09).
  // ⛔ LO QUE A LA TERCERA SIGUE INVENTANDO, PRIMERO SE REPARA (ronda 3 del
  // 01/10: 3 de 9 tandas salian con 4 al quitar el inventado, y el equipo
  // necesita 5 lineas). UNA llamada que reescribe solo esos, viendo los que
  // valen para no repetirlos, y vuelve a pasar por el juez.
  // Y LO QUE A LA TERCERA SIGUE SIN CABER EN UNA LINEA, IGUAL (ronda 5 del
  // 01/10: 6 de 60 pasaban de la linea). Misma llamada, motivo distinto.
  const largos = out.map((c, i) => ({ i, que: `mide ${largoChat(c, i)} caracteres y no cabe en una linea: maximo 80` })).filter((x) => largoChat(out[x.i], x.i) > LARGO_MAX_CHAT);
  const aReparar = [...inventados, ...largos.filter((l) => !inventados.some((x) => x.i === l.i))];
  if (aReparar.length) {
    const malos = [...new Set(aReparar.map((x) => x.i))].sort((a, b) => a - b);
    const buenos = out.filter((_, i) => !malos.includes(i));
    try {
      const r = await trackedCreate('comment_generator_supportive_fix', {
        model: 'claude-sonnet-4-6',
        max_tokens: 600,
        system,
        messages: [{
          role: 'user',
          content: `${userMessage}\n\nYA TIENES ESTOS, QUE VALEN (no repitas su idea ni su detalle):\n${buenos.map((b) => `· ${b}`).join('\n')}\n\nREESCRIBE SOLO ESTOS, cada uno por lo que FALLABA. Del post, solo lo que pone; de quien comenta, nada que no se pueda decir de cualquiera; y entre 40 y 80 caracteres:\n${malos
            .map((i) => `${i + 1}. ANGULO: ${angulos[i]}. CIERRE: ${textoCierre(plan.cierres[i])}. FALLABA: ${aReparar.find((x) => x.i === i)!.que}`)
            .join('\n')}\n\nDevuelve SOLO el JSON { "comments": [...] } con ${malos.length}, en ese orden.`,
        }],
      });
      const t = r.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map((b) => b.text).join('');
      const nuevos = ((JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1)) as { comments?: unknown }).comments as unknown[] || [])
        .filter((c): c is string => typeof c === 'string')
        .map((c) => c.trim());
      const otraVez = new Set((await juezDeTanda(nuevos, safePostContent)).map((x) => x.i));
      malos.forEach((i, k) => {
        const c = nuevos[k];
        if (c && !otraVez.has(k) && !comentarioVacio(c) && largoChat(c, i) <= LARGO_MAX_CHAT && !cifraNueva(c, safePostContent) && !nombreAjeno(c, safePostContent, '', [input.creatorName])) {
          out[i] = c;
          inventados = inventados.filter((x) => x.i !== i);
        }
      });
    } catch (err: any) {
      console.warn('[commentGenerator] la reparacion de la tanda ha fallado:', err?.message);
    }
  }
  // ⛔ Y lo que ni reparado deja de inventar NO se entrega: mejor cuatro
  // comentarios que uno con un dato falso sobre una empresa real que un
  // compañero firma con su nombre (innegociable de la casa).
  if (inventados.length && out.length - inventados.length >= 3) {
    const fuera = new Set(inventados.map((x) => x.i));
    console.warn(`[commentGenerator] se quitan ${fuera.size} comentario(s) que inventan: ${inventados.map((x) => x.que).join(' | ')}`);
    out = out.filter((_, i) => !fuera.has(i));
    // Las posiciones se mueven al quitar uno: plan nuevo para que dos emojis
    // no queden seguidos.
    ({ plan, conEmoji, conEstirar, emojiDe, palabraDe } = repartir(out.length));
  }
  const limpios = out.map((c) => {
    const base = pulirComentario(quitarExactamente(ponerTildesSeguras(quitarComaAntesDeY(limitarEstiradas(quitarIncisosSueltos(recortarEventoInventado(c)))))));
    // Si a la tercera sigue deseando suerte a un evento que ya paso, se quita
    // esa frase: es un error de hecho, no de estilo.
    return fase?.momento === 'despues' ? quitarFraseFutura(base) : base;
  });
  // La alargada: primero donde el modelo dejo una palabra de reaccion en su
  // sitio; solo si no, se antepone. Y nunca delante de una primera persona
  // (Google Chat 18/09: "Pues exactooo, yo, sin ese contexto…").
  const anteponible = (t: string) => !/^\s*(yo|me|mi|lo veo|nosotros|a mi)\b/i.test(t);
  // Y nunca dos que abran con la misma alargada (prueba del 01/10: dos
  // "Perfectooo," en la misma tanda tras quitar un comentario inventado).
  const baseAlargada = (t: string) => {
    const w = (t.match(/\p{L}+/gu) || []).find(esEstirada);
    return w ? desestirarTodo(w).toLowerCase() : null;
  };
  const usadas = new Set(limpios.map(baseAlargada).filter(Boolean) as string[]);
  const palabraLibre = (i: number) => {
    const p = palabraDe.get(i);
    if (p && !usadas.has(desestirarTodo(p).toLowerCase())) return p;
    return ALARGADAS_SUELTAS.find((w) => !usadas.has(desestirarTodo(w).toLowerCase())) || p;
  };
  const conAlargada = limpios.map((r, i) => {
    // Las vocales solo donde tocan: si el modelo alarga una que no, se quita,
    // para que nunca queden dos seguidas (Iker, 01/10).
    if (!conEstirar.has(i)) return desestirarTodo(r);
    const suave = estirarUna(r, 2);
    if (contarEstiradas(suave) > 0) return suave;
    if (!anteponible(r)) return r;
    const forzada = conservarMayuscula(forzarEstirada(r, 2, palabraLibre(i)), r, safePostContent);
    const b = baseAlargada(forzada);
    if (b) usadas.add(b);
    return forzada;
  });
  // Al menos DOS en la tanda (Iker, 2026-10-01: "que alguna más tenga más
  // vocales"): si las asignadas no pudieron, se busca otra que la admita.
  // Y la que se añade va en un hueco que no toque a otra: nunca dos seguidas.
  for (let falta = 2 - conAlargada.filter((r) => contarEstiradas(r) > 0).length; falta > 0; falta--) {
    const ocupadas = conAlargada.map((r, k) => (contarEstiradas(r) > 0 ? k : -9)).filter((k) => k >= 0);
    const huecos = huecosAlargada(ocupadas, conAlargada.length);
    const j = huecos.find((k) => contarEstiradas(estirarUna(conAlargada[k], 2)) > 0) ?? -1;
    const k = j >= 0 ? j : huecos.find((k2) => anteponible(conAlargada[k2])) ?? -1;
    if (k < 0) break;
    conAlargada[k] = j >= 0 ? estirarUna(conAlargada[k], 2) : forzarEstirada(conAlargada[k], 2, [...palabraDe.values()][0]);
  }
  return conAlargada.map((r, i) => {
    // Al final, ni coma ni mayuscula detras de la alargada (Iker, 01/10).
    const cerrado = caberEnLinea(pulirTrasAlargada(pulirComentario(aplicarCierre(quitarEmojis(r), plan.cierres[i])), safePostContent, [input.creatorName]));
    return conEmoji.has(i) ? ponerEmojiAlFinal(cerrado, emojiDe.get(i)) : cerrado;
  });
}
