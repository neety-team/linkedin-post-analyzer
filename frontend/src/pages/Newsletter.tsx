/**
 * NEWSLETTER (2026-11-20): los correos de la newsletter, aparte de LinkedIn. Se
 * llega por el selector LinkedIn / Newsletter de la cabecera de Semana; no hay
 * enlace en la barra de navegación.
 *
 * La página es un calendario por meses (`?m=2026-12`, por defecto el mes de hoy
 * en Madrid): cada correo es una ficha en su día con el color de su estado. Al
 * pulsarla se abre el correo entero (`&c=<clave>`) con su porqué, el validador,
 * el feedback y, si ya se envió, sus métricas de Brevo. El botón de aprobar
 * solo sale cuando el backend dice `puedo_aprobar` (la identidad del login
 * central es la de Iker), nunca por lo que elija el navegador.
 */
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Link, useLocation, useSearchParams, type SetURLSearchParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import CanalSelector from '../components/CanalSelector';
import CorreoTarjeta from '../components/newsletter/CorreoTarjeta';
import CalendarioMes from '../components/newsletter/CalendarioMes';
import MetricasEnviado from '../components/newsletter/MetricasEnviado';
import { cuandoCorreo, ESTADO_CORREO, type Correo, type RespuestaNewsletter } from '../components/newsletter/tipos';
import { hoyMadrid, mesDeFecha, mesDeHoy, mesDeParam, mesVecino, proximoCorreo, tituloMes } from '../utils/calendarioMes';

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

/** La ficha visible con esa clave (la cuadrícula y la agenda tienen cada una la suya). */
function fichaVisible(clave: string): HTMLElement | null {
  const todas = document.querySelectorAll<HTMLElement>(`[data-clave="${CSS.escape(clave)}"]`);
  return Array.from(todas).find((el) => el.offsetParent !== null) || null;
}

/**
 * Cierra el detalle (sin dejar una entrada en el historial) y devuelve el foco a
 * la ficha que lo abrió; si se llegó por un enlace, al título del mes.
 */
function cerrarDetalle(
  setParams: SetURLSearchParams,
  mes: string,
  ultimaFicha: RefObject<string | null>,
  tituloMes: RefObject<HTMLHeadingElement | null>,
) {
  setParams(
    (prev) => {
      const p = new URLSearchParams(prev);
      p.delete('c');
      // El mes se fija: sin él, un correo abierto por enlace devolvería al mes de hoy.
      p.set('m', mes);
      return p;
    },
    { replace: true },
  );
  setTimeout(() => {
    const ficha = ultimaFicha.current ? fichaVisible(ultimaFicha.current) : null;
    (ficha || tituloMes.current)?.focus();
  }, 0);
}

