// Los comentarios del Google Chat: los 5 que encajan pasan y los 5 tumbados caen (12/11).
import { ASI_SUENAN, fichaOLeccion, copiaElEjemplo, criticaNuestroPost, aperturaHueca } from '../services/commentGenerator';
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
console.log(fallos ? `\n${fallos} fallo(s)` : '\nTodo en verde');
process.exit(fallos ? 1 : 0);
