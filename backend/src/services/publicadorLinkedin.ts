/**
 * EL PUBLICADOR DE LA SEMANA (2026-11-18).
 *
 * Cada minuto busca los posts de /semana en «programado» cuya hora ya ha
 * llegado y los sube a LinkedIn por Unipile (`POST /api/v1/posts`). Unipile no
 * programa (no tiene campo de hora): la hora la guarda `programado_para` y
 * este servicio decide cuando toca.
 *
 * INTERRUPTOR: solo publica de verdad con PUBLICAR_LINKEDIN=1. Sin eso escribe
 * en el log lo que habria publicado («simulado») y deja el post como estaba.
 * Un despliegue no puede encender un emisor que escribe en LinkedIn en nombre
 * de los fundadores sin que nadie lo haya decidido (igual que anuncioChat).
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
 * Cada cuenta publica desde su propia cuenta de Unipile:
 * UNIPILE_ACCOUNT_IKER, UNIPILE_ACCOUNT_UNAI y UNIPILE_ACCOUNT_ASIER.
 */
import pool from '../db';
import { CUENTAS, motivoParaPublicar } from './semana';
import { aplicarMenciones, type Mencion, type MencionUnipile } from './menciones';

const UN_MINUTO = 60 * 1000;
/** Un post que se paso de hora mas que esto (el servicio estuvo caido) no sale solo. */
export const RETRASO_MAXIMO_MIN = 180;
const TIEMPO_UNIPILE_MS = 90 * 1000;

export const publicarActivo = () => process.env.PUBLICAR_LINKEDIN === '1';
const variableCuenta = (cuenta: string) => `UNIPILE_ACCOUNT_${cuenta.toUpperCase()}`;

/** Lo que enseña la pagina: si la subida esta encendida y que cuentas tienen su variable. */
export function estadoPublicador() {
  const cuentas: Record<string, boolean> = {};
  for (const c of CUENTAS) cuentas[c] = !!process.env[variableCuenta(c)]?.trim();
  return {
    activo: publicarActivo(),
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
  imagen: Buffer | null;
  imagen_tipo: string | null;
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
      RETURNING id, clave, semana, cuenta, texto, menciones, imagen, imagen_tipo, programado_para`,
    [id]
  );
  return rows[0] || null;
}

export interface Publicacion {
  account_id: string;
  text: string;
  mentions: MencionUnipile[];
  imagen: { datos: Buffer; tipo: string } | null;
}

/** Monta lo que se manda a Unipile, o lanza el motivo por el que no se puede. */
export function prepararPublicacion(fila: {
  cuenta: string;
  texto: string;
  menciones: Mencion[] | null;
  imagen?: Buffer | null;
  imagen_tipo?: string | null;
}): Publicacion {
  const motivo = motivoParaPublicar(fila.texto || '', fila.menciones);
  if (motivo) throw new Error(`No se ha publicado: ${motivo}`);
  const variable = variableCuenta(fila.cuenta);
  const account_id = process.env[variable]?.trim();
  if (!account_id) throw new Error(`Falta ${variable} en el entorno: no se sabe desde qué cuenta de LinkedIn publicar`);
  const { texto, mentions } = aplicarMenciones(fila.texto, fila.menciones);
  return {
    account_id,
    text: texto,
    mentions,
    imagen: fila.imagen?.length ? { datos: fila.imagen, tipo: fila.imagen_tipo || 'image/jpeg' } : null,
  };
}

/**
 * El cuerpo multipart. `mentions` es una lista de objetos y en multipart va
 * con corchetes: mentions[0][name], mentions[0][profile_id].
 */
export function cuerpoUnipile(pub: Publicacion): FormData {
  const body = new FormData();
  body.append('account_id', pub.account_id);
  body.append('text', pub.text);
  pub.mentions.forEach((m, i) => {
    body.append(`mentions[${i}][name]`, m.name);
    body.append(`mentions[${i}][profile_id]`, m.profile_id);
  });
  if (pub.imagen) {
    const ext = pub.imagen.tipo.split('/')[1] || 'jpg';
    body.append('attachments', new Blob([new Uint8Array(pub.imagen.datos)], { type: pub.imagen.tipo }), `foto.${ext}`);
  }
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
    const pub = prepararPublicacion(fila);
    const r = await enviarAUnipile(pub, fetchImpl);
    await marcarPublicado(fila.id, r);
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
  const activo = op.activo ?? publicarActivo();
  const { rows } = await pool.query(
    `SELECT id, clave, semana, cuenta, texto, menciones, programado_para, (imagen IS NOT NULL) AS tiene_imagen
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
        const pub = prepararPublicacion({ ...p, imagen: null });
        detalle = `${pub.text.length} caracteres · ${p.tiene_imagen ? 'con foto' : 'sin foto'} · ${pub.mentions.length} menciones`;
      } catch (e: any) {
        detalle = `no saldría: ${e?.message}`;
      }
      console.log(
        `[publicador] simulado (PUBLICAR_LINKEDIN != 1): habría publicado «${p.clave}» (${p.semana}) en la cuenta de ${p.cuenta}, programado para el ${new Date(p.programado_para).toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })} (Madrid) · ${detalle}. No se ha enviado nada y el post sigue como estaba`
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
  const e = estadoPublicador();
  const sinCuenta = CUENTAS.filter((c) => !e.cuentas[c]);
  console.log(
    `[publicador] ${e.activo ? 'ACTIVO: publica en LinkedIn' : 'simulado (PUBLICAR_LINKEDIN != 1): no publica nada'} · cada minuto` +
      (sinCuenta.length ? ` · sin cuenta de Unipile: ${sinCuenta.join(', ')}` : '')
  );
  setTimeout(() => {
    void tick();
    setInterval(() => void tick(), UN_MINUTO);
  }, 15 * 1000);
}
