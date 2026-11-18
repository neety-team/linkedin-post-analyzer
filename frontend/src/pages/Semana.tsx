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
 * CALENDARIO Y POST ABIERTO (2026-11-17): en el calendario cada post es una
 * ficha corta (objetivo, titulo, por que y foto). Al pulsarla se abre el post
 * entero, al ancho del feed de LinkedIn, con lo que falta, la foto y el
 * feedback al lado, y con el anterior y el siguiente a mano. El post abierto
 * va en la URL (`&p=clave`). "Leer solo mis posts" los pone ya abiertos, uno
 * debajo de otro.
 *
 * MOVERSE ENTRE SEMANAS (2026-11-17): se va a la anterior y a la siguiente como
 * en un calendario, tengan posts o no, y la semana va en la URL (`?s=2026-W48`)
 * para poder pasar el enlace. Sin `?s=` se abre la semana que se esta
 * preparando: la que viene si ya tiene posts, y si no, la actual.
 *
 * POSTS COLABORATIVOS (2026-11-17): un post que firman varios fundadores lleva
 * `coautores` (las otras cuentas) ademas de `cuenta` (la que lo publica). En el
 * calendario es UNA ficha que ocupa las columnas de todos los que firman, con
 * sus caras juntas y una marca encima de cada columna; en el post abierto, la
 * cabecera de LinkedIn lleva a los autores juntos. Cuenta como post de cada
 * uno: "Leer solo mis posts" se lo enseña a todos los que firman.
 *
 * PROGRAMAR POSTS (2026-11-18): el boton «Programar posts» de la cabecera abre
 * un panel con los posts de la semana. Los que se pueden programar salen
 * marcados con su dia y las 08:30 (hora de Madrid); los que no, deshabilitados
 * y con el motivo que da el servidor. Un post programado lo dice en su ficha y
 * en el post abierto, con «Quitar de la programacion». El publicador del
 * backend lo sube a su hora; si falla, el error sale en rojo en la ficha.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApi, apiPost } from '../hooks/useApi';
import { instanteMadrid, cuandoMadrid, horaMadrid, HORA_POR_DEFECTO } from '../utils/horaMadrid';
// Colores y nombres compartidos con Cuentas, donde va el objetivo de lo publicado.
import { OBJETIVO, type Objetivo } from '../utils/objetivo';

type Cuenta = 'iker' | 'unai' | 'asier';

interface Feedback {
  id: string;
  autor: string;
  texto: string;
  nivel: 'estilo' | 'pilar' | 'post' | null;
  resuelto: boolean;
  respuesta: string | null;
  created_at: string;
}

/** Algo que falta para publicar un post y que una persona confirma o cuenta (2026-11-18). */
interface Pendiente {
  id: string;
  texto: string;
  tipo: 'check' | 'texto';
  quien: Cuenta | null;
  estado: 'pendiente' | 'respondido' | 'hecho';
  respuesta: string | null;
  por: string | null;
  at: string | null;
}

interface PostSemana {
  id: string;
  semana?: string;
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
  /** Lo que falta, como lista que se confirma desde aquí. Si hay, `falta` es solo una nota. */
  pendientes?: Pendiente[] | null;
  nota_imagen: string | null;
  referencia?: string | null;
  tiene_imagen: boolean;
  imagen_version: string | null;
  /** La segunda foto de un post de varias fotos (2026-11-18): va detras de la 1. */
  tiene_imagen2?: boolean;
  imagen2_version?: string | null;
  linkedin_url?: string | null;
  /** Las otras cuentas que firman el post. Vacio si es de una sola. */
  coautores?: Cuenta[] | null;
  /** Programar (2026-11-18): la hora a la que el publicador lo sube solo. */
  programado_para?: string | null;
  publicando_desde?: string | null;
  publicado_at?: string | null;
  linkedin_post_id?: string | null;
  error_publicacion?: string | null;
  /** Por que no se puede programar, o null si se puede. Lo calcula el servidor. */
  motivo_no_programable?: string | null;
  feedback: Feedback[];
}

interface EstadoPublicador {
  activo: boolean;
  /** PUBLICAR_LINKEDIN en el entorno manda sobre el boton: 'apagado' es el freno de emergencia. */
  forzado: 'apagado' | 'encendido' | null;
  cambiado_por: string | null;
  cambiado_at: string | null;
  unipile: boolean;
  cuentas: Partial<Record<Cuenta, boolean>>;
}

/**
 * El interruptor de la subida automatica (2026-11-18). Encendido, los posts
 * programados se publican solos en LinkedIn a su hora. Se confirma antes de
 * encender, y queda apuntado quien y cuando.
 */
