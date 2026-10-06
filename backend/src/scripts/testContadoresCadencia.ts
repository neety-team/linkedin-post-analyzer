// Test de la logica pura del pase de contadores de posts viejos
// (services/contadoresCadencia.ts). Se corre con:
//   npx tsx backend/src/scripts/testContadoresCadencia.ts
import assert from 'node:assert/strict';
import {
  enVentana, proximoPase, evaluarFeed, contadorReal,
  CORTA_MAX_DIAS, CORTA_CADA_HORAS, CORTA_REINTENTO_HORAS, LARGA_CADA_DIAS, LARGA_REINTENTO_HORAS,
} from '../services/contadoresCadencia';

const ahora = new Date('2026-10-06T10:00:00Z');
const hace = (dias: number) => new Date(ahora.getTime() - dias * 24 * 3600 * 1000);

// 1. Ventanas por edad. La corta son los posts de 7 a 90 dias (siguen vivos);
//    la larga, TODOS los de mas de 7 dias (el feed entero ya esta en la mano).
assert.equal(enVentana(hace(3), 'corta', ahora), false, 'un post de 3 dias lo lleva el tick de snapshots');
assert.equal(enVentana(hace(3), 'larga', ahora), false);
assert.equal(enVentana(hace(7), 'corta', ahora), false, 'justo 7 dias aun es del tick');
assert.equal(enVentana(hace(10), 'corta', ahora), true);
assert.equal(enVentana(hace(10), 'larga', ahora), true);
assert.equal(enVentana(hace(CORTA_MAX_DIAS), 'corta', ahora), true, 'el dia 90 todavia entra en la corta');
assert.equal(enVentana(hace(100), 'corta', ahora), false);
assert.equal(enVentana(hace(100), 'larga', ahora), true);
assert.equal(enVentana(hace(400), 'larga', ahora), true, 'la larga no tiene techo de edad');

// 2. Cuando toca el siguiente pase. La corta cada 24h (3h si fallo); la larga
//    cada 7 dias con tope en el dia 1 del mes (24h si fallo).
assert.deepEqual(proximoPase('corta', false), { horas: CORTA_CADA_HORAS, topeMes: false });
assert.deepEqual(proximoPase('corta', true), { horas: CORTA_REINTENTO_HORAS, topeMes: false });
assert.deepEqual(proximoPase('larga', false), { horas: LARGA_CADA_DIAS * 24, topeMes: true });
assert.deepEqual(proximoPase('larga', true), { horas: LARGA_REINTENTO_HORAS, topeMes: false });
assert.ok(CORTA_CADA_HORAS <= 24, 'Iker, 2026-10-06: un post de menos de 90 dias se mira como minimo a diario');
assert.ok(LARGA_CADA_DIAS <= 7, 'y uno viejo como minimo cada semana');

// 3. Escudo contra el feed degradado o a medias (medido 2026-09-17).
const viejo = (likes: number) => ({ likes_count: likes });
const par = (viejoLikes: number, nuevoLikes: number) => ({ p: viejo(viejoLikes), n: viejo(nuevoLikes) });
assert.deepEqual(evaluarFeed([], []), { ok: true }, 'sin posts viejos no hay nada que comprobar');
assert.equal(evaluarFeed([viejo(5), viejo(5)], []).ok, false, 'ningun post encontrado = incompleto');
assert.equal((evaluarFeed([viejo(5), viejo(5)], []) as any).motivo, 'incompleto');
const diez = Array.from({ length: 10 }, () => viejo(5));
assert.equal(evaluarFeed(diez, Array.from({ length: 6 }, () => par(5, 5))).ok, false, '6/10 encontrados: incompleto');
assert.equal(evaluarFeed(diez, Array.from({ length: 7 }, () => par(5, 5))).ok, true, '7/10 encontrados: vale');
const dosCeros = [...Array.from({ length: 8 }, () => par(5, 6)), par(5, 0), par(5, 0)];
assert.equal(evaluarFeed(diez, dosCeros).ok, false, '2 de 10 con likes a 0: feed degradado');
assert.equal((evaluarFeed(diez, dosCeros) as any).motivo, 'degradado');
const unCero = [...Array.from({ length: 9 }, () => par(5, 6)), par(5, 0)];
assert.equal(evaluarFeed(diez, unCero).ok, true, '1 de 10 a 0 es un fallo puntual: se escribe (ese post no pierde sus likes)');
const sinLikesAntes = Array.from({ length: 10 }, () => par(0, 0));
assert.equal(evaluarFeed(Array.from({ length: 10 }, () => viejo(0)), sinLikesAntes).ok, true, 'posts que nunca tuvieron likes no cuentan como degradados');

// 4. Un 0 nunca pisa un valor real, contador a contador.
assert.equal(contadorReal(0, 5), 5);
assert.equal(contadorReal(null, 5), 5);
assert.equal(contadorReal(7, 5), 7);
assert.equal(contadorReal(3, 5), 3, 'una bajada real (likes retirados) si se escribe');
assert.equal(contadorReal(null, null), 0);

console.log('✅ testContadoresCadencia: todo OK');
