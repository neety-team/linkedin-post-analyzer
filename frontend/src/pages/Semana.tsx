/**
 * LA SEMANA (2026-11-17): que publica cada cuenta la semana que viene, el
 * borrador de cada post y el feedback de los fundadores.
 *
 * Los posts los escribe Claude por el MCP (`neety_semana_publicar`); esta
 * pagina es donde cada fundador lee los suyos y dice que cambiaria. El
 * feedback lo recoge Claude (`neety_semana_feedback`) y contesta aqui mismo.
 *
 * QUIEN ESCRIBE: la app va detras de una contraseña compartida, asi que no se
 * sabe quien esta mirando. Cada uno elige su nombre una vez y se recuerda en
 * este navegador. Elegirlo firma su feedback, marca su columna y le deja ver
 * solo sus posts.
 *
 * CADA POST (2026-11-17) se enseña en este orden: por que se publica, y despues
 * el post tal como se vera en LinkedIn, con su foto. Si la foto no esta, sale
 * el hueco de "Foto pendiente" y se sube desde ahi mismo.
 *
 * MOVERSE ENTRE SEMANAS (2026-11-17): se va a la anterior y a la siguiente como
 * en un calendario, tengan posts o no, y la semana va en la URL (`?s=2026-W48`)
 * para poder pasar el enlace. Sin `?s=` se abre la semana que se esta
 * preparando: la que viene si ya tiene posts, y si no, la actual.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApi, apiPost } from '../hooks/useApi';

type Cuenta = 'iker' | 'unai' | 'asier';
type Objetivo = 'alcance' | 'notoriedad' | 'conversion';

interface Feedback {
  id: string;
  autor: string;
  texto: string;
  nivel: 'estilo' | 'pilar' | 'post' | null;
  resuelto: boolean;
  respuesta: string | null;
  created_at: string;
}

interface PostSemana {
  id: string;
  clave: string;
  fecha: string;
  cuenta: Cuenta;
  objetivo: Objetivo;
  experimento: boolean;
  pilar: string | null;
  titulo: string;
  texto: string;
  estado: string;
  vara: string | null;
  por_que: string | null;
  falta: string | null;
  nota_imagen: string | null;
  tiene_imagen: boolean;
  imagen_version: string | null;
  feedback: Feedback[];
}

interface Perfil {
  nombre: string;
  titular: string | null;
  foto: string | null;
}

interface SemanaDetalle {
  semana: string;
  estado: string;
  nota: string | null;
  posts: PostSemana[];
}

interface SemanaResumen {
  semana: string;
  estado: string;
  posts: number;
  feedback_pendiente: number;
}

const CUENTAS: { id: Cuenta; nombre: string; rol: string }[] = [
  { id: 'iker', nombre: 'Iker', rol: 'Ventas' },
  { id: 'unai', nombre: 'Unai', rol: 'CEO' },
  { id: 'asier', nombre: 'Asier', rol: 'Tecnología' },
];

// Por si la base no trae el perfil de la cuenta (en local, por ejemplo).
const NOMBRE_COMPLETO: Record<Cuenta, string> = {
  iker: 'Iker Galarza Rodríguez',
  unai: 'Unai Arambarri Yeregui',
  asier: 'Asier Olaizola Paniagua',
};

// Clases escritas enteras: Tailwind solo compila las que ve en el codigo.
const OBJETIVO: Record<Objetivo, { etiqueta: string; chip: string }> = {
  alcance: { etiqueta: 'Alcance', chip: 'text-data bg-data/10' },
  notoriedad: { etiqueta: 'Notoriedad', chip: 'text-diamond bg-diamond/15' },
  conversion: { etiqueta: 'Conversión', chip: 'text-accent bg-accent/10' },
};

const ESTADO: Record<string, string> = {
  idea: 'Idea',
  esqueleto: 'Esqueleto',
  a_medias: 'A medias',
  escrito: 'Escrito',
  aprobado: 'Aprobado',
  programado: 'Programado',
  publicado: 'Publicado',
};

// Al volver atras se ven semanas ya cerradas: no son "propuesta sin aprobar".
const ESTADO_SEMANA: Record<string, string> = {
  propuesta: 'Propuesta sin aprobar',
  aprobada: 'Aprobada',
  cerrada: 'Cerrada',
};

const NIVEL: Record<string, string> = {
  estilo: 'Se aplica a todos tus posts',
  pilar: 'Se aplica a este tipo de post',
  post: 'Se aplica a este post',
};

const CLAVE_AUTOR = 'semana.autor';
const DRIVE_FOTOS = 'https://drive.google.com/drive/folders/112SDtswWdxv9K_Fp2gfgaFIKMiLWAklS';

function leerAutor(): string {
  try {
    return localStorage.getItem(CLAVE_AUTOR) || '';
  } catch {
    return '';
  }
}

function diaCorto(fecha: string): string {
  const d = new Date(`${fecha}T12:00:00`);
  const dia = d.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '');
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)} ${d.getDate()}`;
}

// ── Semanas ISO ('2026-W48'). Todo en UTC, para que el cambio de hora no mueva
// un lunes al domingo.
const DIA_MS = 86_400_000;

/** El lunes de una semana ISO. La semana 1 es la que contiene el 4 de enero. */
function lunesDe(codigo: string): Date {
  const anio = Number(codigo.slice(0, 4));
  const num = Number(codigo.slice(6));
  const ene4 = new Date(Date.UTC(anio, 0, 4));
  const diaSemana = ene4.getUTCDay() || 7;
  return new Date(ene4.getTime() + (1 - diaSemana + (num - 1) * 7) * DIA_MS);
}

