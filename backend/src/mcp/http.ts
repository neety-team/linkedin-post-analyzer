import { Router, Request, Response } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { registrarTools } from './tools';
import { registrarToolsSemana } from './toolsSemana';
import { registrarToolsNewsletter } from './toolsNewsletter';
import { registrarToolsUsado } from './toolsUsado';

/**
 * El MCP servido por HTTP desde el propio backend.
 *
 * MODO SIN ESTADO (sessionIdGenerator: undefined)
 * ----------------------------------------------
 * Se crea un servidor y un transporte por peticion, y se cierran al acabar.
 * Es mas caro que mantener la sesion viva, pero estas tools son consultas
 * sueltas contra Postgres —no hay nada que recordar entre llamadas— y a cambio
 * sobrevive a lo que si pasa en Railway: reinicios por despliegue y varias
 * instancias detras del balanceador. Con sesiones en memoria, un redeploy a
 * mitad de conversacion devolveria 404 de sesion desconocida.
 *
 * AUTENTICACION
 * -------------
 * Ninguna aqui: /mcp se monta DESPUES de basicAuthMiddleware en index.ts, asi
 * que hereda el mismo Basic Auth que el resto de la app. El cliente manda la
 * cabecera Authorization y no hay una segunda credencial que gestionar.
 */

const router = Router();

async function atender(req: Request, res: Response) {
  const servidor = new McpServer(
    { name: 'neety-outliers', version: '0.2.0' },
    {
      instructions:
        'Corpus de outliers de LinkedIn de Neety: las 3 cuentas propias (Iker, Unai, Asier) y la ' +
        'competencia. Sirve datos y agregados para decidir QUE contenido hacer; no escribe posts. ' +
        'Dos avisos que cambian como se leen los resultados: (1) las categorias estan incompletas ' +
        '— el tema lo asigna un LLM en texto libre y hay sinonimos, asi que consulta ' +
        'neety_outliers_valores antes de filtrar por una, y usa `q` (texto libre) si el resultado ' +
        'sale corto; (2) el multiplicador se calcula con dos metodos distintos y no es comparable ' +
        'entre creadores en crudo — para listas mezcladas ordena por `percentil`.',
    }
  );
  registrarTools(servidor);
  registrarToolsSemana(servidor);
  registrarToolsNewsletter(servidor);
  registrarToolsUsado(servidor);

  const transporte = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

  // Si el cliente corta, se cierran los dos o se filtran sockets y objetos
  // McpServer en cada peticion abortada.
  res.on('close', () => {
    transporte.close().catch(() => {});
    servidor.close().catch(() => {});
  });

  try {
    await servidor.connect(transporte);
    // req.body ya viene parseado por express.json(), asi que se le pasa: si no,
    // el transporte intentaria leer un stream que ya esta consumido y se queda
    // colgado hasta el timeout.
    await transporte.handleRequest(req, res, req.body);
  } catch (err: any) {
    console.error('[mcp] error atendiendo la peticion:', err?.message);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Error interno del servidor MCP' },
        id: null,
      });
    }
  }
}

router.post('/', atender);

// GET y DELETE son parte del transporte (stream del servidor y cierre de
// sesion). En modo sin estado no hay sesion que mantener, asi que se responde
// el error que el protocolo espera en vez de dejar al cliente esperando.
const noSoportado = (_req: Request, res: Response) => {
  res.status(405).json({
    jsonrpc: '2.0',
    error: { code: -32000, message: 'Method not allowed: el servidor va en modo sin estado' },
    id: null,
  });
};
router.get('/', noSoportado);
router.delete('/', noSoportado);

export default router;
