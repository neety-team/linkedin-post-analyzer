import { useMemo, useState } from 'react';

const BASE = import.meta.env.VITE_API_URL || '';

interface MediaItem {
  type: 'image' | 'video' | 'document';
  url: string;
  thumbnail?: string;
}
interface MediaResult {
  content_type: string;
  items: MediaItem[];
  linkedin_url: string | null;
}

function MediaViewer({ postId, contentType }: { postId: string; contentType: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  const [media, setMedia] = useState<MediaResult | null>(null);
  const [active, setActive] = useState(0);
  const [imgErr, setImgErr] = useState<Record<number, boolean>>({});

  const load = async () => {
    setState('loading');
    try {
      const res = await fetch(`${BASE}/api/posts/post/${postId}/media`);
      if (!res.ok) throw new Error();
      const data: MediaResult = await res.json();
      setMedia(data);
      setState(data.items.length > 0 ? 'loaded' : 'error');
    } catch {
      setState('error');
    }
  };

  const typeIcon: Record<string, string> = { image: '🖼️', carousel: '📎', video: '🎥', document: '📄' };

  if (state === 'idle') return (
    <button onClick={load} className="text-[11px] text-accent hover:text-accent-strong border border-accent/30 px-2.5 py-1 rounded-lg transition-colors">
      {typeIcon[contentType] || '🖼️'} Ver creatividad
    </button>
  );
  if (state === 'loading') return <span className="text-[11px] text-text-muted animate-pulse">Cargando…</span>;
  if (state === 'error' || !media || media.items.length === 0) return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-text-muted">Enlace caducado</span>
      {media?.linkedin_url && (
        <a href={media.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-linkedin">ver en LinkedIn ↗</a>
      )}
    </div>
  );

  const item = media.items[active];
  return (
    <div className="space-y-2 mt-2">
      {item.type === 'video' ? (
        <video src={item.url} controls poster={item.thumbnail} className="max-h-64 rounded-lg object-contain bg-black" onError={() => setImgErr(e => ({ ...e, [active]: true }))} />
      ) : item.type === 'image' && !imgErr[active] ? (
        <img src={item.url} alt="" className="max-h-64 rounded-lg object-contain bg-bg-primary" onError={() => setImgErr(e => ({ ...e, [active]: true }))} />
      ) : item.type === 'document' ? (
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-accent border border-border px-3 py-2 rounded-lg block w-fit">📄 Abrir documento ↗</a>
      ) : (
        <span className="text-[11px] text-text-muted">Enlace caducado</span>
      )}
      {media.items.length > 1 && (
        <div className="flex gap-1 items-center">
          {media.items.map((_, i) => (
            <button key={i} onClick={() => setActive(i)} className={`w-2 h-2 rounded-full ${i === active ? 'bg-accent' : 'bg-border'}`} />
          ))}
          <span className="text-[10px] text-text-muted ml-1">{active + 1}/{media.items.length}</span>
        </div>
      )}
      <button onClick={() => setState('idle')} className="text-[10px] text-text-muted hover:text-text-secondary">Ocultar</button>
    </div>
  );
}

interface Post {
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
  hook_text: string | null;
  hook_type?: string;
  post_structure?: string;
  comment_like_ratio?: number;
  share_like_ratio?: number;
  post_url: string | null;
}

function getLinkedInUrl(post: Post): string | null {
  if (post.post_url) return post.post_url;
  if (post.linkedin_post_id) return `https://www.linkedin.com/feed/update/${post.linkedin_post_id}/`;
  return null;
}

function ratioBadge(ratio: number) {
  if (ratio >= 10) {
    return (
      <span className="bg-diamond/20 text-diamond px-2 py-0.5 rounded text-xs font-bold shadow-[0_0_8px_rgba(126,58,168,0.3)]">
        {ratio}x
      </span>
    );
  }
  if (ratio >= 3) {
    return (
      <span className="bg-accent/20 text-accent px-2 py-0.5 rounded text-xs font-bold">
        {ratio}x
      </span>
    );
  }
  return (
    <span className="bg-bg-hover text-text-muted px-2 py-0.5 rounded text-xs">
      {ratio}x
    </span>
  );
}

const hookLabels: Record<string, string> = {
  pattern_interrupt: 'Pattern Int.', belief_breaker: 'Belief Break',
  curiosity_gap: 'Curiosity Gap', data_shock: 'Data Shock', hot_take: 'Hot Take',
  personal_confession: 'Confession', story_opener: 'Story',
  hypothetical_question: 'Hypothetical', why_question: 'Why Q',
  how_question: 'How Q', direct_question: 'Direct Q',
  open_question: 'Open Q', rhetorical_question: 'Rhetorical Q',
  list_promise: 'List Promise', prediction: 'Prediction',
  how_to_framework: 'How-To', bold_claim: 'Bold Claim',
  common_mistake: 'Mistake', direct_callout: 'Callout',
  announcement: 'Announce', social_proof_opener: 'Social Proof',
  analogy: 'Analogy', contrarian_take: 'Contrarian', relatable_moment: 'Relatable',
  motivational: 'Motivational', observation: 'Observation', challenge: 'Challenge',
  other: '--',
};

const structLabels: Record<string, string> = {
  hook_list_cta: 'Hook>List>CTA', hook_story_lesson_cta: 'Story>Lesson>CTA',
  problem_agitate_solve: 'PAS', contrarian_proof_reframe: 'Contrarian>Reframe',
  confession_insight_takeaway: 'Confess>Insight', list_framework: 'List',
  problem_solution: 'Prob>Sol', story_lesson: 'Story>Lesson',
  before_after: 'Before/After', step_by_step: 'Step-by-Step',
  myth_busting: 'Myth Bust', question_answer: 'Q&A',
  observation_insight: 'Observation', prediction_vision: 'Prediction',
  motivational_manifesto: 'Motivational', authority_framework: 'Authority',
  comparison: 'Compare', short_punchy: 'Short',
  long_form_essay: 'Long', narrative_arc: 'Narrative',
  content_with_cta: 'Content+CTA', data_driven: 'Data', other: '--',
};

// Etiquetas EN ESPAÑOL solo para pintar en la tabla. `hookLabels` y
// `structLabels` (arriba) se quedan en inglés porque viajan como TAGS de la
// idea robada (igual que en Inspiration): cambiarlas partiría los tags ya
// guardados en la BD.
const hookLabelsEs: Record<string, string> = {
  pattern_interrupt: 'Rompe patrón', belief_breaker: 'Rompe creencias',
  curiosity_gap: 'Curiosidad', data_shock: 'Dato impacto', hot_take: 'Polémica',
  personal_confession: 'Confesión', story_opener: 'Historia',
  hypothetical_question: 'Hipotética', why_question: 'P. por qué',
  how_question: 'P. cómo', direct_question: 'P. directa',
  open_question: 'P. abierta', rhetorical_question: 'P. retórica',
  list_promise: 'Promesa lista', prediction: 'Predicción',
  how_to_framework: 'Cómo hacerlo', bold_claim: 'Afirmación',
  common_mistake: 'Error común', direct_callout: 'Interpelación',
  announcement: 'Anuncio', social_proof_opener: 'Prueba social',
  analogy: 'Analogía', contrarian_take: 'Contracorriente', relatable_moment: 'Identificable',
  motivational: 'Motivacional', observation: 'Observación', challenge: 'Reto',
  other: '--',
};

const structLabelsEs: Record<string, string> = {
  hook_list_cta: 'Gancho>Lista>CTA', hook_story_lesson_cta: 'Historia>Lección>CTA',
  problem_agitate_solve: 'PAS', contrarian_proof_reframe: 'Contracorriente>Giro',
  confession_insight_takeaway: 'Confesión>Aprendizaje', list_framework: 'Lista',
  problem_solution: 'Problema>Solución', story_lesson: 'Historia>Lección',
  before_after: 'Antes/Después', step_by_step: 'Paso a paso',
  myth_busting: 'Mitos', question_answer: 'Pregunta>Respuesta',
  observation_insight: 'Observación', prediction_vision: 'Predicción',
  motivational_manifesto: 'Motivacional', authority_framework: 'Autoridad',
  comparison: 'Comparativa', short_punchy: 'Corto',
  long_form_essay: 'Largo', narrative_arc: 'Narrativa',
  content_with_cta: 'Contenido+CTA', data_driven: 'Datos', other: '--',
};

interface Props {
  posts: Post[];
  title?: string;
  // Optional: creator name + headline so the saved idea carries attribution.
  // CreatorDetail passes these when rendering a single creator's posts.
  creatorName?: string | null;
  creatorHeadline?: string | null;
}

const TYPE_CONFIG: Record<string, { icon: string; label: string; color: string; hasMedia: boolean }> = {
  text:            { icon: '📝', label: 'Texto',           color: 'text-text-muted bg-bg-hover',      hasMedia: false },
  text_image:      { icon: '📝🖼️', label: 'Texto + foto',    color: 'text-blue-700 dark:text-blue-300 bg-blue-400/10',     hasMedia: true  },
  text_carousel:   { icon: '📝📎', label: 'Texto + carrusel', color: 'text-purple-700 dark:text-purple-300 bg-purple-400/10', hasMedia: true  },
  text_video:      { icon: '📝🎥', label: 'Texto + vídeo',   color: 'text-danger bg-danger/10',       hasMedia: true  },
  text_document:   { icon: '📝📄', label: 'Texto + documento',color: 'text-amber-700 dark:text-amber-300 bg-amber-400/10',   hasMedia: true  },
  image:           { icon: '🖼️', label: 'Solo foto',        color: 'text-blue-700 dark:text-blue-300 bg-blue-300/10',     hasMedia: true  },
  carousel:        { icon: '📎', label: 'Solo carrusel',    color: 'text-purple-700 dark:text-purple-300 bg-purple-300/10', hasMedia: true  },
  video:           { icon: '🎥', label: 'Solo vídeo',       color: 'text-danger bg-danger/10',       hasMedia: true  },
  document:        { icon: '📄', label: 'Solo documento',   color: 'text-amber-700 dark:text-amber-300 bg-amber-300/10',   hasMedia: true  },
  poll:            { icon: '📊', label: 'Encuesta',         color: 'text-success bg-success/10',   hasMedia: false },
  article:         { icon: '📰', label: 'Artículo',         color: 'text-cyan-700 dark:text-cyan-300 bg-cyan-400/10',     hasMedia: false },
};

const PREVIEW_CHARS = 300;

function ExpandableText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const needsTrunc = text.length > PREVIEW_CHARS;
  return (
    <div>
      <p className="text-text-primary text-sm whitespace-pre-wrap leading-relaxed">
        {expanded || !needsTrunc ? text : text.slice(0, PREVIEW_CHARS) + '…'}
      </p>
      {needsTrunc && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[11px] text-accent hover:text-accent-strong mt-1"
        >
          {expanded ? 'Ver menos ↑' : 'Ver más ↓'}
        </button>
      )}
    </div>
  );
}

