/* Las tarjetas de la pestana Comments: el grupo de un post, la tarjeta de un
   comentario y la caja de sub-respuesta.

   Salieron de RepliesPanel.tsx el 2026-08-20 al fusionar Comments con Lead
   Magnet: el contenedor pasa a pintar dos clases de grupo (normal y lead
   magnet) y con las tarjetas dentro eran mas de 1.000 lineas en un fichero.

   MOVIMIENTO LITERAL: no se cambio una sola linea de logica. La mencion al
   PRIMERO sin contestar, las sub-respuestas y las reacciones son exactamente el
   mismo codigo que llevaba meses funcionando. */
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { apiPost } from '../../hooks/useApi';
import { Avatar, EmojiPicker, ReactionBar, fmtRelative } from './shared';
import type { Thread } from './shared';

// Lo que devuelve GET /api/accounts/comments/pending por cada post.
export interface PendingGroup {
  post: {
    id: string;
    hook_text: string | null;
    content_text: string | null;
    content_type: string | null;
    published_at: string | null;
    post_url: string | null;
    creator_id: string;
    creator_name: string | null;
    creator_image: string | null;
    // Los tres de abajo llegan desde el 2026-08-20, al fusionar Lead Magnet en
    // esta pestana: los pide el workspace del lead magnet cuando se monta aqui.
    comments_count?: number | null;
    likes_count?: number | null;
    pillar?: string | null;
  };
  pending_threads: Thread[];
  pending_count: number;
  // Su pilar es `lead_magnet`: al desplegarlo se monta el workspace entero en
  // vez de las tarjetas de comentario sueltas.
  es_lead_magnet?: boolean;
  // ⛔ LAS TRES CUENTAS DEL LEAD MAGNET, Y NO UNA (Iker, 2026-08-20). Habia un
  // solo `recursos_pendientes` que contaba "comentaristas sin recurso", y saco un
  // post con "18 sin mandar" donde no habia UNA sola persona a la que pudieras
  // mandarle nada: eran 18 esperando a que ellos dieran el paso. Pendiente no es
  // lo mismo que disponible.
  //
  // accionables       → puedes actuar YA (DM directo, DM a su solicitud, o
  //                     pedirle el paso porque aun no se lo has pedido)
  // esperando_su_paso → ya se lo pediste y no lo ha dado. La pelota es suya y
  //                     por si sola NO saca el post en esta lista.
  // fallidos          → el DM salio y NO llego. Hay que volver a escribirle.
  accionables?: number;
  esperando_su_paso?: number;
  fallidos?: number;
  // Invitados con nota que NO llevaba el enlace (el caso `lista`, historico): su
  // recurso sigue sin salir y se manda desde el bloque Seguimientos del post, no
  // desde las tarjetas. Cuenta aparte para que el post no desaparezca de la lista
  // llevandose ese trabajo con el.
  seguimientos_pendientes?: number;
}

