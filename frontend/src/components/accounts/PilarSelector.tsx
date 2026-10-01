/**
 * EL PILAR, EDITABLE DESDE LA PARRILLA (Iker, 2026-08-20).
 *
 * POR QUE: el pilar lo detecta el backend al ingerir el post y falla —un mapa
 * dibujado sin bloque de menciones, una historia corta con foto—. Hasta hoy cada
 * fallo era un mensaje a Claude y un commit tocando reglas: una semana de
 * latencia para arreglar UNA etiqueta. Ahora el badge se pulsa y se cambia.
 *
 * ⚠️ UNA CATEGORIA CREADA AQUI NO SE AUTODETECTA NUNCA. El clasificador solo
 * sabe emitir los 8 pilares que tiene codificados; a cualquier categoria nueva
 * hay que arrastrarle los posts a mano, uno a uno, para siempre.
 *
 * ⚠️ El cambio marca `pillar_manual = TRUE` en el backend, y eso hace que el
 * reproceso nocturno se salte esa fila. Es lo que impide que el clasificador
 * pise la correccion a la mañana siguiente.
 *
 * "PILAR DE CONTENIDO" Y LAPIZ EN TODOS (Iker, 2026-10-01). El texto decia
 * "categoria" y el lapiz solo salia al pasar el raton y solo en los creados a
 * mano, asi que no se encontraba. Ahora se ve siempre y tambien en los de
 * serie: renombrar cambia SOLO la etiqueta (`PATCH /api/pillars/:slug`), el
 * slug se queda y con el los posts y el clasificador. Primer uso: "Los 10"
 * paso a "las 10". La papelera sigue siendo solo de los creados a mano.
 */
import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import type { ReactNode } from 'react';
import { apiGet, apiPatch, apiPost, apiDelete } from '../../hooks/useApi';

export interface Pilar {
  slug: string;
  label: string;
  color: string;
  ayuda: string | null;
  builtin: boolean;
  sort_order: number;
  posts_count: number;
}

/**
 * Clave de color → clases de Tailwind.
 *
 * ⚠️ TIENE QUE SER UN MAPA LITERAL, no `bg-${color}-500/15` interpolado.
 * Tailwind compila las clases que ve ESCRITAS en el codigo fuente; una clase
 * construida en tiempo de ejecucion no llega nunca al CSS y el badge sale
 * transparente. Las claves son las mismas que la lista COLORES de
 * `backend/src/routes/pillars.ts`: si se añade una alli, va tambien aqui.
 */
const PALETA_PILAR: Record<string, string> = {
  esmeralda: 'bg-emerald-500/15 text-emerald-400',
  cielo: 'bg-sky-500/15 text-sky-400',
  ambar: 'bg-amber-500/15 text-amber-400',
  naranja: 'bg-accent/15 text-accent',
  morado: 'bg-purple-500/15 text-purple-400',
  rosa: 'bg-pink-500/15 text-pink-400',
  indigo: 'bg-indigo-500/15 text-indigo-400',
  lima: 'bg-lime-500/15 text-lime-400',
  cian: 'bg-cyan-500/15 text-cyan-400',
  gris: 'bg-bg-secondary border border-border text-text-muted',
};
const CLASE_DESCONOCIDO = PALETA_PILAR.gris;

/* ── El catalogo, UNA sola vez por pagina ────────────────────────────────────
   Con 60 posts en pantalla, un fetch por selector serian 60 peticiones al mismo
   endpoint. Vive en un contexto que envuelve la pagina entera. */

interface CatalogoCtx {
  pilares: Pilar[];
  porSlug: Record<string, Pilar>;
  recargar: () => Promise<void>;
}
const Ctx = createContext<CatalogoCtx>({ pilares: [], porSlug: {}, recargar: async () => {} });