function SubidaAutomatica({ estado, autor, onCambio }: { estado: EstadoPublicador; autor: string; onCambio: () => void }) {
  const [cambiando, setCambiando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cambiar = async (activo: boolean) => {
    const pregunta = activo
      ? 'Encender la subida automática: los posts programados se publicarán solos en LinkedIn, cada uno a su hora. ¿Seguro?'
      : 'Apagar la subida automática: lo programado se queda programado, pero no se publicará solo. ¿Apagar?';
    if (!window.confirm(pregunta)) return;
    setCambiando(true);
    setError(null);
    try {
      await apiPost('/api/semana/publicador', { activo, autor });
      onCambio();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se ha podido');
    } finally {
      setCambiando(false);
    }
  };
  const cuando = estado.cambiado_at
    ? new Date(estado.cambiado_at).toLocaleString('es-ES', {
        timeZone: 'Europe/Madrid',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;
  const quien = estado.cambiado_por && cuando ? ` · ${estado.activo ? 'la encendió' : 'la apagó'} ${estado.cambiado_por}, ${cuando}` : '';
  if (estado.forzado) {
    return (
      <p className={`text-[13px] ${estado.activo ? 'text-success' : 'text-warning'}`}>
        Subida automática {estado.activo ? 'encendida' : 'apagada'} desde el servidor (PUBLICAR_LINKEDIN).
      </p>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className={`text-[13px] ${estado.activo ? 'text-success' : 'text-warning'}`}>
        <b>Subida automática {estado.activo ? 'encendida' : 'apagada'}</b>
        {estado.activo ? ': lo programado se publica solo a su hora' : ': lo programado no se publica solo'}
        <span className="text-text-muted">{quien}</span>
      </span>
      <button
        type="button"
        onClick={() => cambiar(!estado.activo)}
        disabled={cambiando}
        className={`px-3 py-1.5 rounded-full text-[13px] font-semibold border transition-colors disabled:opacity-60 ${
          estado.activo
            ? 'border-border text-text-primary hover:bg-bg-secondary'
            : 'border-success/50 text-success hover:bg-success/10'
        }`}
      >
        {cambiando ? '…' : estado.activo ? 'Apagar' : 'Encender'}
      </button>
      {error && <span className="block w-full text-xs text-danger">{error}</span>}
    </div>
  );
}

interface EstadoAbeja {
  activo: boolean;
  forzado: 'apagado' | null;
  cambiado_por: string | null;
  cambiado_at: string | null;
  webhook: boolean;
}

/**
 * El interruptor del efecto abeja (2026-11-18). Encendido, cuando sale un post
 * los otros dos fundadores le dan like, comentan y repostean, y el autor
 * responde, cada cosa a su hora. El aviso al Chat sale siempre.
 */
function EfectoAbeja({ estado, autor, onCambio }: { estado: EstadoAbeja; autor: string; onCambio: () => void }) {
  const [cambiando, setCambiando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cambiar = async (activo: boolean) => {
    const pregunta = activo
      ? 'Encender el efecto abeja: cuando salga un post, los otros dos fundadores le darán like, comentarán y repostearán desde sus cuentas, y el autor responderá. ¿Seguro?'
      : 'Apagar el efecto abeja: el aviso al Chat sigue saliendo, pero nadie comenta ni da like solo. ¿Apagar?';
    if (!window.confirm(pregunta)) return;
    setCambiando(true);
    setError(null);
    try {
      await apiPost('/api/semana/abeja', { activo, autor });
      onCambio();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se ha podido');
    } finally {
      setCambiando(false);
    }
  };
  if (estado.forzado) {
    return <p className="text-[13px] text-warning">Efecto abeja apagado desde el servidor (EFECTO_ABEJA=0).</p>;
  }
  const cuando = estado.cambiado_at
    ? new Date(estado.cambiado_at).toLocaleString('es-ES', { timeZone: 'Europe/Madrid', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : null;
  const quien = estado.cambiado_por && cuando ? ` · ${estado.activo ? 'lo encendió' : 'lo apagó'} ${estado.cambiado_por}, ${cuando}` : '';
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className={`text-[13px] ${estado.activo ? 'text-success' : 'text-warning'}`}>
        <b>Efecto abeja {estado.activo ? 'encendido' : 'apagado'}</b>
        {estado.activo ? ': likes, comentarios y reposts entre los tres' : ': solo el aviso al Chat'}
        {!estado.webhook && <span className="text-warning"> · sin webhook del Chat</span>}
        <span className="text-text-muted">{quien}</span>
      </span>
      <button
        type="button"
        onClick={() => cambiar(!estado.activo)}
        disabled={cambiando}
        className={`px-3 py-1.5 rounded-full text-[13px] font-semibold border transition-colors disabled:opacity-60 ${
          estado.activo ? 'border-border text-text-primary hover:bg-bg-secondary' : 'border-success/50 text-success hover:bg-success/10'
        }`}
      >
        {cambiando ? '…' : estado.activo ? 'Apagar' : 'Encender'}
      </button>
      {error && <span className="block w-full text-xs text-danger">{error}</span>}
    </div>
  );
}

const NOMBRE_ACCION: Record<string, string> = {
  verificar: 'Busca el post en LinkedIn',
  aviso: 'Aviso al Chat de contenido',
  like_post: 'Like al post',
  comentar: 'Comenta',
  responder: 'Responde',
  like_comentario: 'Like al comentario',
  repost: 'Repost',
};
const NOMBRE_CUENTA: Record<string, string> = { iker: 'Iker', unai: 'Unai', asier: 'Asier' };

interface AccionAbeja {
  id: string;
  tipo: string;
  actor: string | null;
  texto: string | null;
  programado_para: string;
  estado: 'pendiente' | 'en_curso' | 'hecho' | 'fallo' | 'saltado';
  error: string | null;
}

/**
 * La ronda de los fundadores de un post. Publicado: lo que ha salido y lo que
 * falta, con su hora. Sin publicar: un ensayo de como sonarian los comentarios.
 */
function RondaAbeja({ post }: { post: PostSemana }) {
  const publicado = post.estado === 'publicado';
  const ronda = useApi<{ acciones: AccionAbeja[] }>(publicado ? `/api/semana/posts/${post.id}/abeja` : null);
  const [ensayo, setEnsayo] = useState<{ comentarios: { cuenta: string; rol: string; texto: string; respuesta: string }[] } | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ensayar = async () => {
    setCargando(true);
    setError(null);
    try {
      setEnsayo(await apiPost(`/api/semana/posts/${post.id}/abeja/ensayo`, {}));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se ha podido');
    } finally {
      setCargando(false);
    }
  };
  const autor = NOMBRE_CUENTA[post.cuenta] || post.cuenta;
  return (
    <div>
      <h4 className="font-display text-[15px] font-semibold text-text-primary">Ronda de los fundadores</h4>
      {publicado ? (
        ronda.data?.acciones?.length ? (
          <ul className="mt-1.5 space-y-1.5 text-[13px] leading-snug">
            {ronda.data.acciones.map((a) => (
              <li key={a.id} className="flex gap-2">
                <span className="shrink-0 w-11 tabular-nums text-text-muted">{horaMadrid(a.programado_para)}</span>
                <span className="min-w-0">
                  <span className={a.estado === 'hecho' ? 'text-success' : a.estado === 'fallo' ? 'text-danger' : a.estado === 'saltado' ? 'text-text-muted line-through' : 'text-text-primary'}>
                    {a.actor ? `${NOMBRE_CUENTA[a.actor] || a.actor} · ` : ''}
                    {NOMBRE_ACCION[a.tipo] || a.tipo}
                  </span>
                  {a.texto && a.tipo !== 'aviso' && <span className="block text-text-secondary">«{a.texto}»</span>}
                  {a.error && a.estado !== 'hecho' && <span className="block text-xs text-danger">{a.error}</span>}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-[13px] text-text-secondary">{ronda.loading ? 'Cargando…' : 'Este post no tiene ronda: salió antes del efecto abeja o no lo subió el publicador.'}</p>
        )
      ) : (
        <>
          <p className="mt-1 text-[13px] leading-relaxed text-text-secondary">
            Cuando salga, los otros dos le darán like y comentarán ({autor} responde) y lo repostearán. Los comentarios se escriben al publicarse.
          </p>
          <button type="button" onClick={ensayar} disabled={cargando} className="mt-1.5 text-[13px] font-semibold text-accent hover:underline underline-offset-2 disabled:opacity-60">
            {cargando ? 'Escribiendo…' : ensayo ? 'Otro ensayo' : 'Ver cómo sonarían los comentarios'}
          </button>
          {ensayo && (
            <ul className="mt-1.5 space-y-2 text-[13px] leading-snug">
              {ensayo.comentarios.map((c) => (
                <li key={c.cuenta}>
                  <span className="font-semibold text-text-primary">{NOMBRE_CUENTA[c.cuenta] || c.cuenta}</span>
                  <span className="text-text-muted"> · {c.rol === 'apoyo' ? 'apoya' : c.rol === 'duda' ? 'pone en duda' : 'otro ángulo'}</span>
                  <span className="block text-text-secondary">«{c.texto}»</span>
                  <span className="block text-text-secondary">↳ {autor}: «{c.respuesta}»</span>
                </li>
              ))}
            </ul>
          )}
          {error && <p className="mt-1 text-xs text-danger">{error}</p>}
        </>
      )}
    </div>
  );
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

type Perfiles = Partial<Record<Cuenta, Perfil>> | undefined;

const nombreDe = (c: Cuenta) => CUENTAS.find((x) => x.id === c)?.nombre || c;
const columnaDe = (c: Cuenta) => CUENTAS.findIndex((x) => x.id === c);
const esColaborativo = (p: PostSemana) => !!p.coautores?.length;

/** Quien firma un post, en el orden de las columnas. */
function firmantes(p: PostSemana): Cuenta[] {
  return CUENTAS.map((c) => c.id).filter((id) => id === p.cuenta || !!p.coautores?.includes(id));
}

/** Un colaborativo es post de cada uno de los que lo firman. */
const esDe = (p: PostSemana, c: Cuenta | null) => !!c && (p.cuenta === c || !!p.coautores?.includes(c));

/** 'Iker, Unai y Asier' */
function juntar(nombres: string[]): string {
  return nombres.length < 2 ? nombres.join('') : `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
}


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

const PASTILLA = 'px-3.5 py-1.5 rounded-full text-[13px] font-semibold border transition-colors';
const PASTILLA_OFF = 'bg-bg-card text-text-secondary border-border hover:border-text-muted';
const PASTILLA_ON = 'bg-text-primary text-bg-primary border-text-primary';

// ── El post como se vera en LinkedIn ─────────────────────────────────────────
// Colores y medidas de LinkedIn, no los de esta app: lo que se revisa es como
// quedara publicado. Va sobre el fondo del feed y al ancho del feed (555 px), en
// claro o en oscuro segun elija quien mira, sea cual sea el tema de la app.

type TemaLI = 'claro' | 'oscuro';

const LI: Record<TemaLI, { feed: string; tarjeta: string; gris: string; azul: string; hueco: string; boton: string; mas: string }> = {
  claro: {
    feed: 'bg-[#f4f2ee]',
    tarjeta: 'bg-white text-black/90 border-black/10',
    gris: 'text-black/60',
    azul: 'text-[#0a66c2]',
    hueco: 'border-black/25 bg-black/[0.04]',
    boton: 'border-black/50 hover:bg-black/[0.06]',
    mas: 'bg-white',
  },
  oscuro: {
    feed: 'bg-black',
    tarjeta: 'bg-[#1b1f23] text-white/90 border-white/15',
    gris: 'text-white/60',
    azul: 'text-[#71b7fb]',
    hueco: 'border-white/30 bg-white/[0.06]',
    boton: 'border-white/60 hover:bg-white/10',
    mas: 'bg-[#1b1f23]',
  },
};

const LI_FUENTE = {
  fontFamily: '-apple-system, system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

const CLAVE_TEMA_LI = 'semana.linkedin';
const CLAVE_GUIA = 'semana.guia';

function leer(clave: string): string {
  try {
    return localStorage.getItem(clave) || '';
  } catch {
    return '';
  }
}

function guardar(clave: string, valor: string) {
  try {
    localStorage.setItem(clave, valor);
  } catch {
    /* sin almacenamiento: se elige otra vez la proxima visita */
  }
}

const API = import.meta.env.VITE_API_URL || '';
const FOTO_MAX = 8 * 1024 * 1024;
const FOTO_TIPOS = 'image/jpeg,image/png,image/webp,image/gif';

const urlFoto = (post: PostSemana) => `${API}/api/semana/posts/${post.id}/imagen?v=${post.imagen_version || ''}`;
const urlFoto2 = (post: PostSemana) => `${API}/api/semana/posts/${post.id}/imagen?n=2&v=${post.imagen2_version || ''}`;

/**
 * El texto del post: lo que falta por rellenar ([...]) resaltado, y los enlaces
 * y las menciones (@Nombre Apellido) en el azul de LinkedIn.
 */
function TextoPost({ texto, azul }: { texto: string; azul: string }) {
  const partes = texto.split(
    /(\[[^\]\n]*\]|https?:\/\/[^\s]+|@\p{Lu}\p{L}+(?: \p{Lu}\p{L}+){0,3})/gu
  );
  return (
    <>
      {partes.map((p, i) => {
        if (p.startsWith('[') && p.endsWith(']')) {
          return (
            <mark key={i} className="bg-naranja/30 text-inherit rounded px-0.5">
              {p}
            </mark>
          );
        }
        if (/^https?:\/\//.test(p)) {
          return (
            <span key={i} className={`${azul} font-semibold break-all`}>
              {p}
            </span>
          );
        }
        if (/^@\p{Lu}/u.test(p)) {
          return (
            <span key={i} className={`${azul} font-semibold`}>
              {p.slice(1)}
            </span>
          );
        }
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}

function Avatar({
  foto,
  nombre,
  oscuro,
  clase = 'w-12 h-12 text-[18px]',
}: {
  foto: string | null;
  nombre: string;
  oscuro: boolean;
  clase?: string;
}) {
  const [rota, setRota] = useState(false);
  if (foto && !rota) {
    return (
      <img
        src={foto}
        alt=""
        onError={() => setRota(true)}
        referrerPolicy="no-referrer"
        className={`${clase} rounded-full object-cover shrink-0`}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`${clase} rounded-full shrink-0 flex items-center justify-center font-semibold ${
        oscuro ? 'bg-[#38434f]' : 'bg-[#e8e5df]'
      }`}
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

/** Subir, cambiar y quitar una foto de un post (la 1 o la 2). */
function useFoto(post: PostSemana, onCambio: () => void, n: 1 | 2 = 1) {
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enviar = async (metodo: 'PUT' | 'DELETE', fichero?: File) => {
    if (fichero && fichero.size > FOTO_MAX) {
      setError('La foto pesa más de 8 MB.');
      return;
    }
    setSubiendo(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/semana/posts/${post.id}/imagen${n === 2 ? '?n=2' : ''}`, {
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
      setError(`No se ha podido: ${e instanceof Error ? e.message : 'error desconocido'}`);
    } finally {
      setSubiendo(false);
    }
  };

  const elegir = (etiqueta: string, clases: string) => (
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
          if (f) enviar('PUT', f);
        }}
      />
    </label>
  );

  return { subiendo, error, elegir, quitar: () => enviar('DELETE') };
}

/** La tarjeta de LinkedIn: cabecera, texto con su corte del feed, foto y acciones. */
function PostLinkedIn({
  post,
  perfiles,
  tema,
  entero,
  onVerMas,
  foto,
}: {
  post: PostSemana;
  perfiles: Perfiles;
  tema: TemaLI;
  entero: boolean;
  onVerMas: () => void;
  foto: ReturnType<typeof useFoto>;
}) {
  const c = LI[tema];
  const perfil = perfiles?.[post.cuenta];
  const nombre = perfil?.nombre || NOMBRE_COMPLETO[post.cuenta];
  const titular = perfil?.titular || 'Neety';
  // Colaborativo: quien lo publica primero y despues los coautores, como en
  // LinkedIn. Sus caras van juntas y sus nombres en una sola linea.
  const autores = [post.cuenta, ...(post.coautores || [])].map((a) => ({
    id: a,
    nombre: perfiles?.[a]?.nombre || NOMBRE_COMPLETO[a],
    foto: perfiles?.[a]?.foto || null,
  }));
  const conjunto = autores.length > 1;
  const firma = juntar(autores.map((a) => a.nombre));
  // En el feed LinkedIn enseña tres lineas y corta con "…más".
  const largo = post.texto.length > 210 || post.texto.split('\n').length > 3;
  const cortado = largo && !entero;

  return (
    <div className={`rounded-xl px-2 py-3 sm:p-5 ${c.feed}`}>
      <div
        style={LI_FUENTE}
        className={`mx-auto max-w-[555px] rounded-lg overflow-hidden border ${c.tarjeta}`}
        aria-label={`Así se verá en LinkedIn el post de ${firma}`}
      >
        <div className="flex items-start gap-2 px-4 pt-3">
          {conjunto ? (
            <span className="flex shrink-0 -space-x-3" aria-hidden="true">
              {autores.map((a) => (
                <span key={a.id} className={`rounded-full ring-2 ${tema === 'oscuro' ? 'ring-[#1b1f23]' : 'ring-white'}`}>
                  <Avatar foto={a.foto} nombre={a.nombre} oscuro={tema === 'oscuro'} clase="w-10 h-10 text-[15px]" />
                </span>
              ))}
            </span>
          ) : (
            <Avatar foto={perfil?.foto || null} nombre={nombre} oscuro={tema === 'oscuro'} />
          )}
          <div className="min-w-0 flex-1">
            {conjunto ? (
              <p className="text-[14px] font-semibold leading-5 line-clamp-2">{firma}</p>
            ) : (
              <>
                <p className="text-[14px] font-semibold leading-5 truncate">{nombre}</p>
                <p className={`text-[12px] leading-4 truncate ${c.gris}`}>{titular}</p>
              </>
            )}
            <p className={`text-[12px] leading-4 flex items-center gap-1 ${c.gris}`}>
              {fechaLinkedIn(post.fecha)}
              {post.estado === 'programado' && post.programado_para ? `, ${horaMadrid(post.programado_para)}` : ''} •
              <svg viewBox="0 0 16 16" className="w-3 h-3" fill="currentColor" aria-hidden="true">
                <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zM3 8c0-.4 0-.7.1-1L5 9v1l1 1v2.6A5 5 0 0 1 3 8zm8.9 3.1c-.2-.7-.8-1.1-1.4-1.1H10V8.5c0-.3-.2-.5-.5-.5H6V7h1c.3 0 .5-.2.5-.5V5.5h1A1.5 1.5 0 0 0 10 4v-.6a5 5 0 0 1 1.9 7.7z" />
              </svg>
            </p>
          </div>
          <svg viewBox="0 0 24 24" className={`w-6 h-6 shrink-0 ${c.gris}`} fill="currentColor" aria-hidden="true">
            <circle cx="5" cy="12" r="1.8" />
            <circle cx="12" cy="12" r="1.8" />
            <circle cx="19" cy="12" r="1.8" />
          </svg>
        </div>

        <div className="px-4 pt-3 pb-2">
          {post.texto ? (
            <div className="relative">
              <div className={`text-[14px] leading-5 whitespace-pre-wrap break-words ${cortado ? 'line-clamp-3' : ''}`}>
                <TextoPost texto={post.texto} azul={c.azul} />
              </div>
              {cortado && (
                <button
                  type="button"
                  onClick={onVerMas}
                  className={`absolute bottom-0 right-0 pl-2 text-[14px] leading-5 hover:underline ${c.mas} ${c.gris}`}
                >
                  …más
                </button>
              )}
            </div>
          ) : (
            <p className={`text-[14px] leading-5 ${c.gris}`}>Todavía sin texto.</p>
          )}
        </div>

        {post.tiene_imagen && post.tiene_imagen2 ? (
          <div className="grid grid-cols-2 gap-0.5">
            <img src={urlFoto(post)} alt={post.nota_imagen || `Foto 1 del post de ${nombre}`} className="w-full h-full object-cover block aspect-[3/4]" />
            <img src={urlFoto2(post)} alt={`Foto 2 del post de ${nombre}`} className="w-full h-full object-cover block aspect-[3/4]" />
          </div>
        ) : post.tiene_imagen ? (
          <img src={urlFoto(post)} alt={post.nota_imagen || `Foto del post de ${nombre}`} className="w-full block" />
        ) : (
          <div className={`mx-4 mb-2 rounded-md border border-dashed px-5 py-10 text-center ${c.hueco}`}>
            <p className="text-[14px] font-semibold">Foto pendiente</p>
            {post.nota_imagen && (
              <p className={`mt-1.5 mx-auto max-w-[44ch] text-[12px] leading-4 ${c.gris}`}>{post.nota_imagen}</p>
            )}
            {foto.elegir(
              'Subir la foto',
              `mt-4 inline-block rounded-full border px-4 py-1.5 text-[14px] font-semibold ${c.boton}`
            )}
          </div>
        )}

        <div className={`flex justify-around border-t mx-4 py-1 ${tema === 'oscuro' ? 'border-white/15' : 'border-black/10'} ${c.gris}`} aria-hidden="true">
          {ACCIONES_LI.map(([etiqueta, trazo]) => (
            <span key={etiqueta} className="min-w-0 py-2.5 flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round">
                <path d={trazo} />
              </svg>
              <span className="hidden min-[420px]:inline text-[14px] font-semibold truncate">{etiqueta}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Lo que ya se ha comentado de un post y el campo para dejar feedback. */
function Comentarios({ post, autor, onCambio }: { post: PostSemana; autor: string; onCambio: () => void }) {
  const [borrador, setBorrador] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enviar = async () => {
    if (!autor) {
      setError('Elige arriba, junto a «Soy», quién eres para dejar feedback.');
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

  return (
    <div className="space-y-3">
      <h4 className="font-display text-[15px] font-semibold text-text-primary">
        Feedback
        {post.feedback.length > 0 && <span className="ml-1.5 font-sans font-normal text-text-muted">{post.feedback.length}</span>}
      </h4>
      {post.feedback.length > 0 && (
        <ul className="space-y-3">
          {post.feedback.map((f) => (
            <li key={f.id} className="text-[13px] leading-relaxed">
              <p className="text-text-primary">
                <span className="font-semibold">{f.autor}: </span>
                {f.texto}
              </p>
              {f.respuesta && <p className="mt-1 pl-3 border-l-2 border-accent/40 text-text-secondary">{f.respuesta}</p>}
              <p className={`mt-0.5 text-xs ${f.resuelto ? 'text-success' : 'text-warning'}`}>
                {f.resuelto ? 'Aplicado' : 'Pendiente de aplicar'}
                {f.nivel ? <span className="text-text-muted"> · {NIVEL[f.nivel]}</span> : null}
              </p>
            </li>
          ))}
        </ul>
      )}
      <div className="space-y-2">
        <label htmlFor={`fb-${post.id}`} className="block text-xs font-semibold text-text-muted">
          {autor ? `Qué cambiarías, ${autor}` : 'Qué cambiarías'}
        </label>
        <textarea
          id={`fb-${post.id}`}
          value={borrador}
          onChange={(e) => {
            setBorrador(e.target.value);
            if (error) setError(null);
          }}
          rows={4}
          placeholder="Yo esto lo diría así…"
          className="w-full bg-bg-secondary border border-border rounded-lg p-3 text-[14px] text-text-primary resize-y focus:outline-none focus:border-accent leading-relaxed"
        />
        {error && <p className="text-xs text-danger">{error}</p>}
        <button
          type="button"
          onClick={enviar}
          disabled={enviando}
          className="px-4 py-2 rounded-full bg-accent text-on-accent text-[13px] font-semibold hover:bg-accent-strong disabled:opacity-60 transition-colors"
        >
          {enviando ? 'Guardando…' : 'Dejar feedback'}
        </button>
      </div>
    </div>
  );
}

const abiertos = (p: PostSemana) => (p.pendientes || []).filter((q) => q.estado !== 'hecho');

/** La línea corta de la tarjeta del calendario: «Faltan 2 confirmaciones», o nada. */
function LineaPendientes({ post, miCuenta }: { post: PostSemana; miCuenta: Cuenta | null }) {
  const lista = abiertos(post);
  if (!lista.length) return null;
  const porConfirmar = lista.filter((q) => q.estado === 'pendiente');
  const mios = miCuenta ? porConfirmar.filter((q) => q.quien === miCuenta).length : 0;
  const respondidos = lista.length - porConfirmar.length;
  const texto = porConfirmar.length
    ? `${porConfirmar.length === 1 ? 'Falta' : 'Faltan'} ${porConfirmar.length} ${porConfirmar.length === 1 ? 'confirmación' : 'confirmaciones'}` +
      (respondidos ? ` y ${respondidos} por aplicar` : '')
    : `${respondidos === 1 ? 'Falta' : 'Faltan'} aplicar ${respondidos === 1 ? 'una respuesta' : `${respondidos} respuestas`}`;
  return (
    <span className="text-warning font-semibold">
      {texto}
      {mios > 0 && <span className="text-accent">{` · ${mios === porConfirmar.length && mios > 1 ? 'todas tuyas' : mios === 1 && porConfirmar.length === 1 ? 'tuya' : `${mios} tuya${mios === 1 ? '' : 's'}`}`}</span>}
    </span>
  );
}

function cuandoCorto(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('es-ES', { timeZone: 'Europe/Madrid', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/** Un elemento de «Qué falta para publicarlo»: confirmarlo o contarlo aquí mismo. */
function ElementoPendiente({
  post,
  q,
  autor,
  miCuenta,
  onCambio,
}: {
  post: PostSemana;
  q: Pendiente;
  autor: string;
  miCuenta: Cuenta | null;
  onCambio: () => void;
}) {
  const [borrador, setBorrador] = useState('');
  const [enviando, setEnviando] = useState<'si' | 'no' | 'texto' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mio = !!miCuenta && q.quien === miCuenta;
  const quien = q.quien ? nombreDe(q.quien) : null;

  const responder = async (respuesta: string, cual: 'si' | 'no' | 'texto') => {
    if (!autor) {
      setError('Elige arriba, junto a «Soy», quién eres para responder.');
      return;
    }
    if (cual === 'texto' && !respuesta.trim()) {
      setError('Escribe la respuesta.');
      return;
    }
    if (cual === 'no' && !window.confirm('¿Seguro que no? El post se quedará sin publicar hasta que se decida qué hacer con él.')) return;
    setEnviando(cual);
    setError(null);
    try {
      await apiPost(`/api/semana/posts/${post.id}/pendientes/${q.id}`, { respuesta: respuesta.trim(), autor });
      setBorrador('');
      onCambio();
    } catch (e) {
      setError(`No se ha guardado: ${e instanceof Error ? e.message : 'error desconocido'}`);
    } finally {
      setEnviando(null);
    }
  };

  const firma = [q.por, cuandoCorto(q.at)].filter(Boolean).join(', ');

  return (
    <li
      className={`rounded-lg border p-3 text-[14px] leading-relaxed ${
        q.estado === 'hecho'
          ? 'border-border bg-success/10'
          : mio
            ? 'border-accent/60 bg-accent/10'
            : q.estado === 'respondido'
              ? 'border-warning/40 bg-warning/10'
              : 'border-border bg-bg-card'
      }`}
    >
      <p className="flex flex-wrap items-baseline gap-x-2">
        {q.estado === 'hecho' && (
          <span aria-hidden className="text-success font-bold">
            ✓
          </span>
        )}
        <span className={q.estado === 'hecho' ? 'text-text-secondary line-through decoration-text-muted' : 'text-text-primary'}>
          {quien && <span className="font-semibold">{mio ? 'Tú' : quien}: </span>}
          {q.texto}
        </span>
      </p>

      {q.estado === 'hecho' && (
        <p className="mt-1 text-xs text-success">
          {q.tipo === 'check' ? 'Confirmado' : 'Hecho'}
          {firma ? ` · ${firma}` : ''}
          {q.tipo === 'texto' && q.respuesta ? <span className="text-text-muted"> · «{q.respuesta}»</span> : null}
        </p>
      )}

      {q.estado === 'respondido' && (
        <div className="mt-1.5 space-y-0.5">
          {q.tipo === 'check' ? (
            <p className="text-[13px] text-text-primary">
              <span className="font-semibold">Ha dicho que no.</span>{' '}
              <span className="text-text-secondary">Hay que decidir qué se hace con el post.</span>
            </p>
          ) : (
            <p className="pl-3 border-l-2 border-warning/40 text-[13px] text-text-primary whitespace-pre-line">{q.respuesta}</p>
          )}
          <p className="text-xs text-warning">
            {q.tipo === 'check' ? 'Pendiente de decidir' : 'A la espera de meterlo en el post'}
            {firma ? <span className="text-text-muted"> · {firma}</span> : null}
          </p>
        </div>
      )}

      {q.estado === 'pendiente' && q.tipo === 'check' && (
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => responder('si', 'si')}
            disabled={!!enviando}
            className="px-4 py-1.5 rounded-full bg-accent text-on-accent text-[13px] font-semibold hover:bg-accent-strong disabled:opacity-60 transition-colors"
          >
            {enviando === 'si' ? 'Guardando…' : 'Sí, confirmo'}
          </button>
          <button
            type="button"
            onClick={() => responder('no', 'no')}
            disabled={!!enviando}
            className="px-4 py-1.5 rounded-full border border-border text-text-secondary text-[13px] font-semibold hover:border-text-muted hover:text-text-primary disabled:opacity-60 transition-colors"
          >
            {enviando === 'no' ? 'Guardando…' : 'No'}
          </button>
        </div>
      )}

      {q.estado === 'pendiente' && q.tipo === 'texto' && (
        <div className="mt-2 space-y-2">
          <label htmlFor={`pd-${post.id}-${q.id}`} className="sr-only">
            {q.texto}
          </label>
          <textarea
            id={`pd-${post.id}-${q.id}`}
            value={borrador}
            onChange={(e) => {
              setBorrador(e.target.value);
              if (error) setError(null);
            }}
            rows={3}
            placeholder="Cuéntalo como se lo contarías a alguien del equipo…"
            className="w-full bg-bg-secondary border border-border rounded-lg p-3 text-[14px] text-text-primary resize-y focus:outline-none focus:border-accent leading-relaxed"
          />
          <button
            type="button"
            onClick={() => responder(borrador, 'texto')}
            disabled={!!enviando}
            className="px-4 py-1.5 rounded-full bg-accent text-on-accent text-[13px] font-semibold hover:bg-accent-strong disabled:opacity-60 transition-colors"
          >
            {enviando === 'texto' ? 'Guardando…' : 'Enviar'}
          </button>
        </div>
      )}

      {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
    </li>
  );
}

/** «Qué falta para publicarlo»: la lista confirmable o, si no hay, la nota de siempre. */
function QueFalta({ post, autor, miCuenta, onCambio }: { post: PostSemana; autor: string; miCuenta: Cuenta | null; onCambio: () => void }) {
  const lista = post.pendientes || [];
  if (!lista.length) {
    if (!post.falta) return null;
    return (
      <div>
        <h4 className="font-display text-[15px] font-semibold text-text-primary">Qué falta</h4>
        <p className="mt-1 text-[14px] leading-relaxed text-text-secondary">{post.falta}</p>
      </div>
    );
  }
  const quedan = abiertos(post).length;
  return (
    <div className="space-y-2">
      <h4 className="font-display text-[15px] font-semibold text-text-primary">
        Qué falta para publicarlo
        <span className="ml-1.5 font-sans text-[13px] font-normal text-text-muted">
          {quedan ? `${lista.length - quedan} de ${lista.length} hecho` : 'todo hecho'}
        </span>
      </h4>
      {post.falta && <p className="text-[13px] leading-relaxed text-text-muted">{post.falta}</p>}
      <ul className="space-y-2">
        {lista.map((q) => (
          <ElementoPendiente key={q.id} post={post} q={q} autor={autor} miCuenta={miCuenta} onCambio={onCambio} />
        ))}
      </ul>
      {!quedan && post.estado === 'aprobado' && (
        <p className="text-[13px] text-success font-semibold">Aprobado y listo para programar.</p>
      )}
    </div>
  );
}

/**
 * Un post para revisarlo: primero por que se publica, despues el post como se
 * vera en LinkedIn, y al lado lo que falta, la foto y el feedback.
 */
function Revision({
  post,
  perfiles,
  autor,
  miCuenta,
  tema,
  onTema,
  onCambio,
}: {
  post: PostSemana;
  perfiles: Perfiles;
  autor: string;
  miCuenta: Cuenta | null;
  tema: TemaLI;
  onTema: (t: TemaLI) => void;
  onCambio: () => void;
}) {
  const [entero, setEntero] = useState(false);
  const foto = useFoto(post, onCambio);
  const foto2 = useFoto(post, onCambio, 2);
  const largo = post.texto.length > 210 || post.texto.split('\n').length > 3;

  return (
    <div className="grid gap-x-8 gap-y-6 lg:grid-cols-[minmax(0,595px)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-4">
        {/* El porque va ANTES del post: primero se entiende para que se publica. */}
        {(post.por_que || post.vara) && (
          <div className="border-l-[3px] border-accent pl-4">
            <p className="font-display text-[15px] font-semibold text-text-primary">Por qué se publica</p>
            {post.por_que && <p className="mt-1 text-[15px] leading-relaxed text-text-secondary max-w-[62ch]">{post.por_que}</p>}
            {post.vara && <p className="mt-1.5 text-[13px] text-text-muted tabular-nums">Con qué se compara: {post.vara.replace(/^Vara:\s*/i, '')}</p>}
          </div>
        )}
        <Referencia texto={post.referencia} />

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[13px] text-text-muted">
              Así se verá en LinkedIn ·{' '}
              {post.estado === 'publicado' ? (
                <span className="font-semibold text-success">publicado</span>
              ) : post.estado === 'programado' && post.programado_para ? (
                <span className="font-semibold text-success">sale el {cuandoMadrid(post.programado_para)}</span>
              ) : (
                <span className="font-semibold text-warning">sin programar</span>
              )}
            </p>
            <div className="flex flex-wrap items-center gap-3 text-[13px]">
              {largo && (
                <button
                  type="button"
                  aria-pressed={entero}
                  onClick={() => setEntero((v) => !v)}
                  className="font-semibold text-text-secondary hover:text-accent underline-offset-2 hover:underline"
                >
                  {entero ? 'Cortarlo como en el feed' : 'Ver el texto entero'}
                </button>
              )}
              <span className="inline-flex rounded-full border border-border overflow-hidden" role="group" aria-label="Tema de LinkedIn">
                {(['claro', 'oscuro'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={tema === t}
                    onClick={() => onTema(t)}
                    className={`px-2.5 py-0.5 font-semibold capitalize ${
                      tema === t ? 'bg-text-primary text-bg-primary' : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </span>
            </div>
          </div>
          <PostLinkedIn post={post} perfiles={perfiles} tema={tema} entero={entero} onVerMas={() => setEntero(true)} foto={foto} />
        </div>
      </div>

      <aside className="min-w-0 space-y-5 lg:pt-1">
        <Programacion post={post} onCambio={onCambio} />

        <QueFalta post={post} autor={autor} miCuenta={miCuenta} onCambio={onCambio} />

        <div>
          <h4 className="font-display text-[15px] font-semibold text-text-primary">Foto</h4>
          {post.nota_imagen && <p className="mt-1 text-[13px] leading-relaxed text-text-secondary">{post.nota_imagen}</p>}
          {post.tiene_imagen ? (
            <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
              <span className="text-success">Subida</span>
              {foto.elegir('Cambiarla', 'font-semibold text-text-secondary hover:text-accent rounded')}
              <button
                type="button"
                disabled={foto.subiendo}
                onClick={() => {
                  if (window.confirm('¿Quitar la foto de este post?')) foto.quitar();
                }}
                className="font-semibold text-text-secondary hover:text-danger"
              >
                Quitarla
              </button>
            </p>
          ) : (
            <p className="mt-1.5 text-[13px]">
              <span className="text-warning">Pendiente. </span>
              {foto.elegir('Subir la foto', 'font-semibold text-accent hover:underline underline-offset-2 rounded')}
            </p>
          )}
          {foto.error && <p className="mt-1 text-xs text-danger">{foto.error}</p>}
          {post.tiene_imagen && (
            <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
              {post.tiene_imagen2 ? (
                <>
                  <span className="text-success">Segunda foto subida</span>
                  {foto2.elegir('Cambiarla', 'font-semibold text-text-secondary hover:text-accent rounded')}
                  <button
                    type="button"
                    disabled={foto2.subiendo}
                    onClick={() => {
                      if (window.confirm('¿Quitar la segunda foto?')) foto2.quitar();
                    }}
                    className="font-semibold text-text-secondary hover:text-danger"
                  >
                    Quitarla
                  </button>
                </>
              ) : (
                foto2.elegir('Añadir una segunda foto', 'font-semibold text-text-secondary hover:text-accent rounded')
              )}
            </p>
          )}
          {foto2.error && <p className="mt-1 text-xs text-danger">{foto2.error}</p>}
        </div>

        <RondaAbeja post={post} />

        <div className="border-t border-border pt-5">
          <Comentarios post={post} autor={autor} onCambio={onCambio} />
        </div>
      </aside>
    </div>
  );
}

// ── Programar ────────────────────────────────────────────────────────────────

const programado = (p: PostSemana) => p.estado === 'programado';

/** El boton para devolver un post programado a «aprobado». */
function QuitarProgramacion({ post, onCambio, clase }: { post: PostSemana; onCambio: () => void; clase: string }) {
  const [quitando, setQuitando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const quitar = async () => {
    if (!window.confirm('¿Quitar este post de la programación? Volverá a «aprobado» y no se publicará solo.')) return;
    setQuitando(true);
    setError(null);
    try {
      await apiPost(`/api/semana/posts/${post.id}/desprogramar`, {});
      onCambio();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se ha podido');
    } finally {
      setQuitando(false);
    }
  };
  return (
    <>
      <button type="button" onClick={quitar} disabled={quitando} className={clase}>
        {quitando ? 'Quitando…' : 'Quitar de la programación'}
      </button>
      {error && <span className="block text-xs text-danger">{error}</span>}
    </>
  );
}

/**
 * Como va la programacion de un post, en la ficha del calendario: programado y
 * a que hora, o el error de la ultima vez que se intento publicar, en rojo.
 */
function LineaProgramacion({ post, onCambio }: { post: PostSemana; onCambio: () => void }) {
  if (programado(post)) {
    return (
      // relative z-10: por encima del boton que abre el post, que cubre la ficha.
      <div className="relative z-10 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span className="font-semibold text-success">
          {post.publicando_desde
            ? 'Publicándose ahora'
            : post.programado_para
              ? `Programado · ${cuandoMadrid(post.programado_para)}`
              : 'Programado'}
        </span>
        {!post.publicando_desde && (
          <QuitarProgramacion
            post={post}
            onCambio={onCambio}
            clase="font-semibold text-text-secondary hover:text-danger underline-offset-2 hover:underline"
          />
        )}
      </div>
    );
  }
  if (post.estado === 'publicado' && post.publicado_at) {
    return <p className="text-xs font-semibold text-success">Publicado · {cuandoMadrid(post.publicado_at)}</p>;
  }
  if (post.error_publicacion) {
    return (
      <p className="text-xs leading-relaxed text-danger">
        <b>No se ha publicado.</b> <span className="line-clamp-3">{post.error_publicacion}</span>
      </p>
    );
  }
  return <p className="text-xs text-text-muted">Sin programar</p>;
}

/**
 * La publicación del post abierto (2026-11-18): siempre dice en qué estado está
 * y deja hacerlo todo desde aquí, post a post: programarlo a una hora, cambiar
 * la hora o quitarlo de la programación. Si no se puede programar, dice por qué.
 */
function Programacion({ post, onCambio }: { post: PostSemana; onCambio: () => void }) {
  const publicador = useApi<EstadoPublicador>('/api/semana/publicador');
  const [hora, setHora] = useState(() => (post.programado_para ? horaMadrid(post.programado_para) : HORA_POR_DEFECTO));
  const [editando, setEditando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setHora(post.programado_para ? horaMadrid(post.programado_para) : HORA_POR_DEFECTO);
    setEditando(false);
    setError(null);
  }, [post.id, post.programado_para]);

  const instante = instanteMadrid(post.fecha, hora);
  const pasada = !instante || instante.getTime() <= Date.now();
  const llamar = async (ruta: string, cuerpo: unknown) => {
    setOcupado(true);
    setError(null);
    try {
      await apiPost(ruta, cuerpo);
      setEditando(false);
      onCambio();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se ha podido');
    } finally {
      setOcupado(false);
    }
  };
  const programar = () => {
    if (!instante) return;
    const s = String(post.semana || '');
    llamar(`/api/semana/${s}/programar`, { posts: [{ id: post.id, programado_para: instante.toISOString() }] });
  };
  const reprogramar = () => {
    if (!instante) return;
    llamar(`/api/semana/posts/${post.id}/reprogramar`, { programado_para: instante.toISOString() });
  };

  const selectorHora = (
    <label className="inline-flex items-center gap-2 text-[13px] text-text-secondary">
      <span>{diaCorto(post.fecha)} a las</span>
      <input
        type="time"
        value={hora}
        onChange={(e) => setHora(e.target.value)}
        className="rounded-md border border-border bg-bg-primary px-2 py-1 text-[13px] text-text-primary tabular-nums focus:border-accent outline-none"
      />
    </label>
  );
  const boton = 'px-3.5 py-1.5 rounded-full text-[13px] font-semibold transition-colors disabled:opacity-60';
  const apagada = publicador.data && !publicador.data.activo;

  let cuerpo: React.ReactNode;
  if (post.estado === 'publicado') {
    cuerpo = (
      <p className="text-[14px] font-semibold text-success">
        Publicado{post.publicado_at ? ` · ${cuandoMadrid(post.publicado_at)}` : ''}
      </p>
    );
  } else if (programado(post) && post.publicando_desde) {
    cuerpo = <p className="text-[14px] font-semibold text-success">Publicándose ahora</p>;
  } else if (programado(post)) {
    cuerpo = (
      <div className="space-y-2">
        <p className="text-[14px] font-semibold text-success">
          Sale el {post.programado_para ? cuandoMadrid(post.programado_para) : 'día del post'}
        </p>
        {editando ? (
          <div className="flex flex-wrap items-center gap-2">
            {selectorHora}
            <button type="button" onClick={reprogramar} disabled={ocupado || pasada} className={`${boton} bg-accent text-on-accent hover:bg-accent-strong`}>
              Guardar hora
            </button>
            <button type="button" onClick={() => setEditando(false)} className={`${boton} text-text-secondary hover:text-text-primary`}>
              Cancelar
            </button>
            {pasada && <span className="w-full text-xs text-danger">Esa hora ya ha pasado.</span>}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setEditando(true)} className={`${boton} border border-border text-text-primary hover:border-accent`}>
              Cambiar la hora
            </button>
            <QuitarProgramacion
              post={post}
              onCambio={onCambio}
              clase={`${boton} border border-border text-text-secondary hover:border-danger hover:text-danger`}
            />
          </div>
        )}
      </div>
    );
  } else if (post.motivo_no_programable) {
    cuerpo = (
      <p className="text-[14px] leading-relaxed text-text-secondary">
        <span className="font-semibold text-text-primary">Sin programar.</span> Aún no se puede: {post.motivo_no_programable}
      </p>
    );
  } else {
    cuerpo = (
      <div className="space-y-2">
        <p className="text-[14px] font-semibold text-warning">Sin programar</p>
        <div className="flex flex-wrap items-center gap-2">
          {selectorHora}
          <button type="button" onClick={programar} disabled={ocupado || pasada} className={`${boton} bg-accent text-on-accent hover:bg-accent-strong`}>
            Programar
          </button>
        </div>
        {pasada && <p className="text-xs text-danger">Esa hora ya ha pasado: elige otra o muévelo de día.</p>}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-bg-card px-4 py-3.5">
      <h4 className="font-display text-[15px] font-semibold text-text-primary">Publicación</h4>
      <div className="mt-1.5">{cuerpo}</div>
      {post.error_publicacion && post.estado !== 'publicado' && (
        <p className="mt-2 text-[13px] leading-relaxed text-danger">
          <b>La última vez no se publicó.</b> {post.error_publicacion}
        </p>
      )}
      {apagada && post.estado !== 'publicado' && (
        <p className="mt-2 text-xs text-warning">La subida automática está apagada: aunque esté programado, no saldrá solo.</p>
      )}
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}

/** El panel de «Programar posts»: que se programa, a que hora y por que no los demas. */
function PanelProgramar({
  semana,
  posts,
  publicador,
  onCerrar,
  onHecho,
}: {
  semana: string;
  posts: PostSemana[];
  publicador: EstadoPublicador | null;
  onCerrar: () => void;
  onHecho: (n: number) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [marcados, setMarcados] = useState<Set<string>>(
    // Marcados de entrada: los que se pueden programar y cuya hora por defecto aún no ha pasado
    () =>
      new Set(
        posts
          .filter((p) => !p.motivo_no_programable)
          .filter((p) => {
            const t = instanteMadrid(p.fecha, HORA_POR_DEFECTO);
            return !!t && t.getTime() > Date.now();
          })
          .map((p) => p.id)
      )
  );
  const [horas, setHoras] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ahora = Date.now();

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  const horaDe = (p: PostSemana) => horas[p.id] ?? HORA_POR_DEFECTO;
  const instante = (p: PostSemana) => instanteMadrid(p.fecha, horaDe(p));
  const pasada = (p: PostSemana) => {
    const t = instante(p);
    return !t || t.getTime() <= ahora;
  };
  const elegidos = posts.filter((p) => marcados.has(p.id) && !p.motivo_no_programable);
  const conProblema = elegidos.filter(pasada);
  const sinCuenta = CUENTAS.map((c) => c.id).filter(
    (c) => publicador && !publicador.cuentas[c] && elegidos.some((p) => p.cuenta === c)
  );

  const cambiar = (id: string, si: boolean) =>
    setMarcados((m) => {
      const n = new Set(m);
      if (si) n.add(id);
      else n.delete(id);
      return n;
    });

  const confirmar = async () => {
    if (!elegidos.length || conProblema.length) return;
    setEnviando(true);
    setError(null);
    try {
      await apiPost(`/api/semana/${semana}/programar`, {
        posts: elegidos.map((p) => ({ id: p.id, programado_para: instante(p)!.toISOString() })),
      });
      onHecho(elegidos.length);
      ref.current?.close();
    } catch (e) {
      setError(`No se ha programado ninguno: ${e instanceof Error ? e.message : 'error desconocido'}`);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby="programar-titulo"
      onClose={onCerrar}
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close();
      }}
      className="m-auto p-0 w-[min(760px,calc(100vw-16px))] max-w-none max-h-[calc(100dvh-16px)] sm:max-h-[calc(100dvh-48px)] rounded-2xl border border-border bg-bg-primary text-text-primary shadow-2xl backdrop:bg-ink/75 open:flex flex-col overflow-hidden"
    >
      <header className="shrink-0 flex items-start gap-3 px-4 sm:px-6 py-4 border-b border-border bg-bg-card">
        <div className="min-w-0 flex-1">
          <h2 id="programar-titulo" className="font-display text-xl font-semibold tracking-tight">
            Programar posts · semana {numero(semana)}
          </h2>
          <p className="mt-0.5 text-[13px] text-text-muted">
            Cada post sale el día que tiene en el calendario, a la hora que pongas (hora de Madrid).
          </p>
        </div>
        <button type="button" className={FLECHA} onClick={() => ref.current?.close()} aria-label="Cerrar">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 space-y-3">
        {publicador && !publicador.activo && (
          <p className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-[13px] leading-relaxed text-text-primary">
            <b>La subida automática está apagada.</b> Puedes dejarlos programados, pero no se publicarán solos hasta que
            la enciendas con el botón «Encender» de la cabecera de la semana.
          </p>
        )}
        {sinCuenta.length > 0 && (
          <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-[13px] leading-relaxed text-text-primary">
            <b>Falta conectar la cuenta de LinkedIn de {juntar(sinCuenta.map(nombreDe))}.</b> Si los programas, al llegar
            la hora no saldrán y lo dirá en su ficha.
          </p>
        )}

        <ul className="divide-y divide-border rounded-xl border border-border bg-bg-card">
          {posts.map((p) => {
            const motivo = p.motivo_no_programable;
            const yaProgramado = programado(p);
            const deshabilitado = !!motivo;
            const marcado = marcados.has(p.id) && !deshabilitado;
            const id = `prog-${p.id}`;
            return (
              <li key={p.id} className={`flex flex-wrap items-start gap-x-3 gap-y-2 px-3 sm:px-4 py-3 ${deshabilitado ? 'opacity-70' : ''}`}>
                <input
                  id={id}
                  type="checkbox"
                  checked={marcado}
                  disabled={deshabilitado}
                  onChange={(e) => cambiar(p.id, e.target.checked)}
                  className="mt-1 w-4 h-4 shrink-0 accent-accent disabled:cursor-not-allowed"
                />
                <label htmlFor={id} className={`min-w-[12rem] flex-1 basis-0 ${deshabilitado ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                  <span className="block text-xs text-text-muted">
                    {diaCorto(p.fecha)} · {juntar(firmantes(p).map(nombreDe))}
                    {esColaborativo(p) ? ` (lo publica ${nombreDe(p.cuenta)})` : ''} · {ESTADO[p.estado] || p.estado}
                  </span>
                  <span className="block text-[14px] font-semibold leading-snug text-text-primary">{p.titulo}</span>
                  {yaProgramado && p.programado_para ? (
                    <span className="block mt-0.5 text-xs font-semibold text-success">
                      Programado · {cuandoMadrid(p.programado_para)}
                    </span>
                  ) : motivo ? (
                    <span className="block mt-0.5 text-xs text-warning">{motivo}</span>
                  ) : null}
                  {marcado && pasada(p) && <span className="block mt-0.5 text-xs text-danger">Esa hora ya ha pasado</span>}
                </label>
                {!deshabilitado && (
                  <input
                    type="time"
                    value={horaDe(p)}
                    onChange={(e) => setHoras((h) => ({ ...h, [p.id]: e.target.value }))}
                    disabled={!marcado}
                    aria-label={`Hora de «${p.titulo}»`}
                    className="shrink-0 ml-7 sm:ml-0 w-[7.5rem] bg-bg-secondary border border-border rounded-lg px-2 py-1 text-[14px] tabular-nums text-text-primary focus:outline-none focus:border-accent disabled:opacity-50"
                  />
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <footer className="shrink-0 flex flex-wrap items-center justify-end gap-3 px-4 sm:px-6 py-3 border-t border-border bg-bg-card">
        {error && <p className="w-full text-[13px] text-danger">{error}</p>}
        <button
          type="button"
          onClick={() => ref.current?.close()}
          className="px-4 py-2 rounded-full border border-border text-[13px] font-semibold text-text-secondary hover:border-text-muted"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={confirmar}
          disabled={enviando || !elegidos.length || conProblema.length > 0}
          className="px-4 py-2 rounded-full bg-accent text-on-accent text-[13px] font-semibold hover:bg-accent-strong disabled:opacity-50 transition-colors"
        >
          {enviando
            ? 'Programando…'
            : elegidos.length
              ? `Programar ${elegidos.length} ${elegidos.length === 1 ? 'post' : 'posts'}`
              : 'Ninguno marcado'}
        </button>
      </footer>
    </dialog>
  );
}

/**
 * El pilar como se ve desde fuera (2026-11-18): sin las notas de trabajo que
 * lleva el dato («voz nueva», «receta actual»…), que no dicen de qué va el post.
 */
const NOTAS_DE_TRABAJO = /^(voz nueva|receta actual|receta antigua|formato nuevo|primero de su tipo|en ingl[eé]s|plan b)$/i;
function pilarVisible(pilar: string | null): string | null {
  if (!pilar) return null;
  const partes = pilar
    .split('·')
    .map((p) => p.trim())
    .filter((p) => p && !NOTAS_DE_TRABAJO.test(p));
  return partes.length ? partes.join(' · ') : null;
}

/** De dónde sale el post (2026-11-18): el post de referencia, la reunión o el dato. Los enlaces se abren. */
function Referencia({ texto }: { texto?: string | null }) {
  if (!texto) {
    return <p className="text-[13px] text-warning">Sin referencia: falta decir de qué post, reunión o dato sale.</p>;
  }
  const trozos = texto.split(/(https?:\/\/[^\s)]+)/g);
  return (
    <div className="rounded-lg border border-border px-4 py-3">
      <p className="font-display text-[15px] font-semibold text-text-primary">Referencia</p>
      <p className="mt-1 text-[14px] leading-relaxed text-text-secondary max-w-[62ch] break-words">
        {trozos.map((t, i) =>
          /^https?:\/\//.test(t) ? (
            <a key={i} href={t} target="_blank" rel="noreferrer" className="text-accent underline underline-offset-2">
              {t.replace(/^https?:\/\/(www\.)?/, '').slice(0, 48)}…
            </a>
          ) : (
            <span key={i}>{t}</span>
          )
        )}
      </p>
    </div>
  );
}

function Etiquetas({ post }: { post: PostSemana }) {
  const obj = OBJETIVO[post.objetivo] || OBJETIVO.alcance;
  const pilar = pilarVisible(post.pilar);
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${obj.chip}`}>
        {obj.etiqueta}
        {post.experimento ? ', experimento' : ''}
      </span>
      {pilar && (
        <span className="text-xs font-medium px-2 py-0.5 rounded border border-border text-text-primary" title="Pilar">
          {pilar}
        </span>
      )}
      <span className="text-xs text-text-muted">{ESTADO[post.estado] || post.estado}</span>
    </div>
  );
}

/** El post en el calendario: lo justo para saber que es. Al pulsarlo se abre entero. */
function Ficha({
  post,
  mio,
  miCuenta,
  onAbrir,
  onCambio,
}: {
  post: PostSemana;
  mio: boolean;
  miCuenta: Cuenta | null;
  onAbrir: () => void;
  onCambio: () => void;
}) {
  const cuenta = CUENTAS.find((c) => c.id === post.cuenta);
  const pendientes = post.feedback.filter((f) => !f.resuelto).length;

  return (
    <article
      className={`group relative min-w-0 h-full bg-bg-card border rounded-xl overflow-hidden flex flex-col transition-colors hover:border-text-muted focus-within:border-accent ${
        mio ? 'border-accent/60' : 'border-border'
      }`}
    >
      {post.tiene_imagen && (
        <img src={urlFoto(post)} alt="" loading="lazy" className="w-full aspect-[16/9] object-cover border-b border-border" />
      )}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <span className="md:hidden text-xs font-semibold text-text-muted">
          {cuenta?.nombre}
          {mio ? ' (tú)' : ''}
        </span>
        <Etiquetas post={post} />
        <h3 className="font-display text-[16px] font-semibold leading-snug text-text-primary">
          <button
            type="button"
            onClick={onAbrir}
            className="text-left after:absolute after:inset-0 focus:outline-none group-hover:text-accent transition-colors"
          >
            {post.titulo}
          </button>
        </h3>
        {post.por_que && <p className="text-[13px] leading-relaxed text-text-secondary line-clamp-3">{post.por_que}</p>}
        <LineaProgramacion post={post} onCambio={onCambio} />
        <p className="mt-auto pt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
          <LineaPendientes post={post} miCuenta={miCuenta} />
          {!post.tiene_imagen && <span>Foto pendiente</span>}
          {post.feedback.length > 0 && (
            <span className={pendientes ? 'text-warning font-semibold' : ''}>
              {pendientes
                ? `${pendientes} ${pendientes === 1 ? 'comentario' : 'comentarios'} por aplicar`
                : `${post.feedback.length} ${post.feedback.length === 1 ? 'comentario aplicado' : 'comentarios aplicados'}`}
            </span>
          )}
          <span className="ml-auto font-semibold text-text-secondary group-hover:text-accent">Ver el post</span>
        </p>
      </div>
    </article>
  );
}

/** Una cara de la app (no de LinkedIn): la foto de perfil o la inicial. */
function Cara({ cuenta, perfil, publica, clase }: { cuenta: Cuenta; perfil?: Perfil; publica: boolean; clase: string }) {
  const [rota, setRota] = useState(false);
  const anillo = `rounded-full ring-2 ring-bg-card ${clase}`;
  if (perfil?.foto && !rota) {
    return (
      <img
        src={perfil.foto}
        alt=""
        onError={() => setRota(true)}
        referrerPolicy="no-referrer"
        className={`${anillo} object-cover shrink-0 ${publica ? 'outline-2 outline-offset-2 outline-accent' : ''}`}
      />
    );
  }
  return (
    <span
      className={`${anillo} shrink-0 grid place-items-center font-display font-semibold ${
        publica ? 'bg-accent text-on-accent' : 'bg-text-primary text-bg-card'
      }`}
    >
      {nombreDe(cuenta).charAt(0)}
    </span>
  );
}

/**
 * Las caras de quien firma un colaborativo, solapadas y en el orden de las
 * columnas. La de quien lo publica va en naranja, como su marca en la ficha.
 */
function Caras({ post, perfiles, clase = 'w-10 h-10 text-[16px]' }: { post: PostSemana; perfiles: Perfiles; clase?: string }) {
  return (
    <span className="flex shrink-0 -space-x-2.5" aria-hidden="true">
      {firmantes(post).map((c) => (
        <Cara key={c} cuenta={c} perfil={perfiles?.[c]} publica={c === post.cuenta} clase={clase} />
      ))}
    </span>
  );
}

/** 'Iker, Unai y Asier' y, debajo, quien lo publica. */
function Firma({ post, perfiles }: { post: PostSemana; perfiles: Perfiles }) {
  return (
    <span className="flex items-center gap-3 min-w-0">
      <Caras post={post} perfiles={perfiles} />
      <span className="min-w-0">
        <span className="block font-display text-[16px] font-semibold leading-tight text-text-primary">
          {juntar(firmantes(post).map(nombreDe))}
        </span>
        <span className="block text-xs text-text-muted">
          Post colaborativo,{' '}
          <span className="whitespace-nowrap">
            lo publica <span className="font-semibold text-accent">{nombreDe(post.cuenta)}</span>
          </span>
        </span>
      </span>
    </span>
  );
}

/**
 * Un colaborativo en el calendario: UNA ficha a lo ancho de las columnas de
 * todos los que lo firman. Encima de cada columna lleva una marca, naranja la
 * de quien lo publica, para que se lea como post de cada uno sin repetirlo.
 * Es subgrid del calendario: las marcas caen justo bajo cada columna.
 */
function FichaConjunta({
  post,
  perfiles,
  mio,
  miCuenta,
  desde,
  ancho,
  fila,
  atenuado,
  onAbrir,
  onCambio,
}: {
  post: PostSemana;
  perfiles: Perfiles;
  mio: boolean;
  miCuenta: Cuenta | null;
  desde: number;
  ancho: number;
  fila: number;
  atenuado: boolean;
  onAbrir: () => void;
  onCambio: () => void;
}) {
  const pendientes = post.feedback.filter((f) => !f.resuelto).length;
  const quienes = firmantes(post);
  const columnas = CUENTAS.slice(desde, desde + ancho);

  return (
    <article
      style={{ gridColumn: `${desde + 2} / span ${ancho}`, gridRow: fila }}
      className={`group relative min-w-0 bg-bg-card border rounded-xl overflow-hidden md:grid md:grid-cols-subgrid md:grid-rows-[auto_1fr] transition-[border-color,opacity] hover:border-text-muted focus-within:border-accent ${
        mio ? 'border-accent/60' : 'border-border'
      } ${atenuado ? 'opacity-25' : ''}`}
    >
      {columnas.map((c) => (
        <span
          key={c.id}
          aria-hidden="true"
          className={`hidden md:block mx-4 h-1.5 rounded-b-full ${
            c.id === post.cuenta ? 'bg-accent' : quienes.includes(c.id) ? 'bg-text-primary' : ''
          }`}
        />
      ))}
      <div className="col-span-full flex flex-col md:flex-row gap-4 p-4 md:pt-3">
        <div className="min-w-0 flex-1 flex flex-col gap-2.5">
          <Firma post={post} perfiles={perfiles} />
          <Etiquetas post={post} />
          <h3 className="font-display text-[19px] font-semibold leading-snug tracking-tight text-text-primary max-w-[48ch]">
            <button
              type="button"
              onClick={onAbrir}
              className="text-left after:absolute after:inset-0 focus:outline-none group-hover:text-accent transition-colors"
            >
              {post.titulo}
            </button>
          </h3>
          {post.por_que && (
            <p className="text-[13px] leading-relaxed text-text-secondary line-clamp-3 max-w-[72ch]">{post.por_que}</p>
          )}
          <LineaProgramacion post={post} onCambio={onCambio} />
          <p className="mt-auto pt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
            <LineaPendientes post={post} miCuenta={miCuenta} />
          {!post.tiene_imagen && <span>Foto pendiente</span>}
            {post.feedback.length > 0 && (
              <span className={pendientes ? 'text-warning font-semibold' : ''}>
                {pendientes
                  ? `${pendientes} ${pendientes === 1 ? 'comentario' : 'comentarios'} por aplicar`
                  : `${post.feedback.length} ${post.feedback.length === 1 ? 'comentario aplicado' : 'comentarios aplicados'}`}
              </span>
            )}
            <span className="ml-auto font-semibold text-text-secondary group-hover:text-accent">Ver el post</span>
          </p>
        </div>
        {post.tiene_imagen && (
          <img
            src={urlFoto(post)}
            alt=""
            loading="lazy"
            className="order-first md:order-none w-full md:w-[min(40%,360px)] aspect-[16/9] self-start object-cover rounded-lg border border-border"
          />
        )}
      </div>
    </article>
  );
}

type Celda =
  | { col: number; ancho: number; conjunto: PostSemana; posts?: undefined }
  | { col: number; ancho: 1; conjunto?: undefined; posts: PostSemana[] };

/**
 * Las filas de un dia en el calendario. Cada colaborativo va en su propia fila
 * y ocupa desde la primera hasta la ultima columna de quienes lo firman; los
 * posts sueltos de las columnas que quedan fuera van a su lado. Lo que sobra
 * (los sueltos de quien tambien firma el colaborativo) va en una fila debajo.
 */
function filasDelDia(delDia: PostSemana[]): Celda[][] {
  const conjuntos = delDia.filter(esColaborativo);
  const sueltos = delDia.filter((p) => !esColaborativo(p));
  const colocados = new Set<string>();
  const filas: Celda[][] = conjuntos.map((cj, i) => {
    const cols = firmantes(cj).map(columnaDe);
    const desde = Math.min(...cols);
    const hasta = Math.max(...cols);
    const fila: Celda[] = [{ col: desde, ancho: hasta - desde + 1, conjunto: cj }];
    CUENTAS.forEach((c, col) => {
      if (col >= desde && col <= hasta) return;
      const suyos = i === 0 ? sueltos.filter((p) => p.cuenta === c.id) : [];
      suyos.forEach((p) => colocados.add(p.id));
      fila.push({ col, ancho: 1, posts: suyos });
    });
    return fila.sort((a, b) => a.col - b.col);
  });
  const resto = sueltos.filter((p) => !colocados.has(p.id));
  if (resto.length || !filas.length) {
    filas.push(CUENTAS.map((c, col) => ({ col, ancho: 1 as const, posts: resto.filter((p) => p.cuenta === c.id) })));
  }
  return filas;
}

const FLECHA = 'w-9 h-9 grid place-items-center rounded-full border border-border text-text-secondary hover:text-text-primary hover:border-text-muted disabled:opacity-30 disabled:hover:border-border transition-colors';

/** El post abierto, a pantalla casi completa, con el anterior y el siguiente a mano. */
function Visor({
  post,
  perfiles,
  posicion,
  total,
  onMover,
  onCerrar,
  children,
}: {
  post: PostSemana;
  perfiles: Perfiles;
  posicion: number;
  total: number;
  onMover: (paso: number) => void;
  onCerrar: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const cuenta = CUENTAS.find((c) => c.id === post.cuenta);

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  // Escape cierra siempre. El cierre propio del <dialog> no salta si se llega
  // por un enlace directo al post y se pulsa Escape sin haber tocado nada.
  useEffect(() => {
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') ref.current?.close();
    };
    document.addEventListener('keydown', alPulsar);
    return () => document.removeEventListener('keydown', alPulsar);
  }, []);

  // Al cambiar de post, arriba del todo.
  useEffect(() => {
    ref.current?.querySelector('[data-cuerpo]')?.scrollTo({ top: 0 });
  }, [post.id]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="visor-titulo"
      onClose={onCerrar}
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close();
      }}
      onKeyDown={(e) => {
        const t = e.target as HTMLElement;
        if (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT') return;
        if (e.key === 'ArrowLeft') onMover(-1);
        if (e.key === 'ArrowRight') onMover(1);
      }}
      className="m-auto p-0 w-[min(1120px,calc(100vw-16px))] max-w-none h-[calc(100dvh-16px)] sm:h-auto sm:max-h-[calc(100dvh-48px)] rounded-2xl border border-border bg-bg-primary text-text-primary shadow-2xl backdrop:bg-ink/75 open:flex flex-col overflow-hidden"
    >
      <header className="shrink-0 flex items-start gap-3 px-4 sm:px-7 py-4 border-b border-border bg-bg-card">
        <div className="min-w-0 flex-1 space-y-1.5">
          {esColaborativo(post) ? (
            <div className="flex items-center gap-2.5">
              <Caras post={post} perfiles={perfiles} clase="w-7 h-7 text-[12px] sm:w-8 sm:h-8 sm:text-[13px]" />
              <p className="min-w-0 text-[13px] text-text-muted">
                <span className="font-semibold text-text-primary">{juntar(firmantes(post).map(nombreDe))}</span>,{' '}
                {diaLargo(post.fecha)}
                <span className="block text-xs">
                  <span className="hidden sm:inline">Post colaborativo, </span>
                  <span className="whitespace-nowrap first-letter:uppercase sm:first-letter:normal-case inline-block">
                    lo publica <span className="font-semibold text-accent">{nombreDe(post.cuenta)}</span>
                  </span>
                </span>
              </p>
            </div>
          ) : (
            <p className="text-[13px] text-text-muted">
              <span className="font-semibold text-text-primary">{cuenta?.nombre}</span>, {diaLargo(post.fecha)}
            </p>
          )}
          <h2 id="visor-titulo" className="font-display text-xl sm:text-2xl font-semibold leading-tight tracking-tight">
            {post.titulo}
          </h2>
          <Etiquetas post={post} />
        </div>
        <div className="shrink-0 flex items-center gap-1.5">
          <button type="button" className={FLECHA} onClick={() => onMover(-1)} disabled={posicion === 0} aria-label="Post anterior">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <span className="hidden sm:inline text-xs text-text-muted tabular-nums" aria-label={`Post ${posicion + 1} de ${total}`}>
            {posicion + 1} de {total}
          </span>
          <button type="button" className={FLECHA} onClick={() => onMover(1)} disabled={posicion === total - 1} aria-label="Post siguiente">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button type="button" className={`${FLECHA} ml-2`} onClick={() => ref.current?.close()} aria-label="Cerrar">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      </header>
      <div data-cuerpo className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-7 py-6">
        {children}
      </div>
    </dialog>
  );
}

function diaLargo(fecha: string): string {
  return new Date(`${fecha}T12:00:00`).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
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
  const publicador = useApi<EstadoPublicador>('/api/semana/publicador');
  const abeja = useApi<EstadoAbeja>('/api/semana/abeja');
  const [programando, setProgramando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  // La cuenta de quien mira: por su nombre de pila, venga del login o del boton.
  const miCuenta = CUENTAS.find((c) => autor.trim().toLowerCase().split(/\s+/)[0] === c.id)?.id || null;
  const [soloMios, setSoloMios] = useState(false);
  const enLista = soloMios && !!miCuenta;
  const visibles = enLista ? CUENTAS.filter((c) => c.id === miCuenta) : CUENTAS;
  const [filtro, setFiltro] = useState<Objetivo | ''>('');
  const [tema, setTema] = useState<TemaLI>(() => (leer(CLAVE_TEMA_LI) === 'oscuro' ? 'oscuro' : 'claro'));
  // La guia sale abierta hasta que alguien la recoge; despues se queda recogida.
  const [guia, setGuia] = useState(() => leer(CLAVE_GUIA) !== 'recogida');

  useEffect(() => {
    if (elegido) guardar(CLAVE_AUTOR, elegido);
  }, [elegido]);

  const cambiarTema = (t: TemaLI) => {
    setTema(t);
    guardar(CLAVE_TEMA_LI, t);
  };

  const posts = useMemo(() => datos?.posts || [], [datos]);
  const dias = useMemo(() => Array.from(new Set(posts.map((p) => p.fecha))).sort(), [posts]);
  const cuenta = (o: Objetivo) => posts.filter((p) => p.objetivo === o).length;
  const pendiente = posts.reduce((n, p) => n + p.feedback.filter((f) => !f.resuelto).length, 0);

  // El orden del calendario: por dia y, dentro del dia, por columna.
  const enOrden = useMemo(() => {
    const col = (c: Cuenta) => CUENTAS.findIndex((x) => x.id === c);
    return [...posts].sort((a, b) => a.fecha.localeCompare(b.fecha) || col(a.cuenta) - col(b.cuenta));
  }, [posts]);
  // El post abierto va en la URL (`&p=clave`), para poder pasar el enlace.
  const clave = params.get('p');
  const iAbierto = clave ? enOrden.findIndex((p) => p.clave === clave) : -1;
  const abierto = iAbierto >= 0 ? enOrden[iAbierto] : null;
  const abrir = (c: string | null) => setParams(c ? { s: elegida, p: c } : { s: elegida }, { replace: !!c && !!clave });

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
      <div>
        <p className="text-[13px] text-text-muted">{distancia(elegida, hoy)} en LinkedIn</p>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-text-primary tabular-nums">
          Semana {numero(elegida)} <span className="text-text-muted font-normal">{rangoCorto(elegida)}</span>
        </h1>
      </div>
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
        <header className="space-y-4">{cabecera}</header>
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

  const revision = (p: PostSemana) => (
    <Revision
      post={p}
      perfiles={perfiles.data?.perfiles}
      autor={autor}
      miCuenta={miCuenta}
      tema={tema}
      onTema={cambiarTema}
      onCambio={detalle.refetch}
    />
  );

  return (
    <div className="space-y-7">
      <header className="space-y-4">
        {cabecera}
        <div className="space-y-2">
          <p className="flex items-start gap-2 text-[14px] text-text-secondary max-w-4xl">
            <span
              className={`mt-[7px] w-2 h-2 shrink-0 rounded-full ${datos && datos.estado !== 'propuesta' ? 'bg-text-muted' : 'bg-naranja'}`}
              aria-hidden="true"
            />
            <span>
              <b className="text-text-primary">{datos ? ESTADO_SEMANA[datos.estado] || datos.estado : 'Cargando…'}</b>
              {datos?.nota ? `. ${datos.nota}` : ''}
            </span>
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
            <span className={pendiente ? 'text-warning' : ''}>
              <b className={pendiente ? '' : 'text-text-primary'}>{pendiente}</b>{' '}
              {pendiente === 1 ? 'comentario por aplicar' : 'comentarios por aplicar'}
            </span>
            {posts.some(programado) && (
              <span>
                <b className="text-text-primary">{posts.filter(programado).length}</b> programados
              </span>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setAviso(null);
                setProgramando(true);
              }}
              disabled={!datos}
              className="px-4 py-2 rounded-full bg-accent text-on-accent text-[13px] font-semibold hover:bg-accent-strong disabled:opacity-60 transition-colors"
            >
              Programar posts
            </button>
            {publicador.data && <SubidaAutomatica estado={publicador.data} autor={autor} onCambio={publicador.refetch} />}
            {abeja.data && <EfectoAbeja estado={abeja.data} autor={autor} onCambio={abeja.refetch} />}
            {aviso && (
              <p className="text-[13px] text-success" role="status">
                {aviso}
              </p>
            )}
          </div>
        </div>
      </header>

      <details
        open={guia}
        onToggle={(e) => {
          const abierta = (e.target as HTMLDetailsElement).open;
          setGuia(abierta);
          guardar(CLAVE_GUIA, abierta ? 'abierta' : 'recogida');
        }}
        className="group/guia bg-bg-card border border-border rounded-xl"
      >
        <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden px-5 py-3 flex items-center justify-between gap-3 rounded-xl">
          <span className="font-display text-[16px] font-semibold text-text-primary">Cómo trabajamos</span>
          <span className="text-[13px] font-semibold text-text-secondary">
            <span className="group-open/guia:hidden">Leer</span>
            <span className="hidden group-open/guia:inline">Recoger</span>
          </span>
        </summary>
        <ol className="list-decimal pl-10 pr-5 pb-5 space-y-1.5 text-sm text-text-secondary leading-relaxed max-w-3xl">
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
      </details>

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
                    className={`${PASTILLA} ${autor === c.nombre ? PASTILLA_ON : PASTILLA_OFF}`}
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
                className={`${PASTILLA} ${soloMios ? 'bg-accent text-on-accent border-accent' : PASTILLA_OFF}`}
              >
                {soloMios ? 'Leyendo solo mis posts' : 'Leer solo mis posts'}
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
                  className={`${PASTILLA} ${filtro === v ? PASTILLA_ON : PASTILLA_OFF}`}
                >
                  {etiqueta}
                </button>
              )
            )}
          </div>
        </div>

        {detalle.loading && !datos && <p className="text-sm text-text-muted">Cargando los posts…</p>}
        {detalle.error && <p className="text-sm text-danger">No se ha podido cargar: {detalle.error}</p>}

        {!identificado && !autor && (
          <p className="text-[13px] text-text-muted" aria-live="polite">
            Elige quién eres: tu feedback saldrá con tu nombre y se marcará tu columna.
          </p>
        )}

        {enLista ? (
          // Solo mis posts: uno debajo de otro y ya abiertos, para leerlos seguidos.
          <div className="space-y-5">
            {enOrden
              .filter((p) => esDe(p, miCuenta) && (!filtro || p.objetivo === filtro))
              .map((p) => (
                <article key={p.id} className="bg-bg-card border border-border rounded-xl p-4 sm:p-6 space-y-5">
                  <header className="space-y-1.5">
                    {esColaborativo(p) && (
                      <div className="pb-1">
                        <Firma post={p} perfiles={perfiles.data?.perfiles} />
                      </div>
                    )}
                    <p className="text-[13px] text-text-muted first-letter:uppercase">
                      {diaLargo(p.fecha)}
                    </p>
                    <h3 className="font-display text-xl font-semibold leading-tight text-text-primary">{p.titulo}</h3>
                    <Etiquetas post={p} />
                  </header>
                  {revision(p)}
                </article>
              ))}
          </div>
        ) : (
          <div className="md:grid gap-3 space-y-3 md:space-y-0 md:grid-cols-[72px_repeat(3,minmax(0,1fr))]">
            <div className="hidden md:block border-b-2 border-text-primary" />
            {visibles.map((c) => (
              <div
                key={c.id}
                className={`hidden md:block border-b-2 pb-1.5 ${c.id === miCuenta ? 'border-accent' : 'border-text-primary'}`}
              >
                <p className="font-display text-[17px] font-semibold text-text-primary">
                  {c.nombre}
                  {c.id === miCuenta && <span className="ml-2 font-sans text-xs font-semibold text-accent">tú</span>}
                </p>
                <p className="text-xs text-text-muted">{c.rol}</p>
              </div>
            ))}

            {dias.map((dia) => {
              const filas = filasDelDia(posts.filter((p) => p.fecha === dia));
              return (
                // Cada dia es una subrejilla del calendario: el dia ocupa sus filas a
                // la izquierda y un colaborativo se estira sobre varias columnas.
                <div key={dia} className="space-y-3 md:space-y-0 md:col-span-4 md:grid md:grid-cols-subgrid md:gap-3">
                  <p
                    style={{ gridColumn: 1, gridRow: `1 / span ${filas.length}` }}
                    className="font-display text-[17px] font-semibold text-text-primary md:pt-3 border-b-2 border-text-primary md:border-0 pb-1 md:pb-0"
                  >
                    {diaCorto(dia)}
                  </p>
                  {filas.map((fila, r) =>
                    fila.map((celda) => {
                      if (celda.conjunto) {
                        const p = celda.conjunto;
                        return (
                          <FichaConjunta
                            key={p.id}
                            post={p}
                            perfiles={perfiles.data?.perfiles}
                            mio={esDe(p, miCuenta)}
                            miCuenta={miCuenta}
                            desde={celda.col}
                            ancho={celda.ancho}
                            fila={r + 1}
                            atenuado={!!filtro && p.objetivo !== filtro}
                            onAbrir={() => abrir(p.clave)}
                            onCambio={detalle.refetch}
                          />
                        );
                      }
                      const lugar = { gridColumn: celda.col + 2, gridRow: r + 1 };
                      if (!celda.posts.length) {
                        return (
                          <div
                            key={`${r}-${celda.col}`}
                            style={lugar}
                            className="hidden md:flex min-w-0 rounded-xl border border-dashed border-border p-4 text-[13px] text-text-muted items-center justify-center"
                          >
                            Sin post
                          </div>
                        );
                      }
                      return (
                        <div key={`${r}-${celda.col}`} style={lugar} className="min-w-0 flex flex-col gap-3">
                          {celda.posts.map((p) => (
                            <div key={p.id} className={`flex-1 transition-opacity ${filtro && p.objetivo !== filtro ? 'opacity-25' : ''}`}>
                              <Ficha post={p} mio={p.cuenta === miCuenta} miCuenta={miCuenta} onAbrir={() => abrir(p.clave)} onCambio={detalle.refetch} />
                            </div>
                          ))}
                        </div>
                      );
                    })
                  )}
                </div>
              );
            })}
          </div>
        )}
        <p className="text-xs text-text-muted">
          Lo resaltado en naranja dentro de un post es lo que falta y no se puede escribir sin inventar.
        </p>
      </section>

      {programando && datos && (
        <PanelProgramar
          semana={elegida}
          posts={enOrden}
          publicador={publicador.data}
          onCerrar={() => setProgramando(false)}
          onHecho={(n) => {
            setAviso(`${n === 1 ? 'Programado 1 post' : `Programados ${n} posts`}.`);
            detalle.refetch();
          }}
        />
      )}

      {abierto && (
        <Visor
          key="visor"
          post={abierto}
          perfiles={perfiles.data?.perfiles}
          posicion={iAbierto}
          total={enOrden.length}
          onMover={(paso) => {
            const destino = enOrden[iAbierto + paso];
            if (destino) abrir(destino.clave);
          }}
          onCerrar={() => abrir(null)}
        >
          <div key={abierto.id}>{revision(abierto)}</div>
        </Visor>
      )}
    </div>
  );
}
