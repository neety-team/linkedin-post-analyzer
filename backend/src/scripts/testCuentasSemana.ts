/**
 * Las cuentas de la semana (2026-11-23): Ismael (ventas) entra como cuarta
 * columna, se programa como los demas y se encuentra solo en Unipile por su
 * nombre de LinkedIn, pero NO entra en el efecto abeja, que es entre los tres
 * fundadores. Contra un Postgres local y sin red.
 *
 *   DATABASE_URL=postgres://prueba@localhost:5544/neety_lpa_prueba npx tsx src/scripts/testCuentasSemana.ts
 */
if (!/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL || '')) {
  console.error('Esta prueba solo corre contra un Postgres local (DATABASE_URL con localhost).');
  process.exit(1);
}
delete process.env.EFECTO_ABEJA;
delete process.env.ANTHROPIC_API_KEY;
import { z } from 'zod';
import pool from '../db';
import { runMigrations } from '../db/migrate';
import { CUENTAS, guardarSemana, leerSemana, normalizarCoautores } from '../services/semana';
import { elegirCuentas, NOMBRE_EN_LINKEDIN } from '../services/publicadorLinkedin';
import { planRonda, planificarAbeja, ensayarRonda, FUNDADORES } from '../services/abeja';

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
    ok(String(e?.message).includes(contiene), `${m} · «${e?.message}»`);
  }
}

const S = '2098-W21';
const FECHA = '2098-05-20';

(async () => {
  await runMigrations();
  await pool.query(`DELETE FROM semanas WHERE semana = $1`, [S]);

  // ── La lista y el orden de las columnas ──────────────────────────────────
  ok(CUENTAS.join(',') === 'iker,unai,asier,ismael', 'las cuentas, en orden de columnas: iker, unai, asier, ismael');
  // Los enums de las tools del MCP (`cuenta`, `quien`, `coautores`) salen de CUENTAS.
  ok(z.enum(CUENTAS).safeParse('ismael').success, 'el enum del MCP acepta ismael');
  ok(!z.enum(CUENTAS).safeParse('mario').success, 'el enum del MCP sigue rechazando una cuenta que no es de la semana');

  // Se guardan desordenados y con claves al reves a proposito: el orden lo pone la cuenta.
  const base = { fecha: FECHA, objetivo: 'alcance', titulo: 't', texto: 'Hola, esto es un post' };
  await guardarSemana(S, {
    posts: [
      { clave: 'a-ismael', cuenta: 'ismael', ...base },
      { clave: 'b-asier', cuenta: 'asier', ...base },
      { clave: 'c-unai', cuenta: 'unai', ...base },
      { clave: 'd-iker', cuenta: 'iker', ...base },
    ],
  });
  const sem = await leerSemana(S);
  ok(
    sem?.posts.map((p: any) => p.cuenta).join(',') === 'iker,unai,asier,ismael',
    `dentro del dia, el orden de columnas: ${sem?.posts.map((p: any) => p.cuenta).join(',')}`
  );
  await lanza(
    () => guardarSemana(S, { posts: [{ clave: 'mal', cuenta: 'pepe', ...base }] }),
    'Cuenta no válida',
    'una cuenta que no existe se rechaza'
  );

  // ── Colaborativos y pendientes con Ismael ────────────────────────────────
  ok(normalizarCoautores(['ismael', 'iker'], 'unai', 'k').join(',') === 'iker,ismael', 'coautores con ismael, en orden de columnas');
  await guardarSemana(S, {
    posts: [
      {
        clave: 'a-ismael',
        coautores: ['asier'],
        pendientes: [{ texto: '¿Ismael va a la feria?', quien: 'ismael' } as any],
      },
    ],
  });
  const p = (await leerSemana(S))?.posts.find((x: any) => x.clave === 'a-ismael');
  ok(p?.coautores?.join(',') === 'asier', 'un post de Ismael puede ser colaborativo');
  ok(p?.pendientes?.[0]?.quien === 'ismael', 'un pendiente puede ser de Ismael');

  // ── Unipile: se encuentra solo por su nombre de LinkedIn ─────────────────
  ok(NOMBRE_EN_LINKEDIN.ismael === 'Ismael El Bekkar', 'el nombre de LinkedIn de Ismael');
  const conectada = (id: string, name: string, status = 'OK') => ({ id, name, type: 'LINKEDIN', sources: [{ status }] });
  const m = elegirCuentas([
    conectada('A-iker', 'Iker Galarza Rodríguez'),
    conectada('A-ismael', 'Ismael El Bekkar'),
    { id: 'A-correo', name: 'Ismael El Bekkar', type: 'MAIL', sources: [{ status: 'OK' }] },
  ]);
  ok(m.ismael === 'A-ismael' && m.iker === 'A-iker', 'la cuenta de LinkedIn de Ismael se encuentra sola (y no la de correo)');
  ok(elegirCuentas([conectada('A-ismael', 'Ismael El Bekkar', 'CREDENTIALS')]).ismael === null, 'desconectada no vale');

  // ── Efecto abeja: solo entre fundadores ──────────────────────────────────
  ok(FUNDADORES.join(',') === 'iker,unai,asier', 'la ronda es de los tres fundadores');
  const idIsmael = p!.id;
  const n = await planificarAbeja(
    { id: idIsmael, cuenta: 'ismael', texto: 'Hola' },
    { ronda: { idioma: 'es', comentarios: [] }, automatica: true, azar: () => 0.5 }
  );
  const filas = (await pool.query(`SELECT COUNT(*)::int n FROM abeja_acciones WHERE semana_post_id = $1`, [idIsmael])).rows[0].n;
  ok(n === 0 && filas === 0, 'un post de Ismael no tiene ronda: ni aviso ni acciones');
  await lanza(() => ensayarRonda(idIsmael), 'entre los fundadores', 'el ensayo de la ronda de un post de Ismael lo explica');

  const idIker = sem!.posts.find((x: any) => x.cuenta === 'iker').id;
  await planificarAbeja(
    { id: idIker, cuenta: 'iker', texto: 'Hola' },
    { ronda: { idioma: 'es', comentarios: [] }, automatica: true, azar: () => 0.5 }
  );
  const actores = (await pool.query(`SELECT DISTINCT actor FROM abeja_acciones WHERE semana_post_id = $1 AND actor IS NOT NULL`, [idIker])).rows
    .map((r: any) => r.actor)
    .sort();
  ok(actores.join(',') === 'asier,iker,unai', `en la ronda de un fundador Ismael no actua: ${actores.join(',')}`);
  const plan = planRonda({ autor: 'unai', orden: FUNDADORES.filter((c) => c !== 'unai'), ronda: null, automatica: true, azar: () => 0.5 });
  ok(!plan.some((a) => (a.actor as string) === 'ismael'), 'el plan de la ronda no lleva a Ismael');

  await pool.query(`DELETE FROM semanas WHERE semana = $1`, [S]);
  console.log(fallos ? `\n${fallos} fallo(s)` : '\nTodo OK');
  await pool.end();
  process.exit(fallos ? 1 : 0);
})();
