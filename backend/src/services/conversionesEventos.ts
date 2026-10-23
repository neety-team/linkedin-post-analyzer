// EVENTOS DE LUMA Y LEADS CRUZADOS PARA EL RESUMEN DE CUENTAS (Iker, 2026-10-23)
//
// Diseño: docs/superpowers/specs/2026-10-23-resumen-conversiones-design.md.
//
// - INSCRITOS: Luma gratis no da la fuente de cada inscrito por API, pero su CSV si
//   (utm_source). Se sube desde la franja del evento en Cuentas: el navegador lo lee y solo
//   manda guest_id, fecha, UTMs, estado, si asistio y, si marco la casilla de correos, la
//   HUELLA (SHA-256) de su correo. Nunca nombres ni correos. Cuentan los aprobados.
// - EVENTOS: cada evento leido de Luma se guarda (luma_eventos) para que su tarjeta siga en
//   el resumen despues de la fecha (la revision de dos semanas cae despues del evento).
// - LEADS: lead = persona nueva que nos da permiso para escribirle. La casilla de Luma lo
//   es (el CRM la pasa a Brevo, commit caf587f), igual que la de la web. Se cruzan por
//   huella: quien esta en las dos cuenta una vez, con el origen de la web (mas preciso).
//
// El origen de cada inscrito usa el MISMO arbol que oportunidades y leads (web:
// origenUnificado): linkedin (pilar · perfil) · dm (cuenta) · newsletter · web · otros ·
// sin_rastro. En Luma la identidad del post va en utm_source ({pilar}-{tema}-{ddmes}-{cuenta},
// global-instructions «Luma no lee utm_campaign»); los DMs, dm-{campaña}-{cuenta}.
import pool from '../db';
import { leerEvento, SLUG } from './avisoWebinarLuma';
import { parsearCampana, type LeadsWeb, type Arbol } from './conversionesWeb';

const CUENTAS = ['iker', 'unai', 'asier', 'mario'];
export function origenInscrito(
  utmSource: string | null, utmMedium: string | null, utmCampaign: string | null = null
): { canal: string; detalle: string | null } {
  const src = String(utmSource || '').toLowerCase().trim();
  const med = String(utmMedium || '').toLowerCase().trim();
  // Algunos enlaces de DM solo llevan la campaña (dm-webinar28oct) y el source vacio.
  const camp = String(utmCampaign || '').toLowerCase().trim();
  const partes = src.split('-').filter(Boolean);
  const cuenta = [...partes, ...camp.split('-')].reverse().find((x) => CUENTAS.includes(x)) ?? null;
  if (!src && !med && !camp) return { canal: 'sin_rastro', detalle: null };
  if (src.startsWith('dm-') || med === 'dm' || camp.startsWith('dm-')) return { canal: 'dm', detalle: cuenta ?? 'sin-cuenta' };
  if (src.startsWith('correo-') || med === 'email' || /^(brevo|newsletter|correo)$/.test(src)) return { canal: 'newsletter', detalle: null };
  if (src.startsWith('perfil') || med === 'boton-perfil') return { canal: 'linkedin', detalle: 'perfil' };
  if (/^(web|neety|recursos)(-|$)/.test(src)) return { canal: 'web', detalle: null };
  if (parsearCampana(src.replace(new RegExp(`-(${CUENTAS.join('|')})(-.*)?$`), ''), '2100-12-31') || med === 'post') {
    return { canal: 'linkedin', detalle: partes[0] || 'sin-post' };
  }
  if (/linkedin/.test(src)) return { canal: 'linkedin', detalle: 'sin-post' };
  return { canal: 'otros', detalle: null };
}

function sumar(arbol: Arbol, canal: string, detalle: string | null) {
  const g = (arbol[canal] ||= { total: 0, detalle: {} });
  g.total++;
  if (detalle) g.detalle[detalle] = (g.detalle[detalle] || 0) + 1;
}

