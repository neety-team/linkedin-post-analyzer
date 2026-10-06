import { useEffect, useRef, useState } from 'react';

/* ── Filtro desplegable, como en una tienda de ropa ─────────────────────────
   Una chapa con el nombre de la categoria ("Pilar", "Ordenar por"...) que abre
   un panel con sus opciones y el recuento de cada una. Multiple = checkboxes y
   la chapa dice cuantas hay marcadas; unica = radios y la chapa dice cual.
   Se cierra con clic fuera o Escape. Un solo componente para las cuatro
   categorias de Top posts (Iker, 2026-10-06): antes eran 15 botones sueltos
   en una fila y no habia filtro por pilar. Sin librerias. */

export interface OpcionFiltro {
  valor: string;
  etiqueta: string;
  recuento?: number;
  // Titulo del bloque dentro del panel ("Intención", "Alcance"...). Las
  // opciones se pintan en el orden recibido, agrupadas por este campo.
  grupo?: string;
}

interface Props {
  etiqueta: string;
  opciones: OpcionFiltro[];
  seleccion: string[];
  multiple: boolean;
  onChange: (valores: string[]) => void;
  // Valor que cuenta como "sin filtro" en seleccion unica (p. ej. 'todos'):
  // con el la chapa no se pinta como activa.
  valorNeutro?: string;
}

export default function FiltroDesplegable({ etiqueta, opciones, seleccion, multiple, onChange, valorNeutro }: Props) {
  const [abierto, setAbierto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (raiz.current && !raiz.current.contains(e.target as Node)) setAbierto(false);
    };
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false); };
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('mousedown', fuera);
      document.removeEventListener('keydown', tecla);
    };
  }, [abierto]);

  const marcadas = seleccion.filter((v) => v !== valorNeutro);
  const activo = marcadas.length > 0;
  // Texto de la chapa: en unica, la opcion elegida; en multiple, cuantas.
  const resumen = multiple
    ? (activo ? `${marcadas.length}` : null)
    : (opciones.find((o) => o.valor === seleccion[0])?.etiqueta ?? null);

  const alternar = (valor: string) => {
    if (!multiple) {
      onChange([valor]);
      setAbierto(false);
      return;
    }
    onChange(seleccion.includes(valor) ? seleccion.filter((v) => v !== valor) : [...seleccion, valor]);
  };

  // Agrupa respetando el orden de llegada.
  const grupos: { titulo: string | undefined; items: OpcionFiltro[] }[] = [];
  for (const o of opciones) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.titulo === o.grupo) ultimo.items.push(o);
    else grupos.push({ titulo: o.grupo, items: [o] });
  }

  return (
    <div ref={raiz} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className={`px-2.5 py-1 rounded text-xs transition-colors inline-flex items-center gap-1.5 ${
          activo
            ? 'bg-accent/20 text-accent border border-accent/30'
            : 'bg-bg-secondary text-text-muted border border-border hover:border-accent/30'
        }`}
      >
        <span>{etiqueta}</span>
        {resumen && (
          <span className={multiple
            ? 'min-w-[1.1rem] px-1 rounded-full bg-accent text-white text-[10px] font-semibold text-center'
            : 'text-text-primary font-medium'}>
            {resumen}
          </span>
        )}
        <span className="opacity-60 text-[10px]">{abierto ? '▲' : '▼'}</span>
      </button>

      {abierto && (
        <div
          role={multiple ? 'group' : 'radiogroup'}
          className="absolute z-30 mt-1 min-w-[14rem] max-h-80 overflow-y-auto bg-bg-card border border-border rounded-lg shadow-xl p-1.5"
        >
          {grupos.map((g, i) => (
            <div key={`${g.titulo ?? ''}-${i}`} className={i > 0 ? 'mt-1.5 pt-1.5 border-t border-border' : ''}>
              {g.titulo && (
                <div className="px-2 pb-1 text-[10px] uppercase tracking-wide text-text-muted">{g.titulo}</div>
              )}
              {g.items.map((o) => {
                const marcada = seleccion.includes(o.valor);
                const vacia = o.recuento === 0 && !marcada;
                return (
                  <label
                    key={o.valor}
                    className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer text-xs ${
                      marcada ? 'bg-accent/10 text-text-primary' : 'text-text-secondary hover:bg-bg-secondary'
                    } ${vacia ? 'opacity-50' : ''}`}
                  >
                    <input
                      type={multiple ? 'checkbox' : 'radio'}
                      className="accent-accent"
                      checked={marcada}
                      onChange={() => alternar(o.valor)}
                    />
                    <span className="flex-1">{o.etiqueta}</span>
                    {o.recuento != null && (
                      <span className="text-[10px] text-text-muted tabular-nums">{o.recuento}</span>
                    )}
                  </label>
                );
              })}
            </div>
          ))}
          {multiple && marcadas.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="mt-1.5 w-full text-[11px] text-text-muted hover:text-text-primary py-1 border-t border-border"
            >
              Quitar selección
            </button>
          )}
        </div>
      )}
    </div>
  );
}
