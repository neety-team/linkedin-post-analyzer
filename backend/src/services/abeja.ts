/**
 * EL EFECTO ABEJA (2026-11-18).
 *
 * Cuando el publicador sube un post de un fundador, aqui se planifica la ronda
 * de la primera hora y se ejecuta cada paso a su hora:
 *
 *   1. verificar   (cuenta del autor, +3 min): busca el post ya publicado en
 *      LinkedIn y apunta su social_id y su enlace. Sin eso no se puede comentar.
 *   2. aviso       (+3 min): el mensaje al Chat de contenido (GOOGLE_CHAT_WEBHOOK_URL)
 *      con el enlace y lo que van a comentar los otros dos.
 *   3. like_post   (cada uno de los otros dos, entre +6 y +20 min).
 *   4. comentar    (el primero entre +15 y +35 min, apoyando; el segundo entre
 *      +40 y +75, poniendo en duda o dando otro angulo).
 *   5. like_comentario + responder (el autor, entre 10 y 30 min despues de cada
 *      comentario) y like_comentario del tercero al comentario del otro.
 *   6. repost      (los otros dos, entre +90 y +180 min), sin texto.
 *
 * Los textos se escriben al planificar (services/abejaTextos.ts) y se ven en
 * la pagina antes de que salgan.
 *
 * INTERRUPTOR: el aviso al Chat sale siempre que haya webhook. Las acciones
 * desde las cuentas (likes, comentarios, respuestas, reposts) solo si el
 * efecto abeja esta encendido en la pagina Semana (`publicador_ajustes.abeja_activa`,
 * con quien y cuando). EFECTO_ABEJA=0 en el entorno lo apaga pase lo que pase.
 * Apagado a mitad de ronda, lo pendiente se queda quieto; si no se enciende en
 * 8 horas, caduca.
 *
 * LA RESPUESTA DEL AUTOR (19/11): antes de responder se lee el hilo del
 * comentario en LinkedIn. Si la cuenta del autor ya lo ha respondido (a mano,
 * desde Cuentas → comentarios), no sale: el 19/11 salieron tres respuestas
 * dobles por eso. Si el hilo no se puede leer, se reintenta y al final no se
 * responde. Y la respuesta abre SIEMPRE con la mencion de quien comento, como
 * las de Cuentas (`buildMentionedReply`): `{{0}}` + el resto en minuscula.
 *
 * SOLO ENTRE FUNDADORES (2026-11-23): la semana tiene tambien la cuenta de
 * Ismael (ventas), pero la ronda es de Iker, Unai y Asier. Un post de Ismael
 * no tiene ronda (ni aviso al Chat, ni likes, ni comentarios) y Ismael nunca
 * es actor en la de otro: `FUNDADORES` es la lista de aqui, no la de semana.ts.
 *
 * NUNCA DOS VECES: cada accion se reclama con un UPDATE atomico. Una que se
 * queda «en_curso» mas de 15 minutos (el proceso murio a mitad) se da por
 * fallida y NO se repite: un comentario doble se ve mucho mas que uno que falta.
 */
import pool from '../db';
import { sendToGoogleChat } from './googleChat';
import { cabeceraChat } from './cabeceraChat';
import { recordatorioAlAzar } from './anuncioChat';
import { cuentasUnipile, NOMBRE_EN_LINKEDIN } from './publicadorLinkedin';
import { repartirRoles, generarRonda, componerAviso, type Cuenta, type Ronda } from './abejaTextos';

const UN_MINUTO = 60 * 1000;
/** Quienes hacen la ronda. A proposito NO es la lista de semana.ts (que lleva a Ismael). */
export const FUNDADORES: Cuenta[] = ['iker', 'unai', 'asier'];
export const esFundador = (c: string): c is Cuenta => (FUNDADORES as string[]).includes(c);
const CADUCA_MIN = 8 * 60;
const COLGADA_MIN = 15;
const VERIFICAR_INTENTOS = 12;
const REINTENTOS = 3;

