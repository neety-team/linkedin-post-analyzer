/**
 * EL PUBLICADOR DE LA SEMANA (2026-11-18).
 *
 * Cada minuto busca los posts de /semana en «programado» cuya hora ya ha
 * llegado y los sube a LinkedIn por Unipile (`POST /api/v1/posts`). Unipile no
 * programa (no tiene campo de hora): la hora la guarda `programado_para` y
 * este servicio decide cuando toca.
 *
 * INTERRUPTOR (18/11): se enciende y se apaga con un boton de la pagina Semana
 * (tabla `publicador_ajustes`, con quien y cuando). Empieza apagado: un
 * despliegue no enciende nada. Apagado, escribe en el log lo que habria
 * publicado («simulado») y deja el post como estaba. PUBLICAR_LINKEDIN=0 en el
 * entorno lo apaga pase lo que pase (freno de emergencia); =1 lo fuerza encendido.
 *
 * NUNCA DOS VECES: antes de subir un post se reclama con un UPDATE atomico
 * (`publicando_desde = NOW() WHERE estado = 'programado' AND publicando_desde IS
 * NULL`). Solo el que lo consigue lo publica, aunque haya dos procesos o dos
 * vueltas solapadas.
 *
 * SIN REINTENTOS: si falla, el post vuelve a «aprobado», pierde la hora y el
 * error queda en `error_publicacion`, que la pagina enseña en rojo. Un fallo
 * de red o un tiempo agotado no dicen si LinkedIn lo recibio: el mensaje lo
 * avisa para que alguien lo mire antes de volver a programarlo.
 *
 * Cada cuenta publica desde su propia cuenta de Unipile. Se busca sola en
 * `GET /api/v1/accounts` por el nombre de LinkedIn del fundador (una y solo
 * una, conectada); UNIPILE_ACCOUNT_IKER/UNAI/ASIER la fijan a mano si hace falta.
 */
import pool from '../db';
import { CUENTAS, motivoParaPublicar, type Pendiente } from './semana';
import { aplicarMenciones, type Mencion, type MencionUnipile } from './menciones';

const UN_MINUTO = 60 * 1000;
/** Un post que se paso de hora mas que esto (el servicio estuvo caido) no sale solo. */
export const RETRASO_MAXIMO_MIN = 180;
const TIEMPO_UNIPILE_MS = 90 * 1000;

const variableCuenta = (cuenta: string) => `UNIPILE_ACCOUNT_${cuenta.toUpperCase()}`;

/** El freno del entorno: '0' apaga siempre, '1' fuerza encendido, nada deja mandar al boton. */
const forzadoPorEntorno = (): 'apagado' | 'encendido' | null =>
  process.env.PUBLICAR_LINKEDIN === '0' ? 'apagado' : process.env.PUBLICAR_LINKEDIN === '1' ? 'encendido' : null;

async function leerAjustes(): Promise<{ activo: boolean; cambiado_por: string | null; cambiado_at: string | null }> {
  const { rows } = await pool.query(`SELECT activo, cambiado_por, cambiado_at FROM publicador_ajustes WHERE id = 1`);
  return rows[0] || { activo: false, cambiado_por: null, cambiado_at: null };
}

export async function publicarActivo(): Promise<boolean> {
  const f = forzadoPorEntorno();
  if (f) return f === 'encendido';
  return (await leerAjustes()).activo;
}

/** El boton de la pagina. Devuelve el estado nuevo. */
export async function cambiarSubidaAutomatica(activo: boolean, quien: string) {
  await pool.query(
    `INSERT INTO publicador_ajustes (id, activo, cambiado_por, cambiado_at) VALUES (1, $1, $2, NOW())
     ON CONFLICT (id) DO UPDATE SET activo = $1, cambiado_por = $2, cambiado_at = NOW()`,
    [activo, quien.slice(0, 80)]
  );
  console.log(`[publicador] subida automatica ${activo ? 'ENCENDIDA' : 'apagada'} por ${quien}`);
  return estadoPublicador();
}

// ── Las cuentas de Unipile de cada fundador ──────────────────────────────────

