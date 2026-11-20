import { useState, type ReactNode } from 'react';
import { apiPost } from '../../hooks/useApi';
import { cuandoCorreo, ESTADO_CORREO, type Correo } from './tipos';

/**
 * Un correo de la newsletter como llegará a la bandeja (2026-11-20): primero el
 * porqué y el validador, luego el correo tal cual (remitente, asunto, preview,
 * cuerpo con sus saltos y el GIF), el feedback y, solo para quien aprueba, el
 * botón de aprobar.
 */

const NIVEL: Record<string, string> = {
  estilo: 'Se aplica a todos los correos',
  pilar: 'Se aplica a este tipo de correo',
  correo: 'Se aplica a este correo',
};

function Etiqueta({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-border bg-bg-secondary text-[12px] font-semibold text-text-secondary">
      {children}
    </span>
  );
}

/** El correo en su bandeja: lo que ve quien lo recibe. */
function ComoEnLaBandeja({ correo, variante }: { correo: Correo; variante: 'a' | 'b' }) {
  const asunto = variante === 'b' && correo.asunto_b ? correo.asunto_b : correo.asunto;
  const preview = variante === 'b' && correo.preview_b ? correo.preview_b : correo.preview;
  return (
    <div className="rounded-xl border border-border bg-bg-primary/60 overflow-hidden" aria-label="Así llegará a la bandeja">
      {/* La línea de la bandeja: remitente, asunto y preview */}
      <div className="px-4 sm:px-5 py-3.5 border-b border-border bg-bg-card">
        <div className="flex items-baseline justify-between gap-3">
          <p className="min-w-0 truncate text-[14px] font-semibold text-text-primary">{correo.remitente} de Neety</p>
          <p className="shrink-0 text-[12px] text-text-muted tabular-nums">{correo.hora ? correo.hora.slice(0, 5) : ''}</p>
        </div>
        <p className="mt-0.5 text-[15px] font-bold text-text-primary break-words">{asunto}</p>
        {preview && <p className="mt-0.5 text-[13px] text-text-muted break-words line-clamp-2">{preview}</p>}
      </div>
      {/* El cuerpo abierto */}
      <div className="px-4 sm:px-6 py-5 bg-bg-card space-y-5">
        <p className="whitespace-pre-line break-words text-[15px] leading-relaxed text-text-primary">{correo.cuerpo}</p>
        {correo.gif_url && (
          <img
            src={correo.gif_url}
            alt={correo.gif_alt || ''}
            loading="lazy"
            className="block mx-auto w-[280px] max-w-[70%] h-auto rounded-lg"
          />
        )}
      </div>
    </div>
  );
}

