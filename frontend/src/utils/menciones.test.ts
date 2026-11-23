// Test de las menciones de la vista previa. Sin runner en el frontend, se corre con el tsx del backend:
//   cd backend && npx tsx ../frontend/src/utils/menciones.test.ts
// Compara cada caso con `aplicarMenciones` del backend: lo que la vista previa
// pinta como mención tiene que ser justo lo que el publicador enlaza.
import assert from 'node:assert/strict';
import { trozosConMenciones } from './menciones';
import * as back from '../../../backend/src/services/menciones';

// El backend es CommonJS y el frontend, módulo: según cómo lo cargue tsx, las funciones vienen en `default`.
const { aplicarMenciones } = ((back as any).aplicarMenciones ? back : (back as any).default) as typeof back;

const menciones = [
  { nombre: 'byNeural', profile_id: '111' },
  { nombre: 'Ana Pérez', profile_id: 'ACoA' },
  { nombre: 'Ana', profile_id: 'ACoB' },
  { nombre: 'Jon Ruiz, Ph.D.', profile_id: 'ACoC' },
  { nombre: 'S.L. Industrias', profile_id: '222' },
];

const casos = [
  'Gracias a @byNeural por la charla.',
  'Con @Ana Pérez y con @Ana, y no con @Anabel.',
  'Lo explicó @Jon Ruiz, Ph.D. en la mesa.',
  'Escribid a ventas@byNeural.com o a @S.L. Industrias.',
  '@Ana Pérez abre el post y @Sinperfil no tiene perfil.',
  'Texto sin menciones, con [HUECO] y https://neety.com',
  'Tilde descompuesta: @Ana Pérez.',
];

for (const t of casos) {
  const trozos = trozosConMenciones(t, menciones);
  const nuestras = trozos.filter((x) => x.tipo === 'mencion').map((x) => (x as { nombre: string }).nombre);
  const back = aplicarMenciones(t, menciones);
  // El texto del backend con cada {{i}} cambiado por su nombre es el mismo orden de menciones
  const delBackend = [...back.texto.matchAll(/\{\{(\d+)\}\}/g)].map((m) => back.mentions[Number(m[1])].name);
  assert.deepEqual(nuestras, delBackend, `misma lista de menciones en: ${t}`);
  // Y el texto, juntado, no pierde nada (salvo la @ de cada mención)
  const junto = trozos.map((x) => (x.tipo === 'texto' ? x.texto : '@' + x.nombre)).join('');
  assert.equal(junto, t.normalize('NFC'), `el texto se conserva: ${t}`);
}

// Casos concretos
assert.deepEqual(
  trozosConMenciones('Hola @byNeural.', menciones).map((x) => x.tipo),
  ['texto', 'mencion', 'texto'],
  'una mención en minúscula sale como mención'
);
assert.equal(trozosConMenciones('Hola @Ana Pérez', null).length, 1, 'sin lista no hay menciones');
assert.equal(
  trozosConMenciones('Hola @Anabel', menciones).filter((x) => x.tipo === 'mencion').length,
  0,
  '@Ana no casa dentro de @Anabel'
);

console.log(`OK menciones de la vista previa (${casos.length} casos contra aplicarMenciones)`);