/** Nombre exacto en LinkedIn (como lo devuelve Unipile) de cada cuenta. */
export const NOMBRE_EN_LINKEDIN: Record<string, string> = {
  iker: 'Iker Galarza Rodríguez',
  unai: 'Unai Arambarri Yeregui',
  asier: 'Asier Olaizola',
};
const sinTildes = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').replace(/\s+/g, ' ').trim().toLowerCase();
let cacheCuentas: { at: number; mapa: Record<string, string | null> } | null = null;
const CACHE_CUENTAS_MS = 10 * UN_MINUTO;

/** De una lista de cuentas de Unipile, la de cada fundador: solo si hay una y esta conectada. */
export function elegirCuentas(items: any[]): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const c of CUENTAS) {
    const nombre = sinTildes(NOMBRE_EN_LINKEDIN[c] || '');
    const m = (items || []).filter(
      (a) =>
        a?.type === 'LINKEDIN' &&
        sinTildes(String(a?.name || '')) === nombre &&
        (a?.sources || []).length > 0 &&
        (a.sources as any[]).every((s) => s?.status === 'OK')
    );
    out[c] = m.length === 1 ? String(m[0].id) : null;
  }
  return out;
}

async function listarCuentasUnipile(): Promise<any[]> {
  const base = (process.env.UNIPILE_BASE_URL || '').replace(/\/+$/, '');
  const key = process.env.UNIPILE_API_KEY || '';
  if (!base || !key) return [];
  const items: any[] = [];
  let cursor: string | null = null;
  for (let i = 0; i < 10; i++) {
    const url = `${base}/api/v1/accounts?limit=250${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
    const res = await fetch(url, { headers: { 'X-API-KEY': key, accept: 'application/json' } });
    if (!res.ok) throw new Error(`Unipile ha contestado ${res.status} al listar cuentas`);
    const j: any = await res.json();
    items.push(...(j?.items || []));
    cursor = j?.cursor || null;
    if (!cursor) break;
  }
  return items;
}

/** La cuenta de Unipile de cada fundador: la variable si esta puesta; si no, la que se encuentra sola. */
export async function cuentasUnipile(forzar = false): Promise<Record<string, string | null>> {
  const mapa: Record<string, string | null> = {};
  const faltan = CUENTAS.filter((c) => {
    const v = process.env[variableCuenta(c)]?.trim();
    if (v) mapa[c] = v;
    return !v;
  });
  if (!faltan.length) return mapa;
  if (forzar || !cacheCuentas || Date.now() - cacheCuentas.at > CACHE_CUENTAS_MS) {
    try {
      cacheCuentas = { at: Date.now(), mapa: elegirCuentas(await listarCuentasUnipile()) };
    } catch (e: any) {
      console.error('[publicador] no se han podido leer las cuentas de Unipile:', e?.message);
      cacheCuentas = { at: Date.now() - CACHE_CUENTAS_MS + UN_MINUTO, mapa: cacheCuentas?.mapa || {} };
    }
  }
  for (const c of faltan) mapa[c] = cacheCuentas?.mapa[c] ?? null;
  return mapa;
}

/** Lo que enseña la pagina: si la subida esta encendida, quien la cambio y que cuentas se encuentran. */
export async function estadoPublicador() {
  const aj = await leerAjustes();
  const forzado = forzadoPorEntorno();
  const ids = await cuentasUnipile();
  const cuentas: Record<string, boolean> = {};
  for (const c of CUENTAS) cuentas[c] = !!ids[c];
  return {
    activo: forzado ? forzado === 'encendido' : aj.activo,
    forzado,
    cambiado_por: aj.cambiado_por,
    cambiado_at: aj.cambiado_at,
    unipile: !!process.env.UNIPILE_API_KEY && !!process.env.UNIPILE_BASE_URL,
    cuentas,
  };
}

interface FilaReclamada {
  id: string;
  clave: string;
  semana: string;
  cuenta: string;
  texto: string;
  menciones: Mencion[] | null;
  falta: string | null;
  pendientes: Pendiente[] | null;
  imagen: Buffer | null;
  imagen_tipo: string | null;
  imagen2: Buffer | null;
  imagen2_tipo: string | null;
  programado_para: Date;
}

/**
 * La reclamacion atomica. Devuelve la fila si este proceso se ha quedado con el
 * post, o null si otro ya lo tiene (o ya no esta programado).
 */
export async function reclamar(id: string): Promise<FilaReclamada | null> {
  const { rows } = await pool.query(
    `UPDATE semana_posts SET publicando_desde = NOW()
      WHERE id = $1 AND estado = 'programado' AND publicando_desde IS NULL
        AND programado_para IS NOT NULL AND programado_para <= NOW()
      RETURNING id, clave, semana, cuenta, texto, menciones, falta, pendientes, imagen, imagen_tipo, imagen2, imagen2_tipo, programado_para`,
    [id]
  );
  return rows[0] || null;
}

export interface Publicacion {
  account_id: string;
  text: string;
  mentions: MencionUnipile[];
  /** Las fotos en el orden en que salen: la 1 y, si la hay, la 2. */
  imagenes: { datos: Buffer; tipo: string }[];
}

/** Monta lo que se manda a Unipile, o lanza el motivo por el que no se puede. */
export function prepararPublicacion(fila: {
  cuenta: string;
  texto: string;
  menciones: Mencion[] | null;
  falta?: string | null;
  pendientes?: Pendiente[] | null;
  imagen?: Buffer | null;
  imagen_tipo?: string | null;
  imagen2?: Buffer | null;
  imagen2_tipo?: string | null;
  account_id?: string | null;
}): Publicacion {
  const motivo = motivoParaPublicar(fila.texto || '', fila.menciones, fila.falta, fila.pendientes);
  if (motivo) throw new Error(`No se ha publicado: ${motivo}`);
  const account_id = (fila.account_id ?? process.env[variableCuenta(fila.cuenta)])?.trim();
  if (!account_id) {
    throw new Error(
      `No se encuentra la cuenta de LinkedIn de ${NOMBRE_EN_LINKEDIN[fila.cuenta] || fila.cuenta} en Unipile: tiene que estar conectada (o ponerla en ${variableCuenta(fila.cuenta)})`
    );
  }
  const aplicadas = aplicarMenciones(fila.texto, fila.menciones);
  // MENCIONES ENLAZADAS (19/11/2026). En multipart Unipile acepta la lista con
  // corchetes (mentions[0][name], mentions[0][profile_id], mentions[0][is_company]=true)
  // y rechaza un JSON en un campo: comprobado contra su validacion con una cuenta
  // inexistente, sin publicar nada. Hasta el 18/11 salian en llano por no estar
  // comprobado. UNIPILE_MENCIONES_ENLAZADAS=0 vuelve al nombre en llano (freno).
  const enlazadas = process.env.UNIPILE_MENCIONES_ENLAZADAS !== '0';
  const texto = enlazadas
    ? aplicadas.texto
    : aplicadas.texto.replace(/\{\{(\d+)\}\}/g, (_, n) => aplicadas.mentions[Number(n)]?.name ?? '');
  const mentions = enlazadas ? aplicadas.mentions : [];
  return {
    account_id,
    text: texto,
    mentions,
    imagenes: [
      fila.imagen?.length ? { datos: fila.imagen, tipo: fila.imagen_tipo || 'image/jpeg' } : null,
      fila.imagen?.length && fila.imagen2?.length ? { datos: fila.imagen2, tipo: fila.imagen2_tipo || 'image/jpeg' } : null,
    ].filter((x): x is { datos: Buffer; tipo: string } => !!x),
  };
}

/**
 * El cuerpo multipart. `mentions` es una lista de objetos y en multipart va
 * con corchetes: mentions[0][name], mentions[0][profile_id] y, si es una
 * empresa (su id son solo cifras), mentions[0][is_company]=true.
 */
export function cuerpoUnipile(pub: Publicacion): FormData {
  const body = new FormData();
  body.append('account_id', pub.account_id);
  body.append('text', pub.text);
  pub.mentions.forEach((m, i) => {
    body.append(`mentions[${i}][name]`, m.name);
    body.append(`mentions[${i}][profile_id]`, m.profile_id);
    if (/^\d+$/.test(m.profile_id)) body.append(`mentions[${i}][is_company]`, 'true');
  });
  // Varias fotos = varios `attachments`, en orden: LinkedIn las enseña tal cual llegan.
  pub.imagenes.forEach((img, i) => {
    const ext = img.tipo.split('/')[1] || 'jpg';
    body.append('attachments', new Blob([new Uint8Array(img.datos)], { type: img.tipo }), `foto${i + 1}.${ext}`);
  });
  return body;
}

export interface RespuestaUnipile {
  status: number;
  post_id: string | null;
  draft_id: string | null;
}

/** Un error de Unipile que no deja claro si el post llego a LinkedIn. */
class ErrorIncierto extends Error {}

export async function enviarAUnipile(pub: Publicacion, fetchImpl: typeof fetch = fetch): Promise<RespuestaUnipile> {
  const base = (process.env.UNIPILE_BASE_URL || '').replace(/\/+$/, '');
  const key = process.env.UNIPILE_API_KEY || '';
  if (!base || !key) throw new Error('Faltan UNIPILE_BASE_URL o UNIPILE_API_KEY en el entorno');
  const ctrl = new AbortController();
  const reloj = setTimeout(() => ctrl.abort(), TIEMPO_UNIPILE_MS);
  let res: Response;
  try {
    res = await fetchImpl(`${base}/api/v1/posts`, {
      method: 'POST',
      headers: { 'X-API-KEY': key, accept: 'application/json' },
      body: cuerpoUnipile(pub),
      signal: ctrl.signal,
    });
  } catch (e: any) {
    throw new ErrorIncierto(e?.name === 'AbortError' ? 'Unipile no ha contestado a tiempo' : `No se ha podido hablar con Unipile (${e?.message || e})`);
  } finally {
    clearTimeout(reloj);
  }
  const crudo = await res.text().catch(() => '');
  let json: any = null;
  try {
    json = crudo ? JSON.parse(crudo) : null;
  } catch {
    /* no es JSON */
  }
  if (res.status === 201 || res.status === 202) {
    return { status: res.status, post_id: json?.post_id ?? null, draft_id: json?.draft_id ?? null };
  }
  const detalle = String(json?.detail || json?.title || json?.message || crudo || '').replace(/\s+/g, ' ').slice(0, 300);
  const msg = `Unipile ha contestado ${res.status}${detalle ? `: ${detalle}` : ''}`;
  if (res.status >= 500 || res.status === 408) throw new ErrorIncierto(msg);
  throw new Error(msg);
}

async function marcarPublicado(id: string, r: RespuestaUnipile) {
  // Por id y sin mirar el estado: si llego aqui, salio en LinkedIn, pase lo que
  // pase con la fila mientras tanto.
  await pool.query(
    `UPDATE semana_posts
        SET estado = 'publicado', publicado_at = NOW(),
            linkedin_post_id = $2, unipile_draft_id = $3,
            error_publicacion = NULL, updated_at = NOW()
      WHERE id = $1`,
    // Con 202 LinkedIn aun lo esta procesando: lo que identifica el post es el draft_id.
    [id, r.post_id, r.draft_id]
  );
}

async function marcarFallo(id: string, error: string) {
  await pool.query(
    `UPDATE semana_posts
        SET estado = 'aprobado', programado_para = NULL, publicando_desde = NULL,
            error_publicacion = $2, updated_at = NOW()
      WHERE id = $1`,
    [id, error.slice(0, 1000)]
  );
}

/** Publica un post ya reclamado. Nunca lanza: el resultado queda en la fila. */
export async function publicarReclamado(
  fila: FilaReclamada,
  fetchImpl: typeof fetch = fetch,
  ahora = new Date()
): Promise<'publicado' | 'fallo'> {
  try {
    const retraso = (ahora.getTime() - new Date(fila.programado_para).getTime()) / UN_MINUTO;
    if (retraso > RETRASO_MAXIMO_MIN) {
      throw new Error(
        `No se ha publicado: su hora pasó hace ${Math.round(retraso / 60)} h sin que el publicador estuviera en marcha. Vuelve a programarlo si aún vale`
      );
    }
    const cuentas = await cuentasUnipile();
    const pub = prepararPublicacion({ ...fila, account_id: cuentas[fila.cuenta] });
    const r = await enviarAUnipile(pub, fetchImpl);
    await marcarPublicado(fila.id, r);
    // El efecto abeja: aviso al Chat y ronda entre fundadores. Import dinamico
    // porque abeja.ts usa las cuentas de este modulo. Nunca lanza.
    try {
      const { planificarAbeja } = await import('./abeja');
      await planificarAbeja({ id: fila.id, cuenta: fila.cuenta, texto: fila.texto });
    } catch (e: any) {
      console.error(`[publicador] la ronda del efecto abeja de «${fila.clave}» no se ha podido planificar: ${e?.message}`);
    }
    console.log(
      `[publicador] publicado «${fila.clave}» (${fila.semana}) en la cuenta de ${fila.cuenta} · ${r.status} · post_id ${r.post_id ?? '-'}${r.draft_id ? ` · draft_id ${r.draft_id}` : ''}`
    );
    return 'publicado';
  } catch (e: any) {
    const base = e?.message || String(e);
    const msg =
      e instanceof ErrorIncierto ? `${base}. Puede que haya llegado a LinkedIn: míralo antes de volver a programarlo` : base;
    console.error(`[publicador] FALLO «${fila.clave}» (${fila.semana}, ${fila.cuenta}): ${msg}`);
    try {
      await marcarFallo(fila.id, msg);
    } catch (e2: any) {
      console.error(`[publicador] no se ha podido apuntar el fallo de «${fila.clave}»: ${e2?.message}`);
    }
    return 'fallo';
  }
}

// En modo simulado se avisa una vez por post y hora, no cada minuto.
const simuladosVistos = new Set<string>();

export interface OpcionesVuelta {
  activo?: boolean;
  fetchImpl?: typeof fetch;
}

/** Una vuelta: lo que toca publicar ahora. Devuelve lo que ha hecho, para los tests. */
export async function vueltaPublicador(op: OpcionesVuelta = {}) {
  const activo = op.activo ?? (await publicarActivo());
  const { rows } = await pool.query(
    `SELECT id, clave, semana, cuenta, texto, menciones, falta, pendientes, programado_para, (imagen IS NOT NULL) AS tiene_imagen, (imagen IS NOT NULL AND imagen2 IS NOT NULL) AS tiene_imagen2
       FROM semana_posts
      WHERE estado = 'programado' AND publicando_desde IS NULL
        AND programado_para IS NOT NULL AND programado_para <= NOW()
      ORDER BY programado_para
      LIMIT 20`
  );
  const hecho = { simulados: [] as string[], publicados: [] as string[], fallos: [] as string[] };
  for (const p of rows) {
    if (!activo) {
      const marca = `${p.id}|${new Date(p.programado_para).toISOString()}`;
      hecho.simulados.push(p.clave);
      if (simuladosVistos.has(marca)) continue;
      simuladosVistos.add(marca);
      let detalle: string;
      try {
        const pub = prepararPublicacion({ ...p, imagen: null, imagen2: null, account_id: (await cuentasUnipile())[p.cuenta] });
        const fotos = p.tiene_imagen2 ? 'con 2 fotos' : p.tiene_imagen ? 'con foto' : 'sin foto';
        detalle = `${pub.text.length} caracteres · ${fotos} · ${pub.mentions.length} menciones`;
      } catch (e: any) {
        detalle = `no saldría: ${e?.message}`;
      }
      console.log(
        `[publicador] simulado (subida automática apagada): habría publicado «${p.clave}» (${p.semana}) en la cuenta de ${p.cuenta}, programado para el ${new Date(p.programado_para).toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })} (Madrid) · ${detalle}. No se ha enviado nada y el post sigue como estaba`
      );
      continue;
    }
    const fila = await reclamar(p.id);
    if (!fila) continue;
    const r = await publicarReclamado(fila, op.fetchImpl);
    (r === 'publicado' ? hecho.publicados : hecho.fallos).push(p.clave);
  }
  return hecho;
}

let corriendo = false;
async function tick() {
  if (corriendo) return;
  corriendo = true;
  try {
    await vueltaPublicador();
  } catch (e: any) {
    console.error('[publicador] la vuelta ha fallado:', e?.message);
  } finally {
    corriendo = false;
  }
}

export function startPublicador(): void {
  setTimeout(async () => {
    try {
      const e = await estadoPublicador();
      const sinCuenta = CUENTAS.filter((c) => !e.cuentas[c]);
      console.log(
        `[publicador] ${e.activo ? 'ENCENDIDO: publica en LinkedIn' : 'apagado: no publica nada'}${e.forzado ? ` (forzado por PUBLICAR_LINKEDIN)` : ''} · cada minuto` +
          (sinCuenta.length ? ` · sin cuenta de Unipile: ${sinCuenta.join(', ')}` : '')
      );
    } catch (err: any) {
      console.error('[publicador] no se ha podido leer su estado:', err?.message);
    }
  }, 10 * 1000);
  setTimeout(() => {
    void tick();
    setInterval(() => void tick(), UN_MINUTO);
  }, 15 * 1000);
}
