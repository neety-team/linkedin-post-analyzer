import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiPost } from '../hooks/useApi';
import MediaViewer, { NO_MEDIA_TYPES } from '../components/MediaViewer';

const BASE = import.meta.env.VITE_API_URL || '';

// Tinder-style triage of outlier posts. Pull a deck of unswiped outliers
// (highest outlier_ratio first), show one card at a time, swipe right → save
// as an idea in the kanban "Propuesta" column, swipe left → mark skipped so
// it never shows again. Goal: turn 1k+ outliers into a small high-signal
// queue of ideas without scrolling through Inspiration.

interface SwipeCard {
  id: string;
  content_text: string;
  hook_text: string | null;
  hook_type: string;
  post_structure: string;
  content_type: string;
  outlier_ratio: number;
  likes_count: number;
  comments_count: number;
  reposts_count: number;
  impressions_count: number | null;
  published_at: string | null;
  post_url: string | null;
  topic: string | null;
  reaction_mix: Record<string, number> | null;
  creator_name: string;
  creator_headline: string | null;
  creator_image: string | null;
  creator_followers: number;
}

function fmt(n: number | null | undefined): string {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function fmtDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Reaction emoji used for the "Funny share" badge that flags audience-detected
// memes — same definition as Inspiration so the signal stays consistent.
function funnyPct(mix: Record<string, number> | null): number {
  if (!mix) return 0;
  const total = Number(mix.total) || Object.entries(mix)
    .filter(([k]) => !['total', 'sampled', '_error', '_attempted_at', 'UNKNOWN'].includes(k))
    .reduce((s, [, v]) => s + (Number(v) || 0), 0);
  if (!total) return 0;
  return ((Number(mix.ENTERTAINMENT) || 0) + (Number(mix.FUNNY) || 0)) / total;
}

export default function Swipe() {
  const [deck, setDeck] = useState<SwipeCard[]>([]);
  const [remaining, setRemaining] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [lastAction, setLastAction] = useState<{ action: 'like' | 'skip'; cardText: string } | null>(null);
  const [counts, setCounts] = useState({ liked: 0, skipped: 0 });
  // 'idle' | 'liking' | 'skipping' — drives the slide animation
  const [animState, setAnimState] = useState<'idle' | 'liking' | 'skipping'>('idle');

  const loadDeck = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/ideas/swipe/deck?limit=20`);
      const data = await res.json();
      setDeck(data.cards || []);
      setRemaining(data.remaining || 0);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDeck(); }, [loadDeck]);

  const current = deck[0];
  const nextCard = deck[1];

  const swipe = async (action: 'like' | 'skip') => {
    if (!current || acting) return;
    setActing(true);
    setAnimState(action === 'like' ? 'liking' : 'skipping');
    try {
      await apiPost('/api/ideas/swipe', { post_id: current.id, action });
      setLastAction({ action, cardText: current.hook_text || current.content_text.slice(0, 60) });
      setCounts((c) => action === 'like' ? { ...c, liked: c.liked + 1 } : { ...c, skipped: c.skipped + 1 });
      // Tiny delay so the animation reads before swap
      await new Promise((r) => setTimeout(r, 220));
      setDeck((d) => d.slice(1));
      setRemaining((r) => Math.max(0, r - 1));
      // Top up when the deck gets shallow
      if (deck.length <= 5) loadDeck();
    } catch (e: any) {
      console.error(e);
    } finally {
      setAnimState('idle');
      setActing(false);
    }
  };

  // Keyboard shortcuts: ← skip / → like / space like
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (acting || !current) return;
      if (e.key === 'ArrowLeft') swipe('skip');
      else if (e.key === 'ArrowRight' || e.key === ' ') swipe('like');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [current, acting]); // eslint-disable-line react-hooks/exhaustive-deps

  const fp = useMemo(() => current ? funnyPct(current.reaction_mix) : 0, [current]);

  return (
    <div className="space-y-6">
      {/* Header + counters */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold mb-1">🔥 Swipe</h1>
          <p className="text-text-secondary text-sm">
            Triaje rápido de outliers. ← descartar · → guardar como idea · espacio guardar
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="text-text-muted">
            <span className="text-accent font-semibold tabular-nums">{remaining}</span> por revisar
          </div>
          <div className="text-text-muted">
            <span className="text-green-400 font-semibold tabular-nums">{counts.liked}</span> guardadas
          </div>
          <div className="text-text-muted">
            <span className="text-red-400 font-semibold tabular-nums">{counts.skipped}</span> descartadas
          </div>
        </div>
      </div>

      {/* Card stack */}
      <div className="relative max-w-2xl mx-auto" style={{ minHeight: 480 }}>
        {loading && deck.length === 0 ? (
          <p className="text-center text-text-muted py-20">Cargando tarjetas…</p>
        ) : !current ? (
          <div className="bg-bg-card border border-border rounded-2xl p-12 text-center">
            <p className="text-2xl mb-2">🎉</p>
            <p className="text-text-primary font-medium mb-1">No quedan outliers por revisar</p>
            <p className="text-text-muted text-sm">
              Cuando entren nuevos outliers aparecerán aquí. Mientras tanto, revisa
              las ideas guardadas en el kanban.
            </p>
            <a
              href="/ideas"
              className="inline-block mt-4 px-4 py-2 rounded-lg bg-accent text-bg-primary text-sm font-medium hover:bg-accent-light"
            >
              Ir al kanban de ideas →
            </a>
          </div>
        ) : (
          <>
            {/* Next card peeks underneath for the "deck" feel */}
            {nextCard && (
              <div
                className="absolute inset-0 bg-bg-card border border-border rounded-2xl"
                style={{ transform: 'scale(0.96) translateY(8px)', opacity: 0.6 }}
              />
            )}
            <SwipeCardView card={current} animState={animState} funnyPct={fp} />
          </>
        )}
      </div>

      {/* Action buttons */}
      {current && (
        <div className="flex justify-center items-center gap-8">
          <button
            onClick={() => swipe('skip')}
            disabled={acting}
            className="w-16 h-16 rounded-full bg-red-500/10 border-2 border-red-500/40 text-red-400 text-2xl hover:bg-red-500/20 hover:scale-105 active:scale-95 disabled:opacity-50 transition-all"
            title="Descartar (←)"
          >
            ✕
          </button>
          {lastAction && (
            <div className="text-center text-xs text-text-muted max-w-[200px]">
              <div className={lastAction.action === 'like' ? 'text-green-400' : 'text-red-400'}>
                {lastAction.action === 'like' ? '✓ Guardada' : '✗ Descartada'}
              </div>
              <div className="truncate mt-0.5">{lastAction.cardText}</div>
            </div>
          )}
          <button
            onClick={() => swipe('like')}
            disabled={acting}
            className="w-16 h-16 rounded-full bg-green-500/10 border-2 border-green-500/40 text-green-400 text-2xl hover:bg-green-500/20 hover:scale-105 active:scale-95 disabled:opacity-50 transition-all"
            title="Guardar como idea (→ o espacio)"
          >
            ❤
          </button>
        </div>
      )}
    </div>
  );
}

function SwipeCardView({
  card,
  animState,
  funnyPct,
}: {
  card: SwipeCard;
  animState: 'idle' | 'liking' | 'skipping';
  funnyPct: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const isLong = card.content_text.length > 400;
  const transform =
    animState === 'liking' ? 'translate(60%, -10%) rotate(12deg)' :
    animState === 'skipping' ? 'translate(-60%, -10%) rotate(-12deg)' :
    'none';
  const opacity = animState === 'idle' ? 1 : 0;
  return (
    <div
      className="relative bg-bg-card border border-border rounded-2xl p-6 transition-all duration-200"
      style={{ transform, opacity }}
    >
      {/* Outlier badge */}
      <div className="absolute top-4 right-4 bg-accent/20 border border-accent/40 text-accent text-sm font-bold px-2.5 py-1 rounded-full tabular-nums">
        {card.outlier_ratio.toFixed(1)}x
      </div>

      {/* Creator */}
      <div className="flex items-center gap-3 mb-4 pr-16">
        {card.creator_image ? (
          <img src={card.creator_image} alt="" className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-bg-secondary flex items-center justify-center text-text-muted">
            {(card.creator_name || '?')[0]}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{card.creator_name}</p>
          <p className="text-[11px] text-text-muted truncate">
            {fmt(card.creator_followers)} seguidores · {fmtDate(card.published_at)}
          </p>
        </div>
      </div>

      {/* Hook (highlighted) */}
      {card.hook_text && (
        <p className="text-text-primary font-semibold text-base leading-snug mb-3 border-l-2 border-accent/50 pl-3">
          {card.hook_text}
        </p>
      )}

      {/* Body */}
      <p className="text-text-secondary text-sm leading-relaxed whitespace-pre-wrap mb-3">
        {expanded || !isLong ? card.content_text : card.content_text.slice(0, 400) + '…'}
      </p>
      {isLong && (
        <button onClick={() => setExpanded((v) => !v)} className="text-[11px] text-accent mb-3 hover:text-accent-light">
          {expanded ? 'Ver menos ↑' : 'Ver más ↓'}
        </button>
      )}

      {/* Media */}
      {!NO_MEDIA_TYPES.has(card.content_type) && (
        <div className="mb-3">
          {/* key={card.id} forces a remount when the deck advances so the
              "Ver creatividad" button comes back fresh on every card —
              otherwise MediaViewer's internal "shown" state leaks across
              swipes and the previous card's image stays expanded. */}
          <MediaViewer key={card.id} postId={card.id} contentType={card.content_type} linkedinUrl={card.post_url} />
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-text-muted border-t border-border/50 pt-3 flex-wrap">
        <span>👍 {fmt(card.likes_count)}</span>
        <span>💬 {fmt(card.comments_count)}</span>
        <span>🔁 {fmt(card.reposts_count)}</span>
        {card.impressions_count != null && <span>👁 {fmt(card.impressions_count)}</span>}
        {funnyPct > 0.05 && (
          <span className={funnyPct > 0.25 ? 'text-orange-300 font-semibold' : ''}>
            😂 {Math.round(funnyPct * 100)}%{funnyPct > 0.25 && ' · meme'}
          </span>
        )}
        {card.topic && (
          <span className="text-amber-400">📂 {card.topic}</span>
        )}
        {card.post_url && (
          <a
            href={card.post_url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-accent hover:text-accent-light"
          >
            Ver original ↗
          </a>
        )}
      </div>
    </div>
  );
}