export function PilaresProvider({ children }: { children: ReactNode }) {
  const [pilares, setPilares] = useState<Pilar[]>([]);

  const recargar = useCallback(async () => {
    try {
      const r = await apiGet<{ pillars: Pilar[] }>('/api/pillars');
      setPilares(r.pillars || []);
    } catch {
      // Sin catalogo el badge sigue pintando el slug en gris: se lee peor, pero
      // la parrilla no se cae por una lista de etiquetas.
      setPilares([]);
    }
  }, []);

  useEffect(() => { void recargar(); }, [recargar]);

  const value = useMemo(() => ({
    pilares,
    porSlug: Object.fromEntries(pilares.map((p) => [p.slug, p])),
    recargar,
  }), [pilares, recargar]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePilares() { return useContext(Ctx); }

/* ── El selector ─────────────────────────────────────────────────────────────*/

export default function PilarSelector({ postId, pillar, onChanged }: {
  postId: string;
  pillar?: string | null;
  onChanged?: (nuevo: string) => void;
}) {
  const { pilares, porSlug, recargar } = usePilares();
  // El pilar que se PINTA. Se separa de la prop para poder cambiarlo al momento
  // sin esperar a que la parrilla entera se recargue: el post que acabas de
  // reclasificar tiene que verse cambiado antes de que sueltes el raton.
  const [actual, setActual] = useState<string | null>(pillar ?? null);
  useEffect(() => { setActual(pillar ?? null); }, [pillar]);

  const [abierto, setAbierto] = useState(false);
  const [busca, setBusca] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [renombrando, setRenombrando] = useState<string | null>(null);
  const [nombreNuevo, setNombreNuevo] = useState('');
  const botonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // El popover va en position:fixed y anclado a mano al boton. Las tarjetas de
  // la parrilla recortan lo que se sale, asi que un panel absolute quedaria
  // cortado justo en el borde derecho, que es donde vive este badge.
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);

  const abrir = () => {
    const r = botonRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 6, right: Math.max(8, window.innerWidth - r.right) });
    setBusca('');
    setError(null);
    setRenombrando(null);
    setAbierto(true);
  };

  // Cerrar al pulsar fuera o con Escape.
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

  const meta = actual ? porSlug[actual] : undefined;
  const clase = meta ? (PALETA_PILAR[meta.color] || CLASE_DESCONOCIDO) : CLASE_DESCONOCIDO;
  // Si el post lleva un pilar que ya no esta en el catalogo (etiqueta de reglas
  // viejas), se enseña el slug crudo en gris. Mejor eso que decir "Otro", que
  // seria mentir sobre lo que hay en la base.
  const etiqueta = meta?.label || actual;

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return pilares;
    return pilares.filter((p) => p.label.toLowerCase().includes(q));
  }, [pilares, busca]);

  const exacto = pilares.some((p) => p.label.toLowerCase() === busca.trim().toLowerCase());
  const puedeCrear = busca.trim().length >= 2 && !exacto;

  const asignar = async (slug: string) => {
    if (slug === actual) { setAbierto(false); return; }
    const previo = actual;
    setActual(slug);          // optimista
    setAbierto(false);
    try {
      await apiPatch(`/api/posts/${postId}/pillar`, { pillar: slug });
      onChanged?.(slug);
    } catch (e: any) {
      setActual(previo);      // y se revierte si LinkedIn de esto no sabe nada
      setError(e.message);
      setAbierto(true);
    }
  };

  const crear = async () => {
    const label = busca.trim();
    setOcupado(true);
    setError(null);
    try {
      const r = await apiPost<{ pillar: Pilar }>('/api/pillars', { label });
      await recargar();
      await asignar(r.pillar.slug);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setOcupado(false);
    }
  };

  // Guardas del renombrado: Esc no debe guardar aunque el blur llegue despues,
  // y Enter seguido de blur no debe mandar dos PATCH.
  const cancelarRef = useRef(false);
  const enviandoRef = useRef(false);

  const empezarRenombrar = (p: Pilar) => {
    cancelarRef.current = false;
    setError(null);
    setRenombrando(p.slug);
    setNombreNuevo(p.label);
  };

  const renombrar = async (slug: string) => {
    if (cancelarRef.current) { cancelarRef.current = false; return; }
    if (enviandoRef.current) return;
    const label = nombreNuevo.trim();
    const pilar = porSlug[slug];
    // Vacio, 1 caracter o sin cambios: se vuelve a la fila sin llamar a nadie.
    if (label.length < 2 || !pilar || label === pilar.label) { setRenombrando(null); return; }
    // El backend no impide dos pilares con el mismo nombre, y en el badge se
    // leerian igual aunque por dentro sean dos slugs distintos.
    const repetido = pilares.some((p) => p.slug !== slug && p.label.toLowerCase() === label.toLowerCase());
    if (repetido) { setError('Ya hay un pilar de contenido con ese nombre'); return; }
    enviandoRef.current = true;
    setOcupado(true);
    setError(null);
    try {
      await apiPatch(`/api/pillars/${slug}`, { label });
      await recargar();
      setRenombrando(null);
    } catch (e: any) {
      setError(e.message);   // el campo sigue abierto con lo escrito, para reintentar
    } finally {
      enviandoRef.current = false;
      setOcupado(false);
    }
  };

  const borrar = async (p: Pilar) => {
    // El numero va en la pregunta a proposito: borrar una categoria con 23 posts
    // dentro los manda a "Otro" y eso no se deshace con Ctrl+Z.
    const aviso = p.posts_count > 0
      ? `Borrar el pilar de contenido "${p.label}". Sus ${p.posts_count} post${p.posts_count === 1 ? '' : 's'} volverán a Otro. ¿Seguro?`
      : `¿Borrar el pilar de contenido "${p.label}"?`;
    if (!window.confirm(aviso)) return;
    setOcupado(true);
    setError(null);
    try {
      await apiDelete(`/api/pillars/${p.slug}`);
      if (actual === p.slug) setActual('otro');
      await recargar();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setOcupado(false);
    }
  };

  if (!actual && pilares.length === 0) return null;

  return (
    <>
      <button
        ref={botonRef}
        onClick={(e) => { e.stopPropagation(); abierto ? setAbierto(false) : abrir(); }}
        className={`px-1.5 py-0.5 rounded text-[10px] font-medium hover:ring-1 hover:ring-accent/50 transition ${clase}`}
        title={`${meta?.ayuda || 'Sin pilar de contenido en el catálogo'}\n\nPulsa para cambiar el pilar de contenido`}
      >
        {etiqueta || 'Sin pilar'}
      </button>

      {abierto && pos && (
        <div
          ref={panelRef}
          style={{ top: pos.top, right: pos.right }}
          className="fixed z-50 w-64 bg-bg-card border border-border rounded-lg shadow-xl p-2 space-y-1"
        >
          <input
            autoFocus
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar o crear pilar de contenido…"
            className="w-full text-xs bg-bg-primary border border-border rounded px-2 py-1.5 focus:outline-none focus:border-accent"
          />
          {error && <p className="text-[10px] text-red-400 leading-snug px-1">✗ {error}</p>}

          <div className="max-h-64 overflow-y-auto space-y-0.5">
            {filtrados.map((p) => (
              <div key={p.slug} className="group flex items-center gap-1">
                {renombrando === p.slug ? (
                  <input
                    autoFocus
                    value={nombreNuevo}
                    maxLength={40}
                    disabled={ocupado}
                    aria-label={`Nuevo nombre para ${p.label}`}
                    onChange={(e) => setNombreNuevo(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void renombrar(p.slug);
                      if (e.key === 'Escape') {
                        // Sin esto el keydown de document cierra el panel entero
                        // y el blur del input al desmontarse guardaria lo escrito.
                        e.stopPropagation();
                        cancelarRef.current = true;
                        setError(null);
                        setRenombrando(null);
                      }
                    }}
                    onBlur={() => void renombrar(p.slug)}
                    className="flex-1 min-w-0 text-xs bg-bg-primary border border-accent rounded px-2 py-1 focus:outline-none disabled:opacity-60"
                  />
                ) : (
                  <>
                    <button
                      onClick={() => void asignar(p.slug)}
                      disabled={ocupado}
                      className="flex-1 flex items-center gap-2 text-left px-1.5 py-1 rounded hover:bg-bg-secondary disabled:opacity-50 transition-colors min-w-0"
                    >
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium truncate ${PALETA_PILAR[p.color] || CLASE_DESCONOCIDO}`}>
                        {p.label}
                      </span>
                      {p.slug === actual && <span className="text-accent text-[10px] flex-shrink-0">✓</span>}
                    </button>
                    {/* El lapiz, en TODOS y siempre visible: cambia solo la
                        etiqueta y el slug se queda, asi que tambien vale para
                        los de serie. */}
                    <button
                      onClick={() => empezarRenombrar(p)}
                      disabled={ocupado}
                      className="text-[10px] text-text-muted hover:text-accent px-1 flex-shrink-0 disabled:opacity-50 transition-colors"
                      title="Renombrar"
                      aria-label={`Renombrar ${p.label}`}
                    >
                      ✎
                    </button>
                    {/* Los de serie no llevan papelera: el clasificador los emite
                        por su slug, asi que borrarlos solo consigue que el
                        reproceso los reinvente con sus posts ya en Otro. */}
                    {!p.builtin && (
                      <button
                        onClick={() => void borrar(p)}
                        disabled={ocupado}
                        className="text-[10px] text-text-muted hover:text-red-400 px-1 flex-shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                        title="Borrar"
                        aria-label={`Borrar ${p.label}`}
                      >
                        🗑
                      </button>
                    )}
                  </>
                )}
              </div>
            ))}
            {filtrados.length === 0 && !puedeCrear && (
              <p className="text-[10px] text-text-muted px-1.5 py-2">Ningún pilar de contenido con ese nombre.</p>
            )}
          </div>

          {puedeCrear && (
            <button
              onClick={() => void crear()}
              disabled={ocupado}
              className="w-full text-left text-xs px-1.5 py-1.5 rounded border-t border-border text-accent hover:bg-bg-secondary disabled:opacity-50 transition-colors"
            >
              {ocupado ? 'Creando…' : `+ Crear «${busca.trim()}»`}
            </button>
          )}

          <p className="text-[9px] text-text-muted leading-snug px-1 pt-1 border-t border-border">
            Un pilar de contenido que crees tú no se detecta solo: sus posts los marcas a mano.
          </p>
        </div>
      )}
    </>
  );
}