// ── Subida del CSV ──────────────────────────────────────────────────────────────
const HUELLA = /^[0-9a-f]{64}$/;
export async function guardarInscritosLuma(filas: any[]): Promise<{ evento: string; guardados: number }> {
  const limpias = filas
    .map((f) => ({
      guest_id: String(f?.guest_id || '').trim().slice(0, 80),
      inscrito_at: f?.created_at && !Number.isNaN(Date.parse(f.created_at)) ? new Date(f.created_at).toISOString() : null,
      utm_source: String(f?.utm_source || '').trim().slice(0, 160) || null,
      utm_medium: String(f?.utm_medium || '').trim().slice(0, 80) || null,
      utm_campaign: String(f?.utm_campaign || '').trim().slice(0, 160) || null,
      estado: String(f?.approval_status || '').trim().slice(0, 30) || null,
      acepta_correo: typeof f?.acepta_correo === 'boolean' ? f.acepta_correo : null,
      asistio: typeof f?.asistio === 'boolean' ? f.asistio : null,
      // Solo de quien marco la casilla: es lo que hace falta para cruzar leads.
      email_hash: f?.acepta_correo === true && HUELLA.test(String(f?.h || '')) ? String(f.h) : null,
    }))
    .filter((f) => f.guest_id);
  if (!limpias.length) throw new Error('El CSV no trae ninguna fila con guest_id: ¿es el export de invitados de Luma?');
  // El evento al que pertenece el CSV es el que esta en curso en Luma (LUMA_WEBINAR_SLUG).
  await recordarEvento().catch(() => {});
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`DELETE FROM luma_inscritos WHERE evento = $1`, [SLUG]);
    for (const f of limpias) {
      await client.query(
        `INSERT INTO luma_inscritos
           (evento, guest_id, inscrito_at, utm_source, utm_medium, utm_campaign, estado, acepta_correo, asistio, email_hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT (evento, guest_id) DO NOTHING`,
        [SLUG, f.guest_id, f.inscrito_at, f.utm_source, f.utm_medium, f.utm_campaign, f.estado, f.acepta_correo, f.asistio, f.email_hash]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
  return { evento: SLUG, guardados: limpias.length };
}

// ── Eventos ─────────────────────────────────────────────────────────────────────
let recordadoAt = 0;
let vivo: { inscritos: number | null; at: number } | null = null;
/** Lee el evento de Luma y lo guarda (nombre, fechas, url). Como mucho una vez cada 5 min. */
async function recordarEvento(): Promise<void> {
  if (Date.now() - recordadoAt < 5 * 60 * 1000) return;
  const ev = await leerEvento();
  recordadoAt = Date.now();
  if (!ev) return;
  vivo = { inscritos: ev.inscritos, at: Date.now() };
  await pool.query(
    `INSERT INTO luma_eventos (slug, nombre, empieza, acaba, url, inscritos_luma, actualizado_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (slug) DO UPDATE SET nombre = EXCLUDED.nombre, empieza = EXCLUDED.empieza,
       acaba = EXCLUDED.acaba, url = EXCLUDED.url,
       inscritos_luma = COALESCE(EXCLUDED.inscritos_luma, luma_eventos.inscritos_luma), actualizado_at = NOW()`,
    [SLUG, ev.nombre, ev.empieza.toISOString(), ev.acaba.toISOString(), ev.url, ev.inscritos]
  );
}

export interface EventoResumen {
  slug: string;
  nombre: string;
  empieza: string;
  url: string;
  /** Recuento de Luma (en vivo mientras el evento no ha pasado; luego, el ultimo leido). */
  inscritos_luma: number | null;
  /** Del ultimo CSV subido; null si no hay ninguno. */
  csv: null | {
    csv_at: string;
    inscritos: number;          // aprobados
    asistentes: number | null;  // null hasta que el CSV trae quien entro (despues del evento)
    origenes: Arbol;
  };
}

/** Eventos con fecha dentro del rango o con inscripciones dentro del rango (dias de Madrid). */
export async function leerEventos(desde: string, hasta: string): Promise<EventoResumen[]> {
  await recordarEvento().catch((e) => console.warn('[eventos] Luma:', e?.message));
  const { rows: evs } = await pool.query(
    `SELECT e.slug, e.nombre, e.empieza, e.url, e.inscritos_luma
       FROM luma_eventos e
      WHERE (e.empieza AT TIME ZONE 'Europe/Madrid')::date BETWEEN $1::date AND $2::date
         -- El que aun no ha terminado sale siempre: si no, antes del primer CSV no habria
         -- ni franja ni boton para subirlo.
         OR COALESCE(e.acaba, e.empieza) >= NOW()
         OR EXISTS (SELECT 1 FROM luma_inscritos i WHERE i.evento = e.slug
                     AND (i.inscrito_at AT TIME ZONE 'Europe/Madrid')::date BETWEEN $1::date AND $2::date)
      ORDER BY e.empieza DESC`,
    [desde, hasta]
  );
  const out: EventoResumen[] = [];
  for (const e of evs) {
    const { rows } = await pool.query(
      `SELECT utm_source, utm_medium, utm_campaign, asistio, subido_at FROM luma_inscritos
        WHERE evento = $1 AND COALESCE(estado, 'approved') = 'approved'`,
      [e.slug]
    );
    let csv: EventoResumen['csv'] = null;
    if (rows.length) {
      const origenes: Arbol = {};
      for (const r of rows) {
        const o = origenInscrito(r.utm_source, r.utm_medium, r.utm_campaign);
        sumar(origenes, o.canal, o.detalle);
      }
      const conDato = rows.filter((r) => r.asistio !== null);
      csv = {
        csv_at: new Date(Math.max(...rows.map((r) => new Date(r.subido_at).getTime()))).toISOString(),
        inscritos: rows.length,
        // Solo despues del evento: antes, Luma ya marca como «joined» a quien abre el enlace.
        asistentes: new Date(e.empieza).getTime() < Date.now() && conDato.some((r) => r.asistio)
          ? rows.filter((r) => r.asistio).length : null,
        origenes,
      };
    }
    const enCurso = e.slug === SLUG && vivo ? vivo.inscritos : null;
    out.push({
      slug: e.slug, nombre: e.nombre, empieza: new Date(e.empieza).toISOString(), url: e.url,
      inscritos_luma: enCurso ?? e.inscritos_luma ?? null, csv,
    });
  }
  return out;
}

// ── Leads: web + casilla de los eventos, sin repetir a nadie ─────────────────────
export interface LeadsResumen {
  total: number;
  web: number;
  eventos: number;              // los que SOLO vienen de un evento (los de los dos cuentan en web)
  sin_permiso: number;          // de la web, dejaron el correo sin la casilla (no son leads)
  origenes: Arbol;
  por_recurso: Record<string, number>;
  /** El CSV del evento puede ir por detras: fecha del ultimo subido, o null si ninguno. */
  csv_at: string | null;
}
async function lumaConCasilla(desde: string, hasta: string) {
  const { rows } = await pool.query(
    `SELECT i.email_hash, e.empieza, i.subido_at
       FROM luma_inscritos i JOIN luma_eventos e ON e.slug = i.evento
      WHERE i.acepta_correo = TRUE AND i.email_hash IS NOT NULL
        AND COALESCE(i.estado, 'approved') = 'approved'
        AND (i.inscrito_at AT TIME ZONE 'Europe/Madrid')::date BETWEEN $1::date AND $2::date`,
    [desde, hasta]
  );
  return rows as { email_hash: string; empieza: string; subido_at: string }[];
}
const fechaCorta = (iso: string) =>
  new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'Europe/Madrid' }).replace('.', '');

