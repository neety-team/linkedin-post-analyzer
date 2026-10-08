// RECUENTO DIARIO DE INSCRITOS DEL WEBINAR AL CHAT DE GROWTH & SALES (Iker, 2026-10-08)
//
// QUE HACE: de lunes a viernes, a las 9:00, lee UNA vez el contador publico de Luma
// y manda al chat: "📊 Webinar: N inscritos (+X desde el ultimo recuento) · faltan D
// dias". Iker: "con que lo lea una vez al dia, suficiente… no vamos a tener una
// afluencia que te cagas" (el presencial llego a ~80 en mes y medio). Fin de semana
// no, que no se trabaja (feedback revision semana siguiente).
//
// POR QUE NO UN AVISO POR INSCRITO: el webhook "Guest Registered" de Luma (y su API y
// Zapier) son solo de Luma Plus, y la cuenta es gratuita. El contador publico
// (`api.lu.ma/url?url=<slug>` → `guest_count`) no dice QUIEN se ha apuntado ni si
// marco la casilla de correos. Si algun dia se paga Plus, esto se cambia por el
// webhook y el aviso lleva nombre, empresa y "Correos si/no" como los leads de la web.
//
// APAGADO salvo que exista LUMA_CHAT_WEBHOOK_URL: GOOGLE_CHAT_WEBHOOK_URL es el chat
// de toda la empresa y esto va al de Growth & Sales. Deja de mandar cuando el evento
// ya ha pasado.
import pool from '../db';
import { sendToGoogleChat } from './googleChat';

const SLUG = process.env.LUMA_WEBINAR_SLUG || '7hhyx07z';
const HORA = '09:00';
const COMPROBAR_RELOJ_MS = 30 * 60 * 1000; // solo mira la hora; a Luma va una vez al dia
const CLAVE_CIFRA = `luma:${SLUG}:inscritos`;
const CLAVE_DIA = `luma:${SLUG}:ultimo-recuento`;

type Evento = { nombre: string; inscritos: number; empieza: Date; acaba: Date; url: string };

async function leerEvento(): Promise<Evento | null> {
  const res = await fetch(`https://api.lu.ma/url?url=${SLUG}`);
  if (!res.ok) return null;
  const d = ((await res.json()) as any)?.data;
  // Sin el campo no es un cero: un servicio externo puede devolver vacio a ratos.
  if (!d?.event || typeof d.guest_count !== 'number') return null;
  return {
    nombre: d.event.name,
    inscritos: d.guest_count,
    empieza: new Date(d.event.start_at),
    acaba: new Date(d.event.end_at),
    url: `https://luma.com/${SLUG}`,
  };
}

async function leerEstado(clave: string): Promise<string | null> {
  const { rows } = await pool.query(`SELECT value FROM app_state WHERE key = $1`, [clave]);
  return rows[0]?.value ?? null;
}

async function guardarEstado(clave: string, valor: string): Promise<void> {
  await pool.query(
    `INSERT INTO app_state (key, value, updated_at) VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [clave, valor]
  );
}

function madrid(d: Date) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('es-ES', {
      timeZone: 'Europe/Madrid', weekday: 'short', year: 'numeric', month: '2-digit',
      day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(d).map((x) => [x.type, x.value])
  );
  const dia = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'].indexOf(p.weekday.replace('.', ''));
  return { fecha: `${p.year}-${p.month}-${p.day}`, hora: `${p.hour}:${p.minute}`, dia };
}

export function componerRecuento(ev: Evento, previo: number | null, hoy: string): string {
  const n = Math.round((Date.parse(madrid(ev.empieza).fecha) - Date.parse(hoy)) / 86400000);
  const cuando = n <= 0 ? 'es hoy' : n === 1 ? 'es mañana' : `faltan ${n} días`;
  const subida = previo === null ? '' : ev.inscritos > previo ? ` (+${ev.inscritos - previo} desde el último recuento)` : ' (sin altas nuevas)';
  return `📊 *Webinar:* ${ev.inscritos} inscritos${subida} · ${cuando}\n${ev.nombre}\n${ev.url}`;
}

async function pase(webhook: string): Promise<void> {
  const ahora = madrid(new Date());
  if (ahora.dia === 0 || ahora.dia === 6 || ahora.hora < HORA) return;
  if ((await leerEstado(CLAVE_DIA)) === ahora.fecha) return;

  const ev = await leerEvento();
  if (!ev) return console.warn('[avisoWebinarLuma] Luma no devolvio el contador; se reintenta en 30 min');
  if (ahora.fecha > madrid(ev.empieza).fecha) return;

  const previo = await leerEstado(CLAVE_CIFRA);
  await guardarEstado(CLAVE_DIA, ahora.fecha);
  await guardarEstado(CLAVE_CIFRA, String(ev.inscritos));
  await sendToGoogleChat(webhook, componerRecuento(ev, previo === null ? null : Number(previo), ahora.fecha));
}

export function startAvisoWebinarLuma() {
  const webhook = process.env.LUMA_CHAT_WEBHOOK_URL;
  if (!webhook) return console.log('[avisoWebinarLuma] LUMA_CHAT_WEBHOOK_URL sin configurar: apagado');
  const correr = () => pase(webhook).catch((e) => console.error('[avisoWebinarLuma] pase fallido:', e?.message));
  console.log(`[avisoWebinarLuma] recuento de luma.com/${SLUG} de lunes a viernes a las ${HORA}`);
  setTimeout(correr, 90 * 1000);
  setInterval(correr, COMPROBAR_RELOJ_MS);
}
