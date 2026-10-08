import { Component, useEffect, useRef, useState } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { apiPost } from '../../hooks/useApi';

// Pieces shared by the Comentarios tab (RepliesPanel) and the Lead Magnet
// tab (LeadMagnetPanel). Both show LinkedIn comments and both let you react
// to them, so the avatar, the relative clock, the emoji picker and the
// reaction bar live here rather than being copied into each panel.

// ⛔ LA PANTALLA NEGRA (Iker, 2026-08-14).
//
// La app no tenía NI UN error boundary, así que cualquier excepción en un
// render desmontaba el árbol entero y dejaba la pantalla en negro, muda: ni
// mensaje, ni pista, ni forma de saber si era la app, la red o LinkedIn. Pasó
// con un `ReferenceError` de dos líneas y costó una sesión entera de
// diagnóstico a ciegas.
//
// Esto no arregla ningún fallo — hace que se VEA, que es lo que faltaba. Y se
// pone a dos niveles a propósito:
//   · alrededor de UNA tarjeta → la tarjeta rota se pinta en rojo y las otras
//     40 siguen funcionando, así que el trabajo del día no se para.
//   · alrededor del panel      → si lo que revienta es la pantalla, al menos
//     sale el error escrito en vez del vacío.
//
// El mensaje va A LA VISTA y sin recortar: el que lo lee es quien va a
// pegármelo, y un error recortado no sirve para nada.
export class ErrorBoundary extends Component<
  { children: ReactNode; donde: string },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // A la consola también, con el stack de componentes, que es lo que dice
    // QUÉ tarjeta y no solo qué línea minificada.
    console.error(`[${this.props.donde}] se ha roto:`, error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="bg-danger/10 border border-danger/40 rounded-xl p-4 space-y-1">
        <p className="text-sm font-medium text-danger">
          💥 Se ha roto {this.props.donde}
        </p>
        <p className="text-[11px] text-danger font-mono break-words whitespace-pre-wrap">
          {this.state.error.message || String(this.state.error)}
        </p>
        <p className="text-[11px] text-text-muted">
          Esto es un fallo de la herramienta, no de LinkedIn: no se ha mandado nada. Pásame el texto de
          arriba y lo arreglo. Lo demás de la pantalla sigue funcionando.
        </p>
      </div>
    );
  }
}

export interface CommentAuthor {
  name: string | null;
  headline: string | null;
  profile_picture_url: string | null;
  public_identifier: string | null;
  profile_id: string | null;
  // Company page → not mentionable, so we skip the @-mention on replies.
  is_company?: boolean;
  // 1 / 2 / 3 degrees of separation from the account that owns the post,
  // or null when LinkedIn doesn't say. Only the Lead Magnet tab uses it
  // (a plain DM is 1st-degree only).
  network_distance?: number | null;
}

export interface Thread {
  id: string;
  text: string;
  date: string | null;
  author: CommentAuthor;
  replies: Thread[];
  // OJO con la semántica, que cambió el 2026-08-11: es "contestado LO ÚLTIMO",
  // no "contestado alguna vez". Un hilo que ya respondimos vuelve a false en
  // cuanto alguien escribe después de nosotros.
  answered_by_author?: boolean;
  // Los mensajes que han entrado DESPUÉS de nuestra última intervención. Es lo
  // que hay que contestar; el resto del hilo ya está atendido.
  pending_followups?: Thread[];
  my_reaction?: string | null;
  is_media_only?: boolean;
}

// The 6 LinkedIn reactions, in the order LinkedIn shows them on hover.
// `type` is the lowercase key the backend + Unipile expect; emoji + label
// are for the UI.
export const REACTIONS: { type: string; emoji: string; label: string }[] = [
  { type: 'like', emoji: '👍', label: 'Recomendar' },
  { type: 'celebrate', emoji: '👏', label: 'Celebrar' },
  { type: 'support', emoji: '🫶', label: 'Apoyar' },
  { type: 'love', emoji: '❤️', label: 'Me encanta' },
  { type: 'insightful', emoji: '💡', label: 'Interesante' },
  { type: 'funny', emoji: '😄', label: 'Divertido' },
];

export function fmtRelative(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso).getTime();
  if (!Number.isFinite(d)) return '';
  const diff = Date.now() - d;
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h`;
  const day = Math.floor(h / 24);
  if (day < 30) return `${day} d`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo} ${mo === 1 ? 'mes' : 'meses'}`;
  const y = Math.floor(mo / 12);
  return `${y} ${y === 1 ? 'año' : 'años'}`;
}

