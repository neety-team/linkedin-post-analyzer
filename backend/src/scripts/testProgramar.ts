/**
 * Prueba de programar posts y del publicador contra un Postgres LOCAL.
 *
 *   DATABASE_URL=postgres://prueba@localhost:5544/neety_lpa_prueba npx tsx src/scripts/testProgramar.ts
 *
 * Usa la semana 2099-W01, que borra al empezar y al acabar. NO sale nada a
 * Unipile: el fetch es uno falso que se pasa al publicador, las variables de
 * Unipile son de mentira y PUBLICAR_LINKEDIN se borra del entorno.
 */
delete process.env.PUBLICAR_LINKEDIN;
process.env.UNIPILE_BASE_URL = 'https://unipile.invalid';
process.env.UNIPILE_API_KEY = 'clave-de-prueba';
process.env.UNIPILE_ACCOUNT_IKER = 'cuenta-de-prueba-iker';
delete process.env.UNIPILE_ACCOUNT_UNAI;

import pool from '../db';
import { runMigrations } from '../db/migrate';
import { guardarSemana, leerSemana, programarPosts, desprogramarPost, crearFeedback, motivoNoProgramable } from '../services/semana';
import { reclamar, vueltaPublicador, prepararPublicacion, cuerpoUnipile } from '../services/publicadorLinkedin';

if (!/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL || '')) {
  console.error('Esta prueba solo corre contra un Postgres local (DATABASE_URL con localhost).');
  process.exit(1);
}

