import { useState, useRef, useEffect, useCallback } from 'react';
import { useApi } from '../hooks/useApi';

const BASE = import.meta.env.VITE_API_URL || '';

interface ArchetypeVariant {
  archetype_key: string;
  archetype_label: string;
  archetype_desc: string;
  hook_type: string;
  post_structure: string;
  avg_ratio: number;
  text: string;
  // Optional — only present when the generator judged a visual would
  // materially amplify the post. Kept out of `text` so it never gets
  // copied into the LinkedIn post by accident.
  image_suggestion?: string | null;
}

interface PostIdea {
  id: string;
  raw_content: string;
  source_type: 'manual' | 'book_quote' | 'demo_moment' | 'observation' | 'meeting' | 'generated';
  tags: string[];
  generated_post: string | null;
  generation_score: number | null;
  generated_variants: ArchetypeVariant[] | null;
  status: 'draft' | 'generating' | 'ready';
  created_at: string;
}

// Stolen ideas store their attribution as plain text at the top of
// `raw_content`:
//   From <creator> — <headline> · <ratio>x outlier
//   Original: <linkedin url>
//   <blank>
//   <post body…>
// Parsing it lets us render the source as a styled chip + link banner
// instead of raw text mashed into the post body. Falls back gracefully
// when the lines aren't there (manual / generated ideas).
interface ParsedSource {
  creatorName?: string;
  creatorHeadline?: string;
  outlierRatio?: number;
  originalUrl?: string;
}

function parseSourceFromRawContent(raw: string): { source: ParsedSource | null; body: string } {
  if (!raw) return { source: null, body: '' };
  const lines = raw.split('\n');
  const source: ParsedSource = {};
  // Keep matching meta lines from the top until we hit something that isn't
  // a recognised pattern; then everything below is the post body.
  const fromRe = /^From\s+(.+?)(?:\s+—\s+(.+?))?(?:\s+·\s+([\d.]+)x\s+outlier)?\s*$/i;
  const origRe = /^Original:\s+(https?:\/\/\S+)\s*$/i;
  let consumed = 0;
  for (let i = 0; i < Math.min(4, lines.length); i++) {
    const line = lines[i].trim();
    if (line === '') {
      // Blank line is fine between meta lines OR signalling end of meta.
      consumed = i + 1;
      // Stop if we already grabbed at least one meta line and hit a blank
      if (source.creatorName || source.originalUrl) break;
      continue;
    }
    const fromMatch = line.match(fromRe);
    if (fromMatch) {
      source.creatorName = fromMatch[1]?.trim();
      source.creatorHeadline = fromMatch[2]?.trim();
      source.outlierRatio = fromMatch[3] ? parseFloat(fromMatch[3]) : undefined;
      consumed = i + 1;
      continue;
    }
    const origMatch = line.match(origRe);
    if (origMatch) {
      source.originalUrl = origMatch[1];
      consumed = i + 1;
      continue;
    }
    break; // first non-meta line — bail
  }
  while (consumed < lines.length && lines[consumed].trim() === '') consumed++;

  const hasAny = source.creatorName || source.originalUrl;
  return {
    source: hasAny ? source : null,
    body: hasAny ? lines.slice(consumed).join('\n').trimStart() : raw,
  };
}

function SourceBanner({ source }: { source: ParsedSource }) {
  return (
    <div className="mb-3 px-3 py-2.5 rounded-lg border border-accent/25 bg-accent/5 flex items-start gap-2.5">
      <span className="text-base leading-none mt-0.5 select-none">🔥</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {source.creatorName && (
            <span className="text-xs font-semibold text-text-primary">{source.creatorName}</span>
          )}
          {typeof source.outlierRatio === 'number' && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/15 text-accent font-semibold tabular-nums">
              Outlier de {source.outlierRatio}x
            </span>
          )}
        </div>
        {source.creatorHeadline && (
          <p className="text-[11px] text-text-muted leading-snug mt-0.5 line-clamp-2">
            {source.creatorHeadline}
          </p>
        )}
        {source.originalUrl && (
          <a
            href={source.originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-accent hover:text-accent-light inline-flex items-center gap-1 mt-1.5 underline-offset-2 hover:underline"
          >
            <span aria-hidden>↗</span>
            <span>Ver post original en LinkedIn</span>
          </a>
        )}
      </div>
    </div>
  );
}