export default function OutlierTable({ posts, title = 'Posts outlier', creatorName, creatorHeadline }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  // Track which posts have been saved as ideas in this session, plus per-row
  // pending state, so the button gives immediate feedback without needing
  // the parent to know.
  const [stolenIds, setStolenIds] = useState<Set<string>>(new Set());
  const [stealingId, setStealingId] = useState<string | null>(null);
  const [stealError, setStealError] = useState<string | null>(null);

  const handleSteal = async (post: Post) => {
    if (stolenIds.has(post.id)) return;
    setStealingId(post.id);
    setStealError(null);
    try {
      const hookLabel = hookLabels[post.hook_type || ''] || post.hook_type || '';
      const structLabel = structLabels[post.post_structure || ''] || post.post_structure || '';
      // Compose a self-explanatory raw_content with attribution + original
      // LinkedIn link at the top so when the idea opens in /ideas → Post
      // Creator the user remembers where it came from and can jump back to
      // the original post. Same shape the Inspiration page uses.
      const metaLines: string[] = [];
      if (creatorName) {
        metaLines.push(
          `From ${creatorName}${creatorHeadline ? ` — ${creatorHeadline}` : ''}${post.outlier_ratio ? ` · ${post.outlier_ratio}x outlier` : ''}`
        );
      }
      const linkedInUrl = getLinkedInUrl(post);
      if (linkedInUrl) metaLines.push(`Original: ${linkedInUrl}`);
      const meta = metaLines.length > 0 ? `${metaLines.join('\n')}\n\n` : '';
      const raw_content = `${meta}${post.content_text || ''}`.trim();
      if (!raw_content) {
        throw new Error('Post sin contenido');
      }
      const tags = ['stolen'];
      if (hookLabel) tags.push(hookLabel);
      if (structLabel) tags.push(structLabel);
      const res = await fetch(`${BASE}/api/ideas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raw_content,
          source_type: 'observation',
          tags,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Error ${res.status}`);
      }
      setStolenIds((prev) => new Set(prev).add(post.id));
    } catch (e: any) {
      setStealError(e.message || 'Error al guardar');
      // Surface the row so the user sees the inline error message
      setExpandedId(post.id);
    }
    setStealingId(null);
  };

  const typeCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of posts) {
      const t = p.content_type || 'text';
      map.set(t, (map.get(t) || 0) + 1);
    }
    return map;
  }, [posts]);

  const filterOptions = useMemo(
    () => ['all', ...Array.from(typeCounts.keys()).sort()],
    [typeCounts]
  );

  const filteredPosts = useMemo(
    () => (typeFilter === 'all' ? posts : posts.filter((p) => (p.content_type || 'text') === typeFilter)),
    [posts, typeFilter]
  );

  return (
    <div className="bg-bg-card rounded-xl p-6">
      <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
        <h3 className="text-lg font-semibold">
          {title}
          <span className="text-text-muted text-sm font-normal ml-2">
            ({filteredPosts.length}{typeFilter !== 'all' ? ` de ${posts.length}` : ''})
          </span>
        </h3>
        {filterOptions.length > 2 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-text-muted text-xs">Tipo:</span>
            {filterOptions.map((type) => {
              const cfg = type === 'all'
                ? { icon: '', label: 'Todos' }
                : TYPE_CONFIG[type] || { icon: '?', label: type };
              const count = type === 'all' ? posts.length : (typeCounts.get(type) || 0);
              return (
                <button
                  key={type}
                  onClick={() => setTypeFilter(type)}
                  className={`px-2.5 py-1 rounded text-xs transition-colors ${
                    typeFilter === type
                      ? 'bg-accent/20 text-accent border border-accent/30'
                      : 'bg-bg-secondary text-text-muted border border-border hover:border-accent/30'
                  }`}
                >
                  {cfg.icon && <span className="mr-1">{cfg.icon}</span>}
                  {cfg.label} ({count})
                </button>
              );
            })}
          </div>
        )}
      </div>
      {filteredPosts.length === 0 ? (
        <p className="text-text-muted">No hay posts que mostrar.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-text-secondary text-left border-b border-border">
                <th className="pb-3 font-medium">Fecha</th>
                <th className="pb-3 font-medium">Gancho</th>
                <th className="pb-3 font-medium">Tipo de gancho</th>
                <th className="pb-3 font-medium">Estructura</th>
                <th className="pb-3 font-medium">Tipo</th>
                <th className="pb-3 font-medium text-right">Reacciones</th>
                <th className="pb-3 font-medium text-right">Comentarios</th>
                <th className="pb-3 font-medium text-right">Compartidos</th>
                <th className="pb-3 font-medium text-right">Puntuación</th>
                <th className="pb-3 font-medium text-right">Multiplicador</th>
                <th className="pb-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filteredPosts.map((post) => (
                <>
                  <tr
                    key={post.id}
                    className="border-b border-border/50 hover:bg-bg-hover cursor-pointer transition-colors"
                    onClick={() => setExpandedId(expandedId === post.id ? null : post.id)}
                  >
                    <td className="py-3 whitespace-nowrap text-text-secondary">
                      {post.published_at ? new Date(post.published_at).toLocaleDateString('es-ES', { month: 'short', day: 'numeric', year: 'numeric' }) : '--'}
                    </td>
                    <td className="py-3 max-w-[250px] truncate" title={post.hook_text || ''}>
                      {post.hook_text || '--'}
                    </td>
                    <td className="py-3 whitespace-nowrap">
                      <span className="text-xs text-text-muted bg-bg-secondary px-1.5 py-0.5 rounded">
                        {hookLabelsEs[post.hook_type || ''] || post.hook_type || '--'}
                      </span>
                    </td>
                    <td className="py-3 whitespace-nowrap">
                      <span className="text-xs text-text-muted bg-bg-secondary px-1.5 py-0.5 rounded">
                        {structLabelsEs[post.post_structure || ''] || post.post_structure || '--'}
                      </span>
                    </td>
                    <td className="py-3">
                      {(() => {
                        const cfg = TYPE_CONFIG[post.content_type] || { icon: '?', label: post.content_type, color: 'text-text-muted bg-bg-hover', hasMedia: false };
                        return (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${cfg.color}`}>
                            <span>{cfg.icon}</span>
                            <span className="hidden sm:inline">{cfg.label}</span>
                          </span>
                        );
                      })()}
                    </td>
                    <td className="py-3 text-right tabular-nums">{post.likes_count.toLocaleString('es-ES')}</td>
                    <td className="py-3 text-right tabular-nums">{post.comments_count.toLocaleString('es-ES')}</td>
                    <td className="py-3 text-right tabular-nums">{post.reposts_count.toLocaleString('es-ES')}</td>
                    <td className="py-3 text-right tabular-nums font-medium text-accent">{post.engagement_score.toLocaleString('es-ES')}</td>
                    <td className="py-3 text-right">
                      {post.outlier_ratio > 0 && ratioBadge(post.outlier_ratio)}
                    </td>
                    <td className="py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {getLinkedInUrl(post) && (
                          <a
                            href={getLinkedInUrl(post)!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent hover:text-accent-strong text-xs"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Ver
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSteal(post);
                          }}
                          disabled={stealingId === post.id || stolenIds.has(post.id) || !post.content_text}
                          title={
                            !post.content_text
                              ? 'Post sin contenido'
                              : stolenIds.has(post.id)
                              ? 'Ya está en Ideas'
                              : 'Guardar como idea para usar en Post Creator'
                          }
                          className={`text-xs px-2 py-1 rounded border transition-colors ${
                            stolenIds.has(post.id)
                              ? 'border-success/30 bg-success/10 text-success cursor-default'
                              : 'border-accent/30 text-accent hover:bg-accent/10 disabled:opacity-40 disabled:cursor-not-allowed'
                          }`}
                        >
                          {stolenIds.has(post.id)
                            ? '✓ Guardado'
                            : stealingId === post.id
                            ? '…'
                            : '🔥 Robar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedId === post.id && (
                    <tr key={`${post.id}-expanded`}>
                      <td colSpan={11} className="bg-bg-secondary p-4">
                        <div className="flex gap-4 mb-3 text-xs text-text-muted">
                          {post.comment_like_ratio != null && post.comment_like_ratio > 0 && (
                            <span>Comentarios/reacciones: {Math.round(post.comment_like_ratio * 100)}%</span>
                          )}
                          {post.share_like_ratio != null && post.share_like_ratio > 0 && (
                            <span>Compartidos/reacciones: {Math.round(post.share_like_ratio * 100)}%</span>
                          )}
                        </div>
                        <ExpandableText text={post.content_text || 'Sin contenido'} />
                        {TYPE_CONFIG[post.content_type]?.hasMedia && (
                          <div className="mt-3">
                            <MediaViewer postId={post.id} contentType={post.content_type} />
                          </div>
                        )}
                        {stealError && (
                          <div className="mt-3 text-xs text-danger bg-danger/10 border border-danger/30 rounded px-2.5 py-1.5">
                            {stealError}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
