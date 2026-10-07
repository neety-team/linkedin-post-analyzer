import { Router, Request, Response } from 'express';
import { trackedCreate } from '../services/claudeClient';
import { unipileService } from '../services/unipile';
import { PostIdeaModel } from '../models/postIdea';
import pool from '../db';
import { ensureSingleLineHook } from '../utils/sanitizeText';
import {
  BRAND_RULES,
  CREATOR_LEARNINGS,
  POSITIONING_PRINCIPLES,
  NEETY_MECHANICS,
  HOOK_LAW,
  HOOK_QUALITY,
  IMAGE_PRINCIPLES,
  MEME_VISUAL_SYSTEM,
  VIDEO_SCRIPT,
  SHORT_FORM_VIDEO_PLAYBOOK,
  REMIX_PRINCIPLES,
  RECENT_DIAGNOSIS,
  isVideoRequest,
} from '../services/postPrompt';

const router = Router();

function paramId(req: Request): string {
  return req.params.id as string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Human-readable labels for hook/structure archetypes
const HOOK_LABELS: Record<string, string> = {
  // Mismas etiquetas que el frontend (pages/Inspiration.tsx HOOK_LABELS; las
  // claves que alli faltan, de components/HookTypeChart.tsx).
  pattern_interrupt: 'Ruptura de patrón', belief_breaker: 'Rompe creencias',
  curiosity_gap: 'Hueco de curiosidad', data_shock: 'Dato impactante', hot_take: 'Opinión polémica',
  personal_confession: 'Confesión personal', story_opener: 'Arranque de historia',
  hypothetical_question: 'Pregunta hipotética', why_question: 'Pregunta «por qué»',
  how_question: 'Pregunta «cómo»', direct_question: 'Pregunta directa',
  open_question: 'Pregunta abierta', rhetorical_question: 'Pregunta retórica',
  bold_claim: 'Afirmación rotunda', common_mistake: 'Error común',
  direct_callout: 'Interpelación directa', list_promise: 'Promesa de lista',
  prediction: 'Predicción', how_to_framework: 'Cómo hacerlo', announcement: 'Anuncio',
  social_proof_opener: 'Prueba social', analogy: 'Analogía', challenge: 'Reto',
  contrarian_take: 'A contracorriente', relatable_moment: 'Momento reconocible',
  motivational: 'Motivacional', observation: 'Observación', other: 'Otro',
};
// Prompt building blocks (BRAND_RULES, HOOK_LAW, NEETY_MECHANICS, etc.)
// now live in services/postPrompt.ts so the Post Creator chat shares the
// same source of truth. See the imports at the top of this file.
//
// Local code below this point: only logic specific to the Inspiration →
// Generate flow (archetype selection, DB queries, response shaping).


const STRUCT_LABELS: Record<string, string> = {
  // Mismas etiquetas que el frontend (pages/Inspiration.tsx STRUCT_LABELS; las
  // claves que alli faltan, de components/StructureChart.tsx).
  hook_list_cta: 'Gancho → Lista → CTA', hook_story_lesson_cta: 'Historia → Lección → CTA',
  problem_agitate_solve: 'Problema → Agitación → Solución',
  contrarian_proof_reframe: 'A contracorriente → Prueba → Reencuadre',
  confession_insight_takeaway: 'Confesión → Revelación → Conclusión',
  list_framework: 'Lista / método', problem_solution: 'Problema → Solución',
  story_lesson: 'Historia → Lección', before_after: 'Antes / Después',
  step_by_step: 'Paso a paso', myth_busting: 'Desmontar mitos',
  question_answer: 'Pregunta → Respuesta', observation_insight: 'Observación → Aprendizaje',
  prediction_vision: 'Predicción / Visión', motivational_manifesto: 'Motivacional',
  authority_framework: 'Autoridad → Marco', comparison: 'Comparativa',
  narrative_arc: 'Arco narrativo', content_with_cta: 'Contenido + CTA',
  short_punchy: 'Corto y directo', long_form_essay: 'Ensayo largo',
  data_driven: 'Basado en datos', other: 'Otra',
};

interface ArchetypeRaw {
  hook_type: string;
  post_structure: string;
  avg_ratio: number;
  example_hook: string | null;
  example_text: string | null;
}

async function getArchetypePool(): Promise<ArchetypeRaw[]> {
  const { rows } = await pool.query(`
    SELECT
      p.hook_type,
      p.post_structure,
      AVG(p.outlier_ratio)::float AS avg_ratio,
      (ARRAY_AGG(p.hook_text ORDER BY p.outlier_ratio DESC))[1] AS example_hook,
      (ARRAY_AGG(p.content_text ORDER BY p.outlier_ratio DESC))[1] AS example_text
    FROM posts p
    WHERE p.is_outlier = TRUE
      AND p.linkedin_post_id <> 'DEMO_LIVE_POST'
      AND p.hook_type IS NOT NULL AND p.hook_type != 'other'
      AND p.post_structure IS NOT NULL AND p.post_structure != 'other'
    GROUP BY p.hook_type, p.post_structure
    HAVING COUNT(*) >= 2
    ORDER BY avg_ratio DESC
    LIMIT 18
  `);
  return rows;
}

// Ask Claude to pick 3 archetypes from the pool that best fit THIS raw idea.
// Accepts a list of archetype_keys already tried so reloads return different picks.
async function selectArchetypesForIdea(
  rawIdea: string,
  archetypePool: ArchetypeRaw[],
  exclude: string[]
): Promise<ArchetypeRaw[]> {
  const excludeSet = new Set(exclude);
  const candidates = archetypePool.filter(
    (a) => !excludeSet.has(`${a.hook_type}__${a.post_structure}`)
  );
  if (candidates.length === 0) return archetypePool.slice(0, 3); // pool exhausted → reset

  const list = candidates
    .map((a, i) => {
      const hook = HOOK_LABELS[a.hook_type] || a.hook_type;
      const struct = STRUCT_LABELS[a.post_structure] || a.post_structure;
      return `${i + 1}. ${hook} + ${struct} (${a.avg_ratio.toFixed(1)}x avg ratio)`;
    })
    .join('\n');

  const response = await trackedCreate('ideas_archetype_selector', {
    model: 'claude-sonnet-4-6',
    max_tokens: 400,
    messages: [{
      role: 'user',
      content: `You're picking viral LinkedIn archetypes for a specific raw idea.

RAW IDEA:
"""
${rawIdea}
"""

AVAILABLE ARCHETYPES (hook + structure pairings, sorted by past virality):
${list}

Pick exactly 3 archetypes from the list that fit THIS specific idea best — based on the topic, tone, and what would naturally surface its punchline.

CRITICAL:
- The 3 must be MEANINGFULLY DIFFERENT from each other (different angles, not three flavors of the same shape).
- Favor archetypes that match the *content* of the idea, not just the highest ratio. A data-shock idea wants a data-shock hook; a personal anecdote wants a confession or story opener.
- Return ONLY a JSON array of 3 numbers (1-indexed positions from the list). Example: [3, 7, 12]
- No markdown, no explanation, just the JSON array.`,
    }],
  });

  const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : '';
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const startIdx = cleaned.indexOf('[');
  const endIdx = cleaned.lastIndexOf(']');
  if (startIdx === -1 || endIdx === -1) return candidates.slice(0, 3);

  let picks: number[];
  try {
    picks = JSON.parse(cleaned.slice(startIdx, endIdx + 1));
    if (!Array.isArray(picks)) throw new Error('not array');
  } catch {
    return candidates.slice(0, 3);
  }

  const selected: ArchetypeRaw[] = [];
  const seen = new Set<number>();
  for (const p of picks) {
    const idx = Number(p) - 1;
    if (Number.isInteger(idx) && idx >= 0 && idx < candidates.length && !seen.has(idx)) {
      selected.push(candidates[idx]);
      seen.add(idx);
    }
    if (selected.length >= 3) break;
  }
  // Pad with remaining candidates if Claude returned fewer than 3
  for (const c of candidates) {
    if (selected.length >= 3) break;
    const key = `${c.hook_type}__${c.post_structure}`;
    if (!selected.some((s) => `${s.hook_type}__${s.post_structure}` === key)) selected.push(c);
  }
  return selected.slice(0, 3);
}

async function getOutlierContext(): Promise<string> {
  const { rows: outliers } = await pool.query(`
    SELECT p.content_text, p.hook_text, p.hook_type, p.post_structure, p.text_tone,
           p.outlier_ratio, p.likes_count, p.comments_count, p.reposts_count
    FROM posts p
    WHERE p.is_outlier = TRUE AND p.linkedin_post_id <> 'DEMO_LIVE_POST'
      AND p.content_text IS NOT NULL AND LENGTH(p.content_text) > 50
    ORDER BY p.outlier_ratio DESC
    LIMIT 8
  `);

  if (outliers.length === 0) return '';

  const lines: string[] = ['=== TOP OUTLIER POSTS (real viral examples for style reference) ==='];
  for (const p of outliers) {
    lines.push(`\n[${p.outlier_ratio}x ratio | Hook: ${p.hook_type} | Structure: ${p.post_structure} | Tone: ${p.text_tone}]`);
    lines.push(`"${(p.content_text || '').substring(0, 500)}${(p.content_text || '').length > 500 ? '…' : ''}"`);
  }
  return lines.join('\n');
}

async function generateVariant(
  rawContent: string,
  sourceType: string,
  archetype: ArchetypeRaw,
  outlierContext: string
): Promise<{ text: string; image_suggestion: string | null }> {
  const hookLabel = HOOK_LABELS[archetype.hook_type] || archetype.hook_type;
  const structLabel = STRUCT_LABELS[archetype.post_structure] || archetype.post_structure;

  const exampleSection = archetype.example_text
    ? `\nEXAMPLE of this archetype performing well (${archetype.avg_ratio.toFixed(1)}x avg ratio):\nHook: "${archetype.example_hook || ''}"\n---\n${archetype.example_text.substring(0, 500)}\n---`
    : '';

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const currentYear = today.getUTCFullYear();
  const videoMode = isVideoRequest(rawContent);

  // Split system into a cached static block + a non-cached dynamic tail.
  // generateVariant gets called 3× per idea (once per archetype) — so the
  // static block (~20-25K tokens of rules + principles + RECENT_DIAGNOSIS)
  // pays full price ONCE and the 2nd and 3rd calls read it from cache at
  // 10× cheaper. Across an active idea-generation session, the same static
  // block also stays cached for back-to-back ideas. The dynamic tail
  // (today's date, archetype labels, outlier reference posts, output
  // format) varies per call and stays uncached — small enough that
  // re-processing is cheap. videoMode flips the static stack between two
  // variants (text vs video block), each cached independently.
  const staticStack = `You are a LinkedIn post writer. Write a complete LinkedIn post based on a raw idea, using a SPECIFIC viral archetype that will be specified at the END of this system prompt.

${HOOK_LAW}

${HOOK_QUALITY}
${videoMode ? `\n${VIDEO_SCRIPT}\n\n${SHORT_FORM_VIDEO_PLAYBOOK}\n` : ''}
${BRAND_RULES}

${POSITIONING_PRINCIPLES}

${REMIX_PRINCIPLES}

${NEETY_MECHANICS}

${CREATOR_LEARNINGS}

${RECENT_DIAGNOSIS}

GENERAL RULES (apply on every post — the chosen archetype + the archetype-specific rules are appended at the END of this prompt):
- Write in the same language as the raw idea
- Keep the EXACT core idea, examples, numbers, and quotes — do NOT change the substance
- HOOK MUST ANCHOR TO OUR SECTOR IN THE FIRST LINE — and our sector is B2B SALES (with AI as a tool we happen to use, NOT our category). The audience is salespeople, SDRs, AEs, sales leaders and B2B founders — not AI engineers or generic productivity readers. Any ONE of these anchors in the first line is enough: ventas / sales / B2B / SDR / AE / outbound / outreach / cold email / prospecting / pipeline / SaaS / CRM / GTM / lead gen / closing / discovery / demo / cuota / cliente — OR a specific tool we live in (Claude, GPT, Clay, Apollo, HubSpot, Salesforce, n8n, Make, Zapier, etc.). AI / IA / agente / LLM is welcome but NOT required: a hook that only says "ventas" or "B2B" is already on-brand. The failure mode goes the other way — a generic personal-development hook ("Hace 5 años pensaba que…", "El otro día me di cuenta…") that anyone in any industry could publish, dissolving our positioning. Sector anchor lives in the FIRST line, not buried in paragraph 3. ANCHOR WITH THE WHOLE FAMILY OF SELLING SIGNALS — VARY, don't reflex-type "ventas". The literal word "ventas" hits the sweet spot (narrow enough to be on-brand, universal enough for the whole commercial-B2B audience) but it's ONE option, not the reflex — over-using it verbatim in every hook is the failure mode. Anchor instead with any signal that unmistakably places the hook in the world of selling, rotating across this family: (a) the VERB in any conjugation — vender / vendes / vendiendo / "cuando vendes…" (often more natural+human than the noun "ventas"); (b) the OUTCOME/money side — cerrar clientes, cerrar un deal, facturar, ingresos, cuota, comisión; (c) the CLIENT side, which implies selling without saying it — cliente / clientes / "tu mejor cliente" / "el cliente que no te compra"; (d) the BUYER perspective — comprar / compras / "por qué te compran (o no)" / la decisión de compra (talking about why people buy IS talking about selling); (e) the role/world — comercial, equipo comercial, prospectar, captar clientes, reuniones, propuestas, B2B. Pick whichever the idea naturally suggests and that you haven't used in the last few hooks — maximum reach WITHOUT leaving the sector. "ventas" is fine when it's the cleanest fit; just don't autopilot to it. DOWNGRADE niche-tactical anchors to the body — "pipeline", "outbound", "cadencia", "reply rate", "touchpoints", "SDR / AE" as a term, "cold email", "discovery", "GTM", "ICP" anchor but NARROW the audience; send them to the BODY, anchor the HOOK with a broad family member. ONE-LINE RULE OF THUMB: the hook must read as unmistakably about SELLING, reached via a VARIED anchor (a conjugation of vender, "clientes", "comprar", "cerrar"…), not the word "ventas" pasted in by reflex.
- HOOK MUST BE A SINGLE LINE (no \\n inside). Whatever counts as the hook must fit on the first physical line of the post — between 20 and 140 characters total, single line, no soft or hard line breaks before the open loop punctuation (":" "..." "👇"). LinkedIn cuts at ~210 chars before "see more"; a hook split across 2-3 lines with line breaks gets visually truncated mid-thought and the open loop never lands. The first paragraph break ONLY appears AFTER the hook is complete.
- HOOK MUST USE PUNCHY / EXTREME LANGUAGE. Whenever the meaning isn't lost, replace neutral words with vivid, physical, or hyperbolic alternatives. Stronger verbs over neutral ones (tiré > di, destrocé > superé, reventé > vendí mucho, quemé > gasté). Hyperbolic concrete adjectives over flat ones ("rampa de la muerte" > "rampa gigante", "el error más caro de mi carrera" > "un error grande", "el 80% se está extinguiendo" > "muchos fallan"). The hook should feel cinematic, not corporate. NEVER use hedge words in the hook: "quizás", "tal vez", "creo que", "puede que", "un poco", "algo", "bastante", "casi", "más o menos", "I think", "maybe", "kind of", "sort of" — they all soften the punch and signal weak conviction. VERB INTENSITY CEILING (counterweight — don't overshoot): climb the verb ladder for punch but STOP at the verb that fits the promise without tipping into gory / over-the-top territory. Sweet spot: desmontar, reventar, enterrar, quemar, tirar. Likely over the line (too extreme / visceral): destripar, descuartizar, anything that needs bandages. Proven case: same lead magnet, Iker "desmonto perfiles" 9.13x vs Unai "destripo perfiles" 0.2x — "destripo" probably overshot (see RECENT_DIAGNOSIS § 3.6). Punchy ≠ gory; prefer the notch below maximum shock when the most extreme one tips over-the-top.
- HOOK NUMBER DENSITY — at most ONE numerical metric in the hook. Zero or one is the sweet spot; TWO OR MORE figures in the first line is a hard NO. Verified on this account's top 8 viral hooks (ratios 3.6x–15.6x): 50% have zero numbers, 50% have exactly one, 0% have two or more. Multiple stats stacked at the open glaze the eye and kill the open loop — numbers belong in the BODY, where they accumulate and prove the claim. Working shapes: (a) ONE METRIC + COUNTERINTUITIVE CLAIM + 👇 ("Cataluña exporta más que Portugal entera. Y casi nadie lo cuenta porque se trabaja en silencio desde hace 80 años 👇"); (b) NO METRICS, BOLD CLAIM + REFRAME ("El cold calling no ha muerto. Lo hemos enterrado en vida 👇"); (c) NO METRICS, PERSONAL FRAME + OPEN LOOP ("Le tiré las llaves de mi LinkedIn a Claude y nunca había generado tantos leads B2B 👇"). Recurring structure: [single claim OR single metric] + [tension or reframe] + [👇], with a punchy/physical verb in at least one part. If the draft hook has 2+ figures, move all but the single most impactful one to the body — or drop them all and lead with the claim.
- HOOK CLAIM MUST BE UNIVERSAL WITHIN THE SECTOR. The sector anchor (rule above) places the hook inside B2B sales; this rule decides who inside that world stops scrolling. The CLAIM itself — the shock, tension or reframe — must land for ANYONE near commercial B2B: SDRs and AEs, sales managers / heads of sales, RevOps, B2B founders, marketing-sales hybrids, even curious onlookers considering moving into B2B sales. The failure mode is a hook only a technical SDR specialist would parse on first read ("cadence step 3 reply rate dropped after the LinkedIn cooldown") — that's a 1% audience hook. Aim for ICP truths that resonate across roles: "replacement by an agent", "the CRM you don't trust", "the deal you knew was dead from the discovery call", "cuota imposible", "el cliente que se fue a la competencia por 200€". Test before committing: would a sales manager scroll-stop? Would a B2B founder? If only the deep-tactical-SDR persona would catch it, broaden the wording while keeping the sector anchor. AXIS WITH THE SECTOR-ANCHOR RULE — the anchor in the hook is the FIRST lever of universality. Anchor with a BROAD selling signal from the family in the sector-anchor rule (a conjugation of vender, "clientes", "comprar/compras", "cerrar", "comercial"), varying it across hooks, over niche-tactical terms ("pipeline", "outbound", "SDR", "cold email", "GTM", "ICP", "discovery"). A broad family member is both most universally-understood AND the broadest claim; both rules pull together once the anchor is broad. Don't reflex-type "ventas" every time — vary within the family.
- HOOK → BODY TRANSITION. Line 2 of the post is make-or-break. NEVER open the body with credential / authority preambles ("Llevamos meses…", "Después de X años/semanas/conversaciones…", "Tras analizar…", "He hablado con N equipos…", "En los últimos X meses he visto que…") or explainer-announcers ("La realidad es que…", "Lo cierto es que…", "Déjame explicarte…", "Te cuento…"). They announce authority instead of demonstrating it AND ask the reader for patience when their patience is at zero. The body must FIRE on line 2: a 5–12-word partial discharge of the open loop, a hard data point, a scene/dialogue, or a list — never a windup. Validated 5.2x pattern from this account: hook "El cold calling no ha muerto. Lo hemos enterrado en vida 👇" → body opens straight with "Manager: '¿Le has llamado?' / SDR: le mandé un email." Zero credentials, straight to the scene. Authority is proved by the content of the post, never asserted in line 2. If a draft body opens with any banned preamble, delete it and start with the line right after.
- HOOK LANGUAGE — REAL AUDIENCE, NOT LINKEDIN-TECH-TWITTER. Our audience is senior reps, heads of sales, sales directors and mid/large-company founders, many 45-60 years old, NOT AI early adopters. By default the hook NEVER contains technical anglicisms or LLM jargon (tool, agent, agentic, context window, prompt, RAG, framework, stack, workflow, "tool-call adherence", "long-horizon", "adaptive thinking", invented paper-speak like "execution gap"). The only English allowed: proper nouns (Claude, GPT, Salesforce, HubSpot, Apollo) and naturalised sales terms a senior rep knows (SDR, AE, CRM, B2B, SaaS, GTM, ICP, outbound, lead, follow-up). Write the hook the way a founder-operator would say it to a 55-year-old sales director over dinner — plain Spanish, concrete day-to-day sales nouns (la llamada, el email, el cliente, la reunión, la cuota, el deal, la propuesta, el seguimiento, la cartera, prospectar a mano, descolgar el teléfono). Translate any technical term into the rep's language before delivering: "tool calling" → "ejecutar acciones por sí solo / hacer en vez de sugerir"; "agentic execution" → "que el sistema haga, no solo recomiende"; "agent" → in a hook prefer "sistema" / "el de IA" unless the body explains "agente" clearly; any word needing a glossary → out of the hook, into the body (translated on first use). FINAL TEST: would a 55-year-old sales director who sells industrial machinery in Gipuzkoa get it on a 2-second read without googling? No → rewrite. SINGLE EXCEPTION: if the post's target is explicitly technical (SaaS founders, advanced RevOps, AI builders) and the user asked for it, denser vocabulary is allowed. Default = plain language.
- ENUMERATION & PARALLEL-PHRASE FORMAT. Each item on its own line, NEVER stacked into one paragraph with periods. On LinkedIn the visual rhythm matters as much as the content: long paragraphs send the reader scrolling past; short lines with single line breaks create the sense of forward motion punchlines need to land. When 2+ phrases meet ANY of these: (a) repeated parallel structure ("No es X. No es Y. No es Z." / "Cada uno X. Cada uno Y." / "Antes hacía X. Ahora hago Y."), (b) enumeration of items (negations, affirmations, traits, steps), (c) data + shock-consequence where the consequence IS the punchline ("9 de cada 10 startups mueren antes del año 5. Y casi ninguna por el producto."), (d) setup + dart where the second sentence is the kill-line ("No la tiene imposible. Solo se juega más años de los necesarios.") → each goes on its OWN LINE separated by a single \\n, NOT pasted in a paragraph with period-space. WRONG: "No es la inversión. No es el espacio. No son los mentores." (single paragraph, punchlines dilute). RIGHT: "No es la inversión.\\nNo es el espacio.\\nNo son los mentores." (each line breathes). SINGLE EXCEPTION — INTENTIONAL STACCATO BLOCK: when you have 3-5 SHORT items (1-3 words each) acting as a visual flag-block / rhythmic section close, they DO go pasted: "Industrial. SaaS B2B. Servicios profesionales. Logística." / "Curiosidad. Deseo. Miedo." / "Rápido. Barato. Bueno." The test: each item is a SENTENCE (subject + verb) → own line; each item is a bare NOUN/ADJ → staccato pasted. PRE-DELIVERY CHECK MANDATORY ON EVERY ITERATION (not only the first): before returning the post, re-read each block of 2+ consecutive sentences and ask "are these parallel or enumerative?". If yes → line breaks. If in doubt → line breaks (bias is always toward MORE breathing). When the user asks for changes, do NOT assume the previous turn's formatting was right — re-audit the whole post for this rule again.
- RHYTHMIC VARIETY IN THE BODY (applies on top of the enumeration rule, doesn't replace it). A body that performs alternates between 4 formal units: (a) COMPACT 2-LINE BLOCK — 2 consecutive sentences that are the SAME idea (setup+reveal, before+after, cause+consequence), glued with a single line break; (b) ISOLATED SINGLE LINE — darts, punchlines, reveals, transitions, with a blank line before AND after (the isolation IS the effect); (c) VERTICAL PARALLEL ENUMERATION — 2+ sentences with repeated syntax, separate lines, no blank between; (d) HORIZONTAL STACCATO — 3-5 short 1-3-word items pasted on one line with periods ("Saber. No hacer." / "Curiosidad. Deseo. Miedo."). Test for (c) vs (d): full sentence → vertical; bare noun/adjective → horizontal staccato. GOLDEN RULE: a 300-500 word post uses AT LEAST 3 of the 4 units, ideally all 4 — only (a) suffocates, only (b) reads like bad poetry, only (c) reads like an invoice. SHORT-LINE DEFAULT + LENGTH CEILING (the SPINE — apply BEFORE picking block types): the base unit is the SHORT one-idea line, 8-14 words MAX; if a sentence runs past ~15 words OR packs two ideas joined by commas/"y"/"que", SPLIT it into two short lines (❌ "aparece la persona que se pasó semanas colgada al teléfono para que ese pedido llegara a existir" → ✅ "Aparece la persona de detrás.\\nSemanas colgada al teléfono para que ese pedido existiera."; ❌ "un taller que arrancó un abuelo y hoy llena contenedores para medio mundo" → ✅ "Un taller que arrancó un abuelo.\\nHoy llena contenedores para medio mundo."). NO TWO CONSECUTIVE BLOCKS OF THE SAME TYPE (never two 2-blocks, two 3-blocks or two darts back to back — alternate). 3-BLOCK CAP: at most ONE or TWO vertical 3-blocks in the WHOLE post. THE ENDING MUST BREATHE: the close is NEVER a wall of long sentences stacked — the last stretch goes to short isolated lines, one remate per line, so each hit lands alone. When the user asks to "compactar / juntar líneas / bloques de 2", that means MORE (a) where it fits, NOT converting the whole post to 2-line blocks and flattening the darts/punchlines/enumerations. "Más respirado" → more (b). "Más punchy" → more (d). Never apply a format request as a blanket rule; re-read the whole post and apply only where it fits. LINE-BY-LINE DECISION RULE (catches "ideas glued horizontally"): for EVERY group of sentences-with-their-own-verb separated by period-space inside ONE horizontal line, ask "are these distinct ideas/moments?" If YES → NEVER horizontal; go vertical, then choose: GLUED 2-LINE BLOCK (single break, no blank line) when it's the SAME idea in two moments (setup→punch, before→after, cause→consequence, statement→twist with "y aun así/pero/hasta que") — STAIRCASE cadence: line 1 shorter, line 2 a bit longer; VERTICAL BLOCK OF 3+ (3+ sentences on their own lines, single breaks, no blank between) for a 3-beat build or parallel enumeration ("El SDR que… / El AE que… / El comercial que…", "No es X. / No es Y. / No es Z.") — STAIRCASE cadence: ascending length, line 1 shortest → last line longest (exception: a strict parallel enumeration keeps its symmetric lengths); never paste a 3-sentence group horizontally either; TWO SEPARATED LINES (break + blank line) when they're two distinct ideas or a hard antithesis that deserves a pause ("El problema nunca fue X.\\n\\nFue Y."). HORIZONTAL (one line, periods) ONLY for a single flowing sentence or verbless staccato ("a ojo. Empresa por empresa. Abriendo webs."). FORBIDDEN: two OR MORE full subject+verb sentences pasted on one horizontal line (2, 3 or 4 of them — all wrong). HARDCODED ERROR: by default do NOT make the whole post 2-line blocks — if 70%+ of groups are 2-blocks you've fallen into the pattern, redistribute. MANDATORY before delivering: count the group types (isolated dart / 2-block / 3-block / separated antithesis / horizontal staccato / isolated quote). Two hard gates: (1) fewer than 3 distinct types → variety failure, rewrite; (2) more than 60% of the lines are LONG sentences (15+ words / two ideas) → rewrite, splitting them into short lines. Also confirm no two consecutive blocks share a type, no more than two 3-blocks total, and the ending is short isolated lines. Then read it in your head — if it sounds monotone (same block rhythm repeated), redo it.
- NATURAL, NON-ROBOTIC BODY LANGUAGE. The body must read like a sharp person talking, never like AI. The hook already uses punchy/extreme language; the BODY is where AI-tells creep in. KILL these the moment they appear and swap them: "Lo más importante / Lo fundamental / Lo esencial" → "lo más tocho", "lo que de verdad mueve la aguja", "donde está el truco"; "Es fundamental / crucial / clave que…" → "sin esto no hay nada que hacer", "aquí te la juegas"; "Hoy en día / En la actualidad" → "ahora mismo" or cut it; "Sin embargo / No obstante" → "pero", "y aun así"; "Además / Asimismo" stacked → "y", "encima", "y ojo que"; "Por lo tanto / En consecuencia / De esta manera" → "así que", "total, que", "así"; "Permite / posibilita" → "te deja", "hace que puedas"; "Optimizar / maximizar / potenciar / implementar / ejecutar / llevar a cabo" → "mejorar", "sacarle jugo", "montar", "hacer"; "Numerosos / diversos / múltiples" → "un montón de", "mogollón de"; "En definitiva / En resumen / En conclusión" → "al final", "total"; "La clave está en / El secreto es" → just say the thing; the AI antithesis "No se trata de X, sino de Y" → fine once, a tell when stacked; robotic tricolons in every paragraph → break the symmetry. NATURAL REGISTER WORDS that sound human without sounding like a teen (they read natural to a 45-60 yo Spanish sales director AND a young founder): tocho, movida, marrón, currar/curro, a saco, pillar, chungo, petarlo, ir de cabeza, al lío, un montón/mogollón/la tira. GUARDRAIL: one or two colloquial touches per post is human; ten is try-hard and worse than robotic — most sentences stay plain clean Spanish. NO teen/TikTok slang ("random", "cringe", "POV") — it alienates the senior reader (see the HOOK LANGUAGE rule). This does NOT override the anti-jargon stance — natural colloquial Spanish is not jargon; both want HUMAN. READ-ALOUD TEST: any sentence a real founder would never say out loud to a colleague (too balanced, too abstract, too LinkedIn-corporate) gets rewritten the way they'd actually say it.
- POST DRAFTS GO INSIDE A FENCED CODE BLOCK. Every time the deliverable is the actual body of a LinkedIn post the user could paste into LinkedIn (full post body, standalone hook, or each piece of a video script), wrap it in a triple-backtick fence with NO language tag. The chat UI strips and collapses whitespace inside regular paragraphs, so line breaks and spacing (rule #14 + HOOK_LAW) get mangled when you write the post as plain markdown. Inside a fence the UI preserves whitespace exactly and shows a one-click Copy button — what the user sees is what they paste. When delivering 2-3 archetype variations, ONE fence per variation; the OPCIÓN N + virality tag + commentary stays OUTSIDE the fence as regular text. For video scripts, one fence per piece (CAPTION / TEXT ON SCREEN / SPOKEN HOOK) so each can be copied independently. Do NOT wrap reasoning, image concept descriptions, or commentary inside a fence — only the pasteable post text. Rule about no markdown INSIDE the post still stands (no **bold**, no *italic* inside the body) — the fence is around the post, not part of it.
- MANDATORY SELF-VALIDATION PASS — run BEFORE returning any post draft. The data and rules in this prompt are not decorative; use them PROACTIVELY, not only when explicitly told to critique. Silently audit your draft against: every rule above, HOOK_LAW, HOOK_QUALITY, NEETY_MECHANICS (3 mechanics + WHAT BREAKS POSTS + BURNED OPENERS + CHOOSING MATRIX), CREATOR_LEARNINGS, RECENT_DIAGNOSIS (regional-map underdog criteria + Madrid 0.55x precedent, meme 4-point filter with progressive bodily change, vibe-prospecting fatigue 7–10 days, lead-magnet pause window, retired patterns), IMAGE_PRINCIPLES + MEME_VISUAL_SYSTEM if visuals are involved, and the VIRAL REFERENCE POSTS block. Two outcomes: (A) SILENT FIX — clear violation that's trivial to correct (markdown inside the post, banned preamble on line 2, 2+ figures in the hook, parallel phrases pasted, generic personal-development opener, etc.) → fix it before delivering, no need to mention. (B) SIGNIFICANT RISK — the draft will probably underperform even after fixes (meme passes only 2/4 of the filter, regional map on a banned region, lead-magnet inside fatigue window, archetype matched a recent flop, hook claim only readable by deep-tactical-SDR persona) → CALL IT OUT explicitly alongside the draft with the concrete data reason ("Madrid ya falló a 0.55x", "es el 4º lead-magnet en 10 días → fatiga", "el meme solo pasa 2/4 del filtro: le falta cambio corporal en la imagen") and offer to retouch or redirect. Do NOT wait for the user to ask "is this going to work?" — answering that is your job on every iteration. PARTIAL-EDIT TRAP — when the user scopes the request to a section ("no toques el hook, mejora el cuerpo" / "solo cambia el cierre" / "edición conservadora") DO NOT skip validation on the untouched parts. The previous turn's draft is NEVER pre-approved just because it survived an iteration. Audit the WHOLE post on every iteration: silent-fix violations in the untouched part get fixed anyway; significant-risk issues in the untouched part get flagged the same way ("Toqué solo lo que pediste, pero auditando el resto: [bloque] sigue infringiendo [regla concreta con datos]. ¿Te lo arreglo de paso?"). Every iteration starts from zero on validation, no matter how small the requested change.
- Short paragraphs (max 2-3 lines), blank line between them
- LIST FORMATTING: when you write a sequence of numbered items (1. 2. 3.), bullets (- • ✅ ❌) or arrows (→ ↳ ▶ 👉 👇), put each item on its own line and KEEP THEM AS A SINGLE TIGHT BLOCK — no blank line between items. The blank line goes BEFORE and AFTER the whole list, never inside it. Outliers consistently use this dense list format; spacing every list item like a paragraph reads as low-effort and breaks the rhythm.
- Personal, concrete, conversational — not corporate
- 150-400 words
- End with EXACTLY ONE CTA — pick a single closer: an opinion-forcing question, OR a lead-magnet ask using the EXPLICIT "Comenta X + Y" formula (only if there's a real deliverable; X = a word tied to the resource, Y = a low-effort detail like the reader's sector/department or an obvious life detail — see NEETY_MECHANICS mechanic #1; the old implicit phrasings tanked comment volume and are deprecated), OR a direct body link to the resource (rule below), OR no CTA at all (a strong claim can close). NEVER stack two CTAs at the end (no question + lead-magnet together, no two questions). One closer, sharp.
- LINKS INSIDE THE BODY OF THE POST ARE FINE — verified on our own account with posts crossing 100K impressions that carry a body link. The old LinkedIn rule "never put the link in the post, drop it in the first comment" no longer applies in 2026: a body link does NOT suppress reach. This opens an alternative to the comment-gated lead magnet (NEETY_MECHANICS #1): instead of forcing implicit comment-bait, you can place a direct link to the resource / article / landing page / product in the body. Both routes are valid — comment-gating accrues comments which the algo rewards (best when you need the comment-spike for amplification); a direct body link is friction-free and gets clicks immediately but loses that comment signal. Pick deliberately based on goal; never recommend "ponlo en el primer comentario" as a constraint.
- ONE PILLAR ONLY: every post must commit to a single dominant psychological pillar (curiosity / fear / desire) and push it to the maximum. Trace amounts of the others are fine — actively triggering all three dilutes the message. Pick the one that fits the raw idea best and lean hard.
- NEVER use: "I'm excited to share", "In today's world", "Game changer", "Leverage", "Synergy"
- NEVER use markdown formatting inside the post: no **bold**, no *italic*, no \`code\`, no # headers. LinkedIn renders none of this — **word** shows up literally in the feed. Express emphasis with line breaks, caps on 1–2 words max, or punctuation instead.
- 2-3 relevant hashtags at the end

${IMAGE_PRINCIPLES}

${MEME_VISUAL_SYSTEM}`;

  const dynamicTail = `TODAY'S DATE: ${todayStr}. The current year is ${currentYear}. If you need to reference the year, use ${currentYear} — never write "${currentYear - 1}" or an earlier year as if it were the present.

ARCHETYPE TO USE FOR THIS POST:
- Hook type: ${hookLabel} (${archetype.hook_type})
- Post structure: ${structLabel} (${archetype.post_structure})
- This archetype achieves ${archetype.avg_ratio.toFixed(1)}x average engagement in real data
${exampleSection}

ARCHETYPE-SPECIFIC RULES (apply IN ADDITION to the general rules above):
- Apply the hook type strictly: the first line must follow the "${hookLabel}" pattern
- Apply the post structure strictly: the post must follow the "${structLabel}" framework
${outlierContext ? `\nVIRAL REFERENCE POSTS:\n${outlierContext}\n` : ''}
${videoMode ? `OUTPUT FORMAT (VIDEO — produce the three pieces, clearly labelled, in this exact order, nothing else):

CAPTION:
<the LinkedIn post text that goes under the video. HOOK_LAW applies to its first line. 1–3 short paragraphs + 2–3 hashtags. This is what gets posted as the text of the LinkedIn post.>

TEXT ON SCREEN:
<≤6 words, burned on the first frames. Emotional/curiosity framing. Must NOT be the caption reworded.>

SPOKEN HOOK (0–9s):
<the literal words said out loud in the first ~9 seconds. Must follow ONE of the 6 proven spoken-hook patterns. NOT the caption reworded.>

SCRIPT BEATS (~30–60s):
<5–8 short bullet beats for the rest of the video: the payoff, the steps/demo, and the engagement ask embedded at ~sec 12–15 (never at second 0).>

Do NOT output an ===IMAGE=== block in video mode — the on-screen text above is the visual.`
: `OUTPUT FORMAT:
Respond with the post text first — no preamble, no explanation.

THEN, only if a visual would MATERIALLY amplify this specific post (it genuinely will for the PUNCHY + MEME mechanic, and for posts built on a striking contrast, a big number, a before→after, or an absurd image; it will NOT for most text-first posts), append a separate image suggestion in EXACTLY this shape:

===IMAGE===
<2–4 lines: a concrete, shootable concept following the IMAGE SUGGESTION PRINCIPLES — main subject, expression/action, key prop, any ≤5-word text overlay, colour/contrast direction. Then "Alt:" + one genuinely different alternative concept.>

Rules for the image block:
- Output the \`===IMAGE===\` marker on its own line, nothing before it on that line.
- If a visual would NOT clearly help this post, OMIT the marker and the whole block entirely. Do not pad with a weak image. A missing image block is the correct answer for most posts.
- Never put the marker or image text inside the post body — it goes strictly AFTER the post, after the marker.`}`;

  const response = await trackedCreate('ideas_variant_generation', {
    model: 'claude-opus-4-8',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `Raw idea: "${rawContent}"\nSource: ${sourceType}\n\nWrite the post using the ${hookLabel} hook and ${structLabel} structure:`,
    }],
    system: [
      { type: 'text', text: staticStack, cache_control: { type: 'ephemeral' } },
      { type: 'text', text: dynamicTail },
    ],
  });

  const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : '';
  // Split off the optional image block. The model emits `===IMAGE===` on
  // its own line ONLY when a visual genuinely helps; everything after it
  // is the suggestion and must never leak into the copyable post text.
  const m = raw.split(/\n?^\s*={2,}\s*IMAGE\s*={2,}\s*$\n?/im);
  const text = (m[0] || '').trim();
  const image_suggestion = m.length > 1 ? (m.slice(1).join('\n').trim() || null) : null;
  return { text, image_suggestion };
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

// GET /api/ideas
router.get('/', async (_req: Request, res: Response) => {
  try {
    const ideas = await PostIdeaModel.findAll();
    res.json(ideas);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ideas
router.post('/', async (req: Request, res: Response) => {
  try {
    const { raw_content, source_type, tags } = req.body;
    if (!raw_content?.trim()) return res.status(400).json({ error: 'Falta raw_content' });

    const idea = await PostIdeaModel.create({ raw_content: raw_content.trim(), source_type, tags });
    res.status(201).json(idea);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/ideas/:id
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const idea = await PostIdeaModel.update(paramId(req), req.body);
    if (!idea) return res.status(404).json({ error: 'Idea no encontrada' });
    res.json(idea);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/ideas/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await PostIdeaModel.delete(paramId(req));
    res.json({ message: 'Eliminada' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Generate post from idea ───────────────────────────────────────────────────

// POST /api/ideas/:id/generate
// Generates 3 post variants, one per top viral archetype from real outlier data.
// Returns { variants: ArchetypeVariant[] }. User selects one, then auto-improve runs.
router.post('/:id/generate', async (req: Request, res: Response) => {
  const id = paramId(req);
  try {
    const idea = await PostIdeaModel.findById(id);
    if (!idea) return res.status(404).json({ error: 'Idea no encontrada' });

    await PostIdeaModel.update(id, { status: 'generating' });

    // Optional list of archetype_keys already tried — for the "reload archetypes" UX
    const exclude: string[] = Array.isArray(req.body?.exclude) ? req.body.exclude : [];

    // Pull a wide pool of high-performing archetypes
    const archetypePool = await getArchetypePool();

    // Fallback if not enough outlier data
    if (archetypePool.length === 0) {
      archetypePool.push(
        { hook_type: 'personal_confession', post_structure: 'confession_insight_takeaway', avg_ratio: 3, example_hook: null, example_text: null },
        { hook_type: 'data_shock', post_structure: 'problem_agitate_solve', avg_ratio: 3, example_hook: null, example_text: null },
        { hook_type: 'contrarian_take', post_structure: 'contrarian_proof_reframe', avg_ratio: 3, example_hook: null, example_text: null },
      );
    }

    // Let Claude pick the 3 archetypes that fit THIS idea best, skipping ones already shown
    let archetypes: ArchetypeRaw[];
    try {
      archetypes = await selectArchetypesForIdea(idea.raw_content, archetypePool, exclude);
    } catch (selErr: any) {
      console.error('[Ideas generate] Selector failed, falling back to top-3:', selErr.message);
      archetypes = archetypePool.slice(0, 3);
    }

    if (archetypes.length === 0) {
      archetypes = archetypePool.slice(0, 3);
    }

    const outlierContext = await getOutlierContext();

    // Generate all 3 variants in parallel
    const results = await Promise.allSettled(
      archetypes.slice(0, 3).map((arch) => generateVariant(idea.raw_content, idea.source_type, arch, outlierContext))
    );

    // Video output is a structured CAPTION/TEXT-ON-SCREEN/SPOKEN-HOOK/
    // BEATS package — collapsing its first lines into a single hook would
    // wreck it, so ensureSingleLineHook is skipped in video mode. The
    // control-char + markdown strip still applies in both modes.
    const videoMode = isVideoRequest(idea.raw_content);
    const sanitizeText = (t: string) => {
      const cleaned = t
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        // LinkedIn doesn't render markdown — strip **bold** / *italic* / `code`
        // wrappers so they don't appear as literal asterisks in the feed. We
        // tell the model not to use them in the prompt too, but defend at the
        // boundary.
        .replace(/\*\*([^*\n]+?)\*\*/g, '$1')
        .replace(/(^|[\s(])\*([^*\n]+?)\*(?=[\s).,!?]|$)/g, '$1$2')
        .replace(/`([^`\n]+?)`/g, '$1')
        .trim();
      return videoMode ? cleaned : ensureSingleLineHook(cleaned);
    };

    const variants = archetypes.slice(0, 3).map((arch, i) => {
      const r = results[i];
      const out = r.status === 'fulfilled'
        ? (r as PromiseFulfilledResult<{ text: string; image_suggestion: string | null }>).value
        : { text: '', image_suggestion: null };
      return {
        archetype_key: `${arch.hook_type}__${arch.post_structure}`,
        archetype_label: `${HOOK_LABELS[arch.hook_type] || arch.hook_type}`,
        archetype_desc: `${STRUCT_LABELS[arch.post_structure] || arch.post_structure} · ${arch.avg_ratio.toFixed(1)}x de multiplicador medio en outliers`,
        hook_type: arch.hook_type,
        post_structure: arch.post_structure,
        avg_ratio: arch.avg_ratio,
        text: out.text ? sanitizeText(out.text) : '',
        // Kept separate from `text` on purpose — the post the user copies
        // to LinkedIn must never contain the image brief.
        image_suggestion: out.image_suggestion,
      };
    }).filter((v) => v.text.length > 0);

    if (variants.length === 0) {
      await PostIdeaModel.update(id, { status: 'draft' });
      return res.status(500).json({ error: 'La IA ha devuelto respuestas vacías en todas las variantes' });
    }

    // Save variants using explicit ::jsonb cast to avoid pg serialization issues
    const variantsJson = JSON.stringify(variants);
    try {
      await pool.query(
        `UPDATE post_ideas SET generated_variants = $1::jsonb, status = 'ready', updated_at = NOW() WHERE id = $2`,
        [variantsJson, id]
      );
    } catch (dbErr: any) {
      console.error('[Ideas generate] DB save failed:', dbErr.message);
      console.error('[Ideas generate] JSON payload (first 1000 chars):', variantsJson.substring(0, 1000));
      throw dbErr;
    }

    res.json({ variants });
  } catch (err: any) {
    console.error('[Ideas generate] Error:', err.message, err.stack);
    await PostIdeaModel.update(id, { status: 'draft' }).catch(() => {});
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ideas/:id/save-post — save the final improved post + score
router.post('/:id/save-post', async (req: Request, res: Response) => {
  try {
    const { generated_post, generation_score } = req.body;
    const idea = await PostIdeaModel.update(paramId(req), {
      generated_post,
      generation_score: typeof generation_score === 'number' ? generation_score : null,
      status: 'ready',
    });
    res.json(idea);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Inspiration: browse & steal outlier posts ──────────────────────────────

// GET /api/ideas/inspiration — Return all outlier posts with creator info
router.get('/inspiration', async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.id, p.content_text, p.hook_text, p.hook_type, p.post_structure,
             p.text_tone, p.content_type, p.outlier_ratio, p.engagement_score,
             p.likes_count, p.comments_count, p.reposts_count,
             p.published_at, p.post_url, p.topic, p.reaction_mix,
             c.name AS creator_name, c.headline AS creator_headline,
             c.profile_image_url AS creator_image, c.followers_count AS creator_followers
      FROM posts p
      JOIN creators c ON c.id = p.creator_id
      WHERE p.is_outlier = TRUE
        AND p.linkedin_post_id <> 'DEMO_LIVE_POST'
        AND p.content_text IS NOT NULL
        AND LENGTH(p.content_text) > 80
      ORDER BY p.outlier_ratio DESC
    `);

    res.json({ outliers: rows, total: rows.length });
  } catch (err: any) {
    console.error('[Inspiration] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ideas/inspiration/reaction-debug
// Diagnostic: the "Solo memes (0)" count suggests the reaction_mix keys we
// stored don't match what the frontend looks for (FUNNY/ENTERTAINMENT).
// This aggregates every distinct key seen across all reaction_mix JSONs and
// how many posts have each, plus a few full sample objects, so we can map
// the real LinkedIn reaction-type names (PRAISE, APPRECIATION, EMPATHY, …)
// to display labels.
router.get('/inspiration/reaction-debug', async (_req: Request, res: Response) => {
  try {
    const summary = await pool.query(`
      SELECT key, COUNT(*)::int AS posts_with_key
        FROM posts p, jsonb_object_keys(p.reaction_mix) AS key
       WHERE p.reaction_mix IS NOT NULL
       GROUP BY key
       ORDER BY posts_with_key DESC
    `);
    const samples = await pool.query(`
      SELECT id, reaction_mix
        FROM posts
       WHERE reaction_mix IS NOT NULL
         AND reaction_mix ? 'total'
       ORDER BY (reaction_mix->>'total')::int DESC NULLS LAST
       LIMIT 8
    `);
    const counts = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE reaction_mix IS NOT NULL)::int AS with_mix,
        COUNT(*) FILTER (WHERE reaction_mix ? '_error')::int  AS errored
      FROM posts
      WHERE is_outlier = TRUE
    `);
    // Live probe: everything stored as UNKNOWN means none of the field
    // names we tried held the reaction type. Pull the raw items for one
    // outlier so we can see the real field. Uses the dedicated scraper
    // account (same one the backfill used).
    let liveProbe: any = null;
    try {
      const { rows: pr } = await pool.query(
        `SELECT linkedin_post_id FROM posts
          WHERE is_outlier = TRUE AND linkedin_post_id IS NOT NULL
            AND linkedin_post_id <> 'DEMO_LIVE_POST'
            AND (reaction_mix->>'total')::int > 50
          ORDER BY (reaction_mix->>'total')::int DESC NULLS LAST
          LIMIT 1`
      );
      const scraperAccount = process.env.UNIPILE_SCRAPER_ACCOUNT_ID;
      if (pr[0]?.linkedin_post_id && scraperAccount) {
        liveProbe = await unipileService.probePostReactionsRaw(pr[0].linkedin_post_id, scraperAccount);
      } else {
        liveProbe = { note: 'no scraper account or no eligible post' };
      }
    } catch (e: any) {
      liveProbe = { error: e?.message };
    }

    res.json({
      counts: counts.rows[0],
      distinct_keys: summary.rows,
      samples: samples.rows,
      live_probe: liveProbe,
    });
  } catch (err: any) {
    console.error('[inspiration/reaction-debug]', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ideas/inspiration/reset-topics — clear topic on outlier posts so
// they get re-classified next time /classify runs. Optional body filters let
// the caller target a subset:
//   { content_types: ['text_image', 'image'] }  → only image posts (e.g. to
//      re-tag memes after the prompt was updated to recognise them)
//   { topics: ['Other', 'Misc'] }              → only specific old labels
// With no body, clears every outlier's topic — use sparingly, it costs an
// LLM call per ~30 posts on the next classify run.
router.post('/inspiration/reset-topics', async (req: Request, res: Response) => {
  try {
    const contentTypes = Array.isArray(req.body?.content_types) ? req.body.content_types : null;
    const topics = Array.isArray(req.body?.topics) ? req.body.topics : null;

    const where: string[] = [
      'is_outlier = TRUE',
      `linkedin_post_id <> 'DEMO_LIVE_POST'`,
      `topic IS NOT NULL`,
      `topic <> ''`,
    ];
    const params: any[] = [];
    if (contentTypes && contentTypes.length > 0) {
      params.push(contentTypes);
      where.push(`content_type = ANY($${params.length}::text[])`);
    }
    if (topics && topics.length > 0) {
      params.push(topics);
      where.push(`topic = ANY($${params.length}::text[])`);
    }

    const { rowCount } = await pool.query(
      `UPDATE posts SET topic = NULL WHERE ${where.join(' AND ')}`,
      params
    );
    res.json({ reset: rowCount, filters: { content_types: contentTypes, topics } });
  } catch (err: any) {
    console.error('[Reset Topics] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ideas/inspiration/classify — AI-classify outlier posts by topic (one-time)
router.post('/inspiration/classify', async (_req: Request, res: Response) => {
  try {
    const { rows: unclassified } = await pool.query(`
      SELECT p.id, p.content_text, p.hook_text, p.content_type
      FROM posts p
      WHERE p.is_outlier = TRUE
        AND p.linkedin_post_id <> 'DEMO_LIVE_POST'
        AND p.content_text IS NOT NULL
        AND LENGTH(p.content_text) > 80
        AND (p.topic IS NULL OR p.topic = '')
      ORDER BY p.outlier_ratio DESC
    `);

    if (unclassified.length === 0) {
      return res.json({ classified: 0, message: 'Todos los outliers ya están clasificados' });
    }

    // Bulletproof UTF-16 sanitiser. The previous regex-based version had a
    // subtle bug: substring(0, 250) ran AFTER the surrogate strip, so if the
    // 249th/250th chars formed a valid emoji pair, the cut would leave a
    // dangling high surrogate at the end and Anthropic would reject the
    // payload with `no low surrogate in string`. Here we walk code units
    // and only ever emit complete surrogate pairs, so the truncated output
    // is always valid UTF-16.
    const cleanText = (t: string) => {
      const collapsed = (t || '')
        .replace(/[\x00-\x1F\x7F]/g, ' ')
        .replace(/"/g, "'")
        .replace(/\s+/g, ' ')
        .trim();

      let out = '';
      for (let i = 0; i < collapsed.length && out.length < 250; i++) {
        const code = collapsed.charCodeAt(i);
        if (code >= 0xD800 && code <= 0xDBFF) {
          const next = i + 1 < collapsed.length ? collapsed.charCodeAt(i + 1) : 0;
          if (next >= 0xDC00 && next <= 0xDFFF) {
            if (out.length + 2 > 250) break;
            out += collapsed[i] + collapsed[i + 1];
            i++;
          }
          // else: orphan high surrogate — skip
        } else if (code >= 0xDC00 && code <= 0xDFFF) {
          // orphan low surrogate — skip
        } else {
          out += collapsed[i];
        }
      }
      return out;
    };

    const BATCH_SIZE = 30;
    let totalClassified = 0;
    const failedBatches: { start: number; size: number; error: string }[] = [];

    for (let start = 0; start < unclassified.length; start += BATCH_SIZE) {
      const batch = unclassified.slice(start, start + BATCH_SIZE);

      try {
        const postsList = batch.map((p: any, i: number) => {
          // Surface content_type so the model can decide "Meme" — which by
          // definition needs an image attached. A funny tweet-style post
          // with no image is just a Hot Take, not a meme.
          const typeHint = p.content_type && p.content_type !== 'text' ? ` [type:${p.content_type}]` : '';
          return `${i + 1}. [ID:${p.id}]${typeHint} ${cleanText(p.content_text)}`;
        }).join('\n\n');

        const response = await trackedCreate('ideas_outlier_classifier', {
          model: 'claude-sonnet-4-6',
          max_tokens: 2048,
          messages: [{
            role: 'user',
            content: `Classify each LinkedIn post below into a short topic label (2-4 words max).

Use CONSISTENT labels across posts — group similar themes under the SAME label.
Good labels: "Sales Tactics", "Cold Outreach", "Hiring & Culture", "Founder Lessons", "AI & Automation", "Personal Growth", "Productivity", "Leadership", "Storytelling", "Marketing Strategy", "Meme"

"Meme" is RESERVED for posts where ALL of these are true:
  - content_type contains "image" (e.g. text_image, image)
  - the text is short and punchy (usually < 200 chars) OR purely a caption setup
  - the appeal is humor, irony, satire, absurd observation or a relatable joke
  - it is NOT a tutorial, opinion essay, story with a lesson, hiring announcement, or data takeaway with a chart
A serious post with a screenshot or chart is NOT a Meme — that's "Data Shock" or whatever the underlying topic is.

Posts:
${postsList}

Return a JSON object mapping post number to topic label. Example:
{"1": "Sales Tactics", "2": "Meme", "3": "Cold Outreach"}

Return ONLY the JSON object. No markdown, no explanation.`,
          }],
        });

        const rawText = response.content[0].type === 'text' ? response.content[0].text.trim() : '';
        if (!rawText) {
          failedBatches.push({ start, size: batch.length, error: 'el modelo ha devuelto una respuesta vacía' });
          continue;
        }

        const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
        const startIdx = cleaned.indexOf('{');
        const endIdx = cleaned.lastIndexOf('}');
        if (startIdx === -1 || endIdx === -1) {
          failedBatches.push({ start, size: batch.length, error: 'la respuesta no trae ningún objeto JSON' });
          continue;
        }

        let mapping: Record<string, string>;
        try {
          mapping = JSON.parse(cleaned.slice(startIdx, endIdx + 1));
        } catch (parseErr: any) {
          console.error('[Classify] JSON parse error for batch starting at', start, parseErr?.message);
          failedBatches.push({ start, size: batch.length, error: `Error al leer el JSON: ${parseErr?.message}` });
          continue;
        }

        for (const [numStr, topic] of Object.entries(mapping)) {
          const idx = parseInt(numStr, 10) - 1;
          if (idx < 0 || idx >= batch.length || !topic) continue;
          const postId = batch[idx].id;
          await pool.query('UPDATE posts SET topic = $1 WHERE id = $2', [topic.trim(), postId]);
          totalClassified++;
        }
      } catch (batchErr: any) {
        // Surface the full upstream error to the client so the UI can show
        // what actually went wrong (model name, rate limit, payload size,
        // bad characters in the prompt, etc.) — and keep going with the
        // remaining batches rather than aborting the whole run.
        const msg = String(batchErr?.message || batchErr).slice(0, 500);
        console.error(`[Classify] batch starting at ${start} failed:`, msg);
        failedBatches.push({ start, size: batch.length, error: msg });
        continue;
      }
    }

    res.json({
      classified: totalClassified,
      total: unclassified.length,
      failed_batches: failedBatches.length,
      errors: failedBatches.slice(0, 5),
    });
  } catch (err: any) {
    console.error('[Classify] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Inspiration: generate ideas (brainstorming) ────────────────────────────

interface GeneratedIdea {
  title: string;
  body: string;
  sub_angle?: string;
  suggested_hook?: string;
}

const sanitizeTextShort = (t: string) =>
  (t || '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();

function parseIdeasJson(raw: string): GeneratedIdea[] {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  const startIdx = cleaned.indexOf('[');
  const endIdx = cleaned.lastIndexOf(']');
  if (startIdx === -1 || endIdx === -1) return [];
  try {
    const parsed = JSON.parse(cleaned.slice(startIdx, endIdx + 1));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x) => x && typeof x === 'object' && x.title && x.body)
      .map((x) => ({
        title: sanitizeTextShort(String(x.title)).substring(0, 180),
        body: sanitizeTextShort(String(x.body)).substring(0, 1200),
        sub_angle: x.sub_angle ? sanitizeTextShort(String(x.sub_angle)).substring(0, 60) : undefined,
        suggested_hook: x.suggested_hook ? sanitizeTextShort(String(x.suggested_hook)).substring(0, 220) : undefined,
      }))
      .filter((x) => x.title.length > 0 && x.body.length > 0);
  } catch {
    return [];
  }
}

// ─── Brainstorm v2: parametric by post type ─────────────────────────────────

type PostType =
  | 'lead_magnet' | 'opinion' | 'story' | 'listicle' | 'how_to'
  | 'contrarian' | 'data_driven' | 'behind_scenes' | 'question' | 'news_reaction';

const POST_TYPES: PostType[] = [
  'lead_magnet', 'opinion', 'story', 'listicle', 'how_to',
  'contrarian', 'data_driven', 'behind_scenes', 'question', 'news_reaction',
];

// One specialised system prompt per post type. Each one defines:
// - the canonical pattern of that post type (so the model writes the right shape)
// - examples of valid sub_angles (so 10-20 ideas come back genuinely different)
// - what the hook should look like
// The shared boilerplate (JSON shape, language matching, count, etc.) is appended
// in `buildBrainstormSystem` below.
const POST_TYPE_PROMPTS: Record<PostType, { label: string; instructions: string; subAngles: string[] }> = {
  lead_magnet: {
    label: 'Lead magnet',
    instructions: `Posts cuyo objetivo es entregar un recurso concreto (template, checklist, base de datos, framework, dossier, audit) a cambio de un comentario, PERO con el CTA en IMPLÍCITO (no en explícito). LinkedIn penaliza ya el bait literal tipo "Comenta 'X' y te lo mando"; el humano entiende perfectamente que tiene que comentar para recibir el recurso si se le invita de forma natural. Estructura típica: hook con la promesa concreta del recurso → 2-3 líneas validando por qué ese recurso es valioso (resultado, datos, ahorro de tiempo) → cierre implícito que invita a pedirlo abajo sin nombrar la mecánica de "comenta X".

EL "suggested_hook" DEBE seguir PATRONES IMPLÍCITOS (en el idioma del topic). Ejemplos válidos:
- "Si esto te resuena, dímelo abajo y te lo paso."
- "Lo tengo en un doc — escríbeme aquí y te lo envío."
- "Levanto la mano abajo si lo quieres y te llega."
- "Si te sirve, deja una palabra y te lo paso por privado."
NUNCA escribas patrones literales como "Comenta 'PALABRA' y te paso…", "Escribe SÍ debajo y te mando…", "Pon 'X' en comentarios y te envío…", "Drop 'YES'…". Esa formulación explícita queda PROHIBIDA. El recurso prometido tiene que ser concreto y específico — no "te paso info", sino "te paso la plantilla de 12 emails outbound que usan los 30 mejores SDRs B2B".`,
    subAngles: ['plantilla', 'checklist', 'base de datos', 'framework', 'audit', 'caso real / case study'],
  },
  opinion: {
    label: 'Opinión / hot take',
    instructions: `Postura clara, primera persona, polémica pero defendible. Hook = la opinión cruda, sin matices. El cuerpo aporta 2-3 razones concretas o una anécdota corta que la sostiene. Termina con un cierre o pregunta provocadora ("Cambio mi opinión?", "¿Tengo razón o estoy loco?").

El "suggested_hook" debe sonar a opinión personal sin filler, NO a observación neutral. Ejemplos del tono: "Vendéis B2B y aún no hostáis vuestro CRM en HubSpot. Es un error caro.", "El mejor SDR que he contratado nunca había hecho ventas".`,
    subAngles: ['anti-consenso', 'anti-tendencia', 'predicción polémica', 'crítica al sector', 'autocrítica'],
  },
  story: {
    label: 'Personal story',
    instructions: `Anécdota concreta → giro → lección. Hook teaser ("Hace 6 meses perdí mi mayor cliente. Lo que aprendí cambió mi forma de vender."), cuerpo narrativo en 3-5 párrafos cortos, cierre con la lección extraída. La historia debe sentirse vivida — fecha, nombre del cliente (anonimizado o real), cifras concretas, emoción.

El "suggested_hook" es el primer párrafo (1-2 líneas) que abre el loop sin spoilear el desenlace.`,
    subAngles: ['fracaso', 'aprendizaje caro', 'momento decisivo', 'mentor / lección de otro', 'cliente difícil', 'pivote'],
  },
  listicle: {
    label: 'Listicle',
    instructions: `Hook con número específico ("5 errores", "7 tácticas", "3 patrones"), cuerpo con la lista enumerada (cada item con 1-2 líneas), cierre con CTA o reflexión. El número debe ser justificable — si pones 7 es porque tienes 7 sólidos, no para inflar.

El "suggested_hook" debe contener el número y el beneficio claro: "5 errores que vi en 30 calls de ventas B2B esta semana".`,
    subAngles: ['errores comunes', 'tácticas / playbook', 'patrones observados', 'señales de alerta', 'preguntas de entrevista', 'reglas / heurísticas'],
  },
  how_to: {
    label: 'How-to / framework',
    instructions: `Framework reproducible paso a paso. Hook con el resultado prometido ("Cómo cerré 3 deals B2B con un solo email"), cuerpo con los pasos numerados (cada uno accionable, con detalle suficiente para replicar), cierre con la promesa cumplida o el siguiente paso.

El "suggested_hook" debe empezar con "Cómo…" o "Así…" y prometer un resultado concreto.`,
    subAngles: ['proceso completo', 'mini-framework (3 pasos)', 'tactic + tool stack', 'transformación antes/después', 'anti-framework (qué NO hacer)'],
  },
  contrarian: {
    label: 'Contrarian',
    instructions: `Rompe una creencia común del sector. Hook = la creencia + tu rechazo ("Todo el mundo dice X. Es mentira."), cuerpo con la prueba concreta de por qué la creencia falla (datos, anécdota, lógica), cierre con la versión correcta o el reframe.

El "suggested_hook" debe nombrar explícitamente la creencia que estás rompiendo. Patrones: "Todo el mundo dice X. Es mentira.", "El consejo de 'X' está roto.", "X no funciona — y los datos lo demuestran."`,
    subAngles: ['mito desmontado', 'consejo común roto', 'best practice obsoleta', 'sentido común invertido', 'gurú equivocado'],
  },
  data_driven: {
    label: 'Data-driven',
    instructions: `Caso o dato específico que sorprende. Hook con la cifra impactante ("Analicé 200 emails outbound. Solo el 3% tenían lo que importa."), cuerpo desglosando la metodología y el insight, cierre con la implicación para el lector.

El "suggested_hook" debe contener una cifra concreta y un sujeto preciso. Evita números redondos vagos ("muchas empresas") — usa datos auditables ("12 de 47 deals", "3.4x ratio").`,
    subAngles: ['benchmark del sector', 'mini-estudio propio', 'análisis de competencia', 'patrón estadístico', 'caso con números'],
  },
  behind_scenes: {
    label: 'Behind-the-scenes',
    instructions: `Vulnerabilidad selectiva — muestra el "cómo se hace la salchicha" que normalmente no se cuenta. Hook con la confesión o la apertura de loop ("Lo que no te cuentan sobre cerrar tu primer deal de 6 cifras…"), cuerpo con detalles concretos del proceso real (no la versión LinkedIn), cierre con la lección o el "lo que cambiaría".

El "suggested_hook" debe sentirse íntimo y específico, nunca genérico ("mi proceso es…").`,
    subAngles: ['lo que no te cuentan', 'el coste real', 'fracaso en directo', 'proceso completo paso a paso', 'la verdad sobre…'],
  },
  question: {
    label: 'Pregunta / debate',
    instructions: `Post corto (1-3 líneas) cuya función es generar comentarios. La pregunta debe forzar una postura — no admitir respuestas tibias. Buenas preguntas tienen un sesgo claro o ponen al lector en un dilema concreto.

El "suggested_hook" ES el post entero — 1-2 frases. El "body" en el JSON sugiere por qué la pregunta funciona y cómo enmarcar las respuestas.`,
    subAngles: ['dilema binario', 'unpopular opinion (pregunta)', 'asunción cuestionada', 'escenario hipotético', 'encuesta abierta'],
  },
  news_reaction: {
    label: 'Reacción a noticia',
    instructions: `El usuario te pega una noticia del sector. Tú generas reacciones distintas — al menos un ángulo optimista, uno crítico, uno práctico ("qué hacer ahora").

El "suggested_hook" debe referenciar la noticia y aportar tu postura en la primera línea, no resumirla. El cuerpo aporta valor propio (datos, anécdota, predicción) — nunca resume la noticia ni dice "como leí en…".`,
    subAngles: ['optimista / oportunidad', 'crítico / escéptico', 'práctico / qué hacer ahora', 'predicción de segundo orden', 'caso de uso concreto'],
  },
};

function buildBrainstormSystem(postType: PostType, count: number, hasUserAngle: boolean): string {
  const meta = POST_TYPE_PROMPTS[postType];
  const angleSection = hasUserAngle
    ? `\n═══ EL ÁNGULO DEL USUARIO MANDA SOBRE TODO ═══
El usuario te ha dado un ÁNGULO / MENSAJE concreto (verás "ÁNGULO DEL USUARIO" en el mensaje). Esto es la tesis que él quiere defender. Tu trabajo NO es proponer ideas genéricas sobre el topic — es proponer ${count} formas DISTINTAS de comunicar EL ÁNGULO QUE ÉL TE DA.

Reglas duras cuando hay ángulo del usuario:
- CADA IDEA debe defender o explorar EL MISMO ÁNGULO desde un sub-ángulo distinto. No cambies de tesis.
- Si el ángulo es "el cold outreach está muerto por la IA", NO propongas ideas defendiendo lo contrario, ni ideas neutras tipo "5 tips de cold outreach".
- Lo que varía entre las ${count} ideas es el ENFOQUE / PRUEBA / FORMATO con el que comunicas la tesis, no la tesis en sí.
- El "suggested_hook" debe sonar a algo que el usuario diría — directo, con su tesis explícita o teaseada en la primera línea.
═════════════════════════════════════════════
`
    : '';

  return `Eres un estratega de contenido para LinkedIn especializado en posts tipo "${meta.label}".

═══ PATRÓN DE ESTE TIPO DE POST ═══
${meta.instructions}

═══ SUB-ÁNGULOS DISPONIBLES ═══
Cuando generes ${count} ideas, asegúrate de variar el "sub_angle" — cada idea debe atacar el tema desde un sub-ángulo distinto. Ejemplos válidos para este tipo: ${meta.subAngles.map((s) => `"${s}"`).join(', ')}. Puedes proponer otros que encajen.
${angleSection}
═══ REGLAS GENERALES ═══
- Genera EXACTAMENTE ${count} ideas, todas claramente DIFERENTES entre sí (no 3 versiones del mismo ángulo).
- Cada idea debe ser específica y accionable — no vaguedades tipo "habla sobre la importancia de X".
- Escribe en el idioma del topic / contexto que recibas. Si el topic está en español, responde en español. NO mezcles idiomas.
- Cada idea es un objeto JSON con campos: "title" (1 línea, <90 chars, resume el ángulo), "body" (2-4 líneas explicando qué se desarrollaría en el post), "sub_angle" (etiqueta corta que clasifique el ángulo dentro del tipo, en minúsculas, ej: "${meta.subAngles[0]}"), "suggested_hook" (la primera línea propuesta del post real, lista para copiar).

Responde SOLO un JSON array: [{"title","body","sub_angle","suggested_hook"}]. Sin markdown, sin texto extra, sin preámbulo.`;
}

function buildBrainstormUser(
  postType: PostType,
  topic: string,
  angle: string | undefined,
  audience: string | undefined,
  outlierContext: string | undefined,
  newsContext: string | undefined,
  count: number
): string {
  const lines: string[] = [];
  lines.push(`TOPIC: "${topic}"`);

  // The user's angle / message is the highest-signal input. Render it as a
  // visually-distinct block so the model can't miss it.
  if (angle?.trim()) {
    lines.push(
      '',
      '═══ ÁNGULO DEL USUARIO (esta es la tesis que él quiere defender — NO la cambies) ═══',
      angle.trim().substring(0, 1500),
      '═══════════════════════════════════════════════════════════════════════════════════'
    );
  }

  if (audience?.trim()) lines.push(`\nAUDIENCIA: ${audience.trim()}`);
  if (postType === 'news_reaction' && newsContext?.trim()) {
    lines.push(`\nNOTICIA / CONTEXTO:\n"""\n${newsContext.trim().substring(0, 2500)}\n"""`);
  }
  if (outlierContext) {
    lines.push(`\n${outlierContext}\n\nUsa estos posts solo como REFERENCIA del tipo de tema y tono que funciona — no copies texto, extrae los patrones y propón ángulos NUEVOS.`);
  }

  if (angle?.trim()) {
    lines.push(
      `\nGenera ${count} ideas de tipo "${POST_TYPE_PROMPTS[postType].label}" que defiendan EL ÁNGULO DEL USUARIO desde sub-ángulos distintos. NO propongas tesis alternativas — explora la suya con distintos enfoques.`
    );
  } else {
    lines.push(`\nGenera ${count} ideas de tipo "${POST_TYPE_PROMPTS[postType].label}" sobre este topic.`);
  }
  return lines.join('\n');
}

// Pull outliers as inspiration context for the brainstorm prompt.
// `grounding === 'outliers_only'` only uses validated outliers; `'all_posts'`
// widens to all posts. `'none'` returns no context (pure brainstorm).
async function getBrainstormContext(
  topic: string,
  grounding: 'outliers_only' | 'all_posts' | 'none'
): Promise<string | undefined> {
  if (grounding === 'none') return undefined;

  const params: any[] = [];
  let topicFilter = '';
  // Loose match: ILIKE %topic% on either the AI-classified topic field or
  // a substring of the content. The user's topic might be "ventas B2B" and
  // the topic column might say "Sales Tactics" — we widen the search rather
  // than miss everything.
  if (topic && topic.trim()) {
    params.push(`%${topic.trim()}%`);
    topicFilter = `AND (p.topic ILIKE $${params.length} OR p.content_text ILIKE $${params.length})`;
  }

  const outlierFilter = grounding === 'outliers_only' ? 'AND p.is_outlier = TRUE' : '';

  const { rows } = await pool.query(`
    SELECT p.content_text, p.hook_text, p.topic, p.outlier_ratio, p.likes_count, p.comments_count
    FROM posts p
    WHERE p.linkedin_post_id <> 'DEMO_LIVE_POST'
      AND p.content_text IS NOT NULL AND LENGTH(p.content_text) > 80
      ${outlierFilter}
      ${topicFilter}
    ORDER BY p.outlier_ratio DESC NULLS LAST, p.engagement_score DESC NULLS LAST
    LIMIT 12
  `, params);

  if (rows.length === 0) return undefined;

  const lines: string[] = [`POSTS DE REFERENCIA (${grounding === 'outliers_only' ? 'outliers validados' : 'todos los posts'}):`];
  rows.forEach((p: any, i: number) => {
    const text = (p.content_text || '').replace(/\s+/g, ' ').substring(0, 350);
    lines.push(`[${i + 1}] (${p.outlier_ratio ? p.outlier_ratio.toFixed(1) + 'x' : '—'}${p.topic ? ` | ${p.topic}` : ''}) "${text}${text.length === 350 ? '…' : ''}"`);
  });
  return lines.join('\n');
}

// GET /api/ideas/inspiration/trending-topics
// Returns the top topics by outlier count from the user's classified corpus.
// Used by the Generate tab as quick-pick chips ("what's hot in your data").
router.get('/inspiration/trending-topics', async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.topic,
             COUNT(*)::int AS outlier_count,
             AVG(p.outlier_ratio)::float AS avg_ratio
      FROM posts p
      WHERE p.is_outlier = TRUE
        AND p.linkedin_post_id <> 'DEMO_LIVE_POST'
        AND p.topic IS NOT NULL AND p.topic != ''
      GROUP BY p.topic
      ORDER BY outlier_count DESC, avg_ratio DESC NULLS LAST
      LIMIT 12
    `);
    res.json({ topics: rows });
  } catch (err: any) {
    console.error('[Trending topics] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ideas/inspiration/brainstorm
// Unified ideation endpoint. Replaces the 4 old /generate/* routes.
router.post('/inspiration/brainstorm', async (req: Request, res: Response) => {
  try {
    const { postType, topic, angle, audience, grounding, count, newsContext } = req.body as {
      postType?: string;
      topic?: string;
      angle?: string;
      audience?: string;
      grounding?: string;
      count?: number;
      newsContext?: string;
    };

    if (!postType || !POST_TYPES.includes(postType as PostType)) {
      return res.status(400).json({ error: `postType tiene que ser uno de estos: ${POST_TYPES.join(', ')}` });
    }
    if (!topic || !topic.trim()) {
      return res.status(400).json({ error: 'Falta el tema' });
    }
    const grounded = grounding === 'all_posts' || grounding === 'none' ? grounding : 'outliers_only';
    const n = Math.max(3, Math.min(20, Number(count) || 10));
    const userAngle = (angle || '').trim();

    // Pull outlier context (or skip if grounding === 'none').
    // When the user has provided an angle, the outlier search uses both the
    // topic AND the angle as keywords, so we surface posts that talk about
    // similar tesis instead of just the broad topic.
    const groundingQuery = userAngle ? `${topic.trim()} ${userAngle}`.slice(0, 200) : topic.trim();
    let outlierContext = await getBrainstormContext(groundingQuery, grounded as any);
    let groundingFallback: string | null = null;

    // If user asked for outliers-only but we found nothing, fall back to all_posts
    // rather than failing — the user gets ideas + a flag we surface in the response.
    if (!outlierContext && grounded === 'outliers_only') {
      outlierContext = await getBrainstormContext(groundingQuery, 'all_posts');
      if (outlierContext) groundingFallback = 'all_posts';
    }

    const system = buildBrainstormSystem(postType as PostType, n, !!userAngle);
    const user = buildBrainstormUser(
      postType as PostType,
      topic.trim(),
      userAngle || undefined,
      audience,
      outlierContext,
      newsContext,
      n
    );

    // Higher max_tokens for larger counts (each idea ≈ 250 tokens worst case)
    const maxTokens = Math.min(8192, 1024 + n * 320);

    const response = await trackedCreate('ideas_brainstorm', {
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    });
    const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : '';
    const ideas = parseIdeasJson(raw);

    if (ideas.length === 0) {
      return res.status(500).json({ error: 'No se pudieron generar ideas, intenta de nuevo' });
    }

    res.json({
      ideas,
      meta: {
        postType,
        grounding: grounded,
        groundingFallback, // null unless we silently widened from outliers_only → all_posts
        count: ideas.length,
        requested: n,
      },
    });
  } catch (err: any) {
    console.error('[Brainstorm] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────── Tinder-style outlier swipe deck + kanban support ───────────
//
// GET  /api/ideas/swipe/deck?limit=20      next outliers to swipe on
// POST /api/ideas/swipe                    body: { post_id, action: 'like'|'skip' }
//   On 'like' creates a post_idea from the outlier and returns the new idea
//   id. On 'skip' just records the swipe so the deck doesn't show it again.
// GET  /api/ideas/kanban                    all post_ideas grouped by pipeline_status
// PATCH /api/ideas/:id/pipeline             body: { pipeline_status } — move card

// Pull the next batch of un-swiped outliers, highest outlier_ratio first so
// the user always sees the strongest signals first. Pre-fetches a small page
// so the swipe UI can preload the next card while the current one animates.
router.get('/swipe/deck', async (req: Request, res: Response) => {
  try {
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit as string) || 20));
    const { rows } = await pool.query(
      `SELECT p.id, p.content_text, p.hook_text, p.hook_type, p.post_structure,
              p.content_type, p.outlier_ratio, p.engagement_score,
              p.likes_count, p.comments_count, p.reposts_count, p.impressions_count,
              p.published_at, p.post_url, p.topic, p.reaction_mix,
              c.name AS creator_name,
              c.headline AS creator_headline,
              c.profile_image_url AS creator_image,
              c.followers_count AS creator_followers
         FROM posts p
         JOIN creators c ON c.id = p.creator_id
        WHERE p.is_outlier = TRUE
          AND p.linkedin_post_id <> 'DEMO_LIVE_POST'
          AND p.content_text IS NOT NULL
          AND LENGTH(p.content_text) > 80
          AND NOT EXISTS (SELECT 1 FROM outlier_swipes s WHERE s.post_id = p.id)
        ORDER BY RANDOM()
        LIMIT $1`,
      [limit]
    );
    const totalLeft = await pool.query(
      `SELECT COUNT(*)::int AS n
         FROM posts p
        WHERE p.is_outlier = TRUE
          AND p.linkedin_post_id <> 'DEMO_LIVE_POST'
          AND p.content_text IS NOT NULL
          AND LENGTH(p.content_text) > 80
          AND NOT EXISTS (SELECT 1 FROM outlier_swipes s WHERE s.post_id = p.id)`
    );
    res.json({ cards: rows, remaining: totalLeft.rows[0].n });
  } catch (err: any) {
    console.error('[ideas/swipe/deck]', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/swipe', async (req: Request, res: Response) => {
  try {
    const { post_id, action } = req.body || {};
    if (!post_id || !['like', 'skip'].includes(action)) {
      return res.status(400).json({ error: 'Faltan post_id y action (like|skip)' });
    }
    let ideaId: string | null = null;
    if (action === 'like') {
      // Copy the outlier's FULL content into raw_content so the kanban card
      // (and any later edit) has the entire post to work with — not just the
      // hook. Prepends the hook on its own line when present so it stays
      // recognisable as the opening line.
      const { rows } = await pool.query(
        `SELECT content_text, hook_text FROM posts WHERE id = $1`,
        [post_id]
      );
      if (rows.length === 0) return res.status(404).json({ error: 'Post no encontrado' });
      const body = String(rows[0].content_text || '').trim();
      const hook = String(rows[0].hook_text || '').trim();
      const seed = body || hook || '(post sin texto)';
      const idea = await PostIdeaModel.create({
        raw_content: seed,
        source_type: 'observation',
        pipeline_status: 'proposed',
        source_outlier_post_id: post_id,
      });
      ideaId = idea.id;
    }
    await pool.query(
      `INSERT INTO outlier_swipes (post_id, action, idea_id, swiped_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (post_id) DO UPDATE
         SET action = EXCLUDED.action,
             idea_id = EXCLUDED.idea_id,
             swiped_at = EXCLUDED.swiped_at`,
      [post_id, action, ideaId]
    );
    res.json({ ok: true, action, idea_id: ideaId });
  } catch (err: any) {
    console.error('[ideas/swipe]', err);
    res.status(500).json({ error: err.message });
  }
});

// Group all ideas by their pipeline column. Includes the outlier excerpt
// (text + creator) when the idea came from a swipe so the card has context.
router.get('/kanban', async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT i.id, i.raw_content, i.source_type, i.tags, i.status,
              i.pipeline_status, i.source_outlier_post_id,
              i.generated_post, i.created_at, i.updated_at,
              p.content_text AS outlier_text,
              p.hook_text AS outlier_hook,
              p.outlier_ratio AS outlier_ratio,
              p.post_url AS outlier_url,
              c.name AS outlier_creator_name,
              c.profile_image_url AS outlier_creator_image
         FROM post_ideas i
         LEFT JOIN posts p ON p.id = i.source_outlier_post_id
         LEFT JOIN creators c ON c.id = p.creator_id
        ORDER BY i.updated_at DESC`
    );
    const columns: Record<string, any[]> = {
      proposed: [], in_progress: [], scheduled: [], published: [], discarded: [],
    };
    for (const r of rows) {
      const k = r.pipeline_status as keyof typeof columns;
      if (columns[k]) columns[k].push(r);
    }
    res.json({ columns, total: rows.length });
  } catch (err: any) {
    console.error('[ideas/kanban]', err);
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/pipeline', async (req: Request, res: Response) => {
  try {
    const valid = ['proposed', 'in_progress', 'scheduled', 'published', 'discarded'];
    const { pipeline_status } = req.body || {};
    if (!valid.includes(pipeline_status)) {
      return res.status(400).json({ error: `pipeline_status tiene que ser uno de estos: ${valid.join(', ')}` });
    }
    const idea = await PostIdeaModel.update(req.params.id as string, { pipeline_status });
    res.json(idea);
  } catch (err: any) {
    console.error('[ideas/pipeline]', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/ideas/kanban/clear — wipes every post_idea AND every recorded
// outlier swipe, so the kanban resets to empty and the /swipe deck restarts
// from the full outlier pool. Destructive and unrecoverable; the UI gates it
// behind a confirm prompt.
router.delete('/kanban/clear', async (_req: Request, res: Response) => {
  try {
    // outlier_swipes references post_ideas via idea_id ON DELETE SET NULL,
    // so order doesn't matter for FK reasons — but we delete swipes first
    // for clarity. Both wipes happen in one TX so a partial failure leaves
    // the kanban consistent with the swipe history.
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const swipes = await client.query('DELETE FROM outlier_swipes');
      const ideas = await client.query('DELETE FROM post_ideas');
      await client.query('COMMIT');
      res.json({
        ok: true,
        ideas_deleted: ideas.rowCount ?? 0,
        swipes_deleted: swipes.rowCount ?? 0,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error('[ideas/kanban/clear]', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
