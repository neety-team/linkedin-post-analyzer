// Logica PURA del pase de contadores publicos (likes, comentarios, reposts e
// impresiones) de los posts que ya han salido de su semana de snapshots.
// Sin BD ni red a proposito: se prueba con scripts/testContadoresCadencia.ts.
//
// POR QUE DOS VENTANAS (Iker, 2026-10-06). Desde el 17/09 habia UN pase por
// cuenta cada 7 dias (o al empezar el mes) que releia el feed entero. Medido el
// 06/10 contra LinkedIn: en los posts de mas de 30 dias la diferencia en una
// semana es de decimas de punto, pero un post de 13 dias de Iker llevaba 167
// likes y 24.918 impresiones en la BD y 194 y 29.308 en LinkedIn (+17%). Un
// post sigue vivo semanas despues de la hora dorada, y el dashboard no puede
// ir una semana por detras en esos. Ademas el dashboard solo enseñaba la fecha
// del ultimo SNAPSHOT (cerrado al dia 7), asi que parecia que nadie los tocaba.
//
//  - VENTANA CORTA: posts de 7 a 90 dias. Una pagina o dos del feed por cuenta
//    (`since` = hoy - 90 dias), CADA 24 HORAS. ~3-6 llamadas al dia entre las
//    tres cuentas.
//  - VENTANA LARGA: todos los posts de mas de 7 dias, feed ENTERO, cada 7 dias
//    o el dia 1 del mes (lo que llegue antes), como hasta ahora. Es un
//    superconjunto de la corta a proposito: el feed ya esta en la mano.
//
// Las dos escriben una lectura en `post_metric_readings`, que es lo que el
// dashboard enseña ahora como "ultima actualizacion" del post.

export type Ventana = 'corta' | 'larga';

// La semana de snapshots la lleva el tick (requiredIntervalMs); a partir de ahi
// entran aqui.
export const SNAPSHOTS_DIAS = 7;
export const CORTA_MAX_DIAS = 90;
export const CORTA_CADA_HORAS = 24;
// Si el feed vino vacio o degradado, un post vivo no puede perder un dia
// entero: se reintenta a las 3h.
export const CORTA_REINTENTO_HORAS = 3;
export const LARGA_CADA_DIAS = 7;
export const LARGA_REINTENTO_HORAS = 24;

// Feed a medias: getPosts corta en la primera pagina vacia y devuelve lo que
// lleve. Si no aparecen ni el 70% de los posts de la ventana, no se da el pase
// por hecho.
export const MIN_COBERTURA = 0.7;
// Feed degradado: Unipile devuelve reacciones a 0 en parte del feed a ratos.
// Si mas del 10% de los posts que tenian likes vienen a 0, no se escribe nada.
export const MAX_CEROS = 0.1;

const DIA_MS = 24 * 3600 * 1000;

export function enVentana(publishedAt: Date, ventana: Ventana, ahora: Date): boolean {
  const edadDias = (ahora.getTime() - publishedAt.getTime()) / DIA_MS;
  if (edadDias <= SNAPSHOTS_DIAS) return false;
  return ventana === 'corta' ? edadDias <= CORTA_MAX_DIAS : true;
}

// Cuanto esperar hasta el siguiente pase de esa ventana. `topeMes` = ademas no
// pasar del dia 1 del mes siguiente (lo aplica el SQL con date_trunc, en la
// zona horaria de la sesion), para que las impresiones ganadas caigan en su mes.
export function proximoPase(ventana: Ventana, fallo: boolean): { horas: number; topeMes: boolean } {
  if (ventana === 'corta') {
    return { horas: fallo ? CORTA_REINTENTO_HORAS : CORTA_CADA_HORAS, topeMes: false };
  }
  return fallo
    ? { horas: LARGA_REINTENTO_HORAS, topeMes: false }
    : { horas: LARGA_CADA_DIAS * 24, topeMes: true };
}

type ConLikes = { likes_count: number | null };
type Par = { p: ConLikes; n: ConLikes };

export type EvaluacionFeed =
  | { ok: true }
  | { ok: false; motivo: 'incompleto' | 'degradado'; detalle: string };

// ⛔ ESCUDO CONTRA EL FEED DEGRADADO O A MEDIAS (medido 2026-09-17). La primera
// pasada sobre Iker escribio likes=0 en ~100 posts (el del 01/09 paso de 301 a
// 0) mientras las impresiones llegaban bien. `viejos` son los posts de la BD
// que estan en la ventana; `pares` los que han aparecido en el feed, con su
// lectura nueva.
export function evaluarFeed(viejos: ConLikes[], pares: Par[]): EvaluacionFeed {
  if (viejos.length === 0) return { ok: true };
  if (pares.length / viejos.length < MIN_COBERTURA) {
    return { ok: false, motivo: 'incompleto', detalle: `${pares.length}/${viejos.length} posts encontrados en el feed` };
  }
  const conLikes = pares.filter(({ p }) => Number(p.likes_count) > 0);
  const ceros = conLikes.filter(({ n }) => !(Number(n.likes_count) > 0));
  if (conLikes.length > 0 && ceros.length / conLikes.length > MAX_CEROS) {
    return { ok: false, motivo: 'degradado', detalle: `${ceros.length}/${conLikes.length} posts con likes a 0` };
  }
  return { ok: true };
}

// Un 0 (o null) nunca pisa un valor real, contador a contador: un post no
// pierde todos sus likes de golpe, eso es Unipile fallando. Una bajada real
// (de 5 a 3) si se escribe.
export function contadorReal(nuevo: unknown, viejo: unknown): number {
  return Number(nuevo) > 0 ? Number(nuevo) : Number(viejo) || 0;
}
