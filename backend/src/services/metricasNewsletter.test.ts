// Test del cálculo de métricas. Se corre con:  cd backend && npx tsx src/services/metricasNewsletter.test.ts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { calcularMetricas, esEnlaceDeBaja, estadoMetricas } from './metricasNewsletter';

const f = JSON.parse(readFileSync(join(__dirname, 'fixtures/brevo-campana.json'), 'utf8'));
const m = calcularMetricas(f.globalStats, f.sentDate, f.clics);

assert.equal(m.enviados, 198);
assert.equal(m.entregados, 194);
assert.equal(m.rebotes, 4);
assert.equal(m.bajas, 2);
assert.equal(m.aperturas_reales, f.globalStats.uniqueViews - f.globalStats.appleMppOpens);
assert.equal(m.aperturas_reales, 50);
assert.ok(Math.abs(m.apertura_real! - 50 / 194) < 1e-9);
// Cuatro clics: el interno y el de baja quedan fuera; el de 30 s cuenta, pero marcado.
assert.equal(m.personas, 2);
assert.equal(m.personas_primer_minuto, 1);
assert.ok(Math.abs(m.clic! - 2 / 194) < 1e-9);
assert.ok(Math.abs(m.ctor! - 2 / 50) < 1e-9);

// Una persona con varios clics cuenta una vez
const dos = calcularMetricas(f.globalStats, f.sentDate, [
  { email: 'A@example.com', url: 'https://neety.com/a', t: '2026-11-17T09:00:00Z' },
  { email: 'a@example.com', url: 'https://neety.com/b', t: '2026-11-17T09:05:00Z' },
]);
assert.equal(dos.personas, 1);

// La campaña recién programada no da NaN ni 0 %
const v = calcularMetricas({ sent: 0, delivered: 0, uniqueViews: 0, appleMppOpens: 0 }, '2026-11-24T08:05:00Z', []);
assert.equal(v.apertura_real, null);
assert.equal(v.ctor, null);
assert.equal(v.clic, null);
assert.equal(v.aperturas_reales, null);
assert.equal(v.personas, 0);

assert.equal(esEnlaceDeBaja('https://x.r.sp1-brevo.net/unsubscribe/abc'), true);
assert.equal(esEnlaceDeBaja('https://preferences.brevo.com/preferences/xyz'), true);
assert.equal(esEnlaceDeBaja('https://neety.com/demo'), false);

// Sin clave
delete process.env.BREVO_API_KEY;
assert.equal(estadoMetricas().configurado, false);
process.env.BREVO_API_KEY = 'x';
assert.equal(estadoMetricas().configurado, true);
delete process.env.BREVO_API_KEY;

console.log('metricasNewsletter: OK');
