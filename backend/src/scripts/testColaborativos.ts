/**
 * Prueba de la deteccion de colaborativos (services/colaborativos.ts) con la forma
 * real del feed de Unipile. No llama a la API: comprueba que el doble repost del
 * coautor se reconoce y que un repost normal (una sola vez) o uno ajeno no.
 *
 *   npx tsx src/scripts/testColaborativos.ts
 */
import { colaborativosEnFeed } from '../services/colaborativos';

let fallos = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? 'OK ' : 'FALLO'} ${m}`); if (!c) fallos++; };

const COAUTOR = 'prov-coautor';
const rep = (id: string, por: string) => ({ social_id: id, is_repost: true, reposted_by: { id: por } });

// 17/11: el feed del coautor trae el colaborativo dos veces como repost suyo (a 2 min).
ok(colaborativosEnFeed([rep('urn:li:activity:1', COAUTOR), rep('urn:li:activity:1', COAUTOR)], COAUTOR)
  .join() === 'urn:li:activity:1', 'doble repost del coautor = colaborativo');
ok(colaborativosEnFeed([rep('urn:li:activity:2', COAUTOR)], COAUTOR).length === 0, 'un repost normal no lo es');
ok(colaborativosEnFeed([rep('urn:li:activity:3', 'otro'), rep('urn:li:activity:3', 'otro')], COAUTOR).length === 0,
  'el doble repost de otra persona no cuenta');
ok(colaborativosEnFeed([{ social_id: 'urn:li:activity:4' }, { social_id: 'urn:li:activity:4' }], COAUTOR).length === 0,
  'un post propio repetido no es repost');

if (fallos) { console.log(`\n${fallos} fallo(s)`); process.exit(1); }
console.log('\nTodo OK');
