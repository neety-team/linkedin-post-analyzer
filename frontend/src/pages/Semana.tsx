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
 * este navegador.
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
  feedback: Feedback[];
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

/** El texto del post, con lo que falta por rellenar ([...]) resaltado. */
function TextoPost({ texto }: { texto: string }) {
  const partes = texto.split(/(\[[^\]\n]*\])/g);
  return (
    <pre className="mt-2 p-3 rounded-lg bg-bg-secondary text-[13px] leading-relaxed text-text-primary whitespace-pre-wrap break-words font-sans">
      {partes.map((p, i) =>
        p.startsWith('[') && p.endsWith(']') ? (
          <mark key={i} className="bg-naranja/25 text-inherit rounded px-0.5">
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </pre>
  );
}

function Tarjeta({
  post,
  autor,
  abierto,
  onFeedback,
}: {
  post: PostSemana;
  autor: string;
  abierto: boolean;
  onFeedback: () => void;
}) {
  const [verPost, setVerPost] = useState(false);
  const [borrador, setBorrador] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const obj = OBJETIVO[post.objetivo] || OBJETIVO.alcance;
  const mostrar = abierto || verPost;
  const cuenta = CUENTAS.find((c) => c.id === post.cuenta);

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
      onFeedback();
    } catch (e) {
      setError(`No se ha guardado: ${e instanceof Error ? e.message : 'error desconocido'}`);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <article className="min-w-0 bg-bg-card border border-border rounded-xl p-4 flex flex-col gap-2">
      <span className="md:hidden text-[11px] font-semibold uppercase tracking-wider text-text-muted">
        {cuenta?.nombre}
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
      {post.vara && <p className="text-xs text-text-secondary tabular-nums">{post.vara}</p>}

      {post.texto ? (
        <div>
          <button
            type="button"
            onClick={() => setVerPost((v) => !v)}
            aria-expanded={mostrar}
            className="text-[13px] font-semibold text-text-primary hover:text-accent"
          >
            {mostrar ? '▾ Ocultar el post' : '▸ Ver el post'}
          </button>
          {mostrar && <TextoPost texto={post.texto} />}
          {mostrar && post.nota_imagen && (
            <p className="mt-2 text-xs text-text-secondary leading-relaxed">
              <span className="font-semibold text-text-primary">Imagen. </span>
              {post.nota_imagen}
            </p>
          )}
        </div>
      ) : (
        <p className="text-xs text-text-muted">Todavía sin texto.</p>
      )}

      {post.por_que && (
        <details className="text-[13px] text-text-secondary">
          <summary className="cursor-pointer text-xs font-semibold text-text-muted">Por qué</summary>
          <p className="mt-1.5 leading-relaxed">{post.por_que}</p>
        </details>
      )}

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
          Tu feedback
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
              {todosAbiertos ? 'Cerrar todos los posts' : 'Abrir todos los posts'}
            </button>
          </div>
        </div>

        {detalle.loading && !datos && <p className="text-sm text-text-muted">Cargando los posts…</p>}
        {detalle.error && <p className="text-sm text-danger">No se ha podido cargar: {detalle.error}</p>}

        <div className="md:grid md:grid-cols-[84px_repeat(3,minmax(0,1fr))] gap-3 space-y-3 md:space-y-0">
          <div className="hidden md:block border-b-2 border-text-primary" />
          {CUENTAS.map((c) => (
            <div key={c.id} className="hidden md:block border-b-2 border-text-primary pb-1">
              <p className="font-display text-[17px] font-semibold text-text-primary">{c.nombre}</p>
              <p className="text-xs text-text-muted">{c.rol}</p>
            </div>
          ))}

          {dias.map((dia) => (
            <div key={dia} className="md:contents space-y-3">
              <p className="font-display text-[17px] font-semibold text-text-primary md:pt-3 border-b-2 border-text-primary md:border-0 pb-1 md:pb-0">
                {diaCorto(dia)}
              </p>
              {CUENTAS.map((c) => {
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
                        <Tarjeta post={p} autor={autor} abierto={todosAbiertos} onFeedback={detalle.refetch} />
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
