/**
 * Prueba de las metricas de VIDEO (porcentaje medio visto, Iker 2026-10-01).
 * Uso: cd backend && npx tsx src/scripts/probarVideoMetricas.ts
 * La parte EN VIVO solo corre si hay UNIPILE_API_KEY en el entorno.
 */
import { aSegundos, duracionMvhd, fetchVideoDuration } from '../services/videoMetrics';
import { fetchPremiumAnalytics } from '../services/premiumAnalytics';

let fallos = 0;
const eq = (nombre: string, real: unknown, esperado: unknown) => {
  const ok = real === esperado;
  if (!ok) fallos++;
  console.log(`${ok ? 'OK   ' : 'FALLA'} ${nombre}: ${real} (esperado ${esperado})`);
};

async function main() {
  eq('3h 57m', aSegundos('3h 57m'), 14220);
  eq('17s', aSegundos('17s'), 17);
  eq('1m 5s', aSegundos('1m 5s'), 65);
  eq('vacio', aSegundos(''), null);
  eq('null', aSegundos(null), null);

  // Cabecera mp4 sintetica: atomo mvhd version 0, timescale 1000, duracion 22273.
  const b = Buffer.alloc(120);
  b.write('mvhd', 44, 'ascii');
  b.writeUInt8(0, 48); // version
  b.writeUInt32BE(1000, 60); // timescale (mvhd+16)
  b.writeUInt32BE(22273, 64); // duration  (mvhd+20)
  eq('mvhd v0', duracionMvhd(b), 22.273);
  eq('sin mvhd', duracionMvhd(Buffer.alloc(64)), null);

  if (process.env.UNIPILE_API_KEY) {
    // Post de video de Unai del 30/09 (el primero de la casa).
    const a = await fetchPremiumAnalytics('urn:li:activity:7511073375721664512', 'aamcUZmeRYCZ3Se9EP77DQ');
    console.log('EN VIVO analitica:', a?.videoViews, 'reproducciones ·', a?.videoWatchTimeS, 's totales ·', a?.videoAvgWatchS, 's de media');
    const d = await fetchVideoDuration('7511073375721664512', 'aamcUZmeRYCZ3Se9EP77DQ');
    console.log('EN VIVO duracion:', d);
    if (!a?.videoViews || !a?.videoAvgWatchS) { fallos++; console.log('FALLA la analitica en vivo no trae las metricas de video'); }
    eq('duracion en vivo', d, 22.273);
  }

  console.log(fallos ? `\n${fallos} fallos` : '\nTodo OK');
  process.exit(fallos ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
