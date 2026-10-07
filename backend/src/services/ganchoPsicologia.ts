import pool from '../db';
import { trackedCreate } from './claudeClient';

// ⭐⭐ LA PSICOLOGIA DEL GANCHO (Iker, 2026-10-07)
//
// EL AGUJERO: `hook_type` lo pone `classifyHook` (services/engagement.ts) con
// expresiones regulares pensadas para ganchos en INGLES ("Stop doing…",
// "Unpopular opinion"). Medido el 07/10: de los 170 posts de las 3 cuentas
// desde abril, 116 (68%) salian como `other`. No reconoce "Nunca vi…", "Dicen
// que…", los peloteos regionales ni "🚨 ULTIMA HORA". Con eso no se podia
// filtrar ni cruzar nada.
//
// LO QUE MIDE ESTO: no la FORMA del gancho sino QUE LE HACE AL LECTOR (Iker:
// "lo que mas nos interesa es la psicologia detras de ese gancho"). Las 14
// familias salen de cruzar los 309 ganchos reales de las 3 cuentas con las
// palancas que ya estaban documentadas: la tabla de psicologia de los asuntos
// (docs/skills/email-marketing.md) y los patrones medidos del pilar historia
// (post-workflow §4.6-SERIE: identificacion, el `Nunca`, la reivindicacion).
//
// SOLO CUENTAS PROPIAS (is_managed). `hook_type` se queda como estaba, para
// no romper la comparacion con la competencia, que sigue con el metodo viejo.
//
// SUBIR GANCHO_VERSION si cambian las familias o el prompt: el monitor vuelve
// a clasificar solo, poco a poco, todo lo que tenga otra version.
export const GANCHO_VERSION = 1;
const MODELO = 'claude-sonnet-4-6';
const POR_VUELTA = 20;
// Un fallo no se reintenta en cada vuelta: espera 6 horas.
const REINTENTO_HORAS = 6;

