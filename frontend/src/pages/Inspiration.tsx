import { useState, useMemo, useEffect } from 'react';
import FilterSelect from '../components/inspiration/FilterSelect';
import { useApi } from '../hooks/useApi';
import GenerateTab from '../components/inspiration/GenerateTab';
import MediaViewer, { NO_MEDIA_TYPES } from '../components/MediaViewer';

type InspirationTab = 'steal' | 'generate';

const BASE = import.meta.env.VITE_API_URL || '';

interface OutlierPost {
  id: string;
  content_text: string;
  hook_text: string | null;
  hook_type: string;
  post_structure: string;
  text_tone: string;
  content_type: string;
  outlier_ratio: number;
  engagement_score: number;
  likes_count: number;
  comments_count: number;
  reposts_count: number;
  published_at: string | null;
  post_url: string | null;
  topic: string | null;
  reaction_mix: Record<string, number> | null;
  creator_name: string;
  creator_headline: string | null;
  creator_image: string | null;
  creator_followers: number;
}

// Reaction types as LinkedIn names them internally (confirmed from the live
// API: the reaction's `value` is LIKE / PRAISE / APPRECIATION / EMPATHY /
// INTEREST / ENTERTAINMENT / MAYBE). Mapped to display label + emoji + colour.
// Legacy/alias keys (CELEBRATE, SUPPORT, LOVE, INSIGHTFUL, FUNNY) kept so old
// data or any renamed variant still renders. UNKNOWN/total/sampled filtered out.
const REACTION_META: { key: string; emoji: string; label: string; color: string }[] = [
  { key: 'LIKE', emoji: '👍', label: 'Recomendar', color: '#4a90d9' },
  { key: 'PRAISE', emoji: '👏', label: 'Celebrar', color: '#34d399' },
  { key: 'CELEBRATE', emoji: '👏', label: 'Celebrar', color: '#34d399' },
  // APPRECIATION = Apoyar (support) y EMPATHY = Me encanta (love): mismo mapa
  // que backend/src/services/unipile.ts (LINKEDIN_REACTION_VALUE_MAP).
  { key: 'APPRECIATION', emoji: '🫶', label: 'Apoyar', color: '#a78bfa' },
  { key: 'SUPPORT', emoji: '🫶', label: 'Apoyar', color: '#a78bfa' },
  { key: 'EMPATHY', emoji: '❤️', label: 'Me encanta', color: '#f87171' },
  { key: 'LOVE', emoji: '❤️', label: 'Me encanta', color: '#f87171' },
  { key: 'INTEREST', emoji: '💡', label: 'Interesante', color: '#fbbf24' },
  { key: 'INSIGHTFUL', emoji: '💡', label: 'Interesante', color: '#fbbf24' },
  { key: 'ENTERTAINMENT', emoji: '😂', label: 'Divertido', color: '#e8935a' },
  { key: 'FUNNY', emoji: '😂', label: 'Divertido', color: '#e8935a' },
];

// % of reactions that are "funny" (ENTERTAINMENT + FUNNY alias). The meme signal.
function funnyPct(mix: Record<string, number> | null): number | null {
  if (!mix) return null;
  const total = Number(mix.total) || Object.entries(mix)
    .filter(([k]) => !['total', 'sampled'].includes(k))
    .reduce((s, [, v]) => s + (Number(v) || 0), 0);
  if (!total) return null;
  const funny = (Number(mix.FUNNY) || 0) + (Number(mix.ENTERTAINMENT) || 0);
  return funny / total;
}

// La señal del LEAD MAGNET, análoga al % de risa del meme: es comment-gated, así
// que recibe MUCHÍSIMOS más comentarios que reacciones (la gente comenta la
// palabra para pillar el recurso, no da like). Lo normal es comentarios ≪
// reacciones; los lead magnets de Martín Arosa/Guillermo/Luna Chen tienen 3-37x más
// comentarios que likes (Luna: 9.631 com / 2.999 likes). Ratio > 1 = comment-gated.
function commentGatedRatio(p: { comments_count: number; likes_count: number }): number {
  const r = p.likes_count || 0;
  // Pisos: pocos comentarios o pocas reacciones no son señal fiable de nada.
  if (p.comments_count < 100 || r < 20) return 0;
  return p.comments_count / r;
}
const LEADMAGNET_RATIO_THRESHOLD = 1.0;

interface InspirationData {
  outliers: OutlierPost[];
  total: number;
}

