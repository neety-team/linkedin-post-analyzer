/**
 * LA NEWSLETTER (2026-11-20): los correos de la base, con su estado, su
 * aprobacion y el feedback de los fundadores. Los correos NO viven en
 * `semana_posts`: tienen remitente, asunto A/B y una campana en Brevo.
 *
 * Un correo se identifica por su `clave` estable ('2026-11-24-kaixito'):
 * reescribir su texto no cambia el id, asi que su feedback no se pierde.
 * Solo Iker aprueba. Un correo aprobado cuyo texto cambia vuelve a borrador.
 */
import { createHash } from 'node:crypto';
import type { PoolClient } from 'pg';
import pool from '../db';
import type { Identidad } from '../middleware/basicAuth';
import { metricasDeCorreo } from './metricasNewsletter';

export const ESTADOS_CORREO = ['idea', 'borrador', 'aprobado', 'programado', 'enviado'] as const;
// 'Radar' (2026-11-23): el correo mensual del Radar de inversiones, que no firma una persona
// (email-marketing §5R). En la bandeja sale «Radar de Neety».
export const REMITENTES = ['Iker', 'Asier', 'Unai', 'Kaixito', 'Radar'] as const;
export const NIVELES_CORREO = ['estilo', 'pilar', 'correo'] as const;
export type Remitente = (typeof REMITENTES)[number];

export const APROBADOR = 'iker@neety.com';

export interface CorreoEntrada {
  clave: string;
  numero?: number;
  fecha?: string; // YYYY-MM-DD
  hora?: string; // HH:MM, hora de Madrid
  remitente?: Remitente;
  asunto?: string;
  asunto_b?: string | null;
  preview?: string;
  preview_b?: string | null;
  cuerpo?: string;
  gif_url?: string | null;
  gif_alt?: string | null;
  /** El HTML exacto del correo, con el pie: lo que la pagina pinta como preview (2026-11-23). */
  html?: string | null;
  enlace?: string | null;
  utm_campaign?: string | null;
  utm_source?: string | null;
  pilar?: string | null;
  tipo_cliente?: string | null;
  por_que?: string | null;
  validador?: string | null;
  validador_ok?: boolean;
  estado?: 'idea' | 'borrador';
}

// `html` entra en la huella: si cambia lo que se ve en la preview, lo aprobado vuelve a borrador.
const CAMPOS_TEXTO = ['remitente', 'asunto', 'asunto_b', 'preview', 'preview_b', 'cuerpo', 'gif_url', 'enlace', 'html'] as const;
const MAX_HTML = 400_000;
const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const RE_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Hash de lo que el lector ve: si cambia, lo aprobado ya no es lo que se aprobo. */
export function huellaTexto(c: Partial<CorreoEntrada>): string {
  const partes = CAMPOS_TEXTO.map((k) => (c as any)[k] ?? '');
  return createHash('sha256').update(JSON.stringify(partes)).digest('hex');
}

/** El estado en que queda un correo al guardarlo otra vez. */
export function estadoTrasReescribir(
  actual: { estado: string; huella: string | null },
  nueva: string,
  pedido?: string
): string {
  if (actual.estado === 'aprobado') return actual.huella === nueva ? 'aprobado' : 'borrador';
  return pedido || actual.estado;
}

/** Con una campana ya en Brevo (programada o enviada) el texto no se toca desde aqui. */
export function motivoNoReescribible(actual: { brevo_campaign_id: number | null; estado: string }): string | null {
  if (actual.brevo_campaign_id != null && (actual.estado === 'programado' || actual.estado === 'enviado')) {
    return `ya está ${actual.estado} en Brevo (campaña ${actual.brevo_campaign_id}): cancela la campaña en Brevo primero`;
  }
  return null;
}

export function puedeAprobar(id: Identidad | null): boolean {
  return !!id && typeof id.email === 'string' && id.email.trim().toLowerCase() === APROBADOR;
}

/** Lo que se contesta cuando el texto que Iker vio ya no es el que hay guardado. */
export const MOTIVO_CAMBIADO = 'El correo ha cambiado desde que lo abriste: recarga la página';

/**
 * Por que no se puede aprobar. Con `huellaVista` (la huella que la tarjeta pinto),
 * ademas exige que el texto guardado sea exactamente el que se vio.
 */