export const PALANCAS: Record<string, { etiqueta: string; que_hace: string; ejemplos: string[] }> = {
  identificacion: {
    etiqueta: 'Identificación',
    que_hace: 'El lector se ve retratado en una escena o una frase que ya ha vivido. No promete nada: lo reconoce.',
    ejemplos: ['Esta es la vida del comercial 👇', 'Solo voy a mirar el móvil un minuto antes de ponerme a vender 🤞', 'Mi primera clase de ventas me la soltó la madre de un amigo por teléfono 😅'],
  },
  absoluto_discutible: {
    etiqueta: 'Absoluto discutible',
    que_hace: 'Afirmación tajante desde la experiencia de quien firma (nunca, jamás, siempre, cada). El lector no puede verificarla pero la compara con la suya: le ha pasado, le pasa lo contrario o depende. Invita a comentar y a rebatir.',
    ejemplos: ['Nunca vi sonar tanto el teléfono de un director comercial 😅', 'A mí un cliente no me deja una propuesta en visto. Jamás 👇', 'Subir en ventas siempre pasa factura.'],
  },
  prejuicio_ajeno: {
    etiqueta: 'Prejuicio ajeno',
    que_hace: 'Pone en boca de OTROS un tópico o un desprecio sobre algo del lector (su región, su oficio, su sector) y deja ver que se va a desmontar. Activa orgullo y ganas de defender lo suyo.',
    ejemplos: ['La ven como el patio trasero de los Pirineos: toro, txistorra y poco más. Y exporta más que Bolivia entera 👇', 'Dicen que la IA ya viene a por el puesto del comercial 🤖', 'Media industria jura que un ordenador jamás le encontrará un cliente. Hasta que lo ven 👇'],
  },
  rompe_creencia: {
    etiqueta: 'Rompe una creencia',
    que_hace: 'Quien firma niega algo que el lector da por cierto (X no es Y, lo que crees que pasa no es lo que pasa). Choca con lo que ya piensa.',
    ejemplos: ['El cold calling no ha muerto. Lo hemos enterrado en vida 👇', 'El precio casi nunca es lo que tumba una venta.', 'Las empresas que más venden no tienen mejor producto. Tienen a alguien tragándose carretera 👇'],
  },
  bucle_abierto: {
    etiqueta: 'Curiosidad (bucle abierto)',
    que_hace: 'Promete una respuesta, una razón, un dato o un secreto que solo está en el cuerpo. El lector sigue para cerrar el hueco.',
    ejemplos: ['Llamada 79 y en recepción me hacen la única pregunta que hunde la venta 👇', 'Contraté mal. Me costó €12.000 y la razón real me sorprendió 👇', 'Nadie habla del pueblo de 7.000 habitantes que exporta más que países enteros. En 60 segundos te explico por qué 👇'],
  },
  escena: {
    etiqueta: 'Escena con final abierto',
    que_hace: 'Arranca una historia concreta con un acto raro o un objeto que se ve, y el lector quiere saber cómo acaba. Es narrativa, no reconocimiento.',
    ejemplos: ['Le pregunté a qué empresas quería vender y me plantó el portátil delante 😬', 'Cuando abrió la feria, el mejor comercial del pabellón se encerró a llamar 🤔', 'Nos entraron en casa horas antes de nuestro gran estreno en ventas 😅'],
  },
  confesion: {
    etiqueta: 'Confesión',
    que_hace: 'Quien firma admite un fallo, una pérdida o algo que le deja en mal lugar. Despierta simpatía y curiosidad por saber qué pasó.',
    ejemplos: ['Me quitaron la venta más gorda del año sin bajarme del coche 😶', 'Mi historial de Google canta más que mis ventas 👇', 'Me he fichado a mí mismo en un CRM como una oportunidad más. A ver si así alguien me mueve de etapa 👇'],
  },
  acusacion: {
    etiqueta: 'Acusación al lector',
    que_hace: 'Reproche directo al lector o a su colectivo. Incomoda y empuja a defenderse o a comprobar si va por él.',
    ejemplos: ['Si tus mensajes de prospección suenan así, mereces que te ignoren y nadie te dice esto 👇', 'Si no cierras ventas y le echas la culpa a la IA, el problema eres tú. Y nadie te lo dice 👇', 'La mayoría de comerciales son MALÍSIMOS prospectando.'],
  },
  humor_absurdo: {
    etiqueta: 'Humor absurdo',
    que_hace: 'Una imagen exagerada o imposible que hace gracia y obliga a mirar qué hay detrás.',
    ejemplos: ['Tu informe de ventas resucita clientes muertos ✨', 'El diccionario cierra más ventas que el teléfono 🤣', 'El comercial B2B ha engordado. Y no me refiero al cuerpo 😅'],
  },
  urgencia: {
    etiqueta: 'Urgencia o novedad',
    que_hace: 'Una noticia, un cambio o un plazo que el lector no se puede perder. Miedo a quedarse atrás.',
    ejemplos: ['🚨 ÚLTIMA HORA: Claude acaba de matar el cold outbound como lo conocemos 👇', 'Hoy cerramos inscripciones a las 12:00.', 'Ya solo nos quedan unos minutos para que empiece el después en ventas 👇'],
  },
  regalo: {
    etiqueta: 'Regalo o beneficio directo',
    que_hace: 'Ofrece algo útil, gratis o un ahorro concreto. Interés propio y reciprocidad.',
    ejemplos: ['Hoy desmonto perfiles de LinkedIn gratis. Sí, LinkedIn va a arder un rato 👇', 'Hoy regalo nuestra biblia de ventas gratis. Espero no arrepentirme 👇', 'La lista definitiva de 15 empresas activas a las que vender 👇'],
  },
  logro: {
    etiqueta: 'Logro o prueba social',
    que_hace: 'Una cifra, un premio o un hito propio que da autoridad. El lector mira por estatus o por saber cómo se consiguió.',
    ejemplos: ['330.000 € levantados para acelerar nuestra misión en Neety en las ventas B2B 👇', 'Neety, startup ganadora de IX Venture on the Road Bilbao 🚀', '5 días de campaña, 200 leads, 11 demos, en automático'],
  },
  pregunta: {
    etiqueta: 'Pregunta al lector',
    que_hace: 'Le pide al lector su opinión o su experiencia de forma directa.',
    ejemplos: ['¿Cuánto esperas a un no show antes de irte?', '¿Qué es ser un fundador de una startup?', '¿Para qué tener un CRM si lo vas a tener vacío o sin actualizar?'],
  },
  anuncio: {
    etiqueta: 'Anuncio sin palanca',
    que_hace: 'Informa (oferta de empleo, puesto nuevo, asistencia a un evento) sin ninguna tensión para el lector.',
    ejemplos: ['Busco 2 SDRs Junior con hambre. Es la mejor puerta de entrada a las ventas B2B que te puedo ofrecer 👇', 'Voy a ir a la BIEMH 2026 toda la semana.', 'Me complace anunciar oficialmente que comenzaré una nueva etapa…'],
  },
};
const CLAVES = Object.keys(PALANCAS);

// El gancho es el primer bloque hasta la primera linea en blanco: es lo que
// LinkedIn ensena antes del "…más".
export function extraerGancho(texto: string | null): { gancho: string; contexto: string } {
  const t = (texto || '').trim();
  const partes = t.split(/\r?\n\s*\r?\n/);
  return { gancho: (partes[0] || '').slice(0, 500), contexto: partes.slice(1).join('\n\n').slice(0, 500) };
}

