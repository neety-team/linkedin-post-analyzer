/**
 * Descartar una pregunta de «Qué falta» (2026-11-23), contra un Postgres LOCAL.
 *
 *   DATABASE_URL=postgres://prueba@localhost:5544/neety_lpa_prueba npx tsx src/scripts/testDescartar.ts
 *
 * Usa la semana 2099-W03, que borra al empezar y al acabar.
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
  desprogramarPost,
  responderPendiente,
  descartarPendientes,
  deshacerDescarte,
  motivoNoProgramable,
  motivoParaPublicar,
  mezclarPendientes,
  normalizarPendientes,
} from '../services/semana';

const S = '2099-W03';
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
const post = async (clave: string) => (await leerSemana(S))!.posts.find((p: any) => p.clave === clave) as any;
const pend = (p: any, id: string) => p.pendientes.find((x: any) => x.id === id);
const enSegundos = (s: number) => new Date(Date.now() + s * 1000).toISOString();

const LIMPIO = 'Un post sin huecos.\n\nhttps://neety.com';
const base = { fecha: '2099-01-13', cuenta: 'unai', objetivo: 'notoriedad', titulo: 't', texto: LIMPIO };

async function main() {
  await runMigrations();
  await pool.query(`DELETE FROM semanas WHERE semana = $1`, [S]);

  await guardarSemana(S, {
    posts: [
      {
        clave: 'evento', ...base, estado: 'escrito',
        pendientes: [
          { id: 'unai-va', texto: '¿Unai va al evento?', tipo: 'check', quien: 'unai' },
          { id: 'que-conto', texto: 'Qué contó en la charla', tipo: 'texto', quien: 'unai' },
        ],
      },
      {
        clave: 'tres', ...base, estado: 'escrito',
        pendientes: [
          { id: 'a', texto: 'Primera', quien: 'iker' },
          { id: 'b', texto: 'Segunda', tipo: 'texto', quien: 'asier' },
          { id: 'c', texto: 'Tercera', quien: 'unai' },
        ],
      },
      {
        clave: 'hueco', ...base, texto: 'Fuimos a [FERIA]', estado: 'escrito',
        pendientes: [{ id: 'x', texto: '¿Seguro?' }],
      },
      {
        clave: 'mcp', ...base, estado: 'escrito',
        pendientes: [
          { id: 'm1', texto: 'Uno' },
          { id: 'm2', texto: 'Dos' },
        ],
      },
    ] as any,
  });

  // ── Descartar una desbloquea esa pregunta (las demás siguen mandando)
  let ev = await post('evento');
  await lanza(() => descartarPendientes(ev.id, ['unai-va'], ''), 'quién descarta', 'sin «Soy …» no se descarta');
  ev = await descartarPendientes(ev.id, ['unai-va'], 'Iker');
  const d = pend(ev, 'unai-va');
  ok(d.estado === 'descartado' && d.descartado_por === 'Iker' && !!d.descartado_at, 'descartada, con quién y cuándo');
  ok(d.respuesta === null && d.por === null, 'descartar no se inventa una respuesta');
  ok(ev.motivo_no_programable === 'Falta: Qué contó en la charla', `ya no bloquea, sí la otra: ${ev.motivo_no_programable}`);
  ok(ev.estado === 'escrito', 'con otra abierta no se aprueba');
  await lanza(() => descartarPendientes(ev.id, ['unai-va'], 'Iker'), 'ya está descartada', 'no se descarta dos veces');
  await lanza(() => responderPendiente(ev.id, 'unai-va', 'si', 'Unai'), 'descartada', 'lo descartado no se responde');

  // ── Descartar la última aprueba (y queda programable)
  ev = await descartarPendientes(ev.id, ['que-conto'], 'Asier');
  ok(ev.estado === 'aprobado', `descartar la última → aprobado (${ev.estado})`);
  ok(ev.motivo_no_programable === null, 'y programable');
  ok(motivoParaPublicar(LIMPIO, [], 'Una nota', ev.pendientes) === null, 'el publicador tampoco lo bloquea (ni la nota de `falta`)');

  // ── Deshacer vuelve a bloquear y devuelve el post a escrito
  ev = await deshacerDescarte(ev.id, 'que-conto');
  const r = pend(ev, 'que-conto');
  ok(r.estado === 'pendiente' && r.descartado_por === undefined && r.descartado_at === undefined, 'deshacer: vuelve a pendiente sin rastro del descarte');
  ok(ev.motivo_no_programable === 'Falta: Qué contó en la charla', `vuelve a bloquear: ${ev.motivo_no_programable}`);
  ok(ev.estado === 'escrito', `y el post vuelve a escrito (${ev.estado})`);
  await lanza(() => deshacerDescarte(ev.id, 'que-conto'), 'no está descartada', 'no se deshace lo que no está descartado');
  await lanza(() => programarPosts(S, [{ id: ev.id, programado_para: enSegundos(600) }]), 'Qué contó', 'el servidor no lo programa');

  // Deshacer una respondida la devuelve a respondida
  ev = await responderPendiente(ev.id, 'que-conto', 'Hablé de ferias', 'Unai');
  ev = await descartarPendientes(ev.id, ['que-conto'], 'Iker');
  ok(ev.estado === 'aprobado', 'descartar una respondida también aprueba');
  ev = await deshacerDescarte(ev.id, 'que-conto');
  ok(pend(ev, 'que-conto').estado === 'respondido' && pend(ev, 'que-conto').respuesta === 'Hablé de ferias',
    'deshacer una respondida la deja respondida, con su respuesta');

  // ── No se deshace con el post programado
  ev = await descartarPendientes(ev.id, ['que-conto'], 'Iker');
  await programarPosts(S, [{ id: ev.id, programado_para: enSegundos(3600) }]);
  await lanza(() => deshacerDescarte(ev.id, 'que-conto'), 'programado', 'con el post programado no se deshace');
  await lanza(() => descartarPendientes(ev.id, 'abiertos', 'Iker'), 'programado', 'ni se descarta');
  ok((await desprogramarPost(ev.id)) === 'ok', 'se desprograma');
  ev = await deshacerDescarte(ev.id, 'que-conto');
  ok(pend(ev, 'que-conto').estado === 'respondido', 'desprogramado, ya se puede deshacer');

  // ── Descartar todas las que quedan de una vez
  let tres = await post('tres');
  tres = await responderPendiente(tres.id, 'a', 'si', 'Iker');
  tres = await descartarPendientes(tres.id, 'abiertos', 'Unai');
  ok(pend(tres, 'a').estado === 'hecho', 'lo hecho sigue hecho');
  ok(pend(tres, 'b').estado === 'descartado' && pend(tres, 'c').estado === 'descartado'
    && pend(tres, 'b').descartado_por === 'Unai', 'las abiertas, descartadas y firmadas');
  ok(tres.estado === 'aprobado' && tres.motivo_no_programable === null, `todas → aprobado y programable (${tres.estado})`);
  await lanza(() => descartarPendientes(tres.id, 'abiertos', 'Unai'), 'ninguna pregunta abierta', 'sin abiertas no hay nada que descartar');

  // ── Con hueco no se aprueba solo, aunque se descarte
  let hu = await post('hueco');
  hu = await descartarPendientes(hu.id, ['x'], 'Iker');
  ok(hu.estado === 'escrito' && String(hu.motivo_no_programable).includes('huecos'), `con hueco no se aprueba: ${hu.motivo_no_programable}`);

  // ── El MCP / PUT no pisa un descartado
  let mc = await post('mcp');
  mc = await descartarPendientes(mc.id, ['m1'], 'Asier');
  await guardarSemana(S, {
    posts: [{ clave: 'mcp', pendientes: [{ id: 'm1', texto: 'Uno (reescrito)', estado: 'hecho' }, { id: 'm2', texto: 'Dos' }] }] as any,
  });
  mc = await post('mcp');
  ok(pend(mc, 'm1').estado === 'descartado' && pend(mc, 'm1').descartado_por === 'Asier' && pend(mc, 'm1').texto === 'Uno (reescrito)',
    'marcar hecho por el MCP no pisa un descartado (el texto sí cambia)');
  await guardarSemana(S, { posts: [{ clave: 'mcp', pendientes: [{ id: 'm2', texto: 'Dos' }] }] as any });
  mc = await post('mcp');
  ok(mc.pendientes.map((x: any) => x.id).join(',') === 'm2,m1', `un descartado que no viene se conserva: ${mc.pendientes.map((x: any) => x.id)}`);
  // El MCP también puede descartar uno abierto
  await guardarSemana(S, { posts: [{ clave: 'mcp', pendientes: [{ id: 'm2', texto: 'Dos', estado: 'descartado' }] }] as any });
  mc = await post('mcp');
  ok(pend(mc, 'm2').estado === 'descartado' && pend(mc, 'm2').descartado_por === 'Claude', 'el MCP descarta uno abierto (firma Claude)');
  ok(mc.estado === 'aprobado', `y con todo resuelto por el MCP, aprobado (${mc.estado})`);
  await lanza(
    () => guardarSemana(S, { posts: [{ clave: 'mcp', pendientes: [{ id: 'm2', texto: 'Dos', estado: 'borrado' }] }] as any }),
    'Estado de pendiente no válido',
    'un estado inventado se rechaza'
  );

  // ── Funciones puras
  const desc = { id: 'a', texto: 'x', tipo: 'check' as const, quien: null, estado: 'descartado' as const, respuesta: null, por: null, at: null, descartado_por: 'Iker', descartado_at: null };
  ok(motivoNoProgramable({ estado: 'escrito', texto: 'Hola', falta: 'Algo', pendientes: [desc] }) === null, 'descartado cuenta como resuelto en motivoNoProgramable');
  const m = mezclarPendientes([desc], normalizarPendientes([{ id: 'a', texto: 'x', estado: 'pendiente' }], 'k'));
  ok(m[0].estado === 'descartado', 'mezclar con «pendiente» no reabre un descartado');
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