type ResumenWeb = Extract<LeadsWeb, { current: unknown }>['current'];
function combinar(web: ResumenWeb | null, luma: Awaited<ReturnType<typeof lumaConCasilla>>): LeadsResumen {
  const origenes: Arbol = {};
  const vistos = new Set<string>();
  for (const c of web?.consentidos ?? []) {
    if (vistos.has(c.h)) continue;
    vistos.add(c.h);
    sumar(origenes, c.canal, c.detalle);
  }
  let eventos = 0;
  for (const l of luma) {
    if (vistos.has(l.email_hash)) continue;
    vistos.add(l.email_hash);
    eventos++;
    sumar(origenes, 'eventos', `evento del ${fechaCorta(l.empieza)}`);
  }
  return {
    total: vistos.size,
    web: vistos.size - eventos,
    eventos,
    sin_permiso: web?.sin_permiso ?? 0,
    origenes,
    por_recurso: web?.por_recurso ?? {},
    csv_at: luma.length ? new Date(Math.max(...luma.map((l) => new Date(l.subido_at).getTime()))).toISOString() : null,
  };
}

function diaAnterior(desde: string, hasta: string): { desde: string; hasta: string } {
  const d = (s: string) => new Date(`${s}T00:00:00Z`).getTime();
  const dias = Math.round((d(hasta) - d(desde)) / 86400000) + 1;
  const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
  return { desde: iso(d(desde) - dias * 86400000), hasta: iso(d(desde) - 86400000) };
}

export async function leerLeadsCombinados(desde: string, hasta: string, web: LeadsWeb):
  Promise<{ configurado: true; current: LeadsResumen; previous: LeadsResumen; error_web: string | null }> {
  const prev = diaAnterior(desde, hasta);
  const [lc, lp] = await Promise.all([lumaConCasilla(desde, hasta), lumaConCasilla(prev.desde, prev.hasta)]);
  const ok = 'current' in web;
  return {
    configurado: true,
    current: combinar(ok ? web.current : null, lc),
    previous: combinar(ok ? web.previous : null, lp),
    // Sin la web, el total seria solo Luma: la pantalla lo avisa en vez de enseñar un numero corto.
    error_web: ok ? null : !web.configurado ? 'falta conectar la web' : web.error,
  };
}