const SISTEMA = `Eres analista de contenido de LinkedIn en español. Clasificas el GANCHO de un post (el primer bloque, lo que se lee antes del "…más") por su PALANCA PSICOLÓGICA: qué le hace sentir o pensar al lector para que siga leyendo o comente. No clasificas la forma ni el tema.

Las palancas posibles (usa SOLO estas claves):
${CLAVES.map((k) => `- ${k} (${PALANCAS[k].etiqueta}): ${PALANCAS[k].que_hace}\n  Ejemplos reales: ${PALANCAS[k].ejemplos.map((e) => `«${e}»`).join(' · ')}`).join('\n')}

Reglas:
- "palanca" es la que más pesa en el gancho. "palanca_2" solo si hay otra claramente presente; si no, null. Nunca la misma dos veces.
- Juzga el gancho. El contexto (lo que sigue) solo sirve para entender a qué se refiere, no para clasificar el cuerpo.
- Si el gancho está en inglés, clasifícalo igual.
- "motivo": una frase en español de España, máximo 140 caracteres, que diga qué activa en el lector y con qué palabra o imagen del gancho. Sin repetir el nombre de la palanca.
- Responde SOLO con un JSON: {"palanca": "...", "palanca_2": "..." | null, "motivo": "..."}`;

export interface ClasificacionGancho { palanca: string; palanca_2: string | null; motivo: string }

export async function clasificarGancho(texto: string | null): Promise<ClasificacionGancho | null> {
  const { gancho, contexto } = extraerGancho(texto);
  if (!gancho) return null;
  const r = await trackedCreate('gancho_psicologia', {
    model: MODELO,
    max_tokens: 300,
    system: [{ type: 'text', text: SISTEMA, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: `GANCHO:\n${gancho}\n\nCONTEXTO (lo que sigue, solo para entender):\n${contexto || '(nada)'}` }],
  });
  const bloque = r.content.find((c) => c.type === 'text') as { type: 'text'; text: string } | undefined;
  const json = bloque?.text.match(/\{[\s\S]*\}/)?.[0];
  if (!json) return null;
  const d = JSON.parse(json);
  if (!CLAVES.includes(d.palanca)) return null;
  const p2 = CLAVES.includes(d.palanca_2) && d.palanca_2 !== d.palanca ? d.palanca_2 : null;
  return { palanca: d.palanca, palanca_2: p2, motivo: String(d.motivo || '').slice(0, 200) };
}

let enVuelo = false;

// Clasifica los posts propios que no tienen la version actual. Lo llama el
// monitor en cada vuelta (POR_VUELTA posts) y el endpoint de reclasificar
// (sin tope, hasta vaciar la cola).
export async function clasificarGanchosPendientes(limite: number = POR_VUELTA): Promise<{ hechos: number; fallidos: number }> {
  if (enVuelo) return { hechos: 0, fallidos: 0 };
  enVuelo = true;
  let hechos = 0;
  let fallidos = 0;
  try {
    const { rows } = await pool.query(
      `SELECT p.id, p.content_text
         FROM posts p
         JOIN creators c ON c.id = p.creator_id
        WHERE c.is_managed = TRUE
          AND p.content_text IS NOT NULL AND length(trim(p.content_text)) > 0
          AND p.linkedin_post_id IS DISTINCT FROM 'DEMO_LIVE_POST'
          AND (p.gancho_version IS DISTINCT FROM $1)
          AND (p.gancho_intentado_at IS NULL OR p.gancho_intentado_at < NOW() - ($2 || ' hours')::interval)
        ORDER BY p.published_at DESC NULLS LAST
        LIMIT $3`,
      [GANCHO_VERSION, String(REINTENTO_HORAS), limite]
    );
    for (const p of rows) {
      await pool.query(`UPDATE posts SET gancho_intentado_at = NOW() WHERE id = $1`, [p.id]);
      try {
        const c = await clasificarGancho(p.content_text);
        if (!c) { fallidos++; continue; }
        await pool.query(
          `UPDATE posts SET gancho_palanca = $2, gancho_palanca_2 = $3, gancho_motivo = $4, gancho_version = $5 WHERE id = $1`,
          [p.id, c.palanca, c.palanca_2, c.motivo, GANCHO_VERSION]
        );
        hechos++;
      } catch (e: any) {
        fallidos++;
        console.warn(`[ganchoPsicologia] ${p.id} no clasificado:`, e?.message);
      }
    }
    if (rows.length) console.log(`[ganchoPsicologia] ${hechos}/${rows.length} gancho(s) clasificados (v${GANCHO_VERSION})`);
  } finally {
    enVuelo = false;
  }
  return { hechos, fallidos };
}

export async function estadoGanchos(): Promise<{ total: number; clasificados: number; pendientes: number }> {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE p.gancho_version = $1)::int AS clasificados
       FROM posts p JOIN creators c ON c.id = p.creator_id
      WHERE c.is_managed = TRUE AND p.content_text IS NOT NULL AND length(trim(p.content_text)) > 0
        AND p.linkedin_post_id IS DISTINCT FROM 'DEMO_LIVE_POST'`,
    [GANCHO_VERSION]
  );
  const { total, clasificados } = rows[0];
  return { total, clasificados, pendientes: total - clasificados };
}