export type TipoAccion = 'verificar' | 'aviso' | 'like_post' | 'comentar' | 'responder' | 'like_comentario' | 'repost';

// ── Interruptor ──────────────────────────────────────────────────────────────

const frenoEntorno = () => process.env.EFECTO_ABEJA === '0';

export async function estadoAbeja() {
  const { rows } = await pool.query(
    `SELECT abeja_activa, abeja_cambiado_por, abeja_cambiado_at FROM publicador_ajustes WHERE id = 1`
  );
  const r = rows[0] || {};
  return {
    activo: !frenoEntorno() && !!r.abeja_activa,
    forzado: frenoEntorno() ? ('apagado' as const) : null,
    cambiado_por: r.abeja_cambiado_por || null,
    cambiado_at: r.abeja_cambiado_at || null,
    webhook: !!process.env.GOOGLE_CHAT_WEBHOOK_URL,
  };
}

export async function abejaActiva(): Promise<boolean> {
  return (await estadoAbeja()).activo;
}

export async function cambiarAbeja(activo: boolean, quien: string) {
  await pool.query(
    `INSERT INTO publicador_ajustes (id, activo, abeja_activa, abeja_cambiado_por, abeja_cambiado_at)
     VALUES (1, FALSE, $1, $2, NOW())
     ON CONFLICT (id) DO UPDATE SET abeja_activa = $1, abeja_cambiado_por = $2, abeja_cambiado_at = NOW()`,
    [activo, quien.slice(0, 80)]
  );
  console.log(`[abeja] efecto abeja ${activo ? 'ENCENDIDO' : 'apagado'} por ${quien}`);
  return estadoAbeja();
}

// ── Plan ─────────────────────────────────────────────────────────────────────

export interface AccionPlan {
  /** Referencia local dentro del plan, para las dependencias. */
  ref: string;
  tipo: TipoAccion;
  actor: Cuenta | null;
  texto: string | null;
  depende: string | null;
  minuto: number;
}

const entre = (a: number, b: number, azar: () => number) => Math.round(a + azar() * (b - a));

/**
 * El plan de la ronda, sin BD ni red: que hace cada uno y a que minuto desde
 * la publicacion. Con `ronda` null (no hay textos) no hay comentarios ni
 * respuestas, pero si likes y reposts. Con `automatica` false solo verificar y aviso.
 */
export function planRonda(input: {
  autor: Cuenta;
  orden: Cuenta[];
  ronda: Ronda | null;
  automatica: boolean;
  azar?: () => number;
}): AccionPlan[] {
  const az = input.azar || Math.random;
  const plan: AccionPlan[] = [
    { ref: 'verificar', tipo: 'verificar', actor: input.autor, texto: null, depende: null, minuto: 3 },
    {
      ref: 'aviso',
      tipo: 'aviso',
      actor: null,
      // Apagado, el aviso lleva los comentarios para copiar y pegar a mano.
      texto:
        !input.automatica && input.ronda?.comentarios.length
          ? JSON.stringify(input.ronda.comentarios.map((c) => ({ cuenta: c.cuenta, texto: c.texto })))
          : null,
      depende: 'verificar',
      minuto: 3,
    },
  ];
  if (!input.automatica) return plan;
  const otros = input.orden.filter((c) => c !== input.autor);
  otros.forEach((c) => {
    plan.push({ ref: `like-${c}`, tipo: 'like_post', actor: c, texto: null, depende: 'verificar', minuto: entre(6, 20, az) });
  });
  const ventanas: [number, number][] = [
    [15, 35],
    [40, 75],
  ];
  (input.ronda?.comentarios || []).forEach((com, i) => {
    if (!otros.includes(com.cuenta)) return;
    const [a, b] = ventanas[Math.min(i, ventanas.length - 1)];
    const mc = entre(a, b, az);
    const refC = `comentario-${com.cuenta}`;
    plan.push({ ref: refC, tipo: 'comentar', actor: com.cuenta, texto: com.texto, depende: 'verificar', minuto: mc });
    const mr = mc + entre(10, 30, az);
    plan.push({ ref: `like-com-${com.cuenta}-autor`, tipo: 'like_comentario', actor: input.autor, texto: null, depende: refC, minuto: mr });
    plan.push({ ref: `respuesta-${com.cuenta}`, tipo: 'responder', actor: input.autor, texto: com.respuesta, depende: refC, minuto: mr + 1 });
    const tercero = otros.find((o) => o !== com.cuenta);
    if (tercero) {
      plan.push({
        ref: `like-com-${com.cuenta}-${tercero}`,
        tipo: 'like_comentario',
        actor: tercero,
        texto: null,
        depende: refC,
        minuto: mc + entre(5, 25, az),
      });
    }
  });
  otros.forEach((c) => {
    plan.push({ ref: `repost-${c}`, tipo: 'repost', actor: c, texto: null, depende: 'verificar', minuto: entre(90, 180, az) });
  });
  return plan;
}