/** La semana ISO de una fecha: la del jueves de esa semana. */
function codigoDe(fecha: Date): string {
  const d = new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const anio = d.getUTCFullYear();
  const num = Math.ceil(((d.getTime() - Date.UTC(anio, 0, 1)) / DIA_MS + 1) / 7);
  return `${anio}-W${String(num).padStart(2, '0')}`;
}

function semanaDeHoy(): string {
  const h = new Date();
  return codigoDe(new Date(Date.UTC(h.getFullYear(), h.getMonth(), h.getDate())));
}

function mover(codigo: string, semanas: number): string {
  return codigoDe(new Date(lunesDe(codigo).getTime() + semanas * 7 * DIA_MS));
}

/** Solo semanas que existen: '2026-W54' o '2026-W00' no pasan. */
function esCodigo(s: string | null): s is string {
  return !!s && /^\d{4}-W\d{2}$/.test(s) && codigoDe(lunesDe(s)) === s;
}

function numero(codigo: string): number {
  return Number(codigo.slice(6));
}

/** '23 al 29 nov', o '30 nov al 6 dic' si la semana cruza de mes. */
function rangoCorto(codigo: string): string {
  const lunes = lunesDe(codigo);
  const domingo = new Date(lunes.getTime() + 6 * DIA_MS);
  const mes = (d: Date) => d.toLocaleDateString('es-ES', { month: 'short', timeZone: 'UTC' }).replace('.', '');
  return lunes.getUTCMonth() === domingo.getUTCMonth()
    ? `${lunes.getUTCDate()} al ${domingo.getUTCDate()} ${mes(domingo)}`
    : `${lunes.getUTCDate()} ${mes(lunes)} al ${domingo.getUTCDate()} ${mes(domingo)}`;
}

/** Donde cae una semana respecto a hoy. */
function distancia(codigo: string, hoy: string): string {
  const n = Math.round((lunesDe(codigo).getTime() - lunesDe(hoy).getTime()) / (7 * DIA_MS));
  if (n === 0) return 'Esta semana';
  if (n === 1) return 'La semana que viene';
  if (n === -1) return 'La semana pasada';
  return n > 0 ? `Dentro de ${n} semanas` : `Hace ${-n} semanas`;
}

/**
 * La semana que se abre sin `?s=`: la que se esta preparando. Es la que viene
 * si ya tiene posts; si no, la actual; si tampoco, la mas cercana que venga, y
 * a falta de todas, la ultima que hubo.
 */
function semanaPorDefecto(conPosts: string[], hoy: string): string {
  const siguiente = mover(hoy, 1);
  if (conPosts.includes(siguiente)) return siguiente;
  if (conPosts.includes(hoy)) return hoy;
  const futuras = conPosts.filter((c) => c > hoy).sort();
  if (futuras.length) return futuras[0];
  const pasadas = [...conPosts].sort();
  return pasadas[pasadas.length - 1] || hoy;
}

const BOTON_NAV =
  'px-3.5 py-1.5 rounded-full text-[13px] font-semibold border bg-bg-card text-text-secondary border-border hover:border-text-muted hover:text-text-primary transition-colors tabular-nums';

// ── El post como se vera en LinkedIn ─────────────────────────────────────────
// Colores y medidas de la tarjeta de LinkedIn, no los de esta app: lo que se
// revisa es como quedara publicado. Tiene su version clara y su version oscura.