// One post + its pending comments. Shows the first PER_POST comments with
// a per-post "ver más". Replying to a comment dismisses it locally (so it
// disappears + the count drops) without a full re-scan; the header's
// "Actualizar" does the real refetch. When every comment is handled, the
// whole group collapses.
export function PostGroup({ group, children }: { group: PendingGroup; children?: ReactNode }) {
  const PER_POST = 3;
  const [visible, setVisible] = useState(PER_POST);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  // ⛔ ARRANCA PLEGADO, Y EL CUERPO NO SE MONTA HASTA ABRIRLO (Iker, 2026-08-20).
  //
  // No es cosmetico. El workspace de un lead magnet pide sus comentarios a
  // LinkedIn al montarse: con diez grupos abiertos de golpe serian diez llamadas
  // que nadie ha pedido. Por eso el cuerpo se MONTA al abrir y no se esconde con
  // CSS, que es la forma facil y la que dispararia las diez.
  const [abierto, setAbierto] = useState(false);

  const { post } = group;
  const threads = group.pending_threads.filter((t) => !dismissed.has(t.id));
  const esLm = !!group.es_lead_magnet;
  const accionables = group.accionables ?? 0;
  const esperando = group.esperando_su_paso ?? 0;
  const fallidos = group.fallidos ?? 0;
  const seguimientos = group.seguimientos_pendientes ?? 0;
  // ⛔ EN UN LEAD MAGNET NO SE PLIEGA POR NO QUEDAR COMENTARIOS: puede seguir
  // debiendo recursos. Pero `esperando_su_paso` NO cuenta para quedarse: si lo
  // unico que hay es gente a la que ya le pediste la solicitud, aqui no puedes
  // hacer nada y el post solo te haria abrirlo para nada.
  if (threads.length === 0 && !(esLm && (accionables > 0 || fallidos > 0 || seguimientos > 0))) return null;

  const headline = (post.hook_text || post.content_text || '').replace(/\s+/g, ' ').trim().slice(0, 160);

  return (
    <div className="bg-bg-card border border-border rounded-xl p-4 min-w-0">
      {/* La cabecera es el interruptor. Siempre lleva el avatar y el nombre de
          la cuenta (aunque haya una sola elegida): la repeticion pequena es
          preferible a dudar de quien es cada post. */}
      {/* El enlace a LinkedIn va FUERA del boton: un <a> dentro de un <button> es
          HTML invalido y el navegador puede tragarse el clic de uno de los dos. */}
      <div className={`flex items-start gap-2 ${abierto ? 'mb-3 pb-3 border-b border-border' : ''}`}>
      <button
        onClick={() => setAbierto((v) => !v)}
        className="flex-1 text-left min-w-0"
      >
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="text-text-muted text-xs w-3 flex-shrink-0">{abierto ? '▾' : '▸'}</span>
          <Avatar src={post.creator_image} name={post.creator_name} size={24} />
          <span className="text-sm font-medium whitespace-nowrap">{post.creator_name}</span>
          <span className="text-[10px] text-text-muted whitespace-nowrap">·</span>
          <span className="text-[11px] text-text-muted whitespace-nowrap">{fmtRelative(post.published_at)}</span>
          {esLm && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-400 border border-sky-500/30 whitespace-nowrap">
              Lead Magnet
            </span>
          )}
          {/* Cada deuda con su color, y separadas. Juntarlas en un numero solo
              esconde la que importa y mezcla trabajo con espera. */}
          {threads.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent border border-accent/30 whitespace-nowrap">
              {threads.length} sin responder
            </span>
          )}
          {accionables > 0 && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 whitespace-nowrap"
              title="Puedes actuar ya: mandarles el recurso por privado, o pedirles la solicitud a los que aún no se la has pedido"
            >
              {accionables} para actuar
            </span>
          )}
          {fallidos > 0 && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/30 whitespace-nowrap"
              title="El envío salió y NO llegó. Dentro, el filtro «Fallidos» los deja solos para reintentar."
            >
              {fallidos} fallidos
            </span>
          )}
          {seguimientos > 0 && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 border border-purple-500/30 whitespace-nowrap"
              title="Invitados con nota antes del 17/08 cuyo recurso sigue sin salir. Se mandan desde el bloque Seguimientos, dentro del post."
            >
              {seguimientos} en seguimiento
            </span>
          )}
          {/* En gris y sin borde a proposito: NO es trabajo tuyo, es gente a la
              que ya le pediste la solicitud y no la ha mandado. Se dice para que
              el numero de arriba no parezca que se ha perdido a alguien. */}
          {esperando > 0 && (
            <span className="text-[10px] text-text-muted whitespace-nowrap" title="Ya les pediste la solicitud y no la han mandado. No hay nada que puedas hacer con ellos ahora.">
              · {esperando} esperando su paso
            </span>
          )}
        </div>
        {headline && <p className="text-xs text-text-primary line-clamp-2 mt-1.5">{headline}</p>}
      </button>
      {post.post_url && (
        <a
          href={post.post_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-accent hover:text-accent-light whitespace-nowrap flex-shrink-0 pt-0.5"
        >
          Ver en LinkedIn →
        </a>
      )}
      </div>

      {/* ⛔ Y AQUI NO SE PINTAN LAS DOS COSAS A LA VEZ. En un lead magnet, el
          workspace (`children`) ya trae una tarjeta por comentarista CON su caja
          de respuesta publica dentro: sacar ademas las ThreadCard sueltas seria
          ofrecer dos cajas distintas para el mismo comentario, y contestar por
          las dos manda dos respuestas. */}
      {abierto && (esLm && children ? (
        children
      ) : (
        <>
          <div className="space-y-3">
            {threads.slice(0, visible).map((t) => (
              <ThreadCard
                key={t.id}
                thread={t}
                postId={post.id}
                onReplied={() => setDismissed((s) => new Set(s).add(t.id))}
              />
            ))}
          </div>

          {threads.length > visible && (
            <button
              onClick={() => setVisible((v) => v + PER_POST)}
              className="w-full mt-3 py-2 text-xs font-medium text-accent hover:text-accent-light border border-border hover:border-accent/40 rounded-lg transition-colors"
            >
              Ver más comentarios de este post ({threads.length - visible} restantes) ↓
            </button>
          )}
        </>
      ))}
    </div>
  );
}

