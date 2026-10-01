/**
 * Metricas de VIDEO de un post de LinkedIn (Iker, 2026-10-01).
 *
 * El dashboard enseña el PORCENTAJE MEDIO VISTO (tiempo medio / duracion), como
 * YouTube Shorts. LinkedIn da el tiempo medio en la pagina de analiticas del
 * post (eso lo lee premiumAnalytics.ts), pero NO la duracion del video.
 *
 * - aSegundos: "3h 57m" / "1m 5s" / "17s" -> segundos (asi los pinta LinkedIn).
 * - duracionMvhd: duracion leida del atomo `mvhd` de la cabecera del mp4.
 * - fetchVideoDuration: pide el post a Unipile, coge el adjunto de video y lee
 *   SOLO los primeros 64 KB del mp4. Sin ffmpeg y sin bajar el video entero.
 *   Probado con el video de Unai del 30/09: mvhd en el byte 44, 22,273 s.
 */
const BASE = () => process.env.UNIPILE_BASE_URL || 'https://api18.unipile.com:14891';
const KEY = () => process.env.UNIPILE_API_KEY || '';

export function aSegundos(s: string | null | undefined): number | null {
  if (!s) return null;
  let total = 0;
  let algo = false;
  for (const m of s.matchAll(/(\d+)\s*([hms])/gi)) {
    algo = true;
    const n = parseInt(m[1], 10);
    const u = m[2].toLowerCase();
    total += u === 'h' ? n * 3600 : u === 'm' ? n * 60 : n;
  }
  return algo ? total : null;
}

export function duracionMvhd(buf: Buffer): number | null {
  const i = buf.indexOf('mvhd', 0, 'ascii');
  if (i < 0 || i + 36 > buf.length) return null;
  const version = buf.readUInt8(i + 4);
  let timescale: number;
  let duration: number;
  if (version === 0) {
    timescale = buf.readUInt32BE(i + 16);
    duration = buf.readUInt32BE(i + 20);
  } else {
    timescale = buf.readUInt32BE(i + 24);
    duration = Number(buf.readBigUInt64BE(i + 28));
  }
  if (!timescale || !duration) return null;
  return Math.round((duration / timescale) * 1000) / 1000;
}

async function trozo(url: string, range: string): Promise<Buffer | null> {
  const r = await fetch(url, { headers: { Range: range } });
  if (!r.ok) return null;
  return Buffer.from(await r.arrayBuffer());
}

export async function fetchVideoDuration(linkedinPostId: string, accountId: string): Promise<number | null> {
  if (!KEY() || !linkedinPostId || !accountId) return null;
  const id = String(linkedinPostId).replace(/^urn:li:activity:/, '');
  const res = await fetch(`${BASE()}/api/v1/posts/${id}?account_id=${encodeURIComponent(accountId)}`, {
    headers: { 'X-API-KEY': KEY(), Accept: 'application/json' },
  });
  if (!res.ok) return null;
  const post: any = await res.json();
  const video = (post?.attachments || []).find((a: any) => a?.type === 'video' && a?.url);
  if (!video) return null;
  // Casi siempre el mp4 viene con faststart (mvhd al principio). Si no, va al final.
  const inicio = await trozo(video.url, 'bytes=0-65535');
  const d1 = inicio ? duracionMvhd(inicio) : null;
  if (d1) return d1;
  const fin = await trozo(video.url, 'bytes=-65536');
  return fin ? duracionMvhd(fin) : null;
}