export function motivoNoAprobable(
  c: { estado: string; validador_ok: boolean; huella?: string | null },
  huellaVista?: string
): string | null {
  if (c.estado !== 'borrador') return `solo se aprueba un borrador (está en «${c.estado}»)`;
  if (!c.validador_ok) return 'el validador no está en verde';
  if (huellaVista !== undefined && c.huella !== huellaVista) return MOTIVO_CAMBIADO;
  return null;
}

const FORMATO_DIA_MADRID = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit',
});
/** El dia (YYYY-MM-DD) en Madrid. */
export function diaMadrid(d: Date): string {
  return FORMATO_DIA_MADRID.format(d);
}

export const MOTIVO_NO_APROBADO = 'no está aprobado: solo Iker lo aprueba en la página Newsletter';

/**
 * El estado al vincular o desvincular una campana de Brevo, o el motivo por el que no se puede.
 * - null desvincula y vuelve a borrador, salvo un enviado: lo enviado no se deshace.
 * - `historico` (cargar lo ya enviado) solo desde idea o borrador y con una fecha anterior a hoy
 *   en Madrid: no sirve para saltarse la aprobacion de un correo que aun no ha salido.
 * - Con id, solo un aprobado pasa a programado.
 */
export function estadoAlVincular(
  c: { estado: string; fecha?: string | null },
  campaignId: number | null,
  historico: boolean,
  hoy: Date = new Date()
): { estado: string } | { motivo: string } {
  if (campaignId == null) {
    if (c.estado === 'enviado') return { motivo: 'ya está enviado: un correo enviado no se desvincula' };
    return { estado: 'borrador' };
  }
  if (historico) {
    if (c.estado !== 'idea' && c.estado !== 'borrador') {
      return { motivo: `histórico solo vale para una idea o un borrador (está en «${c.estado}»)` };
    }
    if (!c.fecha || !RE_FECHA.test(c.fecha)) return { motivo: 'histórico exige la fecha del envío y el correo no la tiene' };
    if (c.fecha >= diaMadrid(hoy)) {
      return { motivo: `histórico solo vale para un correo ya enviado: su fecha (${c.fecha}) no es anterior a hoy` };
    }
    return { estado: 'enviado' };
  }
  if (c.estado !== 'aprobado') return { motivo: MOTIVO_NO_APROBADO };
  return { estado: 'programado' };
}

function limpio(v: unknown, max: number): string {
  return String(v ?? '').trim().slice(0, max);
}

function opcional(v: unknown, max: number): string | null {
  const t = limpio(v, max);
  return t || null;
}

function validar(e: CorreoEntrada): string | null {
  if (e.remitente !== undefined && !REMITENTES.includes(e.remitente)) return `remitente no válido: ${e.remitente}`;
  if (e.fecha !== undefined && !RE_FECHA.test(e.fecha)) return `fecha no válida: ${e.fecha}`;
  if (e.hora !== undefined && !RE_HORA.test(e.hora)) return `hora no válida: ${e.hora}`;
  if (e.html != null && String(e.html).length > MAX_HTML) return `el html pasa de ${MAX_HTML} caracteres`;
  if (e.estado !== undefined && e.estado !== 'idea' && e.estado !== 'borrador') {
    return `estado no válido: ${e.estado} (solo idea o borrador)`;
  }
  return null;
}

const COLUMNAS = `id, clave, numero, to_char(fecha, 'YYYY-MM-DD') AS fecha, hora, remitente, asunto, asunto_b,
  preview, preview_b, cuerpo, gif_url, gif_alt, html, enlace, utm_campaign, utm_source, pilar, tipo_cliente, por_que,
  validador, validador_ok, huella, estado, aprobado_por, aprobado_at, brevo_campaign_id, created_at, updated_at`;

/**
 * Guarda o reescribe correos por `clave`. Lo que no viene en la entrada se queda
 * como estaba. Nunca toca `newsletter_feedback`.
 */