const S = '2099-W01';
let fallos = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? 'OK ' : 'FALLO'} ${m}`); if (!c) fallos++; };
async function lanza(f: () => Promise<unknown>, contiene: string, m: string) {
  try {
    await f();
    ok(false, `${m} (no ha lanzado)`);
  } catch (e: any) {
    ok(String(e?.message).includes(contiene), `${m} → «${e?.message}»`);
  }
}
const fila = async (clave: string) =>
  (await pool.query(`SELECT * FROM semana_posts WHERE semana = $1 AND clave = $2`, [S, clave])).rows[0];
const enSegundos = (s: number) => new Date(Date.now() + s * 1000).toISOString();

/** Un fetch falso que apunta lo que le llega. */
function fetchFalso(status: number, cuerpo: unknown) {
  const llamadas: { url: string; form: FormData }[] = [];
  const f = (async (url: any, init: any) => {
    llamadas.push({ url: String(url), form: init.body });
    return new Response(JSON.stringify(cuerpo), { status, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;
  return { f, llamadas };
}

const LIMPIO = 'Un post sin huecos.\n\nhttps://neety.com';

async function main() {
  await runMigrations();
  await pool.query(`DELETE FROM semanas WHERE semana = $1`, [S]);

  const base = { fecha: '2098-12-30', objetivo: 'alcance', titulo: 't' };
  await guardarSemana(S, {
    posts: [
      { clave: 'a', cuenta: 'iker', estado: 'escrito', texto: LIMPIO, ...base },
      { clave: 'b', cuenta: 'iker', estado: 'escrito', texto: 'Con hueco [PAÍS]', ...base },
      { clave: 'c', cuenta: 'iker', estado: 'aprobado', texto: 'Gracias @Luis Martín', ...base },
      { clave: 'd', cuenta: 'iker', estado: 'idea', texto: 'Idea', ...base },
      {
        clave: 'e', cuenta: 'iker', estado: 'aprobado', texto: 'Gracias @Ana Pérez García por todo.', ...base,
        menciones: [{ nombre: 'Ana Pérez García', profile_id: 'ACoAna' }],
      },
      { clave: 'u', cuenta: 'unai', estado: 'aprobado', texto: LIMPIO, ...base },
    ] as any,
  });

  // ── El panel: que se puede programar y por que no
  const s0 = await leerSemana(S);
  const motivo = (c: string) => s0!.posts.find((p: any) => p.clave === c)!.motivo_no_programable;
  ok(motivo('a') === null, 'un escrito limpio se puede programar');
  ok(String(motivo('b')).includes('huecos'), `con hueco no: ${motivo('b')}`);
  ok(motivo('c') === 'Falta el perfil de LinkedIn de @Luis Martín', `mención sin perfil no: ${motivo('c')}`);
  ok(String(motivo('d')).includes('idea'), `una idea no: ${motivo('d')}`);
  ok(motivo('e') === null, 'con la mención resuelta sí');

  // ── Programar: todo o nada, y el candado en el servidor
  const A = (await fila('a')).id;
  const B = (await fila('b')).id;
  await lanza(() => programarPosts(S, [{ id: A, programado_para: enSegundos(60) }, { id: B, programado_para: enSegundos(60) }]),
    'huecos', 'el servidor rechaza programar un post con hueco');
  ok((await fila('a')).estado === 'escrito', 'y no programa ninguno (todo o nada)');
  await lanza(() => programarPosts(S, [{ id: A, programado_para: new Date(Date.now() - 3600_000).toISOString() }]),
    'ya ha pasado', 'una hora pasada se rechaza');

  await programarPosts(S, [{ id: A, programado_para: enSegundos(60) }]);
  let a = await fila('a');
  ok(a.estado === 'programado' && !!a.programado_para, 'a queda programado con su hora');

  // ── El PUT no desprograma ni reprograma
  await crearFeedback(A, 'Iker', 'Me gusta');
  const hora = a.programado_para.toISOString();
  await guardarSemana(S, { posts: [{ clave: 'a', estado: 'escrito', texto: LIMPIO, ...base, cuenta: 'iker' }] as any });
  a = await fila('a');
  ok(a.estado === 'programado' && a.programado_para.toISOString() === hora, 'volver a subir el mismo texto no lo desprograma');
  await guardarSemana(S, { posts: [{ clave: 'a', programado_para: null, publicado_at: '2020-01-01', linkedin_post_id: 'x', publicando_desde: '2020-01-01' }] as any });
  a = await fila('a');
  ok(a.programado_para.toISOString() === hora && !a.publicado_at && !a.linkedin_post_id && !a.publicando_desde,
    'el PUT no toca programado_para, publicado_at, linkedin_post_id ni publicando_desde');
  await lanza(() => guardarSemana(S, { posts: [{ clave: 'd', estado: 'programado' }] as any }),
    'Programar posts', 'el PUT no puede programar');

  // ── Texto cambiado → desprogramado, con su feedback
  await guardarSemana(S, { posts: [{ clave: 'a', texto: LIMPIO + '\nOtra línea' }] as any });
  a = await fila('a');
  ok(a.estado === 'aprobado' && a.programado_para === null, 'texto cambiado por el PUT → aprobado y sin hora');
  const fb = await pool.query(`SELECT COUNT(*)::int AS n FROM semana_feedback WHERE post_id = $1`, [A]);
  ok(fb.rows[0].n === 1, 'y conserva su feedback');

  // ── Quitar de la programacion
  await programarPosts(S, [{ id: A, programado_para: enSegundos(600) }]);
  ok((await desprogramarPost(A)) === 'ok', 'quitar de la programación');
  a = await fila('a');
  ok(a.estado === 'aprobado' && a.programado_para === null, 'vuelve a aprobado y sin hora');
  ok((await desprogramarPost(A)) === 'no_programado', 'quitar uno no programado no hace nada');

  // ── Reclamacion atomica: cinco a la vez, gana uno
  await programarPosts(S, [{ id: A, programado_para: enSegundos(-30) }]);
  const intentos = await Promise.all([1, 2, 3, 4, 5].map(() => reclamar(A)));
  ok(intentos.filter(Boolean).length === 1, `cinco reclamaciones a la vez, gana una (${intentos.filter(Boolean).length})`);
  ok((await reclamar(A)) === null, 'una vez reclamado nadie más lo coge');
  ok((await desprogramarPost(A)) === 'publicando', 'no se puede quitar mientras se publica');
  await pool.query(`UPDATE semana_posts SET publicando_desde = NOW() - interval '11 minutes' WHERE id = $1`, [A]);
  ok((await desprogramarPost(A)) === 'ok', 'pero sí si la subida se quedó colgada');

  // ── Simulado: no sale nada y el post queda como estaba
  await programarPosts(S, [{ id: A, programado_para: enSegundos(-30) }]);
  const espia = fetchFalso(201, { object: 'PostCreated', post_id: 'nunca' });
  const sim = await vueltaPublicador({ activo: false, fetchImpl: espia.f });
  a = await fila('a');
  ok(sim.simulados.includes('a') && espia.llamadas.length === 0, 'simulado: no llama a Unipile');
  ok(a.estado === 'programado' && !a.publicando_desde && !a.publicado_at, 'simulado: el post sigue como estaba');

  // ── Activo con un Unipile falso que acepta: publicado
  const E = (await fila('e')).id;
  await desprogramarPost(A);
  await programarPosts(S, [{ id: E, programado_para: enSegundos(-30) }]);
  const acepta = fetchFalso(201, { object: 'PostCreated', post_id: '7400000000000000001', status: 'published' });
  const v1 = await vueltaPublicador({ activo: true, fetchImpl: acepta.f });
  const e = await fila('e');
  ok(v1.publicados.includes('e') && e.estado === 'publicado' && !!e.publicado_at, 'activo: publicado y con fecha');
  ok(e.linkedin_post_id === '7400000000000000001' && e.error_publicacion === null, 'guarda el post_id');
  const form = acepta.llamadas[0]?.form;
  ok(acepta.llamadas[0]?.url === 'https://unipile.invalid/api/v1/posts', 'llama a /api/v1/posts');
  ok(form?.get('account_id') === 'cuenta-de-prueba-iker', 'con la cuenta de Unipile de Iker');
  // Por defecto la mención va enlazada: {{0}} y mentions[0]
  ok(form?.get('text') === 'Gracias {{0}} por todo.', `enlazada por defecto: ${form?.get('text')}`);
  ok(form?.get('mentions[0][name]') === 'Ana Pérez García' && form?.get('mentions[0][is_company]') === null, 'con mentions[0], persona sin is_company');
  // Una empresa (id de cifras) lleva is_company=true
  const pubE = prepararPublicacion({ cuenta: 'iker', texto: 'Gracias @Firecrawl.', menciones: [{ nombre: 'Firecrawl', profile_id: '104100957' }], falta: '' });
  ok(cuerpoUnipile(pubE).get('mentions[0][is_company]') === 'true', 'empresa: is_company=true');
  // Con el freno, el nombre en llano y sin mentions
  process.env.UNIPILE_MENCIONES_ENLAZADAS = '0';
  const pub = prepararPublicacion({ cuenta: 'iker', texto: 'Gracias @Ana Pérez García por todo.', menciones: [{ nombre: 'Ana Pérez García', profile_id: 'ACoAna' }], falta: '' });
  const f2 = cuerpoUnipile(pub);
  ok(f2.get('text') === 'Gracias Ana Pérez García por todo.' && f2.get('mentions[0][name]') === null, `con el freno, en llano: ${f2.get('text')}`);
  delete process.env.UNIPILE_MENCIONES_ENLAZADAS;
  // Lo que pone «Qué falta» bloquea igual que un hueco
  ok(motivoNoProgramable({ estado: 'escrito', texto: 'Hola', falta: 'Su visto bueno.' }) === 'Falta: Su visto bueno.', 'con «Qué falta» no se programa');

  // ── 202: se guarda el draft_id
  await guardarSemana(S, { posts: [{ clave: 'f', cuenta: 'iker', estado: 'aprobado', texto: LIMPIO, ...base }] as any });
  const F = (await fila('f')).id;
  await pool.query(`UPDATE semana_posts SET imagen = $2, imagen_tipo = 'image/png' WHERE id = $1`, [F, Buffer.from('89504e470d0a1a0a00000000', 'hex')]);
  await programarPosts(S, [{ id: F, programado_para: enSegundos(-30) }]);
  const tarda = fetchFalso(202, { object: 'PostCreated', post_id: 'p202', draft_id: 'd202', status: 'pending' });
  await vueltaPublicador({ activo: true, fetchImpl: tarda.f });
  const f = await fila('f');
  ok(f.estado === 'publicado' && f.unipile_draft_id === 'd202', '202: publicado con su draft_id');
  ok(tarda.llamadas[0]?.form.get('attachments') instanceof Blob, 'la foto va en attachments');

  // ── Falla Unipile: vuelve a aprobado, sin hora y con el error
  await programarPosts(S, [{ id: A, programado_para: enSegundos(-30) }]);
  const peta = fetchFalso(500, { title: 'Internal error' });
  const v2 = await vueltaPublicador({ activo: true, fetchImpl: peta.f });
  a = await fila('a');
  ok(v2.fallos.includes('a') && a.estado === 'aprobado' && a.programado_para === null && a.publicando_desde === null,
    'si Unipile falla, vuelve a aprobado sin hora ni reclamación');
  ok(String(a.error_publicacion).includes('500') && String(a.error_publicacion).includes('Puede que haya llegado'),
    `y el error queda apuntado: ${a.error_publicacion}`);
  ok(peta.llamadas.length === 1, 'sin reintentos');

  // ── El candado otra vez, justo antes de publicar
  await programarPosts(S, [{ id: A, programado_para: enSegundos(-30) }]);
  await pool.query(`UPDATE semana_posts SET texto = 'Ahora con [hueco]' WHERE id = $1`, [A]);
  const nunca = fetchFalso(201, {});
  await vueltaPublicador({ activo: true, fetchImpl: nunca.f });
  a = await fila('a');
  ok(nunca.llamadas.length === 0 && a.estado === 'aprobado' && String(a.error_publicacion).includes('huecos'),
    'el publicador vuelve a pasar el candado y no publica');

  // ── Sin la cuenta de Unipile de ese fundador
  const U = (await fila('u')).id;
  await programarPosts(S, [{ id: U, programado_para: enSegundos(-30) }]);
  await vueltaPublicador({ activo: true, fetchImpl: nunca.f });
  const u = await fila('u');
  ok(u.estado === 'aprobado' && String(u.error_publicacion).includes('UNIPILE_ACCOUNT_UNAI'), `sin cuenta: ${u.error_publicacion}`);

  // ── Una hora que se paso de largo (servicio caido) no sale sola
  await guardarSemana(S, { posts: [{ clave: 'a', texto: LIMPIO }] as any });
  await programarPosts(S, [{ id: A, programado_para: enSegundos(-30) }]);
  await pool.query(`UPDATE semana_posts SET programado_para = NOW() - interval '5 hours' WHERE id = $1`, [A]);
  await vueltaPublicador({ activo: true, fetchImpl: nunca.f });
  a = await fila('a');
  ok(nunca.llamadas.length === 0 && a.estado === 'aprobado' && String(a.error_publicacion).includes('hace 5 h'),
    `muy pasado de hora no se publica: ${a.error_publicacion}`);

  // ── Un programado vuelve a programarse limpio de errores
  await programarPosts(S, [{ id: A, programado_para: enSegundos(600) }]);
  a = await fila('a');
  ok(a.error_publicacion === null, 'al volver a programar se borra el error anterior');

  await pool.query(`DELETE FROM semanas WHERE semana = $1`, [S]);
}

main()
  .catch((e) => { console.error(e); fallos++; })
  .finally(async () => {
    await pool.query(`DELETE FROM semanas WHERE semana = $1`, [S]).catch(() => {});
    await pool.end();
    if (fallos) { console.log(`\n${fallos} fallo(s)`); process.exit(1); }
    console.log('\nTodo OK');
  });