const HOOK_LABELS: Record<string, string> = {
  pattern_interrupt: 'Ruptura de patrón', belief_breaker: 'Rompe creencias',
  curiosity_gap: 'Hueco de curiosidad', data_shock: 'Dato impactante', hot_take: 'Opinión polémica',
  personal_confession: 'Confesión personal', story_opener: 'Arranque de historia',
  hypothetical_question: 'Pregunta hipotética', why_question: 'Pregunta «por qué»',
  how_question: 'Pregunta «cómo»', direct_question: 'Pregunta directa',
  bold_claim: 'Afirmación rotunda', common_mistake: 'Error común',
  direct_callout: 'Interpelación directa', list_promise: 'Promesa de lista',
  contrarian_take: 'A contracorriente', relatable_moment: 'Momento reconocible',
  motivational: 'Motivacional', observation: 'Observación', other: 'Otro',
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
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

const STRUCT_LABELS: Record<string, string> = {
  hook_list_cta: 'Gancho → Lista → CTA', hook_story_lesson_cta: 'Historia → Lección → CTA',
  problem_agitate_solve: 'Problema → Agitación → Solución',
  contrarian_proof_reframe: 'A contracorriente → Prueba → Reencuadre',
  confession_insight_takeaway: 'Confesión → Revelación → Conclusión',
  list_framework: 'Lista / método', problem_solution: 'Problema → Solución',
  story_lesson: 'Historia → Lección', before_after: 'Antes / Después',
  step_by_step: 'Paso a paso', myth_busting: 'Desmontar mitos',
  short_punchy: 'Corto y directo', long_form_essay: 'Ensayo largo',
  data_driven: 'Basado en datos', other: 'Otra',
};

// Solo para mostrar: el valor de la BD (text_tone) no se toca.
const TONE_LABELS: Record<string, string> = {
  educational: 'Educativo', aspirational: 'Aspiracional', provocative: 'Provocador',
  vulnerable: 'Vulnerable', empathy: 'Empatía', urgency: 'Urgencia',
  authority: 'Autoridad', social_proof: 'Prueba social', fomo: 'FOMO',
  humorous: 'Humor', neutral: 'Neutro',
};

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// Horizontal stacked bar of the reaction distribution + a leading "😂 NN%"
// when the funny share is meaningful. Collapses duplicate reaction families
// (EMPATHY→Love, INTEREST→Insightful, ENTERTAINMENT→Funny) so the bar reads
// cleanly. Returns null when there's no usable mix.
function ReactionMixBar({ mix }: { mix: Record<string, number> | null }) {
  if (!mix) return null;
  // Sum into display families, in REACTION_META order.
  const families = new Map<string, { emoji: string; label: string; color: string; count: number }>();
  for (const meta of REACTION_META) {
    const c = Number(mix[meta.key]) || 0;
    if (c <= 0) continue;
    const existing = families.get(meta.label);
    if (existing) existing.count += c;
    else families.set(meta.label, { emoji: meta.emoji, label: meta.label, color: meta.color, count: c });
  }
  const segments = Array.from(families.values());
  const total = segments.reduce((s, x) => s + x.count, 0);
  if (total === 0) return null;

  const fp = funnyPct(mix) ?? 0;
  const isMeme = fp > 0.25;

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-text-muted">Reacciones ({total})</span>
        {fp > 0.05 && (
          <span className={`text-[10px] font-semibold ${isMeme ? 'text-orange-300' : 'text-text-muted'}`}>
            😂 {Math.round(fp * 100)}%{isMeme && ' · meme'}
          </span>
        )}
      </div>
      <div className="flex h-2 rounded-full overflow-hidden bg-bg-secondary">
        {segments.map((s) => (
          <div
            key={s.label}
            style={{ width: `${(s.count / total) * 100}%`, backgroundColor: s.color }}
            title={`${s.emoji} ${s.label}: ${s.count} (${Math.round((s.count / total) * 100)}%)`}
          />
        ))}
      </div>
    </div>
  );
}

