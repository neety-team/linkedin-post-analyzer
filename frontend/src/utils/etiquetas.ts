// Etiquetas en español SOLO para pintar valores-dato que llegan en inglés del
// backend. El dato no cambia: si llega un valor que no está en el mapa, se
// muestra el original (usa `etiqueta()`).
//
// OJO: los `hookLabels`/`structLabels` en INGLÉS de OutlierTable viajan como
// tags de la idea guardada y NO se sustituyen por estos.

export const HOOK_TYPE_LABELS: Record<string, string> = {
  pattern_interrupt: 'Rompe el patrón',
  belief_breaker: 'Rompe creencias',
  curiosity_gap: 'Hueco de curiosidad',
  data_shock: 'Dato impactante',
  hot_take: 'Opinión polémica',
  personal_confession: 'Confesión',
  story_opener: 'Arranque de historia',
  hypothetical_question: 'Pregunta hipotética',
  why_question: 'Pregunta por qué',
  how_question: 'Pregunta cómo',
  direct_question: 'Pregunta directa',
  open_question: 'Pregunta abierta',
  rhetorical_question: 'Pregunta retórica',
  list_promise: 'Promesa de lista',
  prediction: 'Predicción',
  how_to_framework: 'Cómo hacerlo',
  bold_claim: 'Afirmación rotunda',
  common_mistake: 'Error común',
  direct_callout: 'Interpelación directa',
  announcement: 'Anuncio',
  social_proof_opener: 'Prueba social',
  analogy: 'Analogía',
  contrarian_take: 'A contracorriente',
  relatable_moment: 'Momento identificable',
  motivational: 'Motivacional',
  observation: 'Observación',
  challenge: 'Reto',
  other: 'Otro',
};

// Ritmo narrativo del post (analyzeNarrativeRhythm en backend/src/services/patterns.ts).
export const RITMO_LABELS: Record<string, string> = {
  standard: 'Estándar',
  punchy_short: 'Corto y directo',
  dense_narrative: 'Narrativa densa',
  question_lead: 'Abre con pregunta',
  prose: 'Prosa',
  list_driven: 'En lista',
  tension_relief: 'Tensión y alivio',
  mini_hook_chain: 'Cadena de miniganchos',
  long_narrative: 'Narrativa larga',
  statement: 'Afirmación',
  question: 'Pregunta',
  explicit_cta: 'CTA explícito',
  opinion_ask: 'Pide opinión',
  takeaway: 'Lección final',
  punchline: 'Remate',
};

export function etiqueta(mapa: Record<string, string>, valor: string | null | undefined): string {
  if (valor == null) return '';
  return mapa[valor] ?? valor;
}

// Psicologia del gancho: que le hace el gancho al lector. Copia EXACTA de
// PALANCAS en backend/src/services/ganchoPsicologia.ts (sin los ejemplos):
// si cambia alli, se cambia aqui.
export const PALANCAS_GANCHO: Record<string, { etiqueta: string; que_hace: string }> = {
  identificacion: {
    etiqueta: 'Identificación',
    que_hace: 'El lector se ve retratado en una escena o una frase que ya ha vivido. No promete nada: lo reconoce.',
  },
  absoluto_discutible: {
    etiqueta: 'Absoluto discutible',
    que_hace: 'Afirmación tajante desde la experiencia de quien firma (nunca, jamás, siempre, cada). El lector no puede verificarla pero la compara con la suya: le ha pasado, le pasa lo contrario o depende. Invita a comentar y a rebatir.',
  },
  prejuicio_ajeno: {
    etiqueta: 'Prejuicio ajeno',
    que_hace: 'Pone en boca de OTROS un tópico o un desprecio sobre algo del lector (su región, su oficio, su sector) y deja ver que se va a desmontar. Activa orgullo y ganas de defender lo suyo.',
  },
  rompe_creencia: {
    etiqueta: 'Rompe una creencia',
    que_hace: 'Quien firma niega algo que el lector da por cierto (X no es Y, lo que crees que pasa no es lo que pasa). Choca con lo que ya piensa.',
  },
  bucle_abierto: {
    etiqueta: 'Curiosidad (bucle abierto)',
    que_hace: 'Promete una respuesta, una razón, un dato o un secreto que solo está en el cuerpo. El lector sigue para cerrar el hueco.',
  },
  escena: {
    etiqueta: 'Escena con final abierto',
    que_hace: 'Arranca una historia concreta con un acto raro o un objeto que se ve, y el lector quiere saber cómo acaba. Es narrativa, no reconocimiento.',
  },
  confesion: {
    etiqueta: 'Confesión',
    que_hace: 'Quien firma admite un fallo, una pérdida o algo que le deja en mal lugar. Despierta simpatía y curiosidad por saber qué pasó.',
  },
  acusacion: {
    etiqueta: 'Acusación al lector',
    que_hace: 'Reproche directo al lector o a su colectivo. Incomoda y empuja a defenderse o a comprobar si va por él.',
  },
  humor_absurdo: {
    etiqueta: 'Humor absurdo',
    que_hace: 'Una imagen exagerada o imposible que hace gracia y obliga a mirar qué hay detrás.',
  },
  urgencia: {
    etiqueta: 'Urgencia o novedad',
    que_hace: 'Una noticia, un cambio o un plazo que el lector no se puede perder. Miedo a quedarse atrás.',
  },
  regalo: {
    etiqueta: 'Regalo o beneficio directo',
    que_hace: 'Ofrece algo útil, gratis o un ahorro concreto. Interés propio y reciprocidad.',
  },
  logro: {
    etiqueta: 'Logro o prueba social',
    que_hace: 'Una cifra, un premio o un hito propio que da autoridad. El lector mira por estatus o por saber cómo se consiguió.',
  },
  pregunta: {
    etiqueta: 'Pregunta al lector',
    que_hace: 'Le pide al lector su opinión o su experiencia de forma directa.',
  },
  anuncio: {
    etiqueta: 'Anuncio sin palanca',
    que_hace: 'Informa (oferta de empleo, puesto nuevo, asistencia a un evento) sin ninguna tensión para el lector.',
  },
};

// Solo las etiquetas, para `etiqueta(PALANCA_LABELS, clave)` (respaldo: la clave).
export const PALANCA_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(PALANCAS_GANCHO).map(([k, v]) => [k, v.etiqueta]),
);
