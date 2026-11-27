import { useEffect, useRef, useState, type ReactNode } from 'react';
import { apiPost } from '../../hooks/useApi';
import { cuandoCorreo, type Correo } from './tipos';

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
      {correo.html ? <CorreoHtml html={correo.html} /> : <CuerpoTexto correo={correo} />}
    </div>
  );
}

/**
 * El correo de verdad (2026-11-23): el HTML que se manda a Brevo, con su pie, pintado en un iframe
 * aislado (sin scripts) al ancho de un móvil o de un escritorio. Se aprueba lo que se va a enviar.
 */
function CorreoHtml({ html }: { html: string }) {
  const [ancho, setAncho] = useState<'movil' | 'escritorio'>('escritorio');
  const [alto, setAlto] = useState(900);
  const ref = useRef<HTMLIFrameElement>(null);
  const medir = () => {
    const doc = ref.current?.contentDocument;
    // +4: el borde de 1 px arriba y abajo del iframe, o sale una barra de scroll por 2 px.
    if (doc?.body) setAlto(Math.max(300, doc.documentElement.scrollHeight + 4));
  };
  // Al cambiar de ancho el texto se recoloca y cambia el alto.
  useEffect(() => {
    const t = setTimeout(medir, 50);
    return () => clearTimeout(t);
  }, [ancho]);
  // Los enlaces se abren fuera: dentro del iframe no hay a dónde navegar.
  // Sin barra de scroll propia: el iframe ya mide lo que mide el correo.
  const cabeza = '<base target="_blank"><style>html,body{overflow:hidden!important}</style>';
  const doc = html.includes('<head>') ? html.replace('<head>', `<head>${cabeza}`) : `${cabeza}${html}`;
  return (
    <div className="bg-bg-secondary">
      <div className="flex items-center justify-end gap-1 px-4 pt-3" role="group" aria-label="Ancho de la preview">
        {(['movil', 'escritorio'] as const).map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => setAncho(a)}
            aria-pressed={ancho === a}
            className={`px-2.5 py-1 rounded-full text-[12px] font-semibold border ${
              ancho === a ? 'bg-text-primary text-bg-card border-text-primary' : 'border-border text-text-secondary'
            }`}
          >
            {a === 'movil' ? 'Móvil' : 'Escritorio'}
          </button>
        ))}
      </div>
      <div className="px-2 sm:px-4 py-3 overflow-x-auto">
        <iframe
          ref={ref}
          title="Así llega el correo"
          srcDoc={doc}
          sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          onLoad={medir}
          style={{ height: alto }}
          className={`block mx-auto bg-white border border-border rounded-lg ${ancho === 'movil' ? 'w-[375px]' : 'w-full max-w-[680px]'}`}
        />
      </div>
    </div>
  );
}

