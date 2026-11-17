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
 */
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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

function rangoSemana(posts: PostSemana[]): string {
  if (!posts.length) return '';
  const fechas = posts.map((p) => p.fecha).sort();
  const f = (s: string) =>
    new Date(`${s}T12:00:00`).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  return `Del ${f(fechas[0])} al ${f(fechas[fechas.length - 1])}`;
}

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
  const semanas = lista.data?.semanas || [];
  const elegida = params.get('s') || semanas[0]?.semana || null;
  const detalle = useApi<SemanaDetalle>(elegida ? `/api/semana/${elegida}` : null);
  const [autor, setAutor] = useState(leerAutor);
  const [filtro, setFiltro] = useState<Objetivo | ''>('');
  const [todosAbiertos, setTodosAbiertos] = useState(false);

  useEffect(() => {
    try {
      if (autor) localStorage.setItem(CLAVE_AUTOR, autor);
    } catch {
      /* sin almacenamiento: se elige otra vez la proxima visita */
    }
  }, [autor]);

  const posts = useMemo(() => detalle.data?.posts || [], [detalle.data]);
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

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-text-muted">
            LinkedIn · Semana {elegida?.slice(6)}
          </p>
          {semanas.length > 1 && (
            <select
              value={elegida || ''}
              onChange={(e) => setParams({ s: e.target.value })}
              aria-label="Elegir semana"
              className="bg-bg-card border border-border rounded-lg px-2 py-1 text-xs text-text-primary"
            >
              {semanas.map((s) => (
                <option key={s.semana} value={s.semana}>
                  {s.semana} · {s.estado}
                </option>
              ))}
            </select>
          )}
        </div>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-text-primary">
          {rangoSemana(posts) || `Semana ${elegida}`}
        </h1>
        <p className="inline-flex items-center gap-2 text-[13px] font-semibold text-text-secondary bg-bg-card border border-border rounded-full px-3 py-1">
          <span className="w-2 h-2 rounded-full bg-naranja" aria-hidden="true" />
          {detalle.data?.estado === 'aprobada' ? 'Aprobada' : 'Propuesta sin aprobar'}
          {detalle.data?.nota ? ` · ${detalle.data.nota}` : ''}
        </p>
        <p className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-text-secondary tabular-nums">
          <span>
            <b className="text-text-primary">{posts.length}</b> posts
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

        {detalle.loading && !detalle.data && <p className="text-sm text-text-muted">Cargando los posts…</p>}
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