// Imperative handle each ThreadCard exposes, so the parent can ask "are you
// already filled in, and if not generate a draft now". Bulk generation just
// awaits each card in turn — sequential is intentional, both for cleaner
// progress UX and to avoid hammering Anthropic / hitting per-key rate limits.
export interface ThreadCardHandle {
  generateIfEmpty: () => Promise<void>;
}

/* Caja de respuesta para una SUB-RESPUESTA dentro de un hilo (Iker, 2026-07-29).
   Antes solo se podia contestar al comentario de primer nivel: las respuestas
   que otra persona le dejaba al comentarista se veian pero no se podian
   contestar, asi que la conversacion se cortaba justo donde ya habia
   interes. El backend no necesitaba nada: `/comments/:commentId/reply` acepta
   cualquier id de comentario y una respuesta TAMBIEN es un comentario, asi que
   basta con pasarle el id de la sub-respuesta.
   Va plegada por defecto: si cada respuesta abriera su textarea, un hilo de
   seis dejaria el panel ilegible. */
// Lo que se dijo en el hilo ANTES de un mensaje, para que el generador lea la
// respuesta en su contexto (Iker, 2026-09-17): Antonio N. siguio la broma de un
// meme contestando a un "jajajaj" nuestro, y leido suelto se tomo en serio.
function hiloAntesDe(thread: Thread, targetId: string): { autor: string | null; texto: string }[] {
  if (targetId === thread.id) return [];
  const previos = [thread];
  for (const r of thread.replies) {
    if (r.id === targetId) break;
    previos.push(r);
  }
  return previos
    .filter((m) => m.text && m.text.trim())
    .map((m) => ({ autor: m.author.name, texto: m.text }));
}

