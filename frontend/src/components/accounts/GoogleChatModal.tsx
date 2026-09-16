import { useState, useEffect, useMemo } from 'react';

const BASE = import.meta.env.VITE_API_URL || '';

interface PreviewData {
  post: {
    id: string;
    url: string | null;
    hook: string | null;
    content: string | null;
    creator_name: string | null;
    pillar: string | null;
  };
  // Flat array of supportive comments (always 5). No voice selection — these
  // are neutral network-support comments, not anyone's personal voice.
  comments: string[];
  webhook_configured: boolean;
}

// Google Chat caps messages at 4096 chars. With ≤200 chars × 5 comments +
// header (~150 chars) we stay comfortably below, so the modal never has
// to split into multiple messages. Kept as a safety check though.
const MAX_LEN = 3800;

function pick<T>(xs: T[]): T {
  return xs[Math.floor(Math.random() * xs.length)];
}

// Cómo se anuncia cada pilar en la cabecera del mensaje de Chat. Varias
// formas por pilar, a propósito: Iker lo venía cambiando A MANO todos los
// días (alargando vocales, quitando la palabra "post") justo para que el
// aviso no cantara a plantilla. Ahora lo hace el botón.
//
// Frases COMPLETAS y no piezas que se ensamblan: componer "NUEVO" + etiqueta
// producía "NUEVO LOS 10" y "HISTORIA NUEVO", porque el género y el número
// cambian con el pilar. Escribirlas enteras cuesta tres líneas más y no
// puede desconcordar.
//
// MAYÚSCULAS SOLO DONDE PESAN (Iker, 2026-07-29): en versales van únicamente
// el FORMATO (MEME, HISTORIA, TOP 10, LEAD MAGNET) y el NOMBRE de la cuenta,
// que es lo que el compañero necesita leer de un vistazo en la notificación.
// "Nuevo" lleva solo la inicial y las preposiciones van en minúscula. Todo en
// versales gritaba y aplanaba: si todo destaca, no destaca nada.
const CABECERAS: Record<string, string[]> = {
  meme: ['Nuevo MEME de {N}', 'Nuevo MEMEEE de {N}', 'MEMAZO nuevo de {N}', '{N} tiene MEME nuevo', 'Nuevo MEME {N}'],
  peloteo_mapa: ['Nuevo MAPA de {N}', 'Nuevo MAPAAA de {N}', 'MAPA nuevo de {N}', '{N} tiene MAPA nuevo'],
  peloteo_los10: ['Nuevo TOP 10 de {N}', 'Nuevos 10 de {N}', 'LOS 10 de {N}, recién salidos', '{N} tiene TOP 10 nuevo'],
  lead_magnet: ['Nuevo LEAD MAGNET de {N}', 'Nuevo LEAD MAGNEEET de {N}', 'LEAD MAGNET nuevo de {N}', '{N} tiene LEAD MAGNET nuevo'],
  historia: ['Nueva HISTORIA de {N}', 'Nueva HISTORIAAA de {N}', 'HISTORIA nueva de {N}', '{N} tiene HISTORIA nueva'],
  // Estos dos faltaban (Iker, 2026-08-11), asi que un DESPIECE y un EVENTO se
  // anunciaban en el chat como "Nuevo POST", que es justo lo que este aviso
  // existe para evitar: el equipo sabe por el titular si le toca comentar,
  // reaccionar o compartir.
  peloteo_objeto: ['Nuevo DESPIECE de {N}', 'Nuevo DESPIEEECE de {N}', 'DESPIECE nuevo de {N}', '{N} tiene DESPIECE nuevo'],
  evento: ['Nuevo post de EVENTO de {N}', 'EVENTO nuevo de {N}', '{N} anuncia el EVENTO', 'Post del EVENTO de {N}'],
  // Pilar en prueba desde el 2026-09-16 (categoria creada a mano, slug `tarjeta`).
  // Sin esta linea caia en "Nuevo POST", el mismo hueco que el del 11/08.
  tarjeta: ['Nueva TARJETA de {N}', 'Nueva TARJEEETA de {N}', 'TARJETA nueva de {N}', '{N} tiene TARJETA nueva'],
  otro: ['Nuevo POST de {N}', 'Nuevo POOOST de {N}', 'POST nuevo de {N}', '{N} tiene POST nuevo', 'Nuevo POST {N}'],
};

function buildHeader(creatorName: string | null, url: string | null, pillar: string | null): string {
  // Solo el nombre de pila, para que las tres cuentas se lean igual
  // (IKER / UNAI / ASIER), nunca nombre y apellido.
  const first = ((creatorName || '').trim().split(/\s+/)[0] || 'ACCOUNT').toUpperCase();
  const frase = pick(CABECERAS[pillar || 'otro'] || CABECERAS.otro);
  return `🐝 ${frase.replace('{N}', first)}:\n${url || '(sin URL)'}`;
}

// El recordatorio va entre la cabecera y los comentarios. La señal de la
// primera hora es lo que mira el algoritmo, y like/comentario/compartir/
// guardar son las cuatro acciones que más pesan, así que las cuatro salen
// en todas las variantes. Lo que cambia es la forma: el mensaje llega a
// diario al mismo Chat y una línea idéntica deja de leerse a la semana.
// Sin guion largo y sin coma antes de "y" (brand-voice §3).
const RECORDATORIOS = [
  '🔥 Like, comentario, compartir y guardar. Los cuatro. La primera hora lo decide todo.',
  '⚡ Cuatro toques: like, comentario, compartir y guardar (los 3 puntitos del post). Y volamos.',
  '🚀 Like, comentario, compartir y guardar. Veinte segundos vuestros, un día entero de alcance.',
  '🔥 La primera hora manda. Like, comentario, compartir y guardar, sin dejarse ninguno.',
  'Si dais LIKE + COMENTARIO + COMPARTIR + GUARDAR nos ayudáis mucho 😉',
  '⚡ Si caen los cuatro (like, comentario, compartir y guardar) esto se va arriba solo.',
  '🔥 Comentario y guardado son los que más pesan. Con el like y el compartir, pleno.',
];