function Feedback({ correo, autor, onCambio }: { correo: Correo; autor: string; onCambio: () => void }) {
  const [borrador, setBorrador] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enviar = async () => {
    if (!autor) {
      setError('Elige arriba, junto a «Soy», quién eres para dejar feedback.');
      return;
    }
    if (!borrador.trim()) {
      setError('Escribe qué cambiarías.');
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      await apiPost(`/api/newsletter/correos/${correo.id}/feedback`, { autor, texto: borrador.trim() });
      setBorrador('');
      onCambio();
    } catch (e) {
      setError(`No se ha guardado: ${e instanceof Error ? e.message : 'error desconocido'}`);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-3">
      <h4 className="font-display text-[15px] font-semibold text-text-primary">
        Feedback
        {correo.feedback.length > 0 && <span className="ml-1.5 font-sans font-normal text-text-muted">{correo.feedback.length}</span>}
      </h4>
      {correo.feedback.length > 0 && (
        <ul className="space-y-3">
          {correo.feedback.map((f) => (
            <li key={f.id} className="text-[13px] leading-relaxed">
              <p className="text-text-primary break-words">
                <span className="font-semibold">{f.autor}: </span>
                {f.texto}
              </p>
              {f.respuesta && <p className="mt-1 pl-3 border-l-2 border-accent/40 text-text-secondary">{f.respuesta}</p>}
              <p className={`mt-0.5 text-xs ${f.resuelto ? 'text-success' : 'text-warning'}`}>
                {f.resuelto ? 'Aplicado' : 'Pendiente de aplicar'}
                {f.nivel ? <span className="text-text-muted"> · {NIVEL[f.nivel]}</span> : null}
              </p>
            </li>
          ))}
        </ul>
      )}
      <div className="space-y-2">
        <label htmlFor={`fb-${correo.id}`} className="block text-xs font-semibold text-text-muted">
          {autor ? `Qué cambiarías, ${autor}` : 'Qué cambiarías'}
        </label>
        <textarea
          id={`fb-${correo.id}`}
          value={borrador}
          onChange={(e) => {
            setBorrador(e.target.value);
            if (error) setError(null);
          }}
          rows={3}
          placeholder="Yo esto lo diría así…"
          className="w-full bg-bg-secondary border border-border rounded-lg p-3 text-[14px] text-text-primary resize-y focus:outline-none focus:border-accent leading-relaxed"
        />
        {error && <p className="text-xs text-danger">{error}</p>}
        <button
          type="button"
          onClick={enviar}
          disabled={enviando}
          className="px-4 py-2 rounded-full border border-border bg-bg-card text-text-primary text-[13px] font-semibold hover:border-text-muted disabled:opacity-60 transition-colors"
        >
          {enviando ? 'Guardando…' : 'Dejar feedback'}
        </button>
      </div>
    </div>
  );
}

export default function CorreoTarjeta({
  correo,
  puedoAprobar,
  autor,
  onCambio,
}: {
  correo: Correo;
  puedoAprobar: boolean;
  autor: string;
  onCambio: () => void;
}) {
  const [variante, setVariante] = useState<'a' | 'b'>('a');
  const [aprobando, setAprobando] = useState(false);
  const [errorAprobar, setErrorAprobar] = useState<string | null>(null);
  const hayB = !!(correo.asunto_b || correo.preview_b);
  const estado = ESTADO_CORREO[correo.estado] || { texto: correo.estado, clase: 'text-text-secondary border-border bg-bg-secondary' };
  const aprobable = puedoAprobar && correo.estado === 'borrador' && correo.validador_ok;

  const aprobar = async () => {
    if (!window.confirm(`Aprobar el correo ${correo.numero ?? ''} «${correo.asunto}»?`)) return;
    setAprobando(true);
    setErrorAprobar(null);
    try {
      // La huella del texto pintado: si el correo cambió desde que se abrió, el servidor no lo aprueba.
      await apiPost(`/api/newsletter/correos/${correo.id}/aprobar`, { huella: correo.huella });
      onCambio();
    } catch (e) {
      setErrorAprobar(`No se ha aprobado: ${e instanceof Error ? e.message : 'error desconocido'}`);
    } finally {
      setAprobando(false);
    }
  };

  return (
    <article className="bg-bg-card border border-border rounded-xl p-4 sm:p-6 space-y-5 min-w-0">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-lg font-semibold text-text-primary tabular-nums">
            {correo.numero != null ? `Correo ${correo.numero}` : correo.clave}
            <span className="font-sans text-[14px] font-normal text-text-muted"> · {cuandoCorreo(correo.fecha, correo.hora)} · {correo.remitente}</span>
          </h3>
          <span className={`px-2.5 py-0.5 rounded-full border text-[12px] font-semibold ${estado.clase}`}>{estado.texto}</span>
        </div>
        {(correo.pilar || correo.tipo_cliente) && (
          <div className="flex flex-wrap gap-1.5">
            {correo.pilar && <Etiqueta>{correo.pilar}</Etiqueta>}
            {correo.tipo_cliente && <Etiqueta>Tipo {correo.tipo_cliente}</Etiqueta>}
          </div>
        )}
      </header>

      {/* El porqué y el validador, antes del correo */}
      <div className="space-y-2 text-[13px] leading-relaxed">
        {correo.por_que && (
          <p className="text-text-secondary break-words">
            <span className="font-semibold text-text-primary">Por qué: </span>
            {correo.por_que}
          </p>
        )}
        {correo.enlace && (
          <p className="text-text-secondary break-all">
            <span className="font-semibold text-text-primary">Enlace: </span>
            {/^https?:\/\//i.test(correo.enlace) ? (
              <a href={correo.enlace} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                {correo.enlace}
              </a>
            ) : (
              // Solo http(s) se enlaza: otro esquema (javascript:, data:…) se enseña como texto.
              correo.enlace
            )}
          </p>
        )}
        <details className="group">
          <summary className={`cursor-pointer select-none font-semibold ${correo.validador_ok ? 'text-success' : 'text-danger'}`}>
            {correo.validador_ok ? 'Validador en verde ✓' : 'El validador no está en verde'}
            {correo.validador && <span className="font-normal text-text-muted"> · ver resultado</span>}
          </summary>
          {correo.validador && (
            <pre className="mt-2 p-3 rounded-lg bg-bg-secondary border border-border text-[12px] text-text-secondary whitespace-pre-wrap break-words font-mono">
              {correo.validador}
            </pre>
          )}
        </details>
      </div>

      {hayB && (
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Versión del A/B">
          <span className="text-[13px] text-text-muted">A/B:</span>
          {(['a', 'b'] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={variante === v}
              onClick={() => setVariante(v)}
              className={`px-3 py-1 rounded-full text-[12px] font-semibold border transition-colors ${
                variante === v ? 'bg-text-primary text-bg-primary border-text-primary' : 'bg-bg-card text-text-secondary border-border hover:border-text-muted'
              }`}
            >
              Versión {v.toUpperCase()}
            </button>
          ))}
        </div>
      )}

      <ComoEnLaBandeja correo={correo} variante={variante} />

      {aprobable && (
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={aprobar}
            disabled={aprobando}
            className="px-5 py-2 rounded-full bg-accent text-on-accent text-[14px] font-semibold hover:bg-accent-strong disabled:opacity-60 transition-colors"
          >
            {aprobando ? 'Aprobando…' : 'Aprobar'}
          </button>
          {errorAprobar && <p className="text-xs text-danger">{errorAprobar}</p>}
        </div>
      )}
      {correo.estado !== 'borrador' && correo.aprobado_por && (
        <p className="text-xs text-text-muted">Aprobado por {correo.aprobado_por}</p>
      )}

      <Feedback correo={correo} autor={autor} onCambio={onCambio} />
    </article>
  );
}