/** Sin HTML guardado: el texto del cuerpo y el GIF, como hasta ahora. */
function CuerpoTexto({ correo }: { correo: Correo }) {
  return (
    <>
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
    </>
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
  const aprobable = puedoAprobar && correo.estado === 'borrador' && correo.validador_ok;
  const programable = puedoAprobar && correo.estado === 'aprobado' && correo.brevo_campaign_id == null;
  const retirable = puedoAprobar && ['idea', 'borrador', 'aprobado', 'automatico'].includes(correo.estado);
  const [ocupado, setOcupado] = useState<null | 'programar' | 'retirar'>(null);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const listas = correo.listas?.length
    ? `listas ${correo.listas.join(', ')}${correo.excluir?.length ? ` (sin ${correo.excluir.join(', ')})` : ''}`
    : null;

  /** Programar en Brevo o retirar: lo hace el servidor, solo para Iker. */
  const accion = async (que: 'programar' | 'retirar') => {
    const pregunta =
      que === 'programar'
        ? `Programar en Brevo «${correo.asunto}» para el ${cuandoCorreo(correo.fecha, correo.hora)}${listas ? `, a las ${listas}` : ''}? Saldrá solo a esa hora.`
        : correo.estado === 'automatico'
          ? `Quitar «${correo.asunto}» de la página? La automatización de Brevo sigue activa: esto solo lo quita de aquí.`
          : `Retirar «${correo.asunto}»? Deja de salir en la página.`;
    if (!window.confirm(pregunta)) return;
    setOcupado(que);
    setErrorAccion(null);
    try {
      await apiPost(`/api/newsletter/correos/${correo.id}/${que}`, {});
      onCambio();
    } catch (e) {
      setErrorAccion(`No se ha podido ${que}: ${e instanceof Error ? e.message : 'error desconocido'}`);
    } finally {
      setOcupado(null);
    }
  };

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
    <article className="grid gap-6 lg:gap-8 lg:grid-cols-[minmax(0,21rem)_minmax(0,1fr)] items-start min-w-0">
      {/* A la izquierda, lo que se decide: el porqué, el validador, aprobar y el feedback */}
      <div className="space-y-5 min-w-0 lg:order-1 order-2">
        {correo.pilar && (
          <div className="flex flex-wrap gap-1.5">
            <Etiqueta>{correo.pilar}</Etiqueta>
          </div>
        )}
        {correo.tipo_cliente && (
          <p className="text-[13px] leading-relaxed text-text-secondary break-words">
            <span className="font-semibold text-text-primary">A quién: </span>
            {correo.tipo_cliente}
          </p>
        )}
        {/* El porqué y el validador, antes del correo */}
        <div className="space-y-2 text-[13px] leading-relaxed">
          {correo.por_que && (
            <p className="text-text-secondary break-words">
              <span className="font-semibold text-text-primary">Por qué: </span>
              {correo.por_que}
            </p>
          )}
          {correo.notas && (
            <p className="text-text-secondary break-words whitespace-pre-line">
              <span className="font-semibold text-text-primary">Notas: </span>
              {correo.notas}
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
        {correo.estado === 'automatico' && (
          <p className="text-[13px] leading-relaxed text-text-secondary">
            Lo envía solo una automatización de Brevo a quien entra en su lista. No hay que aprobarlo ni programarlo.
          </p>
        )}
        {listas && correo.estado !== 'automatico' && <p className="text-[13px] text-text-secondary">Va a las {listas}</p>}
        {(programable || retirable) && (
          <div className="space-y-1.5">
            <div className="flex flex-wrap gap-2">
              {programable && (
                <button
                  type="button"
                  onClick={() => accion('programar')}
                  disabled={!!ocupado || !listas}
                  title={listas ? undefined : 'Falta a qué listas va: pídeselo a Claude'}
                  className="px-5 py-2 rounded-full bg-accent text-on-accent text-[14px] font-semibold hover:bg-accent-strong disabled:opacity-60 transition-colors"
                >
                  {ocupado === 'programar' ? 'Programando…' : 'Programar en Brevo'}
                </button>
              )}
              {retirable && (
                <button
                  type="button"
                  onClick={() => accion('retirar')}
                  disabled={!!ocupado}
                  className="px-4 py-2 rounded-full border border-border bg-bg-card text-text-secondary text-[13px] font-semibold hover:border-text-muted disabled:opacity-60 transition-colors"
                >
                  {ocupado === 'retirar' ? 'Retirando…' : correo.estado === 'automatico' ? 'Quitar de aquí' : 'Retirar'}
                </button>
              )}
            </div>
            {programable && !listas && <p className="text-xs text-text-muted">Para programarlo falta a qué listas va.</p>}
            {errorAccion && <p className="text-xs text-danger">{errorAccion}</p>}
          </div>
        )}
        {correo.estado !== 'borrador' && correo.aprobado_por && (
          <p className="text-xs text-text-muted">Aprobado por {correo.aprobado_por}</p>
        )}

        <Feedback correo={correo} autor={autor} onCambio={onCambio} />
      </div>

      {/* A la derecha, el correo como llega */}
      <div className="min-w-0 lg:order-2 order-1 lg:sticky lg:top-0">
        <ComoEnLaBandeja correo={correo} variante={variante} />
      </div>
    </article>
  );
}
