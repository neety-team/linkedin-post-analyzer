import { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { Avatar, ErrorBoundary, fmtRelative } from './shared';
import LeadMagnetWorkspace from './LeadMagnetWorkspace';
import type { GridPost } from './lmTypes';

// LeadMagnetPanel — the "Lead Magnet" sub-tab.
//
// The job: a lead magnet post tells people to comment a keyword, and in
// exchange we send them a resource by DM. This tab does that end to end —
// pick the account, pick the post, type the keyword (the keyword alone
// resolves which resource to send, see recursoFor), and get one card per
// person who commented it, each with the reply and the DM already drafted.
//
// Three things worth knowing before reading on:
//
// 1. The drafts are TEMPLATES, not model output (see leadMagnetCopy.ts).
//    They're there the moment the card renders — there's no "generate" step
//    for the normal case. The AI button only shows on comments that asked a
//    real question.
//
// 2. LinkedIn solo entrega un mensaje privado a un contacto de 1er grado, y
//    desde el 2026-08-17 esta herramienta NO AGREGA A NADIE: se retiraron la
//    invitación con nota y el InMail. Quedan tres caminos, los tres gratis, y la
//    tarjeta elige sola:
//      · 1er grado                             → DM normal
//      · nos mandó solicitud y sigue pendiente → mensaje contestando a esa
//        solicitud (llega igual, y NO se acepta: aceptar en masa es lo que
//        dispara los límites de LinkedIn)
//      · ni una cosa ni la otra                → NADA por privado. Se le pide en
//        público que nos mande ÉL la solicitud, y cuando llegue salta a
//        «Solicitudes pedidas», arriba, con el recurso ya escrito.
//    Ver `canal` en CommenterCard.
//
// 3. Sends are ONE BY ONE, deliberately. No "send all" — a hundred DMs in a
//    burst from one account is the pattern LinkedIn restricts accounts for,
//    and losing the account costs more than any lead magnet earns.
//
// 4. UN ENVÍO NO ESTÁ ENVIADO HASTA QUE SE COMPRUEBA (Iker, 2026-08-13). El
//    backend relee LinkedIn después de mandar y devuelve `verificado`. La
//    tarjeta pinta tres estados distintos —verificado, sin comprobar, caído—
//    porque el día que la cuenta de Unai tenía baneadas las invitaciones esto
//    decía "✓ enviado" sobre gente que no recibió absolutamente nada.

interface ManagedAccount {
  id: string;
  name: string | null;
  profile_image_url?: string | null;
}

interface Props {
  accounts: ManagedAccount[];
  onSelectCreator: (id: string) => void;
}


export default function LeadMagnetPanel({ accounts, onSelectCreator }: Props) {
  // Same deferred-load shape as the Comentarios tab: nothing fetches until
  // an account is chosen.
  const [creator, setCreator] = useState<string>('');
  const [postId, setPostId] = useState<string | null>(null);

  const { data: gridData, loading: gridLoading, error: gridError } = useApi<{ posts: GridPost[] }>(
    creator ? `/api/accounts/lead-magnet/posts?creator_id=${creator}` : null
  );

  const posts = gridData?.posts ?? [];
  const selectedPost = posts.find((p) => p.id === postId) ?? null;

  const pickAccount = (v: string) => {
    setCreator(v);
    setPostId(null); // a post from the old account must not survive the switch
    onSelectCreator(v);
  };

  return (
    <div className="space-y-4 min-w-0">
      {/* Step 1 — account */}
      <div className="bg-bg-card border border-border rounded-xl p-4 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">Cuenta:</span>
          <select
            value={creator}
            onChange={(e) => pickAccount(e.target.value)}
            className="bg-bg-primary border border-border rounded-md px-2 py-1 text-xs"
          >
            <option value="" disabled>— elige una cuenta —</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name || 'Sin nombre'}</option>
            ))}
          </select>
        </div>
        {selectedPost && (
          <button
            onClick={() => setPostId(null)}
            className="text-xs text-accent hover:text-accent-light"
          >
            ← Cambiar de post
          </button>
        )}
      </div>

      {!creator && (
        <p className="text-center text-text-muted text-sm py-10">
          Elige una cuenta para ver sus posts.
        </p>
      )}

      {/* Step 2 — the post grid. Hidden once a post is picked, so the working
          area isn't competing with 20 cards you're done with. */}
      {creator && !selectedPost && (
        <div>
          {gridLoading && <p className="text-center text-text-muted text-sm py-10">Cargando posts…</p>}
          {gridError && <p className="text-center text-red-400 text-sm py-6">{gridError}</p>}
          {!gridLoading && posts.length === 0 && (
            <p className="text-center text-text-muted text-sm py-10">Esta cuenta no tiene posts registrados.</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {posts.map((p) => (
              <PostTile key={p.id} post={p} onPick={() => setPostId(p.id)} />
            ))}
          </div>
        </div>
      )}

      {/* Step 3 — the working area. Keyed by post id so switching posts
          REMOUNTS it: every draft, every "ver más" and the loaded config
          belong to one post, and carrying any of it across would mean
          sending post A's resource to post B's commenters. */}
      {selectedPost && (
        <ErrorBoundary donde="el panel del lead magnet">
          <LeadMagnetWorkspace key={selectedPost.id} post={selectedPost} creatorId={creator} />
        </ErrorBoundary>
      )}
    </div>
  );
}

// Etiqueta visible del formato. Solo para mostrar: `content_type` sigue siendo
// el valor de la BD y no se toca.
const FORMATO_LABEL: Record<string, string> = {
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

// One tile in the post grid. No thumbnail on purpose: LinkedIn's image URLs
// are time-signed and 403 once expired, so a 20-tile grid would fire 20
// refresh calls and still show holes. The hook is what identifies the post
// anyway.
function PostTile({ post, onPick }: { post: GridPost; onPick: () => void }) {
  const headline = (post.hook_text || post.content_text || '(sin texto)')
    .replace(/\s+/g, ' ')
    .trim();
  return (
    <button
      onClick={onPick}
      className="text-left bg-bg-card border border-border hover:border-accent/50 rounded-xl p-3 transition-colors min-w-0 flex flex-col gap-2"
    >
      <div className="flex items-center gap-2 min-w-0">
        <Avatar src={post.creator_image} name={post.creator_name} size={20} />
        <span className="text-[11px] text-text-muted whitespace-nowrap">{fmtRelative(post.published_at)}</span>
        {post.content_type && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-primary border border-border text-text-muted whitespace-nowrap">
            {FORMATO_LABEL[post.content_type] || post.content_type}
          </span>
        )}
      </div>
      <p className="text-xs text-text-primary line-clamp-3 flex-1">{headline}</p>
      <div className="flex items-center gap-3 text-[11px] text-text-muted">
        <span className="tabular-nums">💬 {post.comments_count ?? 0}</span>
        <span className="tabular-nums">👍 {post.likes_count ?? 0}</span>
      </div>
    </button>
  );
}
