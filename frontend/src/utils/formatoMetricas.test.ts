// Test del formato de las métricas de la newsletter. Sin runner en el frontend,
// se corre con el tsx del backend:
//   cd backend && npx tsx ../frontend/src/utils/formatoMetricas.test.ts
import assert from 'node:assert/strict';
import { porcentaje } from './formatoMetricas';

assert.equal(porcentaje(null), '—');
assert.equal(porcentaje(0.443), '44,3 %');
assert.equal(porcentaje(0), '0,0 %');
assert.equal(porcentaje(1), '100,0 %');
assert.equal(porcentaje(undefined), '—');

console.log('formatoMetricas: ok');
