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
  assert.deepEqual(fusionarClics([c1], [c2], true), [c1, c2]);
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

  // A/B: con abTesting se llama al endpoint propio y se mapea su ejemplo documentado
  const resAB = {
    clickRate: '50%', openRate: '100%', winningCriteria: 'Click', winningVersion: 'B', winningVersionRate: '0%',
    clickedLinks: { 'Version A': [{ clickRate: '0%', clicksCount: 0, link: 'https://google.com' }], 'Version B': [{ clickRate: '60%', clicksCount: 3, link: 'http://www.stackoverflow.com' }] },
    statistics: { clicks: { 'Version A': '0%', 'Version B': '50%' }, openers: { 'Version A': '20%', 'Version B': '100%' } },
  };
  assert.equal(brazosAB({ abTesting: false }, resAB), undefined);
  assert.equal(brazosAB({ abTesting: true }, {}), undefined);
  assert.deepEqual(brazosAB({ abTesting: true, subjectA: 'Uno', subjectB: 'Dos' }, resAB), {
    a: { asunto: 'Uno', apertura: 0.2, clic: 0 },
    b: { asunto: 'Dos', apertura: 1, clic: 0.5 },
  });
  const urlsAB: string[] = [];
  const fAB = (async (u: any) => {
    const x = String(u);
    urlsAB.push(x);
    if (x.includes('/abTestCampaignResult')) return res(200, resAB);
    return res(200, { status: 'sent', abTesting: true, subjectA: 'Uno', subjectB: 'Dos', sentDate: f.sentDate, recipients: { lists: [7] }, statistics: { globalStats: f.globalStats, linksStats: {} } });
  }) as typeof fetch;
  const lab = await leerCampana(36, fAB);
  assert.ok(urlsAB.some((u) => u.endsWith('/emailCampaigns/36/abTestCampaignResult')));
  assert.equal(lab.datos.ab!.b.asunto, 'Dos');
  assert.equal(lab.datos.ab!.b.apertura, 1);
  assert.equal(brazosAB({ abTesting: true, subjectA: 'x' }, { statistics: { openers: { 'Version A': 'raro', 'Version B': '10%' } } })!.a.apertura, null);

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

  // Dos barridos a la vez: el segundo sale sin llamar a nada (base de datos simulada con una campaña)
  process.env.BREVO_API_KEY = 'k';
  const pool = (await import('../db')).default as any;
  const queryOrig = pool.query.bind(pool);
  pool.query = async () => ({ rows: [{ id: 36 }] });
  let calls = 0;
  const lento = (async () => { calls++; await new Promise((r) => setTimeout(r, 50)); return res(200, {}); }) as typeof fetch;
  const lentoPool = pool.connect;
  pool.connect = async () => ({ query: async () => ({ rows: [] }), release() {} });
  const [r1, r2] = await Promise.all([barrerClics({ fetcher: lento, pausaMs: 0 }), barrerClics({ fetcher: lento, pausaMs: 0 })]);
  pool.query = queryOrig; pool.connect = lentoPool;
  assert.equal(r1.error, null);
  assert.deepEqual(r2, { contactos: 0, error: null });
  assert.equal(calls, 1, 'solo el primer barrido lee la campaña; el segundo no llama a nada');
  delete process.env.BREVO_API_KEY;

  console.log('metricasNewsletter: OK');
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