function OutlierCard({ post, onSteal }: { post: OutlierPost; onSteal: (post: OutlierPost) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [stolen, setStolen] = useState(false);
  const [saving, setSaving] = useState(false);

  const text = post.content_text || '';
  const needsTrunc = text.length > 300;

  const handleSteal = async () => {
    setSaving(true);
    try {
      await onSteal(post);
      setStolen(true);
    } catch {}
    setSaving(false);
  };

  return (
    <div className={`bg-bg-card border rounded-xl p-5 transition-all ${stolen ? 'border-green-400/30 opacity-60' : 'border-border hover:border-accent/30'}`}>
      {/* Creator + ratio header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {post.creator_image ? (
            <img src={post.creator_image} alt="" className="w-8 h-8 rounded-full flex-shrink-0 object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-bg-secondary flex items-center justify-center text-xs text-text-muted flex-shrink-0">
              {(post.creator_name || '?')[0]}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">{post.creator_name}</p>
            <p className="text-[10px] text-text-muted truncate">{formatNum(post.creator_followers)} seguidores</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-lg font-bold text-accent tabular-nums">{post.outlier_ratio.toFixed(1)}x</span>
        </div>
      </div>

      {/* Hook highlight */}
      {post.hook_text && (
        <p className="text-text-primary font-medium text-sm leading-snug mb-2 border-l-2 border-accent/40 pl-3">
          {post.hook_text}
        </p>
      )}

      {/* Post text preview */}
      <div className="mb-3">
        <p className="text-text-secondary text-xs leading-relaxed whitespace-pre-wrap">
          {expanded || !needsTrunc ? text : text.slice(0, 300) + '…'}
        </p>
        {needsTrunc && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[11px] text-accent hover:text-accent-light mt-1"
          >
            {expanded ? 'Ver menos ↑' : 'Ver más ↓'}
          </button>
        )}
      </div>

      {/* Tags: topic + hook type + structure */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {post.topic && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-400 font-semibold">
            📂 {post.topic}
          </span>
        )}
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
          {HOOK_LABELS[post.hook_type] || post.hook_type}
        </span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-400/10 text-purple-400 font-medium">
          {STRUCT_LABELS[post.post_structure] || post.post_structure}
        </span>
        {post.text_tone && post.text_tone !== 'other' && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-bg-secondary text-text-muted">
            {TONE_LABELS[post.text_tone] || post.text_tone}
          </span>
        )}
      </div>

      {/* Engagement stats */}
      <div className="flex items-center gap-4 text-[11px] text-text-muted mb-3">
        <span>👍 {formatNum(post.likes_count)}</span>
        <span>💬 {formatNum(post.comments_count)}</span>
        <span>🔁 {formatNum(post.reposts_count)}</span>
        {commentGatedRatio(post) > LEADMAGNET_RATIO_THRESHOLD && (
          <span
            className="text-[10px] font-semibold text-orange-300"
            title="Comentarios muy por encima de las reacciones: es un lead magnet (la gente comenta la palabra para pillar el recurso)"
          >
            💬 lead magnet · {commentGatedRatio(post).toFixed(1)}x
          </span>
        )}
        {post.post_url && (
          <a href={post.post_url} target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent-light ml-auto">
            Ver en LinkedIn ↗
          </a>
        )}
      </div>

      {/* Reaction mix — how the audience actually reacted. The funny share
          drives the meme detection; the bar shows the full distribution so
          you can see at a glance whether a post landed as funny / insightful
          / celebratory / etc. Only rendered when we have the data. */}
      <ReactionMixBar mix={post.reaction_mix} />

      {!NO_MEDIA_TYPES.has(post.content_type) && (
        <div className="mb-3">
          <MediaViewer postId={post.id} contentType={post.content_type} linkedinUrl={post.post_url} />
        </div>
      )}

      {/* Steal button */}
      <button
        onClick={handleSteal}
        disabled={saving || stolen}
        className={`w-full py-2 rounded-lg text-xs font-medium transition-colors ${
          stolen
            ? 'bg-green-500/15 text-green-400 cursor-default'
            : 'bg-accent text-bg-primary hover:bg-accent-light disabled:opacity-50'
        }`}
      >
        {stolen ? '✓ Guardado en Ideas' : saving ? 'Guardando…' : '🔥 Robar este post'}
      </button>
    </div>
  );
}

