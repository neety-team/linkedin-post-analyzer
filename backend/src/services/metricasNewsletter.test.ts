// Test del cálculo de métricas. Se corre con:  cd backend && npx tsx src/services/metricasNewsletter.test.ts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  calcularMetricas, esEnlaceDeBaja, estadoMetricas, fusionarClics, barrerContactos, barrerClics, refrescarMetricas,
  leerCampana, brazosAB,
} from './metricasNewsletter';

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



// ---- Brevo con un fetcher falso ----
const res = (status: number, body: unknown) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

(async () => {
  const c1 = { email: 'a@x.com', url: 'https://neety.com/a', t: '2026-11-17T09:00:00.000Z' };
  const c2 = { email: 'b@x.com', url: 'https://neety.com/b', t: '2026-11-17T10:00:00.000Z' };
  assert.deepEqual(fusionarClics([c1], [], false), [c1]);
  assert.deepEqual(fusionarClics([c1], [c2], true), [c2]);
  assert.deepEqual(fusionarClics([c1], [c1, c2], false), [c1, c2]);

  // (a) y (b) y (c): la lectura pide globalStats y linksStats, y el clic sale de linksStats/contactos, no de uniqueClicks
  const urls: string[] = [];
  const campana = (stats: string) => ({
    id: 36, status: 'sent', sentDate: f.sentDate, recipients: { lists: [7, 9] },
    statistics: stats === 'globalStats' ? { globalStats: f.globalStats } : { linksStats: f.linksStats },
  });
  const f1 = (async (u: any) => {
    urls.push(String(u));
    const m = String(u).match(/statistics=(\w+)/);
    return res(200, campana(m![1]));
  }) as typeof fetch;
  const lec = await leerCampana(36, f1);
  assert.ok(urls.some((u) => u.includes('/emailCampaigns/36?statistics=globalStats')));
  assert.ok(urls.some((u) => u.includes('/emailCampaigns/36?statistics=linksStats')));
  assert.deepEqual(lec.datos.listas, [7, 9]);
  assert.equal(lec.status, 'sent');
  assert.equal(lec.datos.global.uniqueClicks, 4);
  assert.equal(lec.datos.ab, undefined);
  // uniqueClicks (4) nunca es la cifra de clic: sin clics por contacto, personas = 0
  assert.equal(calcularMetricas(lec.datos.global, lec.datos.sentDate, []).personas, 0);

  // A/B defensivo
  assert.equal(brazosAB({}), undefined);
  assert.equal(brazosAB({ abTestCampaignResult: { winningVersion: 'A' } }), undefined);
  const ab = brazosAB({
    subjectA: 'Uno', subjectB: 'Dos',
    abTestCampaignResult: { statistics: { openers: { subjectA: [1, 2], subjectB: 5 }, clicks: { subjectA: 1, subjectB: [1, 2, 3] }, delivered: { subjectA: 90, subjectB: 91 } } },
  });
  assert.deepEqual(ab, { a: { asunto: 'Uno', entregados: 90, aperturas: 2, clics: 1 }, b: { asunto: 'Dos', entregados: 91, aperturas: 5, clics: 3 } });

  // (b) los contactos salen de las listas de la campaña; el barrido pagina y filtra campañas ajenas
  const llamadas: string[] = [];
  const f2 = (async (u: any, init: any) => {
    const url = String(u);
    llamadas.push(url);
    assert.equal(init.headers['api-key'], 'k');
    assert.equal(init.headers.accept, 'application/json');
    if (url.startsWith('https://api.brevo.com/v3/contacts/lists/7/contacts')) {
      return res(200, { contacts: [{ email: 'P@x.com' }, { email: 'q@x.com' }] });
    }
    if (url.includes('/contacts/p%40x.com')) {
      return res(200, { statistics: { clicked: [
        { campaignId: 36, links: [{ url: 'https://neety.com/a', eventTime: '2026-11-17T09:00:00.000Z' }] },
        { campaignId: 99, links: [{ url: 'https://otra.com', eventTime: '2026-11-17T09:00:00.000Z' }] },
      ] } });
    }
    return res(200, { statistics: {} });
  }) as typeof fetch;
  process.env.BREVO_API_KEY = 'k';
  const ok = await barrerContactos([7], new Set([36]), f2, 0);
  assert.equal(ok.completado, true);
  assert.equal(ok.contactos, 2);
  assert.deepEqual(ok.clics, [{ campaign_id: 36, email: 'p@x.com', url: 'https://neety.com/a', t: '2026-11-17T09:00:00.000Z' }]);
  assert.ok(llamadas[0].includes('/contacts/lists/7/contacts?limit=500&offset=0'));

  // 429 a la tercera llamada a /contacts/{email}: error con 429 y lo leído se conserva
  let n = 0;
  const f3 = (async (u: any) => {
    const url = String(u);
    if (url.includes('/contacts/lists/')) return res(200, { contacts: ['a', 'b', 'c', 'd'].map((x) => ({ email: `${x}@x.com` })) });
    n++;
    if (n === 3) return res(429, {});
    return res(200, { statistics: { clicked: [{ campaignId: 36, links: [{ url: 'https://neety.com/a', eventTime: '2026-11-17T09:00:00.000Z' }] }] } });
  }) as typeof fetch;
  const cortado = await barrerContactos([7], new Set([36]), f3, 0);
  assert.equal(cortado.completado, false);
  assert.ok(cortado.error!.includes('429'));
  assert.equal(cortado.contactos, 2);
  assert.equal(cortado.clics.length, 2);

  // Sin clave, nada se llama (ni se toca la base de datos)
  delete process.env.BREVO_API_KEY;
  let llamado = false;
  const f4 = (async () => { llamado = true; return res(200, {}); }) as typeof fetch;
  assert.deepEqual(await barrerClics({ fetcher: f4 }), { contactos: 0, error: null });
  assert.deepEqual(await refrescarMetricas({ fetcher: f4 }), { campanas: 0, error: null });
  assert.equal(llamado, false);

  console.log('metricasNewsletter: OK');
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
