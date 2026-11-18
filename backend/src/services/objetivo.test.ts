// Test de la regla objetivo-por-pilar. Se corre con:  cd backend && npx tsx src/services/objetivo.test.ts
import assert from 'node:assert/strict';
import { objetivoPorPilar, esObjetivo, sqlObjetivoLateral } from './objetivo';

assert.equal(objetivoPorPilar('meme'), 'alcance');
assert.equal(objetivoPorPilar('meme_captura'), 'alcance');
assert.equal(objetivoPorPilar('peloteo_mapa'), 'alcance');
assert.equal(objetivoPorPilar('peloteo_los10'), 'alcance');
assert.equal(objetivoPorPilar('evento'), 'notoriedad');
assert.equal(objetivoPorPilar('historia_evento'), 'notoriedad');
assert.equal(objetivoPorPilar('historia'), 'conversion');
assert.equal(objetivoPorPilar('lead_magnet'), 'conversion');
assert.equal(objetivoPorPilar('otro'), null);
assert.equal(objetivoPorPilar('tarjeta'), null);
assert.equal(objetivoPorPilar(null), null);
// "memento" no es un meme: el prefijo es meme_ con guion bajo
assert.equal(objetivoPorPilar('memento'), null);

assert.ok(esObjetivo('notoriedad'));
assert.ok(!esObjetivo('leads'));

// El SQL lleva la misma regla que la funcion
const sql = sqlObjetivoLateral();
for (const trozo of ["'historia_evento'", "'lead_magnet', 'historia'", "LIKE 'meme\\_%'", "LIKE 'peloteo\\_%'", "'2026-04-14'"]) {
  assert.ok(sql.includes(trozo), `falta ${trozo} en el SQL`);
}
console.log('objetivo: OK');
