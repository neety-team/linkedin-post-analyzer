import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  buscarOutliers,
  facetasOutliers,
  agruparOutliers,
  saludCorpus,
  FiltrosOutliers,
} from '../services/outlierQuery';
import {
  arrancarRefresco,
  estadoRefresco,
  contarCreadores,
  AmbitoRefresco,
  EstadoRefresco,
} from '../services/outlierRefresh';
import {
  novedadesOutliers,
  marcarEventosEnviados,
  digestOutliers,
  detallePost,
  cuentasGestionadas,
} from '../services/outlierDigest';
import { fecha, numero, lineaOutlier, tabla, pie, FilaOutlier } from './format';

/**
 * Las tools del MCP, montadas DENTRO del backend.
 *
 * POR QUE AQUI Y NO EN mcp/ (el servidor stdio)
 * ---------------------------------------------
 * El servidor stdio necesita el repo clonado en la maquina donde corre Claude,
 * y eso deja fuera los tres sitios desde los que mas se consulta esto: una
 * sesion remota de Claude Code, claude.ai y el movil. Montado aqui se conecta
 * cualquiera con una URL y una cabecera, sin clonar ni compilar nada.
 *
 * Ademas estas tools llaman a los servicios DIRECTAMENTE, sin dar la vuelta
 * por HTTP: el mismo proceso que sirve /api/outliers sirve /mcp.
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

const filtrosBase = {
  ambito: z
    .enum(['propias', 'competencia', 'todas'])
    .optional()
    .describe('propias = las 3 cuentas de founder; competencia = el resto del corpus'),
  creador: z.string().optional().describe('Filtra por nombre del creador (parcial)'),
  seguidores_min: z.number().optional(),
  seguidores_max: z
    .number()
    .optional()
    .describe('Un 6x de una cuenta de 2k no es la misma lección que uno de 200k'),
  desde: z.string().optional().describe('ISO o YYYY-MM-DD'),
  hasta: z.string().optional(),
  ultimos_dias: z.number().optional(),
  solo_outliers: z
    .boolean()
    .optional()
    .describe('Por defecto true. Ponlo a false para tener el denominador (tasa de acierto)'),
  ratio_min: z.number().optional(),
  ratio_max: z.number().optional(),
  likes_min: z.number().optional(),
  likes_max: z.number().optional(),
  comentarios_min: z.number().optional(),
  reposts_min: z.number().optional(),
  impresiones_min: z.number().optional(),
  engagement_min: z.number().optional(),
  comment_like_ratio_min: z.number().optional().describe('Señal de DEBATE: comentarios ÷ likes'),
  share_like_ratio_min: z.number().optional().describe('Señal de UTILIDAD: reposts ÷ likes'),
  guardados_min: z.number().optional().describe('Premium, solo cuentas propias'),
  clics_enlace_min: z.number().optional().describe('Premium, solo cuentas propias'),
  pilar: z
    .array(z.string())
    .optional()
    .describe('peloteo_mapa | peloteo_los10 | peloteo_objeto | lead_magnet | meme | historia | otro'),
  tema: z
    .array(z.string())
    .optional()
    .describe('Consulta antes neety_outliers_valores: el tema es texto libre y hay sinónimos'),
  hook_type: z.array(z.string()).optional(),
  gancho: z
    .array(z.string())
    .optional()
    .describe('Psicología del gancho, solo cuentas propias: identificacion | absoluto_discutible | prejuicio_ajeno | rompe_creencia | bucle_abierto | escena | confesion | acusacion | humor_absurdo | urgencia | regalo | logro | pregunta | anuncio'),
  estructura: z.array(z.string()).optional(),
  tono: z.array(z.string()).optional(),
  tipo_contenido: z.array(z.string()).optional().describe('text, text_image, text_video…'),
  idioma: z.string().optional(),
  longitud_min: z.number().optional().describe('Caracteres'),
  longitud_max: z.number().optional(),
  q: z.string().optional().describe('Busca en el texto y el hook. No depende de las categorías'),
  modo: z.enum(['frase', 'todas', 'cualquiera']).optional(),
  excluir: z.string().optional(),
};

function minutos(seg: number | null): string {
  if (seg == null) return '—';
  if (seg < 90) return `${seg}s`;
  return `${Math.round(seg / 60)} min`;
}

/** El progreso de un refresco, en texto. */
function renderEstado(e: EstadoRefresco): string {
  const pct = e.total ? Math.round((e.procesados / e.total) * 100) : 0;
  const cabecera: Record<string, string> = {
    en_curso: `⏳ En curso — ${e.procesados}/${e.total} creadores (${pct}%)`,
    terminado: `✅ Terminado — ${e.procesados}/${e.total} creadores`,
    fallido: `❌ Falló — ${e.procesados}/${e.total} creadores procesados antes de caerse`,
    abandonado: `⚠️ Abandonado — ${e.procesados}/${e.total}. El proceso murió (redeploy o caída); lo procesado se guardó`,
  };

  const lineas = [
    cabecera[e.estado] || e.estado,
    '',
    `Ámbito: ${e.ambito} · lleva ${minutos(e.segundos_transcurridos)}` +
      (e.segundos_por_creador != null ? ` · ${e.segundos_por_creador}s por creador` : ''),
  ];

  if (e.estado === 'en_curso') {
    lineas.push(
      `Quedan ~${minutos(e.segundos_restantes_estimados)}` +
        (e.creador_actual ? ` · ahora mismo: ${e.creador_actual}` : '')
    );
  }

  lineas.push(
    '',
    `Posts nuevos: ${e.posts_nuevos}`,
    `Eventos: ${e.eventos.nuevo} nuevos · ${e.eventos.promovido} promovidos · ${e.eventos.degradado} degradados`
  );

  if (e.con_error > 0) {
    lineas.push('', `Creadores con error: ${e.con_error}`);
    for (const err of (e.errores || []).slice(0, 8)) {
      lineas.push(`  · ${err.nombre || '?'}: ${err.error}`);
    }
  }
  if (e.error) lineas.push('', `Error del job: ${e.error}`);

  if (e.estado === 'terminado' && e.eventos.nuevo + e.eventos.promovido > 0) {
    lineas.push('', 'Ya puedes llamar a neety_digest para el resumen de lo más viral.');
  }
  if (e.eventos.promovido > 0) {
    lineas.push(
      '',
      '"Promovido" = post viejo que cruzó el umbral porque bajó la media del creador, no porque ' +
        'le haya pasado nada nuevo. Trátalo distinto de un "nuevo".'
    );
  }
  return lineas.join('\n');
}