/** Baraja quien comenta primero: no siempre el mismo. */
function barajar<T>(xs: T[], azar: () => number = Math.random): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Planifica la ronda de un post recien publicado. La llama el publicador justo
 * despues de subirlo. Nunca lanza: si algo falla, lo dice el log y el post ya
 * esta publicado igual.
 */
export async function planificarAbeja(
  fila: { id: string; cuenta: string; texto: string },
  op: { ahora?: Date; ronda?: Ronda | null; automatica?: boolean; azar?: () => number } = {}
): Promise<number> {
  try {
    // Un post que no es de un fundador (Ismael) no tiene ronda: ni aviso ni acciones.
    if (!esFundador(fila.cuenta)) return 0;
    const autor = fila.cuenta;
    const ya = await pool.query(`SELECT 1 FROM abeja_acciones WHERE semana_post_id = $1 LIMIT 1`, [fila.id]);
    if (ya.rows.length) return 0;
    const automatica = op.automatica ?? (await abejaActiva());
    const orden = barajar(FUNDADORES.filter((c) => c !== autor), op.azar);
    let ronda: Ronda | null = op.ronda === undefined ? null : op.ronda;
    if (op.ronda === undefined) {
      try {
        ronda = await generarRonda({ texto: fila.texto, autor, comentaristas: repartirRoles(orden, op.azar) });
      } catch (e: any) {
        console.error(`[abeja] no se han podido escribir los comentarios del post ${fila.id}: ${e?.message}. La ronda sale sin comentarios`);
        ronda = null;
      }
    }
    const plan = planRonda({ autor, orden, ronda, automatica, azar: op.azar });
    const base = (op.ahora || new Date()).getTime();
    const ids = new Map<string, string>();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      let i = 0;
      for (const a of plan) {
        const { rows } = await client.query(
          `INSERT INTO abeja_acciones (semana_post_id, orden, tipo, actor, texto, depende_de, programado_para)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
          [fila.id, i++, a.tipo, a.actor, a.texto, a.depende ? ids.get(a.depende) || null : null, new Date(base + a.minuto * UN_MINUTO)]
        );
        ids.set(a.ref, rows[0].id);
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
    console.log(`[abeja] ronda planificada para el post ${fila.id} (${autor}): ${plan.length} acciones${automatica ? '' : ' (solo aviso: el efecto abeja está apagado)'}`);
    return plan.length;
  } catch (e: any) {
    console.error(`[abeja] no se ha podido planificar la ronda del post ${fila.id}: ${e?.message}`);
    return 0;
  }
}

// ── Lo que se le pide a LinkedIn ─────────────────────────────────────────────

export interface Ejecutor {
  /** Busca el post publicado: social_id y enlace. null si aun no aparece. */
  localizar(p: { account_id: string; post_id: string | null; draft_id: string | null }): Promise<{ social_id: string; url: string | null } | null>;
  comentar(p: {
    account_id: string;
    social_id: string;
    texto: string;
    responde_a?: string | null;
    menciones?: { name: string; profile_id: string }[];
  }): Promise<{ comment_id: string | null }>;
  /** Quien escribio un comentario y quien le ha respondido ya. null si no se puede leer. */
  hilo(p: { account_id: string; social_id: string; comment_id: string }): Promise<{
    autor: { name: string; profile_id: string | null } | null;
    respondido_por: string[];
  } | null>;
  reaccionar(p: { account_id: string; social_id: string; comment_id?: string | null }): Promise<void>;
  repost(p: { account_id: string; social_id: string }): Promise<void>;
  chat(texto: string): Promise<void>;
  cabecera(p: { cuenta: Cuenta; texto: string; pilar: string | null }): Promise<string>;
}

class ErrorDefinitivo extends Error {}

async function unipile(path: string, init: RequestInit & { json?: unknown } = {}): Promise<any> {
  const base = (process.env.UNIPILE_BASE_URL || '').replace(/\/+$/, '');
  const key = process.env.UNIPILE_API_KEY || '';
  if (!base || !key) throw new ErrorDefinitivo('Faltan UNIPILE_BASE_URL o UNIPILE_API_KEY');
  const headers: Record<string, string> = { 'X-API-KEY': key, accept: 'application/json' };
  let body = init.body;
  if (init.json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(init.json);
  }
  const res = await fetch(`${base}${path}`, { ...init, headers, body, signal: AbortSignal.timeout(60 * 1000) });
  const crudo = await res.text().catch(() => '');
  let j: any = null;
  try {
    j = crudo ? JSON.parse(crudo) : null;
  } catch {
    /* no es JSON */
  }
  if (res.ok) return j;
  const detalle = String(j?.detail || j?.title || j?.message || crudo || '').replace(/\s+/g, ' ').slice(0, 300);
  const msg = `Unipile ${res.status} en ${path.split('?')[0]}${detalle ? `: ${detalle}` : ''}`;
  if (res.status >= 400 && res.status < 500 && res.status !== 404 && res.status !== 408 && res.status !== 429) {
    throw new ErrorDefinitivo(msg);
  }
  throw new Error(msg);
}

const enc = encodeURIComponent;

export const ejecutorReal: Ejecutor = {
  async localizar({ account_id, post_id, draft_id }) {
    let id = post_id;
    if (!id && draft_id) {
      const d = await unipile(`/api/v1/posts/drafts/${enc(draft_id)}?account_id=${enc(account_id)}`).catch(() => null);
      id = d?.post_id || d?.social_id || d?.post?.social_id || null;
    }
    if (!id) return null;
    const p = await unipile(`/api/v1/posts/${enc(id)}?account_id=${enc(account_id)}`).catch((e) => {
      if (e instanceof ErrorDefinitivo) throw e;
      return null;
    });
    const social = p?.social_id || (String(id).startsWith('urn:') ? id : null);
    if (!social) return null;
    return { social_id: String(social), url: p?.share_url || p?.url || null };
  },
  async comentar({ account_id, social_id, texto, responde_a, menciones }) {
    const json: Record<string, unknown> = { account_id, text: texto };
    if (responde_a) json.comment_id = responde_a;
    if (menciones?.length) json.mentions = menciones;
    const r = await unipile(`/api/v1/posts/${enc(social_id)}/comments`, { method: 'POST', json });
    let comment_id: string | null = r?.comment_id || r?.id || null;
    if (!comment_id && !responde_a) {
      // Unipile no siempre devuelve el id: se busca en la lista por el texto.
      const l = await unipile(`/api/v1/posts/${enc(social_id)}/comments?account_id=${enc(account_id)}&limit=50`).catch(() => null);
      const inicio = texto.slice(0, 40);
      const m = (l?.items || []).find((c: any) => String(c?.text || '').startsWith(inicio));
      comment_id = m?.id || null;
    }
    return { comment_id };
  },
  async hilo({ account_id, social_id, comment_id }) {
    const base = `/api/v1/posts/${enc(social_id)}/comments?account_id=${enc(account_id)}&limit=100`;
    const [arriba, respuestas] = await Promise.all([
      unipile(base).catch(() => null),
      unipile(`${base}&comment_id=${enc(comment_id)}`).catch(() => null),
    ]);
    if (!respuestas) return null;
    const c = (arriba?.items || []).find((x: any) => String(x?.id) === String(comment_id));
    const nombre = (x: any) => String(x?.author_details?.name || x?.author || '').trim();
    return {
      autor: c ? { name: nombre(c), profile_id: c?.author_details?.id || null } : null,
      respondido_por: (respuestas.items || []).filter((x: any) => String(x?.id) !== String(comment_id)).map(nombre).filter(Boolean),
    };
  },
  async reaccionar({ account_id, social_id, comment_id }) {
    const json: Record<string, unknown> = { account_id, post_id: social_id, reaction_type: 'like' };
    if (comment_id) json.comment_id = comment_id;
    await unipile(`/api/v1/posts/reaction`, { method: 'POST', json });
  },
  async repost({ account_id, social_id }) {
    const body = new FormData();
    body.append('account_id', account_id);
    body.append('text', '');
    body.append('repost', social_id);
    await unipile(`/api/v1/posts`, { method: 'POST', body });
  },
  async chat(texto) {
    const hook = process.env.GOOGLE_CHAT_WEBHOOK_URL;
    if (!hook) throw new ErrorDefinitivo('GOOGLE_CHAT_WEBHOOK_URL sin configurar');
    await sendToGoogleChat(hook, texto);
  },
  async cabecera({ cuenta, texto, pilar }) {
    return cabeceraChat({ pillar: pilar, contentText: texto, creatorName: NOMBRE_EN_LINKEDIN[cuenta] || cuenta });
  },
};

// ── La vuelta de cada minuto ─────────────────────────────────────────────────

interface FilaAccion {
  id: string;
  semana_post_id: string;
  tipo: TipoAccion;
  actor: Cuenta | null;
  texto: string | null;
  depende_de: string | null;
  intentos: number;
  programado_para: Date;
  autor: Cuenta;
  post_texto: string;
  pilar: string | null;
  linkedin_post_id: string | null;
  unipile_draft_id: string | null;
  linkedin_social_id: string | null;
  linkedin_url: string | null;
  dep_resultado: any;
  dep_actor: Cuenta | null;
}

const normalizar = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').replace(/\s+/g, ' ').trim().toLowerCase();

/**
 * La respuesta del autor con la mencion delante: `{{0}} resto`, con el resto en
 * minuscula como las respuestas de Cuentas. Quita el nombre si el modelo ya lo
 * puso al principio. Sin profile_id, el nombre va en texto plano. Pura.
 */
export function respuestaConMencion(texto: string, autor: { name: string; profile_id: string | null }) {
  let resto = texto.trim();
  const nombre = autor.name.trim();
  for (const n of [nombre, nombre.split(/\s+/)[0]]) {
    if (n && normalizar(resto.slice(0, n.length)) === normalizar(n)) {
      resto = resto.slice(n.length).replace(/^[\s,:;.!-]+/, '');
      break;
    }
  }
  // Minuscula la primera letra, salvo siglas o nombres (segunda letra mayuscula).
  if (/^\p{Lu}\p{Ll}/u.test(resto)) resto = resto[0].toLowerCase() + resto.slice(1);
  if (autor.profile_id) return { texto: `{{0}} ${resto}`, plano: `${nombre} ${resto}`, menciones: [{ name: nombre, profile_id: autor.profile_id }] };
  return { texto: `${nombre} ${resto}`, plano: `${nombre} ${resto}`, menciones: undefined };
}

async function terminar(id: string, estado: 'hecho' | 'fallo' | 'saltado', extra: { resultado?: any; error?: string } = {}) {
  await pool.query(
    `UPDATE abeja_acciones SET estado = $2, hecho_at = NOW(), resultado = COALESCE($3, resultado), error = $4 WHERE id = $1`,
    [id, estado, extra.resultado === undefined ? null : JSON.stringify(extra.resultado), extra.error?.slice(0, 1000) || null]
  );
}

async function aplazar(id: string, minutos: number, error: string, sumaIntento = true) {
  await pool.query(
    `UPDATE abeja_acciones
        SET estado = 'pendiente', empezado_at = NULL, intentos = intentos + $3,
            programado_para = NOW() + ($2 || ' minutes')::interval, error = $4
      WHERE id = $1`,
    [id, String(minutos), sumaIntento ? 1 : 0, error.slice(0, 1000)]
  );
}

/** Lo que ya no va a salir: dependencias caidas, caducadas y colgadas. */
async function limpiar() {
  await pool.query(
    `UPDATE abeja_acciones a SET estado = 'saltado', hecho_at = NOW(), error = 'No sale porque no salió el paso del que depende'
       FROM abeja_acciones d
      WHERE a.depende_de = d.id AND a.estado = 'pendiente' AND d.estado IN ('fallo', 'saltado')`
  );
  await pool.query(
    `UPDATE abeja_acciones SET estado = 'saltado', hecho_at = NOW(), error = 'Caducada: no salió en ${CADUCA_MIN / 60} horas'
      WHERE estado = 'pendiente' AND programado_para < NOW() - interval '${CADUCA_MIN} minutes'`
  );
  await pool.query(
    `UPDATE abeja_acciones SET estado = 'fallo', hecho_at = NOW(),
            error = 'Se quedó a medias (el servidor se reinició). No se repite para no duplicarla: míralo en LinkedIn'
      WHERE estado = 'en_curso' AND empezado_at < NOW() - interval '${COLGADA_MIN} minutes'`
  );
}

async function ejecutar(a: FilaAccion, ej: Ejecutor, cuentas: Record<string, string | null>, automatica: boolean): Promise<string> {
  const cuentaDe = (c: Cuenta | null) => {
    const id = c ? cuentas[c] : null;
    if (!id) throw new ErrorDefinitivo(`La cuenta de ${c} no está conectada en Unipile`);
    return id;
  };

  if (a.tipo === 'verificar') {
    const loc = await ej.localizar({ account_id: cuentaDe(a.autor), post_id: a.linkedin_post_id, draft_id: a.unipile_draft_id });
    if (!loc) {
      if (a.intentos + 1 >= VERIFICAR_INTENTOS) throw new ErrorDefinitivo('El post no aparece en LinkedIn después de media hora');
      await aplazar(a.id, 3, 'Aún no aparece en LinkedIn');
      return 'aplazada';
    }
    await pool.query(`UPDATE semana_posts SET linkedin_social_id = $2, linkedin_url = COALESCE($3, linkedin_url) WHERE id = $1`, [
      a.semana_post_id,
      loc.social_id,
      loc.url,
    ]);
    await terminar(a.id, 'hecho', { resultado: loc });
    return 'hecho';
  }

  if (a.tipo === 'aviso') {
    const { rows: acc } = await pool.query(
      `SELECT tipo, actor, texto, programado_para FROM abeja_acciones WHERE semana_post_id = $1 ORDER BY orden`,
      [a.semana_post_id]
    );
    const automaticos = acc
      .filter((x) => x.tipo === 'comentar')
      .map((x) => ({ cuenta: x.actor as Cuenta, texto: x.texto as string, hora: new Date(x.programado_para) as Date | null }));
    let propuestos: { cuenta: Cuenta; texto: string; hora: Date | null }[] = [];
    try {
      propuestos = a.texto ? (JSON.parse(a.texto) as any[]).map((x) => ({ cuenta: x.cuenta, texto: x.texto, hora: null })) : [];
    } catch {
      propuestos = [];
    }
    const comentarios = automaticos.length ? automaticos : propuestos;
    const reposts = acc.filter((x) => x.tipo === 'repost').map((x) => x.actor as Cuenta);
    const cabecera = await ej.cabecera({ cuenta: a.autor, texto: a.post_texto, pilar: a.pilar }).catch(() => `🐝 Nuevo post de ${a.autor.toUpperCase()}:`);
    const url = a.linkedin_url || (a.linkedin_social_id ? `https://www.linkedin.com/feed/update/${a.linkedin_social_id}/` : null);
    await ej.chat(componerAviso({ cabecera, url, autor: a.autor, automatica: automaticos.length > 0, comentarios, reposts, recordatorio: recordatorioAlAzar() }));
    await pool.query(`UPDATE semana_posts SET chat_avisado_at = NOW() WHERE id = $1`, [a.semana_post_id]);
    await terminar(a.id, 'hecho');
    return 'hecho';
  }

  // Lo que sale desde las cuentas de los fundadores: la vuelta solo llega aqui
  // con el efecto abeja encendido.
  const social = a.linkedin_social_id;
  if (!social) throw new ErrorDefinitivo('El post no tiene social_id: no se pudo localizar en LinkedIn');
  const cuenta = cuentaDe(a.actor);

  if (a.tipo === 'like_post') {
    await ej.reaccionar({ account_id: cuenta, social_id: social });
  } else if (a.tipo === 'comentar') {
    const r = await ej.comentar({ account_id: cuenta, social_id: social, texto: a.texto || '' });
    await terminar(a.id, 'hecho', { resultado: r });
    return 'hecho';
  } else if (a.tipo === 'responder' || a.tipo === 'like_comentario') {
    const comentario = a.dep_resultado?.comment_id;
    if (!comentario) throw new ErrorDefinitivo('No se sabe el id del comentario al que responder');
    if (a.tipo === 'responder') {
      const h = await ej.hilo({ account_id: cuenta, social_id: social, comment_id: comentario });
      if (!h) throw new Error('No se ha podido leer el hilo del comentario: sin leerlo no se responde, por si ya está respondido');
      const yo = normalizar(NOMBRE_EN_LINKEDIN[a.actor as string] || '');
      if (yo && h.respondido_por.some((n) => normalizar(n) === yo)) {
        await terminar(a.id, 'saltado', { error: 'Ya lo había respondido la cuenta del autor (a mano): no se responde dos veces' });
        return 'saltado';
      }
      const quien = h.autor || { name: NOMBRE_EN_LINKEDIN[a.dep_actor as string] || '', profile_id: null };
      const r = quien.name ? respuestaConMencion(a.texto || '', quien) : { texto: a.texto || '', plano: a.texto || '', menciones: undefined };
      try {
        await ej.comentar({ account_id: cuenta, social_id: social, texto: r.texto, responde_a: comentario, menciones: r.menciones });
      } catch (e: any) {
        // Como en Cuentas: si Unipile no acepta la mencion (422), sale con el nombre en texto plano.
        if (!r.menciones || !/ 422/.test(e?.message || '')) throw e;
        await ej.comentar({ account_id: cuenta, social_id: social, texto: r.plano, responde_a: comentario });
      }
    } else {
      await ej.reaccionar({ account_id: cuenta, social_id: social, comment_id: comentario });
    }
  } else if (a.tipo === 'repost') {
    await ej.repost({ account_id: cuenta, social_id: social });
  }
  await terminar(a.id, 'hecho');
  return 'hecho';
}

/** Una vuelta: lo que toca ahora. Devuelve lo que ha hecho, para los tests. */
export async function vueltaAbeja(op: { ejecutor?: Ejecutor; automatica?: boolean; cuentas?: Record<string, string | null> } = {}) {
  const ej = op.ejecutor || ejecutorReal;
  await limpiar();
  const automatica = op.automatica ?? (await abejaActiva());
  const { rows } = await pool.query<FilaAccion>(
    `SELECT a.id, a.semana_post_id, a.tipo, a.actor, a.texto, a.depende_de, a.intentos, a.programado_para,
            p.cuenta AS autor, p.texto AS post_texto, p.pilar, p.linkedin_post_id, p.unipile_draft_id,
            p.linkedin_social_id, p.linkedin_url, d.resultado AS dep_resultado, d.actor AS dep_actor
       FROM abeja_acciones a
       JOIN semana_posts p ON p.id = a.semana_post_id
       LEFT JOIN abeja_acciones d ON d.id = a.depende_de
      WHERE a.estado = 'pendiente' AND a.programado_para <= NOW()
        AND (a.depende_de IS NULL OR d.estado = 'hecho')
      ORDER BY a.programado_para, a.orden
      LIMIT 20`
  );
  const hecho: Record<string, string[]> = { hecho: [], aplazada: [], en_espera: [], fallo: [], saltado: [] };
  if (!rows.length) return hecho;
  const cuentas = op.cuentas || (await cuentasUnipile());
  for (const a of rows) {
    if (a.tipo !== 'verificar' && a.tipo !== 'aviso' && !automatica) {
      hecho.en_espera.push(`${a.tipo}:${a.actor}`);
      continue;
    }
    const { rowCount } = await pool.query(
      `UPDATE abeja_acciones SET estado = 'en_curso', empezado_at = NOW() WHERE id = $1 AND estado = 'pendiente'`,
      [a.id]
    );
    if (!rowCount) continue;
    try {
      const r = await ejecutar(a, ej, cuentas, automatica);
      (hecho[r] || hecho.hecho).push(`${a.tipo}:${a.actor ?? '-'}`);
      if (r === 'hecho') console.log(`[abeja] ${a.tipo}${a.actor ? ` de ${a.actor}` : ''} en el post ${a.semana_post_id}: hecho`);
    } catch (e: any) {
      const msg = e?.message || String(e);
      if (!(e instanceof ErrorDefinitivo) && a.tipo !== 'verificar' && a.intentos + 1 < REINTENTOS) {
        await aplazar(a.id, 5, msg);
        hecho.aplazada.push(`${a.tipo}:${a.actor ?? '-'}`);
      } else {
        await terminar(a.id, 'fallo', { error: msg });
        hecho.fallo.push(`${a.tipo}:${a.actor ?? '-'}`);
      }
      console.error(`[abeja] ${a.tipo}${a.actor ? ` de ${a.actor}` : ''} en el post ${a.semana_post_id}: ${msg}`);
    }
  }
  return hecho;
}

/** Los textos que llevaria un post, sin guardar nada (ruta de ensayo). */
export async function ensayarRonda(postId: string) {
  const { rows } = await pool.query(`SELECT cuenta, texto FROM semana_posts WHERE id = $1`, [postId]);
  if (!rows.length) throw new Error('Post no encontrado');
  const autor = rows[0].cuenta as string;
  if (!esFundador(autor)) throw new Error('El efecto abeja es entre los fundadores: este post no tiene ronda');
  const orden = barajar(FUNDADORES.filter((c) => c !== autor));
  return generarRonda({ texto: rows[0].texto || '', autor, comentaristas: repartirRoles(orden) });
}

/** La ronda de un post, para la pagina. */
export async function rondaDePost(postId: string) {
  const { rows } = await pool.query(
    `SELECT id, tipo, actor, texto, programado_para, estado, hecho_at, error
       FROM abeja_acciones WHERE semana_post_id = $1 ORDER BY programado_para, orden`,
    [postId]
  );
  return rows;
}

let corriendo = false;
async function tick() {
  if (corriendo) return;
  corriendo = true;
  try {
    await vueltaAbeja();
  } catch (e: any) {
    console.error('[abeja] la vuelta ha fallado:', e?.message);
  } finally {
    corriendo = false;
  }
}

export function startAbeja(): void {
  setTimeout(async () => {
    try {
      const e = await estadoAbeja();
      console.log(
        `[abeja] ${e.activo ? 'ENCENDIDO: likes, comentarios y reposts entre fundadores' : 'apagado: solo el aviso al Chat'}` +
          `${e.webhook ? '' : ' · sin GOOGLE_CHAT_WEBHOOK_URL: no hay aviso'} · cada minuto`
      );
    } catch (err: any) {
      console.error('[abeja] no se ha podido leer su estado:', err?.message);
    }
  }, 12 * 1000);
  setTimeout(() => {
    void tick();
    setInterval(() => void tick(), UN_MINUTO);
  }, 20 * 1000);
}
