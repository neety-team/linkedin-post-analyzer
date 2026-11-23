import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { desdeValido, leerUsado, resumenUsado } from '../services/usado';

/**
 * neety_usado (2026-11-24): lo que ya ha salido o está en camino, correos y posts, con la apertura
 * y las líneas del enlace de cada correo y la región de cada mapa. Sustituye a mirar el historial
 * del repo antes de escribir: el estado vive en la base de datos.
 */
export function registrarToolsUsado(servidor: McpServer) {
  servidor.registerTool(
    'neety_usado',
    {
      title: 'Lo ya usado en correos y posts',
      description:
        'Los correos y los posts ya aprobados, programados o publicados desde una fecha (por defecto, ' +
        'los últimos 120 días): de cada correo, su apertura y las líneas del enlace; de cada post, cuenta, ' +
        'pilar y región. Se mira antes de escribir para no repetir lo gastado. Los validadores leen lo ' +
        'mismo por /api/usado.',
      inputSchema: {
        desde: z.string().optional().describe('YYYY-MM-DD. Sin ella, los últimos 120 días'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (args) => {
      try {
        const u = await leerUsado(desdeValido(args.desde));
        return { content: [{ type: 'text' as const, text: resumenUsado(u) }] };
      } catch (e) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${(e as Error)?.message || String(e)}` }],
          isError: true,
        };
      }
    }
  );
}
