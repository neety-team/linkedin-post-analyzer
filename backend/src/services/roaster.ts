// Proxy al roaster (neety-roaster-production), la app que analiza un perfil de
// LinkedIn y devuelve la crítica ya escrita + una URL pública para compartirla.
//
// POR QUÉ UN PROXY Y NO UNA LLAMADA DESDE EL NAVEGADOR: el roaster entero va
// detrás de Basic Auth, y esas credenciales no pueden bajar al front. Aquí sí
// viven: ROASTER_USER / ROASTER_PASS. Son las de la app del ROASTER, no las de
// esta, que ya no tiene contraseña (2026-11-17). Mientras no se definan, se
// usan APP_BASIC_USER / APP_BASIC_PASS, que es donde estaban.
//
// EL DETALLE QUE HACE QUE ESTO FUNCIONE, y que conviene no romper: la app está
// cerrada pero **las páginas /r/{shareId} son PÚBLICAS**. Verificado: `/` da 401
// sin auth y `/r/loquesea` da 404, no 401. Por eso se le puede pasar ese enlace
// a un desconocido en un comentario de LinkedIn. Si algún día alguien mete /r/
// detrás del auth, este flujo muere en silencio: el enlace saldrá igual y nadie
// podrá abrirlo.
//
// ⚠️ Lo que el roaster NO hace: pedir el correo. La página /r/ enseña el análisis
// entero y gratis. Ese fue justo el agujero del lead magnet de 8.55x (483
// comentarios, cero correos). Si se quiere capturar, el gate va en OTRA página,
// no en esta.

const BASE = (process.env.ROASTER_URL || 'https://neety-roaster-production.up.railway.app').replace(/\/$/, '');

export interface RoastInput {
  /** URL del perfil de LinkedIn a analizar. */
  url: string;
  /** Contexto libre del que comenta (su sector/departamento, lo que haya escrito). */
  note?: string;
  /** Tono del análisis. El roaster tiene sus propios estilos; se le pasa tal cual. */
  style?: string;
}

/** Una sección del análisis (Banner, Titular, Destacado…). */
export interface RoastSeccion {
  seccion: string;
  estado: string;
  diagnostico: string;
}

export interface RoastResult {
  nombre: string | null;
  /** Nota sobre 10. */
  puntuacion: number | null;
  veredicto: string | null;
  secciones: RoastSeccion[];
  /**
   * ⭐ La respuesta pública YA REDACTADA. Esta es la pieza: el roaster no
   * devuelve materia prima que haya que reescribir, devuelve el comentario
   * listo para pegar. Por eso este flujo NO pasa por replyGenerator.
   */
  comentarioPublicable: string | null;
  shareId: string | null;
  /** La página pública con el análisis completo. null si el roaster no devolvió shareId. */
  shareUrl: string | null;
}

export async function roastProfile(input: RoastInput): Promise<RoastResult> {
  const user = process.env.ROASTER_USER || process.env.APP_BASIC_USER;
  const pass = process.env.ROASTER_PASS || process.env.APP_BASIC_PASS;
  if (!user || !pass) {
    throw new Error('Faltan ROASTER_USER / ROASTER_PASS: son las credenciales de la app del roaster');
  }

  const res = await fetch(`${BASE}/api/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64'),
    },
    body: JSON.stringify({
      url: input.url,
      note: input.note || undefined,
      style: input.style || undefined,
    }),
    // El roaster llama a un modelo por dentro y tarda. Sin esto, el fetch por
    // defecto de Node se queda colgado y el usuario ve el botón girando para
    // siempre.
    signal: AbortSignal.timeout(120_000),
  });

  // La forma real, verificada contra el servicio (no de memoria):
  //   { result: { nombre, puntuacion, veredicto, secciones[], comentario_publicable },
  //     sources: [...], shareId }
  // `result` es un OBJETO, no el texto del análisis.
  const body = (await res.json().catch(() => ({}))) as {
    result?: {
      nombre?: string;
      puntuacion?: number;
      veredicto?: string;
      secciones?: RoastSeccion[];
      comentario_publicable?: string;
    };
    shareId?: string;
    error?: string;
  };
  if (!res.ok) {
    throw new Error(body.error || `El roaster respondió ${res.status}`);
  }
  const r = body.result;
  if (!r || typeof r !== 'object') {
    throw new Error('El roaster no devolvió análisis');
  }

  return {
    nombre: r.nombre ?? null,
    puntuacion: typeof r.puntuacion === 'number' ? r.puntuacion : null,
    veredicto: r.veredicto ?? null,
    secciones: Array.isArray(r.secciones) ? r.secciones : [],
    comentarioPublicable: r.comentario_publicable ?? null,
    shareId: body.shareId ?? null,
    shareUrl: body.shareId ? `${BASE}/r/${body.shareId}` : null,
  };
}
