// Caso de prueba del BARRIDO de entregas sin fila, contra LinkedIn de verdad.
//
// Hermano de `probarVerificacion.ts`, y por el mismo motivo: no hay framework de
// tests en el backend, así que la receta de depuración se cumple con un script
// que reproduce el fallo con la lógica VIEJA y comprueba que la NUEVA lo caza.
//
// Es de SOLO LECTURA: no manda ni un mensaje y no escribe en la base de datos.
// Se puede correr las veces que haga falta.
//
//   npx tsx src/scripts/probarBarridoEntregas.ts
//
// ⛔ EL FALLO QUE ARREGLA (Iker, 2026-08-24). El panel decidía quién tiene ya el
// recurso mirando SOLO la tabla `lead_magnet_sends`, y «Revisar envíos» solo
// repasaba las filas que existen. A quien recibió el DM y se quedó sin fila no
// lo miraba nadie: se quedaba en «Para actuar» para siempre, con el botón de
// mandarle el MISMO enlace por segunda vez.
//
// Los dos casos son reales, del post del 12/08 de Unai (7b7a49dc). Eran los DOS
// únicos accionables que quedaban en ese post, y los dos tienen el DM con el
// enlace del recurso en su bandeja desde el 13/08 —Jordi hasta le puso un 👍—
// mientras su única fila era una invitación en 'failed'.
//
// El tercer caso es el control NEGATIVO, y es el que impide que este arreglo se
// convierta en el bug del signo contrario: alguien a quien de verdad NO se le ha
// mandado nada tiene que seguir saliendo. Dar por entregado lo que no lo está
// pierde el lead en silencio, que es exactamente el fallo del 13/08.
import { unipileService } from '../services/unipile';
import { buscarMensajeEnviado, veredictoDeBusqueda } from '../services/verificarEnvio';

const CUENTA_UNAI = 'aamcUZmeRYCZ3Se9EP77DQ';
const ENLACE = 'https://neety.com/academia/vibe';

interface Caso {
  quien: string;
  providerId: string;
  // Lo que TIENE que salir. `true` = ya lo tiene, sacarlo de «Para actuar».
  // `null`/`false` = no consta que lo tenga, se queda donde está.
  esperado: boolean | null;
}

const CASOS: Caso[] = [
  {
    quien: 'Alexandra Vega Alemán (DM del 13/08 16:38, su unica fila era invite failed)',
    providerId: 'ACoAAEt0XE4BwlNsxpLmiRyDB4fAIv0SVl0B3KM',
    esperado: true,
  },
  {
    quien: 'Jordi Urgell Lopez (DM del 13/08 16:39, reacciono 👍, idem)',
    providerId: 'ACoAAAb9WGQBBrFwAX2aFefqWgPcMGAiJ7pJhkw',
    esperado: true,
  },
  {
    quien: 'CONTROL NEGATIVO: le pedimos la solicitud y no hay conversacion',
    providerId: 'ACoAABkDaqsB0r59CCBC_YugRRJU_twCYMtNLSo',
    esperado: null,
  },
];

// La lógica VIEJA: la tabla es la única fuente de verdad. Ninguno de los dos
// tiene fila 'dm', así que para el panel los dos siguen pendientes.
const FILAS_DM_GUARDADAS = new Set<string>();
function comoEstabaAntes(providerId: string): boolean {
  return FILAS_DM_GUARDADAS.has(providerId);
}

// La lógica NUEVA, la misma que `buscarEntregaPorEnlace` en routes/accounts.ts:
// buscar EL ENLACE del recurso dentro de un mensaje NUESTRO.
async function comoEstaAhora(providerId: string): Promise<boolean | null> {
  let chatIds: string[] = [];
  try {
    const chats = await unipileService.getChatsWithAttendee(providerId, CUENTA_UNAI, 10);
    chatIds = chats.map((c: any) => c?.id).filter(Boolean);
  } catch (err: any) {
    if (!/404|not found/i.test(err?.message || String(err))) return null;
  }
  if (chatIds.length === 0) return null;
  const r = await buscarMensajeEnviado(
    (id, cursor) => unipileService.getChatMessagesPage(id, { limit: 50, cursor }),
    { chatIds, texto: ENLACE, desde: null }
  );
  return veredictoDeBusqueda(r, false).ok;
}

async function main() {
  let fallos = 0;

  for (const c of CASOS) {
    console.log(`\n── ${c.quien}`);
    console.log(
      `   ANTES  → ${comoEstabaAntes(c.providerId) ? 'entregado' : 'PENDIENTE (sigue en «Para actuar»)'}`
    );

    const ok = await comoEstaAhora(c.providerId);
    console.log(`   AHORA  → ok=${ok}`);

    if (ok !== c.esperado) {
      console.log(`   ❌ ESPERABA ok=${c.esperado}`);
      fallos++;
    } else {
      console.log('   ✅');
    }
  }

  console.log(`\n${fallos === 0 ? '✅ TODOS PASAN' : `❌ ${fallos} FALLO(S)`}`);
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
