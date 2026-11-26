// Test del pilar que viene de Semana. Se corre con:  cd backend && npx tsx src/services/pilarSemana.test.ts
import assert from 'node:assert/strict';
import { pilarDeEtiqueta, emparejar } from './pilarSemana';
import { classifyPillar } from './pillar';

// Las etiquetas TAL CUAL las escribe el equipo en Semana (semanas 47 a 51).
const casos: [string, string, string][] = [
  ['Radar a tres voces · la edición entera · mapa de España', 'otro', 'radar'],
  ['Radar a tres voces · una comunidad · voz de ventas por zona', 'otro', 'radar'],
  ['Opinión del oficio', 'otro', 'opinion'],
  ['Opinión del ingeniero · voz nueva', 'otro', 'opinion'],
  ['Trastienda técnica · voz nueva', 'otro', 'trastienda'],
  ['Hito propio · premio · colaborativo', 'otro', 'hito'],
  ['Hito propio · historia · voz nueva', 'historia', 'hito'],
  ['Hito · voz nueva · en inglés', 'otro', 'hito'],
  ['Hito y evento · voz nueva', 'otro', 'historia_evento'],
  ['Hito y evento · San Francisco (inglés)', 'otro', 'historia_evento'],
  ['Historia propia · voz nueva', 'otro', 'historia'],
  ['Historia con cita real · voz nueva', 'meme', 'historia'],
  ['Historia propia con lista · voz nueva', 'otro', 'historia'],
  ['Noticia · opinión · voz nueva', 'otro', 'noticia'],
  ['Meme · gráfica · reconocerse', 'meme', 'meme_grafica'],
  ['Meme de chat · calco', 'otro', 'meme_captura'],
  ['Meme gráfica de desgaste', 'meme', 'meme_desgaste'],
  ['Lista de arquetipos · meme de texto con imagen', 'otro', 'meme'],
  ['EXPERIMENTO · meme de texto en una línea, serie con variante en el título', 'otro', 'meme'],
  ['Peloteo regional · mapa · receta actual', 'otro', 'peloteo_mapa'],
  ['Peloteo regional · orla de logos · receta actual', 'peloteo_mapa', 'peloteo_los10'],
  ['Peloteo regional · pueblos que exportan', 'peloteo_objeto', 'peloteo_objeto'],
  ['Peloteo regional · pueblos que exportan', 'otro', 'peloteo_mapa'],
  ['Recurso con gate · error de oficio, sin culpar al cargo', 'otro', 'lead_magnet'],
  ['Recurso con enlace público · voz nueva · primero de su tipo', 'otro', 'lead_magnet'],
  ['Recurso con enlace público · voz nueva · primero de su tipo', 'radar', 'radar'],
  ['Informe propio en tarjeta', 'otro', 'tarjeta'],
];
for (const [etiqueta, texto, esperado] of casos) {
  assert.equal(pilarDeEtiqueta(etiqueta, texto), esperado, etiqueta);
}

// Un meme con subtipo ya puesto (por la imagen o a mano) no se pisa con 'meme' a secas.
assert.equal(pilarDeEtiqueta('Meme de texto · frase de oficio', 'meme_personaje'), 'meme_personaje');
// Lo que Semana no dice con claridad no se inventa: manda el texto.
assert.equal(pilarDeEtiqueta('Antes y después en imagen · formato nuevo', 'historia'), null);
assert.equal(pilarDeEtiqueta('EXPERIMENTO · IA aplicada a buscar clientes', 'otro'), null);
assert.equal(pilarDeEtiqueta('', 'otro'), null);
assert.equal(pilarDeEtiqueta(null, 'otro'), null);

// Emparejar un post de Semana con el de Cuentas.
const semana = [
  { id: 's1', cuenta: 'unai', fecha: '2026-11-25', pilar: 'Radar a tres voces', linkedin_post_id: '7529083711582138368', linkedin_social_id: null,
    texto: 'En octubre se nos quedaron fuera 65 inversiones industriales en España\n\nHace unos días…' },
  { id: 's2', cuenta: 'asier', fecha: '2026-11-24', pilar: 'Hito propio · premio', linkedin_post_id: null, linkedin_social_id: null,
    texto: 'Nuestra forma de buscar clientes ha ganado el Premio @Eroski a la Innovación\n\nNos lo dieron…' },
  { id: 's3', cuenta: 'iker', fecha: '2026-11-25', pilar: 'Opinión del oficio', linkedin_post_id: null, linkedin_social_id: null,
    texto: 'Un gancho que luego se cambió al publicar' },
];
const creadores = { unai: 'c-unai', asier: 'c-asier', iker: 'c-iker' };
const posts = [
  // por id (el de Semana viene con o sin prefijo urn)
  { id: 'p1', creator_id: 'c-unai', linkedin_post_id: 'urn:li:activity:7529083711582138368', content_text: 'Otro gancho', published_at: new Date('2026-11-25T09:00:00Z') },
  // por la primera línea, sin la @ de la mención
  { id: 'p2', creator_id: 'c-asier', linkedin_post_id: '111', content_text: 'Nuestra forma de buscar clientes ha ganado el Premio Eroski a la Innovación\n\nNos…', published_at: new Date('2026-11-24T10:00:00Z') },
  // mismo día y único post de esa cuenta ese día
  { id: 'p3', creator_id: 'c-iker', linkedin_post_id: '222', content_text: 'Creo que al comercial que abre un país…', published_at: new Date('2026-11-25T08:00:00Z') },
  // otra cuenta con la misma primera línea: no se empareja
  { id: 'p4', creator_id: 'c-iker', linkedin_post_id: '333', content_text: 'Nuestra forma de buscar clientes ha ganado el Premio Eroski a la Innovación', published_at: new Date('2026-11-20T10:00:00Z') },
];
const pares = emparejar(semana, posts, creadores);
assert.deepEqual(
  [...pares.entries()].sort(),
  [['p1', 's1'], ['p2', 's2'], ['p3', 's3']]
);
// Dos posts de la cuenta el mismo día y ninguno casa por texto: no se adivina.
const dos = emparejar([semana[2]], [posts[2], { ...posts[2], id: 'p5', linkedin_post_id: '444' }], creadores);
assert.equal(dos.size, 0);

// El texto solo, sin Semana: el Radar se reconoce por su nombre.
assert.equal(
  classifyPillar({ content_text: 'Si vendes en Cataluña, mira adónde van más de 260 millones\n\nLo he visto en nuestro Radar de inversiones industriales de octubre.\n\nRecoge 13 inversiones.', content_type: 'text_image' }),
  'radar'
);

console.log('pilarSemana: OK');
