// Emoji partido por un recorte → Anthropic devuelve 400 "unexpected end of hex
// escape" y "Generar respuesta" falla en TODOS los comentarios del post (Iker,
// 2026-10-19: una respuesta suya de 241 caracteres acababa en 🤝 y el bloque
// de lo ya contestado la cortaba a 240).
//
//   npx tsx src/scripts/testSurrogados.ts
import { cortar, sanearUnicode } from '../services/textoSeguro';

let fallos = 0;
const ok = (cond: boolean, que: string) => {
  console.log(`${cond ? '✅' : '❌'} ${que}`);
  if (!cond) fallos++;
};
// JSON.stringify deja los emojis enteros tal cual y solo escapa los surrogados
// sueltos: si sale un \udXXX, es que hay uno.
const surrogadoSuelto = (s: string) => /\\ud[89a-f][0-9a-f]{2}/i.test(JSON.stringify(s));

const real = `${'x'.repeat(225)} ado a mercado🤝`;
ok(real.length === 241, 'el caso real mide 241 unidades');
ok(surrogadoSuelto(real.slice(0, 240)), 'slice(0, 240) deja un surrogado suelto (el bug)');
ok(!surrogadoSuelto(cortar(real, 240)), 'cortar(…, 240) no parte el emoji');
ok(cortar(real, 240).length <= 240, 'cortar respeta el tope');
ok(cortar('hola 🤝', 50) === 'hola 🤝', 'cortar no toca lo que ya cabe');

const params = {
  model: 'm',
  system: [{ type: 'text', text: real.slice(0, 240) }],
  messages: [{ role: 'user', content: `a ${'🤝'.slice(0, 1)} b` }],
  max_tokens: 10,
};
const limpio = sanearUnicode(params);
ok(!surrogadoSuelto(JSON.stringify(limpio)), 'sanearUnicode quita los surrogados sueltos en todo el body');
ok(limpio.max_tokens === 10 && limpio.model === 'm', 'sanearUnicode no toca lo que no es texto');
ok(sanearUnicode('bien 🤝') === 'bien 🤝', 'sanearUnicode deja los emojis enteros');

if (fallos) {
  console.log(`\n${fallos} fallo(s)`);
  process.exit(1);
}
console.log('\nTodo bien');