const LI_FUENTE = {
  fontFamily: '-apple-system, system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};
const LI_AZUL = 'text-[#0a66c2] dark:text-[#71b7fb]';
const LI_GRIS = 'text-black/60 dark:text-white/60';

const API = import.meta.env.VITE_API_URL || '';
const FOTO_MAX = 8 * 1024 * 1024;
const FOTO_TIPOS = 'image/jpeg,image/png,image/webp,image/gif';

/**
 * El texto del post: lo que falta por rellenar ([...]) resaltado, y los enlaces
 * y las menciones (@Nombre Apellido) en el azul de LinkedIn.
 */
function TextoPost({ texto }: { texto: string }) {
  const partes = texto.split(
    /(\[[^\]\n]*\]|https?:\/\/[^\s]+|@\p{Lu}\p{L}+(?: \p{Lu}\p{L}+){0,3})/gu
  );
  return (
    <>
      {partes.map((p, i) => {
        if (p.startsWith('[') && p.endsWith(']')) {
          return (
            <mark key={i} className="bg-naranja/25 text-inherit rounded px-0.5">
              {p}
            </mark>
          );
        }
        if (/^https?:\/\//.test(p)) {
          return (
            <span key={i} className={`${LI_AZUL} font-semibold break-all`}>
              {p}
            </span>
          );
        }
        if (/^@\p{Lu}/u.test(p)) {
          return (
            <span key={i} className={`${LI_AZUL} font-semibold`}>
              {p.slice(1)}
            </span>
          );
        }
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}

function Avatar({ foto, nombre }: { foto: string | null; nombre: string }) {
  const [rota, setRota] = useState(false);
  if (foto && !rota) {
    return (
      <img
        src={foto}
        alt=""
        onError={() => setRota(true)}
        referrerPolicy="no-referrer"
        className="w-12 h-12 rounded-full object-cover shrink-0"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="w-12 h-12 rounded-full shrink-0 flex items-center justify-center bg-black/10 dark:bg-white/15 text-[18px] font-semibold"
    >
      {nombre.charAt(0)}
    </span>
  );
}

const ACCIONES_LI: [string, string][] = [
  ['Recomendar', 'M7 10v10H4V10h3zm2 0 4-7c1.5 0 2.5 1 2.5 2.5V9H19c1.1 0 2 .9 2 2l-1.5 7c-.2 1.1-1 2-2.2 2H9V10z'],
  ['Comentar', 'M4 5h16v11H9l-5 4V5z'],
  ['Compartir', 'M7 7h10l-3-3m3 3-3 3M17 17H7l3 3m-3-3 3-3'],
  ['Enviar', 'M3 4l18 8-18 8 3-8-3-8zm3 8h9'],
];

function fechaLinkedIn(fecha: string): string {
  return new Date(`${fecha}T12:00:00`)
    .toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })
    .replace(/\./g, '');
}

function Tarjeta({
  post,
  perfil,
  autor,
  mio,
  abierto,
  onCambio,
}: {
  post: PostSemana;
  perfil: Perfil | undefined;
  autor: string;
  mio: boolean;
  abierto: boolean;
  onCambio: () => void;
}) {
  const [verTodo, setVerTodo] = useState(false);
  const [borrador, setBorrador] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [errorFoto, setErrorFoto] = useState<string | null>(null);
  const obj = OBJETIVO[post.objetivo] || OBJETIVO.alcance;
  const cuenta = CUENTAS.find((c) => c.id === post.cuenta);
  const nombre = perfil?.nombre || NOMBRE_COMPLETO[post.cuenta];
  const titular = perfil?.titular || 'Neety';
  // En el feed LinkedIn enseña tres lineas y corta con "…más".
  const largo = post.texto.length > 210 || post.texto.split('\n').length > 3;
  const entero = abierto || verTodo || !largo;

  const enviar = async () => {
    if (!autor) {
      setError('Elige arriba quién eres para dejar feedback.');
      return;
    }
    if (!borrador.trim()) {
      setError('Escribe qué cambiarías.');
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      await apiPost(`/api/semana/posts/${post.id}/feedback`, { autor, texto: borrador.trim() });
      setBorrador('');
      onCambio();
    } catch (e) {
      setError(`No se ha guardado: ${e instanceof Error ? e.message : 'error desconocido'}`);
    } finally {
      setEnviando(false);
    }
  };

  const foto = async (metodo: 'PUT' | 'DELETE', fichero?: File) => {
    if (fichero && fichero.size > FOTO_MAX) {
      setErrorFoto('La foto pesa más de 8 MB.');
      return;
    }
    setSubiendo(true);
    setErrorFoto(null);
    try {
      const res = await fetch(`${API}/api/semana/posts/${post.id}/imagen`, {
        method: metodo,
        headers: fichero ? { 'Content-Type': fichero.type || 'application/octet-stream' } : undefined,
        body: fichero,
      });
      if (!res.ok) {
        const cuerpo = await res.json().catch(() => null);
        throw new Error(cuerpo?.error || `Error ${res.status}`);
      }
      onCambio();
    } catch (e) {
      setErrorFoto(`No se ha podido: ${e instanceof Error ? e.message : 'error desconocido'}`);
    } finally {
      setSubiendo(false);
    }
  };

  const elegirFoto = (etiqueta: string, clases: string) => (
    <label className={`${clases} cursor-pointer focus-within:ring-2 focus-within:ring-accent`}>
      {subiendo ? 'Subiendo…' : etiqueta}
      <input
        type="file"
        accept={FOTO_TIPOS}
        disabled={subiendo}
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) foto('PUT', f);
        }}
      />
    </label>
  );

  return (
    <article
      className={`min-w-0 bg-bg-card border rounded-xl p-4 flex flex-col gap-2.5 ${
        mio ? 'border-accent/60' : 'border-border'
      }`}
    >
      <span className="md:hidden text-[11px] font-semibold uppercase tracking-wider text-text-muted">
        {cuenta?.nombre}
        {mio ? ' · tú' : ''}
      </span>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={`text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${obj.chip}`}>
          {obj.etiqueta}
          {post.experimento ? ' · experimento' : ''}
        </span>
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded border border-border text-text-secondary">
          {ESTADO[post.estado] || post.estado}
        </span>
      </div>
      <h3 className="font-display text-[16px] font-semibold leading-snug text-text-primary">{post.titulo}</h3>
      {post.pilar && <p className="text-xs text-text-muted">{post.pilar}</p>}

      {/* El porque va ANTES del post: primero se entiende para que se publica. */}
      {(post.por_que || post.vara) && (
        <div className="border-l-2 border-accent/50 pl-3 text-[13px] leading-relaxed text-text-secondary">
          {post.por_que && (
            <p>
              <span className="font-semibold text-text-primary">Por qué se publica. </span>
              {post.por_que}
            </p>
          )}
          {post.vara && <p className="mt-1 text-xs text-text-muted tabular-nums">Con qué se compara: {post.vara}</p>}
        </div>
      )}

      <div
        style={LI_FUENTE}
        className="rounded-lg overflow-hidden border border-black/10 dark:border-white/15 bg-white dark:bg-[#1b1f23] text-black/90 dark:text-white/90"
        aria-label={`Así se verá en LinkedIn el post de ${nombre}`}
      >
        <div className="flex gap-2 px-3 pt-3">
          <Avatar foto={perfil?.foto || null} nombre={nombre} />
          <div className="min-w-0">
            <p className="text-[14px] font-semibold leading-5 truncate">{nombre}</p>
            <p className={`text-[12px] leading-4 truncate ${LI_GRIS}`}>{titular}</p>
            <p className={`text-[12px] leading-4 flex items-center gap-1 ${LI_GRIS}`}>
              {fechaLinkedIn(post.fecha)} ·
              <svg viewBox="0 0 16 16" className="w-3 h-3" fill="currentColor" aria-hidden="true">
                <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zM3 8c0-.4 0-.7.1-1L5 9v1l1 1v2.6A5 5 0 0 1 3 8zm8.9 3.1c-.2-.7-.8-1.1-1.4-1.1H10V8.5c0-.3-.2-.5-.5-.5H6V7h1c.3 0 .5-.2.5-.5V5.5h1A1.5 1.5 0 0 0 10 4v-.6a5 5 0 0 1 1.9 7.7z" />
              </svg>
            </p>
          </div>
        </div>

        <div className="px-3 pt-2 pb-2 relative">
          {post.texto ? (
            <>
              <div
                className={`text-[14px] leading-5 whitespace-pre-wrap break-words ${entero ? '' : 'line-clamp-3'}`}
              >
                <TextoPost texto={post.texto} />
              </div>
              {largo && !abierto && (
                <button
                  type="button"
                  onClick={() => setVerTodo((v) => !v)}
                  aria-expanded={entero}
                  className={`mt-0.5 text-[14px] leading-5 font-semibold hover:underline ${LI_GRIS}`}
                >
                  {entero ? 'ver menos' : 'ver más'}
                </button>
              )}
            </>
          ) : (
            <p className={`text-[14px] leading-5 ${LI_GRIS}`}>Todavía sin texto.</p>
          )}
        </div>

        {post.tiene_imagen ? (
          <img
            src={`${API}/api/semana/posts/${post.id}/imagen?v=${post.imagen_version || ''}`}
            alt={post.nota_imagen || `Foto del post de ${nombre}`}
            loading="lazy"
            className="w-full block"
          />
        ) : (
          <div className="border-y border-dashed border-black/20 dark:border-white/25 bg-black/[0.04] dark:bg-white/[0.06] px-4 py-7 text-center">
            <p className="text-[12px] font-semibold uppercase tracking-wider">Foto pendiente</p>
            {post.nota_imagen && <p className={`mt-1.5 text-[12px] leading-4 ${LI_GRIS}`}>{post.nota_imagen}</p>}
            {elegirFoto(
              'Subir foto',
              'mt-3 inline-block rounded-full border border-black/40 dark:border-white/50 px-3.5 py-1 text-[13px] font-semibold'
            )}
          </div>
        )}

        <div className={`flex border-t border-black/10 dark:border-white/15 mt-1 ${LI_GRIS}`} aria-hidden="true">
          {ACCIONES_LI.map(([etiqueta, trazo]) => (
            <span key={etiqueta} className="flex-1 min-w-0 py-2 flex flex-col items-center gap-0.5">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round">
                <path d={trazo} />
              </svg>
              <span className="text-[11px] font-semibold truncate max-w-full">{etiqueta}</span>
            </span>
          ))}
        </div>
      </div>

      {post.tiene_imagen && (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
          {post.nota_imagen && <span className="basis-full leading-relaxed">Foto: {post.nota_imagen}</span>}
          {elegirFoto('Cambiar la foto', 'font-semibold text-text-secondary hover:text-accent rounded')}
          <button
            type="button"
            disabled={subiendo}
            onClick={() => {
              if (window.confirm('¿Quitar la foto de este post?')) foto('DELETE');
            }}
            className="font-semibold text-text-secondary hover:text-danger"
          >
            Quitar
          </button>
        </p>
      )}
      {errorFoto && <p className="text-xs text-danger">{errorFoto}</p>}

      {post.falta && (
        <p className="text-[13px] text-text-secondary border-t border-border pt-2 leading-relaxed">
          <span className="font-semibold text-text-primary">Falta: </span>
          {post.falta}
        </p>
      )}

      {post.feedback.length > 0 && (
        <ul className="border-t border-border pt-2 space-y-2">
          {post.feedback.map((f) => (
            <li key={f.id} className="text-[13px] leading-relaxed">
              <p className="text-text-primary">
                <span className="font-semibold">{f.autor}: </span>
                {f.texto}
              </p>
              {f.respuesta && (
                <p className="mt-1 pl-3 border-l-2 border-accent/40 text-text-secondary">{f.respuesta}</p>
              )}
              <p className="mt-0.5 text-[11px] text-text-muted">
                {f.resuelto ? 'Aplicado' : 'Pendiente de aplicar'}
                {f.nivel ? ` · ${NIVEL[f.nivel]}` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-border pt-2 space-y-2">
        <label htmlFor={`fb-${post.id}`} className="block text-xs font-semibold text-text-muted">
          {autor ? `Tu feedback, como ${autor}` : 'Tu feedback (elige arriba quién eres)'}
        </label>
        <textarea
          id={`fb-${post.id}`}
          value={borrador}
          onChange={(e) => {
            setBorrador(e.target.value);
            if (error) setError(null);
          }}
          rows={2}
          placeholder="Yo esto lo diría así…"
          className="w-full bg-bg-secondary border border-border rounded-lg p-2.5 text-[13px] text-text-primary resize-y focus:outline-none focus:border-accent leading-relaxed"
        />
        {error && <p className="text-xs text-danger">{error}</p>}
        <button
          type="button"
          onClick={enviar}
          disabled={enviando}
          className="px-3.5 py-1.5 rounded-full bg-accent text-on-accent text-[13px] font-semibold hover:bg-accent-strong disabled:opacity-60 transition-colors"
        >
          {enviando ? 'Guardando…' : 'Dejar feedback'}
        </button>
      </div>
    </article>
  );
}

export default function Semana() {
  const [params, setParams] = useSearchParams();
  const lista = useApi<{ semanas: SemanaResumen[] }>('/api/semana');
  const semanas = useMemo(() => lista.data?.semanas || [], [lista.data]);
  const conPosts = useMemo(() => semanas.map((s) => s.semana), [semanas]);
  const hoy = useMemo(() => semanaDeHoy(), []);
  const pedida = params.get('s');
  const elegida = esCodigo(pedida) ? pedida : semanaPorDefecto(conPosts, hoy);
  // Una semana sin posts no esta en la base: no se pide, se enseña vacia.
  const existe = conPosts.includes(elegida);
  const detalle = useApi<SemanaDetalle>(existe ? `/api/semana/${elegida}` : null);
  // Al cambiar de semana el hook conserva la anterior hasta que llega la nueva.
  const datos = existe && detalle.data?.semana === elegida ? detalle.data : null;
  // Quien entra por el login de neety.team ya viene identificado: no elige nombre.
  const yo = useApi<{ identidad: { email: string; nombre: string } | null }>('/api/yo');
  const identificado = yo.data?.identidad?.nombre || '';
  const [elegido, setAutor] = useState(leerAutor);
  const autor = identificado || elegido;
  const perfiles = useApi<{ perfiles: Partial<Record<Cuenta, Perfil>> }>('/api/semana/perfiles');
  // La cuenta de quien mira: por su nombre de pila, venga del login o del boton.
  const miCuenta = CUENTAS.find((c) => autor.trim().toLowerCase().split(/\s+/)[0] === c.id)?.id || null;
  const [soloMios, setSoloMios] = useState(false);
  const visibles = soloMios && miCuenta ? CUENTAS.filter((c) => c.id === miCuenta) : CUENTAS;
  const [filtro, setFiltro] = useState<Objetivo | ''>('');
  const [todosAbiertos, setTodosAbiertos] = useState(false);

  useEffect(() => {
    try {
      if (elegido) localStorage.setItem(CLAVE_AUTOR, elegido);
    } catch {
      /* sin almacenamiento: se elige otra vez la proxima visita */
    }
  }, [elegido]);

  const posts = useMemo(() => datos?.posts || [], [datos]);
  const dias = useMemo(() => Array.from(new Set(posts.map((p) => p.fecha))).sort(), [posts]);
  const cuenta = (o: Objetivo) => posts.filter((p) => p.objetivo === o).length;
  const pendiente = posts.reduce((n, p) => n + p.feedback.filter((f) => !f.resuelto).length, 0);

  if (lista.loading) return <p className="text-sm text-text-muted">Cargando la semana…</p>;
  if (lista.error) return <p className="text-sm text-danger">No se ha podido cargar: {lista.error}</p>;
  if (!semanas.length) {
    return (
      <div className="bg-bg-card border border-border rounded-xl p-8 max-w-2xl">
        <h1 className="font-display text-2xl font-semibold text-text-primary">Todavía no hay ninguna semana</h1>
        <p className="mt-2 text-sm text-text-secondary leading-relaxed">
          Aquí aparecerán los posts de la semana siguiente en cuanto estén escritos, para que cada uno lea los
          suyos y diga qué cambiaría.
        </p>
      </div>
    );
  }

  const anterior = mover(elegida, -1);
  const siguiente = mover(elegida, 1);
  const previaConPosts = conPosts.filter((c) => c < elegida).sort().pop();
  const proximaConPosts = conPosts.filter((c) => c > elegida).sort()[0];

  const cabecera = (
    <>
      <p className="text-xs font-semibold uppercase tracking-widest text-text-muted">
        LinkedIn · {distancia(elegida, hoy)}
      </p>
      <h1 className="font-display text-3xl font-semibold tracking-tight text-text-primary tabular-nums">
        Semana {numero(elegida)} <span className="text-text-muted font-normal">· {rangoCorto(elegida)}</span>
      </h1>
      <nav aria-label="Moverse entre semanas" className="flex flex-wrap items-center gap-2">
        <Link to={{ search: `?s=${anterior}` }} className={BOTON_NAV} aria-label={`Ir a la semana ${numero(anterior)}, la anterior`}>
          ← Semana {numero(anterior)}
        </Link>
        <Link to={{ search: `?s=${siguiente}` }} className={BOTON_NAV} aria-label={`Ir a la semana ${numero(siguiente)}, la siguiente`}>
          Semana {numero(siguiente)} →
        </Link>
        {elegida !== hoy && (
          <Link to={{ search: `?s=${hoy}` }} className={BOTON_NAV}>
            Esta semana
          </Link>
        )}
        {(semanas.length > 1 || !existe) && (
          <select
            value={existe ? elegida : ''}
            onChange={(e) => e.target.value && setParams({ s: e.target.value })}
            aria-label="Ir a una semana con posts"
            className="max-w-full min-w-0 truncate bg-bg-card border border-border rounded-full px-3 py-1.5 text-[13px] font-semibold text-text-secondary"
          >
            {!existe && <option value="">Semanas con posts</option>}
            {semanas.map((s) => (
              <option key={s.semana} value={s.semana}>
                Semana {numero(s.semana)} · {rangoCorto(s.semana)} · {s.posts} {s.posts === 1 ? 'post' : 'posts'}
                {s.feedback_pendiente ? ` · ${s.feedback_pendiente} por aplicar` : ''}
              </option>
            ))}
          </select>
        )}
      </nav>
    </>
  );

  if (!existe) {
    return (
      <div className="space-y-8">
        <header className="space-y-3">{cabecera}</header>
        <div className="bg-bg-card border border-border rounded-xl p-8 max-w-2xl space-y-3">
          <h2 className="font-display text-xl font-semibold text-text-primary">
            No hay posts planificados para la semana {numero(elegida)}
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            Los posts de una semana se escriben la anterior. Cuando estén, aparecerán aquí.
          </p>
          {(previaConPosts || proximaConPosts) && (
            <p className="flex flex-wrap gap-2 pt-1">
              {previaConPosts && (
                <Link to={{ search: `?s=${previaConPosts}` }} className={BOTON_NAV}>
                  ← Semana {numero(previaConPosts)}, la última con posts
                </Link>
              )}
              {proximaConPosts && (
                <Link to={{ search: `?s=${proximaConPosts}` }} className={BOTON_NAV}>
                  Semana {numero(proximaConPosts)}, la próxima con posts →
                </Link>
              )}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        {cabecera}
        <p className="inline-flex items-center gap-2 text-[13px] font-semibold text-text-secondary bg-bg-card border border-border rounded-full px-3 py-1">
          <span
            className={`w-2 h-2 rounded-full ${datos && datos.estado !== 'propuesta' ? 'bg-text-muted' : 'bg-naranja'}`}
            aria-hidden="true"
          />
          {datos ? ESTADO_SEMANA[datos.estado] || datos.estado : 'Cargando…'}
          {datos?.nota ? ` · ${datos.nota}` : ''}
        </p>
        <p className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-text-secondary tabular-nums">
          <span>
            <b className="text-text-primary">{posts.length}</b> {posts.length === 1 ? 'post' : 'posts'}
          </span>
          <span>
            <b className="text-text-primary">{cuenta('alcance')}</b> de alcance
          </span>
          <span>
            <b className="text-text-primary">{cuenta('notoriedad')}</b> de notoriedad
          </span>
          <span>
            <b className="text-text-primary">{cuenta('conversion')}</b> de conversión
          </span>
          <span>
            <b className="text-text-primary">{pendiente}</b> comentarios por aplicar
          </span>
        </p>
      </header>

      <section className="bg-bg-card border border-border rounded-xl p-5 space-y-3" aria-label="Cómo trabajamos">
        <h2 className="font-display text-lg font-semibold text-text-primary">Cómo trabajamos</h2>
        <ol className="list-decimal pl-5 space-y-1.5 text-sm text-text-secondary leading-relaxed max-w-3xl">
          <li>
            <b className="text-text-primary">Una semana cada vez.</b> Los posts se escriben la semana anterior
            para que dé tiempo a afinarlos y dejarlos programados.
          </li>
          <li>
            <b className="text-text-primary">Lee los tuyos y di qué cambiarías.</b> Escribe como te salga. Sirve
            mucho que digas cómo lo habrías dicho tú.
          </li>
          <li>
            <b className="text-text-primary">El feedback se queda aprendido.</b> Si es de estilo, cambia todos
            tus posts. Si es de un tipo de post, cambia ese tipo. Si es de un post, se arregla ese.
          </li>
          <li>
            <b className="text-text-primary">Os iremos pidiendo cosas.</b> Un evento, algo que anunciar, lo que
            pensáis de un tema. Con un audio de un par de minutos basta.
          </li>
          <li>
            <b className="text-text-primary">Hacen falta fotos,</b> sobre todo individuales y naturales. Se suben
            a{' '}
            <a
              href={DRIVE_FOTOS}
              target="_blank"
              rel="noreferrer"
              className="text-accent font-semibold underline-offset-2 hover:underline"
            >
              la carpeta de fotos de Drive
            </a>
            .
          </li>
        </ol>
      </section>

      <section className="space-y-4" aria-label="Calendario de la semana">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
          {identificado ? (
            <p className="text-[13px] text-text-muted">
              Entras como <b className="text-text-primary">{identificado}</b>
            </p>
          ) : (
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Quién eres">
            <span className="text-[13px] text-text-muted">Soy</span>
            {CUENTAS.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={autor === c.nombre}
                onClick={() => setAutor(c.nombre)}
                className={`px-3.5 py-1.5 rounded-full text-[13px] font-semibold border transition-colors ${
                  autor === c.nombre
                    ? 'bg-text-primary text-bg-primary border-text-primary'
                    : 'bg-bg-card text-text-secondary border-border hover:border-text-muted'
                }`}
              >
                {c.nombre}
              </button>
            ))}
          </div>
          )}
          {miCuenta && (
            <button
              type="button"
              aria-pressed={soloMios}
              onClick={() => setSoloMios((v) => !v)}
              className={`px-3.5 py-1.5 rounded-full text-[13px] font-semibold border transition-colors ${
                soloMios
                  ? 'bg-accent text-on-accent border-accent'
                  : 'bg-bg-card text-text-secondary border-border hover:border-text-muted'
              }`}
            >
              {soloMios ? 'Viendo solo mis posts' : 'Ver solo mis posts'}
            </button>
          )}
          </div>
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por objetivo">
            <span className="text-[13px] text-text-muted">Ver</span>
            {([['', 'Todos'], ['alcance', 'Alcance'], ['notoriedad', 'Notoriedad'], ['conversion', 'Conversión']] as const).map(
              ([v, etiqueta]) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={filtro === v}
                  onClick={() => setFiltro(v)}
                  className={`px-3.5 py-1.5 rounded-full text-[13px] font-semibold border transition-colors ${
                    filtro === v
                      ? 'bg-text-primary text-bg-primary border-text-primary'
                      : 'bg-bg-card text-text-secondary border-border hover:border-text-muted'
                  }`}
                >
                  {etiqueta}
                </button>
              )
            )}
            <button
              type="button"
              aria-pressed={todosAbiertos}
              onClick={() => setTodosAbiertos((v) => !v)}
              className="px-3.5 py-1.5 rounded-full text-[13px] font-semibold border bg-bg-card text-text-secondary border-border hover:border-text-muted"
            >
              {todosAbiertos ? 'Recoger los textos' : 'Desplegar todos los textos'}
            </button>
          </div>
        </div>

        {detalle.loading && !datos && <p className="text-sm text-text-muted">Cargando los posts…</p>}
        {detalle.error && <p className="text-sm text-danger">No se ha podido cargar: {detalle.error}</p>}

        {!identificado && (
          <p className="text-xs text-text-muted" aria-live="polite">
            {autor
              ? `Tu feedback saldrá firmado como ${autor}. Tu columna va marcada en naranja.`
              : 'Elige quién eres: tu feedback saldrá con tu nombre y se marcará tu columna.'}
          </p>
        )}

        <div
          className={`md:grid gap-3 space-y-3 md:space-y-0 ${
            visibles.length === 1
              ? 'md:grid-cols-[84px_minmax(0,560px)]'
              : 'md:grid-cols-[84px_repeat(3,minmax(0,1fr))]'
          }`}
        >
          <div className="hidden md:block border-b-2 border-text-primary" />
          {visibles.map((c) => (
            <div
              key={c.id}
              className={`hidden md:block border-b-2 pb-1 ${c.id === miCuenta ? 'border-accent' : 'border-text-primary'}`}
            >
              <p className="font-display text-[17px] font-semibold text-text-primary">
                {c.nombre}
                {c.id === miCuenta && (
                  <span className="ml-2 align-middle text-[11px] font-semibold uppercase tracking-wider text-accent">
                    Tú
                  </span>
                )}
              </p>
              <p className="text-xs text-text-muted">{c.rol}</p>
            </div>
          ))}

          {dias.map((dia) => (
            <div key={dia} className="md:contents space-y-3">
              <p className="font-display text-[17px] font-semibold text-text-primary md:pt-3 border-b-2 border-text-primary md:border-0 pb-1 md:pb-0">
                {diaCorto(dia)}
              </p>
              {visibles.map((c) => {
                const suyos = posts.filter((p) => p.fecha === dia && p.cuenta === c.id);
                if (!suyos.length) {
                  return (
                    <div
                      key={c.id}
                      className="min-w-0 rounded-xl border border-dashed border-border p-4 text-[13px] text-text-muted flex md:flex-col gap-1.5 md:justify-center"
                    >
                      <span className="md:hidden font-semibold">{c.nombre}:</span>
                      <span>Sin post</span>
                    </div>
                  );
                }
                return (
                  <div key={c.id} className="min-w-0 space-y-3">
                    {suyos.map((p) => (
                      <div key={p.id} className={filtro && p.objetivo !== filtro ? 'opacity-25' : ''}>
                        <Tarjeta
                          post={p}
                          perfil={perfiles.data?.perfiles?.[p.cuenta]}
                          autor={autor}
                          mio={p.cuenta === miCuenta}
                          abierto={todosAbiertos}
                          onCambio={detalle.refetch}
                        />
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <p className="text-xs text-text-muted">
          Lo resaltado en naranja dentro de un post es lo que falta y no se puede escribir sin inventar.
        </p>
      </section>
    </div>
  );
}
