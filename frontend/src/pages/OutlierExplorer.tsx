import { useState, useMemo } from 'react';
import { useApi } from '../hooks/useApi';
import PostCard from '../components/PostCard';
import { SkeletonCard } from '../components/Skeleton';
import OutlierContentTypeChart from '../components/OutlierContentTypeChart';
import { HOOK_TYPE_LABELS, RITMO_LABELS, etiqueta } from '../utils/etiquetas';

interface PostExplanation {
  summary: string;
  narrative_mechanism: string;
  hook_tension: string;
  virality_driver: { driver: string; label: string; explanation: string };
  comment_driver: string;
  abstract_template: string;
}

interface NarrativeRhythm {
  hook_zone: { lines: number; avg_words_per_line: number; style: string };
  body: { style: string; has_list: boolean; has_tension_relief: boolean; mini_hooks: number };
  closing: { style: string; cta_type: string | null };
  sentence_rhythm: { short_long_alternation: number; avg_line_length: number };
  scroll_stops: number;
  scroll_stop_types: string[];
}

interface Archetype {
  archetype: string;
  label: string;
  description: string;
  hook_type: string;
  structure: string;
  tone: string;
  count: number;
  avg_engagement: number;
  avg_outlier_ratio: number;
  example_hooks: string[];
}

interface CrossCreatorData {
  top_outliers: {
    id: string;
    linkedin_post_id?: string | null;
    content_text: string | null;
    content_type: string;
    published_at: string | null;
    likes_count: number;
    comments_count: number;
    reposts_count: number;
    engagement_score: number;
    outlier_ratio: number;
    is_outlier: boolean;
    /** "De los mejores DE SU CUENTA". Ver outliers.ts::recalcTopDelCreador. */
    top_del_creador?: boolean;
    /**
     * Percentil del post dentro de SU creador. Es el orden bueno de esta lista:
     * outlier_ratio no es comparable entre creadores y hunde a las cuentas
     * planas al fondo (el mejor post del año de Adam Grant tiene ratio 2,75).
     */
    percentil_creador?: number | null;
    hook_text: string | null;
    hook_type?: string;
    post_structure?: string;
    text_tone?: string;
    post_url: string | null;
    creator_name: string;
    creator_image: string | null;
    ai_explanation?: PostExplanation;
    narrative_rhythm?: NarrativeRhythm;
  }[];
  patterns: {
    total_outliers: number;
    content_type_distribution: Record<string, number>;
    hook_type_distribution: Record<string, number>;
    structure_distribution: Record<string, number>;
    tone_comparison: {
      tone: string;
      outlier_count: number;
      outlier_avg_ratio: number;
      outlier_avg_engagement: number;
      outlier_pct: number;
      normal_count: number;
      normal_avg_ratio: number;
      normal_avg_engagement: number;
      normal_pct: number;
    }[];
    tone_interpretation: string;
    neutral_outlier_pct: number;
    avg_word_count: number;
    cta_rate: number;
    common_traits: string[];
    outlier_timing?: {
      best_days: { day: number; day_name: string; total_posts: number; outliers: number; outlier_rate: number; avg_outlier_ratio: number }[];
      best_hours: { hour: number; hour_label: string; total_posts: number; outliers: number; outlier_rate: number; avg_outlier_ratio: number }[];
    };
    archetypes?: Archetype[];
    text_patterns: {
      opening_patterns: { pattern: string; count: number; pct: number; examples: string[] }[];
      closing_patterns: { pattern: string; count: number; pct: number; examples: string[] }[];
      recurring_phrases: { phrase: string; count: number; outlier_pct: number; normal_pct: number; overindex: number }[];
      semantic_categories?: { category: string; label: string; outlier_density: number; normal_density: number; diff_pct: number }[];
      formatting_style: {
        avg_sentence_length: { outlier: number; normal: number };
        avg_line_breaks: { outlier: number; normal: number };
        avg_word_count: { outlier: number; normal: number };
        emoji_rate: { outlier: number; normal: number };
        hashtag_rate: { outlier: number; normal: number };
        question_rate: { outlier: number; normal: number };
      } | null;
      writing_analysis: string;
    };
  };
}

interface Creator {
  id: string;
  name: string | null;
  profile_image_url: string | null;
}

interface CompareData {
  id: string;
  name: string;
  profile_image_url: string | null;
  followers_count: number;
  total_posts: number;
  total_outliers: number;
  outlier_rate: number;
  avg_engagement: number;
  median_engagement: number;
  engagement_rate: number;
  posts_per_week: number;
  avg_comment_like_ratio: number;
  avg_share_like_ratio: number;
  hook_type_distribution: Record<string, number>;
}

// Mismas etiquetas que HookTypeChart (mapa compartido en utils/etiquetas).
const hookLabels = HOOK_TYPE_LABELS;

