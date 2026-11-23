import { useEffect, useRef, type ReactNode } from 'react';
import { cuandoCorreo, ESTADO_CORREO, type Correo } from './tipos';

const FLECHA =
  'w-9 h-9 grid place-items-center rounded-full border border-border text-text-secondary hover:text-text-primary hover:border-text-muted disabled:opacity-30 disabled:hover:border-border transition-colors';

/**
 * La ficha de un correo (2026-11-23): se abre encima del calendario, como la de un post en Semana,
 * con el correo a su ancho de verdad. Flechas (y ← →) para pasar al anterior o al siguiente, Esc,
 * la X o un clic fuera para cerrar.
 */
export default function FichaCorreo({
  correo,
  posicion,
  total,
  onMover,
  onCerrar,
  children,
}: {
  correo: Correo;
  posicion: number;
  total: number;
  onMover: (paso: number) => void;
  onCerrar: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const estado = ESTADO_CORREO[correo.estado] || { texto: correo.estado, clase: 'text-text-secondary border-border bg-bg-secondary' };

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  // Escape cierra siempre: el cierre propio del <dialog> no salta si se llega por un enlace
  // directo y se pulsa Escape sin haber tocado nada (lo mismo que en Semana).
  useEffect(() => {
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const t = e.target;
      if ((t instanceof HTMLTextAreaElement || t instanceof HTMLInputElement) && t.value.trim()) return;
      ref.current?.close();
    };
    document.addEventListener('keydown', alPulsar);
    return () => document.removeEventListener('keydown', alPulsar);
  }, []);

  // Al cambiar de correo, arriba del todo.
  useEffect(() => {
    ref.current?.querySelector('[data-cuerpo]')?.scrollTo({ top: 0 });
  }, [correo.id]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="ficha-correo-titulo"
      onClose={onCerrar}
      onCancel={(e) => {
        // Esc con texto a medio escribir no cierra: se perdería el feedback.
        const t = document.activeElement;
        if ((t instanceof HTMLTextAreaElement || t instanceof HTMLInputElement) && t.value.trim()) e.preventDefault();
      }}
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close();
      }}
      onKeyDown={(e) => {
        const t = e.target as HTMLElement;
        if (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT') return;
        if (e.key === 'ArrowLeft') onMover(-1);
        if (e.key === 'ArrowRight') onMover(1);
      }}
      className="m-auto p-0 w-[min(1180px,calc(100vw-16px))] max-w-none h-[calc(100dvh-16px)] sm:h-auto sm:max-h-[calc(100dvh-48px)] rounded-2xl border border-border bg-bg-primary text-text-primary shadow-2xl backdrop:bg-ink/75 open:flex flex-col overflow-hidden"
    >
      <header className="shrink-0 flex items-start gap-3 px-4 sm:px-7 py-4 border-b border-border bg-bg-card">
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-[13px] text-text-muted">
            <span className="font-semibold text-text-primary">
              {correo.numero != null ? `Correo ${correo.numero}` : correo.clave}
            </span>{' '}
            · {cuandoCorreo(correo.fecha, correo.hora)} · {correo.remitente} de Neety
          </p>
          <h2 id="ficha-correo-titulo" className="font-display text-xl sm:text-2xl font-semibold leading-tight tracking-tight break-words">
            {correo.asunto || 'Sin asunto'}
          </h2>
          <span className={`inline-block px-2.5 py-0.5 rounded-full border text-[12px] font-semibold ${estado.clase}`}>{estado.texto}</span>
        </div>
        <div className="shrink-0 flex items-center gap-1.5">
          <button type="button" className={FLECHA} onClick={() => onMover(-1)} disabled={posicion <= 0} aria-label="Correo anterior">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <span className="hidden sm:inline text-xs text-text-muted tabular-nums" aria-label={`Correo ${posicion + 1} de ${total}`}>
            {posicion + 1} de {total}
          </span>
          <button type="button" className={FLECHA} onClick={() => onMover(1)} disabled={posicion >= total - 1} aria-label="Correo siguiente">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button type="button" className={`${FLECHA} ml-2`} onClick={() => ref.current?.close()} aria-label="Cerrar">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      </header>
      <div data-cuerpo className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-7 py-6">
        {children}
      </div>
    </dialog>
  );
}