export async function guardarCorreos(
  entradas: CorreoEntrada[]
): Promise<{ guardados: string[]; rechazados: { clave: string; motivo: string }[] }> {
  const guardados: string[] = [];
  const rechazados: { clave: string; motivo: string }[] = [];
  for (const e of entradas) {
    const clave = limpio(e?.clave, 120);
    if (!clave) {
      rechazados.push({ clave: '', motivo: 'falta la clave' });
      continue;
    }
    const malo = validar(e);
    if (malo) {
      rechazados.push({ clave, motivo: malo });
      continue;
    }
    // Cada entrada en su transaccion y con la fila bloqueada: entre leer el estado y
    // escribir no puede colarse una aprobacion ni una vinculacion.
    const cx = await pool.connect();
    try {
      await cx.query('BEGIN');
      const motivo = await guardarUno(cx, clave, e);
      await cx.query('COMMIT');
      if (motivo) rechazados.push({ clave, motivo });
      else guardados.push(clave);
    } catch (err) {
      await cx.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      cx.release();
    }
  }
  return { guardados, rechazados };
}

/** Guarda una entrada dentro de la transaccion abierta en `cx`. Devuelve el motivo si se rechaza. */
async function guardarUno(cx: PoolClient, clave: string, e: CorreoEntrada): Promise<string | null> {
  const { rows } = await cx.query(`SELECT ${COLUMNAS} FROM newsletter_correos WHERE clave = $1 FOR UPDATE`, [clave]);
  const previo = rows[0];
  if (previo) {
    const motivo = motivoNoReescribible(previo);
    if (motivo) return motivo;
  }
  const base = previo || {};
  const m = (k: keyof CorreoEntrada, def: any = null) => (e[k] !== undefined ? (e as any)[k] : (base as any)[k] ?? def);
  const fusion = {
    numero: m('numero'),
    fecha: m('fecha'),
    hora: m('hora'),
    remitente: m('remitente'),
    asunto: limpio(m('asunto', ''), 300),
    asunto_b: e.asunto_b !== undefined ? opcional(e.asunto_b, 300) : base.asunto_b ?? null,
    preview: limpio(m('preview', ''), 400),
    preview_b: e.preview_b !== undefined ? opcional(e.preview_b, 400) : base.preview_b ?? null,
    cuerpo: String(m('cuerpo', '')).trim(),
    gif_url: e.gif_url !== undefined ? opcional(e.gif_url, 1000) : base.gif_url ?? null,
    gif_alt: e.gif_alt !== undefined ? opcional(e.gif_alt, 300) : base.gif_alt ?? null,
    html: e.html !== undefined ? (e.html == null || !String(e.html).trim() ? null : String(e.html)) : base.html ?? null,
    enlace: e.enlace !== undefined ? opcional(e.enlace, 1000) : base.enlace ?? null,
    utm_campaign: e.utm_campaign !== undefined ? opcional(e.utm_campaign, 200) : base.utm_campaign ?? null,
    utm_source: e.utm_source !== undefined ? opcional(e.utm_source, 200) : base.utm_source ?? null,
    pilar: e.pilar !== undefined ? opcional(e.pilar, 100) : base.pilar ?? null,
    tipo_cliente: e.tipo_cliente !== undefined ? opcional(e.tipo_cliente, 100) : base.tipo_cliente ?? null,
    por_que: e.por_que !== undefined ? opcional(e.por_que, 4000) : base.por_que ?? null,
    validador: e.validador !== undefined ? opcional(e.validador, 8000) : base.validador ?? null,
    validador_ok: e.validador_ok !== undefined ? !!e.validador_ok : !!base.validador_ok,
  };
  const huella = huellaTexto(fusion as any);
  const estado = previo
    ? estadoTrasReescribir({ estado: previo.estado, huella: previo.huella }, huella, e.estado)
    : e.estado || 'idea';
  const vuelveABorrador = !!previo && previo.estado === 'aprobado' && estado === 'borrador';
  const vals = [
    clave, fusion.numero, fusion.fecha, fusion.hora, fusion.remitente, fusion.asunto, fusion.asunto_b,
    fusion.preview, fusion.preview_b, fusion.cuerpo, fusion.gif_url, fusion.gif_alt, fusion.enlace,
    fusion.utm_campaign, fusion.utm_source, fusion.pilar, fusion.tipo_cliente, fusion.por_que,
    fusion.validador, fusion.validador_ok, huella, estado, vuelveABorrador, fusion.html,
  ];
  await cx.query(
    `INSERT INTO newsletter_correos
       (clave, numero, fecha, hora, remitente, asunto, asunto_b, preview, preview_b, cuerpo, gif_url, gif_alt,
        enlace, utm_campaign, utm_source, pilar, tipo_cliente, por_que, validador, validador_ok, huella, estado, html)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$24)
     ON CONFLICT (clave) DO UPDATE SET
       numero = EXCLUDED.numero, fecha = EXCLUDED.fecha, hora = EXCLUDED.hora, remitente = EXCLUDED.remitente,
       asunto = EXCLUDED.asunto, asunto_b = EXCLUDED.asunto_b, preview = EXCLUDED.preview,
       preview_b = EXCLUDED.preview_b, cuerpo = EXCLUDED.cuerpo, gif_url = EXCLUDED.gif_url,
       gif_alt = EXCLUDED.gif_alt, enlace = EXCLUDED.enlace, utm_campaign = EXCLUDED.utm_campaign,
       utm_source = EXCLUDED.utm_source, pilar = EXCLUDED.pilar, tipo_cliente = EXCLUDED.tipo_cliente,
       por_que = EXCLUDED.por_que, validador = EXCLUDED.validador, validador_ok = EXCLUDED.validador_ok,
       huella = EXCLUDED.huella, estado = EXCLUDED.estado, html = EXCLUDED.html,
       aprobado_por = CASE WHEN $23 THEN NULL ELSE newsletter_correos.aprobado_por END,
       aprobado_at = CASE WHEN $23 THEN NULL ELSE newsletter_correos.aprobado_at END,
       updated_at = NOW()`,
    vals
  );
  return null;
}