export default function Inspiration() {
  const { data, loading, error, refetch } = useApi<InspirationData>('/api/ideas/inspiration');
  const [sortBy, setSortBy] = useState<'ratio' | 'likes' | 'comments' | 'recent'>('ratio');
  const [filterHook, setFilterHook] = useState('');
  const [filterStructure, setFilterStructure] = useState('');
  const [filterCreator, setFilterCreator] = useState('');
  const [filterTopic, setFilterTopic] = useState('');
  const [filterContentType, setFilterContentType] = useState('');
  // "Solo memes" toggle — posts whose reaction mix is >25% funny. The
  // audience-driven meme signal, independent of the AI topic classifier.
  const [onlyMemes, setOnlyMemes] = useState(false);
  const MEME_FUNNY_THRESHOLD = 0.25;
  // "Solo lead magnets" — posts con los comentarios disparados respecto a las
  // reacciones (comment-gated). El equivalente al filtro de memes, pero para el
  // pilar de lead magnet. Signo de la audiencia, no del clasificador.
  const [onlyLeadMagnets, setOnlyLeadMagnets] = useState(false);
  // Free-text search across hook + content + creator name. Case-insensitive
  // substring match — supports finding things like "CLAUDE", "outbound", etc.
  // across the whole corpus regardless of how the AI classified the topic.
  const [searchQuery, setSearchQuery] = useState('');
  const [tab, setTab] = useState<InspirationTab>('steal');
  const [, setStolenIds] = useState<Set<string>>(new Set());
  const [classifying, setClassifying] = useState(false);
  const [classifyResult, setClassifyResult] = useState<string | null>(null);
  const [reclassifyScope, setReclassifyScope] = useState<'images' | 'all'>('images');
  // Panel de mantenimiento: clasificador y backfill del reaction mix. Cerrado
  // por defecto porque son operaciones de administración, no de uso diario.
  const [showMaint, setShowMaint] = useState(false);

  // Reaction-mix backfill — separate flow from the Claude-based topic
  // classifier. Pulls reactions per outlier from the dedicated Unipile
  // scraper account, computes the type distribution, and lets us detect
  // memes via funny_pct instead of asking Sonnet to read the text.
  const [mixStatus, setMixStatus] = useState<{
    running: boolean;
    processed: number;
    failed: number;
    total: number;
    outliers_with_mix: number;
    outliers_total: number;
    outliers_permanently_failed: number;
    errors_by_status: Record<string, number>;
    last_error: string | null;
  } | null>(null);
  const [mixStarting, setMixStarting] = useState(false);

  // Poll the backfill status every 3s while a run is in flight, otherwise
  // every 30s just to keep the summary fresh.
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch(`${BASE}/api/reactions/backfill/status`);
        const json = await res.json();
        if (cancelled) return;
        setMixStatus({
          running: json.progress.running,
          processed: json.progress.processed,
          failed: json.progress.failed,
          total: json.progress.total,
          outliers_with_mix: json.summary.outliers_with_mix,
          outliers_total: json.summary.outliers_total,
          outliers_permanently_failed: json.summary.outliers_permanently_failed || 0,
          errors_by_status: json.progress.errors_by_status || {},
          last_error: json.progress.last_error,
        });
      } catch { /* ignore */ }
    };
    tick();
    const interval = mixStatus?.running ? 3000 : 30000;
    const id = setInterval(tick, interval);
    return () => { cancelled = true; clearInterval(id); };
  }, [mixStatus?.running]);

  const handleStartMixBackfill = async () => {
    setMixStarting(true);
    try {
      const res = await fetch(`${BASE}/api/reactions/backfill/start`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok || json.started === false) {
        alert(`No se pudo arrancar: ${json.reason || json.error || 'desconocido'}`);
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setMixStarting(false);
    }
  };

  const outliers = data?.outliers || [];
  const unclassifiedCount = outliers.filter((p) => !p.topic).length;

  const hookTypes = useMemo(() => {
    const counts = new Map<string, number>();
    outliers.forEach((p) => counts.set(p.hook_type, (counts.get(p.hook_type) || 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [outliers]);

  const structureTypes = useMemo(() => {
    const counts = new Map<string, number>();
    outliers.forEach((p) => counts.set(p.post_structure, (counts.get(p.post_structure) || 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [outliers]);

  // Con contador, como el resto de filtros: el desplegable enseña cuántos
  // outliers tiene cada creador, que es justo lo que quieres saber al elegirlo.
  const creators = useMemo(() => {
    const counts = new Map<string, number>();
    outliers.forEach((p) => counts.set(p.creator_name, (counts.get(p.creator_name) || 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [outliers]);

  const topics = useMemo(() => {
    const counts = new Map<string, number>();
    outliers.forEach((p) => { if (p.topic) counts.set(p.topic, (counts.get(p.topic) || 0) + 1); });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [outliers]);

  // Los contadores por formato se calculan sobre el universo que el usuario
  // está mirando: si "Solo memes" está activo, cuentan SOLO memes. Antes se
  // calculaban siempre sobre todos los outliers, así que al filtrar memes los
  // números de las chips seguían siendo los globales y no cuadraban con la lista.
  const contentTypes = useMemo(() => {
    const universo = outliers.filter((p) =>
      (!onlyMemes || (funnyPct(p.reaction_mix) ?? 0) > MEME_FUNNY_THRESHOLD) &&
      (!onlyLeadMagnets || commentGatedRatio(p) > LEADMAGNET_RATIO_THRESHOLD)
    );
    const counts = new Map<string, number>();
    universo.forEach((p) => counts.set(p.content_type || 'text', (counts.get(p.content_type || 'text') || 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [outliers, onlyMemes, onlyLeadMagnets]);

  const filtered = useMemo(() => {
    let list = [...outliers];
    if (filterTopic) list = list.filter((p) => p.topic === filterTopic);
    if (filterHook) list = list.filter((p) => p.hook_type === filterHook);
    if (filterStructure) list = list.filter((p) => p.post_structure === filterStructure);
    if (filterCreator) list = list.filter((p) => p.creator_name === filterCreator);
    if (filterContentType) list = list.filter((p) => (p.content_type || 'text') === filterContentType);
    if (onlyMemes) list = list.filter((p) => (funnyPct(p.reaction_mix) ?? 0) > MEME_FUNNY_THRESHOLD);
    if (onlyLeadMagnets) list = list.filter((p) => commentGatedRatio(p) > LEADMAGNET_RATIO_THRESHOLD);

    // Free-text search: case-insensitive substring across content + hook + creator.
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => {
        const haystack = [p.content_text, p.hook_text, p.creator_name]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      });
    }

    switch (sortBy) {
      case 'likes': list.sort((a, b) => b.likes_count - a.likes_count); break;
      case 'comments': list.sort((a, b) => b.comments_count - a.comments_count); break;
      case 'recent': list.sort((a, b) => new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime()); break;
      default: list.sort((a, b) => b.outlier_ratio - a.outlier_ratio);
    }
    return list;
  }, [outliers, filterTopic, filterHook, filterStructure, filterCreator, filterContentType, onlyMemes, onlyLeadMagnets, sortBy, searchQuery]);

  // How many outliers cross the meme threshold — drives the toggle label.
  const memeCount = useMemo(
    () => outliers.filter((p) => (funnyPct(p.reaction_mix) ?? 0) > MEME_FUNNY_THRESHOLD).length,
    [outliers]
  );
  // Cuántos outliers son lead magnets (comentarios disparados) — etiqueta del toggle.
  const leadMagnetCount = useMemo(
    () => outliers.filter((p) => commentGatedRatio(p) > LEADMAGNET_RATIO_THRESHOLD).length,
    [outliers]
  );

  const handleClassify = async () => {
    setClassifying(true);
    setClassifyResult(null);
    try {
      const res = await fetch(`${BASE}/api/ideas/inspiration/classify`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { setClassifyResult(`Error: ${data.error}`); return; }
      let msg = `Clasificados ${data.classified} de ${data.total} posts`;
      if (data.failed_batches > 0) msg += ` · ⚠️ ${data.failed_batches} lote(s) fallido(s): ${data.errors?.[0]?.error || 'mira los logs del backend'}`;
      setClassifyResult(msg);
      refetch();
    } catch (e: any) {
      setClassifyResult(`Error: ${e.message}`);
    } finally {
      setClassifying(false);
    }
  };

  // Reset + re-classify in one go. Image scope only touches text_image/image
  // posts (the meme candidates); "all" nukes every classified topic and
  // re-tags the whole corpus from scratch. Confirms "all" because it costs
  // an LLM call per ~30 posts.
  const handleReclassify = async () => {
    if (reclassifyScope === 'all' && !window.confirm('Esto borra TODOS los temas y vuelve a clasificar cada outlier (gasta llamadas a la API). ¿Continuar?')) {
      return;
    }
    setClassifying(true);
    setClassifyResult(null);
    try {
      const body = reclassifyScope === 'images' ? { content_types: ['text_image', 'image'] } : {};
      const resetRes = await fetch(`${BASE}/api/ideas/inspiration/reset-topics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const resetData = await resetRes.json();
      if (!resetRes.ok) { setClassifyResult(`Error al reiniciar: ${resetData.error}`); return; }
      setClassifyResult(`${resetData.reset} temas reiniciados… clasificando…`);

      const res = await fetch(`${BASE}/api/ideas/inspiration/classify`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { setClassifyResult(`Error al clasificar: ${data.error}`); return; }
      let msg = `${resetData.reset} reiniciados · ${data.classified} de ${data.total} reclasificados`;
      if (data.failed_batches > 0) msg += ` · ⚠️ ${data.failed_batches} lote(s) fallido(s): ${data.errors?.[0]?.error || 'mira los logs'}`;
      setClassifyResult(msg);
      refetch();
    } catch (e: any) {
      setClassifyResult(`Error: ${e.message}`);
    } finally {
      setClassifying(false);
    }
  };

  const handleSteal = async (post: OutlierPost) => {
    const hookLabel = HOOK_LABELS[post.hook_type] || post.hook_type;
    const structLabel = STRUCT_LABELS[post.post_structure] || post.post_structure;

    // Build raw_content with attribution + original LinkedIn link at the top
    // so the idea always carries its source. The improver and Post Creator
    // ignore the meta lines (they're labelled), but the user sees them in
    // /ideas and can jump back to the original post.
    const metaLines: string[] = [];
    metaLines.push(
      `From ${post.creator_name}${post.creator_headline ? ` — ${post.creator_headline}` : ''}${post.outlier_ratio ? ` · ${post.outlier_ratio}x outlier` : ''}`
    );
    if (post.post_url) metaLines.push(`Original: ${post.post_url}`);
    const raw_content = `${metaLines.join('\n')}\n\n${post.content_text || ''}`.trim();

    await fetch(`${BASE}/api/ideas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        raw_content,
        source_type: 'observation',
        tags: ['stolen', hookLabel, structLabel],
      }),
    });
    setStolenIds((prev) => new Set(prev).add(post.id));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Inspiración</h1>
        <p className="text-text-secondary">
          {tab === 'steal'
            ? 'Repasa todos los outliers de los creadores que sigues. Roba lo que funciona: guárdalo como idea y hazlo tuyo.'
            : 'Genera ideas de post a partir de un tema, tus propios outliers, temas de conversación o una noticia del sector.'}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        {([
          ['steal', '🔥 Robar', 'Outliers de tus creadores'],
          ['generate', '✨ Generar', 'Ideas con IA'],
        ] as const).map(([key, label, subtitle]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === key
                ? key === 'generate'
                  ? 'border-fuchsia-400 text-fuchsia-400'
                  : 'border-accent text-accent'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
            title={subtitle}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'generate' && <GenerateTab />}

      {tab === 'steal' && loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-bg-card border border-border rounded-xl p-5 animate-pulse">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-bg-secondary" />
                <div className="h-3 bg-bg-secondary rounded w-24" />
              </div>
              <div className="h-3 bg-bg-secondary rounded w-full mb-2" />
              <div className="h-3 bg-bg-secondary rounded w-3/4 mb-2" />
              <div className="h-3 bg-bg-secondary rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {tab === 'steal' && error && (
        <div className="bg-danger/10 border border-danger/30 rounded-lg p-4 text-danger text-sm">{error}</div>
      )}

      {tab === 'steal' && !loading && outliers.length === 0 && !error && (
        <div className="text-center py-16 text-text-muted">
          <p className="text-4xl mb-4">🔍</p>
          <p className="mb-1">No hay outliers.</p>
          <p className="text-sm">Ve al Panel → añade creadores → actualiza sus posts.</p>
        </div>
      )}

      {tab === 'steal' && !loading && outliers.length > 0 && (
        <>
          {/* MANTENIMIENTO — clasificador de topics y backfill del reaction mix.
              Colapsado: son operaciones de administración que se corren de uvas a
              peras, y en abierto se comían media pantalla por encima de lo que sí
              se usa a diario. No se borran porque el backfill aún no ha terminado
              y sin el botón no habría forma de relanzarlo. */}
          <div className="border border-border/60 rounded-lg overflow-hidden">
            <button
              onClick={() => setShowMaint((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs text-text-muted hover:text-text-secondary hover:bg-bg-secondary/50 transition-colors"
            >
              <span className="flex items-center gap-2">
                ⚙️ Mantenimiento
                {unclassifiedCount > 0 && (
                  <span className="text-amber-400/80">{unclassifiedCount} sin clasificar</span>
                )}
                {mixStatus && mixStatus.running && (
                  <span className="text-purple-300/80">
                    mix de reacciones {mixStatus.processed}/{mixStatus.total}…
                  </span>
                )}
              </span>
              <span className="text-[10px]">{showMaint ? '▲' : '▼'}</span>
            </button>
            {showMaint && (
              <div className="px-3 pb-3 pt-1 space-y-3 border-t border-border/40">
          {/* Classify + Reclassify controls */}
          <div className="flex flex-wrap items-center gap-3">
            {unclassifiedCount > 0 && (
              <button
                onClick={handleClassify}
                disabled={classifying}
                className="px-4 py-2 bg-amber-400/15 text-amber-400 rounded-lg text-xs font-medium hover:bg-amber-400/25 disabled:opacity-50 transition-colors"
              >
                {classifying ? '🧠 Clasificando…' : `🏷️ Clasificar ${unclassifiedCount} outlier${unclassifiedCount !== 1 ? 's' : ''} sin tema`}
              </button>
            )}

            <div className="flex items-center gap-1.5">
              <select
                value={reclassifyScope}
                onChange={(e) => setReclassifyScope(e.target.value as 'images' | 'all')}
                disabled={classifying}
                className="bg-bg-secondary border border-border rounded-lg px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent/50 disabled:opacity-50"
              >
                <option value="images">🖼️ Posts con imagen (candidatos a meme)</option>
                <option value="all">🌍 Todos los temas (reclasificar todo)</option>
              </select>
              <button
                onClick={handleReclassify}
                disabled={classifying}
                className="px-3 py-1.5 bg-bg-secondary border border-border text-text-secondary rounded-lg text-xs font-medium hover:border-amber-400/40 hover:text-amber-400 disabled:opacity-50 transition-colors"
              >
                {classifying ? '🔄 Trabajando…' : '🔄 Reiniciar y reclasificar'}
              </button>
            </div>

            {classifyResult && <span className="text-xs text-text-muted">{classifyResult}</span>}
          </div>

          {/* Reaction-mix backfill — pulls per-type reaction counts via the
              dedicated scraper Unipile account. Used to detect memes
              (funny_pct) without spending Sonnet tokens on the classifier. */}
          {mixStatus && (
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/40">
              <button
                onClick={handleStartMixBackfill}
                disabled={mixStarting || mixStatus.running || mixStatus.outliers_with_mix >= mixStatus.outliers_total}
                className="px-4 py-2 bg-purple-400/15 text-purple-300 rounded-lg text-xs font-medium hover:bg-purple-400/25 disabled:opacity-50 transition-colors"
                title="Pide a Unipile el mix de reacciones (LIKE/FUNNY/CELEBRATE/...) de cada outlier. Corre en segundo plano con la cuenta de lectura dedicada."
              >
                {mixStatus.running
                  ? `🎭 Procesando ${mixStatus.processed}/${mixStatus.total}…`
                  : mixStatus.outliers_with_mix >= mixStatus.outliers_total
                    ? '🎭 Mix de reacciones completo'
                    : `🎭 Completar mix de reacciones (${mixStatus.outliers_total - mixStatus.outliers_with_mix} pendientes)`}
              </button>
              <span className="text-xs text-text-muted">
                {mixStatus.outliers_with_mix.toLocaleString('es-ES')} / {mixStatus.outliers_total.toLocaleString('es-ES')} outliers con mix
                {mixStatus.outliers_permanently_failed > 0 && (
                  <span className="text-amber-400/80"> · {mixStatus.outliers_permanently_failed} borrados de LinkedIn</span>
                )}
              </span>
              {Object.keys(mixStatus.errors_by_status).length > 0 && (
                <span className="text-[10px] text-text-muted flex items-center gap-2 flex-wrap">
                  {Object.entries(mixStatus.errors_by_status)
                    .sort((a, b) => b[1] - a[1])
                    .map(([status, count]) => {
                      const label =
                        status === '429' ? 'límite de peticiones (reintentables)' :
                        status === '404' ? 'no encontrados (borrados)' :
                        status === '-1' ? 'red/otros' :
                        `HTTP ${status}`;
                      const colour =
                        status === '429' ? 'text-orange-400/80' :
                        status === '404' ? 'text-amber-400/80' :
                        'text-red-400/80';
                      return (
                        <span key={status} className={colour}>
                          {count} {label}
                        </span>
                      );
                    })}
                </span>
              )}
              {mixStatus.last_error && (
                <span className="text-[10px] text-red-400/70 truncate max-w-md" title={mixStatus.last_error}>
                  último error: {mixStatus.last_error}
                </span>
              )}
            </div>
          )}
              </div>
            )}
          </div>

          {/* BARRA DE FILTROS — una sola fila. Antes eran 5 filas de chips
              (topic 148, creator 134, hook 27, structure 21) = ~280 botones que
              ocupaban media pantalla y en los que no se encontraba nada. Los que
              tienen muchos valores pasan a desplegable con buscador; el toggle de
              memes se queda a la vista porque es el que se usa. El formato NO está
              aquí: sube a la fila de resultados, que solo son 5 valores. */}
          <div className="bg-bg-card border border-border rounded-xl p-3 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-text-muted">🔍</span>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder='Palabra exacta en el contenido (p.ej. "CLAUDE", "outbound")'
                className="w-full bg-bg-secondary border border-border rounded-lg pl-8 pr-8 py-1.5 text-xs text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-accent/50"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-text-muted hover:text-text-primary">✕</button>
              )}
            </div>

            <FilterSelect label="Tema" icon="📂" options={topics} value={filterTopic} onChange={setFilterTopic} totalLabel={String(outliers.length)} />
            <FilterSelect label="Gancho" options={hookTypes} labels={HOOK_LABELS} value={filterHook} onChange={setFilterHook} />
            <FilterSelect label="Estructura" options={structureTypes} labels={STRUCT_LABELS} value={filterStructure} onChange={setFilterStructure} />
            <FilterSelect label="Creador" options={creators} value={filterCreator} onChange={setFilterCreator} />

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="bg-bg-secondary border border-border rounded-lg px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent/50"
            >
              <option value="ratio">🔥 Multiplicador</option>
              <option value="likes">👍 Reacciones</option>
              <option value="comments">💬 Comentarios</option>
              <option value="recent">🕐 Más recientes</option>
            </select>

            {/* MEMES — el único control de memes. Antes había dos ("Solo memes"
                como filtro y "Más funny" como orden) y confundían: para nosotros
                funny y meme son lo mismo. Se queda a la vista, no en desplegable:
                es el filtro que de verdad se usa. */}
            <button
              onClick={() => { setOnlyMemes((v) => !v); setFilterContentType(''); }}
              className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                onlyMemes
                  ? 'border-orange-400/60 bg-orange-400/15 text-orange-300'
                  : 'border-border bg-bg-secondary text-text-muted hover:border-orange-400/30'
              }`}
              title="Filtra a los posts cuya audiencia reaccionó con >25% 😂, según el reaction mix real. Es la señal de meme que da la audiencia, no el clasificador."
            >
              😂 Solo memes ({memeCount})
            </button>

            {/* LEAD MAGNETS — el equivalente al de memes, pero por comentarios
                disparados (comment-gated). La gente comenta la palabra para pillar
                el recurso, así que comentarios ≫ reacciones. Señal de la audiencia. */}
            <button
              onClick={() => { setOnlyLeadMagnets((v) => !v); setFilterContentType(''); }}
              className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                onlyLeadMagnets
                  ? 'border-orange-400/60 bg-orange-400/15 text-orange-300'
                  : 'border-border bg-bg-secondary text-text-muted hover:border-orange-400/30'
              }`}
              title="Filtra a los lead magnets: posts con MÁS comentarios que reacciones (comment-gated). La gente comenta la palabra clave para pillar el recurso. Como los de Martín Arosa, Guillermo o Luna Chen."
            >
              💬 Solo lead magnets ({leadMagnetCount})
            </button>
          </div>

          {/* FILA DE RESULTADOS — recuento a la izquierda y FORMATO a la derecha.
              El formato vive aquí y no en la barra de filtros porque solo tiene 5
              valores: es el único filtro donde los chips funcionan, y es donde el
              resto de secciones lo pone. Los recuentos se calculan sobre lo que se
              está mirando: con "Solo memes" activo, cuentan solo memes. */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-text-muted">
              {filtered.length} outlier{filtered.length !== 1 ? 's' : ''}{' '}
              {filterHook || filterStructure || filterCreator || filterTopic || filterContentType || searchQuery
                ? `(de ${outliers.length} en total${searchQuery ? ` · búsqueda: "${searchQuery}"` : ''})`
                : 'en total'}
            </p>

            {contentTypes.length > 1 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-text-muted font-medium">
                  {onlyMemes ? 'Formato del meme:' : 'Formato:'}
                </span>
                <button
                  onClick={() => setFilterContentType('')}
                  className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${!filterContentType ? 'border-accent/50 bg-accent/10 text-accent' : 'border-border text-text-muted hover:border-accent/30'}`}
                >
                  Todos
                </button>
                {contentTypes.map(([type, count]) => (
                  <button
                    key={type}
                    onClick={() => setFilterContentType(filterContentType === type ? '' : type)}
                    className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                      filterContentType === type
                        ? 'border-accent/50 bg-accent/10 text-accent'
                        : 'border-border text-text-muted hover:border-accent/30'
                    }`}
                  >
                    {CONTENT_TYPE_LABELS[type] || type} ({count})
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((post) => (
              <OutlierCard
                key={post.id}
                post={post}
                onSteal={handleSteal}
              />
            ))}
          </div>

          {filtered.length === 0 && (
            <p className="text-center text-text-muted py-8">Ningún outlier coincide con estos filtros.</p>
          )}
        </>
      )}
    </div>
  );
}
