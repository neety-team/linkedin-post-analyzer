import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  guardarCorreos,
  listarCorreos,
  vincularCampana,
  listarFeedbackCorreos,
  resolverFeedbackCorreo,
  REMITENTES,
  NIVELES_CORREO,
} from '../services/newsletter';
import { refrescarMetricas, estadoMetricas, estadoBarrido } from '../services/metricasNewsletter';

/**
 * Las tools de LA NEWSLETTER (2026-11-20): los correos de la base, su
 * feedback y la lectura de Brevo. Por aqui no se puede aprobar: solo Iker
 * aprueba, desde la pagina Newsletter.
 */

function texto(s: string) {
  return { content: [{ type: 'text' as const, text: s }] };
}

function error(e: unknown) {
  return {
    content: [{ type: 'text' as const, text: `Error: ${(e as Error)?.message || String(e)}` }],
    isError: true,
  };
}

const correoEntrada = z.object({
  clave: z
    .string()
    .describe('Identificador estable del correo, p. ej. "2026-11-24-kaixito". No cambia al reescribirlo'),
  numero: z.number().int().optional().describe('Número de la tanda'),
  fecha: z.string().optional().describe('YYYY-MM-DD, día de envío'),
  hora: z.string().optional().describe('HH:MM, hora de Madrid'),
  remitente: z.enum(REMITENTES).optional(),
  asunto: z.string().optional(),
  asunto_b: z.string().nullable().optional().describe('Asunto de la variante B del A/B, si hay'),
  preview: z.string().optional().describe('Texto de previsualización'),
  preview_b: z.string().nullable().optional(),
  cuerpo: z.string().optional().describe('El cuerpo del correo tal cual se enviaría'),
  gif_url: z.string().nullable().optional(),
  gif_alt: z.string().nullable().optional(),
  enlace: z.string().nullable().optional(),
  utm_campaign: z.string().nullable().optional(),
  utm_source: z.string().nullable().optional(),
  pilar: z.string().nullable().optional(),
  tipo_cliente: z.string().nullable().optional(),
  por_que: z.string().nullable().optional().describe('Por qué se manda este correo'),
  validador: z.string().nullable().optional().describe('La salida del validador de email'),
  validador_ok: z.boolean().optional().describe('Si el validador dio ENTREGABLE: SÍ'),
  estado: z
    .enum(['idea', 'borrador'])
    .optional()
    .describe('Solo idea o borrador. Aprobar es cosa de Iker en la página Newsletter'),
});

const pct = (n: number | null | undefined) => (n == null ? '—' : `${(n * 100).toFixed(1)}%`);

function lineaCorreo(c: any): string {
  const partes = [
    `${c.clave} · ${c.estado}`,
    c.fecha ? `${c.fecha}${c.hora ? ' ' + c.hora : ''}` : 'sin fecha',
    c.remitente || 'sin remitente',
    `«${c.asunto || '(sin asunto)'}»${c.asunto_b ? ` / B «${c.asunto_b}»` : ''}`,
  ];
  let s = partes.join(' · ');
  if (c.brevo_campaign_id != null) s += ` · campaña Brevo ${c.brevo_campaign_id}`;
  const m = c.metricas;
  if (m) {
    s +=
      `\n    métricas: ${m.enviados} enviados, ${m.entregados} entregados, apertura real ${pct(m.apertura_real)}, ` +
      `clic ${pct(m.clic)}, CTOR ${pct(m.ctor)}, bajas ${m.bajas}, rebotes ${m.rebotes}`;
  }
  const pend = (c.feedback || []).filter((f: any) => !f.resuelto).length;
  if (pend) s += `\n    feedback pendiente: ${pend}`;
  return s;
}