function SubReplyBox({
  postId,
  reply,
  hilo,
}: {
  postId: string;
  reply: Thread;
  hilo: { autor: string | null; texto: string }[];
}) {
  const [abierto, setAbierto] = useState(false);
  const [draft, setDraft] = useState('');
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Mete el emoji donde está el cursor, no al final (Iker, 2026-08-11: aquí
  // faltaba el selector que sí tiene el hilo principal). Misma implementación
  // que allí: si el textarea no está enfocado, se añade al final.
  const insertEmoji = (emoji: string) => {
    const ta = taRef.current;
    if (!ta) { setDraft((d) => d + emoji); return; }
    const start = ta.selectionStart ?? draft.length;
    const end = ta.selectionEnd ?? draft.length;
    setDraft(draft.slice(0, start) + emoji + draft.slice(end));
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + emoji.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  // Misma regla que en el hilo principal: a una pagina de empresa no se la
  // menciona, Unipile devuelve 422 con la plantilla de @-mencion.
  const mention = reply.author.name && reply.author.profile_id && !reply.author.is_company
    ? { name: reply.author.name, profile_id: reply.author.profile_id }
    : null;

  const generar = async () => {
    setGenerating(true); setMsg(null);
    try {
      const res = await apiPost<{ reply: string }>(
        `/api/accounts/posts/${postId}/comments/${encodeURIComponent(reply.id)}/generate`,
        {
          comment_text: reply.text,
          commenter_name: reply.author.name,
          commenter_headline: reply.author.headline,
          commenter_profile_id: reply.author.profile_id,
          hilo,
        }
      );
      setDraft(res.reply);
    } catch (e: any) { setMsg(`✗ ${e.message}`); }
    finally { setGenerating(false); }
  };

  const enviar = async () => {
    if (!draft.trim()) return;
    setSending(true); setMsg(null);
    try {
      await apiPost(
        `/api/accounts/posts/${postId}/comments/${encodeURIComponent(reply.id)}/reply`,
        { text: draft.trim(), mention }
      );
      setSent(true); setMsg('✓ Enviado');
    } catch (e: any) { setMsg(`✗ ${e.message}`); }
    finally { setSending(false); }
  };

  if (sent) return <p className="mt-1 text-[10px] text-green-400">✓ Respondido</p>;

  if (!abierto) {
    // ⛔ BOTÓN DE VERDAD Y EN SU PROPIA LÍNEA (Iker, 2026-08-11). Era texto gris
    // pelado y caía pegado a la barra de reacciones, así que no parecía
    // pulsable: justo el control que ahora hace falta a diario, desde que los
    // follow-ups reaparecen en la bandeja. Mismo estilo que "✨ Generar
    // respuesta" del hilo principal, para que se lea como lo que es.
    //
    // ⛔ Y DE UN SOLO PASO (Iker, 2026-08-11): antes abría la caja vacía y había
    // que pulsar "Generar" dentro, o sea dos clics para lo mismo que en el hilo
    // principal cuesta uno. Ahora este botón abre Y genera. La caja sigue
    // pudiendo escribirse a mano, pero nadie viene aquí a redactar desde cero.
    return (
      <div className="mt-1.5">
        <button
          onClick={() => { setAbierto(true); generar(); }}
          className="text-[10px] px-2.5 py-1 rounded-md border border-accent/40 bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
        >
          ✨ Generar respuesta
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-1.5">
      <textarea
        ref={taRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={2}
        autoFocus
        placeholder={mention ? `${mention.name} …` : 'Tu respuesta…'}
        className="w-full bg-bg-secondary border border-border rounded-md p-2 text-xs text-text-primary focus:outline-none focus:border-accent resize-y"
      />
      <div className="flex items-center gap-2">
        {/* El selector de emojis faltaba aquí y sí estaba en el hilo principal
            (Iker, 2026-08-11). Un follow-up se contesta igual de corto que un
            comentario, y muchas veces el emoji ES media respuesta. */}
        <EmojiPicker onPick={insertEmoji} disabled={generating || sending} />
        <button
          onClick={generar}
          disabled={generating}
          className="text-[10px] px-2 py-1 rounded border border-accent/40 bg-accent/10 text-accent hover:bg-accent/20 disabled:opacity-40"
        >
          {generating ? '…' : '↻ Regenerar'}
        </button>
        <button
          onClick={enviar}
          disabled={sending || !draft.trim()}
          className="text-[10px] px-2 py-1 rounded bg-accent text-bg-primary font-medium hover:bg-accent-light disabled:opacity-40"
        >
          {sending ? 'Enviando…' : 'Enviar'}
        </button>
        <button
          onClick={() => { setAbierto(false); setDraft(''); setMsg(null); }}
          className="text-[10px] text-text-muted hover:text-text-primary"
        >
          Cancelar
        </button>
        {msg && <span className="text-[10px] text-text-muted">{msg}</span>}
      </div>
    </div>
  );
}

// Single top-level comment + its replies + the draft-reply box.
export function ThreadCard({
  thread,
  postId,
  onReplied,
  handleRef,
}: {
  thread: Thread;
  postId: string;
  onReplied: () => void;
  handleRef?: (handle: ThreadCardHandle | null) => void;
}) {
  const [draft, setDraft] = useState<string>('');
  const [voice, setVoice] = useState<string | null>(null);
  // Whether the current draft will be sent with a @-mention chip tagging the
  // commenter. True when the draft starts with the commenter's exact name
  // (the backend rewrites that prefix into Unipile's {{0}} mention template).
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Insert an emoji at the textarea cursor (or append if it's not
  // focused), then restore the caret right after the inserted emoji.
  const insertEmoji = (emoji: string) => {
    const ta = textareaRef.current;
    if (!ta) {
      setDraft((d) => d + emoji);
      return;
    }
    const start = ta.selectionStart ?? draft.length;
    const end = ta.selectionEnd ?? draft.length;
    setDraft(draft.slice(0, start) + emoji + draft.slice(end));
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + emoji.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  // No mention for company pages — they aren't mentionable (Unipile 422s
  // on the @-mention template), so we reply to them as plain text from
  // the start instead of relying on the backend's 422 retry.
  // ⛔ A QUIÉN SE LE CONTESTA: AL ÚLTIMO QUE HABLÓ (Iker, 2026-08-11).
  //
  // Si el hilo trae mensajes posteriores a nuestra última respuesta, el que
  // espera contestación NO es el que abrió el hilo: es el último que escribió.
  // Pasó de verdad en el lead magnet del 11/08 — Iker respondió a Mario y
  // después entró Vicente Garcés pidiendo el recurso. Mencionar a Mario ahí
  // habría sido contestarle al que ya estaba atendido.
  //
  // La respuesta se sigue PUBLICANDO contra `thread.id`: en LinkedIn las
  // respuestas de un hilo son hermanas del comentario de arriba, así que ese
  // es el ancla. Lo que cambia es a quién se menciona y de qué texto se
  // genera el borrador.
  const followups = thread.pending_followups ?? [];
  // ⛔ EL PRIMERO SIN CONTESTAR, NO EL ULTIMO (Iker, 2026-08-11).
  // Lo escribi como "el ultimo que hablo" y el hilo real lo tumbo en el acto:
  // Vicente Garces pidio el recurso a las 09:49 y Mario contesto a las 10:17
  // con un "ahora te lo envia mi companiero". Con el ultimo, el borrador salia
  // dirigido a Mario, que ya estaba atendido, y Vicente —que es el LEAD— se
  // quedaba otra vez sin respuesta. El que espera es el que lleva mas tiempo
  // esperando. Las respuestas vienen ordenadas de vieja a nueva, asi que es
  // la primera. Las demas se ven marcadas en el hilo.
  const target = followups.length ? followups[0] : thread;

  // No mention for company pages — they aren't mentionable (Unipile 422s
  // on the @-mention template), so we reply to them as plain text from
  // the start instead of relying on the backend's 422 retry.
  const mention = target.author.name && target.author.profile_id && !target.author.is_company
    ? { name: target.author.name, profile_id: target.author.profile_id }
    : null;

  const willMention = !!mention && draft
    .slice(0, mention.name.length)
    .toLowerCase() === mention.name.toLowerCase();

  const handleGenerate = async () => {
    setGenerating(true);
    setMsg(null);
    try {
      const res = await apiPost<{ reply: string; voice: string }>(
        `/api/accounts/posts/${postId}/comments/${encodeURIComponent(target.id)}/generate`,
        {
          comment_text: target.text,
          commenter_name: target.author.name,
          commenter_headline: target.author.headline,
          commenter_profile_id: target.author.profile_id,
          hilo: hiloAntesDe(thread, target.id),
        }
      );
      setDraft(res.reply);
      setVoice(res.voice);
    } catch (e: any) {
      setMsg(`✗ ${e.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleSend = async () => {
    if (!draft.trim()) return;
    setSending(true);
    setMsg(null);
    try {
      await apiPost(
        `/api/accounts/posts/${postId}/comments/${encodeURIComponent(thread.id)}/reply`,
        { text: draft.trim(), mention }
      );
      setSent(true);
      setMsg('✓ Enviado a LinkedIn');
      // Refresh the comments list so this thread now shows as answered.
      // Small delay so the LinkedIn-side comment has time to land.
      setTimeout(onReplied, 1500);
    } catch (e: any) {
      setMsg(`✗ ${e.message}`);
    } finally {
      setSending(false);
    }
  };

  // Expose generateIfEmpty so the parent's "Generar todas" loop can drive
  // us. We mirror state into refs so the closure inside the handle always
  // reads the latest values (the handle is registered once on mount).
  const stateRef = useRef({ draft, sent, generating });
  stateRef.current = { draft, sent, generating };
  const generateRef = useRef(handleGenerate);
  generateRef.current = handleGenerate;
  useEffect(() => {
    const handle: ThreadCardHandle = {
      generateIfEmpty: async () => {
        const s = stateRef.current;
        if (s.draft || s.sent || s.generating) return;
        await generateRef.current();
      },
    };
    handleRef?.(handle);
    return () => handleRef?.(null);
  }, [handleRef]);

  return (
    <div
      className={`border rounded-lg p-3 ${
        sent ? 'border-accent/30 bg-accent/5 opacity-70' : 'border-border'
      }`}
    >
      <div className="flex items-start gap-3">
        <Avatar src={thread.author.profile_picture_url} name={thread.author.name} size={32} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 min-w-0">
            <span className="text-sm font-medium whitespace-nowrap">{thread.author.name || 'Anónimo'}</span>
            {thread.author.headline && (
              <span className="text-[11px] text-text-muted truncate min-w-0">· {thread.author.headline}</span>
            )}
            <span className="text-[10px] text-text-muted ml-auto whitespace-nowrap flex-shrink-0">
              {fmtRelative(thread.date)}
            </span>
          </div>
          {thread.is_media_only || !thread.text.trim() ? (
            <p className="text-sm text-text-muted italic flex items-center gap-1">
              <span>🎞️</span> comentó un GIF / imagen{' '}
              <span className="not-italic text-[10px] text-text-muted">(LinkedIn no expone el contenido)</span>
            </p>
          ) : (
            <p className="text-sm text-text-primary whitespace-pre-wrap">{thread.text}</p>
          )}

          {/* Reaction bar for the top-level comment. Once a reaction is
              set (this session or read back from LinkedIn) the bar locks
              and shows the chosen reaction. */}
          <ReactionBar postId={postId} commentId={thread.id} initialReaction={thread.my_reaction} />

          {/* Existing replies, if any — each gets its own reaction bar so
              you can react to a reply-to-a-comment too, not just the
              top-level comment. Same fixed logic via the shared component. */}
          {thread.replies.length > 0 && (
            <div className="mt-3 space-y-2 pl-3 border-l border-border">
              {thread.replies.map((r) => (
                <div key={r.id} className="flex items-start gap-2">
                  <Avatar src={r.author.profile_picture_url} name={r.author.name} size={22} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">{r.author.name || 'Anónimo'}</span>
                      <span className="text-[10px] text-text-muted">{fmtRelative(r.date)}</span>
                      {/* El que ha entrado DESPUÉS de nuestra última respuesta.
                          Sin esto el hilo reaparece pero hay que releerlo entero
                          para saber qué es lo nuevo, que es justo el trabajo que
                          la herramienta tiene que quitar. */}
                      {followups.some((f) => f.id === r.id) && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/15 text-accent font-medium">
                          sin contestar
                        </span>
                      )}
                    </div>
                    {r.is_media_only || !r.text.trim() ? (
                      <p className="text-xs text-text-muted italic">🎞️ GIF / imagen</p>
                    ) : (
                      <p className="text-xs text-text-secondary whitespace-pre-wrap">{r.text}</p>
                    )}
                    <ReactionBar postId={postId} commentId={r.id} initialReaction={r.my_reaction} compact />
                    <SubReplyBox postId={postId} reply={r} hilo={hiloAntesDe(thread, r.id)} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Draft + actions */}
          {!sent && (
            <div className="mt-3 space-y-2">
              {/* A quién va dirigido, cuando NO es el que abrió el hilo. Sin
                  esto hay que deducirlo del borrador, y equivocarse de persona
                  en un hilo con varios es exactamente el fallo que esto viene
                  a arreglar. */}
              {followups.length > 0 && (
                <p className="text-[11px] text-text-secondary">
                  Respondiendo a <span className="text-accent">{target.author.name || 'la respuesta nueva'}</span>
                  {followups.length > 1 && (
                    <span className="text-text-muted"> · quedan {followups.length - 1} sin contestar</span>
                  )}
                </p>
              )}
              {!draft && !generating && (
                <button
                  onClick={handleGenerate}
                  className="text-xs px-2.5 py-1 rounded-md border border-accent/40 bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                >
                  ✨ Generar respuesta
                </button>
              )}
              {generating && (
                <p className="text-xs text-text-muted">Escribiendo en la voz del autor…</p>
              )}
              {(draft || generating) && (
                <>
                  <textarea
                    ref={textareaRef}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Tu respuesta…"
                    disabled={generating || sending}
                    className="w-full text-sm bg-bg-primary border border-border rounded-md px-3 py-2 min-h-[80px] resize-y focus:outline-none focus:border-accent disabled:opacity-50"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSend}
                      disabled={sending || !draft.trim()}
                      className="text-xs px-3 py-1.5 rounded-md bg-accent text-white hover:bg-accent-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {sending ? 'Enviando…' : 'Enviar a LinkedIn'}
                    </button>
                    <EmojiPicker onPick={insertEmoji} disabled={generating || sending} />
                    <button
                      onClick={handleGenerate}
                      disabled={generating || sending}
                      className="text-xs px-2.5 py-1 rounded-md border border-border text-text-secondary hover:border-accent/40 disabled:opacity-50"
                    >
                      ↻ Regenerar
                    </button>
                    {mention && (
                      <span
                        className={`text-[10px] ml-auto ${
                          willMention ? 'text-accent' : 'text-text-muted'
                        }`}
                        title={
                          willMention
                            ? `LinkedIn etiquetará a ${mention.name} al inicio`
                            : `El nombre "${mention.name}" debe ir al inicio para que se etiquete`
                        }
                      >
                        {willMention ? `@${mention.name} ✓` : `@${mention.name} ✗`}
                      </span>
                    )}
                    {voice && (
                      <span className="text-[10px] text-text-muted">voz: {voice}</span>
                    )}
                  </div>
                </>
              )}
              {msg && <p className="text-[11px] text-text-muted">{msg}</p>}
            </div>
          )}
          {sent && msg && <p className="text-[11px] text-text-muted mt-2">{msg}</p>}
        </div>
      </div>
    </div>
  );
}
