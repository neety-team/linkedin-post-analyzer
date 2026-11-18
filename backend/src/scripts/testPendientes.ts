/**
 * «Qué falta para publicarlo» como lista confirmable, contra un Postgres LOCAL.
 *
 *   DATABASE_URL=postgres://prueba@localhost:5544/neety_lpa_prueba npx tsx src/scripts/testPendientes.ts
 *
 * Usa la semana 2099-W02, que borra al empezar y al acabar.
 */
if (!/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL || '')) {
  console.error('Esta prueba solo corre contra un Postgres local (DATABASE_URL con localhost).');
  process.exit(1);
}
import pool from '../db';
import { runMigrations } from '../db/migrate';
import {
  guardarSemana,
  leerSemana,
  programarPosts,
  responderPendiente,
  listarPendientesRespondidos,
  motivoNoProgramable,
  motivoParaPublicar,
} from '../services/semana';
import { prepararPublicacion } from '../services/publicadorLinkedin';

const S = '2099-W02';
let fallos = 0;
const ok = (c: boolean, m: string) => {
  console.log(`${c ? 'OK ' : 'FALLO'} ${m}`);
  if (!c) fallos++;
};
async function lanza(f: () => Promise<unknown>, contiene: string, m: string) {
  try {
    await f();
    ok(false, `${m} (no ha lanzado)`);
  } catch (e: any) {
    ok(String(e?.message).includes(contiene), `${m} → «${e?.message}»`);
  }
}
const post = async (clave: string) =>
  (await leerSemana(S))!.posts.find((p: any) => p.clave === clave) as any;
const enSegundos = (s: number) => new Date(Date.now() + s * 1000).toISOString();

const LIMPIO = 'Un post sin huecos.\n\nhttps://neety.com';
const base = { fecha: '2099-01-06', cuenta: 'unai', objetivo: 'notoriedad', titulo: 't', texto: LIMPIO };