/** Los correos con su feedback. Los enviados, del mas reciente al mas antiguo; el resto, por fecha. */
export async function listarCorreos(): Promise<{ proximos: any[]; enviados: any[] }> {
  const { rows } = await pool.query(
    `SELECT ${COLUMNAS} FROM newsletter_correos
      ORDER BY fecha ASC NULLS LAST, hora ASC NULLS LAST, numero ASC NULLS LAST`
  );
  const fb = await pool.query(
    `SELECT id, correo_id, autor, texto, nivel, resuelto, respuesta, created_at, resuelto_at
       FROM newsletter_feedback ORDER BY created_at`
  );
  const porCorreo = new Map<string, any[]>();
  for (const f of fb.rows) {
    const l = porCorreo.get(f.correo_id) || [];
    l.push(f);
    porCorreo.set(f.correo_id, l);
  }
  const correos = [];
  for (const c of rows) {
    const metricas = c.brevo_campaign_id != null ? await metricasDeCorreo(c.brevo_campaign_id) : null;
    correos.push({ ...c, feedback: porCorreo.get(c.id) || [], metricas });
  }
  return {
    proximos: correos.filter((c) => c.estado !== 'enviado'),
    enviados: correos.filter((c) => c.estado === 'enviado').reverse(),
  };
}

/** Solo Iker aprueba. Devuelve 'ok', 'no_existe' o el motivo por el que no se puede. */
/**
 * Solo Iker aprueba, y solo el texto que vio: `huella` es la que la tarjeta pinto. Si el
 * correo se reescribio entre medias, no se aprueba (MOTIVO_CAMBIADO). El UPDATE repite las
 * condiciones para que una reescritura concurrente no se cuele entre la lectura y la escritura.
 */
export async function aprobarCorreo(id: string, quien: Identidad, huella: string): Promise<'ok' | 'no_existe' | string> {
  const { rows } = await pool.query(`SELECT estado, validador_ok, huella FROM newsletter_correos WHERE id = $1`, [id]);
  if (!rows.length) return 'no_existe';
  if (!puedeAprobar(quien)) return `solo ${APROBADOR} aprueba los correos`;
  const motivo = motivoNoAprobable(rows[0], huella);
  if (motivo) return motivo;
  const r = await pool.query(
    `UPDATE newsletter_correos
        SET estado = 'aprobado', aprobado_por = $2, aprobado_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND estado = 'borrador' AND validador_ok AND huella = $3`,
    [id, quien.email.trim().toLowerCase(), huella]
  );
  return r.rowCount ? 'ok' : MOTIVO_CAMBIADO;
}

