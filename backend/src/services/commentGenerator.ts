import Anthropic from '@anthropic-ai/sdk';
import { trackedCreate } from './claudeClient';
import { stripLoneSurrogates } from '../utils/sanitizeText';
import {
  detectarAperturaGenerica,
  limitarEstiradas,
  ponerEmojiAlFinal,
  quitarEmojis,
  comillasDeArranque,
  sorteaEmoji,
  estirarUna,
} from './replyGenerator';

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

const ANGULOS_APOYO = [
  'refuerza la idea principal con un angulo personal concreto',
  'recoge una frase o una cifra LITERAL del post DENTRO de tu frase, nunca abriendo con ella entre comillas',
  'calido y humano, sin peloteo hueco',
  'anade UNA capa que el post no cubre, sin contradecirlo',
  'una sola linea, corta y seca, de reaccion',
  'nombra la consecuencia de NO hacer lo que dice el post',
  'lleva su idea un paso mas alla, en general',
];

const ARRANQUES_APOYO = [
  'un verbo en primera persona (Me ha pasado, Lo veo, Llevo tiempo viendo)',
  'una palabra literal del post',
  'una negacion (No, Nadie, Ninguno, Ni)',
  'un adverbio de frecuencia (Casi siempre, Rara vez, Normalmente, Al final)',
  'una reaccion de dos o tres palabras',
  'el sujeto concreto de la escena del post (el comercial, el cliente, la lista)',
  'el pronombre de la experiencia propia (Yo, A mi, En mi caso)',
];

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
    : 'COMMENTER VOICE PROFILE: neutral, warm, professional.';

  const safePostContent = stripLoneSurrogates(input.postContent || '');
  const detectedLang = detectLanguageHint(safePostContent);

  const system = `You write short, warm LinkedIn comments AS the person described in the voice profile.

═══ NON-NEGOTIABLE RULES ═══

LANGUAGE: every comment in ${detectedLang}. Never switch languages. Never mix English into a Spanish thread.

★ ⛔ NINGUNO ES UNA PREGUNTA, NI RETORICA (Iker, 2026-09-16). El primero de una tanda abrio con "¿Cuantas ventas se pierden antes de llegar al que decide?" y no se quiere: se afirma, se apoya. Ningun signo de interrogacion.
★ ⛔ NINGUNO EMPIEZA CON COMILLAS (Iker, 2026-09-16): "empezar un comentario con comillas parece escrito por una inteligencia artificial". Si citas una frase del post, va DENTRO de la frase, nunca abriendola.
★ UNA LINEA MEJOR QUE DOS. Preferible UNA frase por comentario; como mucho uno o dos de los ${n} pueden llevar dos frases cortas. Si los ${n} tienen la forma "frase. frase.", se leen como una plantilla.

★ ⛔ NUNCA SE DEJA MAL A LA PUBLICACION NI A SU AUTOR, Y ESTO YA HA PASADO. El 20/08 se publico esto en el hilo de un post nuestro: "El flujo parece demasiado perfecto para produccion... Bonita demo". Lo pego un companero con su nombre y su cara, poniendo en duda nuestro propio contenido delante de todos y dandole municion a cualquiera que viniera a discutir. PROHIBIDO: poner en duda que lo que cuenta el post sea real o realista, decir que "en la vida real no pasa", que "suena a demo", que es "demasiado perfecto", que "es muy optimista" o que "no es tan facil". Sumar un matiz SI ("y encima pasa que..."); dudar del post, NO.

REGISTER: every comment is SUPPORTIVE — either "reinforce" (extend the post's idea with one extra layer) or "warm_supportive" (genuinely happy for the author). NEVER contrarian, NEVER skeptical, NEVER provocative. These are colleagues backing each other up — they will not risk their professional image with edgy takes.

LENGTH: MAX 2 lines, ≤ 180 characters each. Tight beats verbose. One sharp sentence is better than three filler ones. And vary the length across the ${n}: if they are all the same size they read as one template.

★ FIVE DIFFERENT PEOPLE WILL POST THESE. This is the rule everything else hangs off. Each comment is pasted by a DIFFERENT human being into the same thread, under their own name and face. If a reader scrolls the comments and feels they were all written by the same hand, the whole thing backfires and looks coordinated. So vary the register, the length, the opening move and the level of formality between them. One can be almost telegraphic. Another can be a small personal aside.

★ PUNCTUATION OF A REAL PERSON (this is non-negotiable, our brand voice forbids it):
- NEVER an em dash or en dash. No "—", no "–". Use a full stop or a comma. This rule has been broken before and it is the single clearest tell of AI writing.
- NEVER a colon. No ":" anywhere in the comment (Iker, 2026-08-12). It reads as AI. Nobody writing a quick comment on their phone sets up a clause and then announces it with a colon. Use a comma, or split it into two short sentences. ⚠️ This line used to say "use a full stop, a comma or a colon" — the prompt itself was teaching the tell.
- NEVER a comma directly before "y" or "e". A comma before "pero" is fine.
- No markdown of any kind. No bold, no bullets, no numbered lists.
- Do not open with an emoji. EMOJIS: los lleva SOLO el comentario al que la ASIGNACION se lo pide, UNO y al final. Los demas, sin ninguno.

★ SOUND HUMAN, NOT POLISHED (Iker, 2026-09-16). Los que los pegan son gente joven y cercana. La ASIGNACION te dice que comentarios llevan UNA palabra alargada: esos llevan EXACTAMENTE UNA, y los demas NINGUNA. La palabra alargada es una palabra corta de reaccion con la VOCAL FINAL estirada, y su sitio en la frase lo dice la ASIGNACION y cambia cada vez: "clarooo", "siii", "buenoo", "nooo", "bieeen", "totaaal", "geniaaal". Nunca un sustantivo en mitad de la frase y NUNCA dos palabras alargadas en el mismo comentario.

ACCENTS WHEN STRETCHING A VOWEL: if the word you stretch carries a written accent, DROP the accent and write every repeated vowel plain. Write "buenisiiimo", never "buenííísimo"; "graciaas", never "gráciaas". An accent in the middle of a stretched run looks like a typo, not like someone typing with enthusiasm.

⛔ NO VES LA IMAGEN DEL POST y casi todos llevan una. Solo tienes el texto, asi que NO afirmes nada sobre lo que el post ensena ni sobre lo que NO ensena: nada de "la foto", "la imagen", "el dibujo", "la captura". Comenta solo lo que esta ESCRITO.

NO HOLLOW OPENERS: never "Great post!", "Love this", "Totalmente de acuerdo", "Qué bueno", "Muy buen punto", "Gran post", "Me encanta", "Brutal", "Buena reflexión", "Buen apunte", "Muy cierto", "Qué razón", "Totalmente".
⛔ Y OJO CON EL ELOGIO DISFRAZADO DE APERTURA: "Buena reflexión." seguido de la frase de verdad es exactamente el mismo peloteo hueco, solo que con punto en medio. Si la primera frase se puede borrar entera sin perder nada, es relleno. Reference something SPECIFIC from the post (a number, a phrase, a claim) so it's clear you actually read it.

★ NEVER OUT YOURSELVES. These people work at the same company as the author. Do not write anything only an insider would know, do not say "el equipo", "en casa", "nosotros" or anything that reveals coordination, and never speak on the company's behalf. Each one is a normal contact reacting to a post.

★ THE EVENT IS OURS, SO NEVER TALK ABOUT IT LIKE AN OUTSIDER (Iker, 2026-08-27). If the post mentions our September event, the people pasting these comments WORK AT THE SAME COMPANY and their profile says so, so wishing the author luck with "vuestro evento" or "mucha suerte con el evento" reads as if a colleague did not know their own company was organising it. Iker has had to rewrite these by hand. Use the FIRST PERSON PLURAL for the event and only for the event ("lo que vamos a montar", "ganas de que llegue", "orgullo de estar en esto"). This does NOT override the rule above: still no "el equipo", no speaking on the company's behalf and nothing that reveals coordination on the POST itself. The event is public, the coordination is not.

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
  const angulos = reparte(ANGULOS_APOYO, n);
  const arranques = reparte(ARRANQUES_APOYO, n);
  // EMOJI Y ALARGAMIENTO, SORTEADOS Y EN SITIOS DISTINTOS CADA VEZ (Iker,
  // 2026-09-16): "por lo menos siempre un comentario con emoji y otro con
  // vocales, pero que nunca salga el de vocales en la misma posicion de los 5".
  // Uno o dos de cada, en posiciones barajadas, y nunca todos.
  const posiciones = reparte(Array.from({ length: n }, (_, i) => String(i)), n).map(Number);
  const nEmoji = 1 + (Math.random() < 0.4 ? 1 : 0);
  const nEstirar = 1 + (Math.random() < 0.4 ? 1 : 0);
  const conEmoji = new Set(posiciones.slice(0, nEmoji));
  const emojiDe = new Map<number, string>();
  for (const i of conEmoji) {
    let e = sorteaEmoji();
    while ([...emojiDe.values()].includes(e)) e = sorteaEmoji();
    emojiDe.set(i, e);
  }
  const conEstirar = new Set(reparte(Array.from({ length: n }, (_, i) => String(i)), n).map(Number).slice(0, nEstirar));
  const asignacion = angulos
    .map(
      (a, i) =>
        `${i + 1}. ANGULO: ${a}. ARRANQUE OBLIGATORIO: empieza por ${arranques[i]}. ${
          conEstirar.has(i)
            ? `LLEVA UNA palabra alargada (solo una), ${['al principio', 'en medio', 'al final'][Math.floor(Math.random() * 3)]} de la frase.`
            : 'SIN palabras alargadas.'
        } ${conEmoji.has(i) ? `TERMINA con este emoji: ${emojiDe.get(i)}` : 'SIN emoji.'}`
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

TASK: Write exactly ${n} supportive comments (mix of reinforce + warm), each ≤ 180 chars, each ≤ 2 lines, all in ${detectedLang}. No risky takes — these go to colleagues who don't want to dent their professional image. Cada comentario respeta EL ANGULO Y EL ARRANQUE de su numero.

Return JSON only: { "comments": ["...", "..."] }`;

  // EL GUARDARRAIL, porque un prompt es una peticion y no una garantia. Es la
  // leccion que `replyGenerator` lleva escrita cuatro veces (las anecdotas, los
  // dos puntos, las letras triples, el sorteo de aperturas): lo que no se
  // comprueba, no se cumple.
  //
  // Se miran DOS cosas, las dos de APERTURA, que es donde se ve la monotonia:
  //   (a) que ninguno abra con una formula de IA — reutilizando el MISMO
  //       detector que el generador de respuestas, para que no acaben siendo
  //       dos listas que se desincronizan;
  //   (b) que no haya DOS que empiecen con las mismas dos palabras, que es lo
  //       que delata que los cinco salieron de una sola mano. Esta es la que
  //       de verdad importa aqui: los pegan cinco personas distintas en el
  //       mismo hilo (brand-voice §7.2b).
  //
  // Dos intentos y no tres: esto genera cinco de golpe y cuesta cinco veces mas
  // que una respuesta. Si el segundo sigue flojo se devuelve igual, porque los
  // pega una persona que puede editarlos antes de publicar.
  let out: string[] = [];
  let reproche = '';

  for (let intento = 1; intento <= 2; intento++) {
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

    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned) as { comments: unknown };
    if (!Array.isArray(parsed.comments)) throw new Error('Supportive generator returned no comments array');

    out = parsed.comments
      .filter((c): c is string => typeof c === 'string')
      .map((c) => c.trim())
      .filter(Boolean)
      .slice(0, n);
    if (out.length === 0) throw new Error('Supportive generator returned an empty list');

    const genericas = out
      .map((c) => ({
        c,
        que:
          detectarAperturaGenerica(c) ||
          (criticaNuestroPost(c) ? 'deja mal a nuestra propia publicacion' : null) ||
          (aperturaHueca(c) ? 'peloteo hueco de apertura' : null) ||
          (/[¿?]/.test(c) ? 'es una pregunta, y ninguno puede serlo' : null) ||
          (comillasDeArranque(c) !== null ? 'empieza con comillas, que parece escrito por una IA' : null),
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
    if ((genericas.length === 0 && repetidas.length === 0) || intento === 2) {
      if (genericas.length || repetidas.length) {
        console.warn(
          `[commentGenerator] la tanda de apoyo sale con ${genericas.length} apertura(s) de IA y ${repetidas.length} repetida(s) tras 2 intentos, se devuelve igual`
        );
      }
      break;
    }

    const partes: string[] = [];
    if (genericas.length) {
      partes.push(
        `abren con una formula de IA prohibida: ${genericas
          .map((x) => `"${x.c.slice(0, 40)}" (${x.que})`)
          .join(', ')}`
      );
    }
    if (repetidas.length) {
      partes.push(`empiezan con las mismas dos palabras: ${repetidas.map((r) => `"${r}"`).join(', ')}`);
    }
    reproche = `\n\nEL INTENTO ANTERIOR NO VALE porque ${partes.join(' y ')}. Reescribe LOS ${n} cambiando LAS PRIMERAS PALABRAS de los que fallan, respetando el arranque asignado a cada numero. Los publican personas distintas en el mismo hilo, asi que dos aperturas parecidas los delatan a todos.`;
    console.warn(`[commentGenerator] intento ${intento}/2 descartado: ${partes.join(' y ')}`);
  }

  // Lo que se garantiza en codigo, sin gastar otra llamada: una sola palabra
  // alargada por comentario, y el emoji en el que le toco si el modelo no lo
  // puso.
  return out.map((c, i) => {
    let r = limitarEstiradas(c);
    if (conEstirar.has(i)) r = estirarUna(r, 2);
    r = conEmoji.has(i) ? ponerEmojiAlFinal(r, emojiDe.get(i)) : quitarEmojis(r);
    return r;
  });
}
