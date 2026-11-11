// Test de la logica de hitos. Se corre con:  cd backend && npx tsx src/services/hitos.test.ts
import assert from 'node:assert/strict';
import { umbralesSeguidores, umbralesImpresiones, cruces, acumular } from './hitos';

// Umbrales
assert.deepEqual(umbralesSeguidores(4_738), [1_000, 2_500]);
assert.deepEqual(umbralesSeguidores(10_130), [1_000, 2_500, 5_000, 7_500, 10_000]);
assert.deepEqual(umbralesSeguidores(21_000).slice(-2), [15_000, 20_000]);
assert.deepEqual(umbralesImpresiones(4_598_850), [1_000_000, 2_000_000, 3_000_000, 4_000_000]);
assert.deepEqual(umbralesImpresiones(999_999), []);

// Lo ya superado al empezar a medir no cuenta (la serie de Iker arranca en 7.053)
const iker = [
  { dia: '2026-04-11', valor: 0 },
  { dia: '2026-04-12', valor: 7_053 },
  { dia: '2026-10-24', valor: 9_998 },
  { dia: '2026-10-25', valor: 10_004 },
];
// 1.000, 2.500 y 5.000 no salen; 7.500 y 10.000 si, porque se vieron pasar
assert.deepEqual(cruces(iker, umbralesSeguidores(10_004)), [
  { valor: 7_500, dia: '2026-10-24' },
  { valor: 10_000, dia: '2026-10-25' },
]);

// Dos umbrales el mismo dia
assert.deepEqual(
  cruces([{ dia: '2026-01-01', valor: 900 }, { dia: '2026-01-02', valor: 2_600 }], [1_000, 2_500]),
  [{ valor: 1_000, dia: '2026-01-02' }, { valor: 2_500, dia: '2026-01-02' }],
);

// Baja y vuelve a subir: cuenta una vez, la primera
assert.deepEqual(
  cruces(
    [
      { dia: '2026-01-01', valor: 9_900 },
      { dia: '2026-01-02', valor: 10_010 },
      { dia: '2026-01-03', valor: 9_990 },
      { dia: '2026-01-04', valor: 10_020 },
    ],
    [10_000],
  ),
  [{ valor: 10_000, dia: '2026-01-02' }],
);

// Serie vacia o toda a cero
assert.deepEqual(cruces([], [1_000]), []);
assert.deepEqual(cruces([{ dia: '2026-01-01', valor: 0 }], [1_000]), []);

// Acumulado de impresiones, desordenado de entrada
const acum = acumular([
  { dia: '2026-01-02', valor: 600_000 },
  { dia: '2026-01-01', valor: 500_000 },
  { dia: '2026-01-03', valor: 10 },
]);
assert.deepEqual(acum.map((p) => p.valor), [500_000, 1_100_000, 1_100_010]);
assert.deepEqual(cruces(acum, umbralesImpresiones(1_100_010)), [{ valor: 1_000_000, dia: '2026-01-02' }]);

console.log('✅ hitos: todos los casos pasan');
