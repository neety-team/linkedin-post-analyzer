/**
 * Prueba del detector de idioma (services/idioma.ts): a un comentario en ingles
 * se le contesta en ingles; ante la duda, castellano.
 *
 *   npx tsx src/scripts/testIdioma.ts
 */
import { idiomaDe } from '../services/idioma';

let fallos = 0;
const ok = (txt: string, esperado: 'es' | 'en') => {
  const r = idiomaDe(txt);
  console.log(`${r === esperado ? 'OK ' : 'FALLO'} ${esperado} <- ${txt}`);
  if (r !== esperado) fallos++;
};

ok('Great post, congrats to the whole team!', 'en');
ok('Thanks for sharing', 'en');
ok('Love this 🙌', 'en');
ok('It was a pleasure to meet you guys at FullEnrich', 'en');
ok('Congratulations Iker!', 'en');
ok('Enhorabuena equipo, qué crack', 'es');
ok('Muy bueno el post', 'es');
ok('Totalmente de acuerdo con lo que dices', 'es');
ok('Brutal 🔥', 'es');
ok('Gran post Iker!', 'es');
ok('Qué buen deal, closing en San Francisco', 'es');
ok('', 'es');

if (fallos) { console.log(`\n${fallos} fallo(s)`); process.exit(1); }
console.log('\nTodo OK');
