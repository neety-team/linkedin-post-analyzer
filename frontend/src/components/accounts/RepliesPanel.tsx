import { useEffect, useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { PostGroup } from './CommentCards';
import type { PendingGroup } from './CommentCards';
import SolicitudesGlobal from './SolicitudesGlobal';
import type { CuentaResumen } from './SolicitudesGlobal';
import LeadMagnetWorkspace from './LeadMagnetWorkspace';
import { ErrorBoundary } from './shared';
import type { GridPost } from './lmTypes';

// RepliesPanel — the "Comentarios" sub-tab. Pick one of the managed posts
// (newest first), see its unanswered top-level comments, generate a draft
// reply in the author's own voice (Iker or Unai based on who posted), edit
// it, send it via Unipile. Drafts are local state — they vanish on tab
// switch by design (so the user can't accidentally re-send stale text).

interface ManagedAccount {
  id: string;
  name: string | null;
  profile_image_url?: string | null;
}


interface Props {
  accounts: ManagedAccount[];
  selectedCreator: string; // 'all' or creator id — shared with the BI tab
  onSelectCreator: (id: string) => void;
}

// Shape returned by GET /api/accounts/comments/pending.
interface PendingResponse {
  groups: PendingGroup[];
  // Una fila por cuenta del filtro, con sus solicitudes ya llegadas. La calcula
  // el backend con UNA llamada a Unipile por cuenta.
  cuentas?: CuentaResumen[];
  total_pending: number;
  posts_scanned: number;
}

// Unified "pending comments inbox": EVERY unanswered comment across recent
// posts, grouped by post. We fetch the combined inbox (all accounts) ONCE
// and filter by account CLIENT-SIDE — so switching accounts is instant (no
// re-scan). Each post shows its first few pending comments with a per-post
// "ver más", and the whole list paginates with an overall "ver más".
export default function RepliesPanel({ accounts, onSelectCreator }: Props) {
  // Deferred load: entering the Comments tab must NOT auto-fetch (the scan
  // is slow). We start with an EMPTY choice and show a "elige una cuenta"
  // prompt; the fetch only fires once the user picks something. `choice` is
  // local (not seeded from the shared filter) so every entry starts fresh.
  // Passing null to useApi keeps it idle until then. The scan itself is the
  // same regardless of account (backend returns all accounts, we filter
  // client-side), so any choice triggers the one fetch and switching between
  // accounts afterwards is instant.
  const [choice, setChoice] = useState<string>('');
  const { data, loading, error, refetch } = useApi<PendingResponse>(
    choice ? '/api/accounts/comments/pending' : null
  );

  // Sube con cada «↻ Actualizar» y remonta el bloque de solicitudes, que tiene su
  // propia peticion. Sin esto, Actualizar recargaba los comentarios y dejaba las
  // solicitudes congeladas — y ese es el sitio donde estan los leads.
  const [recargaKey, setRecargaKey] = useState(0);

  const GROUPS_PAGE = 5;
  const [visibleGroups, setVisibleGroups] = useState(GROUPS_PAGE);
  useEffect(() => {
    setVisibleGroups(GROUPS_PAGE);
  }, [choice]);

  const allGroups = data?.groups ?? [];
  // Client-side account filter — instant, no network.
  const groups = choice === 'all'
    ? allGroups
    : allGroups.filter((g) => g.post.creator_id === choice);
  const totalPending = groups.reduce((n, g) => n + g.pending_count, 0);
  // Las cuentas del bloque de solicitudes se filtran igual que los grupos: con
  // una cuenta elegida, las solicitudes de las otras dos no pintan nada aqui.
  const cuentas = (data?.cuentas ?? []).filter((c) => choice === 'all' || c.creator_id === choice);

  const pick = (v: string) => {
    setChoice(v);
    onSelectCreator(v); // keep the shared filter in sync for the other tabs
  };

  return (
    <div className="space-y-4 min-w-0">
      {/* Header: account selector + total + refresh */}
      <div className="bg-bg-card border border-border rounded-xl p-4 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">Cuenta:</span>
          <select
            value={choice}
            onChange={(e) => pick(e.target.value)}
            className="bg-bg-primary border border-border rounded-md px-2 py-1 text-xs"
          >
            <option value="" disabled>— elige una cuenta —</option>
            <option value="all">Todas</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name || 'Sin nombre'}</option>
            ))}
          </select>
        </div>
        {choice && data && (
          <span className="text-xs text-text-secondary">
            <span className="font-semibold text-text-primary">{totalPending}</span> comentario
            {totalPending === 1 ? '' : 's'} sin responder en {groups.length} post{groups.length === 1 ? '' : 's'}
          </span>
        )}
        {choice && (
          <button
            onClick={() => { refetch(); setRecargaKey((k) => k + 1); }}
            disabled={loading}
            className="ml-auto text-xs text-text-muted hover:text-accent disabled:opacity-50 transition-colors"
            title="Vuelve a buscar comentarios pendientes en tus posts recientes"
          >
            {loading ? '↻ Buscando…' : '↻ Actualizar'}
          </button>
        )}
      </div>

      {/* Las solicitudes pedidas, arriba del todo y de TODAS las cuentas del
          filtro. Ya no hace falta entrar a ningun post para verlas, que era por
          donde se perdian leads. */}
      {choice && cuentas.length > 0 && <SolicitudesGlobal cuentas={cuentas} recargaKey={recargaKey} />}

      {!choice && (
        <p className="text-center text-text-muted text-sm py-10">
          Elige una cuenta arriba para buscar sus comentarios pendientes.
        </p>
      )}

      {loading && !data && (
        <p className="text-center text-text-muted text-sm py-10">
          Buscando comentarios pendientes en tus posts recientes… (puede tardar unos segundos)
        </p>
      )}
      {error && (
        <p className="text-center text-danger text-sm py-6">
          {error} <button onClick={refetch} className="underline">Reintentar</button>
        </p>
      )}
      {data && groups.length === 0 && (
        <p className="text-center text-text-muted text-sm py-10">🎉 No hay comentarios pendientes.</p>
      )}

      {groups.slice(0, visibleGroups).map((g) => (
        <PostGroup key={g.post.id} group={g}>
          {/* Un lead magnet se trabaja con SU panel entero, el mismo que tenia la
              pestana Lead Magnet: la config del recurso, el filtro por grado, los
              dos bloques de seguimiento y una tarjeta por comentarista con la
              respuesta publica Y el envio privado. Es el mismo componente, no una
              copia: las tres defensas contra el doble envio viven ahi dentro.
              Se monta solo al desplegar, que es lo que evita que abrir la pestana
              dispare una llamada a LinkedIn por cada lead magnet de la lista. */}
          {g.es_lead_magnet ? (
            <ErrorBoundary donde={`el lead magnet de ${g.post.creator_name || 'este post'}`}>
              <LeadMagnetWorkspace
                post={{
                  id: g.post.id,
                  hook_text: g.post.hook_text,
                  content_text: g.post.content_text,
                  content_type: g.post.content_type,
                  published_at: g.post.published_at,
                  post_url: g.post.post_url,
                  comments_count: g.post.comments_count ?? null,
                  likes_count: g.post.likes_count ?? null,
                  creator_name: g.post.creator_name,
                  creator_image: g.post.creator_image,
                } satisfies GridPost}
                creatorId={g.post.creator_id}
                compacto
              />
            </ErrorBoundary>
          ) : null}
        </PostGroup>
      ))}

      {groups.length > visibleGroups && (
        <button
          onClick={() => setVisibleGroups((v) => v + GROUPS_PAGE)}
          className="w-full py-2.5 text-xs font-medium text-accent hover:text-accent-strong border border-border hover:border-accent/40 rounded-lg transition-colors"
        >
          Ver más posts ({groups.length - visibleGroups} restantes) ↓
        </button>
      )}
    </div>
  );
}
