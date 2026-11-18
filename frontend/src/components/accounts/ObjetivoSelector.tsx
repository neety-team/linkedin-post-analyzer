/**
 * EL OBJETIVO DEL POST, EN LA CABECERA DE CUENTAS (2026-11-18).
 *
 * Va justo a la derecha del pilar y con su mismo tamaño: primero se lee QUE es
 * el post y luego PARA QUE se publico. El objetivo es la intencion previa (un
 * meme se sube a por alcance), no el resultado, y son los tres de Semana sin
 * subtipos. Lo calcula el backend (services/objetivo.ts): a mano > Semana >
 * barrido del historico > regla del pilar.
 *
 * Se pulsa y se cambia, como el pilar. «Automático» borra el cambio a mano y
 * vuelve a lo que diga el sistema. Sin objetivo (antes del 14/04, competencia)
 * no se pinta nada: un hueco dice mas que una etiqueta inventada.
 * ⚠️ Volver a automatico puede dejar el post SIN objetivo (un «otro» sin
 * barrido): entonces la chapa desaparece y se recupera con el barrido.
 */
import { useEffect, useRef, useState } from 'react';
import { apiPatch } from '../../hooks/useApi';
import {
  OBJETIVO, OBJETIVOS, FUENTE_OBJETIVO, esObjetivo,
  type Objetivo, type FuenteObjetivo,
} from '../../utils/objetivo';

export default function ObjetivoSelector({ postId, objetivo, fuente }: {
  postId: string;
  objetivo?: string | null;
  fuente?: string | null;
}) {
  // Lo que se PINTA, separado de la prop para cambiarlo al momento sin esperar
  // a que la lista entera se recargue.
  const [actual, setActual] = useState<Objetivo | null>(esObjetivo(objetivo) ? objetivo : null);
  const [origen, setOrigen] = useState<FuenteObjetivo | null>((fuente as FuenteObjetivo) || null);
  useEffect(() => {
    setActual(esObjetivo(objetivo) ? objetivo : null);
    setOrigen((fuente as FuenteObjetivo) || null);
  }, [objetivo, fuente]);

  const [abierto, setAbierto] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const botonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // position:fixed anclado al boton: las tarjetas recortan lo que se sale y el
  // badge vive pegado al borde derecho (mismo motivo que en PilarSelector).
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);

  const abrir = () => {
    const r = botonRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 6, right: Math.max(8, window.innerWidth - r.right) });
    setError(null);
    setAbierto(true);
  };

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (panelRef.current?.contains(e.target as Node)) return;
      if (botonRef.current?.contains(e.target as Node)) return;
      setAbierto(false);
    };
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false); };
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('mousedown', fuera);
      document.removeEventListener('keydown', tecla);
    };
  }, [abierto]);

  const guardar = async (nuevo: Objetivo | null) => {
    if (nuevo !== null && nuevo === actual && origen === 'manual') { setAbierto(false); return; }
    const previo = { actual, origen };
    if (nuevo) { setActual(nuevo); setOrigen('manual'); }   // optimista
    setOcupado(true);
    setError(null);
    try {
      const r = await apiPatch<{ objetivo: string | null; objetivo_fuente: string | null }>(
        `/api/posts/${postId}/objetivo`, { objetivo: nuevo }
      );
      setActual(esObjetivo(r.objetivo) ? r.objetivo : null);
      setOrigen((r.objetivo_fuente as FuenteObjetivo) || null);
      setAbierto(false);
    } catch (e: any) {
      setActual(previo.actual);
      setOrigen(previo.origen);
      setError(e.message);
    } finally {
      setOcupado(false);
    }
  };

  const meta = actual ? OBJETIVO[actual] : null;
  const deDonde = origen ? FUENTE_OBJETIVO[origen] : null;
  // Sin objetivo no hay chapa (antes de la estrategia, o un post de otro).
  if (!meta) return null;

  return (
    <>
      <button
        ref={botonRef}
        onClick={(e) => { e.stopPropagation(); abierto ? setAbierto(false) : abrir(); }}
        className={`px-1.5 py-0.5 rounded text-[10px] font-medium hover:ring-1 hover:ring-accent/50 transition ${meta.chip}`}
        title={`Objetivo: ${meta.etiqueta}${deDonde ? `\n${deDonde}` : ''}\n\nPulsa para cambiar el objetivo`}
        aria-label={`Objetivo: ${meta.etiqueta}. Cambiar`}
      >
        {meta.etiqueta}
      </button>

      {abierto && pos && (
        <div
          ref={panelRef}
          style={{ top: pos.top, right: pos.right }}
          className="fixed z-50 w-52 bg-bg-card border border-border rounded-lg shadow-xl p-2 space-y-1"
        >
          <p className="text-[10px] text-text-muted px-1 pb-1">Objetivo con el que se publicó</p>
          {error && <p className="text-[10px] text-danger leading-snug px-1">✗ {error}</p>}
          {OBJETIVOS.map((o) => (
            <button
              key={o}
              onClick={() => void guardar(o)}
              disabled={ocupado}
              className="w-full flex items-center gap-2 text-left px-1.5 py-1 rounded hover:bg-bg-secondary disabled:opacity-50 transition-colors"
            >
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${OBJETIVO[o].chip}`}>
                {OBJETIVO[o].etiqueta}
              </span>
              {o === actual && <span className="text-accent text-[10px]">✓</span>}
            </button>
          ))}
          {origen === 'manual' && (
            <button
              onClick={() => void guardar(null)}
              disabled={ocupado}
              className="w-full text-left text-[11px] px-1.5 py-1.5 rounded border-t border-border text-text-secondary hover:bg-bg-secondary disabled:opacity-50 transition-colors"
              title="Quita el cambio a mano y vuelve al que diga Semana, el histórico o el pilar"
            >
              ↺ Automático
            </button>
          )}
          {deDonde && (
            <p className="text-[9px] text-text-muted leading-snug px-1 pt-1 border-t border-border">
              Ahora: {deDonde.toLowerCase()}.
            </p>
          )}
        </div>
      )}
    </>
  );
}
