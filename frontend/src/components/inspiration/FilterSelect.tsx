import { useState, useRef, useEffect, useMemo } from 'react';

/**
 * Desplegable con buscador para filtros de MUCHOS valores.
 *
 * Por qué existe: Inspiration pintaba cada filtro como una fila de chips. Con
 * 148 topics (75 de ellos con un solo post) y 134 creators, eso son ~280 chips
 * en pantalla: media página de ruido en la que nadie encuentra nada. Los chips
 * solo funcionan con pocos valores (content_type, que son 5).
 *
 * Muestra el recuento en la etiqueta para que se vea el peso de cada opción sin
 * abrirlo, y filtra por texto porque con 148 opciones el scroll tampoco sirve.
 */
export default function FilterSelect({
  label,
  icon,
  options,
  value,
  onChange,
  totalLabel,
  labels,
}: {
  label: string;
  icon?: string;
  options: [string, number][];
  value: string;
  onChange: (v: string) => void;
  totalLabel?: string;
  // Etiqueta para mostrar de cada valor (p. ej. hook_type → "Ruptura de patrón").
  // Solo cambia lo que se ve: onChange sigue devolviendo el valor original.
  labels?: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  // Cerrar al clicar fuera. Sin esto se quedan varios abiertos a la vez y se
  // pisan entre ellos.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQ('');
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const filtered = useMemo(() => {
    if (!q.trim()) return options;
    const needle = q.toLowerCase();
    return options.filter(([k]) =>
      k.toLowerCase().includes(needle) || (labels?.[k] || '').toLowerCase().includes(needle)
    );
  }, [options, q, labels]);

  const active = !!value;
  const show = (k: string) => labels?.[k] || k;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 max-w-[220px] ${
          active
            ? 'border-accent/50 bg-accent/10 text-accent'
            : 'border-border bg-bg-secondary text-text-muted hover:border-accent/30'
        }`}
        title={active ? `${label}: ${show(value)}` : `Filtrar por ${label.toLowerCase()}`}
      >
        {icon && <span>{icon}</span>}
        <span className="truncate">{active ? show(value) : label}</span>
        <span className="text-[10px] opacity-60">{active ? '✕' : '▾'}</span>
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-64 bg-bg-card border border-border rounded-lg shadow-xl overflow-hidden">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Buscar en ${options.length}…`}
            className="w-full bg-bg-secondary border-b border-border px-3 py-2 text-xs text-text-primary placeholder:text-text-muted/60 focus:outline-none"
          />
          <div className="max-h-64 overflow-y-auto py-1">
            <button
              onClick={() => { onChange(''); setOpen(false); setQ(''); }}
              className={`w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-bg-secondary ${
                !value ? 'text-accent' : 'text-text-secondary'
              }`}
            >
              Todos{totalLabel ? ` (${totalLabel})` : ''}
            </button>
            {filtered.map(([k, count]) => (
              <button
                key={k}
                onClick={() => { onChange(value === k ? '' : k); setOpen(false); setQ(''); }}
                className={`w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-bg-secondary flex justify-between gap-2 ${
                  value === k ? 'text-accent' : 'text-text-secondary'
                }`}
              >
                <span className="truncate">{show(k)}</span>
                <span className="text-text-muted tabular-nums shrink-0">{count}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-3 py-3 text-xs text-text-muted">Nada coincide con "{q}"</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
