// LA PRIMERA LINEA DEL AVISO DE GOOGLE CHAT (Iker, 2026-10-15)
//
// Iker retocaba a mano la cabecera de cada aviso antes de mandarlo. Lo que
// salia ("Nueva HISTORIA de UNAI", "UNAI tiene HISTORIA nueva") y lo que el
// acababa enviando, sacado de sus capturas del Chat:
//
//   🐝 HISTORIA KILOOOMETROS BOLI de IKER:
//   🐝 MEMEEE COMPETENCIA de ASIER:
//   🐝 HISTORIAAA FÁBRICA DIRECTOR COMERCIAL de UNAI:
//   🐝 VIDEO RESUMEN EVENTOOO de UNAI:
//   🐝 4 PREGUNTAAS CLIENTE IDEAL vs SECTOR de ISMAEL:
//
// LA ESTRUCTURA SE FIJA EN CODIGO, porque es lo que el pidio hardcodear: el
// PILAR siempre delante, el NOMBRE siempre al final ("de UNAI") y nada de
// "Nuevo". En medio, dos o tres palabras de CONTEXTO sacadas del post (la
// region, el tema, el objeto, la escena), que es lo unico que hace falta un
// modelo para escribir. Y UNA palabra con la ultima vocal alargada, con una o
// dos de mas, unas veces el pilar y otras el contexto.
import Anthropic from '@anthropic-ai/sdk';
import { trackedCreate } from './claudeClient';
import { stripLoneSurrogates } from '../utils/sanitizeText';
import { esMeme, pilarBase } from '../utils/pilarBase';

const PILAR_PALABRA: Record<string, string> = {
  historia: 'HISTORIA',
  // Para el equipo sigue siendo una historia: "EVENTO" delante suena a anuncio.
  historia_evento: 'HISTORIA',
  meme: 'MEME',
  peloteo_mapa: 'PELOTEO',
  peloteo_los10: 'LAS 10',
  peloteo_objeto: 'DESPIECE',
  lead_magnet: 'LEAD MAGNET',
  evento: 'EVENTO',
  tarjeta: 'TARJETA',
};

function esVideo(contentType: string | null | undefined): boolean {
  return contentType === 'video' || contentType === 'text_video';
}

/** La palabra del pilar. Con video manda el formato ("VIDEO RESUMEN EVENTOOO"). Sin pilar, nada. */
export function palabraDelPilar(pillar: string | null | undefined, contentType?: string | null): string {
  if (esVideo(contentType) && !esMeme(pillar)) return 'VIDEO';
  return PILAR_PALABRA[pilarBase(pillar) || ''] || '';
}

// Se alarga la ULTIMA vocal, y solo en palabras que acaban en vocal o en
// vocal + s ("HISTORIAAA", "PREGUNTAAS"): en "SECTOR" daria "SECTOOR".
const ALARGABLE = /^[A-ZÁÉÍÓÚÜÑ]{3,}$/;
// Las de relleno no se alargan nunca: "LAAS 10" o "DEEL" no lo escribe nadie.
const CORTAS = new Set(['LAS', 'LOS', 'DEL', 'UNA', 'UNO', 'CON', 'POR', 'PARA', 'QUE']);
function alargarMayus(w: string, letras: number): string {
  // Solo se quita la tilde de las VOCALES: con NFD a secas "AÑOS" salia "ANOOS".
  const plano = w.replace(/[ÁÉÍÓÚ]/g, (v) => ({ Á: 'A', É: 'E', Í: 'I', Ó: 'O', Ú: 'U' } as Record<string, string>)[v]);
  const m = plano.match(/^(.*?)([AEIOU])(S?)$/);
  return m ? m[1] + m[2] + m[2].repeat(letras) + m[3] : w;
}

/**
 * Compone la linea: PILAR + CONTEXTO + "de" + NOMBRE, con una palabra alargada.
 * Pura y sin azar escondido (se le pasan los dados) para poder probarla.
 */
export function componerCabecera(
  pilar: string,
  contexto: string,
  nombre: string,
  dados: { cual: number; letras: number } = { cual: Math.random(), letras: Math.random() < 0.5 ? 1 : 2 }
): string {
  const delante = [pilar, contexto].filter(Boolean).join(' ').trim() || 'POST';
  const palabras = delante.split(/\s+/);
  const candidatas = palabras
    .map((w, i) => ({ w, i }))
    .filter(({ w }) => ALARGABLE.test(w) && /[AEIOUÁÉÍÓÚ]S?$/.test(w) && !CORTAS.has(w));
  if (candidatas.length) {
    const elegida = candidatas[Math.min(candidatas.length - 1, Math.floor(dados.cual * candidatas.length))];
    palabras[elegida.i] = alargarMayus(elegida.w, dados.letras);
  }
  return `🐝 ${palabras.join(' ')} de ${nombre}:`;
}