// Mismas etiquetas que StructureChart.
const structLabels: Record<string, string> = {
  hook_list_cta: 'Gancho>Lista>CTA', hook_story_lesson_cta: 'Gancho>Historia>Lección>CTA',
  problem_agitate_solve: 'Problema>Agitación>Solución', contrarian_proof_reframe: 'Contracorriente>Prueba>Giro',
  confession_insight_takeaway: 'Confesión>Aprendizaje>Conclusión', list_framework: 'Lista / Marco',
  problem_solution: 'Problema > Solución', story_lesson: 'Historia > Lección',
  before_after: 'Antes / Después', step_by_step: 'Paso a paso',
  myth_busting: 'Desmontar mitos', question_answer: 'Pregunta > Respuesta',
  observation_insight: 'Observación > Aprendizaje', prediction_vision: 'Predicción / Visión',
  motivational_manifesto: 'Motivacional', authority_framework: 'Autoridad > Marco',
  comparison: 'Comparativa', short_punchy: 'Corto y directo',
  long_form_essay: 'Ensayo largo', narrative_arc: 'Arco narrativo',
  content_with_cta: 'Contenido + CTA', data_driven: 'Basado en datos', other: 'Otra',
};

// Etiquetas SOLO para mostrar el content_type (el valor de la BD no se toca).
// Mismas que ContentTypeBreakdown.
const contentTypeLabels: Record<string, string> = {
  all: 'Todos',
  text: 'Texto',
  text_image: 'Texto + foto',
  text_carousel: 'Texto + carrusel',
  text_video: 'Texto + vídeo',
  text_document: 'Texto + documento',
  image: 'Solo foto',
  carousel: 'Solo carrusel',
  video: 'Solo vídeo',
  document: 'Solo documento',
  poll: 'Encuesta',
  article: 'Artículo',
};

const viralityDriverColors: Record<string, string> = {
  social_currency: '#fbbf24', controversy: '#f87171', identity: '#a78bfa',
  belonging: '#38bdf8', utility: '#34d399', emotion: '#f472b6', aspiration: '#22d3ee',
};

const toneLabels: Record<string, { label: string; emoji: string; desc: string }> = {
  urgency: { label: 'Urgencia', emoji: '🔥', desc: 'Prisa, escasez, "hazlo ya"' },
  authority: { label: 'Autoridad', emoji: '👑', desc: 'Experiencia, credenciales, resultados probados' },
  social_proof: { label: 'Prueba social', emoji: '👥', desc: 'Otros lo validan, tendencia, "todo el mundo"' },
  fomo: { label: 'FOMO', emoji: '😰', desc: 'Miedo a quedarse fuera, la competencia va por delante' },
  aspirational: { label: 'Aspiracional', emoji: '🚀', desc: 'Sueños, transformación, subir de nivel' },
  empathy: { label: 'Empatía', emoji: '🤝', desc: 'Entender el dolor, "yo también he pasado por ahí"' },
  provocative: { label: 'Provocador', emoji: '💣', desc: 'Opiniones fuertes, divide, "despierta"' },
  educational: { label: 'Educativo', emoji: '📚', desc: 'Enseñar, explicar, marcos' },
  vulnerable: { label: 'Vulnerable', emoji: '💔', desc: 'Fracaso, miedo, debilidad personal' },
  humorous: { label: 'Humor', emoji: '😂', desc: 'Chistes, ironía, reírse de uno mismo' },
  neutral: { label: 'Neutro', emoji: '📄', desc: 'Equilibrado, informativo' },
};

const toneColors: Record<string, string> = {
  urgency: '#f87171', authority: '#fbbf24', social_proof: '#a78bfa',
  fomo: '#fb923c', aspirational: '#34d399', empathy: '#38bdf8',
  provocative: '#e8935a', educational: '#6366f1', vulnerable: '#f472b6',
  humorous: '#22d3ee', neutral: '#4b5563',
};

const BASE = import.meta.env.VITE_API_URL || '';

