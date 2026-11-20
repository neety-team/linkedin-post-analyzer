import { useMemo } from 'react';
import { porcentaje } from '../../utils/formatoMetricas';
import { agruparPorFecha, diaLargo, etiquetaSemana, hoyMadrid, semanasDelMes } from '../../utils/calendarioMes';
import { ESTADO_CORREO, type Correo } from './tipos';

/**
 * El mes de la newsletter como calendario (2026-11-20): semanas en filas, de
 * lunes a domingo, y cada correo como una ficha en su día, con el color de su
 * estado. En el móvil (hasta 640 px) siete columnas no se leen, así que el mismo
 * mes sale como agenda por semanas, solo con los días que tienen correos.
 */

const DIAS_SEMANA = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
const ESTADO_OTRO = { texto: '', clase: 'text-text-secondary border-border bg-bg-secondary' };

function nombreCorreo(c: Correo): string {
  return c.numero != null ? `nº${c.numero}` : c.clave;
}

/** Una ficha del calendario: un botón que abre el correo. */
function Ficha({ correo, seleccionada, onElegir }: { correo: Correo; seleccionada: boolean; onElegir: (clave: string) => void }) {
  const estado = ESTADO_CORREO[correo.estado] || { ...ESTADO_OTRO, texto: correo.estado };
  const hora = correo.hora ? correo.hora.slice(0, 5) : '';
  const enviado = correo.estado === 'enviado';
  const apertura = enviado ? porcentaje(correo.metricas?.apertura_real ?? null) : null;
  const etiqueta = [
    hora,
    correo.remitente,
    correo.numero != null ? `correo ${correo.numero}` : correo.clave,
    estado.texto,
    `«${correo.asunto}»`,
    apertura ? `apertura real ${apertura}` : '',
  ]
    .filter(Boolean)
    .join(', ');
  return (
    <button
      type="button"
      data-clave={correo.clave}
      aria-label={etiqueta}
      aria-expanded={seleccionada}
      aria-controls={seleccionada ? 'nl-detalle' : undefined}
      onClick={() => onElegir(correo.clave)}
      className={`block w-full min-w-0 text-left rounded-md border px-1.5 py-1 text-[11px] leading-snug transition-shadow hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent ${estado.clase} ${
        seleccionada ? 'ring-2 ring-accent' : ''
      }`}
    >
      {/* Hora y número arriba, remitente y asunto debajo: cabe aunque la celda sea estrecha */}
      <span className="flex items-baseline justify-between gap-1 tabular-nums">
        <span className="truncate">{hora}</span>
        <span className="shrink-0">{nombreCorreo(correo)}</span>
      </span>
      <span className="block truncate font-semibold">{correo.remitente}</span>
      <span className="block truncate text-text-primary">{correo.asunto}</span>
      {apertura && (
        <span className="block truncate tabular-nums" aria-hidden="true">
          Apertura {apertura}
        </span>
      )}
    </button>
  );
}

export default function CalendarioMes({
  mes,
  correos,
  seleccionada,
  onElegir,
}: {
  mes: string;
  correos: Correo[];
  seleccionada: string | null;
  onElegir: (clave: string) => void;
}) {
  const semanas = useMemo(() => semanasDelMes(mes), [mes]);
  const { porFecha } = useMemo(() => agruparPorFecha(correos), [correos]);
  const hoy = hoyMadrid();
  const delMes = semanas.flat().filter((d) => d.delMes && porFecha.has(d.fecha));

  const fichas = (fecha: string) =>
    (porFecha.get(fecha) || []).map((c) => (
      <li key={c.id}>
        <Ficha correo={c} seleccionada={c.clave === seleccionada} onElegir={onElegir} />
      </li>
    ));

  return (
    <>
      {/* Escritorio: la cuadrícula del mes */}
      <div className="hidden min-[641px]:block bg-bg-card border border-border rounded-xl overflow-hidden">
        <div className="grid grid-cols-7 border-b border-border bg-bg-secondary/60" aria-hidden="true">
          {DIAS_SEMANA.map((d) => (
            <div key={d} className="px-2 py-2 text-[12px] font-semibold text-text-muted">
              {d}
            </div>
          ))}
        </div>
        <ol className="grid grid-cols-7" aria-label="Días del mes">
          {semanas.flat().map((d, i) => {
            const esHoy = d.fecha === hoy;
            return (
              <li
                key={d.fecha}
                aria-current={esHoy ? 'date' : undefined}
                className={`min-w-0 min-h-[6.5rem] p-1.5 space-y-1 border-border ${i % 7 ? 'border-l' : ''} ${i >= 7 ? 'border-t' : ''} ${
                  d.delMes ? '' : 'bg-bg-secondary/50'
                } ${esHoy ? 'bg-accent/5' : ''}`}
              >
                <p className={`text-[12px] tabular-nums ${d.delMes ? 'text-text-secondary' : 'text-text-muted/70'}`}>
                  <span className="sr-only">{diaLargo(d.fecha)}</span>
                  <span
                    aria-hidden="true"
                    className={`inline-flex items-center justify-center min-w-[1.5rem] h-6 rounded-full ${
                      esHoy ? 'bg-accent text-on-accent font-semibold px-1' : ''
                    }`}
                  >
                    {d.dia}
                  </span>
                  {esHoy && <span className="sr-only">, hoy</span>}
                </p>
                {porFecha.has(d.fecha) && <ul className={`space-y-1 ${d.delMes ? '' : 'opacity-60'}`}>{fichas(d.fecha)}</ul>}
              </li>
            );
          })}
        </ol>
      </div>

      {/* Móvil: el mismo mes como agenda por semanas */}
      <div className="min-[641px]:hidden space-y-5">
        {delMes.length === 0 && <p className="text-sm text-text-muted">No hay correos este mes.</p>}
        {semanas.map((semana) => {
          const dias = semana.filter((d) => d.delMes && porFecha.has(d.fecha));
          if (!dias.length) return null;
          return (
            <section key={semana[0].fecha} className="space-y-2" aria-label={etiquetaSemana(semana)}>
              <h3 className="text-[13px] font-semibold text-text-muted">{etiquetaSemana(semana)}</h3>
              <ul className="space-y-3">
                {dias.map((d) => (
                  <li key={d.fecha} aria-current={d.fecha === hoy ? 'date' : undefined} className="space-y-1.5">
                    <p className={`text-[13px] font-semibold ${d.fecha === hoy ? 'text-accent' : 'text-text-primary'}`}>
                      {diaLargo(d.fecha)}
                      {d.fecha === hoy && ' · hoy'}
                    </p>
                    <ul className="space-y-1.5 [&_button]:text-[13px] [&_button]:px-2.5 [&_button]:py-1.5">{fichas(d.fecha)}</ul>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