export function Avatar({
  src,
  name,
  size = 32,
}: {
  src: string | null | undefined;
  name: string | null;
  size?: number;
}) {
  const initial = (name || '?')[0]?.toUpperCase() || '?';
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className="rounded-full object-cover border border-border"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full bg-bg-primary border border-border text-text-muted flex items-center justify-center text-xs"
      style={{ width: size, height: size }}
    >
      {initial}
    </div>
  );
}

// Curated emoji set for the reply box — common, comment-appropriate ones.
export const REPLY_EMOJIS = [
  '😊', '😅', '😂', '🤣', '😉', '😍', '🤩', '😎', '🤔', '🫡',
  '👀', '🙌', '👏', '👍', '🙏', '🔥', '💪', '🚀', '💯', '✅',
  '🎯', '💡', '⚡', '📈', '🤝', '❤️', '🥳', '😮',
];

// Small emoji picker: a 😊 button that toggles a popover grid. Clicking
// an emoji calls onPick (the parent inserts it at the textarea cursor).
// Closes on pick or on click-outside.
export function EmojiPicker({ onPick, disabled }: { onPick: (e: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        title="Añadir emoji"
        className="text-sm px-2 py-1 rounded-md border border-border text-text-secondary hover:border-accent/40 disabled:opacity-50 transition-colors"
      >
        😊
      </button>
      {open && (
        <div className="absolute z-20 bottom-full mb-1 left-0 w-56 max-h-40 overflow-y-auto p-2 rounded-md border border-border bg-bg-card shadow-lg grid grid-cols-7 gap-1">
          {REPLY_EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => { onPick(e); setOpen(false); }}
              className="text-lg leading-none p-1 rounded hover:bg-bg-primary"
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Reusable reaction bar for ANY comment — top-level OR a reply. Reacting
// to a comment goes through the same endpoint regardless of nesting
// (post_id + comment_id), so this component just needs the post id + the
// specific comment's social id + the reaction already on it (my_reaction).
// `compact` shrinks it slightly for the nested reply rows.
export function ReactionBar({
  postId,
  commentId,
  initialReaction,
  compact = false,
}: {
  postId: string;
  commentId: string;
  initialReaction?: string | null;
  compact?: boolean;
}) {
  const [reacting, setReacting] = useState<string | null>(null);
  const [reactedType, setReactedType] = useState<string | null>(initialReaction || null);
  const [reactMsg, setReactMsg] = useState<string | null>(null);

  // The component persists across comment refetches (stable key on the
  // row), so the mount-only initial state won't pick up a reaction that
  // appears on a later refetch. Upgrade null→value when the backend
  // reports one; never downgrade.
  useEffect(() => {
    if (initialReaction && !reactedType) setReactedType(initialReaction);
  }, [initialReaction]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleReact = async (reactionType: string) => {
    // One reaction per comment — once set, the bar is locked.
    if (reacting || reactedType) return;
    setReacting(reactionType);
    setReactMsg(null);
    try {
      await apiPost(
        `/api/accounts/posts/${postId}/comments/${encodeURIComponent(commentId)}/react`,
        { reaction_type: reactionType }
      );
      setReactedType(reactionType);
      const r = REACTIONS.find((x) => x.type === reactionType);
      setReactMsg(`✓ Reacción enviada: ${r?.emoji} ${r?.label}`);
    } catch (e: any) {
      setReactMsg(`✗ ${e.message}`);
    } finally {
      setReacting(null);
    }
  };

  if (reactedType) {
    const r = REACTIONS.find((x) => x.type === reactedType);
    return (
      <div className={`mt-1.5 inline-flex items-center gap-1.5 ${compact ? 'text-[10px]' : 'text-[11px]'} text-text-secondary bg-accent/10 border border-accent/30 rounded-md px-2 py-0.5`}>
        <span className="leading-none">{r?.emoji}</span>
        <span>Ya reaccionaste · <span className="text-accent font-medium">{r?.label}</span></span>
      </div>
    );
  }
  return (
    <div className="mt-1.5 flex items-center gap-1 flex-wrap">
      {REACTIONS.map((r) => {
        const isLoading = reacting === r.type;
        return (
          <button
            key={r.type}
            onClick={() => handleReact(r.type)}
            disabled={!!reacting}
            title={r.label}
            className={`${compact ? 'text-sm' : 'text-base'} leading-none px-1.5 py-1 rounded-md border transition-all disabled:cursor-not-allowed border-transparent hover:border-border hover:bg-bg-primary opacity-70 hover:opacity-100 ${
              isLoading ? 'animate-pulse opacity-100' : ''
            }`}
          >
            {r.emoji}
          </button>
        );
      })}
      {reactMsg && <span className="text-[10px] text-text-muted ml-1">{reactMsg}</span>}
    </div>
  );
}
