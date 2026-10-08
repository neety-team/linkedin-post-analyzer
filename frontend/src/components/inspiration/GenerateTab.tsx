import { useState, useEffect, useMemo } from 'react';

const BASE = import.meta.env.VITE_API_URL || '';

// ─── Types ──────────────────────────────────────────────────────────────────

type PostType =
  | 'lead_magnet' | 'opinion' | 'story' | 'listicle' | 'how_to'
  | 'contrarian' | 'data_driven' | 'behind_scenes' | 'question' | 'news_reaction';

type Grounding = 'outliers_only' | 'all_posts' | 'none';

interface GeneratedIdea {
  title: string;
  body: string;
  sub_angle?: string;
  suggested_hook?: string;
}

interface BrainstormResponse {
  ideas: GeneratedIdea[];
  meta: {
    postType: PostType;
    grounding: Grounding;
    groundingFallback: Grounding | null;
    count: number;
    requested: number;
  };
}

interface TrendingTopic {
  topic: string;
  outlier_count: number;
  avg_ratio: number | null;
}

// ─── Static config ──────────────────────────────────────────────────────────

interface PostTypeMeta {
  key: PostType;
  icon: string;
  label: string;
  desc: string;
}

const POST_TYPE_META: PostTypeMeta[] = [
  { key: 'lead_magnet',   icon: '🧲', label: 'Lead magnet',     desc: '"Comenta SÍ y te lo mando"' },
  { key: 'opinion',       icon: '🔥', label: 'Opinión polémica', desc: 'Postura clara y polémica' },
  { key: 'story',         icon: '📖', label: 'Historia personal', desc: 'Anécdota → lección' },
  { key: 'listicle',      icon: '📋', label: 'Lista',            desc: '"5 cosas que…", "3 pasos para…"' },
  { key: 'how_to',        icon: '🛠️', label: 'Guía práctica',    desc: 'Método reproducible' },
  { key: 'contrarian',    icon: '⚡', label: 'A contracorriente', desc: '"Todo el mundo dice X. Es mentira."' },
  { key: 'data_driven',   icon: '📊', label: 'Basado en datos',   desc: 'Caso o dato sorprendente' },
  { key: 'behind_scenes', icon: '🎬', label: 'Entre bastidores',  desc: 'Lo que no te cuentan' },
  { key: 'question',      icon: '❓', label: 'Pregunta / debate', desc: 'Pregunta provocadora corta' },
  { key: 'news_reaction', icon: '📰', label: 'Reacción a noticia', desc: 'Reacción a evento del sector' },
];

const GROUNDING_META: { key: Grounding; label: string; desc: string }[] = [
  { key: 'outliers_only', label: 'Solo validados', desc: 'Usa outliers reales como referencia' },
  { key: 'all_posts',     label: 'Todos los posts', desc: 'Inspiración más amplia' },
  { key: 'none',          label: 'Sin contexto',    desc: 'Lluvia de ideas libre, sin tu corpus' },
];

const COUNT_OPTIONS = [5, 10, 20] as const;
type CountOption = typeof COUNT_OPTIONS[number];

// ─── IdeaCard ───────────────────────────────────────────────────────────────

