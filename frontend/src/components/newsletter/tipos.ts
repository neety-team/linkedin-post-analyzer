/**
 * Lo que devuelve GET /api/newsletter (backend/src/routes/newsletter.ts), con los
 * campos de `listarCorreos` y las métricas de `metricasNewsletter.ts`.
 */

/** Un brazo del A/B: solo tasas (0-1), Brevo no da recuentos por brazo. */
export interface Brazo {
  asunto: string;
  apertura: number | null;
  clic: number | null;
}

export interface MetricasCorreo {
  enviados: number;
  entregados: number;
  rebotes: number;
  bajas: number;
  aperturas_reales: number | null;
  apertura_real: number | null;
  personas: number;
  personas_primer_minuto: number;
  clic: number | null;
  ctor: number | null;
  ab?: { a: Brazo; b: Brazo };
}

export interface FeedbackCorreo {
  id: string;
  autor: string;
  texto: string;
  nivel: 'estilo' | 'pilar' | 'correo' | null;
  resuelto: boolean;
  respuesta: string | null;
  created_at: string;
}

export interface Correo {
  id: string;
  clave: string;
  numero: number | null;
  fecha: string | null;
  hora: string | null;
  remitente: string;
  asunto: string;
  asunto_b: string | null;
  preview: string | null;
  preview_b: string | null;
  cuerpo: string;
  gif_url: string | null;
  gif_alt: string | null;
  /** El HTML exacto del correo, con el pie: si está, la preview lo pinta tal cual. */
  html: string | null;
  enlace: string | null;
  pilar: string | null;
  tipo_cliente: string | null;
  por_que: string | null;
  /** El diario del correo: a qué listas, resultado y lo aprendido (2026-11-24). */
  notas?: string | null;
  validador: string | null;
  validador_ok: boolean;
  /** Hash del texto: se manda al aprobar para aprobar justo lo que se ve. */
  huella: string | null;
  estado: string;
  aprobado_por: string | null;
  aprobado_at: string | null;
  brevo_campaign_id: number | null;
  feedback: FeedbackCorreo[];
  metricas: MetricasCorreo | null;
  /** Lo añade la tarea de conversiones; mientras no llegue, la columna dice «—». */
  conversiones?: { demos?: number | null; inscritos?: number | null };
}

export interface RespuestaNewsletter {
  proximos: Correo[];
  enviados: Correo[];
  metricas: { configurado: boolean; ultimo_barrido: string | null; error: string | null };
  puedo_aprobar: boolean;
}

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

/** «2026-11-24» + «09:05:00» → «mar 24/11 09:05». */
export function cuandoCorreo(fecha: string | null, hora: string | null): string {
  if (!fecha) return 'Sin fecha';
  const [a, m, d] = fecha.split('-').map(Number);
  if (!a || !m || !d) return fecha;
  const dia = DIAS[new Date(Date.UTC(a, m - 1, d)).getUTCDay()];
  const hh = hora ? ` ${hora.slice(0, 5)}` : '';
  return `${dia} ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}${hh}`;
}

export const ESTADO_CORREO: Record<string, { texto: string; clase: string }> = {
  idea: { texto: 'Idea', clase: 'text-text-muted border-dashed border-border bg-bg-card' },
  borrador: { texto: 'Borrador', clase: 'text-warning border-warning/40 bg-warning/10' },
  aprobado: { texto: 'Aprobado', clase: 'text-success border-success/40 bg-success/10' },
  programado: { texto: 'Programado en Brevo', clase: 'text-data border-data/40 bg-data/10' },
  enviado: { texto: 'Enviado', clase: 'text-text-secondary border-border bg-bg-secondary' },
};