/** Registra las tools sobre un McpServer ya creado. */
export function registrarTools(servidor: McpServer): void {
  // --- refrescar -----------------------------------------------------------

  servidor.registerTool(
    'neety_refrescar',
    {
      title: 'Arrancar el refresco de la base de outliers',
      description:
        'Lanza el reescaneo de creadores contra LinkedIn y VUELVE EN EL ACTO — el trabajo sigue ' +
        'en segundo plano porque con muchos creadores tarda minutos, bastante más que el timeout ' +
        'de una tool. NO vuelvas a llamar a esta tool para ver si terminó: usa ' +
        'neety_refrescar_estado, que te da el progreso y el tiempo que queda. Empieza por los ' +
        'creadores que llevan más tiempo sin escanearse, así que en varias vueltas se recorre ' +
        'todo el corpus sin reventar la cuota de Unipile.',
      inputSchema: {
        ambito: z
          .enum(['competencia', 'propias', 'todas'])
          .optional()
          .describe('Por defecto competencia: las propias ya las vigila el monitor cada 15 min'),
        limite: z
          .number()
          .optional()
          .describe('Creadores en esta vuelta (por defecto 25, máximo 500). Cabe el corpus entero'),
        creator_ids: z.array(z.string()).optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    },
    async (args) => {
      try {
        const conteo = await contarCreadores();
        const r = await arrancarRefresco({
          ambito: args.ambito as AmbitoRefresco,
          limite: args.limite,
          creator_ids: args.creator_ids,
        });

        if (r.ya_habia_uno) {
          const e = await estadoRefresco(r.job.id);
          return texto(
            'Ya hay un refresco en curso, no se ha lanzado otro.\n\n' +
              (e ? renderEstado(e) : '') +
              '\n\nUsa neety_refrescar_estado para seguirlo.'
          );
        }

        if (r.job.total === 0) {
          return texto(
            `No hay creadores que refrescar en el ámbito "${r.job.ambito}".\n\n` +
              `Disponibles: ${conteo.competencia} de competencia · ${conteo.propias} propias.`
          );
        }

        // Sin historial no hay con qué estimar; en cuanto haya un job cerrado,
        // estadoRefresco da segundos_por_creador reales.
        const estimado = Math.round((r.job.total * 4) / 60);
        return texto(
          [
            `Refresco arrancado (${r.job.ambito}).`,
            '',
            `Creadores en esta vuelta: ${r.job.total} de ${conteo.total} en total` +
              (conteo.sin_escanear ? ` · ${conteo.sin_escanear} sin escanear nunca` : ''),
            `Estimado: ~${estimado} min (a ojo, hasta que haya medidas reales)`,
            `job_id: ${r.job.id}`,
            '',
            'Corre en segundo plano. Llama a neety_refrescar_estado dentro de un rato para ver ' +
              'cómo va — no vuelvas a llamar a neety_refrescar, eso no lo acelera y te dirá que ' +
              'ya hay uno en curso.',
          ].join('\n')
        );
      } catch (e) {
        return error(e);
      }
    }
  );

  servidor.registerTool(
    'neety_refrescar_estado',
    {
      title: 'Cómo va el refresco',
      description:
        'El progreso del refresco en curso (o el resultado del último): cuántos creadores lleva, ' +
        'cuánto queda, qué eventos de outlier ha generado y qué creadores han fallado. Es la ' +
        'forma de saber si terminó — la tool que lo arranca vuelve antes de que acabe.',
      inputSchema: {
        job_id: z.string().optional().describe('Por defecto, el refresco más reciente'),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ job_id }) => {
      try {
        const e = await estadoRefresco(job_id);
        if (!e) return texto('No se ha lanzado ningún refresco todavía.');
        return texto(renderEstado(e));
      } catch (e) {
        return error(e);
      }
    }
  );

  // --- digest --------------------------------------------------------------

  servidor.registerTool(
    'neety_digest',
    {
      title: 'Resumen de lo más viral del momento',
      description:
        'El agregado: qué outliers nuevos han aparecido, qué formatos suben y cuáles se están ' +
        'fatigando, y de qué parte del dato te puedes fiar. Pensado para el resumen diario a ' +
        'marketing y growth. Devuelve los ids de evento; para que un post no vuelva a salir ' +
        'mañana, márcalo con neety_digest_marcar.',
      inputSchema: {
        dias: z.number().optional().describe('Ventana de novedades. Por defecto 1 (desde ayer)'),
        ratio_min: z.number().optional().describe('Multiplicador mínimo. Por defecto 3'),
        solo_pendientes: z
          .boolean()
          .optional()
          .describe('Por defecto true: solo lo que no se ha mandado nunca'),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ dias, ratio_min, solo_pendientes }) => {
      try {
        const d = await digestOutliers({ dias, ratio_min, solo_pendientes });
        const bloques: string[] = [`📊 Outliers · ${fecha(d.generado_en)}`];

        if (!d.novedades.length) {
          bloques.push(
            '',
            `🆕 Sin novedades en los últimos ${d.ventana_dias} día(s) por encima de ${ratio_min ?? 3}x.`,
            '',
            'Si esto se repite varios días, comprueba con neety_refrescar que el corpus se actualiza.'
          );
        } else {
          bloques.push('', `🆕 ${d.novedades.length} novedades`);
          for (const n of d.novedades) {
            const etiqueta =
              n.evento === 'promovido' ? ' [promovido: bajó la media, no creció el post]' : '';
            bloques.push(`  ${lineaOutlier(n as FilaOutlier)}${etiqueta}`);
            if (n.url) bloques.push(`     ${n.url}`);
          }
        }

        const conclusivas = d.tendencias.filter((t) => t.concluyente && t.delta_pct !== null);
        if (conclusivas.length) {
          bloques.push('', '📈 Tendencia por pilar (30 días vs los 30 anteriores)');
          bloques.push(
            tabla(
              ['pilar', 'n', 'ratio antes', 'ratio ahora', 'delta'],
              conclusivas.map((t) => [
                t.pilar,
                `${t.n_previo}→${t.n_reciente}`,
                t.ratio_previo?.toFixed(2) ?? '—',
                t.ratio_reciente?.toFixed(2) ?? '—',
                `${(t.delta_pct as number) > 0 ? '+' : ''}${t.delta_pct}%`,
              ])
            )
          );
        }
        const flojas = d.tendencias.filter((t) => !t.concluyente).length;
        if (flojas) {
          bloques.push(`  (${flojas} pilar(es) con menos de 3 posts por ventana: no concluyentes)`);
        }

        const s = d.salud;
        const partes = [
          `${numero(s.outliers)} outliers de ${numero(s.posts)} posts`,
          s.outliers_sin_tema ? `${s.outliers_sin_tema} outliers sin tema` : null,
          s.posibles_duplicados ? `${s.posibles_duplicados} pares de temas duplicados` : null,
        ].filter(Boolean);
        bloques.push('', `⚠️ Salud del dato: ${partes.join(' · ')}`);
        for (const f of s.frescura || []) {
          bloques.push(
            `  ${f.gestionada ? 'Cuentas propias' : 'Competencia'}: ${f.creadores} creadores · ` +
              `escaneo más antiguo ${fecha(f.mas_antiguo)}`
          );
        }

        const ids = d.novedades.map((n) => n.evento_id);
        if (ids.length) {
          bloques.push(
            '',
            `Para no repetirlas mañana: neety_digest_marcar con estos evento_ids → ${ids.join(',')}`
          );
        }
        return texto(bloques.join('\n'));
      } catch (e) {
        return error(e);
      }
    }
  );

  servidor.registerTool(
    'neety_digest_marcar',
    {
      title: 'Marcar novedades como ya enviadas',
      description:
        'Sella los eventos que ya han salido en un resumen para que no vuelvan a aparecer. ' +
        'Llámalo DESPUÉS de mandar el digest: si el envío falla y ya los marcaste, se pierden.',
      inputSchema: { evento_ids: z.array(z.string()).describe('Los que devuelve neety_digest') },
      annotations: { readOnlyHint: false, idempotentHint: true },
    },
    async ({ evento_ids }) => {
      try {
        return texto(`${await marcarEventosEnviados(evento_ids)} evento(s) marcados como enviados.`);
      } catch (e) {
        return error(e);
      }
    }
  );

  servidor.registerTool(
    'neety_novedades',
    {
      title: 'Outliers nuevos, en crudo',
      description:
        'Los outliers que han entrado (o salido) en una ventana, sin resumir. Úsalo cuando ' +
        'quieras la lista completa en vez del digest, o para mirar los degradados.',
      inputSchema: {
        dias: z.number().optional().describe('Por defecto 7'),
        desde: z.string().optional(),
        ratio_min: z.number().optional(),
        eventos: z.array(z.enum(['nuevo', 'promovido', 'degradado'])).optional(),
        solo_pendientes: z.boolean().optional(),
        limit: z.number().optional(),
      },
      annotations: { readOnlyHint: true },
    },
    async (args) => {
      try {
        const filas = await novedadesOutliers(args);
        if (!filas.length) return texto('Sin eventos en esa ventana.');
        return texto(
          filas.map((n: any) => `[${n.evento}] ${lineaOutlier(n as FilaOutlier)}`).join('\n') +
            pie({ devueltos: filas.length, total: filas.length })
        );
      } catch (e) {
        return error(e);
      }
    }
  );

  // --- buscar --------------------------------------------------------------

  servidor.registerTool(
    'neety_outliers_buscar',
    {
      title: 'Buscar en el corpus de outliers',
      description:
        'El buscador. Filtra por fecha, creador, multiplicador, likes, comentarios, impresiones, ' +
        'pilar, tema, tipo de hook, estructura, tono, longitud, tamaño de la cuenta y texto ' +
        'libre. AVISO: las categorías (tema sobre todo) están incompletas y tienen sinónimos — ' +
        'si buscas por tema, pasa antes por neety_outliers_valores, y si el resultado parece ' +
        'corto, prueba con `q` (texto libre), que no depende de la etiqueta.',
      inputSchema: {
        ...filtrosBase,
        orden: z
          .enum([
            'ratio',
            'percentil',
            'likes',
            'comentarios',
            'reposts',
            'impresiones',
            'engagement',
            'fecha',
            'fecha_asc',
            'debate',
            'utilidad',
          ])
          .optional()
          .describe('Por defecto ratio. Usa `percentil` cuando mezcles propias y competencia'),
        limit: z.number().optional().describe('1-100, por defecto 25'),
        cursor: z
          .string()
          .optional()
          .describe(
            'Para recorrer TODO el corpus: pasa aquí el `cursor` que devolvió la llamada ' +
              'anterior. Continúa exactamente donde se quedó, aunque haya un refresco corriendo. ' +
              'No cambies el `orden` a mitad de paginación'
          ),
        offset: z
          .number()
          .optional()
          .describe('Salto directo a una posición. Para recorrer todo usa `cursor`, es más fiable'),
      },
      annotations: { readOnlyHint: true },
    },
    async (args) => {
      try {
        const { filas, total, orden, cursor_siguiente } = await buscarOutliers(
          args as FiltrosOutliers
        );
        if (!filas.length) {
          return texto(
            args.cursor
              ? 'Fin de la lista: no quedan más resultados.'
              : 'Sin resultados.\n\nAntes de dar la búsqueda por vacía: si filtraste por `tema` o ' +
                  '`pilar`, mira qué valores existen con neety_outliers_valores — las etiquetas ' +
                  'están incompletas. Con `q` buscas en el texto y te saltas ese problema.'
          );
        }
        const mezcla = new Set(filas.map((f) => f.metodo)).size > 1;
        const sinTema = filas.filter((f) => !f.tema).length;
        return texto(
          filas.map((f) => lineaOutlier(f as unknown as FilaOutlier)).join('\n') +
            pie({
              devueltos: filas.length,
              total,
              hay_mas: cursor_siguiente !== null,
              mezclaMetodos: mezcla,
              sinEtiqueta: sinTema,
              nota: `orden: ${orden}`,
              cursor: cursor_siguiente,
            })
        );
      } catch (e) {
        return error(e);
      }
    }
  );

  servidor.registerTool(
    'neety_outliers_valores',
    {
      title: 'Qué valores existen (facetas)',
      description:
        'Los valores que EXISTEN de verdad en un eje, con su recuento y su ratio medio. Llámalo ' +
        'antes de filtrar por una categoría: el tema lo asigna un LLM en texto libre, así que ' +
        'conviven "Sales Tactics", "Sales Tips" y "B2B Sales" para lo mismo, y filtrar por uno ' +
        'pierde los otros dos en silencio. El hueco de los que no tienen etiqueta sale como fila.',
      inputSchema: {
        eje: z.enum([
          'tema',
          'pilar',
          'hook',
          'gancho',
          'estructura',
          'tono',
          'tipo_contenido',
          'creador',
          'idioma',
        ]),
        ...filtrosBase,
      },
      annotations: { readOnlyHint: true },
    },
    async ({ eje, ...filtros }) => {
      try {
        const valores = await facetasOutliers(eje, filtros as FiltrosOutliers);
        if (!valores.length) return texto('Sin valores para esos filtros.');
        return texto(
          tabla(
            [eje, 'n', 'ratio medio', 'máx'],
            valores.map((v) => [
              v.valor ?? '(sin etiqueta)',
              v.n,
              v.ratio_medio?.toFixed(2) ?? '—',
              v.ratio_max?.toFixed(2) ?? '—',
            ])
          )
        );
      } catch (e) {
        return error(e);
      }
    }
  );

  servidor.registerTool(
    'neety_outliers_agrupar',
    {
      title: 'Agregado por dimensión',
      description:
        'Group-by genérico: n, tasa de acierto, ratio medio y mediano, likes y comentarios ' +
        'medios. Para "¿qué formato funciona mejor?" usa tasa_outlier con solo_outliers=false — ' +
        'el ratio medio de una lista ya filtrada a outliers está sesgado por construcción.',
      inputSchema: {
        dimension: z.enum([
          'pilar',
          'tema',
          'hook',
          'gancho',
          'estructura',
          'tono',
          'tipo_contenido',
          'creador',
          'cuenta',
          'idioma',
          'dia_semana',
          'hora',
          'mes',
          'semana',
          'bucket_longitud',
          'bucket_seguidores',
        ]),
        ...filtrosBase,
      },
      annotations: { readOnlyHint: true },
    },
    async ({ dimension, ...filtros }) => {
      try {
        const filas = await agruparOutliers(dimension, filtros as FiltrosOutliers);
        if (!filas.length) return texto('Sin datos para esos filtros.');
        const flojas = filas.filter((f) => f.n < 5).length;
        return texto(
          tabla(
            [dimension, 'n', 'outliers', '% acierto', 'ratio medio', 'mediana', '♥ medios'],
            filas.map((f) => [
              (f.valor ?? '(sin etiqueta)') + (f.n < 5 ? ' ⚠' : ''),
              f.n,
              f.outliers,
              f.tasa_outlier != null ? `${f.tasa_outlier}%` : '—',
              f.ratio_medio?.toFixed(2) ?? '—',
              f.ratio_mediano?.toFixed(2) ?? '—',
              numero(f.likes_medios),
            ])
          ) + (flojas ? '\n\n⚠ = menos de 5 posts. No saques conclusiones de esas filas.' : '')
        );
      } catch (e) {
        return error(e);
      }
    }
  );

  servidor.registerTool(
    'neety_outliers_comparar',
    {
      title: 'Comparar dos ventanas de tiempo',
      description:
        'Una ventana contra la anterior, agrupado por la dimensión que elijas. Es la tool de ' +
        '"¿los lead magnets funcionan peor que antes?". Marca como no concluyentes las filas ' +
        'con menos de 3 posts por lado.',
      inputSchema: {
        dimension: z
          .enum(['pilar', 'tema', 'hook', 'gancho', 'estructura', 'tono', 'tipo_contenido', 'creador', 'cuenta'])
          .optional(),
        dias: z.number().optional().describe('Tamaño de cada ventana. Por defecto 90'),
        ...filtrosBase,
      },
      annotations: { readOnlyHint: true },
    },
    async ({ dimension, dias, ...filtros }) => {
      try {
        const dim = dimension || 'pilar';
        const ventana = dias || 90;
        const ms = ventana * 24 * 60 * 60 * 1000;
        const ahora = Date.now();
        const corteA = new Date(ahora - ms).toISOString();
        const corteB = new Date(ahora - 2 * ms).toISOString();
        const base = filtros as FiltrosOutliers;

        const [recientes, previos] = await Promise.all([
          agruparOutliers(dim, { ...base, desde: corteA, hasta: undefined, ultimos_dias: undefined }),
          agruparOutliers(dim, { ...base, desde: corteB, hasta: corteA, ultimos_dias: undefined }),
        ]);

        const previoPorValor = new Map(previos.map((p) => [String(p.valor), p]));
        const vistos = new Set(recientes.map((r) => String(r.valor)));
        const filas = [
          ...recientes.map((r) => ({ r, p: previoPorValor.get(String(r.valor)) || null })),
          ...previos.filter((p) => !vistos.has(String(p.valor))).map((p) => ({ r: null, p })),
        ]
          .filter((f) => (f.r?.valor ?? f.p?.valor) != null)
          .map((f) => {
            const rA = f.r?.ratio_medio ?? null;
            const rB = f.p?.ratio_medio ?? null;
            const delta = rA != null && rB != null && rB > 0 ? Math.round(((rA - rB) / rB) * 100) : null;
            return [
              f.r?.valor ?? f.p?.valor,
              `${f.p?.n ?? 0}→${f.r?.n ?? 0}`,
              rB?.toFixed(2) ?? '—',
              rA?.toFixed(2) ?? '—',
              delta != null ? `${delta > 0 ? '+' : ''}${delta}%` : '—',
              (f.r?.n ?? 0) >= 3 && (f.p?.n ?? 0) >= 3 ? '' : 'no concluyente',
            ];
          });

        if (!filas.length) return texto('Sin datos para comparar.');
        return texto(
          `Ventanas de ${ventana} días (reciente desde ${fecha(corteA)}).\n\n` +
            tabla([dim, 'n antes→ahora', 'ratio antes', 'ratio ahora', 'delta', ''], filas)
        );
      } catch (e) {
        return error(e);
      }
    }
  );

  // --- post, cuentas, salud ------------------------------------------------

  servidor.registerTool(
    'neety_post',
    {
      title: 'Un post entero con su diagnóstico',
      description:
        'El texto completo, todas las métricas (incluidas las Premium: guardados, envíos, clics ' +
        'al enlace, visitas al perfil) y el diagnóstico de por qué funcionó: motor de viralidad, ' +
        'mecanismo narrativo y plantilla abstracta.',
      inputSchema: { post_id: z.string().describe('El UUID que devuelve el buscador') },
      annotations: { readOnlyHint: true },
    },
    async ({ post_id }) => {
      try {
        const r = await detallePost(post_id);
        if (!r) return texto('Post no encontrado.');
        const p: any = r.post;
        const d: any = r.diagnostico;

        const metricas = [
          `${numero(p.likes_count)} likes`,
          `${numero(p.comments_count)} comentarios`,
          `${numero(p.reposts_count)} reposts`,
          p.impressions_count != null ? `${numero(p.impressions_count)} impresiones` : null,
          p.saves_count != null ? `${numero(p.saves_count)} guardados` : null,
          p.sends_count != null ? `${numero(p.sends_count)} envíos` : null,
          p.video_avg_watch_s != null && Number(p.video_duration_s) > 0
            ? `${Math.round((p.video_avg_watch_s / Number(p.video_duration_s)) * 100)}% medio visto` : null,
          p.link_clicks_count != null ? `${numero(p.link_clicks_count)} clics al enlace` : null,
          p.followers_gained_count != null ? `+${numero(p.followers_gained_count)} seguidores` : null,
          p.pct_risa != null ? `${p.pct_risa}% reacciones de risa` : null,
        ].filter(Boolean);

        return texto(
          [
            `${p.creador} · ${fecha(p.published_at)} · ${p.pillar || 'sin pilar'}` +
              `${p.topic ? ` / ${p.topic}` : ''} · ${p.outlier_ratio?.toFixed(2)}x` +
              `${p.es_gestionada ? ' (ratio híbrido)' : ''}`,
            p.post_url || '',
            '',
            metricas.join(' · '),
            `${p.gancho_palanca ? `gancho: ${p.gancho_palanca}${p.gancho_palanca_2 ? ` + ${p.gancho_palanca_2}` : ''} (${p.gancho_motivo || ''}) · ` : ''}hook: ${p.hook_type} · estructura: ${p.post_structure} · tono: ${p.text_tone} · ` +
              `${p.char_count} car. · ${p.content_type}`,
            '',
            '--- TEXTO ---',
            p.content_text || '(sin texto)',
            '',
            '--- POR QUÉ FUNCIONÓ ---',
            `Motor de viralidad: ${d.label} — ${d.explanation}`,
            `Mecanismo narrativo: ${d.explicacion?.narrative_mechanism ?? '—'}`,
            `Tensión del hook: ${d.explicacion?.hook_tension ?? '—'}`,
            `Por qué comentan: ${d.explicacion?.comment_driver ?? '—'}`,
            `Plantilla: ${d.explicacion?.abstract_template ?? '—'}`,
            '',
            `Ritmo: hook de ${d.ritmo?.hook_zone?.lines ?? '?'} líneas ` +
              `(${d.ritmo?.hook_zone?.style ?? '?'}) · cuerpo ${d.ritmo?.body?.style ?? '?'}` +
              `${d.ritmo?.body?.has_list ? ' con lista' : ''} · ` +
              `cierre ${d.ritmo?.closing?.style ?? '?'} · ${d.ritmo?.scroll_stops ?? 0} frenos de scroll`,
          ].join('\n')
        );
      } catch (e) {
        return error(e);
      }
    }
  );

  servidor.registerTool(
    'neety_cuentas',
    {
      title: 'Las cuentas propias',
      description:
        'Las 3 cuentas de founder (Iker, Unai, Asier) con su id, seguidores, posts, outliers y ' +
        'último post. El creator_id de aquí es lo que pide `creator_ids` en el buscador.',
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => {
      try {
        const filas = await cuentasGestionadas();
        if (!filas.length) return texto('No hay cuentas gestionadas dadas de alta.');
        return texto(
          tabla(
            ['cuenta', 'seguidores', 'posts', 'outliers', 'eng. medio', 'último post', 'creator_id'],
            filas.map((c: any) => [
              c.name,
              numero(c.followers_count),
              c.total_posts,
              c.total_outliers,
              numero(c.avg_engagement),
              fecha(c.last_post_at),
              c.id,
            ])
          )
        );
      } catch (e) {
        return error(e);
      }
    }
  );

  servidor.registerTool(
    'neety_outliers_salud',
    {
      title: 'De qué te puedes fiar',
      description:
        'Cobertura de etiquetas y frescura del corpus. Míralo antes de creerte cualquier ' +
        'análisis agregado: si el 30% de los outliers no tiene tema, un group-by por tema está ' +
        'mirando el 70%.',
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => {
      try {
        const s = await saludCorpus();
        const t: any = s.totales;
        const pc = (n: number, total: number) => (total ? `${Math.round((n / total) * 100)}%` : '—');

        const lineas = [
          `Posts: ${numero(t.posts)} · outliers: ${numero(t.outliers)} (${pc(t.outliers, t.posts)})`,
          '',
          '── Cobertura de etiquetas ──',
          `tema          ${pc(t.con_tema, t.posts)} del corpus · ${t.outliers_sin_tema} outliers SIN tema`,
          `pilar         ${pc(t.con_pilar, t.posts)} · 'otro' es el ${pc(t.pilar_otro, t.posts)}`,
          `reacciones    ${pc(t.con_reacciones, t.posts)} — sin esto no se detecta ningún meme`,
          `impresiones   ${pc(t.con_impresiones, t.posts)} — solo cuentas propias`,
          '',
          '── Taxonomía ──',
          `temas distintos: ${s.temas_distintos} · pares sospechosos de duplicado: ${s.posibles_duplicados.length}`,
        ];
        for (const d of s.posibles_duplicados.slice(0, 10)) lineas.push(`  "${d.a}" ≈ "${d.b}"`);

        lineas.push('', '── Frescura ──');
        for (const f of s.frescura as any[]) {
          lineas.push(
            `${f.gestionada ? 'Cuentas propias' : 'Competencia'}: ${f.creadores} creadores · ` +
              `más reciente ${fecha(f.mas_reciente)} · más antiguo ${fecha(f.mas_antiguo)}`
          );
        }
        lineas.push(
          '',
          `Eventos de outlier registrados: ${(s.eventos as any).total} ` +
            `(${(s.eventos as any).ultima_semana} esta semana)`
        );
        if ((s.eventos as any).total === 0) {
          lineas.push(
            '',
            'Cero eventos: el registro empieza a llenarse con el primer refresco posterior al ' +
              'despliegue. Hasta entonces, neety_digest no tendrá novedades que contar.'
          );
        }
        return texto(lineas.join('\n'));
      } catch (e) {
        return error(e);
      }
    }
  );
}
