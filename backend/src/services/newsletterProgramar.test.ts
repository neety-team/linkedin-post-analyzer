// Test de retirar, automáticos y programar en Brevo (2026-11-27). Sin base de datos ni red:
//   cd backend && npx tsx src/services/newsletterProgramar.test.ts
import assert from 'node:assert/strict';
import {
  motivoNoRetirable,
  separarCorreos,
  campanaBrevo,
  horaMadridAIso,
  estadoTrasReescribir,
} from './newsletter';

// Retirar: idea, borrador, aprobado y automático sí; programado o enviado, no.
for (const estado of ['idea', 'borrador', 'aprobado', 'automatico']) assert.equal(motivoNoRetirable({ estado }), null, estado);
assert.match(motivoNoRetirable({ estado: 'programado' })!, /Brevo/);
assert.match(motivoNoRetirable({ estado: 'enviado' })!, /enviado/);

// La lista de la página: retirados fuera, automáticos aparte, enviados aparte.
const s = separarCorreos([
  { clave: 'a', estado: 'borrador' }, { clave: 'b', estado: 'retirado' }, { clave: 'c', estado: 'automatico' },
  { clave: 'd', estado: 'enviado' }, { clave: 'e', estado: 'programado' },
]);
assert.deepEqual(s.proximos.map((c: any) => c.clave), ['a', 'e']);
assert.deepEqual(s.automaticos.map((c: any) => c.clave), ['c']);
assert.deepEqual(s.enviados.map((c: any) => c.clave), ['d']);

// Un automático sigue siéndolo al reescribirlo.
assert.equal(estadoTrasReescribir({ estado: 'automatico', huella: 'x' }, 'y'), 'automatico');

// La hora de Madrid, con su desfase (invierno +01:00, verano +02:00).
assert.equal(horaMadridAIso('2026-12-01', '09:05'), '2026-12-01T09:05:00+01:00');
assert.equal(horaMadridAIso('2027-06-01', '09:05'), '2027-06-01T09:05:00+02:00');

const ahora = new Date('2026-11-27T10:00:00+01:00');
const HTML = '<html><body><p>Hola.</p><p>¿Prefieres que no te escriba más? <a href="#" style="color:#8a7f86;">Date de baja aquí</a></p></body></html>';
const base = {
  clave: 'aviso-2026-W49', estado: 'aprobado', remitente: 'Iker', asunto: 'a', asunto_b: null, preview: 'p',
  html: HTML, fecha: '2026-12-09', hora: '09:05', listas: [15, 16, 19], excluir: [24],
};

// La campaña: remitente, respuesta a Iker, listas, fecha y el enlace de baja de Brevo.
const c = campanaBrevo(base, ahora) as any;
assert.ok(!('motivo' in c), JSON.stringify(c));
assert.deepEqual(c.sender, { name: 'Iker de Neety', email: 'hola@neety.com' });
assert.equal(c.replyTo, 'iker@neety.com');
assert.deepEqual(c.recipients, { listIds: [15, 16, 19], exclusionListIds: [24] });
assert.equal(c.scheduledAt, '2026-12-09T09:05:00+01:00');
assert.equal(c.subject, 'a');
assert.equal(c.previewText, 'p');
assert.equal(c.name, 'aviso-2026-W49');
assert.ok(c.htmlContent.includes('href="{{ unsubscribe }}"'), 'el enlace de baja lo pone Brevo');
assert.ok(!c.htmlContent.includes('href="#"'));
assert.equal(c.abTesting, undefined);

// Con asunto B: A/B 50/50.
const ab = campanaBrevo({ ...base, asunto_b: 'b' }, ahora) as any;
assert.equal(ab.abTesting, true);
assert.equal(ab.subjectA, 'a');
assert.equal(ab.subjectB, 'b');
assert.equal(ab.splitRule, 50);
assert.equal(ab.subject, undefined);

// El Radar sale como «Radar de Neety».
assert.equal((campanaBrevo({ ...base, remitente: 'Radar' }, ahora) as any).sender.name, 'Radar de Neety');

// Lo que no se programa, y por qué.
const motivo = (x: any) => ('motivo' in x ? x.motivo : '');
assert.match(motivo(campanaBrevo({ ...base, estado: 'borrador' }, ahora)), /aprobado/);
assert.match(motivo(campanaBrevo({ ...base, listas: [] }, ahora)), /lista/);
assert.match(motivo(campanaBrevo({ ...base, listas: null }, ahora)), /lista/);
assert.match(motivo(campanaBrevo({ ...base, html: null }, ahora)), /HTML/);
assert.match(motivo(campanaBrevo({ ...base, fecha: null }, ahora)), /fecha/);
assert.match(motivo(campanaBrevo({ ...base, fecha: '2026-11-27', hora: '10:05' }, ahora)), /pasado|antes/);
assert.match(motivo(campanaBrevo({ ...base, remitente: null }, ahora)), /remitente/);

console.log('newsletterProgramar.test.ts: OK');
