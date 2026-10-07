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
