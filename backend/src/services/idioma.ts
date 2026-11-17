// IDIOMA DE UN TEXTO CORTO (2026-11-17). Las respuestas y los comentarios de la
// herramienta van en el idioma del texto al que contestan: a un comentario en
// ingles se le responde en ingles. Desde el 17/11 hay posts en ingles y el
// generador, pensado para castellano, contestaba en castellano y metia retoques
// que solo existen en castellano (alargar "claro", poner tildes, "gracias").
//
// Es un conteo de palabras funcionales, sin llamadas: un comentario de LinkedIn
// tiene 3-40 palabras y con eso basta. Ante la duda gana el castellano, que es
// el idioma de la casa.
export type Idioma = 'es' | 'en';

const EN = new Set([
  'the', 'and', 'is', 'are', 'was', 'were', 'you', 'your', 'this', 'that', 'it', "it's", 'its',
  'of', 'to', 'for', 'with', 'on', 'in', 'at', 'from', 'by', 'about', 'what', 'how', 'why', 'who',
  'i', "i'm", 'my', 'we', 'our', 'they', 'their', 'be', 'been', 'have', 'has', 'had', 'do', 'does',
  'did', 'not', "don't", "can't", 'can', 'will', 'would', 'should', 'just', 'so', 'very', 'really',
  'great', 'thanks', 'thank', 'congrats', 'congratulations', 'love', 'well', 'done', 'amazing',
  'awesome', 'nice', 'good', 'team', 'guys', 'all', 'more', 'than', 'but', 'or', 'if', 'when',
  'there', 'here', 'see', 'share', 'sharing', 'looking', 'forward', 'meet', 'met', 'again', 'too',
]);
const ES = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'que', 'de', 'del', 'y', 'en', 'es', 'son', 'por', 'para',
  'con', 'sin', 'lo', 'se', 'su', 'sus', 'al', 'muy', 'mas', 'más', 'pero', 'como', 'cómo', 'qué',
  'esto', 'eso', 'este', 'esta', 'gracias', 'enhorabuena', 'genial', 'gran', 'buen', 'buena',
  'bueno', 'todo', 'todos', 'nos', 'os', 'me', 'te', 'mi', 'tu', 'yo', 'vosotros', 'equipo', 'hay',
  'ya', 'sí', 'si', 'no', 'cuando', 'donde', 'dónde', 'porque', 'también', 'tambien', 'mucho',
]);

// `porDefecto`: para lo que no da ninguna pista ("Wow!", "🔥"), el idioma del
// post al que se contesta.
export function idiomaDe(texto: string | null | undefined, porDefecto: Idioma = 'es'): Idioma {
  const palabras = String(texto || '').toLowerCase().match(/[a-záéíóúüñ']+/g) || [];
  if (/[ñ¿¡áéíóú]/i.test(String(texto || ''))) {
    // Una tilde o una eñe es castellano casi seguro, salvo nombres propios: se
    // exige ademas que el ingles no gane por goleada.
    const en = palabras.filter((p) => EN.has(p)).length;
    const es = palabras.filter((p) => ES.has(p)).length;
    return en >= 4 && en > es * 3 ? 'en' : 'es';
  }
  let en = 0;
  let es = 0;
  for (const p of palabras) {
    if (EN.has(p)) en++;
    if (ES.has(p)) es++;
  }
  if (!en && !es) return porDefecto;
  return en > es ? 'en' : 'es';
}
