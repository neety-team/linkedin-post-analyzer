/**
 * Prueba del cambio de @Nombre por {{i}} (services/menciones.ts). Sin BD ni red.
 *
 *   npx tsx src/scripts/testMenciones.ts
 */
import { aplicarMenciones, motivoMenciones, normalizarMenciones } from '../services/menciones';

let fallos = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? 'OK ' : 'FALLO'} ${m}`); if (!c) fallos++; };
const igual = (a: unknown, b: unknown, m: string) => {
  const c = JSON.stringify(a) === JSON.stringify(b);
  ok(c, c ? m : `${m}\n      esperaba ${JSON.stringify(b)}\n      sale     ${JSON.stringify(a)}`);
};

const ana = { nombre: 'Ana Pérez', profile_id: 'ACoAna' };
const anaLarga = { nombre: 'Ana Pérez García', profile_id: 'ACoAnaLarga' };
const jose = { nombre: 'José Ángel Íñiguez', profile_id: 'ACoJose' };

// Lo basico
let r = aplicarMenciones('Gracias @Ana Pérez por la charla', [ana]);
igual(r.texto, 'Gracias {{0}} por la charla', 'una mención se cambia por {{0}}');
igual(r.mentions, [{ name: 'Ana Pérez', profile_id: 'ACoAna' }], 'y va en mentions con name y profile_id');
igual(r.sinPerfil, [], 'sin menciones sueltas');

// El mas largo primero, de dos formas: en la lista da igual el orden
r = aplicarMenciones('Con @Ana Pérez García y @Ana Pérez.', [ana, anaLarga]);
igual(r.texto, 'Con {{0}} y {{1}}.', 'casa el nombre más largo primero');
igual(r.mentions.map((m) => m.profile_id), ['ACoAnaLarga', 'ACoAna'], 'cada una con su perfil y en orden de aparición');

// Limite de palabra: @Ana no casa dentro de @Anabel
r = aplicarMenciones('Hola @Anabel', [{ nombre: 'Ana', profile_id: 'x' }]);
igual(r.texto, 'Hola @Anabel', '@Ana no casa dentro de @Anabel');
igual(r.sinPerfil, ['Anabel'], 'y @Anabel queda sin perfil');

// Tildes compuestas y descompuestas (texto copiado de macOS)
const descompuesto = 'Gracias @José Ángel Íñiguez!';
r = aplicarMenciones(descompuesto, [jose]);
igual(r.texto, 'Gracias {{0}}!', 'casa con las tildes descompuestas (NFC)');

// La misma persona dos veces: el mismo indice
r = aplicarMenciones('@Ana Pérez dijo… y @Ana Pérez repitió', [ana]);
igual(r.texto, '{{0}} dijo… y {{0}} repitió', 'repetida, el mismo índice');
igual(r.mentions.length, 1, 'y una sola entrada en mentions');

// Una mencion de la lista que el texto no usa no va
r = aplicarMenciones('Sin nadie', [ana]);
igual(r.mentions, [], 'una mención que el texto no usa no se manda');

// Lo que no tiene perfil
r = aplicarMenciones('Con @Ana Pérez y @Luis Martín, en @Feria Global.', [ana]);
igual(r.sinPerfil, ['Luis Martín', 'Feria Global'], 'lista lo que falta, con sus apellidos');
igual(motivoMenciones('Con @Luis Martín.', []), 'Falta el perfil de LinkedIn de @Luis Martín', 'el motivo del panel');
igual(motivoMenciones('@Luis y @Marta', null), 'Falta el perfil de LinkedIn de @Luis, @Marta', 'varios a la vez');
igual(motivoMenciones('Con @Ana Pérez', [ana]), null, 'con todo resuelto no hay motivo');

// Un correo no es una mencion
igual(aplicarMenciones('Escribe a ventas@empresa.com', []).sinPerfil, [], 'un correo no es una mención');
// Una @ suelta tampoco
igual(aplicarMenciones('Nos vemos @ 9:00', []).sinPerfil, [], 'una @ suelta no es una mención');
// Al final del texto y seguido de puntuacion
igual(aplicarMenciones('Gracias, @Ana Pérez', [ana]).texto, 'Gracias, {{0}}', 'al final del texto');
igual(aplicarMenciones('(@Ana Pérez)', [ana]).texto, '({{0}})', 'entre paréntesis');
// Si el apellido sigue y no es parte del nombre registrado, la mención casa la parte registrada
igual(aplicarMenciones('@Ana Pérez Sola', [ana]).texto, '{{0}} Sola', 'casa la parte registrada si sigue otra palabra');

// Validacion de la lista
igual(normalizarMenciones([{ nombre: '@Ana Pérez', profile_id: ' ACoAna ' }], 'k'), [ana], 'quita la @ y los espacios');
igual(normalizarMenciones(null, 'k'), [], 'null vacía la lista');
let lanzo = false;
try { normalizarMenciones([{ nombre: 'Ana' }], 'k'); } catch { lanzo = true; }
ok(lanzo, 'sin profile_id se rechaza');
lanzo = false;
try { normalizarMenciones([ana, ana], 'k'); } catch { lanzo = true; }
ok(lanzo, 'repetida se rechaza');

if (fallos) { console.log(`\n${fallos} fallo(s)`); process.exit(1); }
console.log('\nTodo OK');