const SOURCE_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  manual:      { icon: '💡', label: 'Idea',        color: 'text-accent bg-accent/10' },
  book_quote:  { icon: '📚', label: 'Libro',       color: 'text-purple-400 bg-purple-400/10' },
  demo_moment: { icon: '🎯', label: 'Demo',        color: 'text-blue-400 bg-blue-400/10' },
  observation: { icon: '👁️', label: 'Observación', color: 'text-amber-400 bg-amber-400/10' },
  meeting:     { icon: '🤝', label: 'Reunión',     color: 'text-green-400 bg-green-400/10' },
  generated:   { icon: '✨', label: 'Generada',    color: 'text-fuchsia-400 bg-fuchsia-400/10' },
};

const ARCHETYPE_COLORS = [
  { border: 'border-accent/30', bg: 'bg-accent/5', badge: 'bg-accent/15 text-accent', btn: 'bg-accent text-bg-primary hover:bg-accent-light' },
  { border: 'border-purple-400/30', bg: 'bg-purple-400/5', badge: 'bg-purple-400/15 text-purple-400', btn: 'bg-purple-500/80 text-white hover:bg-purple-500' },
  { border: 'border-blue-400/30', bg: 'bg-blue-400/5', badge: 'bg-blue-400/15 text-blue-400', btn: 'bg-blue-500/80 text-white hover:bg-blue-500' },
];

// ─── Voice capture ────────────────────────────────────────────────────────────
function useVoiceCapture(onResult: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const start = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert('Tu navegador no admite el dictado por voz. Usa Chrome en el móvil.'); return; }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = navigator.language || 'es-ES';
    rec.onresult = (e: any) => {
      const t = Array.from(e.results).map((r: any) => r[0].transcript).join(' ');
      onResult(t);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    rec.start();
    recognitionRef.current = rec;
    setListening(true);
  };

  const stop = () => { recognitionRef.current?.stop(); setListening(false); };
  return { listening, start, stop };
}

// ─── Post editor ─────────────────────────────────────────────────────────────
// Plain editable textarea + copy. The scorer/checklist was removed: the
// Post Creator already bakes the strategy knowledge + real outlier data
// into generation, so a separate regex score added no signal here.
function PostEditor({ ideaId, initialText, onSave }: {
  ideaId: string;
  initialText: string;
  onSave: (text: string) => void;
}) {
  const [postText, setPostText] = useState(initialText);
  const [copied, setCopied] = useState(false);

  const persist = (text: string) => {
    fetch(`${BASE}/api/ideas/${ideaId}/save-post`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ generated_post: text }),
    }).catch(() => {});
    onSave(text);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(postText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3 mt-4">
      <textarea
        value={postText}
        onChange={(e) => setPostText(e.target.value)}
        onBlur={() => persist(postText)}
        className="w-full bg-bg-secondary border border-border rounded-lg p-3 text-sm text-text-primary resize-y focus:outline-none focus:border-accent leading-relaxed"
        rows={14}
      />

      <button
        onClick={handleCopy}
        className="w-full px-4 py-2 bg-bg-secondary border border-border text-text-secondary rounded-lg text-xs hover:border-accent/40 hover:text-text-primary transition-colors"
      >
        {copied ? '✓ Copiado' : 'Copiar post'}
      </button>
    </div>
  );
}

