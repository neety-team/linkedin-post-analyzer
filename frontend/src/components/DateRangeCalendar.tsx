import { useEffect, useRef, useState } from 'react';

// Selector de rango de fechas propio.
//
// 🔴 POR QUÉ NO SE USA `<input type="date">`:
// su calendario lo dibuja el NAVEGADOR, no la web. CSS solo llega al campo y al
// iconito; el panel que se despliega —con el día seleccionado en el azul de
// Chrome y la fuente del sistema— es intocable. Para tenerlo en el naranja de
// marca y con Plus Jakarta Sans, el calendario hay que dibujarlo.
//
// Gemelo del que hay en el CRM (`sales-crm-Neety`, components/ui). Mismo
// comportamiento, distinta paleta: aquí manda el tema oscuro del Explorer.

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** `2026-08-21`, en hora LOCAL. `toISOString()` daría el día de ayer al este de Greenwich. */
function toIso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fromIso(s: string): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/** Las celdas del mes, empezando en LUNES como en España. */
function monthCells(anchor: Date) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  // getDay() da 0 para domingo; aquí la semana empieza en lunes.
  const offset = (first.getDay() + 6) % 7;
  const cells: Array<Date | null> = Array(offset).fill(null);
  const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
  for (let d = 1; d <= last; d++) cells.push(new Date(anchor.getFullYear(), anchor.getMonth(), d));
  return cells;
}

const sameDay = (a: Date | null, b: Date | null) =>
  !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

interface Props {
  start: string;
  end: string;
  onChange: (start: string, end: string) => void;
  onClose: () => void;
}

export function DateRangeCalendar({ start, end, onChange, onClose }: Props) {
  const dStart = fromIso(start);
  const dEnd = fromIso(end);
  const today = new Date();
  // Se abre SIEMPRE en el mes de hoy (Iker, 2026-09-16): abrir en el mes del
  // inicio del rango le llevaba a agosto estando a 16 de septiembre.
  const [anchor, setAnchor] = useState<Date>(today);
  const box = useRef<HTMLDivElement>(null);

  // Cerrar al pinchar fuera o con Escape. Sin esto el panel se queda abierto
  // tapando media pantalla de posts.
  useEffect(() => {
    const outside = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) onClose();
    };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', outside);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', outside);
      document.removeEventListener('keydown', esc);
    };
  }, [onClose]);

  function pick(d: Date) {
    const iso = toIso(d);
    // Primer clic fija el inicio; segundo, el final. Si el segundo es anterior
    // al primero, se da la vuelta en vez de rechazarlo: pinchar el 20 y luego
    // el 15 es querer del 15 al 20, no un error.
    if (!start || (start && end)) return onChange(iso, '');
    if (fromIso(start)! > d) return onChange(iso, start);
    onChange(start, iso);
  }

  const cells = monthCells(anchor);
  const inRange = (d: Date) => !!dStart && !!dEnd && d > dStart && d < dEnd;

  return (
    <div
      ref={box}
      className="absolute left-0 top-full mt-2 z-50 rounded-xl border border-border bg-bg-card shadow-2xl p-3 w-[268px]"
    >
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1))}
          className="w-7 h-7 rounded-md text-text-secondary hover:bg-bg-secondary font-bold"
        >
          ‹
        </button>
        <span className="text-xs font-bold text-text-primary capitalize">
          {MESES[anchor.getMonth()]} {anchor.getFullYear()}
        </span>
        <button
          onClick={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1))}
          className="w-7 h-7 rounded-md text-text-secondary hover:bg-bg-secondary font-bold"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {DIAS.map((d, i) => (
          <span key={i} className="text-center text-[10px] font-bold text-text-muted">{d}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((d, i) => {
          if (!d) return <span key={i} />;
          const isEdge = sameDay(d, dStart) || sameDay(d, dEnd);
          const between = inRange(d);
          const isToday = sameDay(d, today);
          const future = d > today;
          return (
            <button
              key={i}
              onClick={() => pick(d)}
              disabled={future}
              className={[
                'h-8 rounded-md text-xs font-semibold transition tabular-nums',
                isEdge
                  // El naranja del Explorer para el día elegido, no el azul de Chrome.
                  ? 'bg-accent text-bg-primary'
                  : between
                    ? 'bg-accent/20 text-text-primary'
                    : future
                      // Una fecha futura no tiene datos: se apaga en vez de dejar
                      // elegir un rango que siempre saldría vacío.
                      ? 'text-text-muted opacity-35 cursor-not-allowed'
                      : 'text-text-secondary hover:bg-bg-secondary',
                isToday && !isEdge ? 'ring-1 ring-accent/50' : '',
              ].join(' ')}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-border">
        <button
          onClick={() => { onChange('', ''); onClose(); }}
          className="text-[11px] font-bold text-text-muted hover:text-text-primary"
        >
          Borrar
        </button>
        <span className="text-[10px] text-text-muted">
          {start && !end ? 'Elige el día final' : start && end ? `${start} → ${end}` : 'Elige el día inicial'}
        </span>
      </div>
    </div>
  );
}