async function main() {
  await runMigrations();
  await pool.query(`DELETE FROM semanas WHERE semana = $1`, [S]);

  await guardarSemana(S, {
    posts: [
      {
        clave: 'evento', ...base, estado: 'escrito', falta: 'Una nota que ya no bloquea',
        pendientes: [
          { id: 'unai-va', texto: '¿Unai va al evento?', tipo: 'check', quien: 'unai' },
          { id: 'ok-iker', texto: 'Tu visto bueno', quien: 'iker' },
        ],
      },
      {
        clave: 'charla', ...base, estado: 'a_medias',
        pendientes: [{ id: 'que-contaste', texto: 'Qué contaste en el evento', tipo: 'texto', quien: 'unai' }],
      },
      { clave: 'solo-falta', ...base, estado: 'escrito', falta: 'Su visto bueno.' },
      {
        clave: 'retirar', ...base, estado: 'escrito',
        pendientes: [{ texto: '¿Sale al final la feria?', quien: 'asier' }],
      },
    ] as any,
  });

  // ── El candado con pendientes
  let ev = await post('evento');
  ok(ev.pendientes.length === 2 && ev.pendientes[0].estado === 'pendiente', 'el GET devuelve los pendientes');
  ok(ev.motivo_no_programable === 'Falta: ¿Unai va al evento? (y 1 más)', `bloquea por el primero: ${ev.motivo_no_programable}`);
  ok(!String(ev.motivo_no_programable).includes('nota'), 'con pendientes, `falta` es solo una nota');
  await lanza(() => programarPosts(S, [{ id: ev.id, programado_para: enSegundos(600) }]), '¿Unai va', 'el servidor no lo programa');
  ok(
    !!motivoParaPublicar(LIMPIO, [], null, ev.pendientes),
    'el publicador también lo bloquea'
  );
  let pub: string | null = null;
  try {
    prepararPublicacion({ cuenta: 'unai', texto: LIMPIO, menciones: [], pendientes: ev.pendientes, account_id: 'x' });
  } catch (e: any) {
    pub = e.message;
  }
  ok(String(pub).includes('¿Unai va'), `prepararPublicacion lo rechaza: ${pub}`);
  const retirar = await post('retirar');
  ok(retirar.pendientes[0].id === 'sale-al-final-la', `sin id, sale uno del texto: ${retirar.pendientes[0].id}`);

  // ── check sí → hecho; el último → aprobado y programable
  await lanza(() => responderPendiente(ev.id, 'unai-va', 'si', ''), 'Falta quién', 'sin autor no se responde');
  await lanza(() => responderPendiente(ev.id, 'unai-va', 'quizá', 'Unai'), 'sí» o «no', 'un check solo admite sí o no');
  await lanza(() => responderPendiente(ev.id, 'no-existe', 'si', 'Unai'), 'ya no está', 'un pendiente que no existe');
  ev = await responderPendiente(ev.id, 'unai-va', 'sí', 'Unai Ruiz');
  const unaiVa = ev.pendientes.find((q: any) => q.id === 'unai-va');
  ok(unaiVa.estado === 'hecho' && unaiVa.por === 'Unai Ruiz' && !!unaiVa.at, 'check sí → hecho, con quién y cuándo');
  ok(ev.estado === 'escrito' && ev.motivo_no_programable === 'Falta: Tu visto bueno', `sigue bloqueado por el otro: ${ev.motivo_no_programable}`);
  await lanza(() => responderPendiente(ev.id, 'unai-va', 'no', 'Unai'), 'ya está hecho', 'lo hecho no se vuelve a responder');
  ev = await responderPendiente(ev.id, 'ok-iker', 'si', 'Iker');
  ok(ev.estado === 'aprobado', `el último hecho → aprobado (${ev.estado})`);
  ok(ev.motivo_no_programable === null, `y programable: ${ev.motivo_no_programable}`);
  const r = await programarPosts(S, [{ id: ev.id, programado_para: enSegundos(600) }]);
  ok(r.programados.length === 1, 'se programa');

  // ── check no → respondido y sigue bloqueado
  let ret = await responderPendiente(retirar.id, 'sale-al-final-la', 'no', 'Asier');
  const q = ret.pendientes[0];
  ok(q.estado === 'respondido' && q.respuesta === 'no' && q.por === 'Asier', 'check no → respondido con «no»');
  ok(ret.estado === 'escrito', 'no se aprueba');
  ok(String(ret.motivo_no_programable).includes('Asier ha dicho que no'), `sigue bloqueado: ${ret.motivo_no_programable}`);

  // ── texto → respondido y bloqueado; marcarlo hecho por el PUT lo desbloquea
  let ch = await post('charla');
  ch = await responderPendiente(ch.id, 'que-contaste', 'Hablé de cómo prospectamos en ferias.', 'Unai');
  ok(ch.pendientes[0].estado === 'respondido' && ch.pendientes[0].respuesta.startsWith('Hablé'), 'texto → respondido con su respuesta');
  const candadoCh = motivoParaPublicar(LIMPIO, [], null, ch.pendientes);
  ok(String(candadoCh).includes('a la espera de meterlo'), `sigue bloqueado: ${candadoCh}`);
  const resp = await listarPendientesRespondidos({ semana: S });
  ok(resp.length === 2 && resp.some((x) => x.clave === 'charla') && resp.some((x) => x.clave === 'retirar'),
    `la rutina de feedback ve los respondidos (${resp.length})`);
  await lanza(() => responderPendiente(ch.id, 'que-contaste', '   ', 'Unai'), 'vacía', 'una respuesta vacía no vale');

  // ── Un PUT que no pisa respuestas
  await guardarSemana(S, {
    posts: [{ clave: 'charla', pendientes: [{ id: 'que-contaste', texto: 'Qué contaste en la charla', tipo: 'texto', quien: 'unai', estado: 'pendiente' }] }] as any,
  });
  ch = await post('charla');
  ok(ch.pendientes[0].estado === 'respondido' && ch.pendientes[0].respuesta.startsWith('Hablé') && ch.pendientes[0].texto === 'Qué contaste en la charla',
    'un PUT con la lista no pisa estado ni respuesta (sí el texto)');
  await guardarSemana(S, { posts: [{ clave: 'charla', titulo: 'Otro título' }] as any });
  ch = await post('charla');
  ok(ch.pendientes.length === 1 && ch.pendientes[0].estado === 'respondido', 'un PUT sin pendientes los conserva');
  await guardarSemana(S, { posts: [{ clave: 'charla', pendientes: [] }] as any });
  ch = await post('charla');
  ok(ch.pendientes.length === 1 && ch.pendientes[0].respuesta.startsWith('Hablé'), 'una lista vacía no se lleva lo ya respondido');

  // Claude lo mete en el post y lo marca hecho
  await guardarSemana(S, {
    posts: [{ clave: 'charla', texto: LIMPIO + '\nEn la charla hablé de ferias.', pendientes: [{ id: 'que-contaste', texto: 'Qué contaste en la charla', tipo: 'texto', estado: 'hecho' }] }] as any,
  });
  ch = await post('charla');
  ok(ch.pendientes[0].estado === 'hecho' && ch.pendientes[0].respuesta.startsWith('Hablé') && ch.pendientes[0].por === 'Claude',
    'marcado hecho por el PUT, conserva la respuesta');
  ok(ch.estado === 'aprobado' && ch.motivo_no_programable === null, `y queda aprobado y programable (${ch.estado})`);

  // Con hueco no se aprueba solo
  await guardarSemana(S, {
    posts: [{ clave: 'hueco', ...base, texto: 'Fuimos a [FERIA]', estado: 'escrito', pendientes: [{ id: 'x', texto: '¿Seguro?' }] }] as any,
  });
  const hu = await responderPendiente((await post('hueco')).id, 'x', 'si', 'Iker');
  ok(hu.estado === 'escrito' && String(hu.motivo_no_programable).includes('huecos'), `con hueco no se aprueba: ${hu.motivo_no_programable}`);

  // Un PUT que quita lo que nadie ha contestado
  await guardarSemana(S, { posts: [{ clave: 'retirar', pendientes: [{ id: 'nuevo', texto: 'Otra cosa' }] }] as any });
  ret = await post('retirar');
  ok(ret.pendientes.map((x: any) => x.id).join(',') === 'nuevo,sale-al-final-la', `nuevo primero y lo respondido al final: ${ret.pendientes.map((x: any) => x.id)}`);
  await guardarSemana(S, { posts: [{ clave: 'retirar', pendientes: [{ id: 'sale-al-final-la', texto: '¿Sale al final la feria?' }] }] as any });
  ret = await post('retirar');
  ok(ret.pendientes.length === 1 && ret.pendientes[0].respuesta === 'no', 'lo no contestado que no viene se quita');
  await lanza(() => guardarSemana(S, { posts: [{ clave: 'retirar', pendientes: [{ texto: 'a', tipo: 'foto' }] }] as any }), 'Tipo', 'un tipo no válido se rechaza');

  // ── `falta` sin pendientes bloquea como antes
  const sf = await post('solo-falta');
  ok(sf.motivo_no_programable === 'Falta: Su visto bueno.', `«Qué falta» sin lista bloquea: ${sf.motivo_no_programable}`);
  ok(motivoNoProgramable({ estado: 'escrito', texto: 'Hola', falta: 'Algo', pendientes: [] }) === 'Falta: Algo', 'lista vacía → manda `falta`');
  ok(motivoNoProgramable({ estado: 'escrito', texto: 'Hola', falta: 'Algo', pendientes: [{ id: 'a', texto: 'x', tipo: 'check', quien: null, estado: 'hecho', respuesta: 'sí', por: 'Iker', at: null }] }) === null,
    'con todo hecho, `falta` no bloquea');

  await pool.query(`DELETE FROM semanas WHERE semana = $1`, [S]);
}

main()
  .catch((e) => {
    console.error(e);
    fallos++;
  })
  .finally(async () => {
    await pool.query(`DELETE FROM semanas WHERE semana = $1`, [S]).catch(() => {});
    await pool.end();
    if (fallos) {
      console.log(`\n${fallos} fallo(s)`);
      process.exit(1);
    }
    console.log('\nTodo OK');
  });
