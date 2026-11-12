// Los comentarios del Google Chat: los 5 que encajan pasan y los 5 tumbados caen (12/11).
import { ASI_SUENAN, fichaOLeccion, copiaElEjemplo, criticaNuestroPost, aperturaHueca, autorPorSuNombre, exageraEnChat, elogiaLaForma } from '../services/commentGenerator';
import { nombresDelComentario, nombraTercero, abreAsintiendo } from '../services/replyGenerator';
import { registroFormal, exageraDeBroma, confiesaElDolor, desvelaLaEstrategia, latinismo } from '../services/variedadComentarios';
import { contarEstiradas, detectarAperturaGenerica } from '../services/replyGenerator';

let fallos = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? '✅' : '❌'} ${m}`); if (!c) fallos++; };

const algunFallo = (c: string) =>
  detectarAperturaGenerica(c) || (criticaNuestroPost(c) && 'critica') || (aperturaHueca(c) && 'hueca') ||
  fichaOLeccion(c) || (contarEstiradas(c) > 0 && 'estirada') || registroFormal(c) || exageraDeBroma(c) ||
  confiesaElDolor(c) || desvelaLaEstrategia(c) || latinismo(c) || null;

for (const c of ASI_SUENAN) ok(!algunFallo(c), `pasa: ${c} ${algunFallo(c) || ''}`);
const TUMBADOS = [
  'Tal cuaal me quedo con lo de que la herramienta aprende con cada sí y cada no!',
  'Nada entra sin que él lo apruebe y eso lo cambia todo.',
  'Perfectooo no es la IA que actúa sola sino la que afina con quien decide 🔥',
  'ICEX y Red.es eligiendo proyectos así es justo lo que necesita la industria.',
  'El comercial que va a ciegas pierde tiempo en empresas que nunca iban a comprar 👌',
];
for (const c of TUMBADOS) ok(!!algunFallo(c), `cae: ${c} (${algunFallo(c)})`);
ok(copiaElEjemplo('Orgulloso de ver todo lo que hemos hecho'), 'copiar el arranque de un ejemplo cae');
ok(!copiaElEjemplo('Orgulloso de este equipo y de cómo lo ha contado'), 'el mismo tono con otra frase pasa');
ok(copiaElEjemplo('Orgulloso de lo que estamos construyendo juntos'), 'casi calcado de un ejemplo cae');
ok(autorPorSuNombre('Qué bien contado lo tienes, Unai', 'Unai Ejemplo') === 'Unai', 'el nombre del autor se detecta (antes no casaba nunca)');

for (const c of ['No sabía lo de Jordania y no me lo puedo quitar de la cabeza.', 'Me ha cambiado cómo miro el mapa ✨', 'Con todo el respeto del mundo para quien carga con todo él solo.', 'Muchos trimestres sin ver esto así de claro.'])
  ok(!!exageraEnChat(c), `exagera: ${c}`);
for (const c of ASI_SUENAN) ok(!exageraEnChat(c), `no exagera: ${c}`);
ok(!!fichaOLeccion('Mucho que rascar en esta región todavía.'), 'insinuar que vamos a venderle a la region cae');
ok(elogiaLaForma('Vaya forma de contar lo que tiene Castilla y León por dentro'), 'elogio a la forma detectado');

// Respuestas a comentarios (12/11)
const POST = 'Las 10 empresas de Burgos que exportan a medio mundo: Grupo Antolin, Campofrio...';
const COM = 'Se os ha olvidado Chocolates Pepito, y también @Ana Martinez de Hiperbaric.';
const ter = nombresDelComentario(COM, 'Juan Perez', POST);
ok(ter.includes('Chocolates') && ter.includes('Pepito') && ter.includes('Hiperbaric'), `terceros del comentario: ${ter.join(', ')}`);
ok(!ter.includes('Se'), 'la primera palabra de la frase no es un nombre');
ok(!nombresDelComentario('Gran trabajo con Campofrio, enhorabuena', 'Juan Perez', POST).length, 'lo que ya sale en el post no cuenta');
ok(nombraTercero('Juan Perez tienes razón, Chocolates Pepito también exporta muchísimo', COM, 'Juan Perez', POST) !== null, 'la respuesta que nombra al sugerido cae');
ok(nombraTercero('Juan Perez empresas así también merecían estar, gracias por sumarlas 🙌', COM, 'Juan Perez', POST) === null, 'hablar de empresas así en general pasa');
ok(abreAsintiendo('justooo, y encima nadie lo cuenta') === 'justo', 'abre con justo');
ok(abreAsintiendo('Tal cual, lo de la lista') === 'tal cual', 'abre con tal cual');
ok(abreAsintiendo('lo de la lista pasa en todas partes') === null, 'entrar directo pasa');
console.log(fallos ? `\n${fallos} fallo(s)` : '\nTodo en verde');
process.exit(fallos ? 1 : 0);
