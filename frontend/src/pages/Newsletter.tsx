/**
 * NEWSLETTER (2026-11-20): los correos de la newsletter, aparte de LinkedIn. Se
 * llega por el selector LinkedIn / Newsletter de la cabecera de Semana; no hay
 * enlace en la barra de navegación.
 *
 * Arriba los próximos, como llegarán a la bandeja, con su porqué, el validador y
 * el feedback. Debajo los enviados con sus métricas de Brevo. El botón de aprobar
 * solo sale cuando el backend dice `puedo_aprobar` (la identidad del login
 * central es la de Iker), nunca por lo que elija el navegador.
 */
import { useEffect, useState } from 'react';
import { useApi } from '../hooks/useApi';
import CanalSelector from '../components/CanalSelector';
import CorreoTarjeta from '../components/newsletter/CorreoTarjeta';
import TablaEnviados from '../components/newsletter/TablaEnviados';
import type { RespuestaNewsletter } from '../components/newsletter/tipos';

// La misma clave que Semana: quien ya eligió nombre allí no tiene que repetirlo.
const CLAVE_AUTOR = 'semana.autor';
const NOMBRES = ['Iker', 'Unai', 'Asier'];

function leerAutor(): string {
  try {
    return localStorage.getItem(CLAVE_AUTOR) || '';
  } catch {
    return '';
  }
}

function cuandoBarrido(iso: string | null): string {
  if (!iso) return 'todavía no se han leído';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `leídas el ${d.toLocaleString('es-ES', { timeZone: 'Europe/Madrid', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
}

export default function Newsletter() {
  const datos = useApi<RespuestaNewsletter>('/api/newsletter');
  const yo = useApi<{ identidad: { email: string; nombre: string } | null }>('/api/yo');
  const identificado = yo.data?.identidad?.nombre || '';
  const [elegido, setAutor] = useState(leerAutor);
  const autor = identificado || elegido;

  useEffect(() => {
    if (!elegido) return;
    try {
      localStorage.setItem(CLAVE_AUTOR, elegido);
    } catch {
      /* sin almacenamiento: se elige cada vez */
    }
  }, [elegido]);

  const d = datos.data;

  return (
    <div className="space-y-8 min-w-0">
      <header className="space-y-4">
        <CanalSelector actual="newsletter" />
        <div>
          <p className="text-[13px] text-text-muted">Los correos a la base, por Brevo</p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-text-primary">Newsletter</h1>
        </div>
      </header>

      {datos.loading && !d && <p className="text-sm text-text-muted">Cargando los correos…</p>}
      {datos.error && <p className="text-sm text-danger">No se han podido cargar: {datos.error}</p>}

      {d && (
        <>
          {!d.metricas.configurado && (
            <p role="status" className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-[14px] text-warning">
              Falta BREVO_API_KEY en Railway: las métricas no se pueden leer
            </p>
          )}
          {d.metricas.configurado && d.metricas.error && (
            <p role="status" className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-[14px] text-danger break-words">
              La última lectura de Brevo falló: {d.metricas.error}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {identificado ? (
              <p className="text-[13px] text-text-muted">
                Entras como <b className="text-text-primary">{identificado}</b>
              </p>
            ) : (
              <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Quién eres">
                <span className="text-[13px] text-text-muted">Soy</span>
                {NOMBRES.map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={autor === n}
                    onClick={() => setAutor(n)}
                    className={`px-3.5 py-1.5 rounded-full text-[13px] font-semibold border transition-colors ${
                      autor === n ? 'bg-text-primary text-bg-primary border-text-primary' : 'bg-bg-card text-text-secondary border-border hover:border-text-muted'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}
          </div>

          <section className="space-y-4" aria-labelledby="nl-proximos">
            <h2 id="nl-proximos" className="font-display text-xl font-semibold text-text-primary">
              Próximos
              {d.proximos.length > 0 && <span className="ml-2 font-sans text-[14px] font-normal text-text-muted">{d.proximos.length}</span>}
            </h2>
            {d.proximos.length ? (
              <div className="grid gap-6 max-w-3xl">
                {d.proximos.map((c) => (
                  <CorreoTarjeta key={c.id} correo={c} puedoAprobar={d.puedo_aprobar} autor={autor} onCambio={datos.refetch} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-muted">No hay correos por enviar.</p>
            )}
          </section>

          <section className="space-y-4 min-w-0" aria-labelledby="nl-enviados">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="nl-enviados" className="font-display text-xl font-semibold text-text-primary">
                Enviados
              </h2>
              {d.metricas.configurado && (
                <p className="text-[12px] text-text-muted">Métricas de Brevo {cuandoBarrido(d.metricas.ultimo_barrido)}</p>
              )}
            </div>
            <TablaEnviados correos={d.enviados} />
          </section>
        </>
      )}
    </div>
  );
}