/**
 * Enlaza un correo con su campana de Brevo (reglas en `estadoAlVincular`). Una campana
 * solo puede estar en un correo. Devuelve 'ok', 'no_existe' o el motivo por el que no se puede.
 */
export async function vincularCampana(
  clave: string,
  campaignId: number | null,
  opts: { historico?: boolean } = {}
): Promise<'ok' | 'no_existe' | string> {
  const { rows } = await pool.query(
    `SELECT estado, to_char(fecha, 'YYYY-MM-DD') AS fecha FROM newsletter_correos WHERE clave = $1`,
    [clave]
  );
  if (!rows.length) return 'no_existe';
  const r = estadoAlVincular(rows[0], campaignId, !!opts.historico);
  if ('motivo' in r) return r.motivo;
  if (campaignId != null) {
    const otro = await pool.query(
      `SELECT clave FROM newsletter_correos WHERE brevo_campaign_id = $1 AND clave <> $2 LIMIT 1`,
      [campaignId, clave]
    );
    if (otro.rows.length) return `la campaña ${campaignId} ya está vinculada al correo ${otro.rows[0].clave}`;
  }
  try {
    // Solo si el estado sigue siendo el que se leyo: si cambio entre medias, no se pisa.
    const u = await pool.query(
      `UPDATE newsletter_correos
          SET brevo_campaign_id = $2, estado = $3,
              aprobado_por = CASE WHEN $3 = 'borrador' THEN NULL ELSE aprobado_por END,
              aprobado_at = CASE WHEN $3 = 'borrador' THEN NULL ELSE aprobado_at END,
              updated_at = NOW()
        WHERE clave = $1 AND estado = $4`,
      [clave, campaignId, r.estado, rows[0].estado]
    );
    if (!u.rowCount) return 'el correo ha cambiado de estado mientras se vinculaba: vuelve a intentarlo';
  } catch (err: any) {
    if (err?.code === '23505') return `la campaña ${campaignId} ya está vinculada a otro correo`;
    throw err;
  }
  return 'ok';
}

/** Un fundador deja feedback en un correo. */
export async function crearFeedback(correoId: string, autor: string, texto: string) {
  const a = limpio(autor, 60);
  const t = limpio(texto, 4000);
  if (!a) throw new Error('Falta quién deja el feedback');
  if (!t) throw new Error('El feedback está vacío');
  const c = await pool.query(`SELECT id FROM newsletter_correos WHERE id = $1`, [correoId]);
  if (!c.rows.length) return null;
  const { rows } = await pool.query(
    `INSERT INTO newsletter_feedback (correo_id, autor, texto) VALUES ($1, $2, $3)
     RETURNING id, correo_id, autor, texto, nivel, resuelto, respuesta, created_at, resuelto_at`,
    [correoId, a, t]
  );
  return rows[0];
}

/** El feedback con su correo. Por defecto, solo lo que falta por atender. */
export async function listarFeedbackCorreos(opts: { pendiente?: boolean } = {}) {
  const { rows } = await pool.query(
    `SELECT nf.id, nf.autor, nf.texto, nf.nivel, nf.resuelto, nf.respuesta, nf.created_at,
            nc.id AS correo_id, nc.clave, nc.asunto, nc.remitente, nc.pilar,
            to_char(nc.fecha, 'YYYY-MM-DD') AS fecha
       FROM newsletter_feedback nf
       JOIN newsletter_correos nc ON nc.id = nf.correo_id
      ${opts.pendiente === false ? '' : 'WHERE nf.resuelto = FALSE'}
      ORDER BY nf.created_at`
  );
  return rows;
}

/** Clasifica en su nivel y cierra un feedback diciendo que se cambio. */
export async function resolverFeedbackCorreo(id: string, datos: { nivel: string; respuesta: string }) {
  if (!NIVELES_CORREO.includes(datos.nivel as any)) throw new Error(`Nivel no válido: ${datos.nivel}`);
  const { rows } = await pool.query(
    `UPDATE newsletter_feedback
        SET nivel = $2, respuesta = $3, resuelto = TRUE, resuelto_at = NOW()
      WHERE id = $1
      RETURNING id, correo_id, autor, texto, nivel, resuelto, respuesta, created_at, resuelto_at`,
    [id, datos.nivel, limpio(datos.respuesta, 4000)]
  );
  return rows[0] || null;
}
