// Test de lo ya usado. Se corre con:  cd backend && npx tsx src/services/usado.test.ts
import assert from 'node:assert/strict';
import { aperturaDe, ninjaDe, desdeValido, haceDias, resumenUsado } from './usado';

const cuerpo = [
  'Lista nueva.',
  '',
  'Cada mes repasamos boletines oficiales y prensa.',
  '',
  '[GIF alegría]',
  '',
  'Quién está invirtiendo sale en prensa, qué compra no.',
  'Lo que puede comprarte, en este Excel: https://neety.com/para-ti/radar?utm_source=brevo',
  '',
  'Iker Galarza, cofundador de Neety',
].join('\n');

// La apertura es la primera línea con texto, sin el marcador del GIF.
assert.equal(aperturaDe(cuerpo), 'Lista nueva.');
assert.equal(aperturaDe('[GIF x]\n\nHola.'), 'Hola.');
assert.equal(aperturaDe(''), '');

// Las dos líneas del bloque del enlace, sin la URL ni los dos puntos.
assert.deepEqual(ninjaDe(cuerpo), [
  'Quién está invirtiendo sale en prensa, qué compra no.',
  'Lo que puede comprarte, en este Excel',
]);
assert.deepEqual(ninjaDe('sin enlace'), []);

// `desde`: la fecha pedida si es válida; si no, hace 120 días.
const hoy = new Date('2026-11-24T10:00:00Z');
assert.equal(desdeValido('2026-10-01', hoy), '2026-10-01');
assert.equal(desdeValido('ayer', hoy), haceDias(120, hoy));
assert.equal(desdeValido(undefined, hoy), '2026-07-27');

// El resumen del MCP lleva la apertura, el enlace y la región.
const r = resumenUsado({
  desde: '2026-10-01',
  correos: [{ clave: 'c15', numero: 15, fecha: '2026-11-24', estado: 'programado', remitente: 'Iker', asunto: 'x', utm_campaign: 'c', cuerpo }],
  posts: [{ clave: 'p1', semana: '2026-W48', fecha: '2026-11-25', cuenta: 'unai', pilar: 'mapa', region: 'Andalucía', estado: 'programado', titulo: 'Mapa de Andalucía', texto: '' }],
});
assert.match(r, /apertura: Lista nueva\./);
assert.match(r, /enlace: Quién está invirtiendo/);
assert.match(r, /mapa · Andalucía/);

console.log('usado.test.ts: OK');