// ─── Idea card ────────────────────────────────────────────────────────────────
function IdeaCard({ idea, onUpdate, onDelete }: {
  idea: PostIdea;
  onUpdate: (id: string, data: Partial<PostIdea>) => void;
  onDelete: (id: string) => void;
}) {
  const [generating, setGenerating] = useState(false);
  const [variants, setVariants] = useState<ArchetypeVariant[]>(idea.generated_variants || []);
  const [selectedVariant, setSelectedVariant] = useState<ArchetypeVariant | null>(
    idea.generated_post ? { archetype_key: 'saved', archetype_label: 'Guardado', archetype_desc: '', hook_type: '', post_structure: '', avg_ratio: 0, text: idea.generated_post } : null
  );
  const [genError, setGenError] = useState<string | null>(null);
  const [showVariants, setShowVariants] = useState(variants.length > 0 && !idea.generated_post);

  const cfg = SOURCE_CONFIG[idea.source_type] || SOURCE_CONFIG.manual;
  const hasVariants = variants.length > 0;
  const hasSelectedPost = selectedVariant !== null;

  const handleGenerate = async (reloadArchetypes = false) => {
    setGenerating(true);
    setGenError(null);
    setSelectedVariant(null);
    try {
      const exclude = reloadArchetypes ? variants.map((v) => v.archetype_key) : [];
      const res = await fetch(`${BASE}/api/ideas/${idea.id}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exclude }),
      });
      const data = await res.json();
      if (!res.ok) { setGenError(data.error || `Error ${res.status}`); return; }
      const v: ArchetypeVariant[] = data.variants || [];
      setVariants(v);
      setShowVariants(true);
      onUpdate(idea.id, { status: 'ready', generated_variants: v });
    } catch (e: any) {
      setGenError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleSelectVariant = (v: ArchetypeVariant) => {
    setSelectedVariant(v);
    setShowVariants(false);
    // Save selected post immediately
    fetch(`${BASE}/api/ideas/${idea.id}/save-post`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ generated_post: v.text }),
    }).catch(() => {});
    onUpdate(idea.id, { generated_post: v.text });
  };

  return (
    <div className="bg-bg-card border border-border rounded-xl p-5 hover:border-accent/30 transition-all">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>
            {cfg.icon} {cfg.label}
          </span>
          {idea.tags.map((tag) => (
            <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-bg-secondary text-text-muted border border-border">{tag}</span>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] text-text-muted">{new Date(idea.created_at).toLocaleDateString('es-ES')}</span>
          <button onClick={() => onDelete(idea.id)} className="text-text-muted hover:text-danger text-sm transition-colors">✕</button>
        </div>
      </div>

      {/* Raw content — stolen ideas carry a "From X / Original: <url>"
          header at the top of raw_content; parse it out into a styled
          source banner instead of leaving it mashed into the post body. */}
      {(() => {
        const { source, body } = parseSourceFromRawContent(idea.raw_content);
        return (
          <div className="mb-4">
            {source && <SourceBanner source={source} />}
            <p className="text-text-secondary text-sm leading-relaxed whitespace-pre-wrap">
              {body}
            </p>
          </div>
        );
      })()}

      {/* Generate / Reload buttons */}
      {!hasSelectedPost && (
        <div className="flex gap-2 mb-4">
          <button
            onClick={hasVariants && !showVariants ? () => setShowVariants(true) : () => handleGenerate(false)}
            disabled={generating}
            className="flex-1 py-2 bg-accent/15 text-accent rounded-lg text-xs font-medium hover:bg-accent/25 disabled:opacity-50 transition-colors"
          >
            {generating
              ? '✨ Generando 3 variantes…'
              : hasVariants && !showVariants
                ? '✨ Ver las 3 variantes'
                : hasVariants
                  ? '🔄 Regenerar (mismos arquetipos)'
                  : '✨ Generar 3 variantes con IA'}
          </button>
          {hasVariants && (
            <button
              onClick={() => handleGenerate(true)}
              disabled={generating}
              title="Pide a la IA 3 arquetipos distintos que encajen con esta idea"
              className="px-3 py-2 bg-bg-secondary border border-border text-text-secondary rounded-lg text-xs font-medium hover:border-accent/40 hover:text-accent disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              🎲 Probar otros arquetipos
            </button>
          )}
        </div>
      )}

      {genError && <p className="text-danger text-xs mb-3">{genError}</p>}

      {/* Loading skeleton for variants */}
      {generating && (
        <div className="grid grid-cols-1 gap-3 mb-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-border rounded-xl p-4 animate-pulse">
              <div className="h-3 bg-bg-secondary rounded w-1/3 mb-2" />
              <div className="h-2 bg-bg-secondary rounded w-1/2 mb-3" />
              <div className="h-2 bg-bg-secondary rounded w-full mb-1" />
              <div className="h-2 bg-bg-secondary rounded w-3/4" />
            </div>
          ))}
        </div>
      )}

      {/* 3 variant cards */}
      {!generating && showVariants && variants.length > 0 && (
        <div className="space-y-3 mb-4">
          <p className="text-xs text-text-muted">Elige el arquetipo que mejor encaje:</p>
          {variants.map((v, i) => {
            const colors = ARCHETYPE_COLORS[i % ARCHETYPE_COLORS.length];
            return (
              <div key={v.archetype_key} className={`border rounded-xl p-4 ${colors.border} ${colors.bg}`}>
                {/* Archetype badge */}
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${colors.badge}`}>
                    {v.archetype_label}
                  </span>
                  <span className="text-[10px] text-text-muted">{v.archetype_desc}</span>
                </div>

                {/* Post preview */}
                <p className="text-text-secondary text-xs leading-relaxed whitespace-pre-wrap mb-3 line-clamp-5">
                  {v.text}
                </p>

                {/* Optional image idea — visually separated so it's clearly
                    NOT part of the post text you copy to LinkedIn. */}
                {v.image_suggestion && (
                  <div className="mb-3 rounded-lg border border-dashed border-border bg-bg-primary/50 p-2.5">
                    <div className="text-[10px] uppercase tracking-wide text-text-muted mb-1 flex items-center gap-1">
                      📸 Idea de imagen <span className="normal-case tracking-normal text-text-muted/70">· no forma parte del post</span>
                    </div>
                    <p className="text-[11px] text-text-secondary leading-relaxed whitespace-pre-wrap">
                      {v.image_suggestion}
                    </p>
                  </div>
                )}

                {/* Select button */}
                <button
                  onClick={() => handleSelectVariant(v)}
                  className={`w-full py-2 rounded-lg text-xs font-medium transition-colors ${colors.btn}`}
                >
                  Elegir este arquetipo →
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected post editor */}
      {hasSelectedPost && selectedVariant && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-text-muted">
              Arquetipo: <span className="text-text-secondary font-medium">{selectedVariant.archetype_label}</span>
            </span>
            {hasVariants && (
              <button
                onClick={() => { setShowVariants(true); setSelectedVariant(null); }}
                className="text-[11px] text-accent hover:text-accent-light transition-colors"
              >
                ← Cambiar de variante
              </button>
            )}
          </div>
          <PostEditor
            ideaId={idea.id}
            initialText={selectedVariant.text}
            onSave={(text) => onUpdate(idea.id, { generated_post: text })}
          />
          {selectedVariant.image_suggestion && (
            <div className="mt-3 rounded-lg border border-dashed border-border bg-bg-primary/50 p-3">
              <div className="text-[10px] uppercase tracking-wide text-text-muted mb-1 flex items-center gap-1">
                📸 Idea de imagen <span className="normal-case tracking-normal text-text-muted/70">· solo es una sugerencia: no la pegues en el post</span>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap">
                {selectedVariant.image_suggestion}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Capture form ────────────────────────────────────────────────────────────
function CaptureForm({ onCreated }: { onCreated: () => void }) {
  const [content, setContent] = useState('');
  const [sourceType, setSourceType] = useState<PostIdea['source_type']>('manual');
  const [tags, setTags] = useState('');
  const [saving, setSaving] = useState(false);

  const { listening, start, stop } = useVoiceCapture((transcript) => {
    setContent((prev) => prev ? `${prev} ${transcript}` : transcript);
  });

  const handleSave = async () => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      await fetch(`${BASE}/api/ideas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raw_content: content.trim(),
          source_type: sourceType,
          tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        }),
      });
      setContent('');
      setTags('');
      onCreated();
    } catch {}
    setSaving(false);
  };

  return (
    <div className="bg-bg-card border border-border rounded-xl p-5 space-y-4">
      <h2 className="text-sm font-semibold text-text-primary">Apunta una idea</h2>

      {/* Source type */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(SOURCE_CONFIG).filter(([key]) => key !== 'generated').map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => setSourceType(key as PostIdea['source_type'])}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              sourceType === key
                ? 'border-accent/50 bg-accent/10 text-accent'
                : 'border-border bg-bg-secondary text-text-muted hover:border-accent/30'
            }`}
          >
            {cfg.icon} {cfg.label}
          </button>
        ))}
      </div>

      {/* Textarea + mic */}
      <div className="relative">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={
            sourceType === 'book_quote' ? '"La cita del libro…" · Nombre del autor' :
            sourceType === 'demo_moment' ? 'El cliente potencial dijo que nunca había visto…' :
            sourceType === 'meeting' ? 'En la reunión con X descubrí que…' :
            'Escribe tu idea o pulsa el micro para dictarla…'
          }
          className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-3 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent resize-none pr-12"
          rows={4}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSave(); }}
        />
        <button
          onClick={listening ? stop : start}
          className={`absolute bottom-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all ${
            listening ? 'bg-danger text-white animate-pulse' : 'bg-bg-hover text-text-muted hover:text-text-primary border border-border'
          }`}
          title={listening ? 'Parar el dictado' : 'Dictado por voz'}
        >
          🎤
        </button>
      </div>

      {listening && <p className="text-xs text-danger animate-pulse">● Escuchando… Habla ahora</p>}

      {/* Tags */}
      <input
        type="text"
        placeholder="Etiquetas opcionales: cold email, storytelling… (separadas por comas)"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        className="w-full bg-bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
      />

      <div className="flex items-center justify-between">
        <span className="text-xs text-text-muted">⌘+Enter para guardar</span>
        <button
          onClick={handleSave}
          disabled={saving || !content.trim()}
          className="px-5 py-2 bg-accent text-bg-primary rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-accent-light transition-colors"
        >
          {saving ? 'Guardando…' : 'Guardar idea'}
        </button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Ideas() {
  const { data: ideas, loading, refetch } = useApi<PostIdea[]>('/api/ideas');
  const [localIdeas, setLocalIdeas] = useState<PostIdea[] | null>(null);
  const [filterSource, setFilterSource] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  // Top-level view switch. Kanban is the default — it's the new editorial
  // workflow (Propuesta → En proceso → Programado → Publicado). The legacy
  // list view stays one click away because the AI-variant generation flow
  // lives there.
  const [view, setView] = useState<'kanban' | 'list'>('kanban');

  const displayIdeas = localIdeas || ideas;

  const handleUpdate = (id: string, data: Partial<PostIdea>) => {
    setLocalIdeas((prev) => {
      const base = prev || ideas || [];
      return base.map((idea) => (idea.id === id ? { ...idea, ...data } : idea));
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta idea?')) return;
    await fetch(`${BASE}/api/ideas/${id}`, { method: 'DELETE' });
    refetch();
    setLocalIdeas(null);
  };

  const filtered = (displayIdeas || []).filter((idea) => {
    if (filterSource && idea.source_type !== filterSource) return false;
    if (filterStatus === 'draft' && idea.status !== 'draft') return false;
    if (filterStatus === 'ready' && idea.status !== 'ready') return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold mb-2">Ideas</h1>
          <p className="text-text-secondary">
            {view === 'kanban'
              ? 'Workflow editorial: arrastra ideas de Propuesta → En proceso → Programado → Publicado.'
              : 'Captura ideas en el momento. La IA genera 3 variantes virales para elegir.'}
          </p>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-lg border border-border bg-bg-secondary/50">
          <button
            onClick={() => setView('kanban')}
            className={`text-xs px-3 py-1.5 rounded ${view === 'kanban' ? 'bg-accent/15 text-accent' : 'text-text-muted hover:text-text-secondary'}`}
          >
            🧩 Kanban
          </button>
          <button
            onClick={() => setView('list')}
            className={`text-xs px-3 py-1.5 rounded ${view === 'list' ? 'bg-accent/15 text-accent' : 'text-text-muted hover:text-text-secondary'}`}
          >
            📝 Lista (generar)
          </button>
        </div>
      </div>

      {view === 'kanban' ? (
        <KanbanView
          refreshKey={localIdeas ? 'l' + localIdeas.length : 'r' + (ideas?.length ?? 0)}
        />
      ) : (
      <>
      <CaptureForm onCreated={() => { refetch(); setLocalIdeas(null); }} />

      {displayIdeas && displayIdeas.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-text-muted text-xs">Filtro:</span>
          {[{ v: '', label: 'Todas' }, ...Object.entries(SOURCE_CONFIG).map(([k, c]) => ({ v: k, label: `${c.icon} ${c.label}` }))].map(({ v, label }) => (
            <button key={v} onClick={() => setFilterSource(v)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${filterSource === v ? 'border-accent/50 bg-accent/10 text-accent' : 'border-border bg-bg-secondary text-text-muted hover:border-accent/30'}`}>
              {label}
            </button>
          ))}
          <div className="ml-2 flex gap-1.5">
            {[{ v: '', label: 'Todas' }, { v: 'draft', label: 'Sin post' }, { v: 'ready', label: 'Con post' }].map(({ v, label }) => (
              <button key={v} onClick={() => setFilterStatus(v)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${filterStatus === v ? 'border-accent/50 bg-accent/10 text-accent' : 'border-border bg-bg-secondary text-text-muted hover:border-accent/30'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="bg-bg-card border border-border rounded-xl p-5 animate-pulse">
              <div className="h-3 bg-bg-secondary rounded w-1/4 mb-3" />
              <div className="h-4 bg-bg-secondary rounded w-full mb-2" />
              <div className="h-4 bg-bg-secondary rounded w-3/4" />
            </div>
          ))}
        </div>
      )}

      {!loading && displayIdeas && displayIdeas.length === 0 && (
        <div className="text-center py-16 text-text-muted">
          <p className="text-4xl mb-4">💡</p>
          <p className="mb-1">Aún no hay ideas guardadas.</p>
          <p className="text-sm">Usa el formulario de arriba para apuntar la primera.</p>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="space-y-4">
          <p className="text-xs text-text-muted">{filtered.length} idea{filtered.length !== 1 ? 's' : ''}</p>
          {filtered.map((idea) => (
            <IdeaCard key={idea.id} idea={idea} onUpdate={handleUpdate} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {!loading && displayIdeas && displayIdeas.length > 0 && filtered.length === 0 && (
        <p className="text-center text-text-muted py-8">Ninguna idea coincide con este filtro.</p>
      )}
      </>
      )}
    </div>
  );
}

// ─────────────────────────────── Kanban view ───────────────────────────────

interface KanbanIdea {
  id: string;
  raw_content: string;
  source_type: string;
  tags: string[];
  status: string;
  pipeline_status: 'proposed' | 'in_progress' | 'scheduled' | 'published' | 'discarded';
  source_outlier_post_id: string | null;
  generated_post: string | null;
  created_at: string;
  updated_at: string;
  outlier_text: string | null;
  outlier_hook: string | null;
  outlier_ratio: number | null;
  outlier_url: string | null;
  outlier_creator_name: string | null;
  outlier_creator_image: string | null;
}
interface KanbanResponse {
  columns: Record<'proposed' | 'in_progress' | 'scheduled' | 'published' | 'discarded', KanbanIdea[]>;
  total: number;
}

const COLUMN_META: { key: KanbanIdea['pipeline_status']; label: string; emoji: string; tint: string }[] = [
  { key: 'proposed', label: 'Propuesta', emoji: '💡', tint: 'border-amber-400/30' },
  { key: 'in_progress', label: 'En proceso', emoji: '🛠', tint: 'border-blue-400/30' },
  { key: 'scheduled', label: 'Programado', emoji: '⏰', tint: 'border-purple-400/30' },
  { key: 'published', label: 'Publicado', emoji: '✅', tint: 'border-green-400/30' },
  { key: 'discarded', label: 'Descartado', emoji: '🗑️', tint: 'border-red-400/30' },
];

function KanbanView({ refreshKey }: { refreshKey: string }) {
  const [data, setData] = useState<KanbanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [dragId, setDragId] = useState<string | null>(null);
  const [reloadCounter, setReloadCounter] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/ideas/kanban`);
      const json = await res.json();
      setData(json);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey, reloadCounter]);

  const move = async (id: string, to: KanbanIdea['pipeline_status']) => {
    // Optimistic: update local state first, then PATCH.
    setData((d) => {
      if (!d) return d;
      const cols = { ...d.columns };
      let card: KanbanIdea | undefined;
      for (const k of Object.keys(cols) as KanbanIdea['pipeline_status'][]) {
        const idx = cols[k].findIndex((c) => c.id === id);
        if (idx >= 0) { card = { ...cols[k][idx], pipeline_status: to }; cols[k] = cols[k].filter((c) => c.id !== id); break; }
      }
      if (!card) return d;
      cols[to] = [card, ...cols[to]];
      return { ...d, columns: cols };
    });
    try {
      await fetch(`${BASE}/api/ideas/${id}/pipeline`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipeline_status: to }),
      });
    } catch {
      setReloadCounter((c) => c + 1);
    }
  };

  const clearAll = async () => {
    const total = data ? Object.values(data.columns).reduce((s, arr) => s + arr.length, 0) : 0;
    if (!confirm(`¿Eliminar ${total === 1 ? 'la idea' : `las ${total} ideas`} y reiniciar el deck del Swipe? No se puede deshacer.`)) return;
    try {
      const res = await fetch(`${BASE}/api/ideas/kanban/clear`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) { alert(`Error: ${json.error || res.status}`); return; }
      setReloadCounter((c) => c + 1);
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    }
  };

  if (loading && !data) return <p className="text-text-muted">Cargando kanban…</p>;
  if (!data) return null;

  const totalCards = Object.values(data.columns).reduce((s, arr) => s + arr.length, 0);

  return (
    <div className="space-y-3">
      {totalCards > 0 && (
        <div className="flex justify-end">
          <button
            onClick={clearAll}
            className="text-xs px-2.5 py-1 rounded border border-red-400/40 text-red-400 hover:bg-red-400/10 transition-colors"
            title="Elimina todas las ideas y reinicia el deck del Swipe"
          >
            🗑️ Vaciar todo
          </button>
        </div>
      )}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
      {COLUMN_META.map((col) => {
        const cards = data.columns[col.key] || [];
        return (
          <div
            key={col.key}
            className={`bg-bg-card border ${col.tint} rounded-xl p-3 flex flex-col gap-2 min-h-[300px]`}
            onDragOver={(e) => { e.preventDefault(); }}
            onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData('text/plain'); if (id) move(id, col.key); setDragId(null); }}
          >
            <div className="flex items-center justify-between mb-1 px-1">
              <span className="text-sm font-semibold">
                {col.emoji} {col.label}
              </span>
              <span className="text-[10px] text-text-muted tabular-nums">{cards.length}</span>
            </div>
            {cards.length === 0 && (
              <p className="text-[11px] text-text-muted text-center py-6">—</p>
            )}
            {cards.map((c) => (
              <KanbanCard
                key={c.id}
                card={c}
                isDragging={dragId === c.id}
                onDragStart={(id) => setDragId(id)}
                onDragEnd={() => setDragId(null)}
                onMove={move}
              />
            ))}
          </div>
        );
      })}
    </div>
    </div>
  );
}

function KanbanCard({
  card,
  isDragging,
  onDragStart,
  onDragEnd,
  onMove,
}: {
  card: KanbanIdea;
  isDragging: boolean;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onMove: (id: string, to: KanbanIdea['pipeline_status']) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isLong = (card.raw_content || '').length > 300 || (card.raw_content || '').split('\n').length > 4;
  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.setData('text/plain', card.id); onDragStart(card.id); }}
      onDragEnd={onDragEnd}
      className={`bg-bg-primary border border-border rounded-lg p-2.5 cursor-grab active:cursor-grabbing transition-opacity ${isDragging ? 'opacity-40' : ''}`}
    >
      {/* Outlier source chip when applicable */}
      {card.source_outlier_post_id && card.outlier_creator_name && (
        <div className="flex items-center gap-1.5 mb-1.5 text-[10px] text-text-muted">
          {card.outlier_creator_image ? (
            <img src={card.outlier_creator_image} alt="" className="w-4 h-4 rounded-full object-cover" />
          ) : null}
          <span className="truncate">{card.outlier_creator_name}</span>
          {card.outlier_url && (
            <a
              href={card.outlier_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              draggable={false}
              className="text-accent hover:text-accent-light"
              title="Abrir el outlier original en LinkedIn"
            >
              ↗
            </a>
          )}
          {card.outlier_ratio && (
            <span className="text-accent tabular-nums ml-auto">{card.outlier_ratio.toFixed(1)}x</span>
          )}
        </div>
      )}
      <p
        className={`text-xs text-text-primary leading-snug whitespace-pre-wrap ${expanded ? '' : 'line-clamp-4'}`}
        onClick={(e) => { e.stopPropagation(); if (isLong) setExpanded((v) => !v); }}
        style={isLong ? { cursor: 'pointer' } : undefined}
        title={isLong ? (expanded ? 'Haz clic para plegar' : 'Haz clic para verlo entero') : undefined}
      >
        {card.raw_content}
      </p>
      {isLong && (
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
          className="text-[10px] text-accent hover:text-accent-light mt-1"
        >
          {expanded ? 'Ver menos ↑' : 'Ver más ↓'}
        </button>
      )}
      {/* Quick move arrows on small screens / accessibility */}
      <div className="flex items-center justify-between mt-2 text-[10px]">
        <select
          value={card.pipeline_status}
          onChange={(e) => onMove(card.id, e.target.value as KanbanIdea['pipeline_status'])}
          className="bg-bg-secondary border border-border rounded px-1.5 py-0.5 text-text-secondary text-[10px]"
        >
          {COLUMN_META.map((c) => (
            <option key={c.key} value={c.key}>{c.emoji} {c.label}</option>
          ))}
        </select>
        <span className="text-text-muted">
          {new Date(card.updated_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
        </span>
      </div>
    </div>
  );
}