function IdeaCard({
  idea,
  postType,
  onSave,
}: {
  idea: GeneratedIdea;
  postType: PostType;
  onSave: (idea: GeneratedIdea) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hookCopied, setHookCopied] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(idea);
      setSaved(true);
    } catch (e: any) {
      setError(e.message || 'Error al guardar');
    }
    setSaving(false);
  };

  const copyHook = async () => {
    if (!idea.suggested_hook) return;
    try {
      await navigator.clipboard.writeText(idea.suggested_hook);
      setHookCopied(true);
      setTimeout(() => setHookCopied(false), 1500);
    } catch {}
  };

  const meta = POST_TYPE_META.find((m) => m.key === postType);

  return (
    <div className={`bg-bg-card border rounded-xl p-4 transition-all ${saved ? 'border-success/30 opacity-70' : 'border-border hover:border-fuchsia-500/40'}`}>
      <div className="flex items-start gap-2 mb-2">
        <span className="text-base leading-none mt-0.5">💡</span>
        <p className="text-sm font-semibold text-text-primary leading-snug flex-1">{idea.title}</p>
      </div>

      <p className="text-text-secondary text-xs leading-relaxed whitespace-pre-wrap mb-3">
        {idea.body}
      </p>

      {idea.suggested_hook && (
        <div className="mb-3 bg-bg-secondary border border-border rounded-lg p-2.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] uppercase tracking-wide text-text-muted font-semibold">Gancho sugerido</span>
            <button
              onClick={copyHook}
              className="text-[10px] text-accent hover:text-accent-strong transition-colors"
            >
              {hookCopied ? '✓ Copiado' : '📋 Copiar'}
            </button>
          </div>
          <p className="text-xs text-text-primary leading-snug italic">
            "{idea.suggested_hook}"
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 mb-3">
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-fuchsia-400/10 text-fuchsia-700 font-medium">
          {meta?.icon} {meta?.label}
        </span>
        {idea.sub_angle && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-bg-secondary text-text-muted">
            {idea.sub_angle}
          </span>
        )}
      </div>

      <button
        onClick={handleSave}
        disabled={saving || saved}
        className={`w-full py-2 rounded-lg text-xs font-medium transition-colors ${
          saved
            ? 'bg-success/15 text-success cursor-default'
            : 'bg-fuchsia-500/90 hover:bg-fuchsia-500 text-white disabled:opacity-50 disabled:cursor-not-allowed'
        }`}
      >
        {saved ? '✓ Guardado en Ideas' : saving ? 'Guardando…' : '💾 Guardar en Ideas'}
      </button>

      {error && <p className="text-[10px] text-danger mt-1.5">{error}</p>}
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function GenerateTab() {
  // State
  const [postType, setPostType] = useState<PostType>('opinion');
  const [topic, setTopic] = useState('');
  // The user's actual message / angle / take. This is the highest-signal input —
  // a topic alone ("ventas B2B") doesn't tell the AI what to argue. The angle
  // ("creo que el cold outreach está muerto por la IA") gives it a tesis.
  const [angle, setAngle] = useState('');
  const [audience, setAudience] = useState('');
  const [newsContext, setNewsContext] = useState('');
  const [grounding, setGrounding] = useState<Grounding>('outliers_only');
  const [count, setCount] = useState<CountOption>(10);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<BrainstormResponse | null>(null);
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());

  // Trending topics
  const [trending, setTrending] = useState<TrendingTopic[]>([]);
  const [trendingLoaded, setTrendingLoaded] = useState(false);

  // Load trending topics on mount
  useEffect(() => {
    let cancelled = false;
    fetch(`${BASE}/api/ideas/inspiration/trending-topics`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setTrending(Array.isArray(data?.topics) ? data.topics : []);
        setTrendingLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setTrendingLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError('Pon un tema primero (p. ej. "ventas B2B", "cold outreach").');
      return;
    }
    if (postType === 'news_reaction' && !newsContext.trim()) {
      setError('Pega el contexto de la noticia para generar reacciones.');
      return;
    }

    setGenerating(true);
    setError(null);
    setResults(null);
    setSavedIds(new Set());

    try {
      const res = await fetch(`${BASE}/api/ideas/inspiration/brainstorm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postType,
          topic: topic.trim(),
          angle: angle.trim() || undefined,
          audience: audience.trim() || undefined,
          grounding,
          count,
          newsContext: postType === 'news_reaction' ? newsContext.trim() : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || `Error ${res.status}`);
        setGenerating(false);
        return;
      }
      setResults(json);
    } catch (e: any) {
      setError(e.message || 'Error al generar ideas');
    }
    setGenerating(false);
  };

  const handleSave = async (idx: number, idea: GeneratedIdea) => {
    if (!results) return;
    const subAngle = idea.sub_angle || 'general';
    const tags = ['generated', postType, subAngle];

    const lines = [idea.title.trim(), '', idea.body.trim()];
    if (idea.suggested_hook) {
      lines.push('', `Hook sugerido: ${idea.suggested_hook.trim()}`);
    }
    const raw_content = lines.filter((l) => l !== undefined).join('\n');

    const res = await fetch(`${BASE}/api/ideas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw_content, source_type: 'generated', tags }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error || `Error ${res.status}`);
    }
    setSavedIds((prev) => new Set(prev).add(idx));
  };

  // Group ideas by sub_angle for display
  const groupedIdeas = useMemo(() => {
    if (!results) return [];
    const map = new Map<string, { idea: GeneratedIdea; idx: number }[]>();
    results.ideas.forEach((idea, idx) => {
      const key = idea.sub_angle?.trim() || 'sin clasificar';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push({ idea, idx });
    });
    return Array.from(map.entries());
  }, [results]);

  const handleTrendingClick = (t: TrendingTopic) => {
    setTopic(t.topic);
    setGrounding('outliers_only');
  };

  return (
    <div className="space-y-6">
      {/* Trending topics — quick-pick chips from your outlier corpus */}
      {trendingLoaded && trending.length > 0 && (
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
              <span>🔥</span> Temas calientes en tus outliers
            </p>
            <span className="text-[10px] text-text-muted">haz clic para usarlo</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {trending.map((t) => (
              <button
                key={t.topic}
                onClick={() => handleTrendingClick(t)}
                className="text-[11px] px-2.5 py-1 rounded-full bg-bg-secondary border border-border text-text-secondary hover:border-fuchsia-500/50 hover:text-text-primary transition-colors"
                title={`${t.outlier_count} outliers · ${t.avg_ratio ? t.avg_ratio.toFixed(1) + 'x de multiplicador medio' : ''}`}
              >
                {t.topic} <span className="text-text-muted">· {t.outlier_count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {trendingLoaded && trending.length === 0 && (
        <div className="bg-bg-card border border-dashed border-border rounded-xl p-3 text-[11px] text-text-muted">
          Aún no hay temas calientes en tu corpus: clasifica outliers desde la pestaña <strong>Robar</strong> y vuelve.
        </div>
      )}

      {/* Post type picker — 10 cards in a 5×2 (or 2×5 mobile) grid */}
      <div className="bg-bg-card border border-border rounded-xl p-4">
        <p className="text-xs font-semibold text-text-primary mb-2.5">Tipo de post</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {POST_TYPE_META.map((m) => {
            const active = postType === m.key;
            return (
              <button
                key={m.key}
                onClick={() => setPostType(m.key)}
                className={`text-left p-2.5 rounded-lg border transition-all ${
                  active
                    ? 'border-fuchsia-500/60 bg-fuchsia-400/10'
                    : 'border-border bg-bg-secondary hover:border-fuchsia-500/30'
                }`}
              >
                <div className="text-base mb-0.5">{m.icon}</div>
                <div className={`text-xs font-semibold leading-tight ${active ? 'text-fuchsia-700' : 'text-text-primary'}`}>
                  {m.label}
                </div>
                <div className="text-[10px] text-text-muted leading-tight mt-0.5">{m.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Topic + angle + audience + grounding + count + generate */}
      <div className="bg-bg-card border border-border rounded-xl p-4 space-y-4">
        {/* The angle is the highest-signal input. Without it the AI has to
            guess what tesis the user wants to defend, and ideas come back
            generic. We make this the visual centerpiece (full width, accent
            border) and treat topic / audience as supporting metadata below. */}
        <div>
          <label className="block text-xs font-semibold text-fuchsia-700 mb-1.5 flex items-center gap-1.5">
            <span>💭</span> Tu mensaje / ángulo
            <span className="text-[10px] font-normal text-text-muted ml-1">— qué quieres defender o decir</span>
          </label>
          <textarea
            value={angle}
            onChange={(e) => setAngle(e.target.value)}
            rows={4}
            placeholder={
              'Ejemplos:\n' +
              '• "El cold outreach masivo está muerto por la IA. Las empresas que ganan en 2026 vuelven a relaciones humanas + datos."\n' +
              '• "Contratar SDRs sin experiencia funciona mejor que SDRs senior si tienes un buen playbook. Lo he probado 3 veces."\n' +
              '• "El error que veo en 9 de cada 10 startups B2B: invierten en marketing antes de tener product-market fit en ventas directas."'
            }
            className="w-full bg-bg-primary border border-fuchsia-500/30 rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-fuchsia-500/70 resize-y leading-relaxed"
          />
          <p className="text-[10px] text-text-muted mt-1 leading-snug">
            Cuanto más concreto sea tu ángulo (tesis + por qué + a quién aplica), más afiladas serán las ideas.
            Si lo dejas vacío, generaremos ideas genéricas sobre el tema.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] text-text-muted font-medium mb-1">
              Tema <span className="text-[10px] text-text-muted">· para filtrar outliers de referencia</span>
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="ventas B2B, cold outreach, contratar SDRs…"
              className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-fuchsia-500/50"
            />
          </div>
          <div>
            <label className="block text-[11px] text-text-muted font-medium mb-1">Audiencia (opcional)</label>
            <input
              type="text"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="founders técnicos B2B, equipos de ventas industriales…"
              className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-fuchsia-500/50"
            />
          </div>
        </div>

        {postType === 'news_reaction' && (
          <div>
            <label className="block text-[11px] text-text-muted font-medium mb-1">
              Contexto de la noticia (titular + 2-3 líneas)
            </label>
            <textarea
              value={newsContext}
              onChange={(e) => setNewsContext(e.target.value)}
              rows={3}
              placeholder="Pega aquí el titular y un breve resumen de la noticia"
              className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-fuchsia-500/50 resize-y"
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] text-text-muted font-medium mb-1">Anclaje</label>
            <div className="flex flex-wrap gap-1.5">
              {GROUNDING_META.map((g) => {
                const active = grounding === g.key;
                return (
                  <button
                    key={g.key}
                    onClick={() => setGrounding(g.key)}
                    title={g.desc}
                    className={`text-[11px] px-2.5 py-1.5 rounded-full border transition-colors ${
                      active
                        ? 'border-fuchsia-500/60 bg-fuchsia-400/10 text-fuchsia-700'
                        : 'border-border bg-bg-secondary text-text-muted hover:border-fuchsia-500/30'
                    }`}
                  >
                    {g.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="block text-[11px] text-text-muted font-medium mb-1">Cantidad</label>
            <div className="flex gap-1.5">
              {COUNT_OPTIONS.map((c) => {
                const active = count === c;
                return (
                  <button
                    key={c}
                    onClick={() => setCount(c)}
                    className={`text-[11px] px-3 py-1.5 rounded-full border transition-colors ${
                      active
                        ? 'border-fuchsia-500/60 bg-fuchsia-400/10 text-fuchsia-700'
                        : 'border-border bg-bg-secondary text-text-muted hover:border-fuchsia-500/30'
                    }`}
                  >
                    {c} ideas
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating || !topic.trim()}
          className="w-full py-2.5 rounded-lg text-sm font-semibold bg-fuchsia-500 hover:bg-fuchsia-600 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {generating ? `Generando ${count} ideas…` : `✨ Generar ${count} ideas`}
        </button>

        {error && (
          <div className="bg-danger/10 border border-danger/30 rounded-lg p-2.5 text-danger text-xs">
            {error}
          </div>
        )}
      </div>

      {/* Loading skeleton */}
      {generating && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: Math.min(6, count) }).map((_, i) => (
            <div key={i} className="bg-bg-card border border-border rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-bg-secondary rounded w-3/4 mb-2" />
              <div className="h-3 bg-bg-secondary rounded w-full mb-1.5" />
              <div className="h-3 bg-bg-secondary rounded w-5/6 mb-3" />
              <div className="h-12 bg-bg-secondary rounded mb-3" />
              <div className="h-8 bg-bg-secondary rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Results — grouped by sub_angle */}
      {results && !generating && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-text-muted">
              <strong className="text-text-primary">{results.ideas.length} ideas generadas</strong> ·
              guarda las que te gusten y pásalas a <a href="/ideas" className="text-accent hover:text-accent-strong underline">Ideas</a> para generar variantes.
            </p>
            <button
              onClick={handleGenerate}
              className="text-[11px] text-fuchsia-700 hover:text-fuchsia-700 transition-colors"
            >
              ↻ Regenerar
            </button>
          </div>

          {results.meta.groundingFallback && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2.5 text-amber-700 text-[11px]">
              ⚠️ No se encontraron outliers para "{topic}" — generamos las ideas usando todos tus posts como referencia.
            </div>
          )}

          {groupedIdeas.map(([subAngle, items]) => (
            <div key={subAngle}>
              <p className="text-[10px] uppercase tracking-wide text-text-muted font-semibold mb-2 pl-1">
                {subAngle} <span className="text-text-muted">· {items.length}</span>
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {items.map(({ idea, idx }) => (
                  <IdeaCard
                    key={idx}
                    idea={idea}
                    postType={postType}
                    onSave={async () => {
                      if (savedIds.has(idx)) return;
                      await handleSave(idx, idea);
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