export default function Newsletter() {
  const [params, setParams] = useSearchParams();
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
  const location = useLocation();
  const correos = useMemo<Correo[]>(() => (d ? [...d.proximos, ...d.enviados] : []), [d]);
  const clave = params.get('c');
  const abierto = (clave && correos.find((c) => c.clave === clave)) || null;
  const claveAbierta = abierto?.clave || null;
  const hoy = mesDeHoy();
  // Un enlace con `&c=` y sin `?m=` abre el mes de ese correo; si no, el de hoy.
  const mes = mesDeParam(params.get('m'), mesDeFecha(abierto?.fecha) || hoy);
  const sinFecha = correos.filter((c) => !mesDeFecha(c.fecha));
  const delMes = correos.filter((c) => mesDeFecha(c.fecha) === mes).length;
  // Lo que espera a alguien no puede quedar escondido en otro mes: va siempre arriba.
  const porFechaYHora = (x: Correo, y: Correo) => (x.fecha || '').localeCompare(y.fecha || '') || (x.hora || '').localeCompare(y.hora || '');
  const porAprobar = correos.filter((c) => c.estado === 'borrador').sort(porFechaYHora);
  const sinProgramar = correos.filter((c) => c.estado === 'aprobado').sort(porFechaYHora);
  // Sin mes ni correo pedidos y con el mes de hoy vacío, se dice cuál es el siguiente.
  const proximo = !params.get('m') && !clave && delMes === 0 ? proximoCorreo(correos, hoyMadrid()) : null;
  const perdido = (location.state as { perdido?: string } | null)?.perdido;

  const tituloDetalle = useRef<HTMLHeadingElement>(null);
  const tituloMesRef = useRef<HTMLHeadingElement>(null);
  // La clave que hay que enseñar al abrirse (por clic o enlace de la página); se gasta al usarla.
  const revelar = useRef<string | null>(null);
  const ultimaFicha = useRef<string | null>(null);

  const elegir = (c: string) => {
    if (c !== claveAbierta) revelar.current = c;
    ultimaFicha.current = c;
    const p = new URLSearchParams(params);
    p.set('m', mes);
    p.set('c', c);
    setParams(p);
  };

  /** El enlace a un correo en su mes, para las tiras de arriba. */
  const enlaceCorreo = (c: Correo) => `?m=${mesDeFecha(c.fecha) || mes}&c=${encodeURIComponent(c.clave)}`;
  const alPulsarEnlace = (c: Correo) => {
    if (c.clave !== claveAbierta) revelar.current = c.clave;
    ultimaFicha.current = c.clave;
  };

  const cerrar = () => cerrarDetalle(setParams, mes, ultimaFicha, tituloMesRef);

  // `?c=` de un correo que ya no está: se quita sin dejar rastro en el historial y se avisa.
  useEffect(() => {
    if (!d || !clave || abierto) return;
    const p = new URLSearchParams(params);
    p.delete('c');
    setParams(p, { replace: true, state: { perdido: clave } });
  }, [d, clave, abierto, params, setParams]);

  // Al abrir un correo nuevo, el foco va al detalle (y en el móvil, la vista baja hasta él).
  // Solo cuando cambia la clave: aprobar o dejar feedback recargan los datos y no deben mover nada.
  useEffect(() => {
    if (!claveAbierta || revelar.current !== claveAbierta) return;
    revelar.current = null;
    tituloDetalle.current?.focus({ preventScroll: true });
    // Con el panel al lado (xl) basta con que se vea; debajo del calendario, se sube hasta él.
    const alLado = window.matchMedia('(min-width: 1280px)').matches;
    tituloDetalle.current?.scrollIntoView({ block: alLado ? 'nearest' : 'start' });
  }, [claveAbierta]);

  // Esc cierra el detalle, salvo si otro lo ha atendido, en un desplegable o con texto a medio escribir.
  useEffect(() => {
    if (!claveAbierta) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      const t = e.target;
      if (t instanceof HTMLSelectElement) return;
      if ((t instanceof HTMLTextAreaElement || t instanceof HTMLInputElement) && t.value.trim()) return;
      cerrarDetalle(setParams, mes, ultimaFicha, tituloMesRef);
    };
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, [claveAbierta, mes, setParams]);

  const enlaceMes = (m: string) => `?m=${m}`;
  const BOTON = 'inline-flex items-center justify-center h-9 rounded-full border border-border bg-bg-card text-text-primary text-[13px] font-semibold hover:border-text-muted transition-colors';

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

          {perdido && !abierto && (
            <p role="status" className="text-[13px] text-text-muted">
              Ese correo ya no está.
            </p>
          )}

          {(porAprobar.length > 0 || sinProgramar.length > 0 || proximo) && (
            <div className="space-y-2">
              {[
                { lista: porAprobar, titulo: porAprobar.length === 1 ? '1 por aprobar' : `${porAprobar.length} por aprobar`, tono: 'text-warning' },
                {
                  lista: sinProgramar,
                  titulo: sinProgramar.length === 1 ? '1 aprobado sin programar' : `${sinProgramar.length} aprobados sin programar`,
                  tono: 'text-success',
                },
              ]
                .filter((t) => t.lista.length > 0)
                .map((t) => (
                  <div key={t.titulo} className="flex flex-wrap items-center gap-2 min-w-0">
                    <span className={`text-[13px] font-semibold ${t.tono}`}>{t.titulo}</span>
                    <ul className="flex flex-wrap gap-1.5 min-w-0">
                      {t.lista.map((c) => (
                        <li key={c.id} className="min-w-0 max-w-full">
                          <Link
                            to={enlaceCorreo(c)}
                            onClick={() => alPulsarEnlace(c)}
                            className={`inline-block max-w-full truncate px-2.5 py-1 rounded-full border text-[12px] font-semibold hover:underline ${
                              (ESTADO_CORREO[c.estado] || ESTADO_CORREO.enviado).clase
                            }`}
                          >
                            {c.numero != null ? `Correo ${c.numero}` : c.clave} · {cuandoCorreo(c.fecha, c.hora)}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              {proximo && (
                <p className="text-[13px] text-text-muted">
                  Próximo correo:{' '}
                  <Link to={enlaceCorreo(proximo)} onClick={() => alPulsarEnlace(proximo)} className="font-semibold text-accent hover:underline">
                    {proximo.numero != null ? `Correo ${proximo.numero}` : proximo.clave} · {cuandoCorreo(proximo.fecha, proximo.hora)} ·{' '}
                    {proximo.asunto}
                  </Link>
                </p>
              )}
            </div>
          )}

          <div className={abierto ? 'grid gap-6 items-start xl:grid-cols-[minmax(0,1fr)_minmax(0,25rem)]' : ''}>
            <section className="space-y-4 min-w-0" aria-labelledby="nl-mes">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2
                    id="nl-mes"
                    ref={tituloMesRef}
                    tabIndex={-1}
                    className="font-display text-2xl font-semibold text-text-primary focus:outline-none"
                    aria-live="polite"
                  >
                    {tituloMes(mes)}
                  </h2>
                  <p className="text-[13px] text-text-muted">
                    {delMes === 0 ? 'Sin correos este mes' : delMes === 1 ? '1 correo' : `${delMes} correos`}
                    {d.metricas.configurado && <> · métricas de Brevo {cuandoBarrido(d.metricas.ultimo_barrido)}</>}
                  </p>
                </div>
                <nav className="flex items-center gap-1.5" aria-label="Cambiar de mes">
                  <Link to={enlaceMes(mesVecino(mes, -1))} className={`${BOTON} w-9`} aria-label={`Mes anterior: ${tituloMes(mesVecino(mes, -1))}`}>
                    <span aria-hidden="true">‹</span>
                  </Link>
                  <Link to={enlaceMes(hoy)} className={`${BOTON} px-4`} aria-current={mes === hoy ? 'date' : undefined}>
                    Hoy
                  </Link>
                  <Link to={enlaceMes(mesVecino(mes, 1))} className={`${BOTON} w-9`} aria-label={`Mes siguiente: ${tituloMes(mesVecino(mes, 1))}`}>
                    <span aria-hidden="true">›</span>
                  </Link>
                </nav>
              </div>

              <div className="flex flex-wrap gap-1.5" aria-label="Leyenda de estados">
                {Object.entries(ESTADO_CORREO).map(([k, e]) => (
                  <span key={k} className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold ${e.clase}`}>
                    {e.texto}
                  </span>
                ))}
              </div>

              <CalendarioMes mes={mes} correos={correos} seleccionada={abierto?.clave || null} onElegir={elegir} />

              {sinFecha.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-[13px] font-semibold text-text-muted">Sin fecha</h3>
                  <ul className="flex flex-wrap gap-2">
                    {sinFecha.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          data-clave={c.clave}
                          aria-expanded={abierto?.clave === c.clave}
                          onClick={() => elegir(c.clave)}
                          className={`max-w-full text-left break-words px-2.5 py-1 rounded-md border text-[12px] font-semibold ${(ESTADO_CORREO[c.estado] || ESTADO_CORREO.enviado).clase}`}
                        >
                          {c.numero != null ? `nº${c.numero}` : c.clave} · {c.asunto}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            {abierto && (
              <section
                id="nl-detalle"
                aria-labelledby="nl-detalle-titulo"
                className="min-w-0 space-y-4 xl:sticky xl:top-20 xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto xl:pr-1"
              >
                <div className="flex items-center justify-between gap-3">
                  <h2
                    id="nl-detalle-titulo"
                    ref={tituloDetalle}
                    tabIndex={-1}
                    className="text-[13px] font-semibold text-text-muted focus:outline-none scroll-mt-20"
                  >
                    {abierto.numero != null ? `Correo ${abierto.numero}` : abierto.clave} · {cuandoCorreo(abierto.fecha, abierto.hora)}
                  </h2>
                  <button type="button" onClick={cerrar} className={`${BOTON} px-3.5 shrink-0`}>
                    Cerrar<span className="sr-only"> el correo</span>
                  </button>
                </div>
                {abierto.estado === 'enviado' && (
                  <div className="bg-bg-card border border-border rounded-xl p-4">
                    <MetricasEnviado correo={abierto} />
                  </div>
                )}
                <CorreoTarjeta
                  key={abierto.id}
                  correo={abierto}
                  puedoAprobar={d.puedo_aprobar}
                  autor={autor}
                  onCambio={datos.refetch}
                />
              </section>
            )}
          </div>
        </>
      )}
    </div>
  );
}
