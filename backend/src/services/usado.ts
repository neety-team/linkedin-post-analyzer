import pool from '../db';

/**
 * Lo ya usado (2026-11-24): los correos y los posts que ya han salido o están en camino, para
 * que los validadores sepan qué frase, apertura, palabra o región está gastada.
 *
 * Antes eso vivía en el repo (listas a mano en validar-email.py, corpus-correos-enviados.md,
 * historial-publicaciones.md) y cada envío acababa en commits. Ahora el estado vive aquí y el
 * repo solo guarda la doctrina. La lógica de qué cuenta como «quemado» sigue en los validadores:
 * esto solo devuelve los textos.
 */

export const ESTADOS_CORREO_USADO = ['aprobado', 'programado', 'enviado'] as const;
export const ESTADOS_POST_USADO = ['aprobado', 'programado', 'publicado'] as const;

/** La fecha de hace `dias` días, en YYYY-MM-DD. */
export function haceDias(dias: number, hoy: Date = new Date()): string {
  const d = new Date(hoy.getTime() - dias * 86_400_000);
  return d.toISOString().slice(0, 10);
}

/** `desde` válido (YYYY-MM-DD) o, si no, hace 120 días. */
export function desdeValido(desde: unknown, hoy: Date = new Date()): string {
  return typeof desde === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(desde) ? desde : haceDias(120, hoy);
}

export interface CorreoUsado {
  clave: string;
  numero: number | null;
  fecha: string | null;
  estado: string;
  remitente: string | null;
  asunto: string;
  utm_campaign: string | null;
  cuerpo: string;
}

export interface PostUsado {
  clave: string;
  semana: string;
  fecha: string | null;
  cuenta: string;
  pilar: string | null;
  region: string | null;
  estado: string;
  titulo: string | null;
  texto: string;
}

export async function leerUsado(desde: string): Promise<{ desde: string; correos: CorreoUsado[]; posts: PostUsado[] }> {
  const correos = await pool.query(
    `SELECT clave, numero, to_char(fecha, 'YYYY-MM-DD') AS fecha, estado, remitente, asunto, utm_campaign, cuerpo
       FROM newsletter_correos
      WHERE estado = ANY($1) AND (fecha IS NULL OR fecha >= $2)
      ORDER BY fecha DESC NULLS LAST`,
    [ESTADOS_CORREO_USADO as unknown as string[], desde]
  );
  const posts = await pool.query(
    `SELECT clave, semana, to_char(fecha, 'YYYY-MM-DD') AS fecha, cuenta, pilar, region, estado, titulo, texto
       FROM semana_posts
      WHERE estado = ANY($1) AND fecha >= $2
      ORDER BY fecha DESC`,
    [ESTADOS_POST_USADO as unknown as string[], desde]
  );
  return { desde, correos: correos.rows, posts: posts.rows };
}

/** Primera línea con texto de un cuerpo (sin el marcador del GIF). */
export function aperturaDe(cuerpo: string): string {
  return (cuerpo || '').split('\n').map((l) => l.trim()).find((l) => l && !l.startsWith('[')) || '';
}

/** Las dos líneas del bloque del enlace, sin la URL. */
export function ninjaDe(cuerpo: string): string[] {
  const bloques = (cuerpo || '').split(/\n\s*\n/);
  const b = bloques.find((x) => /https?:\/\//.test(x));
  if (!b) return [];
  return b
    .split('\n')
    .map((l) => l.replace(/:?\s*https?:\/\/\S+/g, '').trim())
    .filter(Boolean);
}

/** Resumen legible para el MCP: qué se ha usado y cuándo. */
export function resumenUsado(u: { desde: string; correos: CorreoUsado[]; posts: PostUsado[] }): string {
  const l: string[] = [`Lo usado desde el ${u.desde}.`, '', `CORREOS (${u.correos.length})`];
  for (const c of u.correos) {
    l.push(`- ${c.fecha || 'sin fecha'} · correo ${c.numero ?? '?'} · ${c.estado} · ${c.remitente || ''} · «${c.asunto}»`);
    const ap = aperturaDe(c.cuerpo);
    if (ap) l.push(`    apertura: ${ap}`);
    const nj = ninjaDe(c.cuerpo);
    if (nj.length) l.push(`    enlace: ${nj.join(' / ')}`);
  }
  l.push('', `POSTS (${u.posts.length})`);
  for (const p of u.posts) {
    l.push(`- ${p.fecha} · ${p.cuenta} · ${p.pilar || 'sin pilar'}${p.region ? ` · ${p.region}` : ''} · ${p.estado} · ${p.titulo || p.clave}`);
  }
  return l.join('\n');
}
