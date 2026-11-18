/**
 * HORA DE MADRID EN EL NAVEGADOR (2026-11-18). Los posts se programan «el jueves
 * a las 08:30» en hora de Madrid, este quien este mirando donde este. El
 * navegador calcula el instante exacto (con el cambio de hora resuelto) y lo
 * manda en ISO; el servidor no adivina zonas.
 */
export const ZONA = 'Europe/Madrid';
export const HORA_POR_DEFECTO = '08:30';

const formato = new Intl.DateTimeFormat('en-US', {
  timeZone: ZONA,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

/** Cuanto va Madrid por delante de UTC en ese instante, en ms. */
function desfase(ms: number): number {
  const p = Object.fromEntries(formato.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  const comoUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return comoUTC - Math.floor(ms / 1000) * 1000;
}

/** El instante de un dia ('2026-11-19') a una hora ('08:30') en Madrid. null si no son validos. */
export function instanteMadrid(fecha: string, hora: string): Date | null {
  const f = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
  const h = /^(\d{2}):(\d{2})$/.exec(hora);
  if (!f || !h || +h[1] > 23 || +h[2] > 59) return null;
  const local = Date.UTC(+f[1], +f[2] - 1, +f[3], +h[1], +h[2]);
  // Dos pasadas: la segunda corrige si el desfase cambia entre la suposicion y el resultado.
  let t = local - desfase(local);
  t = local - desfase(t);
  return new Date(t);
}

/** 'jue 19 nov, 08:30' en hora de Madrid. */
export function cuandoMadrid(iso: string): string {
  const d = new Date(iso);
  const dia = d
    .toLocaleDateString('es-ES', { timeZone: ZONA, weekday: 'short', day: 'numeric', month: 'short' })
    .replace(/\./g, '')
    .replace(',', '');
  const hora = d.toLocaleTimeString('es-ES', { timeZone: ZONA, hour: '2-digit', minute: '2-digit' });
  return `${dia}, ${hora}`;
}

/** '08:30' de un instante, en Madrid. */
export function horaMadrid(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-ES', { timeZone: ZONA, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
}