function buildMessage(header: string, comments: string[], recordatorio: string): string {
  const cleaned = comments.map((c) => c.trim()).filter(Boolean);
  if (cleaned.length === 0) {
    return [header, '', recordatorio].join('\n');
  }
  const subtitle = `💬 ${cleaned.length} COMENTARIOS de APOYO (copia y pega):`;
  // No numbering in front of each comment — teammates copy the one they
  // want as-is, faster, with nothing to strip.
  const body = cleaned.join('\n\n');
  return [header, '', recordatorio, '', subtitle, '', body].join('\n');
}

export default function GoogleChatModal({
  postId,
  onClose,
}: {
  postId: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  // The full Google Chat message is editable now (instead of editing each
  // comment individually). null = use the freshly computed one; string =
  // user has typed, including '' if they cleared the field. Re-roll or a
  // new preview load resets this back to null.
  const [editedMessage, setEditedMessage] = useState<string | null>(null);

  const loadPreview = async () => {
    setLoading(true);
    setError(null);
    setEditedMessage(null);
    try {
      const res = await fetch(`${BASE}/api/accounts/posts/${postId}/google-chat-preview`);
      const json = await res.json();
      if (!res.ok) { setError(json.error || `Error ${res.status}`); setLoading(false); return; }
      setData(json);
      setComments(Array.isArray(json.comments) ? json.comments : []);
    } catch (e: any) {
      setError(e.message || 'Error al cargar preview');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  // La cabecera y el recordatorio se sortean UNA vez por carga del modal, no
  // en cada render: si fueran a cada render, escribir en el textarea cambiaría
  // el texto de debajo mientras Iker teclea.
  const computedMessage = useMemo(() => {
    if (!data) return '';
    return buildMessage(
      buildHeader(data.post.creator_name, data.post.url, data.post.pillar),
      comments,
      pick(RECORDATORIOS)
    );
  }, [data, comments]);

  const message = editedMessage ?? computedMessage;
  const overLimit = message.length > MAX_LEN;

  const handleSend = async () => {
    if (!message) return;
    if (overLimit) {
      setError(`El mensaje pasa ${MAX_LEN} chars. Acorta alguno manualmente.`);
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}/api/accounts/posts/${postId}/send-to-google-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || `Error ${res.status}`); setSending(false); return; }
      setSent(true);
      setTimeout(onClose, 1500);
    } catch (e: any) {
      setError(e.message || 'Error al enviar');
    }
    setSending(false);
  };

  // Modal deliberadamente desnudo (Iker, 2026-07-29). Antes tenía eyebrow,
  // subtítulo, Regenerar, Copiar todo, Restaurar, un pie explicativo y
  // Cancelar. En la práctica el flujo real es: abrir, retocar el texto,
  // enviar. Todo lo demás era ruido alrededor de un textarea. Regenerar no
  // se sustituye por nada porque cerrar y volver a abrir ya recompone el
  // mensaje desde cero, y copiar lo hace el propio navegador.
  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center overflow-y-auto py-8 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-bg-card border border-border rounded-2xl shadow-2xl w-full max-w-3xl my-auto overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <h2 className="text-[15px] font-semibold text-text-primary flex items-center gap-2">
            <span>🐝</span> Enviar a Google Chat
          </h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors text-xl leading-none -mr-1 px-2"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <div className="px-6 pb-5">
          {loading && (
            <div className="h-[420px] bg-bg-secondary/60 rounded-xl animate-pulse" />
          )}

          {error && (
            <div className="mb-3 bg-danger/10 border border-danger/30 rounded-lg px-3 py-2 text-danger text-sm">
              {error}
            </div>
          )}

          {!loading && data && (
            <textarea
              value={message}
              onChange={(e) => setEditedMessage(e.target.value)}
              rows={20}
              className="w-full bg-bg-secondary/60 border border-border rounded-xl p-4 text-xs text-text-secondary font-mono leading-relaxed focus:outline-none focus:border-accent resize-y"
              spellCheck={false}
              autoFocus
            />
          )}
        </div>

        {!loading && data && (
          <div className="px-6 pb-5 flex items-center justify-end gap-4">
            {!data.webhook_configured && (
              <p className="text-[11px] text-amber-400 mr-auto">
                ⚠️ GOOGLE_CHAT_WEBHOOK_URL no configurado
              </p>
            )}
            {overLimit && (
              <p className="text-[11px] text-amber-400 mr-auto">
                {message.length} / {MAX_LEN} caracteres
              </p>
            )}
            <button
              onClick={handleSend}
              disabled={!data.webhook_configured || sending || sent || !message || overLimit}
              className={`px-5 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                sent
                  ? 'bg-green-500/15 text-green-400 cursor-default'
                  : 'bg-accent text-bg-primary hover:bg-accent-light disabled:opacity-40 disabled:cursor-not-allowed'
              }`}
            >
              {sent ? '✓ Enviado' : sending ? 'Enviando…' : '📤 Enviar al Chat'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
