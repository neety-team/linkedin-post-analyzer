// Test de la hora de Madrid. Sin runner en el frontend, se corre con el tsx del backend,
// y en cualquier zona del navegador (por eso se prueba con TZ distintas):
//   cd backend && TZ=America/New_York npx tsx ../frontend/src/utils/horaMadrid.test.ts
import assert from 'node:assert/strict';
import { instanteMadrid, cuandoMadrid, horaMadrid } from './horaMadrid';

// Invierno: Madrid va UTC+1
assert.equal(instanteMadrid('2026-11-19', '08:30')?.toISOString(), '2026-11-19T07:30:00.000Z');
// Verano: UTC+2
assert.equal(instanteMadrid('2026-07-02', '08:30')?.toISOString(), '2026-07-02T06:30:00.000Z');
// Los dias del cambio de hora
assert.equal(instanteMadrid('2026-03-29', '08:30')?.toISOString(), '2026-03-29T06:30:00.000Z');
assert.equal(instanteMadrid('2026-10-25', '08:30')?.toISOString(), '2026-10-25T07:30:00.000Z');
// Medianoche y fin de dia
assert.equal(instanteMadrid('2026-11-19', '00:00')?.toISOString(), '2026-11-18T23:00:00.000Z');
assert.equal(instanteMadrid('2026-11-19', '23:59')?.toISOString(), '2026-11-19T22:59:00.000Z');
// No validos
assert.equal(instanteMadrid('2026-11-19', '25:00'), null);
assert.equal(instanteMadrid('19/11/2026', '08:30'), null);
assert.equal(instanteMadrid('2026-11-19', ''), null);

// Lo que se lee en la pagina
assert.equal(cuandoMadrid('2026-11-19T07:30:00.000Z'), 'jue 19 nov, 08:30');
assert.equal(horaMadrid('2026-07-02T06:30:00.000Z'), '08:30');

console.log('horaMadrid: todo OK');
