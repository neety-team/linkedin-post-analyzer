// Test de las utilidades de hitos. Sin runner en el frontend, se corre con el tsx del backend:
//   cd backend && npx tsx ../frontend/src/utils/hitos.test.ts
import assert from 'node:assert/strict';
import { hitosEnRango, cifraCorta, textoHito, porDia, type Hito } from './hitos';

const imp4M: Hito = { metrica: 'impresiones', valor: 4_000_000, dia: '2026-10-18', creatorId: null, creatorName: null };
const iker10K: Hito = {
  metrica: 'seguidores', valor: 10_000, dia: '2026-10-25',
  creatorId: '3d545376', creatorName: 'Iker Galarza Rodríguez',
};

// Cifra corta
assert.equal(cifraCorta(4_000_000), '4M');
assert.equal(cifraCorta(10_000), '10K');
assert.equal(cifraCorta(2_500), '2,5K');
assert.equal(cifraCorta(7_500), '7,5K');
assert.equal(cifraCorta(1_000), '1K');

// Rango: bordes incluidos, fuera excluido
assert.deepEqual(hitosEnRango([imp4M, iker10K], '2026-10-18', '2026-10-25'), [imp4M, iker10K]);
assert.deepEqual(hitosEnRango([imp4M, iker10K], '2026-10-19', '2026-11-11'), [iker10K]);
assert.deepEqual(hitosEnRango([imp4M, iker10K], '2026-11-01', '2026-11-11'), []);

// Textos
assert.equal(textoHito(imp4M).titulo, '4.000.000 impresiones');
assert.equal(textoHito(imp4M).quien, 'entre todas las cuentas');
assert.equal(textoHito(iker10K).titulo, '10.000 seguidores');
assert.equal(textoHito(iker10K).quien, 'Iker');
assert.match(textoHito(iker10K).fecha, /25 de octubre de 2026/);

// Agrupar por dia
const otro: Hito = { ...iker10K, creatorId: 'x', creatorName: 'Unai Arambarri' };
const g = porDia([imp4M, iker10K, otro]);
assert.equal(g.size, 2);
assert.equal(g.get('2026-10-25')?.length, 2);

console.log('✅ hitos (frontend): todos los casos pasan');
