/**
 * Mover y retirar posts de la página Semana, contra un Postgres local.
 *   DATABASE_URL=postgres://prueba@localhost:5544/neety_lpa_prueba npx tsx src/scripts/testMover.ts
 */
if (!/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL || '')) {
  console.error('Esta prueba solo corre contra un Postgres local (DATABASE_URL con localhost).');
  process.exit(1);
}
import pool from '../db';
import { runMigrations } from '../db/migrate';
import { guardarSemana, moverPost, retirarPost, crearFeedback } from '../services/semana';

let fallos = 0;
const ok = (c: boolean, m: string) => {
  console.log(`${c ? 'OK ' : 'FALLO'} ${m}`);
  if (!c) fallos++;
};
const S1 = '2098-W10';
const S2 = '2098-W11';
const fila = async (clave: string) =>
  (await pool.query(`SELECT * FROM semana_posts WHERE clave = $1 AND semana IN ($2, $3)`, [clave, S1, S2])).rows[0];

(async () => {
  await runMigrations();
  await pool.query(`DELETE FROM semanas WHERE semana IN ($1, $2)`, [S1, S2]);
  const base = { fecha: '2098-03-03', cuenta: 'iker', objetivo: 'alcance', titulo: 't', texto: 'Hola' };
  await guardarSemana(S1, { posts: [{ clave: 'm-a', ...base }, { clave: 'm-b', ...base }, { clave: 'm-c', ...base }] } as any);
  await guardarSemana(S2, { posts: [{ clave: 'm-b', ...base }] } as any);

  const A = (await fila('m-a')).id;
  await crearFeedback(A, 'Prueba', 'cambia el gancho');
  ok((await moverPost(A, { semana: S2, fecha: '2098-03-10' })) === 'ok', 'mover a otra semana');
  const a = await fila('m-a');
  ok(a.semana === S2 && String(a.fecha).length > 0, 'cambia de semana y de fecha');
  const fb = await pool.query(`SELECT COUNT(*)::int n FROM semana_feedback WHERE post_id = $1`, [A]);
  ok(fb.rows[0].n === 1, 'conserva su feedback');

  const B1 = (await pool.query(`SELECT id FROM semana_posts WHERE semana = $1 AND clave = 'm-b'`, [S1])).rows[0].id;
  ok((await moverPost(B1, { semana: S2 })) === 'clave_ocupada', 'no pisa un post con la misma clave');
  ok((await moverPost(B1, { semana: S2, clave: 'm-b-2' })) === 'ok', 'pero sí con otra clave');
  ok((await moverPost(B1, { semana: 'mal' })) === 'datos_no_validos', 'semana no válida');

  const C = (await fila('m-c')).id;
  await pool.query(`UPDATE semana_posts SET estado = 'programado' WHERE id = $1`, [C]);
  ok((await moverPost(C, { semana: S2 })) === 'bloqueado', 'un programado no se mueve');
  ok((await retirarPost(C)) === 'bloqueado', 'ni se retira');
  await pool.query(`UPDATE semana_posts SET estado = 'escrito' WHERE id = $1`, [C]);
  ok((await retirarPost(C)) === 'ok' && !(await fila('m-c')), 'retirar uno sin feedback');
  ok((await retirarPost(C)) === 'no_existe', 'retirar dos veces: ya no existe');

  const conFb = await pool.query(`SELECT COUNT(*)::int n FROM semana_feedback WHERE post_id = $1`, [A]);
  ok(conFb.rows[0].n === 1 && (await retirarPost(A)) === 'con_feedback', 'con feedback no se retira');

  await pool.query(`DELETE FROM semanas WHERE semana IN ($1, $2)`, [S1, S2]);
  console.log(fallos ? `\n${fallos} fallo(s)` : '\nTodo OK');
  await pool.end();
  process.exit(fallos ? 1 : 0);
})();