/** Limpia lo que devuelve el modelo: mayusculas, sin signos, 4 palabras como mucho. */
export function limpiarContexto(bruto: string, nombre: string, pilar: string): string {
  const fuera = new Set(['NUEVO', 'NUEVA', 'POST', nombre, ...pilar.split(/\s+/)].filter(Boolean));
  const palabras = (bruto || '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w.toLowerCase() === 'vs' ? 'vs' : w.toUpperCase()))
    .filter((w) => !fuera.has(w));
  // Al quitar el nombre se queda colgando el "de" ("KILOMETROS BOLI DE").
  const colgantes = new Set(['DE', 'DEL', 'LA', 'EL', 'LOS', 'LAS', 'Y', 'CON', 'EN', 'vs']);
  while (palabras.length && colgantes.has(palabras[palabras.length - 1])) palabras.pop();
  // Delante solo se quita el enlace suelto: "LA RIOJA" lleva su articulo.
  while (palabras.length && ['DE', 'DEL', 'Y', 'CON', 'EN', 'vs'].includes(palabras[0])) palabras.shift();
  const out = palabras.slice(0, 4).join(' ');
  return out.length <= 32 ? out : palabras.slice(0, 2).join(' ');
}

const SYSTEM = `Escribes el CONTEXTO de la primera linea de un aviso en el Google Chat de un equipo de ventas. El aviso dice "PILAR CONTEXTO de NOMBRE" y el contexto es lo tuyo: de 1 a 3 palabras, en MAYUSCULAS, que digan de que va el post para que los compañeros lo reconozcan de un vistazo. Sacadas del TEXTO del post (la region, el tema, el objeto, la escena o el dato que lo hace distinto) y con gracia si se puede.

Ejemplos reales que escribio el jefe a mano:
· historia de unos kilometros para venderle a quien no podia comprar ni un boli → KILOMETROS BOLI
· meme de un cliente que se va con la competencia → COMPETENCIA
· historia de un director comercial en una fabrica → FABRICA DIRECTOR COMERCIAL
· video resumen del evento → RESUMEN EVENTO
· peloteo de la region de Canarias → CANARIAS
· cuatro preguntas sobre cliente ideal frente a sector → CLIENTE IDEAL vs SECTOR

NUNCA: el nombre del autor, "NUEVO", el tipo de post (HISTORIA, MEME, PELOTEO, VIDEO...), emojis, dos puntos ni comillas. Español de España.

Devuelve SOLO el JSON { "contexto": "..." }.`;

/**
 * La cabecera entera. Si el modelo falla, sale sin contexto ("🐝 HISTORIAAA de
 * UNAI:"): el aviso no se para por esto.
 */
export async function cabeceraChat(input: {
  pillar: string | null;
  contentType?: string | null;
  contentText: string | null;
  creatorName: string | null;
}): Promise<string> {
  const nombre = ((input.creatorName || '').trim().split(/\s+/)[0] || 'ACCOUNT').toUpperCase();
  const pilar = palabraDelPilar(input.pillar, input.contentType);
  let contexto = '';
  try {
    if (process.env.ANTHROPIC_API_KEY && (input.contentText || '').trim()) {
      const r = await trackedCreate('chat_cabecera', {
        model: 'claude-sonnet-4-6',
        max_tokens: 100,
        system: SYSTEM,
        messages: [{
          role: 'user',
          content: `PILAR: ${pilar || '(sin pilar)'}\nAUTOR: ${nombre}\n\nPOST:\n${stripLoneSurrogates(input.contentText || '').slice(0, 2500)}`,
        }],
      });
      const t = r.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map((b) => b.text).join('');
      const j = JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1)) as { contexto?: unknown };
      contexto = limpiarContexto(typeof j.contexto === 'string' ? j.contexto : '', nombre, pilar);
    }
  } catch (err: any) {
    console.warn('[cabeceraChat] sin contexto:', err?.message);
  }
  return componerCabecera(pilar, contexto, nombre);
}