export function registrarToolsNewsletter(servidor: McpServer): void {
  servidor.registerTool(
    'neety_newsletter_publicar',
    {
      title: 'Crear o actualizar correos de la newsletter',
      description:
        'Guarda correos para que los fundadores los vean en la página Newsletter. Cada correo se ' +
        'identifica por su `clave`. NO borra: en un correo que ya existe solo cambian los campos que ' +
        'vienen, y su feedback se conserva. El estado solo puede ser idea o borrador: aprobar lo hace ' +
        'Iker en la página. Si cambia el texto de un correo aprobado, vuelve a borrador. Un correo ya ' +
        'programado o enviado no se reescribe: viene en `rechazados` con su motivo.',
      inputSchema: {
        correos: z.array(correoEntrada).describe('Los correos a crear o actualizar'),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async (args) => {
      try {
        const r = await guardarCorreos(args.correos as any);
        const l = [`Guardados (${r.guardados.length}): ${r.guardados.join(', ') || 'ninguno'}`];
        if (r.rechazados.length) {
          l.push(`Rechazados (${r.rechazados.length}):`);
          for (const x of r.rechazados) l.push(`  - ${x.clave || '(sin clave)'}: ${x.motivo}`);
        }
        return texto(l.join('\n'));
      } catch (e) {
        return error(e);
      }
    }
  );

  servidor.registerTool(
    'neety_newsletter_ver',
    {
      title: 'Ver los correos de la newsletter',
      description:
        'Los correos con su estado, fecha, remitente, asunto (y asunto B), el feedback pendiente y, si ' +
        'tienen campaña en Brevo, sus métricas. Dice también si las métricas están configuradas.',
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () => {
      try {
        const { proximos, enviados } = await listarCorreos();
        const { configurado } = estadoMetricas();
        const barrido = await estadoBarrido();
        const l = [
          configurado
            ? `Métricas: configuradas. Último barrido de clics: ${barrido.ultimo_at || 'ninguno'}${barrido.error ? ` (error: ${barrido.error})` : ''}`
            : 'Métricas: sin clave (falta BREVO_API_KEY), no se leen campañas de Brevo',
          '',
          `PRÓXIMOS (${proximos.length})`,
          ...(proximos.length ? proximos.map(lineaCorreo) : ['(ninguno)']),
          '',
          `ENVIADOS (${enviados.length})`,
          ...(enviados.length ? enviados.map(lineaCorreo) : ['(ninguno)']),
        ];
        return texto(l.join('\n'));
      } catch (e) {
        return error(e);
      }
    }
  );

  servidor.registerTool(
    'neety_newsletter_vincular',
    {
      title: 'Vincular un correo con su campaña de Brevo',
      description:
        'Enlaza un correo con la campaña de Brevo. Con `campaign_id` pasa a programado y exige que esté ' +
        'aprobado por Iker. Con `historico` pasa a enviado sin exigirlo (solo para cargar lo ya enviado). ' +
        'Con null desvincula y vuelve a borrador.',
      inputSchema: {
        clave: z.string().describe('La clave del correo'),
        campaign_id: z.number().int().nullable().describe('Id de la campaña en Brevo, o null para desvincular'),
        historico: z.boolean().optional().describe('true solo para un correo que ya se envió'),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async (args) => {
      try {
        const r = await vincularCampana(args.clave, args.campaign_id, { historico: args.historico });
        if (r === 'no_existe') return error(new Error(`No existe el correo ${args.clave}`));
        if (r === 'no_aprobado')
          return error(new Error(`El correo ${args.clave} no está aprobado: solo Iker lo aprueba en la página Newsletter`));
        return texto(
          args.campaign_id == null
            ? `Correo ${args.clave} desvinculado, vuelve a borrador.`
            : `Correo ${args.clave} vinculado a la campaña ${args.campaign_id}.`
        );
      } catch (e) {
        return error(e);
      }
    }
  );

  servidor.registerTool(
    'neety_newsletter_feedback',
    {
      title: 'Leer el feedback de los correos',
      description:
        'El feedback que los fundadores han dejado en los correos de la newsletter. Por defecto solo el ' +
        'pendiente; con `pendiente: false` devuelve todo.',
      inputSchema: {
        pendiente: z.boolean().optional().describe('Por defecto true: solo lo que falta por atender'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (args) => {
      try {
        const fb = await listarFeedbackCorreos({ pendiente: args.pendiente });
        if (!fb.length) return texto('No hay feedback.');
        return texto(
          fb
            .map(
              (f: any) =>
                `[${f.id}] ${f.clave} (${f.fecha || 'sin fecha'}, ${f.remitente || '—'}) · ${f.autor}: ${f.texto}` +
                (f.resuelto ? `\n    resuelto como ${f.nivel}: ${f.respuesta}` : '')
            )
            .join('\n')
        );
      } catch (e) {
        return error(e);
      }
    }
  );

  servidor.registerTool(
    'neety_newsletter_feedback_resolver',
    {
      title: 'Cerrar un feedback de un correo',
      description:
        'Cierra un feedback diciendo en qué nivel se aplicó (estilo = regla general, pilar = regla de ese ' +
        'pilar, correo = cambio solo de ese correo) y qué se cambió.',
      inputSchema: {
        id: z.string().describe('El id del feedback'),
        nivel: z.enum(NIVELES_CORREO),
        respuesta: z.string().describe('Qué se cambió, para que quien lo dejó lo vea'),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async (args) => {
      try {
        const r = await resolverFeedbackCorreo(args.id, { nivel: args.nivel, respuesta: args.respuesta });
        if (!r) return error(new Error(`No existe el feedback ${args.id}`));
        return texto(`Feedback ${args.id} cerrado como ${args.nivel}.`);
      } catch (e) {
        return error(e);
      }
    }
  );

  servidor.registerTool(
    'neety_newsletter_refrescar',
    {
      title: 'Leer de nuevo las métricas de Brevo',
      description:
        'Lee ahora las campañas vinculadas de Brevo y actualiza sus métricas. Sin BREVO_API_KEY no hace nada.',
      inputSchema: {},
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async () => {
      try {
        if (!estadoMetricas().configurado) return texto('Sin clave de Brevo (BREVO_API_KEY): no se lee nada.');
        const r = await refrescarMetricas();
        return texto(
          `Campañas leídas: ${r.campanas}.` + (r.error ? ` Error: ${r.error}` : ' Sin errores.')
        );
      } catch (e) {
        return error(e);
      }
    }
  );
}