export default function OutlierExplorer() {
  const { data, loading, error, refetch } = useApi<CrossCreatorData>('/api/analysis/cross-creators');
  const { data: creators } = useApi<Creator[]>('/api/creators');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [compareData, setCompareData] = useState<CompareData[] | null>(null);
  const [comparing, setComparing] = useState(false);
  const [contentTypeFilter, setContentTypeFilter] = useState<string>('all');
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefreshAnalysis = async () => {
    setRefreshing(true);
    try {
      // Clear chat AI cache so next chat call uses fresh outlier data
      await fetch(`${BASE}/api/chat/clear-cache`, { method: 'POST' });
      // Recompute patterns (already live, just re-fetches)
      refetch();
    } catch {}
    setRefreshing(false);
  };

  const contentTypes = useMemo(() => {
    if (!data) return [];
    const types = new Set(data.top_outliers.map((p) => p.content_type));
    return ['all', ...Array.from(types).sort()];
  }, [data]);

  const filteredOutliers = useMemo(() => {
    if (!data) return [];
    if (contentTypeFilter === 'all') return data.top_outliers;
    return data.top_outliers.filter((p) => p.content_type === contentTypeFilter);
  }, [data, contentTypeFilter]);

  const toggleCreator = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleCompare = async () => {
    if (selectedIds.length < 2) return;
    setComparing(true);
    try {
      const res = await fetch(`${BASE}/api/analysis/compare?ids=${selectedIds.join(',')}`);
      const json = await res.json();
      setCompareData(json);
    } catch {}
    setComparing(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Explorador de outliers</h1>
          <p className="text-text-secondary">El contenido que mejor funciona entre todos los creadores analizados.</p>
        </div>
        <button
          onClick={handleRefreshAnalysis}
          disabled={refreshing || loading}
          className="flex-shrink-0 px-4 py-2 bg-bg-card border border-border text-text-secondary text-sm rounded-lg hover:border-accent/40 hover:text-text-primary disabled:opacity-50 transition-colors mt-1"
          title="Recalcula los patrones y actualiza el contexto del chat de IA"
        >
          {refreshing ? 'Actualizando…' : '↻ Actualizar análisis'}
        </button>
      </div>

      {error && (
        <div className="bg-danger/10 border border-danger/30 rounded-lg p-4 text-danger text-sm">{error}</div>
      )}

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {data && (
        <>
          {/* Global patterns summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-bg-card rounded-lg p-4 text-center">
              <p className="text-text-muted text-xs mb-1">Outliers totales</p>
              <p className="text-2xl font-bold text-accent">{data.patterns.total_outliers}</p>
            </div>
            <div className="bg-bg-card rounded-lg p-4 text-center">
              <p className="text-text-muted text-xs mb-1">Palabras de media</p>
              <p className="text-2xl font-bold text-text-primary">{data.patterns.avg_word_count}</p>
            </div>
            <div className="bg-bg-card rounded-lg p-4 text-center">
              <p className="text-text-muted text-xs mb-1">Uso de CTA</p>
              <p className="text-2xl font-bold text-text-primary">{data.patterns.cta_rate}%</p>
            </div>
            <div className="bg-bg-card rounded-lg p-4 text-center">
              <p className="text-text-muted text-xs mb-1">Tipo más frecuente</p>
              <p className="text-2xl font-bold text-text-primary">
                {Object.entries(data.patterns.content_type_distribution)
                  .sort((a, b) => b[1] - a[1]).map(([t]) => contentTypeLabels[t] || t)[0] || '--'}
              </p>
            </div>
          </div>

          {/* Common traits of top outliers */}
          {data.patterns.common_traits && data.patterns.common_traits.length > 0 && (
            <div className="bg-bg-card rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-3">Qué tienen en común los mejores outliers</h3>
              <div className="flex flex-wrap gap-3">
                {data.patterns.common_traits.map((trait, i) => (
                  <span key={i} className="bg-accent/10 text-accent border border-accent/20 px-3 py-1.5 rounded-lg text-sm">
                    {trait}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* AI Text Pattern Analysis */}
          {data.patterns.text_patterns && (
            <div className="bg-bg-card rounded-xl p-6 border border-accent/20">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">🧠</span>
                <h3 className="text-lg font-semibold">Análisis de patrones del texto</h3>
              </div>
              <p className="text-text-muted text-xs mb-5">Patrones encontrados en el texto real de los posts outlier frente a los posts normales.</p>

              {/* Writing analysis summary */}
              {data.patterns.text_patterns.writing_analysis && (
                <div className="bg-accent/5 border border-accent/20 rounded-lg p-4 mb-5">
                  <div className="space-y-2">
                    {data.patterns.text_patterns.writing_analysis.split('\n\n').map((p, i) => (
                      <p key={i} className="text-sm text-text-secondary leading-relaxed">{p}</p>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Opening patterns */}
                {data.patterns.text_patterns.opening_patterns.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-text-secondary mb-3">Cómo abren los outliers</h4>
                    <div className="space-y-2">
                      {data.patterns.text_patterns.opening_patterns.slice(0, 6).map((p) => (
                        <div key={p.pattern} className="bg-bg-secondary rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-text-primary">{p.pattern}</span>
                            <span className="text-xs text-accent font-bold">{p.pct}%</span>
                          </div>
                          <div className="w-full bg-bg-primary rounded-full h-1.5 mb-2">
                            <div className="bg-accent h-full rounded-full" style={{ width: `${p.pct}%` }} />
                          </div>
                          {p.examples[0] && (
                            <p className="text-[10px] text-text-muted italic truncate">"{p.examples[0]}"</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Closing patterns */}
                {data.patterns.text_patterns.closing_patterns.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-text-secondary mb-3">Cómo cierran los outliers</h4>
                    <div className="space-y-2">
                      {data.patterns.text_patterns.closing_patterns.slice(0, 6).map((p) => (
                        <div key={p.pattern} className="bg-bg-secondary rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-text-primary">{p.pattern}</span>
                            <span className="text-xs text-success font-bold">{p.pct}%</span>
                          </div>
                          <div className="w-full bg-bg-primary rounded-full h-1.5 mb-2">
                            <div className="bg-success h-full rounded-full" style={{ width: `${p.pct}%` }} />
                          </div>
                          {p.examples[0] && (
                            <p className="text-[10px] text-text-muted italic truncate">"{p.examples[0]}"</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Recurring phrases + Semantic categories */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                {data.patterns.text_patterns.recurring_phrases.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-text-secondary mb-3">Frases recurrentes en los outliers</h4>
                    <div className="flex flex-wrap gap-2">
                      {data.patterns.text_patterns.recurring_phrases.map((p) => (
                        <span
                          key={p.phrase}
                          className="px-2.5 py-1 rounded-lg text-xs border"
                          style={{
                            borderColor: p.overindex > 2 ? '#e8935a' : '#374151',
                            color: p.overindex > 2 ? '#e8935a' : '#9ca3af',
                            backgroundColor: p.overindex > 2 ? '#e8935a15' : '#37415115',
                          }}
                          title={`${p.outlier_pct}% de los outliers frente a ${p.normal_pct}% de los normales (${p.overindex}x más frecuente)`}
                        >
                          "{p.phrase}" ({p.count}x)
                          {p.overindex > 2 && <span className="ml-1 font-bold">{p.overindex}x</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {data.patterns.text_patterns.semantic_categories && data.patterns.text_patterns.semantic_categories.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-text-secondary mb-3">Patrones de lenguaje: outliers frente a normales</h4>
                    <div className="space-y-2">
                      {data.patterns.text_patterns.semantic_categories.map((c) => {
                        const isHigher = c.diff_pct > 0;
                        return (
                          <div key={c.category} className="bg-bg-secondary rounded-lg p-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-text-primary">{c.label}</span>
                              <span className={`text-xs font-bold ${isHigher ? 'text-success' : c.diff_pct < -10 ? 'text-danger' : 'text-text-muted'}`}>
                                {isHigher ? '+' : ''}{c.diff_pct}%
                              </span>
                            </div>
                            <div className="flex gap-2 items-center">
                              <div className="flex-1">
                                <div className="flex gap-1 items-center text-[10px] text-text-muted">
                                  <span className="text-accent">Outlier: {c.outlier_density}/100 palabras</span>
                                  <span className="text-text-muted ml-2">Normal: {c.normal_density}/100 palabras</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Writing style comparison */}
              {data.patterns.text_patterns.formatting_style && (
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-text-secondary mb-3">Estilo de escritura: outliers frente a normales</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                    {[
                      { label: 'Palabras/post', o: data.patterns.text_patterns.formatting_style.avg_word_count.outlier, n: data.patterns.text_patterns.formatting_style.avg_word_count.normal },
                      { label: 'Palabras/frase', o: data.patterns.text_patterns.formatting_style.avg_sentence_length.outlier, n: data.patterns.text_patterns.formatting_style.avg_sentence_length.normal },
                      { label: 'Saltos de línea', o: data.patterns.text_patterns.formatting_style.avg_line_breaks.outlier, n: data.patterns.text_patterns.formatting_style.avg_line_breaks.normal },
                      { label: 'Usan emojis', o: data.patterns.text_patterns.formatting_style.emoji_rate.outlier, n: data.patterns.text_patterns.formatting_style.emoji_rate.normal, suffix: '%' },
                      { label: 'Usan hashtags', o: data.patterns.text_patterns.formatting_style.hashtag_rate.outlier, n: data.patterns.text_patterns.formatting_style.hashtag_rate.normal, suffix: '%' },
                      { label: 'Tienen preguntas', o: data.patterns.text_patterns.formatting_style.question_rate.outlier, n: data.patterns.text_patterns.formatting_style.question_rate.normal, suffix: '%' },
                    ].map((stat) => {
                      const diff = stat.n > 0 ? ((stat.o - stat.n) / stat.n) : 0;
                      const isHigher = stat.o > stat.n;
                      return (
                        <div key={stat.label} className="bg-bg-secondary rounded-lg p-3 text-center">
                          <p className="text-text-muted text-[10px] mb-1">{stat.label}</p>
                          <p className={`text-lg font-bold ${isHigher ? 'text-accent' : 'text-text-primary'}`}>
                            {stat.o}{stat.suffix || ''}
                          </p>
                          <p className="text-[10px] text-text-muted">
                            frente a {stat.n}{stat.suffix || ''} normal
                          </p>
                          {Math.abs(diff) > 0.1 && (
                            <p className={`text-[10px] font-bold ${isHigher ? 'text-success' : 'text-danger'}`}>
                              {isHigher ? '+' : ''}{Math.round(diff * 100)}%
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Hook type & Structure distribution across outliers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {data.patterns.hook_type_distribution && (
              <div className="bg-bg-card rounded-xl p-6">
                <h3 className="text-sm font-semibold mb-3 text-text-secondary">Tipos de gancho en los outliers</h3>
                <div className="space-y-2">
                  {Object.entries(data.patterns.hook_type_distribution)
                    .sort((a, b) => b[1] - a[1])
                    .map(([type, count]) => {
                      const total = Object.values(data.patterns.hook_type_distribution).reduce((s, v) => s + v, 0);
                      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                      return (
                        <div key={type} className="flex items-center gap-3">
                          <span className="text-xs text-text-secondary w-24 truncate">{hookLabels[type] || type}</span>
                          <div className="flex-1 bg-bg-secondary rounded-full h-4 overflow-hidden">
                            <div className="bg-accent h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-text-muted w-16 text-right">{count} ({pct}%)</span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
            {data.patterns.structure_distribution && (
              <div className="bg-bg-card rounded-xl p-6">
                <h3 className="text-sm font-semibold mb-3 text-text-secondary">Estructura de los posts outlier</h3>
                <div className="space-y-2">
                  {Object.entries(data.patterns.structure_distribution)
                    .sort((a, b) => b[1] - a[1])
                    .map(([structure, count]) => {
                      const total = Object.values(data.patterns.structure_distribution).reduce((s, v) => s + v, 0);
                      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                      return (
                        <div key={structure} className="flex items-center gap-3">
                          <span className="text-xs text-text-secondary w-28 truncate">{structLabels[structure] || structure}</span>
                          <div className="flex-1 bg-bg-secondary rounded-full h-4 overflow-hidden">
                            <div className="bg-success h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-text-muted w-16 text-right">{count} ({pct}%)</span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          {/* Text Psychology / Tone Analysis — Outliers vs Normal comparison */}
          {data.patterns.tone_comparison && data.patterns.tone_comparison.length > 0 && (
            <div className="bg-bg-card rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-1">Psicología del texto: outliers frente a normales</h3>
              <p className="text-text-muted text-xs mb-4">
                Compara los disparadores psicológicos de los posts outlier y los normales. Ordenado por interacciones de los outliers.
              </p>

              {/* Interpretation box */}
              {data.patterns.tone_interpretation && (
                <div className="bg-accent/5 border border-accent/20 rounded-lg p-4 mb-5">
                  <p className="text-sm text-text-secondary leading-relaxed">{data.patterns.tone_interpretation}</p>
                </div>
              )}

              {/* Neutral stat */}
              <div className="flex items-center gap-3 mb-5">
                <span className="text-text-muted text-xs">Tono neutro en los outliers:</span>
                <span className={`text-sm font-bold ${data.patterns.neutral_outlier_pct > 50 ? 'text-text-muted' : 'text-accent'}`}>
                  {data.patterns.neutral_outlier_pct}%
                </span>
                <span className="text-text-muted text-[10px]">
                  {data.patterns.neutral_outlier_pct > 50
                    ? '(pesa más el valor del contenido que los disparadores emocionales)'
                    : '(los disparadores emocionales tiran del rendimiento)'}
                </span>
              </div>

              {/* Comparative cards — sorted by outlier ratio */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.patterns.tone_comparison.map((t) => {
                  const info = toneLabels[t.tone] || { label: t.tone, emoji: '', desc: '' };
                  const color = toneColors[t.tone] || '#4b5563';
                  const maxRatio = Math.max(...data.patterns.tone_comparison.map((x) => x.outlier_avg_ratio || 0), 1);
                  const diff = t.outlier_pct - t.normal_pct;
                  return (
                    <div key={t.tone} className="bg-bg-secondary rounded-lg p-4 border border-border/50 hover:border-border transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">{info.emoji}</span>
                        <span className="font-semibold text-text-primary">{info.label}</span>
                        {diff !== 0 && (
                          <span className={`ml-auto text-[10px] font-bold ${diff > 0 ? 'text-success' : 'text-danger'}`}>
                            {diff > 0 ? '+' : ''}{diff} pp en outliers
                          </span>
                        )}
                      </div>

                      {/* Ratio bar (primary) */}
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex-1 bg-bg-primary rounded-full h-2.5 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, ((t.outlier_avg_ratio || 0) / maxRatio) * 100)}%`,
                              backgroundColor: color,
                            }}
                          />
                        </div>
                        <span className="text-sm font-bold text-text-primary">{t.outlier_avg_ratio || 0}x</span>
                      </div>

                      {/* Engagement as secondary */}
                      <p className="text-[10px] text-text-muted mb-2">
                        {t.outlier_avg_engagement.toLocaleString('es-ES')} interacciones de media
                      </p>

                      {/* Outlier vs Normal comparison */}
                      <div className="flex gap-4 text-[10px] mb-1">
                        <div>
                          <span className="text-accent">Outliers: </span>
                          <span className="text-text-secondary">{t.outlier_count} posts ({t.outlier_pct}%)</span>
                        </div>
                        <div>
                          <span className="text-text-muted">Normales: </span>
                          <span className="text-text-secondary">{t.normal_count} posts ({t.normal_pct}%)</span>
                        </div>
                      </div>

                      <p className="text-[10px] text-text-muted">{info.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Viral Archetypes — cross hook×structure×tone recipes */}
          {data.patterns.archetypes && data.patterns.archetypes.length > 0 && (
            <div className="bg-bg-card rounded-xl p-6 border border-accent/20">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">🧬</span>
                <h3 className="text-lg font-semibold">Arquetipos virales</h3>
              </div>
              <p className="text-text-muted text-xs mb-5">
                Recetas cruzadas: combinaciones de tipo de gancho + estructura + tono que generan más interacciones.
              </p>
              <div className="space-y-3">
                {data.patterns.archetypes.slice(0, 10).map((a, i) => (
                  <div key={a.archetype} className="bg-bg-secondary rounded-lg p-4 border border-border/50">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <span className="text-xs text-accent font-bold mr-2">#{i + 1}</span>
                        <span className="text-sm font-semibold text-text-primary">{a.label}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-accent">{a.avg_outlier_ratio}x</span>
                        <span className="text-[10px] text-text-muted ml-1">multiplicador medio</span>
                      </div>
                    </div>
                    <p className="text-xs text-text-secondary mb-2">{a.description}</p>
                    <div className="flex items-center gap-3 text-[10px] text-text-muted">
                      <span>{a.count} posts</span>
                      <span>{a.avg_engagement.toLocaleString('es-ES')} interacciones de media</span>
                    </div>
                    {a.example_hooks.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {a.example_hooks.map((h, j) => (
                          <p key={j} className="text-[10px] text-text-muted italic truncate">"{h}"</p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Best days and hours for outliers */}
          {data.patterns.outlier_timing && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Best days */}
              <div className="bg-bg-card rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-1">Mejores días para outliers</h3>
                <p className="text-text-muted text-xs mb-4">Días con más % de outliers entre todos los creadores (hora local de cada creador)</p>
                <div className="space-y-2">
                  {data.patterns.outlier_timing.best_days.map((d) => {
                    const maxRate = Math.max(...data.patterns.outlier_timing!.best_days.map((x) => x.outlier_rate), 1);
                    return (
                      <div key={d.day} className="flex items-center gap-3">
                        <span className="text-xs text-text-secondary w-20 font-medium">{d.day_name}</span>
                        <div className="flex-1 bg-bg-secondary rounded-full h-5 overflow-hidden relative">
                          <div
                            className="bg-accent h-full rounded-full transition-all"
                            style={{ width: `${(d.outlier_rate / maxRate) * 100}%` }}
                          />
                          <span className="absolute inset-0 flex items-center justify-center text-[10px] text-text-primary font-medium">
                            {d.outlier_rate}% de outliers
                          </span>
                        </div>
                        <span className="text-[10px] text-text-muted w-20 text-right">
                          {d.outliers}/{d.total_posts} posts
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Best hours */}
              <div className="bg-bg-card rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-1">Mejores horas para outliers</h3>
                <p className="text-text-muted text-xs mb-4">Horas con más % de outliers (hora local de cada creador). Las 10 mejores</p>
                <div className="space-y-2">
                  {data.patterns.outlier_timing.best_hours.slice(0, 10).map((h) => {
                    const maxRate = Math.max(...data.patterns.outlier_timing!.best_hours.slice(0, 10).map((x) => x.outlier_rate), 1);
                    return (
                      <div key={h.hour} className="flex items-center gap-3">
                        <span className="text-xs text-text-secondary w-14 font-mono font-medium">{h.hour_label}</span>
                        <div className="flex-1 bg-bg-secondary rounded-full h-5 overflow-hidden relative">
                          <div
                            className="bg-success h-full rounded-full transition-all"
                            style={{ width: `${(h.outlier_rate / maxRate) * 100}%` }}
                          />
                          <span className="absolute inset-0 flex items-center justify-center text-[10px] text-text-primary font-medium">
                            {h.outlier_rate}% de outliers
                          </span>
                        </div>
                        <div className="text-right w-24">
                          <span className="text-[10px] text-text-muted">{h.outliers}/{h.total_posts}</span>
                          {h.avg_outlier_ratio > 0 && (
                            <span className="text-[10px] text-accent ml-1">{h.avg_outlier_ratio}x</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Creator Comparison */}
          {creators && creators.length >= 2 && (
            <div className="bg-bg-card rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-3">Comparar creadores</h3>
              <div className="flex flex-wrap gap-2 mb-4">
                {creators.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => toggleCreator(c.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                      selectedIds.includes(c.id)
                        ? 'bg-accent/20 border-accent text-accent'
                        : 'bg-bg-secondary border-border text-text-secondary hover:border-accent/50'
                    }`}
                  >
                    {c.name || 'Desconocido'}
                  </button>
                ))}
              </div>
              <button
                onClick={handleCompare}
                disabled={selectedIds.length < 2 || comparing}
                className="px-4 py-2 bg-accent text-bg-primary rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-accent-light transition-colors"
              >
                {comparing ? 'Cargando...' : `Comparar ${selectedIds.length} creadores`}
              </button>

              {compareData && compareData.length >= 2 && (
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-text-secondary text-left border-b border-border">
                        <th className="pb-3 font-medium">Métrica</th>
                        {compareData.map((c) => (
                          <th key={c.id} className="pb-3 font-medium text-center">{c.name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: 'Seguidores', key: 'followers_count', fmt: (v: number) => v > 0 ? v.toLocaleString('es-ES') : 'N/D' },
                        { label: 'Posts totales', key: 'total_posts' },
                        { label: 'Outliers', key: 'total_outliers', accent: true },
                        { label: '% de outliers', key: 'outlier_rate', suffix: '%', accent: true },
                        { label: 'Interacciones medias', key: 'avg_engagement', fmt: (v: number) => v.toLocaleString('es-ES') },
                        { label: 'Mediana de interacciones', key: 'median_engagement', fmt: (v: number) => v.toLocaleString('es-ES') },
                        { label: 'Tasa de interacción', key: 'engagement_rate', suffix: '%' },
                        { label: 'Posts/semana', key: 'posts_per_week' },
                        { label: 'Comentarios/reacciones', key: 'avg_comment_like_ratio', fmt: (v: number) => `${Math.round(v * 100)}%` },
                        { label: 'Compartidos/reacciones', key: 'avg_share_like_ratio', fmt: (v: number) => `${Math.round(v * 100)}%` },
                      ].map((row) => {
                        const values = compareData.map((c) => (c as any)[row.key] as number);
                        const max = Math.max(...values);
                        return (
                          <tr key={row.key} className="border-b border-border/30">
                            <td className="py-2.5 text-text-secondary">{row.label}</td>
                            {compareData.map((c, i) => {
                              const val = values[i];
                              const isMax = val === max && max > 0;
                              const display = row.fmt ? row.fmt(val) : `${val}${row.suffix || ''}`;
                              return (
                                <td key={c.id} className={`py-2.5 text-center font-medium ${isMax ? (row.accent ? 'text-accent' : 'text-success') : 'text-text-primary'}`}>
                                  {display}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Top outliers grid */}
          {data.top_outliers.length === 0 ? (
            <div className="text-center py-16 text-text-muted">
              <p className="text-4xl mb-4">&#x1f50d;</p>
              <p>Aún no hay outliers. Añade primero algunos creadores desde el panel.</p>
            </div>
          ) : (
            <>
              {/* Visual distribution chart */}
              <OutlierContentTypeChart outliers={data.top_outliers} />

              {/* Header + filter */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <h2 className="text-xl font-bold">
                  Todos los outliers
                  <span className="text-text-muted text-sm font-normal ml-2">
                    ({filteredOutliers.length}{contentTypeFilter !== 'all' ? ` de ${data.top_outliers.length}` : ''})
                  </span>
                </h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-text-muted text-xs">Filtro:</span>
                  {contentTypes.map((type) => {
                    const count = type === 'all'
                      ? data.top_outliers.length
                      : data.top_outliers.filter((p) => p.content_type === type).length;
                    return (
                      <button
                        key={type}
                        onClick={() => setContentTypeFilter(type)}
                        className={`px-2.5 py-1 rounded text-xs transition-colors ${
                          contentTypeFilter === type
                            ? 'bg-accent/20 text-accent border border-accent/30'
                            : 'bg-bg-secondary text-text-muted border border-border hover:border-accent/30'
                        }`}
                      >
                        {contentTypeLabels[type] || type} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Outlier cards with deep analysis */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredOutliers.map((post) => (
                  <div key={post.id} className="flex flex-col">
                    {/*
                      Distingue las dos señales, que responden a preguntas
                      distintas: `is_outlier` es la ALERTA (destaco de verdad) y
                      `top_del_creador` es la INSPIRACION (lo mejor que hace esa
                      cuenta). Los posts que solo llevan la segunda son los que
                      ANTES NO SE VEIAN: cuentas tan consistentes que su mejor
                      post no llega al 3x sobre su propia media, como Adam Grant
                      (max/media 2,75x) o Lara Acosta (2,42x).
                    */}
                    {post.top_del_creador && !post.is_outlier && (
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-accent/15 text-accent">
                          TOP DE SU CUENTA
                        </span>
                        {post.percentil_creador != null && (
                          <span className="text-[9px] text-text-muted">
                            percentil {Math.round(post.percentil_creador * 100)} · cuenta muy consistente
                          </span>
                        )}
                      </div>
                    )}
                    <PostCard post={{ ...post, creator_image: post.creator_image ?? undefined }} />
                    {/* Deep analysis panel */}
                    {post.ai_explanation && (
                      <div className="bg-bg-card border-x border-b border-border rounded-b-xl -mt-3 pt-4 px-5 pb-4">
                        <button
                          onClick={() => setExpandedPost(expandedPost === post.id ? null : post.id)}
                          className="text-[11px] text-accent hover:text-accent-light transition-colors flex items-center gap-1 w-full"
                        >
                          <span>🧠</span>
                          <span>{expandedPost === post.id ? 'Ocultar análisis' : '¿Por qué funcionó?'}</span>
                          {post.ai_explanation.virality_driver && (
                            <span
                              className="ml-auto px-1.5 py-0.5 rounded text-[9px] font-bold"
                              style={{
                                backgroundColor: (viralityDriverColors[post.ai_explanation.virality_driver.driver] || '#4b5563') + '20',
                                color: viralityDriverColors[post.ai_explanation.virality_driver.driver] || '#4b5563',
                              }}
                            >
                              {post.ai_explanation.virality_driver.label}
                            </span>
                          )}
                        </button>
                        {expandedPost === post.id && (
                          <div className="mt-3 space-y-3">
                            {/* Summary */}
                            <p className="text-xs text-text-secondary leading-relaxed">
                              {post.ai_explanation.summary}
                            </p>

                            {/* Narrative mechanism */}
                            <div className="bg-bg-secondary rounded-lg p-3">
                              <p className="text-[10px] text-text-muted font-semibold mb-1">Mecanismo narrativo</p>
                              <p className="text-xs text-text-secondary">{post.ai_explanation.narrative_mechanism}</p>
                            </div>

                            {/* Hook tension */}
                            <div className="bg-bg-secondary rounded-lg p-3">
                              <p className="text-[10px] text-text-muted font-semibold mb-1">Tensión del gancho</p>
                              <p className="text-xs text-text-secondary">{post.ai_explanation.hook_tension}</p>
                            </div>

                            {/* Virality driver */}
                            <div className="bg-bg-secondary rounded-lg p-3">
                              <p className="text-[10px] text-text-muted font-semibold mb-1">
                                Motor de viralidad:
                                <span
                                  className="ml-1 px-1.5 py-0.5 rounded font-bold"
                                  style={{
                                    backgroundColor: (viralityDriverColors[post.ai_explanation.virality_driver.driver] || '#4b5563') + '20',
                                    color: viralityDriverColors[post.ai_explanation.virality_driver.driver] || '#4b5563',
                                  }}
                                >
                                  {post.ai_explanation.virality_driver.label}
                                </span>
                              </p>
                              <p className="text-xs text-text-secondary mt-1">{post.ai_explanation.virality_driver.explanation}</p>
                            </div>

                            {/* Comment driver */}
                            <div className="bg-bg-secondary rounded-lg p-3">
                              <p className="text-[10px] text-text-muted font-semibold mb-1">Por qué comenta la gente</p>
                              <p className="text-xs text-text-secondary">{post.ai_explanation.comment_driver}</p>
                            </div>

                            {/* Abstract template */}
                            <div className="bg-accent/5 border border-accent/20 rounded-lg p-3">
                              <p className="text-[10px] text-accent font-semibold mb-1">Plantilla replicable</p>
                              <p className="text-xs text-text-secondary font-mono">{post.ai_explanation.abstract_template}</p>
                            </div>

                            {/* Narrative rhythm */}
                            {post.narrative_rhythm && (
                              <div className="bg-bg-secondary rounded-lg p-3">
                                <p className="text-[10px] text-text-muted font-semibold mb-2">Ritmo narrativo</p>
                                <div className="grid grid-cols-3 gap-2 text-[10px]">
                                  <div>
                                    <span className="text-text-muted">Gancho: </span>
                                    <span className="text-text-secondary">{etiqueta(RITMO_LABELS, post.narrative_rhythm.hook_zone.style)}</span>
                                  </div>
                                  <div>
                                    <span className="text-text-muted">Cuerpo: </span>
                                    <span className="text-text-secondary">{etiqueta(RITMO_LABELS, post.narrative_rhythm.body.style)}</span>
                                  </div>
                                  <div>
                                    <span className="text-text-muted">Cierre: </span>
                                    <span className="text-text-secondary">{etiqueta(RITMO_LABELS, post.narrative_rhythm.closing.style)}</span>
                                  </div>
                                </div>
                                <div className="flex gap-3 mt-2 text-[10px] text-text-muted">
                                  <span>Frenos de scroll: {post.narrative_rhythm.scroll_stops}</span>
                                  <span>Variación de ritmo: {post.narrative_rhythm.sentence_rhythm.short_long_alternation}%</span>
                                  {post.narrative_rhythm.body.mini_hooks > 0 && <span>Miniganchos: {post.narrative_rhythm.body.mini_hooks}</span>}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
